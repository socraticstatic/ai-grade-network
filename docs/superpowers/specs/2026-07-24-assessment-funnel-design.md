# The 14-Day AI Visibility Assessment (Phase 5)

**Date:** 2026-07-24. The last approved piece of the AI Gateway integration
plan (decision 3: "a real onboarding path, counters wired to the discovery
engine"). Figma frames: Setup 1:9298, Trial day-1 1:8555/1:8938, Day-14
report 1:8555, Day-15 closed 1:8298, plus the 1:11312 report concept.

## Thesis

Before a buyer commits to anything, the gateway watches for 14 days and
reports what their AI traffic is costing and risking. In this demo the
14 days are a STAGE MACHINE the engine owns, and every counter and finding
is a live derivation - the funnel never states a number the portal's own
screens would deny.

## The stage machine (engine: `state-assessment.ts`)

Stored: `{stage, startedAt, day}` where stage is
`'not-started' | 'measuring' | 'report' | 'closed'` and day is 1..14
while measuring. Stage moves only through the API; nothing else is stored.

- `CC.assessment()` → `{stage, day}`.
- `CC.startAssessment()` → measuring, day 1. Push undo, emit, audit.
- `CC.advanceAssessment(days=1)` → day forward; at day 14 the stage
  becomes `report`. This is the demo's time lever, labelled as such in the
  UI ("Advance the clock" - a demo control, honestly named). Undoable.
- `CC.closeAssessment()` → `closed` (the day-15 state). Undoable.
- Stage rides the undo snapshot AND the share payload (`as:` field), like
  intents.

`CC.assessmentReport()` - derived per read, never cached:
- `recoverableMo`: arbitrage().availableSavings + AI routing saving
  (aiSpendTotals.spendIfExternal - spendToday, monthly).
- `securityEvents`: decisionLog denials + violations().length - each
  counted once, sourced, and the finding names both sources.
- `msWasted`: Σ over public-path regions of (publicMs - privateMs).
- `invisibleSharePct`: ungoverned tokens as a share of all tokens (or the
  public-flow Gbps share when nothing metered - basis named).
- `counters` (the measuring screen): identities (tokenMeterList length),
  requestsAnalyzed (decisionLog length), toolsInUse (modelCatalog length),
  ungovernedTools (publicPathCount), securityEvents (as above).
- `findings[]`: three expandable findings mirroring the Figma report -
  invisible traffic, avoidable spend (with the routing/caching figures the
  Savings tab states), unstopped security events - every figure the same
  derivation the portal screens use.

## The page (`/assessment`, standalone like /stack)

Four states, one route, rendered by stage:
1. **Setup** - "In 14 days, find out what your AI traffic is costing and
   risking, before you commit to anything." Three value props, the 3-step
   timeline (Today / Day 2-14 / Day 14), a connectors list derived from the
   engine's clouds (each row: cloud name + region count, "included" - the
   demo estate is pre-connected and says so), Start assessment.
2. **Measuring (day N)** - read-only badge ("Nothing is blocked or
   routed"), the live counters, collapsible detection rows (invisible
   traffic, security events, AI spend, latency) each stating its live
   figure, a "Collecting" ticker line, and the demo clock lever
   (Advance to day N+1 / Skip to day 14).
3. **Report (day 14)** - headline: recoverable $/mo, security events,
   ms wasted. The three findings, expandable, each with its figures and a
   link INTO the portal screen that states the same number (Insights,
   Savings tab, NaaS Observe). Print-ready (like /stack). CTA: "Start the
   trial" → closeAssessment() + navigate to /discover.
4. **Closed (day 15)** - "Completed on <date>" (startedAt + 14 days,
   stamped from the stored startedAt, no live clock), the headline figures
   restated as of NOW (derived - and the copy says "as the estate stands
   today", so re-derivation is a feature, not a contradiction), CTA into
   the portal.

## Entry points (the onboarding path)

- `/assessment` in the standalone-page list; never in a layer rail.
- Discover: when stage is `not-started`, a dismissible banner above the
  stack ("Not sure what AI traffic you have? Measure for 14 days first").
  When measuring: the banner states the day and links back.
- The AI layer Home gets a quiet link card. No hard gate: the portal stays
  fully usable throughout - "real onboarding path" means a real path, not
  a wall (e2e and demo flows must keep working).

## Copy laws

Savings-first vocabulary ([[save-not-cost-vocabulary]]), no em dashes, no
Figma typos, statesRealMoney on every money claim, every counter's basis
named. The demo clock lever is labelled as a demo control - the one
honest way to compress 14 days into a demo beat.

## Verification bar

Engine tests: stage machine transitions, undo, share round-trip, report
figures equal their source derivations (arbitrage/aiSpend/violations read
in the same test body). Page tests per state. E2e: land Discover → banner
→ Setup → start → counters move when a trace is driven → advance to 14 →
report figures match page.evaluate'd engine reads → close → day-15 →
portal link. Full-log verify; latency-agreement spec stays hands-off.
