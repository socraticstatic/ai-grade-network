export type PolicyAppliesTo = 'all' | 'links' | 'hubs' | 'vnfs';

export type PolicyAction = 'allow' | 'deny' | 'manipulate' | 'advertise';

export type PolicyProtocol = 'any' | 'tcp' | 'udp' | 'icmp' | 'bgp' | 'ospf';

export interface PolicyCondition {
  id: string;
  type: 'source' | 'destination' | 'port' | 'protocol' | 'prefix' | 'community' | 'as-path';
  operator: 'equals' | 'contains' | 'matches' | 'range';
  value: string;
}

export interface RoutingPolicy {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  priority: number;
  action: PolicyAction;
  protocol: PolicyProtocol;
  conditions: PolicyCondition[];
  appliesTo: PolicyAppliesTo;
  targetIds: string[]; // IDs of links, hubs, or VNFs this applies to
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface PolicyTarget {
  id: string;
  name: string;
  type: 'link' | 'hub' | 'vnf';
}

// --- Per-connection specificity for inherited global policies ---

export interface PolicyPrefix {
  id: string;
  value: string;        // CIDR notation: "10.0.0.0/8"
  action: 'include' | 'exclude';
}

export interface PolicyCommunity {
  id: string;
  value: string;        // "65000:100"
  action: 'match' | 'tag' | 'strip';
}

export interface PolicyASPath {
  id: string;
  pattern: string;      // Regex: "^65001$"
  action: 'allow' | 'deny' | 'prepend';
  prependCount?: number;
}

export type PolicyDirection = 'onPremiseToPartner' | 'partnerToOnPremise';

export type PolicyProtocolContext = 'internet' | 'l3vpn-ipv4' | 'l3vpn-ipv6' | 'restricted-ipv4';

export interface InheritedPolicyOverride {
  globalPolicyId: string;
  globalPolicyName: string;
  globalPolicyAction: PolicyAction;
  protocolContext: PolicyProtocolContext;
  direction: PolicyDirection;
  overrideEnabled: boolean;
  prefixes: PolicyPrefix[];
  communities: PolicyCommunity[];
  asPathFilters: PolicyASPath[];
  priority: number;
}
