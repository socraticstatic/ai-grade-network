import { Router, Cloud, Globe } from 'lucide-react';
import { Template } from './types';

export const cloudToCloudLocalTemplate: Template = {
  name: 'Cloud to Cloud - Local',
  description: 'AT&T Core through Hub to multiple cloud providers',
  preview: {
    icons: [
      { type: 'col', icons: [
        { icon: Globe, color: 'text-orange-400' }
      ]},
      { type: 'col', icons: [
        { icon: Router, color: 'text-purple-400' }
      ]},
      { type: 'col', icons: [
        { icon: Cloud, color: 'text-blue-400' },
        { icon: Cloud, color: 'text-blue-400' }
      ]}
    ]
  },
  nodes: [
    {
      id: 'att-core-1',
      type: 'network',
      x: 100,
      y: 200,
      name: 'AT&T Core',
      icon: 'Globe',
      status: 'unconfigured',
      config: {
        networkType: 'at&t core',
        provider: 'AT&T'
      }
    },
    {
      id: 'hub-1',
      type: 'function',
      functionType: 'Router',
      x: 250,
      y: 200,
      name: 'Hub',
      icon: 'Router',
      status: 'unconfigured',
      config: {
        routerType: 'cloud',
        asn: 65000,
        capacity: '10Gbps'
      }
    },
    {
      id: 'aws-cloud-1',
      type: 'destination',
      x: 400,
      y: 150,
      name: 'AWS Cloud',
      icon: 'Cloud',
      status: 'unconfigured',
      config: {
        provider: 'AWS',
        region: 'us-east-1'
      }
    },
    {
      id: 'azure-cloud-1',
      type: 'destination',
      x: 400,
      y: 250,
      name: 'Azure Cloud',
      icon: 'Cloud',
      status: 'unconfigured',
      config: {
        provider: 'Azure',
        region: 'eastus'
      }
    }
  ],
  edges: [
    {
      id: 'att-to-router',
      source: 'att-core-1',
      target: 'hub-1',
      type: 'MPLS',
      bandwidth: '10 Gbps',
      status: 'inactive',
      config: {
        resilience: 'standard'
      }
    },
    {
      id: 'router-to-aws',
      source: 'hub-1',
      target: 'aws-cloud-1',
      type: 'Direct Connect',
      bandwidth: '10 Gbps',
      status: 'inactive',
      config: {
        resilience: 'standard'
      }
    },
    {
      id: 'router-to-azure',
      source: 'hub-1',
      target: 'azure-cloud-1',
      type: 'ExpressRoute',
      bandwidth: '10 Gbps',
      status: 'inactive',
      config: {
        resilience: 'standard'
      }
    }
  ]
};