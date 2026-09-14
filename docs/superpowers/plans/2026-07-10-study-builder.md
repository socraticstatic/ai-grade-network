# Study Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Self-service Test Lab study authoring: persona library, task templates, declarative verifiers, invite-code generation, localStorage drafts with instant preview, JSON exchange with Helen, per spec `docs/superpowers/specs/2026-07-10-study-builder-design.md`.

**Architecture:** New data layer (`verifierCatalog`, `personaLibrary`, `taskTemplates`, `builderDrafts`, `builderConversion`) feeding the existing engine through a registry that now merges code packs + published JSON studies + local drafts. One new hidden route `/#/test-lab/builder` with a master-detail UI.

**Tech Stack:** React 18, TS, Zustand 4, react-router 6 (HashRouter), Tailwind Flywheel tokens, Vitest.

## Global Constraints

- Engine never imports feature code; Builder data files live under `src/data/testLab/`; UI under `src/components/test-lab/builder/`.
- Flywheel tokens only; statuses dot + text; progress as text; no pillbox tabs; desktop-only route.
- All verification for builder studies via `verifierCatalog` (no arbitrary code). Custom studies always run the `record-baseline` seed at Begin.
- Export format: `{ schemaVersion: 1, study: CustomStudy }`.
- GA framing in all template/persona copy — no references to preview-era limits (San Jose-only, 1 Gbps cap).
- Published studies: `src/data/testLab/packs/studies/*.json`, loaded via `import.meta.glob` eager.
- localStorage keys: drafts `testLab-drafts-v1` (existing session/queue keys unchanged).

---

### Task 1: Builder contract types + verifier catalog + conversion

**Files:**
- Create: `src/types/testLabBuilder.ts`
- Create: `src/data/testLab/verifierCatalog.ts`
- Create: `src/data/testLab/builderConversion.ts`
- Test: `src/data/testLab/builderConversion.test.ts`

**Interfaces:**
- Produces: `VerifierRef`, `CustomTask`, `CustomStudy`, `StudyExport` (types); `VERIFIER_CATALOG: CatalogEntry[]`, `recordBaselineSeed: SeedFn`; `customStudyToPack(study: CustomStudy): StudyPack`.

- [ ] **Step 1: Types**

```ts
// src/types/testLabBuilder.ts
import type { TestPersona, TestTask } from './testLab';

export interface VerifierRef { catalogId: string; params?: Record<string, unknown> }

export type CustomTask = Omit<TestTask, 'verifyId' | 'reseedId' | 'catchUpSeedId'> & {
  verifierRef?: VerifierRef;
};

export interface CustomStudy {
  id: string;               // kebab-case, e.g. 'network-planner-ga-r1'
  feature: string;
  featureVersion: string;   // e.g. 'GA 1116'
  persona: TestPersona;     // snapshot (seedId ignored; conversion forces record-baseline)
  tasks: CustomTask[];
  inviteCodes: string[];
  previewCodes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface StudyExport { schemaVersion: 1; study: CustomStudy }
```

- [ ] **Step 2: Failing tests**

