import { describe, it, expect } from 'vitest';
import { createWithEqualityFn } from 'zustand/traditional';
import { createHubSlice, HubSlice } from './hubSlice';
import type { Hub } from '../../types/hub';

const makeRouter = (id: string, connectionIds: string[]): Hub => ({
  id,
  name: `Router ${id}`,
  description: '',
  status: 'active',
  location: 'US East',
  connectionIds,
  links: [],
  createdAt: '2024-01-01T00:00:00Z',
});

const makeStore = () =>
  createWithEqualityFn<HubSlice>()((...args) => ({
    ...createHubSlice(...args),
  }));

describe('hubSlice', () => {
  it('starts with an empty router list', () => {
    const store = makeStore();
    expect(store.getState().hubs).toEqual([]);
  });

  it('adds a router', () => {
    const store = makeStore();
    const r = makeRouter('r1', ['conn-1']);
    store.getState().addHub(r);
    expect(store.getState().hubs).toHaveLength(1);
    expect(store.getState().hubs[0].id).toBe('r1');
  });

  it('updates a router', () => {
    const store = makeStore();
    store.getState().addHub(makeRouter('r1', ['conn-1']));
    store.getState().updateHub('r1', { name: 'Updated' });
    expect(store.getState().hubs[0].name).toBe('Updated');
  });

  it('removes a router', () => {
    const store = makeStore();
    store.getState().addHub(makeRouter('r1', ['conn-1']));
    store.getState().removeHub('r1');
    expect(store.getState().hubs).toHaveLength(0);
  });

  it('getRoutersForConnection returns routers whose connectionIds include the given id', () => {
    const store = makeStore();
    store.getState().addHub(makeRouter('r1', ['conn-1', 'conn-2']));
    store.getState().addHub(makeRouter('r2', ['conn-2']));
    store.getState().addHub(makeRouter('r3', ['conn-3']));

    const result = store.getState().getRoutersForConnection('conn-2');
    expect(result.map((r) => r.id)).toEqual(['r1', 'r2']);
  });

  it('getRoutersForConnection returns empty array when no match', () => {
    const store = makeStore();
    store.getState().addHub(makeRouter('r1', ['conn-1']));
    expect(store.getState().getRoutersForConnection('conn-99')).toEqual([]);
  });
});
