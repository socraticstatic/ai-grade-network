# Andi Rule Proposals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface the four live behavioral findings the engine already computes and no pixel renders, propose the existing rule that answers each, and let a human resolve it through the existing staging tray - plus the rule-builder fixes that path touches.

**Architecture:** One pure derivation, `ruleProposals(cc)`, joins `CC.threatFindings()` to `ruleList()` and prices each with `dryRun()`. Three surfaces read it and cannot disagree: a band on Govern, a card family in Andi, and a count badge in the nav. Actions navigate to `/discover?draft=finding-<id>`, which stages an existing `{kind:'enforce', ruleId}` move; a secondary path opens the rule builder pre-filled so a human can author a tighter variant, staged as a new `{kind:'rule', spec}` move.

**Tech Stack:** React 18 + TypeScript, Tailwind (`fw-*` / `figma-*` design tokens), Vitest + Testing Library (unit), Playwright (e2e). Engine is `window.CC` (`src/engine`), read via `useCloudControl` / `useCloudControlLive`.

## Global Constraints

- **Never use em dashes** in user-visible copy. Use hyphens or rephrase.
- **"The machine stages, never commits."** (`src/features/discover/StackDeckPage.tsx`). No proposal may call `addRule` or `enforceRule` directly. Every proposal action navigates to `/discover?draft=<token>`; a human commits from the tray. **`promote()` from `state-findings.ts` must never be called** - it enforces immediately and would break this.
- **Never invent a figure.** Everything shown comes from an engine getter (`threatFindings`, `ruleList`, `dryRun`, `ruleEnforced`). A number the engine cannot stand behind is not stated as one; unpriced things are named, never summed.
- **Design tokens only:** cards `rounded-2xl border border-fw-secondary bg-fw-base`; text `fw-heading` / `fw-body` / `fw-bodyLight`; warn `fw-warn`; success `fw-success`; primary action `fw-ctaPrimary`; `fw-wash` for recessive surfaces. Values carry `tabular-nums`. No arbitrary hex colors.
- **Tests use the real seeded engine** (`import { CC } from '../../engine'`) - never mock `CC`. A test that mutates shared engine state must restore it so test order cannot matter.
- **Do NOT modify** `src/components/control-center/`, `src/store/`, or `src/components/monitoring/alerts/`.
- Widgets and panels take no data props for engine state; they read it themselves.
- **Gate:** `npm run verify` (vitest + build + playwright) from `/Users/micahbos/Developer/cc-rules`.

### Engine facts, verified - do not re-derive

- `CC.threatFindings()` returns `{id, severity, source, title, detail, rule, active, promote}[]`. `severity` is `'crit' | 'high'`. **`active` is a boolean, already evaluated** (not a function). `rule` is the **id of an existing rule**, not a spec.
- The four findings and the rules they name: `gd-dns`->`pol-dns`, `gd-s3`->`pol-perimeter`, `gd-fin`->`pol-fin`, `gd-insp`->`pol-insp`. All four rules are `system: true`, ship unenforced, and carry a `fix` key, so `cc.ruleEnforced(r)` reads `cc.fixes[r.fix]`.
- `cc.dryRun(spec)` accepts an unsaved, `pri`-less rule-shaped object and returns `{matched, shadowed, gbps, blocked, pending}`. It is pure.
- `cc.ruleList()` returns rules sorted by `pri`; each is `{id, pri, name, src, dst, ports, action, chain, enforced, system, fix?}`.
- `StackPanel` already parses `?draft=andi`, `?draft=intent-<id>`, and `?draft=policy-<tag>`. Adding a token is an `else if` at the same site.
- `StagedMove` (`src/features/discover/stackFigures.ts`) is a union of `attach | steer | fix | enforce | policy`. `{kind:'enforce', ruleId}` is already supported end to end.

---

## File Structure

**Create**
- `src/features/govern/ruleProposals.ts` - the derivation. No React, no formatting.
- `src/features/govern/ruleProposals.test.ts`
- `src/features/govern/ProposalBand.tsx` - the Govern surface.
- `src/features/govern/ProposalBand.test.tsx`
- `e2e/rule-proposals.spec.ts`

**Modify**
- `src/features/discover/stackFigures.ts` - add `{kind:'rule', spec}` to `StagedMove`; handle it in `moveLabel`, `stagedDeltas`, `commitMoves`.
- `src/features/discover/StackPanel.tsx` - parse `?draft=finding-<id>` and `?draft=rule-new`; validity-check `rule` moves.
- `src/features/govern/RulesPanel.tsx` - render `ProposalBand` above the rules table.
- `src/features/govern/RuleBuilder.tsx` - dialog semantics, no deny-any default, live dry-run, visible failure, seed-from-proposal.
- `src/features/andi/andiBrain.ts` - a `proposal` card family.
- `src/features/andi/AndiPanel.tsx` - render proposal cards; stop cards vanishing when the thread is non-empty.
- `src/components/navigation/MainNav.tsx` - count badge on the Andi launcher.
- `src/engine/state-rules.ts` - port matching fix (Task 8 only).

---

### Task 1: `ruleProposals(cc)` derivation

**Files:**
- Create: `src/features/govern/ruleProposals.ts`
- Test: `src/features/govern/ruleProposals.test.ts`

**Interfaces:**
- Consumes: `CC.threatFindings()`, `cc.ruleList()`, `cc.ruleEnforced(rule)`, `cc.dryRun(spec)`.
- Produces:
  - `interface RuleProposal { id: string; findingId: string; severity: 'crit' | 'high'; source: string; title: string; detail: string; ruleId: string; ruleName: string; impact: { matched: number; gbps: number } }`
  - `function ruleProposals(cc: CloudControl): RuleProposal[]`

- [ ] **Step 1: Write the failing test**

