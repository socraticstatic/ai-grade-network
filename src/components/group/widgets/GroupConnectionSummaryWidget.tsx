import { useMemo } from 'react';
import { Activity, Network, Cloud, Zap, Settings } from 'lucide-react';
import { Group } from '../../../types/group';
import { Connection } from '../../../types';
import { Card } from '../../common/Card';
import { LazyLoadSection } from '../../common/layouts/LazyLoadSection';
import { SkeletonCard } from '../../common/SkeletonCard';

interface GroupConnectionSummaryWidgetProps {
  group: Group;
  connections: Connection[];
}

export function GroupConnectionSummaryWidget({ group, connections }: GroupConnectionSummaryWidgetProps) {
  const connectionStats = useMemo(() => {
    // Filter connections that belong to this group
    const groupConnections = connections.filter(conn => 
      group.connectionIds.includes(conn.id)
    );
    
    // Connection counts by status
    const activeCount = groupConnections.filter(c => c.status === 'Active').length;
    const inactiveCount = groupConnections.filter(c => c.status === 'Inactive').length;
    
    // Connection counts by provider
    const providerCounts = groupConnections.reduce((acc, conn) => {
      const provider = conn.provider || 'Other';
      acc[provider] = (acc[provider] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Total bandwidth
    const totalBandwidth = groupConnections.reduce((total, conn) => {
      const bandwidthMatch = conn.bandwidth.match(/(\d+)\s*(Gbps|Mbps|Tbps)/i);
      if (bandwidthMatch) {
        const value = parseInt(bandwidthMatch[1]);
        const unit = bandwidthMatch[2].toLowerCase();
        
        // Convert to a standard unit (Gbps)
        if (unit === 'gbps') return total + value;
        if (unit === 'mbps') return total + (value / 1000);
        if (unit === 'tbps') return total + (value * 1000);
      }
      
      return total;
    }, 0);
    
    // Average utilization
    const totalUtilization = groupConnections.reduce((total, conn) => 
      total + (conn.performance?.bandwidthUtilization || 0), 0);
    const avgUtilization = groupConnections.length > 0 
      ? totalUtilization / groupConnections.length
      : 0;
    
    // Connection count by type
    const typeCounts = groupConnections.reduce((acc, conn) => {
      acc[conn.type] = (acc[conn.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      total: groupConnections.length,
      active: activeCount,
      inactive: inactiveCount,
      providers: providerCounts,
      totalBandwidth,
      avgUtilization,
      types: typeCounts
    };
  }, [group, connections]);
  
  const formatBandwidth = (bandwidth: number) => {
    if (bandwidth >= 1000) {
      return `${(bandwidth / 1000).toFixed(1)} Tbps`;
    }
    return `${bandwidth.toFixed(1)} Gbps`;
  };
  
  const getProviderLogo = (provider: string) => {
    // Just return a color based on the provider to simplify
    switch(provider) {
      case 'AWS': return 'text-fw-link';
      case 'Azure': return 'text-fw-info';
      case 'Google': return 'text-fw-link';
      default: return 'text-fw-bodyLight';
    }
  };

  return (
    <LazyLoadSection
      placeholder={<SkeletonCard lines={4} />}
      className="w-full"
    >
      <Card padding="lg" hover>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-medium text-fw-heading tracking-[-0.03em]">
            Connection Summary
          </h3>
          
          <span className="inline-flex items-center px-3 py-1 rounded-full text-figma-sm bg-brand-lightBlue text-brand-blue font-medium">
            {connectionStats.total} Total Connections
          </span>
        </div>
        
        {/* Connection Status Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-fw-wash rounded-lg p-4 flex items-center justify-between">
            <div>
              <div className="text-figma-sm text-fw-bodyLight mb-1">Active</div>
              <div className="text-xl font-semibold text-fw-success">{connectionStats.active}</div>
            </div>
            <Activity className="h-8 w-8 text-fw-success bg-fw-successLight p-1.5 rounded-full" />
          </div>
          
          <div className="bg-fw-wash rounded-lg p-4 flex items-center justify-between">
            <div>
              <div className="text-figma-sm text-fw-bodyLight mb-1">Inactive</div>
              <div className="text-xl font-semibold text-fw-bodyLight">{connectionStats.inactive}</div>
            </div>
            <Activity className="h-8 w-8 text-fw-bodyLight bg-fw-neutral p-1.5 rounded-full" />
          </div>
          
          <div className="bg-fw-wash rounded-lg p-4 flex items-center justify-between">
            <div>
              <div className="text-figma-sm text-fw-bodyLight mb-1">Total Bandwidth</div>
              <div className="text-xl font-semibold text-brand-blue">
                {formatBandwidth(connectionStats.totalBandwidth)}
              </div>
            </div>
            <Network className="h-8 w-8 text-brand-blue bg-brand-lightBlue p-1.5 rounded-full" />
          </div>
          
          <div className="bg-fw-wash rounded-lg p-4 flex items-center justify-between">
            <div>
              <div className="text-figma-sm text-fw-bodyLight mb-1">Avg Utilization</div>
              <div className="text-xl font-semibold text-fw-body">{connectionStats.avgUtilization.toFixed(1)}%</div>
            </div>
            <Zap className="h-8 w-8 text-fw-bodyLight bg-fw-neutral p-1.5 rounded-full" />
          </div>
        </div>
        
        {/* Cloud Provider Distribution */}
        {Object.keys(connectionStats.providers).length > 0 && (
          <div className="border-t border-fw-secondary pt-4 mb-4">
            <h4 className="text-figma-base font-medium text-fw-body mb-3">Cloud Provider Distribution</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Object.entries(connectionStats.providers).map(([provider, count]) => (
                <div key={provider} className="flex items-center">
                  <Cloud className={`h-5 w-5 mr-2 ${getProviderLogo(provider)}`} />
                  <div>
                    <div className="text-figma-base font-medium text-fw-heading">{provider}</div>
                    <div className="text-figma-sm text-fw-bodyLight">{count} connection{count !== 1 ? 's' : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Connection Type Distribution */}
        {Object.keys(connectionStats.types).length > 0 && (
          <div className="border-t border-fw-secondary pt-4">
            <h4 className="text-figma-base font-medium text-fw-body mb-3">Connection Types</h4>
            <div className="space-y-2">
              {Object.entries(connectionStats.types).map(([type, count]) => {
                const percentage = (count / connectionStats.total) * 100;
                return (
                  <div key={type} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <div className="text-figma-base text-fw-bodyLight">
                        {type}
                        <span className="ml-2 text-figma-sm text-fw-bodyLight">
                          {count} connection{count !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="text-figma-base font-medium text-fw-heading">{percentage.toFixed(0)}%</div>
                    </div>
                    <div className="h-2 bg-fw-neutral rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-brand-blue transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>
    </LazyLoadSection>
  );
}