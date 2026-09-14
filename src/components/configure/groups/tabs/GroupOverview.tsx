import { Users, Network, CreditCard, TrendingUp, AlertCircle, CheckCircle, Clock, Activity } from 'lucide-react';
import { Group } from '../../../../types/group';
import { Connection } from '../../../../types';
import { User } from '../../../../types';

interface GroupOverviewProps {
  group: Group;
  connections: Connection[];
  users: User[];
}

export function GroupOverview({ group, connections, users }: GroupOverviewProps) {
  // Helper function to parse bandwidth string to number (in Gbps)
  const parseBandwidth = (bandwidth: string): number => {
    if (!bandwidth) return 0;
    const match = bandwidth.match(/(\d+(?:\.\d+)?)\s*(Gbps|Mbps)/i);
    if (!match) return 0;
    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    return unit === 'mbps' ? value / 1000 : value;
  };

  // Calculate aggregated metrics from connections
  const activeConnections = connections.filter(c => c.status === 'Active').length;
  const totalBandwidth = connections.reduce((sum, c) => sum + parseBandwidth(c.bandwidth), 0);
  const avgUtilization = connections.length > 0
    ? connections.reduce((sum, c) => sum + (c.performance?.bandwidthUtilization || 0), 0) / connections.length
    : 0;

  // Calculate cumulative billing
  const monthlyConnectionCost = connections.reduce((sum, c) => sum + (c.billing?.total || 250), 0);
  const totalMonthlyCost = group.billing?.monthlyRate || monthlyConnectionCost;

  // Performance health calculations
  const healthyConnections = connections.filter(c => c.status === 'Active').length;
  const warningConnections = connections.filter(c => c.status === 'Pending').length;
  const healthScore = connections.length > 0
    ? Math.round((healthyConnections / connections.length) * 100)
    : 100;

  return (
    <div className="p-6 space-y-8">
      {/* Pool Summary Header */}
      <div>
        <h3 className="text-lg font-semibold text-fw-heading tracking-[-0.03em] mb-1">Pool Summary</h3>
        <p className="text-figma-base text-fw-body">
          Consolidated view of all resources and performance metrics for this pool
        </p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Members */}
        <div className="bg-fw-base rounded-lg p-5 border border-fw-secondary">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-fw-bodyLight">Members</span>
            <Users className="h-4 w-4 text-fw-bodyLight" />
          </div>
          <div className="text-3xl font-bold text-fw-heading">{users.length}</div>
          <p className="text-figma-sm text-fw-bodyLight mt-1">Active in pool</p>
        </div>

        {/* Total Connections */}
        <div className="bg-fw-base rounded-lg p-5 border border-fw-secondary">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-fw-bodyLight">Connections</span>
            <Network className="h-4 w-4 text-fw-bodyLight" />
          </div>
          <div className="text-3xl font-bold text-fw-heading">{connections.length}</div>
          <p className="text-figma-sm text-fw-bodyLight mt-1">{activeConnections} active</p>
        </div>

        {/* Health Score */}
        <div className="bg-fw-base rounded-lg p-5 border border-fw-secondary">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-fw-bodyLight">Health</span>
            <Activity className="h-4 w-4 text-fw-bodyLight" />
          </div>
          <div className={`text-3xl font-bold ${
            healthScore >= 90 ? 'text-fw-success' :
            healthScore >= 70 ? 'text-fw-body' : 'text-fw-error'
          }`}>{healthScore}%</div>
          <p className="text-figma-sm text-fw-bodyLight mt-1">Pool health score</p>
        </div>

        {/* Monthly Cost */}
        <div className="bg-fw-base rounded-lg p-5 border border-fw-secondary">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-fw-bodyLight">Monthly Cost</span>
            <CreditCard className="h-4 w-4 text-fw-bodyLight" />
          </div>
          <div className="text-3xl font-bold text-fw-heading">${totalMonthlyCost.toLocaleString()}</div>
          <p className="text-figma-sm text-fw-bodyLight mt-1">Billing total</p>
        </div>
      </div>

      {/* Cumulative Performance Metrics */}
      <div>
        <h3 className="text-lg font-semibold text-fw-heading tracking-[-0.03em] mb-4">Cumulative Performance</h3>
        <div className="bg-fw-base rounded-lg border border-fw-secondary p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-2">
                <TrendingUp className="h-4 w-4 text-fw-bodyLight mr-2" />
                <span className="text-figma-base font-medium text-fw-bodyLight">Total Bandwidth</span>
              </div>
              <div className="text-2xl font-bold text-fw-heading">{totalBandwidth.toFixed(1)} Gbps</div>
              <p className="text-figma-sm text-fw-bodyLight mt-1">Across {connections.length} connections</p>
            </div>

            <div>
              <div className="flex items-center mb-2">
                <Activity className="h-4 w-4 text-fw-bodyLight mr-2" />
                <span className="text-figma-base font-medium text-fw-bodyLight">Avg Utilization</span>
              </div>
              <div className="text-2xl font-bold text-fw-heading">{avgUtilization.toFixed(1)}%</div>
              <p className="text-figma-sm text-fw-bodyLight mt-1">Pool-wide average</p>
            </div>

            <div>
              <div className="flex items-center mb-2">
                <Clock className="h-4 w-4 text-fw-bodyLight mr-2" />
                <span className="text-figma-base font-medium text-fw-bodyLight">Avg Latency</span>
              </div>
              <div className="text-2xl font-bold text-fw-heading">4.2ms</div>
              <p className="text-figma-sm text-fw-bodyLight mt-1">Weighted average</p>
            </div>

            <div>
              <div className="flex items-center mb-2">
                <CheckCircle className="h-4 w-4 text-fw-bodyLight mr-2" />
                <span className="text-figma-base font-medium text-fw-bodyLight">Uptime</span>
              </div>
              <div className="text-2xl font-bold text-fw-heading">99.97%</div>
              <p className="text-figma-sm text-fw-bodyLight mt-1">30-day average</p>
            </div>
          </div>
        </div>
      </div>

      {/* Connection Health Status */}
      <div>
        <h3 className="text-lg font-semibold text-fw-heading tracking-[-0.03em] mb-4">Connection Health</h3>
        <div className="bg-fw-base rounded-lg border border-fw-secondary p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-6">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-fw-success mr-2" />
                <div>
                  <div className="text-2xl font-bold text-fw-heading">{healthyConnections}</div>
                  <div className="text-figma-base text-fw-bodyLight">Healthy</div>
                </div>
              </div>

              {warningConnections > 0 && (
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-fw-warn mr-2" />
                  <div>
                    <div className="text-2xl font-bold text-fw-heading">{warningConnections}</div>
                    <div className="text-figma-base text-fw-bodyLight">Warning</div>
                  </div>
                </div>
              )}

              <div className="flex items-center">
                <div className="h-5 w-5 rounded-full bg-fw-neutral mr-2" />
                <div>
                  <div className="text-2xl font-bold text-fw-heading">{connections.length - healthyConnections - warningConnections}</div>
                  <div className="text-figma-base text-fw-bodyLight">Inactive</div>
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-figma-base text-fw-bodyLight">Overall Health Score</div>
              <div className={`text-3xl font-bold ${
                healthScore >= 90 ? 'text-fw-success' :
                healthScore >= 70 ? 'text-fw-body' : 'text-fw-error'
              }`}>
                {healthScore}%
              </div>
            </div>
          </div>

          {/* Health Bar */}
          <div className="w-full bg-fw-neutral rounded-full h-3 overflow-hidden">
            <div className="flex h-full">
              {healthyConnections > 0 && (
                <div
                  className="bg-fw-success"
                  style={{ width: `${(healthyConnections / connections.length) * 100}%` }}
                />
              )}
              {warningConnections > 0 && (
                <div
                  className="bg-fw-neutral"
                  style={{ width: `${(warningConnections / connections.length) * 100}%` }}
                />
              )}
              {(connections.length - healthyConnections - warningConnections) > 0 && (
                <div
                  className="bg-fw-neutral"
                  style={{ width: `${((connections.length - healthyConnections - warningConnections) / connections.length) * 100}%` }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Billing Breakdown */}
      <div>
        <h3 className="text-lg font-semibold text-fw-heading tracking-[-0.03em] mb-4">Billing Summary</h3>
        <div className="bg-fw-base rounded-lg border border-fw-secondary p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-fw-secondary">
              <div>
                <div className="text-figma-base font-medium text-fw-bodyLight">Connection Costs</div>
                <div className="text-figma-sm text-fw-bodyLight mt-1">{connections.length} active connections</div>
              </div>
              <div className="text-xl font-bold text-fw-heading">${monthlyConnectionCost.toLocaleString()}</div>
            </div>

            <div className="flex items-center justify-between pb-4 border-b border-fw-secondary">
              <div>
                <div className="text-figma-base font-medium text-fw-bodyLight">Pool Management Fee</div>
                <div className="text-figma-sm text-fw-bodyLight mt-1">Administrative overhead</div>
              </div>
              <div className="text-xl font-bold text-fw-heading">$0</div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                <div className="text-base font-semibold text-fw-heading">Total Monthly Cost</div>
                <div className="text-figma-sm text-fw-bodyLight mt-1">Billed on the 1st of each month</div>
              </div>
              <div className="text-2xl font-bold text-fw-heading">${totalMonthlyCost.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Members Overview */}
      <div>
        <h3 className="text-lg font-semibold text-fw-heading tracking-[-0.03em] mb-4">Members & Access</h3>
        <div className="bg-fw-base rounded-lg border border-fw-secondary p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-fw-heading mb-1">{users.length} Active Members</div>
              <p className="text-figma-base text-fw-body">
                Users with access to manage and view pool resources
              </p>
            </div>
            <Users className="h-12 w-12 text-fw-bodyLight" />
          </div>

          {users.length > 0 && (
            <div className="mt-6 pt-6 border-t border-fw-secondary">
              <div className="flex -space-x-2">
                {users.slice(0, 5).map((user, idx) => (
                  <div
                    key={user.id}
                    className="h-10 w-10 rounded-full bg-fw-link flex items-center justify-center border border-fw-secondary text-white font-medium text-figma-base"
                    title={user.name}
                  >
                    {user.name.split(' ').map(n => n[0]).join('')}
                  </div>
                ))}
                {users.length > 5 && (
                  <div className="h-10 w-10 rounded-full bg-fw-wash flex items-center justify-center border border-fw-secondary text-fw-body font-medium text-figma-base">
                    +{users.length - 5}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
