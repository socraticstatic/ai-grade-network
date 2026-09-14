import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

/**
 * LMCC-specific provisioning timeline for connection cards.
 *
 * Mirrors the StageItem animation in NetBondMaxBanner (AWS-first path) so
 * the customer sees the same visual progression when the connection was
 * created via the AT&T-first ("Build it for me") path.
 *
 * Steps match the LMCC Bible: Key Accepted → Negotiating Parameters → BGP Forming → Live
 * Timers match the banner: 2500 / 5500 / 8500 / 10200 ms
 *
 * Calls onComplete(connectionId) when Live is fully reached, which triggers
 * completeProvisioning in the store (flips card to Active).
 */

type ProvisionStatus = 'key-accepted' | 'negotiating' | 'bgp' | 'live' | 'complete';
type StageItemStatus = 'pending' | 'active' | 'done';

// Copy verbatim from Bible Section 6 ("What the customer sees") — matches PROVISION_STEPS in LMCCRequirementsPage
const STAGES = [
  {
    key: 'key-accepted' as const,
    title: 'Key Accepted',
    desc: 'AWS has received and validated the key. Negotiation is starting.',
  },
  {
    key: 'negotiating' as const,
    title: 'Negotiating Parameters',
    desc: 'AT&T and AWS are automatically agreeing the L3 configuration for all 4 channels. No action needed.',
  },
  {
    key: 'bgp' as const,
    title: 'BGP Forming',
    desc: 'Technical parameters agreed. BGP sessions coming up on AT&T hardware.',
  },
  {
    key: 'live' as const,
    title: 'Live',
    desc: 'Both AT&T and AWS have confirmed. Traffic can flow.',
  },
];

const STATUS_ORDER: ProvisionStatus[] = ['key-accepted', 'negotiating', 'bgp', 'live', 'complete'];

function stageStatus(stageKey: string, current: ProvisionStatus): StageItemStatus {
  if (current === 'complete') return 'done';
  const si = STATUS_ORDER.indexOf(stageKey as ProvisionStatus);
  const ci = STATUS_ORDER.indexOf(current);
  if (si < ci) return 'done';
  if (si === ci) return 'active';
  return 'pending';
}

// ── Timeline item — matches NetBondMaxBanner's StageItem exactly ──────────────
function TimelineItem({
  status,
  title,
  desc,
  isLast,
}: {
  status: StageItemStatus;
  title: string;
  desc: string;
  isLast: boolean;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center shrink-0">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-700 ${
            status === 'done'
              ? 'bg-fw-success'
              : status === 'active'
              ? 'bg-fw-primary'
              : 'bg-fw-secondary'
          }`}
        >
          {status === 'done' ? (
            <CheckCircle2 className="w-4 h-4 text-white" />
          ) : status === 'active' ? (
            <span className="w-2.5 h-2.5 bg-white rounded-full stage-pulse" />
          ) : (
            <span className="w-2.5 h-2.5 rounded-full bg-fw-body/25" />
          )}
        </div>
        {!isLast && (
          <div
            className={`w-px flex-1 min-h-[28px] mt-1 transition-all duration-700 ${
              status === 'done' ? 'bg-fw-success/70' : 'bg-fw-secondary'
            }`}
          />
        )}
      </div>

      <div className={isLast ? 'pb-0' : 'pb-7'}>
        <p
          className={`text-figma-sm font-semibold leading-snug transition-colors duration-500 ${
            status === 'pending' ? 'text-fw-body/50' : 'text-fw-heading'
          }`}
        >
          {title}
        </p>
        <p
          className={`text-figma-xs mt-0.5 leading-relaxed transition-colors duration-500 ${
            status === 'pending' ? 'text-fw-disabled' : 'text-fw-body'
          }`}
        >
          {desc}
        </p>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface LmccProvisioningTrackerProps {
  connectionId: string;
  onComplete: (connectionId: string) => void;
}

export function LmccProvisioningTracker({ connectionId, onComplete }: LmccProvisioningTrackerProps) {
  const [status, setStatus] = useState<ProvisionStatus>('key-accepted');
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setStatus('negotiating'), 2500);
    const t2 = setTimeout(() => setStatus('bgp'),         5500);
    const t3 = setTimeout(() => setStatus('live'),        8500);
    // At 10200ms: mark complete visually, begin exit animation
    const t4 = setTimeout(() => {
      setStatus('complete');
      setIsExiting(true);
    }, 10200);
    // After exit animation (450ms), notify parent — store flips card to Active
    const t5 = setTimeout(() => {
      onComplete(connectionId);
    }, 10650);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [connectionId, onComplete]);

  return (
    <motion.div
      className="overflow-hidden"
      animate={isExiting ? { opacity: 0, height: 0 } : { opacity: 1, height: 'auto' }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="px-6 pt-6 pb-7">
        {/* Header */}
        <div className="mb-5">
          <p className="text-figma-xs font-bold uppercase tracking-[0.1em] text-fw-link mb-1">
            Pending
          </p>
          <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em]">
            Activating your connection
          </h3>
          <p className="text-figma-sm text-fw-body mt-0.5">
            Four diverse paths are being configured automatically.
          </p>
        </div>

        <div className="border-t border-fw-secondary mb-6" />

        {/* Timeline */}
        {STAGES.map((stage, i) => (
          <TimelineItem
            key={stage.key}
            status={stageStatus(stage.key, status)}
            title={stage.title}
            desc={stage.desc}
            isLast={i === STAGES.length - 1}
          />
        ))}
      </div>
    </motion.div>
  );
}
