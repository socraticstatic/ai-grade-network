/**
 * Demo lifecycle clock — stands in for what AT&T and AWS do on their own.
 *
 * Two motions, both invisible-by-design in the real product:
 *  - Provisioning resolves to Live after a bounded wait (both providers confirm).
 *  - A reduced path heals itself while the connection stays Live (Feature redrive).
 *
 * The clock never touches Pending (the customer owns that move — uploading the key),
 * never touches Needs attention (that state requires action), and never resurrects
 * Deleting/Deleted. Expired stays derived from the key's age.
 *
 * All timing state lives ON the connection (configuration.lmccProvisioningSince /
 * lmccReducedSince) — never in module scope. Vite HMR can duplicate module instances,
 * and a ghost interval with its own private Map silently never fires; store-resident
 * timestamps make every instance see the same truth. The interval handle is likewise
 * global so a newer instance always replaces an older one.
 */

const PROVISION_MS = 45_000; // long enough to feel the wait, short enough for a demo
const HEAL_MS = 90_000;      // a reduced state persists long enough to be understood
export const CLOCK_TICK_MS = 5_000;

type StoreLike = {
  getState: () => any;
  setState: (partial: any) => void;
};

const isLmcc = (c: any) => c?.configuration?.isLmcc === true;

function patchConfig(store: StoreLike, id: string, patch: Record<string, unknown>) {
  store.setState({
    connections: store.getState().connections.map((x: any) =>
      x.id === id ? { ...x, configuration: { ...x.configuration, ...patch } } : x,
    ),
  });
}

export function tickLmccLifecycle(store: StoreLike, now: number): void {
  const state = store.getState();
  const connections: any[] = state.connections ?? [];

  for (const c of connections) {
    if (!isLmcc(c)) continue;
    const cfg = c.configuration ?? {};

    // Provisioning → Live once both providers have had their bounded wait.
    if (c.status === 'Provisioning') {
      const since = cfg.lmccProvisioningSince;
      if (typeof since !== 'number') {
        patchConfig(store, c.id, { lmccProvisioningSince: now });
      } else if (now - since >= PROVISION_MS) {
        patchConfig(store, c.id, { lmccProvisioningSince: undefined });
        state.completeProvisioning?.(c.id); // flips to Active and raises the Live notification
        state.logActivity?.({
          type: 'live',
          connectionId: c.id,
          message: 'Went Live — both AT&T and AWS confirmed the connection.',
        });
      }
      continue;
    }

    // Live with a down path: self-healing restores one path at a time.
    const paths = Number(cfg.lmccActivePaths ?? 4);
    if (c.status === 'Active' && paths >= 1 && paths < 4) {
      const since = cfg.lmccReducedSince;
      const stampedFor = cfg.lmccReducedPathsMark;
      if (typeof since !== 'number' || stampedFor !== paths) {
        patchConfig(store, c.id, { lmccReducedSince: now, lmccReducedPathsMark: paths });
      } else if (now - since >= HEAL_MS) {
        const healed = paths + 1;
        patchConfig(store, c.id, {
          lmccActivePaths: healed,
          lmccReducedSince: undefined,
          lmccReducedPathsMark: undefined,
        });
        state.logActivity?.({
          type: 'healed',
          connectionId: c.id,
          message: healed === 4
            ? 'Path restored — full protection resumed. No action was needed.'
            : 'A path renegotiated and rejoined — protection improving on its own.',
        });
      }
    }
  }
}

/** Safe to call from any module instance — the newest caller owns the only interval. */
export function startLmccLifecycleClock(store: StoreLike): void {
  const g = globalThis as any;
  if (g.__lmccClockInterval) clearInterval(g.__lmccClockInterval);
  g.__lmccClockInterval = setInterval(() => {
    try {
      tickLmccLifecycle(store, Date.now());
    } catch (err) {
      console.error('[lmcc-clock] tick failed:', err);
    }
  }, CLOCK_TICK_MS);
}
