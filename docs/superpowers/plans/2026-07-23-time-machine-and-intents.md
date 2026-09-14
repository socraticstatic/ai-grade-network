# Time Machine + ⌘K Intents Implementation Plan

> Spec: docs/superpowers/specs/2026-07-23-time-machine-and-intents-design.md
> Branch: feat/time-machine-and-intents

## Workstream A — time machine (inline)

### A1: engine windowMoments
**Files:** src/engine/state-telemetry.ts (add fn + export), src/engine/types.ts
(type + method), new src/engine/windowMoments.test.ts
- `windowMoments(): { at: number; key: string; label: string }[]`
  - always: `{ at: ANOMALY.at, key: 'anomaly', label: 'Transit congestion · eu-west-1' }`
  - per `_.sessionAttached` key resolving to a region: `{ at: 0.82, key: 'attach:'+key, label: 'Attached this session · <region name>' }`
  - when simImpact() truthy: `{ at: 1, key: 'sim', label: 'Simulated failure · <onramp name>' }`
- Tests mutate then restore (undo / clearSim), engine-singleton style.

### A2: binding surface
**Files:** ObservabilityBinding.ts (add `TimelineMoment`, optional
`moments?()`), networkBinding.ts (forward cc.windowMoments()).

### A3: shell scrubber
**Files:** ObservabilityShell.tsx, ObservabilityShell.test.tsx
- `const [cursor, setCursor] = useState<number | null>(null)`
- Header chip: live (as today) or `Reviewing {series[cursor].t}` + Back to
  live button (data-testid="tm-live").
- Under the chart (only when series has real values): range input
  (data-testid="tm-scrubber", min 0, max series.length-1, value cursor ??
  max) + absolutely-positioned marker dots (data-testid="tm-moment") at
  `moment.at * 100%` with title=label.
- Chart: bar i gets fill #0057b8 and full opacity when cursor===i; others
  opacity .45 while scrubbed.
- Readout (data-testid="tm-readout", aria-live="polite"):
  `{series[cursor].t} · {series[cursor].v} · {tab label}` + nearest moment
  within 0.06 of cursor/(N−1) appended as `— {label}`.
- Tests: scrub sets readout to the exact series value; markers positioned;
  back-to-live clears; empty series renders no scrubber.

## Workstream B — ⌘K intents (delegated agent, worktree)

### B1: registry intents
**Files:** src/features/command/commandRegistry.ts (+test), CommandPalette.tsx
- New kinds: 'attach-region' | 'steer' | 'cap'.
- Attach/steer commands from stackFigures.attachOpportunities /
  steerOpportunities with priced labels per spec; run() =
  cc.provisionRegion(regionId) / cc.steerFlow(flowId, pathId).
- `parseIntent(query, cc): Command[]` — grammar
  /^cap\s+(\S+)\s+(?:at\s+)?([\d.]+)\s*([km])?\s*(?:tokens?)?(?:\/day)?$/i,
  tag must be in tokenPolicyList(); budget = n × (k:1e3, m:1e6); label uses
  fmtTokens; run() = cc.setTokenPolicy(tag, { budget }).
- CommandPalette merges parseIntent(query, cc) results ahead of fuzzy
  matches; everything else about the palette stays.
- Tests: labels restate stackFigures prices; grammar accept/reject; run()
  mutation asserted then undone/reset.

## Workstream C — verify
- e2e/time-machine.spec.ts + extend the palette e2e with the cap intent
  (assert /ai/govern budget cell moved; then reset via setTokenPolicy).
- npm run verify; headless screenshots (scrubbed Observe with the anomaly
  named; palette showing priced intents); merge to main.
