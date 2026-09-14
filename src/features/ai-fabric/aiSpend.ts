import type { CloudControl } from '../../engine/types';

/**
 * The single token-spend derivation for the AI Fabric.
 *
 * Two surfaces state token money: the budgets block on Teams & limits
 * (`/ai/teams`) and the Cost KPI on Insights (`/ai/observe`, via
 * `insights/insightsFigures`).
 * They read this module rather than each re-deriving the same sum, so the two
 * screens cannot drift into stating different figures for the same estate.
 *
 * Everything here is a `CC` derivation taken at call time — `tokenMeterList()`
 * for volume, budget and endpoint readiness, `agentList()` for which model an
 * identity actually invokes, `modelCatalog()` for that model's name and price.
 * No literals, no clock, no random.
 *
 * ## Four different facts, never conflated
 *
 * The engine meters an identity's tokens from `promptTrace()` whether or not
 * its endpoint is ready — agents keep issuing requests either way — so
 * `tokenMeterList()` reports a `today` that can be non-zero while `ready` is
 * false. And `ready` is NOT the path. Four facts, not one:
 *
 * - `ungovernedToday` — of today's tokens, how many were metered while this
 *                     identity's route was public. The engine books this at
 *                     meter time (`state-billing.ts`), because it is the only
 *                     moment the fact is knowable: attaching an endpoint does
 *                     not retroactively govern spend that already left.
 *                     **This, and only this, is what token spend "crossed the
 *                     public internet" means.** A count of identities on a
 *                     public route right now is a different sentence, about a
 *                     different tense.
 * - `metering`      — this identity has accrued token spend today.
 * - `endpointReady` — `tokenMeterList().ready`, i.e. `endpointReadyFor()`: the
 *                     endpoint's prerequisites are met, meaning its region is
 *                     attached AND its governance control has been applied
 *                     (`fixes.segmentHelion` / `fixes.fwInspection`). This is
 *                     what gates the engine's SERIES metering — `tickTokens`
 *                     and `tokenSeries` — and nothing else.
 *                     **Readiness gates metering, not path.**
 * - `routePath`     — `modelRoutes().path`: where an identity's requests
 *                     actually go (`private` / `governed egress` / `public`).
 *                     This, and only this, decides whether spend leaves over
 *                     the public internet. It turns on region attachment
 *                     alone — the same predicate `modelCatalog().ready` uses
 *                     for `/ai/connect`'s "governed & ready", and the same one
 *                     `/ai/observe`'s Route column and briefing read.
 *
 * The distinction is not academic. After the tour's Connect and Govern beats
 * (`activateOnramp('nb2')` + `enforceAny('pol-insp')`) every model is attached
 * and routed private or governed, while `rd-helion`'s `ready` is still false
 * because `fixes.segmentHelion` has not been applied. Reading `ready` as "on a
 * governed path" is what printed "1 of 3 … leave over the public internet" on
 * `/ai/cost` beside `/ai/connect`'s "3 / 3 governed & ready", `/ai/observe`'s
 * "No AI Fabric traffic currently crosses the public internet" and Discover's
 * "0 exposed endpoints" — with the remediation link pointing at the screen
 * that denied it.
 *
 * So: every sentence about where the NEXT request goes reads `routePath` /
 * `onPublicPath`; every sentence about where today's tokens WENT reads
 * `ungovernedToday` / `governedToday`; every count about spend accrual reads
 * `metering`; `endpointReady` is carried for callers that genuinely mean the
 * engine's readiness gate, and is never a path.
 */

/** The external, third-party model. Its price is the comparison rate: what the
 *  same token volume would have cost had every identity been routed to it. */
export const EXTERNAL_MODEL_ID = 'gpt-class';

/** An agent's model authority is a scope, not a name: `invoke:helion-70b`. */
const INVOKE_SCOPE = 'invoke:';

interface TokenMeter {
  tag: string;
  ready: boolean;
  today: number;
  /** Tokens metered against an AT&T-controlled path. */
  governed: number;
  /** Tokens metered while this identity's route was the public internet. */
  ungoverned: number;
  budget: number;
  pct: number;
}

interface ModelCatalogEntry {
  id: string;
  name: string;
  price: number;
  ready: boolean;
}

interface Agent {
  id: string;
  app: string;
  scopes: string[];
}

/** The three paths `CC.modelRoutes()` distinguishes. There is no fourth. */
export type ModelRoutePath = 'private' | 'governed egress' | 'public';

interface ModelRoute {
  tag: string;
  app: string;
  path: ModelRoutePath;
}