```ts
// src/data/testLab/builderConversion.test.ts
import { describe, it, expect } from 'vitest';
import { customStudyToPack } from './builderConversion';
import { VERIFIER_CATALOG, recordBaselineSeed } from './verifierCatalog';
import { validatePacks } from './packs/index';
import type { CustomStudy } from '../../types/testLabBuilder';

const study: CustomStudy = {
  id: 'fixture-ga-r1', feature: 'Fixture', featureVersion: 'GA 1116',
  persona: { id: 'p-planner', name: 'Pat Planner', bio: 'b', goal: 'g', rbacRole: 'ProvisioningManager' as any, seedId: '' },
  tasks: [
    { id: 't-create', version: 1, title: 'Create', scenario: 'make a connection', successCriteria: 'connection exists',
      path: 'happy', hints: [], verifierRef: { catalogId: 'connection-created', params: { nameIncludes: 'aws' } } },
    { id: 't-wall', version: 1, title: 'Wall', scenario: 'try it', successCriteria: 'nothing created',
      path: 'permission-wall', hints: [], verifierRef: { catalogId: 'no-new-entities' },
      comprehensionCheck: { question: 'why?', options: ['a', 'b'], correctIndex: 1 } },
    { id: 't-comp', version: 1, title: 'Comp', scenario: 'answer', successCriteria: 'correct', path: 'happy', hints: [] },
  ],
  inviteCodes: ['FIX-GA-R1'], previewCodes: ['FIX-GA-R1-PREVIEW'],
  createdAt: '2026-07-10', updatedAt: '2026-07-10',
};

describe('customStudyToPack', () => {
  it('produces a pack that validates clean', () => {
    expect(validatePacks([customStudyToPack(study)])).toEqual([]);
  });

  it('forces the record-baseline seed onto the persona', () => {
    const pack = customStudyToPack(study);
    expect(pack.personas[0].seedId).toBe('record-baseline');
    expect(pack.seeds['record-baseline']).toBeDefined();
  });

  it('resolves verifier refs into working verifiers', () => {
    const pack = customStudyToPack(study);
    const state: Record<string, any> = { connections: [{ id: 'c1', name: 'AWS thing' }], hubs: [], vnfs: [], groups: [] };
    recordBaselineSeed({ set: (p) => Object.assign(state, p), get: () => state });
    // nothing new yet
    const vCreate = pack.verifiers[pack.tasks[0].verifyId!];
    expect(vCreate(state)).toBe(false);
    state.connections = [...state.connections, { id: 'c2', name: 'My AWS circuit' }];
    expect(vCreate(state)).toBe(true);
    // wall: something new was created → fails
    const vWall = pack.verifiers[pack.tasks[1].verifyId!];
    expect(vWall(state)).toBe(false);
    state.connections = state.connections.slice(0, 1);
    expect(vWall(state)).toBe(true);
  });

  it('name filter is case-insensitive and unfiltered check accepts any new entity', () => {
    const pack = customStudyToPack({
      ...study,
      tasks: [{ id: 't', version: 1, title: 'T', scenario: 's', successCriteria: 'c', path: 'happy', hints: [],
        verifierRef: { catalogId: 'hub-created' } }],
    });
    const state: Record<string, any> = { connections: [], hubs: [{ id: 'h1' }], vnfs: [], groups: [] };
    recordBaselineSeed({ set: (p) => Object.assign(state, p), get: () => state });
    const v = pack.verifiers[pack.tasks[0].verifyId!];
    expect(v(state)).toBe(false);
    state.hubs = [...state.hubs, { id: 'h2' }];
    expect(v(state)).toBe(true);
  });

  it('comprehension-only tasks get no verifyId', () => {
    const pack = customStudyToPack(study);
    expect(pack.tasks[2].verifyId).toBeUndefined();
  });

  it('unknown catalog ids convert to no verifier rather than throwing', () => {
    const pack = customStudyToPack({
      ...study,
      tasks: [{ id: 't', version: 1, title: 'T', scenario: 's', successCriteria: 'c', path: 'happy', hints: [],
        verifierRef: { catalogId: 'does-not-exist' } }],
    });
    expect(pack.tasks[0].verifyId).toBeUndefined();
    expect(validatePacks([pack])).toEqual([]);
  });
});
```

- [ ] **Step 3: Run to verify failure** — `npx vitest run src/data/testLab/builderConversion.test.ts` → FAIL (module missing).

- [ ] **Step 4: Implement catalog**

```ts
// src/data/testLab/verifierCatalog.ts
// Declarative, parameterized store checks for builder-made studies.
// All checks are baseline-relative: recordBaselineSeed snapshots entity ids at Begin.
import type { VerifierFn, SeedFn } from '../../types/testLab';

const ENTITY_TYPES = ['connections', 'hubs', 'vnfs', 'groups'] as const;
type EntityType = typeof ENTITY_TYPES[number];

export const recordBaselineSeed: SeedFn = ({ set, get }) => {
  const baseline: Record<string, string[]> = {};
  for (const t of ENTITY_TYPES) baseline[t] = (get()[t] ?? []).map((e: any) => e.id);
  const meta = get().testLabSeedMeta ?? {};
  set({ testLabSeedMeta: { ...meta, builderBaseline: baseline } });
};

function newEntities(state: Record<string, any>, type: EntityType): any[] {
  const base: string[] = state.testLabSeedMeta?.builderBaseline?.[type] ?? [];
  return (state[type] ?? []).filter((e: any) => !base.includes(e.id));
}

const matches = (e: any, params: Record<string, any>) => {
  if (params.nameIncludes && !String(e.name ?? '').toLowerCase().includes(String(params.nameIncludes).toLowerCase())) return false;
  if (params.provider && String(e.provider ?? '').toLowerCase() !== String(params.provider).toLowerCase()) return false;
  return true;
};

export interface CatalogParamField { key: string; label: string; placeholder?: string }
export interface CatalogEntry {
  id: string;
  label: string;
  description: string;
  paramFields: CatalogParamField[];
  build: (params: Record<string, any>) => VerifierFn;
}

const createdEntry = (type: EntityType, label: string, withFilters: boolean): CatalogEntry => ({
  id: `${type.slice(0, -1)}-created`.replace('vnf-created', 'vnf-created'),
  label,
  description: `Passes when a new ${type.slice(0, -1)} exists beyond what the session started with.`,
  paramFields: withFilters
    ? [
        { key: 'nameIncludes', label: 'Name contains (optional)', placeholder: 'e.g. AWS' },
        { key: 'provider', label: 'Provider (optional)', placeholder: 'e.g. AWS' },
      ]
    : [],
  build: (params) => (state) => newEntities(state, type).some(e => matches(e, params ?? {})),
});

export const VERIFIER_CATALOG: CatalogEntry[] = [
  createdEntry('connections', 'Connection created', true),
  createdEntry('hubs', 'Hub created', false),
  createdEntry('vnfs', 'VNF created', false),
  createdEntry('groups', 'Group created', false),
  {
    id: 'no-new-entities',
    label: 'Nothing created (permission wall)',
    description: 'Passes when no connections, hubs, VNFs, or groups were created — pair with a comprehension check.',
    paramFields: [],
    build: () => (state) => ENTITY_TYPES.every(t => newEntities(state, t).length === 0),
  },
];
```

