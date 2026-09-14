import { IPE } from '../types/ipe';

export const sampleIPEs: IPE[] = [
  {
    id: 'ipe-dallas-1',
    name: 'Dallas-1',
    location: 'Dallas, TX',
    region: 'US West',
    dataCenterProvider: 'Cisco Jasper',
    status: 'active',
    installedCapacity: '100 Gbps',
    availableCapacity: '32 Gbps',
    utilization: 68,
    utilizationTrend: [62, 64, 65, 67, 68, 70, 68],
    peakUtilization: 85,
    cloudOnRamps: [
      { provider: 'AWS', available: true, capacity: '30 Gbps', utilized: '20 Gbps', utilization: 67 },
      { provider: 'Azure', available: true, capacity: '25 Gbps', utilized: '18 Gbps', utilization: 72 },
      { provider: 'Google', available: true, capacity: '25 Gbps', utilized: '16 Gbps', utilization: 64 },
      { provider: 'Oracle', available: true, capacity: '20 Gbps', utilized: '14 Gbps', utilization: 70 }
    ],
    totalConnections: 142,
    totalLinks: 387,
    totalVNFs: 198,
    monthlyRevenue: 128400,
    averageLatency: '4.2ms',
    uptime: '99.99%',
    address: {
      street: '208 S Akard St',
      city: 'Dallas',
      state: 'TX',
      country: 'USA',
      postalCode: '75202'
    },
    capabilities: {
      maxBandwidth: '100 Gbps',
      supportedProtocols: ['BGP', 'OSPF', 'IS-IS', 'MPLS'],
      securityFeatures: ['DDoS Protection', 'Firewall', 'IPS/IDS'],
      monitoringCapabilities: ['NetFlow', 'sFlow', 'SNMP', 'Syslog']
    },
    maintenanceWindow: {
      day: 'Sunday',
      time: '02:00 - 06:00',
      timezone: 'CST'
    },
    createdAt: '2023-01-15T00:00:00Z',
    notes: 'Primary IPE for US Central region operations'
  },
  {
    id: 'ipe-nyc-2',
    name: 'NYC-2',
    location: 'New York, NY',
    region: 'US East',
    dataCenterProvider: 'Equinix',
    status: 'active',
    installedCapacity: '105 Gbps',
    availableCapacity: '29 Gbps',
    utilization: 72,
    utilizationTrend: [68, 70, 71, 73, 72, 74, 72],
    peakUtilization: 89,
    cloudOnRamps: [
      { provider: 'AWS', available: true, capacity: '40 Gbps', utilized: '29 Gbps', utilization: 73 },
      { provider: 'Azure', available: true, capacity: '35 Gbps', utilized: '26 Gbps', utilization: 74 },
      { provider: 'Google', available: true, capacity: '30 Gbps', utilized: '21 Gbps', utilization: 70 }
    ],
    totalConnections: 158,
    totalLinks: 412,
    totalVNFs: 223,
    monthlyRevenue: 142800,
    averageLatency: '3.8ms',
    uptime: '99.98%',
    redundantIPE: 'ipe-nyc-3',
    address: {
      street: '755 Secaucus Road',
      city: 'Secaucus',
      state: 'NJ',
      country: 'USA',
      postalCode: '07094'
    },
    capabilities: {
      maxBandwidth: '105 Gbps',
      supportedProtocols: ['BGP', 'OSPF', 'MPLS', 'EVPN'],
      securityFeatures: ['DDoS Protection', 'Firewall', 'IPS/IDS', 'WAF'],
      monitoringCapabilities: ['NetFlow', 'sFlow', 'SNMP', 'Syslog', 'Prometheus']
    },
    maintenanceWindow: {
      day: 'Sunday',
      time: '01:00 - 05:00',
      timezone: 'EST'
    },
    createdAt: '2022-11-20T00:00:00Z',
    notes: 'High-capacity IPE with redundancy for critical enterprise customers'
  },
  {
    id: 'ipe-sfo-1',
    name: 'SFO-1',
    location: 'San Francisco, CA',
    region: 'US West',
    dataCenterProvider: 'Databank',
    status: 'active',
    installedCapacity: '80 Gbps',
    availableCapacity: '34 Gbps',
    utilization: 58,
    utilizationTrend: [55, 56, 57, 58, 59, 57, 58],
    peakUtilization: 72,
    cloudOnRamps: [
      { provider: 'AWS', available: true, capacity: '25 Gbps', utilized: '14 Gbps', utilization: 56 },
      { provider: 'Azure', available: true, capacity: '20 Gbps', utilized: '12 Gbps', utilization: 60 },
      { provider: 'Google', available: true, capacity: '20 Gbps', utilized: '11 Gbps', utilization: 55 },
      { provider: 'Oracle', available: true, capacity: '15 Gbps', utilized: '9 Gbps', utilization: 60 }
    ],
    totalConnections: 127,
    totalLinks: 342,
    totalVNFs: 176,
    monthlyRevenue: 98200,
    averageLatency: '5.1ms',
    uptime: '99.97%',
    address: {
      city: 'San Francisco',
      state: 'CA',
      country: 'USA',
      postalCode: '94105'
    },
    capabilities: {
      maxBandwidth: '80 Gbps',
      supportedProtocols: ['BGP', 'OSPF', 'MPLS'],
      securityFeatures: ['DDoS Protection', 'Firewall'],
      monitoringCapabilities: ['NetFlow', 'SNMP', 'Syslog']
    },
    maintenanceWindow: {
      day: 'Sunday',
      time: '03:00 - 06:00',
      timezone: 'PST'
    },
    createdAt: '2023-03-10T00:00:00Z'
  },
  {
    id: 'ipe-chicago-1',
    name: 'Chicago-1',
    location: 'Chicago, IL',
    region: 'US East',
    dataCenterProvider: 'Equinix',
    status: 'active',
    installedCapacity: '90 Gbps',
    availableCapacity: '22 Gbps',
    utilization: 76,
    utilizationTrend: [72, 74, 75, 77, 76, 78, 76],
    peakUtilization: 92,
    cloudOnRamps: [
      { provider: 'AWS', available: true, capacity: '30 Gbps', utilized: '23 Gbps', utilization: 77 },
      { provider: 'Azure', available: true, capacity: '25 Gbps', utilized: '19 Gbps', utilization: 76 },
      { provider: 'Google', available: true, capacity: '20 Gbps', utilized: '15 Gbps', utilization: 75 },
      { provider: 'Oracle', available: true, capacity: '15 Gbps', utilized: '11 Gbps', utilization: 73 }
    ],
    totalConnections: 134,
    totalLinks: 368,
    totalVNFs: 189,
    monthlyRevenue: 115600,
    averageLatency: '4.5ms',
    uptime: '99.96%',
    address: {
      city: 'Chicago',
      state: 'IL',
      country: 'USA',
      postalCode: '60654'
    },
    capabilities: {
      maxBandwidth: '90 Gbps',
      supportedProtocols: ['BGP', 'OSPF', 'IS-IS', 'MPLS'],
      securityFeatures: ['DDoS Protection', 'Firewall', 'IPS/IDS'],
      monitoringCapabilities: ['NetFlow', 'sFlow', 'SNMP']
    },
    maintenanceWindow: {
      day: 'Sunday',
      time: '02:00 - 05:00',
      timezone: 'CST'
    },
    createdAt: '2023-02-01T00:00:00Z',
    notes: 'Approaching capacity - expansion planned for Q3'
  },
  {
    id: 'ipe-london-1',
    name: 'London-1',
    location: 'London, UK',
    region: 'Europe',
    dataCenterProvider: 'Equinix',
    status: 'active',
    installedCapacity: '85 Gbps',
    availableCapacity: '38 Gbps',
    utilization: 55,
    utilizationTrend: [52, 53, 54, 56, 55, 57, 55],
    peakUtilization: 68,
    cloudOnRamps: [
      { provider: 'AWS', available: true, capacity: '35 Gbps', utilized: '19 Gbps', utilization: 54 },
      { provider: 'Azure', available: true, capacity: '30 Gbps', utilized: '17 Gbps', utilization: 57 },
      { provider: 'Google', available: false }
    ],
    totalConnections: 98,
    totalLinks: 267,
    totalVNFs: 134,
    monthlyRevenue: 89400,
    averageLatency: '6.2ms',
    uptime: '99.98%',
    address: {
      city: 'London',
      country: 'United Kingdom',
      postalCode: 'E14 5AB'
    },
    capabilities: {
      maxBandwidth: '85 Gbps',
      supportedProtocols: ['BGP', 'OSPF', 'MPLS'],
      securityFeatures: ['DDoS Protection', 'Firewall'],
      monitoringCapabilities: ['NetFlow', 'SNMP']
    },
    maintenanceWindow: {
      day: 'Sunday',
      time: '01:00 - 04:00',
      timezone: 'GMT'
    },
    createdAt: '2023-04-15T00:00:00Z'
  },
  {
    id: 'ipe-atlanta-1',
    name: 'Atlanta-1',
    location: 'Atlanta, GA',
    region: 'US East',
    dataCenterProvider: 'Databank',
    status: 'active',
    installedCapacity: '95 Gbps',
    availableCapacity: '33 Gbps',
    utilization: 65,
    utilizationTrend: [62, 63, 64, 66, 65, 67, 65],
    peakUtilization: 81,
    cloudOnRamps: [
      { provider: 'AWS', available: true, capacity: '30 Gbps', utilized: '20 Gbps', utilization: 67 },
      { provider: 'Azure', available: true, capacity: '28 Gbps', utilized: '18 Gbps', utilization: 64 },
      { provider: 'Google', available: true, capacity: '22 Gbps', utilized: '14 Gbps', utilization: 64 },
      { provider: 'Oracle', available: true, capacity: '15 Gbps', utilized: '10 Gbps', utilization: 67 }
    ],
    totalConnections: 118,
    totalLinks: 324,
    totalVNFs: 167,
    monthlyRevenue: 102300,
    averageLatency: '4.8ms',
    uptime: '99.97%',
    address: {
      city: 'Atlanta',
      state: 'GA',
      country: 'USA',
      postalCode: '30303'
    },
    capabilities: {
      maxBandwidth: '95 Gbps',
      supportedProtocols: ['BGP', 'OSPF', 'MPLS'],
      securityFeatures: ['DDoS Protection', 'Firewall', 'IPS/IDS'],
      monitoringCapabilities: ['NetFlow', 'SNMP', 'Syslog']
    },
    maintenanceWindow: {
      day: 'Sunday',
      time: '02:00 - 05:00',
      timezone: 'EST'
    },
    createdAt: '2023-01-28T00:00:00Z'
  }
];