```ts
// src/features/govern/ruleProposals.test.ts
import { describe, test, expect, afterEach } from 'vitest';
import { ruleProposals } from './ruleProposals';
import { CC } from '../../engine';

/* The seeded estate ships all four findings active and all four of their rules
   unenforced, so the derivation starts full and empties as rules enforce. */
afterEach(() => { while (CC.canUndo()) CC.undo(); });

describe('ruleProposals', () => {
  test('derives one proposal per active finding whose rule is unenforced', () => {
    const proposals = ruleProposals(CC);
    const findings = CC.threatFindings().filter(f => f.active);
    expect(proposals.length).toBe(findings.length);
    expect(proposals.length).toBeGreaterThan(0);
    for (const p of proposals) {
      expect(p.id).toBe(`finding-${p.findingId}`);
      expect(['crit', 'high']).toContain(p.severity);
      // The rule it names really exists and is really unenforced.
      const rule = CC.ruleList().find((r: { id: string }) => r.id === p.ruleId)!;
      expect(rule).toBeDefined();
      expect(CC.ruleEnforced(rule)).toBe(false);
      expect(p.ruleName).toBe(rule.name);
    }
  });

  test('states impact from dryRun, not from an invented figure', () => {
    const p = ruleProposals(CC)[0];
    const rule = CC.ruleList().find((r: { id: string }) => r.id === p.ruleId)!;
    const dry = CC.dryRun(rule) as { matched: unknown[]; gbps: number };
    expect(p.impact.matched).toBe(dry.matched.length);
    expect(p.impact.gbps).toBe(dry.gbps);
  });

  test('sorts crit before high', () => {
    const sev = ruleProposals(CC).map(p => p.severity);
    expect(sev.indexOf('high') === -1 || sev.lastIndexOf('crit') < sev.indexOf('high')).toBe(true);
  });

  test('drops a proposal once its rule is enforced - the finding retires itself', () => {
    const before = ruleProposals(CC);
    const target = before[0];
    CC.enforceRule(target.ruleId);
    const after = ruleProposals(CC);
    expect(after.map(p => p.id)).not.toContain(target.id);
    expect(after.length).toBe(before.length - 1);
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npx vitest run src/features/govern/ruleProposals.test.ts`
Expected: FAIL - cannot find module `./ruleProposals`.

- [ ] **Step 3: Implement**

```ts
// src/features/govern/ruleProposals.ts
import type { CloudControl } from '../../engine/types';

/**
 * The proposal derivation: every behavioral finding the engine currently holds
 * active, joined to the preventive rule that answers it and priced by the same
 * dryRun the builder uses.
 *
 * A finding names an EXISTING rule id, not a new spec, so a proposal's primary
 * resolution is to enforce a rule that already exists. `active` is recomputed
 * from the flow table and the fixes flags on every read, so enforcing that rule
 * drains the finding and the proposal retires itself - nothing here stores or
 * dismisses anything.
 *
 * The engine's own `promote()` is deliberately not used: it calls enforceRule
 * immediately, and the machine stages, never commits.
 */

export interface RuleProposal {
  id: string;
  findingId: string;
  severity: 'crit' | 'high';
  source: string;
  title: string;
  detail: string;
  ruleId: string;
  ruleName: string;
  /** What enforcing the named rule would touch, from dryRun. */
  impact: { matched: number; gbps: number };
}

interface Finding {
  id: string; severity: string; source: string; title: string;
  detail: string; rule: string; active: boolean;
}
interface Rule { id: string; name: string }

const SEVERITY_RANK: Record<string, number> = { crit: 0, high: 1 };

export function ruleProposals(cc: CloudControl): RuleProposal[] {
  const findings = (cc.threatFindings?.() ?? []) as Finding[];
  const rules = cc.ruleList() as Rule[];

  const rows = findings.flatMap<RuleProposal>(f => {
    if (!f.active) return [];
    const rule = rules.find(r => r.id === f.rule);
    // A finding whose rule the estate does not carry is skipped rather than
    // rendered broken; one whose rule is already enforced IS the resolved state.
    if (!rule || cc.ruleEnforced(rule)) return [];
    const dry = cc.dryRun(rule) as { matched: unknown[]; gbps: number };
    return [{
      id: `finding-${f.id}`,
      findingId: f.id,
      severity: f.severity === 'crit' ? 'crit' : 'high',
      source: f.source,
      title: f.title,
      detail: f.detail,
      ruleId: rule.id,
      ruleName: rule.name,
      impact: { matched: dry.matched.length, gbps: dry.gbps },
    }];
  });

  return rows.sort((a, b) =>
    (SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]) || (b.impact.gbps - a.impact.gbps));
}
```

- [ ] **Step 4: Run it, verify it passes**

Run: `npx vitest run src/features/govern/ruleProposals.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/govern/ruleProposals.ts src/features/govern/ruleProposals.test.ts
git commit -m "feat(govern): ruleProposals derives live findings joined to their preventive rule"
```

---

### Task 2: `{kind:'rule', spec}` staged move

**Files:**
- Modify: `src/features/discover/stackFigures.ts`
- Test: `src/features/discover/stackFigures.rule-move.test.ts` (create)

**Interfaces:**
- Consumes: `cc.dryRun`, `cc.addRule`.
- Produces: `StagedMove` gains `| { kind: 'rule'; spec: RuleSpec }` where
  `interface RuleSpec { name: string; src: Record<string, string>; dst: unknown; ports: string; action: string; chain: string[] }`.
  `moveLabel` and `stagedDeltas` handle it; `commitMoves` applies it via `addRule`.

- [ ] **Step 1: Write the failing test**