Note: `createdEntry` ids come out as `connection-created`, `hub-created`, `vnf-created`, `group-created` (singularized by `slice(0,-1)`).

- [ ] **Step 5: Implement conversion**

```ts
// src/data/testLab/builderConversion.ts
import type { StudyPack, TestTask, VerifierFn } from '../../types/testLab';
import type { CustomStudy } from '../../types/testLabBuilder';
import { VERIFIER_CATALOG, recordBaselineSeed } from './verifierCatalog';

export function customStudyToPack(study: CustomStudy): StudyPack {
  const verifiers: Record<string, VerifierFn> = {};
  const tasks: TestTask[] = study.tasks.map(t => {
    const { verifierRef, ...rest } = t;
    let verifyId: string | undefined;
    const entry = verifierRef && VERIFIER_CATALOG.find(c => c.id === verifierRef.catalogId);
    if (entry) {
      verifyId = `${t.id}::${entry.id}`;
      verifiers[verifyId] = entry.build((verifierRef!.params as Record<string, any>) ?? {});
    }
    return { ...rest, verifyId };
  });
  const persona = { ...study.persona, seedId: 'record-baseline' };
  return {
    id: study.id,
    feature: study.feature,
    featureVersion: study.featureVersion,
    personas: [persona],
    tasks,
    scripts: [{
      id: `${study.id}-script`,
      personaId: persona.id,
      taskIds: tasks.map(t => t.id),
      inviteCodes: study.inviteCodes,
      previewCodes: study.previewCodes,
    }],
    verifiers,
    seeds: { 'record-baseline': recordBaselineSeed },
  };
}
```

- [ ] **Step 6: Run tests** — expect PASS (6 tests). Also `npx tsc --noEmit`.
- [ ] **Step 7: Commit** — `git add src/types/testLabBuilder.ts src/data/testLab/verifierCatalog.ts src/data/testLab/builderConversion.ts src/data/testLab/builderConversion.test.ts && git commit -m "feat(test-lab): declarative verifier catalog and custom-study conversion"`

---

### Task 2: Drafts module — persistence, versioning, exchange

**Files:**
- Create: `src/data/testLab/builderDrafts.ts`
- Test: `src/data/testLab/builderDrafts.test.ts`

**Interfaces:**
- Consumes: `CustomStudy`, `StudyExport` from Task 1.
- Produces: `loadDrafts(): CustomStudy[]`, `saveDraft(study: CustomStudy): CustomStudy` (returns saved copy with auto-bumped task versions + updatedAt), `deleteDraft(id: string): void`, `duplicateAsNewRound(study: CustomStudy): CustomStudy`, `exportStudy(study): string` (pretty JSON of StudyExport), `importStudy(json: string): { study?: CustomStudy; error?: string }`, `codesForId(id: string): { inviteCodes: string[]; previewCodes: string[] }`, `nowIso(): string`.

- [ ] **Step 1: Failing tests**

