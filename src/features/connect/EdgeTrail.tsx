import { ChevronRight, CornerLeftUp } from 'lucide-react';
import type { EdgeDrill } from './edgeDrill';

/**
 * The ingress column's breadcrumb.
 *
 * Every drill on this product is reversible in one click and says where you
 * are standing — the sankey has one, Discover's tree has one, and a column
 * that descends 4,183 sites needs one more than either. The last hop is the
 * current level and is not a button.
 *
 * `highlight` fires once, on the viewer's first descent: a small line of
 * grey text above a large diagram is easy to miss, and someone who cannot
 * find the way back reads a drill as a dead end. It calls attention to
 * itself exactly when the affordance first becomes useful, then gets out of
 * the way for good.
 */
export function EdgeTrail({
  trail,
  caption,
  onGo,
  highlight = false,
}: {
  trail: { label: string; drill: EdgeDrill }[];
  caption: string;
  onGo: (drill: EdgeDrill) => void;
  highlight?: boolean;
}) {
  return (
    <div
      data-trail-highlight={highlight ? 'on' : undefined}
      className={`-mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg text-figma-xs transition-all duration-500 ${
        highlight
          ? 'bg-fw-ctaPrimary/[0.07] px-2.5 py-2 ring-2 ring-fw-link/45'
          : 'px-0 py-0 ring-0'
      }`}
    >
      <nav aria-label="Site drill-down" className="flex items-center gap-1">
        {trail.map((hop, i) => {
          const last = i === trail.length - 1;
          return (
            <span key={`${hop.label}-${i}`} className="flex items-center gap-1">
              {i > 0 && <ChevronRight size={12} className="text-fw-bodyLight" aria-hidden="true" />}
              {last ? (
                <span aria-current="page" className="font-semibold text-fw-heading">{hop.label}</span>
              ) : (
                <button
                  type="button"
                  onClick={() => onGo(hop.drill)}
                  className={`rounded underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-fw-link/50 ${
                    highlight ? 'font-semibold text-fw-link underline' : 'text-fw-link'
                  }`}
                >
                  {hop.label}
                </button>
              )}
            </span>
          );
        })}
      </nav>
      <span className="text-fw-bodyLight">{caption}</span>
      {highlight && (
        <span role="status" className="flex items-center gap-1 font-medium text-fw-link">
          <CornerLeftUp size={12} aria-hidden="true" />
          Step back up here any time
        </span>
      )}
    </div>
  );
}
