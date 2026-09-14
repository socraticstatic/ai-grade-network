import { describe, it, expect, vi } from 'vitest';
import { tickLmccLifecycle } from './lmccLifecycleClock';

const makeStore = (connections: any[]) => {
  let state: any = {
    connections,
    completeProvisioning: vi.fn((id: string) => {
      state.connections = state.connections.map((c: any) =>
        c.id === id ? { ...c, status: 'Active' } : c,
      );
    }),
    logActivity: vi.fn(),
  };
  // actions must see fresh state (mirrors zustand semantics)
  return {
    getState: () => state,
    setState: (partial: any) => { state = { ...state, ...partial }; },
  };
};

const lmcc = (over: any = {}) => ({
  id: 'c1', status: 'Provisioning',
  configuration: { isLmcc: true, lmccActivePaths: 4 },
  ...over,
});

describe('lmcc lifecycle clock', () => {
  it('provisioning resolves to Live after the bounded wait — not before', () => {
    const store = makeStore([lmcc()]);
    tickLmccLifecycle(store, 0);
    tickLmccLifecycle(store, 30_000);
    expect(store.getState().completeProvisioning).not.toHaveBeenCalled();
    tickLmccLifecycle(store, 46_000);
    expect(store.getState().completeProvisioning).toHaveBeenCalledWith('c1');
  });

  it('a reduced path heals one step at a time, each step re-armed', () => {
    const store = makeStore([lmcc({ status: 'Active', configuration: { isLmcc: true, lmccActivePaths: 2 } })]);
    tickLmccLifecycle(store, 0);
    tickLmccLifecycle(store, 91_000);
    expect(store.getState().connections[0].configuration.lmccActivePaths).toBe(3);
    // second step needs its own full interval
    tickLmccLifecycle(store, 100_000);
    expect(store.getState().connections[0].configuration.lmccActivePaths).toBe(3);
    tickLmccLifecycle(store, 191_000);
    expect(store.getState().connections[0].configuration.lmccActivePaths).toBe(4);
  });

  it('never touches Pending, Needs attention, or Deleting states', () => {
    const store = makeStore([
      lmcc({ id: 'p', status: 'Pending' }),
      lmcc({ id: 'n', status: 'Inactive', configuration: { isLmcc: true, lmccActivePaths: 0 } }),
      lmcc({ id: 'd', status: 'Deleting', configuration: { isLmcc: true, lmccActivePaths: 2 } }),
    ]);
    tickLmccLifecycle(store, 0);
    tickLmccLifecycle(store, 500_000);
    const byId = (id: string) => store.getState().connections.find((c: any) => c.id === id);
    expect(store.getState().completeProvisioning).not.toHaveBeenCalled();
    expect(byId('p').status).toBe('Pending');
    expect(byId('n').status).toBe('Inactive');
    expect(byId('d').configuration.lmccActivePaths).toBe(2);
  });

  it('ignores non-LMCC connections entirely', () => {
    const store = makeStore([{ id: 'x', status: 'Provisioning', configuration: {} }]);
    tickLmccLifecycle(store, 0);
    tickLmccLifecycle(store, 500_000);
    expect(store.getState().completeProvisioning).not.toHaveBeenCalled();
  });

  it('full restoration logs the no-action-was-needed record', () => {
    const store = makeStore([lmcc({ status: 'Active', configuration: { isLmcc: true, lmccActivePaths: 3 } })]);
    tickLmccLifecycle(store, 0);
    tickLmccLifecycle(store, 91_000);
    expect(store.getState().logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'healed', message: expect.stringContaining('full protection resumed') }),
    );
  });
});
