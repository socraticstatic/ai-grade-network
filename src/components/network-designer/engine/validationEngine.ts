import type { NetworkNode, NetworkEdge, ValidationIssue, ResiliencyTier } from '../types/designer';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getConnectedEdges(nodeId: string, edges: NetworkEdge[]): NetworkEdge[] {
  return edges.filter((e) => e.source === nodeId || e.target === nodeId);
}

export function getNeighborIds(nodeId: string, edges: NetworkEdge[]): string[] {
  return edges
    .filter((e) => e.source === nodeId || e.target === nodeId)
    .map((e) => (e.source === nodeId ? e.target : e.source));
}

export function isHub(node: NetworkNode): boolean {
  return node.type === 'function' && node.functionType === 'router' && node.subType === 'cloud';
}

export function isIPE(node: NetworkNode): boolean {
  return node.type === 'network' && node.functionType === 'ipe';
}

function isCloudDestination(node: NetworkNode): boolean {
  return node.type === 'destination';
}

function isDatacenter(node: NetworkNode): boolean {
  return node.type === 'datacenter';
}

function isFirewall(node: NetworkNode): boolean {
  return node.type === 'function' && node.functionType === 'firewall';
}

function findById(id: string, nodes: NetworkNode[]): NetworkNode | undefined {
  return nodes.find((n) => n.id === id);
}

// ---------------------------------------------------------------------------
// Rule implementations
// ---------------------------------------------------------------------------

function checkOrphanNodes(nodes: NetworkNode[], edges: NetworkEdge[]): ValidationIssue[] {
  if (nodes.length <= 1) return [];
  return nodes
    .filter((n) => getConnectedEdges(n.id, edges).length === 0)
    .map((n) => ({
      id: `orphan-${n.id}`,
      severity: 'error' as const,
      message: `"${n.name}" has no connections`,
      nodeId: n.id,
    }));
}