```ts
// src/data/testLab/builderDrafts.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadDrafts, saveDraft, deleteDraft, duplicateAsNewRound, exportStudy, importStudy, codesForId,
} from './builderDrafts';
import type { CustomStudy } from '../../types/testLabBuilder';

const base = (): CustomStudy => ({
  id: 'planner-ga-r1', feature: 'Provisioning', featureVersion: 'GA 1116',
  persona: { id: 'p', name: 'Pat', bio: 'b', goal: 'g', rbacRole: 'ProvisioningManager' as any, seedId: '' },
  tasks: [{ id: 't1', version: 1, title: 'T', scenario: 'do', successCriteria: 'done', path: 'happy', hints: [] }],
  inviteCodes: ['PLANNER-GA-R1'], previewCodes: ['PLANNER-GA-R1-PREVIEW'],
  createdAt: '2026-07-10T00:00:00Z', updatedAt: '2026-07-10T00:00:00Z',
});

beforeEach(() => localStorage.clear());

describe('builderDrafts', () => {
  it('saves and loads drafts', () => {
    saveDraft(base());
    expect(loadDrafts().map(d => d.id)).toEqual(['planner-ga-r1']);
  });

  it('auto-bumps task version on substantive edit only', () => {
    saveDraft(base());
    const edited = base();
    edited.tasks[0].scenario = 'do something else';
    const saved = saveDraft(edited);
    expect(saved.tasks[0].version).toBe(2);
    const cosmetic = { ...saved, tasks: [{ ...saved.tasks[0], title: 'Renamed' }] };
    expect(saveDraft(cosmetic).tasks[0].version).toBe(2); // title is cosmetic
  });

  it('deletes drafts', () => {
    saveDraft(base());
    deleteDraft('planner-ga-r1');
    expect(loadDrafts()).toEqual([]);
  });

  it('duplicates as new round with bumped id and regenerated codes', () => {
    const r2 = duplicateAsNewRound(base());
    expect(r2.id).toBe('planner-ga-r2');
    expect(r2.inviteCodes).toEqual(['PLANNER-GA-R2']);
    expect(r2.previewCodes).toEqual(['PLANNER-GA-R2-PREVIEW']);
    const r3 = duplicateAsNewRound(r2);
    expect(r3.id).toBe('planner-ga-r3');
  });

  it('export/import round-trips with schema validation', () => {
    const json = exportStudy(base());
    expect(JSON.parse(json).schemaVersion).toBe(1);
    const back = importStudy(json);
    expect(back.study?.id).toBe('planner-ga-r1');
    expect(importStudy('{"nope":true}').error).toBeTruthy();
    expect(importStudy('not json').error).toBeTruthy();
  });

  it('codesForId derives codes from the id', () => {
    expect(codesForId('billing-ga-r1')).toEqual({
      inviteCodes: ['BILLING-GA-R1'], previewCodes: ['BILLING-GA-R1-PREVIEW'],
    });
  });
});
```

- [ ] **Step 2: Run to verify failure.**

- [ ] **Step 3: Implement**

```ts
// src/data/testLab/builderDrafts.ts
import type { CustomStudy, CustomTask, StudyExport } from '../../types/testLabBuilder';

const DRAFTS_KEY = 'testLab-drafts-v1';

export const nowIso = () => new Date().toISOString();

export function loadDrafts(): CustomStudy[] {
  try { return JSON.parse(localStorage.getItem(DRAFTS_KEY) ?? '[]'); } catch { return []; }
}

function writeDrafts(drafts: CustomStudy[]) {
  try { localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts)); } catch { /* ignore */ }
}

/** Substance = what changes the meaning of a result row. Title/hints are cosmetic. */
const substance = (t: CustomTask) => JSON.stringify({
  scenario: t.scenario, path: t.path, verifierRef: t.verifierRef ?? null,
  comprehensionCheck: t.comprehensionCheck ?? null,
});

export function saveDraft(study: CustomStudy): CustomStudy {
  const drafts = loadDrafts();
  const prev = drafts.find(d => d.id === study.id);
  const tasks = study.tasks.map(t => {
    const before = prev?.tasks.find(p => p.id === t.id);
    if (before && substance(before) !== substance(t) && t.version <= before.version) {
      return { ...t, version: before.version + 1 };
    }
    return t;
  });
  const saved: CustomStudy = { ...study, tasks, updatedAt: nowIso() };
  writeDrafts([...drafts.filter(d => d.id !== study.id), saved]);
  return saved;
}

export function deleteDraft(id: string): void {
  writeDrafts(loadDrafts().filter(d => d.id !== id));
}

export function codesForId(id: string): { inviteCodes: string[]; previewCodes: string[] } {
  const code = id.toUpperCase();
  return { inviteCodes: [code], previewCodes: [`${code}-PREVIEW`] };
}

export function duplicateAsNewRound(study: CustomStudy): CustomStudy {
  const m = study.id.match(/^(.*)-r(\d+)$/);
  const id = m ? `${m[1]}-r${Number(m[2]) + 1}` : `${study.id}-r2`;
  return { ...study, id, ...codesForId(id), createdAt: nowIso(), updatedAt: nowIso() };
}

export function exportStudy(study: CustomStudy): string {
  const payload: StudyExport = { schemaVersion: 1, study };
  return JSON.stringify(payload, null, 2);
}

export function importStudy(json: string): { study?: CustomStudy; error?: string } {
  try {
    const parsed = JSON.parse(json);
    if (parsed?.schemaVersion !== 1 || !parsed.study?.id || !Array.isArray(parsed.study?.tasks)) {
      return { error: 'Not a Test Lab study export (expected schemaVersion 1 with a study).' };
    }
    return { study: parsed.study as CustomStudy };
  } catch {
    return { error: 'Invalid JSON.' };
  }
}
```

- [ ] **Step 4: Run tests** — PASS (6). Note `nowIso` uses `new Date()` — app code, allowed.
- [ ] **Step 5: Commit** — `git add src/data/testLab/builderDrafts.ts src/data/testLab/builderDrafts.test.ts && git commit -m "feat(test-lab): builder drafts with auto version bump and JSON exchange"`

