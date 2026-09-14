# Proposals + Advisor Implementation Plan

> Spec: docs/superpowers/specs/2026-07-23-proposals-and-advisor-design.md
> Branch: feat/proposals

### Task 1: engine — proposalUrl + takeProposal
**Files:** src/engine/state-share.ts, src/engine/types.ts, new
src/engine/proposal.test.ts
- Refactor serialize(): extract `payloadObject()` (the `d` builder);
  serialize() encodes it (empty-check unchanged).
- `proposalUrl(moves)`: payloadObject() + `pr: moves.map(m => m.kind==='attach'
  ? ['a', m.regionId] : ['s', m.flowId, m.pathId])`; encode (never empty);
  URL form identical to shareUrl().
- applyShareData: after existing replay, decode `d.pr` entries — only
  well-formed tuples become `{kind, ...}` moves; stash on `_.pendingProposal`.
- `takeProposal()`: return `_.pendingProposal ?? null`, then clear.
- types.ts: both methods.
- Tests: round-trip via applyShareData (call CC.b64-decode path indirectly:
  build url, extract ?s=, call the internal via a fresh `CC.hydrate` is
  once-guarded — test through applyShareData exposure: simplest is to
  export nothing new; instead test `proposalUrl` output decodes (b64decode)
  to a payload whose pr matches, and takeProposal round-trip by invoking
  `CC.__testApplyShare(raw)`? NO — keep it honest: expose applyShareData on
  CC (it already exists as an internal; attach as `applyShareData`) and test
  through it. Undo/restore engine state after.

### Task 2: stackFigures — advisorDraft
**Files:** src/features/discover/stackFigures.ts, stackFigures.test.ts
- `advisorDraft(cc): { moves: StagedMove[]; deltas: StagedDeltas }` — steers
  (all) + attaches with bucketSavingMo !== null.
- Tests: draft moves ⊆ opportunities; deltas equal stagedDeltas(cc, moves).

### Task 3: StackPanel — share, open, advisor
**Files:** src/features/discover/StackPanel.tsx, StackPanel.test.tsx
- Mount effect: `const p = cc.takeProposal?.(); ` filter valid against
  opportunity lists; stage + designing=true; `proposalNote` state for the
  tray ("Opened from a proposal link · N moves" / "· M no longer apply").
- Tray: Share proposal button (data-testid="share-proposal") when staged;
  writes cc.proposalUrl(staged) via navigator.clipboard, flips to Copied
  for 2s (UndoControl pattern).
- Header: advisor chip (data-testid="advisor-chip") when !designing and
  advisorDraft(cc).moves.length > 0: label
  `Advisor: N moves · $X/mo · Review`; onClick stages the draft.
- Tests per spec.

### Task 4: e2e + verify + deploy
**Files:** e2e/proposals.spec.ts
- Stub clipboard: `page.addInitScript` overriding navigator.clipboard.writeText
  to store into window.__copiedText.
- Walk 1: discover → design → stage usw2 → Share proposal → read
  window.__copiedText → page.goto(that URL) → tray staged, arrow identical →
  Commit → NaaS figure moved.
- Walk 2: advisor chip visible with $ total → Review → tray count equals
  chip count.
- npm run verify → merge to main → push (Pages deploys) → live verification
  + screenshots.
