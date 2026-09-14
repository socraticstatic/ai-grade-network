import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { HubConnectionGroups } from '../../connection/hub/HubConnectionGroups';
import { HubCompositionChips } from '../../connection/hub/HubCompositionChips';
import type { Hub } from '../../../types/hub';
import type { Connection } from '../../../types';

/**
 * Hub as it appears in the LIST view: a header identifying the Hub, with its
 * connections broken out into per-type grouped sub-tables right inline (collapsible) —
 * the same HubConnectionGroups used on the detail page, Connections tab and pools.
 */

interface HubListCardProps {
  router: Hub;
  connections: Connection[];
  isMinimized?: boolean;
  onMinimize: () => void;
  onMaximize: () => void;
  highlightedConnectionId?: string;
}

export function HubListCard({ router, connections, isMinimized = false, onMinimize, onMaximize, highlightedConnectionId }: HubListCardProps) {
  const navigate = useNavigate();

  const statusDot =
    router.status === 'active' ? 'bg-fw-success' :
    router.status === 'provisioning' ? 'bg-fw-link animate-pulse' :
    router.status === 'error' ? 'bg-fw-error' : 'bg-fw-neutral';

  return (
    <div className="bg-fw-base rounded-2xl border border-fw-secondary shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4">
        <button
          onClick={() => (isMinimized ? onMaximize() : onMinimize())}
          className="p-1 rounded-lg text-fw-bodyLight hover:text-fw-heading hover:bg-fw-wash transition-colors shrink-0"
          aria-label={isMinimized ? 'Expand hub' : 'Collapse hub'}
          aria-expanded={!isMinimized}
        >
          {isMinimized ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${statusDot}`} />

        <div className="min-w-0 flex-1">
          <button
            onClick={() => navigate(`/hubs/${router.id}`)}
            className="text-figma-base font-bold text-fw-heading hover:text-fw-link transition-colors truncate text-left leading-tight"
            title={router.name}
          >
            {router.name}
          </button>
          <p className="text-figma-xs text-fw-bodyLight truncate" title={router.locations?.join(' · ')}>
            {router.locations?.length ? router.locations.join(' · ') : router.location}
          </p>
        </div>

        <div className="hidden sm:flex shrink-0">
          <HubCompositionChips connections={connections} size="sm" />
        </div>
        <span className="text-figma-xs text-fw-bodyLight tabular-nums shrink-0 hidden md:inline">
          {connections.length} conn
        </span>

        <button
          onClick={() => navigate(`/hubs/${router.id}`)}
          className="inline-flex items-center gap-1 text-figma-xs font-medium text-fw-link hover:underline shrink-0"
          title="Open Hub detail"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          <span className="hidden lg:inline">Detail</span>
        </button>
      </div>

      {/* Per-type grouped tables (inline) */}
      {!isMinimized && (
        <div className="px-5 pb-5 pt-1 border-t border-fw-secondary bg-fw-wash/30">
          <div className="pt-4">
            <HubConnectionGroups connections={connections} showSummary={false} highlightedConnectionId={highlightedConnectionId} />
          </div>
        </div>
      )}
    </div>
  );
}
