import { useState } from 'react';
import { Info } from 'lucide-react';

/**
 * "Value on top, evidence below" — the deck's design rule, as one shared
 * affordance instead of a per-screen habit.
 *
 * A headline figure states the value in the customer's language; a single
 * click opens the evidence that produced it. Every line the caller passes
 * must be engine-derived — this component renders what it is given and
 * invents nothing, which is the only way the popover can be trusted as
 * proof rather than decoration.
 */
export function WhyFigure({
  value,
  label,
  evidence,
  source,
  testid,
}: {
  value: string;
  label: string;
  /** Each line: what it is, and the number behind it. */
  evidence: { label: string; value: string }[];
  /** Where the numbers come from, stated plainly. */
  source?: string;
  testid?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = `why-${testid ?? label.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div data-testid={testid}>
      <div className="text-figma-2xl font-bold tabular-nums tracking-[-0.02em] text-fw-heading">{value}</div>
      <div className="mt-0.5 text-figma-sm text-fw-bodyLight">{label}</div>
      {evidence.length > 0 && (
        <>
          <button
            type="button"
            aria-expanded={open}
            aria-controls={id}
            data-testid={testid ? `${testid}-why` : undefined}
            onClick={() => setOpen(o => !o)}
            className="mt-1.5 inline-flex items-center gap-1.5 text-figma-xs font-medium text-fw-link hover:underline"
          >
            <Info size={13} aria-hidden="true" />
            {open ? 'Hide the evidence' : 'Why this number'}
          </button>
          {open && (
            <div id={id} className="mt-2 rounded-lg bg-fw-wash px-3 py-2">
              <ul className="space-y-1">
                {evidence.map(e => (
                  <li key={e.label} className="flex items-baseline justify-between gap-3 text-figma-xs">
                    <span className="text-fw-bodyLight">{e.label}</span>
                    <span className="font-semibold tabular-nums text-fw-body">{e.value}</span>
                  </li>
                ))}
              </ul>
              {source && <p className="mt-1.5 text-[11px] leading-snug text-fw-bodyLight">{source}</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
