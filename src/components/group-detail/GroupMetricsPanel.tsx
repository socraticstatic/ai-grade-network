import { User, Network, CreditCard, Activity } from 'lucide-react';
import { Group } from '../../types/group';
import { Connection } from '../../types';

interface GroupMetricsPanelProps {
  group: Group;
  connections: Connection[];
  users: any[];
}

export function GroupMetricsPanel({ group, connections, users }: GroupMetricsPanelProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 border-t border-fw-secondary">
      <div className="p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-fw-accent">
            <User className="h-5 w-5 text-fw-link" />
          </div>
          <div>
            <div className="text-figma-base text-fw-bodyLight">Members</div>
            <div className="text-xl font-semibold text-fw-heading">{group.userIds.length}</div>
          </div>
        </div>
      </div>
      
      <div className="p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-fw-purple/10">
            <Network className="h-5 w-5 text-fw-purple" />
          </div>
          <div>
            <div className="text-figma-base text-fw-bodyLight">Connections</div>
            <div className="text-xl font-semibold text-fw-heading">{group.connectionIds.length}</div>
          </div>
        </div>
      </div>
      
      <div className="p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-fw-successLight">
            <CreditCard className="h-5 w-5 text-fw-success" />
          </div>
          <div>
            <div className="text-figma-base text-fw-bodyLight">Monthly Billing</div>
            <div className="text-xl font-semibold text-fw-heading">
              ${group.billing?.monthlyRate.toFixed(2) || '0.00'}
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-fw-warnLight">
            <Activity className="h-5 w-5 text-fw-warn" />
          </div>
          <div>
            <div className="text-figma-base text-fw-bodyLight">Average Uptime</div>
            <div className="text-xl font-semibold text-fw-heading">
              {group.performance?.aggregatedMetrics.averageUptime || 'N/A'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}