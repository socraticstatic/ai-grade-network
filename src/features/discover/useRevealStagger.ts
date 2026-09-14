import { useMemo } from 'react';
import type { CSSProperties } from 'react';

const KEY = 'cc-discover-revealed';

export function useRevealStagger(count: number): (index: number) => CSSProperties {
  return useMemo(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const seen = sessionStorage.getItem(KEY) === '1';
    if (!reduced && !seen) sessionStorage.setItem(KEY, '1');
    if (reduced || seen) return () => ({});
    return (index: number) => ({
      animationDelay: `${index * 80}ms`,
      animationName: 'cc-reveal',
      animationDuration: '400ms',
      animationTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
      animationFillMode: 'backwards',
    });
  }, [count]);
}
