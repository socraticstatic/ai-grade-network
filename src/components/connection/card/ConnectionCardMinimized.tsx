import { ChevronRight, Play, Pause, Maximize2, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { IconButton } from '../../common/IconButton';
import { Group } from '../../../types/group';
import { isC2C, getConnectionLegs } from '../../../utils/connectionLegs';
import { ConnectionTypeIcon } from '../icons/ConnectionTypeIcon';
import { ProviderStack } from '../ProviderStack';
import { displayStatus } from '../../../utils/lmccDisplay';

interface ConnectionCardMinimizedProps {
  connection: any;
  groups: Group[];
  getStatusDotColor: () => string;
  getCardIcon: () => React.ReactNode;
  handleToggleStatus: (e: React.MouseEvent) => void;
  isPending: boolean;
  progress: number;
  remainingTime: number;
  navigate: (path: string) => void;
  onMaximize: () => void;
  showEffects: boolean;
}

/**
 * Minimized view of the connection card.
 * Primary-element row: type icon · name + type/location(s) · provider stack · status · actions.
 * The gear-configurable fact strip lives on the expanded card and the tables, not here —
 * the mini card stays focused on identity: what it is, where it lands, which clouds it touches.
 */
export function ConnectionCardMinimized({
  connection,
  groups,
  getStatusDotColor,
  getCardIcon,
  handleToggleStatus,
  isPending,
  progress,
  remainingTime,
  navigate,
  onMaximize,
  showEffects
}: ConnectionCardMinimizedProps) {
  const isProvisioning = connection.status === 'Provisioning' || connection.status === 'Pending';
  const c2c = isC2C(connection);

  const legs = getConnectionLegs(connection);
  const providers = legs.map(l => l.provider);
  // Distinct metro location(s) this connection lands in, across all legs.
  const locations = [...new Set(
    (legs.map(l => l.location).filter(Boolean) as string[]).concat(
      connection.locations?.length ? connection.locations : connection.location ? [connection.location] : []
    )
  )];
  const locationLabel = locations.length <= 2 ? locations.join(' · ') : `${locations[0]} +${locations.length - 1}`;

  return (
    <div className="h-full px-5 flex items-center gap-3">

      {/* Connection-type icon — leads the row as its identity anchor */}
      <span className="text-fw-link shrink-0 flex items-center">
        <ConnectionTypeIcon type={c2c ? 'Cloud to Cloud' : connection.type} size={22} />
      </span>

      {/* Name + type · location(s) */}
      <div className="min-w-0 flex-1">
        <p className="text-figma-sm font-semibold text-fw-heading truncate leading-tight" title={connection.name}>
          {connection.name}
        </p>
        <div className="text-figma-xs text-fw-bodyLight flex items-center gap-1.5 min-w-0">
          {c2c && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide bg-fw-link text-white shrink-0">
              C2C
            </span>
          )}
          <span className="shrink-0">{connection.type}</span>
          {locations.length > 0 && (
            <>
              <span className="text-fw-secondary shrink-0" aria-hidden>·</span>
              <MapPin className="h-3 w-3 shrink-0 text-fw-disabled" />
              <span className="truncate" title={locations.join(' · ')}>{locationLabel}</span>
            </>
          )}
        </div>
      </div>

      {/* Provider stack — primary element: which cloud(s) this connection reaches */}
      <ProviderStack providers={providers} size={24} />

      {/* Status pill — for LMCC it is a display, never a switch (no disable at GA) */}
      <motion.button
        onClick={(e) => {
          e.stopPropagation();
          if (connection.configuration?.isLmcc === true) return;
          handleToggleStatus(e);
        }}
        disabled={isPending || isProvisioning || connection.configuration?.isLmcc === true}
        className={`
          inline-flex items-center gap-1 px-3 py-1 rounded-full text-figma-xs font-medium
          transition-all duration-200 border shrink-0
          ${isPending
            ? 'bg-brand-lightBlue text-brand-blue border-brand-blue/20 cursor-wait'
            : connection.status === 'Active'
              ? 'bg-fw-base text-fw-success border-fw-success/30 hover:bg-fw-successLight'
              : isProvisioning
                ? 'bg-fw-wash text-fw-bodyLight border-fw-secondary cursor-default'
                : 'bg-fw-base text-fw-body border-fw-secondary hover:bg-fw-wash'
          }
        `}
        animate={isPending ? {
          backgroundColor: ['rgba(230,246,253,0.8)', 'rgba(230,246,253,1)', 'rgba(230,246,253,0.8)'],
          transition: { repeat: Infinity, duration: 1.5, ease: 'easeInOut' }
        } : {}}
      >
        {(() => {
          const isLmcc = connection.configuration?.isLmcc === true;
          if (isLmcc && displayStatus(connection) === 'Expired') return 'Expired';
          return isPending ? (isLmcc ? 'Provisioning…' : 'Activating…')
            : connection.status === 'Deleting' ? 'Deleting…'
            : connection.status === 'Deleted' ? 'Deleted'
            : connection.status === 'Active' ? (isLmcc ? 'Live' : (<><Pause className="h-3 w-3" />Active</>))
            : connection.status === 'Provisioning' ? (isLmcc ? 'Provisioning' : 'Pending…')
            : connection.status === 'Pending' ? 'Pending'
            : isLmcc ? 'Needs attention'
            : (<><Play className="h-3 w-3" />Inactive</>);
        })()}
      </motion.button>

      {/* Action buttons */}
      <div
        className="flex items-center gap-1 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <IconButton
          icon={<ChevronRight className="h-4 w-4" />}
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/connections/${connection.id}`);
          }}
          variant="ghost"
          size="sm"
          title="Manage Connection"
        />
        <IconButton
          icon={<Maximize2 className="h-3.5 w-3.5" />}
          onClick={onMaximize}
          variant="ghost"
          size="sm"
          title="Expand"
        />
      </div>
    </div>
  );
}