/**
 * How a route renders, in words. Exported and imported rather than restated,
 * so `/ai/cost`'s State column and `/ai/observe`'s Route column cannot end up
 * describing the same engine value with two different phrases.
 */
export function routeLabel(path: ModelRoutePath): string {
  switch (path) {
    case 'private':
      return 'AT&T private fabric';
    case 'governed egress':
      return 'Governed egress';
    default:
      return 'Public internet';
  }
}

export interface AiSpendRow {
  tag: string;
  /** True once this identity has accrued token spend today. */
  metering: boolean;
  /**
   * `tokenMeterList().ready` — the engine's readiness gate on SERIES metering
   * (`tickTokens` / `tokenSeries`): region attached AND governance control
   * applied. Not a path. See the module header.
   */
  endpointReady: boolean;
  /** `modelRoutes().path` — where this identity's requests actually go. */
  routePath: ModelRoutePath;
  /** True when `routePath === 'public'`, i.e. the NEXT request leaves over the
   *  internet. Says nothing about the tokens already metered. */
  onPublicPath: boolean;
  tokensToday: number;
  /** Of `tokensToday`, the tokens that rode an AT&T-controlled path. */
  governedToday: number;
  /** Of `tokensToday`, the tokens that rode the public internet. */
  ungovernedToday: number;
  budgetTokens: number;
  /** Percent of budget consumed — taken from the engine's own meter. */
  pct: number;
  modelId: string;
  modelName: string;
  /** $ per 1M tokens for the model this identity calls. */
  price: number;
  spendToday: number;
  spendIfExternal: number;
}

export interface AiSpendTotals {
  rows: AiSpendRow[];
  tokensToday: number;
  /** Of `tokensToday`, the tokens that rode an AT&T-controlled path. */
  governedTokensToday: number;
  /** Of `tokensToday`, the tokens that rode the public internet. */
  ungovernedTokensToday: number;
  /** How many identities metered at least one ungoverned token today. */
  ungovernedCount: number;
  budgetTokens: number;
  spendToday: number;
  spendIfExternal: number;
  /** Never negative: what routing away from the external model kept. */
  savings: number;
  /** How many identities have accrued spend today. */
  meteringCount: number;
  /** How many identities the engine considers meter-ready. Never a path claim. */
  endpointReadyCount: number;
  /** How many identities route over the public internet — the path claim. */
  publicPathCount: number;
  identityCount: number;
  /**
   * Token policies that carry a budget but no meter.
   *
   * Govern lists every token policy; the meters cover only the app tags the
   * engine actually meters, so a group-scoped policy (`west-workloads`) has a
   * ceiling and no consumption. Without this the two screens disagree in
   * public — Govern showing four budgets, Cost totalling three — and the
   * reader is left to guess which one is wrong. Derived, so a policy added or
   * removed changes the sentence rather than stranding it.
   */
  unmeteredPolicyTags: string[];
}

/**
 * Which catalog model this identity actually invokes, read off the engine's
 * own agent scopes rather than a map kept in parallel here.
 *
 * A miss is not survivable and must not be silent: a hardcoded map that fell
 * out of step with the engine used to yield `modelId: ''` → `price: 0` →
 * `spendToday: 0`, which renders as a blank model cell and a confident
 * `$0.00`. A wrong number stated calmly is worse than no screen.
 */
export function modelForTag(cc: CloudControl, tag: string): string {
  const agents = (cc.agentList?.() ?? []) as Agent[];
  const owner = agents.find(a => a.app === tag);
  const scope = owner?.scopes.find(s => s.startsWith(INVOKE_SCOPE));
  if (!scope) {
    throw new Error(
      `aiSpend: CC.tokenMeterList() meters "${tag}" but no agent in CC.agentList() ` +
        `carries an ${INVOKE_SCOPE}* scope for it, so its token spend cannot be priced. ` +
        `The engine's agents and its token meters have diverged.`,
    );
  }
  return scope.slice(INVOKE_SCOPE.length);
}

/** tag -> model id, for every identity the engine meters. */
export function tagModelMap(cc: CloudControl): Record<string, string> {
  const map: Record<string, string> = {};
  for (const m of cc.tokenMeterList() as TokenMeter[]) map[m.tag] = modelForTag(cc, m.tag);
  return map;
}

const priceOf = (catalog: ModelCatalogEntry[], modelId: string) =>
  catalog.find(m => m.id === modelId)?.price ?? 0;

const nameOf = (catalog: ModelCatalogEntry[], modelId: string) =>
  catalog.find(m => m.id === modelId)?.name ?? modelId;

