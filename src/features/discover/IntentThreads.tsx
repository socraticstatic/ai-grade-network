import { useEffect, useRef, useState, type RefObject } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, X } from 'lucide-react';
import { useCloudControlLive, useCloudControlActions } from '../../engine/react/useCloudControl';
import { toggleAndi } from '../andi/AndiPanel';

/**
 * The estate's promises, live. One row per declared intent: a status badge
 * the engine re-derives on every read, the evidence sentence, and the
 * repair. Synchronize stages the intent's compiled moves into the twin's
 * design tray (?draft=intent-<id>) - the machine never commits.
 *
 * Each intent threads into the strata it constrains: the chips name the
 * layers, and the row's left edge carries the status color so a violated
 * promise reads at a glance. `animate-pulse` is globally suppressed under
 * prefers-reduced-motion (see e2e/reduced-motion.spec.ts).
 */

/** Which strata a catalog key constrains - the same keys StackPanel's
 *  bands carry (stack-band-ai / -cloud / -naas / -transport). */
export const THREADS: Record<string, string[]> = {
  'minimize-latency': ['naas', 'transport'],
  'path-diversity': ['naas', 'transport'],
  'route-by-cost': ['naas', 'transport'],
  'data-sensitivity': ['cloud', 'naas'],
  'private-inference': ['ai', 'naas'],
  'cap-token-spend': ['ai'],
  'maximize-bandwidth': ['naas', 'transport'],
  'optimize-jitter': ['naas', 'transport'],
  'recovery-objective': ['naas', 'transport'],
  'active-active': ['naas', 'transport'],
  'predictive-failover': ['naas', 'transport'],
  'route-by-app-class': ['cloud', 'naas'],
  'zero-trust-segmentation': ['cloud', 'naas'],
  'threat-aware-routing': ['naas'],
  'data-residency': ['cloud', 'naas'],
  'optimize-data-gravity': ['ai', 'naas'],
  'ai-flow-prediction': ['ai'],
  'lifecycle-connectivity': ['naas', 'transport'],
};

const BADGE: Record<string, { dot: string; label: string }> = {
  aligned: { dot: 'bg-fw-success', label: 'Aligned' },
  drifting: { dot: 'bg-fw-gray-500', label: 'Drifting' },
  violated: { dot: 'bg-fw-red-600 animate-pulse', label: 'Violated' },
};

const EDGE: Record<string, string> = {
  aligned: 'border-l-fw-success',
  drifting: 'border-l-fw-gray-400',
  violated: 'border-l-fw-red-600',
};

/* Stroke per status - the same palette the row badges speak. */
const STROKE: Record<string, string> = {
  aligned: '#2d7e24',
  drifting: '#878c94',
  violated: '#c70032',
};

/**
 * The woven half of the metaphor: one curve per (intent, stratum) pair,
 * drawn down the panel's left gutter from the intent's row into each band
 * it constrains. Geometry is measured off the live DOM (rows and bands are
 * siblings under the panel), re-measured on engine changes and resize.
 * Decoration only: aria-hidden, pointer-events none, and the status facts
 * it encodes are stated in the rows themselves. Violated threads pulse;
 * the global reduced-motion rule suppresses the pulse.
 */
export function IntentThreadOverlay({ containerRef }: { containerRef: RefObject<HTMLElement> }) {
  const intents = useCloudControlLive(cc => cc.intentList());
  const [paths, setPaths] = useState<{ key: string; d: string; status: string }[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      const cRect = container.getBoundingClientRect();
      const next: { key: string; d: string; status: string }[] = [];
      for (const i of intents) {
        const row = container.querySelector(`[data-testid="intent-row-${i.id}"]`);
        if (!row) continue;
        const r = row.getBoundingClientRect();
        const x0 = r.left - cRect.left;
        const y0 = r.top - cRect.top + r.height / 2;
        for (const band of THREADS[i.key] ?? []) {
          const el = container.querySelector(`[data-testid="stack-band-${band}"]`);
          if (!el) continue;
          const b = el.getBoundingClientRect();
          const x1 = b.left - cRect.left;
          const y1 = b.top - cRect.top + Math.min(28, b.height / 2);
          // Out the row's left edge, down the gutter, into the band's edge.
          const gutter = Math.max(4, x0 - 14);
          next.push({
            key: `${i.id}-${band}`,
            status: i.reading.status,
            d: `M ${x0} ${y0} C ${gutter} ${y0}, ${gutter} ${y0}, ${gutter} ${(y0 + y1) / 2} L ${gutter} ${y1 - 12} C ${gutter} ${y1}, ${gutter} ${y1}, ${x1} ${y1}`,
          });
        }
      }
      setPaths(next);
    };

    // After layout settles; again on resize and on any engine re-render.
    const raf = requestAnimationFrame(measure);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(container);
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [containerRef, intents]);

  if (!paths.length) return null;
  return (
    <svg
      data-testid="intent-thread-overlay"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
    >
      {paths.map(p => (
        <path
          key={p.key}
          data-testid={`thread-${p.key}`}
          data-status={p.status}
          d={p.d}
          fill="none"
          stroke={STROKE[p.status] ?? STROKE.drifting}
          strokeWidth={p.status === 'violated' ? 2.5 : 1.5}
          strokeOpacity={p.status === 'aligned' ? 0.35 : 0.65}
          strokeLinecap="round"
          className={p.status === 'violated' ? 'animate-pulse' : undefined}
        />
      ))}
    </svg>
  );
}

