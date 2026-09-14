# A Place for Every Thing, a Queue for Every Task

**Date:** 2026-07-24. Approved frame ("go" on the three moves). This is the
reorganization only - no new mechanics, one new derivation.

## The rule

Three dimensions organize the product: place (layer x lifecycle), promise
(standing intents), task (a priced move waiting for a human). Place keeps
the workbenches. Promises and tasks get ONE estate-level office. Every
other appearance of either is a lens over the same derivation.

## Move 1 - one lifecycle, both layers

The AI rail returns to the four verbs as its titled groups:

- **Connect**: Providers (/ai/providers), Virtual keys (/ai/keys)
- **Govern**: Policies (/ai/govern), Teams & limits (/ai/teams)
- **Observe**: Insights (/ai/observe)
- **Cost**: Savings (/ai/cost - the existing redirect to the Savings tab)

Nothing deletes; things return to their stage. NaaS keeps its flat verbs
(it already speaks the lifecycle). The deck's "same four verbs on every
layer" promise becomes true again with no deck edit.

## Move 2 - one office: /work

A new estate-level destination beside Discover (top tab Discover · Work ·
NaaS · AI Fabric; a Work item in the mobile drawer). Two sections:

1. **The queue** - `workQueue(cc)` (src/features/work/workQueue.ts, a UI
   derivation like stackFigures): rows from three sources, each tagged
   with lifecycle stage + layer + price where the engine prices it:
   - advisor attaches (stage Connect, layer NaaS) and steers (stage Cost),
   - misaligned intents (stage Govern, layer per THREADS),
   - idle provisioned circuits (stage Connect).
   Grouped by stage, filterable by layer. Intent rows synchronize via the
   existing ?draft=intent-<id> param; a header action drafts the advisor
   set (?draft=andi). No new commit paths - the twin stays the only door.
2. **Standing intents, managed** - the full management surface moves here:
   the Declare picker, mode toggles, remove, watch notes.

Andi's Resolve becomes a lens over `workQueue` (top rows), not a parallel
list.

## Move 3 - Discover slims

The threads band on Discover becomes the picture: status, evidence,
Synchronize. The picker, mode toggle and remove move to /work; the band
header links "Manage on Work". Banner, twin, estate tree unchanged.

## Sweep obligations

LeftRail AI href order + group titles; helpers.ts AI verb map (Cost ->
Savings); mobile drawer destination count (Discover + Work + 4 + 6 = 12);
navItems tests; intentThreads tests split between the picture (Discover)
and the office (/work); Andi resolve tests re-target workQueue; tour beats
unaffected (anchors survive); never orphan a route; full-log verification.
Out of scope: NaaS grouped rail, posture-catalog rows in the queue (v2 -
dedup with intent repairs needs design), any engine change.
