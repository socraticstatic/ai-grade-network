import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { AttIcon } from '../../components/icons/AttIcon';
import { NAV_LAYERS, type NavLayer } from '../../components/navigation/navItems';
import { LayerDashboard } from './dashboard/LayerDashboard';
import { LayerHero } from './LayerHero';
import { StageRollupBand } from './StageRollupBand';
import { StageIntent } from '../_shared/StageIntent';

/**
 * A layer's Home — the landing when you pick the layer up top, first in the
 * left rail. It renders the layer's live widget board (the same getters its
 * verb pages read) and opens onto the four verbs. A layer never drops you
 * straight onto Govern; it opens onto its overview.
 */

export function LayerHomePage({ layerKey }: { layerKey: NavLayer['key'] }) {
  const layer = NAV_LAYERS.find(l => l.key === layerKey)!;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-10">
      {/* The title earns one line, not four: an exec opening this screen
          came for the estate's state, not for a definition of the product
          they already bought. The blurb moved into the layer switcher's
          own description, where someone choosing BETWEEN layers needs it. */}
      <header className="mb-4">
        <p className="text-figma-xs font-semibold uppercase tracking-[0.1em] text-fw-bodyLight">{layer.tagline}</p>
        <h1 className="mt-0.5 text-figma-2xl font-bold tracking-[-0.03em] text-fw-heading">{layer.label}</h1>
      </header>

      {/* Who this screen serves, and what they came to decide. */}
      <div className="mb-5">
        <StageIntent stage="home" />
      </div>

      {/* 1. The answer: one figure, its evidence, its action - and the
             three exposures worth acting on, each a door. */}
      <div className="mb-8">
        <LayerHero surface={layerKey} />
      </div>

      {/* 2. The lifecycle rolled up - where this estate stands at every
             stage, each card a door into the stage that owns it. */}
      <div className="mb-8">
        <StageRollupBand surface={layerKey} />
      </div>

      {/* 3. The promise: what this estate has been told to hold. */}
      <div className="mb-8">
        <LayerDashboard surface={layerKey} />
      </div>

      {/* 4. The work. */}
      <h2 className="text-figma-base font-bold text-fw-heading tracking-[-0.02em] mb-3">Work this layer</h2>
      <div className="grid sm:grid-cols-2 gap-3">
        {layer.items.map(item => (
          <Link
            key={item.to}
            to={item.to}
            data-testid={`home-verb-${item.to.split('/').pop()}`}
            className="group flex items-start gap-4 rounded-2xl border border-fw-secondary bg-fw-base p-4 hover:border-fw-active transition-colors"
          >
            <span className="flex items-center justify-center h-10 w-10 rounded-xl bg-fw-accent flex-shrink-0">
              <AttIcon name={item.icon} className="h-5 w-5 text-fw-link" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-figma-base font-bold text-fw-heading tracking-[-0.02em]">
                {item.label}
                <ArrowRight className="h-4 w-4 text-fw-bodyLight group-hover:text-fw-link transition-colors" />
              </span>
              <span className="block text-figma-sm text-fw-bodyLight mt-0.5">{item.description}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
