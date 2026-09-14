import { describe, it, expect } from 'vitest';
import { lmccGa1 } from './index';
import { validatePacks } from '../index';
import { PLANT_LIVE_ID, PLANT_EXPIRED_ID } from './seeds';

describe('lmcc-ga1 pack', () => {
  it('validates clean', () => {
    expect(validatePacks([lmccGa1])).toEqual([]);
  });

  it('never leaks successCriteria into scenarios', () => {
    for (const t of lmccGa1.tasks) {
      expect(t.scenario).not.toContain(t.successCriteria);
    }
  });

  it('tags the GA feature version', () => {
    expect(lmccGa1.featureVersion).toContain('GA');
  });

  it('order verifier is baseline-relative and ignores plants', () => {
    const state = {
      connections: [
        { id: 'sample-1', configuration: { isLmcc: true } },
        { id: PLANT_LIVE_ID, configuration: { isLmcc: true } },
        { id: PLANT_EXPIRED_ID, configuration: { isLmcc: true } },
      ],
      testLabSeedMeta: { gaBaselineIds: ['sample-1'], gaMarkCount: 1 },
    };
    expect(lmccGa1.verifiers['ga-order-exists'](state)).toBe(false);
    const afterOrder = {
      ...state,
      connections: [...state.connections, { id: 'conn-99', configuration: { isLmcc: true } }],
    };
    expect(lmccGa1.verifiers['ga-order-exists'](afterOrder)).toBe(true);
  });

  it('downgrade verifier requires a tier to actually drop', () => {
    const marks = { [PLANT_LIVE_ID]: 10000 };
    const same = {
      connections: [{ id: PLANT_LIVE_ID, status: 'Active', bandwidth: '10 Gbps', configuration: { isLmcc: true } }],
      testLabSeedMeta: { gaBandwidthMarks: marks },
    };
    expect(lmccGa1.verifiers['ga-bandwidth-lowered'](same)).toBe(false);
    const lowered = {
      ...same,
      connections: [{ id: PLANT_LIVE_ID, status: 'Active', bandwidth: '5 Gbps × 4 paths', configuration: { isLmcc: true } }],
    };
    expect(lmccGa1.verifiers['ga-bandwidth-lowered'](lowered)).toBe(true);
    const raised = {
      ...same,
      connections: [{ id: PLANT_LIVE_ID, status: 'Active', bandwidth: '20 Gbps', configuration: { isLmcc: true } }],
    };
    expect(lmccGa1.verifiers['ga-bandwidth-lowered'](raised)).toBe(false);
  });

  it('delete verifier accepts Deleting, Deleted, or removal — but only for marked circuits', () => {
    const meta = { gaActiveIds: [PLANT_LIVE_ID] };
    const alive = {
      connections: [{ id: PLANT_LIVE_ID, status: 'Active', configuration: { isLmcc: true } }],
      testLabSeedMeta: meta,
    };
    expect(lmccGa1.verifiers['ga-deleted-since-mark'](alive)).toBe(false);
    for (const status of ['Deleting', 'Deleted']) {
      expect(lmccGa1.verifiers['ga-deleted-since-mark']({
        ...alive,
        connections: [{ id: PLANT_LIVE_ID, status, configuration: { isLmcc: true } }],
      })).toBe(true);
    }
    expect(lmccGa1.verifiers['ga-deleted-since-mark']({ ...alive, connections: [] })).toBe(true);
  });

  it('seeds are idempotent — running ga-with-live twice plants exactly one circuit', () => {
    let state: Record<string, any> = { connections: [] };
    const api = {
      get: () => state,
      set: (partial: Record<string, any>) => { state = { ...state, ...partial }; },
    };
    lmccGa1.seeds['ga-with-live'](api);
    lmccGa1.seeds['ga-with-live'](api);
    expect(state.connections.filter((c: any) => c.id === PLANT_LIVE_ID)).toHaveLength(1);
  });

  it('ga-with-reduced drops the planted circuit to 3 paths without duplicating it', () => {
    let state: Record<string, any> = { connections: [] };
    const api = {
      get: () => state,
      set: (partial: Record<string, any>) => { state = { ...state, ...partial }; },
    };
    lmccGa1.seeds['ga-with-live'](api);
    lmccGa1.seeds['ga-with-reduced'](api);
    const plants = state.connections.filter((c: any) => c.id === PLANT_LIVE_ID);
    expect(plants).toHaveLength(1);
    expect(plants[0].configuration.lmccActivePaths).toBe(3);
    expect(plants[0].status).toBe('Active');
  });

  it('expired plant derives to a stale key older than 7 days', () => {
    let state: Record<string, any> = { connections: [] };
    const api = {
      get: () => state,
      set: (partial: Record<string, any>) => { state = { ...state, ...partial }; },
    };
    lmccGa1.seeds['ga-with-expired'](api);
    const plant = state.connections.find((c: any) => c.id === PLANT_EXPIRED_ID);
    expect(plant.status).toBe('Pending');
    const ageDays = (Date.now() - new Date(plant.configuration.lmccKeyCreatedAt).getTime()) / 86400_000;
    expect(ageDays).toBeGreaterThan(7);
  });
});
