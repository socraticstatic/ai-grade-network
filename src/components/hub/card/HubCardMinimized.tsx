import { ChevronRight, Maximize2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { HubMetaChips } from '../../connection/facts/hubCardFields';
import { useColumnVisibility } from '../../../hooks/useColumnVisibility';
import type { Hub } from '../../../types/hub';
import type { Connection } from '../../../types';

interface HubCardMinimizedProps {
  router: Hub;
  connections: Connection[];
  onMaximize: () => void;
}

export function HubCardMinimized({
  router,
  connections,
  onMaximize
}: HubCardMinimizedProps) {
  const navigate = useNavigate();
  const { visibleColumns: cardFields } = useColumnVisibility('gw-card');

  const statusDotColor =
    router.status === 'active'       ? 'bg-fw-success' :
    router.status === 'provisioning' ? 'bg-fw-link animate-pulse' :
    router.status === 'error'        ? 'bg-fw-error' :
                                       'bg-fw-neutral';

  return (
    <div className="h-full px-5 flex items-center gap-3">
      {/* Status dot (the hub icon is redundant — everything here is a Hub) */}
      <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${statusDotColor}`} />

      {/* Name + location(s) — gets the space the icon used, so names don't clip */}
      <div className="min-w-0 flex-[3] basis-0">
        <p className="text-figma-sm font-semibold text-fw-heading truncate leading-tight" title={router.name}>
          {router.name}
        </p>
        {(router.locations?.length || router.location) && (
          <p className="text-figma-xs text-fw-bodyLight truncate" title={router.locations?.join(' · ')}>
            {router.locations?.length ? router.locations.join(' · ') : router.location}
          </p>
        )}
      </div>

      {/* Configurable meta fields (composition by type leads by default) — yields to the name */}
      <div className="min-w-0 flex-[2] basis-0 flex items-center justify-end overflow-hidden">
        <HubMetaChips
          hub={router}
          connections={connections}
          visibleIds={cardFields}
          variant="mini"
        />
      </div>

      {/* Action buttons */}
      <div
        className="flex items-center gap-1 shrink-0"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={e => { e.stopPropagation(); navigate(`/hubs/${router.id}`); }}
          className="p-1.5 rounded-full text-fw-bodyLight hover:text-fw-heading hover:bg-fw-neutral transition-colors"
          title="Hub details"
          aria-label="Hub details"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          onClick={e => { e.stopPropagation(); onMaximize(); }}
          className="p-1.5 rounded-full text-fw-bodyLight hover:text-fw-heading hover:bg-fw-neutral transition-colors"
          title="Expand"
          aria-label="Expand card"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
