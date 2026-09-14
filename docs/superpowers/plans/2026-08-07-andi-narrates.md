# ANDI Narrates (Phase 4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ANDI maps utterances to spine navigation (speaking each screen's verdict sentence) and to the provision wizard (pre-filled from the utterance), per docs/superpowers/specs/2026-08-07-andi-narrates-design.md.

**Architecture:** One pure module `src/features/andi/andiSpine.ts` exporting `spineAnswer(cc, query): AndiAnswer | null`, slotted into `andiAnswer` (andiBrain.ts) after typed intents (step 1) and before AI answers (step 2). ConnectPage gains `?provision=<regionId>&dual=<0|1>` param handling; ProvisionWizard gains an optional `initialResilient` prop.

**Tech Stack:** React 18 + TypeScript, existing engine (`CC`), verdict selectors from phases 1-2, Vitest, Playwright.

## Global Constraints

- Pure and grounded: `andiSpine` derives every sentence from the engine via the existing verdict selectors — `discoverVerdict` (src/features/discover/verdict.ts), `connectVerdict` (src/features/connect/verdict.ts), `buildVerdict` (exported from src/features/observe/networkBinding.ts). No hardcoded copies of verdict sentences anywhere.
- ANDI drafts, the human commits: navigation and wizard-opening are `kind: 'navigate'` actions the user clicks; nothing runs automatically.
- New copy: no em dashes, no unexpanded acronyms, savings-first framing (vocabulary guard covers discover/connect/observe; write andi copy to the same rules).
- Existing contracts survive: `parseIntent` typed intents still win (spine matching runs AFTER them); all existing andi/brain/ConnectPage/ProvisionWizard tests stay green.
- All test commands `npx vitest run <path>`; e2e `npx playwright test e2e/andi-narrates.spec.ts` (port 5199 free; if an unknown process holds it, report BLOCKED rather than killing it).
- Commits end with trailer: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

---

### Task 1: andiSpine — navigation utterances answered in verdicts

**Files:**
- Create: `src/features/andi/andiSpine.ts`
- Test: `src/features/andi/andiSpine.test.ts`
- Modify: `src/features/andi/andiBrain.ts` (insert step between typed intents and AI answers)

**Interfaces:**
- Consumes: `AndiAnswer`/`AndiAction` types from `./andiBrain` (import type only, no cycle: andiBrain imports the FUNCTION from andiSpine, andiSpine imports only TYPES — if TypeScript complains about the cycle, move the two interfaces into a new `src/features/andi/andiTypes.ts` re-exported from andiBrain, and say so in the report). `discoverVerdict`, `connectVerdict`, `buildVerdict`, `FabricModel`, `CloudControl`.
- Produces: `export function spineAnswer(cc: CloudControl, query: string): AndiAnswer | null` — null when the utterance is not a spine phrase (so andiAnswer falls through unchanged).

- [ ] **Step 1: Write the failing test**

```ts
// src/features/andi/andiSpine.test.ts
import { describe, it, expect } from 'vitest';
import { CC } from '../../engine';
import { spineAnswer } from './andiSpine';
import { discoverVerdict } from '../discover/verdict';
import { connectVerdict } from '../connect/verdict';
import { buildVerdict } from '../observe/networkBinding';
import type { FabricModel } from '../connect/FabricHero';

const model = () => CC.fabricModel() as FabricModel;
const nav = (a: ReturnType<typeof spineAnswer>) => a!.actions!.find(x => x.kind === 'navigate')!.to;

describe('spineAnswer navigation', () => {
  it('estate phrases speak the Discover verdict and offer /discover', () => {
    for (const q of ['show me the estate', 'take me to discover', 'what do I have']) {
      const a = spineAnswer(CC, q);
      expect(a!.text).toBe(discoverVerdict(model()));
      expect(nav(a)).toBe('/discover');
    }
  });
  it('fabric phrases speak the Connect verdict and offer /naas/connect', () => {
    for (const q of ['show my connections', 'show me the fabric']) {
      const a = spineAnswer(CC, q);
      expect(a!.text).toBe(connectVerdict(model()));
      expect(nav(a)).toBe('/naas/connect');
    }
  });
  it('traffic phrases speak the Observe verdict and offer /naas/observe', () => {
    for (const q of ['how is my traffic', 'show observability']) {
      const a = spineAnswer(CC, q);
      expect(a!.text).toBe(buildVerdict(CC));
      expect(nav(a)).toBe('/naas/observe');
    }
  });
  it('savings phrases speak the Observe verdict and offer /naas/cost', () => {
    const a = spineAnswer(CC, 'what am I saving');
    expect(a!.text).toBe(buildVerdict(CC));
    expect(nav(a)).toBe('/naas/cost');
  });
  it('non-spine phrases return null so the brain falls through', () => {
    expect(spineAnswer(CC, 'cap shared-services 1m')).toBeNull();
    expect(spineAnswer(CC, 'what is my p95 latency')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/andi/andiSpine.test.ts`
