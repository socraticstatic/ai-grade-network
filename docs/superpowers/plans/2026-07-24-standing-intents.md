# Standing Intents Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Declared outcomes with live derived status (aligned/drifting/violated), watch-before-enforce, compiled repairs that ride the existing twin loop, an Andi drift queue, and intent threads on Discover.

**Architecture:** One new engine module (`state-intents.ts`) holding declared intents and a six-entry catalog whose evaluate/compile read only existing derivations; `StagedMove` widens to fix/enforce/policy kinds so repairs stage on the twin; Andi and Discover render readings, never store them.

**Tech Stack:** Engine JS module (CC singleton laws), React 18 + TS, vitest, Playwright.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-24-standing-intents-design.md`. Inventory + research docs are the grounding references.
- Engine honesty: status/evidence/moves derived per read; only `{id,key,scope,mode,declaredAt}` stored. Mutations push undo, emit, audit.
- The machine never commits estate moves: enforce mode applies standing CONTROLS (policy flags) only; repairs always stage into the tray.
- No em dashes in user-visible copy. fw-* tokens only. Never orphan a route.
- Do NOT touch `e2e/latency-agreement.spec.ts` (parallel session owns it).
- Full-log verification, real exit codes, never pipe runners through tail.

## File Structure

```
src/engine/state-intents.ts               the module (catalog + store + API)
src/engine/state-intents.test.ts          per-entry engine tests
src/engine/state-console.ts               (modify: promptTrace budget gate)
src/engine/state-share.ts                 (modify: `in:` payload field; pr move forms f/e/tp)
src/engine/types.ts                       (modify: DeclaredIntent, IntentReading, API)
src/engine/index.ts                       (modify if module registry lists siblings)
src/features/discover/stackFigures.ts     (modify: StagedMove kinds, stagedDeltas pricing)
src/features/discover/StackPanel.tsx      (modify: tray renders new kinds; IntentThreads band)
src/features/discover/IntentThreads.tsx   the band + thread overlay
src/features/discover/intentThreads.test.tsx
src/features/andi/andiBrain.ts            (modify: declare grammar, drift-queue resolve)
src/features/andi/AndiPanel.tsx           (modify: intent cards + mode toggle)
src/features/andi/andiBrain.intents.test.ts
src/features/ai-fabric/insights/SecurityTab.tsx (modify: watch counters)
e2e/intents.spec.ts                       the lifecycle walk
```

---

### Task 1: Engine — the intent store and catalog

**Files:** Create `src/engine/state-intents.ts`, test `src/engine/state-intents.test.ts`; modify `src/engine/types.ts`; ensure the module loads with its siblings (follow how `state-console.ts` is imported; add the import beside it).

**Interfaces:**
- Produces (typed in `types.ts`):

```ts
export interface IntentScope { kind: 'estate'|'flow'|'region'|'tag'|'identity'; id: string | null; label: string; }
export interface DeclaredIntent { id: string; key: string; scope: IntentScope; mode: 'watch'|'enforce'; declaredAt: number; }
export interface IntentReading {
  status: 'aligned'|'drifting'|'violated';
  evidence: string;                       // one engine-grounded sentence
  moves: { kind: 'attach'|'steer'|'fix'|'enforce'|'policy'; [k: string]: unknown }[];
  watch: { events: number; note: string } | null;  // watch mode only
}
export interface IntentCatalogEntry { key: string; label: string; taxonomy: string;
  scopes(cc: CloudControl): IntentScope[]; }
