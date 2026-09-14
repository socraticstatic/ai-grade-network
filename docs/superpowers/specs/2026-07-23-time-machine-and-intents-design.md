# Observe Time Machine + ⌘K Intents — Design

**Date:** 2026-07-23. Approved as the follow-on pair to the living
cross-section (Micah: "proceed"). Inspiration: network-digital-twin research
(CNSM 2025 "time machine" scrubbing) and the 2026 agentic-console shift
(verbs as executable commands). Same law as the cross-section: nothing
states a figure the engine did not produce.

## Part 1 — the Observe time machine

The engine's telemetry is a deterministic window derived from estate state:
series carry a seeded past anomaly (eu-west-1 transit congestion at 62% of
the window), session attaches step a region's line down at 82%, an active
failure sim spikes the tail, and the tail is the live reading. An honest
time machine SCRUBS THAT WINDOW — it does not invent a recorded history the
engine does not keep.

### Behavior
- ObservabilityShell gains a scrubber under the flow chart (both Observe
  screens get it; moments are per-binding). Default is live.
- Scrubbing to instant i: the chart highlights bar i and dims the rest; a
  readout states `series[i].t · series[i].v` with the active tab's name —
  the exact drawn value, never re-derived.
- Moment markers ride the scrubber track at the engine's own positions:
  the seeded anomaly, each this-session attach, an active failure sim.
  Scrubbing within reach of a marker names it in the readout.
- The header's "Live" chip becomes "Reviewing <t>" with a Back-to-live
  button while scrubbed. Changing tabs keeps the cursor; going live clears.

### Mechanics
- Engine: `CC.windowMoments()` in state-telemetry — `{at, key, label}[]`
  from ANOMALY.at, `_.sessionAttached` (the 0.82 step), and simImpact().
  Typed in types.ts.
- Binding: optional `moments?(): TimelineMoment[]` on ObservabilityBinding;
  networkBinding forwards windowMoments(); aiBinding omits it for now (its
  window carries no engine-known moments yet — the scrubber still works,
  markerless).
- Shell: `cursor: number | null` state; slider (native range input,
  aria-label "Review the window"), marker dots absolutely positioned at
  `at × 100%`.

## Part 2 — ⌘K intents

commandRegistry already derives nav/attach/enforce/undo from live state.
It gains engine-priced intents, so the palette states what a command is
worth before it runs — the verb-as-command rule, upgraded:

- **Attach intents:** one per attachOpportunity (stackFigures) — label
  `Attach us-west-2 · 92→54 ms on the fabric · $6,200/mo` — run:
  provisionRegion. These replace nothing; the existing on-ramp commands stay.
- **Steer intents:** one per steerOpportunity — label
  `Steer <flow> onto the fabric · $X/mo` — run: steerFlow.
- **Cap intents (typed grammar):** `parseIntent(query, cc)` recognizes
  `cap <tag> [at] <n>[k|m] [tokens][/day]` against the engine's own
  tokenPolicyList tags; a match yields one command
  (`Cap shared-services at 1.0M tokens/day · token policy`) running
  setTokenPolicy(tag, { budget }). No tag match → no command; nothing
  free-texts its way into the engine.
- Execution is immediate and undoable (the palette already closes on run;
  every one of these mutations emits and Undo covers it). No fake preview
  modal: the price IS in the label.

## Honesty invariants
- Time-machine readouts restate the drawn series value verbatim; markers
  exist only where the engine placed them.
- Intent labels price moves through stackFigures (the same arithmetic the
  cross-section and /naas/cost state). Cap intents accept only engine-known
  tags and print the parsed budget back in fmtTokens vocabulary.

## Testing
- Engine: windowMoments unit tests (anomaly always; attach moment appears
  after provisionRegion; sim moment appears with simulateFailure, gone on
  clearSim).
- Shell: scrub → readout states series[i]; markers render at binding
  moments; Back to live restores; tab change keeps cursor.
- Registry: priced labels match stackFigures; parseIntent grammar (valid,
  unknown tag, malformed); run() calls the right engine mutation.
- e2e: time-machine.spec.ts (scrub Observe, read the anomaly moment,
  return to live) and intents in the existing palette walk (⌘K → type
  "cap shared-services 1m" → execute → /ai/govern states the new budget).
