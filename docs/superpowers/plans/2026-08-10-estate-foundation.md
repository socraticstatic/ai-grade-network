# Phase 1: Bank-Scale Estate Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Site classes on the estate model, a deterministic ~4,180-site "Meridian Trust" seed profile switchable at boot, rollup derivations, class-aware filters, and a rendering contract (no per-entity lists past 50 rows) - with ACME behavior unchanged.

**Architecture:** `state.ts` (legacy `window.CC` IIFE) keeps its inline ACME seeds and returns its seed arrays by reference (`state.ts:493`). A new `estateProfile` module - imported in `src/engine/index.ts` immediately after `./state` and before every other `state-*` module - reads a boot flag and, for `meridian`, swaps seed array contents **in place** (`arr.length = 0; arr.push(...)`) so both `CC.*` consumers and state.ts's internal closures see the new estate, before `state-billing` freezes its steer baseline at module load. Pure derivations (`siteRollup`, `cloudRollup`, threshold helper) live in `discoveryModel.ts` beside the existing ones. Filters gain one facet. UI adopts the threshold contract.

**Tech Stack:** TypeScript, React, Vitest, Playwright. No new dependencies (virtualization is windowing-by-rollup, not a library).

## Global Constraints

- Flywheel compliance: any new UI (chips, rollup rows) uses existing `fw-*` tokens and the shipped chip/row idiom from `EstateFilterChips.tsx` / `UnifiedDiscovery.tsx`.
- ACME regression-clean: with no flag set, every existing test passes untouched. ACME branches gain `siteClass` values but no behavior change.
- Determinism: the Meridian generator takes no randomness from `Date.now()`/`Math.random()` - a fixed numeric seed with a small LCG inside the module.
- Rendering contract: no component renders per-entity rows for a collection larger than `ROLLUP_THRESHOLD = 50`; it renders the rollup with drill-in.
- Rebrand guard (`rebrand.test.ts`) and "Save, not cost" vocabulary hold.

---

### Task 1: Site classes on the model

**Files:**
- Modify: `src/features/discover/discoveryModel.ts` (Branch interface, ~line 55)
- Modify: `src/engine/state.ts:49-56` (six ACME branch literals)
- Test: `src/features/discover/discoveryModel.test.ts`

**Interfaces:**
- Produces: `type SiteClass = 'dc' | 'office' | 'branch' | 'atm'` (exported from `discoveryModel.ts`); `Branch.siteClass: SiteClass` (required field).

- [ ] **Step 1: Write the failing test**

```ts
import { branchesOf, type Branch, type SiteClass } from './discoveryModel';
import { CC } from '../../engine';

it('every seeded branch carries a site class', () => {
  const classes: SiteClass[] = ['dc', 'office', 'branch', 'atm'];
  const branches = branchesOf(CC as never);
  expect(branches.length).toBeGreaterThan(0);
  branches.forEach(b => expect(classes).toContain(b.siteClass));
});

it('ACME: Ashburn DC is a dc, the rest are offices', () => {
  const byId = Object.fromEntries(branchesOf(CC as never).map(b => [b.id, b.siteClass]));
  expect(byId['br-ash']).toBe('dc');
  expect(byId['br-sjc']).toBe('office');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/discover/discoveryModel.test.ts`
Expected: FAIL - `siteClass` undefined on seeds.

- [ ] **Step 3: Implement**

In `discoveryModel.ts`:

```ts
export type SiteClass = 'dc' | 'office' | 'branch' | 'atm';
export interface Branch {
  id: string;
  name: string;
  city: string;
  cidrs: string[];
  onrampId?: string;
  cloudTags?: Record<string, string>;
  siteClass: SiteClass;
}
```

