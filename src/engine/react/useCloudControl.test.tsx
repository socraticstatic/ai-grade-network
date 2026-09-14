import { render, screen, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CC } from '../index';
import { useCloudControl } from './useCloudControl';

function Attached() {
  const n = useCloudControl(cc => cc.counts().attached);
  return <span data-testid="n">{n}</span>;
}

function CountsObject() {
  // Selector returns a NEW object every call (cc.counts() is not memoized by
  // the engine) — this is the case useSyncExternalStore chokes on if
  // getSnapshot itself returns a fresh object each time.
  const counts = useCloudControl(cc => cc.counts());
  return <span data-testid="attached">{counts.attached}</span>;
}

describe('useCloudControl', () => {
  // Ordered first deliberately: it measures the engine's listener array, and
  // the mount-and-mutate tests below leave their components mounted.
  it('unsubscribes from the engine on unmount', () => {
    const listeners = (CC as unknown as { _: { listeners: unknown[] } })._.listeners;
    const before = listeners.length;
    const { unmount } = render(<Attached />);
    expect(listeners.length).toBeGreaterThan(before);
    unmount();
    expect(listeners.length).toBe(before);
  });

  it('re-renders when the engine mutates (primitive selector)', () => {
    render(<Attached />);
    const before = Number(screen.getByTestId('n').textContent);
    act(() => {
      CC.activateOnramp('dx1');
    });
    expect(Number(screen.getByTestId('n').textContent)).toBeGreaterThan(before);
  });

  it('does not throw/loop for an object-returning selector, and updates after a mutation', () => {
    expect(() => render(<CountsObject />)).not.toThrow();
    const before = Number(screen.getByTestId('attached').textContent);
    // Use a different onramp than the previous test (dx1 is already active by
    // now) so this mutation is a real state change, not a no-op.
    act(() => {
      CC.activateOnramp('er1');
    });
    expect(Number(screen.getByTestId('attached').textContent)).toBeGreaterThan(before);
  });
});
