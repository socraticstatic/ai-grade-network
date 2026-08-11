import { Check, MessageCircle, Search } from 'lucide-react';
import type { ScanStep } from '../discover/wizardModel';
import type { Finding } from './advisorModel';
import type { AdvisorPhase } from './advisorPhase';

const SEEDED_QUESTIONS = ['Why this finding?', 'How much do I save?', 'What is NetBond Adv?'];

export interface AdvisorRailProps {
  phase: AdvisorPhase;
  steps: ScanStep[];
  scanIdx: number;
  findings: Finding[];
}

/**
 * The narration pane: the scan theater's checklist while it runs, the
 * evidence chips the instant the estate is ready (they land here before
 * FindingCard's own stagger in the canvas finishes — this list carries no
 * stagger of its own), and the chat input — presentational only in this
 * task. `data-testid="advisor-seeded-question"` marks the three seeded
 * chips Task 6 wires to `andiBrain`; here they are disabled placeholders,
 * same as the input itself before the estate is ready.
 */
export function AdvisorRail({ phase, steps, scanIdx, findings }: AdvisorRailProps) {
  const ready = phase === 'ready';

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-fw-secondary bg-fw-base p-4 space-y-3">
        <p className="flex items-center gap-1.5 text-figma-sm font-semibold text-fw-heading">
          <MessageCircle size={15} className="text-fw-link" aria-hidden="true" /> Advisor
        </p>

        {(phase === 'scanning' || phase === 'ready') && steps.length > 0 && (
          <ul className="space-y-1.5" aria-live="polite" data-testid="advisor-scan-narration">
            {steps.map((s, i) => {
              const complete = i < scanIdx || ready;
              const active = i === scanIdx && phase === 'scanning';
              return (
                <li
                  key={s.regionId}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-all ${
                    complete
                      ? 'border-fw-success/40 bg-fw-successLight text-fw-success'
                      : active
                        ? 'border-fw-active bg-fw-ctaPrimary/[0.04] text-fw-heading'
                        : 'border-fw-secondary text-fw-bodyLight opacity-60'
                  }`}
                >
                  {complete ? (
                    <Check size={13} className="shrink-0" aria-hidden="true" />
                  ) : active ? (
                    <Search size={13} className="shrink-0" aria-hidden="true" />
                  ) : (
                    <span className="inline-block h-3 w-3 shrink-0 rounded-full border border-current" aria-hidden="true" />
                  )}
                  <span className="truncate">{s.label}</span>
                </li>
              );
            })}
          </ul>
        )}

        {ready && (
          <div className="flex flex-wrap gap-1.5" data-testid="advisor-evidence-chips">
            {findings.map(f => (
              <span
                key={f.kind}
                className="inline-flex items-center rounded-full border border-fw-secondary bg-fw-wash px-2.5 py-1 text-[11px] font-medium text-fw-body"
              >
                {f.count} · {f.title}
              </span>
            ))}
          </div>
        )}

        {phase === 'observe' && (
          <p className="text-figma-xs text-fw-bodyLight">The advisor narrates each step here as it works.</p>
        )}
      </div>

      <div className="rounded-2xl border border-fw-secondary bg-fw-base p-3 space-y-2">
        <input
          type="text"
          disabled={!ready}
          placeholder={ready ? 'Ask about your recommendation…' : 'Building your recommendation…'}
          className="w-full rounded-lg border border-fw-secondary bg-fw-wash px-3 py-2 text-figma-sm text-fw-heading outline-none transition-colors focus:ring-2 focus:ring-fw-link/40 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <div className="flex flex-wrap gap-1.5">
          {SEEDED_QUESTIONS.map(q => (
            <button
              key={q}
              type="button"
              disabled={!ready}
              data-testid="advisor-seeded-question"
              className="rounded-full border border-fw-secondary bg-fw-wash px-2.5 py-1 text-[11px] font-medium text-fw-body disabled:cursor-not-allowed disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
