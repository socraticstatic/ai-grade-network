/**
 * Savings estimation, rebased on the engine's own economics.
 *
 * The engine's egress() model is a fixed set of $/mo buckets, not a
 * rate × volume integral — so a nominal Gbps→GB/mo constant produces
 * "savings" untethered from (and easily exceeding) the invoice. Instead,
 * each steer recommendation is valued as its share of the invoice's
 * ACTUAL public egress dollars: the flow's fraction of total public gbps,
 * scaled by the fractional per-GB discount (dCostPerGb / perGbCurrent).
 * By construction the sum over all steer recs can never exceed public
 * spend, so "Savings identified" always reads coherently against the
 * invoice's public egress line.
 */

// Public-exposure alert threshold. Mirrors the engine's forecast elbow in
// state-billing.ts egress(): pub > 6000 flips the forecast from '-4%' to '+3%'.
export const PUBLIC_EXPOSURE_ALERT_USD = 6000;

export type SavingsRec = {
  id: string;
  action: 'steer' | 'diversify';
  dCostPerGb: number;
  perGbCurrent: number;
  gbps: number;
};

/** Total gbps currently riding public (not AT&T-controlled) paths. */
export function publicGbps(flows: { gbps: number; current: { attControlled: boolean } }[]): number {
  return flows.filter(f => !f.current.attControlled).reduce((s, f) => s + f.gbps, 0);
}

export function estimateMonthlySavings(
  recs: SavingsRec[],
  publicSpendPerMo: number,
  publicGbpsTotal: number,
): number {
  return Math.round(recs
    .filter(r => r.action === 'steer')
    .reduce((s, r) => {
      if (r.perGbCurrent <= 0) return s;
      const share = publicGbpsTotal > 0 ? r.gbps / publicGbpsTotal : 0;
      return s + publicSpendPerMo * share * (r.dCostPerGb / r.perGbCurrent);
    }, 0));
}

// Parse the engine's rec.detail ("… −$0.07/GB") + flow volume/current rate
// into a SavingsRec.
export function toSavingsRec(
  rec: { id: string; flowId: string; action: 'steer' | 'diversify'; detail: string },
  flows: { id: string; gbps: number; current: { attControlled: boolean; egressPerGb?: number } }[],
): SavingsRec {
  const m = rec.detail.match(/\$([0-9.]+)\/GB/);
  const flow = flows.find(f => f.id === rec.flowId);
  return {
    id: rec.id,
    action: rec.action,
    dCostPerGb: m ? parseFloat(m[1]) : 0,
    perGbCurrent: flow?.current.egressPerGb ?? 0.09,
    gbps: flow?.gbps ?? 0,
  };
}
