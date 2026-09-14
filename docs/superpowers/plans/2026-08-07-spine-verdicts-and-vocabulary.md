# Spine Verdicts and Vocabulary (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every demo-spine screen (Discover, Connect, Observe) opens with a plain-English verdict sentence, and a vocabulary test suite guards acronym glossing and savings-first framing.

**Architecture:** A shared `VerdictLine` presentational component renders one sentence per page. Verdict text is computed in pure, testable selectors that live beside each feature's existing model/binding (`discoverVerdict`, `connectVerdict`, and a `verdict` field on the Observe binding). A new `src/__tests__/vocabulary.test.ts` scans spine source files the same way `src/__tests__/rebrand.test.ts` does.

**Tech Stack:** React 18 + TypeScript, Vitest + @testing-library/react, the `CC` engine singleton from `src/engine`. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-07-conversational-cloud-connect-design.md` (Phase 1). Two spec items are already satisfied and need no task: the "story strip" exists as `FlowBar`/`FlowStepper` (`src/components/flow/`), rendered on all three spine pages and covered by `FlowStepper.test.tsx` / `useFlowProgress.test.tsx`; and the spine's surviving tab labels (`FLOW_TABS` / `GROUP_BY_OPTIONS` in `networkBinding.ts:50-66`) are already plain words - the Task 5 acronym guard prevents regression.

## Global Constraints

- The demo spine is `src/features/discover/`, `src/features/connect/`, `src/features/observe/`, plus `src/features/_shared/`. No changes outside these directories except `src/__tests__/vocabulary.test.ts` and the one interface line in `src/features/observe/ObservabilityBinding.ts`.
- New UI copy: no em dashes (use a period and a new sentence), no unexpanded acronyms, savings-first framing ("Save"/"saving", never "Cost" unless the figure is literally spend).
- Verdict selectors must return a sentence for EVERY state, including empty/degraded data (spec: "No traffic yet: the fabric is quiet").
- All test commands are `npx vitest run <path>` from the repo root.
- Existing suites must stay green: run `npx vitest run src/__tests__/rebrand.test.ts` before each commit that touches copy.
- Commit messages follow the repo's conventional style (`feat(observe): ...`) and end with the Claude co-author trailer.

---

### Task 1: VerdictLine shared component

**Files:**
- Create: `src/features/_shared/VerdictLine.tsx`
- Test: `src/features/_shared/VerdictLine.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `export function VerdictLine({ children }: { children: string }): JSX.Element` - renders a `<p data-testid="verdict-line">`. Tasks 2-4 import it as `import { VerdictLine } from '../_shared/VerdictLine';`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/_shared/VerdictLine.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VerdictLine } from './VerdictLine';

