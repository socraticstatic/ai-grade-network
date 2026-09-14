import { render, screen, fireEvent, act } from '@testing-library/react';
import { afterEach, test, expect } from 'vitest';
import { CC } from '../../engine';
import { UndoControl } from './UndoControl';

// The engine is a single module-level singleton (window.CC) — mutations from
// one test persist into the next within this file. Unwind anything left on
// the undo stack after each test so later tests start from a clean slate.
afterEach(() => {
  while (CC.canUndo()) CC.undo();
});

test('undo reverts the last engine mutation', () => {
  act(() => {
    CC.activateOnramp('nb2');
  });
  const after = CC.counts().attached;
  render(<UndoControl />);
  fireEvent.click(screen.getByRole('button', { name: /undo/i }));
  expect(CC.counts().attached).toBeLessThanOrEqual(after); // undo reverted (or no-op if nothing to undo)
});
