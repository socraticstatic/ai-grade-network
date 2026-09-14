import type { CloudControl } from '../../../engine/types';
import { aiSpendRows, aiSpendTotals, type AiSpendRow } from '../aiSpend';
import { providerName } from './insightsFigures';

/**
 * The Cost tab's read side. Numbers only - money renders through fmtUsd at
 * the component, so a card and a KPI stating the same figure format it the
 * same way by construction.
 *
 * Monthly projections are today's engine figures times 30. That is a stated
 * projection basis, not a hidden constant: every card that shows a monthly
 * number derives it from the same aiSpend day figures the rest of the layer
 * states, and the card copy names the basis.
 */

/** Stated in the caching card's own copy - single source for the claim. */
export const CACHE_HIT_RATE = 0.35;

const DAYS = 30;

export interface RoutingCard {
  achieved: boolean;
  currentMonthly: number;
  routedMonthly: number;
  savingMonthly: number;
}

export function routingCard(cc: CloudControl): RoutingCard {
  const totals = aiSpendTotals(cc);
  const currentMonthly = totals.spendIfExternal * DAYS;
  const routedMonthly = totals.spendToday * DAYS;
  return {
    achieved: cc.gatewayFlags().routing,
    currentMonthly,
    routedMonthly,
    savingMonthly: Math.max(0, currentMonthly - routedMonthly),
  };
}

export interface CachingCard {
  achieved: boolean;
  perModel: { model: string; monthly: number; cachedMonthly: number }[];
  savingMonthly: number;
}

export function cachingCard(cc: CloudControl): CachingCard {
  const rows = aiSpendRows(cc);
  const byModel = new Map<string, number>();
  rows.forEach(r => byModel.set(r.modelName, (byModel.get(r.modelName) ?? 0) + r.spendToday * DAYS));
  const perModel = Array.from(byModel.entries())
    .map(([model, monthly]) => ({
      model,
      monthly,
      cachedMonthly: monthly * (1 - CACHE_HIT_RATE),
    }))
    .sort((a, b) => b.monthly - a.monthly);
  return {
    achieved: cc.gatewayFlags().caching,
    perModel,
    savingMonthly: perModel.reduce((s, m) => s + (m.monthly - m.cachedMonthly), 0),
  };
}

export interface BudgetTrack {
  budgetMonthly: number;
  /** Cumulative $ across the engine's 24-point token window, per identity price. */
  spentSeries: number[];
  predictedMonthly: number;
  overBudget: boolean;
}

const SERIES_POINTS = 24;

export function budgetTrack(cc: CloudControl): BudgetTrack {
  const rows = aiSpendRows(cc);
  const budgetMonthly = rows.reduce(
    (s, r) => s + (r.budgetTokens / 1_000_000) * r.price * DAYS,
    0,
  );
  const perPoint = Array.from({ length: SERIES_POINTS }, (_, i) =>
    rows.reduce((s, r) => {
      const series = cc.tokenSeries(r.tag, SERIES_POINTS) as number[];
      return s + ((series[i] ?? 0) / 1_000_000) * r.price;
    }, 0),
  );
  const spentSeries: number[] = [];
  perPoint.reduce((acc, v) => {
    const next = acc + v;
    spentSeries.push(next);
    return next;
  }, 0);
  const windowTotal = spentSeries[spentSeries.length - 1] ?? 0;
  /* The 24-point window is the engine's one derived day; a month is 30 of it. */
  const predictedMonthly = windowTotal * DAYS;
  return {
    budgetMonthly,
    spentSeries,
    predictedMonthly,
    overBudget: budgetMonthly > 0 && predictedMonthly > budgetMonthly,
  };
}

export interface TeamCard {
  tag: string;
  spendToday: number;
  /** Spend vs the average identity, in percent. 0 when nothing has metered. */
  vsAvgPct: number;
  driver: string;
  budgetPct: number;
}

export function teamCards(cc: CloudControl): TeamCard[] {
  const rows = aiSpendRows(cc);
  const avg = rows.length ? rows.reduce((s, r) => s + r.spendToday, 0) / rows.length : 0;
  return rows
    .map(r => ({
      tag: r.tag,
      spendToday: r.spendToday,
      vsAvgPct: avg > 0 ? Math.round(((r.spendToday - avg) / avg) * 100) : 0,
      driver: r.modelName,
      budgetPct: r.pct,
    }))
    .sort((a, b) => b.spendToday - a.spendToday);
}

export interface ProviderShare {
  provider: string;
  color: string;
  spend: number;
  pct: number;
}

const PROVIDER_COLORS: Record<string, string> = {
  CoreWeave: '#009fdb',
  Nebius: '#00388f',
  'OpenAI (external)': '#00c9ff',
};
const EXTRA_COLORS = ['#49eedc', '#5b3bee'];

function shareOf(
  cc: CloudControl,
  rows: AiSpendRow[],
  basis: (r: AiSpendRow) => number,
): ProviderShare[] {
  /* The catalog owns the model -> cloud fact; restating it here as a literal
     map is how a fourth provider would silently land in the wrong bucket. */
  const catalog = cc.modelCatalog() as { id: string; cloud: string | null }[];
  const byProvider = new Map<string, number>();
  rows.forEach(r => {
    const p = providerName(catalog.find(m => m.id === r.modelId)?.cloud ?? null);
    byProvider.set(p, (byProvider.get(p) ?? 0) + basis(r));
  });
  const total = Array.from(byProvider.values()).reduce((s, v) => s + v, 0);
  let extra = 0;
  return Array.from(byProvider.entries())
    .map(([provider, spend]) => ({
      provider,
      color: PROVIDER_COLORS[provider] ?? EXTRA_COLORS[extra++ % EXTRA_COLORS.length],
      spend,
      pct: total > 0 ? Math.round((spend / total) * 100) : 0,
    }))
    .sort((a, b) => b.spend - a.spend);
}

/** Share of spend by provider; falls back to budget share before anything
 *  meters, so the seeded estate still draws a truthful proportion (of
 *  ceilings, and the component titles it that way via `basis`). */
export function providerShare(
  cc: CloudControl,
): { shares: ProviderShare[]; basis: 'spend' | 'budget' } {
  const rows = aiSpendRows(cc);
  const anySpend = rows.some(r => r.spendToday > 0);
  return anySpend
    ? { shares: shareOf(cc, rows, r => r.spendToday), basis: 'spend' }
    : { shares: shareOf(cc, rows, r => (r.budgetTokens / 1_000_000) * r.price), basis: 'budget' };
}