function checkCloudNotThroughHub(nodes: NetworkNode[], edges: NetworkEdge[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const cloudNodes = nodes.filter(isCloudDestination);

  for (const cloud of cloudNodes) {
    const neighborIds = getNeighborIds(cloud.id, edges);
    const neighbors = neighborIds.map((id) => findById(id, nodes)).filter(Boolean) as NetworkNode[];
    const hasHubNeighbor = neighbors.some(isHub);
    if (!hasHubNeighbor) {
      issues.push({
        id: `cloud-no-cr-${cloud.id}`,
        severity: 'error',
        message: `"${cloud.name}" is not connected through a Hub`,
        nodeId: cloud.id,
      });
    }
  }
  return issues;
}

function checkHubNotConnectedToIPE(nodes: NetworkNode[], edges: NetworkEdge[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const hubs = nodes.filter(isHub);

  for (const cr of hubs) {
    const neighborIds = getNeighborIds(cr.id, edges);
    const neighbors = neighborIds.map((id) => findById(id, nodes)).filter(Boolean) as NetworkNode[];
    const hasIPENeighbor = neighbors.some(isIPE);
    if (!hasIPENeighbor) {
      issues.push({
        id: `cr-no-ipe-${cr.id}`,
        severity: 'error',
        message: `Hub "${cr.name}" is not connected to AT&T Core (IPE)`,
        nodeId: cr.id,
      });
    }
  }
  return issues;
}

function checkDatacenterDirectToCloud(nodes: NetworkNode[], edges: NetworkEdge[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const edge of edges) {
    const src = findById(edge.source, nodes);
    const tgt = findById(edge.target, nodes);
    if (!src || !tgt) continue;
    if (
      (isDatacenter(src) && isCloudDestination(tgt)) ||
      (isCloudDestination(src) && isDatacenter(tgt))
    ) {
      issues.push({
        id: `dc-direct-cloud-${edge.id}`,
        severity: 'error',
        message: `Datacenter "${isDatacenter(src) ? src.name : tgt.name}" is directly connected to cloud — route through a Hub`,
        nodeId: isDatacenter(src) ? src.id : tgt.id,
      });
    }
  }
  return issues;
}

function checkSinglePointOfFailure(nodes: NetworkNode[], edges: NetworkEdge[]): ValidationIssue[] {
  const cloudNodes = nodes.filter(isCloudDestination);
  return cloudNodes
    .filter((n) => getConnectedEdges(n.id, edges).length === 1)
    .map((n) => ({
      id: `spof-${n.id}`,
      severity: 'warning' as const,
      message: `"${n.name}" has a single connection — single point of failure`,
      nodeId: n.id,
    }));
}

function checkNoRedundancyOnCRtoIPE(nodes: NetworkNode[], edges: NetworkEdge[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const hubs = nodes.filter(isHub);

  for (const cr of hubs) {
    const ipeEdges = edges.filter((e) => {
      const src = findById(e.source, nodes);
      const tgt = findById(e.target, nodes);
      return (
        (e.source === cr.id && tgt && isIPE(tgt)) ||
        (e.target === cr.id && src && isIPE(src))
      );
    });
    const hasRedundancy = ipeEdges.some(
      (e) => e.config?.resilience === 'redundant' || e.config?.resilience === 'ha' || e.config?.resilience === 'dual-diverse'
    );
    if (ipeEdges.length > 0 && !hasRedundancy) {
      issues.push({
        id: `cr-ipe-no-redundancy-${cr.id}`,
        severity: 'warning',
        message: `Hub "${cr.name}" to IPE link has no redundancy`,
        nodeId: cr.id,
      });
    }
  }
  return issues;
}

function checkNoFirewall(nodes: NetworkNode[]): ValidationIssue[] {
  const hasFirewall = nodes.some(isFirewall);
  if (!hasFirewall && nodes.length > 0) {
    return [
      {
        id: 'no-firewall',
        severity: 'warning',
        message: 'No firewall in topology — consider adding one for security',
      },
    ];
  }
  return [];
}

function checkMultipleDestsWithSingleCR(nodes: NetworkNode[]): ValidationIssue[] {
  const cloudDests = nodes.filter(isCloudDestination);
  const hubs = nodes.filter(isHub);
  if (cloudDests.length > 1 && hubs.length === 1) {
    return [
      {
        id: 'multi-dest-single-cr',
        severity: 'info',
        message: `${cloudDests.length} cloud destinations with a single Hub — consider adding a second for resilience`,
      },
    ];
  }
  return [];
}

function checkMultipleTransportWithoutSDWAN(nodes: NetworkNode[], edges: NetworkEdge[]): ValidationIssue[] {
  const transportTypes = new Set(edges.map((e) => e.type));
  const hasSDWAN = nodes.some((n) => n.type === 'function' && n.functionType === 'sdwan');
  if (transportTypes.size > 1 && !hasSDWAN) {
    return [
      {
        id: 'multi-transport-no-sdwan',
        severity: 'info',
        message: 'Multiple transport types detected — consider adding SD-WAN for unified overlay management',
      },
    ];
  }
  return [];
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function validateTopology(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  tier?: ResiliencyTier | null,
  provider?: string | null,
  connectionType?: string | null,
): ValidationIssue[] {
  const issues = [
    ...checkOrphanNodes(nodes, edges),
    ...checkCloudNotThroughHub(nodes, edges),
    ...checkHubNotConnectedToIPE(nodes, edges),
    ...checkDatacenterDirectToCloud(nodes, edges),
    ...checkSinglePointOfFailure(nodes, edges),
    ...checkNoRedundancyOnCRtoIPE(nodes, edges),
    ...checkNoFirewall(nodes),
    ...checkMultipleDestsWithSingleCR(nodes),
    ...checkMultipleTransportWithoutSDWAN(nodes, edges),
  ];

  // Tier-specific validation
  if (tier) {
    issues.push(...validateTierRequirements(nodes, edges, tier, provider, connectionType));
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Tier-Aware Validation
// ---------------------------------------------------------------------------

function validateTierRequirements(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  tier: ResiliencyTier,
  provider?: string | null,
  connectionType?: string | null,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const ipeNodes = nodes.filter(isIPE);
  const linkCount = edges.length;
  const metros = new Set(nodes.map(n => n.metro).filter(Boolean));

  // AWS Max auto-provisions - no manual validation needed
  if (provider === 'AWS' && tier === 'maximum' && connectionType === 'Internet to Cloud') {
    if (nodes.length > 0 && ipeNodes.length !== 4) {
      issues.push({
        id: 'tier-aws-max-auto',
        severity: 'info',
        message: 'AWS Max is auto-provisioned by AT&T with 4 IPEs across 2 sites. This topology is read-only.',
      });
    }
    return issues;
  }

  switch (tier) {
    case 'standard':
      if (ipeNodes.length > 1) {
        issues.push({
          id: 'tier-standard-sites',
          severity: 'warning',
          message: `Standard resiliency uses 1 site. You have ${ipeNodes.length} IPE nodes. Consider Maximum or Geodiversity for multi-site.`,
        });
      }
      break;

    case 'maximum':
      if (nodes.length > 0 && ipeNodes.length > 0 && ipeNodes.length < 4) {
        issues.push({
          id: 'tier-max-link-count',
          severity: 'error',
          message: `Maximum resiliency requires 4 links across 2 sites. You have ${ipeNodes.length} IPE node${ipeNodes.length !== 1 ? 's' : ''}. Add ${4 - ipeNodes.length} more.`,
        });
      }
      if (metros.size > 1) {
        issues.push({
          id: 'tier-max-single-metro',
          severity: 'warning',
          message: `Maximum resiliency uses 1 metro. Your nodes span ${metros.size} metros. For multi-metro, use Geodiversity.`,
        });
      }
      break;

    case 'geodiversity':
      if (nodes.length > 0 && ipeNodes.length > 0 && ipeNodes.length < 4) {
        issues.push({
          id: 'tier-geo-link-count',
          severity: 'error',
          message: `Geodiversity requires 4 links across 2 sites in 2 metros. You have ${ipeNodes.length} IPE node${ipeNodes.length !== 1 ? 's' : ''}.`,
        });
      }
      if (nodes.length > 0 && metros.size < 2 && ipeNodes.length > 0) {
        issues.push({
          id: 'tier-geo-metro-diversity',
          severity: 'error',
          message: `Geodiversity requires nodes in 2 independent metros. ${metros.size === 0 ? 'No metro tags set on nodes.' : 'All nodes are in the same metro.'} Tag IPE nodes with different metros.`,
        });
      }
      break;
  }

  return issues;
}
