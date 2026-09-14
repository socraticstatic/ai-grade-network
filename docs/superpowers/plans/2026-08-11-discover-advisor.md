# Phase 2a: Discover Advisor First-Run Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The advisor-led first-run Discover experience: head-start observation → intake → scan theater → four evidence-backed findings with good/better/best ladders of real AT&T offers, conversing through Andi's grounded brain.

**Architecture:** New `src/features/advisor/` feature composed from shipped organs: `siteRollup` (head start), `wizardModel` (intake + scan steps), `advisorDraft`/engine derivations (findings), assessment/Connect/Govern routes (ladder destinations), `andiBrain` (conversation). Pure model first, UI second, wiring third. All numbers engine-derived at render time; timers pace, never generate.

**Tech Stack:** TypeScript, React, react-router, Vitest, Playwright, Flywheel `fw-*` tokens.

## Global Constraints

- Flywheel compliance and the roadmap's borrowed-from-the-video element list are binding (roadmap: "Binding constraints (all phases)").
- Every displayed number is computed from the engine at render time; narration is authored templates filled from engine state - no pretend LLM.
- The advisor never traps: "Skip to the estate" is always visible; completing or skipping sets `advisor:<profile>:done`; ACME's boot seeds the done-flag so every existing flow and test is untouched.
- The canvas must stand alone with the rail deleted.
- "Save, not cost" vocabulary; never "Cloud Connect"; suites never weakened; `rebrand.test.ts` green.
- Savings headline uses the SAME derivation as the stack panel's advisor chip (`advisorDraft().deltas`) - one number, one source.

---

### Task 1: Meridian generator honesty fixes (carried follow-ups)

**Files:**
- Modify: `src/engine/meridianEstate.ts`
- Test: `src/engine/meridianEstate.test.ts`

**Interfaces:**
- Produces: geographically honest `cloudTags.Region` on Meridian branches AND hub/spoke VPCs: `lon < -100 → 'west'`, `-100..-90 → 'central'`, else `'east'` for branches (already done for branches - verify); VPCs get the Region of their REGION's geo by the same rule (use1/eus2 → 'east', usw2 → 'west', scus → 'central').

- [ ] **Step 1: Write the failing test** - every Meridian VPC's `cloudTags.Region` matches its region's geo by the lon rule; no VPC keeps a dishonest 'east'.

```ts
it('meridian vpc Region tags are geographically honest', () => {
  const e = meridianEstate();
  const regionGeo: Record<string, number> = {};
  for (const rs of Object.values(e.regions)) for (const r of rs) regionGeo[r.id] = r.geo[1];
  const expect3 = (lon: number) => (lon < -100 ? 'west' : lon < -90 ? 'central' : 'east');
  for (const [rid, vs] of Object.entries(e.vpcs))
    for (const v of vs) expect(v.cloudTags.Region).toBe(expect3(regionGeo[rid]));
});
```

- [ ] **Step 2: RED** - `npx vitest run src/engine/meridianEstate.test.ts` fails (scus/usw2 vpcs are 'east').
- [ ] **Step 3: Implement** - derive the Region value from the region's `geo[1]` in the vpc loop.
- [ ] **Step 4: GREEN** - same command; then `npx vitest run src/engine/` all green (determinism test still passes - the change is deterministic).
- [ ] **Step 5: Commit** - `feat(estate): geographically honest Region tags on meridian vpcs`

### Task 2: advisorModel - findings, headline, head start

**Files:**
- Create: `src/features/advisor/advisorModel.ts`
- Test: `src/features/advisor/advisorModel.test.ts`

**Interfaces:**
- Consumes: `siteRollup`, `branchesOf` (discoveryModel); `advisorDraft`, `attachOpportunities`, `steerOpportunities` (discover/stackFigures); engine handle fields (`clouds`, `regions`, `vpcs` via `cc`).
- Produces (later tasks rely on these exact names):

```ts
export type FindingKind = 'untracked-ai' | 'unattached-regions' | 'egress-bleed' | 'exposed-spof';
export interface Finding {
  kind: FindingKind;
  title: string;            // customer language, savings/risk-first
  evidence: string;         // one sentence with engine-derived numbers
  why: string;              // popover body: values + peer framing
  savingsMo: number | null; // null for risk-framed findings
  count: number;            // entities involved
}
export function advisorFindings(cc: CloudControl): Finding[];          // fixed order: untracked-ai, unattached-regions, egress-bleed, exposed-spof; absent findings omitted
export function advisorHeadline(cc: CloudControl): { savingsMo: number; findings: number };
export function headStart(cc: CloudControl): { total: number; onNet: number; byClass: { siteClass: SiteClass; count: number }[]; cloudsVisible: boolean };
```

