import type { NetworkNode, NetworkEdge } from '../components/network-designer/types/designer';
import type { CloudProvider } from '../types/connection';

interface WizardState {
  cloudRouterName?: string;
  providers: CloudProvider[];
  selectedLocations: Record<string, string[]>;
  bandwidthSettings: Record<string, number>;
  connectionType?: string;
  resiliencyLevel?: string;
}

const EDGE_TYPE_MAP: Record<string, string> = {
  'AWS': 'direct-connect',
  'Azure': 'expressroute',
  'Google': 'cloud-interconnect',
  'Oracle': 'fastconnect',
  'IBM': 'direct-link',
  'Equinix': 'ethernet',
  'Digital Realty': 'ethernet',
  'Centersquare': 'ethernet',
  'CoreSite': 'ethernet',
  'DataBank': 'ethernet',
  'Cisco Jasper': 'ethernet',
};

const PROVIDER_ICONS: Record<string, string> = {
  'AWS': 'cloud',
  'Azure': 'cloud',
  'Google': 'cloud',
  'Oracle': 'cloud',
  'IBM': 'cloud',
  'Equinix': 'server',
  'Digital Realty': 'server',
  'Centersquare': 'server',
  'CoreSite': 'server',
  'DataBank': 'server',
  'Cisco Jasper': 'radio',
};

