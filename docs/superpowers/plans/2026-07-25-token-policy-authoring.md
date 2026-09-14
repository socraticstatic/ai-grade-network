# Token-Policy Authoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a person author and edit a token policy with a preview grounded in real engine figures, stop the Enforced pill claiming enforcement it does not have, and route every mutation on `/ai/govern` through the review tray.

**Architecture:** A pure `tokenPolicyPreview(cc, spec)` derivation answers what a proposed policy would do, from `tokenMeterList` + a `decisionLog` replay + `intentCapEnforced` + `agentList`. A `TokenPolicyBuilder` dialog mirrors the rebuilt `RuleBuilder` (role=dialog form, derived preview, staged submit, visible failure). Submit hands the spec to the tray through a read-once holder and navigates to `/discover?draft=policy-new`, where a human commits. The policy table gains a three-state pill and stages its Enforce and guardrail actions instead of mutating.

**Tech Stack:** React 18 + TypeScript, Tailwind (`fw-*` / `figma-*` tokens), Vitest + Testing Library, Playwright. Engine is `window.CC` (`src/engine`), read via `useCloudControl` / `useCloudControlLive`.

## Global Constraints

- **Never use em dashes** in user-visible copy. Use hyphens or rephrase.
- **"The machine stages, never commits."** (`src/features/discover/StackDeckPage.tsx`). Nothing on `/ai/govern` may call `setTokenPolicy` directly after this plan. Every mutation navigates to `/discover?draft=<token>`; a human commits from the tray.
- **Never invent a figure or a capability.** Every number comes from an engine getter. In particular: the engine's guardrail never fails anything, so no copy may imply a guardrail blocked, caught, or flagged a request.
- **Never restate a synthetic past as evidence.** `tokenSeries` derives its history from `budget * 0.55 * ramp * rng` and is rewritten whenever a budget changes; only the last point is real. Nothing in this plan renders that series.
- **Design tokens only:** cards `rounded-2xl border border-fw-secondary bg-fw-base`; `fw-wash` for recessive surfaces; text `fw-heading` / `fw-body` / `fw-bodyLight`; `fw-warn`, `fw-success`, `fw-ctaPrimary`, `fw-link`, `fw-active`. Values carry `tabular-nums`. No arbitrary hex.
- **Tests use the real seeded engine** (`import { CC } from '../../engine'`) — never mock `CC`. Any test mutating shared engine state must restore it (`while (CC.canUndo()) CC.undo()` is the established idiom) so test order cannot matter.
- **Do NOT modify** `src/components/control-center/` or `src/store/`.
- Only Tasks 1 and 2 may touch `src/engine/`. Every later task treats the engine as read-only.
- **Gate:** `npm run verify` (vitest + build + playwright) from `/Users/micahbos/Developer/cc-tokens`. Both suites are mandatory on every task that changes rendered behavior.

### Engine facts, verified — do not re-derive

- The budget gate needs **three** conditions (`state-console.ts`): `pol.enforced && CC.intentCapEnforced(tag) && meter.pct >= 100`.
- `intentCapEnforced(tag)` is true only when an enforce-mode `cap-token-spend` intent is declared for that tag.
- The scope gate is independent of `enforced`: `scope === 'no-external'` or `'self-hosted'` denies `modelId === 'gpt-class'`.
- `setTokenPolicy(tag, patch)` shallow-merges, validates nothing, auto-creates an unknown tag with `{scope:'external-allowed', budget:1000000, guardrail:false, enforced:false}`, and pushes **no undo entry**.
- `tokenMeterList()` returns `{tag, ready, governed, ungoverned, today, budget, pct}` for a **hardcoded three-tag set**. A group-scoped policy (e.g. `west-workloads`) can never appear there.
- `decisionLog()` is a 400-entry ring of `{ts, allowed, guarded, tag, modelId, tokens, ttftMs, path, reason}`.
- `{kind:'policy', tag, patch}` is already a fully supported `StagedMove` — validity-checked in `StackPanel`, labelled by `moveLabel`, stated by `stagedDeltas` as a policy note, applied by `commitMoves`.
- `?draft=policy-<tag>` already exists and hardcodes `{enforced:true}` for the `/ai/home` widget. **Leave it untouched**; this plan adds `policy-new`.

---

## File Structure

**Create**
- `src/features/ai-fabric/tokenPolicyPreview.ts` — the derivation. No React.
- `src/features/ai-fabric/tokenPolicyPreview.test.ts`
- `src/features/ai-fabric/TokenPolicyBuilder.tsx` — the authoring dialog.
- `src/features/ai-fabric/TokenPolicyBuilder.test.tsx`
- `e2e/token-policy-authoring.spec.ts`

**Modify**
- `src/engine/state-console.ts` — extract `CC.scopeDenies`; `promptTrace` calls it (Task 1 only).
- `src/engine/state-intents.ts` — `cap-token-spend` reads `softPct` (Task 2 only).
- `src/features/discover/stackFigures.ts` — the read-once policy-spec holder.
- `src/features/discover/StackPanel.tsx` — the `policy-new` token.
- `src/features/ai-fabric/TokenPolicies.tsx` — three-state pill, staged actions, builder wiring.

