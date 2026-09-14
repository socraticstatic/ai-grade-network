import { describe, it, expect } from 'vitest';
import { useStore } from '../../../../store/useStore';
import { tickLmccLifecycle } from '../../../lmccLifecycleClock';
import { lmccGa1 } from './index';

/**
 * The Feature Owner's Monday arc, run against the real store:
 * wizard-shaped creation (Pending + key) → upload → clock → Live,
 * with the pack's verifiers firing at each gate.
 */
describe('feature-owner journey (store-level)', () => {
  it('order → wait → Live, with pack verifiers firing at each gate', async () => {
    // Baseline seed, then mark — exactly what the engine does at task start.
    const api = { set: (p: any) => useStore.setState(p), get: () => useStore.getState() };
    useStore.setState({ connections: [] });
    lmccGa1.seeds['ga-baseline'](api);
    lmccGa1.seeds['ga-mark-count'](api);

    // The wizard's AWS Max creation shape (post-fix): Pending, key stamped, term kept.
    useStore.setState({
      connections: [{
        id: 'fo-1', name: 'FO order', provider: 'AWS', type: 'AWS Last Mile',
        status: 'Pending', bandwidth: '1 Gbps', location: 'San Jose - SJ',
        createdAt: new Date().toISOString(),
        configuration: {
          isLmcc: true, lmccPending: true,
          lmccKeyCreatedAt: new Date().toISOString(),
          lmccContractTerm: 'fixed-12',
          lmccActivePaths: 0,
        },
      }] as any,
    });

    // Task 1 gate: a new LMCC connection exists since the mark.
    expect(lmccGa1.verifiers['ga-new-since-mark'](useStore.getState())).toBe(true);

    // Task 2 setup: mark non-live, then the customer uploads the key in AWS.
    lmccGa1.seeds['ga-mark-nonlive'](api);
    expect(lmccGa1.verifiers['ga-went-live-since-mark'](useStore.getState())).toBe(false);
    useStore.setState({
      connections: useStore.getState().connections.map((c: any) =>
        c.id === 'fo-1' ? { ...c, status: 'Provisioning' } : c),
    });

    // The lifecycle clock resolves the wait.
    tickLmccLifecycle(useStore, 0);
    tickLmccLifecycle(useStore, 46_000);
    const conn = useStore.getState().connections.find((c: any) => c.id === 'fo-1') as any;
    expect(conn.status).toBe('Active');
    expect(conn.configuration.lmccActivePaths).toBe(4); // go-live raises all paths
    expect(conn.configuration.lmccContractTerm).toBe('fixed-12'); // term survived

    // Task 2 gate fires.
    expect(lmccGa1.verifiers['ga-went-live-since-mark'](useStore.getState())).toBe(true);
  });
});
