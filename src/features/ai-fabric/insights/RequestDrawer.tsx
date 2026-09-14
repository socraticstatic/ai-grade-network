import { useEffect, useRef } from 'react';
import { fmtTokens, fmtUsd } from '../aiSpend';
import type { InsightRequestRow } from './insightsFigures';

/**
 * The per-request detail panel (the LiteLLM pattern the Figma reference
 * catalogued: status banner, request details, metrics, cost breakdown).
 * Non-blocking right-side panel: role dialog, aria-modal false, the page
 * behind stays live. Focus lands on the panel on open; Escape and the X
 * both close it.
 *
 * Every dollar figure passes through fmtUsd, and the external comparison is
 * cost + costSaved - the same derivation the table row carries, never a new
 * one. A saving that would print as $0.00 is not stated; the line is omitted.
 */
export function RequestDrawer({
  row,
  onClose,
}: {
  row: InsightRequestRow;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.focus();
  }, [row.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const external = row.cost + row.costSaved;
  const statesSaving = fmtUsd(row.costSaved) !== fmtUsd(0);

  return (
    <div
      ref={panelRef}
      data-testid="request-drawer"
      role="dialog"
      aria-modal={false}
      aria-label={`Request details, ${row.identity}`}
      tabIndex={-1}
      className="fixed inset-y-0 right-0 z-40 w-[420px] overflow-y-auto border-l border-fw-secondary bg-fw-base shadow-xl outline-none"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-fw-secondary">
        <h3 className="text-figma-base font-bold text-fw-heading tracking-[-0.03em]">
          Request details
        </h3>
        <button
          type="button"
          data-testid="drawer-close"
          aria-label="Close request details"
          onClick={onClose}
          className="rounded p-1 text-fw-bodyLight hover:text-fw-heading"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M4 4l8 8M12 4l-8 8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <div className="space-y-5 px-5 py-4 text-figma-sm">
        {row.ok ? (
          <div className="rounded-xl bg-fw-successLight px-4 py-3">
            <p className="font-bold text-fw-success">200 · Request served</p>
          </div>
        ) : (
          <div className="rounded-xl bg-fw-errorLight px-4 py-3">
            <p className="font-bold text-fw-error">403 · Request denied</p>
            {row.reason && <p className="mt-1 text-fw-body">{row.reason}</p>}
          </div>
        )}

        <section>
          <h4 className="mb-2 font-bold text-fw-heading">Request details</h4>
          <dl>
            <Fact label="Time" value={row.time} />
            <Fact label="Identity" value={row.identity} />
            <Fact label="Model" value={row.model} />
            <Fact label="Provider" value={row.provider} />
            <Fact label="Route" value={row.route} />
          </dl>
        </section>

        <section>
          <h4 className="mb-2 font-bold text-fw-heading">Metrics</h4>
          <dl>
            <Fact label="Tokens" value={row.tokens > 0 ? fmtTokens(row.tokens) : '0'} />
            <Fact label="TTFT" value={row.ok ? `${Math.round(row.ttftMs)}ms` : '·'} />
          </dl>
        </section>

        <section>
          <h4 className="mb-2 font-bold text-fw-heading">Cost breakdown</h4>
          {row.ok ? (
            <dl>
              <Fact label="Cost" value={fmtUsd(row.cost)} />
              <Fact label="External pricing would have charged" value={fmtUsd(external)} />
              {statesSaving && (
                <Fact
                  label="Saved"
                  value={`${fmtUsd(row.costSaved)} (${row.savedPct}%)`}
                  tone="savings"
                />
              )}
            </dl>
          ) : (
            <dl>
              <Fact label="Metered" value={fmtUsd(0)} />
            </dl>
          )}
          {!row.ok && (
            <p className="mt-2 text-fw-bodyLight">
              Nothing was metered for this request. Denied requests never reach a
              model, so no tokens and no spend accrue.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function Fact({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'savings';
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-fw-secondary py-2 last:border-b-0">
      <dt className="text-fw-bodyLight">{label}</dt>
      <dd
        className={`text-right ${tone === 'savings' ? 'font-bold text-fw-success' : 'text-fw-body'}`}
      >
        {value}
      </dd>
    </div>
  );
}
