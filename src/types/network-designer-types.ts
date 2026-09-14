// Network types
export interface NetworkNode {
  id: string;
  type: 'function' | 'destination' | 'network' | 'datacenter';
  functionType?: 'Router' | 'SDWAN' | 'Firewall' | 'VNF' | 'VNAT'; // Type for function nodes
  x: number;
  y: number;
  name: string;
  icon: any; // Will be a Lucide icon component
  status: 'active' | 'inactive';
  config?: {
    // Common properties
    provider?: string;
    region?: string;
    location?: string;

    // Geographic properties
    city?: string;
    state?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    facilityCode?: string;
    
    // Network type properties
    networkType?: 'internet' | 'vpn' | 'ethernet' | 'iot' | 'private';
    subnet?: string;
    vlanId?: number;
    
    // Function properties - Router
    routerType?: 'virtual' | 'physical' | 'cloud' | 'edge' | 'core';
    routingProtocol?: 'bgp' | 'ospf' | 'eigrp' | 'is-is' | 'static';
    asn?: number;
    bgpConfig?: string;
    interfaceSpeed?: string;
    fastReroute?: boolean;
    bfd?: boolean;
    recoveryTime?: string;
    
    // Function properties - SDWAN
    sdwanRole?: 'edge' | 'controller' | 'orchestrator' | 'hub';
    sdwanType?: 'controller' | 'edge';
    tunnelProtocol?: 'ipsec' | 'gre' | 'vxlan' | 'proprietary';
    trafficPolicies?: string;
    wanOptimization?: boolean;
    appSteering?: 'dynamic' | 'static' | 'hybrid';
    
    // Function properties - Firewall
    firewallType?: 'ngfw' | 'waf' | 'stateful' | 'ids_ips';
    deploymentMode?: 'inline' | 'tap' | 'proxy';
    securityPolicies?: string;
    inspectionLevel?: 'stateful' | 'deep' | 'application';
    dpi?: boolean;
    
    // Function properties - VNF
    vnfType?: 'router' | 'firewall' | 'loadbalancer' | 'ids' | 'wan' | 'multifunction';
    resources?: 'small' | 'medium' | 'large' | 'xlarge';
    highAvailability?: boolean;
    
    // Function properties - VNAT
    natType?: 'static' | 'dynamic' | 'pat' | 'cgnat';
    ipPool?: string;
    translationRules?: string;
    
    // Datacenter properties
    physicalSecurity?: boolean;
    dcCompliance?: 'tier3' | 'tier4' | 'soc2' | 'iso27001';
    
    // Cloud properties
    cloudSecurity?: 'standard' | 'enhanced' | 'custom';
    complianceLevel?: 'standard' | 'hipaa' | 'pci' | 'sox' | 'gdpr';
    vpcId?: string;
    routeTables?: string;
    
    // Security properties
    accessControl?: 'private' | 'public' | 'restricted';
    securityGroups?: string;
    networkSecurity?: 'standard' | 'enhanced' | 'custom';
    firewallRules?: string;
    ddosProtection?: boolean;
    
    // Routing properties
    routeDistribution?: 'none' | 'ospf' | 'eigrp' | 'rip';
    routeFilters?: string;
    routeAdvertisement?: string;
    staticRoutes?: string;
    propagatedRoutes?: string;
    
    // Other properties
    [key: string]: any;
  };
}

export interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  bandwidth: string;
  status: 'active' | 'inactive';
  vlan?: number;
  metrics?: {
    latency?: string;
    throughput?: string;
    packetLoss?: string;
    bandwidthUtilization?: number;
  };
  config?: {
    resilience?: 'single' | 'redundant' | 'ha' | 'dualdiverse';
    recoveryTime?: 'standard' | 'fast' | 'ultrafast' | 'none';
    encrypted?: boolean;
    bfd?: boolean;
    qosProfile?: 'besteffort' | 'voice' | 'video' | 'critical' | 'bulk';
    fastConvergence?: boolean;
    replication?: boolean;
    syncType?: 'sync' | 'async';
    [key: string]: any;
  };
}

interface VLAN {
  id: string;
  name: string;
  vlanId: number;
  description?: string;
  tags?: string[];
}

type ViewMode = 'grid' | 'list' | 'topology';

export interface ConnectionConfig {
  provider: string;
  type: string;
  bandwidth: string;
  location: string;
  nodes?: NetworkNode[];
  edges?: NetworkEdge[];
  vlans?: VLAN[];
}

// Toast types
interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}