describe('VerdictLine', () => {
  it('renders the verdict sentence as a paragraph with the verdict-line testid', () => {
    render(<VerdictLine>Traffic is flowing clean.</VerdictLine>);
    const p = screen.getByTestId('verdict-line');
    expect(p.tagName).toBe('P');
    expect(p).toHaveTextContent('Traffic is flowing clean.');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/_shared/VerdictLine.test.tsx`
Expected: FAIL - cannot resolve `./VerdictLine`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/features/_shared/VerdictLine.tsx
/**
 * The verdict sentence: the one plain-English conclusion a spine screen
 * opens with. Copy comes from a pure selector beside the feature's model;
 * this component only presents it. Spec: Phase 1, "verdict sentences".
 */
export function VerdictLine({ children }: { children: string }) {
  return (
    <p
      data-testid="verdict-line"
      className="text-figma-lg font-semibold leading-snug text-fw-heading"
    >
      {children}
    </p>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/_shared/VerdictLine.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/_shared/VerdictLine.tsx src/features/_shared/VerdictLine.test.tsx
git commit -m "feat(spine): VerdictLine - the one-sentence conclusion a spine screen opens with"
```

---

### Task 2: Observe verdict on the network binding

**Files:**
- Modify: `src/features/observe/ObservabilityBinding.ts` (interface `ObservabilityBinding`, after the `briefing()` member)
- Modify: `src/features/observe/networkBinding.ts` (new `buildVerdict` function; add `verdict` to the object literal returned by `networkBinding()` at ~line 326)
- Modify: `src/features/observe/ObservePage.tsx`
- Test: `src/features/observe/networkBinding.test.ts`, `src/features/observe/ObservePage.test.tsx`

**Interfaces:**
- Consumes: `VerdictLine` from Task 1. Existing engine methods `cc.routingKpis()` (fields `pctUnderControl: number`, `totalGbps: number`) and `cc.egress()` (`CloudControlEgress.savings: number`), plus the module-private `fmtDollars(n: number): string` already defined in `networkBinding.ts:68`.
- Produces: `ObservabilityBinding.verdict?: string` (optional so the AI-fabric binding keeps compiling untouched). `networkBinding(cc).verdict` is always a non-empty string.

- [ ] **Step 1: Write the failing tests**

Append to the existing `describe('networkBinding', ...)` block in `src/features/observe/networkBinding.test.ts`:

```ts
  it('states a verdict: controlled share, savings per month, and the public remainder', () => {
    const v = networkBinding(CC).verdict!;
    expect(v).toMatch(/% of your traffic rides the AT&T-controlled path/);
    expect(v).toMatch(/saving \$[\d,.]+[kM]?\/mo/);
    expect(v).toMatch(/\./); // it is a sentence, not a fragment
  });
  it('verdict is deterministic', () => {
    expect(networkBinding(CC).verdict).toEqual(networkBinding(CC).verdict);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/observe/networkBinding.test.ts`
Expected: FAIL - `verdict` is `undefined`.

- [ ] **Step 3: Implement the verdict**

In `src/features/observe/ObservabilityBinding.ts`, add to the `ObservabilityBinding` interface directly after the `briefing(): Briefing;` line:

```ts
  /** The one plain-English sentence this screen opens with. Optional: a
   *  binding without verdict copy simply omits it and no line renders. */
  verdict?: string;
```

In `src/features/observe/networkBinding.ts`, add above `networkBinding()`:

```ts
/** Phase-1 verdict: the screen's conclusion in one sentence, savings-first.
 *  Every state returns a sentence - including the quiet fabric. */
function buildVerdict(cc: CloudControl): string {
  const rk = cc.routingKpis();
  const eg = cc.egress();
  if (!rk.totalGbps) return 'No traffic yet. The fabric is quiet.';
  const publicPct = 100 - rk.pctUnderControl;
  const saved = `${fmtDollars(eg.savings)}/mo`;
  if (publicPct <= 0) {
    return `All of your traffic rides the AT&T-controlled path, saving ${saved}.`;
  }
  return `${rk.pctUnderControl}% of your traffic rides the AT&T-controlled path, saving ${saved}. ${publicPct}% still crosses the public internet.`;
}
```

Then add `verdict: buildVerdict(cc),` to the object literal returned by `networkBinding()`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/observe/networkBinding.test.ts`
Expected: PASS (all, including the pre-existing cases).

- [ ] **Step 5: Render it on ObservePage**

In `src/features/observe/ObservePage.tsx`, import `{ VerdictLine } from '../_shared/VerdictLine';` and change the FlowBar block to:

```tsx
      <div className="px-6 pt-6 space-y-3">
        {binding.verdict && <VerdictLine>{binding.verdict}</VerdictLine>}
        <FlowBar cta={{ label: 'See the savings', to: '/naas/cost' }} />
      </div>
```

Add to `src/features/observe/ObservePage.test.tsx`, inside its existing describe, reusing the file's existing render setup verbatim:

```tsx
  it('opens with the verdict line', () => {
    // use this file's existing render helper/arrangement for ObservePage
    expect(screen.getByTestId('verdict-line').textContent).toMatch(/AT&T-controlled path/);
  });
```

- [ ] **Step 6: Run the page test and the rebrand guard**

Run: `npx vitest run src/features/observe/ObservePage.test.tsx src/__tests__/rebrand.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/features/observe
git commit -m "feat(observe): the screen opens with its verdict - controlled share, savings, public remainder"
```

---

### Task 3: Connect verdict

**Files:**
- Create: `src/features/connect/verdict.ts`
- Modify: `src/features/connect/ConnectPage.tsx:71` (the `FlowBar` line inside `PageSection`)
- Test: `src/features/connect/verdict.test.ts`

**Interfaces:**
- Consumes: `VerdictLine` (Task 1); `FabricModel` type from `./FabricHero` (`regions: FabricRegion[]` with `path: 'private' | 'public'` and `reliability: 'dual' | 'single' | 'none'`).
- Produces: `export function connectVerdict(model: FabricModel): string`.

- [ ] **Step 1: Write the failing test**

```ts
// src/features/connect/verdict.test.ts
import { describe, it, expect } from 'vitest';
import { connectVerdict } from './verdict';
import type { FabricModel } from './FabricHero';

const region = (path: 'private' | 'public', reliability: 'dual' | 'single' | 'none') =>
  ({ cloudId: 'aws', regionId: `r-${Math.random()}`, name: 'r', cloudName: 'AWS',
     attached: path === 'private', reliability, path, privateMs: 10, publicMs: 40,
     currentMs: path === 'private' ? 10 : 40 }) as FabricModel['regions'][number];

const model = (regions: FabricModel['regions']): FabricModel =>
  ({ sites: [], onramps: [], regions, c2c: [] });

describe('connectVerdict', () => {
  it('mixed estate: counts on-fabric, dual, and public in one sentence pair', () => {
    const v = connectVerdict(model([
      region('private', 'dual'), region('private', 'single'), region('public', 'none'),
    ]));
    expect(v).toBe('2 of 3 regions are on the AT&T fabric, 1 with dual paths. 1 still rides the public internet.');
  });
  it('nothing attached: says so plainly', () => {
    const v = connectVerdict(model([region('public', 'none'), region('public', 'none')]));
    expect(v).toBe('None of your 2 regions are on the AT&T fabric yet. Everything rides the public internet.');
  });
  it('fully attached: no public remainder sentence', () => {
    const v = connectVerdict(model([region('private', 'dual'), region('private', 'dual')]));
    expect(v).toBe('All 2 regions are on the AT&T fabric, 2 with dual paths.');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/connect/verdict.test.ts`
Expected: FAIL - cannot resolve `./verdict`.

- [ ] **Step 3: Write the implementation**

```ts
// src/features/connect/verdict.ts
import type { FabricModel } from './FabricHero';

/** Phase-1 verdict for Connect: fabric posture in one sentence pair.
 *  Every estate shape returns a sentence, including the empty one. */
export function connectVerdict(model: FabricModel): string {
  const total = model.regions.length;
  if (!total) return 'No estate mapped yet. Discover your clouds to begin.';
  const attached = model.regions.filter(r => r.path === 'private');
  const dual = attached.filter(r => r.reliability === 'dual').length;
  const pub = total - attached.length;
  if (!attached.length) {
    return `None of your ${total} regions are on the AT&T fabric yet. Everything rides the public internet.`;
  }
  if (!pub) {
    return `All ${total} regions are on the AT&T fabric, ${dual} with dual paths.`;
  }
  return `${attached.length} of ${total} regions are on the AT&T fabric, ${dual} with dual paths. ${pub} still ride${pub === 1 ? 's' : ''} the public internet.`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/connect/verdict.test.ts`
Expected: PASS.

- [ ] **Step 5: Render it on ConnectPage**

In `src/features/connect/ConnectPage.tsx`, import `{ VerdictLine } from '../_shared/VerdictLine';` and `{ connectVerdict } from './verdict';`, then change line 71 from:

```tsx
        <FlowBar cta={{ label: 'Govern these paths', to: '/naas/govern' }} />
```

to:

```tsx
        <VerdictLine>{connectVerdict(model)}</VerdictLine>
        <FlowBar cta={{ label: 'Govern these paths', to: '/naas/govern' }} />
```

Run: `npx vitest run src/features/connect/ConnectPage.test.tsx`
Expected: PASS (if the page test snapshots copy, update per its existing pattern).

- [ ] **Step 6: Commit**

```bash
git add src/features/connect
git commit -m "feat(connect): the screen opens with its verdict - fabric posture in one sentence"
```

---

### Task 4: Discover verdict

**Files:**
- Create: `src/features/discover/verdict.ts`
- Modify: `src/features/discover/DiscoverPage.tsx` (top of the returned tree, above the two-column flex)
- Test: `src/features/discover/verdict.test.ts`

**Interfaces:**
- Consumes: `VerdictLine` (Task 1); `FabricModel` from `../connect/FabricHero`; `useCloudControl` from `../../engine/react/useCloudControl`.
- Produces: `export function discoverVerdict(model: FabricModel): string`.

- [ ] **Step 1: Write the failing test**

```ts
// src/features/discover/verdict.test.ts
import { describe, it, expect } from 'vitest';
import { discoverVerdict } from './verdict';
import type { FabricModel } from '../connect/FabricHero';

const region = (cloudId: string, path: 'private' | 'public') =>
  ({ cloudId, regionId: `${cloudId}-${path}-${Math.random()}`, name: 'r', cloudName: cloudId,
     attached: path === 'private', reliability: 'single', path, privateMs: 10, publicMs: 40,
     currentMs: 40 }) as FabricModel['regions'][number];

const model = (regions: FabricModel['regions']): FabricModel =>
  ({ sites: [], onramps: [], regions, c2c: [] });

describe('discoverVerdict', () => {
  it('states span, fabric count, and public count', () => {
    const v = discoverVerdict(model([
      region('aws', 'private'), region('aws', 'public'), region('azure', 'public'),
    ]));
    expect(v).toBe('Your estate spans 3 regions across 2 clouds. 1 is on the AT&T fabric; 2 still ride the public internet.');
  });
  it('empty estate returns a sentence, not silence', () => {
    expect(discoverVerdict(model([]))).toBe('No estate mapped yet. Connect a cloud to begin.');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/discover/verdict.test.ts`
Expected: FAIL - cannot resolve `./verdict`.

- [ ] **Step 3: Write the implementation**

```ts
// src/features/discover/verdict.ts
import type { FabricModel } from '../connect/FabricHero';

/** Phase-1 verdict for Discover: the estate in one sentence pair. */
export function discoverVerdict(model: FabricModel): string {
  const total = model.regions.length;
  if (!total) return 'No estate mapped yet. Connect a cloud to begin.';
  const clouds = new Set(model.regions.map(r => r.cloudId)).size;
  const attached = model.regions.filter(r => r.path === 'private').length;
  const pub = total - attached;
  return `Your estate spans ${total} regions across ${clouds} cloud${clouds === 1 ? '' : 's'}. ` +
    `${attached} ${attached === 1 ? 'is' : 'are'} on the AT&T fabric; ` +
    `${pub} still ride${pub === 1 ? 's' : ''} the public internet.`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/discover/verdict.test.ts`
Expected: PASS.

- [ ] **Step 5: Render it on DiscoverPage**

In `src/features/discover/DiscoverPage.tsx`, add imports:

```tsx
import { useCloudControl } from '../../engine/react/useCloudControl';
import type { FabricModel } from '../connect/FabricHero';
import { VerdictLine } from '../_shared/VerdictLine';
import { discoverVerdict } from './verdict';
```

Inside `DiscoverPage()`, before the return: `const model = useCloudControl(cc => cc.fabricModel()) as FabricModel;`
Then wrap the verdict above the existing flex row:

```tsx
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-8 space-y-4">
      <VerdictLine>{discoverVerdict(model)}</VerdictLine>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
```

(The outer div gains `space-y-4`; everything else in the file is unchanged.)

Run: `npx vitest run src/features/discover/DiscoverPage.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/discover
git commit -m "feat(discover): the screen opens with its verdict - the estate in one sentence"
```

---

### Task 5: Vocabulary guard suite

**Files:**
- Create: `src/__tests__/vocabulary.test.ts`
- Modify (gloss fixes): `src/features/discover/ChainDrawer.tsx:154`, `src/features/connect/RegionPanel.tsx:82`, `src/features/connect/DeployManagedVpcWizard.tsx:277`, `src/features/connect/managedVpcWizardModel.ts:42-43`

**Interfaces:**
- Consumes: nothing from other tasks. Mirrors the scan pattern of `src/__tests__/rebrand.test.ts` (git ls-files + readFileSync).
- Produces: a standing guard; future spine copy that uses a bare acronym or a bare "Cost" label fails CI.

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/vocabulary.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

/** Phase-1 vocabulary rules for the demo spine (see
 *  docs/superpowers/specs/2026-08-07-conversational-cloud-connect-design.md).
 *  Scan style mirrors rebrand.test.ts: tracked files, whole-file regex. */

const SPINE_DIRS = [
  'src/features/discover/',
  'src/features/connect/',
  'src/features/observe/',
  'src/features/_shared/',
];

// Comment-or-code-only acronym use, no rendered copy — glossing a code
// comment would be noise. Display copy in these areas renders elsewhere
// (e.g. attachmentModel's ASN values render in ChainDrawer, which IS scanned).
const excluded = [
  'src/features/discover/attachmentModel.ts',
  'src/features/connect/attachCatalog.ts',
];

const spineFiles = () =>
  execSync('git ls-files', { encoding: 'utf8' })
    .split('\n')
    .filter(f => SPINE_DIRS.some(d => f.startsWith(d)))
    .filter(f => /\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f))
    .filter(f => !excluded.some(e => f === e));

describe('spine vocabulary', () => {
  it('every acronym on the spine is glossed at least once per file', () => {
    const ACRONYMS = ['SDCI', 'EVC', 'LMCC', 'VRF', 'BGP', 'MPLS', 'ASN'];
    const offenders: string[] = [];
    for (const f of spineFiles()) {
      const src = readFileSync(f, 'utf8');
      for (const a of ACRONYMS) {
        const used = new RegExp(`\\b${a}\\b`).test(src);
        // glossed = "BGP (route exchange)" or "... (BGP)" somewhere in the file
        const glossed = new RegExp(`${a}\\s*\\(|\\(${a}\\b`).test(src);
        if (used && !glossed) offenders.push(`${f}: ${a}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('no bare "Cost" display label on the spine - savings-first framing', () => {
    const costLabel = />\s*Cost\s*<|label:\s*['"]Cost['"]/;
    const offenders = spineFiles().filter(f => costLabel.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/vocabulary.test.ts`
Expected: FAIL. The acronym rule lists exactly these offenders: `ChainDrawer.tsx: BGP`, `RegionPanel.tsx: BGP`, `DeployManagedVpcWizard.tsx: BGP`, `managedVpcWizardModel.ts: BGP`. (The Cost rule passes today.) If the list differs, fix whatever it actually names using the same gloss pattern below.

- [ ] **Step 3: Gloss the four offenders**

- `src/features/discover/ChainDrawer.tsx:154`: change `` <div>{`BGP ${chain.circuit.bgp.customerAsn} ↔ ${chain.circuit.bgp.providerAsn}`}</div> `` to `` <div>{`Routes exchanged (BGP) ${chain.circuit.bgp.customerAsn} ↔ ${chain.circuit.bgp.providerAsn}`}</div> ``
- `src/features/connect/RegionPanel.tsx:82`: change `both BGP sessions established` to `routes exchanged both ways (BGP)`
- `src/features/connect/DeployManagedVpcWizard.tsx:277`: change `BGP sessions` to `Route exchange (BGP)`
- `src/features/connect/managedVpcWizardModel.ts:42-43`: in both template strings change `private peering + BGP to AT&T` / `private VIF + BGP to AT&T` to `private peering + route exchange (BGP) to AT&T` / `private VIF + route exchange (BGP) to AT&T`

- [ ] **Step 4: Run the suite and every touched feature's tests**

Run: `npx vitest run src/__tests__/vocabulary.test.ts src/__tests__/rebrand.test.ts src/features/connect src/features/discover`
Expected: PASS. If a copy-asserting test fails (e.g. `managedVpcWizardModel.test.ts` matching the old sentence), update its expected string to the new glossed copy - the test is asserting copy, and the copy legitimately changed.

- [ ] **Step 5: Commit**

```bash
git add src/__tests__/vocabulary.test.ts src/features/connect src/features/discover
git commit -m "feat(spine): vocabulary guard - acronyms glossed, savings-first labels enforced by test"
```

---

### Task 6: Full-suite verification and visual check

**Files:**
- None created. Verification only.

**Interfaces:**
- Consumes: everything above.
- Produces: evidence the spine renders its verdicts in a real browser.

- [ ] **Step 1: Full unit suite**

Run: `npx vitest run`
Expected: PASS. Any failure traces to a copy assertion updated per Task 5 Step 4's rule, or is a real regression to fix before proceeding.

- [ ] **Step 2: Dev-server walkthrough**

Start the dev server (`.claude/launch.json` config via the preview tools - never Bash). Visit `/discover`, `/naas/connect`, `/naas/observe`. Confirm each page opens with its verdict line above the flow rail, sentences read correctly against live engine data, and nothing overlaps. Screenshot each page as proof.

- [ ] **Step 3: Commit any straggler fixes**

```bash
git add -A src
git commit -m "fix(spine): verdict rendering fixes from browser verification"
```

(Skip if the walkthrough was clean.)
