import { Group } from '../../../types/group';
import { AttIcon } from '../../icons/AttIcon';

interface GroupCardMetricsProps {
  group: Group;
}

export function GroupCardMetrics({ group }: GroupCardMetricsProps) {
  const utilization = group.performance?.aggregatedMetrics.bandwidthUtilization ?? null;
  const totalBandwidth = group.performance?.aggregatedMetrics.totalBandwidth ?? null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        {/* Members */}
        <div className="bg-fw-wash rounded-[8px] flex flex-col items-center justify-center text-center" style={{ minHeight: '108px' }}>
          <AttIcon name="person-group" className="h-5 w-5 text-fw-bodyLight mb-1.5 flex-shrink-0" />
          <span className="text-[10px] font-medium text-fw-body">Members</span>
          <p className="text-figma-lg font-bold text-fw-heading mt-1">
            {group.userIds.length}
          </p>
        </div>

        {/* Connections */}
        <div className="bg-fw-wash rounded-[8px] flex flex-col items-center justify-center text-center" style={{ minHeight: '108px' }}>
          <AttIcon name="smart-meter" className="h-5 w-5 text-fw-bodyLight mb-1.5 flex-shrink-0" />
          <span className="text-[10px] font-medium text-fw-body">Connections</span>
          <p className="text-figma-lg font-bold text-fw-heading mt-1">
            {group.connectionIds.length}
          </p>
        </div>

        {/* Monthly Cost */}
        <div className="bg-fw-wash rounded-[8px] flex flex-col items-center justify-center text-center" style={{ minHeight: '108px' }}>
          <AttIcon name="shopping-bag" className="h-5 w-5 text-fw-bodyLight mb-1.5 flex-shrink-0" />
          <span className="text-[10px] font-medium text-fw-body">Monthly</span>
          <p className="text-figma-lg font-bold text-fw-heading mt-1">
            {formatCurrency(group.billing?.monthlyRate || 0)}
          </p>
        </div>
      </div>

      {/* Utilization / bandwidth info row */}
      {(utilization !== null || totalBandwidth) && (
        <div className="flex items-center justify-between px-1 py-1.5 text-[12px] leading-4 text-fw-bodyLight">
          {utilization !== null && (
            <span className="flex items-center gap-1">
              <AttIcon name="high-meter" className="h-4 w-4 text-fw-bodyLight" />
              Utilization: <span className="font-medium text-fw-heading">{utilization}%</span>
            </span>
          )}
          {totalBandwidth && (
            <span>
              Bandwidth: <span className="font-medium text-fw-heading">{totalBandwidth}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}
