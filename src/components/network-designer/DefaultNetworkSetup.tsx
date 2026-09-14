import React from 'react';
import { useState, useEffect } from 'react';
import { Router, Network, ArrowRight, Sparkles, Globe, Upload, Brain, FileImage, Zap, LayoutGrid as Layout, Cloud, FolderOpen, Clock, Trash2 } from 'lucide-react';
import { NetworkNode, NetworkEdge } from '../../types';
import { getNodeIcon } from '../../utils/nodeUtils';

interface DefaultNetworkSetupProps {
  isOpen: boolean;
  onComplete: (cloudRouterName: string) => void;
  onApplyTemplate?: (nodes: NetworkNode[], edges: NetworkEdge[]) => void;
}

type SetupMode = 'selection' | 'user' | 'ai' | 'templates' | 'saved';

interface Template {
  id: string;
  name: string;
  description: string;
  preview: {
    icons: { icon: React.ElementType; color: string }[];
  };
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}

interface SavedTopology {
  id: string;
  name: string;
  description: string;
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  savedAt: number;
  lastModified?: number;
}

export function DefaultNetworkSetup({ isOpen, onComplete, onApplyTemplate }: DefaultNetworkSetupProps) {
  const [setupMode, setSetupMode] = useState<SetupMode>('selection');
  const [cloudRouterName, setCloudRouterName] = useState('');
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiProcessingComplete, setAiProcessingComplete] = useState(false);
  const [aiSuggestedName, setAiSuggestedName] = useState('');
  const [savedTopologies, setSavedTopologies] = useState<SavedTopology[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('savedTopologies');
    if (saved) {
      try {
        setSavedTopologies(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load saved topologies:', e);
      }
    } else {
      const mockTopologies: SavedTopology[] = [
        {
          id: 'mock-1',
          name: 'Production Environment',
          description: 'Main production network with redundant connections to AWS and Azure',
          savedAt: Date.now() - 7200000,
          lastModified: Date.now() - 3600000,
          nodes: [
            {
              id: 'prod-att-core',
              type: 'network',
              x: 200,
              y: 350,
              name: 'AT&T Core',
              icon: 'Globe',
              status: 'active',
              config: { networkType: 'at&t core', provider: 'AT&T' }
            },
            {
              id: 'prod-router',
              type: 'function',
              functionType: 'Router',
              x: 400,
              y: 350,
              name: 'Production Router',
              icon: 'Cloud',
              status: 'active',
              config: { routerType: 'cloud', asn: 65100 }
            },
            {
              id: 'prod-aws',
              type: 'destination',
              x: 600,
              y: 300,
              name: 'AWS US-East',
              icon: 'Cloud',
              status: 'active',
              config: { provider: 'AWS', region: 'us-east-1' }
            }
          ],
          edges: [
            {
              id: 'prod-edge-1',
              source: 'prod-att-core',
              target: 'prod-router',
              type: 'MPLS',
              bandwidth: '10 Gbps',
              status: 'active'
            },
            {
              id: 'prod-edge-2',
              source: 'prod-router',
              target: 'prod-aws',
              type: 'Direct Connect',
              bandwidth: '10 Gbps',
              status: 'active'
            }
          ]
        },
        {
          id: 'mock-2',
          name: 'Development Network',
          description: 'Testing environment for new configurations and architectures',
          savedAt: Date.now() - 172800000,
          nodes: [
            {
              id: 'dev-att-core',
              type: 'network',
              x: 250,
              y: 350,
              name: 'AT&T Core',
              icon: 'Globe',
              status: 'unconfigured',
              config: { networkType: 'at&t core', provider: 'AT&T' }
            },
            {
              id: 'dev-router',
              type: 'function',
              functionType: 'Router',
              x: 450,
              y: 350,
              name: 'Dev Router',
              icon: 'Cloud',
              status: 'unconfigured',
              config: { routerType: 'virtual', asn: 65200 }
            }
          ],
          edges: [
            {
              id: 'dev-edge-1',
              source: 'dev-att-core',
              target: 'dev-router',
              type: 'MPLS',
              bandwidth: '1 Gbps',
              status: 'inactive'
            }
          ]
        },
        {
          id: 'mock-3',
          name: 'DR Site Architecture',
          description: 'Disaster recovery configuration with cross-region failover',
          savedAt: Date.now() - 604800000,
          lastModified: Date.now() - 259200000,
          nodes: [
            {
              id: 'dr-att-core',
              type: 'network',
              x: 200,
              y: 350,
              name: 'AT&T Core',
              icon: 'Globe',
              status: 'active',
              config: { networkType: 'at&t core', provider: 'AT&T' }
            },
            {
              id: 'dr-primary',
              type: 'function',
              functionType: 'Router',
              x: 350,
              y: 300,
              name: 'Primary Router',
              icon: 'Cloud',
              status: 'active',
              config: { routerType: 'cloud', asn: 65300, fastReroute: true }
            },
            {
              id: 'dr-secondary',
              type: 'function',
              functionType: 'Router',
              x: 350,
              y: 400,
              name: 'Backup Router',
              icon: 'Cloud',
              status: 'active',
              config: { routerType: 'cloud', asn: 65301, fastReroute: true }
            },
            {
              id: 'dr-aws',
              type: 'destination',
              x: 500,
              y: 350,
              name: 'AWS West',
              icon: 'Cloud',
              status: 'active',
              config: { provider: 'AWS', region: 'us-west-2' }
            }
          ],
          edges: [
            {
              id: 'dr-edge-1',
              source: 'dr-att-core',
              target: 'dr-primary',
              type: 'MPLS',
              bandwidth: '10 Gbps',
              status: 'active',
              config: { resilience: 'ha' }
            },
            {
              id: 'dr-edge-2',
              source: 'dr-att-core',
              target: 'dr-secondary',
              type: 'MPLS',
              bandwidth: '10 Gbps',
              status: 'active',
              config: { resilience: 'ha' }
            },
            {
              id: 'dr-edge-3',
              source: 'dr-primary',
              target: 'dr-aws',
              type: 'Direct Connect',
              bandwidth: '10 Gbps',
              status: 'active'
            },
            {
              id: 'dr-edge-4',
              source: 'dr-secondary',
              target: 'dr-aws',
              type: 'Direct Connect',
              bandwidth: '10 Gbps',
              status: 'active'
            }
          ]
        }
      ];

      localStorage.setItem('savedTopologies', JSON.stringify(mockTopologies));
      setSavedTopologies(mockTopologies);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Built-in templates
  const templates: Template[] = [
    {
      id: 'internet-to-cloud',
      name: 'Internet to Cloud',
      description: 'AT&T Core through Hub to AWS',
      preview: {
        icons: [
          { icon: Globe, color: 'text-orange-500' },
          { icon: Cloud, color: 'text-purple-500' },
          { icon: Cloud, color: 'text-blue-500' }
        ]
      },
      nodes: [
        {
          id: 'att-core-template',
          type: 'network',
          x: 200,
          y: 350,
          name: 'AT&T Core',
          icon: 'Globe',
          status: 'unconfigured',
          config: {
            networkType: 'at&t core',
            provider: 'AT&T'
          }
        },
        {
          id: 'hub-template',
          type: 'function',
          functionType: 'Router',
          x: 400,
          y: 350,
          name: 'Hub',
          icon: 'Cloud',
          status: 'unconfigured',
          config: {
            routerType: 'cloud',
            asn: 65000
          }
        },
        {
          id: 'aws-cloud-template',
          type: 'destination',
          x: 600,
          y: 350,
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
          id: 'att-to-router-template',
          source: 'att-core-template',
          target: 'hub-template',
          type: 'MPLS',
          bandwidth: '10 Gbps',
          status: 'inactive'
        },
        {
          id: 'router-to-cloud-template',
          source: 'hub-template',
          target: 'aws-cloud-template',
          type: 'Direct Connect',
          bandwidth: '10 Gbps',
          status: 'inactive'
        }
      ]
    },
    {
      id: 'multi-cloud',
      name: 'Multi-Cloud',
      description: 'AT&T Core to AWS and Azure clouds',
      preview: {
        icons: [
          { icon: Globe, color: 'text-orange-500' },
          { icon: Cloud, color: 'text-purple-500' },
          { icon: Cloud, color: 'text-blue-500' }
        ]
      },
      nodes: [
        {
          id: 'att-core-mc-template',
          type: 'network',
          x: 200,
          y: 350,
          name: 'AT&T Core',
          icon: 'Globe',
          status: 'unconfigured',
          config: {
            networkType: 'at&t core',
            provider: 'AT&T'
          }
        },
        {
          id: 'hub-mc-template',
          type: 'function',
          functionType: 'Router',
          x: 350,
          y: 350,
          name: 'Hub',
          icon: 'Cloud',
          status: 'unconfigured',
          config: {
            routerType: 'cloud',
            asn: 65000
          }
        },
        {
          id: 'aws-cloud-mc-template',
          type: 'destination',
          x: 500,
          y: 300,
          name: 'AWS Cloud',
          icon: 'Cloud',
          status: 'unconfigured',
          config: {
            provider: 'AWS',
            region: 'us-east-1'
          }
        },
        {
          id: 'azure-cloud-mc-template',
          type: 'destination',
          x: 500,
          y: 400,
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
          id: 'att-to-router-mc-template',
          source: 'att-core-mc-template',
          target: 'hub-mc-template',
          type: 'MPLS',
          bandwidth: '10 Gbps',
          status: 'inactive'
        },
        {
          id: 'router-to-aws-mc-template',
          source: 'hub-mc-template',
          target: 'aws-cloud-mc-template',
          type: 'Direct Connect',
          bandwidth: '10 Gbps',
          status: 'inactive'
        },
        {
          id: 'router-to-azure-mc-template',
          source: 'hub-mc-template',
          target: 'azure-cloud-mc-template',
          type: 'ExpressRoute',
          bandwidth: '10 Gbps',
          status: 'inactive'
        }
      ]
    },
    {
      id: 'high-availability',
      name: 'High Availability',
      description: 'Redundant routers for business continuity',
      preview: {
        icons: [
          { icon: Globe, color: 'text-orange-500' },
          { icon: Cloud, color: 'text-purple-500' },
          { icon: Cloud, color: 'text-blue-500' }
        ]
      },
      nodes: [
        {
          id: 'att-core-ha-template',
          type: 'network',
          x: 200,
          y: 350,
          name: 'AT&T Core',
          icon: 'Globe',
          status: 'unconfigured',
          config: {
            networkType: 'at&t core',
            provider: 'AT&T'
          }
        },
        {
          id: 'primary-router-ha-template',
          type: 'function',
          functionType: 'Router',
          x: 350,
          y: 300,
          name: 'Primary Router',
          icon: 'Cloud',
          status: 'unconfigured',
          config: {
            routerType: 'cloud',
            asn: 65000,
            fastReroute: true,
            bfd: true
          }
        },
        {
          id: 'secondary-router-ha-template',
          type: 'function',
          functionType: 'Router',
          x: 350,
          y: 400,
          name: 'Secondary Router',
          icon: 'Cloud',
          status: 'unconfigured',
          config: {
            routerType: 'cloud',
            asn: 65001,
            fastReroute: true,
            bfd: true
          }
        },
        {
          id: 'aws-cloud-ha-template',
          type: 'destination',
          x: 500,
          y: 350,
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
          id: 'att-to-primary-ha-template',
          source: 'att-core-ha-template',
          target: 'primary-router-ha-template',
          type: 'MPLS',
          bandwidth: '10 Gbps',
          status: 'inactive',
          config: {
            resilience: 'ha',
            bfd: true
          }
        },
        {
          id: 'att-to-secondary-ha-template',
          source: 'att-core-ha-template',
          target: 'secondary-router-ha-template',
          type: 'MPLS',
          bandwidth: '10 Gbps',
          status: 'inactive',
          config: {
            resilience: 'ha',
            bfd: true
          }
        },
        {
          id: 'primary-to-cloud-ha-template',
          source: 'primary-router-ha-template',
          target: 'aws-cloud-ha-template',
          type: 'Direct Connect',
          bandwidth: '10 Gbps',
          status: 'inactive',
          config: {
            resilience: 'ha',
            bfd: true
          }
        },
        {
          id: 'secondary-to-cloud-ha-template',
          source: 'secondary-router-ha-template',
          target: 'aws-cloud-ha-template',
          type: 'Direct Connect',
          bandwidth: '10 Gbps',
          status: 'inactive',
          config: {
            resilience: 'ha',
            bfd: true
          }
        }
      ]
    }
  ];

  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!cloudRouterName.trim()) {
      setError('Hub name is required');
      return;
    }
    
    onComplete(cloudRouterName.trim());
    resetForm();
  };

  const handleInputChange = (value: string) => {
    setCloudRouterName(value);
    if (error) {
      setError('');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError('');
    }
  };

  const handleAIImport = async () => {
    if (!selectedFile) {
      setError('Please select an image file first');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      // Simulate AI processing delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Simulate AI-generated network name
      const aiGeneratedName = `AI Router ${Date.now().toString().slice(-4)}`;
      
      setAiSuggestedName(aiGeneratedName);
      setCloudRouterName(aiGeneratedName);
      setAiProcessingComplete(true);
      
      window.addToast({
        type: 'success',
        title: 'Network Imported Successfully',
        message: 'AI has analyzed your diagram and created the network topology',
        duration: 5000
      });
      
    } catch (error) {
      setError('Failed to process image. Please try again or use manual setup.');
      window.addToast({
        type: 'error',
        title: 'Import Failed',
        message: 'Unable to process the uploaded image. Please try manual setup.',
        duration: 5000
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompleteAISetup = () => {
    if (!cloudRouterName.trim()) {
      setError('Hub name is required');
      return;
    }

    if (onApplyTemplate) {
      const timestamp = Date.now();

      const attCore: NetworkNode = {
        id: `node-${timestamp}-att-core`,
        type: 'network',
        x: 250,
        y: 350,
        name: 'AT&T Core',
        icon: getNodeIcon('network', undefined, 'at&t core'),
        status: 'unconfigured',
        config: {
          networkType: 'at&t core',
          provider: 'AT&T'
        }
      };

      const hub: NetworkNode = {
        id: `node-${timestamp}-hub`,
        type: 'function',
        functionType: 'Router',
        x: 450,
        y: 350,
        name: cloudRouterName.trim(),
        icon: getNodeIcon('function', 'Router', undefined, { routerType: 'cloud' }),
        status: 'unconfigured',
        config: {
          routerType: 'cloud',
          provider: 'Cloud Provider'
        }
      };

      const datacenter: NetworkNode = {
        id: `node-${timestamp}-datacenter`,
        type: 'datacenter',
        x: 650,
        y: 300,
        name: 'Datacenter',
        icon: getNodeIcon('datacenter'),
        status: 'unconfigured',
        config: {
          location: 'US-East',
          tier: 'Tier 3'
        }
      };

      const cloudProvider: NetworkNode = {
        id: `node-${timestamp}-cloud`,
        type: 'destination',
        x: 650,
        y: 400,
        name: 'AWS',
        icon: getNodeIcon('destination'),
        status: 'unconfigured',
        config: {
          provider: 'AWS',
          region: 'us-east-1'
        }
      };

      const edges: NetworkEdge[] = [
        {
          id: `edge-${timestamp}-1`,
          source: attCore.id,
          target: hub.id,
          type: 'MPLS',
          bandwidth: '10 Gbps',
          status: 'inactive',
          config: {
            resilience: 'standard'
          }
        },
        {
          id: `edge-${timestamp}-2`,
          source: hub.id,
          target: datacenter.id,
          type: 'Ethernet',
          bandwidth: '10 Gbps',
          status: 'inactive',
          config: {
            resilience: 'standard'
          }
        },
        {
          id: `edge-${timestamp}-3`,
          source: hub.id,
          target: cloudProvider.id,
          type: 'Direct Connect',
          bandwidth: '10 Gbps',
          status: 'inactive',
          config: {
            resilience: 'standard'
          }
        }
      ];

      onApplyTemplate([attCore, hub, datacenter, cloudProvider], edges);
    } else {
      onComplete(cloudRouterName.trim());
    }

    resetForm();
  };

  const handleTemplateSelect = (template: Template) => {
    if (onApplyTemplate) {
      onApplyTemplate(template.nodes, template.edges);
    }
    resetForm();

    window.addToast({
      type: 'success',
      title: 'Template Applied',
      message: `${template.name} template has been applied to your network`,
      duration: 3000
    });
  };

  const handleLoadTopology = (topology: SavedTopology) => {
    if (onApplyTemplate) {
      const nodesWithIcons = topology.nodes.map(node => ({
        ...node,
        icon: getNodeIcon(
          node.type,
          node.functionType,
          node.config?.networkType,
          node.config
        )
      }));
      onApplyTemplate(nodesWithIcons, topology.edges);
    }
    resetForm();

    window.addToast({
      type: 'success',
      title: 'Topology Loaded',
      message: `${topology.name} has been loaded successfully`,
      duration: 3000
    });
  };

  const handleDeleteTopology = (topologyId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    const updatedTopologies = savedTopologies.filter(t => t.id !== topologyId);
    setSavedTopologies(updatedTopologies);
    localStorage.setItem('savedTopologies', JSON.stringify(updatedTopologies));

    window.addToast({
      type: 'info',
      title: 'Topology Deleted',
      message: 'Saved topology has been removed',
      duration: 2000
    });
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const resetForm = () => {
    setCloudRouterName('');
    setError('');
    setSelectedFile(null);
    setAiProcessingComplete(false);
    setAiSuggestedName('');
    setSetupMode('selection');
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-[200]">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-600 to-slate-700 text-white p-4 flex-shrink-0">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-white/15 rounded-full mb-2">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-bold mb-1">Welcome to Cloud Designer</h1>
            <p className="text-sm text-slate-200">Choose how you'd like to create your enterprise network</p>
          </div>
        </div>

        <div className="p-4 flex-1 min-h-0">
          {/* Initial Selection */}
          {setupMode === 'selection' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Create */}
              <button
                onClick={() => setSetupMode('user')}
                className="group p-4 border-2 border-gray-200 rounded-xl hover:border-slate-400 hover:shadow-lg transition-all duration-300 flex flex-col"
              >
                <div className="flex-1 flex flex-col">
                  <div className="mx-auto w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mb-2 group-hover:from-slate-200 group-hover:to-slate-300 transition-all">
                    <Sparkles className="h-6 w-6 text-slate-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">Create</h3>
                  <p className="text-gray-600 text-xs leading-relaxed text-center flex-1">
                    Start with AT&T Core and customize your hub.
                  </p>
                </div>
                <div className="mt-2 flex justify-center space-x-1.5">
                  <div className="w-2 h-2 bg-amber-300 rounded-full"></div>
                  <div className="w-2 h-2 bg-stone-400 rounded-full"></div>
                </div>
              </button>

              {/* Import */}
              <button
                onClick={() => setSetupMode('ai')}
                className="group p-4 border-2 border-gray-200 rounded-xl hover:border-slate-400 hover:shadow-lg transition-all duration-300 flex flex-col"
              >
                <div className="flex-1 flex flex-col">
                  <div className="mx-auto w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mb-2 group-hover:from-slate-200 group-hover:to-slate-300 transition-all">
                    <Brain className="h-6 w-6 text-slate-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">Import</h3>
                  <p className="text-gray-600 text-xs leading-relaxed text-center flex-1">
                    Upload diagram and let AI recreate it.
                  </p>
                </div>
                <div className="mt-2 flex justify-center">
                  <div className="inline-flex items-center text-xs text-slate-600 bg-slate-50 px-2 py-0.5 rounded-full">
                    <Zap className="h-3 w-3 mr-1" />
                    AI
                  </div>
                </div>
              </button>

              {/* Choose */}
              <button
                onClick={() => setSetupMode('templates')}
                className="group p-4 border-2 border-gray-200 rounded-xl hover:border-slate-400 hover:shadow-lg transition-all duration-300 flex flex-col"
              >
                <div className="flex-1 flex flex-col">
                  <div className="mx-auto w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mb-2 group-hover:from-slate-200 group-hover:to-slate-300 transition-all">
                    <Layout className="h-6 w-6 text-slate-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">Choose</h3>
                  <p className="text-gray-600 text-xs leading-relaxed text-center flex-1">
                    Choose from pre-built enterprise patterns.
                  </p>
                </div>
                <div className="mt-2 flex justify-center space-x-1">
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                </div>
              </button>

              {/* Open */}
              <button
                onClick={() => setSetupMode('saved')}
                disabled={savedTopologies.length === 0}
                className={`group p-4 border-2 rounded-xl transition-all duration-300 flex flex-col ${
                  savedTopologies.length === 0
                    ? 'border-gray-200 opacity-50 cursor-not-allowed'
                    : 'border-gray-200 hover:border-slate-400 hover:shadow-lg'
                }`}
              >
                <div className="flex-1 flex flex-col">
                  <div className={`mx-auto w-12 h-12 bg-gradient-to-br rounded-full flex items-center justify-center mb-2 transition-all ${
                    savedTopologies.length === 0
                      ? 'from-gray-100 to-gray-200'
                      : 'from-slate-100 to-slate-200 group-hover:from-slate-200 group-hover:to-slate-300'
                  }`}>
                    <FolderOpen className={`h-6 w-6 ${savedTopologies.length === 0 ? 'text-gray-400' : 'text-slate-600'}`} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">Open</h3>
                  <p className="text-gray-600 text-xs leading-relaxed text-center flex-1">
                    Continue working on saved topologies.
                  </p>
                </div>
                <div className="mt-2 flex justify-center">
                  {savedTopologies.length > 0 ? (
                    <div className="inline-flex items-center text-xs text-slate-600 bg-slate-50 px-2 py-0.5 rounded-full">
                      <Clock className="h-3 w-3 mr-1" />
                      {savedTopologies.length} saved
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400">
                      No saved
                    </div>
                  )}
                </div>
              </button>
            </div>
          )}

          {/* Create Flow */}
          {setupMode === 'user' && (
            <div className="max-w-lg mx-auto">
              <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center w-10 h-10 bg-slate-100 rounded-full mb-2">
                  <Sparkles className="h-5 w-5 text-slate-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Custom Network Setup</h2>
                <p className="text-xs text-gray-600">Create your personalized network starting with AT&T Core</p>
              </div>

              {/* Network Preview */}
              <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-3 mb-4 border border-slate-200">
                <h3 className="text-xs font-medium text-gray-700 mb-3 text-center">Your network foundation:</h3>
                <div className="flex items-center justify-center space-x-4">
                  <div className="text-center">
                    <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center mb-1">
                      <Globe className="h-5 w-5 text-amber-600" />
                    </div>
                    <span className="text-xs font-medium text-gray-600">AT&T Core</span>
                  </div>

                  <div className="flex-1 h-0.5 bg-gradient-to-r from-amber-200 to-stone-300 relative">
                    <ArrowRight className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-3 w-3 text-gray-500 bg-white rounded-full" />
                  </div>

                  <div className="text-center">
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center mb-1">
                      <Router className="h-5 w-5 text-slate-600" />
                    </div>
                    <span className="text-xs font-medium text-gray-600">Hub</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleUserSubmit} className="space-y-3">
                <div>
                  <label htmlFor="cloudRouterName" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Name Your Hub *
                  </label>
                  <input
                    type="text"
                    id="cloudRouterName"
                    value={cloudRouterName}
                    onChange={(e) => handleInputChange(e.target.value)}
                    placeholder="e.g., Main Hub Router, Enterprise Hub"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-sm ${
                      error ? 'border-red-300' : 'border-gray-300'
                    }`}
                    autoFocus
                  />
                  {error && (
                    <p className="mt-1 text-xs text-red-600">{error}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Choose a meaningful name that reflects your router's role in your network architecture
                  </p>
                </div>

                <div className="flex justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setSetupMode('selection')}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    ← Back to Options
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 text-sm bg-slate-600 text-white rounded-lg hover:bg-slate-700 flex items-center transition-colors shadow-sm"
                  >
                    Create Network
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Import Flow */}
          {setupMode === 'ai' && (
            <div className="max-w-xl mx-auto">
              <div className="text-center mb-3">
                <div className="inline-flex items-center justify-center w-10 h-10 bg-slate-100 rounded-full mb-2">
                  <Brain className="h-5 w-5 text-slate-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">AI Network Import</h2>
                <p className="text-xs text-gray-600">Upload your diagram and let AI recreate it</p>
              </div>

              {!aiProcessingComplete && (
                <>
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-3 mb-3 border border-slate-200">
                    <div className="flex items-start">
                      <Brain className="h-4 w-4 text-slate-600 mr-2 mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="text-xs font-medium text-slate-900 mb-1.5">How Import Works</h3>
                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
                          <div className="flex items-center">
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full mr-1.5"></span>
                            Identifies network devices
                          </div>
                          <div className="flex items-center">
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full mr-1.5"></span>
                            Maps connection types
                          </div>
                          <div className="flex items-center">
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full mr-1.5"></span>
                            Detects cloud providers
                          </div>
                          <div className="flex items-center">
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full mr-1.5"></span>
                            Recreates topology
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">
                          Supports: LucidChart, Visio, PNG, JPG, PDF
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* File Upload */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-slate-400 transition-colors mb-3">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="networkDiagramUpload"
                    />
                    <label htmlFor="networkDiagramUpload" className="cursor-pointer">
                      <div className="mx-auto w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mb-2">
                        <FileImage className="h-5 w-5 text-slate-600" />
                      </div>
                      <p className="text-sm font-medium text-gray-900 mb-1">
                        {selectedFile ? selectedFile.name : 'Upload Network Diagram'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {selectedFile ? 'Click to select a different file' : 'PDF, PNG, JPG up to 10MB'}
                      </p>
                    </label>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-2 mb-3">
                      <p className="text-xs text-red-600">{error}</p>
                    </div>
                  )}

                  <div className="flex justify-between pt-1">
                    <button
                      onClick={() => setSetupMode('selection')}
                      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      ← Back to Options
                    </button>
                    <button
                      onClick={handleAIImport}
                      disabled={!selectedFile || isProcessing}
                      className={`px-6 py-2 text-sm rounded-lg flex items-center transition-colors shadow-sm ${
                        !selectedFile || isProcessing
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-slate-600 text-white hover:bg-slate-700'
                      }`}
                    >
                      {isProcessing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Analyzing Diagram...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Import with AI
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}

              {/* AI Processing Complete */}
              {aiProcessingComplete && (
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mr-3">
                      <Brain className="h-5 w-5 text-slate-600" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">Analysis Complete!</h3>
                      <p className="text-sm text-slate-700">AI has successfully analyzed your network diagram</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label htmlFor="aiHubName" className="block text-sm font-medium text-gray-700 mb-2">
                      Name Your Main Hub *
                    </label>
                    <input
                      type="text"
                      id="aiHubName"
                      value={cloudRouterName}
                      onChange={(e) => handleInputChange(e.target.value)}
                      placeholder="e.g., Main Hub Router, HQ Router"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 ${
                        error ? 'border-red-300' : 'border-gray-300'
                      }`}
                      autoFocus
                    />
                    {error && (
                      <p className="mt-2 text-sm text-red-600">{error}</p>
                    )}
                    <p className="mt-2 text-xs text-gray-500">
                      AI suggested: <span className="font-medium">"{aiSuggestedName}"</span> - you can customize this name
                    </p>
                  </div>
                  
                  <div className="flex justify-between pt-2">
                    <button
                      onClick={() => {
                        setAiProcessingComplete(false);
                        setSelectedFile(null);
                        setCloudRouterName('');
                        setError('');
                      }}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      ← Upload Different Image
                    </button>
                    <button
                      onClick={handleCompleteAISetup}
                      className="px-8 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 flex items-center transition-colors shadow-sm"
                    >
                      Create Network
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Choose Selection */}
          {setupMode === 'templates' && (
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-100 rounded-full mb-4">
                  <Layout className="h-6 w-6 text-slate-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Choose a Template</h2>
                <p className="text-sm text-gray-600">Start with a proven enterprise network pattern</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
                    className="group p-4 border-2 border-gray-200 rounded-lg hover:border-slate-400 hover:shadow-md transition-all duration-200 text-left"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-base font-semibold text-gray-900">{template.name}</h3>
                      {template.id === 'high-availability' && (
                        <span className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-full">
                          Recommended
                        </span>
                      )}
                    </div>
                    
                    {/* Template Preview */}
                    <div className="flex items-center justify-center space-x-2 my-3">
                      {template.preview.icons.map((iconData, index) => (
                        <React.Fragment key={index}>
                          <iconData.icon className={`h-6 w-6 ${iconData.color}`} />
                          {index < template.preview.icons.length - 1 && (
                            <div className="w-4 h-0.5 bg-gray-300"></div>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                    
                    <p className="text-xs text-gray-600 mb-3">{template.description}</p>
                    
                    <div className="bg-gray-50 rounded p-2">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{template.nodes.length} nodes</span>
                        <span>{template.edges.length} connections</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="text-center">
                <button
                  onClick={() => setSetupMode('selection')}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  ← Back to Options
                </button>
              </div>
            </div>
          )}

          {/* Saved Topologies */}
          {setupMode === 'saved' && (
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-100 rounded-full mb-4">
                  <FolderOpen className="h-6 w-6 text-slate-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Your Saved Topologies</h2>
                <p className="text-sm text-gray-600">Select a topology to continue working on it</p>
              </div>

              {savedTopologies.length === 0 ? (
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
                    <FolderOpen className="h-10 w-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Saved Topologies</h3>
                  <p className="text-gray-600 mb-6">You haven't saved any network topologies yet.</p>
                  <button
                    onClick={() => setSetupMode('selection')}
                    className="px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    Create Your First Network
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {savedTopologies
                      .sort((a, b) => (b.lastModified || b.savedAt) - (a.lastModified || a.savedAt))
                      .map((topology) => (
                        <button
                          key={topology.id}
                          onClick={() => handleLoadTopology(topology)}
                          className="group relative p-6 border-2 border-gray-200 rounded-xl hover:border-slate-400 hover:shadow-lg transition-all duration-200 text-left"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="text-base font-semibold text-gray-900 mb-1 group-hover:text-slate-600 transition-colors">
                                {topology.name}
                              </h3>
                              <p className="text-xs text-gray-500 flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {formatDate(topology.lastModified || topology.savedAt)}
                              </p>
                            </div>
                            <button
                              onClick={(e) => handleDeleteTopology(topology.id, e)}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                              title="Delete topology"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          {topology.description && (
                            <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                              {topology.description}
                            </p>
                          )}

                          <div className="flex items-center space-x-4 text-xs text-gray-500 pt-3 border-t border-gray-100">
                            <div className="flex items-center">
                              <div className="w-2 h-2 bg-slate-400 rounded-full mr-1.5"></div>
                              {topology.nodes.length} nodes
                            </div>
                            <div className="flex items-center">
                              <div className="w-2 h-2 bg-slate-400 rounded-full mr-1.5"></div>
                              {topology.edges.length} connections
                            </div>
                          </div>

                          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="bg-slate-100 text-slate-700 text-xs font-medium px-2 py-1 rounded">
                              Open
                            </div>
                          </div>
                        </button>
                      ))}
                  </div>

                  <div className="text-center">
                    <button
                      onClick={() => setSetupMode('selection')}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      ← Back to Options
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}