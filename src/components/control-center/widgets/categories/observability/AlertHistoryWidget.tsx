import { AlertCircle, CheckCircle, Info } from 'lucide-react';

function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function AlertHistoryWidget() {
  const alerts = [
    {
      id: '1',
      type: 'error' as const,
      message: 'High latency on AWS Interconnect – last mile',
      timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      status: 'active' as const
    },
    {
      id: '2',
      type: 'warning' as const,
      message: 'Bandwidth utilization above 80%',
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      status: 'resolved' as const
    },
    {
      id: '3',
      type: 'info' as const,
      message: 'Automatic failover completed',
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      status: 'resolved' as const
    }
  ];

  return (
    <div>
      <div className="divide-y divide-fw-secondary">
        {alerts.map((alert) => {
          const isActive = alert.status === 'active';
          const isError = alert.type === 'error';

          return (
            <div key={alert.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
              {/* Status indicator */}
              <div className="flex-shrink-0 mt-0.5">
                {isActive && isError ? (
                  <AlertCircle className="h-3.5 w-3.5 text-fw-error" />
                ) : isActive ? (
                  <div className="h-2 w-2 rounded-full bg-fw-bodyLight mt-0.5" />
                ) : (
                  <CheckCircle className="h-3.5 w-3.5 text-fw-success" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className={`text-figma-sm leading-snug ${isActive && isError ? 'text-fw-error' : 'text-fw-body'}`}>
                  {alert.message}
                </div>
                <div className="text-figma-xs text-fw-bodyLight mt-0.5">
                  {relativeTime(alert.timestamp)}
                  {!isActive && ' · Resolved'}
                </div>
              </div>

              {/* Active pulse */}
              {isActive && isError && (
                <div className="flex-shrink-0 mt-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-fw-error animate-pulse" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="pt-3 border-t border-fw-secondary mt-1">
        <button className="text-figma-sm text-fw-link hover:text-fw-linkHover transition-colors">
          View all alerts →
        </button>
      </div>
    </div>
  );
}
