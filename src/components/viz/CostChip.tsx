import { Globe } from 'lucide-react';

/* Tokens, not hexes. This primitive was the SOURCE of the three off-palette
   families on the demo path: a cobalt that happened to equal fw-ctaPrimary, a
   Tailwind-default slate the fw grays already cover, and an emerald that was a
   second green competing with fw-success for one meaning. Every consumer
   inherited whichever it used, so fixing them here fixes the drift everywhere
   at once — and the fw text tokens carry the contrast work the raw hexes did
   not (fw-bodyLight is deliberately darkened, fw-success likewise). */
const CHIP_TONE = {
  controlled: 'text-fw-link bg-fw-ctaPrimary/[0.08] border-fw-active/20',
  // De-amber: public egress is neutral + a globe icon, never warm.
  public: 'text-fw-bodyLight bg-fw-wash border-fw-secondary',
  saving: 'text-fw-success bg-fw-success/[0.08] border-fw-success/20',
} as const;

export function CostChip({ perGb, tone }: { perGb: number; tone: keyof typeof CHIP_TONE }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium tabular-nums ${CHIP_TONE[tone]}`}>
      {tone === 'public' && <Globe size={12} className="text-fw-bodyLight" aria-hidden="true" />}
      ${perGb.toFixed(2)}/GB
    </span>
  );
}
