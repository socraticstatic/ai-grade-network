# Shareable Proposals + the Advisor — Design

**Date:** 2026-07-23. Approved (Micah: "Proceed"). The loop this closes:
design → simulate → share → approve → commit. Inspiration: Terraform Cloud's
collaborative plan reviews (standard in IaC, absent from network portals) and
the 2026 draft-then-approve AI pattern (the advisor drafts, a human commits).

## Part 1 — proposal links

A proposal is a share link that carries the session state PLUS the staged,
uncommitted moves. The recipient opens it and lands exactly where the sender
stood: same estate, same tray, same engine-priced deltas — with Commit in
front of them.

- **Encoding:** the existing ?s= payload gains a `pr` field — compact moves:
  `['a', regionId]` for attach, `['s', flowId, pathId]` for steer. The rest
  of the payload is unchanged, so every existing share link still hydrates.
- **Engine:** `CC.proposalUrl(moves)` mints the link (serialize()'s payload
  object + `pr`; never empty). `applyShareData` surfaces a decoded `pr` via
  `CC.takeProposal()` — return-and-clear; malformed entries are dropped,
  never applied. Proposal moves are NEVER auto-committed; they only stage.
- **UI (StackPanel):** on mount, `takeProposal()`. Valid moves (still present
  in the current opportunity lists) stage the tray with design mode on and
  the tray notes "Opened from a proposal link · N moves" — plus how many no
  longer apply, when the estate has moved on. The tray gains **Share
  proposal** whenever moves are staged: copies proposalUrl(staged) to the
  clipboard, button flips to Copied (UndoControl's pattern).

## Part 2 — the advisor

The advisor is a derivation, not a daemon: `advisorDraft(cc)` = every steer
recommendation the engine already makes (routeAdvisor) plus every attach the
arbitrage table prices (bucketSavingMo ≠ null), with stagedDeltas over them.

- **UI:** when the draft is non-empty and design mode is off, the stack
  panel header shows the advisor chip: "Advisor: N moves · $X/mo — Review".
  Clicking it opens design mode with the draft staged. From there it is the
  same tray: adjust, commit, discard — or share it as a proposal.
- Nothing auto-commits, ever. The advisor's whole authority is a pre-filled
  tray.

## Honesty invariants
- A proposal's deltas are recomputed on the receiving engine from the same
  getters — the link carries intentions, never figures, so a stale link
  cannot state a stale price.
- The advisor stages only moves the engine itself prices.
- Malformed or unknown proposal entries are dropped and counted, not guessed.

## Testing
- Engine: proposalUrl round-trip (encode → applyShareData → takeProposal);
  malformed pr shapes dropped; take clears.
- StackPanel: advisor chip states the draft's count and priced total, click
  stages; Share proposal writes proposalUrl(staged) to the clipboard;
  a pending proposal on mount stages the tray and notes dropped moves.
- e2e (proposals.spec.ts): stage → Share proposal → open the captured URL in
  a fresh context → tray staged with the same latency arrow → Commit → the
  estate moved. Advisor: chip → Review → tray matches advisorDraft.