---

### Task 1: One scope predicate, shared by the gate and the preview

The preview must decide "would this scope deny that request" **exactly** as the engine does. Today the rule is inline in `promptTrace` twice. Extract it so there is one implementation and drift is impossible.

**Files:**
- Modify: `src/engine/state-console.ts`
- Test: `src/engine/state-console.scopeDenies.test.ts`

**Interfaces:**
- Produces: `CC.scopeDenies(scope: string, modelId: string): string | null` — returns the engine's own denial reason fragment when that scope denies that model, else `null`.

- [ ] **Step 1: Write the failing test**

```ts
// src/engine/state-console.scopeDenies.test.ts
import { describe, test, expect } from 'vitest';
import { CC } from '../engine';

describe('CC.scopeDenies', () => {
  test('names the two scopes that deny an external model', () => {
    expect(CC.scopeDenies('no-external', 'gpt-class')).toMatch(/no external models/i);
    expect(CC.scopeDenies('self-hosted', 'gpt-class')).toMatch(/self-hosted/i);
  });

  test('the descriptive scopes deny nothing', () => {
    expect(CC.scopeDenies('external-allowed', 'gpt-class')).toBeNull();
    expect(CC.scopeDenies('private-only', 'gpt-class')).toBeNull();
  });

  test('a self-hosted model is never denied by scope', () => {
    for (const s of ['no-external', 'self-hosted', 'external-allowed', 'private-only']) {
      expect(CC.scopeDenies(s, 'helion-70b')).toBeNull();
    }
  });

  /* The contract that makes the preview honest: whatever this predicate says,
     promptTrace must actually do. Run the real trace and compare. */
  test('agrees with what promptTrace really decides', () => {
    const before = CC.tokenPolicy('shared-services');
    const prevScope = before ? before.scope : 'external-allowed';
    try {
      CC.setTokenPolicy('shared-services', { scope: 'no-external' });
      const predicted = CC.scopeDenies('no-external', 'gpt-class');
      const trace = CC.promptTrace('shared-services', 'gpt-class', 'probe') as { blocked: boolean };
      expect(!!predicted).toBe(trace.blocked);
    } finally {
      CC.setTokenPolicy('shared-services', { scope: prevScope });
    }
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npx vitest run src/engine/state-console.scopeDenies.test.ts`
Expected: FAIL — `CC.scopeDenies is not a function`.

- [ ] **Step 3: Implement**

In `src/engine/state-console.ts`, above `promptTrace`, add:

```js
/* THE scope predicate. promptTrace's gate and any preview that asks "would
   this scope deny that request" must be the same rule, or a preview can
   promise something the gate does not do. Returns the engine's own reason
   fragment, or null when the scope permits. */
CC.scopeDenies=function(scope,modelId){
  if(modelId!=='gpt-class')return null;
  if(scope==='no-external')return 'no external models';
  if(scope==='self-hosted')return 'model allowlist is self-hosted only';
  return null;
};
```

Then replace the two inline branches inside `promptTrace` so they call it, preserving the exact reason strings the decision log records today:

```js
  if(pol){
    const denial=CC.scopeDenies(pol.scope,modelId);
    if(denial){
      const why=`${tag}: ${denial} — request DENIED`;
      recordDecision(false,false,{tag,modelId,tokens:0,ttftMs:0,path:rpath,reason:why});
      return {blocked:true,steps:[...steps,{hop:'Token policy',detail:why,ok:false}],tokens:0};
    }
    steps.push({hop:'Token policy',detail:`${pol.scope}${pol.enforced?' · enforced':' · draft'} — allowed`,ok:true});
  } else steps.push({hop:'Token policy',detail:'no policy for this tag — default allow',ok:true});
```

- [ ] **Step 4: Run it, verify it passes**

Run: `npx vitest run src/engine/state-console.scopeDenies.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Prove the refactor changed no behavior**

Run the full unit suite: `npx vitest run`
Expected: all pass. The reason strings are unchanged, so any test asserting a denial message must still pass untouched. **If any expected string or figure changes, STOP and report it** rather than editing the expectation.

- [ ] **Step 6: Commit**

```bash
git add src/engine/state-console.ts src/engine/state-console.scopeDenies.test.ts
git commit -m "refactor(engine): one scope predicate, shared by the gate and any preview"
```

---

### Task 2: The soft threshold becomes a policy field

**Files:**
- Modify: `src/engine/state-intents.ts`
- Test: `src/engine/state-intents.softPct.test.ts`

**Interfaces:**
- Produces: `cap-token-spend` drifts at `policy.softPct` when set, still at 80 when not.

- [ ] **Step 1: Write the failing test**

```ts
// src/engine/state-intents.softPct.test.ts
import { describe, test, expect, afterEach } from 'vitest';
import { CC } from '../engine';

afterEach(() => { while (CC.canUndo()) CC.undo(); });

/** Drive a tag's meter to a known percentage by setting its budget. */
function pctFor(tag: string): number {
  const m = (CC.tokenMeterList() as { tag: string; pct: number }[]).find(x => x.tag === tag)!;
  return m.pct;
}

