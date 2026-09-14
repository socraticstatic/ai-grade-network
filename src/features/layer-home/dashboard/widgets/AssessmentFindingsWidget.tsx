import { ClipboardCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { WidgetFrame } from '../WidgetFrame';
import type { LayerWidgetProps } from '../registry';
import { useCloudControlLive } from '../../../../engine/react/useCloudControl';

export function AssessmentFindingsWidget(_props: LayerWidgetProps) {
  const kpis = useCloudControlLive(cc => {
    const r = cc.assessmentReport();
    // Row 8 of the phase-0 metric audit: "Recoverable" cut — a third noun
    // for the same $19,900/mo the board already leads with under "Money on
    // the table" (row 1) and states again under "Still on the table" (row
    // 7, also cut). `assessmentReport().recoverableMo` keeps its other
    // consumer in AssessmentPage.tsx.
    return [
      /* Row 9 of the audit: the count was true but went nowhere - the same
         violations are listed on Govern. `to` gives it the outbound route
         the row was missing, which is what the row failed on (T2), not
         its wording. */
      { label: 'open security findings', value: String(r.securityEvents), to: '/naas/govern' },
      // Row 10 of the phase-0 metric audit: "Invisible share" named a
      // fraction of nothing stated. Same figure, no new derivation — the
      // label now completes the sentence the big number starts.
      { label: 'of traffic you cannot see', value: `${Math.round(r.invisibleSharePct)}%`, to: undefined },
    ];
  });
  return (
    <WidgetFrame title="What the assessment found" icon={ClipboardCheck}>
      <div className="flex flex-col gap-3">
        {kpis.map(k => {
          const body = (
            <>
              <div className="text-figma-xl font-bold tabular-nums tracking-[-0.02em] text-fw-heading">{k.value}</div>
              <div className="text-figma-sm text-fw-bodyLight mt-0.5">{k.label}</div>
            </>
          );
          return k.to ? (
            <Link
              key={k.label}
              to={k.to}
              data-testid="assessment-kpi"
              className="min-w-0 rounded-lg transition-colors hover:bg-fw-wash"
            >
              {body}
            </Link>
          ) : (
            <div key={k.label} data-testid="assessment-kpi" className="min-w-0">
              {body}
            </div>
          );
        })}
      </div>
    </WidgetFrame>
  );
}
