/**
 * LmccPathDrawer — right-hand detail drawer for a single LMCC path.
 *
 * Slides in from the right when a path row is clicked in LMCCStatusPanel.
 * Shows full path details: status, BGP state, physical layer, event log.
 */

import { X, AlertTriangle, CheckCircle2, Clock, ExternalLink, Wifi, Server, Hash, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LMCCPath, LMCCBFD } from '../../../types/lmcc';

interface LmccPathDrawerProps {
  path: LMCCPath | null;
  siteLabel: string;
  pathIndex: number;
  bfd: LMCCBFD;
  onClose: () => void;
}

// Mock event log — keyed by path status so warning paths get realistic history
const WARNING_EVENTS = [
  { time: '4 min ago',    label: 'BGP session reset',       kind: 'warn' },
  { time: '18 min ago',   label: 'BGP session reset',       kind: 'warn' },
  { time: '52 min ago',   label: 'BGP session reset',       kind: 'warn' },
  { time: '2h 14min ago', label: 'BGP Established',         kind: 'ok'   },
  { time: '2h 14min ago', label: 'Path activated',          kind: 'ok'   },
];

const ACTIVE_EVENTS = [
  { time: '6 days ago',   label: 'BGP Established',         kind: 'ok'   },
  { time: '6 days ago',   label: 'Path activated',          kind: 'ok'   },
];

const BGP_STATE_LABELS: Record<string, string> = {
  established:  'Established',
  'open-confirm': 'Open Confirm',
  'open-sent':    'Open Sent',
  active:         'Active — reconnecting',
  connect:        'Connect',
  idle:           'Idle',
};

export function LmccPathDrawer({ path, siteLabel, pathIndex, bfd, onClose }: LmccPathDrawerProps) {
  if (!path) return null;

  const isWarning = path.status === 'warning';
  const isDown    = path.status === 'down';
  const isActive  = path.status === 'active';

  const events = isWarning ? WARNING_EVENTS : ACTIVE_EVENTS;

  return (
    <AnimatePresence>
      {path && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/25 z-[70]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            className="fixed right-0 top-0 h-full w-[420px] bg-fw-base shadow-2xl z-[80] flex flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-fw-secondary flex items-start justify-between gap-4 shrink-0">
              <div>
                <p className="text-figma-xs font-bold uppercase tracking-[0.1em] text-fw-bodyLight mb-1">
                  {siteLabel} · Path {pathIndex}
                </p>
                <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em]">
                  {path.ipeId}
                </h3>
                <div className="mt-1.5">
                  {isWarning && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-[11px] font-bold uppercase tracking-[0.08em] text-amber-700">
                      <AlertTriangle className="w-3 h-3" /> Warning
                    </span>
                  )}
                  {isActive && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 border border-green-200 text-[11px] font-bold uppercase tracking-[0.08em] text-green-700">
                      <CheckCircle2 className="w-3 h-3" /> Active
                    </span>
                  )}
                  {isDown && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-[11px] font-bold uppercase tracking-[0.08em] text-red-700">
                      <X className="w-3 h-3" /> Down
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full text-fw-bodyLight hover:text-fw-heading hover:bg-fw-neutral transition-colors shrink-0 -mt-1 -mr-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto">

              {/* Warning alert */}
              {isWarning && (
                <div className="mx-6 mt-5 p-4 rounded-xl bg-amber-50 border border-amber-200">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-figma-sm font-semibold text-amber-900 leading-snug">
                        BGP session flapping
                      </p>
                      <p className="text-figma-xs text-amber-800 mt-1 leading-relaxed">
                        3 resets in the last hour. Traffic is automatically rerouted across the 3 healthy paths. No service impact — Maximum Resiliency SLA maintained.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Path details */}
              <div className="px-6 mt-5 space-y-2">
                <p className="text-figma-xs font-semibold text-fw-bodyLight uppercase tracking-[0.08em] mb-3">Path details</p>

                {[
                  { icon: Server,   label: 'IPE',             value: `${path.ipeId} (Juniper MX-304)` },
                  { icon: Activity, label: 'Physical port',   value: path.physicalPort },
                  { icon: Hash,     label: 'VLAN ID',         value: String(path.vlanId) },
                  { icon: Hash,     label: 'AWS connection',  value: path.awsConnectionId },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center justify-between py-2.5 border-b border-fw-secondary/50 last:border-0">
                    <div className="flex items-center gap-2 text-fw-bodyLight">
                      <Icon className="w-3.5 h-3.5" />
                      <span className="text-figma-xs">{label}</span>
                    </div>
                    <span className="text-figma-xs font-semibold font-mono text-fw-heading">{value}</span>
                  </div>
                ))}
              </div>

              {/* BGP + BFD */}
              <div className="px-6 mt-5">
                <p className="text-figma-xs font-semibold text-fw-bodyLight uppercase tracking-[0.08em] mb-3">BGP / BFD</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-fw-wash border border-fw-secondary">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Wifi className={`w-3.5 h-3.5 ${isWarning ? 'text-amber-500' : 'text-fw-link'}`} />
                      <p className="text-figma-xs text-fw-bodyLight">BGP state</p>
                    </div>
                    <p className={`text-figma-sm font-semibold ${isWarning ? 'text-amber-700' : 'text-fw-heading'}`}>
                      {BGP_STATE_LABELS[path.bgpState] || path.bgpState}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-fw-wash border border-fw-secondary">
                    <p className="text-figma-xs text-fw-bodyLight mb-1">BFD detection</p>
                    <p className="text-figma-sm font-semibold text-fw-heading">
                      {bfd.multiplier}×{bfd.interval}ms
                    </p>
                    <p className="text-figma-xs text-fw-bodyLight">{bfd.multiplier * bfd.interval}ms failover</p>
                  </div>
                </div>
              </div>

              {/* Event log */}
              <div className="px-6 mt-5 pb-6">
                <p className="text-figma-xs font-semibold text-fw-bodyLight uppercase tracking-[0.08em] mb-3">Event log</p>
                <div className="space-y-0">
                  {events.map((evt, i) => (
                    <div key={i} className="flex items-start gap-3 py-2.5 border-b border-fw-secondary/50 last:border-0">
                      <div className="mt-0.5 shrink-0">
                        {evt.kind === 'warn'
                          ? <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                          : <CheckCircle2 className="w-3.5 h-3.5 text-fw-link" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-figma-xs font-medium text-fw-heading">{evt.label}</p>
                      </div>
                      <div className="flex items-center gap-1 text-fw-bodyLight shrink-0">
                        <Clock className="w-3 h-3" />
                        <span className="text-figma-xs">{evt.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-fw-secondary shrink-0">
              <a
                href={`https://console.aws.amazon.com/directconnect/v2/home#/connections/${path.awsConnectionId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full h-10 rounded-full border border-fw-secondary text-figma-sm font-medium text-fw-body hover:bg-fw-wash transition-colors"
              >
                View in AWS Console
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
