# Phase 2a: Discover Advisor First-Run - Design

**Date:** 2026-08-11
**Program:** [Advisor Program Roadmap](2026-08-10-advisor-program-roadmap.md)
**Depends on:** Phase 1 (shipped). **Blocks:** Phase 3.
**Decisions locked (Aug 10 brainstorm):** first-run takeover · AT&T-side head start · four findings (untracked AI flagship) · good/better/best ladder per finding · extend Andi's brain · bank-scale demo.
**Binding constraints:** the roadmap's Flywheel-compliance and borrowed-from-the-video lists apply verbatim.

## Problem

Discover is an inventory screen. The brainstorm's headline direction: the entry point is an advisor that assesses, converses, recommends, and deepens - grounded in the estate, offering real AT&T solutions in tiers. All the organs exist (wizard scan theater, Andi's grounded brain, advisorDraft's priced moves, the assessment funnel, the Meridian estate with finding seeds); nothing composes them.

## Experience

1. **Entry.** `/discover` redirects to `/discover/advisor` when the advisor has not completed for the active estate profile (`localStorage['advisor:<profile>:done']` unset). A "Skip to the estate" link is always visible - the advisor is a path, never a gate. Completing OR skipping sets the flag; return visits land on today's tree, with a "Run the advisor" affordance in the rail to re-enter.
2. **Opening move (AT&T-side head start).** No empty state - an observation computed from `siteRollup(cc)`: "We can already see **4,183 of your sites** on the AT&T network - 3 data centers, 210 offices, 2,840 branches, 1,130 ATMs. We can't see your cloud estate yet." Proof chips under it: "Sites on AT&T", "Circuits mapped", "Cloud estate: not yet connected".
3. **Intake.** "Connect a cloud to join the two estates" - the existing `DiscoveryWizard` provider+credential steps rendered inside the advisor canvas (not the modal), same shape-validation, same trust copy pattern ("Credentials are shape-checked in your browser and never stored or transmitted").
4. **Scan theater.** The wizard's `scanSteps` render as the video's checked-off analysis list in the advisor rail while the canvas skeleton-loads. Header status chip: "Analyzing your estate…" → "Recommendations ready". Narration lines appear in the rail as steps complete (authored templates filled from engine state - Andi's discipline, no pretend LLM).
5. **Findings.** Canvas fills with four evidence-backed cards, staggered; evidence chips land in the rail before the cards finish:
   - **Untracked AI** (flagship): AI-flagged VPCs carrying no governance tags (Meridian's `ai-lab` spokes). "We noticed AI workloads you haven't tagged."
   - **Unattached regions**: `advisorDraft()` attach moves with monthly savings.
   - **Egress bleed**: `advisorDraft()` steer moves with monthly savings.
   - **Exposed / single-path**: `spof` regions + `exposure=public`-style internet-facing VPCs. Risk-framed.
   Above the cards, the savings-led headline: "You could save **$X/mo**" summed from the priced moves (same derivation the stack panel's advisor chip uses - one number, one source).
6. **Ladders.** Each card expands to a good/better/best tier row from a typed catalog. Every tier is a real AT&T offer; accepting routes to an existing flow - the advisor has no checkout:
   - Untracked AI: 14-day assessment (`/assessment`) → AI Fabric governance (`/ai/govern`) → private AI transport (Connect flow, AI regions).
   - Unattached regions: steer on existing fabric (stage the steer move) → NetBond attach (stage the attach move) → NetBond Advanced (Connect wizard).
   - Egress bleed: same ladder family, steer-first.
   - Exposed/SPOF: Dynamic Defense (govern policy composer with the intent pre-picked) → SASE (same composer, service-insertion tier) → dual-path attach (Connect).
7. **Conversation.** The rail's input is stateful ("Building your recommendation…" disabled → "Ask about your recommendation"). Seeded questions ("Why this finding?", "How much do I save?", "What is NetBond Advanced?") answered by new advisor intents in `andiBrain` - grounded in `advisorModel` derivations. Free text falls through to Andi's existing router.
8. **Canvas stands alone.** Deleting the rail leaves a complete, self-explanatory recommendation page - the two-second test's guarantee.

## Architecture

New feature directory `src/features/advisor/`:

- `advisorModel.ts` - pure derivations: `advisorFindings(cc): Finding[]` (four kinds, each with evidence values from the engine), `advisorHeadline(cc): { savingsMo: number; findings: number }`, `headStart(cc)` (siteRollup + onNet phrasing). Unit-tested like discoveryModel.
- `offerCatalog.ts` - `OFFER_LADDERS: Record<FindingKind, [Tier, Tier, Tier]>` where `Tier = { key; name; tagline; route | action; framing: 'good'|'better'|'best' }`. Pure data + `ladderFor(kind)`.
- `AdvisorPage.tsx` - route `/discover/advisor`, two panes (rail 360-400px left, canvas right), owns the phase state machine: `observe → intake → scanning → ready`. Persists done-flag per estate profile.
- `AdvisorRail.tsx` - narration list, evidence chips, seeded questions, stateful input (routes to andiBrain).
- `AdvisorCanvas.tsx` - head-start card / intake / skeletons / headline + `FindingCard`s.
- `FindingCard.tsx` - evidence line, "why we recommend this" popover (engine-derived values + peer framing), embedded ladder.
- `andiBrain.ts` - extended with advisor intents (answers computed from advisorModel at ask time).
- `DiscoverPage.tsx` - first-run redirect + rail "Run the advisor" entry.

Phase-state, narration timing, and stagger use timers for pacing only - all data is derived synchronously from the engine, wizard-style.

## Prep fixes (carried follow-ups, in scope)

- Meridian generator: seed Meridian's own AI cloud (a small GPU cloud, e.g. `cw`-equivalent under Meridian's own naming) OR keep borrowed clouds but make `cloudTags.Region` geographically honest (west/central/east by lon) so groups resolve truthfully. Minimum: the Region-tag fix (groups are read by ladders' policy tier); the borrowed-clouds cosmetic stays unless trivially removable - it is load-bearing per the Task 6 escalation and NOT to be re-attempted here.

## Non-goals

Real credentials or crawling; advisor checkout; free-text LLM chat; Phase 3's cross-screen recommendation continuity; changing the assessment, Connect, or Govern flows themselves (the advisor only routes into them).

## Testing

Unit: advisorModel findings against both profiles (ACME small, Meridian full four), offerCatalog completeness (every kind has 3 tiers, every tier a resolvable route/action), headline = sum of priced moves. Component: phase machine, canvas-stands-alone render (rail absent), done-flag behavior. E2E (meridian): land on /discover → redirected to advisor → head-start shows 4,183 → connect a cloud → scan completes → four findings + headline → accept the assessment tier → arrive at /assessment with the funnel started → return to /discover → tree renders (no re-trap) → "Run the advisor" re-enters. ACME regression: existing discover e2e stays green (advisor flag seeded done in existing specs' setup, or redirect exempts ACME-complete state - the spec chooses: seed `advisor:acme:done` in the app's default boot for ACME so all existing flows are untouched; only Meridian first-runs the advisor by default).
