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

  // Finding 2: the locked identity field used to carry BOTH `disabled` and
  // `readOnly`. `disabled` wins, so the field was unfocusable and most
  // screen readers skip a disabled control entirely - a screen-reader user
  // had no way to discover which identity was being edited. `readOnly`
  // alone keeps the field focusable and announced while still blocking
  // edits, so the assertion here is accessibility-oriented (focus +
  // read-only), never a `.toBeDisabled()` check - that check would pass on
  // the very bug this finding fixes.
  test('edit mode seeds from the existing policy and locks the identity via readOnly, not disabled', async () => {
    render(
      <MemoryRouter>
        <TokenPolicyBuilder open onOpenChange={() => {}} editTag="rd-helion" />
      </MemoryRouter>,
    );
    await screen.findByRole('dialog');
    const existing = CC.tokenPolicy('rd-helion') as { budget: number; scope: string };
    expect((screen.getByLabelText(/budget/i) as HTMLInputElement).value).toBe(String(existing.budget));
    const identityField = screen.getByLabelText(/identity/i);
    expect(identityField).toHaveAttribute('readonly');
    expect(identityField).not.toBeDisabled();
    // A disabled control cannot be focused; a read-only one can - and the
    // dialog's focus-on-open effect (which no-ops on a disabled element)
    // must actually land here in edit mode.
    await waitFor(() => expect(identityField).toHaveFocus());
  });

  // Finding 1: Number('') coerces a cleared Budget field to 0. The engine's
  // meter reads that as "at capacity" the instant it's enforced (a division
  // by zero the meter computes as 100%), and combined with an enforce-mode
  // cap-token-spend intent that denies every request for the identity - with
  // no warning anywhere and Stage still enabled, since 0 differs from the
  // initial 1,000,000 and the `untouched` guard only checks for difference.
  test('a cleared budget cannot be staged and names the problem explicitly', async () => {
    open();
    await screen.findByRole('dialog');
    fireEvent.change(screen.getByLabelText(/budget/i), { target: { value: '' } });
    expect(screen.getByTestId('policy-stage')).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent(/budget/i);
    // Defense in depth: submit() must refuse even if the disabled attribute
    // were ever bypassed.
    fireEvent.click(screen.getByTestId('policy-stage'));
    expect(navigate).not.toHaveBeenCalled();
    // The preview must not silently render nothing in this state.
    expect(screen.getByTestId('policy-preview')).toHaveTextContent(/budget/i);
  });

  test('a negative or zero budget is treated the same as a cleared one', async () => {
    open();
    await screen.findByRole('dialog');
    fireEvent.change(screen.getByLabelText(/budget/i), { target: { value: '-5' } });
    expect(screen.getByTestId('policy-stage')).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent(/budget/i);
  });

  // Finding 2: softPct has the same Number('') === 0 coercion. It has no
  // masking effect on the preview today, but a percent outside 1-100 is
  // still meaningless and should block Stage the same way.
  test('an Alert-at percent outside 1-100 cannot be staged and names the problem', async () => {
    open();
    await screen.findByRole('dialog');
    fireEvent.change(screen.getByLabelText(/alert at/i), { target: { value: '' } });
    expect(screen.getByTestId('policy-stage')).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent(/alert at/i);
  });

  // Finding 3: `untouched` compares against INITIAL_FORM, not the seeded
  // values, so in edit mode Stage is enabled from the first render - the
  // same "accept the seeded draft as-is" idiom RuleBuilder's seed prop
  // documents. Made explicit here rather than left as an untested side
  // effect.
  test('edit mode enables Stage immediately, before any field is touched', async () => {
    render(
      <MemoryRouter>
        <TokenPolicyBuilder open onOpenChange={() => {}} editTag="rd-helion" />
      </MemoryRouter>,
    );
    await screen.findByRole('dialog');
    expect(screen.getByTestId('policy-stage')).not.toBeDisabled();
  });

  // Finding 3: in edit mode the identity control was a <select> locked via
  // `disabled`, whose value the seeding effect sets from the policy's OWN
  // group (independent of groupList()). When that group id is not among the
  // rendered <option>s - e.g. a policy carrying a group the estate no
  // longer lists, a state the policy table already renders as a live row
  // with an Edit button - the browser falls back to selectedIndex 0 and
  // displays a DIFFERENT identity than the one actually staged. West
  // Workloads already carries group:'west-workloads'; patching it to a
  // ghost id reproduces exactly that state without inventing a new policy
  // shape. setTokenPolicy pushes no undo entry, so the patched tag is
  // restored explicitly, same idiom as TokenPolicies.status.test.tsx's
  // withRestoredPolicy.
  test('edit mode displays the staged identity even when its group is not among the rendered options', async () => {
    const tag = 'west-workloads';
    const original = { ...(CC.tokenPolicy!(tag) as Record<string, unknown>) };
    try {
      CC.setTokenPolicy!(tag, { group: 'ghost-group' });
      const groups = CC.groupList!() as { id: string }[];
      expect(groups.some(g => g.id === 'ghost-group')).toBe(false);

      render(
        <MemoryRouter>
          <TokenPolicyBuilder open onOpenChange={() => {}} editTag={tag} />
        </MemoryRouter>,
      );
      await screen.findByRole('dialog');

      const identityControl = screen.getByLabelText(/identity/i) as HTMLInputElement | HTMLSelectElement;
      // The staged identity is the ghost group, not whatever option a
      // <select> falls back to (selectedIndex 0) when its value is not
      // among its <option>s.
      expect(identityControl.value).toMatch(/ghost-group/i);
    } finally {
      const live = CC.tokenPolicy!(tag) as Record<string, unknown>;
      Object.keys(live).forEach(k => { delete live[k]; });
      Object.assign(live, original);
    }
  });

  // Finding 4: the untouched-form reason lived only in a `title` attribute
  // on the disabled Stage button - unfocusable and unannounced. The invalid-
  // budget and invalid-softPct cases already do this correctly with
  // role="alert" + aria-describedby; the untouched case gets the same
  // idiom rather than a fourth instance of the same shape of bug.
  test('the untouched-form reason is exposed to assistive tech, not just a title', async () => {
    open();
    await screen.findByRole('dialog');
    const stage = screen.getByTestId('policy-stage');
    expect(stage).toBeDisabled();
    expect(stage).toHaveAccessibleDescription(/edit the form before staging/i);
    expect(stage).not.toHaveAttribute('title');
  });

  // Finding 3: the untouched-form hint rendered with role="alert" on the
  // PRISTINE form's first paint - nothing had happened yet for it to be
  // reacting to. role="alert" is for state that becomes true in response to
  // something; on initial render it does not even announce, and visually it
  // read as an error before a person had typed anything. The invalid-budget
  // and invalid-softPct warnings ARE genuine alerts (they react to an edit)
  // and must keep their role.
  test('the untouched hint is not an alert on first paint, but stays wired to Stage', async () => {
    open();
    await screen.findByRole('dialog');
    // Fresh, untouched form: nothing here should announce as an alert.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    // The hint text still exists and the Stage button is still described by
    // it - only the alert semantics are gone, not the wiring.
    expect(screen.getByText(/edit the form before staging/i)).toBeInTheDocument();
    expect(screen.getByTestId('policy-stage')).toHaveAccessibleDescription(/edit the form before staging/i);
  });

  test('a genuinely invalid budget still announces as an alert', async () => {
    open();
    await screen.findByRole('dialog');
    fireEvent.change(screen.getByLabelText(/budget/i), { target: { value: '' } });
    expect(screen.getByRole('alert')).toHaveTextContent(/budget/i);
  });
});
