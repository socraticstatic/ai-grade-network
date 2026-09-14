import { Group } from '../../../types/group';
import { AttIcon } from '../../icons/AttIcon';

interface GroupCardProgressProps {
  group: Group;
}

export function GroupCardProgress({ group }: GroupCardProgressProps) {
  // Calculate performance score for visualization (0-100)
  const getPerformanceScore = () => {
    if (!group.performance) return 75;

    const uptime = group.performance.aggregatedMetrics.averageUptime;
    if (typeof uptime === 'string') {
      const match = uptime.match(/(\d+\.\d+)/);
      if (match && match[1]) {
        return parseFloat(match[1]);
      }
    }

    return 75;
  };

  const performanceScore = getPerformanceScore();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-figma-base">
        <span className="flex items-center gap-1.5 text-fw-body font-medium">
          <AttIcon name="high-meter" className="h-5 w-5 text-fw-bodyLight" />
          Performance
        </span>
        <span className="font-medium text-fw-heading">{performanceScore.toFixed(1)}%</span>
      </div>
      <div className="h-2 bg-fw-wash rounded-[30px] overflow-hidden" style={{ maxWidth: '320px' }}>
        <div
          className="h-full transition-all duration-300 rounded-[30px] bg-fw-link"
          style={{ width: `${performanceScore}%` }}
        />
      </div>
      <div className="flex justify-between text-figma-sm text-fw-bodyLight">
        <span>0%</span>
        <span>
          {group.performance?.aggregatedMetrics.averageUptime || 'N/A'}
        </span>
      </div>
    </div>
  );
}
