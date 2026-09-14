# Token-Policy Authoring, and an Honest Enforced Pill — Design

**Date:** 2026-07-25
**Surfaces:** AI Fabric Govern (`/ai/govern`), the `/discover` review tray
**Status:** Design approved; awaiting spec review before planning.

## Problem

The AI layer is the network layer before we repaired it, and deliberately so:
the rule-proposals spec fenced it out ("No token-policy authoring UI"). The
result is three distinct defects.

**1. You cannot author a token policy.** The four policies are hardcoded seeds
(`src/engine/state-console.ts`). `TokenPolicies.tsx` renders a read-only table
whose only affordances are a guardrail toggle and a one-way Enforce button.
Scope and budget are displayed and not editable anywhere. Creating a policy is a
console-only operation; the only budget-editing path that ships is the command
palette grammar `cap <tag> <n>`.

**2. The Enforced pill lies.** The budget gate in `promptTrace` requires three
conditions:

```js
if (pol && pol.enforced && CC.intentCapEnforced(tag)) {
  const meter = CC.tokenMeterList().find(m => m.tag === tag);
  if (meter && meter.pct >= 100) { /* DENIED */ }
}
```

`intentCapEnforced(tag)` is true only when an **enforce-mode `cap-token-spend`
intent is declared for that tag**. So `enforced: true` alone denies nothing. A
viewer who enforces a policy and then watches requests sail through is looking
at a correct engine and a lying badge.

**3. Two Enforce buttons, two contracts.** `/ai/home`'s `TokenBudgetsWidget`
stages via `?draft=policy-<tag>`, with the review tray and Undo behind it.
`/ai/govern`'s Enforce mutates on click, and `setTokenPolicy` pushes **no undo
entry** — so that path is both unreviewed and individually un-undoable. The
Govern table predates the staging contract and was never brought forward. We
created this split ourselves when we shipped the widget.

## What the research settled

Verified findings from primary product documentation (Kong, LiteLLM, Portkey,
Azure APIM, Databricks, Cloudflare, Bedrock). Only the data-model question
produced claims that survived verification; the preview, NaaS-authoring, and
proactive-governance questions came back empty and are NOT relied on here.

- **A limit is a `(metric, quantity, window)` triple, not a scalar.** Kong's
  schema exposes `total_tokens | prompt_tokens | completion_tokens | cost`;
  LiteLLM pairs `max_budget` with `budget_duration`.
- **Soft and hard limits are separate fields.** LiteLLM's `soft_budget` "sends
  email alerts but does not block requests"; `max_budget` blocks.
- **Scope hierarchies vary from one level to eight or more**, and require a
  published conflict-resolution rule.
- **Quantitative limits offer only hard deny.** No product examined ships
  throttle, model-downgrade, or monitor-only on the quota path.
- **Guardrails are tri-state** (Flag/Ignore/Block; BLOCK/ANONYMIZE/NONE),
  configured independently for prompt and response. This is the industry's
  monitor-before-enforce mode, and it lives on the guardrail axis.
- **No product previews a spend-policy change.** There is no dry-run or
  historical backtest on the quota path anywhere in the sample.

Two consequences for this design. The preview below has no pattern to copy, so
it is built entirely from our own getters and every clause is checkable. And the
tri-state guardrail is correct modelling that we will NOT ship, because our
engine's guardrail never fails anything (see Scope guards).

## Architecture

### 1. `tokenPolicyPreview(cc, spec)` — the derivation

New pure module `src/features/ai-fabric/tokenPolicyPreview.ts`. No React, no
formatting, no mutation. Takes a proposed policy spec and answers what it would
do, from getters that already exist.

```ts
export interface TokenPolicySpec {
  tag: string;
  scope: string;
  budget: number;
  softPct: number;
  guardrail: boolean;
  enforced: boolean;
  group?: string;
}

export interface TokenPolicyPreview {
  /** Live meter for this tag, or null when the tag is unmetered. */
  meter: { today: number; budget: number; pct: number } | null;
  /** Where the proposed budget would put it. Null when unmetered. */
  proposedPct: number | null;
  /** Replay of decisionLog against the proposed scope. */
  wouldDeny: { count: number; total: number; reasons: string[] };
  /** Agents bound by this policy (agent.app === tag). */
  boundAgents: string[];
  /** Current route path for this identity, when the engine carries one. */
  routePath: 'private' | 'governed egress' | 'public' | null;
  /** True when an enforce-mode cap-token-spend intent covers this tag. */
  capIntentEnforced: boolean;
  /** Why this policy cannot meter: group-scoped policies never do. */
  unmetered: boolean;
}

export function tokenPolicyPreview(cc: CloudControl, spec: TokenPolicySpec): TokenPolicyPreview;
```

