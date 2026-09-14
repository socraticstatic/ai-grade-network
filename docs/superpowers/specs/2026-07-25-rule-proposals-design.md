# Andi Rule Proposals, and a Rule Builder Worth Using — Design

**Date:** 2026-07-25
**Surfaces:** NaaS Govern (`/naas/govern`), the Andi panel, the `/discover` review tray
**Status:** Design approved; awaiting spec review before planning.

## Problem

Two problems that meet in one place.

**1. The engine detects far more than any pixel shows.** `CC.threatFindings()`
(`src/engine/state-findings.ts`) returns four severity-ranked behavioral
findings, each computed live from the flow table and the `fixes` flags, each
naming the preventive rule that answers it. It has **zero UI consumers**. Its
own header comment describes the intent: "Each finding GRADUATES into a
preventive rule via promote(): the article's detect-then-prevent loop, made
operable." Nothing renders it, so the loop is not operable.

The same is true of `REQUIREMENTS` + `addPolicy`/`enforcePolicy`/`previewPolicy`
(0 consumers), `policyHits()` per-rule counters ticking every 3s (0 consumers),
the approvals ceremony `pendingRules`/`requestRule`/`approveRule` (0 consumers),
and `latencyTrend()`/`regionJitter()`/`topTalkers()` (0 consumers). This spec
takes the first of these; the rest are named in Deferred.

**2. Andi never advises unprompted, and rule authoring is broken.** Andi is
closed by default (`AndiPanel.tsx`), desktop-only (`hidden min-[1024px]:flex`),
carries no badge or count, and its Resolve cards vanish as soon as the user
types (`thread.length === 0` gate). Nothing subscribes to engine events to push
anything. Meanwhile `RuleBuilder.tsx` opens *below* the rules table with no
scroll or focus move (the trigger is at the top of the card), is not a dialog
and not a `<form>` (so Escape does not close and Enter does not submit),
defaults to `deny any -> any`, discards `addRule`'s `null` return so a failed
author looks identical to a success, and wipes its dry-run preview on every
keystroke so what a user approved is never what they commit.

## Scope

A **thin end-to-end slice**: one finding source, surfaced prominently, resolved
through the existing staging contract, with the builder fixes that path
touches. Exhaustive authoring work (edit, delete, unenforce, priority,
token-policy authoring) is explicitly deferred.

## What is already true (verified, not assumed)

- `CC.threatFindings()` returns `{id, severity, source, title, detail, rule,
  active, promote}`. `severity` is `'crit' | 'high'`. `active` is a **boolean**,
  already evaluated. `rule` is the **id of an existing seeded rule**, not a spec.
- The four findings and their rules: `gd-dns`->`pol-dns`, `gd-s3`->`pol-perimeter`,
  `gd-fin`->`pol-fin`, `gd-insp`->`pol-insp`. All four rules are `system: true`,
  ship unenforced, and each carries a `fix` key, so `ruleEnforced(r)` reads
  `fixes[r.fix]`.
- `active()` is recomputed from the model, so enforcing the rule drains the
  finding automatically. No bookkeeping is needed to retire a resolved proposal.
- `{kind: 'enforce', ruleId}` already exists as a `StagedMove`
  (`stackFigures.ts`) and is supported end to end: validity-checked in
  `StackPanel`, rendered by `moveLabel`, stated as a `policyNote` by
  `stagedDeltas` (never as invented dollars), and applied by `commitMoves`.
- `StackPanel` already parses `?draft=andi` and `?draft=intent-<id>`; a third
  token is a small addition at the same site.
- `dryRun(spec)` accepts an unsaved, `pri`-less rule-shaped object and returns
  `{matched, shadowed, gbps, blocked, pending}`. It is pure.

## The governing contract

**"The machine stages, never commits."** (`StackDeckPage.tsx`). Andi may
propose; only a human commits, from the `/discover` tray, with Undo behind it.
Nothing in this design calls `addRule` or `enforceRule` directly from a
proposal. In particular `promote()` is deliberately **not used**: it calls
`enforceRule` immediately, which would commit without staging. We route around
it through the tray.

