import { useState } from 'react';
import { Check, ChevronDown, Info } from 'lucide-react';
import type { Finding } from './advisorModel';
import { ladderFor, type OfferTier } from './offerCatalog';

const FRAMING_LABEL: Record<OfferTier['framing'], string> = {
  good: 'Good',
  better: 'Better',
  best: 'Best',
};

/**
 * One grounded finding, borrowing three of the video's elements at once:
 * inline evidence with a "why we recommend this" popover, and an
 * expandable good/better/best ladder whose tier buttons are the advisor's
 * only exit — accepting one hands off to an existing flow (`onAcceptTier`
 * marks the profile done and navigates; this component owns neither
 * concern, just the route it hands back).
 */
export function FindingCard({ finding, onAcceptTier }: { finding: Finding; onAcceptTier: (route: string) => void }) {
  const [whyOpen, setWhyOpen] = useState(false);
  const [ladderOpen, setLadderOpen] = useState(false);
  const ladder = ladderFor(finding.kind);

  return (
    <div
      data-testid={`finding-card-${finding.kind}`}
      className="rounded-2xl border border-fw-secondary bg-fw-base p-4 space-y-2.5"
    >
      <p className="text-figma-base font-bold text-fw-heading tracking-[-0.02em]">{finding.title}</p>
      <p className="text-figma-sm text-fw-body">{finding.evidence}</p>

      <div>
        <button
          type="button"
          aria-expanded={whyOpen}
          onClick={() => setWhyOpen(o => !o)}
          className="inline-flex items-center gap-1.5 text-figma-xs font-medium text-fw-link hover:underline"
        >
          <Info size={13} aria-hidden="true" />
          Why we recommend this
        </button>
        {whyOpen && (
          <p className="mt-2 rounded-lg border border-fw-secondary bg-fw-wash px-3 py-2 text-figma-xs text-fw-bodyLight">
            {finding.why}
          </p>
        )}
      </div>

      <div className="pt-1.5 border-t border-fw-secondary/50">
        <button
          type="button"
          data-testid={`finding-ladder-toggle-${finding.kind}`}
          aria-expanded={ladderOpen}
          onClick={() => setLadderOpen(o => !o)}
          className="inline-flex items-center gap-1.5 text-figma-sm font-semibold text-fw-heading"
        >
          <ChevronDown
            size={15}
            className={`transition-transform ${ladderOpen ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
          {ladderOpen ? 'Hide the offer ladder' : 'See the offer ladder'}
        </button>

        {ladderOpen && (
          <div className="mt-2.5 space-y-2">
            {ladder.map(tier => (
              <button
                key={tier.key}
                type="button"
                data-testid={`finding-tier-${tier.key}`}
                onClick={() => onAcceptTier(tier.route)}
                className="flex w-full items-start gap-3 rounded-xl border border-fw-secondary bg-fw-wash px-3 py-2.5 text-left transition-colors hover:border-fw-active hover:bg-fw-ctaGhost"
              >
                <span
                  className={`mt-0.5 inline-flex h-5 shrink-0 items-center rounded-full px-2 text-[11px] font-semibold ${
                    tier.framing === 'best'
                      ? 'bg-fw-ctaPrimary text-white'
                      : tier.framing === 'better'
                        ? 'bg-fw-accent text-fw-link'
                        : 'bg-fw-neutral text-fw-body'
                  }`}
                >
                  {FRAMING_LABEL[tier.framing]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-figma-sm font-semibold text-fw-heading">{tier.name}</span>
                  <span className="block text-figma-xs text-fw-bodyLight">{tier.tagline}</span>
                </span>
                <Check size={15} className="mt-0.5 shrink-0 text-fw-disabled" aria-hidden="true" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
