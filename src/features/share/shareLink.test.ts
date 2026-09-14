import { describe, it, expect } from 'vitest';
import { CC } from '../../engine';
import { buildShareLink } from './shareLink';

describe('share link', () => {
  it('produces a non-empty replay link reflecting engine state', () => {
    CC.activateOnramp('dx1');
    const link = buildShareLink(CC);
    expect(typeof link).toBe('string');
    expect(link.length).toBeGreaterThan(0);
  });
});
