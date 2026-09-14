// src/components/connection/views/TopologyView.tsx
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../../store/useStore';
import { MiniTopology } from '../MiniTopology';
import { OverflowMenu } from '../../common/OverflowMenu';
import { ExternalLink } from 'lucide-react';
import type { Hub } from '../../../types/hub';

interface TopologyViewProps {
  routers: Hub[];
}

export function TopologyView({ routers }: TopologyViewProps) {
  const navigate = useNavigate();
  const connections = useStore(state => state.connections);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {routers.map(router => {
        const routerConnections = connections.filter(c => router.connectionIds.includes(c.id));
        const isActive = router.status === 'active';

        return (
          <div
            key={router.id}
            className="bg-fw-base rounded-xl border border-fw-secondary overflow-hidden hover:shadow-md transition-shadow duration-200"
          >
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-fw-secondary flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`h-2 w-2 rounded-full shrink-0 ${isActive ? 'bg-fw-success' : 'bg-fw-neutral'}`} />
                <div className="min-w-0">
                  <h3 className="text-figma-sm font-semibold text-fw-heading truncate">{router.name}</h3>
                  <p className="text-figma-xs text-fw-bodyLight truncate">{router.location}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                {router.performance?.latency && (
                  <span className="text-figma-xs font-medium text-fw-heading tabular-nums">
                    {router.performance.latency}
                  </span>
                )}
                <div onClick={e => e.stopPropagation()}>
                  <OverflowMenu
                    items={[
                      {
                        id: 'details',
                        label: 'Hub Details',
                        icon: <ExternalLink className="h-4 w-4" />,
                        onClick: () => navigate(`/hubs/${router.id}`),
                      },
                    ]}
                  />
                </div>
              </div>
            </div>

            {/* Topology diagram */}
            <div className="px-5 pt-3 pb-1">
              <MiniTopology
                router={router}
                connections={routerConnections}
                onNodeClick={(node) => {
                  if (node.icon === 'hub') navigate(`/hubs/${router.id}`);
                  else if (node.icon === 'cloud' && node.connectionId) navigate(`/connections/${node.connectionId}`);
                }}
              />
            </div>

            {/* Footer */}
            <div className="px-5 py-3 flex items-center justify-between border-t border-fw-secondary mt-1">
              <div className="flex items-center gap-4 text-figma-xs text-fw-bodyLight">
                <span>
                  <span className="font-medium text-fw-heading">{routerConnections.length}</span>
                  {' '}connection{routerConnections.length !== 1 ? 's' : ''}
                </span>
                <span>
                  <span className="font-medium text-fw-heading">{router.location}</span>
                </span>
              </div>
              <button
                onClick={() => navigate(`/hubs/${router.id}`)}
                className="flex items-center gap-1 text-figma-xs text-fw-link hover:text-fw-linkHover transition-colors"
              >
                View Hub
                <ExternalLink className="h-3 w-3" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