```ts
// src/features/discover/stackFigures.rule-move.test.ts
import { describe, test, expect, afterEach } from 'vitest';
import { moveLabel, stagedDeltas, commitMoves, type StagedMove } from './stackFigures';
import { CC } from '../../engine';

afterEach(() => { while (CC.canUndo()) CC.undo(); });

const spec = {
  name: 'Block classified DNS tunnelling (tightened)',
  src: { tag: 'classified-helion', cloud: 'any' },
  dst: 'dns-exfil',
  ports: 'any',
  action: 'deny',
  chain: [] as string[],
};
const move: StagedMove = { kind: 'rule', spec };

describe('the rule staged move', () => {
  test('labels itself with the rule name and dryRun figures, never invented ones', () => {
    const { label, detail } = moveLabel(CC, move);
    const dry = CC.dryRun(spec) as { matched: unknown[]; gbps: number };
    expect(label).toContain(spec.name);
    expect(detail).toContain(String(dry.matched.length));
  });

  test('states itself as a policy note, never as a dollar figure', () => {
    const d = stagedDeltas(CC, [move]);
    expect(d.moves).toBe(1);
    expect(d.egressSavingMo).toBe(0);
    expect(d.policyNotes.join(' ')).toContain(spec.name);
  });

  test('commits by authoring the rule, unenforced', () => {
    const before = CC.ruleList().length;
    const failed = commitMoves(CC, [move]);
    expect(failed).toEqual([]);
    const rules = CC.ruleList();
    expect(rules.length).toBe(before + 1);
    const authored = rules.find((r: { name: string }) => r.name === spec.name)!;
    expect(authored).toBeDefined();
    expect(CC.ruleEnforced(authored)).toBe(false);
  });

  test('reports a failed author rather than swallowing it', () => {
    // addRule returns null for a destination naming no live group.
    const bad: StagedMove = { kind: 'rule', spec: { ...spec, dst: { group: 'no-such-group' } } };
    const failed = commitMoves(CC, [bad]);
    expect(failed).toEqual([bad]);
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npx vitest run src/features/discover/stackFigures.rule-move.test.ts`
Expected: FAIL - `kind: 'rule'` is not assignable to `StagedMove`.

- [ ] **Step 3: Implement**

In `src/features/discover/stackFigures.ts`:

(a) Add to the `StagedMove` union, after the `policy` member:

```ts
  /* A rule the human authored (or tightened from a proposal) and staged rather
     than committed. Its consequence is stated in dryRun's own figures; it never
     claims a dollar the engine does not price. */
  | { kind: 'rule'; spec: RuleSpec };
```

and above the union:

```ts
export interface RuleSpec {
  name: string;
  src: Record<string, string>;
  dst: unknown;
  ports: string;
  action: string;
  chain: string[];
}
```

(b) In `moveLabel`, add a case before the closing brace of the switch:

```ts
    case 'rule': {
      const dry = cc.dryRun(move.spec) as { matched: unknown[]; gbps: number };
      const n = dry.matched.length;
      return {
        label: `Author rule · ${move.spec.name || 'unnamed rule'}`,
        detail: `${n} modelled flow${n === 1 ? '' : 's'} carrying ${dry.gbps} Gbps`,
      };
    }
```

(c) In `stagedDeltas`, extend the branch that collects policy notes so it also
covers rule moves. Change the condition:

```ts
    } else if (move.kind === 'policy' || move.kind === 'enforce' || move.kind === 'rule') {
```

(d) In `commitMoves`, add a case to the switch:

```ts
      case 'rule':
        ok = cc.addRule({ ...move.spec, enforceNow: false }) !== null;
        break;
```

- [ ] **Step 4: Run it, verify it passes**

Run: `npx vitest run src/features/discover/stackFigures.rule-move.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Run the neighbours to prove nothing regressed**

Run: `npx vitest run src/features/discover/ src/features/work/`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/features/discover/stackFigures.ts src/features/discover/stackFigures.rule-move.test.ts
git commit -m "feat(discover): a rule spec can be staged, priced by dryRun and authored on commit"
```

---

### Task 3: `?draft=finding-<id>` stages the proposal

**Files:**
- Modify: `src/features/discover/StackPanel.tsx`
- Test: `src/features/discover/StackPanel.finding.test.tsx` (create)

**Interfaces:**
- Consumes: `ruleProposals` (Task 1), `StagedMove` (Task 2).
- Produces: navigating to `/discover?draft=finding-<findingId>` stages `[{kind:'enforce', ruleId}]` and sets a proposal note naming the finding.

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/discover/StackPanel.finding.test.tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect, afterEach } from 'vitest';
import { StackPanel } from './StackPanel';
import { ruleProposals } from '../govern/ruleProposals';
import { CC } from '../../engine';

afterEach(() => { while (CC.canUndo()) CC.undo(); });

