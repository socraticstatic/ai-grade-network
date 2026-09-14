import { useRef, useState } from 'react';
import { useCloudControl, useCloudControlActions } from '../../engine/react/useCloudControl';

export function SteerToSave() {
  const cc = useCloudControlActions();
  const advisor = useCloudControl(c => c.routeAdvisor());
  const [captured, setCaptured] = useState(0);
  // Double-click guard: a flow's savings are captured at most once per
  // session, even if a stale rec is clicked twice before re-render.
  const capturedFlowIds = useRef(new Set<string>());
  const steers = advisor.recommendations.filter(r => r.action === 'steer');

  const steer = (rec: (typeof steers)[number]) => {
    if (capturedFlowIds.current.has(rec.flowId)) return;
    // "Captured" must equal the ACTUAL realized bill delta, not a re-normalized
    // estimate: read the engine's total before and after the steer. The billing
    // engine (egress) is now steer-aware, so a steered public flow really drops
    // egress.total — this reconciles the headline with the invoice by construction.
    const before = cc.egress().total;
    if (rec.pathId && cc.steerFlow(rec.flowId, rec.pathId)) {
      capturedFlowIds.current.add(rec.flowId);
      const after = cc.egress().total;
      setCaptured(c => c + (before - after));
    }
  };

  return (
    <section aria-labelledby="sts-h">
      <h2 id="sts-h" className="text-sm font-semibold text-fw-heading">Steer to save</h2>
      {captured > 0 && (
        // Row 76 of the phase-0 metric audit: same "session" problem as
        // ArbitrageBreakdown's row 72 — copy only.
        <p className="mt-1 text-xs font-medium text-fw-success" role="status">
          ${captured.toLocaleString()}/mo captured so far
        </p>
      )}
      <ul className="mt-2 space-y-2">
        {/* Not "nothing left on the table": the arbitrage hero above states
            "$Xk/mo more on the table — attach the paths below" whenever an
            unattached bucket remains, and the two are different questions.
            This list is about STEERING flows that already have a path; the
            hero is about ATTACHING paths that do not exist yet. One screen
            cannot use the same idiom for both and mean either. */}
        {steers.length === 0 && (
          <li className="text-sm text-fw-bodyLight">Every flow is already on its optimal path — there is nothing left to steer.</li>
        )}
        {steers.map(r => (
          <li key={r.id} className="rounded-lg border border-fw-secondary bg-white p-3">
            <div className="text-sm text-fw-heading">{r.title}</div>
            <div className="mt-0.5 text-xs text-fw-bodyLight">{r.detail}</div>
            <button onClick={() => steer(r)}
              className="mt-2 rounded-md bg-fw-ctaPrimary px-3 py-1.5 text-xs font-medium text-white hover:bg-fw-ctaPrimaryHover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fw-link">
              Steer to save
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
