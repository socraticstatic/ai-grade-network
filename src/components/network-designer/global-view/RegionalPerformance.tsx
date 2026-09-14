import { useState } from 'react';
import { Globe, Info, Activity, TrendingUp, TrendingDown, AlertTriangle, X } from 'lucide-react';
import { NetworkNode, NetworkEdge } from '../../types';

interface RegionPerformance {
  region: string;
  latency: number;
  packetLoss: number;
  availability: number;
  utilizationAvg: number;
  costEfficiency: number;
  riskLevel: 'low' | 'medium' | 'high';
  complianceStatus: 'compliant' | 'partial' | 'non-compliant';
}

interface RegionalPerformanceProps {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  onClose: () => void;
}

export function RegionalPerformance({ nodes, edges, onClose }: RegionalPerformanceProps) {
  const [selectedMetric, setSelectedMetric] = useState<'latency' | 'availability' | 'cost'>('latency');
  
  // Extract regions from nodes and calculate performance metrics
  const getRegionalPerformance = (): RegionPerformance[] => {
    const regionMap = new Map<string, NetworkNode[]>();
    const regionEdgesMap = new Map<string, NetworkEdge[]>();
    
    // Group nodes and edges by region
    nodes.forEach(node => {
      const region = node.config?.region || 'unknown';
      const nodesInRegion = regionMap.get(region) || [];
      nodesInRegion.push(node);
      regionMap.set(region, nodesInRegion);
    });
    
    edges.forEach(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      
      if (sourceNode && targetNode) {
        const sourceRegion = sourceNode.config?.region || 'unknown';
        const targetRegion = targetNode.config?.region || 'unknown';
        
        // Add to both source and target regions
        [sourceRegion, targetRegion].forEach(region => {
          const edgesInRegion = regionEdgesMap.get(region) || [];
          edgesInRegion.push(edge);
          regionEdgesMap.set(region, edgesInRegion);
        });
      }
    });
    
    // Calculate performance metrics for each region
    return Array.from(regionMap.keys()).map(region => {
      const nodesInRegion = regionMap.get(region) || [];
      const edgesInRegion = regionEdgesMap.get(region) || [];
      
      // Calculate metrics
      const activeNodes = nodesInRegion.filter(n => n.status === 'active').length;
      const activeEdges = edgesInRegion.filter(e => e.status === 'active').length;
      
      // Calculate average latency
      let totalLatency = 0;
      let latencyCount = 0;
      
      edgesInRegion.forEach(edge => {
        if (edge.metrics?.latency) {
          const latencyValue = parseFloat(edge.metrics.latency.replace('ms', ''));
          if (!isNaN(latencyValue)) {
            totalLatency += latencyValue;
            latencyCount++;
          }
        }
      });
      
      const latency = latencyCount > 0 ? totalLatency / latencyCount : 10; // Default to 10ms
      
      // Calculate utilization
      let totalUtilization = 0;
      let utilizationCount = 0;
      
      edgesInRegion.forEach(edge => {
        if (edge.metrics?.bandwidthUtilization !== undefined) {
          totalUtilization += edge.metrics.bandwidthUtilization;
          utilizationCount++;
        }
      });
      
      const utilizationAvg = utilizationCount > 0 ? totalUtilization / utilizationCount : 50; // Default to 50%
      
      // Calculate cost efficiency - based on bandwidth vs utilization
      let costEfficiency = 80; // Default
      
      // If utilization is very low but we have high capacity links, cost efficiency is lower
      if (utilizationAvg < 30 && edgesInRegion.some(e => e.bandwidth.includes('100'))) {
        costEfficiency = 60;
      }
      
      // If utilization is high with lower capacity links, cost efficiency is higher
      if (utilizationAvg > 70 && edgesInRegion.every(e => !e.bandwidth.includes('100'))) {
        costEfficiency = 90;
      }
      
      // Calculate availability based on redundancy
      const redundancyFactor = nodesInRegion.length > 1 ? 
        edgesInRegion.length / nodesInRegion.length : 0;
      
      const availability = Math.min(99.99, 99.5 + redundancyFactor * 0.1);
      
      // Risk assessment
      let riskLevel: 'low' | 'medium' | 'high' = 'medium';
      
      // Lower risk if we have active nodes, good redundancy, and security
      if (
        activeNodes > 1 && 
        redundancyFactor >= 1.5 && 
        nodesInRegion.some(n => n.type === 'function' && n.functionType === 'Firewall')
      ) {
        riskLevel = 'low';
      }
      
      // Higher risk with poor redundancy or no security
      if (
        redundancyFactor < 1 || 
        nodesInRegion.length === 1 ||
        !nodesInRegion.some(n => n.type === 'function' && n.functionType === 'Firewall')
      ) {
        riskLevel = 'high';
      }
      
      // Compliance status
      let complianceStatus: 'compliant' | 'partial' | 'non-compliant' = 'partial';
      
      // Compliance rules vary by region
      if (
        riskLevel === 'low' && 
        nodesInRegion.some(n => n.config?.complianceLevel)
      ) {
        complianceStatus = 'compliant';
      }
      
      if (riskLevel === 'high' || nodesInRegion.length < 2) {
        complianceStatus = 'non-compliant';
      }
      
      // Generate packet loss based on link quality
      const packetLoss = riskLevel === 'low' ? 0.01 : 
                         riskLevel === 'medium' ? 0.1 : 0.5;
      
      return {
        region,
        latency,
        packetLoss,
        availability,
        utilizationAvg,
        costEfficiency,
        riskLevel,
        complianceStatus
      };
    });
  };
  
  const regionalData = getRegionalPerformance();
  
  const getMetricColor = (metric: 'latency' | 'packetLoss' | 'availability' | 'utilizationAvg' | 'costEfficiency', value: number) => {
    switch (metric) {
      case 'latency':
        return value < 10 ? 'text-green-600' : 
               value < 50 ? 'text-yellow-600' : 'text-red-600';
      case 'packetLoss':
        return value < 0.1 ? 'text-green-600' : 
               value < 0.5 ? 'text-yellow-600' : 'text-red-600';
      case 'availability':
        return value > 99.95 ? 'text-green-600' : 
               value > 99.9 ? 'text-yellow-600' : 'text-red-600';
      case 'utilizationAvg':
        return (value > 40 && value < 80) ? 'text-green-600' : 
               (value > 20 && value < 90) ? 'text-yellow-600' : 'text-red-600';
      case 'costEfficiency':
        return value > 85 ? 'text-green-600' : 
               value > 70 ? 'text-yellow-600' : 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };
  
  const getRiskColor = (risk: 'low' | 'medium' | 'high') => {
    switch (risk) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getComplianceColor = (compliance: 'compliant' | 'partial' | 'non-compliant') => {
    switch (compliance) {
      case 'compliant': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'non-compliant': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  const renderMetricValue = (
    metric: 'latency' | 'packetLoss' | 'availability' | 'utilizationAvg' | 'costEfficiency', 
    value: number
  ) => {
    switch (metric) {
      case 'latency':
        return `${value.toFixed(1)} ms`;
      case 'packetLoss':
        return `${(value * 100).toFixed(2)}%`;
      case 'availability':
        return `${value.toFixed(2)}%`;
      case 'utilizationAvg':
        return `${value.toFixed(0)}%`;
      case 'costEfficiency':
        return `${value.toFixed(0)}%`;
      default:
        return value;
    }
  };
  
  // If there's no data, show a placeholder
  if (regionalData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-4 flex items-center justify-center">
        <div className="text-center">
          <Globe className="h-10 w-10 mx-auto text-gray-300 mb-2" />
          <p className="text-gray-500 text-sm">No regional data available</p>
          <p className="text-gray-400 text-xs mt-1">Add network nodes with region information to see performance metrics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center sticky top-0 z-30">
        <h3 className="text-base font-medium text-gray-900 flex items-center">
          <Globe className="h-5 w-5 mr-2 text-blue-600" />
          Regional Performance Metrics
        </h3>
        
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setSelectedMetric('latency')}
              className={`px-3 py-1 text-xs font-medium rounded-md ${
                selectedMetric === 'latency' 
                  ? 'bg-white shadow-sm text-blue-700' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              type="button"
            >
              Performance
            </button>
            <button
              onClick={() => setSelectedMetric('availability')}
              className={`px-3 py-1 text-xs font-medium rounded-md ${
                selectedMetric === 'availability' 
                  ? 'bg-white shadow-sm text-blue-700' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              type="button"
            >
              Reliability
            </button>
            <button
              onClick={() => setSelectedMetric('cost')}
              className={`px-3 py-1 text-xs font-medium rounded-md ${
                selectedMetric === 'cost' 
                  ? 'bg-white shadow-sm text-blue-700' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              type="button"
            >
              Cost
            </button>
          </div>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-1 text-gray-400 hover:text-gray-500"
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      <div className="p-4 max-h-[70vh] overflow-y-auto">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-20">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Region
                </th>
                
                {selectedMetric === 'latency' && (
                  <>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Latency
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Packet Loss
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Utilization
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </>
                )}
                
                {selectedMetric === 'availability' && (
                  <>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Availability
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Risk Level
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Compliance
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </>
                )}
                
                {selectedMetric === 'cost' && (
                  <>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cost Efficiency
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Utilization
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Opportunity
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {regionalData.map((regionData, index) => (
                <tr key={regionData.region} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Globe className="h-5 w-5 text-blue-500 mr-2" />
                      <div className="text-sm font-medium text-gray-900">
                        {regionData.region === 'unknown' ? 'Global' : regionData.region}
                      </div>
                    </div>
                  </td>
                  
                  {selectedMetric === 'latency' && (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Activity className={`h-4 w-4 ${getMetricColor('latency', regionData.latency)} mr-2`} />
                          <div className={`text-sm font-medium ${getMetricColor('latency', regionData.latency)}`}>
                            {renderMetricValue('latency', regionData.latency)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`text-sm font-medium ${getMetricColor('packetLoss', regionData.packetLoss)}`}>
                            {renderMetricValue('packetLoss', regionData.packetLoss)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`text-sm font-medium ${getMetricColor('utilizationAvg', regionData.utilizationAvg)}`}>
                            {renderMetricValue('utilizationAvg', regionData.utilizationAvg)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                          ${regionData.latency < 20 && regionData.packetLoss < 0.1 
                            ? 'bg-green-100 text-green-800'
                            : regionData.latency < 50 && regionData.packetLoss < 0.5
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {regionData.latency < 20 && regionData.packetLoss < 0.1 
                            ? 'Excellent' 
                            : regionData.latency < 50 && regionData.packetLoss < 0.5
                              ? 'Acceptable'
                              : 'Poor'}
                        </span>
                      </td>
                    </>
                  )}
                  
                  {selectedMetric === 'availability' && (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${getMetricColor('availability', regionData.availability)}`}>
                          {renderMetricValue('availability', regionData.availability)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRiskColor(regionData.riskLevel)}`}>
                          {regionData.riskLevel.charAt(0).toUpperCase() + regionData.riskLevel.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getComplianceColor(regionData.complianceStatus)}`}>
                          {regionData.complianceStatus === 'compliant' ? 'Compliant' :
                           regionData.complianceStatus === 'partial' ? 'Partial' : 'Non-Compliant'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                          ${regionData.availability > 99.95 && regionData.riskLevel === 'low'
                            ? 'bg-green-100 text-green-800'
                            : regionData.availability > 99.9 && regionData.riskLevel !== 'high'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {regionData.availability > 99.95 && regionData.riskLevel === 'low'
                            ? 'Resilient' 
                            : regionData.availability > 99.9 && regionData.riskLevel !== 'high'
                              ? 'Adequate'
                              : 'At Risk'}
                        </span>
                      </td>
                    </>
                  )}
                  
                  {selectedMetric === 'cost' && (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${getMetricColor('costEfficiency', regionData.costEfficiency)}`}>
                          {renderMetricValue('costEfficiency', regionData.costEfficiency)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`text-sm font-medium ${getMetricColor('utilizationAvg', regionData.utilizationAvg)}`}>
                            {renderMetricValue('utilizationAvg', regionData.utilizationAvg)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {regionData.costEfficiency < 75 ? (
                            <>
                              <TrendingDown className="h-4 w-4 text-green-500 mr-2" />
                              <span className="text-sm text-gray-900">
                                {(100 - regionData.costEfficiency) > 25 ? 'Significant' : 'Moderate'} savings
                              </span>
                            </>
                          ) : (
                            <>
                              <TrendingUp className="h-4 w-4 text-blue-500 mr-2" />
                              <span className="text-sm text-gray-900">
                                {regionData.utilizationAvg > 80 ? 'Expansion needed' : 'Optimized'}
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                          ${regionData.costEfficiency > 85
                            ? 'bg-green-100 text-green-800'
                            : regionData.costEfficiency > 70
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {regionData.costEfficiency > 85
                            ? 'Optimized' 
                            : regionData.costEfficiency > 70
                              ? 'Adequate'
                              : 'Inefficient'}
                        </span>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Insights summary */}
        <div className="mt-4 text-sm text-gray-500 flex items-center bg-blue-50 p-3 rounded-lg">
          <Info className="h-4 w-4 mr-1.5 text-blue-500 flex-shrink-0" />
          <span>
            {selectedMetric === 'latency'
              ? 'Performance metrics show the technical capabilities of your network across regions.'
              : selectedMetric === 'availability'
                ? 'Reliability metrics indicate your network\'s ability to maintain operations under stress.'
                : 'Cost metrics help identify optimization opportunities and ROI potential.'}
          </span>
        </div>
      </div>
    </div>
  );
}