Sources, one per field: `tokenMeterList()`, arithmetic against `spec.budget`,
a `decisionLog()` replay applying the same predicate `promptTrace` uses
(`scope === 'no-external' || scope === 'self-hosted'` denies `gpt-class`),
`agentList()` filtered on `app === tag`, `modelRoutes()`, `intentCapEnforced()`.

**The replay must use the engine's own predicate, not a copy of it.** If the two
drift, the preview lies. The plan will extract or directly reuse that check.

### 2. `TokenPolicyBuilder` — the authoring dialog

`src/features/ai-fabric/TokenPolicyBuilder.tsx`, mirroring the just-rebuilt
`RuleBuilder` and `GroupBuilder`: `role="dialog"` (no `aria-modal`, since it is
not a true modal), a real `<form>` so Enter submits, focus to the first field on
open, Escape to close with listener cleanup, an untouched-form guard, and a
visible failure state.

Fields:

| Field | Control | Source | Notes |
|---|---|---|---|
| Identity | select | `Object.keys(CC.TAGS)` plus group ids from `groupList()` | The tag/group overload made explicit: a group-scoped choice is labelled as such |
| Scope | select, closed set of 4 | seeds | Options state which enforce; see below |
| Budget | number | — | Stated as "tokens per day" |
| Alert at | number (percent) | — | The soft threshold, default 80 |
| Guardrail | checkbox | — | On/off only |

**Scope is honestly labelled.** Only `no-external` and `self-hosted` gate
anything (both deny `gpt-class`); `external-allowed` and `private-only` carry no
enforcement semantics — the engine's own comment calls the scope string
"descriptive". The select marks which two enforce rather than implying all four
do. We do not silently drop the decorative two: they are on live seeds.

**Edit as well as create.** Opening from an existing row seeds every field from
that policy; the identity select is locked in edit mode (the tag is the key).

The preview panel renders `tokenPolicyPreview` **derived every render** from the
spec on screen, exactly as `RuleBuilder` does, so the reviewed spec and the
committed spec cannot drift. Target copy:

> rd-helion is at **61%** of 2.4M today. At **1.2M** it would stand at **122%** - over the ceiling.
> **3 of the last 47** requests came from `ops-copilot` on `gpt-class`; under scope `self-hosted` all 3 would have been denied.
> Nothing is denied until a `cap-token-spend` intent is enforce-mode for this tag.

Each line renders only when its data exists. An unmetered (group-scoped) policy
says so plainly instead of showing a zeroed meter.

### 3. Staging, not committing

Every mutating action on `/ai/govern` routes through the review tray, matching
the contract the rest of the product now holds and the `/ai/home` widget already
follows.

- The builder's submit calls `setPendingPolicySpec(spec)` and navigates to
  `/discover?draft=policy-new`. `StackPanel` calls `takePendingPolicySpec()`,
  stages `{kind: 'policy', tag, patch}`, and a human commits. This mirrors the
  `rule-new` read-once holder exactly (`setPendingRuleSpec`/`takePendingRuleSpec`
  in `stackFigures.ts`) — set by the author, taken by the tray, nothing
  persisted, so a refresh cannot re-stage.
- The existing `?draft=policy-<tag>` token is left untouched; it hardcodes
  `{enforced: true}` and the widget depends on it.
- `TokenPolicies.tsx`'s Enforce button and guardrail toggle stop calling
  `setTokenPolicy` directly and stage the same way. This closes the split-brain
  and puts Undo behind both.

`{kind: 'policy'}` is already a fully supported `StagedMove` — validity-checked
in `StackPanel`, rendered by `moveLabel`, stated by `stagedDeltas` as a policy
note rather than an invented dollar figure, and applied by `commitMoves`. No new
move kind is needed.

### 4. The status pill stops lying

`TokenPolicies.tsx`'s pill becomes a three-state read of what the engine
actually holds:

| State | Condition | Meaning |
|---|---|---|
| **Draft** | `!enforced` | The policy is written down and gates nothing. |
| **Armed** | `enforced && !intentCapEnforced(tag)` | The flag is set, but no enforce-mode cap intent covers this tag, so the budget still denies nothing. |
| **Enforcing** | `enforced && intentCapEnforced(tag)` | All preconditions hold; at 100% of budget, requests are denied. |

The Armed state names the missing piece and links to declaring the intent. This
is the single highest-truth change in the spec: it converts a badge that
overstates into one that explains.

