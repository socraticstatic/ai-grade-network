# GA Re-architecture + Popup Hygiene Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship spec `2026-07-10-ga-rearchitecture-design.md`: LMCC goes GA through the wizard only; tour/DemoBar move behind the feedback panel.

**Architecture:** One master-switch flip (`CURRENT_PHASE`) plus surgical removals in App.tsx, a `uiSlice` flag, and two action rows in FeedbackWidget. No new modules.

**Tech Stack:** React 18, TS, Zustand 4, Tailwind Flywheel tokens, Vitest.

## Global Constraints

- Flywheel tokens; dot+text statuses; no pillbox tabs.
- Zero-touch on Test Lab engine; only pack registry line changes.
- GA facts: metros San Jose + Ashburn; 4 channels (2/datacenter); per-channel BGP (open item noted in spec).

---

### Task 1: GA flip + lmccService tests

- [ ] Test `src/data/lmccService.test.ts`: `CURRENT_PHASE === 'ga'`; `getAvailableMetros()` names contain San Jose and Ashburn; `getBandwidthOptions()` max ≥ 100000 Mbps.
- [ ] Flip `CURRENT_PHASE` to `'ga'` in `src/data/lmccService.ts`.
- [ ] Run tests; sweep LMCC surfaces for hardcoded Preview copy (`grep -rn -i "preview" src/components/marketplace src/components/wizard/screens src/components/connection/lmcc src/components/Marketplace.tsx`) and fix each hit to GA framing.
- [ ] Commit.

### Task 2: Unmount auto-modal; retire lmcc-r1

- [ ] `App.tsx`: remove `NetBondMax_Modal_CustomerDemo` import + conditional mount.
- [ ] `src/data/testLab/packs/index.ts`: `STUDY_PACKS: StudyPack[] = []` with a comment pointing at `./lmcc-r1` history; fix registry tests if counts assumed.
- [ ] Typecheck + test-lab suite green. Commit.

### Task 3: Tour + DemoBar behind the feedback panel

- [ ] `uiSlice`: add `demoBarVisible: boolean` (default false) + `setDemoBarVisible(v: boolean)`.
- [ ] `DemoBar`: render only when flag true; on 15s auto-hide call `setDemoBarVisible(false)`.
- [ ] `App.tsx`: delete the `tour.startTour()` auto-start block; pass `onStartTour={tour.startTour}` to `<FeedbackWidget />`.
- [ ] `FeedbackWidget`: accept optional `onStartTour`; in the select step render two rows above feedback types — "Take the product tour" (calls onStartTour, closes panel) and "Show demo role switcher" (sets flag, closes panel).
- [ ] Typecheck. Commit.

### Task 4: E2E per spec Testing section; docs touch-up (`docs/test-lab-setup.md` retired-codes note); memory update; final commit.
