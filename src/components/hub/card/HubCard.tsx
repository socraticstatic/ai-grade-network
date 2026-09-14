import { useNavigate } from 'react-router-dom';
import { Minimize2, ExternalLink, ChevronRight } from 'lucide-react';
import { OverflowMenu } from '../../common/OverflowMenu';
import { HubCardMinimized } from './HubCardMinimized';
import { CloudLegs } from '../../connection/CloudLegs';
import { HubMetaChips } from '../../connection/facts/hubCardFields';
import { ConnectionTypeIcon } from '../../connection/icons/ConnectionTypeIcon';
import { composeByType, normalizeHubGroupType } from '../../connection/hub/HubCompositionChips';
import { useColumnVisibility } from '../../../hooks/useColumnVisibility';
import type { Hub } from '../../../types/hub';
import type { Connection } from '../../../types';

interface HubCardProps {
  router: Hub;
  connections: Connection[];
  isMinimized?: boolean;
  onMinimize: () => void;
  onMaximize: () => void;
}

export function HubCard({
  router,
  connections,
  isMinimized = false,
  onMinimize,
  onMaximize
}: HubCardProps) {
  const navigate = useNavigate();
  const { visibleColumns: cardFields } = useColumnVisibility('gw-card');

  const statusBadgeClass =
    router.status === 'active'       ? 'bg-fw-successLight text-fw-success' :
    router.status === 'inactive'     ? 'bg-fw-secondary text-fw-disabled' :
    router.status === 'provisioning' ? 'bg-brand-lightBlue text-fw-link' :
                                       'bg-fw-errorLight text-fw-error';

  const avgUtilization = connections.length > 0
    ? connections.reduce((sum, c) => sum + (c.performance?.bandwidthUtilization || 0), 0) / connections.length
    : 0;

  const hasError   = connections.some(c => (c.performance?.bandwidthUtilization || 0) > 90);
  const hasWarning = connections.some(c => (c.performance?.bandwidthUtilization || 0) > 80);
  const healthLabel =
    hasError   ? 'CRITICAL' :
    hasWarning ? 'WARNING' :
    router.status === 'active' ? 'GOOD' : 'INACTIVE';
  const healthClass =
    hasError   ? 'bg-fw-errorLight text-fw-error' :
    hasWarning ? 'bg-amber-50 text-amber-700' :
    router.status === 'active' ? 'bg-fw-successLight text-fw-success' :
                                 'bg-fw-secondary text-fw-disabled';

  if (isMinimized) {
    return (
      <div
        className="relative bg-fw-base rounded-2xl border border-fw-secondary shadow-sm hover:shadow-md transition-shadow duration-200 h-[88px] cursor-pointer"
        onClick={() => navigate(`/hubs/${router.id}`)}
      >
        <HubCardMinimized
          router={router}
          connections={connections}
          onMaximize={onMaximize}
        />
      </div>
    );
  }

  return (
    <div className="relative bg-fw-base rounded-2xl border border-fw-secondary shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Status dot replaces the redundant hub icon — everything here is a Hub */}
            <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${
              router.status === 'active' ? 'bg-fw-success' :
              router.status === 'provisioning' ? 'bg-fw-link animate-pulse' :
              router.status === 'error' ? 'bg-fw-error' : 'bg-fw-neutral'
            }`} />
            <div className="min-w-0">
              <h3 className="text-figma-xl font-bold text-fw-heading truncate leading-tight tracking-[-0.04em]" title={router.name}>
                {router.name}
              </h3>
              <span className="text-figma-xs text-fw-bodyLight">
                {router.locations?.length ? router.locations.join(' · ') : router.location}
              </span>
            </div>
          </div>

          <div
            className="flex items-center gap-1 shrink-0 mt-0.5"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={onMinimize}
              className="p-1.5 rounded-full text-fw-disabled hover:text-fw-bodyLight hover:bg-fw-wash transition-colors"
              title="Minimize"
              aria-label="Minimize card"
            >
              <Minimize2 className="h-3.5 w-3.5" />
            </button>
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

        {/* Status + health */}
        <div className="flex items-center gap-2 mt-3.5">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-figma-xs font-semibold ${statusBadgeClass}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${router.status === 'active' ? 'bg-fw-success' : 'bg-current opacity-50'}`} />
            {router.status.charAt(0).toUpperCase() + router.status.slice(1)}
          </span>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-figma-xs font-semibold ml-auto ${healthClass}`}>
            {healthLabel}
          </span>
        </div>

        {/* Utilization bar */}
        <div className="mt-4">
          <div className="flex justify-between items-baseline mb-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fw-bodyLight">Avg Utilization</span>
            <span className="text-figma-xs font-bold text-fw-heading tabular-nums">{Math.round(avgUtilization)}%</span>
          </div>
          <div className="h-2 bg-fw-secondary rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                hasError ? 'bg-fw-error' : hasWarning ? 'bg-complementary-amber' : 'bg-fw-active'
              }`}
              style={{ width: `${Math.min(avgUtilization, 100)}%` }}
            />
          </div>
        </div>

        {/* Configurable hub meta strip — same fields as the mini card, full size */}
        <div className="mt-4 rounded-xl border border-fw-secondary bg-fw-wash px-4 py-2.5">
          <HubMetaChips hub={router} connections={connections} visibleIds={cardFields} variant="large" />
        </div>
      </div>

      {/* Connection tray — connections grouped by type (the site-wide pattern), previewed
          up to a small cap so the card stays compact. Full grouping lives on the hub detail. */}
      <div className="bg-fw-wash border-t border-fw-secondary px-3 pt-3 pb-2 space-y-3">
        {connections.length === 0 ? (
          <p className="text-figma-xs text-fw-disabled text-center py-2">No connections</p>
        ) : (() => {
          const CAP = 4;
          const groups = composeByType(connections).map(g => ({
            type: g.type,
            rows: connections.filter(c => normalizeHubGroupType(c) === g.type),
          }));
          let shown = 0;
          return groups.map(({ type, rows }) => {
            if (shown >= CAP) return null;
            const visible = rows.slice(0, CAP - shown);
            shown += visible.length;
            const hiddenInGroup = rows.length - visible.length;
            return (
              <div key={type} className="space-y-1.5">
                {/* Per-type subheader — mirrors the grouped tables' section headers */}
                <div className="flex items-center gap-1.5 px-1">
                  <span className="text-fw-link shrink-0"><ConnectionTypeIcon type={type as Connection['type']} size={14} /></span>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-fw-bodyLight">{type}</span>
                  <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-fw-secondary text-fw-bodyLight text-[9px] font-bold tabular-nums">{rows.length}</span>
                </div>
                {visible.map(c => {
                  const isActive = c.status === 'Active';
                  const isPending = c.status === 'Pending' || c.status === 'Provisioning';
                  const dotClass = isActive ? 'bg-fw-success' : isPending ? 'bg-fw-active animate-pulse' : 'bg-fw-disabled';
                  return (
                    <div
                      key={c.id}
                      onClick={() => navigate(`/connections/${c.id}`)}
                      className="bg-fw-base rounded-xl border border-fw-secondary/60 shadow-sm px-4 py-3 cursor-pointer hover:shadow-md hover:border-fw-secondary transition-all duration-150 flex items-center gap-3"
                    >
                      <div className={`h-2 w-2 rounded-full shrink-0 ${dotClass}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-figma-sm font-semibold text-fw-heading truncate leading-snug">{c.name}</p>
                        <div className="flex items-center gap-1.5 text-figma-xs text-fw-bodyLight truncate mt-0.5 min-w-0">
                          <CloudLegs connection={c} withLogos logoSize={20} className="truncate" />
                          <span className="shrink-0" aria-hidden>·</span>
                          <span className="shrink-0 tabular-nums">{c.bandwidth}</span>
                        </div>
                      </div>
                      <span className={`text-figma-xs font-semibold shrink-0 ${
                        isActive ? 'text-fw-success' : isPending ? 'text-fw-link' : 'text-fw-disabled'
                      }`}>
                        {isActive ? 'Active' : isPending ? 'Pending' : 'Inactive'}
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-fw-disabled shrink-0" />
                    </div>
                  );
                })}
                {hiddenInGroup > 0 && (
                  <p className="text-[10px] text-fw-disabled px-1">+{hiddenInGroup} more {type}</p>
                )}
              </div>
            );
          });
        })()}

        {/* See all — links to the hub detail's grouped connections */}
        <button
          onClick={() => navigate(`/hubs/${router.id}`)}
          className="w-full flex items-center justify-between px-2 py-1.5 text-figma-xs font-medium text-fw-bodyLight hover:text-fw-link transition-colors rounded-lg group"
        >
          <span>
            {connections.length > 4
              ? `See all ${connections.length} connections`
              : `See Hub detail`}
          </span>
          <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
}
