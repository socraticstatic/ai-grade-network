import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CC } from './index';

/* The agent ticker had the same defect the hit ticker had (see
   hitTicker.test.ts): `state-console.ts` fired `setInterval(agentTick, 7000)`
   at module load with no gate and no handle, so it ran for the life of every
   test process. A tick issues a traced request and meters it, so it moves the
   token buckets under any assertion about a resting estate — every AI test
   file had to suspend the agents at module scope to stay deterministic, and
   the one that forgot passed only because vitest finished before 7s elapsed.

   It still runs in the app. It is now startable, stoppable, and silent under
   test. What a tick DOES is unchanged and is not what these tests pin. */

type Ev = { type?: string; agent?: unknown } | undefined;

/** Agent ticks announce themselves as a `hits` event carrying an `agent`
 *  payload; nothing else in the engine emits that shape. */
const countAgentTicks = () => {
  let n = 0;
  const un = CC.subscribe((ev: Ev) => {
    if (ev && ev.type === 'hits' && ev.agent) n++;
  });
  return { ticks: () => n, stop: un };
};

describe('agent ticker lifecycle', () => {
  it('does not schedule itself when the engine is imported under test', () => {
    expect(CC.agentsRunning!()).toBe(false);
  });

  it('start is idempotent and stop actually clears the timer', () => {
    expect(CC.startAgents!()).toBe(true);
    expect(CC.agentsRunning!()).toBe(true);
    // a second start must not leak a second interval
    expect(CC.startAgents!()).toBe(false);
    expect(CC.stopAgents!()).toBe(true);
    expect(CC.agentsRunning!()).toBe(false);
    // stopping an already-stopped ticker is a no-op, not a throw
    expect(CC.stopAgents!()).toBe(false);
  });
});

describe('agent ticker does not fire when stopped', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => {
    CC.stopAgents!();
    vi.useRealTimers();
  });

  it('stays silent across many tick intervals while stopped', () => {
    const watch = countAgentTicks();
    expect(CC.agentsRunning!()).toBe(false);

    vi.advanceTimersByTime(7000 * 5);

    expect(watch.ticks(), 'a stopped ticker fired anyway').toBe(0);
    watch.stop();
  });

  it('fires once per interval while started, and stops on stop()', () => {
    const watch = countAgentTicks();

    CC.startAgents!();
    vi.advanceTimersByTime(7000);
    expect(watch.ticks(), 'a started ticker never fired').toBe(1);
    vi.advanceTimersByTime(7000 * 2);
    expect(watch.ticks()).toBe(3);

    CC.stopAgents!();
    vi.advanceTimersByTime(7000 * 5);
    expect(watch.ticks(), 'stop() left the timer alive').toBe(3);
    watch.stop();
  });
});