---

### Task 3: Registry merge — published JSON + drafts + call-site migration

**Files:**
- Modify: `src/data/testLab/packs/index.ts`
- Create: `src/data/testLab/packs/studies/.gitkeep`
- Modify: `src/store/slices/testLabSlice.ts` (default packs source)
- Modify: `src/components/test-lab/TestLabPage.tsx`, `src/components/test-lab/TaskHUD.tsx` (STUDY_PACKS → getAllPacks())
- Test: extend `src/data/testLab/packs/registry.test.ts`

**Interfaces:**
- Produces: `getAllPacks(): StudyPack[]` — code packs + published studies + drafts (broken drafts skipped, error logged). `resolveInviteCode(raw, packs = getAllPacks())`.

- [ ] **Step 1: Failing tests (append to registry.test.ts)**

```ts
import { getAllPacks } from './index';
import { saveDraft } from '../builderDrafts';

describe('getAllPacks', () => {
  it('includes code packs and localStorage drafts', () => {
    localStorage.clear();
    const before = getAllPacks().length;
    saveDraft({
      id: 'draft-x-r1', feature: 'X', featureVersion: 'GA', createdAt: 'c', updatedAt: 'u',
      persona: { id: 'p', name: 'P', bio: 'b', goal: 'g', rbacRole: 'Viewer' as any, seedId: '' },
      tasks: [{ id: 't', version: 1, title: 'T', scenario: 's', successCriteria: 'c', path: 'happy', hints: [] }],
      inviteCodes: ['DRAFT-X-R1'], previewCodes: ['DRAFT-X-R1-PREVIEW'],
    });
    const packs = getAllPacks();
    expect(packs.length).toBe(before + 1);
    expect(packs.some(p => p.id === 'draft-x-r1')).toBe(true);
  });

  it('resolves draft invite codes', () => {
    expect(resolveInviteCode('draft-x-r1')?.pack.id).toBe('draft-x-r1');
    expect(resolveInviteCode('DRAFT-X-R1-PREVIEW')?.preview).toBe(true);
  });
});
```

- [ ] **Step 2: Implement in `packs/index.ts`**

Add after `STUDY_PACKS`:

```ts
import { customStudyToPack } from '../builderConversion';
import { loadDrafts } from '../builderDrafts';
import type { CustomStudy, StudyExport } from '../../../types/testLabBuilder';

// Published studies: JSON files committed by Helen. Loaded at build time.
const publishedModules = import.meta.glob('./studies/*.json', { eager: true }) as Record<string, { default: StudyExport }>;

function publishedPacks(): StudyPack[] {
  return Object.values(publishedModules)
    .map(m => m.default)
    .filter(x => x?.schemaVersion === 1 && x.study)
    .map(x => customStudyToPack(x.study));
}

function draftPacks(): StudyPack[] {
  const packs: StudyPack[] = [];
  for (const draft of loadDrafts()) {
    try { packs.push(customStudyToPack(draft as CustomStudy)); }
    catch (err) { console.error(`[test-lab] draft "${draft?.id}" failed to convert:`, err); }
  }
  return packs;
}

/** Everything resolvable right now: code packs + published studies + local drafts.
 *  Published overrides nothing; drafts with an id matching a published study shadow it locally
 *  (last in wins at resolution because drafts are appended last). */
export function getAllPacks(): StudyPack[] {
  return [...STUDY_PACKS, ...publishedPacks(), ...draftPacks()];
}
```

