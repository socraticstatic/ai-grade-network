import { useState } from 'react';
import { Network, Zap, AlertTriangle, Check, ArrowRight, Search, BarChart2, Shield, PanelRight, Server, Router, RefreshCw, Scale, CloudLightning, Cloud } from 'lucide-react';
import { NetworkNode, NetworkEdge } from '../types';
import { checkForRedundancy } from '../../utils/calculations';

interface AIRecommendationEngineProps {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  onApplyRecommendation: (nodes: NetworkNode[], edges: NetworkEdge[]) => void;
}

export function AIRecommendationEngine({ 
  nodes, 
  edges, 
  onApplyRecommendation 
}: AIRecommendationEngineProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recommendations, setRecommendations] = useState<{
    id: string;
    title: string;
    description: string;
    type: 'performance' | 'security' | 'cost' | 'reliability' | 'resiliency' | 'redundancy' | 'disaster';
    impact: 'high' | 'medium' | 'low';
    applied: boolean;
  }[]>([]);

  const analyzeNetwork = () => {
    setIsAnalyzing(true);
    
    // Simulate analysis delay
    setTimeout(() => {
      // Generate recommendations based on the current network
      const generatedRecommendations = [];
      
      // Check for resiliency
      const hasResiliencyMeasures = nodes.some(node => 
        node.config?.fastReroute || 
        node.config?.bfd || 
        edges.some(edge => edge.config?.resilience === 'ha')
      );
      
      if (!hasResiliencyMeasures) {
        generatedRecommendations.push({
          id: 'resiliency',
          title: 'Add Network Resiliency',
          description: 'Implement BFD and fast reroute capabilities to quickly recover from network failures.',
          type: 'resiliency',
          impact: 'high',
          applied: false
        });
      }
      
      // Check for redundancy
      const hasRedundantPaths = checkForRedundancy(nodes, edges);
      if (!hasRedundantPaths) {
        generatedRecommendations.push({
          id: 'redundancy',
          title: 'Add Redundant Path',
          description: 'Your network lacks redundant paths which could lead to single points of failure. Consider adding a backup connection.',
          type: 'redundancy',
          impact: 'high',
          applied: false
        });
      }
      
      // Check for disaster recovery
      const hasMultiRegion = nodes.some(node => 
        node.type === 'destination' && 
        nodes.some(n => 
          n.type === 'destination' && 
          n.id !== node.id && 
          n.config?.region && 
          node.config?.region && 
          n.config.region !== node.config.region
        )
      );
      
      if (!hasMultiRegion && nodes.some(node => node.type === 'destination')) {
        generatedRecommendations.push({
          id: 'disaster',
          title: 'Add Disaster Recovery Region',
          description: 'Your network would benefit from a secondary region for disaster recovery capabilities.',
          type: 'disaster',
          impact: 'high',
          applied: false
        });
      }
      
      // Check for security appliances
      const hasFirewall = nodes.some(node => 
        (node.type === 'function' && node.functionType === 'Firewall') || 
        (node.type === 'network' && node.config?.networkSecurity === 'enhanced')
      );
      
      if (!hasFirewall) {
        generatedRecommendations.push({
          id: 'security',
          title: 'Add Security Function',
          description: 'Your network would benefit from a dedicated security function. Consider adding a firewall to protect your resources.',
          type: 'security',
          impact: 'high',
          applied: false
        });
      }
      
      // Check for SD-WAN for traffic optimization
      const hasSDWAN = nodes.some(node => node.type === 'function' && node.functionType === 'SDWAN');
      if (!hasSDWAN && edges.length >= 3) {
        generatedRecommendations.push({
          id: 'sdwan',
          title: 'Add SD-WAN for Traffic Optimization',
          description: 'Your network has multiple connections that could benefit from SD-WAN for intelligent traffic routing and optimization.',
          type: 'performance',
          impact: 'medium',
          applied: false
        });
      }
      
      // Check for high bandwidth utilization
      const highUtilizationEdges = edges.filter(edge => edge.metrics?.bandwidthUtilization && edge.metrics.bandwidthUtilization > 80);
      if (highUtilizationEdges.length > 0) {
        generatedRecommendations.push({
          id: 'bandwidth',
          title: 'Increase Bandwidth',
          description: `${highUtilizationEdges.length} connection(s) showing high bandwidth utilization. Consider upgrading to prevent congestion.`,
          type: 'performance',
          impact: 'medium',
          applied: false
        });
      }
      
      // Check if network has VNF capabilities for cost optimization
      const hasVNF = nodes.some(node => node.type === 'function' && node.functionType === 'VNF');
      if (!hasVNF && nodes.length > 4) {
        generatedRecommendations.push({
          id: 'vnf',
          title: 'Consolidate Network Functions',
          description: 'Consider using virtualized network functions (VNFs) to consolidate network services and reduce operational costs.',
          type: 'cost',
          impact: 'medium',
          applied: false
        });
      }

      setRecommendations(generatedRecommendations);
      setIsAnalyzing(false);
    }, 2000);
  };
  
  const applyRecommendation = (recommendationId: string) => {
    const recommendation = recommendations.find(rec => rec.id === recommendationId);
    if (!recommendation) return;
    
    // Create copies of the current nodes and edges
    let newNodes = [...nodes];
    let newEdges = [...edges];
    
    // Apply the specific recommendation
    switch (recommendationId) {
      case 'redundancy':
        // Find a cloud node to add redundancy to
        const cloudNode = newNodes.find(node => node.type === 'destination');
        if (cloudNode) {
          // Add a new router
          const newRouter: NetworkNode = {
            id: `node-${Date.now()}-router`,
            type: 'function',
            functionType: 'Router',
            x: cloudNode.x - 150,
            y: cloudNode.y + 100,
            name: 'Backup Router',
            icon: 'Router',
            status: 'unconfigured',
            config: { routerType: 'virtual' }
          };

          // Add a new source connection
          const newSource: NetworkNode = {
            id: `node-${Date.now()}-source`,
            type: 'function',
            functionType: 'Router',
            x: newRouter.x - 150,
            y: newRouter.y,
            name: 'Backup Connection',
            icon: 'Server',
            status: 'unconfigured',
            config: {}
          };
          
          // Add edges
          const newEdge1: NetworkEdge = {
            id: `edge-${Date.now()}-1`,
            source: newSource.id,
            target: newRouter.id,
            type: 'Direct Connect',
            bandwidth: '10 Gbps',
            status: 'inactive',
            config: {
              resilience: 'redundant'
            }
          };
          
          const newEdge2: NetworkEdge = {
            id: `edge-${Date.now()}-2`,
            source: newRouter.id,
            target: cloudNode.id,
            type: 'Hub',
            bandwidth: '10 Gbps',
            status: 'inactive',
            config: {
              resilience: 'redundant'
            }
          };
          
          newNodes = [...newNodes, newRouter, newSource];
          newEdges = [...newEdges, newEdge1, newEdge2];
        }
        break;
        
      case 'resiliency':
        // Add BFD and fast reroute capabilities to existing routers and connections
        newNodes = newNodes.map(node => {
          if (node.type === 'function' && node.functionType === 'Router') {
            return {
              ...node,
              config: {
                ...node.config,
                fastReroute: true,
                bfd: true,
                recoveryTime: '<50ms'
              }
            };
          }
          return node;
        });
        
        // Add resilience configuration to edges
        newEdges = newEdges.map(edge => {
          return {
            ...edge,
            config: {
              ...edge.config,
              resilience: 'ha',
              bfd: true,
              fastConvergence: true
            }
          };
        });
        break;
        
      case 'disaster':
        // Add a disaster recovery region if there's a cloud destination
        const primaryCloud = newNodes.find(node => node.type === 'destination');
        if (primaryCloud && primaryCloud.config?.region) {
          // Determine a different region
          const primaryRegion = primaryCloud.config.region;
          let drRegion = 'us-west-2';
          if (primaryRegion.includes('west')) {
            drRegion = 'us-east-1';
          }
          
          // Create DR cloud node
          const drCloud: NetworkNode = {
            id: `node-${Date.now()}-dr`,
            type: 'destination',
            x: primaryCloud.x + 150,
            y: primaryCloud.y + 100,
            name: 'DR Region',
            icon: 'Cloud',
            status: 'unconfigured',
            config: {
              provider: primaryCloud.config.provider,
              region: drRegion
            }
          };

          // Create router for DR region
          const drRouter: NetworkNode = {
            id: `node-${Date.now()}-drrouter`,
            type: 'function',
            functionType: 'Router',
            x: drCloud.x - 100,
            y: drCloud.y,
            name: 'DR Router',
            icon: 'Router',
            status: 'unconfigured',
            config: {
              routerType: 'virtual'
            }
          };
          
          // Add replication link between regions
          const replicationEdge: NetworkEdge = {
            id: `edge-${Date.now()}-repl`,
            source: primaryCloud.id,
            target: drCloud.id,
            type: 'Cloud to Cloud',
            bandwidth: '1 Gbps',
            status: 'inactive',
            config: {
              replication: true,
              syncType: 'async'
            }
          };
          
          // Connect DR router to DR cloud
          const drRouterEdge: NetworkEdge = {
            id: `edge-${Date.now()}-drconn`,
            source: drRouter.id,
            target: drCloud.id,
            type: 'Direct Connect',
            bandwidth: '10 Gbps',
            status: 'inactive'
          };
          
          // Find a suitable connection point for the DR router
          const datacenterNode = newNodes.find(node => node.type === 'datacenter' || node.type === 'function');
          if (datacenterNode) {
            const dcToDrEdge: NetworkEdge = {
              id: `edge-${Date.now()}-dcdr`,
              source: datacenterNode.id,
              target: drRouter.id,
              type: 'Direct Connect',
              bandwidth: '10 Gbps',
              status: 'inactive'
            };
            newEdges.push(dcToDrEdge);
          }
          
          newNodes.push(drCloud, drRouter);
          newEdges.push(replicationEdge, drRouterEdge);
        }
        break;
        
      case 'security':
        // Find a good position to add a firewall
        const edgeToSecure = edges[0]; // Just use the first edge for simplicity
        if (edgeToSecure) {
          const sourceNode = newNodes.find(n => n.id === edgeToSecure.source);
          const targetNode = newNodes.find(n => n.id === edgeToSecure.target);
          
          if (sourceNode && targetNode) {
            // Create firewall between the nodes
            const midX = (sourceNode.x + targetNode.x) / 2;
            const midY = (sourceNode.y + targetNode.y) / 2;
            
            const firewall: NetworkNode = {
              id: `node-${Date.now()}-fw`,
              type: 'function',
              functionType: 'Firewall',
              x: midX,
              y: midY,
              name: 'Security Firewall',
              icon: 'Shield',
              status: 'unconfigured',
              config: { firewallType: 'ngfw' }
            };
            
            // Remove old direct edge
            newEdges = newEdges.filter(e => e.id !== edgeToSecure.id);
            
            // Create two new edges going through the firewall
            const edge1: NetworkEdge = {
              id: `edge-${Date.now()}-1`,
              source: sourceNode.id,
              target: firewall.id,
              type: edgeToSecure.type,
              bandwidth: edgeToSecure.bandwidth,
              status: 'inactive'
            };
            
            const edge2: NetworkEdge = {
              id: `edge-${Date.now()}-2`,
              source: firewall.id,
              target: targetNode.id,
              type: edgeToSecure.type,
              bandwidth: edgeToSecure.bandwidth,
              status: 'inactive'
            };
            
            newNodes.push(firewall);
            newEdges.push(edge1, edge2);
          }
        }
        break;
        
      case 'sdwan':
        // Add SD-WAN controller
        const sdwanController: NetworkNode = {
          id: `node-${Date.now()}-sdwan`,
          type: 'function',
          functionType: 'SDWAN',
          x: 250,
          y: 150,
          name: 'SD-WAN Controller',
          icon: 'PanelRight',
          status: 'unconfigured',
          config: { sdwanType: 'controller' }
        };
        
        newNodes.push(sdwanController);
        
        // Connect to the first two routers/functions we find
        const connectableNodes = newNodes.filter(node => 
          node.type === 'function' || node.type === 'router'
        ).slice(0, 2);
        
        connectableNodes.forEach((node, index) => {
          const edge: NetworkEdge = {
            id: `edge-${Date.now()}-sdwan-${index}`,
            source: sdwanController.id,
            target: node.id,
            type: 'SD-WAN',
            bandwidth: '10 Gbps',
            status: 'inactive'
          };
          newEdges.push(edge);
        });
        break;
        
      case 'bandwidth':
        // Upgrade bandwidth on high utilization connections
        newEdges = newEdges.map(edge => {
          if (edge.metrics?.bandwidthUtilization && edge.metrics.bandwidthUtilization > 80) {
            return {
              ...edge,
              bandwidth: '100 Gbps'
            };
          }
          return edge;
        });
        break;
        
      case 'vnf':
        // Add a VNF node
        const vnfNode: NetworkNode = {
          id: `node-${Date.now()}-vnf`,
          type: 'function',
          functionType: 'VNF',
          x: 300,
          y: 300,
          name: 'Virtual Network Functions',
          icon: 'BarChart2',
          status: 'unconfigured',
          config: { 
            vnfType: 'multifunction',
            resources: 'medium'
          }
        };
        
        newNodes.push(vnfNode);
        
        // Connect to a suitable node
        const targetForVNF = newNodes.find(node => node.type === 'function' || node.type === 'network');
        if (targetForVNF) {
          const vnfEdge: NetworkEdge = {
            id: `edge-${Date.now()}-vnf`,
            source: vnfNode.id,
            target: targetForVNF.id,
            type: 'Network Services',
            bandwidth: '10 Gbps',
            status: 'inactive'
          };
          newEdges.push(vnfEdge);
        }
        break;
    }
    
    // Apply the changes
    onApplyRecommendation(newNodes, newEdges);
    
    // Update the recommendation state to mark it as applied
    setRecommendations(recommendations.map(rec => 
      rec.id === recommendationId ? { ...rec, applied: true } : rec
    ));
    
    window.addToast({
      type: 'success',
      title: 'Recommendation Applied',
      message: recommendation.title + ' has been applied to your network',
      duration: 3000
    });
  };
  
  // Helper for the impact badge styling
  const getImpactStyles = (impact: 'high' | 'medium' | 'low') => {
    switch (impact) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
    }
  };
  
  // Helper for the type badge styling
  const getTypeStyles = (type: 'performance' | 'security' | 'cost' | 'reliability' | 'resiliency' | 'redundancy' | 'disaster') => {
    switch (type) {
      case 'performance':
        return 'bg-blue-100 text-blue-800';
      case 'security':
        return 'bg-purple-100 text-purple-800';
      case 'cost':
        return 'bg-green-100 text-green-800';
      case 'reliability':
      case 'resiliency':
        return 'bg-cyan-100 text-cyan-800';
      case 'redundancy':
        return 'bg-amber-100 text-amber-800';
      case 'disaster':
        return 'bg-orange-100 text-orange-800';
    }
  };
  
  // Helper for the type icons
  const getTypeIcon = (type: 'performance' | 'security' | 'cost' | 'reliability' | 'resiliency' | 'redundancy' | 'disaster') => {
    switch (type) {
      case 'performance':
        return BarChart2;
      case 'security':
        return Shield;
      case 'cost':
        return Search;
      case 'reliability':
      case 'resiliency':
        return RefreshCw;
      case 'redundancy':
        return Scale;
      case 'disaster':
        return CloudLightning;
    }
  };
  
  // If no network exists yet
  if (nodes.length === 0 && edges.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <Network className="h-16 w-16 text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-700 mb-2">No Network to Analyze</h3>
        <p className="text-gray-500 mb-6 max-w-md">
          Add nodes and connections to your network, then the AI will analyze your design and provide recommendations.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with analyze button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">AI Recommendation Engine</h2>
          <p className="text-sm text-gray-500">
            Get AI-powered suggestions to improve your network design
          </p>
        </div>
        
        <button
          onClick={analyzeNetwork}
          disabled={isAnalyzing}
          className={`
            px-4 py-2 rounded-lg text-white
            ${isAnalyzing 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700'
            }
          `}
        >
          {isAnalyzing ? (
            <>
              <Search className="h-4 w-4 mr-2 animate-spin inline-block" />
              Analyzing...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 mr-2 inline-block" />
              Analyze Network
            </>
          )}
        </button>
      </div>
      
      {/* Network Analysis Summary */}
      {!isAnalyzing && recommendations.length === 0 && (
        <div className="bg-gray-50 rounded-lg p-6 text-center">
          <AlertTriangle className="h-10 w-10 text-yellow-500 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Recommendations Yet</h3>
          <p className="text-gray-600">
            Click "Analyze Network" to have the AI evaluate your network design and suggest improvements.
          </p>
        </div>
      )}
      
      {/* Recommendations */}
      {!isAnalyzing && recommendations.length > 0 && (
        <div className="space-y-4">
          {recommendations.map((recommendation) => {
            const Icon = getTypeIcon(recommendation.type);
            return (
              <div 
                key={recommendation.id}
                className={`
                  p-4 rounded-lg border transition-all duration-200
                  ${recommendation.applied 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md'
                  }
                `}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg ${recommendation.applied ? 'bg-green-100' : getTypeStyles(recommendation.type).replace('text-', 'bg-')}`}>
                      {recommendation.applied ? (
                        <Check className="h-5 w-5 text-green-600" />
                      ) : (
                        <Icon className="h-5 w-5 text-gray-700" />
                      )}
                    </div>
                    
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-semibold text-gray-900">{recommendation.title}</h3>
                        
                        {!recommendation.applied && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getImpactStyles(recommendation.impact)}`}>
                            {recommendation.impact.toUpperCase()} IMPACT
                          </span>
                        )}
                        
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getTypeStyles(recommendation.type)}`}>
                          {recommendation.type.toUpperCase()}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mt-1">{recommendation.description}</p>
                    </div>
                  </div>
                  
                  {!recommendation.applied && (
                    <button
                      onClick={() => applyRecommendation(recommendation.id)}
                      className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                    >
                      Apply
                      <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* If analyzing */}
      {isAnalyzing && (
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="flex flex-col items-center justify-center">
            <div className="mb-4 relative">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              <Network className="h-8 w-8 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Analyzing Your Network</h3>
            <p className="text-gray-600 text-center max-w-md">
              Our AI is evaluating your network topology, looking for potential improvements in performance, security, resiliency, and redundancy.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}