describe('?draft=finding-<id>', () => {
  test('stages the proposal\'s rule as an enforce move and names the finding', async () => {
    const p = ruleProposals(CC)[0];
    render(
      <MemoryRouter initialEntries={[`/discover?draft=${p.id}`]}>
        <StackPanel />
      </MemoryRouter>,
    );
    // The tray names the finding it came from, and the rule it would enforce.
    expect(await screen.findByText(new RegExp(p.title.slice(0, 20), 'i'))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(p.ruleName, 'i'))).toBeInTheDocument();
  });

  test('an unknown finding token stages nothing', () => {
    render(
      <MemoryRouter initialEntries={['/discover?draft=finding-no-such']}>
        <StackPanel />
      </MemoryRouter>,
    );
    expect(screen.queryByText(/Proposed by Andi/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npx vitest run src/features/discover/StackPanel.finding.test.tsx`
Expected: FAIL - the finding token is not parsed, so nothing stages.

- [ ] **Step 3: Implement**

In `src/features/discover/StackPanel.tsx`, add an `else if` to the draft-token
chain (it currently handles `andi`, `intent-`, `policy-`), before the final
`else { return; }`:

```tsx
    } else if (param.startsWith('finding-')) {
      /* ?draft=finding-gd-dns -> the behavioural finding whose id is gd-dns.
         A finding names an EXISTING preventive rule, so what stages is the
         enforce move the tray already understands. promote() would enforce it
         on the spot; the machine stages, never commits. */
      const proposal = ruleProposals(cc).find(p => p.id === param);
      if (proposal) {
        setStaged([{ kind: 'enforce', ruleId: proposal.ruleId }]);
        setDesigning(true);
        setProposalNote(`Proposed by Andi · ${proposal.title}`);
      }
```

Add the import at the top: `import { ruleProposals } from '../govern/ruleProposals';`

- [ ] **Step 4: Run it, verify it passes**

Run: `npx vitest run src/features/discover/StackPanel.finding.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/discover/StackPanel.tsx src/features/discover/StackPanel.finding.test.tsx
git commit -m "feat(discover): ?draft=finding-<id> stages a proposal's preventive rule"
```

---

### Task 4: `ProposalBand` on Govern

**Files:**
- Create: `src/features/govern/ProposalBand.tsx`, `src/features/govern/ProposalBand.test.tsx`
- Modify: `src/features/govern/RulesPanel.tsx`

**Interfaces:**
- Consumes: `ruleProposals` (Task 1).
- Produces: `function ProposalBand(): JSX.Element | null`. Root `data-testid="proposal-band"`; each row `data-testid="proposal-row"`; the primary action `data-testid="proposal-enforce"` linking to `/discover?draft=<proposal.id>`; the secondary `data-testid="proposal-tighten"` linking to `/naas/govern?rule=<ruleId>`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/govern/ProposalBand.test.tsx
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect, afterEach } from 'vitest';
import { ProposalBand } from './ProposalBand';
import { ruleProposals } from './ruleProposals';
import { CC } from '../../engine';

afterEach(() => { while (CC.canUndo()) CC.undo(); });

const renderBand = () => render(<MemoryRouter><ProposalBand /></MemoryRouter>);

describe('ProposalBand', () => {
  test('renders one row per proposal, stating the engine\'s own evidence and impact', () => {
    renderBand();
    const proposals = ruleProposals(CC);
    const rows = screen.getAllByTestId('proposal-row');
    expect(rows).toHaveLength(proposals.length);
    const first = proposals[0];
    const row = rows[0];
    expect(within(row).getByText(first.title)).toBeInTheDocument();
    expect(within(row).getByText(new RegExp(String(first.impact.gbps)))).toBeInTheDocument();
  });

  test('the primary action stages rather than enforcing', () => {
    renderBand();
    const first = ruleProposals(CC)[0];
    const enforce = screen.getAllByTestId('proposal-enforce')[0];
    expect(enforce.getAttribute('href')).toBe(`/discover?draft=${first.id}`);
  });

  test('renders nothing when every finding is resolved', () => {
    for (const p of ruleProposals(CC)) CC.enforceRule(p.ruleId);
    renderBand();
    expect(screen.queryByTestId('proposal-row')).not.toBeInTheDocument();
    expect(screen.getByTestId('proposal-band-empty')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npx vitest run src/features/govern/ProposalBand.test.tsx`
Expected: FAIL - cannot find module `./ProposalBand`.

- [ ] **Step 3: Implement**

```tsx
// src/features/govern/ProposalBand.tsx
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useCloudControlLive } from '../../engine/react/useCloudControl';
import { ruleProposals } from './ruleProposals';

/**
 * What Andi spotted, above the rules it concerns. Every row restates the
 * engine's own finding sentence and the dryRun figures for the rule that
 * answers it; both actions navigate, neither mutates. A row disappears on its
 * own once its rule is enforced, because the finding's active predicate is
 * recomputed from the estate.
 */
export function ProposalBand() {
  const cc = useCloudControlLive(c => c);
  const proposals = ruleProposals(cc);

  if (!proposals.length) {
    return (
      <p data-testid="proposal-band-empty" className="text-figma-sm text-fw-bodyLight mb-3">
        Nothing on the estate currently needs a new rule.
      </p>
    );
  }

  return (
    <section
      data-testid="proposal-band"
      className="mb-4 rounded-2xl border border-fw-secondary bg-fw-wash p-4"
    >
      <h3 className="flex items-center gap-2 text-figma-sm font-semibold text-fw-heading tracking-[-0.03em] mb-3">
        <ShieldAlert className="h-4 w-4 text-fw-warn" aria-hidden="true" />
        Andi spotted {proposals.length} thing{proposals.length === 1 ? '' : 's'} worth a rule
      </h3>
      <ul className="flex flex-col divide-y divide-fw-secondary">
        {proposals.map(p => (
          <li key={p.id} data-testid="proposal-row" className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className={`text-figma-xs font-semibold uppercase tracking-[0.08em] ${p.severity === 'crit' ? 'text-fw-warn' : 'text-fw-bodyLight'}`}>
                  {p.severity}
                </span>
                <span className="text-figma-sm font-medium text-fw-heading">{p.title}</span>
              </span>
              <span className="block text-figma-sm text-fw-body mt-0.5">{p.detail}</span>
              <span className="block text-figma-xs text-fw-bodyLight mt-1 tabular-nums">
                {p.source} · enforcing {p.ruleName} would match {p.impact.matched} flow
                {p.impact.matched === 1 ? '' : 's'} carrying {p.impact.gbps} Gbps
              </span>
            </span>
            <span className="flex flex-shrink-0 items-center gap-2">
              <Link
                data-testid="proposal-enforce"
                to={`/discover?draft=${p.id}`}
                className="rounded-full bg-fw-ctaPrimary px-3 py-1.5 text-figma-xs font-medium text-white hover:opacity-90 transition-opacity"
              >
                Enforce it
              </Link>
              <Link
                data-testid="proposal-tighten"
                to={`/naas/govern?rule=${p.ruleId}`}
                className="rounded-full border border-fw-secondary bg-fw-base px-3 py-1.5 text-figma-xs font-medium text-fw-link hover:border-fw-active transition-colors"
              >
                Tighten it
              </Link>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 4: Mount it on Govern**

In `src/features/govern/RulesPanel.tsx`, import `ProposalBand` and render
`<ProposalBand />` immediately above the rules card (before the element that
contains the "New rule" header and the table).

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/features/govern/`
Expected: PASS, including the pre-existing `RulesPanel` tests.

- [ ] **Step 6: Commit**

```bash
git add src/features/govern/ProposalBand.tsx src/features/govern/ProposalBand.test.tsx src/features/govern/RulesPanel.tsx
git commit -m "feat(govern): a proposal band above the rules it concerns"
```

---

### Task 5: Andi badge, proposal cards, and cards that stop vanishing

**Files:**
- Modify: `src/features/andi/andiBrain.ts`, `src/features/andi/AndiPanel.tsx`, `src/components/navigation/MainNav.tsx`
- Test: `src/features/andi/andiProposals.test.tsx` (create)

**Interfaces:**
- Consumes: `ruleProposals` (Task 1).
- Produces: `ResolveCard` gains `move: 'proposal'` with `proposalId`, `ruleName`, `severity`. Andi's launcher shows a count badge (`data-testid="andi-proposal-badge"`).

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/andi/andiProposals.test.tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect, afterEach } from 'vitest';
import { andiResolveCards } from './andiBrain';
import { ruleProposals } from '../govern/ruleProposals';
import { CC } from '../../engine';
import { MainNav } from '../../components/navigation/MainNav';

afterEach(() => { while (CC.canUndo()) CC.undo(); });

describe('Andi proposals', () => {
  test('resolve cards include one proposal card per live proposal', () => {
    const cards = andiResolveCards(CC).filter(c => c.move === 'proposal');
    expect(cards).toHaveLength(ruleProposals(CC).length);
    expect(cards[0].title).toBe(ruleProposals(CC)[0].title);
  });

  test('the nav badge states the proposal count', () => {
    render(<MemoryRouter><MainNav /></MemoryRouter>);
    const badge = screen.getByTestId('andi-proposal-badge');
    expect(badge).toHaveTextContent(String(ruleProposals(CC).length));
  });

  test('the badge disappears when nothing needs a rule', () => {
    for (const p of ruleProposals(CC)) CC.enforceRule(p.ruleId);
    render(<MemoryRouter><MainNav /></MemoryRouter>);
    expect(screen.queryByTestId('andi-proposal-badge')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npx vitest run src/features/andi/andiProposals.test.tsx`
Expected: FAIL - no `proposal` cards, no badge.

- [ ] **Step 3: Implement the card family**

In `src/features/andi/andiBrain.ts`: extend the `ResolveCard` interface with
`move: 'draft' | 'intent' | 'proposal'` and optional `proposalId?: string;
ruleName?: string; severity?: 'crit' | 'high';`. In `andiResolveCards(cc)`,
prepend proposal cards ahead of the existing families:

```ts
  const proposalCards: ResolveCard[] = ruleProposals(cc).map(p => ({
    title: p.title,
    detail: `${p.detail} Enforcing ${p.ruleName} would match ${p.impact.matched} flows carrying ${p.impact.gbps} Gbps.`,
    savingMo: null,
    move: 'proposal',
    proposalId: p.id,
    ruleName: p.ruleName,
    severity: p.severity,
  }));
```

Import `ruleProposals` from `'../govern/ruleProposals'`.

- [ ] **Step 4: Render proposal cards, and stop cards vanishing**

In `src/features/andi/AndiPanel.tsx`:
- Render a branch for `card.move === 'proposal'` beside the existing intent and
  draft branches. Its single action is a link to `/discover?draft=<proposalId>`
  labelled "Enforce it".
- The card list currently renders only when `thread.length === 0`. Change that
  gate so **proposal cards always render**, while the other families keep their
  existing behaviour. Advice that disappears the moment you ask a question is
  not advice.

- [ ] **Step 5: Add the badge**

In `src/components/navigation/MainNav.tsx`, next to the existing Andi toggle
(the `Sparkles` button, `data-testid="andi-toggle"`), read
`useCloudControlLive(c => ruleProposals(c).length)` and, when greater than zero,
render a count badge with `data-testid="andi-proposal-badge"` styled like the
existing nav count badges.

- [ ] **Step 6: Run tests**

Run: `npx vitest run src/features/andi/ src/components/navigation/`
Expected: PASS, including pre-existing Andi and nav tests.

- [ ] **Step 7: Commit**

```bash
git add src/features/andi/ src/components/navigation/MainNav.tsx
git commit -m "feat(andi): proposal cards that persist, and a badge that makes advice findable"
```

---

### Task 6: The builder becomes a real dialog

**Files:**
- Modify: `src/features/govern/RuleBuilder.tsx`
- Test: `src/features/govern/RuleBuilder.dialog.test.tsx` (create)

**Interfaces:**
- Produces: the open builder is `role="dialog"` with `aria-modal="true"`, focus moves to the name field on open, Escape closes it, it is a `<form>` whose submit authors the rule, and an unedited form cannot be submitted.

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/govern/RuleBuilder.dialog.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, afterEach } from 'vitest';
import { RuleBuilder } from './RuleBuilder';
import { CC } from '../../engine';

afterEach(() => { while (CC.canUndo()) CC.undo(); });

describe('RuleBuilder as a dialog', () => {
  test('is a modal dialog and focuses its first field on open', async () => {
    render(<RuleBuilder />);
    fireEvent.click(screen.getByRole('button', { name: /new rule/i }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    await waitFor(() => expect(screen.getByLabelText(/rule name/i)).toHaveFocus());
  });

  test('Escape closes it', async () => {
    render(<RuleBuilder />);
    fireEvent.click(screen.getByRole('button', { name: /new rule/i }));
    await screen.findByRole('dialog');
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  test('an untouched form cannot author the deny-any-to-any default', async () => {
    render(<RuleBuilder />);
    fireEvent.click(screen.getByRole('button', { name: /new rule/i }));
    await screen.findByRole('dialog');
    expect(screen.getByRole('button', { name: /add rule/i })).toBeDisabled();
  });

  test('a failed author is visible and keeps the form open', async () => {
    render(<RuleBuilder />);
    fireEvent.click(screen.getByRole('button', { name: /new rule/i }));
    await screen.findByRole('dialog');
    fireEvent.change(screen.getByLabelText(/rule name/i), { target: { value: 'x' } });
    // Force the engine's null path: a group destination naming no live group.
    fireEvent.change(screen.getByLabelText(/destination/i), { target: { value: 'group:no-such-group' } });
    fireEvent.click(screen.getByRole('button', { name: /add rule/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not/i);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
```

Note: if the destination select does not offer a `group:no-such-group` option,
instead remove the live group from the engine first (`CC.removeGroup(id)`) so a
previously-valid selection becomes invalid, and restore it in cleanup. Use
whichever route the real component supports; the assertion (an alert, form stays
open) is the requirement.

- [ ] **Step 2: Run it, verify it fails**

Run: `npx vitest run src/features/govern/RuleBuilder.dialog.test.tsx`
Expected: FAIL - no dialog role, no focus move, Add enabled, no alert.

- [ ] **Step 3: Implement**

In `src/features/govern/RuleBuilder.tsx`:
- Wrap the open panel in `<div role="dialog" aria-modal="true" aria-label="New rule">` and make the fields live inside a `<form onSubmit={e => { e.preventDefault(); submit(); }}>`. Change the Add button to `type="submit"`.
- Add a `useRef` on the name input and a `useEffect` that focuses it when `open` becomes true.
- Add a `useEffect` binding `keydown` on `document` that calls `cancel()` on `Escape`, cleaned up on unmount.
- Add `const untouched = name === INITIAL_FORM.name && tag === INITIAL_FORM.tag && cloud === INITIAL_FORM.cloud && group === INITIAL_FORM.group && dst === INITIAL_FORM.dst && ports === INITIAL_FORM.ports && action === INITIAL_FORM.action;` and include `|| untouched` in the Add button's `disabled` expression.
- Change `submit()` to capture the result and surface failure:

```tsx
  const [failed, setFailed] = useState(false);

  const submit = () => {
    if (groupNeeded || tagGroupMismatch) return;
    const created = actions.addRule({ ...spec(), enforceNow: false });
    if (created === null) { setFailed(true); return; }   // stay open, say so
    setFailed(false);
    resetForm();
    setOpen(false);
  };
```

and render, near the other warnings:

```tsx
  {failed && (
    <p role="alert" className="text-figma-sm text-fw-warn">
      That rule could not be authored. Check the destination still names a live group.
    </p>
  )}
```

Clear `failed` inside `onField` alongside the preview reset.

- [ ] **Step 4: Run it, verify it passes**

Run: `npx vitest run src/features/govern/RuleBuilder.dialog.test.tsx src/features/govern/RuleBuilder.test.tsx`
Expected: PASS. If the pre-existing `RuleBuilder.test.tsx` asserted that an
empty-name rule commits, update that test to the new contract and say so in your
report.

- [ ] **Step 5: Commit**

```bash
git add src/features/govern/RuleBuilder.tsx src/features/govern/RuleBuilder.dialog.test.tsx src/features/govern/RuleBuilder.test.tsx
git commit -m "fix(govern): the rule builder is a real dialog that cannot silently fail"
```

---

### Task 7: Live dry-run, and shadowing that names the rule

**Files:**
- Modify: `src/features/govern/RuleBuilder.tsx`
- Test: `src/features/govern/RuleBuilder.preview.test.tsx` (create)

**Interfaces:**
- Produces: the preview recomputes on every field change (no manual Dry run press required, no clearing), and shadowed rows name the shadowing rule.

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/govern/RuleBuilder.preview.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, afterEach } from 'vitest';
import { RuleBuilder } from './RuleBuilder';
import { CC } from '../../engine';

afterEach(() => { while (CC.canUndo()) CC.undo(); });

describe('RuleBuilder live preview', () => {
  test('recomputes as fields change instead of clearing', async () => {
    render(<RuleBuilder />);
    fireEvent.click(screen.getByRole('button', { name: /new rule/i }));
    await screen.findByRole('dialog');
    fireEvent.change(screen.getByLabelText(/rule name/i), { target: { value: 'live preview rule' } });
    // A preview exists without ever pressing a Dry run button.
    const preview = await screen.findByTestId('rule-preview');
    const firstText = preview.textContent;
    fireEvent.change(screen.getByLabelText(/destination/i), { target: { value: 'dns-exfil' } });
    await waitFor(() => {
      expect(screen.getByTestId('rule-preview').textContent).not.toBe(firstText);
    });
  });

  test('names the rule that shadows, not just how many', async () => {
    render(<RuleBuilder />);
    fireEvent.click(screen.getByRole('button', { name: /new rule/i }));
    await screen.findByRole('dialog');
    // Author a spec the seeded system rules already cover.
    fireEvent.change(screen.getByLabelText(/rule name/i), { target: { value: 'shadowed rule' } });
    fireEvent.change(screen.getByLabelText(/destination/i), { target: { value: 'dns-exfil' } });
    const preview = await screen.findByTestId('rule-preview');
    const dry = CC.dryRun({
      name: 'shadowed rule', src: { tag: 'any', cloud: 'any' },
      dst: 'dns-exfil', ports: 'any', action: 'deny', chain: [],
    }) as { shadowed: { by: string }[] };
    if (dry.shadowed.length) {
      expect(preview.textContent).toContain(dry.shadowed[0].by);
    }
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npx vitest run src/features/govern/RuleBuilder.preview.test.tsx`
Expected: FAIL - no `rule-preview` until Dry run is pressed, and shadowing shows only a count.

- [ ] **Step 3: Implement**

In `src/features/govern/RuleBuilder.tsx`:
- Delete the `preview` state and the `runDry` handler, and remove the "Dry run" button. Replace with a derived value computed every render while the dialog is open:

```tsx
  /* The preview is derived, not stored: it describes exactly the spec on
     screen, so what a person approved and what they commit cannot drift.
     The old flow cleared it on every keystroke, which meant the reviewed
     spec and the committed spec were never the same object. */
  const preview = open && !groupNeeded && !tagGroupMismatch
    ? (CC.dryRun(spec()) as Preview)
    : null;
```

- Remove the `setPreview(null)` from `onField` (keep the `setFailed(false)`).
- Give the preview container `data-testid="rule-preview"`.
- Replace the shadowed count line with named rules:

```tsx
  {preview.shadowed.length > 0 && (
    <p className="text-figma-xs text-fw-bodyLight mt-1">
      Shadowed by {Array.from(new Set(preview.shadowed.map(s => s.by))).join(', ')}
    </p>
  )}
```

- [ ] **Step 4: Run it, verify it passes**

Run: `npx vitest run src/features/govern/`
Expected: PASS. Update any pre-existing test that pressed a "Dry run" button and
say so in your report.

- [ ] **Step 5: Commit**

```bash
git add src/features/govern/RuleBuilder.tsx src/features/govern/RuleBuilder.preview.test.tsx
git commit -m "fix(govern): the dry run is live, and shadowing names the rule"
```

---

### Task 8: Honest ports

**Files:**
- Modify: `src/engine/state-rules.ts`, `src/features/govern/RuleBuilder.tsx`
- Test: `src/engine/state-rules.ports.test.ts` (create)

**Interfaces:**
- Produces: `ports: '443'` no longer matches a flow whose ports are `'5432, 8443'`; `53` is offerable in the builder.

- [ ] **Step 1: Write the failing test**

```ts
// src/engine/state-rules.ports.test.ts
import { describe, test, expect } from 'vitest';
import { CC } from '../engine';

describe('port matching', () => {
  test('a port rule matches only a flow that really carries that port', () => {
    const flows = CC.flows() as { ports: string }[];
    const multi = flows.find(f => f.ports.includes(',') && f.ports.includes('8443'));
    expect(multi, 'the seeded estate should carry a multi-port flow').toBeTruthy();
    // '443' must NOT match '5432, 8443' - it is a substring, not a port.
    const dry = CC.dryRun({
      name: 'port probe', src: { tag: 'any', cloud: 'any' },
      dst: 'any', ports: '443', action: 'deny', chain: [],
    }) as { matched: { flow: { ports: string } }[] };
    for (const m of dry.matched) {
      const ports = m.flow.ports.split(',').map(s => s.trim());
      expect(ports).toContain('443');
    }
  });

  test('port 53 can be targeted', () => {
    const dry = CC.dryRun({
      name: 'dns probe', src: { tag: 'any', cloud: 'any' },
      dst: 'any', ports: '53', action: 'deny', chain: [],
    }) as { matched: unknown[] };
    expect(Array.isArray(dry.matched)).toBe(true);
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npx vitest run src/engine/state-rules.ports.test.ts`
Expected: FAIL - `'5432, 8443'.includes('443')` is true, so a `5432, 8443` flow matches.

- [ ] **Step 3: Implement**

In `src/engine/state-rules.ts`, find the port comparison in `ruleMatch`
(currently `!flow.ports.includes(rule.ports)`) and replace the substring test
with a real port-set membership test:

```js
  /* Ports are a comma-separated set, not a string to search: '443' is not a
     port of '5432, 8443' even though it is a substring of it. */
  if(rule.ports&&rule.ports!=='any'){
    var flowPorts=String(flow.ports||'').split(',').map(function(s){return s.trim();});
    if(flowPorts.indexOf(String(rule.ports))===-1)return false;
  }
```

Keep the surrounding logic and the `'any'` short-circuit exactly as they are.

In `src/features/govern/RuleBuilder.tsx`, add `'53'` to the `PORTS` tuple:

```tsx
const PORTS = ['any', '53', '443', '5432', '8443'] as const;
```

- [ ] **Step 4: Run it, verify it passes, and check the blast radius**

Run: `npx vitest run src/engine/`
Then run the FULL suite: `npx vitest run`
Expected: all pass. This change alters flow matching, so it can move figures
that other tests or the tour narrate. **If any test's expected numbers change,
stop and report it rather than editing the expectation to match** - a changed
demo figure is a decision, not a fix.

- [ ] **Step 5: Commit**

```bash
git add src/engine/state-rules.ts src/engine/state-rules.ports.test.ts src/features/govern/RuleBuilder.tsx
git commit -m "fix(engine): a port rule matches a port, not a substring"
```

---

### Task 9: "Tighten it" opens the builder pre-filled

**Files:**
- Modify: `src/features/govern/RuleBuilder.tsx`, `src/features/govern/RulesPanel.tsx`
- Test: `src/features/govern/RuleBuilder.seed.test.tsx` (create)

**Interfaces:**
- Consumes: the `?rule=<ruleId>` search param emitted by `ProposalBand`'s Tighten link (Task 4).
- Produces: `RuleBuilder` accepts an optional `seed?: { ruleId: string }`; when present it opens with the fields set from that rule's spec, shows a provenance line, and its submit stages `{kind:'rule', spec}` via `/discover?draft=rule-new` rather than authoring in place.

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/govern/RuleBuilder.seed.test.tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect } from 'vitest';
import { RuleBuilder } from './RuleBuilder';
import { CC } from '../../engine';

describe('RuleBuilder seeded from a proposal', () => {
  test('opens pre-filled from the named rule and says where it came from', async () => {
    const rule = CC.ruleList().find((r: { id: string }) => r.id === 'pol-dns')!;
    render(<MemoryRouter><RuleBuilder seed={{ ruleId: 'pol-dns' }} /></MemoryRouter>);
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect((screen.getByLabelText(/rule name/i) as HTMLInputElement).value).toContain(rule.name);
    expect(screen.getByTestId('rule-provenance')).toHaveTextContent(/proposed by andi/i);
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npx vitest run src/features/govern/RuleBuilder.seed.test.tsx`
Expected: FAIL - `RuleBuilder` takes no `seed` prop.

- [ ] **Step 3: Implement**

In `RuleBuilder.tsx`:
- Add `seed?: { ruleId: string }` to the props. When `seed` is present on mount, open the dialog and set each field from `CC.ruleList().find(r => r.id === seed.ruleId)`: `name` becomes `` `${rule.name} (tightened)` ``, `tag`/`cloud`/`group` from `rule.src`, `dst` from `rule.dst` (re-encoding an object dst as `group:<id>`), `ports`, `action`.
- Render the provenance line when seeded:

```tsx
  {seed && (
    <p data-testid="rule-provenance" className="text-figma-xs text-fw-bodyLight">
      Proposed by Andi from: {seededRuleName}. Edit anything before you stage it.
    </p>
  )}
```

- When seeded, the primary button reads "Stage this rule" and, instead of
  calling `addRule`, navigates to `/discover?draft=rule-new` after putting the
  spec where `StackPanel` can read it. Implement that handoff by encoding the
  spec in the URL is NOT acceptable (it would be long and fragile); instead add
  a module-level holder in `src/features/discover/stackFigures.ts`:

```ts
/* A spec handed from the rule builder to the tray. Read-once, like the share
   proposal: the builder sets it, StackPanel takes it, and nothing persists so a
   refresh cannot re-stage. */
let pendingRuleSpec: RuleSpec | null = null;
export function setPendingRuleSpec(spec: RuleSpec) { pendingRuleSpec = spec; }
export function takePendingRuleSpec(): RuleSpec | null {
  const s = pendingRuleSpec; pendingRuleSpec = null; return s;
}
```

  The builder calls `setPendingRuleSpec(spec())` then navigates. In
  `StackPanel`'s token chain add:

```tsx
    } else if (param === 'rule-new') {
      const spec = takePendingRuleSpec();
      if (spec) {
        setStaged([{ kind: 'rule', spec }]);
        setDesigning(true);
        setProposalNote(`Rule · ${spec.name}`);
      }
```

In `RulesPanel.tsx`: read `useSearchParams()`; when `?rule=<id>` is present,
render `<RuleBuilder seed={{ ruleId }} />` and strip the param after mount the
same way `StackPanel` strips `draft`.

- [ ] **Step 4: Run it, verify it passes**

Run: `npx vitest run src/features/govern/ src/features/discover/`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/govern/ src/features/discover/
git commit -m "feat(govern): Tighten it opens the builder pre-filled and stages the result"
```

---

### Task 10: End-to-end proof, full gate, and visual check

**Files:**
- Create: `e2e/rule-proposals.spec.ts`

- [ ] **Step 1: Write the e2e**

Read an existing spec in `e2e/` first (e.g. `e2e/govern-first-move.spec.ts`) and
match its first-visit and modal-dismiss conventions.

```ts
// e2e/rule-proposals.spec.ts
import { test, expect, type Page } from '@playwright/test';

async function firstVisit(page: Page, hash: string) {
  await page.addInitScript(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto(`/#${hash}`, { waitUntil: 'domcontentloaded' });
  const dismiss = page.getByRole('button', { name: /^(skip|skip tour|close|got it|maybe later|no thanks)$/i });
  while (await dismiss.first().isVisible().catch(() => false)) { await dismiss.first().click(); await page.waitForTimeout(150); }
  await page.keyboard.press('Escape').catch(() => {});
}

test('Govern shows what Andi spotted, and enforcing retires the proposal', async ({ page }) => {
  await firstVisit(page, '/naas/govern');
  const band = page.getByTestId('proposal-band');
  await expect(band).toBeVisible();
  const rowsBefore = await page.getByTestId('proposal-row').count();
  expect(rowsBefore).toBeGreaterThan(0);

  // Enforce the first proposal: it stages, a human commits, the row retires.
  await page.getByTestId('proposal-enforce').first().click();
  await expect(page).toHaveURL(/#\/discover/);
  await expect(page.getByText(/Proposed by Andi/i)).toBeVisible();
  await page.getByRole('button', { name: /commit/i }).first().click();

  await page.goto('/#/naas/govern', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('proposal-row')).toHaveCount(rowsBefore - 1);
});

test('the Andi badge counts the same proposals the band shows', async ({ page }) => {
  await firstVisit(page, '/naas/govern');
  const rows = await page.getByTestId('proposal-row').count();
  await expect(page.getByTestId('andi-proposal-badge')).toHaveText(String(rows));
});
```

If the tray's commit control has a different accessible name, use the real one
and note it in your report. Do not weaken an assertion to make it pass.

- [ ] **Step 2: Run it**

Run: `npx playwright test e2e/rule-proposals.spec.ts`
Expected: PASS (2 tests). Run it twice to check for flake.

- [ ] **Step 3: Full gate**

Run: `npm run verify`
Expected: vitest, build, and playwright all pass. Fix failures at the source.

- [ ] **Step 4: Visual check**

Write a temporary spec that screenshots `/#/naas/govern` at 1280x720 into
`/tmp/rule-shots/`, run it, then READ the PNG with your Read tool and describe
what you see. Confirm: the band renders above the rules table, severity and
evidence are legible, nothing overflows or collides, and both actions are
visible. Delete the temporary spec before committing.

- [ ] **Step 5: Commit**

```bash
git add e2e/rule-proposals.spec.ts
git commit -m "test(e2e): the proposal loop, from what Andi spotted to a retired finding"
```

---

## Self-Review

**Spec coverage:**
- `ruleProposals` derivation, one source of truth -> Task 1. ✓
- Band on Govern with severity/source/detail/impact and both actions -> Task 4. ✓
- Andi badge, proposal card family, cards stop vanishing -> Task 5. ✓
- Staging via `?draft=finding-<id>`, `{kind:'enforce'}` -> Task 3. ✓
- `{kind:'rule', spec}` move: union, `moveLabel`, `stagedDeltas`, `commitMoves`, failure reported -> Task 2. ✓
- "Tighten it" pre-fills the builder from the rule's spec, stages the result -> Task 9. ✓
- Builder: dialog semantics, focus, Escape, no deny-any default, visible failure -> Task 6. ✓
- Builder: live dry-run linking preview to commit, shadowing names the rule -> Task 7. ✓
- Ports: add 53, fix substring matching -> Task 8. ✓
- Proposals retire themselves when the finding goes inactive -> asserted in Tasks 1, 4 and 10. ✓
- `promote()` never called; nothing mutates outside the tray -> enforced by the Global Constraints and asserted in Task 4 (the primary action is a link). ✓
- Skipping findings whose rule is missing or already enforced -> Task 1. ✓

**Deferred per spec, with no task here:** rule edit / delete / unenforce / priority; token-policy authoring; `policyHits` surfacing; `REQUIREMENTS` + `addPolicy` custom policies; drift-sourced proposals; the approvals ceremony.

**Placeholder scan:** none. Two steps name a fallback the implementer must choose between (Task 6's invalid-destination route, Task 10's commit-button name); both state the required assertion so the choice cannot weaken the test.

**Type consistency:** `RuleProposal` fields (`id`, `findingId`, `severity`, `source`, `title`, `detail`, `ruleId`, `ruleName`, `impact.matched`, `impact.gbps`) are defined in Task 1 and used with those exact names in Tasks 3, 4, 5 and 10. `RuleSpec` and `{kind:'rule', spec}` are defined in Task 2 and consumed in Task 9. `setPendingRuleSpec` / `takePendingRuleSpec` are defined and consumed within Task 9. Testids (`proposal-band`, `proposal-band-empty`, `proposal-row`, `proposal-enforce`, `proposal-tighten`, `andi-proposal-badge`, `rule-preview`, `rule-provenance`) are introduced once and reused consistently.

**Risk flagged for the executor:** Task 8 changes engine flow matching and can move figures other suites or the guided tour narrate. The task instructs the implementer to stop and report rather than edit expectations to match.