/**
 * Declare from the catalog: every ILM intent the engine can evaluate,
 * grouped by taxonomy. One-scope entries declare on click; multi-scope
 * entries open a second step listing engine-known scopes. Watch mode
 * always - enforcement stays a separate, visible decision on the row.
 */
function DeclareMenu() {
  const actions = useCloudControlActions();
  const catalog = useCloudControlLive(cc => cc.intentCatalog());
  const declared = useCloudControlLive(cc => cc.intentList());
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) { setOpen(false); setPicked(null); }
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); setPicked(null); } };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const isDeclared = (key: string, scopeId: string | null) =>
    declared.some(i => i.key === key && i.scope.id === scopeId);

  const declareAndClose = (key: string, scope: { kind: string; id: string | null; label: string }) => {
    actions.declareIntent(key, scope as never, 'watch');
    setOpen(false);
    setPicked(null);
  };

  const byTaxonomy = new Map<string, typeof catalog>();
  catalog.forEach(c => byTaxonomy.set(c.taxonomy, [...(byTaxonomy.get(c.taxonomy) ?? []), c]));
  const pickedEntry = picked ? catalog.find(c => c.key === picked) : null;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        data-testid="intent-declare-open"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => { setOpen(o => !o); setPicked(null); }}
        className="inline-flex items-center gap-1 rounded-full border border-fw-secondary bg-fw-wash px-3 py-1 text-figma-xs font-medium text-fw-body hover:border-fw-active hover:text-fw-link"
      >
        <Plus className="h-3 w-3" aria-hidden="true" /> Declare
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Declare a standing intent"
          className="absolute right-0 top-full z-20 mt-1 max-h-[420px] w-[340px] overflow-y-auto rounded-xl border border-fw-secondary bg-fw-base p-2 shadow-lg"
        >
          {pickedEntry ? (
            <>
              <button
                type="button"
                onClick={() => setPicked(null)}
                className="mb-1 inline-flex items-center gap-1 rounded px-2 py-1 text-figma-xs font-medium text-fw-bodyLight hover:text-fw-body"
              >
                <ChevronLeft className="h-3 w-3" aria-hidden="true" /> {pickedEntry.label}: pick a scope
              </button>
              {pickedEntry.scopes().map(s => (
                <button
                  key={`${s.kind}-${s.id}`}
                  type="button"
                  role="menuitem"
                  data-testid={`declare-scope-${s.id ?? 'estate'}`}
                  disabled={isDeclared(pickedEntry.key, s.id)}
                  onClick={() => declareAndClose(pickedEntry.key, s)}
                  className="block w-full rounded-md px-2.5 py-1.5 text-left text-figma-sm text-fw-body hover:bg-fw-wash disabled:opacity-40"
                >
                  {s.label}
                  {isDeclared(pickedEntry.key, s.id) && (
                    <span className="ml-2 text-figma-xs text-fw-bodyLight">declared</span>
                  )}
                </button>
              ))}
            </>
          ) : (
            [...byTaxonomy.entries()].map(([taxonomy, entries]) => (
              <div key={taxonomy} className="mb-1">
                <p className="px-2.5 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-fw-bodyLight">
                  {taxonomy}
                </p>
                {entries.map(c => {
                  const scopes = c.scopes();
                  const single = scopes.length === 1;
                  const done = single && isDeclared(c.key, scopes[0].id);
                  return (
                    <button
                      key={c.key}
                      type="button"
                      role="menuitem"
                      data-testid={`declare-item-${c.key}`}
                      disabled={done}
                      onClick={() =>
                        single ? declareAndClose(c.key, scopes[0]) : setPicked(c.key)
                      }
                      className="block w-full rounded-md px-2.5 py-1.5 text-left text-figma-sm text-fw-body hover:bg-fw-wash disabled:opacity-40"
                    >
                      {c.label}
                      <span className="ml-2 text-figma-xs text-fw-bodyLight">
                        {done ? 'declared' : single ? scopes[0].label : `${scopes.length} scopes`}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
          <p className="border-t border-fw-secondary px-2.5 pt-2 text-[11px] text-fw-bodyLight">
            Declarations start in watch mode: evaluated and counted, changing nothing.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Two renders of one list. `manage` (the /work office) carries the picker,
 * the mode toggles, remove and the watch notes. The picture (Discover)
 * shows status, evidence and Synchronize, and points at the office - the
 * cross-section is where promises are SEEN, Work is where they are kept.
 */
export function IntentThreads({ manage = true }: { manage?: boolean }) {
  const intents = useCloudControlLive(cc => cc.intentList());
  const actions = useCloudControlActions();
  const navigate = useNavigate();

  return (
    <section data-testid="intent-threads" className="mb-4">
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <h3 className="text-figma-sm font-bold text-fw-heading tracking-[-0.02em]">
          Standing intents
        </h3>
        <span className="flex items-center gap-3">
          {intents.length > 0 && (
            <span className="text-figma-xs text-fw-bodyLight">
              {intents.filter(i => i.reading.status === 'aligned').length} of {intents.length} aligned
            </span>
          )}
          {manage ? (
            <DeclareMenu />
          ) : (
            <button
              type="button"
              data-testid="intent-manage-link"
              onClick={() => navigate('/tasks')}
              className="text-figma-xs font-medium text-fw-link hover:underline"
            >
              Manage on Tasks
            </button>
          )}
        </span>
      </div>

      {intents.length === 0 ? (
        <p className="rounded-xl border border-dashed border-fw-secondary px-4 py-3 text-figma-sm text-fw-bodyLight">
          Nothing declared yet. Tell Andi the outcome you want, for example
          &ldquo;keep ai private&rdquo;, and the estate starts holding the promise.
          <button
            type="button"
            data-testid="intent-empty-andi"
            onClick={toggleAndi}
            className="ml-2 font-medium text-fw-link hover:underline"
          >
            Ask Andi
          </button>
        </p>
      ) : (
        <ul className="space-y-2">
          {intents.map(i => {
            const badge = BADGE[i.reading.status];
            return (
              <li
                key={i.id}
                data-testid={`intent-row-${i.id}`}
                className={`rounded-xl border border-fw-secondary border-l-4 ${EDGE[i.reading.status]} bg-fw-base px-4 py-3`}
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span
                    data-testid={`intent-badge-${i.id}`}
                    data-status={i.reading.status}
                    className="inline-flex items-center gap-1.5 text-figma-xs font-semibold uppercase tracking-[0.08em] text-fw-heading"
                  >
                    <span aria-hidden="true" className={`h-2 w-2 rounded-full ${badge.dot}`} />
                    {badge.label}
                  </span>
                  <span className="text-figma-sm font-medium text-fw-heading">{i.scope.label}</span>
                  <span className="text-figma-xs text-fw-bodyLight">
                    {THREADS[i.key]?.map(s => s.toUpperCase()).join(' · ')}
                  </span>
                  <span className="ml-auto flex items-center gap-2">
                    {manage && (
                      <button
                        type="button"
                        data-testid={`intent-mode-${i.id}`}
                        onClick={() => actions.setIntentMode(i.id, i.mode === 'watch' ? 'enforce' : 'watch')}
                        className="h-7 rounded-lg border border-fw-secondary px-2.5 text-figma-xs font-medium text-fw-body hover:bg-fw-wash"
                        title={i.mode === 'watch' ? 'Watching: evaluates and counts, changes nothing' : 'Enforcing: the standing control is applied'}
                      >
                        {i.mode === 'watch' ? 'Watch' : 'Enforce'}
                      </button>
                    )}
                    {i.reading.moves.length > 0 && (
                      <button
                        type="button"
                        data-testid={`intent-sync-${i.id}`}
                        onClick={() => navigate(`/discover?draft=intent-${i.id}`)}
                        className="h-7 rounded-lg bg-fw-ctaPrimary px-3 text-figma-xs font-medium text-white hover:bg-fw-ctaPrimaryHover"
                      >
                        Synchronize
                      </button>
                    )}
                    {manage && (
                      <button
                        type="button"
                        data-testid={`intent-remove-${i.id}`}
                        aria-label={`Remove the ${i.scope.label} intent`}
                        onClick={() => actions.removeIntent(i.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-fw-bodyLight hover:bg-fw-wash hover:text-fw-body"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </span>
                </div>
                <p className="mt-1 text-figma-sm text-fw-body">{i.reading.evidence}</p>
                {manage && i.reading.watch && (
                  <p className="mt-1 text-figma-xs text-fw-bodyLight">{i.reading.watch.note}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
