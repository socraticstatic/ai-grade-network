# Phase 0: Metric Audit - Design

**Date:** 2026-08-10
**Program:** [Advisor Program Roadmap](2026-08-10-advisor-program-roadmap.md)
**Depends on:** nothing. **Blocks:** nothing (informs all later copy).

## Problem

Leadership critique from the Aug 7 brainstorm: top-level screens show too many data points and not the high-value ones. Every number a screen leads with must earn its place.

## The four tests

A top-level metric survives only if it passes all four:

1. **Savings-first** - does it speak to money saved or risk avoided, or is it a raw count wearing a headline's position?
2. **Connected** - does clicking/reading it lead somewhere coherent, or is it a dead end?
3. **Right measurement, right label** - is this the measurement the persona would choose, named in their language? (Deck's value map names the persona per screen: Discover=Architect, Connect=NetOps, Observe=FinOps+SRE, Govern=Security.)
4. **Two seconds** - does a customer get it without explanation?

## Scope

Every screen-level number on: layer-home dashboard (all five widgets: EstateFigures, MoneyOnTheTable, AssessmentFindings, StandingIntents, TokenBudgets), Discover (verdict line, stack panel figures), Connect (FabricHero figures), Observe (tiles + Sankey labels), Govern, Cost, AI Fabric pages. Verdict lines count as metrics - they lead the screen.

## Deliverables

1. **Inventory** - `docs/superpowers/metric-audit-2026-08.md`: every top-level number, its source derivation, its screen position, persona, and a pass/fail per test with one-line reasoning.
2. **Verdicts** - each metric marked: `keep` / `relabel` (right number, wrong words) / `demote` (true but not top-level; moves behind disclosure) / `cut`.
3. **The changes** - apply `relabel`, `demote`, and `cut` verdicts. Each change is small (copy, or moving a figure into an existing disclosure). Anything needing new UI structure is logged for Phase 2c instead of built here.

## Method

Audit is code-reading plus rendered-screen reading (dev server, walk each screen as a user). Verdicts argued in the inventory doc, not in commit messages. Existing tests updated where labels change; the "Save, not cost" vocabulary rule and rebrand guard are constraints.

## Non-goals

No new components, no layout changes, no new derivations. This phase removes and renames; it does not add.

## Testing

Existing unit/e2e suites stay green with label updates. Two-second test is human judgment recorded in the inventory, not automated.
