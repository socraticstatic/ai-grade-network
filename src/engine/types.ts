/**
 * Typed handle onto the ported Cloud Control engine (`window.CC`).
 *
 * The engine modules themselves (state.ts, state-telemetry.ts, …) are
 * ported as-is from vanilla JS and carry `// @ts-nocheck` — they are not
 * typed at the definition site. This interface is the single place that
 * types the *consumed* surface, and it only covers what this phase (1.5)
 * and its immediate consumers need. Extend it as later phases (React
 * bridge hook, views) consume more of window.CC.
 *
 * Loose/`any` fields below intentionally mirror the untyped shape coming
 * out of the ported JS rather than guessing a stricter shape that could
 * drift from the real runtime object.
 */

export interface CloudControlCounts {
  clouds: number;
  regions: number;
  vpcs: number;
  attached: number;
  [key: string]: number;
}

export interface CloudControlEvent {
  type?: string;
  [key: string]: unknown;
}

export interface CloudControlScores {
  reach: number;
  exposure: number;
  policy: number;
  cost: number;
  perf: number;
  address: number;
  ai: number;
  [key: string]: number;
}

export interface CloudControlEgress {
  total: number;
  pub: number;
  priv: number;
  savings: number;
  forecast: string;
  [key: string]: unknown;
}

export interface FabricRegion {
  cloudId: string;
  regionId: string;
  name: string;
  cloudName: string;
  attached: boolean;
  reliability: 'dual' | 'single' | 'none';
  path: 'private' | 'public';
  /** RTT to the on-ramp serving this region — what it costs ON the fabric,
   *  whether or not it is attached yet. */
  privateMs: number;
  /** The same region over public transit — what it costs today while `path`
   *  is `'public'`, and the counterfactual once it is `'private'`. */
  publicMs: number;
  /** The figure for the path the region is on RIGHT NOW (`privateMs` when
   *  `path === 'private'`, `publicMs` otherwise). A surface rendering this
   *  bare must name the path beside it; a surface naming a SPECIFIC path
   *  must render that path's own figure instead. */
  latencyMs: number;
  onrampIds: string[];
}

/** One judged request in CC.decisionLog(). Every field is a fact promptTrace
 *  held at the moment of the request; `reason` quotes the trace's own DENIED
 *  sentence and is null on an allowed request. Entries recorded before the
 *  detail existed carry tag/modelId null and render nowhere. */
export interface RequestRecord {
  ts: number;
  allowed: boolean;
  guarded: boolean;
  tag: string | null;
  modelId: string | null;
  tokens: number;
  ttftMs: number;
  path: 'private' | 'governed egress' | 'public';
  reason: string | null;
}

/** What a standing intent binds to. `id` is null only for estate scope. */
export interface IntentScope {
  kind: 'estate' | 'flow' | 'region' | 'tag' | 'identity';
  id: string | null;
  label: string;
}

/** The stored half of a standing intent. Status is never stored. */
export interface DeclaredIntent {
  id: string;
  key: string;
  scope: IntentScope;
  mode: 'watch' | 'enforce';
  declaredAt: number;
}

/** The derived half, re-read on every intentList() call. */
export interface IntentReading {
  status: 'aligned' | 'drifting' | 'violated';
  evidence: string;
  moves: { kind: 'attach' | 'steer' | 'fix' | 'enforce' | 'policy'; [k: string]: unknown }[];
  watch: { events: number; note: string } | null;
}

export interface IntentCatalogEntry {
  key: string;
  label: string;
  taxonomy: string;
  scopes(): IntentScope[];
}

/** One watchable stage in a managed VPC/VNET's five-stage lifecycle. */
export interface ManagedVpcStage {
  key: 'create' | 'vsrx' | 'cloud-plumbing' | 'att-plumbing' | 'live';
  label: string;
  detail: string;
  done: boolean;
}

/** A vSRX HA-pair node — active or backup — inside a managed VPC/VNET. */
export interface ManagedVpcVsrxNode {
  id: string;
  role: 'active' | 'backup';
  state: 'launching' | 'up';
}

/** One vSRX network interface and what it faces. */
export interface ManagedVpcVsrxInterface {
  name: string;
  toward: string;
  state: 'down' | 'up';
}

/** One BGP session the vSRX pair carries — toward the cloud or toward AT&T. */
export interface ManagedVpcVsrxBgp {
  peer: 'cloud' | 'att';
  label: string;
  state: 'idle' | 'established';
}

/** The vSRX HA pair a managed VPC/VNET provisions: nodes, interfaces, BGP
 *  sessions and the tier's throughput label. */
export interface ManagedVpcVsrx {
  nodes: ManagedVpcVsrxNode[];
  interfaces: ManagedVpcVsrxInterface[];
  bgp: ManagedVpcVsrxBgp[];
  throughput: string;
}