In `state.ts`, add to each branch literal: `siteClass:'office'` for br-sjc, br-sfo, br-bkl, br-dal, br-chi; `siteClass:'dc'` for br-ash ("Ashburn DC" is literally a DC).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/discover/ src/engine/branches.test.ts`
Expected: PASS (branches.test.ts asserts cities, untouched by the new field).

- [ ] **Step 5: Commit**

```bash
git add src/features/discover/discoveryModel.ts src/features/discover/discoveryModel.test.ts src/engine/state.ts
git commit -m "feat(estate): site classes on the branch model"
```

### Task 2: Rollup derivations and the threshold contract

**Files:**
- Modify: `src/features/discover/discoveryModel.ts`
- Test: `src/features/discover/discoveryModel.test.ts`

**Interfaces:**
- Consumes: `SiteClass`, `Branch.siteClass`, `branchesOf(cc)` from Task 1.
- Produces:
  - `ROLLUP_THRESHOLD = 50` (exported const)
  - `needsRollup(count: number): boolean` - `count > ROLLUP_THRESHOLD`
  - `siteRollup(cc): { siteClass: SiteClass; count: number; onNet: number }[]` - classes in fixed order dc→office→branch→atm, absent classes omitted; `onNet` counts branches with an `onrampId`.
  - `cloudRollup(cc): { cloudId: string; name: string; regions: number; workloads: number }[]` - from `cc.fabricModel()` clouds/regions, one row per cloud.

- [ ] **Step 1: Write the failing tests**

```ts
import { siteRollup, cloudRollup, needsRollup, ROLLUP_THRESHOLD } from './discoveryModel';

it('siteRollup counts by class with onNet from onrampId presence', () => {
  const rows = siteRollup(CC as never);
  const office = rows.find(r => r.siteClass === 'office');
  expect(office?.count).toBe(5);
  expect(office?.onNet).toBe(5);           // all five ACME offices carry onrampId
  expect(rows.map(r => r.siteClass)).toEqual(['dc', 'office']); // fixed order, absent omitted
});

it('cloudRollup gives one row per cloud with region and workload counts', () => {
  const aws = cloudRollup(CC as never).find(r => r.cloudId === 'aws');
  expect(aws?.regions).toBe(3);
  expect(aws?.workloads).toBe(142);
});

