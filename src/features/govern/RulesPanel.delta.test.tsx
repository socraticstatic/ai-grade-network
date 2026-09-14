import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RulesPanel } from './RulesPanel';
import { enforceAndMeasure, type EnforcementDelta } from './enforcementDelta';
import { CC } from '../../engine';

/* RulesPanel now mounts ProposalBand above the table, and ProposalBand's
   actions are react-router <Link>s - rendering RulesPanel outside a Router
   throws. These tests exercise the enforce/apply lifecycle, not routing, so a
   MemoryRouter wrapper is enough. */
const renderPanel = () => render(<MemoryRouter><RulesPanel /></MemoryRouter>);

/**
 * The lastDelta LIFECYCLE in RulesPanel: when the consequence panel appears,
 * when it stands, and when it must clear.
 *
 * `enforceAndMeasure` is mocked so each test can dictate what an enforce
 * reports (a delta, then null) without depending on how far the seeded
 * estate happens to be walkable — the subject here is RulesPanel's state
 * handling, not the measurement (enforcementDelta.test.ts owns that).
 * Everything else (splitDelta, heldSentence, the engine, applyFix) is real.
 */
vi.mock('./enforcementDelta', async importOriginal => {
  const actual = await importOriginal<typeof import('./enforcementDelta')>();
  return { ...actual, enforceAndMeasure: vi.fn() };
});

const measure = vi.mocked(enforceAndMeasure);

function fakeDelta(over: Partial<EnforcementDelta> = {}): EnforcementDelta {
  return {
    ruleId: 'pol-x',
    ruleName: 'Measured rule',
    before: { posture: 60, violations: 3, enforced: 2, total: 8 },
    after: { posture: 64, violations: 1, enforced: 3, total: 8 },
    ...over,
  };
}

interface RuleShape {
  id: string;
  name: string;
  fix?: string;
}

/** An unenforced rule with a bound remediation — the only kind whose menu
 *  offers both Enforce and Apply. */
function fixableRule(): RuleShape {
  const r = (CC.ruleList() as RuleShape[]).find(x => x.fix && !CC.ruleEnforced(x));
  expect(r, 'seeded estate must hold an unenforced rule with a fix').toBeTruthy();
  return r!;
}

function openRowMenu(ruleName: string) {
  const row = screen.getByText(ruleName).closest('tr') as HTMLTableRowElement;
  fireEvent.click(within(row).getByRole('button', { name: /more options/i }));
  return screen.getByRole('menu');
}

function clickMenuItem(label: RegExp) {
  fireEvent.click(within(screen.getByRole('menu')).getByText(label));
}

const panel = () => screen.getByTestId('govern-enforced-delta');

beforeEach(() => {
  measure.mockReset();
});

describe('RulesPanel · a null measurement leaves the previous panel standing', () => {
  it('re-enforce / unknown id (enforceAndMeasure → null) does not clear or replace the panel', () => {
    // First enforce reports a delta; the second reports nothing — the
    // engine's word for "already enforced, or no such rule". RulesPanel:
    // `if (delta) setLastDelta(delta)` — no consequence, no change.
    measure.mockReturnValueOnce(fakeDelta()).mockReturnValue(null);
    const rule = fixableRule();
    renderPanel();

    openRowMenu(rule.name);
    clickMenuItem(/^Enforce$/);
    expect(panel().textContent).toContain('Measured rule');

    // The mocked measure did not touch the engine, so the row still offers
    // its menu — press Enforce again and get the null path.
    openRowMenu(rule.name);
    clickMenuItem(/^Enforce$/);
    expect(measure).toHaveBeenCalledTimes(2);

    // The previous consequence still stands, word for word.
    expect(panel().textContent).toContain('Measured rule');
    expect(panel()).not.toBeEmptyDOMElement();
  });
});

describe('RulesPanel · Apply is a mutation the panel must not survive', () => {
  it('applying a fix clears the stale consequence panel', () => {
    // Apply mutates violations and posture WITHOUT going through
    // enforceAndMeasure, so a panel reporting the previous enforce's
    // before/after would now disagree with the header and violation list
    // around it. A stale claim is worse than no claim: it clears.
    measure.mockReturnValue(fakeDelta());
    const rule = fixableRule();
    renderPanel();

    openRowMenu(rule.name);
    clickMenuItem(/^Enforce$/);
    expect(panel().textContent).toContain('Measured rule');

    openRowMenu(rule.name);
    clickMenuItem(/^Apply$/);

    expect(panel()).toBeEmptyDOMElement();
  });
});
