import { describe, it, expect, afterEach } from 'vitest';
import { CC } from '../../engine';
import { applyEstateProfile } from '../../engine/estateProfile';
import { stageRollup } from './stageRollup';

/* The board is a meta-rollup of the lifecycle: every stage reports the
   proof metric the deck's value map assigned it, and every card is a door
   into the stage that owns it. */
describe('stageRollup', () => {
  afterEach(() => applyEstateProfile(CC as never, 'acme'));

  it('covers all five stages on both layers, each with a route into its own screen', () => {
    for (const surface of ['naas', 'ai'] as const) {
      const cards = stageRollup(CC as never, surface);
      expect(cards.map(c => c.key)).toEqual(['discover', 'connect', 'govern', 'observe', 'cost']);
      for (const c of cards) {
        expect(c.value, `${surface}/${c.key} must state a figure`).toBeTruthy();
        expect(c.caption, `${surface}/${c.key} must say what it measures`).toBeTruthy();
        expect(c.to.startsWith('/'), `${surface}/${c.key} must be a door`).toBe(true);
      }
    }
  });

  it('a progress bar is only drawn where the stage has an honest denominator', () => {
    for (const c of stageRollup(CC as never, 'naas')) {
      if (c.progress !== null) {
        expect(c.progress).toBeGreaterThanOrEqual(0);
        expect(c.progress).toBeLessThanOrEqual(1);
      }
    }
  });

  it('reports the bank estate at bank scale, not ACME figures', () => {
    applyEstateProfile(CC as never, 'meridian');
    const discover = stageRollup(CC as never, 'naas').find(c => c.key === 'discover')!;
    expect(discover.value).toBe('4,183');
    const connect = stageRollup(CC as never, 'naas').find(c => c.key === 'connect')!;
    expect(connect.detail).toMatch(/of 4,183 sites reach us today/);
  });

  it('flags a stage as alarming only when the estate is actually losing there', () => {
    const cards = stageRollup(CC as never, 'naas');
    const cost = cards.find(c => c.key === 'cost')!;
    const egressPub = (CC.egress() as { pub: number }).pub;
    expect(cost.alarm).toBe(egressPub > 0);
  });
});