Expected: FAIL - cannot resolve `./andiSpine`.

- [ ] **Step 3: Implement**

```ts
// src/features/andi/andiSpine.ts
import type { CloudControl } from '../../engine/types';
import type { AndiAnswer } from './andiBrain';
import type { FabricModel } from '../connect/FabricHero';
import { discoverVerdict } from '../discover/verdict';
import { connectVerdict } from '../connect/verdict';
import { buildVerdict } from '../observe/networkBinding';

/** Spine navigation, spoken in verdicts. Pure matcher: an utterance either
 *  is a spine phrase (answer = that screen's verdict + one navigate action)
 *  or it is not (null - the brain falls through to its other steps).
 *  Andi drafts; the human clicks. */
const ROUTES: { match: RegExp; to: string; label: string; verdict: (cc: CloudControl) => string }[] = [
  {
    match: /\b(estate|discover|inventory|what do i have)\b/i,
    to: '/discover',
    label: 'Open Discover',
    verdict: cc => discoverVerdict(cc.fabricModel() as FabricModel),
  },
  {
    match: /\b(connections?|fabric|attach(ed|ments)?)\b/i,
    to: '/naas/connect',
    label: 'Open Connect',
    verdict: cc => connectVerdict(cc.fabricModel() as FabricModel),
  },
  {
    match: /\b(traffic|observe|observability|flows?)\b/i,
    to: '/naas/observe',
    label: 'Open Observe',
    verdict: cc => buildVerdict(cc),
  },
  {
    match: /\b(saving|savings|spend|cost)\b/i,
    to: '/naas/cost',
    label: 'See the savings',
    verdict: cc => buildVerdict(cc),
  },
];

/** Only phrases that read as "take me somewhere / show me" qualify - a bare
 *  keyword inside an action or metric question must fall through. */
const NAV_SHAPE = /\b(show|take me|open|go to|where|how('s| is| are)|what (do i have|am i saving))\b/i;

export function spineAnswer(cc: CloudControl, query: string): AndiAnswer | null {
  const q = query.trim();
  if (!NAV_SHAPE.test(q) && !/^\s*(discover|connect|observe|cost)\s*$/i.test(q)) return null;
  const route = ROUTES.find(r => r.match.test(q));
  if (!route) return null;
  return {
    text: route.verdict(cc),
    actions: [{ label: route.label, kind: 'navigate', to: route.to }],
  };
}
```

Wire into `andiAnswer` in `andiBrain.ts`, directly after the typed-intents block (the `if (intents.length > 0) { ... }` return) and before the `aiAnswer` step:

```ts
  // 1.5 — spine navigation: an utterance that asks to SEE a spine screen is
  // answered with that screen's verdict and one navigate action.
  const spine = spineAnswer(cc, q);
  if (spine) return spine;
```

with `import { spineAnswer } from './andiSpine';` at the top.

- [ ] **Step 4: Run the andi suites**

Run: `npx vitest run src/features/andi`
Expected: PASS - new tests green, all pre-existing andiBrain/intents/panel tests untouched and green. If a pre-existing brain test asserts the fallback for a phrase the spine now catches (check `andiBrain.test.ts` for utterances containing spine keywords), the spine matcher is too greedy: tighten NAV_SHAPE rather than editing the old test, and explain in the report.

- [ ] **Step 5: Commit**

```bash
git add src/features/andi
git commit -m "feat(andi): spine navigation spoken in verdicts - show me becomes the screen's own sentence"
```

---

### Task 2: "connect <region>" — ANDI pre-fills the drawn wizard