/** An AT&T-managed gateway VPC/VNET, deployed into one AWS/Azure region and
 *  plumbed toward the cloud and toward AT&T across five watchable stages.
 *  `onrampId` is the region's serving on-ramp (active-first, else first
 *  target match) captured at deploy time — going live activates it if it
 *  is not already active. */
export interface ManagedVpc {
  id: string;
  cloudId: string;
  regionId: string;
  name: string;
  cidr: string;
  tier: '500M' | '1G' | '5G';
  stage: ManagedVpcStage['key'];
  stages: ManagedVpcStage[];
  vsrx: ManagedVpcVsrx;
  onrampId: string | null;
}

export interface CloudControl {
  // --- core state (state.js) ---
  counts(): CloudControlCounts;
  /** Returns an unsubscribe function — required by useSyncExternalStore. */
  subscribe(fn: (ev?: CloudControlEvent) => void): () => void;
  activateOnramp(id: string, silent?: boolean): boolean;
  applyFix(key: string, silent?: boolean): boolean;
  undo(): boolean;
  canUndo(): string | false | null;
  simulateFailure(id: string): void;
  clearSim(): void;
  simImpact(): any;
  scores(): CloudControlScores;
  posture(): number;
  fixes: Record<string, boolean>;

  // --- telemetry (state-telemetry.js) ---
  telemetry(n: number): any;
  obsSummary(): any;
  /** Engine-known instants inside the telemetry window (fractions 0..1):
   *  the seeded anomaly, this-session attaches, an active failure sim.
   *  Every entry restates a fact the series already draw. */
  windowMoments(): { at: number; key: string; label: string }[];
  latencySeries?(...args: any[]): any;
  percentiles?(...args: any[]): any;
  topTalkers?(...args: any[]): any;

  // --- rules (state-rules.js) ---
  enforceRule(id: string, silent?: boolean): void;
  ruleList?(...args: any[]): any;
  addRule?(...args: any[]): any;
  removeRule?(...args: any[]): any;

  // --- billing (state-billing.js) ---
  egress(): CloudControlEgress;
  billing(): {
    lines: { item: string; kind: 'circuit' | 'usage'; amount: number; note: string }[];
    total: number; commit: number; commitDraw: number; commitPct: number;
    burst: number; uncommitted: number; savings: number; forecast: string;
  };
  utilization?(...args: any[]): any;
  arbitrage(): {
    hyperscalerBill: number;      // Σ publicCost, all buckets (attach-invariant), egress-only
    cloudConnectBill: number;     // current egress (pub+priv), egress-only
    savings: number;              // hyperscalerBill - cloudConnectBill
    savingsPct: number;           // 0..100
    fullyFabricBill: number;      // Σ attCost, all buckets (opportunity floor)
    availableSavings: number;     // cloudConnectBill - fullyFabricBill (still on the table)
    portFeesMo: number;           // current AT&T fabric port fees, disclosed separately
    fullyFabricPortFeesMo: number;// port fees if every on-ramp attached
    buckets: {
      key: string; label: string; category: 'internet' | 'cross-cloud' | 'committed';
      publicCost: number; attCost: number; saving: number; savingPct: number;
      attached: boolean; onrampId: string | null;
    }[];                          // sorted by saving desc (opportunity ranking)
  };

  // --- routing advisor (state-routing.js) ---
  routeAdvisor(): {
    recommendations: { id: string; flowId: string; pathId?: string; title: string; detail: string; action: 'steer' | 'diversify' }[];
    events: { title: string; detail: string }[];
  };
  steerFlow(rowId: string, pathId: string): boolean;
  /** `dst` is present on app rows only (`kind: 'app'`); cloud-to-cloud rows
   *  carry no destination bucket. */
  routeFlows(): { id: string; label: string; kind?: string; dst?: string; gbps: number; current: { attControlled: boolean; egressPerGb?: number; latencyMs?: number; label: string }; paths: { id: string; label: string; attControlled: boolean; available: boolean; egressPerGb?: number }[] }[];

  // --- fabric model (Cloud Fabric redesign C1, state-routing.js) ---
  fabricModel(): {
    sites: { id: string; label: string; firstMile: string | null }[];
    onramps: { id: string; name: string; type: string; site: string; active: boolean; targets: [string, string][] }[];
    regions: FabricRegion[];
    c2c: { id: string; label: string; gbps: number; viaPublic: boolean; controlled: boolean }[];
  };
  provisionRegion(regionId: string, opts?: { attachType?: string; onrampId?: string; resilient?: boolean }): FabricRegion | null;

  /**
   * THE region-latency derivation. `privateMs` is the region's RTT to the
   * on-ramp serving it — the figure /discover, Connect's Performance tile and
   * both PathChoice cards render, and the figure every AT&T flow row on
   * /naas/observe states. `publicMs` is the same region over public transit
   * (`privateMs * PUBLIC_TRANSIT_FACTOR`). Nothing outside the engine derives
   * a latency of its own; null for a region the engine does not carry.
   */
  regionLatency(regionId: string): { privateMs: number; publicMs: number } | null;
  /** What the public internet costs over the AT&T path between the same ends. */
  PUBLIC_TRANSIT_FACTOR: number;

