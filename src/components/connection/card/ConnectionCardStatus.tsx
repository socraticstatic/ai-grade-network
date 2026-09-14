import { Pause, Play } from 'lucide-react';
import { motion } from 'framer-motion';

interface ConnectionCardStatusProps {
  status: string;
  /** LMCC (Maximum tier) connections use GA vocabulary: Live, never Active. */
  isLmcc?: boolean;
  bandwidthUtilization: number;
  isPending: boolean;
  progress: number;
  remainingTime: number;
  handleToggleStatus: (e: React.MouseEvent) => void;
  healthStatus: {
    label: string;
    color: string;
  } | null;
  showEffects: boolean;
}

/**
 * Status component for the connection card
 * Displays the connection status, health, and toggle button
 */
export function ConnectionCardStatus({
  status,
  isLmcc = false,
  bandwidthUtilization,
  isPending,
  progress,
  remainingTime,
  handleToggleStatus,
  healthStatus,
  showEffects
}: ConnectionCardStatusProps) {
  return (
    <div className="px-6 py-3">
      <div className="flex items-center justify-between">
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            if (isLmcc) return; // display only — no pause/disable at GA
            handleToggleStatus(e);
          }}
          disabled={isPending || status === 'Pending' || isLmcc}
          className={`
            inline-flex items-center px-4 h-9 rounded-full text-figma-base font-medium
            transition-all duration-200 border
            ${isPending
              ? 'bg-fw-blue-light text-fw-link border-fw-active/20 cursor-wait'
              : status === 'Active'
                ? 'bg-fw-base text-fw-success border-fw-success hover:bg-fw-successLight'
                : status === 'Pending'
                  ? 'bg-fw-wash text-fw-bodyLight border-fw-secondary cursor-default'
                  : 'bg-fw-base text-fw-body border-fw-secondary hover:bg-fw-wash'
            }
          `}
          // Add animation for the pending state
          animate={isPending ? {
            backgroundColor: ['rgba(230, 246, 253, 0.6)', 'rgba(230, 246, 253, 1)', 'rgba(230, 246, 253, 0.6)'],
            borderColor: ['rgba(0, 159, 219, 0.1)', 'rgba(0, 159, 219, 0.3)', 'rgba(0, 159, 219, 0.1)'],
            transition: {
              repeat: Infinity,
              duration: 1.8,
              ease: "easeInOut"
            }
          } : {}}
        >
          {isPending ? (
            <span className="flex items-center">
              <span>{isLmcc ? 'Provisioning…' : 'Activating...'}</span>
            </span>
          ) : status === 'Deleting' ? (
            <>Deleting…</>
          ) : status === 'Deleted' ? (
            <>Deleted</>
          ) : status === 'Active' ? (
            isLmcc ? <>Live</> : (
              <>
                <Pause className="h-3.5 w-3.5 mr-1.5" />
                Active
              </>
            )
          ) : status === 'Provisioning' ? (
            <>{isLmcc ? 'Provisioning' : 'Pending...'}</>
          ) : status === 'Expired' ? (
            <>Expired</>
          ) : status === 'Pending' ? (
            <>Pending</>
          ) : isLmcc ? (
            <>Needs attention</>
          ) : (
            <>
              <Play className="h-3.5 w-3.5 mr-1.5" />
              Inactive
            </>
          )}
        </motion.button>

        {healthStatus && (
          (healthStatus.label === 'WAITING FOR AWS' || healthStatus.label === 'PROVISIONING') ? (
            <span
              className={`relative group px-2 py-1 rounded-lg text-figma-sm font-medium uppercase animate-pulse cursor-default ${healthStatus.color}`}
            >
              {healthStatus.label}
              <span className="absolute bottom-full right-0 mb-1.5 hidden group-hover:flex items-center whitespace-nowrap px-2.5 py-1.5 rounded-lg bg-fw-heading text-white text-[11px] font-normal normal-case tracking-normal shadow-lg pointer-events-none">
                Typically 5–12 minutes
              </span>
            </span>
          ) : (
            <span className={`px-2 py-1 rounded-lg text-figma-sm font-medium uppercase ${healthStatus.color}`}>
              {healthStatus.label}
            </span>
          )
        )}
      </div>
    </div>
  );
}