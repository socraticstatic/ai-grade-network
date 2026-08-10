import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ProviderLogo } from '../../components/brand/ProviderLogo';
import { useCloudControlActions } from '../../engine/react/useCloudControl';
import type { FabricModel, FabricSelection } from './FabricHero';
import type { FabricRegion } from '../../engine/types';

/* ------------------------------------------------------------------ *
 * Connections list — the condensed table below the hero. STRICTLY the three
 * things Connect foregrounds, per connection: reliability, performance,
 * private/public. No flows / steer / paths (those live on Observe now).
 * A connection = a region attached to the fabric.
 * ------------------------------------------------------------------ */

function ReliabilityPill({ reliability }: { reliability: FabricRegion['reliability'] }) {
  const map = {
    dual: { t: 'Dual', cls: 'bg-fw-successLight text-fw-success' },
    single: { t: 'Single', cls: 'bg-fw-ctaPrimary/[0.08] text-fw-link' },
    none: { t: 'None', cls: 'bg-fw-neutral text-fw-bodyLight' },
  } as const;
  const m = map[reliability];
  return <span className={`inline-flex items-center h-6 px-2.5 rounded-full text-figma-xs font-medium ${m.cls}`}>{m.t}</span>;
}

/** Deterministic mini sparkline around the region's latency — pure geometry,
 * no clocks/RNG (seeded off the region id + latency). Performance at a glance. */
function LatencySpark({ region }: { region: FabricRegion }) {
  const seed = region.regionId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const pts = Array.from({ length: 12 }, (_, i) => {
    const wob = ((Math.sin(seed + i * 1.3) + 1) / 2) * 0.5 + 0.5; // 0.5..1.0, stable
    return 1 - wob; // higher = lower latency
  });
  const w = 56, h = 16;
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${(i / (pts.length - 1)) * w} ${p * h}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden className="shrink-0">
      <path d={d} fill="none" stroke="#0057b8" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.75} />
    </svg>
  );
}

interface ConnectionsListProps {
  model: FabricModel;
  selected?: FabricSelection | null;
  onSelect?: (sel: FabricSelection) => void;
  onProvisioned: (regionId: string) => void;
}

export function ConnectionsList({ model, selected, onSelect, onProvisioned }: ConnectionsListProps) {
  const actions = useCloudControlActions();
  const connections = model.regions.filter(r => r.path === 'private');

  const makeDual = (region: FabricRegion) => {
    actions.provisionRegion(region.regionId, { resilient: true });
    onProvisioned(region.regionId);
  };

  return (
    <section aria-labelledby="connections-heading" className="rounded-2xl border border-fw-secondary bg-fw-base overflow-hidden" data-testid="connections-list">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-fw-secondary bg-fw-wash">
        <h2 id="connections-heading" className="font-medium text-fw-heading">Connections</h2>
        {/* Row 45 of the phase-0 metric audit: the leading "{n} on the
            fabric" count cut — a fourth rendering of "1 on the fabric" on
            this screen (the verdict line, the Connect page's own tiles,
            and this list's own row count). The descriptive tail — what
            the list actually states per row — stays. */}
        <span className="text-figma-xs text-fw-bodyLight">reliability · performance · private/public</span>
      </div>

      {connections.length === 0 ? (
        <div className="px-5 py-8 text-center text-figma-sm text-fw-bodyLight">
          No regions on the fabric yet — select a region above and provision it.
        </div>
      ) : (
        <ul className="divide-y divide-fw-secondary">
          {connections.map(region => {
            const isSel = selected?.kind === 'region' && selected.id === region.regionId;
            return (
              <li key={region.regionId}>
                <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 ${isSel ? 'bg-fw-ctaPrimary/[0.03]' : ''}`}>
                  <button
                    type="button" onClick={() => onSelect?.({ kind: 'region', id: region.regionId })}
                    className="flex items-center gap-2.5 min-w-[180px] flex-1 text-left rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-fw-link/40"
                  >
                    <ProviderLogo id={region.cloudId} size={26} />
                    <span className="min-w-0">
                      <span className="block truncate text-figma-sm font-medium text-fw-heading">{region.name}</span>
                      <span className="block truncate text-figma-xs text-fw-bodyLight">{region.cloudName}</span>
                    </span>
                  </button>

                  {/* reliability */}
                  <div className="flex items-center gap-2">
                    <ReliabilityPill reliability={region.reliability} />
                    {region.reliability !== 'dual' && (
                      <button type="button" onClick={() => makeDual(region)}
                        className="text-figma-xs font-medium text-fw-link hover:underline">Make dual</button>
                    )}
                  </div>

                  {/* performance */}
                  <div className="flex items-center gap-2">
                    <LatencySpark region={region} />
                    <span className="text-figma-sm tabular-nums text-fw-body">{region.latencyMs}ms</span>
                    <Link to="/naas/observe" className="inline-flex items-center gap-0.5 text-figma-xs font-medium text-fw-link hover:underline">
                      View in Observe <ArrowRight size={12} />
                    </Link>
                  </div>

                  {/* private / public */}
                  <span className="inline-flex items-center h-6 px-2.5 rounded-full text-figma-xs font-medium bg-fw-ctaPrimary/[0.08] text-fw-link">Private</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
