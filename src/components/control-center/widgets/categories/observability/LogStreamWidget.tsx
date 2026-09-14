import { useState } from 'react';
import { Search, RefreshCw, Download } from 'lucide-react';

export function LogStreamWidget() {
  const [filter, setFilter] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const logs = [
    {
      id: '1',
      timestamp: new Date().toISOString(),
      level: 'info' as const,
      service: 'connection-manager',
      message: 'Connection status updated successfully'
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 30000).toISOString(),
      level: 'warning' as const,
      service: 'security',
      message: 'High latency detected on AWS Interconnect – last mile'
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 60000).toISOString(),
      level: 'error' as const,
      service: 'monitoring',
      message: 'Failed to collect metrics from endpoint'
    },
    {
      id: '4',
      timestamp: new Date(Date.now() - 90000).toISOString(),
      level: 'info' as const,
      service: 'auth',
      message: 'User session authenticated'
    }
  ];

  const levelStyles: Record<string, string> = {
    error: 'text-fw-error',
    warning: 'text-fw-bodyLight',
    info: 'text-fw-bodyLight',
  };

  const levelLabel: Record<string, string> = {
    error: 'ERR',
    warning: 'WRN',
    info: 'INF',
  };

  const filteredLogs = filter
    ? logs.filter(l =>
        l.message.toLowerCase().includes(filter.toLowerCase()) ||
        l.service.toLowerCase().includes(filter.toLowerCase())
      )
    : logs;

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fw-bodyLight h-3.5 w-3.5" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter logs..."
            className="w-full pl-8 pr-3 py-1.5 text-figma-sm border border-fw-secondary rounded-lg bg-fw-base text-fw-body placeholder:text-fw-bodyLight focus:ring-1 focus:ring-fw-active focus:border-fw-active outline-none"
          />
        </div>
        <button
          className={`p-1.5 rounded-lg transition-colors ${
            autoRefresh ? 'text-fw-link bg-fw-accent' : 'text-fw-bodyLight hover:bg-fw-wash'
          }`}
          onClick={() => setAutoRefresh(!autoRefresh)}
          title="Auto-refresh"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${autoRefresh ? 'animate-spin' : ''}`} />
        </button>
        <button className="p-1.5 text-fw-bodyLight hover:bg-fw-wash rounded-lg transition-colors" title="Download logs">
          <Download className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Log stream — terminal style */}
      <div className="divide-y divide-fw-secondary">
        {filteredLogs.map((log) => (
          <div key={log.id} className="py-2 first:pt-0 last:pb-0 font-mono">
            <div className="flex items-baseline gap-2">
              <span className="text-figma-xs text-fw-bodyLight tabular-nums flex-shrink-0">
                {new Date(log.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span className={`text-figma-xs font-bold flex-shrink-0 w-6 ${levelStyles[log.level]}`}>
                {levelLabel[log.level]}
              </span>
              <span className="text-figma-xs text-fw-bodyLight flex-shrink-0">{log.service}</span>
            </div>
            <div className={`text-figma-xs mt-0.5 pl-0 ${log.level === 'error' ? 'text-fw-error' : 'text-fw-body'}`}>
              {log.message}
            </div>
          </div>
        ))}
      </div>

      <button className="text-figma-sm text-fw-link hover:text-fw-linkHover transition-colors">
        Load more →
      </button>
    </div>
  );
}
