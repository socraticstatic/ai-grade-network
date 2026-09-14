import { useState } from 'react';
import { Shield, RefreshCw, Network, Scale, Zap, CloudLightning, Workflow, Server, Router } from 'lucide-react';
import { NetworkNode, NetworkEdge } from '../types';

interface OutcomeSelectorProps {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  onApply: (newNodes: NetworkNode[], newEdges: NetworkEdge[]) => void;
}

interface NetworkOutcome {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  patterns: {
    name: string;
    description: string;
    elements: {
      nodes: NetworkNode[];
      edges: NetworkEdge[];
    };
  }[];
}

export function OutcomeSelector({ nodes, edges, onApply }: OutcomeSelectorProps) {
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);
  const [selectedPattern, setSelectedPattern] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  // Define outcome-based patterns
  const outcomes: NetworkOutcome[] = [
    {
      id: 'resiliency',
      name: 'Network Resiliency',
      description: 'Build a network that can quickly recover from failures and maintain operations',
      icon: RefreshCw,
      patterns: [
        {
          name: 'Self-Healing Network',
          description: 'Automatic rerouting when a connection goes down',
          elements: {
            nodes: [
              {
                id: `node-${Date.now()}-router1`,
                type: 'function',
                functionType: 'Router',
                x: 100,
                y: 150,
                name: 'Primary Router',
                icon: 'Router',
                status: 'unconfigured',
                config: { 
                  routerType: 'edge',
                  fastReroute: true,
                  recoveryTime: '<50ms'
                }
              },
              {
                id: `node-${Date.now()}-router2`,
                type: 'function',
                functionType: 'Router',
                x: 100,
                y: 300,
                name: 'Secondary Router',
                icon: 'Router',
                status: 'unconfigured',
                config: { 
                  routerType: 'edge',
                  fastReroute: true,
                  recoveryTime: '<50ms'
                }
              },
              {
                id: `node-${Date.now()}-destination`,
                type: 'destination',
                x: 300,
                y: 225,
                name: 'Cloud Destination',
                icon: 'Server',
                status: 'unconfigured',
                config: {
                  provider: 'AWS'
                }
              }
            ],
            edges: [
              {
                id: `edge-${Date.now()}-1`,
                source: `node-${Date.now()}-router1`,
                target: `node-${Date.now()}-destination`,
                type: 'Direct Connect',
                bandwidth: '10 Gbps',
                status: 'inactive',
                config: {
                  resilience: 'ha',
                  bfd: true,
                  fastConvergence: true
                }
              },
              {
                id: `edge-${Date.now()}-2`,
                source: `node-${Date.now()}-router2`,
                target: `node-${Date.now()}-destination`,
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
          }
        },
        {
          name: 'Load-Balanced Resiliency',
          description: 'Distributed traffic across multiple paths for consistent performance',
          elements: {
            nodes: [
              {
                id: `node-${Date.now()}-lb`,
                type: 'function',
                functionType: 'VNF',
                x: 100,
                y: 225,
                name: 'Load Balancer',
                icon: 'Workflow',
                status: 'unconfigured',
                config: {
                  vnfType: 'loadbalancer',
                  algorithm: 'round-robin',
                  healthChecks: true
                }
              },
              {
                id: `node-${Date.now()}-router1`,
                type: 'function',
                functionType: 'Router',
                x: 250,
                y: 150,
                name: 'Primary Path',
                icon: 'Router',
                status: 'unconfigured'
              },
              {
                id: `node-${Date.now()}-router2`,
                type: 'function',
                functionType: 'Router',
                x: 250,
                y: 300,
                name: 'Secondary Path',
                icon: 'Router',
                status: 'unconfigured'
              },
              {
                id: `node-${Date.now()}-destination`,
                type: 'destination',
                x: 400,
                y: 225,
                name: 'Cloud Destination',
                icon: 'Server',
                status: 'unconfigured'
              }
            ],
            edges: [
              {
                id: `edge-${Date.now()}-1`,
                source: `node-${Date.now()}-lb`,
                target: `node-${Date.now()}-router1`,
                type: 'Network Services',
                bandwidth: '5 Gbps',
                status: 'inactive'
              },
              {
                id: `edge-${Date.now()}-2`,
                source: `node-${Date.now()}-lb`,
                target: `node-${Date.now()}-router2`,
                type: 'Network Services',
                bandwidth: '5 Gbps',
                status: 'inactive'
              },
              {
                id: `edge-${Date.now()}-3`,
                source: `node-${Date.now()}-router1`,
                target: `node-${Date.now()}-destination`,
                type: 'Direct Connect',
                bandwidth: '5 Gbps',
                status: 'inactive'
              },
              {
                id: `edge-${Date.now()}-4`,
                source: `node-${Date.now()}-router2`,
                target: `node-${Date.now()}-destination`,
                type: 'Direct Connect',
                bandwidth: '5 Gbps',
                status: 'inactive'
              }
            ]
          }
        }
      ]
    },
    {
      id: 'redundancy',
      name: 'Network Redundancy',
      description: 'Implement duplicate components to eliminate single points of failure',
      icon: Scale,
      patterns: [
        {
          name: 'Dual Connection Redundancy',
          description: 'Multiple connections to ensure continued service if one fails',
          elements: {
            nodes: [
              {
                id: `node-${Date.now()}-source`,
                type: 'datacenter',
                x: 100,
                y: 225,
                name: 'Data Center',
                icon: 'Server',
                status: 'unconfigured',
                config: {
                  provider: 'Equinix',
                  location: 'Ashburn VA3'
                }
              },
              {
                id: `node-${Date.now()}-router1`,
                type: 'function',
                functionType: 'Router',
                x: 250,
                y: 150,
                name: 'Primary Router',
                icon: 'Router',
                status: 'unconfigured',
                config: {
                  routerType: 'edge',
                  bgp: true,
                  asn: 64512
                }
              },
              {
                id: `node-${Date.now()}-router2`,
                type: 'function',
                functionType: 'Router',
                x: 250,
                y: 300,
                name: 'Secondary Router',
                icon: 'Router',
                status: 'unconfigured',
                config: {
                  routerType: 'edge',
                  bgp: true,
                  asn: 64513
                }
              },
              {
                id: `node-${Date.now()}-destination`,
                type: 'destination',
                x: 400,
                y: 225,
                name: 'Cloud Destination',
                icon: 'Server',
                status: 'unconfigured',
                config: {
                  provider: 'AWS',
                  region: 'us-east-1'
                }
              }
            ],
            edges: [
              {
                id: `edge-${Date.now()}-1`,
                source: `node-${Date.now()}-source`,
                target: `node-${Date.now()}-router1`,
                type: 'Direct Connect',
                bandwidth: '10 Gbps',
                status: 'inactive'
              },
              {
                id: `edge-${Date.now()}-2`,
                source: `node-${Date.now()}-source`,
                target: `node-${Date.now()}-router2`,
                type: 'Direct Connect',
                bandwidth: '10 Gbps',
                status: 'inactive'
              },
              {
                id: `edge-${Date.now()}-3`,
                source: `node-${Date.now()}-router1`,
                target: `node-${Date.now()}-destination`,
                type: 'Direct Connect',
                bandwidth: '10 Gbps',
                status: 'inactive'
              },
              {
                id: `edge-${Date.now()}-4`,
                source: `node-${Date.now()}-router2`,
                target: `node-${Date.now()}-destination`,
                type: 'Direct Connect',
                bandwidth: '10 Gbps',
                status: 'inactive'
              }
            ]
          }
        },
        {
          name: 'Active-Standby Topology',
          description: 'Primary and backup paths with automatic failover',
          elements: {
            nodes: [
              {
                id: `node-${Date.now()}-source`,
                type: 'datacenter',
                x: 100,
                y: 225,
                name: 'Data Center',
                icon: 'Server',
                status: 'unconfigured'
              },
              {
                id: `node-${Date.now()}-primary`,
                type: 'function',
                functionType: 'Router',
                x: 250,
                y: 150,
                name: 'Primary Path',
                icon: 'Router',
                status: 'active',
                config: {
                  routerType: 'edge',
                  bgp: true,
                  asPath: 'PREPEND 65000 65000'
                }
              },
              {
                id: `node-${Date.now()}-backup`,
                type: 'function',
                functionType: 'Router',
                x: 250,
                y: 300,
                name: 'Standby Path',
                icon: 'Router',
                status: 'unconfigured',
                config: {
                  routerType: 'edge',
                  bgp: true,
                  asPath: 'PREPEND 65000 65000 65000'
                }
              },
              {
                id: `node-${Date.now()}-destination`,
                type: 'destination',
                x: 400,
                y: 225,
                name: 'Cloud Destination',
                icon: 'Server',
                status: 'unconfigured'
              }
            ],
            edges: [
              {
                id: `edge-${Date.now()}-1`,
                source: `node-${Date.now()}-source`,
                target: `node-${Date.now()}-primary`,
                type: 'Direct Connect',
                bandwidth: '10 Gbps',
                status: 'active'
              },
              {
                id: `edge-${Date.now()}-2`,
                source: `node-${Date.now()}-source`,
                target: `node-${Date.now()}-backup`,
                type: 'Direct Connect',
                bandwidth: '10 Gbps',
                status: 'inactive'
              },
              {
                id: `edge-${Date.now()}-3`,
                source: `node-${Date.now()}-primary`,
                target: `node-${Date.now()}-destination`,
                type: 'Direct Connect',
                bandwidth: '10 Gbps',
                status: 'active'
              },
              {
                id: `edge-${Date.now()}-4`,
                source: `node-${Date.now()}-backup`,
                target: `node-${Date.now()}-destination`,
                type: 'Direct Connect',
                bandwidth: '10 Gbps',
                status: 'inactive'
              }
            ]
          }
        }
      ]
    },
    {
      id: 'disaster',
      name: 'Disaster Recovery',
      description: 'Prepare for and recover from major outages and disasters',
      icon: CloudLightning,
      patterns: [
        {
          name: 'Multi-Region Failover',
          description: 'Distribute across regions to maintain operations during regional disasters',
          elements: {
            nodes: [
              {
                id: `node-${Date.now()}-dc`,
                type: 'datacenter',
                x: 100,
                y: 225,
                name: 'Primary Data Center',
                icon: 'Server',
                status: 'active'
              },
              {
                id: `node-${Date.now()}-region1`,
                type: 'destination',
                x: 300,
                y: 150,
                name: 'Primary Region (US East)',
                icon: 'Server',
                status: 'active',
                config: {
                  provider: 'AWS',
                  region: 'us-east-1'
                }
              },
              {
                id: `node-${Date.now()}-region2`,
                type: 'destination',
                x: 300,
                y: 300,
                name: 'DR Region (US West)',
                icon: 'Server',
                status: 'unconfigured',
                config: {
                  provider: 'AWS',
                  region: 'us-west-2'
                }
              },
              {
                id: `node-${Date.now()}-router1`,
                type: 'function',
                functionType: 'Router',
                x: 200,
                y: 150,
                name: 'Primary Router',
                icon: 'Router',
                status: 'active'
              },
              {
                id: `node-${Date.now()}-router2`,
                type: 'function',
                functionType: 'Router',
                x: 200,
                y: 300,
                name: 'DR Router',
                icon: 'Router',
                status: 'unconfigured'
              }
            ],
            edges: [
              {
                id: `edge-${Date.now()}-1`,
                source: `node-${Date.now()}-dc`,
                target: `node-${Date.now()}-router1`,
                type: 'Direct Connect',
                bandwidth: '10 Gbps',
                status: 'active'
              },
              {
                id: `edge-${Date.now()}-2`,
                source: `node-${Date.now()}-dc`,
                target: `node-${Date.now()}-router2`,
                type: 'Direct Connect',
                bandwidth: '10 Gbps',
                status: 'inactive'
              },
              {
                id: `edge-${Date.now()}-3`,
                source: `node-${Date.now()}-router1`,
                target: `node-${Date.now()}-region1`,
                type: 'Direct Connect',
                bandwidth: '10 Gbps',
                status: 'active'
              },
              {
                id: `edge-${Date.now()}-4`,
                source: `node-${Date.now()}-router2`,
                target: `node-${Date.now()}-region2`,
                type: 'Direct Connect',
                bandwidth: '10 Gbps',
                status: 'inactive'
              },
              {
                id: `edge-${Date.now()}-5`,
                source: `node-${Date.now()}-region1`,
                target: `node-${Date.now()}-region2`,
                type: 'Cloud to Cloud',
                bandwidth: '1 Gbps',
                status: 'active',
                config: {
                  replication: true,
                  syncType: 'async'
                }
              }
            ]
          }
        },
        {
          name: 'Hot Standby Recovery',
          description: 'Maintain a continuously synchronized backup environment',
          elements: {
            nodes: [
              {
                id: `node-${Date.now()}-primary`,
                type: 'datacenter',
                x: 100,
                y: 150,
                name: 'Primary Site',
                icon: 'Server',
                status: 'active'
              },
              {
                id: `node-${Date.now()}-secondary`,
                type: 'datacenter',
                x: 100,
                y: 300,
                name: 'Hot Standby Site',
                icon: 'Server',
                status: 'active',
                config: {
                  syncType: 'synchronous'
                }
              },
              {
                id: `node-${Date.now()}-router1`,
                type: 'function',
                functionType: 'Router',
                x: 250,
                y: 150,
                name: 'Primary Router',
                icon: 'Router',
                status: 'active'
              },
              {
                id: `node-${Date.now()}-router2`,
                type: 'function',
                functionType: 'Router',
                x: 250,
                y: 300,
                name: 'Standby Router',
                icon: 'Router',
                status: 'active'
              },
              {
                id: `node-${Date.now()}-cloud`,
                type: 'destination',
                x: 400,
                y: 225,
                name: 'Cloud Destination',
                icon: 'Server',
                status: 'active'
              }
            ],
            edges: [
              {
                id: `edge-${Date.now()}-1`,
                source: `node-${Date.now()}-primary`,
                target: `node-${Date.now()}-router1`,
                type: 'Direct Connect',
                bandwidth: '10 Gbps',
                status: 'active'
              },
              {
                id: `edge-${Date.now()}-2`,
                source: `node-${Date.now()}-secondary`,
                target: `node-${Date.now()}-router2`,
                type: 'Direct Connect',
                bandwidth: '10 Gbps',
                status: 'active'
              },
              {
                id: `edge-${Date.now()}-3`,
                source: `node-${Date.now()}-router1`,
                target: `node-${Date.now()}-cloud`,
                type: 'Direct Connect',
                bandwidth: '10 Gbps',
                status: 'active'
              },
              {
                id: `edge-${Date.now()}-4`,
                source: `node-${Date.now()}-router2`,
                target: `node-${Date.now()}-cloud`,
                type: 'Direct Connect',
                bandwidth: '10 Gbps',
                status: 'active'
              },
              {
                id: `edge-${Date.now()}-5`,
                source: `node-${Date.now()}-primary`,
                target: `node-${Date.now()}-secondary`,
                type: 'Direct Connect',
                bandwidth: '10 Gbps',
                status: 'active',
                config: {
                  replication: true,
                  syncType: 'sync'
                }
              }
            ]
          }
        }
      ]
    }
  ];

  const selectedOutcomeData = selectedOutcome ? 
    outcomes.find(o => o.id === selectedOutcome) : null;
  
  const selectedPatternData = selectedPattern && selectedOutcomeData ? 
    selectedOutcomeData.patterns.find(p => p.name === selectedPattern) : null;

  const handleApplyPattern = () => {
    if (!selectedPatternData) return;
    
    setIsApplying(true);
    
    setTimeout(() => {
      // Pass the original pattern elements directly to onApply
      // Let the parent component handle ID generation
      onApply(
        selectedPatternData.elements.nodes,
        selectedPatternData.elements.edges
      );
      
      setIsApplying(false);
      
      window.addToast({
        type: 'success',
        title: 'Pattern Applied',
        message: `${selectedPatternData.name} pattern has been applied to your network`,
        duration: 3000
      });
      
      // Reset selections
      setSelectedOutcome(null);
      setSelectedPattern(null);
    }, 1000);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Build Networks by Outcome</h3>
      
      {/* Outcomes Selection */}
      {!selectedOutcome && (
        <div className="grid grid-cols-3 gap-4">
          {outcomes.map(outcome => (
            <button
              key={outcome.id}
              onClick={() => setSelectedOutcome(outcome.id)}
              className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 text-left"
            >
              <div className="flex items-center mb-2">
                <div className="p-2 rounded-lg bg-blue-50 mr-3">
                  <outcome.icon className="h-5 w-5 text-blue-600" />
                </div>
                <h4 className="text-sm font-medium text-gray-900">{outcome.name}</h4>
              </div>
              <p className="text-xs text-gray-500">{outcome.description}</p>
            </button>
          ))}
        </div>
      )}
      
      {/* Pattern Selection */}
      {selectedOutcome && !selectedPattern && selectedOutcomeData && (
        <>
          <div className="mb-4 flex items-center">
            <button 
              onClick={() => setSelectedOutcome(null)}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
            >
              <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              Back to outcomes
            </button>
          </div>
          
          <div className="mb-4">
            <h4 className="text-md font-medium text-gray-900 flex items-center">
              <selectedOutcomeData.icon className="h-5 w-5 mr-2 text-blue-600" />
              {selectedOutcomeData.name} Patterns
            </h4>
            <p className="text-sm text-gray-500 mt-1">{selectedOutcomeData.description}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {selectedOutcomeData.patterns.map(pattern => (
              <button
                key={pattern.name}
                onClick={() => setSelectedPattern(pattern.name)}
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 text-left"
              >
                <h4 className="text-sm font-medium text-gray-900 mb-1">{pattern.name}</h4>
                <p className="text-xs text-gray-500">{pattern.description}</p>
              </button>
            ))}
          </div>
        </>
      )}
      
      {/* Pattern Preview and Application */}
      {selectedPattern && selectedPatternData && (
        <>
          <div className="mb-4 flex items-center">
            <button 
              onClick={() => setSelectedPattern(null)}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
            >
              <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              Back to patterns
            </button>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h4 className="text-md font-medium text-gray-900 mb-2">{selectedPatternData.name}</h4>
            <p className="text-sm text-gray-600 mb-3">{selectedPatternData.description}</p>
            
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <h5 className="text-sm font-medium text-gray-700 mb-2">Pattern Components:</h5>
              <div className="text-sm text-gray-600 space-y-1">
                <p><span className="font-medium">{selectedPatternData.elements.nodes.length}</span> nodes</p>
                <p><span className="font-medium">{selectedPatternData.elements.edges.length}</span> connections</p>
                <p className="text-xs text-blue-600 mt-2">This pattern will be added to your existing network.</p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end">
            <button
              onClick={handleApplyPattern}
              disabled={isApplying}
              className={`
                px-4 py-2 rounded-lg text-white
                ${isApplying 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
                }
              `}
            >
              {isApplying ? 'Applying...' : 'Apply Pattern'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}