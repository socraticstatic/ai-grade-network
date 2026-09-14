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
    expect(await screen.findByTestId('proposal-note')).toHaveTextContent(/shared-services/i);
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

  test('the ordering trap: policy-new is not swallowed by the startsWith(policy-) branch', async () => {
    // The widget's older branch matches param.startsWith('policy-'), slices
    // off 'policy-' to get a tag, and hardcodes {enforced: true}. If that
    // branch ran instead of ours, it would try to stage tag "new" (which the
    // seeded engine has no policy for, so it would stage nothing at all) and
    // it would never see the full spec's scope/budget/guardrail. Asserting
    // the whole patch rode through, under the real tag, proves our exact
    // match ran first.
    setPendingPolicySpec({
      tag: 'shared-services', scope: 'no-external', budget: 900000,
      softPct: 70, guardrail: true, enforced: false,
    });
    render(
      <MemoryRouter initialEntries={['/discover?draft=policy-new']}>
        <StackPanel />
      </MemoryRouter>,
    );
    // The real tag from the spec, not the literal string "new" the widget
    // branch would have sliced out of the param.
    expect(await screen.findByTestId('proposal-note')).toHaveTextContent(/shared-services/i);
    // The whole patch, not the widget branch's hardcoded {enforced: true}.
    expect(await screen.findByText(/900,000 tokens\/day/i)).toBeInTheDocument();
    expect(await screen.findByText(/guardrail on/i)).toBeInTheDocument();
    expect(await screen.findByText(/scope no-external/i)).toBeInTheDocument();
    // enforced: false in the spec renders as "draft", never "enforced".
    expect(await screen.findByText(/draft/i)).toBeInTheDocument();
    expect(screen.queryByText(/·\s*enforced\b/i)).not.toBeInTheDocument();
  });

  // Finding 2: StackPanel spreads the WHOLE spec into the patch (softPct and
  // group included), and setTokenPolicy shallow-merges the whole patch onto
  // the estate - but the patch type only named scope/budget/guardrail/
  // enforced, so moveLabel never stated softPct or group and a reviewer
  // committed both fields sight unseen. Widening the patch type and
  // moveLabel closes that gap; this proves the tray now says both.
  test('the tray states the alert threshold and the group a policy patch would commit', async () => {
    setPendingPolicySpec({
      tag: 'west-workloads', scope: 'private-only', budget: 1_200_000,
      softPct: 65, guardrail: true, enforced: false, group: 'west-workloads',
    });
    render(
      <MemoryRouter initialEntries={['/discover?draft=policy-new']}>
        <StackPanel />
      </MemoryRouter>,
    );
    expect(await screen.findByText(/alert at 65%/i)).toBeInTheDocument();
    expect(await screen.findByText(/group west-workloads/i)).toBeInTheDocument();
  });
});
