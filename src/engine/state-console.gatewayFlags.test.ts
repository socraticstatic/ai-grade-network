import { describe, it, expect } from 'vitest';
import { CC } from './index';

/* The Cost tab's warning/achieved states are engine state, not component
   state: "Routing policy not configured" must survive a reload and must
   reverse under the same Undo every other commitment reverses under. The
   flags ride the undo snapshot (state.ts), so this is a real test of that
   plumbing, not of a local boolean. */
describe('gateway optimization flags', () => {
  it('start off, flip on, and undo restores', () => {
    expect(CC.gatewayFlags()).toEqual({ routing: false, caching: false });
    CC.setGatewayFlag('routing', true);
    expect(CC.gatewayFlags().routing).toBe(true);
    CC.undo();
    expect(CC.gatewayFlags().routing).toBe(false);
    // caching was untouched throughout
    expect(CC.gatewayFlags().caching).toBe(false);
  });
});
