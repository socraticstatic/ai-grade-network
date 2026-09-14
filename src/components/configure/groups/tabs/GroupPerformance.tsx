import { Activity, TrendingUp, Signal, Clock, ArrowUpDown, RefreshCw, Network } from 'lucide-react';
import { Group } from '../../../../types/group';
import { Connection } from '../../../../types';
import { Button } from '../../../common/Button';
import { chartColors } from '../../../../utils/chartColors';

interface GroupPerformanceProps {
  group: Group;
  connections: Connection[];
}

export function GroupPerformance({ group, connections }: GroupPerformanceProps) {
  if (!group.performance) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Activity className="h-12 w-12 text-fw-bodyLight mx-auto mb-4" />
          <h3 className="text-lg font-medium text-fw-heading tracking-[-0.03em] mb-2">No Performance Data</h3>
          <p className="text-fw-bodyLight">This group doesn't have any performance data yet.</p>
          <div className="mt-4">
            <Button
              variant="primary"
              onClick={() => {
                window.addToast({
                  type: 'info',
                  title: 'Refreshing Performance',
                  message: 'Performance data will be updated shortly.',
                  duration: 3000
                });
              }}
            >
              Refresh Performance Data
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Sample billing trend data for the group
  const billingTrendData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      label: 'Monthly Billing',
      data: [2700, 2850, 2750, 2900, 3100, 2950],
      borderColor: chartColors.success,
      fill: false
    }]
  };

  return (
    <div className="p-6 space-y-6">
      {/* Connection Status Summary */}
      <div className="bg-fw-base rounded-xl border border-fw-secondary p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-fw-heading flex items-center">
            <Activity className="h-5 w-5 text-fw-link mr-2" />
            Connection Status
          </h3>
          <Button
            variant="ghost"
            icon={RefreshCw}
            onClick={() => {
              window.addToast({
                type: 'success',
                title: 'Refreshed',
                message: 'Status data has been refreshed',
                duration: 3000
              });
            }}
          >
            Refresh
          </Button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <div className="p-4 bg-fw-accent rounded-lg">
            <div className="flex items-center justify-between">
              <h4 className="text-figma-base font-medium text-fw-body">Active Connections</h4>
              <Network className="h-5 w-5 text-fw-link" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-semibold text-fw-heading">
                {connections.filter(c => c.status === 'Active').length}
              </span>
              <span className="text-figma-base text-fw-bodyLight ml-2">
                of {connections.length} total
              </span>
            </div>
          </div>
          
          <div className="p-4 bg-fw-successLight rounded-lg">
            <div className="flex items-center justify-between">
              <h4 className="text-figma-base font-medium text-fw-body">Success Rate</h4>
              <Activity className="h-5 w-5 text-fw-success" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-semibold text-fw-heading">
                {((connections.filter(c => c.status === 'Active').length / Math.max(1, connections.length)) * 100).toFixed(0)}%
              </span>
              <span className="text-figma-base text-fw-bodyLight ml-2">
                connection rate
              </span>
            </div>
          </div>
          
          <div className="p-4 bg-fw-purpleLight rounded-lg">
            <div className="flex items-center justify-between">
              <h4 className="text-figma-base font-medium text-fw-body">Last Updated</h4>
              <Clock className="h-5 w-5 text-fw-purple" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-semibold text-fw-heading">
                {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
              <span className="text-figma-base text-fw-bodyLight ml-2">
                today
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Connection Status Table */}
      <div className="bg-fw-base rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-fw-secondary">
          <h3 className="text-lg font-medium text-fw-heading">Connection Status</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-fw-secondary">
            <thead className="bg-fw-wash">
              <tr>
                <th scope="col" className="px-6 h-12 text-left text-[14px] font-medium text-fw-heading">
                  Connection
                </th>
                <th scope="col" className="px-6 h-12 text-left text-[14px] font-medium text-fw-heading">
                  Status
                </th>
                <th scope="col" className="px-6 h-12 text-left text-[14px] font-medium text-fw-heading">
                  Last Updated
                </th>
              </tr>
            </thead>
            <tbody className="bg-fw-base divide-y divide-fw-secondary">
              {connections.length > 0 ? (
                connections.map((conn) => (
                  <tr key={conn.id} className="hover:bg-fw-wash transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-figma-base font-medium text-fw-heading">{conn.name}</div>
                      <div className="text-figma-base text-fw-bodyLight">{conn.type}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-figma-sm font-semibold ${
                        conn.status === 'Active'
                          ? 'bg-fw-successLight text-fw-success'
                          : 'bg-fw-neutral text-fw-body'
                      }`}>
                        {conn.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-figma-base text-fw-bodyLight">
                      {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-figma-base text-center text-fw-bodyLight">
                    No connections in this group
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Support Information */}
      <div className="bg-fw-base rounded-xl border border-fw-secondary p-6">
        <div className="flex items-center mb-4">
          <h3 className="text-lg font-medium text-fw-heading">Support Information</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="p-4 bg-fw-wash rounded-lg">
              <h4 className="text-figma-base font-medium text-fw-body mb-2">Need Help?</h4>
              <p className="text-figma-base text-fw-body">
                Our support team is available 24/7 to assist with any connection issues or questions you might have about your group connections.
              </p>
              <Button 
                variant="outline"
                className="mt-3"
                onClick={() => {
                  window.addToast({
                    type: 'info',
                    title: 'Support',
                    message: 'Contacting support...',
                    duration: 3000
                  });
                }}
              >
                Contact Support
              </Button>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 bg-fw-wash rounded-lg">
              <h4 className="text-figma-base font-medium text-fw-body mb-2">Documentation</h4>
              <p className="text-figma-base text-fw-body">
                Find detailed information about connection statuses, troubleshooting guides, and best practices in our documentation portal.
              </p>
              <Button 
                variant="outline"
                className="mt-3"
                onClick={() => {
                  window.addToast({
                    type: 'info',
                    title: 'Documentation',
                    message: 'Opening documentation portal...',
                    duration: 3000
                  });
                }}
              >
                View Documentation
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}