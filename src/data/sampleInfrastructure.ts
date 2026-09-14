import { Hub } from '../types/hub';
import { VNF } from '../types/vnf';
import { Link } from '../types/connection';

export const sampleRouters: Hub[] = [
  {
    // Ashburn VPN hub. Hubs group automatically by location + route domain (internet vs
    // VPN — two route tables). This one carries a custom name to demo the rename feature.
    id: 'hub-showcase',
    name: 'Enterprise Multi-Cloud Hub',
    description: 'VPN connections at Ashburn, VA — grouped automatically, renamed by an admin',
    status: 'active',
    location: 'Ashburn, VA',
    locations: ['Ashburn, VA'],
    routeDomain: 'vpn',
    autoGrouped: true,
    vendor: 'Juniper',
    vendors: ['Juniper'],
    connectionIds: ['conn-sc-vpn-aws', 'conn-sc-vpn-azure', 'conn-sc-vpn-gcp'],
    createdAt: '2026-04-20T09:00:00Z',
    links: [],
    configuration: {
      asn: 65020,
      bgpEnabled: true,
      routeFilters: ['10.50.0.0/16', '10.60.0.0/16'],
    },
    performance: {
      latency: '3.1ms',
      throughput: '9.1 Gbps',
      cpuUsage: 44.0,
      memoryUsage: 66.0,
      bgpSessions: { total: 9, active: 8, idle: 1 },
      routingTableSize: 41200,
      packetForwardingRate: 880,
      controlPlaneLoad: 17.8,
    },
  },
  {
    id: 'router-east',
    name: 'AT&T Core East',
    description: 'Primary hub for US East connectivity',
    status: 'active',
    location: 'Ashburn, VA',
    locations: ['Ashburn, VA'],
    routeDomain: 'internet',
    autoGrouped: true,
    vendor: 'Cisco',
    vendors: ['Cisco'],
    connectionIds: ['conn-1', 'conn-aws-pending-1', 'conn-sc-c2c-aws-azure', 'conn-sc-c2c-aws-gcp'],
    createdAt: '2024-01-15T10:00:00Z',
    links: [],
    configuration: {
      asn: 65001,
      bgpEnabled: true,
      routeFilters: ['192.168.0.0/16', '10.0.0.0/8']
    },
    performance: {
      latency: '3.8ms',
      throughput: '8.5 Gbps',
      cpuUsage: 42.5,
      memoryUsage: 68.2,
      bgpSessions: { total: 16, active: 14, idle: 2 },
      routingTableSize: 48532,
      packetForwardingRate: 950,
      controlPlaneLoad: 18.3
    }
  },
  {
    id: 'router-west',
    name: 'AT&T Core West',
    description: 'Primary hub for US West / AWS Max connectivity',
    status: 'active',
    location: 'San Jose, CA',
    locations: ['San Jose, CA'],
    routeDomain: 'internet',
    autoGrouped: true,
    vendor: 'Juniper',
    vendors: ['Juniper'],
    connectionIds: ['conn-lmcc-1', 'conn-lmcc-pending'],
    createdAt: '2024-01-20T14:00:00Z',
    links: [],
    configuration: {
      asn: 65002,
      bgpEnabled: true,
      routeFilters: ['10.128.0.0/9']
    },
    performance: {
      latency: '2.1ms',
      throughput: '6.2 Gbps',
      cpuUsage: 38.5,
      memoryUsage: 61.4,
      bgpSessions: { total: 12, active: 12, idle: 0 },
      routingTableSize: 38400,
      packetForwardingRate: 820,
      controlPlaneLoad: 14.2
    }
  },
  {
    id: 'router-hub',
    name: 'AT&T Enterprise Hub',
    description: 'Multi-cloud hub for Azure and GCP connectivity',
    status: 'active',
    location: 'Dallas, TX',
    locations: ['Dallas, TX'],
    routeDomain: 'internet',
    autoGrouped: true,
    vendor: 'Arista',
    vendors: ['Arista'],
    connectionIds: ['conn-2'],
    createdAt: '2024-02-01T09:00:00Z',
    links: [
      {
        id: 'hub-link-azure',
        name: 'Azure-ExpressRoute-VLAN',
        provider: 'Azure',
        vlanId: 310,
        status: 'active',
        type: 'data',
        linkBandwidth: '10 Gbps',
        hubIds: ['router-hub'],
        createdAt: '2024-02-01T09:05:00Z',
      },
      {
        id: 'hub-link-aws',
        name: 'AWS-TransitVIF-VLAN',
        provider: 'AWS',
        vlanId: 311,
        status: 'active',
        type: 'data',
        linkBandwidth: '5 Gbps',
        hubIds: ['router-hub'],
        createdAt: '2024-02-01T09:05:00Z',
      },
    ],
    configuration: {
      asn: 65003,
      bgpEnabled: true,
      routeFilters: ['172.16.0.0/12', '10.3.0.0/16']
    },
    performance: {
      latency: '4.5ms',
      throughput: '7.2 Gbps',
      cpuUsage: 45.3,
      memoryUsage: 71.8,
      bgpSessions: { total: 18, active: 17, idle: 1 },
      routingTableSize: 52143,
      packetForwardingRate: 820,
      controlPlaneLoad: 21.5
    }
  },
  {
    // Hub for the reference Cloud to Cloud connection (conn-c2c-demo): links the AWS
    // and Google legs through a single Hub with provider-tagged VLANs.
    id: 'gw-c2c-demo',
    name: 'AWS · Google C2C Hub',
    description: 'Inter-cloud hub privately bridging AWS and Google Cloud',
    status: 'active',
    location: 'Ashburn, VA',
    locations: ['Ashburn, VA', 'Council Bluffs, IA'],
    vendor: 'Cisco',
    vendors: ['Cisco'],
    connectionIds: ['conn-c2c-demo'],
    createdAt: '2024-03-01T09:00:00Z',
    links: [
      {
        id: 'c2c-demo-link-aws',
        name: 'AWS-DirectConnect-VLAN',
        provider: 'AWS',
        vlanId: 410,
        status: 'active',
        type: 'data',
        linkBandwidth: '10 Gbps',
        hubIds: ['gw-c2c-demo'],
        createdAt: '2024-03-01T09:05:00Z',
      },
      {
        id: 'c2c-demo-link-google',
        name: 'Google-Interconnect-VLAN',
        provider: 'Google',
        vlanId: 420,
        status: 'active',
        type: 'data',
        linkBandwidth: '10 Gbps',
        hubIds: ['gw-c2c-demo'],
        createdAt: '2024-03-01T09:05:00Z',
      },
    ],
    configuration: {
      asn: 65010,
      bgpEnabled: true,
      routeFilters: ['10.10.0.0/16', '10.20.0.0/16']
    },
    performance: {
      latency: '3.2ms',
      throughput: '8.4 Gbps',
      cpuUsage: 38.0,
      memoryUsage: 61.5,
      bgpSessions: { total: 4, active: 4, idle: 0 },
      routingTableSize: 28400,
      packetForwardingRate: 910,
      controlPlaneLoad: 16.2
    }
  },
  {
    // Auto-derived location hub: default name is its location until an admin renames it.
    id: 'hub-auto-new-york-ny',
    name: 'New York, NY',
    description: 'Grouped automatically by location',
    status: 'active',
    location: 'New York, NY',
    locations: ['New York, NY'],
    routeDomain: 'internet',
    autoGrouped: true,
    connectionIds: ['conn-3'],
    createdAt: '2026-07-10T12:00:00Z',
    links: []
  }
];

