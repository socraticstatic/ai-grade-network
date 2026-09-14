export const NODE_CATEGORIES = {
  function: {
    label: 'Network Functions',
    items: [
      { type: 'router', label: 'Hub', subtypes: ['cloud', 'physical', 'virtual', 'edge', 'core'], icon: 'hub' },
      { type: 'firewall', label: 'Firewall', subtypes: ['ngfw', 'waf', 'stateful', 'ids-ips'], icon: 'Shield' },
      { type: 'vnf', label: 'VNF', subtypes: ['router', 'firewall', 'load-balancer', 'ids', 'wan-optimizer', 'multifunction'], icon: 'Cpu' },
      { type: 'sdwan', label: 'SD-WAN', subtypes: ['edge', 'controller', 'hub'], icon: 'Waypoints' },
      { type: 'flexware', label: 'FlexWare (uCPE)', subtypes: [], icon: 'Server' },
    ],
  },
  network: {
    label: 'Network Types',
    items: [
      { type: 'internet', label: 'Internet', icon: 'Globe' },
      { type: 'avpn', label: 'AT&T AVPN (MPLS)', icon: 'Network' },
      { type: 'ase', label: 'AT&T ASE (L2 Ethernet)', icon: 'Cable' },
      { type: 'adi', label: 'AT&T ADI (Dedicated Internet)', icon: 'Wifi' },
      { type: 'wavelength', label: 'AT&T Wavelength', icon: 'Radio' },
      { type: 'ipe', label: 'AT&T Core (IPE)', icon: 'CircleDot' },
    ],
  },
  cloud: {
    label: 'Cloud Providers',
    items: [
      { provider: 'aws', label: 'AWS (Interconnect – last mile)', icon: 'Cloud' },
      { provider: 'azure', label: 'Azure (ExpressRoute)', icon: 'Cloud' },
      { provider: 'gcp', label: 'Google Cloud (Interconnect)', icon: 'Cloud' },
      { provider: 'oracle', label: 'Oracle Cloud (FastConnect)', icon: 'Cloud' },
    ],
  },
  datacenter: {
    label: 'Data Centers',
    items: [
      { provider: 'equinix', label: 'Equinix', icon: 'Building2' },
      { provider: 'digital-realty', label: 'Digital Realty', icon: 'Building2' },
      { provider: 'cyrusone', label: 'CyrusOne', icon: 'Building2' },
      { provider: 'coresite', label: 'CoreSite', icon: 'Building2' },
      { provider: 'databank', label: 'DataBank', icon: 'Building2' },
    ],
  },
} as const;

export function getIconName(type: string, functionType: string): string {
  if (type === 'destination') return 'Cloud';
  if (type === 'datacenter') return 'Building2';
  if (type === 'network') {
    const networkItem = NODE_CATEGORIES.network.items.find(i => i.type === functionType);
    return networkItem?.icon || 'Network';
  }
  if (type === 'function') {
    const functionItem = NODE_CATEGORIES.function.items.find(i => i.type === functionType);
    return functionItem?.icon || 'Box';
  }
  return 'Box';
}

export function getDefaultNodeName(type: string, functionType: string, subType?: string): string {
  if (type === 'destination') return `Cloud (${functionType})`;
  if (type === 'datacenter') return functionType.charAt(0).toUpperCase() + functionType.slice(1);
  if (type === 'network') {
    const item = NODE_CATEGORIES.network.items.find(i => i.type === functionType);
    return item?.label || functionType;
  }
  const item = NODE_CATEGORIES.function.items.find(i => i.type === functionType);
  const base = item?.label || functionType;
  return subType ? `${base} (${subType})` : base;
}
