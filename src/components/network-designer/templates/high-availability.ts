import { Router, Cloud, Globe } from 'lucide-react';
import { Template } from './types';

export const highAvailabilityTemplate: Template = {
  name: 'High Availability',
  description: 'AT&T Core with redundant Hub connectivity for high availability',
  preview: {
    icons: [
      { type: 'col', icons: [
        { icon: Globe, color: 'text-orange-400' }
      ]},
      { type: 'col', icons: [
        { icon: Router, color: 'text-purple-400' },
        { icon: Router, color: 'text-purple-400' }
      ]},
      { type: 'col', icons: [
        { icon: Cloud, color: 'text-blue-400' }
      ]}
    ]
  },
  nodes: [
    {
      id: 'att-core-1',
      type: 'network',
      x: 100,
      y: 225,
      name: 'AT&T Core',
      icon: 'Globe',
      status: 'unconfigured',
      config: {
        networkType: 'at&t core',
        provider: 'AT&T'
      }
    },
    {
      id: 'primary-hub',
      type: 'function',
      functionType: 'Router',
      x: 250,
      y: 150,
      name: 'Primary Hub',
      icon: 'Router',
      status: 'unconfigured',
      config: {
        routerType: 'cloud',
        asn: 65000,
        fastReroute: true,
        bfd: true
      }
    },
    {
      id: 'secondary-hub',
      type: 'function',
      functionType: 'Router',
      x: 250,
      y: 300,
      name: 'Secondary Hub',
      icon: 'Router',
      status: 'unconfigured',
      config: {
        routerType: 'cloud',
        asn: 65001,
        fastReroute: true,
        bfd: true
      }
    },
    {
      id: 'aws-cloud-1',
      type: 'destination',
      x: 400,
      y: 225,
      name: 'AWS Cloud',
      icon: 'Cloud',
      status: 'unconfigured',
      config: {
        provider: 'AWS',
        region: 'us-east-1'
      }
    }
  ],
  edges: [
    {
      id: 'att-to-primary',
      source: 'att-core-1',
      target: 'primary-hub',
      type: 'MPLS',
      bandwidth: '10 Gbps',
      status: 'inactive',
      config: {
        resilience: 'ha',
        bfd: true
      }
    },
    {
      id: 'att-to-secondary',
      source: 'att-core-1',
      target: 'secondary-hub',
      type: 'MPLS',
      bandwidth: '10 Gbps',
      status: 'inactive',
      config: {
        resilience: 'ha',
        bfd: true
      }
    },
    {
      id: 'primary-to-cloud',
      source: 'primary-hub',
      target: 'aws-cloud-1',
      type: 'Direct Connect',
      bandwidth: '10 Gbps',
      status: 'inactive',
      config: {
        resilience: 'ha',
        bfd: true
      }
    },
    {
      id: 'secondary-to-cloud',
      source: 'secondary-hub',
      target: 'aws-cloud-1',
      type: 'Direct Connect',
      bandwidth: '10 Gbps',
      status: 'inactive',
      config: {
        resilience: 'ha',
        bfd: true
      }
    },
    {
      id: 'router-interconnect',
      source: 'primary-hub',
      target: 'secondary-hub',
      type: 'Direct Connect',
      bandwidth: '10 Gbps',
      status: 'inactive',
      config: {
        resilience: 'ha',
        bfd: true,
        fastConvergence: true
      }
    }
  ]
};