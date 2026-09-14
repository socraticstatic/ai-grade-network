import { AlertCircle, Clock } from 'lucide-react';
import { Connection } from '../../../../../types';

interface SecurityAlertsWidgetProps {
  connections: Connection[];
}

function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export function SecurityAlertsWidget({ connections }: SecurityAlertsWidgetProps) {
  const alerts = [
    {
      id: '1',
      severity: 'high' as const,
      message: 'Unusual traffic pattern detected',
      timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      connection: 'AWS Interconnect – last mile'
    },
    {
      id: '2',
      severity: 'medium' as const,
      message: 'Multiple failed authentication attempts',
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      connection: 'Azure ExpressRoute'
    },
    {
      id: '3',
      severity: 'low' as const,
      message: 'SSL certificate expiring soon',
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      connection: 'Google Cloud Interconnect'
    }
  ];

  const highCount = alerts.filter(a => a.severity === 'high').length;

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex items-center gap-2">
        {highCount > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-fw-error animate-pulse" />
            <span className="text-figma-xs text-fw-error font-medium">{highCount} high severity</span>
          </div>
        )}
        <span className="text-figma-xs text-fw-bodyLight">{alerts.length} total alerts</span>
      </div>

      {/* Alert list — no colored box per row */}
      <div className="divide-y divide-fw-secondary">
        {alerts.map((alert) => (
          <div key={alert.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
            <AlertCircle className={`h-3.5 w-3.5 flex-shrink-0 mt-0.5 ${
              alert.severity === 'high' ? 'text-fw-error' : 'text-fw-bodyLight'
            }`} />
            <div className="flex-1 min-w-0">
              <div className={`text-figma-sm leading-snug ${
                alert.severity === 'high' ? 'text-fw-error' : 'text-fw-body'
              }`}>
                {alert.message}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-figma-xs text-fw-bodyLight">{alert.connection}</span>
                <span className="text-figma-xs text-fw-bodyLight">·</span>
                <span className="text-figma-xs text-fw-bodyLight">{relativeTime(alert.timestamp)}</span>
              </div>
            </div>
            <span className={`text-figma-xs font-medium flex-shrink-0 uppercase tracking-wide ${
              alert.severity === 'high' ? 'text-fw-error' :
              alert.severity === 'medium' ? 'text-fw-bodyLight' :
              'text-fw-bodyLight'
            }`}>
              {alert.severity}
            </span>
          </div>
        ))}
      </div>

      <button className="text-figma-sm text-fw-link hover:text-fw-linkHover transition-colors">
        View all alerts →
      </button>
    </div>
  );
}
