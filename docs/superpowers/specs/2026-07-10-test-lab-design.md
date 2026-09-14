# Test Lab — Persona-Driven Task Testing

**Date:** 2026-07-10
**Status:** Approved design
**First study:** LMCC Round 1 (pre-GA)

## Purpose

A section of the NetBond Advanced mock for unmoderated, persona-driven task testing of new (or existing) features. Participants receive an invite code, adopt a persona, perform tasks in the real app, and their results — completion, paths taken, timings, hints, ratings, feedback — flow automatically to a Google Sheet.

## Decisions (settled during brainstorming)

| Decision | Choice |
|---|---|
| Audience | Self-guided participants (colleagues/stakeholders), unmoderated |
| Result collection | Google Sheets via Apps Script webhook; incremental per-task submission; localStorage queue + export/mailto fallback |
| Persona | Lens + app state: RBAC impersonation + seeded store data |
| Task experience | Unguided HUD with progressive hints (hint use logged) |
| Completion | Store-verified where possible (`verified` vs `claimed`); comprehension checks for unverifiable tasks |
| Unhappy paths | Permission walls + bad-input scenarios only (no fault injection) |
| Access | Invite codes = cohort labels |
| Architecture | In-app lazy module; engine/pack bifurcation (below) |

## Architectural rule: Engine vs. Study Packs

**The engine is feature-agnostic.** It knows sessions, personas-as-data, tasks-as-data, the HUD, telemetry, verification-running, and submission. It never imports feature code. With zero packs installed, the app compiles and `/test-lab` shows "no active studies."

**A Study Pack** is one self-contained folder per feature under test:

```
src/data/testLab/packs/
  lmcc-r1/
    index.ts        ← exports one StudyPack object
    personas.ts
    tasks.ts
    verifiers.ts    ← selectors against store state
    seeds.ts        ← state planting + catch-up seeds
```

`packs/index.ts` is the registry — the single line touched to add or retire a study. The registry validates invite-code uniqueness across packs at load time (dev-time error on collision).

**Contract:** engine code never imports from `packs/` except through the registry; packs never import engine internals — only shared types (`src/types/testLab.ts`).

```ts
interface StudyPack {
  id: string;              // 'lmcc-r1'
  feature: string;         // 'LMCC'
  featureVersion: string;  // 'pre-GA 0409'
  personas: TestPersona[];
  tasks: TestTask[];
  scripts: TestScript[];   // task orderings + invite codes
  verifiers: Record<string, (state: StoreState) => boolean>;
  seeds: Record<string, (store: StoreApi) => void>;
}
```

## Data model

- **TestPersona** — `{ id, name, bio, goal, rbacRole, seedId }`. Session start impersonates `rbacRole` and runs the seed.
- **TestTask** — `{ id, version, title, scenario, successCriteria, path: 'happy' | 'permission-wall' | 'bad-input', verifyId?, comprehensionCheck?, hints: string[], startRoute?, reseed?, catchUpSeedId?, expectedRoutePrefixes? }`.
  - `scenario` is participant-facing, written in user-goal language. `successCriteria` is **never shown to participants** — it would leak the solution; it exists for the logger and the author.
  - `catchUpSeedId`: applied automatically when the preceding task didn't verify, planting the state that task would have created, so sequential scripts survive give-ups.
  - `expectedRoutePrefixes`: optional; enables direct vs. indirect completion classification.
- **TestScript** — `{ id, feature, featureVersion, personaId, taskIds, inviteCodes }`. Invite code doubles as cohort label. `featureVersion` + per-task `version` + app build stamp keep pre-GA rounds separable from later rounds.
- **TaskResult** — outcome (`verified` | `claimed` | `gave-up`), duration, route trail (timestamped route changes), first click (element label + route), directness (`direct` | `indirect` | n/a), hints used, SEQ ease rating (1–7), optional comment, issue reports (stamped with filing route).
- **Session** — sessionId, inviteCode, participantName?, scriptId, personaId, appBuild, userAgent, timestamps, results, wrap-up (UMUX-Lite two 7-point items + open questions), `preview` flag.

## Participant journey

1. `/test-lab` → invite code (validated against pack scripts) → optional name.
2. Persona briefing card (bio, goal). "Begin testing."
3. Session start: **snapshot the store**, seed, impersonate, navigate to task 1 `startRoute`, HUD appears.
4. HUD per task: scenario (goal language only), Hint (progressive; each logged), Report issue (inline), Done (opens SEQ + optional comment, advances), Give up.
5. Verification surfaces as a quiet completion nudge ("Looks like that's done — wrap up this task?"), **not** a live checklist — avoids click-until-green behavior.
6. Wrap-up: UMUX-Lite + open questions → submit → confirmation.
7. Session end (complete or abandon via HUD): **restore the store snapshot**, clear impersonation.

