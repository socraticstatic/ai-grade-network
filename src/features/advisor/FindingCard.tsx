import { useState } from 'react';
import { ArrowRight, BrainCircuit, Cloud, Info, Shield, Zap } from 'lucide-react';
import type { Finding, FindingKind } from './advisorModel';
import { ladderFor, type OfferTier } from './offerCatalog';
import { FINDING_PERSONA } from '../_shared/personas';

const FRAMING_LABEL: Record<OfferTier['framing'], string> = {
  good: 'Start here',
  better: 'Recommended',
  best: 'Full control',
};

const KIND_ICON: Record<FindingKind, typeof Cloud> = {
  'untracked-ai': BrainCircuit,
  'unattached-regions': Cloud,
  'egress-bleed': Zap,
  'exposed-spof': Shield,
};

/**
 * One grounded finding with its offers in full view - no disclosure click
 * between an executive and the products. Three tiers render as a product
 * row; the recommended tier is the filled, lifted one. Accepting any tier
 * hands its route back up (`onAcceptTier` marks done and navigates).
 */
export function FindingCard({ finding, onAcceptTier }: { finding: Finding; onAcceptTier: (route: string) => void }) {
  const [whyOpen, setWhyOpen] = useState(false);
  const ladder = ladderFor(finding.kind);
  const Icon = KIND_ICON[finding.kind];

  return (
    <div
      data-testid={`finding-card-${finding.kind}`}
      className="space-y-4 rounded-2xl border border-fw-secondary bg-fw-base p-5"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-fw-cobalt-100">
          <Icon className="h-5 w-5 text-fw-cobalt-600" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          {/* Whose problem this is - the deck's persona column, on the
              artifact a reader would forward to that colleague. */}
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-fw-bodyLight">
            For {FINDING_PERSONA[finding.kind] ?? 'your team'}
          </p>
          <p className="mt-0.5 text-[17px] font-bold tracking-[-0.02em] text-fw-heading">{finding.title}</p>
          <p className="mt-0.5 text-figma-sm text-fw-body">{finding.evidence}</p>
          <button
            type="button"
            aria-expanded={whyOpen}
            aria-controls={`finding-why-${finding.kind}`}
            onClick={() => setWhyOpen(o => !o)}
            className="mt-1.5 inline-flex items-center gap-1.5 text-figma-xs font-medium text-fw-link hover:underline"
          >
            <Info size={13} aria-hidden="true" />
            Why we recommend this
          </button>
          {whyOpen && (
            <p
              id={`finding-why-${finding.kind}`}
              className="mt-2 rounded-lg bg-fw-wash px-3 py-2 text-figma-xs leading-relaxed text-fw-bodyLight"
            >
              {finding.why}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {ladder.map(tier => {
          const featured = tier.framing === 'better';
          return (
            <button
              key={tier.key}
              type="button"
              data-testid={`finding-tier-${tier.key}`}
              onClick={() => onAcceptTier(tier.route)}
              className={
                featured
                  ? 'group relative flex flex-col rounded-2xl bg-gradient-to-b from-fw-cobalt-600 to-fw-cobalt-700 p-4 text-left text-white shadow-lg transition-transform hover:-translate-y-0.5'
                  : 'group flex flex-col rounded-2xl border border-fw-secondary bg-fw-base p-4 text-left transition-all hover:-translate-y-0.5 hover:border-fw-cobalt-400 hover:shadow-md'
              }
            >
              <span
                className={`w-fit rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.04em] ${
                  featured ? 'bg-white/20 text-white' : 'bg-fw-neutral text-fw-bodyLight'
                }`}
              >
                {FRAMING_LABEL[tier.framing]}
              </span>
              <span className={`mt-2.5 block text-figma-base font-bold ${featured ? 'text-white' : 'text-fw-heading'}`}>
                {tier.name}
              </span>
              <span className={`mt-1 block flex-1 text-figma-xs leading-relaxed ${featured ? 'text-white/85' : 'text-fw-bodyLight'}`}>
                {tier.tagline}
              </span>
              <span
                className={`mt-3 inline-flex items-center gap-1.5 text-figma-xs font-semibold ${
                  featured ? 'text-white' : 'text-fw-cobalt-600'
                }`}
              >
                Choose this
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
