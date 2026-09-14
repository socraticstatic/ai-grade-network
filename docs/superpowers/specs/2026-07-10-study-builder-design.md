# Study Builder — Self-Service Authoring for the Test Lab

**Date:** 2026-07-10
**Status:** Approved design
**Builds on:** `2026-07-10-test-lab-design.md` (engine/pack architecture, shipped)

## Purpose

Let Micah author complete Test Lab studies without code: pick a persona from a standing
library, assemble tasks from a template library (or edit/author them), generate invite
codes, preview instantly, and publish through Helen. GA-framed (LMCC Preview has launched;
all new content targets GA).

## Decisions

| Decision | Choice |
|---|---|
| Publish path | **A**: drafts live in localStorage (instant preview); publish = JSON handed to Helen → committed to `src/data/testLab/packs/studies/*.json` → deployed. Git is the version spine. |
| Custom-task verification | Declarative verifier catalog (parameterized store checks), not arbitrary code |
| Helen interface | Copy for Helen / Export JSON / Import JSON on every study; insert/change/extract/edit/remove are one-message requests |
| Framing | GA. `lmcc-r1` stays tagged pre-GA as history. |

## Persona Library — `src/data/testLab/personaLibrary.ts`

Twelve standing personas, each with: id, title, mapped RBAC `RoleName` (existing catalog),
editable bio/goal template, and suggested task-template ids.

CTO→Viewer, CIO→ClientAdmin, Technical Seller→ClientAdmin, Network Planner→ProvisioningManager,
Network Operator→OperationsManager, Network Architect→NetworkEngineer, Billing Admin→BillingAdmin,
Support Representative→SupportSpecialist, Security & Compliance Admin→SecurityAdmin,
Reseller Partner Manager→ResellerAdmin, API Developer→ApiManager, NOC Analyst→Viewer.

## Task Template Library — `src/data/testLab/taskTemplates.ts`

~40 complete, GA-framed task templates keyed by persona affinity. Each is a full `TestTask`
minus ids resolved at insert time: scenario in user-goal language, hints, path
(happy/permission-wall/bad-input), a declarative verifier ref or comprehension check.
Authoring a study = selecting and tweaking, not starting from scratch.

## Declarative verifier catalog — `src/data/testLab/verifierCatalog.ts`

Parameterized, code-defined checks referenced by id + params from templates and
builder-made tasks:

- `connection-created` `{ provider?, nameIncludes?, isLmcc? }` — baseline-relative
- `hub-created`, `vnf-created`, `group-created` — count > baseline
- `no-new-entities` — permission walls: counts ≤ baseline
- (none) — comprehension-check-only tasks

Every custom study auto-runs a `record-baseline` seed at Begin (entity counts into
`testLabSeedMeta`, same discipline as lmcc-r1). Tasks needing bespoke verification stay
code packs (a "hand to Helen" case).

## Custom study schema + conversion

```ts
interface CustomTask extends Omit<TestTask, 'verifyId'> {
  verifierRef?: { catalogId: string; params?: Record<string, unknown> };
}
interface CustomStudy {
  id: string;             // kebab, e.g. 'network-planner-ga-r1'
  feature: string;
  featureVersion: string; // e.g. 'GA 1116'
  persona: TestPersona;   // snapshot of library persona after edits
  tasks: CustomTask[];
  inviteCodes: string[];
  previewCodes: string[];
  createdAt: string; updatedAt: string;
}
interface StudyExport { schemaVersion: 1; study: CustomStudy }
```

`customStudyToPack(study): StudyPack` resolves verifier refs against the catalog and
injects the baseline seed. Registry gains `getAllPacks()` = code packs + published JSON
(`import.meta.glob` over `packs/studies/*.json`, eager) + local drafts (localStorage key
`testLab-drafts-v1`). All engine call sites (slice, TestLabPage, TaskHUD) switch from
`STUDY_PACKS` to `getAllPacks()`. Validation (incl. invite-code collisions) runs across
the merged set; drafts with errors are flagged in the Builder, not silently dropped.

## Builder UI — `/#/test-lab/builder`

Hidden route, desktop-only, Flywheel tokens, house rules (dot+text statuses, text
progress, no pillboxes, table rules). Master-detail:

- **Study list:** create, duplicate-as-new-round (suffixes id and codes `-r2`, fresh
  timestamps), archive/delete. Draft/published indicated as dot + text (published =
  matching id exists in bundled studies).
- **Editor sections:** Feature (name, featureVersion) · Persona (library picker,
  editable bio/goal) · Tasks (add from persona-suggested templates / all templates /
  blank; edit scenario, hints, path, verifier pick + params, comprehension check;
  reorder; remove) · Invite codes (auto-generated from study id; editable; "Copy
  invitation" produces participant blurb with deployed URL + code).
- **Exchange:** Copy for Helen (JSON to clipboard) · Export JSON (download) · Import
  JSON (new study or overwrite matching id after confirm).
- Drafts persist to localStorage on change and are immediately resolvable by invite code
  — author, then walk your own study in preview seconds later (dry-run included).

## Versioning

- `schemaVersion` on every export; importer validates and migrates.
- Substantive task edits (scenario, verifier, path, comprehension) auto-bump `task.version`.
- Duplicate-as-new-round for new rounds; results separate in the Sheet by
  `featureVersion` + invite code (already stamped on every row).
- Published studies are git-committed JSON; history is the audit trail.

## Consciously excluded

- Self-service publish to production (option B) — deploys go through Helen
- Arbitrary code verifiers/seeds in builder studies — catalog only
- Multi-persona scripts per study — one persona per study; duplicate for variants
- Results viewing in the Builder — the Sheet is the dashboard

## Testing

- Vitest: verifier catalog params, customStudyToPack conversion, draft persistence,
  registry merge + collision validation, schema import/export round-trip, task-version
  auto-bump.
- Manual E2E: build a study in the UI from templates, generate codes, preview it live,
  complete a verified task, export → reimport, duplicate as new round.

## Risks

1. Registry call sites moving from constant to getter — must stay cheap (reads
   localStorage per resolution; fine at this scale).
2. Builder page size — keep components split (list, editor sections, task editor row).
3. Template quality is the product — templates must read like real work, not filler.
