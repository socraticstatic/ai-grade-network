import { MapPin, Calendar, Clock, Activity, Tag } from 'lucide-react';
import { Group } from '../../../types/group';

interface GroupCardInfoProps {
  group: Group;
}

export function GroupCardInfo({ group }: GroupCardInfoProps) {
  const uptime = group.performance?.aggregatedMetrics?.averageUptime;
  const latency = group.performance?.aggregatedMetrics?.averageLatency;

  return (
    <div className="space-y-3">
      {/* Detail rows - Figma: icon+label left, value right, each row is a flex row */}
      <div className="space-y-2">
        {uptime && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Activity className="h-5 w-5 text-fw-heading flex-shrink-0" />
              <span className="text-figma-base font-medium text-fw-heading">Uptime</span>
            </div>
            <span className="text-figma-base font-medium text-fw-heading">{uptime}</span>
          </div>
        )}

        {group.addresses?.length > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <MapPin className="h-5 w-5 text-fw-heading flex-shrink-0" />
              <span className="text-figma-base font-medium text-fw-heading">Location</span>
            </div>
            <span className="text-figma-base font-medium text-fw-heading truncate ml-4">
              {group.addresses[0].city}, {group.addresses[0].state}
            </span>
          </div>
        )}

        {latency && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Clock className="h-5 w-5 text-fw-heading flex-shrink-0" />
              <span className="text-figma-base font-medium text-fw-heading">Latency</span>
            </div>
            <span className="text-figma-base font-medium text-fw-heading">{latency}</span>
          </div>
        )}

        {group.createdAt && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Calendar className="h-5 w-5 text-fw-heading flex-shrink-0" />
              <span className="text-figma-base font-medium text-fw-heading">Created</span>
            </div>
            <span className="text-figma-base font-medium text-fw-heading">
              {new Date(group.createdAt).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      {/* Tags - Figma: r=800 pills, h=28, bg=#f8fafb, border=#dcdfe3, icon 16x16, text 12px/500 */}
      {group.tags && Object.keys(group.tags).length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {Object.entries(group.tags).slice(0, 3).map(([key, value]) => (
            <span key={key} className="inline-flex items-center px-2.5 rounded-[800px] text-[12px] font-medium bg-fw-wash text-fw-bodyLight border border-fw-secondary" style={{ height: '28px' }}>
              <Tag className="h-4 w-4 mr-1.5 flex-shrink-0" />
              {key}: {value}
            </span>
          ))}
          {Object.keys(group.tags).length > 3 && (
            <span className="inline-flex items-center px-2.5 rounded-[800px] text-[12px] font-medium bg-fw-wash text-fw-bodyLight border border-fw-secondary" style={{ height: '28px' }}>
              +{Object.keys(group.tags).length - 3} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}