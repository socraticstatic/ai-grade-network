/**
 * Pure builder for the wizard's step-by-step "what you're building" topology.
 *
 * It always returns the FULL basic chain — Your Network → AT&T Core → Connection Hub →
 * Cloud(s), with an optional VNF attached to the hub — and marks each element `set`
 * (finalized, solid) or `ghost` (not chosen yet, dashed gray). Elements light up as their
 * data appears, so the diagram fills in as the user moves through the steps.
 *
 * Read-only and store-free. Rendered by WizardTopology, reusing the app's MiniTopology
 * visual language + real glyphs (AttIcon hub, ProviderLogo, ConnectionTypeIcon, VNF icons).
 */

export type WizardNodeIcon = 'customer' | 'ipe' | 'hub' | 'cloud' | 'vnf';
export type NodeState = 'set' | 'ghost';

export interface WizardTopoNode {
  id: string;
  label: string;
  sublabel?: string;
  icon: WizardNodeIcon;
  state: NodeState;
  /** Lowercased provider name for a ProviderLogo badge (cloud nodes). */
  cloudProvider?: string;
  /** VNF type — drives the glyph on an inline VNF node. */
  vnfType?: string;
  /** Small badge under the label, e.g. resiliency ("Maximum · 2 sites"). */
  badge?: string;
  /** VNF attached to this node (hub only). Rendered as a chip beneath the hub. */
  attachedVnf?: { state: NodeState; label: string; vnfType?: string };
}

export interface WizardConnector {
  /** Connector sits to the RIGHT of column index `after`. */
  after: number;
  state: NodeState;
  label?: string;
}

export interface WizardTopo {
  /** Columns left→right; each column is a top→bottom stack of nodes. */
  columns: WizardTopoNode[][];
  connectors: WizardConnector[];
}

export interface WizardTopoInput {
  connectionType?: string;
  providers?: string[];
  locationsByProvider?: Record<string, string[]>;
  bandwidthSettings?: Record<string, number>;
  resiliencyLevel?: string;
  /** Resolved hub name (existing hub's name, or the new-hub name / default). */
  hubName?: string;
  isExistingHub?: boolean;
  /** True once the user has committed the hub step (lights up the hub). */
  hubDecided?: boolean;
  /** Chosen VNF, if any. */
  vnf?: { label: string; vnfType?: string } | null;
  /** Where the VNF sits: 'inline' (its own node between hub and cloud) or 'hub' (a chip on the hub). */
  vnfPlacement?: 'inline' | 'hub';
  /** Whether the VNF step is (or has been) reached — controls showing the ghost chip. */
  vnfStepReached?: boolean;
  isAwsMax?: boolean;
  /** Clouds already on the target hub (when adding to an existing hub), so the preview
   *  shows what you're building onto. Each is one leg of an existing connection. */
  existingClouds?: { provider: string; location?: string }[];
}

function transportLabel(type?: string): string {
  switch (type) {
    case 'Internet to Cloud': return 'Internet';
    case 'VPN to Cloud': return 'VPN · IPSec';
    case 'Cloud to Cloud': return 'AT&T Backbone';
    case 'DataCenter/CoLocation to Cloud': return 'Cross-connect';
    case 'Site to Cloud': return 'SD-WAN';
    default: return 'MPLS';
  }
}

function resiliencyBadge(level?: string, isAwsMax?: boolean): string | undefined {
  if (level === 'maximum') return isAwsMax ? '4 diverse paths' : 'Maximum · 2 sites';
  if (level === 'geodiversity') return 'Geo-diverse · 2 metros';
  return undefined;
}

function fmtBandwidth(mbps?: number): string | undefined {
  if (!mbps || mbps <= 0) return undefined;
  return mbps >= 1000 ? `${(mbps / 1000).toFixed(mbps % 1000 === 0 ? 0 : 1)} Gbps` : `${mbps} Mbps`;
}

/** First configured bandwidth for a provider, across any of its locations. */
function bandwidthFor(provider: string, settings?: Record<string, number>): number | undefined {
  if (!settings) return undefined;
  if (provider === 'AWS' && settings['AWS-lmcc']) return settings['AWS-lmcc'];
  const hit = Object.entries(settings).find(([k]) => k.startsWith(`${provider}:`) || k === provider);
  return hit?.[1];
}

