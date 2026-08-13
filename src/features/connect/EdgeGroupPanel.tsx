import { Building2, Cable, TrendingUp, Server, Store, Landmark, MapPin, Globe } from 'lucide-react';
import type { EdgeNode } from './edgeDrill';
import { CC } from '../../engine';
import { connectionOf, OFF_NET } from '../discover/estateFilters';

/**
 * The panel for a rolled-up group in the ingress column.
 *
 * A leaf site gets `SitePanel` — one premises, its transport, its dual-homing.
 * A group of 2,840 needs a different answer: how many are already on the
 * fabric, what the ones that are not are riding today, and what attaching
 * them is worth. Same "value on top, evidence below" shape as everywhere else.
 */

const fmt = (n: number) => n.toLocaleString('en-US');

/** Same vocabulary as the column above it — an ATM group and a data-centre
 *  group must not open into the same picture. */
const PANEL_ICON = { dc: Server, office: Building2, branch: Store, atm: Landmark, metro: MapPin, site: Globe } as const;

export function EdgeGroupPanel({ node }: { node: EdgeNode }) {
  const offNet = node.count - node.onFabric;
  const Icon = PANEL_ICON[node.icon] ?? Building2;

  // What the off-fabric members ride today, largest first. This is the
  // sentence a network lead actually asks for: not "312 are public" but
  // "312 are on broadband, and here is the mix".
  const mix = new Map<string, number>();
  for (const b of node.members) {
    if (b.onrampId) continue;
    const conn = connectionOf(CC, b);
    mix.set(conn, (mix.get(conn) ?? 0) + 1);
  }
  const ranked = [...mix.entries()].sort((a, b) => b[1] - a[1]);
  const name = (k: string) => (k === OFF_NET ? 'the public internet' : k);
  const rides =
    ranked.length === 0
      ? ''
      : ranked.length === 1
        ? `all on ${name(ranked[0][0])}`
        : ranked.slice(0, 3).map(([k, n]) => `${fmt(n)} on ${name(k)}`).join(' · ');

  return (
    <section aria-label={node.label} className="rounded-2xl border border-fw-secondary bg-fw-base p-5 space-y-4">
      <header className="flex items-center gap-3">
        <span className="flex items-center justify-center h-10 w-10 rounded-full bg-fw-ctaPrimary/[0.08] text-fw-link shrink-0">
          <Icon size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-fw-heading leading-tight">{node.label}</div>
          <div className="text-figma-xs text-fw-bodyLight leading-tight">{fmt(node.count)} sites in this group</div>
          <div aria-hidden="true" className="mt-1.5 flex h-1.5 w-full max-w-[200px] overflow-hidden rounded-full bg-fw-secondary">
            <div className="h-full rounded-full bg-fw-ctaPrimary transition-[width] duration-500" style={{ width: `${Math.round(node.share * 100)}%` }} />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-fw-secondary bg-fw-wash p-3">
          <div className="flex items-center gap-1.5 text-figma-xs text-fw-bodyLight"><Cable size={13} /> On the AT&amp;T fabric</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-fw-success">{fmt(node.onFabric)}</div>
          <div className="text-[11px] text-fw-bodyLight">
            {node.count > 0 ? `${Math.round((node.onFabric / node.count) * 100)}% of the group` : '—'}
          </div>
        </div>
        <div className="rounded-xl border border-fw-secondary bg-fw-wash p-3">
          <div className="flex items-center gap-1.5 text-figma-xs text-fw-bodyLight"><TrendingUp size={13} /> Still off it</div>
          <div className={`mt-1 text-2xl font-semibold tabular-nums ${offNet > 0 ? 'text-fw-heading' : 'text-fw-bodyLight'}`}>
            {fmt(offNet)}
          </div>
          <div className="text-[11px] text-fw-bodyLight">
            {rides || 'nothing left to attach'}
          </div>
        </div>
      </div>

      {node.firstMile && node.firstMile !== 'mixed' && (
        <p className="text-figma-xs text-fw-bodyLight">
          First-mile across this group: <span className="font-medium text-fw-heading">{node.firstMile}</span>.
        </p>
      )}
    </section>
  );
}
