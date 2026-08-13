import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useCloudControlLive } from '../../engine/react/useCloudControl';
import { Chart } from '../../components/charts/Chart';
import {
  connectGaugeOption,
  costTrendOption,
  discoverTreemapOption,
  governFunnelOption,
  observeTrendOption,
} from './stageCharts';
import { useCloudControl } from '../../engine/react/useCloudControl';
import { stageRollup } from './stageRollup';
import type { Surface } from './dashboard/registry';

/**
 * The lifecycle, rolled up: one card per stage, each stating that stage's
 * own proof metric and opening onto the screen that owns it.
 *
 * This is what makes the board a board. Without it a layer home states the
 * money and the risk and then jumps straight to four link tiles, which asks
 * a viewer to click into every stage to learn whether anything is wrong
 * there. Five figures answer that from one screen.
 */
export function StageRollupBand({ surface }: { surface: Surface }) {
  const stages = useCloudControlLive(cc => stageRollup(cc, surface));
  /* A chart per stage, each answering that stage's own question: an estate
     is a treemap, a share is a gauge, a policy pipeline is a funnel, and
     anything with a history is a trend. Only NaaS has all five today - the
     AI layer keeps its figure-and-caption card until its own series exist,
     rather than borrowing a shape that would misdescribe it. */
  const charts = useCloudControl(cc =>
    surface === 'naas'
      ? {
          discover: discoverTreemapOption(cc),
          connect: connectGaugeOption(cc),
          govern: governFunnelOption(cc),
          observe: observeTrendOption(cc),
          cost: costTrendOption(cc),
        }
      : null,
  );

  return (
    <section aria-label="The lifecycle at a glance" data-testid="stage-rollup">
      <h2 className="mb-3 text-figma-base font-bold tracking-[-0.02em] text-fw-heading">Across the lifecycle</h2>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {stages.map(s => (
          <li key={s.key}>
            <Link
              to={s.to}
              data-testid={`stage-card-${s.key}`}
              className="group flex h-full flex-col rounded-2xl border border-fw-secondary bg-fw-base p-4 transition-colors hover:border-fw-active"
            >
              <span className="flex items-center justify-between text-figma-xs font-semibold uppercase tracking-[0.06em] text-fw-bodyLight">
                {s.label}
                <ChevronRight
                  className="h-3.5 w-3.5 text-fw-disabled transition-colors group-hover:text-fw-link"
                  aria-hidden="true"
                />
              </span>
              {/* The figure and, where the stage has an honest
                  denominator, the ring that saves a viewer the division. */}
              <span className="mt-2 flex items-center gap-3">
                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-[26px] font-bold leading-none tabular-nums tracking-[-0.02em] ${
                      s.alarm ? 'text-fw-warn' : 'text-fw-heading'
                    }`}
                  >
                    {s.value}
                  </span>
                  <span className="mt-1 block text-figma-xs leading-snug text-fw-body">{s.caption}</span>
                </span>
              </span>

              {charts?.[s.key as keyof typeof charts] && (
                <span className="mt-2 block">
                  <Chart
                    testid={`stage-chart-${s.key}`}
                    option={charts[s.key as keyof typeof charts]}
                    height={s.key === 'connect' ? 96 : 86}
                  />
                </span>
              )}

              {s.detail && (
                <span className="mt-auto pt-2.5 text-[11px] leading-snug text-fw-bodyLight">{s.detail}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
