import { Link } from 'react-router-dom';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { useCloudControlLive } from '../../engine/react/useCloudControl';
import { WhyFigure } from '../../components/viz/WhyFigure';
import { layerHero } from './heroModel';
import type { Surface } from './dashboard/registry';

/**
 * The layer's answer, above everything else on the page.
 *
 * One headline figure with its evidence one click away, one action on it,
 * and the three exposures worth acting on - each a door to the screen that
 * resolves it. Nothing here is decoration: if a number cannot be acted on
 * from an exec's chair, it does not belong at the top of an exec's screen.
 */
export function LayerHero({ surface }: { surface: Surface }) {
  const hero = useCloudControlLive(cc => layerHero(cc, surface));

  return (
    <section data-testid="layer-hero" className="space-y-4">
      <p data-testid="layer-verdict" className="text-[19px] font-semibold leading-snug tracking-[-0.02em] text-fw-heading">
        {hero.verdict}
      </p>

      <div className="grid gap-3 lg:grid-cols-3">
        {/* The number, and the one thing to do with it. */}
        <div className="rounded-2xl border border-fw-secondary bg-fw-base p-5 lg:col-span-2">
          <WhyFigure
            testid="hero-figure"
            value={hero.headline.value}
            label={hero.headline.label}
            evidence={hero.evidence}
            source={hero.source}
          />
          <Link
            to={hero.headline.to}
            data-testid="hero-cta"
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-fw-ctaPrimary px-5 py-2 text-figma-sm font-medium text-white transition-colors hover:bg-fw-ctaPrimaryHover"
          >
            {hero.headline.cta}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        {/* What is wrong, ranked, each one a door. */}
        <ul className="flex flex-col gap-3">
          {hero.risks.map(r => (
            <li key={r.label}>
              <Link
                to={r.to}
                data-testid="hero-risk"
                className="group flex items-center gap-3 rounded-2xl border border-fw-secondary bg-fw-base px-4 py-3 transition-colors hover:border-fw-active"
              >
                <span
                  className={`text-figma-xl font-bold tabular-nums tracking-[-0.02em] ${
                    r.alarm ? 'text-fw-warn' : 'text-fw-heading'
                  }`}
                >
                  {r.value}
                </span>
                <span className="min-w-0 flex-1 text-figma-sm text-fw-bodyLight">{r.label}</span>
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-fw-disabled transition-colors group-hover:text-fw-link"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
