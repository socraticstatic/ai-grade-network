import { describe, it, expect, beforeEach } from 'vitest';
import { create } from 'zustand';
import { createHubSlice, HubSlice } from './hubSlice';
import type { Connection } from '../../types';

type TestStore = HubSlice & Record<string, any>;

const makeStore = () => create<TestStore>((set, get) => ({ ...createHubSlice(set as any, get as any, undefined as any) }));

const conn = (over: Partial<Connection> = {}): Connection => ({
  id: `c-${Math.floor(Math.random() * 1e6)}`,
  name: 'Test conn',
  type: 'Internet to Cloud',
  status: 'Provisioning',
  provider: 'AWS',
  location: 'San Jose, CA',
  bandwidth: '1 Gbps',
  createdAt: '2026-07-10',
  configuration: {},
  ...over,
} as unknown as Connection);

beforeEach(() => localStorage.clear());

describe('ensureHubFor (hybrid auto-grouping)', () => {
  it('creates a location hub for the first connection and names it after the location', () => {
    const store = makeStore();
    const c = conn();
    const hubId = store.getState().ensureHubFor(c);
    const hub = store.getState().hubs.find(h => h.id === hubId)!;
    expect(hub.name).toBe('San Jose, CA');
    expect(hub.autoGrouped).toBe(true);
    expect(hub.routeDomain).toBe('internet');
    expect(hub.connectionIds).toContain(c.id);
  });

  it('same location + same domain joins the existing hub', () => {
    const store = makeStore();
    const a = conn(); const b = conn();
    const h1 = store.getState().ensureHubFor(a);
    const h2 = store.getState().ensureHubFor(b);
    expect(h1).toBe(h2);
    expect(store.getState().hubs).toHaveLength(1);
    expect(store.getState().hubs[0].connectionIds).toEqual(expect.arrayContaining([a.id, b.id]));
  });

  it('VPN at the same location gets its own hub (two route tables)', () => {
    const store = makeStore();
    store.getState().ensureHubFor(conn());
    const vpnHubId = store.getState().ensureHubFor(conn({ type: 'VPN to Cloud' }));
    const vpnHub = store.getState().hubs.find(h => h.id === vpnHubId)!;
    expect(store.getState().hubs).toHaveLength(2);
    expect(vpnHub.routeDomain).toBe('vpn');
    expect(vpnHub.name).toBe('San Jose, CA (VPN)');
  });

  it('repeated add is dedup-safe', () => {
    const store = makeStore();
    const c = conn();
    store.getState().ensureHubFor(c);
    store.getState().ensureHubFor(c);
    expect(store.getState().hubs[0].connectionIds.filter(id => id === c.id)).toHaveLength(1);
  });

  it('connection without a location is skipped without throwing', () => {
    const store = makeStore();
    const id = store.getState().ensureHubFor(conn({ location: undefined as any }));
    expect(id).toBe('');
    expect(store.getState().hubs).toHaveLength(0);
  });
});
