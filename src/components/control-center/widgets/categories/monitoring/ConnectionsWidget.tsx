import { Network, Activity } from 'lucide-react';
import { Connection } from '../../../../../types';

interface ConnectionsWidgetProps {
  connections: Connection[];
}

export function ConnectionsWidget({ connections }: ConnectionsWidgetProps) {
  const activeConnections = connections.filter(c => c.status === 'Active');
  const inactiveCount = connections.length - activeConnections.length;

  return (
    <div className="space-y-3">
      {/* Summary line */}
      <div className="flex items-baseline justify-between">
        <div>
          <span className="text-figma-xl font-bold text-fw-heading tracking-[-0.03em]">
            {activeConnections.length}
          </span>
          <span className="text-figma-sm text-fw-bodyLight ml-1.5">
            of {connections.length}
          </span>
        </div>
        {inactiveCount > 0 && (
          <span className="text-figma-xs text-fw-error">{inactiveCount} inactive</span>
        )}
      </div>

      {/* Connection list */}
      {activeConnections.length === 0 ? (
        <p className="text-figma-sm text-fw-bodyLight">No active connections</p>
      ) : (
        <div className="divide-y divide-fw-secondary">
          {activeConnections.slice(0, 3).map((connection) => (
            <div key={connection.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
              <div className="flex items-center gap-2 min-w-0">
                <Network className="h-3.5 w-3.5 text-fw-bodyLight flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-figma-sm font-medium text-fw-heading truncate">{connection.name}</div>
                  <div className="text-figma-xs text-fw-bodyLight">{connection.type}</div>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                <div className="h-1.5 w-1.5 rounded-full bg-fw-success" />
                <span className="text-figma-xs text-fw-bodyLight tabular-nums">
                  {connection.performance?.latency || '—'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeConnections.length > 3 && (
        <button className="text-figma-sm text-fw-link hover:text-fw-linkHover transition-colors">
          +{activeConnections.length - 3} more
        </button>
      )}
    </div>
  );
}