export const sampleLinks: Link[] = [
  {
    id: 'link-1',
    name: 'AWS-Primary-Link-01',
    vlanId: 100,
    description: 'Production traffic VLAN',
    tags: ['production', 'primary'],
    status: 'active',
    ipSubnet: '10.1.100.0/24',
    mtu: 9000,
    qosPriority: 1,
    type: 'data',
    hubIds: ['router-east'],
    createdAt: '2024-01-15T11:00:00Z',
    linkBandwidth: '10 Gbps',
    performance: {
      bandwidthCapacity: '10 Gbps',
      currentUsage: '7.2 Gbps',
      utilizationPercentage: 72,
      inboundRate: '450 Mbps',
      outboundRate: '680 Mbps',
      latency: '3.8ms',
      packetLoss: '0.008%',
      errorRate: 0.0012,
      qosMetrics: {
        delayVariation: 0.8,
        priorityQueueDepth: 24
      }
    }
  },
  {
    id: 'link-2',
    name: 'AWS-Primary-Link-02',
    vlanId: 200,
    description: 'Management and monitoring VLAN',
    tags: ['management', 'monitoring'],
    status: 'active',
    ipSubnet: '10.1.200.0/24',
    mtu: 1500,
    qosPriority: 2,
    type: 'management',
    hubIds: ['router-east'],
    createdAt: '2024-01-15T11:15:00Z',
    linkBandwidth: '1 Gbps',
    performance: {
      bandwidthCapacity: '1 Gbps',
      currentUsage: '180 Mbps',
      utilizationPercentage: 18,
      inboundRate: '85 Mbps',
      outboundRate: '95 Mbps',
      latency: '4.1ms',
      packetLoss: '0.005%',
      errorRate: 0.0008,
      qosMetrics: {
        delayVariation: 0.5,
        priorityQueueDepth: 12
      }
    }
  },
  {
    id: 'link-3',
    name: 'AWS-Secondary-Link-01',
    vlanId: 101,
    description: 'Backup production traffic VLAN',
    tags: ['production', 'backup'],
    status: 'active',
    ipSubnet: '10.2.100.0/24',
    mtu: 9000,
    qosPriority: 1,
    type: 'data',
    hubIds: ['router-east'],
    createdAt: '2024-01-15T11:30:00Z',
    linkBandwidth: '10 Gbps',
    performance: {
      bandwidthCapacity: '10 Gbps',
      currentUsage: '5.8 Gbps',
      utilizationPercentage: 58,
      inboundRate: '380 Mbps',
      outboundRate: '520 Mbps',
      latency: '4.2ms',
      packetLoss: '0.010%',
      errorRate: 0.0015,
      qosMetrics: {
        delayVariation: 1.1,
        priorityQueueDepth: 18
      }
    }
  },
  {
    id: 'link-4',
    name: 'Azure-Primary-Link-01',
    provider: 'Azure',
    vlanId: 300,
    description: 'Azure production workloads',
    tags: ['production', 'azure'],
    status: 'active',
    ipSubnet: '10.3.100.0/24',
    mtu: 9000,
    qosPriority: 1,
    type: 'data',
    hubIds: ['router-hub'],
    createdAt: '2024-02-01T09:30:00Z',
    linkBandwidth: '10 Gbps',
    performance: {
      bandwidthCapacity: '10 Gbps',
      currentUsage: '6.5 Gbps',
      utilizationPercentage: 65,
      inboundRate: '420 Mbps',
      outboundRate: '590 Mbps',
      latency: '4.5ms',
      packetLoss: '0.012%',
      errorRate: 0.0018,
      qosMetrics: {
        delayVariation: 1.3,
        priorityQueueDepth: 28
      }
    }
  },
  {
    id: 'link-5',
    name: 'GCP-Edge-Link-01',
    provider: 'Google',
    vlanId: 400,
    description: 'Google Cloud edge link',
    tags: ['production', 'gcp'],
    status: 'active',
    ipSubnet: '10.4.100.0/24',
    mtu: 8900,
    qosPriority: 1,
    type: 'data',
    hubIds: ['router-hub'],
    createdAt: '2024-01-20T14:30:00Z',
    linkBandwidth: '5 Gbps',
    performance: {
      bandwidthCapacity: '5 Gbps',
      currentUsage: '3.2 Gbps',
      utilizationPercentage: 64,
      inboundRate: '285 Mbps',
      outboundRate: '350 Mbps',
      latency: '5.3ms',
      packetLoss: '0.015%',
      errorRate: 0.0020,
      qosMetrics: {
        delayVariation: 1.5,
        priorityQueueDepth: 15
      }
    }
  }
];

