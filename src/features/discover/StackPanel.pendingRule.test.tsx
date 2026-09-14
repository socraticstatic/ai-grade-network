import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect, afterEach } from 'vitest';
import { StackPanel } from './StackPanel';
import { setPendingRuleSpec, takePendingRuleSpec } from './stackFigures';
import { CC } from '../../engine';

afterEach(() => { while (CC.canUndo()) CC.undo(); });

/* ?draft=rule-new is RuleBuilder's "Stage this rule" landing spot (a seeded
   submit — see RuleBuilder.stageNotAuthor.test.tsx). The spec itself rides
   the read-once holder in stackFigures.ts, not the URL, so these tests hand
   one over directly the same way the builder does. */
describe('?draft=rule-new', () => {
  test('a spec handed over via setPendingRuleSpec is staged and shown in the tray', async () => {
    const spec = {
      name: 'stage-guard-pending-rule',
      src: { tag: 'any', cloud: 'any' },
      dst: 'dns-exfil',
      ports: 'any',
      action: 'deny',
      chain: [] as string[],
    };
    setPendingRuleSpec(spec);

    render(
      <MemoryRouter initialEntries={['/discover?draft=rule-new']}>
        <StackPanel />
      </MemoryRouter>,
    );

    expect(await screen.findByTestId('design-tray')).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`Rule · ${spec.name}`))).toBeInTheDocument();
  });

  test('nothing pending stages nothing and does not throw', async () => {
    // Drain any leftover from a prior test in this file so this run really
    // starts from "nothing pending".
    takePendingRuleSpec();

    expect(() =>
      render(
        <MemoryRouter initialEntries={['/discover?draft=rule-new']}>
          <StackPanel />
        </MemoryRouter>,
      ),
    ).not.toThrow();

    expect(screen.queryByTestId('design-tray')).not.toBeInTheDocument();
    expect(screen.queryByText(/Proposed by Andi/i)).not.toBeInTheDocument();
  });
});