it('needsRollup trips strictly above the threshold', () => {
  expect(needsRollup(ROLLUP_THRESHOLD)).toBe(false);
  expect(needsRollup(ROLLUP_THRESHOLD + 1)).toBe(true);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/features/discover/discoveryModel.test.ts`
Expected: FAIL - exports missing.

- [ ] **Step 3: Implement**

```ts
export const ROLLUP_THRESHOLD = 50;
export const needsRollup = (count: number) => count > ROLLUP_THRESHOLD;

const CLASS_ORDER: SiteClass[] = ['dc', 'office', 'branch', 'atm'];

export function siteRollup(cc: CloudControl): { siteClass: SiteClass; count: number; onNet: number }[] {
  const acc = new Map<SiteClass, { count: number; onNet: number }>();
  for (const b of branchesOf(cc)) {
    const row = acc.get(b.siteClass) ?? { count: 0, onNet: 0 };
    row.count += 1;
    if (b.onrampId) row.onNet += 1;
    acc.set(b.siteClass, row);
  }
  return CLASS_ORDER.filter(c => acc.has(c)).map(c => ({ siteClass: c, ...acc.get(c)! }));
}

export function cloudRollup(cc: CloudControl): { cloudId: string; name: string; regions: number; workloads: number }[] {
  const fabric = cc.fabricModel();
  return fabric.clouds.map(cl => ({
    cloudId: cl.id,
    name: cl.name,
    regions: fabric.regions.filter(r => r.cloudId === cl.id).length,
    workloads: cl.workloads,
  }));
}
```

(Adjust `fabricModel()` field access to the actual `FabricModel` shape in `src/engine/types.ts` - clouds carry `workloads`, regions carry `cloudId`; verify at implementation time and keep the test as the contract.)

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/features/discover/discoveryModel.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/discover/discoveryModel.ts src/features/discover/discoveryModel.test.ts
git commit -m "feat(estate): siteRollup, cloudRollup, and the 50-row rollup contract"
```

### Task 3: The Meridian Trust generator

**Files:**
- Create: `src/engine/meridianEstate.ts`
- Test: `src/engine/meridianEstate.test.ts`

**Interfaces:**
- Consumes: `SiteClass` shape (structurally - engine files don't import from features; the generator emits plain objects matching state.ts's branch literal shape plus `siteClass`).
- Produces: `meridianEstate(): { branches: MeridianBranch[]; clouds: MeridianCloud[]; regions: Record<string, MeridianRegion[]>; vpcs: Record<string, MeridianVpc[]> }` where the four shapes mirror the state.ts literals exactly (same keys as lines 49-104). Counts: 3 dc, 210 office, 2840 branch, 1130 atm (4,183 sites).

- [ ] **Step 1: Write the failing tests**

```ts
import { meridianEstate } from './meridianEstate';

it('is deterministic', () => {
  expect(JSON.stringify(meridianEstate())).toBe(JSON.stringify(meridianEstate()));
});

it('seeds the bank-scale site mix', () => {
  const byClass = (c: string) => meridianEstate().branches.filter(b => b.siteClass === c).length;
  expect(byClass('dc')).toBe(3);
  expect(byClass('office')).toBe(210);
  expect(byClass('branch')).toBe(2840);
  expect(byClass('atm')).toBe(1130);
});

it('gives every site an id, name, city, geo and a class-appropriate CIDR', () => {
  for (const b of meridianEstate().branches) {
    expect(b.id).toMatch(/^mt-/);
    expect(b.geo).toHaveLength(2);
    expect(b.cidrs[0]).toMatch(/^10\.\d+\.\d+\.\d+\/(20|24|28)$/); // dc-office /20, branch /24, atm /28
  }
});

it('builds a hub-spoke cloud estate on two providers', () => {
  const e = meridianEstate();
  expect(e.clouds.map(c => c.id).sort()).toEqual(['aws', 'azure']);
  for (const regionList of Object.values(e.regions)) {
    for (const r of regionList) {
      const spokes = e.vpcs[r.id] ?? [];
      expect(spokes.some(v => v.role.startsWith('Transit hub'))).toBe(true);
    }
  }
});

it('carries the phase-2a finding seeds', () => {
  const e = meridianEstate();
  const all = Object.values(e.vpcs).flat();
  expect(all.some(v => v.ai && !(v.tags ?? []).length)).toBe(true);          // untracked AI
  expect(Object.values(e.regions).flat().some(r => !r.attached)).toBe(true); // unattached regions
  expect(Object.values(e.regions).flat().some(r => r.spof)).toBe(true);      // SPOF
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/engine/meridianEstate.test.ts`
Expected: FAIL - module missing.

- [ ] **Step 3: Implement the generator**

```ts
/* Meridian Trust - the bank-scale seed profile. Deterministic: a fixed-seed
 * LCG drives every choice; no Date/Math.random (resume- and test-safe). */

const METROS: [string, number, number, number][] = [
  // [city, lat, lon, weight] - weight shapes how many branches/ATMs land there
  ['Dallas', 32.78, -96.8, 9], ['Charlotte', 35.23, -80.84, 8], ['Chicago', 41.88, -87.63, 8],
  ['Phoenix', 33.45, -112.07, 6], ['Atlanta', 33.75, -84.39, 6], ['Denver', 39.74, -104.99, 5],
  ['Columbus', 39.96, -83.0, 5], ['San Antonio', 29.42, -98.49, 5], ['Minneapolis', 44.98, -93.27, 4],
  ['Portland', 45.52, -122.68, 4], ['Des Moines', 41.59, -93.62, 3], ['Salt Lake City', 40.76, -111.89, 3],
];

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

export function meridianEstate() {
  const rnd = lcg(20260810);
  const branches: MeridianBranch[] = [];
  let net = 0; // rolling 10.x allocator

  const push = (siteClass: 'dc' | 'office' | 'branch' | 'atm', i: number, metro: (typeof METROS)[number], mask: 20 | 24 | 28) => {
    const [city, lat, lon] = metro;
    branches.push({
      id: `mt-${siteClass}-${String(i).padStart(4, '0')}`,
      name: siteClass === 'dc' ? `${city} data center` : siteClass === 'office' ? `${city} office ${i}` : siteClass === 'branch' ? `${city} branch ${i}` : `${city} ATM ${i}`,
      city,
      geo: [lat + (rnd() - 0.5) * 0.4, lon + (rnd() - 0.5) * 0.4] as [number, number],
      cidrs: [`10.${64 + (net >> 8)}.${net++ % 256}.0/${mask}`],
      // DCs and offices are on AVPN (on-net); branches mostly on-net via SD-WAN;
      // ATMs split cellular (off-net) vs wired (on-net).
      ...(siteClass === 'atm' ? (rnd() < 0.6 ? {} : { onrampId: 'mt-nb1' }) : { onrampId: 'mt-nb1' }),
      siteClass,
      cloudTags: { Region: lon < -100 ? 'west' : lon < -90 ? 'central' : 'east', Env: 'prod', Owner: 'facilities' },
    });
  };

  const weighted = () => { // pick a metro by weight
    const total = METROS.reduce((s, m) => s + m[3], 0);
    let roll = rnd() * total;
    for (const m of METROS) { roll -= m[3]; if (roll <= 0) return m; }
    return METROS[0];
  };

  ([['dc', 3, 20], ['office', 210, 20], ['branch', 2840, 24], ['atm', 1130, 28]] as const)
    .forEach(([cls, n, mask]) => { for (let i = 1; i <= n; i++) push(cls, i, weighted(), mask); });

  // Cloud estate: AWS + Azure, hub-spoke, business-unit spokes, finding seeds.
  const clouds = [
    { id: 'aws', name: 'AWS', color: '#ff9900', mk: 'aws', workloads: 640, attached: true, partial: true },
    { id: 'azure', name: 'Azure', color: '#3b8bd4', mk: 'AZ', workloads: 410, attached: false },
  ];
  const regions = {
    aws: [
      { id: 'use1', name: 'us-east-1', sub: 'N. Virginia', subnets: 96, routes: 210, gateways: 41, lat: 11, attached: true, geo: [38.9, -77.4] as const },
      { id: 'usw2', name: 'us-west-2', sub: 'Oregon', subnets: 64, routes: 140, gateways: 28, lat: 58, attached: false, geo: [45.6, -121.2] as const },
    ],
    azure: [
      { id: 'scus', name: 'South Central US', sub: 'Texas', subnets: 72, routes: 155, gateways: 30, lat: 16, attached: false, geo: [29.4, -98.5] as const },
      { id: 'eus2', name: 'East US 2', sub: 'Virginia · single path', subnets: 48, routes: 98, gateways: 19, lat: 24, attached: false, spof: true, geo: [36.6, -78.4] as const },
    ],
  };
  const bu = ['retail', 'payments', 'risk', 'ai-lab'];
  const vpcs: Record<string, MeridianVpc[]> = {};
  for (const [cloudId, rs] of Object.entries(regions)) {
    for (const r of rs) {
      const hub = { id: `${r.id}-hub`, name: `${cloudId === 'aws' ? 'tgw' : 'vwan'}-${r.id}`, cidr: `10.128.${Object.keys(vpcs).length * 8}.0/21`, azs: 3, subnets: 6, attached: r.attached, role: 'Transit hub · platform', vnet: cloudId === 'azure', cloudTags: { Env: 'prod', Owner: 'platform', Region: 'east' } };
      const spokes = bu.map((unit, i) => ({
        id: `${r.id}-${unit}`, name: `${cloudId === 'aws' ? 'vpc' : 'vnet'}-${unit}-${r.id}`,
        cidr: `10.129.${(Object.keys(vpcs).length * 8 + i + 1)}.0/24`, azs: 2, subnets: 4,
        attached: r.attached && unit !== 'ai-lab',
        role: `${unit} workloads`, vnet: cloudId === 'azure',
        // ai-lab spokes are the untracked-AI seed: ai:true, NO governance tags.
        ...(unit === 'ai-lab' ? { ai: true } : { tags: unit === 'payments' ? ['pci'] : ['shared-services'] }),
        cloudTags: { Project: unit, Env: 'prod', Owner: unit, Region: 'east' },
      }));
      vpcs[r.id] = [hub, ...spokes];
    }
  }
  return { branches, clouds, regions, vpcs };
}
```

Define `MeridianBranch` / `MeridianCloud` / `MeridianRegion` / `MeridianVpc` interfaces at the top of the module mirroring the state.ts literal shapes (id/name/city/geo/cidrs/onrampId/cloudTags/siteClass; id/name/color/mk/workloads/attached/partial/ai; id/name/sub/subnets/routes/gateways/lat/attached/spof/ai/geo; id/name/cidr/azs/subnets/attached/role/tags/vnet/ai/cloudTags).

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/engine/meridianEstate.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/meridianEstate.ts src/engine/meridianEstate.test.ts
git commit -m "feat(estate): deterministic Meridian Trust bank-scale seed profile"
```

### Task 4: Boot-time profile swap

**Files:**
- Create: `src/engine/estateProfile.ts`
- Modify: `src/engine/index.ts:2-3` (import placement)
- Modify: `src/engine/state.ts:49` region (add `siteClass` already done in Task 1; also add an `mt-nb1` onramp guard - see Step 3)
- Test: `src/engine/estateProfile.test.ts`

**Interfaces:**
- Consumes: `meridianEstate()` from Task 3; `window.CC` seed arrays from `./state`.
- Produces: `applyEstateProfile(cc, profile: 'acme' | 'meridian'): void` (exported for tests) and a module side effect that reads `resolveProfile(location.search, localStorage)` and applies it. `resolveProfile` exported: URL `?estate=meridian` wins, else `localStorage.estateProfile`, else `'acme'`; a recognized URL value is persisted back to localStorage.

- [ ] **Step 1: Write the failing tests**

```ts
import { applyEstateProfile, resolveProfile } from './estateProfile';
import { CC } from './index';

it('resolveProfile: URL wins, persists, defaults to acme', () => {
  const store: Record<string, string> = {};
  const ls = { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; } };
  expect(resolveProfile('?estate=meridian', ls as never)).toBe('meridian');
  expect(store.estateProfile).toBe('meridian');
  expect(resolveProfile('', ls as never)).toBe('meridian'); // sticky
  expect(resolveProfile('', { getItem: () => null, setItem: () => {} } as never)).toBe('acme');
});

it('applyEstateProfile swaps seeds in place, preserving array identity', () => {
  const before = CC.branches;
  applyEstateProfile(CC as never, 'meridian');
  expect(CC.branches).toBe(before);                 // same reference - closures still see it
  expect(CC.branches.length).toBeGreaterThan(4000);
  applyEstateProfile(CC as never, 'acme');
  expect(CC.branches.length).toBe(6);               // restorable for test isolation
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/engine/estateProfile.test.ts`
Expected: FAIL - module missing.

- [ ] **Step 3: Implement**

```ts
import { meridianEstate } from './meridianEstate';

export type EstateProfile = 'acme' | 'meridian';

export function resolveProfile(search: string, ls: Pick<Storage, 'getItem' | 'setItem'>): EstateProfile {
  const url = new URLSearchParams(search).get('estate');
  if (url === 'meridian' || url === 'acme') { ls.setItem('estateProfile', url); return url; }
  return ls.getItem('estateProfile') === 'meridian' ? 'meridian' : 'acme';
}

const swap = <T>(target: T[], next: T[]) => { target.length = 0; target.push(...next); };
const swapRecord = (target: Record<string, unknown[]>, next: Record<string, unknown[]>) => {
  for (const k of Object.keys(target)) delete target[k];
  Object.assign(target, next);
};

let acmeSnapshot: ReturnType<typeof snapshot> | null = null;
const snapshot = (cc: EngineSeeds) => ({
  branches: [...cc.branches], clouds: [...cc.clouds],
  regions: { ...cc.regions }, vpcs: { ...cc.vpcs },
});

export function applyEstateProfile(cc: EngineSeeds, profile: EstateProfile): void {
  acmeSnapshot ??= snapshot(cc);
  const next = profile === 'meridian' ? meridianEstate() : acmeSnapshot;
  swap(cc.branches, next.branches as never);
  swap(cc.clouds, next.clouds as never);
  swapRecord(cc.regions as never, next.regions as never);
  swapRecord(cc.vpcs as never, next.vpcs as never);
}

// Boot side effect - must run after ./state, before every other state-* module.
const cc = (window as unknown as { CC: EngineSeeds }).CC;
if (cc && typeof location !== 'undefined') {
  applyEstateProfile(cc, resolveProfile(location.search, localStorage));
}
```

`EngineSeeds` is a minimal structural interface (`branches: unknown[]` etc.) declared in this module - it must not import feature types. In `index.ts`, add `import './estateProfile';` on the line after `import './state';` with a comment stating the ordering constraint (billing freezes its baseline at load). Meridian branch `onrampId` values reference `mt-nb1`; add a guard: if the profile is meridian, also push a Meridian on-ramp literal (`{id:'mt-nb1', name:'NetBond · PE-DAL-01', type:'NetBond', ...}` matching the onramps literal shape at state.ts:26-39) onto `cc.onramps` in `applyEstateProfile`, restoring on swap back. **Ordering constraint (billing baseline):** the meridian swap must land before `state-billing` loads; the vitest environment imports `./index` fresh per file, so the test above exercises `applyEstateProfile` directly and restores acme.

- [ ] **Step 4: Run to verify pass, plus full engine suite**

Run: `npx vitest run src/engine/`
Expected: PASS - and every pre-existing engine test still green with no flag set.

- [ ] **Step 5: Commit**

```bash
git add src/engine/estateProfile.ts src/engine/estateProfile.test.ts src/engine/index.ts
git commit -m "feat(estate): boot-time estate profile swap (?estate=meridian)"
```

### Task 5: Site-class facet on estate filters

**Files:**
- Modify: `src/features/discover/estateFilters.ts`
- Modify: `src/features/discover/EstateFilterChips.tsx`
- Test: `src/features/discover/estateFilters.test.ts`, `src/features/discover/UnifiedDiscovery.test.tsx` (chip render)

**Interfaces:**
- Consumes: `SiteClass`, `Branch` from `discoveryModel.ts` (Task 1).
- Produces: `EstateFilters.siteClass: SiteClass | 'all'` (new facet, `'all'` in `EMPTY_ESTATE_FILTERS`); `branchMatches(b: Branch, f: EstateFilters): boolean` (cloud/path/domain facets don't constrain branches; only `siteClass` does). `regionMatches` unchanged.

- [ ] **Step 1: Write the failing tests**

```ts
import { branchMatches, EMPTY_ESTATE_FILTERS } from './estateFilters';

const atm = { id: 'x', name: 'x', city: 'x', cidrs: [], siteClass: 'atm' } as never;

it('branchMatches: siteClass facet narrows, all matches everything', () => {
  expect(branchMatches(atm, EMPTY_ESTATE_FILTERS)).toBe(true);
  expect(branchMatches(atm, { ...EMPTY_ESTATE_FILTERS, siteClass: 'atm' })).toBe(true);
  expect(branchMatches(atm, { ...EMPTY_ESTATE_FILTERS, siteClass: 'dc' })).toBe(false);
});

it('cloud facet never excludes a branch', () => {
  expect(branchMatches(atm, { ...EMPTY_ESTATE_FILTERS, cloud: 'aws' })).toBe(true);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/features/discover/estateFilters.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Add the facet to the interface and `EMPTY_ESTATE_FILTERS`, then:

```ts
export function branchMatches(b: Branch, f: EstateFilters): boolean {
  return f.siteClass === 'all' || b.siteClass === f.siteClass;
}
```

In `EstateFilterChips.tsx`, add a chip group for site classes following the exact idiom of the existing cloud/path/domain chip groups (same `fw-*` classes, same aria-pressed pattern), labeled `Data centers / Offices / Branches / ATMs`, rendered only when the estate has more than one site class present (`siteRollup(cc).length > 1`).

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/features/discover/`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/discover/estateFilters.ts src/features/discover/estateFilters.test.ts src/features/discover/EstateFilterChips.tsx
git commit -m "feat(estate): site-class facet on the estate filters"
```

### Task 6: Rollup rendering in UnifiedDiscovery

**Files:**
- Modify: `src/features/discover/UnifiedDiscovery.tsx`
- Test: `src/features/discover/UnifiedDiscovery.test.tsx`

**Interfaces:**
- Consumes: `siteRollup`, `needsRollup`, `ROLLUP_THRESHOLD`, `branchMatches` (Tasks 2, 5).
- Produces: rendering behavior only. Site sections whose filtered branch count exceeds the threshold render one `data-testid="site-rollup-row"` per class (label `2,840 branches · 1,988 on AT&T`) with a drill-in that expands to the first 50 + a `data-testid="rollup-more"` count row; at or under threshold, per-site rows render as today.

- [ ] **Step 1: Write the failing tests**

```tsx
it('renders rollup rows, not per-site rows, past the threshold', () => {
  applyEstateProfile(CC as never, 'meridian');
  render(<UnifiedDiscovery />);
  expect(screen.getAllByTestId('site-rollup-row').length).toBeGreaterThanOrEqual(3);
  expect(screen.queryAllByTestId('site-row').length).toBeLessThanOrEqual(ROLLUP_THRESHOLD);
  applyEstateProfile(CC as never, 'acme');
});

it('ACME still renders its six sites as rows', () => {
  render(<UnifiedDiscovery />);
  expect(screen.getAllByTestId('site-row')).toHaveLength(6);
  expect(screen.queryByTestId('site-rollup-row')).not.toBeInTheDocument();
});
```

(Adopt the component's actual site-row testid if one exists - read the component first; if rows carry no testid, add `data-testid="site-row"` as part of this task.)

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/features/discover/UnifiedDiscovery.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

In the site-list section of `UnifiedDiscovery.tsx`: compute `const filtered = branchesOf(cc).filter(b => branchMatches(b, filters))`; when `needsRollup(filtered.length)`, group by `siteClass` and render rollup rows (existing row idiom, `fw-*` tokens; count via `Intl.NumberFormat('en-US')`); drill-in state per class in the existing open-set pattern (`site-class/${cls}` keys beside the tree's path keys); expanded shows `filtered.slice(0, ROLLUP_THRESHOLD)` and a final row `+ {n - ROLLUP_THRESHOLD} more - filter to narrow`. The map view clusters the same way: when over threshold, plot one marker per class+metro (`city`) with a count badge instead of per-site markers.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/features/discover/`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/discover/UnifiedDiscovery.tsx src/features/discover/UnifiedDiscovery.test.tsx
git commit -m "feat(estate): rollup-first site rendering past the 50-row contract"
```

### Task 7: End-to-end - Meridian walk and ACME regression

**Files:**
- Create: `e2e/meridian-estate.spec.ts`

**Interfaces:**
- Consumes: everything above via the running app; `?estate=meridian` boot flag.

- [ ] **Step 1: Write the spec**

```ts
import { test, expect } from '@playwright/test';

test('meridian: Discover leads with rollups and the class chips scope them', async ({ page }) => {
  await page.goto('/discover?estate=meridian');
  const rollups = page.getByTestId('site-rollup-row');
  await expect(rollups.first()).toBeVisible();
  await expect(page.getByTestId('site-row')).toHaveCount(0);
  await page.getByRole('button', { name: /ATMs/ }).click();
  await expect(page.getByTestId('site-rollup-row')).toHaveCount(1);      // only the ATM class remains
  await expect(page.getByTestId('site-rollup-row').first()).toContainText('1,130');
});

test('meridian: tenant switch is interactive quickly', async ({ page }) => {
  const t0 = Date.now();
  await page.goto('/discover?estate=meridian');
  await expect(page.getByTestId('site-rollup-row').first()).toBeVisible();
  expect(Date.now() - t0).toBeLessThan(5000); // generous e2e guard; the 200ms budget is a profiling target, not a CI gate
});

test('acme: unflagged boot is regression-clean', async ({ page }) => {
  await page.goto('/discover?estate=acme');   // explicit reset - localStorage may hold meridian from the prior test
  await expect(page.getByTestId('site-row')).toHaveCount(6);
  await expect(page.getByTestId('site-rollup-row')).toHaveCount(0);
});
```

- [ ] **Step 2: Run the new spec**

Run: `npx playwright test e2e/meridian-estate.spec.ts`
Expected: PASS.

- [ ] **Step 3: Run the whole verify pipeline**

Run: `npm run verify`
Expected: PASS - all unit suites, the build, and the full e2e set including the pre-existing Discover specs.

- [ ] **Step 4: Walk it in the browser**

Dev server up; visit `/discover?estate=meridian`. Confirm: rollups lead, chips scope tree AND map, drill-in caps at 50 + more-row, map clusters by metro, and `/discover?estate=acme` restores the familiar six sites. Screenshot both states.

- [ ] **Step 5: Commit**

```bash
git add e2e/meridian-estate.spec.ts
git commit -m "test(e2e): meridian estate rollups, chip scoping, acme regression"
```
