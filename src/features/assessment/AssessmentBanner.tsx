import { useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { useCloudControl } from '../../engine/react/useCloudControl';

/**
 * The funnel's front door on Discover. Three states, none of them a wall:
 * not-started invites, measuring states the day, report/closed points at
 * the findings. Dismissal is session state only - the funnel is a path,
 * not a gate, and the portal stays fully usable throughout.
 */
export function AssessmentBanner() {
  const a = useCloudControl(cc => cc.assessment());
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || a.stage === 'closed') return null;

  const copy =
    a.stage === 'not-started'
      ? {
          text: 'Not sure what AI traffic you have? Measure for 14 days first. Nothing is blocked or routed while it runs.',
          cta: 'Start the assessment',
        }
      : a.stage === 'measuring'
        ? {
            text: `The assessment is measuring - day ${a.day} of 14.`,
            cta: 'See the counters',
          }
        : {
            text: 'Your 14-day assessment report is ready.',
            cta: 'Read the report',
          };

  return (
    <div
      data-testid="assessment-banner"
      className="flex flex-wrap items-center gap-3 rounded-2xl border border-fw-secondary bg-fw-wash px-4 py-3"
    >
      {/* min-w forces the CTA onto its own line in a narrow rail rather than
          squeezing this sentence into a four-line column beside it. */}
      <p className="min-w-[14rem] flex-1 text-figma-sm text-fw-body">{copy.text}</p>
      <Link
        to="/assessment"
        data-testid="assessment-banner-cta"
        className="rounded-full bg-fw-ctaPrimary px-4 py-1.5 text-figma-sm font-medium text-white hover:bg-fw-ctaPrimaryHover"
      >
        {copy.cta}
      </Link>
      <button
        type="button"
        aria-label="Dismiss the assessment banner"
        onClick={() => setDismissed(true)}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-fw-bodyLight hover:bg-fw-base hover:text-fw-body"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