## Architecture

### 1. `ruleProposals(cc)` — one derivation, three surfaces

New pure module `src/features/govern/ruleProposals.ts`, sitting beside the
existing `workQueue.ts` pattern (a derivation, no React, no formatting).

```ts
export interface RuleProposal {
  id: string;                    // 'finding-gd-dns'
  findingId: string;             // 'gd-dns'
  severity: 'crit' | 'high';
  source: string;                // 'GuardDuty · Trojan:Classified/DNSDataExfiltration'
  title: string;
  detail: string;                // the engine's own sentence, never rewritten
  ruleId: string;                // the existing rule that answers it
  ruleName: string;
  /** dryRun of the existing rule's spec: what enforcing it would touch. */
  impact: { matched: number; gbps: number };
}

export function ruleProposals(cc: CloudControl): RuleProposal[];
```

Rules: include a finding only when `active === true` AND its rule exists in
`ruleList()` AND `!cc.ruleEnforced(rule)`. Sort `crit` before `high`, then by
`impact.gbps` descending. Every figure is read at call time; nothing is cached.

The same derivation feeds the Govern band, Andi's cards, and the nav badge, so
the three can never disagree.

### 2. `ProposalBand` on Govern

`src/features/govern/ProposalBand.tsx`, rendered above the rules table in
`RulesPanel`. One row per proposal: severity chip, title, the engine's `detail`
sentence, the `source` attribution, and the impact stated in the engine's own
figures ("would match 6 flows carrying 2.4 Gbps"). Two actions per row:

- **Enforce it** (primary) - stages `{kind: 'enforce', ruleId}` by navigating to
  `/discover?draft=finding-<findingId>`.
- **Tighten it** (secondary) - opens the rule builder pre-filled from the
  existing rule's spec (see 4).

Empty state when there are no active proposals: a single calm line stating that
nothing currently needs a rule. The band never renders an empty container.

### 3. Andi: a badge, a card family, and cards that stop vanishing

- **Badge.** The Andi launcher in `MainNav` gains a count from
  `ruleProposals(cc).length`, so advice is discoverable from any page. Zero
  proposals renders no badge.
- **Card family.** `andiResolveCards` gains a `move: 'proposal'` family built
  from the same derivation, rendered beside the existing intent and draft cards,
  with the same two actions as the band.
- **Cards stop vanishing.** Today `AndiPanel` renders Resolve cards only when
  `thread.length === 0`, so asking anything hides the advice. Proposal cards
  persist alongside the thread.

Andi stays closed by default and desktop-only; the badge plus the Govern band
are what make the advice prominent. Auto-opening the panel is deliberately not
done - it takes over the screen uninvited.

### 4. "Tighten it": the builder, pre-filled

**Review opens the builder seeded from the existing rule's spec**, with a
provenance line: "Proposed by Andi from: DNS data exfiltration from
classified-helion." Every field is editable before anything happens. Committing
this path authors a **new** rule rather than mutating the seeded system rule
(`removeRule` already refuses system rules; we do not fight that).

This is the seam that makes the feature coherent: a proposal and a hand-written
rule become the same object on the same review path.

Requires a new staged-move kind:

```ts
| { kind: 'rule'; spec: RuleSpec }
```

Touch points, each small and named: the union in `stackFigures.ts`; the validity
predicate in `StackPanel` (`dryRun(spec).matched.length > 0` and no identical
rule already in `ruleList()`); `moveLabel` (label = the rule name, detail =
`dryRun` matched/gbps, engine-derived and checkable); `stagedDeltas`
(a `policyNote`, never a dollar figure the engine cannot stand behind); and
`commitMoves` -> `cc.addRule({...spec, enforceNow: false})`, whose `null` return
must be reported as a failed move rather than swallowed.

### 5. Builder fixes, scoped to this loop

Only what this path touches:

- **Real dialog.** `role="dialog"`, `aria-modal`, focus moves to the first
  field on open, Escape closes, and the panel is a `<form>` so Enter submits.
  This alone fixes "pressing New rule appears to do nothing", since the form
  currently mounts below a long table with no scroll or focus move.
