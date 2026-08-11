import { describe, it, expect, afterEach } from 'vitest';
import { advance, advisorDone, advisorDoneKey, markAdvisorDone } from './advisorPhase';

describe('advisorPhase', () => {
  describe('advance', () => {
    it('observe -> intake on start', () => {
      expect(advance('observe', { type: 'start' })).toBe('intake');
    });

    it('intake -> scanning on credential-valid', () => {
      expect(advance('intake', { type: 'credential-valid' })).toBe('scanning');
    });

    it('scanning -> ready on scan-complete', () => {
      expect(advance('scanning', { type: 'scan-complete' })).toBe('ready');
    });

    it('an event that does not apply to the current phase is a no-op', () => {
      expect(advance('observe', { type: 'credential-valid' })).toBe('observe');
      expect(advance('observe', { type: 'scan-complete' })).toBe('observe');
      expect(advance('intake', { type: 'start' })).toBe('intake');
      expect(advance('intake', { type: 'scan-complete' })).toBe('intake');
      expect(advance('scanning', { type: 'start' })).toBe('scanning');
      expect(advance('scanning', { type: 'credential-valid' })).toBe('scanning');
    });

    it('ready never advances further, on any event', () => {
      expect(advance('ready', { type: 'start' })).toBe('ready');
      expect(advance('ready', { type: 'credential-valid' })).toBe('ready');
      expect(advance('ready', { type: 'scan-complete' })).toBe('ready');
    });
  });

  describe('done flag', () => {
    afterEach(() => {
      localStorage.removeItem(advisorDoneKey('acme'));
      localStorage.removeItem(advisorDoneKey('meridian'));
    });

    it('defaults to not-done for a profile never marked', () => {
      expect(advisorDone('acme')).toBe(false);
    });

    it('markAdvisorDone flips this profile only', () => {
      markAdvisorDone('acme');
      expect(advisorDone('acme')).toBe(true);
      expect(advisorDone('meridian')).toBe(false);
    });

    it('persists under the documented key', () => {
      markAdvisorDone('acme');
      expect(localStorage.getItem('advisor:acme:done')).toBe('1');
    });

    it('tolerates a localStorage that throws (private mode / quota)', () => {
      const realSet = localStorage.setItem;
      localStorage.setItem = () => {
        throw new Error('quota exceeded');
      };
      try {
        expect(() => markAdvisorDone('acme')).not.toThrow();
      } finally {
        localStorage.setItem = realSet;
      }

      const realGet = localStorage.getItem;
      localStorage.getItem = () => {
        throw new Error('blocked');
      };
      try {
        expect(advisorDone('acme')).toBe(false);
      } finally {
        localStorage.getItem = realGet;
      }
    });
  });
});
