import { useState } from 'react';
import { Check, MessageCircle, Search } from 'lucide-react';
import type { ScanStep } from '../discover/wizardModel';
import type { Finding, FindingKind } from './advisorModel';
import type { AdvisorPhase } from './advisorPhase';
import { advisorSuggestions, type AndiAction, type AndiAnswer } from '../andi/andiBrain';

const money = (n: number) => `$${Math.round(n).toLocaleString()}`;
const plural = (n: number, word: string, pluralWord = `${word}s`) => (n === 1 ? word : pluralWord);

/** Count phrasing per finding kind, used only when the finding carries no
 *  price (savingsMo null or 0) — see chipLabel below. */
const CHIP_COUNT_LABEL: Record<FindingKind, (n: number) => string> = {
  'untracked-ai': n => `${n} untagged AI ${plural(n, 'workload')}`,
  'unattached-regions': n => `${n} unattached ${plural(n, 'region')}`,
  'egress-bleed': n => `${n} ${plural(n, 'flow')} off the fabric`,
  'exposed-spof': n => `${n} exposed or single-path`,
};

/** A chip is a label, not a paragraph: one number, never two that could
 *  read as disagreeing. A priced finding states the money ("$36,400/mo
 *  attachable"); an unpriced one states the count against a short noun
 *  ("4 untagged AI workloads") — never `finding.title`/`finding.evidence`,
 *  which are full sentences meant for the card, not a pill. */
function chipLabel(f: Finding): string {
  if (f.savingsMo !== null && f.savingsMo > 0) return `${money(f.savingsMo)}/mo attachable`;
  return CHIP_COUNT_LABEL[f.kind](f.count);
}

export interface AdvisorRailProps {
  phase: AdvisorPhase;
  steps: ScanStep[];
  scanIdx: number;
  findings: Finding[];
  /** Routes a question through andiBrain — the same `andiAnswer(cc, q, …)`
   *  the app-wide Andi panel calls, with `cc` closed over by the caller
   *  (AdvisorPage owns the engine handle; this component stays a pure view
   *  layer over it). Synchronous: every answer is computed at ask time. */
  ask: (question: string) => AndiAnswer;
  /** Runs a 'navigate' action's destination — AdvisorPage owns the router
   *  handle, same split as `ask` above. */
  onNavigate: (to: string) => void;
}

interface RailEntry {
  question: string;
  answer: AndiAnswer;
}

/**
 * The narration pane: the scan theater's checklist while it runs, the
 * evidence chips the instant the estate is ready (they land here before
 * FindingCard's own stagger in the canvas finishes — this list carries no
 * stagger of its own), and the chat input. `data-testid="advisor-seeded-
 * question"` marks the three seeded chips (sourced from `andiBrain`'s
 * `advisorSuggestions()` — single source of truth with the brain that
 * answers them); clicking one, or submitting free text, routes through
 * `ask` and renders the answer below as a bubble in the same narration-
 * list idiom the scan checklist above uses.
 */
export function AdvisorRail({ phase, steps, scanIdx, findings, ask, onNavigate }: AdvisorRailProps) {
  const ready = phase === 'ready';
  const [inputValue, setInputValue] = useState('');
  const [entries, setEntries] = useState<RailEntry[]>([]);

  const submit = (raw: string) => {
    if (!ready) return;
    const question = raw.trim();
    if (!question) return;
    setEntries(prev => [...prev, { question, answer: ask(question) }]);
  };

  const runAction = (action: AndiAction) => {
    if (action.kind === 'navigate' && action.to) onNavigate(action.to);
    else if (action.kind === 'ask' && action.prompt) submit(action.prompt);
    else if (action.kind === 'run' && action.run) action.run();
  };

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
                className="inline-flex items-center rounded-full border border-fw-secondary bg-fw-wash px-2.5 py-1 text-[11px] font-medium text-fw-body whitespace-nowrap"
              >
                {chipLabel(f)}
              </span>
            ))}
          </div>
        )}

        {phase === 'observe' && (
          <p className="text-figma-xs text-fw-bodyLight">The advisor narrates each step here as it works.</p>
        )}
      </div>

      <div className="rounded-2xl border border-fw-secondary bg-fw-base p-3 space-y-2">
        <form
          onSubmit={e => {
            e.preventDefault();
            submit(inputValue);
            setInputValue('');
          }}
        >
          <input
            type="text"
            disabled={!ready}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            aria-label={ready ? 'Ask about your recommendation' : 'Building your recommendation'}
            placeholder={ready ? 'Ask about your recommendation…' : 'Building your recommendation…'}
            className="w-full rounded-lg border border-fw-secondary bg-fw-wash px-3 py-2 text-figma-sm text-fw-heading outline-none transition-colors focus:ring-2 focus:ring-fw-link/40 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </form>
        <div className="flex flex-wrap gap-1.5">
          {advisorSuggestions().map(q => (
            <button
              key={q}
              type="button"
              disabled={!ready}
              data-testid="advisor-seeded-question"
              onClick={() => submit(q)}
              className="rounded-full border border-fw-secondary bg-fw-wash px-2.5 py-1 text-[11px] font-medium text-fw-body disabled:cursor-not-allowed disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>

        {entries.length > 0 && (
          <ul className="space-y-2 pt-1" aria-live="polite" data-testid="advisor-answer-log">
            {entries.map((entry, i) => (
              <li
                key={i}
                data-testid="advisor-answer"
                className="space-y-1.5 rounded-lg border border-fw-secondary bg-fw-wash p-2"
              >
                <p className="text-[11px] font-semibold text-fw-heading">{entry.question}</p>
                {entry.answer.html ? (
                  // Engine-authored HTML only (CC.answerFor) — user input is
                  // matched against known questions, never interpolated.
                  <div
                    className="text-figma-xs text-fw-bodyLight leading-relaxed [&_b]:text-fw-heading"
                    dangerouslySetInnerHTML={{ __html: entry.answer.html }}
                  />
                ) : (
                  <p className="text-figma-xs text-fw-bodyLight leading-relaxed">{entry.answer.text}</p>
                )}
                {entry.answer.actions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {entry.answer.actions.map(a => (
                      <button
                        key={a.label}
                        type="button"
                        data-testid="advisor-answer-action"
                        onClick={() => runAction(a)}
                        className="rounded-lg border border-fw-secondary bg-fw-base px-2 py-1 text-[11px] font-medium text-fw-heading hover:border-fw-active"
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
