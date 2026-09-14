import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCloudControlLive } from '../../engine/react/useCloudControl';
import { IntentThreads } from '../discover/IntentThreads';
import { workQueue, workByStage, type WorkRow } from './workQueue';

/**
 * The office: every task in one queue, every promise managed. The queue is
 * `workQueue()` - the same derivation Andi's Resolve renders - grouped by
 * lifecycle stage, filterable by layer. Nothing commits here: intent rows
 * Synchronize into the twin, advisor rows review there. One queue, many
 * doors, and this is the door with the whole list.
 */

const STAGE_LABEL: Record<string, string> = {
  connect: 'Connect',
  govern: 'Govern',
  observe: 'Observe',
  cost: 'Cost',
};

const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

function RowActions({ row }: { row: WorkRow }) {
  const navigate = useNavigate();
  if (row.source === 'intent' && row.intentId) {
    return (
      <button
        type="button"
        data-testid={`work-sync-${row.intentId}`}
        onClick={() => navigate(`/discover?draft=intent-${row.intentId}`)}
        className="h-7 rounded-lg bg-fw-ctaPrimary px-3 text-figma-xs font-medium text-white hover:bg-fw-ctaPrimaryHover"
      >
        Synchronize
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={() => navigate('/discover?draft=andi')}
      className="h-7 rounded-lg border border-fw-secondary px-3 text-figma-xs font-medium text-fw-body hover:bg-fw-wash"
    >
      Review in the twin
    </button>
  );
}

export function TasksPage() {
  const [layer, setLayer] = useState<'all' | 'naas' | 'ai'>('all');
  const rows = useCloudControlLive(cc => workQueue(cc));
  const visible = rows.filter(r => layer === 'all' || r.layer === layer || r.layer === 'estate');
  const groups = workByStage(visible);
  const priced = visible.reduce((s, r) => s + (r.priceMo ?? 0), 0);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-10" data-testid="work-page">
      {/* data-tour: the guided tour's Tasks beat anchors HERE, on the header,
          not on the queue below it. The queue is conditional — an estate with
          nothing waiting renders the empty <p> instead — and a beat whose
          target can vanish spotlights nothing. The header carries the two
          things the beat actually claims: the title and the layer filter. */}
      <header data-tour="tasks-office" className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-figma-2xl font-bold text-fw-heading tracking-[-0.03em]">Tasks</h1>
          <p className="text-figma-base text-fw-body mt-1 max-w-2xl">
            Every task waiting for a human, by lifecycle stage. Committing stays in the
            twin; this is the whole list.
          </p>
        </div>
        <div className="flex items-center gap-2" role="group" aria-label="Filter by layer">
          {(['all', 'naas', 'ai'] as const).map(k => (
            <button
              key={k}
              type="button"
              data-testid={`work-layer-${k}`}
              aria-pressed={layer === k}
              onClick={() => setLayer(k)}
              className={`h-8 rounded-full px-3.5 text-figma-sm font-medium ${
                layer === k
                  ? 'bg-fw-accent text-fw-link border border-fw-active'
                  : 'border border-fw-secondary text-fw-body hover:bg-fw-wash'
              }`}
            >
              {k === 'all' ? 'All layers' : k === 'naas' ? 'NaaS' : 'AI Fabric'}
            </button>
          ))}
        </div>
      </header>

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-fw-secondary px-4 py-6 text-figma-sm text-fw-bodyLight">
          Nothing waits. Every promise is aligned and the advisor prices no move.
        </p>
      ) : (
        <>
          <p className="mb-4 text-figma-sm text-fw-bodyLight" data-testid="work-summary">
            {visible.length} task{visible.length === 1 ? '' : 's'}
            {priced > 0 && <> · {money(priced)}/mo on the table across the priced ones</>}
          </p>
          <div className="space-y-6">
            {groups.map(g => (
              <section key={g.stage} data-testid={`work-stage-${g.stage}`}>
                <h2 className="mb-2 text-figma-sm font-bold uppercase tracking-[0.08em] text-fw-bodyLight">
                  {STAGE_LABEL[g.stage]}
                </h2>
                <ul className="space-y-2">
                  {g.rows.map(r => (
                    <li
                      key={r.id}
                      data-testid={`work-row-${r.id}`}
                      className="flex flex-wrap items-center gap-3 rounded-xl border border-fw-secondary bg-fw-base px-4 py-3"
                    >
                      {r.status && (
                        <span
                          aria-hidden="true"
                          className={`h-2 w-2 flex-shrink-0 rounded-full ${
                            r.status === 'violated' ? 'bg-fw-red-600' : 'bg-fw-gray-500'
                          }`}
                        />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block text-figma-sm font-medium text-fw-heading">{r.label}</span>
                        <span className="block text-figma-xs text-fw-bodyLight">{r.detail}</span>
                      </span>
                      <span className="flex items-center gap-3">
                        {r.priceMo !== null && r.priceMo > 0 && (
                          <span className="text-figma-sm font-medium text-fw-success">
                            {money(r.priceMo)}/mo
                          </span>
                        )}
                        <span className="text-figma-xs uppercase tracking-[0.08em] text-fw-bodyLight">
                          {r.layer === 'estate' ? 'Estate' : r.layer === 'ai' ? 'AI' : 'NaaS'}
                        </span>
                        <RowActions row={r} />
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}

      <div className="mt-10 border-t border-fw-secondary pt-6">
        {/* The promises, managed: the full intent office - declare, mode,
            remove - lives here. Discover keeps the picture. */}
        <IntentThreads />
        <p className="mt-2 text-figma-xs text-fw-bodyLight">
          The <Link to="/discover" className="font-medium text-fw-link hover:underline">Discover cross-section</Link>{' '}
          draws these as threads through the stack.
        </p>
      </div>
    </div>
  );
}
