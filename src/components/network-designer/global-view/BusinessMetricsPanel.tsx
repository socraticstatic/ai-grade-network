import { useState } from 'react';
import { DollarSign, TrendingUp, Clock, AlertCircle, BarChart4, X, ShieldCheck, Network, Zap } from 'lucide-react';
import { NetworkNode, NetworkEdge } from '../../types';

interface BusinessMetricsPanelProps {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  isVisible: boolean;
  onClose: () => void;
}

export function BusinessMetricsPanel({ nodes, edges, isVisible, onClose }: BusinessMetricsPanelProps) {
  const [activeTab, setActiveTab] = useState<'metrics' | 'recommendations'>('metrics');
  
  if (!isVisible) return null;
  
  // Calculate total monthly cost
  const calculateTotalCost = () => {
    let totalCost = 0;
    
    // Node costs based on type and configuration
    nodes.forEach(node => {
      if (node.type === 'function') {
        // Costs for network functions
        switch (node.functionType) {
          case 'Router':
            totalCost += 299.99;
            break;
          case 'SDWAN':
            totalCost += 499.99;
            break;
          case 'Firewall':
            totalCost += 399.99;
            break;
          case 'VNF':
            totalCost += 249.99;
            break;
          case 'VNAT':
            totalCost += 199.99;
            break;
          default:
            totalCost += 199.99;
        }
      } else if (node.type === 'destination') {
        // Cloud destination costs vary by provider
        const provider = node.config?.provider || 'AWS';
        switch (provider) {
          case 'AWS':
            totalCost += 150;
            break;
          case 'Azure':
            totalCost += 165;
            break;
          case 'GCP':
            totalCost += 155;
            break;
          default:
            totalCost += 150;
        }
      }
    });
    
    // Edge costs based on bandwidth and type
    edges.forEach(edge => {
      const bandwidth = parseInt(edge.bandwidth.split(' ')[0], 10) || 1;
      
      // Cost formula based on connection type
      if (edge.type.includes('Direct Connect')) {
        totalCost += 100 + (bandwidth * 20);
      } else if (edge.type.includes('ExpressRoute')) {
        totalCost += 120 + (bandwidth * 25);
      } else if (edge.type.includes('Hub')) {
        totalCost += 80 + (bandwidth * 15);
      } else if (edge.type.includes('VPN')) {
        totalCost += 50 + (bandwidth * 5);
      } else {
        totalCost += 50 + (bandwidth * 10);
      }
    });
    
    return totalCost;
  };
  
  // Calculate potential cost savings
  const calculatePotentialSavings = () => {
    // Logic for calculating potential savings:
    // 1. Identify unused or underutilized resources
    // 2. Spot opportunities for consolidation
    // 3. Suggest optimized bandwidth allocation
    
    let potentialSavings = 0;
    
    // Find inactive nodes that could be removed
    const inactiveNodes = nodes.filter(node => node.status !== 'active');
    inactiveNodes.forEach(node => {
      if (node.type === 'function') {
        potentialSavings += 200; // Average cost of a network function
      }
    });
    
    // Find potential bandwidth optimizations
    edges.forEach(edge => {
      // If bandwidth utilization is low, suggest downgrading
      if (edge.metrics?.bandwidthUtilization && edge.metrics.bandwidthUtilization < 30) {
        const bandwidth = parseInt(edge.bandwidth.split(' ')[0], 10) || 1;
        if (bandwidth >= 10) {
          potentialSavings += bandwidth * 5; // Savings from downgrading
        }
      }
    });
    
    // Check for duplicate routes that could be consolidated
    const connections = new Set<string>();
    let duplicateConnections = 0;
    
    edges.forEach(edge => {
      const connection = edge.source < edge.target 
        ? `${edge.source}-${edge.target}` 
        : `${edge.target}-${edge.source}`;
      
      if (connections.has(connection)) {
        duplicateConnections++;
      } else {
        connections.add(connection);
      }
    });
    
    potentialSavings += duplicateConnections * 100;
    
    return potentialSavings;
  };
  
  // Calculate SLA compliance percentage
  const calculateSlaCompliance = () => {
    // For this example, we'll use:
    // - Percentage of nodes that are active
    // - Percentage of edges with resilience configuration
    // - Presence of redundant paths
    
    const totalElements = nodes.length + edges.length;
    if (totalElements === 0) return 100;
    
    let slaPoints = 0;
    
    // Active nodes contribute to SLA
    const activeNodes = nodes.filter(node => node.status === 'active');
    slaPoints += (activeNodes.length / nodes.length) * 40;
    
    // Resilient edges contribute to SLA
    const resilientEdges = edges.filter(edge => 
      edge.config?.resilience === 'ha' || 
      edge.config?.resilience === 'redundant' ||
      edge.config?.bfd === true
    );
    
    if (edges.length > 0) {
      slaPoints += (resilientEdges.length / edges.length) * 30;
    }
    
    // Check for redundant paths to critical destinations
    const destinations = nodes.filter(node => node.type === 'destination');
    let redundantPathCount = 0;
    
    destinations.forEach(dest => {
      const connectingEdges = edges.filter(edge => 
        edge.source === dest.id || edge.target === dest.id
      );
      
      if (connectingEdges.length > 1) {
        redundantPathCount++;
      }
    });
    
    if (destinations.length > 0) {
      slaPoints += (redundantPathCount / destinations.length) * 30;
    } else {
      slaPoints += 30; // No destinations, so no redundancy needed
    }
    
    return Math.min(Math.round(slaPoints), 100);
  };
  
  // Calculate business risk score
  const calculateRiskScore = () => {
    // For this example, we'll use:
    // - Single points of failure
    // - Security posture
    // - Disaster recovery readiness
    
    let riskScore = 100; // Start with perfect score and deduct
    
    // Single points of failure increase risk
    const destinations = nodes.filter(node => node.type === 'destination');
    
    destinations.forEach(dest => {
      const connectingEdges = edges.filter(edge => 
        edge.source === dest.id || edge.target === dest.id
      );
      
      if (connectingEdges.length < 2) {
        riskScore -= 15; // Penalize for lack of redundancy
      }
    });
    
    // Security posture impacts risk
    const firewalls = nodes.filter(node => 
      node.type === 'function' && node.functionType === 'Firewall'
    );
    
    if (firewalls.length === 0 && nodes.length > 3) {
      riskScore -= 20; // Penalize for no firewall in a substantive network
    }
    
    // Check for multi-region setup (disaster recovery)
    const regions = new Set<string>();
    nodes.forEach(node => {
      if (node.config?.region) {
        regions.add(node.config.region);
      }
    });
    
    if (regions.size < 2 && nodes.length > 4) {
      riskScore -= 25; // Penalize for single-region setup
    }
    
    // Cap risk score between 0 and 100
    return Math.max(0, Math.min(100, riskScore));
  };
  
  const calculatePerformanceScore = () => {
    // Factors for performance:
    // - Active vs inactive nodes/edges
    // - Network latency estimates
    // - Bandwidth capacity
    
    let performanceScore = 0;
    
    // Active nodes and edges contribute to performance
    const activeNodes = nodes.filter(node => node.status === 'active');
    const activeEdges = edges.filter(edge => edge.status === 'active');
    
    if (nodes.length > 0) {
      performanceScore += (activeNodes.length / nodes.length) * 25;
    } else {
      performanceScore += 25; // No nodes to worry about
    }
    
    if (edges.length > 0) {
      performanceScore += (activeEdges.length / edges.length) * 25;
    } else {
      performanceScore += 25; // No edges to worry about
    }
    
    // Bandwidth capacity assessment
    let totalBandwidth = 0;
    edges.forEach(edge => {
      const bandwidth = parseInt(edge.bandwidth.split(' ')[0], 10) || 1;
      totalBandwidth += bandwidth;
    });
    
    // Score based on average bandwidth per edge
    const avgBandwidth = edges.length > 0 ? totalBandwidth / edges.length : 0;
    performanceScore += Math.min(25, avgBandwidth * 2.5);
    
    // Network optimization score based on topology
    let optimizationScore = 25;
    
    // Check if we have SD-WAN for optimization
    const hasSdwan = nodes.some(node => 
      node.type === 'function' && node.functionType === 'SDWAN'
    );
    
    if (!hasSdwan && edges.length > 3) {
      optimizationScore -= 10;
    }
    
    // Check for bandwidth utilization inefficiencies
    const highUtilizationEdges = edges.filter(edge => 
      edge.metrics?.bandwidthUtilization && edge.metrics.bandwidthUtilization > 80
    );
    
    if (highUtilizationEdges.length > 0) {
      optimizationScore -= highUtilizationEdges.length * 5;
    }
    
    performanceScore += Math.max(0, optimizationScore);
    
    return Math.min(100, Math.round(performanceScore));
  };

  // Generate recommendations based on analysis
  const generateRecommendations = () => {
    const recommendations = [];
    
    // Check for cost optimization opportunities
    const underutilizedEdges = edges.filter(edge => {
      return edge.metrics?.bandwidthUtilization && edge.metrics.bandwidthUtilization < 30;
    });
    
    if (underutilizedEdges.length > 1) {
      recommendations.push({
        id: 'optimize-bandwidth',
        title: 'Optimize Bandwidth Allocation',
        description: `${underutilizedEdges.length} connections are underutilized. Consider right-sizing to reduce costs.`,
        impact: underutilizedEdges.length > 3 ? 'high' : 'medium',
        category: 'cost',
        icon: DollarSign
      });
    }
    
    // Check for SD-WAN optimization
    if (!nodes.some(n => n.type === 'function' && n.functionType === 'SDWAN') && edges.length > 3) {
      recommendations.push({
        id: 'add-sdwan',
        title: 'Implement SD-WAN',
        description: 'SD-WAN can optimize traffic flow and reduce costs for your multi-connection network.',
        impact: 'high',
        category: 'performance',
        icon: Network
      });
    }
    
    // Check for security gaps
    if (!nodes.some(n => n.type === 'function' && n.functionType === 'Firewall') && nodes.length > 3) {
      recommendations.push({
        id: 'add-security',
        title: 'Enhance Security Posture',
        description: 'Your network lacks dedicated security functions. Add a firewall to improve security.',
        impact: 'high',
        category: 'risk',
        icon: ShieldCheck
      });
    }
    
    return recommendations;
  };
  
  const totalCost = calculateTotalCost();
  const potentialSavings = calculatePotentialSavings();
  const slaCompliance = calculateSlaCompliance();
  const riskScore = calculateRiskScore();
  const performanceScore = calculatePerformanceScore();
  const recommendations = generateRecommendations();
  
  const getRiskColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  const getSlaColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  const getPerformanceColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white rounded-lg shadow-xl border border-gray-200">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200 sticky top-0 z-30">
        <h3 className="text-base font-semibold text-gray-900 flex items-center">
          <BarChart4 className="h-5 w-5 mr-2 text-blue-600" />
          Business Insights
        </h3>
        
        <div className="flex space-x-1">
          <button
            type="button"
            onClick={() => setActiveTab('metrics')}
            className={`px-3 py-1 text-xs font-medium rounded ${
              activeTab === 'metrics' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Metrics
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('recommendations')}
            className={`px-3 py-1 text-xs font-medium rounded ${
              activeTab === 'recommendations' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Recommendations
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="ml-1 p-1 text-gray-400 hover:text-gray-500"
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      {activeTab === 'metrics' && (
        <div className="p-4">
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Cost Overview */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
              <div className="flex items-center mb-3">
                <div className="p-2 rounded-full bg-blue-100">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                </div>
                <h4 className="ml-2 text-lg font-medium text-gray-900">Cost Overview</h4>
              </div>
              
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Monthly Cost</span>
                    <span className="font-medium text-gray-900">${totalCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Potential Savings</span>
                    <span className="font-medium text-green-600">${potentialSavings.toFixed(2)}</span>
                  </div>
                </div>
                
                <div className="pt-2 border-t border-blue-200">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Optimized Cost</span>
                    <span className="font-medium text-gray-900">${(totalCost - potentialSavings).toFixed(2)}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Potential {potentialSavings > 0 ? 
                      Math.round((potentialSavings / totalCost) * 100) : 0}% cost reduction
                  </div>
                </div>
              </div>
            </div>
            
            {/* Business Metrics */}
            <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
              <div className="flex items-center mb-3">
                <div className="p-2 rounded-full bg-indigo-100">
                  <TrendingUp className="h-5 w-5 text-indigo-600" />
                </div>
                <h4 className="ml-2 text-lg font-medium text-gray-900">Business Impact</h4>
              </div>
              
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">SLA Compliance</span>
                    <span className={`font-medium ${getSlaColor(slaCompliance)}`}>{slaCompliance}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full ${
                        slaCompliance >= 90 ? 'bg-green-500' :
                        slaCompliance >= 75 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${slaCompliance}%` }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Risk Score</span>
                    <span className={`font-medium ${getRiskColor(riskScore)}`}>{riskScore}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full ${
                        riskScore >= 80 ? 'bg-green-500' :
                        riskScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${riskScore}%` }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Performance</span>
                    <span className={`font-medium ${getPerformanceColor(performanceScore)}`}>{performanceScore}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full ${
                        performanceScore >= 85 ? 'bg-green-500' :
                        performanceScore >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${performanceScore}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Business Insights & Recommendations */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center mb-3">
              <AlertCircle className="h-5 w-5 text-amber-500 mr-2" />
              <h4 className="text-base font-medium text-gray-900">Business Insights</h4>
            </div>
            
            <div className="space-y-2">
              {potentialSavings > 100 && (
                <div className="flex items-start space-x-3">
                  <DollarSign className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Cost Optimization Opportunity</p>
                    <p className="text-xs text-gray-600">
                      Identify ${potentialSavings.toFixed(2)} in monthly savings by optimizing inactive resources and consolidating connections.
                    </p>
                  </div>
                </div>
              )}
              
              {slaCompliance < 90 && (
                <div className="flex items-start space-x-3">
                  <Clock className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">SLA Risk Identified</p>
                    <p className="text-xs text-gray-600">
                      Current network design may not meet service level agreements. Consider adding redundant paths and high-availability configurations.
                    </p>
                  </div>
                </div>
              )}
              
              {riskScore < 75 && (
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Business Continuity Risk</p>
                    <p className="text-xs text-gray-600">
                      Single region deployment and lack of redundancy creates significant business risk. Consider multi-region deployments.
                    </p>
                  </div>
                </div>
              )}
              
              {performanceScore < 80 && (
                <div className="flex items-start space-x-3">
                  <TrendingUp className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Performance Optimization Needed</p>
                    <p className="text-xs text-gray-600">
                      Application performance may be impacted. Consider bandwidth upgrades and SD-WAN implementation.
                    </p>
                  </div>
                </div>
              )}
              
              {/* If no specific issues were found */}
              {potentialSavings <= 100 && slaCompliance >= 90 && riskScore >= 75 && performanceScore >= 80 && (
                <div className="flex items-start space-x-3">
                  <TrendingUp className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Network Optimized for Business Value</p>
                    <p className="text-xs text-gray-600">
                      Your current network design is well-optimized for business needs with good cost efficiency and performance metrics.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {activeTab === 'recommendations' && (
        <div className="p-4">
          <div className="space-y-4">
            {recommendations.length === 0 ? (
              <div className="text-center py-4">
                <Zap className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No recommendations available</p>
                <p className="text-gray-400 text-xs mt-1">Your network is already optimized!</p>
              </div>
            ) : (
              recommendations.map(rec => (
                <div 
                  key={rec.id}
                  className={`p-3 rounded-lg border ${
                    rec.category === 'cost' ? 'bg-green-50 border-green-100' :
                    rec.category === 'performance' ? 'bg-blue-50 border-blue-100' :
                    'bg-amber-50 border-amber-100'
                  }`}
                >
                  <div className="flex items-start">
                    <div className={`p-1.5 rounded-full mr-2 ${
                      rec.category === 'cost' ? 'bg-green-100' :
                      rec.category === 'performance' ? 'bg-blue-100' :
                      'bg-amber-100'
                    }`}>
                      <rec.icon className={`h-4 w-4 ${
                        rec.category === 'cost' ? 'text-green-600' :
                        rec.category === 'performance' ? 'text-blue-600' :
                        'text-amber-600'
                      }`} />
                    </div>
                    <div>
                      <div className="flex items-center">
                        <h4 className="text-sm font-medium text-gray-900">{rec.title}</h4>
                        <span className={`ml-2 px-1.5 py-0.5 text-xs font-medium rounded-full ${
                          rec.impact === 'high' ? 'bg-red-100 text-red-800' :
                          rec.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {rec.impact.toUpperCase()}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-600">{rec.description}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}