- **No `deny any -> any` default.** The unedited initial form cannot be
  submitted; the Add button stays disabled until the spec differs from the
  initial state. A proposal-seeded form arrives already valid.
- **Live dry-run.** The preview recomputes as fields change instead of being
  cleared, so the approved spec and the committed spec are the same object.
  Shadowing names **which** rule shadows, not just how many.
- **Failure is visible.** `addRule` returning `null` renders an error and keeps
  the form open, matching the pattern `GroupBuilder` already established.
- **Ports honest.** Add `53` to the offered list (the DNS-exfil flows cannot be
  port-scoped without it), and fix the substring match so `ports: '443'` stops
  matching a flow whose ports are `'5432, 8443'`.

## Data flow

`CC.threatFindings()` + `ruleList()` + `dryRun()` -> `ruleProposals(cc)` ->
{ ProposalBand, Andi cards, nav badge }. An action navigates to
`/discover?draft=finding-<id>` (or opens the builder). `StackPanel` stages the
moves; `stagedDeltas` states their consequences; a human commits via
`commitMoves`. Enforcing drains the finding's `active()` predicate, so the
proposal disappears on its own.

No new detection is invented in this spec. Every figure shown is one the engine
already computes.

## Error handling and edge cases

- A finding whose `rule` id is missing from `ruleList()` is skipped, not
  rendered broken.
- A finding whose rule is already enforced is skipped (that is the resolved
  state).
- `commitMoves` failures are surfaced by the tray, per its existing contract of
  returning failures rather than swallowing them; a `null` from `addRule` counts
  as a failure.
- Zero proposals: no badge, and the band renders its calm empty line.
- The builder's live dry-run must not fire on an invalid spec; when the spec
  cannot be dry-run, the preview area states that rather than showing zeros.

## Testing

**Unit:** `ruleProposals` derives from the real seeded engine, drops findings
that are inactive / already enforced / missing their rule, and sorts crit-first;
the band renders severity, source, detail and impact; the badge count matches
the derivation; Andi's proposal cards persist when the thread is non-empty;
"Tighten it" seeds the builder from the existing rule's spec; live dry-run
updates on field change; a `null` from `addRule` surfaces an error and keeps the
form open; `{kind:'rule'}` moves round-trip through `moveLabel` and
`stagedDeltas`.

**E2e:** the full loop. Govern shows the band; **Enforce it** stages into the
tray and commits; the rule becomes enforced and **the proposal disappears**
because its finding went inactive. Separately, **Tighten it** opens a pre-filled
builder, an edited spec dry-runs, stages, commits, and authors a new rule. The
Andi badge count matches the number of rows on the band.

## Scope guards (YAGNI)

- One finding source only (`threatFindings`). No new detection scans.
- `promote()` is not called anywhere; staging replaces it.
- No editing, deleting, unenforcing, or reordering of existing rules.
- No token-policy authoring UI.
- Andi does not auto-open, and gains no notification system beyond the badge.
- The orphaned `src/components/monitoring/alerts/AlertRuleMaking.tsx` subsystem
  is left untouched; it sits behind redirected routes and is not revived.

## Deferred (named so they are not lost)

Later specs, in rough priority: rule edit / delete / unenforce and priority
reordering; token-policy authoring (today the four policies are hardcoded seeds
and creating one is console-only); surfacing `policyHits()` so enforcement is
watchable; the `REQUIREMENTS` + `addPolicy` custom-policy authoring path, which
would make the two live evaluators (`latency-slo`, `require-private-path`)
reachable; proposals sourced from drift signals (`latencyTrend`, `regionJitter`)
and from `routeAdvisor`'s dropped `diversify` recommendations; the approvals
ceremony.

## Logistics

Implemented on `feat/rule-proposals`, a worktree off `main` at
`/Users/micahbos/Developer/cc-rules` (outside `.claude/worktrees/` so the
Playwright gate runs). Gate: `npm run verify`.
