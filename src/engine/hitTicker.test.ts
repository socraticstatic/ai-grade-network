import { describe, it, expect } from 'vitest';
import { CC } from './index';

/* F1. The policy-hit ticker used to be an unconditional `setInterval` fired at
   module load with no handle kept, so every test file that imported the engine
   started a 3s timer that nothing could clear. It drives real product state
   (policy hit counters via CC.policyHits, and the AI token meters through
   state-billing's tickTokens), so it must still run in the app - it just has
   to be startable, stoppable, and silent under test. */
describe('hit ticker lifecycle', () => {
  it('does not schedule itself when the engine is imported under test', () => {
    expect(CC.hitsRunning()).toBe(false);
  });

  it('start is idempotent and stop actually clears the timer', () => {
    expect(CC.startHits()).toBe(true);
    expect(CC.hitsRunning()).toBe(true);
    // a second start must not leak a second interval
    expect(CC.startHits()).toBe(false);
    expect(CC.stopHits()).toBe(true);
    expect(CC.hitsRunning()).toBe(false);
    // stopping an already-stopped ticker is a no-op, not a throw
    expect(CC.stopHits()).toBe(false);
  });
});