export function wizardToDesigner(state: WizardState): { nodes: NetworkNode[]; edges: NetworkEdge[] } {
  // AWS Max: use the pre-built 4-IPE template topology
  const isAwsMax = state.resiliencyLevel === 'maximum' &&
    state.providers.includes('AWS' as any) &&
    state.connectionType === 'Internet to Cloud';

  if (isAwsMax) {
    const metro = (state.selectedLocations['AWS'] || [])[0] || 'Metro';
    return {
      nodes: [
        { id: 'awsmax-ipe-1', type: 'network', functionType: 'ipe', x: 80, y: 120, name: 'MX304-Site1-A', icon: 'Network', status: 'active', config: {}, metro },
        { id: 'awsmax-ipe-2', type: 'network', functionType: 'ipe', x: 80, y: 280, name: 'MX304-Site1-B', icon: 'Network', status: 'active', config: {}, metro },
        { id: 'awsmax-ipe-3', type: 'network', functionType: 'ipe', x: 80, y: 440, name: 'MX304-Site2-A', icon: 'Network', status: 'active', config: {}, metro },
        { id: 'awsmax-ipe-4', type: 'network', functionType: 'ipe', x: 80, y: 600, name: 'MX304-Site2-B', icon: 'Network', status: 'active', config: {}, metro },
        { id: 'awsmax-cr-1', type: 'function', functionType: 'router', subType: 'cloud', x: 350, y: 200, name: 'Hub (Site 1)', icon: 'Cloud', status: 'active', config: {} },
        { id: 'awsmax-cr-2', type: 'function', functionType: 'router', subType: 'cloud', x: 350, y: 520, name: 'Hub (Site 2)', icon: 'Cloud', status: 'active', config: {} },
        { id: 'awsmax-aws', type: 'destination', functionType: 'cloud', cloudProvider: 'aws', x: 620, y: 360, name: 'AWS Interconnect – last mile', icon: 'Cloud', status: 'active', config: {} },
      ],
      edges: [
        { id: 'awsmax-e1', source: 'awsmax-ipe-1', target: 'awsmax-cr-1', type: 'direct-connect', bandwidth: '1 Gbps', status: 'active', config: { resilience: 'ha', bfd: true } },
        { id: 'awsmax-e2', source: 'awsmax-ipe-2', target: 'awsmax-cr-1', type: 'direct-connect', bandwidth: '1 Gbps', status: 'active', config: { resilience: 'ha', bfd: true } },
        { id: 'awsmax-e3', source: 'awsmax-ipe-3', target: 'awsmax-cr-2', type: 'direct-connect', bandwidth: '1 Gbps', status: 'active', config: { resilience: 'ha', bfd: true } },
        { id: 'awsmax-e4', source: 'awsmax-ipe-4', target: 'awsmax-cr-2', type: 'direct-connect', bandwidth: '1 Gbps', status: 'active', config: { resilience: 'ha', bfd: true } },
        { id: 'awsmax-e5', source: 'awsmax-cr-1', target: 'awsmax-aws', type: 'direct-connect', bandwidth: '1 Gbps', status: 'active' },
        { id: 'awsmax-e6', source: 'awsmax-cr-2', target: 'awsmax-aws', type: 'direct-connect', bandwidth: '1 Gbps', status: 'active' },
      ],
    };
  }

  // Maximum or Geodiversity (non-AWS): generate 4-IPE topology
  const isMaxOrGeo = state.resiliencyLevel === 'maximum' || state.resiliencyLevel === 'geodiversity';

  if (isMaxOrGeo) {
    const locations = Object.entries(state.selectedLocations).flatMap(([provider, locs]) =>
      locs.map(loc => ({ provider, location: loc }))
    );
    const site1 = locations[0]?.location || 'Site 1';
    const site2 = locations[1]?.location || 'Site 2';
    const provider = state.providers[0] || 'Cloud';
    const edgeType = EDGE_TYPE_MAP[provider] || 'ethernet';
    const bw = Object.values(state.bandwidthSettings)[0] || 1000;
    const bwLabel = bw >= 1000 ? `${(bw / 1000).toFixed(0)} Gbps` : `${bw} Mbps`;

    const nodes: NetworkNode[] = [
      { id: 'max-ipe-1', type: 'network', functionType: 'ipe', x: 80, y: 120, name: `IPE-1 (${site1})`, icon: 'Network', status: 'active', config: {}, metro: site1 },
      { id: 'max-ipe-2', type: 'network', functionType: 'ipe', x: 80, y: 280, name: `IPE-2 (${site1})`, icon: 'Network', status: 'active', config: {}, metro: site1 },
      { id: 'max-ipe-3', type: 'network', functionType: 'ipe', x: 80, y: 440, name: `IPE-3 (${site2})`, icon: 'Network', status: 'active', config: {}, metro: site2 },
      { id: 'max-ipe-4', type: 'network', functionType: 'ipe', x: 80, y: 600, name: `IPE-4 (${site2})`, icon: 'Network', status: 'active', config: {}, metro: site2 },
      { id: 'max-cr-1', type: 'function', functionType: 'router', subType: 'cloud', x: 350, y: 200, name: `Hub (${site1})`, icon: 'Cloud', status: 'active', config: {} },
      { id: 'max-cr-2', type: 'function', functionType: 'router', subType: 'cloud', x: 350, y: 520, name: `Hub (${site2})`, icon: 'Cloud', status: 'active', config: {} },
      { id: 'max-dest', type: 'destination', functionType: 'cloud', cloudProvider: provider, x: 620, y: 360, name: provider, icon: PROVIDER_ICONS[provider] || 'cloud', status: 'active', config: { provider } },
    ];
    const edges: NetworkEdge[] = [
      { id: 'max-e1', source: 'max-ipe-1', target: 'max-cr-1', type: edgeType, bandwidth: bwLabel, status: 'active', config: { resilience: 'ha', bfd: true } },
      { id: 'max-e2', source: 'max-ipe-2', target: 'max-cr-1', type: edgeType, bandwidth: bwLabel, status: 'active', config: { resilience: 'ha', bfd: true } },
      { id: 'max-e3', source: 'max-ipe-3', target: 'max-cr-2', type: edgeType, bandwidth: bwLabel, status: 'active', config: { resilience: 'ha', bfd: true } },
      { id: 'max-e4', source: 'max-ipe-4', target: 'max-cr-2', type: edgeType, bandwidth: bwLabel, status: 'active', config: { resilience: 'ha', bfd: true } },
      { id: 'max-e5', source: 'max-cr-1', target: 'max-dest', type: edgeType, bandwidth: bwLabel, status: 'active' },
      { id: 'max-e6', source: 'max-cr-2', target: 'max-dest', type: edgeType, bandwidth: bwLabel, status: 'active' },
    ];
    return { nodes, edges };
  }

  const nodes: NetworkNode[] = [];
  const edges: NetworkEdge[] = [];

  // Standard: AT&T Core node (left side)
  const coreNode: NetworkNode = {
    id: 'wizard-core',
    type: 'network',
    functionType: 'ipe',
    x: 100,
    y: 300,
    name: 'AT&T Core',
    icon: 'radio',
    status: 'active',
    config: {},
  };
  nodes.push(coreNode);

  // Hub node (center)
  const routerNode: NetworkNode = {
    id: 'wizard-router',
    type: 'function',
    functionType: 'hub',
    x: 350,
    y: 300,
    name: state.cloudRouterName || 'Hub',
    icon: 'hub',
    status: 'configured-inactive',
    config: {},
  };
  nodes.push(routerNode);

  // Core to Router edge
  const coreEdge: NetworkEdge = {
    id: 'wizard-edge-core',
    source: 'wizard-core',
    target: 'wizard-router',
    type: 'mpls',
    bandwidth: '10 Gbps',
    status: 'active',
  };
  edges.push(coreEdge);

  // Provider destination nodes (right side, distributed vertically)
  let nodeIndex = 0;
  const allLocations: { provider: string; location: string }[] = [];

  state.providers.forEach(provider => {
    const locations = state.selectedLocations[provider] || [];
    locations.forEach(location => {
      allLocations.push({ provider, location });
    });
  });

  const totalNodes = Math.max(allLocations.length, 1);
  const ySpacing = 120;
  const yStart = 300 - ((totalNodes - 1) * ySpacing) / 2;

  allLocations.forEach(({ provider, location }) => {
    const nodeId = `wizard-dest-${nodeIndex}`;
    const y = yStart + nodeIndex * ySpacing;

    const destNode: NetworkNode = {
      id: nodeId,
      type: 'destination',
      functionType: 'cloud',
      cloudProvider: provider,
      x: 600,
      y,
      name: `${provider} (${location})`,
      icon: PROVIDER_ICONS[provider] || 'cloud',
      status: 'unconfigured',
      config: {
        provider,
        region: location,
      },
    };
    nodes.push(destNode);

    // Router to destination edge
    const bwKey = `${provider}:${location}`;
    const bandwidth = state.bandwidthSettings[bwKey] || 1000;
    const bwLabel = bandwidth >= 1000 ? `${(bandwidth / 1000).toFixed(0)} Gbps` : `${bandwidth} Mbps`;

    const destEdge: NetworkEdge = {
      id: `wizard-edge-${nodeIndex}`,
      source: 'wizard-router',
      target: nodeId,
      type: EDGE_TYPE_MAP[provider] || 'ethernet',
      bandwidth: bwLabel,
      status: 'inactive',
    };
    edges.push(destEdge);

    nodeIndex++;
  });

  return { nodes, edges };
}