Note the scope gate is independent of all three: `no-external` and `self-hosted`
deny `gpt-class` regardless of `enforced`. The pill describes the **budget**
gate, and the copy will say so rather than implying it covers everything.

### 5. One engine edit

`cap-token-spend`'s `evaluate` hardcodes the drift threshold:

```js
: m.pct>=80
```

becomes a read of the policy's own soft threshold, defaulting to the current
value so nothing changes for a policy that does not set one:

```js
: m.pct>=(CC.tokenPolicy(scope.id)?.softPct ?? 80)
```

This is the whole engine change. It makes the builder's "Alert at" field real
rather than decorative. `setTokenPolicy`'s shallow merge already accepts the new
field, and the snapshot already covers `tpol`, so persistence and restore need
no work.

## Data flow

`CC.tokenMeterList()` + `decisionLog()` + `agentList()` + `modelRoutes()` +
`intentCapEnforced()` → `tokenPolicyPreview(cc, spec)` → the builder's preview
panel. Submit → `setPendingPolicySpec` → `/discover?draft=policy-new` →
`StackPanel` stages `{kind:'policy'}` → `stagedDeltas` states it → a human
commits via `commitMoves` → `setTokenPolicy`.

No new engine facts are invented. Every figure shown is one the engine already
computes.

## Error handling and edge cases

- **Unmetered identities.** `tokenMeterList` iterates a hardcoded three-key
  object, so a group-scoped policy can never meter. The preview says
  "this identity is not metered, so a budget here is a ceiling with no gauge"
  rather than rendering 0%.
- **Unknown tag.** `setTokenPolicy` auto-creates with permissive defaults. The
  builder therefore treats create and edit as the same commit, and the preview
  makes the resulting policy visible before it exists.
- **A budget edit rewrites the chart's history.** `tokenSeries` synthesizes its
  points from `budget * 0.55 * ramp * rng`, so only the last point is real.
  The builder does not render that series, and the preview speaks only in terms
  of today's metered figure. We do not restate a synthetic past as evidence.
- **Empty `decisionLog`.** The replay states "no requests in the window to
  replay" rather than "0 would be denied", which would read as a safety claim.
- Every staged move can fail at commit; `commitMoves` already returns failures
  rather than swallowing them, and the tray states them.

## Testing

**Unit:** `tokenPolicyPreview` derives from the real seeded engine — correct
`proposedPct` arithmetic, a `wouldDeny` replay that matches what `promptTrace`
would actually decide, `boundAgents` from `agent.app === tag`, `capIntentEnforced`
false until an enforce-mode cap intent is declared, and `unmetered` true for a
group-scoped policy. The builder: opens as a dialog, seeds from an existing
policy in edit mode, preview recomputes on field change, untouched form cannot
submit, submit stages rather than calling `setTokenPolicy`. The pill: Draft,
Armed and Enforcing each render for their real condition. The engine edit: a
policy with `softPct: 60` drifts at 60, and one without still drifts at 80.

**E2e:** on `/ai/govern`, create a policy end to end — builder opens, preview
states figures, submit lands in the tray, commit authors it, and the new row
appears with the right pill. Separately: Enforce on an existing row stages
instead of mutating, and an Armed policy's pill explains why nothing is denied.

## Scope guards (YAGNI)

- **No tri-state guardrail.** Best practice, but our engine's guardrail never
  fails anything — it adds a decorative trace hop and a `guarded` flag. Flag or
  Block would invent a fact. Engine work first, or not at all.
- **No selectable window or metric.** The engine hardcodes total-tokens-per-day.
  The UI states the window rather than offering one it cannot honor.
- **No policy deletion.** `setTokenPolicy` has no delete path, and a deleted
  policy silently means "default allow" for that tag — a security-relevant
  footgun that deserves its own design.
- **No `tokenFindings()` or AI proposal band.** That is the next wave.
- **No agent-scoped policies.** Policies key on tag; an agent reaches one only
  through its `app` tag.
- No changes to `src/components/control-center/` or `src/store/`.

## Deferred (named so they are not lost)

`tokenFindings()` plus an AI proposal band (seven candidate findings already
enumerated, each with a repair the tray commits); making the guardrail real and
tri-state; per-policy metric and window; policy deletion or deactivation;
metering group-scoped policies; surfacing agent activity (`a.last` and the
`hits` agent payload have zero readers today); an AI posture roll-up; the
`Armed` state's inverse — declaring the cap intent from the policy row.

## Logistics

Implemented on `feat/token-policy-builder`, a worktree off `main` at
`/Users/micahbos/Developer/cc-tokens` (outside `.claude/worktrees/` so the
Playwright gate runs). Gate: `npm run verify`.
