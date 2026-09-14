# Test Lab — Setup & Operating Guide

The Test Lab lives at `/#/test-lab` (the app uses hash routing — share links with the `#`).
Participants need an invite code; codes live in each study pack's scripts.

## Results pipeline (Google Sheets)

### 1. Create the spreadsheet
1. Create a Google Sheet named `NetBond Test Lab Results`.
2. The Apps Script auto-creates `Sessions` and `TaskResults` tabs on first submission. Add a `Summary` tab for analysis.

### 2. Install the Apps Script
1. Extensions → Apps Script. Delete the boilerplate, paste `scripts/testlab-apps-script.gs`.
2. Replace `SECRET` with a long random string (`openssl rand -hex 24`).
3. Deploy → New deployment → type **Web app** → Execute as **Me** → Who has access: **Anyone**. Copy the web app URL.

### 3. Configure the app
In `.env.local`:

```
VITE_TESTLAB_WEBHOOK=https://script.google.com/macros/s/DEPLOYMENT_ID/exec
VITE_TESTLAB_TOKEN=<paste the same value you set as SECRET>
VITE_BUILD_ID=2026-07-10
```

Restart the dev server / rebuild for deploys. **Without these vars the Test Lab still works** —
results queue locally and participants get a download-results fallback at the end.

### 4. Summary tab
Suggested per-task formulas (confirm column letters against the header row — columns are
header-driven and may extend over time). Always filter `preview = FALSE`.

- Completion outcomes per task: pivot `TaskResults` by `taskId` × `outcome`.
- Median duration: `=MEDIAN(FILTER(TaskResults!durationMs_col, taskId_col=$A2, preview_col=FALSE))`
- Mean SEQ (1–7): `=AVERAGEIFS(easeRating_col, taskId_col, $A2, preview_col, FALSE)`
- Direct-completion rate: count `directness = "direct"` over verified+claimed rows.
- Hints per task: `=AVERAGEIFS(hintsUsed_col, taskId_col, $A2, preview_col, FALSE)`
- UMUX-Lite → SUS (Sessions tab): `SUS ≈ 0.65 * ((umuxCapabilities + umuxEaseOfUse - 2) / 12 * 100) + 22.9`

Cohorts: filter by `inviteCode`. Rounds: filter by `featureVersion` + `appBuild`.

## Authoring studies — the Study Builder

Open `/#/test-lab/builder` (hidden route, desktop only).

1. **New study** → pick a persona (12 in the library, each mapped to an RBAC role with
   editable bio/goal). Their common tasks come pre-suggested.
2. **Add tasks** from the persona's suggestions, the full template library (~26 GA-framed
   templates), or blank. Verification is a menu (connection/hub/VNF/group created, nothing
   created for permission walls, or comprehension-only) — no code.
3. **Codes** auto-generate from the study id (`NETWORK-PLANNER-GA-R1` + `-PREVIEW`).
   "Copy invitation text" produces the participant blurb with the right URL.
4. **Preview immediately**: drafts resolve live — enter the preview code at `/#/test-lab`
   and walk your own study. Validation shows on the editor as you work.
5. **Publish through Helen**: click "Copy for Helen", paste it to Helen with "publish this
   study". She commits it to `src/data/testLab/packs/studies/` and deploys. Same channel
   for change / extract / remove — every published study is a git-versioned JSON file.
6. **New round**: Duplicate as new round (bumps `-r2` and regenerates codes). Substantive
   task edits auto-bump the task version; results separate in the Sheet by
   `featureVersion` + invite code.

## Running a code-defined study (bespoke verifiers)

1. Author or edit a pack in `src/data/testLab/packs/<pack-id>/` (personas, tasks, verifiers, seeds).
2. Register it in `src/data/testLab/packs/index.ts` (one line).
3. Dry-run it: open `/#/test-lab`, enter the script's preview code (e.g. `LMCC-R1-PREVIEW`).
   The briefing screen flags any verifier that throws (store-shape drift). Preview sessions are
   stamped `preview=true` and get a skip button in the HUD.
4. Send participants the URL + invite code (e.g. `LMCC-R1`). One code per cohort/round.

### Invite codes

`lmcc-r1` (codes `LMCC-R1`, `LMCC-R1V` + previews) was **retired 2026-07-10** with the GA
flip — it tested Preview-era behavior (1 Gbps cap) that no longer exists. Author the GA
round in the Builder or hand Helen the GA requirements; new codes come from the new study.

## Architecture contract

- Engine (`src/components/test-lab/`, `testLabSlice`, `testLabSubmit`) never imports feature code
  and never imports packs except via the registry.
- Packs import only `src/types/testLab.ts` (plus app data they choose to reference).
- The product surface under test is never modified (zero-touch): the lab observes the router,
  the store, and a document-level first-click listener only.
- Ending or abandoning a session restores the store snapshot taken at Begin — participants leave
  no residue in demo state.