  // --- console (state-console.js) ---
  setTokenPolicy(tag: string, patch: Record<string, unknown>): void;
  tokenPolicy?(tag: string): any;
  tokenPolicyList?(...args: any[]): any;
  modelCatalog?(...args: any[]): any;
  agentList?(...args: any[]): any;
  toggleAgent?(id: string): boolean;
  /** Agent ticker lifecycle. Running in the app, off by default under test;
   *  `start` returns false if already running, `stop` false if already stopped. */
  startAgents?(): boolean;
  stopAgents?(): boolean;
  agentsRunning?(): boolean;
  promptTrace?(...args: any[]): any;
  decisionLog?(...args: any[]): RequestRecord[];
  // --- derived variance and direction (state-telemetry.ts) ---
  /** p95 minus p50 over the region's OWN drawn latency series - the jitter
   *  figure and the chart can never disagree. Null for unknown regions. */
  regionJitter(cloudId: string, regionId: string, n?: number): { jitterMs: number; p50: number; p95: number } | null;
  /** The window's own direction: last-quarter mean vs first-quarter mean. */
  latencyTrend(cloudId: string, regionId: string, n?: number): { risingPct: number; rising: boolean; firstMs: number; lastMs: number } | null;

  // --- the 14-day assessment (state-assessment.ts) ---
  assessment(): { stage: 'not-started' | 'measuring' | 'report' | 'closed'; day: number; startedAt: number | null };
  startAssessment(): boolean;
  /** The demo's clock lever - labelled a demo control in the UI. */
  advanceAssessment(days?: number): boolean;
  closeAssessment(): boolean;
  /** All-derived report figures; never cached, basis named. */
  assessmentReport(): {
    recoverableMo: number;
    aiSavingMo: number;
    securityEvents: number;
    securityBreakdown: { denials: number; violations: number };
    msWasted: number;
    invisibleSharePct: number;
    invisibleBasis: 'tokens' | 'flows';
    counters: {
      identities: number; requestsAnalyzed: number; toolsInUse: number;
      ungovernedTools: number; securityEvents: number;
    };
  };

  // --- standing intents (state-intents.ts) ---
  intentCatalog(): IntentCatalogEntry[];
  /** `silent` is hydrate's flag: a replayed session pushes no undo, emits nothing. */
  declareIntent(key: string, scope: IntentScope, mode: 'watch' | 'enforce', silent?: boolean): DeclaredIntent | null;
  removeIntent(id: string): boolean;
  setIntentMode(id: string, mode: 'watch' | 'enforce'): boolean;
  intentList(): (DeclaredIntent & { reading: IntentReading })[];
  /** True when an enforce-mode cap-token-spend intent covers this tag —
   *  the predicate promptTrace's budget gate reads. */
  intentCapEnforced(tag: string): boolean;

  /** Gateway optimization levers the Insights Cost tab reads. Both seeded
   *  false — the warning state is the estate's truth until flipped. */
  gatewayFlags(): { routing: boolean; caching: boolean };
  /** Flip a lever. Pushes an undo entry first; emits like every mutation. */
  setGatewayFlag(key: 'routing' | 'caching', on: boolean): boolean;

  // --- actions catalog (state-actions.js) ---
  postureCatalog: any[];

  /** Grounded answer engine: an HTML answer computed from live state for a
   *  recognized question, or null when the engine cannot ground one. */
  answerFor(text: string): string | null;

  // --- share (state-share.js) ---
  shareUrl(): string;
  serialize(): string;
  hydrate(): boolean;
  /** A share link carrying the session PLUS staged, uncommitted moves. The
   *  receiving engine reprices every move from its own getters. */
  proposalUrl(moves: ({ kind: 'attach'; regionId: string } | { kind: 'steer'; flowId: string; pathId: string })[]): string;
  /** Read-once: the proposal moves a share payload carried, staged by the UI
   *  and never applied by the engine. */
  takeProposal(): ({ kind: 'attach'; regionId: string } | { kind: 'steer'; flowId: string; pathId: string })[] | null;
  /** Replays one decoded ?s= payload through the real mutations. */
  applyShareData(raw: string): boolean;

  // --- managed VPC/VNET lifecycle (state-managed.ts) ---
  managedVpcs: ManagedVpc[];
  deployManagedVpc(opts: { cloudId: string; regionId: string; tier?: '500M' | '1G' | '5G'; cidr?: string }): ManagedVpc | null;
  advanceManagedVpc(id: string): ManagedVpc | null;
  managedVpcFor(cloudId: string, regionId: string): ManagedVpc | null;
  suggestManagedCidr(): string;

  // catch-all for the rest of the ported surface not yet typed
  [key: string]: any;
}
