import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect } from 'vitest';
import { StackPanel } from './StackPanel';
import { CC } from '../../engine';

/**
 * Finding 1 (CRITICAL): CC.setTokenPolicy shallow-merges straight onto the
 * estate and pushes no undo entry (verified against state-console.ts) -
 * unlike every other move kind here, which pushes one before it mutates.
 * Once this branch made the review tray the SOLE path for policy
 * mutations, the commit banner's blanket "Undo reverts them" became a lie
 * on the main path for a policy-only commit: CC.canUndo() is null
 * afterward and CC.undo() restores nothing of the policy.
 *
 * setTokenPolicy pushes no undo entry, so an afterEach undo loop cannot
 * revert the patched tag - restore it explicitly, same idiom as
 * TokenPolicies.status.test.tsx's withRestoredPolicy.
 */
async function withRestoredPolicy(tag: string, run: () => Promise<void>) {
  const original = { ...(CC.tokenPolicy!(tag) as Record<string, unknown>) };
  try {
    await run();
  } finally {
    const live = CC.tokenPolicy!(tag) as Record<string, unknown>;
    Object.keys(live).forEach(k => { delete live[k]; });
    Object.assign(live, original);
  }
}

const renderAt = (entry: string) => render(
  <MemoryRouter initialEntries={[entry]}><StackPanel /></MemoryRouter>,
);

describe('StackPanel — a policy-only commit does not promise an Undo it cannot deliver', () => {
  test('committing a policy-only move: the banner is honest, and the engine backs it up', async () => {
    await withRestoredPolicy('rd-helion', async () => {
      renderAt('/discover?draft=policy-rd-helion');
      await waitFor(() => expect(screen.getByTestId('design-tray')).toBeInTheDocument());

      fireEvent.click(screen.getByTestId('design-commit'));

      const tray = await screen.findByTestId('design-tray');
      // The lying claim this finding is about: a policy-only commit is not
      // undo-covered, so the banner must not make the blanket promise.
      expect(tray.textContent).not.toMatch(/undo reverts them/i);
      // It must say what a person can do instead.
      expect(tray.textContent?.toLowerCase()).toContain('re-edit');

      // Ground the copy in the engine's actual behaviour: nothing to undo.
      expect(CC.canUndo()).toBeNull();
    });
  });
});