export function buildWizardTopology(input: WizardTopoInput): WizardTopo {
  const {
    connectionType, providers = [], locationsByProvider = {}, bandwidthSettings,
    resiliencyLevel, hubName, isExistingHub, hubDecided, vnf, vnfPlacement = 'inline',
    vnfStepReached, isAwsMax, existingClouds = [],
  } = input;

  const typeSet = !!connectionType;
  const hubSet = !!hubDecided;
  const providersSet = providers.length > 0;

  // Column 0 — the customer's own network (always the anchor).
  const customer: WizardTopoNode = {
    id: 'customer', label: 'Your Network', sublabel: 'On-prem / branch', icon: 'customer', state: 'set',
  };

  // Column 1 — AT&T Core / IPE on-ramp; transport is known once the type is chosen.
  const ipe: WizardTopoNode = {
    id: 'ipe',
    label: 'AT&T Core',
    sublabel: typeSet ? transportLabel(connectionType) : 'On-ramp',
    icon: 'ipe',
    state: typeSet ? 'set' : 'ghost',
  };

  // VNF visualization. Show something once the VNF step is reached (ghost until chosen).
  // Placement decides WHERE: 'hub' → a chip on the hub; 'inline' → its own node in the path.
  const showVnf = !!vnf || !!vnfStepReached;
  const vnfState: NodeState = vnf ? 'set' : 'ghost';
  const vnfLabel = vnf ? vnf.label : 'VNF';

  // Column 2 — the Connection Hub (the container). Carries a VNF chip only for 'hub' placement.
  const attachedVnf = showVnf && vnfPlacement === 'hub'
    ? { state: vnfState, label: vnf ? vnf.label : 'VNF · optional', vnfType: vnf?.vnfType }
    : undefined;
  const hub: WizardTopoNode = {
    id: 'hub',
    label: hubSet ? (hubName || 'New Hub') : 'Connection Hub',
    sublabel: hubSet ? (isExistingHub ? 'Existing hub' : 'New hub') : 'Routing node',
    icon: 'hub',
    state: hubSet ? 'set' : 'ghost',
    badge: resiliencyBadge(resiliencyLevel, isAwsMax),
    attachedVnf,
  };

  // Column 3 — the cloud destination(s). When adding to an existing hub, its current
  // connections show first (so you see what you're building onto), then THIS connection's
  // cloud(s), tagged "New". A single ghost stands in until a provider is chosen.
  const addingToExisting = existingClouds.length > 0;
  const shownExisting = existingClouds.slice(0, 3);
  const overflow = existingClouds.length - shownExisting.length;
  const existingNodes: WizardTopoNode[] = shownExisting.map((c, i) => ({
    id: `existing-${i}`,
    label: c.provider,
    sublabel: c.location || 'On this hub',
    icon: 'cloud',
    state: 'set',
    cloudProvider: c.provider.toLowerCase(),
  }));
  if (overflow > 0) {
    existingNodes.push({ id: 'existing-more', label: `+${overflow} more`, sublabel: 'on this hub', icon: 'cloud', state: 'set' });
  }

  const newClouds: WizardTopoNode[] = providersSet
    ? providers.map((p, i) => ({
        id: `cloud-${i}`,
        label: p,
        sublabel: locationsByProvider[p]?.[0] || 'Region pending',
        icon: 'cloud' as const,
        state: 'set' as NodeState,
        cloudProvider: p.toLowerCase(),
        // Only tag "New" when there are existing clouds to distinguish it from.
        badge: addingToExisting ? 'New' : undefined,
      }))
    : [{
        id: 'cloud-ghost',
        label: addingToExisting ? 'New connection' : 'Cloud',
        sublabel: 'Provider pending',
        icon: 'cloud' as const,
        state: 'ghost' as NodeState,
        badge: addingToExisting ? 'New' : undefined,
      }];

  const clouds: WizardTopoNode[] = [...existingNodes, ...newClouds];

  // Representative bandwidth on the hub→cloud connector (first provider that has one).
  const bwLabel = providersSet
    ? fmtBandwidth(providers.map(p => bandwidthFor(p, bandwidthSettings)).find(Boolean))
    : undefined;

  // Inline VNF sits in its own column between the hub and the cloud(s) — in the traffic path.
  const inlineVnf: WizardTopoNode | null = showVnf && vnfPlacement === 'inline'
    ? {
        id: 'vnf',
        label: vnfLabel,
        sublabel: vnf ? 'In the path' : 'optional',
        icon: 'vnf',
        state: vnfState,
        vnfType: vnf?.vnfType,
      }
    : null;

  const cloudsSet = clouds.some(c => c.state === 'set');
  // A connector is solid only between two finalized nodes.
  const columns: WizardTopoNode[][] = inlineVnf
    ? [[customer], [ipe], [hub], [inlineVnf], clouds]
    : [[customer], [ipe], [hub], clouds];
  const connectors: WizardConnector[] = [
    { after: 0, state: ipe.state },
    { after: 1, state: ipe.state === 'set' && hub.state === 'set' ? 'set' : 'ghost' },
  ];
  if (inlineVnf) {
    connectors.push({ after: 2, state: hub.state === 'set' && inlineVnf.state === 'set' ? 'set' : 'ghost' });
    connectors.push({ after: 3, state: inlineVnf.state === 'set' && cloudsSet ? 'set' : 'ghost', label: bwLabel });
  } else {
    connectors.push({ after: 2, state: hub.state === 'set' && cloudsSet ? 'set' : 'ghost', label: bwLabel });
  }

  return { columns, connectors };
}
