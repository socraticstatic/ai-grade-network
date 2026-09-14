import { useNavigate } from 'react-router-dom';
import { PageSection } from '../../components/common/layouts';
import { AttIcon } from '../../components/icons/AttIcon';
import { useCloudControl, useCloudControlActions } from '../../engine/react/useCloudControl';
import { signal, drift, STAGES } from './netopsSignal';

/**
 * NetOps for AI — the closed loop (Observe -> Diagnose -> Recommend -> Act)
 * plus the four capability panels (Topology, Anomaly, Drift, AI-Assisted
 * Troubleshooting). React port of `~/Developer/cloud-control/js/netops.js`;
 * all data comes from the same live engine every other tab reads — no
 * parallel data model.
 */
export function NetOpsPage() {
  const navigate = useNavigate();
  const CC = useCloudControlActions();
  // one telemetry snapshot threaded through signal + panels + drift, exactly
  // as the vanilla reference does — no second recompute anywhere below.
  const t = useCloudControl(cc => cc.telemetry(56)) as any;
  const counts = useCloudControl(cc => cc.counts());
  const sim = useCloudControl(cc => cc.simImpact()) as any;

  const sig = signal(t, CC);
  const dr = drift(t);
  const an = t.anomaly;
  const stageIdx = STAGES.indexOf(sig.stage);
  const showAct = sig.active && !!sig.apply && !sig.applied();
  const showHint = !sig.active && !!sig.recLabel;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-8 space-y-6">
      <PageSection
        title="NetOps for AI"
        description="NetOps for AI — the network that acts, not just sees. The closed loop and the four capabilities it runs on."
      >
        {/* Loop banner */}
        <div className="rounded-2xl border border-fw-secondary bg-fw-base px-5 py-4 space-y-3" data-tour="netops-loop">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-figma-sm font-medium text-fw-heading">
              Observe → Diagnose → Recommend → Act
            </span>
            <span className="text-figma-sm text-fw-bodyLight">
              {sig.active ? (
                <>
                  <b className="text-fw-heading">{sig.title}</b> · live signal in the loop
                </>
              ) : (
                'closed loop · steady'
              )}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2" role="list" aria-label="NetOps closed loop stages">
            {STAGES.map((s, i) => {
              const isOn = sig.active && i === stageIdx;
              const isPast = sig.active && i < stageIdx;
              return (
                <span key={s} className="inline-flex items-center gap-2">
                  <span
                    role="listitem"
                    className={`rounded-full px-3 py-1 text-figma-xs font-medium border ${
                      isOn
                        ? 'bg-fw-primary text-fw-linkPrimary border-fw-primary'
                        : isPast
                          ? 'bg-fw-accent text-fw-link border-fw-link'
                          : 'bg-fw-wash text-fw-body border-fw-secondary'
                    }`}
                  >
                    {s}
                  </span>
                  {i < STAGES.length - 1 && (
                    <span className="text-fw-disabled" aria-hidden="true">
                      →
                    </span>
                  )}
                </span>
              );
            })}
            <span className="ml-2 text-figma-xs text-fw-bodyLight" aria-hidden="true">
              ↻ closed loop
            </span>
          </div>

          {showAct && (
            <div>
              <button
                type="button"
                onClick={() => sig.apply && sig.apply()}
                className="rounded-lg bg-fw-ctaPrimary px-4 py-2 text-figma-sm font-medium text-fw-linkPrimary hover:bg-fw-ctaPrimaryHover"
              >
                {sig.recLabel}
              </button>
            </div>
          )}

          {showHint && (
            <div className="rounded-lg bg-fw-wash px-4 py-2.5 text-figma-sm text-fw-body flex flex-wrap items-center gap-2">
              <span>
                Next hardening step · <b className="text-fw-heading">{sig.recLabel}</b>
              </span>
              <button
                type="button"
                onClick={() => navigate('/naas/govern')}
                className="text-fw-link hover:text-fw-linkHover font-medium"
              >
                Open Posture →
              </button>
            </div>
          )}
        </div>

        {/* Four capability panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-fw-secondary bg-fw-base px-5 py-4">
            <div className="flex items-center gap-2 mb-1">
              <AttIcon name="router" className="h-5 w-5 text-fw-link" />
              <h3 className="font-medium text-fw-heading">Network Topology</h3>
            </div>
            <p className="text-figma-xs text-fw-bodyLight mb-2">real-time visibility</p>
            <p className="text-figma-sm text-fw-body">
              {counts.clouds} clouds · {counts.regions} regions · {counts.vpcs} VPC/VNet across DC, cloud &amp; edge.{' '}
              {counts.attached}/{counts.vpcs} on private paths.
            </p>
          </div>

          <div className="rounded-2xl border border-fw-secondary bg-fw-base px-5 py-4">
            <div className="flex items-center gap-2 mb-1">
              <AttIcon name="firewall" className="h-5 w-5 text-fw-link" />
              <h3 className="font-medium text-fw-heading">Anomaly Detection</h3>
            </div>
            <p className="text-figma-xs text-fw-bodyLight mb-2">sharp outliers</p>
            <p className="text-figma-sm text-fw-body">
              {sim ? (
                <>
                  <b className="text-fw-error">Active: {sim.onramp.name} down</b> · {sim.vpcIds.length} VPCs degraded.
                </>
              ) : (
                <>
                  One in window: <b className="text-fw-heading">{an.title}</b>.
                </>
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-fw-secondary bg-fw-base px-5 py-4">
            <div className="flex items-center gap-2 mb-1">
              <AttIcon name="high-meter" className="h-5 w-5 text-fw-link" />
              <h3 className="font-medium text-fw-heading">Drift Detection</h3>
            </div>
            <p className="text-figma-xs text-fw-bodyLight mb-2">slow degradations</p>
            <p className="text-figma-sm text-fw-body">
              {dr.length ? (
                <>
                  {dr.length} public-path region{dr.length > 1 ? 's' : ''} trending off baseline ·{' '}
                  <b className="text-fw-heading">{dr[0].name}</b> +{dr[0].delta}ms.
                </>
              ) : (
                'No region is drifting off its baseline.'
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-fw-secondary bg-fw-base px-5 py-4">
            <div className="flex items-center gap-2 mb-1">
              <AttIcon name="question-circle" className="h-5 w-5 text-fw-link" />
              <h3 className="font-medium text-fw-heading">AI-Assisted Troubleshooting</h3>
            </div>
            <p className="text-figma-xs text-fw-bodyLight mb-2">conversational root cause</p>
            {/* sig.diagnose is trusted engine-generated HTML (obsSummary() or
                anomaly.explain()) — bold tags only, no user input reaches it. */}
            <div
              className="text-figma-sm text-fw-body leading-relaxed [&_b]:text-fw-heading [&_b]:font-semibold"
              dangerouslySetInnerHTML={{ __html: sig.diagnose }}
            />
          </div>
        </div>
      </PageSection>
    </div>
  );
}