export const sampleVNFs: VNF[] = [
  {
    id: 'vnf-1',
    name: 'Primary-Firewall-01',
    type: 'firewall',
    vendor: 'Palo Alto',
    model: 'VM-Series',
    version: '10.2.3',
    status: 'active',
    throughput: '10 Gbps',
    licenseExpiry: '2025-12-31',
    connectionId: 'conn-1',
    hubIds: ['router-1'],
    linkIds: ['link-1', 'link-2'],
    createdAt: '2024-01-15T12:00:00Z',
    configuration: {
      interfaces: [
        {
          id: 'if-1',
          name: 'eth0',
          type: 'wan',
          ipAddress: '10.1.100.10',
          subnetMask: '255.255.255.0',
          status: 'up'
        },
        {
          id: 'if-2',
          name: 'eth1',
          type: 'lan',
          ipAddress: '192.168.1.1',
          subnetMask: '255.255.255.0',
          status: 'up'
        }
      ],
      policies: ['Security Policy 1', 'NAT Policy 1'],
      highAvailability: true,
      managementIP: '10.1.200.10'
    },
    performance: {
      throughput: '8.5 Gbps',
      latency: '0.8ms',
      cpuUsage: 48.5,
      memoryUsage: 72.3,
      activeSessions: 18542,
      maxSessions: 50000,
      policyHitRate: 92.5,
      licenseUtilization: 68.4,
      serviceSpecificMetrics: {
        threatsBlocked: 1254,
        inspectedPackets: 98562145,
        decryptedSessions: 5421
      }
    }
  },
  {
    id: 'vnf-2',
    name: 'SD-WAN-Edge-01',
    type: 'sdwan',
    vendor: 'Cisco',
    model: 'vEdge',
    version: '20.9.1',
    status: 'active',
    throughput: '5 Gbps',
    licenseExpiry: '2025-06-30',
    connectionId: 'conn-1',
    hubIds: ['router-east', 'router-east'],
    linkIds: ['link-1', 'link-3'],
    createdAt: '2024-01-15T13:00:00Z',
    configuration: {
      routingProtocols: ['OSPF', 'BGP'],
      policies: ['QoS Policy 1', 'App-Aware Routing'],
      highAvailability: false,
      managementIP: '10.1.200.11'
    },
    performance: {
      throughput: '4.2 Gbps',
      latency: '1.2ms',
      cpuUsage: 35.8,
      memoryUsage: 58.6,
      activeSessions: 12854,
      maxSessions: 25000,
      policyHitRate: 88.3,
      licenseUtilization: 56.2,
      serviceSpecificMetrics: {
        tunnelsActive: 8,
        tunnelsTotal: 10,
        appRoutingDecisions: 45632
      }
    }
  },
  {
    id: 'vnf-3',
    name: 'Azure-Firewall-01',
    type: 'firewall',
    vendor: 'Fortinet',
    model: 'FortiGate-VM',
    version: '7.2.0',
    status: 'active',
    throughput: '10 Gbps',
    licenseExpiry: '2025-08-15',
    connectionId: 'conn-2',
    hubIds: ['router-hub'],
    linkIds: ['link-4'],
    createdAt: '2024-02-01T10:00:00Z',
    configuration: {
      interfaces: [
        {
          id: 'if-3',
          name: 'port1',
          type: 'wan',
          ipAddress: '10.3.100.10',
          subnetMask: '255.255.255.0',
          status: 'up'
        }
      ],
      policies: ['Default Security Policy', 'IPS Policy'],
      highAvailability: true,
      managementIP: '10.3.200.10'
    },
    performance: {
      throughput: '7.8 Gbps',
      latency: '1.1ms',
      cpuUsage: 52.3,
      memoryUsage: 68.9,
      activeSessions: 22341,
      maxSessions: 50000,
      policyHitRate: 89.7,
      licenseUtilization: 72.1,
      serviceSpecificMetrics: {
        threatsBlocked: 2145,
        inspectedPackets: 125478963,
        ipsEvents: 342
      }
    }
  },
  {
    id: 'vnf-4',
    name: 'GCP-Router-VNF',
    type: 'router',
    vendor: 'VyOS',
    model: 'VyOS-Cloud',
    version: '1.4',
    status: 'active',
    throughput: '5 Gbps',
    connectionId: 'conn-3',
    hubIds: ['router-hub'],
    linkIds: ['link-5'],
    createdAt: '2024-01-20T15:00:00Z',
    configuration: {
      routingProtocols: ['BGP', 'OSPF', 'Static'],
      highAvailability: false,
      managementIP: '10.4.200.10'
    },
    performance: {
      throughput: '3.8 Gbps',
      latency: '0.9ms',
      cpuUsage: 28.4,
      memoryUsage: 42.7,
      activeSessions: 8524,
      maxSessions: 20000,
      policyHitRate: 94.2,
      licenseUtilization: 45.8,
      serviceSpecificMetrics: {
        routesAdvertised: 1254,
        routesReceived: 2145,
        bgpPeers: 4
      }
    }
  }
];
