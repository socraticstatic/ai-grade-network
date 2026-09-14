import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { FlowStepper } from './FlowStepper';

export interface FlowBarCta {
  /** Button copy — the promise of the next stage ("Govern these paths"). */
  label: string;
  /** If set, the CTA is a react-router Link to this route. */
  to?: string;
  /** If set (and no `to`), the CTA is a button firing this handler. */
  onClick?: () => void;
}

/* One confident accent: cobalt fill, white copy, forward arrow. Subtle hover
   (darken + a 1px lift) and a focus-visible ring keep it accessible and quiet
   until reached. The stepper to its left stays recessive. */
const CTA_CLASS =
  'group inline-flex items-center gap-2 rounded-lg bg-[#0057b8] px-4 py-2 text-[13px] font-semibold text-white shadow-sm ' +
  'transition-all duration-150 ease-out hover:bg-[#00478f] hover:-translate-y-px hover:shadow-md ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0057b8]/40 focus-visible:ring-offset-2';

function CtaBody({ label }: { label: string }) {
  return (
    <>
      <span>{label}</span>
      <ArrowRight
        size={16}
        aria-hidden="true"
        className="transition-transform duration-150 ease-out group-hover:translate-x-0.5"
      />
    </>
  );
}

/**
 * The flow-forward band that sits directly under each page header: the
 * persistent `<FlowStepper />` on the left, one primary next-step CTA on the
 * right. Wraps gracefully on narrow widths — the stepper reflows above the CTA.
 */
export function FlowBar({ cta }: { cta?: FlowBarCta }) {
  let action: ReactNode = null;
  if (cta) {
    action = cta.to ? (
      <Link to={cta.to} className={CTA_CLASS}>
        <CtaBody label={cta.label} />
      </Link>
    ) : (
      <button type="button" onClick={cta.onClick} className={CTA_CLASS}>
        <CtaBody label={cta.label} />
      </button>
    );
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-[#e9edf2] pb-4">
      <div className="min-w-0 flex-1">
        <FlowStepper />
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
