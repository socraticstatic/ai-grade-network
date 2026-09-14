import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect, afterEach, vi } from 'vitest';
import { RuleBuilder } from './RuleBuilder';
import { takePendingRuleSpec } from '../discover/stackFigures';
import { CC } from '../../engine';

/* Navigation is asserted by destination, not by router internals — same
   pattern MoneyOnTheTableWidget.test.tsx and IntentThreads.tsx's own tests
   use. */
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...(actual as object), useNavigate: () => mockNavigate };
});

afterEach(() => {
  mockNavigate.mockClear();
  while (CC.canUndo()) CC.undo();
});

/* The governing contract, stated verbatim in StackDeckPage.tsx: "The machine
   stages, never commits." A seeded builder (arrived via "Tighten it") must
   hand its spec to the review tray rather than author a rule directly — and
   until this file existed, nothing in the test tree proved it. A future
   refactor that made the seeded submit call addRule would have passed every
   existing test. */
describe('a seeded builder stages instead of authoring', () => {
  test('submit does not call addRule, and the real engine\'s rule count is unchanged', async () => {
    const spy = vi.spyOn(CC, 'addRule');
    const before = CC.ruleList().length;

    render(<MemoryRouter><RuleBuilder seed={{ ruleId: 'pol-dns' }} /></MemoryRouter>);
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: /stage this rule/i }));

    expect(spy).not.toHaveBeenCalled();
    // The honest check: real engine state, not just a spy. A rule-count
    // assertion before/after proves nothing was authored even if some other
    // code path reached the engine without going through addRule.
    expect(CC.ruleList().length).toBe(before);
    spy.mockRestore();
  });

  test('submit hands the on-screen spec to takePendingRuleSpec, read-once', async () => {
    const rule = CC.ruleList().find((r: { id: string }) => r.id === 'pol-dns')!;

    render(<MemoryRouter><RuleBuilder seed={{ ruleId: 'pol-dns' }} /></MemoryRouter>);
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: /stage this rule/i }));

    const spec = takePendingRuleSpec();
    expect(spec).toMatchObject({
      name: `${rule.name} (tightened)`,
      src: { tag: 'classified-helion', cloud: 'any' },
      dst: 'dns-exfil',
      ports: 'any',
      action: 'deny',
    });

    // Read-once: a second call after the first must come back empty, so a
    // stray re-mount or refresh cannot re-stage the same spec.
    expect(takePendingRuleSpec()).toBeNull();
  });

  test('submit navigates to /discover?draft=rule-new', async () => {
    render(<MemoryRouter><RuleBuilder seed={{ ruleId: 'pol-dns' }} /></MemoryRouter>);
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: /stage this rule/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/discover?draft=rule-new');
    // Drain the holder this test's submit populated so it cannot leak into
    // whichever test runs next in this file.
    takePendingRuleSpec();
  });
});

/* The regression guard the other direction: a future change that made the
   seeded path stage must not accidentally make EVERY submit stage. The
   unseeded builder ("New rule") is the primary authoring path and must keep
   calling addRule directly. */
describe('the unseeded builder still authors directly', () => {
  test('submit adds exactly one rule to the real engine', async () => {
    const before = CC.ruleList().length;

    render(<MemoryRouter><RuleBuilder /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /new rule/i }));
    await screen.findByRole('dialog');
    fireEvent.change(screen.getByLabelText(/rule name/i), {
      target: { value: 'stage-guard-unseeded-rule' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^add rule$/i }));

    const after = CC.ruleList() as { name: string }[];
    expect(after.length).toBe(before + 1);
    expect(after.map(r => r.name)).toContain('stage-guard-unseeded-rule');
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