Change `resolveInviteCode` default: `packs: StudyPack[] = getAllPacks()`. Keep the dev-time `validatePacks(STUDY_PACKS)` block but extend it to `validatePacks(getAllPacks())` inside a try/catch (drafts may be mid-edit; log, don't throw).

- [ ] **Step 3: Migrate call sites**
  - `testLabSlice.ts`: `const packs = () => packsOverride ?? getAllPacks();` (import getAllPacks instead of STUDY_PACKS).
  - `TestLabPage.tsx` and `TaskHUD.tsx`: replace `import { STUDY_PACKS } from ...` with `import { getAllPacks } from ...` and `STUDY_PACKS.find(...)` → `getAllPacks().find(...)`; `STUDY_PACKS.length === 0` → `getAllPacks().length === 0`.
  - Create empty `src/data/testLab/packs/studies/.gitkeep`.

- [ ] **Step 4: Run** — `npx vitest run src/data/testLab src/store/slices/testLabSlice.test.ts && npx tsc --noEmit` → all PASS. (`import.meta.glob` works under vitest/vite-node; if the test environment chokes, guard with `typeof import.meta.glob === 'function'`.)
- [ ] **Step 5: Commit** — `git add -A src/data/testLab src/store/slices/testLabSlice.ts src/components/test-lab && git commit -m "feat(test-lab): registry merges code packs, published studies, and local drafts"`

---

### Task 4: Persona library + task template library

**Files:**
- Create: `src/data/testLab/personaLibrary.ts`
- Create: `src/data/testLab/taskTemplates.ts`
- Test: `src/data/testLab/library.test.ts`

**Interfaces:**
- Produces:

```ts
export interface LibraryPersona {
  id: string;            // 'network-planner'
  title: string;         // 'Network Planner'
  characterName: string; // 'Priya Raman'
  bio: string; goal: string;
  rbacRole: RoleName;
  suggestedTemplateIds: string[];
}
export const PERSONA_LIBRARY: LibraryPersona[];

export interface TaskTemplate {
  id: string;                    // 'provision-new-region'
  title: string;
  personaIds: string[];          // affinity
  task: Omit<CustomTask, 'id' | 'version'>;
}
export const TASK_TEMPLATES: TaskTemplate[];
export function instantiateTemplate(tpl: TaskTemplate, seq: number): CustomTask; // id `${tpl.id}-${seq}`, version 1
```

- [ ] **Step 1: Failing tests**

```ts
// src/data/testLab/library.test.ts
import { describe, it, expect } from 'vitest';
import { PERSONA_LIBRARY } from './personaLibrary';
import { TASK_TEMPLATES, instantiateTemplate } from './taskTemplates';
import { VERIFIER_CATALOG } from './verifierCatalog';
import { ROLE_CATALOG } from '../roleCatalog';

describe('persona library', () => {
  it('has the 12 agreed personas with valid RBAC roles', () => {
    expect(PERSONA_LIBRARY).toHaveLength(12);
    for (const p of PERSONA_LIBRARY) {
      expect(ROLE_CATALOG[p.rbacRole], `${p.id} role ${p.rbacRole}`).toBeDefined();
      expect(p.bio.length).toBeGreaterThan(40);
      expect(p.goal.length).toBeGreaterThan(20);
    }
  });

  it('suggested templates all exist', () => {
    const ids = new Set(TASK_TEMPLATES.map(t => t.id));
    for (const p of PERSONA_LIBRARY) {
      expect(p.suggestedTemplateIds.length).toBeGreaterThanOrEqual(3);
      for (const tid of p.suggestedTemplateIds) expect(ids.has(tid), `${p.id} → ${tid}`).toBe(true);
    }
  });
});

describe('task templates', () => {
  it('every verifier ref resolves to the catalog', () => {
    const catalogIds = new Set(VERIFIER_CATALOG.map(c => c.id));
    for (const t of TASK_TEMPLATES) {
      if (t.task.verifierRef) expect(catalogIds.has(t.task.verifierRef.catalogId), t.id).toBe(true);
    }
  });

  it('every template is complete: scenario, criteria, path, and either verifier or comprehension for non-happy clarity', () => {
    for (const t of TASK_TEMPLATES) {
      expect(t.task.scenario.length, t.id).toBeGreaterThan(40);
      expect(t.task.successCriteria.length, t.id).toBeGreaterThan(10);
      if (t.task.path === 'permission-wall') expect(t.task.comprehensionCheck, t.id).toBeDefined();
    }
  });

  it('no preview-era framing (GA constraint)', () => {
    for (const t of TASK_TEMPLATES) {
      expect(/preview/i.test(t.task.scenario), t.id).toBe(false);
    }
  });

  it('instantiateTemplate assigns id and version', () => {
    const c = instantiateTemplate(TASK_TEMPLATES[0], 3);
    expect(c.id).toBe(`${TASK_TEMPLATES[0].id}-3`);
    expect(c.version).toBe(1);
  });
});
```

- [ ] **Step 2: Author the persona library.** Twelve entries with the agreed RBAC mapping (CTO→Viewer, CIO→ClientAdmin, Technical Seller→ClientAdmin, Network Planner→ProvisioningManager, Network Operator→OperationsManager, Network Architect→NetworkEngineer, Billing Admin→BillingAdmin, Support Representative→SupportSpecialist, Security & Compliance Admin→SecurityAdmin, Reseller Partner Manager→ResellerAdmin, API Developer→ApiManager, NOC Analyst→Viewer). Each bio: who they are at a named fictional enterprise + what pressure they're under; each goal: one concrete outcome. Distinct character names, varied companies.

- [ ] **Step 3: Author the template library.** Full content enumeration (author each as a complete task; scenario written to the participant in second person, GA framing; hints 1–2 each):

| id | personas | path | verifier / check | scenario core |
|---|---|---|---|---|
| find-connection-entry | planner, architect, seller | happy | — (comprehension: where do you start a new connection?) | Locate where to begin ordering a new cloud connection |
| provision-aws-connection | planner, architect, seller | happy | connection-created {provider: AWS} | Stand up an AWS connection end to end |
| provision-azure-connection | planner, architect | happy | connection-created {provider: Azure} | Stand up an Azure ExpressRoute connection |
| create-hub | architect, planner | happy | hub-created | Create a hub to anchor a new region |
| attach-vnf | architect | happy | vnf-created | Add a firewall VNF where it protects the new circuit |
| bandwidth-limit-recovery | planner | bad-input | connection-created | Request more bandwidth than the location supports, then land a valid order |
| compare-resiliency | architect, planner | happy | — (comprehension: which option gives geodiversity?) | Choose the right resiliency level for a mandate |
| find-busiest-circuit | operator, noc | happy | — (comprehension: which connection runs hottest?) | Identify the highest-utilization connection |
| triage-degraded | operator, support | happy | — (comprehension: what state is the degraded circuit in?) | Find and interpret the degraded connection |
| alert-severity | operator, noc | happy | — (comprehension: which alert needs action first?) | Rank the active alerts |
| billing-start-trigger | billing, cio | happy | — (comprehension: when does billing start?) | Determine when a new circuit starts billing |
| monthly-spend-by-provider | billing, cio, cto | happy | — (comprehension: which provider costs most?) | Find the month's largest cloud-connect spend |
| wall-order-attempt | noc, support | permission-wall | no-new-entities + comprehension (why blocked?) | Try to place an order without provisioning rights |
| wall-user-admin | support, noc | permission-wall | no-new-entities + comprehension | Try to change another user's role |
| audit-recent-changes | security, cio | happy | — (comprehension: who made the last config change?) | Trace a recent change in the audit log |
| review-access-roles | security | happy | — (comprehension: which role can provision?) | Review who can create connections |
| tenant-overview | reseller | happy | — (comprehension: how many tenants are active?) | Assess the reseller tenant portfolio |
| api-key-flow | api-developer | happy | — (comprehension: what auth does the API use?) | Find how to authenticate against the API toolbox |
| api-provision-reference | api-developer | happy | — (comprehension: which endpoint creates a connection?) | Locate the programmatic path to provisioning |
| exec-health-read | cto, cio | happy | — (comprehension: overall network health?) | Get the network's health story in under a minute |
| exec-brief-takeaway | cto | happy | — (comprehension: headline metric of the brief) | Pull the one number for the board |
| demo-end-to-end | seller | happy | connection-created | Run the full create flow as a customer demo |
| group-connections | operator, architect | happy | group-created | Organize related circuits into a group |
| ticket-raise | support | happy | — (comprehension: what info does a ticket need?) | Open a support ticket for a customer issue |
| ticket-status | support | happy | — (comprehension: current state of newest ticket) | Report status on the most recent ticket |
| find-connection-details | all | happy | — (comprehension: read a detail-page fact) | Pull a specific fact off a connection detail page |
| interpret-order-status | planner, seller, operator | happy | — (comprehension: is the new circuit live?) | Read a fresh order's provisioning state |
| locate-glossary | seller, cto | happy | — (comprehension: definition lookup) | Find what a product term means |

(28 templates; several serve multiple personas — every persona gets ≥3 suggestions. Author each fully in `taskTemplates.ts`; the table defines the complete set, the file carries the full copy. `instantiateTemplate` implementation:)

```ts
export function instantiateTemplate(tpl: TaskTemplate, seq: number): CustomTask {
  return { ...tpl.task, id: `${tpl.id}-${seq}`, version: 1 };
}
```

- [ ] **Step 4: Run tests** — PASS. Fix any persona/template ref mismatches the tests surface.
- [ ] **Step 5: Commit** — `git add src/data/testLab/personaLibrary.ts src/data/testLab/taskTemplates.ts src/data/testLab/library.test.ts && git commit -m "feat(test-lab): persona library (12) and GA task template library"`

---

### Task 5: Builder UI

**Files:**
- Create: `src/components/test-lab/builder/TestLabBuilderPage.tsx` (default export; page shell + study list + state)
- Create: `src/components/test-lab/builder/StudyEditor.tsx` (feature/persona/codes/exchange sections)
- Create: `src/components/test-lab/builder/TaskEditor.tsx` (task list + per-task editing + template menu)
- Modify: `src/App.tsx` (lazy route `/test-lab/builder`, desktop-gated, ABOVE the `/test-lab` route so it isn't shadowed — react-router v6 ranks exact segments higher, but keep explicit order for readability)

**Interfaces:**
- Consumes: everything from Tasks 1–4.
- Produces: route `/#/test-lab/builder`.

**Behavior contract (implement exactly):**
- Left rail: draft list (feature — id — updated date, dot+text: `published` if a bundled study shares the id, else `draft`), New study button, per-study actions: Duplicate as new round, Delete (confirm).
- New study: prompts persona pick first (library grid of 12 with title + one-line bio), then creates `{feature: persona.title + ' study', featureVersion: 'GA', id: slug(feature)+'-ga-r1', persona snapshot (characterName + title composed into TestPersona.name), tasks: [], codes from codesForId}` and opens the editor.
- Editor sections in order: **Feature** (text inputs: feature, featureVersion, id readonly after creation), **Persona** (picker dropdown to swap; editable name/bio/goal textareas), **Tasks** (TaskEditor), **Invite codes** (chips-as-text list, editable one per line; Copy invitation button → clipboard blurb below), **Exchange** (Copy for Helen / Export JSON / Import JSON buttons + validation errors panel from `validatePacks([customStudyToPack(draft)])`).
- TaskEditor: ordered list; each row collapsible; fields: title, scenario (textarea), path (select of 3), verifier (select from VERIFIER_CATALOG + 'None (comprehension only)'; param inputs from `paramFields`), successCriteria (textarea, labeled "Author note — never shown to participants"), hints (one per line textarea), startRoute (text), comprehension check (question, options one per line, correct index select); Move up/down buttons; Remove. "Add task" split: from suggested templates (persona.suggestedTemplateIds), from all templates (grouped select), or Blank task.
- Every change calls `saveDraft` (debounced 500ms) and re-renders validation.
- Invitation blurb text: `You're invited to test {feature} in AT&T NetBond Advanced.\n\n1. Open {origin + pathname}#/test-lab (desktop browser)\n2. Enter your invite code: {code}\n3. The session takes about 15 minutes.\n\nThere are no wrong answers — we're testing the product, not you.` — derive origin at runtime (`window.location.origin + window.location.pathname`), so it's correct on localhost and GitHub Pages.
- Copy for Helen: `navigator.clipboard.writeText(exportStudy(draft))` + confirmation text "Copied — paste it to Helen with 'publish this study'".
- Import JSON: hidden file input + textarea paste fallback in a small panel; on success, saveDraft(imported) (confirm overwrite if id exists).
- Styling: Flywheel only; statuses dot+text; no pills; table rules if any table used.

- [ ] **Step 1: Implement the three components per contract.** (Compose from existing patterns: inputs/buttons styled as in TestLabPage.)
- [ ] **Step 2: Add route in App.tsx** next to `/test-lab`:

```tsx
const LazyTestLabBuilderPage = lazy(() => import('./components/test-lab/builder/TestLabBuilderPage'));
...
<Route path="/test-lab/builder" element={
  isMobile ? (
    <MobileDesktopOnly feature="Test Lab Builder" description="Study authoring needs a desktop or laptop screen." />
  ) : (
    <Suspense fallback={<LoadingFallback />}>
      <LazyTestLabBuilderPage />
    </Suspense>
  )
} />
```

- [ ] **Step 3: Typecheck + dev-server smoke** — `npx tsc --noEmit`; open `/#/test-lab/builder`, create a study from Network Planner, add a template task, confirm draft persists across reload.
- [ ] **Step 4: Commit** — `git add src/components/test-lab/builder src/App.tsx && git commit -m "feat(test-lab): study builder UI — personas, templates, codes, JSON exchange"`

---

### Task 6: E2E + docs + memory

- [ ] **Step 1:** Full suite + typecheck: `npx tsc --noEmit && npx vitest run` — no new failures vs the 46 pre-existing baseline.
- [ ] **Step 2:** Browser E2E: in the Builder create "Network Planner GA R1" from templates (1 verified provisioning task + 1 comprehension task), then open `/#/test-lab`, enter its preview code, walk the study: persona applies, baseline seed records, completing the wizard task flips the nudge (verified), results row lands in the Sheet (draft studies submit like any other — confirm `feature`/`featureVersion` columns carry the builder values). Export JSON, delete draft, re-import, confirm restored.
- [ ] **Step 3:** Update `docs/test-lab-setup.md`: add "Authoring studies" section — Builder URL, persona library, publish-through-Helen flow (Copy for Helen → "publish this study" → committed to `src/data/testLab/packs/studies/`), duplicate-as-new-round for new rounds.
- [ ] **Step 4:** Update memory `netbond-test-lab.md`: Builder exists at `/#/test-lab/builder`; publish flow = drop StudyExport JSON into `packs/studies/` and commit; verifier catalog constraint.
- [ ] **Step 5:** Commit docs; final report.

---

## Self-review notes (applied)

- Spec coverage: types/catalog/conversion (T1), drafts+versioning+exchange (T2), registry merge + published glob + call sites (T3), personas+templates incl. GA-copy test (T4), UI incl. codes/blurb/exchange/validation (T5), E2E+docs (T6). Duplicate-as-new-round in T2 (logic) + T5 (button).
- Type consistency: `CustomTask` omits engine-only seed fields; conversion strips `verifierRef` before building `TestTask`; `getAllPacks` used everywhere the engine resolves packs.
- Known judgment call: template copy must be authored against surfaces that exist today (wizard, lists, monitoring, marketplace, billing, RBAC, API toolbox, tickets, glossary — all present in the app).
