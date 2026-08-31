import { Info } from 'lucide-react';
import { useCloudControl, useCloudControlActions } from '../../engine/react/useCloudControl';
import { AVAILABILITY_LABEL, CONNECTIVITY_PATHS, pathEvidence } from './pathEvidence';
import type { PathAvailability } from './pathEvidence';

/**
 * How a customer chooses between the two connectivity options, using portal
 * data rather than a slide. Every figure and every state comes from
 * `pathEvidence`, which reads `cc.fabricModel()` — so the card moves when the
 * estate moves, and where a latency renders it is the same figure, in the
 * same format, as the Performance tile four lines above it.
 *
 * Two kinds of line live on a card and they are kept apart on purpose: the
 * path's own description (`promise`, `isolation`) is constant everywhere and
 * sits above the rule; the <dl> below holds only what the engine derived for
 * THIS region, and a row is omitted rather than placeholdered when the engine
 * has nothing to put in it.
 */

/* Badge treatments reuse RegionPanel's own pills so the two read as one panel:
   green for what is live, cobalt for what the customer can turn on, neutral
   for what does not exist here. No amber; nothing here is a policy violation. */
const BADGE: Record<PathAvailability, string> = {
  live: 'bg-fw-successLight text-fw-success',
  provisionable: 'bg-fw-ctaPrimary/[0.08] text-fw-link',
  none: 'bg-fw-neutral text-fw-bodyLight',
};

/* The card treatment is neutral and identical for every state a customer can
   actually take. Cobalt border + cobalt tint is this codebase's SELECTED
   affordance (RegionPanel's attach cards, both wizards); these cards are not
   selectable, so borrowing it read as "we picked this one for you" and, on a
   `live` card, disagreed with its own green badge. Availability is the
   badge's job — one signal, one place. `none` keeps a de-emphasis, which says
   "there is nothing here", not "this is selected". */
const CARD: Record<PathAvailability, string> = {
  live: 'border-fw-secondary bg-fw-base',
  provisionable: 'border-fw-secondary bg-fw-base',
  none: 'border-fw-secondary bg-fw-neutral/40',
};

export function PathChoice({ cloudId, regionId }: { cloudId: string; regionId: string }) {
  const cc = useCloudControlActions();
  // Re-derive when an on-ramp is activated or a region is provisioned. Removing
  // this line is what `PathChoice.test.tsx`'s last test exists to catch: without
  // it the mounted card keeps rendering a stale estate until something else
  // re-renders the panel.
  useCloudControl(() => 0);

  const rows = pathEvidence(cc, cloudId, regionId);
  if (rows.length === 0) return null;

  return (
    <section className="rounded-xl border border-fw-secondary bg-fw-wash p-4">
      <h3 className="text-figma-sm font-semibold text-fw-heading">How you connect</h3>
      {/* Not "two ways onto the fabric for this region": on nine of the
          eighteen cards one of the two does not reach the region at all, and
          the sub-head must not promise what the card below it denies. */}
      <p className="mt-1 text-figma-xs text-fw-bodyLight">
        The two options AT&amp;T sells, and which of them reaches this region today. The figures are this
        estate&apos;s, not a brochure&apos;s.
      </p>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {CONNECTIVITY_PATHS.map(path => {
          const e = rows.find(r => r.pathId === path.id)!;
          return (
            <div
              key={path.id}
              data-testid={`path-${path.id}`}
              data-availability={e.availability}
              className={`rounded-lg border p-3 ${CARD[e.availability]}`}
            >
              <div className="flex items-center justify-between gap-2">
                {/* The badge is a status chip: it must never break mid-phrase
                    ("Provisionable / here"). The title yields and wraps
                    instead — min-w-0 lets it shrink inside the flex row. */}
                <span className="min-w-0 text-figma-sm font-semibold text-fw-heading">{path.label}</span>
                <span
                  className={`inline-flex items-center justify-center min-h-6 shrink-0 whitespace-nowrap px-2.5 py-1 rounded-full text-center text-figma-xs font-medium leading-tight ${BADGE[e.availability]}`}
                >
                  {AVAILABILITY_LABEL[e.availability]}
                </span>
              </div>

              {/* The path's own description: what it is, constant everywhere.
                  Kept out of the <dl> below, which holds only what the engine
                  derives for THIS region. */}
              <p className="mt-1.5 text-figma-xs text-fw-body">{path.promise}</p>
              <p className="mt-1 text-figma-xs text-fw-bodyLight">{path.isolation}</p>

              <dl className="mt-3 space-y-2 text-figma-xs">
                {/* Omitted, not placeholdered, when the path does not reach this
                    region — the region's latency is the other card's on-ramp's.
                    Formatted `3ms` to match the panel's Performance tile.

                    The label names the path, because this figure is the RTT
                    over THIS card's on-ramp and the region may still be riding
                    public transit today — the Performance tile above states
                    that other figure, and the two must not read as one claim. */}
                {e.latencyMs !== null && (
                  <div>
                    <dt className="text-fw-bodyLight">Latency on this path</dt>
                    <dd className="font-semibold text-fw-heading tabular-nums">{e.latencyMs}ms</dd>
                  </div>
                )}
                <div>
                  <dt className="text-fw-bodyLight">On-ramp</dt>
                  <dd className="font-semibold text-fw-heading">{e.onrampName ?? 'None in this region'}</dd>
                </div>
                {e.handoffSite && (
                  <div>
                    <dt className="text-fw-bodyLight">Hand-off</dt>
                    <dd className="font-semibold text-fw-heading">{e.handoffSite}</dd>
                  </div>
                )}
                {e.capacityNote && (
                  <div>
                    <dt className="text-fw-bodyLight">Capacity / state</dt>
                    <dd className="font-semibold text-fw-heading">{e.capacityNote}</dd>
                  </div>
                )}
              </dl>

              {e.caveats.map(c => (
                <p key={c} className="mt-2 flex gap-1.5 text-figma-xs text-fw-body">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-fw-link" aria-hidden />
                  <span>{c}</span>
                </p>
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}
