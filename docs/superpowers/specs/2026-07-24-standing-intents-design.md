# Standing Intents: the declared-outcome layer

**Date:** 2026-07-24. **Frame approved by Micah** ("proceed" on the four-part
recommendation). Companions: `2026-07-24-intent-inventory.md` (what grounds
where), `2026-07-24-intent-ux-research.md` (patterns and failure modes).

## Thesis

Today a viewer picks moves; the Intent Taxonomy says a viewer declares an
outcome and the system compiles the moves. We already run the hard half:
priced commands, project-before-commit, proposals that reprice on arrival,
undo on everything. What is missing is the noun. This design adds the
**standing intent**: a declared outcome with a scope, a mode, and a status
the engine re-derives on every read.

The industry's failure modes are the requirements list, inverted:
- **Trust gap** → every intent always shows its compiled moves, priced.
- **Assurance never closed** → status (aligned / drifting / violated) is a
  live derivation with evidence, never a stored flag.
- **Abstraction rigidity** → only intents the engine can honestly evaluate
  are declarable; the catalog is the boundary, stated on the card.

## The intent object (engine)

New module `src/engine/state-intents.ts`, same laws as every sibling:
mutations push undo, emit, and audit; nothing stores what can be derived.

```
DeclaredIntent (stored)          IntentReading (derived, per read)
  id: 'int-<n>'                    status: 'aligned'|'drifting'|'violated'
  key: catalog key                 evidence: one engine-grounded sentence
  scope: {kind, id}                moves: StagedMove[]   // the repair, priced
  mode: 'watch'|'enforce'          watch: {events, note} // would-have-acted
  declaredAt: ts
```

- `CC.intentCatalog()` — the declarable entries. Each carries `key`,
  `label`, `taxonomy` (the ILM 7 category), `scopes(cc)` (what it may bind
  to), `evaluate(cc, scope)` → `{status, evidence}`, and
  `compile(cc, scope)` → moves in the twin's vocabulary.
- `CC.declareIntent(key, scope, mode)` / `CC.removeIntent(id)` /
  `CC.setIntentMode(id, mode)` — undoable, emitted, audited.
- `CC.intentList()` — declared intents joined with their live readings.
- Share payload: declared intents travel (`in:` field, compact), reprice
  and re-evaluate on the recipient's engine like proposals do.

**Status semantics** (derived, three-valued, never binary):
- `aligned` — the evaluate predicate holds.
- `drifting` — holds now, but the trigger condition is approaching (each
  catalog entry defines its own early-warning read, e.g. budget pct >= 80,
  a flow one on-ramp from losing diversity).
- `violated` — the predicate fails; `moves` is the one-click repair.

**Watch before enforce.** A `watch` intent evaluates and counts, it never
mutates. An `enforce` intent applies its standing control on declaration
(and re-applies on Synchronize). The per-intent mode toggle is the
driver-assist/self-driving consent granularity. The advisor law survives
intact: even enforce-mode repairs stage into the tray; the machine never
commits estate moves on its own.

## The v1 catalog (six intents, five taxonomy categories)

Only what today's engine grounds honestly. Each line: key → evaluate basis
→ compiled moves.

1. `minimize-latency` (Performance; scope: flow or region) →
   `regionLatency` public-vs-private + the latency-slo requirement →
   attach/steer moves from the existing priced opportunities.
2. `path-diversity` (Resiliency; scope: flow) → `isDiverse` +
   `routeAdvisor` diversify recs → attach-second-on-ramp move.
3. `route-by-cost` (App-aware; scope: estate or flow) → no
   positive-savings steer remains for the scope → steer moves.
4. `data-sensitivity` (Security; scope: tag, seeded for `pci` and
   `classified-helion`) → the tag's REQUIREMENTS enforced and paths
   private → enforce-rule/apply-fix moves.
5. `private-inference` (AI; scope: the AI layer) → `publicPathCount === 0`
   and ungoverned tokens not growing this window → attach nb2 + guardrail
   moves.
6. `cap-token-spend` (AI; scope: identity tag) → meter pct under 100 →
   set-policy move. **Enforce mode closes a real gap:** `promptTrace`
   gains a budget gate - when a tag's policy is `enforced`, its meter is
   at/over budget, and a declared `cap-token-spend` intent for that tag is
   in enforce mode, the request records a denial with
   `reason: '<tag>: token budget exhausted — request DENIED'`. Watch mode
   counts the requests that would have been denied instead.

Not declarable, by design: "Audit All Network Actions" (the ledger already
does it), "Simulate and Validate Intent Impact" (that IS the twin). The
catalog card for anything ungrounded does not exist; no aspirational rows.

## The twin widens (StagedMove vocabulary)

`StagedMove` grows from `{attach|steer}` to also carry
`{kind:'fix', fixKey}`, `{kind:'enforce', ruleId}`, and
`{kind:'policy', tag, patch}`. `stagedDeltas` prices the new kinds with the
derivations that already exist (`previewFix` projections, violation deltas,
`aiSpendTotals`). Proposal encoding gains `['f',fixKey]`, `['e',ruleId]`,
`['tp',tag,scope,budget,g,e]` move forms; malformed entries drop, as today.
This is what lets security and AI intents ride the same
design → simulate → share → approve → commit loop attach and steer ride.

## Andi: the front door and the conscience

- **Declare:** intent suggestion cards per layer plus typed grammar
  extensions (`cap` pattern precedent): `keep <tag> private`,
  `diversify <flow>`, `minimize latency for <flow|region>`. Free text still
  never reaches a mutation; every phrase resolves against engine-known
  names or it becomes an honest fallback.
- **Compile and show the moves:** Andi's confirmation for a declaration
  states the intent, its current reading, and the compiled move list with
  prices. Declaring is one action; repairing stays a staged tray.
- **Resolve becomes the drift queue:** misaligned intents render as cards,
  worst first, each with `Synchronize` (stages the repair into the twin
  tray, navigates to Discover design mode) and the mode toggle.

## Discover: intents as the narrative

A new `IntentThreads` band on the cross-section: one row per declared
intent - status badge, evidence sentence, scope chip, Synchronize. Each
row draws a thread line into the strata it constrains; violated threads
pulse (motion-safe: no pulse under prefers-reduced-motion). Empty state
invites the first declaration through Andi. The animation story becomes
"watch the estate hold its promises," with the twin as the repair room.

## Insights hook (small)

Watch-mode counters surface on the Security tab: "cap-token-spend (watch)
would have denied N requests this window" - derived from the same request
log Phase 3 ships. No new surface.

## Out of scope for v1

Jitter derivation, predictive failover, residency evaluator (the three
remaining gap derivations land with the taxonomy intents that need them);
autonomous commit of estate moves (never, per the /stack RULES); intent
persistence across reload (the demo engine resets by design; intents ride
share links instead, like everything else).

## Verification bar

Engine tests per catalog entry (evaluate three-state, compile prices,
undo, share round-trip); the budget-denial gate tested at the promptTrace
level; twin tests for the new move kinds; e2e: declare → watch counts →
enforce → violate → Synchronize → commit → undo, plus a share-link
round-trip carrying a declared intent. Full-log verification, real exit
codes. Do not touch e2e/latency-agreement.spec.ts (owned by the parallel
deflake session).
