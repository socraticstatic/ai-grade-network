import { describe, it, expect, beforeEach } from 'vitest';
import { create } from 'zustand';
import { createActivityLogSlice, ActivityLogSlice } from './activityLogSlice';

const makeStore = () => create<ActivityLogSlice>((set, get, api) => createActivityLogSlice(set, get, api));

beforeEach(() => localStorage.clear());

describe('activityLogSlice', () => {
  it('stamps timestamp and a constant actor on every event', () => {
    const store = makeStore();
    store.getState().logActivity({ type: 'key-generated', connectionId: 'c1', message: 'ActivationKey generated' });
    const [e] = store.getState().activityEvents;
    expect(e.admin).toBe('admin');
    expect(Date.parse(e.at)).toBeGreaterThan(0);
    expect(e.type).toBe('key-generated');
  });

  it('newest first; security events supported', () => {
    const store = makeStore();
    store.getState().logActivity({ type: 'created', message: 'first' });
    store.getState().logActivity({ type: 'security', message: 'Activation key rejected by AWS' });
    expect(store.getState().activityEvents[0].type).toBe('security');
    expect(store.getState().activityEvents).toHaveLength(2);
  });

  it('falls back to a generic admin when unauthenticated', () => {
    const store = makeStore();
    store.getState().logActivity({ type: 'created', message: 'x' });
    expect(store.getState().activityEvents[0].admin).toBe('admin');
  });
});