**Files:**
- Modify: `src/features/andi/andiSpine.ts` (region matcher, ordered BEFORE the ROUTES check)
- Modify: `src/features/connect/ConnectPage.tsx` (`?provision=<regionId>&dual=<0|1>` opens the wizard)
- Modify: `src/features/connect/ProvisionWizard.tsx` (optional `initialResilient?: boolean` prop, default false, seeds the `resilient` state)
- Test: `src/features/andi/andiSpine.test.ts` (append), `src/features/connect/ConnectPage.test.tsx` (append)

**Interfaces:**
- Consumes: `FabricModel.regions` (`regionId`, `name`, `cloudName`, `path`).
- Produces: connect-utterance answers with `kind: 'navigate'`, `to: '/naas/connect?provision=<regionId>&dual=<0|1>'`.

- [ ] **Step 1: Write the failing tests**

Append to `src/features/andi/andiSpine.test.ts`:

```ts
describe('spineAnswer wizard answers', () => {
  it('connect <public region> offers the pre-filled wizard, dual when asked', () => {
    const a = spineAnswer(CC, 'connect us-west-2 with dual paths');
    expect(nav(a)).toBe('/naas/connect?provision=usw2&dual=1');
    expect(a!.text).toMatch(/us-west-2/);
    const b = spineAnswer(CC, 'connect eu-west-1');
    expect(nav(b)).toBe('/naas/connect?provision=euw1&dual=0');
  });
  it('connect <attached region> answers with the connect verdict instead of a wizard', () => {
    const attached = model().regions.find(r => r.path === 'private')!;
    const a = spineAnswer(CC, `connect ${attached.name}`);
    expect(a!.text).toBe(connectVerdict(model()));
    expect(a!.actions!.every(x => !/provision=/.test(x.to ?? ''))).toBe(true);
  });
  it('connect <unknown region> answers honestly with no action', () => {
    const a = spineAnswer(CC, 'connect atlantis-east-1');
    expect(a!.text).toMatch(/public/i);
    expect(a!.actions ?? []).toHaveLength(0);
  });
});
```