- Untracked AI = vpcs with `ai` truthy AND empty/absent `tags` (governance), counted across all regions. Unattached = attach opportunities count + summed savings. Egress = steer opportunities count + summed savings. Exposed/SPOF = regions with `spof` + vpcs whose cloudTags/tags mark internet exposure (`exposure=public` cloudTag or `internet-facing` tag). `advisorHeadline.savingsMo` = `advisorDraft(cc).deltas.egressSavingMo` (the chip's number - read stackFigures to confirm the exact field and reuse it, do not re-derive).

- [ ] **Step 1: Failing tests** - under meridian (`applyEstateProfile`), all four kinds present with count>0; untracked-ai count equals the number of untagged ai vpcs in the seed; under acme, at minimum unattached-regions and egress-bleed present; headline savings equals advisorDraft's deltas value; headStart totals 4,183/exact class counts under meridian; always restore acme in afterEach.
- [ ] **Step 2: RED.**
- [ ] **Step 3: Implement** (pure module, no React).
- [ ] **Step 4: GREEN** - `npx vitest run src/features/advisor/` + `npx tsc --noEmit`.
- [ ] **Step 5: Commit** - `feat(advisor): grounded findings, headline, and head-start derivations`

### Task 3: offerCatalog - ladders

**Files:**
- Create: `src/features/advisor/offerCatalog.ts`
- Test: `src/features/advisor/offerCatalog.test.ts`

**Interfaces:**
- Produces:

```ts
export interface OfferTier {
  key: string; name: string; tagline: string;      // customer language
  framing: 'good' | 'better' | 'best';
  route: string;                                    // in-app destination (existing flows only)
}
export function ladderFor(kind: FindingKind): [OfferTier, OfferTier, OfferTier];
```

- Ladders (exact offers): untracked-ai → [14-day assessment `/assessment`, AI Fabric governance `/ai/govern`, Private AI transport `/naas/connect`]; unattached-regions → [Steer on the fabric `/naas/observe`, NetBond attach `/naas/connect`, NetBond Advanced `/naas/connect`]; egress-bleed → same three destinations, steer-first taglines; exposed-spof → [Dynamic Defense `/naas/govern`, SASE `/naas/govern`, Dual-path attach `/naas/connect`]. Verify each route exists in the app's router (read `App.tsx`/`navItems`) and adjust paths to the real ones - the TEST asserts every route matches a registered route pattern.

- [ ] **Step 1: Failing tests** - every FindingKind has exactly 3 tiers in good/better/best order; every `route` appears in the app's route table (import the route registry or assert against a literal list read from App.tsx at implementation time and kept in the test).
- [ ] **Step 2: RED.** — [ ] **Step 3: Implement.** — [ ] **Step 4: GREEN + tsc.** — [ ] **Step 5: Commit** - `feat(advisor): offer ladders - three real AT&T tiers per finding`

### Task 4: Advisor page - phase machine, canvas, rail

**Files:**
- Create: `src/features/advisor/AdvisorPage.tsx`, `AdvisorCanvas.tsx`, `AdvisorRail.tsx`, `FindingCard.tsx`, `advisorPhase.ts`
- Test: `src/features/advisor/AdvisorPage.test.tsx`, `advisorPhase.test.ts`

**Interfaces:**
- Consumes: Tasks 2-3 exports; `wizardModel`'s `WIZARD_PROVIDERS`, `validateCredential`, `scanSteps`; `useCloudControl`.
- Produces: route component for `/discover/advisor`; `advisorPhase.ts` exports the pure machine `advance(state, event) -> state` with states `observe | intake | scanning | ready` and the done-flag helpers `advisorDone(profile)`, `markAdvisorDone(profile)` (localStorage key `advisor:<profile>:done`).

Behavior (from the spec, all binding): head-start card with proof chips (observe); wizard-derived intake inside the canvas with trust copy; scan steps checked off in the rail with narration lines, canvas skeletons, header status chip "Analyzing your estate…" → "Recommendations ready" (reuse the existing header-chip idiom from the app header if one exists; else a local chip in the page header row); ready = headline card ("You could save $N/mo across K findings") + FindingCards staggered, evidence chips landing in the rail before cards finish (rail chips render at scanning-complete, cards stagger in with the existing `useRevealStagger` hook); each FindingCard has evidence line, "Why we recommend this" popover, expandable ladder with three tier buttons that `navigate()` to their route AND `markAdvisorDone(profile)`; "Skip to the estate" link in the page header at every phase (navigates to /discover after marking done); stateful rail input (disabled placeholder "Building your recommendation…" until ready, then "Ask about your recommendation…").

- [ ] **Step 1: Failing tests** - phase machine transitions (observe→intake on CTA, intake→scanning on valid credential, scanning→ready when steps exhausted); AdvisorPage renders head-start numbers from the engine under meridian; ready-phase renders 4 FindingCards + headline; **canvas-stands-alone**: render AdvisorCanvas directly with no rail and assert headline + cards + ladders complete; done-flag set on skip and on tier accept.
- [ ] **Step 2: RED.** — [ ] **Step 3: Implement** (Flywheel idioms: reuse chip/card/button classes from EstateFilterChips/AssessmentBanner/StackPanel; no new hex). — [ ] **Step 4: GREEN + tsc.** — [ ] **Step 5: Commit** - `feat(advisor): first-run advisor page - observe, intake, scan theater, findings, ladders`

### Task 5: Routing and entry wiring

**Files:**
- Modify: the route registry (`App.tsx` or wherever routes are declared), `src/features/discover/DiscoverPage.tsx`
- Modify: `src/engine/estateProfile.ts` (ACME done-flag seeding) or app boot - choose the smallest honest home and document it
- Test: `src/features/discover/DiscoverPage.test.tsx` + a routing test

**Interfaces:**
- Consumes: Task 4's page + done-flag helpers.
- Produces: `/discover/advisor` registered; `/discover` redirects to the advisor iff `!advisorDone(activeProfile())` (Navigate, not history push - back button sane); ACME seeds `advisor:acme:done=1` at boot so ALL existing flows/tests are untouched; DiscoverPage rail gains a "Run the advisor" affordance (clears the flag and navigates).

- [ ] **Step 1: Failing tests** - meridian + no flag → /discover redirects to advisor; acme → no redirect (boot seeded); "Run the advisor" re-enters; direct /discover/advisor URL always works.
- [ ] **Step 2: RED.** — [ ] **Step 3: Implement.** — [ ] **Step 4: GREEN + full `npx vitest run` (regression) + tsc.** — [ ] **Step 5: Commit** - `feat(advisor): first-run routing - meridian enters the advisor, acme untouched`

### Task 6: Andi advisor intents

**Files:**
- Modify: `src/features/andi/andiBrain.ts`
- Test: `src/features/andi/andiBrain.test.ts` (extend)

**Interfaces:**
- Consumes: `advisorFindings`, `advisorHeadline`, `ladderFor`.
- Produces: `advisorSuggestions(): string[]` (the three seeded questions) and routing inside `askAndi`/the brain's router so those questions (and close phrasings: match on keywords "finding", "save", "NetBond") answer from advisorModel with grounded numbers and an action (navigate to the relevant route). Unmatched input falls through to the existing router unchanged.

- [ ] **Step 1: Failing tests** - "Why this finding?" returns text naming the flagship finding with its live count; "How much do I save?" returns the headline number formatted; "What is NetBond Advanced?" returns the tier tagline + a navigate action; an unrelated question still hits the existing fallback (assert one existing behavior unchanged).
- [ ] **Step 2: RED.** — [ ] **Step 3: Implement** (follow the brain's source-ordering comment - advisor intents slot as a new numbered source before the generic fallback). — [ ] **Step 4: GREEN + tsc.** — [ ] **Step 5: Commit** - `feat(andi): advisor intents answer from grounded findings`

### Task 7: E2E - the first-run walk

**Files:**
- Create: `e2e/advisor-first-run.spec.ts`

**Interfaces:** consumes everything; follows `e2e/meridian-estate.spec.ts`'s URL idiom (`/?estate=meridian#/discover`, gate auth seeding) - read it first.

- [ ] **Step 1: Write the spec** - (1) meridian first-run: goto discover → lands on advisor → head-start shows "4,183" → start intake → provider + valid-shaped credential → scan completes → status chip "Recommendations ready" → 4 finding cards + savings headline → open flagship ladder → accept tier 1 → arrives at /assessment → back to /discover renders the TREE (no re-trap); (2) skip path: fresh context, advisor → "Skip to the estate" → tree, and direct /discover stays on tree; (3) acme: /discover never redirects (6 site rows render immediately).
- [ ] **Step 2: Run it** - `npx playwright test e2e/advisor-first-run.spec.ts` green.
- [ ] **Step 3: Run neighbors** - meridian-estate + discover-connect-account + discover-routes specs green (discover-group's 2 failures are known pre-existing).
- [ ] **Step 4: Browser walk** - dev server from the worktree; screenshot each advisor phase into the plan workspace; verify the borrowed-video elements checklist from the roadmap one by one.
- [ ] **Step 5: Commit** - `test(e2e): advisor first-run walk, skip path, acme regression`
