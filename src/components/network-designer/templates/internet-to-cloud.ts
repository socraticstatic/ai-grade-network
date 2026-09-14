import { Router, Cloud, Globe } from 'lucide-react';
import { Template } from './types';

export const internetToCloudTemplate: Template = {
  name: 'Internet to Cloud',
  description: 'AT&T Core through Hub to cloud services',
  preview: {
    icons: [
      { type: 'col', icons: [
        { icon: Globe, color: 'text-orange-400' }
      ]},
      { type: 'col', icons: [
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
      x: 300,
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
      x: 500,
      y: 200,
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
      id: 'router-to-cloud',
      source: 'hub-1',
      target: 'aws-cloud-1',
      type: 'Direct Connect',
      bandwidth: '10 Gbps',
      status: 'inactive',
      config: {
        resilience: 'standard'
      }
    }
  ]
};