describe('cap-token-spend soft threshold', () => {
  test('a policy without softPct still drifts at 80', () => {
    const tag = (CC.tokenMeterList() as { tag: string }[])[0].tag;
    const meter = (CC.tokenMeterList() as { tag: string; today: number }[]).find(m => m.tag === tag)!;
    // Budget chosen so today/budget lands between 80% and 99%.
    CC.setTokenPolicy(tag, { budget: Math.ceil(meter.today / 0.85) });
    expect(pctFor(tag)).toBeGreaterThanOrEqual(80);
    expect(pctFor(tag)).toBeLessThan(100);
    const entry = CC.intentCatalog().find(c => c.key === 'cap-token-spend')!;
    const scope = entry.scopes().find((s: { id: string }) => s.id === tag)!;
    const declared = CC.declareIntent('cap-token-spend', scope, 'watch')!;
    const reading = CC.intentList().find(i => i.id === declared.id)!.reading;
    expect(reading.status).toBe('drifting');
    CC.removeIntent(declared.id);
  });

  test('softPct moves the drift line', () => {
    const tag = (CC.tokenMeterList() as { tag: string }[])[0].tag;
    const meter = (CC.tokenMeterList() as { tag: string; today: number }[]).find(m => m.tag === tag)!;
    // Land around 50%: below the default 80, at or above a softPct of 40.
    CC.setTokenPolicy(tag, { budget: Math.ceil(meter.today / 0.5), softPct: 40 });
    expect(pctFor(tag)).toBeLessThan(80);
    const entry = CC.intentCatalog().find(c => c.key === 'cap-token-spend')!;
    const scope = entry.scopes().find((s: { id: string }) => s.id === tag)!;
    const declared = CC.declareIntent('cap-token-spend', scope, 'watch')!;
    expect(CC.intentList().find(i => i.id === declared.id)!.reading.status).toBe('drifting');
    CC.removeIntent(declared.id);
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npx vitest run src/engine/state-intents.softPct.test.ts`
Expected: the second test FAILS with `'aligned'` — the hardcoded 80 ignores `softPct`.

- [ ] **Step 3: Implement**

In `src/engine/state-intents.ts`, inside `cap-token-spend`'s `evaluate`, replace the hardcoded threshold:

```js
          : m.pct>=80
```

with a read of the policy's own soft threshold, defaulting to the value in force today:

```js
          /* The soft threshold is the policy's to set; 80 stays the default
             so a policy that names none reads exactly as it did before. */
          : m.pct>=((CC.tokenPolicy(scope.id)||{}).softPct||80)
```

- [ ] **Step 4: Run it, verify it passes**

Run: `npx vitest run src/engine/state-intents.softPct.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Full suite**

Run: `npx vitest run`
Expected: all pass. **If any figure changes, STOP and report.**

- [ ] **Step 6: Commit**

```bash
git add src/engine/state-intents.ts src/engine/state-intents.softPct.test.ts
git commit -m "feat(engine): a token policy names its own alert threshold"
```

---

### Task 3: `tokenPolicyPreview(cc, spec)`

**Files:**
- Create: `src/features/ai-fabric/tokenPolicyPreview.ts`
- Test: `src/features/ai-fabric/tokenPolicyPreview.test.ts`

**Interfaces:**
- Consumes: `CC.scopeDenies` (Task 1), `tokenMeterList`, `decisionLog`, `agentList`, `modelRoutes`, `intentCapEnforced`, `groupList`.
- Produces: `TokenPolicySpec`, `TokenPolicyPreview`, `tokenPolicyPreview(cc, spec)` exactly as typed in the design spec.

- [ ] **Step 1: Write the failing test**

```ts
// src/features/ai-fabric/tokenPolicyPreview.test.ts
import { describe, test, expect, afterEach } from 'vitest';
import { tokenPolicyPreview, type TokenPolicySpec } from './tokenPolicyPreview';
import { CC } from '../../engine';

afterEach(() => { while (CC.canUndo()) CC.undo(); });

const meteredTag = () => (CC.tokenMeterList() as { tag: string }[])[0].tag;

const specFor = (tag: string, over: Partial<TokenPolicySpec> = {}): TokenPolicySpec => ({
  tag, scope: 'external-allowed', budget: 1_000_000, softPct: 80,
  guardrail: false, enforced: false, ...over,
});

describe('tokenPolicyPreview', () => {
  test('states the live meter and where the proposed budget would put it', () => {
    const tag = meteredTag();
    const m = (CC.tokenMeterList() as { tag: string; today: number; pct: number; budget: number }[])
      .find(x => x.tag === tag)!;
    const half = Math.max(1, Math.floor(m.today / 2));
    const p = tokenPolicyPreview(CC, specFor(tag, { budget: half }));
    expect(p.meter).not.toBeNull();
    expect(p.meter!.today).toBe(m.today);
    // today over half of today is ~200%.
    expect(p.proposedPct).toBe(Math.round((m.today / half) * 100));
    expect(p.unmetered).toBe(false);
  });

  test('replays the decision log against the proposed scope, agreeing with the engine', () => {
    const tag = meteredTag();
    const log = CC.decisionLog() as { tag: string | null; modelId: string | null }[];
    const expected = log.filter(d => d.tag === tag && !!CC.scopeDenies('self-hosted', d.modelId ?? '')).length;
    const p = tokenPolicyPreview(CC, specFor(tag, { scope: 'self-hosted' }));
    expect(p.wouldDeny.count).toBe(expected);
    expect(p.wouldDeny.total).toBe(log.filter(d => d.tag === tag).length);
  });

  test('a permissive scope denies nothing', () => {
    const p = tokenPolicyPreview(CC, specFor(meteredTag(), { scope: 'external-allowed' }));
    expect(p.wouldDeny.count).toBe(0);
  });

  test('names the agents the policy binds', () => {
    const agents = (CC.agentList() as { name: string; app: string }[]);
    const tag = agents[0].app;
    const p = tokenPolicyPreview(CC, specFor(tag));
    expect(p.boundAgents).toEqual(agents.filter(a => a.app === tag).map(a => a.name));
  });

  test('capIntentEnforced is false until an enforce-mode cap intent covers the tag', () => {
    const tag = meteredTag();
    expect(tokenPolicyPreview(CC, specFor(tag)).capIntentEnforced).toBe(false);
    const entry = CC.intentCatalog().find(c => c.key === 'cap-token-spend')!;
    const scope = entry.scopes().find((s: { id: string }) => s.id === tag)!;
    const declared = CC.declareIntent('cap-token-spend', scope, 'enforce')!;
    expect(tokenPolicyPreview(CC, specFor(tag)).capIntentEnforced).toBe(true);
    CC.removeIntent(declared.id);
  });

  test('a group-scoped identity is reported unmetered rather than shown at zero', () => {
    const p = tokenPolicyPreview(CC, specFor('west-workloads', { group: 'west-workloads' }));
    expect(p.unmetered).toBe(true);
    expect(p.meter).toBeNull();
    expect(p.proposedPct).toBeNull();
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npx vitest run src/features/ai-fabric/tokenPolicyPreview.test.ts`
Expected: FAIL — cannot find module `./tokenPolicyPreview`.

- [ ] **Step 3: Implement**

```ts
// src/features/ai-fabric/tokenPolicyPreview.ts
import type { CloudControl } from '../../engine/types';

/**
 * What a proposed token policy would do, answered from getters the engine
 * already computes. Nothing here invents a figure and nothing mutates.
 *
 * The denial replay calls CC.scopeDenies - the SAME predicate promptTrace's
 * gate calls - so a preview cannot promise something the gate would not do.
 * Reimplementing that rule here would be a lie waiting to happen.
 */

export interface TokenPolicySpec {
  tag: string;
  scope: string;
  budget: number;
  softPct: number;
  guardrail: boolean;
  enforced: boolean;
  group?: string;
}

export interface TokenPolicyPreview {
  meter: { today: number; budget: number; pct: number } | null;
  proposedPct: number | null;
  wouldDeny: { count: number; total: number; reasons: string[] };
  boundAgents: string[];
  routePath: string | null;
  capIntentEnforced: boolean;
  unmetered: boolean;
}

interface Meter { tag: string; today: number; budget: number; pct: number }
interface Decision { tag: string | null; modelId: string | null }
interface Agent { name: string; app: string }
interface Route { tag?: string; path?: string }

export function tokenPolicyPreview(cc: CloudControl, spec: TokenPolicySpec): TokenPolicyPreview {
  const meters = (cc.tokenMeterList?.() ?? []) as Meter[];
  const m = meters.find(x => x.tag === spec.tag) ?? null;

  // A group-scoped identity never meters: tokenMeterList iterates a fixed set.
  const unmetered = m === null;

  const log = (cc.decisionLog?.() ?? []) as Decision[];
  const mine = log.filter(d => d.tag === spec.tag);
  const denied = mine.filter(d => !!cc.scopeDenies(spec.scope, d.modelId ?? ''));
  const reasons = Array.from(new Set(
    denied.map(d => cc.scopeDenies(spec.scope, d.modelId ?? '') as string),
  ));

  const agents = (cc.agentList?.() ?? []) as Agent[];
  const routes = (cc.modelRoutes?.() ?? []) as Route[];
  const route = routes.find(r => r.tag === spec.tag) ?? null;

  return {
    meter: m ? { today: m.today, budget: m.budget, pct: m.pct } : null,
    proposedPct: m && spec.budget > 0 ? Math.round((m.today / spec.budget) * 100) : null,
    wouldDeny: { count: denied.length, total: mine.length, reasons },
    boundAgents: agents.filter(a => a.app === spec.tag).map(a => a.name),
    routePath: route && route.path ? route.path : null,
    capIntentEnforced: !!cc.intentCapEnforced?.(spec.tag),
    unmetered,
  };
}
```

- [ ] **Step 4: Run it, verify it passes**

Run: `npx vitest run src/features/ai-fabric/tokenPolicyPreview.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/ai-fabric/tokenPolicyPreview.*
git commit -m "feat(ai-fabric): a token policy can be previewed before it exists"
```

---

### Task 4: Staging a policy spec through the tray

**Files:**
- Modify: `src/features/discover/stackFigures.ts`, `src/features/discover/StackPanel.tsx`
- Test: `src/features/discover/StackPanel.policyNew.test.tsx`

**Interfaces:**
- Consumes: `TokenPolicySpec` (Task 3).
- Produces: `setPendingPolicySpec(spec)` / `takePendingPolicySpec()` in `stackFigures.ts`, and a `?draft=policy-new` branch in `StackPanel` that stages `{kind:'policy', tag, patch}`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/discover/StackPanel.policyNew.test.tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect, afterEach } from 'vitest';
import { StackPanel } from './StackPanel';
import { setPendingPolicySpec, takePendingPolicySpec } from './stackFigures';
import { CC } from '../../engine';

afterEach(() => { takePendingPolicySpec(); while (CC.canUndo()) CC.undo(); });

describe('?draft=policy-new', () => {
  test('stages the handed-over policy spec and names it', async () => {
    setPendingPolicySpec({
      tag: 'shared-services', scope: 'no-external', budget: 900000,
      softPct: 70, guardrail: true, enforced: false,
    });
    render(
      <MemoryRouter initialEntries={['/discover?draft=policy-new']}>
        <StackPanel />
      </MemoryRouter>,
    );
    expect(await screen.findByText(/shared-services/i)).toBeInTheDocument();
  });

  test('with nothing handed over it stages nothing and does not throw', () => {
    render(
      <MemoryRouter initialEntries={['/discover?draft=policy-new']}>
        <StackPanel />
      </MemoryRouter>,
    );
    expect(screen.queryByText(/Token policy · /i)).not.toBeInTheDocument();
  });

  test('the holder is read-once', () => {
    setPendingPolicySpec({
      tag: 'rd-helion', scope: 'self-hosted', budget: 1, softPct: 80,
      guardrail: false, enforced: false,
    });
    expect(takePendingPolicySpec()).not.toBeNull();
    expect(takePendingPolicySpec()).toBeNull();
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npx vitest run src/features/discover/StackPanel.policyNew.test.tsx`
Expected: FAIL — `setPendingPolicySpec` is not exported.

- [ ] **Step 3: Implement the holder**

In `src/features/discover/stackFigures.ts`, beside the existing `pendingRuleSpec` holder, add:

```ts
/* The same read-once handoff the rule builder uses, for a token policy spec:
   the builder sets it, StackPanel takes it, nothing persists, so a refresh
   cannot re-stage. */
let pendingPolicySpec: TokenPolicySpec | null = null;
export function setPendingPolicySpec(spec: TokenPolicySpec) { pendingPolicySpec = spec; }
export function takePendingPolicySpec(): TokenPolicySpec | null {
  const s = pendingPolicySpec; pendingPolicySpec = null; return s;
}
```

Import the type: `import type { TokenPolicySpec } from '../ai-fabric/tokenPolicyPreview';`

- [ ] **Step 4: Implement the token**

In `src/features/discover/StackPanel.tsx`, add a branch to the draft-token chain, **before** the existing `policy-` branch so `policy-new` is not swallowed by `startsWith('policy-')`:

```tsx
    } else if (param === 'policy-new') {
      /* ?draft=policy-new -> the token-policy builder's staged spec, handed
         over in memory rather than in the URL. Everything the builder can
         change rides one patch, so the tray states the whole policy. */
      const spec = takePendingPolicySpec();
      if (spec) {
        const { tag, ...patch } = spec;
        setStaged([{ kind: 'policy', tag, patch }]);
        setDesigning(true);
        setProposalNote(`Token policy · ${tag}`);
      }
```

Add `takePendingPolicySpec` to the existing `stackFigures` import.

- [ ] **Step 5: Run it, verify it passes**

Run: `npx vitest run src/features/discover/`
Expected: PASS, including the pre-existing `policy-<tag>` tests — confirm the widget's token still works.

- [ ] **Step 6: Commit**

```bash
git add src/features/discover/stackFigures.ts src/features/discover/StackPanel.tsx src/features/discover/StackPanel.policyNew.test.tsx
git commit -m "feat(discover): a whole token policy can ride the tray"
```

---

### Task 5: `TokenPolicyBuilder`

**Files:**
- Create: `src/features/ai-fabric/TokenPolicyBuilder.tsx`, `src/features/ai-fabric/TokenPolicyBuilder.test.tsx`

**Interfaces:**
- Consumes: `tokenPolicyPreview` (Task 3), `setPendingPolicySpec` (Task 4).
- Produces: `TokenPolicyBuilder({ open, onOpenChange, editTag })`. Root `data-testid="policy-builder"`; preview `data-testid="policy-preview"`; submit `data-testid="policy-stage"`.

**Read first:** `src/features/govern/RuleBuilder.tsx`. This component mirrors it — dialog semantics, derived preview, untouched guard, staged submit. Match its structure and its comment discipline rather than inventing a second style.

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/ai-fabric/TokenPolicyBuilder.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect, afterEach, vi } from 'vitest';
import { TokenPolicyBuilder } from './TokenPolicyBuilder';
import { takePendingPolicySpec } from '../discover/stackFigures';
import { CC } from '../../engine';

const navigate = vi.fn();
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual<typeof import('react-router-dom')>('react-router-dom')),
  useNavigate: () => navigate,
}));

afterEach(() => { navigate.mockClear(); takePendingPolicySpec(); while (CC.canUndo()) CC.undo(); });

const open = () => render(
  <MemoryRouter><TokenPolicyBuilder open onOpenChange={() => {}} /></MemoryRouter>,
);

describe('TokenPolicyBuilder', () => {
  test('is a dialog that focuses its first field', async () => {
    open();
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText(/identity/i)).toHaveFocus());
  });

  test('previews against the real engine and recomputes as fields change', async () => {
    open();
    const preview = await screen.findByTestId('policy-preview');
    const first = preview.textContent;
    fireEvent.change(screen.getByLabelText(/budget/i), { target: { value: '1' } });
    await waitFor(() => expect(screen.getByTestId('policy-preview').textContent).not.toBe(first));
  });

  test('an untouched form cannot be staged', async () => {
    open();
    await screen.findByRole('dialog');
    expect(screen.getByTestId('policy-stage')).toBeDisabled();
  });

  test('staging hands the spec over and navigates, and never mutates the engine', async () => {
    const before = JSON.stringify(CC.tokenPolicyList());
    open();
    await screen.findByRole('dialog');
    fireEvent.change(screen.getByLabelText(/budget/i), { target: { value: '750000' } });
    fireEvent.click(screen.getByTestId('policy-stage'));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/discover?draft=policy-new'));
    const staged = takePendingPolicySpec()!;
    expect(staged.budget).toBe(750000);
    expect(JSON.stringify(CC.tokenPolicyList())).toBe(before);
  });

  test('edit mode seeds from the existing policy and locks the identity', async () => {
    render(
      <MemoryRouter>
        <TokenPolicyBuilder open onOpenChange={() => {}} editTag="rd-helion" />
      </MemoryRouter>,
    );
    await screen.findByRole('dialog');
    const existing = CC.tokenPolicy('rd-helion') as { budget: number; scope: string };
    expect((screen.getByLabelText(/budget/i) as HTMLInputElement).value).toBe(String(existing.budget));
    expect(screen.getByLabelText(/identity/i)).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npx vitest run src/features/ai-fabric/TokenPolicyBuilder.test.tsx`
Expected: FAIL — cannot find module `./TokenPolicyBuilder`.

- [ ] **Step 3: Implement**

Build the component to satisfy the tests, following `RuleBuilder`'s structure exactly:

- `role="dialog"` with `aria-label`, **no `aria-modal`** (it is not a true modal; that lesson is already recorded in `RuleBuilder`).
- A real `<form onSubmit>` with the stage button as `type="submit"`, so Enter works.
- `useRef` + `useEffect` focusing the identity select on open; `keydown` Escape listener on `document` with cleanup.
- Fields: **Identity** (select over `Object.keys(CC.TAGS)` plus group ids from `groupList()`, disabled when `editTag` is set), **Scope** (the four seed values, each option labelled so the two that enforce are distinguishable from the two that are descriptive), **Budget** (number, labelled "tokens per day"), **Alert at** (number, percent, default 80), **Guardrail** (checkbox).
- In edit mode, seed every field from `CC.tokenPolicy(editTag)`.
- `untouched` guard comparing all fields to their initial values; the stage button is disabled while untouched.
- The preview is **derived every render**, never stored:
  ```tsx
  const preview = tokenPolicyPreview(cc, spec());
  ```
- Preview copy renders only the clauses whose data exists:
  - meter + proposed: `` `${tag} is at ${meter.pct}% of ${meter.budget.toLocaleString()} today. At ${budget.toLocaleString()} it would stand at ${proposedPct}%.` ``
  - unmetered: "This identity is not metered, so a budget here is a ceiling with no gauge."
  - replay with `total > 0`: `` `${count} of the last ${total} requests would be denied under this scope.` `` Name the deduped `reasons`.
  - replay with `total === 0`: "No requests for this identity in the window to replay."
  - agents: `` `Binds ${boundAgents.join(', ')}.` ``
  - always, when `!capIntentEnforced`: "Nothing is denied on budget until a cap-token-spend intent is enforce-mode for this identity."
- Submit: `setPendingPolicySpec(spec()); navigate('/discover?draft=policy-new');` It must never call `setTokenPolicy`.

- [ ] **Step 4: Run it, verify it passes**

Run: `npx vitest run src/features/ai-fabric/TokenPolicyBuilder.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/ai-fabric/TokenPolicyBuilder.*
git commit -m "feat(ai-fabric): author a token policy, with the preview derived from live state"
```

---

### Task 6: The pill stops lying, and the table stops mutating

**Files:**
- Modify: `src/features/ai-fabric/TokenPolicies.tsx`
- Test: `src/features/ai-fabric/TokenPolicies.status.test.tsx`

**Interfaces:**
- Consumes: `intentCapEnforced`, `TokenPolicyBuilder` (Task 5).
- Produces: a three-state pill (`Draft` / `Armed` / `Enforcing`) with `data-testid="policy-status"`; Enforce and the guardrail toggle become `<Link>`s that stage; a "New policy" trigger and a per-row "Edit" that open the builder.

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/ai-fabric/TokenPolicies.status.test.tsx
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect, afterEach } from 'vitest';
import { TokenPolicies } from './TokenPolicies';
import { CC } from '../../engine';

afterEach(() => { while (CC.canUndo()) CC.undo(); });

const show = () => render(<MemoryRouter><TokenPolicies /></MemoryRouter>);
const rowFor = (tag: string) => screen.getByText(tag).closest('tr')!;

describe('the token-policy status pill', () => {
  test('an unenforced policy reads Draft', () => {
    show();
    expect(within(rowFor('rd-helion')).getByTestId('policy-status')).toHaveTextContent(/draft/i);
  });

  test('enforced with no cap intent reads Armed, not Enforcing', () => {
    CC.setTokenPolicy('rd-helion', { enforced: true });
    expect(CC.intentCapEnforced('rd-helion')).toBe(false);
    show();
    expect(within(rowFor('rd-helion')).getByTestId('policy-status')).toHaveTextContent(/armed/i);
  });

  test('enforced with an enforce-mode cap intent reads Enforcing', () => {
    CC.setTokenPolicy('rd-helion', { enforced: true });
    const entry = CC.intentCatalog().find(c => c.key === 'cap-token-spend')!;
    const scope = entry.scopes().find((s: { id: string }) => s.id === 'rd-helion')!;
    const declared = CC.declareIntent('cap-token-spend', scope, 'enforce')!;
    show();
    expect(within(rowFor('rd-helion')).getByTestId('policy-status')).toHaveTextContent(/enforcing/i);
    CC.removeIntent(declared.id);
  });

  test('Enforce stages instead of mutating', () => {
    const before = JSON.stringify(CC.tokenPolicyList());
    show();
    const enforce = within(rowFor('rd-helion')).getByRole('link', { name: /enforce/i });
    expect(enforce.getAttribute('href')).toBe('/discover?draft=policy-rd-helion');
    expect(JSON.stringify(CC.tokenPolicyList())).toBe(before);
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npx vitest run src/features/ai-fabric/TokenPolicies.status.test.tsx`
Expected: FAIL — no `policy-status` testid; Enforce is a button that mutates.

- [ ] **Step 3: Implement**

In `TokenPolicies.tsx`:

- Extend the subscribing selector to carry `capEnforced: cc.intentCapEnforced(p.tag)` per row.
- Replace the two-state pill with:

```tsx
/* Three states, because the engine has three. The budget gate needs the
   policy enforced AND an enforce-mode cap-token-spend intent for this tag
   AND the meter at its ceiling, so "Enforced" alone was a badge claiming
   an enforcement the estate does not have. Armed names the missing piece.
   Note this describes the BUDGET gate: a no-external or self-hosted scope
   denies an external model whatever this pill says. */
const status = !p.enforced ? 'Draft' : p.capEnforced ? 'Enforcing' : 'Armed';
```

  rendered with `data-testid="policy-status"`, `fw-success` tone for Enforcing, `fw-warn` for Armed, neutral for Draft, and a `title` on Armed explaining that no cap intent covers this identity yet.
- Replace the Enforce `<button onClick={setTokenPolicy}>` with a `<Link to={`/discover?draft=policy-${p.tag}`}>` (the existing widget token — already staged, already Undo-covered).
- Replace the guardrail toggle button with a `<Link>` that opens the builder for that row (`Edit`), rather than a direct mutation. The guardrail becomes a builder field, so a one-click toggle that bypasses review would reintroduce the split.
- Add a "New policy" trigger in the card header and a per-row "Edit", both opening `TokenPolicyBuilder` with `editTag` set appropriately.

- [ ] **Step 4: Run it, verify it passes**

Run: `npx vitest run src/features/ai-fabric/`
Expected: PASS, including pre-existing `TokenPolicies` tests. Any pre-existing test asserting the two-state pill or a mutating toggle is asserting behavior this task intentionally changes — update it and say which in your report.

- [ ] **Step 5: Commit**

```bash
git add src/features/ai-fabric/TokenPolicies.tsx src/features/ai-fabric/TokenPolicies.status.test.tsx
git commit -m "fix(ai-fabric): the pill names what the estate actually enforces, and the table stages"
```

---

### Task 7: End-to-end proof, full gate, visual check

**Files:**
- Create: `e2e/token-policy-authoring.spec.ts`

- [ ] **Step 1: Write the e2e**

Read an existing spec in `e2e/` first (for example `e2e/rule-proposals.spec.ts`) and match its first-visit and modal-dismiss conventions. The tray's commit control is `data-testid="design-commit"`.

```ts
// e2e/token-policy-authoring.spec.ts
import { test, expect, type Page } from '@playwright/test';

async function firstVisit(page: Page, hash: string) {
  await page.addInitScript(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto(`/#${hash}`, { waitUntil: 'domcontentloaded' });
  const dismiss = page.getByRole('button', { name: /^(skip|skip tour|close|got it|maybe later|no thanks)$/i });
  while (await dismiss.first().isVisible().catch(() => false)) { await dismiss.first().click(); await page.waitForTimeout(150); }
  await page.keyboard.press('Escape').catch(() => {});
}

test('a person can author a token policy end to end', async ({ page }) => {
  await firstVisit(page, '/ai/govern');
  await page.getByRole('button', { name: /new policy/i }).click();
  await expect(page.getByTestId('policy-builder')).toBeVisible();
  await expect(page.getByTestId('policy-preview')).toBeVisible();

  await page.getByLabel(/budget/i).fill('750000');
  await page.getByTestId('policy-stage').click();

  await expect(page).toHaveURL(/#\/discover/);
  await expect(page.getByText(/Token policy · /i)).toBeVisible();
  await page.getByTestId('design-commit').click();

  await page.goto('/#/ai/govern', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('750,000')).toBeVisible();
});

test('an enforced policy with no cap intent reads Armed, not Enforcing', async ({ page }) => {
  await firstVisit(page, '/ai/govern');
  const row = page.locator('tr', { hasText: 'rd-helion' }).first();
  await row.getByRole('link', { name: /enforce/i }).click();
  await expect(page).toHaveURL(/#\/discover/);
  await page.getByTestId('design-commit').click();

  await page.goto('/#/ai/govern', { waitUntil: 'domcontentloaded' });
  const status = page.locator('tr', { hasText: 'rd-helion' }).first().getByTestId('policy-status');
  await expect(status).toHaveText(/armed/i);
});
```

If a selector is ambiguous, tighten the SELECTOR (scope it to the row or use an exact role query). Never weaken an assertion to make it pass.

- [ ] **Step 2: Run it twice**

Run: `npx playwright test e2e/token-policy-authoring.spec.ts`
Expected: PASS (2 tests), stable across two runs.

- [ ] **Step 3: Full gate**

Run: `npm run verify`
Expected: vitest, build, and playwright all pass. Report the totals. Fix failures at the source.

- [ ] **Step 4: Visual check**

Write a temporary spec screenshotting `/#/ai/govern` at 1280x720 into `/tmp/token-shots/`, both with the builder closed and with it open. Run it, then **READ the PNGs with your Read tool** and describe what you see. Confirm: the table renders with the three-state pill, the builder opens as a dialog, the preview panel states real figures, nothing overflows or collides. Delete the temporary spec before committing.

- [ ] **Step 5: Commit**

```bash
git add e2e/token-policy-authoring.spec.ts
git commit -m "test(e2e): authoring a token policy, and a pill that tells the truth"
```

---

## Self-Review

**Spec coverage:**
- `tokenPolicyPreview` derivation with all seven fields → Task 3. ✓
- Preview reuses the engine's own scope predicate rather than copying it → Task 1 extracts it; Task 3 calls it; the contract test in Task 1 pins them together. ✓
- `TokenPolicyBuilder` dialog: create and edit, identity locked in edit, honest scope labelling, budget stated per day, alert threshold, guardrail → Task 5. ✓
- Derived preview with per-clause rendering, unmetered and empty-log cases → Tasks 3 and 5. ✓
- Staging via a read-once holder and `?draft=policy-new`, existing `policy-<tag>` untouched → Task 4. ✓
- Three-state pill (Draft / Armed / Enforcing) describing the budget gate → Task 6. ✓
- Enforce and guardrail stop mutating → Task 6. ✓
- One-line soft-threshold engine edit → Task 2. ✓
- e2e, gate, visual → Task 7. ✓

**Deferred per spec, no task here:** tri-state guardrail; selectable window or metric; policy deletion; `tokenFindings()` and an AI proposal band; agent-scoped policies; metering group-scoped policies.

**Placeholder scan:** none. Task 5's implementation step describes the component in prose plus exact copy strings and testids rather than a full listing, because it mirrors `RuleBuilder` structurally and the plan directs the implementer to read that file first; every field, testid, guard and copy string it must produce is named explicitly.

**Type consistency:** `TokenPolicySpec` (`tag`, `scope`, `budget`, `softPct`, `guardrail`, `enforced`, `group?`) and `TokenPolicyPreview` (`meter`, `proposedPct`, `wouldDeny`, `boundAgents`, `routePath`, `capIntentEnforced`, `unmetered`) are defined in Task 3 and used with those exact names in Tasks 4, 5 and 6. `setPendingPolicySpec`/`takePendingPolicySpec` are defined in Task 4 and consumed in Task 5. `CC.scopeDenies` is defined in Task 1 and called in Task 3. Testids (`policy-builder`, `policy-preview`, `policy-stage`, `policy-status`) are introduced once and reused.

**Risks flagged for the executor:**
- Task 1 refactors a live gate. The reason strings must survive byte-identical, since the decision log records them and other suites assert them. The task says to stop and report rather than edit an expectation.
- Task 4 must insert `policy-new` BEFORE the `startsWith('policy-')` branch, or the existing widget token will swallow it.
- Task 6 changes behavior pre-existing tests may assert (two-state pill, mutating toggle). Those must be updated deliberately and named, never weakened.
