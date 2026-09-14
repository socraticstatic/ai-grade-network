import { describe, it, expect } from 'vitest';
import { useStore } from '../store/useStore';
import { tickLmccLifecycle } from './lmccLifecycleClock';

describe('lifecycle clock against the real store', () => {
  it('promotes Provisioning to Active and records the live activity event', () => {
    useStore.setState({
      connections: [{
        id: 'clk-1', name: 'Clock test', provider: 'AWS', type: 'AWS Last Mile',
        status: 'Provisioning', bandwidth: '1 Gbps', location: 'San Jose - SJ',
        configuration: { isLmcc: true, lmccActivePaths: 0 },
      }] as any,
    });
    tickLmccLifecycle(useStore, 0);
    tickLmccLifecycle(useStore, 46_000);
    const c = useStore.getState().connections.find((x: any) => x.id === 'clk-1') as any;
    expect(c.status).toBe('Active');
    const events = (useStore.getState() as any).activityEvents ?? [];
    expect(events.some((e: any) => e.type === 'live' && e.connectionId === 'clk-1')).toBe(true);
  });
});
