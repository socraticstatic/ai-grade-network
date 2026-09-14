import { CheckCircle, XCircle } from 'lucide-react';

export function DiagnosticsWidget() {
  const diagnostics = [
    {
      id: 'network',
      name: 'Network Connectivity',
      status: 'healthy' as const,
      metric: '99.99%',
      lastCheck: new Date(Date.now() - 1000 * 60).toISOString()
    },
    {
      id: 'latency',
      name: 'Response Time',
      status: 'healthy' as const,
      metric: '4.2ms',
      lastCheck: new Date(Date.now() - 1000 * 60 * 2).toISOString()
    },
    {
      id: 'dns',
      name: 'DNS Resolution',
      status: 'degraded' as const,
      metric: '85%',
      lastCheck: new Date(Date.now() - 1000 * 60 * 3).toISOString()
    },
    {
      id: 'ssl',
      name: 'SSL Certificates',
      status: 'healthy' as const,
      metric: 'Valid',
      lastCheck: new Date(Date.now() - 1000 * 60 * 4).toISOString()
    }
  ];

  const healthyCount = diagnostics.filter(d => d.status === 'healthy').length;

  return (
    <div className="space-y-3">
      {/* Summary + action */}
      <div className="flex items-center justify-between">
        <span className="text-figma-xs text-fw-bodyLight">
          {healthyCount} of {diagnostics.length} passing
        </span>
        <button className="text-figma-sm text-fw-link hover:text-fw-linkHover transition-colors">
          Run tests
        </button>
      </div>

      {/* Diagnostics list */}
      <div className="divide-y divide-fw-secondary">
        {diagnostics.map((diagnostic) => {
          const isHealthy = diagnostic.status === 'healthy';
          const checkedAt = new Date(diagnostic.lastCheck).toLocaleTimeString('en-US', {
            hour: '2-digit', minute: '2-digit'
          });

          return (
            <div key={diagnostic.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
              <div className="flex items-center gap-2 min-w-0">
                {isHealthy
                  ? <CheckCircle className="h-3.5 w-3.5 text-fw-success flex-shrink-0" />
                  : <XCircle className="h-3.5 w-3.5 text-fw-bodyLight flex-shrink-0" />
                }
                <div className="min-w-0">
                  <div className="text-figma-sm text-fw-body truncate">{diagnostic.name}</div>
                  <div className="text-figma-xs text-fw-bodyLight">{checkedAt}</div>
                </div>
              </div>
              <span className={`text-figma-sm font-semibold tabular-nums flex-shrink-0 ml-2 ${
                isHealthy ? 'text-fw-success' : 'text-fw-bodyLight'
              }`}>
                {diagnostic.metric}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-fw-secondary">
        <button className="text-figma-sm text-fw-link hover:text-fw-linkHover transition-colors">
          View details
        </button>
        <button className="text-figma-sm text-fw-link hover:text-fw-linkHover transition-colors">
          Configure
        </button>
      </div>
    </div>
  );
}