Mid-session refresh resumes: task pointer, elapsed time, impersonation, and seed re-applied idempotently. All session state persists to localStorage continuously.

## Session lifecycle hygiene

- Snapshot on start = serializable state only (data, not action functions); restore via `setState`. The main store persists selectively to `appState-v3` — session-seeded state must not leak into it after restore.
- Exit is an explicit state: complete, abandon, or moderator kill (clearing localStorage key). All paths restore the snapshot.

## Telemetry (zero-touch principle)

The tested product surface is never modified — no test-ids added for the lab, no conditional rendering, no observer effect. The lab watches only:

- **Route trail** — router location changes with timestamps while a task is active.
- **First click** — one global capture listener records the first interaction after task start (element text/aria-label + route).
- **Store verification** — the active task's verifier runs on store subscription; verified-then-Done logs `verified`, Done without passing logs `claimed`.

Unhappy-path scoring: permission-wall tasks succeed when the verifier confirms no mutation occurred **and** the comprehension check ("why couldn't you?") is answered correctly. Bad-input tasks verify the recovered end-state.

## Results pipeline

- Apps Script web app (`doPost`) appends to two tabs: **Sessions** (one row/session) and **TaskResults** (one row/task, denormalized with session/persona/cohort columns).
- Each task result POSTs as it completes (localStorage queue + retry); the session row lands at wrap-up. Abandoned sessions still yield finished tasks, and abandonment is visible in the data.
- POST as `text/plain` with `no-cors` (standard Apps Script pattern). Shared-secret token in payload. Endpoint via `VITE_TESTLAB_WEBHOOK`.
- **Webhook optional:** unset or unreachable → lab still runs; queue persists; wrap-up offers download-JSON and mailto fallback.
- Deliverable includes a **template spreadsheet with a prebuilt Summary tab**: per-task completion rate (verified/claimed/gave-up), direct-completion rate, median time, mean SEQ, hint usage — filterable by cohort, previews excluded.

## Preview mode

A special invite code per script runs the full experience with `preview: true` stamped on all rows (filtered out in Summary), skip-ahead controls, and a **verifier dry-run**: all of the loaded script's verifiers execute against seeded state on entry; any that throw are flagged before a participant sees them (guards against store-shape drift as features churn).

## UI standards (contract, not vibe)

- Flywheel tokens only (`fw-*`, `figma-*` type scale); reuse existing primitives; entry screens follow the DesignAssetsPage header pattern.
- Statuses = dot + text, never pills. Progress = text ("Task 2 of 6"), no pillboxes. Any table follows house rules (no box wrapper, `table-fixed`, truncate, no horizontal scroll). One Export per surface.
- HUD: collapsible to a pill, draggable between corners, z-index below the modal layer (`z-[200]`), persona chip always visible (reopens briefing). Desktop-only via `MobileDesktopOnly`.
- Lab module lazy-loaded; HUD mounts only during an active session.

## First study pack: `lmcc-r1`

One persona (enterprise cloud network admin, deadline-driven). ~6 tasks: discover LMCC → order last-mile circuit (happy) → bad-input bandwidth with recovery → permission-gated attempt → billing-implication comprehension check → order-status interpretation. Tagged `featureVersion: 'pre-GA'`. Tasks are authored against what is operable in the app **today**; LMCC surfaces that exist only as requirements content become findability/comprehension tasks, not verified flow tasks. Round 2 is a new pack after GA changes.

## Consciously excluded

- Screen/session recording (infra + privacy weight; route trail + first click covers the mock's needs)
- Misclick heatmaps (would violate zero-touch)
- Task-order counterbalancing / multi-persona rotation (author a second script instead)
- Fault injection (cut during questioning)
- Per-task time limits (duration data will show if needed)
- In-app results dashboard (the Sheet is the dashboard)

## Testing

- Vitest: slice state machine, verifier registry, catch-up seeding, snapshot/restore, invite-code resolution + uniqueness validation.
- Manual E2E per house rules: run dev server, walk LMCC Round 1 end-to-end as a participant, confirm rows land in the real sheet, refresh mid-session to prove resume, abandon to prove restore.

## Known risks

1. **Snapshot/restore** — store mixes data and actions; snapshot must be data-only and must not corrupt `appState-v3` persistence. Highest-risk item; test first.
2. **LMCC operability** — parts of LMCC may not be operable flows yet; task authoring adapts (see First study pack).
3. **Client-side invite codes** — extractable from bundle; acceptable for a mock; sheet-side dedupe by sessionId.
