import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect, afterEach } from 'vitest';
import { TokenPolicies } from './TokenPolicies';
import { CC } from '../../engine';

afterEach(() => { while (CC.canUndo()) CC.undo(); });

/* setTokenPolicy shallow-merges into the LIVE policy object and pushes no
   undo entry of its own (see src/engine/state-intents.softPct.test.ts for
   the same idiom) - the undo loop above cannot revert it, and a later
   declareIntent's undo entry would snapshot the ALREADY-patched policy and
   simply reapply it. So any test that patches rd-helion here restores its
   exact original object in a SECOND afterEach, registered after the undo
   loop so it always runs last and genuinely wins. Without this, "enforced"
   set true by an earlier test would still be true in the "Enforce stages"
   test below, and the conditional Enforce link would never render. */
let pendingPolicyRestore: { tag: string; original: Record<string, unknown> } | null = null;
afterEach(() => {
  if (!pendingPolicyRestore) return;
  const { tag, original } = pendingPolicyRestore;
  const live = CC.tokenPolicy!(tag) as Record<string, unknown>;
  Object.keys(live).forEach(k => { delete live[k]; });
  Object.assign(live, original);
  pendingPolicyRestore = null;
});

function withRestoredPolicy(tag: string, run: () => void) {
  pendingPolicyRestore = { tag, original: { ...(CC.tokenPolicy!(tag) as Record<string, unknown>) } };
  run();
}

const show = () => render(<MemoryRouter><TokenPolicies /></MemoryRouter>);
const rowFor = (tag: string) => screen.getByText(tag).closest('tr')!;

describe('the token-policy status pill', () => {
  test('an unenforced policy reads Draft', () => {
    show();
    expect(within(rowFor('rd-helion')).getByTestId('policy-status')).toHaveTextContent(/draft/i);
  });

  test('enforced with no cap intent reads Armed, not Enforcing', () => {
    withRestoredPolicy('rd-helion', () => {
      CC.setTokenPolicy('rd-helion', { enforced: true });
      expect(CC.intentCapEnforced('rd-helion')).toBe(false);
      show();
      expect(within(rowFor('rd-helion')).getByTestId('policy-status')).toHaveTextContent(/armed/i);
    });
  });

  test('enforced with an enforce-mode cap intent reads Enforcing', () => {
    withRestoredPolicy('rd-helion', () => {
      CC.setTokenPolicy('rd-helion', { enforced: true });
      const entry = CC.intentCatalog().find(c => c.key === 'cap-token-spend')!;
      const scope = entry.scopes().find((s: { id: string }) => s.id === 'rd-helion')!;
      const declared = CC.declareIntent('cap-token-spend', scope, 'enforce')!;
      show();
      expect(within(rowFor('rd-helion')).getByTestId('policy-status')).toHaveTextContent(/enforcing/i);
      CC.removeIntent(declared.id);
    });
  });

  /* Finding: the Armed explanation lived only in a `title` attribute, which
     screen readers generally do not announce on an element that already has
     an accessible name from its own visible text ("Armed"). Assert the
     structural fix (aria-describedby wiring a real description) rather than
     the title's content, which the accessible-description algorithm would
     already have picked up as a fallback and so would not tell title and
     aria-describedby apart. */
  test('Armed exposes its explanation via aria-describedby, not title alone', () => {
    withRestoredPolicy('rd-helion', () => {
      CC.setTokenPolicy('rd-helion', { enforced: true });
      show();
      const pill = within(rowFor('rd-helion')).getByTestId('policy-status');
      expect(pill).toHaveAttribute('aria-describedby');
      expect(pill).toHaveAccessibleDescription(/no enforce-mode cap-token-spend intent/i);
    });
  });

  /* rd-helion's seeded scope is self-hosted (a gating scope) and it starts
     unenforced — a Draft policy that reads as "nothing happens yet" while
     the scope gate already denies anything off the self-hosted allowlist,
     independent of the enforced flag. That gap gets the same treatment. */
  test('Draft on a gating scope explains the scope gate is independent of enforced state', () => {
    show();
    const pill = within(rowFor('rd-helion')).getByTestId('policy-status');
    expect(pill).toHaveAttribute('aria-describedby');
    expect(pill).toHaveAccessibleDescription(/self-hosted/i);
  });

  test('Enforce stages instead of mutating', () => {
    const before = JSON.stringify(CC.tokenPolicyList());
    show();
    const enforce = within(rowFor('rd-helion')).getByRole('link', { name: /enforce/i });
    expect(enforce.getAttribute('href')).toBe('/discover?draft=policy-rd-helion');
    expect(JSON.stringify(CC.tokenPolicyList())).toBe(before);
  });
});