export function aiSpendRows(cc: CloudControl): AiSpendRow[] {
  const meters = cc.tokenMeterList() as TokenMeter[];
  const catalog = cc.modelCatalog() as ModelCatalogEntry[];
  const routes = cc.modelRoutes() as ModelRoute[];
  const externalPrice = priceOf(catalog, EXTERNAL_MODEL_ID);

  /* Paired by TAG, not by array index. `modelRoutes()` now names the tag each
     route belongs to, so a route and its meter are matched on the identity
     rather than on both lists happening to iterate the same keys in the same
     order. A miss is not survivable — every path sentence on /ai/cost would
     silently describe the wrong identity — so it throws rather than defaults. */
  return meters.map(m => {
    const route = routes.find(r => r.tag === m.tag);
    if (!route) {
      throw new Error(
        `aiSpend: CC.tokenMeterList() meters "${m.tag}" but CC.modelRoutes() ` +
          `carries no route for it, so that identity's path cannot be stated.`,
      );
    }
    const modelId = modelForTag(cc, m.tag);
    const price = priceOf(catalog, modelId);
    const routePath = route.path;
    return {
      tag: m.tag,
      metering: m.today > 0,
      endpointReady: m.ready,
      routePath,
      onPublicPath: routePath === 'public',
      tokensToday: m.today,
      governedToday: m.governed,
      ungovernedToday: m.ungoverned,
      budgetTokens: m.budget,
      pct: m.pct,
      modelId,
      modelName: nameOf(catalog, modelId),
      price,
      spendToday: (m.today / 1_000_000) * price,
      spendIfExternal: (m.today / 1_000_000) * externalPrice,
    };
  });
}

export function aiSpendTotals(cc: CloudControl): AiSpendTotals {
  const rows = aiSpendRows(cc);
  const spendToday = rows.reduce((s, r) => s + r.spendToday, 0);
  const spendIfExternal = rows.reduce((s, r) => s + r.spendIfExternal, 0);
  const metered = new Set(rows.map(r => r.tag));
  const unmeteredPolicyTags = (cc.tokenPolicyList() as { tag: string }[])
    .map(p => p.tag)
    .filter(tag => !metered.has(tag));
  return {
    unmeteredPolicyTags,
    rows,
    tokensToday: rows.reduce((s, r) => s + r.tokensToday, 0),
    governedTokensToday: rows.reduce((s, r) => s + r.governedToday, 0),
    ungovernedTokensToday: rows.reduce((s, r) => s + r.ungovernedToday, 0),
    ungovernedCount: rows.filter(r => r.ungovernedToday > 0).length,
    budgetTokens: rows.reduce((s, r) => s + r.budgetTokens, 0),
    spendToday,
    spendIfExternal,
    savings: Math.max(0, spendIfExternal - spendToday),
    meteringCount: rows.filter(r => r.metering).length,
    endpointReadyCount: rows.filter(r => r.endpointReady).length,
    publicPathCount: rows.filter(r => r.onPublicPath).length,
    identityCount: rows.length,
  };
}

/**
 * Token volume, as the screens state it.
 *
 * One significant decimal in the `k` band, not zero. `Math.round(n / 1000)`
 * printed a Records column of `1k / 1k / 1k` under a TOKENS tile of `4k`
 * (1,183 + 1,225 + 1,320 = 3,728) — three roundings that each lose up to half
 * a thousand, under a total that rounded once. A viewer adds that column up.
 * At one decimal the same rows read `1.2k / 1.2k / 1.3k` under `3.7k` and the
 * arithmetic closes. `M` already carried two decimals for the same reason.
 */
export function fmtTokens(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(Math.round(n));
}

/**
 * Money, as the screens state it.
 *
 * Sub-cent is its own reading. `$0.00` used to print beside rows the same
 * screen described as metering — 674 metered tokens at sub-dollar prices is
 * about a fifth of a cent, and rounding that to `$0.00` makes the tile deny
 * the table under it. `<$0.01` is the same derivation, told truthfully. Zero
 * is still `$0.00`, because zero is zero.
 */
export function fmtUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  if (n > 0 && n < 0.005) return '<$0.01';
  return `$${n.toFixed(2)}`;
}

/**
 * True when `n` is worth putting inside a sentence that claims money moved.
 *
 * `savings > 0` is not that test. At $0.0015 the raw guard passes while the
 * figure does not reach a cent, so the screen printed "holds $0.00 of that
 * spend back" — a cost-control claim contradicted by its own number. Guard on
 * what the reader will see, not on what the float holds: neither a zero nor a
 * sub-cent placeholder belongs inside a claim that money was held back.
 */
export function statesRealMoney(n: number): boolean {
  const shown = fmtUsd(n);
  return shown !== fmtUsd(0) && !shown.startsWith('<');
}
