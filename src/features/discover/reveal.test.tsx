import { renderHook } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useRevealStagger } from './useRevealStagger';

const mockMatchMedia = (reduced: boolean) => {
  window.matchMedia = ((q: string) => ({
    matches: reduced && q.includes('prefers-reduced-motion'),
    addEventListener: () => {}, removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
};

beforeEach(() => sessionStorage.clear());

describe('useRevealStagger', () => {
  it('staggers by 80ms per index on first mount', () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useRevealStagger(5));
    expect(result.current(3)).toMatchObject({ animationDelay: '240ms' });
  });

  it('is a no-op under prefers-reduced-motion', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useRevealStagger(5));
    expect(result.current(3)).toEqual({});
  });

  it('is a no-op on second mount in the same session', () => {
    mockMatchMedia(false);
    renderHook(() => useRevealStagger(5)); // first mount sets the flag
    const { result } = renderHook(() => useRevealStagger(5));
    expect(result.current(0)).toEqual({});
  });
});
