import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect, afterEach } from 'vitest';
import { RuleBuilder } from './RuleBuilder';
import { CC } from '../../engine';

afterEach(() => { while (CC.canUndo()) CC.undo(); });

// RuleBuilder now navigates (useNavigate) when a seeded submit stages a
// rule, so every render needs a Router ancestor even where these tests
// never seed it — the hook itself throws without one.
const renderBuilder = () => render(<MemoryRouter><RuleBuilder /></MemoryRouter>);

describe('RuleBuilder as a dialog', () => {
  test('is a dialog and focuses its first field on open', async () => {
    renderBuilder();
    fireEvent.click(screen.getByRole('button', { name: /new rule/i }));
    const dialog = await screen.findByRole('dialog');
    // The form renders inline in the page flow (no overlay, no focus trap,
    // a fully tab-reachable background) - aria-modal="true" would tell a
    // screen reader the rest of the page is unavailable, which is false.
    expect(dialog).not.toHaveAttribute('aria-modal');
    await waitFor(() => expect(screen.getByLabelText(/rule name/i)).toHaveFocus());
  });

  test('Escape closes it', async () => {
    renderBuilder();
    fireEvent.click(screen.getByRole('button', { name: /new rule/i }));
    await screen.findByRole('dialog');
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  test('an untouched form cannot author the deny-any-to-any default', async () => {
    renderBuilder();
    fireEvent.click(screen.getByRole('button', { name: /new rule/i }));
    await screen.findByRole('dialog');
    expect(screen.getByRole('button', { name: /add rule/i })).toBeDisabled();
  });

  /* Forcing the engine's null path: the destination <select> only ever
     offers group options for groups that currently exist (RuleBuilder.tsx
     renders the "Groups" optgroup straight from groupList()), so there is
     no "group:no-such-group" option to pick. Instead: select a real live
     group as the destination, then remove that group from the engine out
     from under the already-chosen selection - the same "select() returns
     an id for validDst() to reject later" gap addRuleGroups.test.ts's
     "rejects a structured dst naming a group that does not exist" case
     covers directly. CC.removeGroup snapshots via pushUndo before it
     mutates (state-groups.ts), so the shared afterEach's undo loop above
     restores west-workloads for every later test regardless of this one's
     outcome. */
  test('a failed author is visible and keeps the form open', async () => {
    renderBuilder();
    fireEvent.click(screen.getByRole('button', { name: /new rule/i }));
    await screen.findByRole('dialog');
    fireEvent.change(screen.getByLabelText(/rule name/i), { target: { value: 'x' } });
    fireEvent.change(screen.getByLabelText(/destination/i), { target: { value: 'group:west-workloads' } });

    act(() => {
      CC.removeGroup('west-workloads');
    });

    fireEvent.click(screen.getByRole('button', { name: /add rule/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not/i);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
