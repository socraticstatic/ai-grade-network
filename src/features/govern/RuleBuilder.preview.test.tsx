import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect, afterEach } from 'vitest';
import { RuleBuilder } from './RuleBuilder';
import { CC } from '../../engine';

afterEach(() => { while (CC.canUndo()) CC.undo(); });

// RuleBuilder now navigates (useNavigate) when a seeded submit stages a
// rule, so every render needs a Router ancestor even where these tests
// never seed it — the hook itself throws without one.
const renderBuilder = () => render(<MemoryRouter><RuleBuilder /></MemoryRouter>);

describe('RuleBuilder live preview', () => {
  test('recomputes as fields change instead of clearing', async () => {
    renderBuilder();
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

  // On a freshly seeded engine, dryRun(...).shadowed is ALWAYS empty:
  // shadowing only counts an enforced rule (ruleEnforced(r) === true), and
  // every seeded system rule resolves through a `fixes.*` flag that
  // defaults to false with nothing enforcing at bootstrap. A test that
  // wraps its assertion in `if (dry.shadowed.length)` therefore never runs
  // that assertion at all. This test makes shadowing real first, verifies
  // that precondition as its own (unguarded) assertion, then checks the
  // preview names the shadowing rule and de-duplicates it.
  test('names the rule that shadows, deduplicated, once shadowing is genuinely enforced', async () => {
    // pol-insp ("Inspect classified egress", pri 2) matches every flow whose
    // src tag is classified-helion, regardless of destination — enforcing it
    // does not remove the flows it shadows (unlike pol-dns, whose own dst
    // ('dns-exfil') stops being generated once its fix flag flips true).
    const enforced = CC.enforceRule('pol-insp');
    expect(enforced).toBe(true);

    const spec = {
      name: 'shadowed rule',
      src: { tag: 'classified-helion', cloud: 'any' },
      dst: 'storage',
      ports: 'any',
      action: 'deny' as const,
      chain: [] as string[],
    };

    // Verify the precondition directly against the engine, as its own
    // assertion. If dryRun's shadowing behaviour ever regresses, this fails
    // loudly instead of a guard quietly skipping the real assertion again.
    const dry = CC.dryRun(spec) as { shadowed: { by: string }[] };
    expect(dry.shadowed.length).toBeGreaterThan(0);
    // classified-helion tags two VPCs (vpc-dmz-03, nb-gpu-net), both of
    // which emit a storage flow — both shadowed by the SAME enforced rule.
    // More than one shadowed entry, one unique shadower: exactly the case
    // deduplication in the component exists for.
    expect(dry.shadowed.length).toBeGreaterThan(1);
    const uniqueNames = Array.from(new Set(dry.shadowed.map(s => s.by)));
    expect(uniqueNames).toEqual(['Inspect classified egress']);

    renderBuilder();
    fireEvent.click(screen.getByRole('button', { name: /new rule/i }));
    await screen.findByRole('dialog');
    fireEvent.change(screen.getByLabelText(/rule name/i), { target: { value: spec.name } });
    fireEvent.change(screen.getByLabelText(/source tag/i), { target: { value: 'classified-helion' } });
    fireEvent.change(screen.getByLabelText(/destination/i), { target: { value: 'storage' } });

    const preview = await screen.findByTestId('rule-preview');
    const shadowLine = within(preview).getByText(/^Shadowed by /);
    expect(shadowLine.textContent).toBe('Shadowed by Inspect classified egress');
  });
});
