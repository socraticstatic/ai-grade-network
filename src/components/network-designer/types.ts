export interface NetworkNode {
  id: string;
  type: 'function' | 'destination' | 'network' | 'datacenter';
  functionType?: 'Router' | 'SDWAN' | 'Firewall' | 'VNF' | 'VNAT';
  x: number;
  y: number;
  name: string;
  icon: string;
  status: 'active' | 'inactive';
  config?: {
    provider?: string;
    region?: string;
    location?: string;
    city?: string;
    state?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    facilityCode?: string;
    networkType?: 'internet' | 'vpn' | 'ethernet' | 'iot' | 'private';
    subnet?: string;
    vlanId?: number;
    routerType?: 'virtual' | 'physical' | 'cloud' | 'edge' | 'core';
    routingProtocol?: 'bgp' | 'ospf' | 'eigrp' | 'is-is' | 'static';
    asn?: number;
    bgpConfig?: string;
    interfaceSpeed?: string;
    fastReroute?: boolean;
    bfd?: boolean;
    recoveryTime?: string;
    sdwanRole?: 'edge' | 'controller' | 'orchestrator' | 'hub';
    sdwanType?: 'controller' | 'edge';
    tunnelProtocol?: 'ipsec' | 'gre' | 'vxlan' | 'proprietary';
    trafficPolicies?: string;
    wanOptimization?: boolean;
    appSteering?: 'dynamic' | 'static' | 'hybrid';
    firewallType?: 'ngfw' | 'waf' | 'stateful' | 'ids_ips';
    deploymentMode?: 'inline' | 'tap' | 'proxy';
    securityPolicies?: string;
    inspectionLevel?: 'stateful' | 'deep' | 'application';
    dpi?: boolean;
    vnfType?: 'router' | 'firewall' | 'loadbalancer' | 'ids' | 'wan' | 'multifunction';
    resources?: 'small' | 'medium' | 'large' | 'xlarge';
    highAvailability?: boolean;
    natType?: 'static' | 'dynamic' | 'pat' | 'cgnat';
    ipPool?: string;
    translationRules?: string;
    physicalSecurity?: boolean;
    dcCompliance?: 'tier3' | 'tier4' | 'soc2' | 'iso27001';
    cloudSecurity?: 'standard' | 'enhanced' | 'custom';
    complianceLevel?: 'standard' | 'hipaa' | 'pci' | 'sox' | 'gdpr';
    vpcId?: string;
    routeTables?: string;
    accessControl?: 'private' | 'public' | 'restricted';
    securityGroups?: string;
    networkSecurity?: 'standard' | 'enhanced' | 'custom';
    firewallRules?: string;
    ddosProtection?: boolean;
    routeDistribution?: 'none' | 'ospf' | 'eigrp' | 'rip';
    routeFilters?: string;
    routeAdvertisement?: string;
    staticRoutes?: string;
    propagatedRoutes?: string;
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

export interface ConnectionConfig {
  provider: string;
  type: string;
  bandwidth: string;
  location: string;
  nodes?: NetworkNode[];
  edges?: NetworkEdge[];
}
