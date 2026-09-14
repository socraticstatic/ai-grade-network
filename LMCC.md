# LMCC — NetBond Advanced Max Demo

This file exists to prevent session-to-session context failure. Read it before touching anything in this project.

---

## The Two Deliverables

There are exactly two things in this codebase that matter:

**1. The product** — what AT&T will ship to customers.

- `src/components/common/NetBondMaxBanner.tsx` — THE product deliverable. Self-contained modal that slots into the existing NetBond portal. Handles the entire customer journey internally: choice → paste → confirm → provisioning timeline → live. No dependency on other LMCC components. A real Preview customer sees this.

Do not touch this unless explicitly working on the product. Changes here affect what AT&T customers see.

**2. The demo components** — used only inside the requirements page to show AT&T stakeholders what the experience should look and feel like.

- `src/components/connection/lmcc/LMCCKickoffModal.tsx` — demo kickoff modal. Works as a coordinator: on key confirm it calls `onStartSetup()` and hands off to LMCCOnboardingDrawer. Does NOT handle provisioning itself.
- `src/components/connection/lmcc/LMCCOnboardingDrawer.tsx` — demo provisioning drawer. Paired with LMCCKickoffModal.
- `src/components/pages/AWSWorkflowPage.tsx` — the requirements page (renders at `/#/demo`). Imports and renders the demo components.
- `src/components/pages/SecondaryAssets.tsx` — requirements validation and secondary assets tabs.

LMCCKickoffModal and LMCCOnboardingDrawer are NOT shipped to customers. They exist to communicate requirements to stakeholders. Active design/content work happens here.

**The distinction in one sentence:** NetBondMaxBanner ships. LMCCKickoffModal + LMCCOnboardingDrawer demonstrate.

---

## The Disclaimer Modal

When you load `/#/demo`, a modal appears immediately:

> "DESIGN PROOF OF CONCEPT / Not part of the AT&T NetBond® Advanced portal"

**Everything behind this modal is requirements content.** The interactive flow simulations, wizard steps, status progressions, billing notes — all of it is inside the requirements document, not the product.

When someone says "the demo page" or "the requirements," they mean `AWSWorkflowPage.tsx` and `SecondaryAssets.tsx`. When they say "the product" or "customer-facing," they mean the three components listed above.

---

## The Bible

All content, copy, flows, and constraints come from one authoritative source:

`/Users/micahbos/.claude/projects/-Users-micahbos-Desktop-cloud-router-ui-att-netbond-sdci/memory/project_lmcc_bible.md`

Read it before making any content change. Every word in the demo page must match it exactly.

Key facts from the Bible (not exhaustive — read the full file):

- **Customer choices (GA)**: location, bandwidth, AWS account number — three choices at GA
- **Customer choices (Preview)**: ONE input only — AWS account number. Location is fixed (San Jose, CA). Bandwidth is fixed (1 Gbps). Both read from API. Do not describe Preview as "three choices."
- **Technical description**: "Hosted Direct Connect solution — 4 independent connection paths using 4 separate edge equipment across 2 data centers. If one path fails, others maintain traffic."
- **Flow 03 only**: "Key Generated" status step
- **Flow 04**: starts at "Negotiating Parameters" (after key validation). Does not go through Key Generated.
- **Both flows converge at**: Negotiating Parameters -> Live
- **LA Metro**: Do not show in Preview. Do not design for it. It is Infra Pending — not available.
- **Preview billing**: manual. GA billing triggers when BGP session reaches Established.

### Phase-Check Rule (mandatory before writing any copy)

Before writing or editing any text in the requirements document, explicitly state:

1. **Which phase does this content describe?** Preview / GA / both?
2. **Do the constraints match?** Preview: 1 input, San Jose only, 1 Gbps fixed, manual billing. GA: 3 inputs, 2 metros, dynamic bandwidth, automated billing.
3. **Does the Bible support this wording for this phase?** Quote the section.

Do not copy Bible text verbatim without verifying it applies to the phase being described. The Bible documents the full product — Preview is a strict subset.

---

## Dev Server

**Command:** `preview_start("sdci-dev")`

Port: `5173`. Use `mcp__Claude_Preview__*` tools only (not Chrome MCP, not browser_batch).

### Worktree Problem (structural — read this)

Claude Code sessions may anchor to a worktree created at session start. Run `git worktree list` after every push — if an active worktree exists, fast-forward it:

```bash
git worktree list
# If a worktree appears, fast-forward it:
git -C <worktree-path> merge origin/main --ff-only
```

As of May 2026, no active worktrees remain (`git worktree list` shows only the main project). The stale worktrees in `.claude/worktrees/` are inert — they cannot be removed (git 2.15, sandbox restrictions) but do not interfere.

---

## Verification Before Commit (mandatory)

After every content or UI change:

1. Take a `preview_screenshot` of the affected area.
2. Read the visible text. Confirm it matches the intent and the Bible for the correct phase.
3. Only then commit and push.
4. After push, fast-forward the worktree (see above) so the browser reflects the change.

Do not commit and declare done without a screenshot confirming the result.

---

## Git Rules

- Push directly to main. No branches. No PRs.
- Commit frequently. One logical change per commit.
- Pre-commit hook scans for secrets — do not use `--no-verify`.
- After every push: fast-forward the active worktree.

---

## SecondaryAssets.tsx — Component Name

The `where` field in SecondaryAssets requirement rows references `NetBondMaxBanner` (not `LMCCKickoffModal`, not `KickoffModal`). This was corrected in May 2026. Do not revert it.

---

## What Not To Do

- Do not edit `NetBondMaxBanner.tsx`, `LMCCKickoffModal.tsx`, or `LMCCOnboardingDrawer.tsx` unless explicitly working on the product.
- Do not confuse the disclaimer modal with the product's kickoff modal. They are different components.
- Do not use Chrome MCP or browser_batch for this app. Use `mcp__Claude_Preview__*`.
- Do not add features beyond what was asked.
- Do not add LA Metro to any visible UI in Preview mode.
- Do not use "AWS account ID" — it is "AWS account number" per the Bible.
- Do not copy Bible text into copy without verifying it applies to the current phase.
- Do not commit without a browser screenshot confirming the change looks correct.