Append to `src/features/connect/ConnectPage.test.tsx`, reusing its existing render arrangement but with the route set to `/naas/connect?provision=usw2&dual=1` (MemoryRouter initialEntries or the file's equivalent):

```tsx
  it('?provision opens the wizard for that region with Dual preselected', () => {
    // render with initial route '/naas/connect?provision=usw2&dual=1' per this file's router setup
    expect(screen.getByRole('dialog', { name: /Provision .* us-west-2/i })).toBeInTheDocument();
    // walk to the resiliency step and confirm Dual is the pressed option
    fireEvent.click(screen.getByRole('button', { name: /^Next$/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Next$/ }));
    expect(screen.getByRole('button', { name: /Dual · resilient/ })).toHaveAttribute('aria-pressed', 'true');
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/andi/andiSpine.test.ts src/features/connect/ConnectPage.test.tsx`
Expected: FAIL on the new cases.

- [ ] **Step 3: Implement**

In `andiSpine.ts`, add before the NAV_SHAPE/ROUTES logic in `spineAnswer`:

```ts
  // "connect <region>" - resolve against the estate; ANDI pre-fills the
  // drawn wizard, the human walks and confirms it.
  const connectMatch = q.match(/^\s*(?:connect|attach|provision)\s+(.+?)(\s+with\s+dual(?:\s+paths?)?)?\s*$/i);
  if (connectMatch) {
    const model = cc.fabricModel() as FabricModel;
    const namePart = connectMatch[1].trim().toLowerCase();
    const region = model.regions.find(
      r => r.regionId.toLowerCase() === namePart || r.name.toLowerCase() === namePart,
    );
    if (!region) {
      const publics = model.regions.filter(r => r.path === 'public').map(r => r.name).join(', ');
      return { text: `No region called "${connectMatch[1].trim()}" in the estate. Still on the public internet: ${publics}.` };
    }
    if (region.path === 'private') {
      return { text: connectVerdict(model), actions: [{ label: 'Open Connect', kind: 'navigate', to: '/naas/connect' }] };
    }
    const dual = connectMatch[2] ? 1 : 0;
    return {
      text: `${region.cloudName} ${region.name} rides the public internet today. I drafted the attach - walk the wizard and confirm it.`,
      actions: [{ label: `Provision ${region.name}${dual ? ' with dual paths' : ''}`, kind: 'navigate', to: `/naas/connect?provision=${region.regionId}&dual=${dual}` }],
    };
  }
```

In `ProvisionWizard.tsx`: add `initialResilient?: boolean` to `ProvisionWizardProps` (default `false`), change `const [resilient, setResilient] = useState(false);` to `useState(initialResilient)`.

In `ConnectPage.tsx`: extend the existing `URLSearchParams` block (line ~50):

```tsx
  const params = new URLSearchParams(search);
  const fromDiscover = params.get('from') === 'discover';
  const provisionParam = params.get('provision');
  const provisionDual = params.get('dual') === '1';
```

and add a mount effect that opens the wizard when the param names a real, public region:

```tsx
  useEffect(() => {
    if (!provisionParam) return;
    const r = model.regions.find(x => x.regionId === provisionParam);
    if (r && r.path === 'public') {
      setSelected({ kind: 'region', id: r.regionId });
      setWizardRegionId(r.regionId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provisionParam]);
```

Pass `initialResilient={provisionDual}` where `<ProvisionWizard` renders.

- [ ] **Step 4: Run the suites**

Run: `npx vitest run src/features/andi src/features/connect src/__tests__/vocabulary.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/andi src/features/connect
git commit -m "feat(andi): connect us-west-2 - ANDI pre-fills the drawn wizard, the human confirms"
```

---

### Task 3: e2e — ANDI to a confirmed connection

**Files:**
- Create: `e2e/andi-narrates.spec.ts`

**Interfaces:**
- Consumes: the andi panel (opened by the top-bar "Ask Andi" button — see `e2e/andi.spec.ts` for the exact open/ask idiom and input selectors; follow it verbatim), the wizard testids, `seedAuth`.

- [ ] **Step 1: Write the spec**

```ts
// e2e/andi-narrates.spec.ts
import { test, expect } from '@playwright/test';
import { seedAuth } from '../tests/e2e/helpers';

test('ANDI narrates: ask to connect a region, walk the drawn wizard, the fabric flips', async ({ page }) => {
  await seedAuth(page);
  await page.goto('/#/discover', { waitUntil: 'domcontentloaded' });

  // Open ANDI and ask (follow e2e/andi.spec.ts's open/ask idiom for these two steps).
  await page.getByRole('button', { name: /Ask Andi/i }).click();
  const panel = page.getByTestId('andi-panel');
  await expect(panel).toBeVisible();
  await panel.getByRole('textbox').fill('connect us-west-2 with dual paths');
  await panel.getByRole('textbox').press('Enter');

  // ANDI answers with a draft action; clicking it lands in the pre-filled wizard.
  await panel.getByRole('button', { name: /Provision us-west-2 with dual paths/i }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByTestId('wizard-canvas')).toBeVisible();

  // Walk it: the resiliency step already has Dual pressed.
  await dialog.getByRole('button', { name: /^Next$/i }).click();
  await dialog.getByRole('button', { name: /^Next$/i }).click();
  await expect(dialog.getByRole('button', { name: /Dual · resilient/ })).toHaveAttribute('aria-pressed', 'true');
  await dialog.getByRole('button', { name: /^Next$/i }).click();
  await dialog.getByTestId('provision-confirm').click();

  await expect(page.locator('[data-fabric-edge][data-region-id="usw2"]').first())
    .toHaveAttribute('data-path', 'private');
});
```

If the panel's real input idiom differs (check `e2e/andi.spec.ts` first), adapt the two marked steps to it and note the adaptation in the report; the wizard walk and final assertions are binding.

- [ ] **Step 2: Run it**

Run: `npx playwright test e2e/andi-narrates.spec.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add e2e/andi-narrates.spec.ts
git commit -m "test(e2e): ANDI narrates a connection into existence - utterance to private path"
```

---

### Task 4: Full-suite verification and visual check

**Files:** none; verification only.

- [ ] **Step 1:** `npx vitest run` — PASS expected.
- [ ] **Step 2:** Browser walkthrough (gate mode): open ANDI on /discover, ask "show me the estate" (verdict spoken + Open Discover), ask "what am I saving" (Observe verdict + See the savings), ask "connect us-west-2 with dual paths" and click through to the pre-filled drawn wizard. Screenshot the ANDI answer showing a verdict sentence and the wizard it opened.
- [ ] **Step 3:** Commit any straggler fixes (`fix(andi): ...`), skip if clean.