// CC API:
intentCatalog(): IntentCatalogEntry[];
declareIntent(key: string, scope: IntentScope, mode: 'watch'|'enforce'): DeclaredIntent | null;
removeIntent(id: string): boolean;
setIntentMode(id: string, mode: 'watch'|'enforce'): boolean;
intentList(): (DeclaredIntent & { reading: IntentReading })[];
```

- The six catalog entries and their evaluate/compile bases are specified in the design doc's "v1 catalog" section; implement exactly those, reading ONLY existing getters (`regionLatency`, `routeFlows`/`isDiverse` via `fabricModel`, steer/attach opportunity derivations mirroring `stackFigures` logic at the engine level, REQUIREMENTS/violations, `aiSpendTotals`, `tokenMeterList`). Where `stackFigures.ts` already derives an opportunity list in the UI layer, the engine entry re-derives from the same CC getters (UI code must not be imported into the engine).
- Drifting reads per entry: budget pct >= 80 (`cap-token-spend`); a diverse flow whose second on-ramp is the sim-failed one (`path-diversity`); ungoverned tokens grew within the current window while paths are private (`private-inference`); for the others, drifting = predicate holds but a positive-savings repair exists.
- Store: `_.intents = []`; `declareIntent` validates key+scope against the catalog (null on miss), pushes undo BEFORE mutating, emits `{type:'policy', label:'Intent declared · <label>'}`, audits. Same for remove/mode.
- Enforce-on-declare: entries with a standing control apply it (e.g. `cap-token-spend` enforce sets that tag's policy `enforced:true`), inside the same undo entry.

- [ ] **Step 1: Failing tests** — for each of the six keys: declarable scopes are engine-known; a violated seeded state reads `violated` with non-empty priced `moves`; driving the repair's mutations flips it to `aligned`; `CC.undo()` restores both the declaration and any standing control; unknown key/scope → null. (Engine singleton: order tests unlit → mutating, mirroring `state-console.requestLog.test.ts` patterns.)
- [ ] **Step 2:** RED. **Step 3:** implement. **Step 4:** GREEN + `npx vitest run src/engine` no regressions + `npx tsc --noEmit`.
- [ ] **Step 5: Commit** — `feat(engine): standing intents - store, six-entry catalog, derived readings`

### Task 2: Engine — budget denial gate + share payload

**Files:** Modify `src/engine/state-console.ts` (promptTrace), `src/engine/state-share.ts`; tests in `state-intents.test.ts` (extend) and a share round-trip case.

**Interfaces:**
- promptTrace: before the scope gates, when `pol.enforced` AND meter pct >= 100 AND an enforce-mode `cap-token-spend` intent covers the tag: record denial `reason: '<tag>: token budget exhausted — request DENIED'`, `tokens: 0`, blocked step in the trace. Watch-mode intents never gate; their reading counts `decisionLog` entries since `declaredAt` that WOULD have been denied under the predicate.
- Share: `in:` field on the payload (`[{k,sk,si,m}]` compact: key, scope kind, scope id, mode), applied in `applyShareData` via `declareIntent` (which validates); `pr` decoding gains `['f',fixKey]`, `['e',ruleId]`, `['tp',tag,scope,budget,g,e]` forms alongside `['a',..]`/`['s',..]`; malformed entries drop as today. Emptiness check includes `in`.

- [ ] **Step 1:** Failing tests: enforce-mode cap at an exhausted meter denies with the exact reason and meters nothing; watch mode does not deny but its reading counts; serialize/apply round-trip re-declares intents (validate via a fresh `applyShareData` on the same engine after `removeIntent`).
- [ ] **Step 2-4:** RED → implement → GREEN, engine suite + tsc clean.
- [ ] **Step 5: Commit** — `feat(engine): budget gate under enforce-mode cap; intents ride the share payload`

### Task 3: Twin — StagedMove widens to fix/enforce/policy

**Files:** Modify `src/features/discover/stackFigures.ts` (StagedMove union, `stagedDeltas`, `commitMoves`), `src/features/discover/StackPanel.tsx` (tray rendering + chips for new kinds); update `src/features/discover/StackPanel.test.tsx` expectations; extend proposal move handling end-to-end (uses Task 2 encoding).

**Interfaces:**
- `StagedMove` adds `{kind:'fix', fixKey:string}`, `{kind:'enforce', ruleId:string}`, `{kind:'policy', tag:string, patch:{scope?,budget?,guardrail?,enforced?}}`.
- `stagedDeltas` prices: fix via `previewFix(fixKey)` projections (posture/violations/egress deltas); enforce via violations delta from `project(() => enforceRule(ruleId, true))` if a silent variant exists, else the rule's resolved predicate count; policy via `aiSpendTotals` before/after under `project`-style snapshot (token policy is in the undo snapshot? It is NOT in state.ts snapshot — so price policy moves by direct computation: budget/scope deltas stated verbatim, no fake dollars).
- `commitMoves` applies each kind through the real mutations (`applyFix`, `enforceRule`, `setTokenPolicy`) with one undo label for the batch, exactly as it does for attach/steer today.
- Tray chips: fix/enforce/policy moves render label + the delta sentence; Share proposal includes them (Task 2 encoding).

- [ ] **Step 1:** Failing tests: staging a fix shows a violations delta; committing applies and `CC.undo()` restores; a proposal URL carrying `['f',...]`+`['tp',...]` moves stages them on open (extend `StackPanel.test.tsx` proposal test).
- [ ] **Step 2-4:** RED → implement → GREEN; full unit suite; tsc.
- [ ] **Step 5: Commit** — `feat(twin): fix, enforce and policy moves stage, price, share and commit`

### Task 4: Andi — declare grammar + drift queue

**Files:** Modify `src/features/andi/andiBrain.ts`, `src/features/andi/AndiPanel.tsx`; create `src/features/andi/andiBrain.intents.test.ts`; extend `src/features/command/commandRegistry.ts` parseIntent with the three declare phrases.

**Interfaces:**
- parseIntent grammar additions (typed, engine-validated, following CAP_GRAMMAR's shape): `keep <tag> private` → declare `data-sensitivity`|`private-inference` per tag kind; `diversify <flow>` → `path-diversity`; `minimize latency for <name>` → `minimize-latency`. Each resolves names against catalog `scopes(cc)`; no match → no command.
- `andiResolveCards`: prepend misaligned intents (violated first, then drifting), each card `{title: evidence, actions: [Synchronize, Watch/Enforce toggle]}`. Synchronize = stage `reading.moves` via the same mechanism `?draft=andi` uses (write the draft, navigate to `/discover?draft=intent-<id>`; StackPanel handles the param by staging that intent's moves — add the param branch beside the existing `draft=andi` one).
- Declaration flow in `andiAnswer`: a parsed declare intent returns a confirm-to-run action whose confirmation sentence states the intent label, current reading and move count.

- [ ] **Step 1:** Failing tests: each phrase parses to a declare command only for engine-known names; confirming declares (CC.intentList grows) and the reply states the reading; resolve cards list a violated intent first with a Synchronize action; the StackPanel `draft=intent-` param stages that intent's moves.
- [ ] **Step 2-4:** RED → implement → GREEN; sweep `Andi` unit tests; tsc.
- [ ] **Step 5: Commit** — `feat(andi): declare intents by phrase; Resolve is the drift queue`

### Task 5: Discover — IntentThreads band

**Files:** Create `src/features/discover/IntentThreads.tsx` + `intentThreads.test.tsx`; modify `StackPanel.tsx` to render the band above the strata; SecurityTab watch counters (small block reading `intentList` watch readings).

**Interfaces:**
- `<IntentThreads />` reads `useCloudControlLive(cc => cc.intentList())`. Row: status badge (aligned `bg-fw-success` dot, drifting slate, violated `bg-fw-red-600`), intent label + scope chip, evidence sentence, mode toggle, Synchronize button (stages moves into design mode via the Task 4 param), remove (×, undoable). Thread overlay: an SVG line from each row into the strata band(s) its catalog entry constrains (map key → strata ids already rendered by StackPanel); violated threads `animate-pulse` guarded by the motion-safe pattern used elsewhere (see reduced-motion e2e for the class discipline). Empty state: one sentence + a button that opens Andi.
- Test ids: `intent-threads`, `intent-row-{id}`, `intent-badge-{id}`, `intent-sync-{id}`, `intent-mode-{id}`.

- [ ] **Step 1:** Failing tests (jsdom): declared intent renders with derived badge; Synchronize navigates with `draft=intent-<id>`; remove calls `CC.removeIntent`; empty state invites Andi; SecurityTab shows a watch counter when a watch-mode cap intent exists.
- [ ] **Step 2-4:** RED → implement → GREEN; tsc; full unit suite.
- [ ] **Step 5: Commit** — `feat(discover): intent threads - the estate's promises, live`

