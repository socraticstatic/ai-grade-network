/** GA monthly rate estimates by bandwidth tier (mock figures; the billing system of
 *  record owns real amounts — the portal displays, never calculates). */
const MONTHLY_RATE_BY_MBPS: Record<number, number> = {
  1000: 999,
  2000: 1999,
  5000: 3499,
  10000: 5999,
  20000: 10999,
  50000: 22999,
  100000: 39999,
};

export function estimateMonthlyRate(mbps: number): number {
  return MONTHLY_RATE_BY_MBPS[mbps] ?? Math.round((mbps / 1000) * 999);
}

export function formatUsd(amount: number): string {
  return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

/** Upgrade is penalty-free; downgrade carries a change fee (contract asymmetry — GA notes). */
export function changeDirection(currentMbps: number, newMbps: number): 'upgrade' | 'downgrade' | 'none' {
  if (newMbps > currentMbps) return 'upgrade';
  if (newMbps < currentMbps) return 'downgrade';
  return 'none';
}

/** Mock figure in the shape of the real thing: flat base + 10% of the monthly-rate delta.
 *  The real amount comes from the billing system of record — the portal only displays it. */
export function downgradeChangeFee(currentMbps: number, newMbps: number): number {
  const delta = Math.max(0, estimateMonthlyRate(currentMbps) - estimateMonthlyRate(newMbps));
  return 500 + Math.round(delta * 0.1);
}

/** Mock: 50% of the remaining commitment. Zero for month-to-month or a served term. */
export function earlyTerminationCharge(mbps: number, monthsRemaining: number): number {
  if (monthsRemaining <= 0) return 0;
  return Math.round(estimateMonthlyRate(mbps) * monthsRemaining * 0.5);
}

/** Monthly cost estimate for any connection: LMCC uses the GA rate card; others fall back
 *  to their billing total or a bandwidth-derived estimate. Display-only, mock figures. */
export function getMonthlyCost(c: { bandwidth?: string; billing?: any; configuration?: any }): number | null {
  const m = String(c.bandwidth ?? '').match(/([\d.]+)\s*(G|M)bps/i);
  const mbps = m ? (m[2].toUpperCase() === 'G' ? parseFloat(m[1]) * 1000 : parseFloat(m[1])) : null;
  if (c.configuration?.isLmcc && mbps) return estimateMonthlyRate(mbps);
  if (typeof c.billing?.total === 'number' && c.billing.total > 0) return Math.round(c.billing.total);
  return mbps ? estimateMonthlyRate(mbps) : null;
}

/** Term commitment discounts (mock figures shaped like the real card — the billing
 *  system of record owns actual rates). Month-to-month and trial earn nothing. */
const TERM_DISCOUNT_BY_TERM: Record<string, number> = {
  'fixed-12': 0.05,
  'fixed-24': 0.10,
  'fixed-36': 0.15,
};

export function termDiscountRate(term: string): number {
  return TERM_DISCOUNT_BY_TERM[term] ?? 0;
}

/** Volume discount on total committed bandwidth across billable connections. */
export function volumeDiscountRate(totalMbps: number): number {
  if (totalMbps >= 100000) return 0.10;
  if (totalMbps >= 50000) return 0.05;
  if (totalMbps >= 20000) return 0.03;
  return 0;
}

export interface LedgerLine {
  id: string;
  name: string;
  type: string;
  term: string;
  monthly: number;
  startedAt?: string;
  renewsAt?: string;
  isLmcc: boolean;
}

export interface AccountLedger {
  lines: LedgerLine[];
  subtotal: number;
  termDiscount: number;
  volumeDiscount: number;
  total: number;
  committedMbps: number;
}

const TERM_MONTHS: Record<string, number> = { 'fixed-12': 12, 'fixed-24': 24, 'fixed-36': 36 };

function parseMbps(bandwidth?: string): number {
  const m = String(bandwidth ?? '').match(/([\d.]+)\s*(G|M)bps/i);
  return m ? (m[2].toUpperCase() === 'G' ? parseFloat(m[1]) * 1000 : parseFloat(m[1])) : 0;
}

/** Account-level ledger: one line per billable (Live) connection, then term and volume
 *  discounts as line items that subtract from the total. Billing starts at Live, so
 *  pending/expired/deleting connections never appear. Display-only mock figures. */
export function buildAccountLedger(connections: Array<{
  id: string; name: string; type?: string; status?: string; bandwidth?: string;
  billing?: any; configuration?: any; createdAt?: string;
}>): AccountLedger {
  const lines: LedgerLine[] = [];
  let termDiscount = 0;
  let committedMbps = 0;

  for (const c of connections) {
    if (c.status !== 'Active') continue;
    const monthly = getMonthlyCost(c);
    if (monthly == null) continue;
    const term = String(c.configuration?.lmccContractTerm ?? c.configuration?.lmccContractType ?? 'monthly');
    const months = TERM_MONTHS[term];
    let renewsAt: string | undefined;
    if (months && c.createdAt) {
      const d = new Date(c.createdAt);
      d.setMonth(d.getMonth() + months);
      renewsAt = d.toISOString();
    }
    lines.push({
      id: c.id, name: c.name, type: c.type ?? '—', term, monthly,
      startedAt: c.createdAt, renewsAt, isLmcc: c.configuration?.isLmcc === true,
    });
    termDiscount += Math.round(monthly * termDiscountRate(term));
    committedMbps += parseMbps(c.bandwidth);
  }

  const subtotal = lines.reduce((sum, l) => sum + l.monthly, 0);
  const volumeDiscount = Math.round((subtotal - termDiscount) * volumeDiscountRate(committedMbps));
  return { lines, subtotal, termDiscount, volumeDiscount, total: subtotal - termDiscount - volumeDiscount, committedMbps };
}
