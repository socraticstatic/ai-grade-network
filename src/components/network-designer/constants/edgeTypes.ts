import type { NetworkNode, NetworkEdge } from '../types/designer';

export const EDGE_TYPE_COLORS: Record<string, string> = {
  'MPLS': '#3b82f6',
  'Direct Connect': '#f97316',
  'ExpressRoute': '#6366f1',
  'Cloud Interconnect': '#8b5cf6',
  'FastConnect': '#ef4444',
  'Ethernet': '#06b6d4',
  'Dark Fiber': '#a855f7',
  'Wavelength': '#14b8a6',
  'Internet': '#6b7280',
  'VPN': '#22c55e',
} as const;

export const EDGE_TYPE_OPTIONS = [
  { value: 'MPLS', label: 'MPLS (AT&T AVPN)' },
  { value: 'Direct Connect', label: 'AWS Interconnect – last mile' },
  { value: 'ExpressRoute', label: 'Azure ExpressRoute' },
  { value: 'Cloud Interconnect', label: 'GCP Cloud Interconnect' },
  { value: 'FastConnect', label: 'Oracle FastConnect' },
  { value: 'Ethernet', label: 'Ethernet (AT&T ASE)' },
  { value: 'Dark Fiber', label: 'Dark Fiber' },
  { value: 'Wavelength', label: 'AT&T Wavelength' },
  { value: 'Internet', label: 'Internet' },
  { value: 'VPN', label: 'VPN' },
] as const;

export const BANDWIDTH_OPTIONS = [
  '50 Mbps', '100 Mbps', '200 Mbps', '500 Mbps',
  '1 Gbps', '2 Gbps', '5 Gbps', '10 Gbps', '40 Gbps', '100 Gbps',
] as const;

const CLOUD_INTERCONNECT_MAP: Record<string, { type: string; description: string }> = {
  aws: { type: 'Direct Connect', description: 'AWS Interconnect – last mile via NetBond' },
  azure: { type: 'ExpressRoute', description: 'Azure ExpressRoute via NetBond' },
  gcp: { type: 'Cloud Interconnect', description: 'GCP Partner Interconnect via NetBond' },
  oracle: { type: 'FastConnect', description: 'Oracle FastConnect via NetBond' },
};

export function getEdgeDefaults(
  source: NetworkNode,
  target: NetworkNode
): Partial<NetworkEdge> {
  const isHub = (n: NetworkNode) =>
    n.type === 'function' && n.functionType === 'router' && n.subType === 'cloud';
  const isIPE = (n: NetworkNode) =>
    n.type === 'network' && n.functionType === 'ipe';
  const isCloud = (n: NetworkNode) => n.type === 'destination' && n.cloudProvider;
  const isDC = (n: NetworkNode) => n.type === 'datacenter';
  const isFirewall = (n: NetworkNode) =>
    n.type === 'function' && n.functionType === 'firewall';
  const isSDWAN = (n: NetworkNode) =>
    n.type === 'function' && n.functionType === 'sdwan';

  if ((isIPE(source) && isHub(target)) || (isHub(source) && isIPE(target))) {
    return { type: 'MPLS', bandwidth: '10 Gbps', config: { resilience: 'redundant' } };
  }
  if (isHub(source) && isCloud(target)) {
    const mapping = CLOUD_INTERCONNECT_MAP[target.cloudProvider || ''];
    if (mapping) {
      return { type: mapping.type, bandwidth: '10 Gbps', config: { resilience: 'redundant' } };
    }
  }
  if (isCloud(source) && isHub(target)) {
    const mapping = CLOUD_INTERCONNECT_MAP[source.cloudProvider || ''];
    if (mapping) {
      return { type: mapping.type, bandwidth: '10 Gbps', config: { resilience: 'redundant' } };
    }
  }
  if ((isHub(source) && isDC(target)) || (isDC(source) && isHub(target))) {
    return { type: 'Ethernet', bandwidth: '10 Gbps' };
  }
  if ((isSDWAN(source) && isIPE(target)) || (isIPE(source) && isSDWAN(target))) {
    return { type: 'MPLS', bandwidth: '1 Gbps' };
  }
  if ((isFirewall(source) && isHub(target)) || (isHub(source) && isFirewall(target))) {
    return { type: 'Ethernet', bandwidth: '10 Gbps' };
  }
  return { type: 'Ethernet', bandwidth: '1 Gbps' };
}