### Task 6: E2e + verify + deploy

**Files:** Create `e2e/intents.spec.ts`; fix any red specs the sweep surfaces (except latency-agreement, hands off).

- [ ] **Step 1:** The lifecycle walk: declare `cap-token-spend` in watch via Andi phrase → watch counter appears on Security tab after a driven over-budget trace → toggle enforce → drive a trace, expect a 403 row with the budget reason → violate `private-inference` (it is violated on the seeded estate) → IntentThreads shows violated → Synchronize → tray staged with priced moves → Commit → thread goes aligned → `CC.undo()` chain restores → share-link round trip carries a declared intent. Axe pass on Discover with threads present.
- [ ] **Step 2:** Full verify (unit, build, e2e) to log files with real exit codes; re-run any lone failure in isolation before calling it flake, and say so.
- [ ] **Step 3:** Browser walk on localhost, screenshots of the thread states.
- [ ] **Step 4:** Merge to main, push, wait for the Actions deploy, walk the LIVE site, screenshots.
- [ ] **Step 5:** Report with proof and honest numbers.

## Self-Review

- **Spec coverage:** intent object + catalog (T1) ✓; watch/enforce + budget gate + share (T2) ✓; twin widening + proposal forms (T3) ✓; Andi declare/compile/drift queue (T4) ✓; Discover threads + Insights watch counters (T5) ✓; verification bar (T6) ✓. Out-of-scope items from the spec stay out.
- **Placeholder scan:** none.
- **Type consistency:** `IntentReading.moves` uses the widened StagedMove kinds (T3 defines them; T1 emits them as plain objects with matching shape — T1 lands first, so T1's engine tests assert shape by key/kind only, and T3's union formalizes the UI side).
