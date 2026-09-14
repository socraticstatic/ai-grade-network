import { Group } from '../../../types/group';
import { StatusBadge, Badge, healthColors } from '../../common/Badge';

interface GroupCardStatusProps {
  group: Group;
}

export function GroupCardStatus({ group }: GroupCardStatusProps) {
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

  const getHealthKey = (): string => {
    if (group.status !== 'active') return 'inactive';
    const score = getPerformanceScore();
    if (score > 95) return 'optimal';
    if (score > 90) return 'good';
    if (score > 80) return 'warning';
    return 'critical';
  };

  const healthKey = getHealthKey();
  const healthLabel = healthKey.charAt(0).toUpperCase() + healthKey.slice(1);
  const hc = healthColors[healthKey] || healthColors.inactive;

  return (
    <div className="px-6 py-3">
      <div className="flex items-center justify-between">
        <StatusBadge status={group.status} size="md" />
        <Badge color={hc.text} bg={hc.bg} size="md">
          {healthLabel}
        </Badge>
      </div>
    </div>
  );
}
