import { describe, it, expect } from 'vitest';
import { customStudyToPack } from './builderConversion';
import { recordBaselineSeed } from './verifierCatalog';
import { validatePacks } from './packs/index';
import type { CustomStudy } from '../../types/testLabBuilder';

const study: CustomStudy = {
  id: 'fixture-ga-r1', feature: 'Fixture', featureVersion: 'GA 1116',
  persona: { id: 'p-planner', name: 'Pat Planner', bio: 'b', goal: 'g', rbacRole: 'ProvisioningManager' as any, seedId: '' },
  tasks: [
    { id: 't-create', version: 1, title: 'Create', scenario: 'make a connection', successCriteria: 'connection exists',
      path: 'happy', hints: [], verifierRef: { catalogId: 'connection-created', params: { nameIncludes: 'aws' } } },
    { id: 't-wall', version: 1, title: 'Wall', scenario: 'try it', successCriteria: 'nothing created',
      path: 'permission-wall', hints: [], verifierRef: { catalogId: 'no-new-entities' },
      comprehensionCheck: { question: 'why?', options: ['a', 'b'], correctIndex: 1 } },
    { id: 't-comp', version: 1, title: 'Comp', scenario: 'answer', successCriteria: 'correct', path: 'happy', hints: [] },
  ],
  inviteCodes: ['FIX-GA-R1'], previewCodes: ['FIX-GA-R1-PREVIEW'],
  createdAt: '2026-07-10', updatedAt: '2026-07-10',
};

describe('customStudyToPack', () => {
  it('produces a pack that validates clean', () => {
    expect(validatePacks([customStudyToPack(study)])).toEqual([]);
  });

  it('forces the record-baseline seed onto the persona', () => {
    const pack = customStudyToPack(study);
    expect(pack.personas[0].seedId).toBe('record-baseline');
    expect(pack.seeds['record-baseline']).toBeDefined();
  });

  it('resolves verifier refs into working verifiers', () => {
    const pack = customStudyToPack(study);
    const state: Record<string, any> = { connections: [{ id: 'c1', name: 'AWS thing' }], hubs: [], vnfs: [], groups: [] };
    recordBaselineSeed({ set: (p) => Object.assign(state, p), get: () => state });
    const vCreate = pack.verifiers[pack.tasks[0].verifyId!];
    expect(vCreate(state)).toBe(false);
    state.connections = [...state.connections, { id: 'c2', name: 'My AWS circuit' }];
    expect(vCreate(state)).toBe(true);
    const vWall = pack.verifiers[pack.tasks[1].verifyId!];
    expect(vWall(state)).toBe(false);
    state.connections = state.connections.slice(0, 1);
    expect(vWall(state)).toBe(true);
  });

  it('unfiltered created-check accepts any new entity of its type', () => {
    const pack = customStudyToPack({
      ...study,
      tasks: [{ id: 't', version: 1, title: 'T', scenario: 's', successCriteria: 'c', path: 'happy', hints: [],
        verifierRef: { catalogId: 'hub-created' } }],
    });
    const state: Record<string, any> = { connections: [], hubs: [{ id: 'h1' }], vnfs: [], groups: [] };
    recordBaselineSeed({ set: (p) => Object.assign(state, p), get: () => state });
    const v = pack.verifiers[pack.tasks[0].verifyId!];
    expect(v(state)).toBe(false);
    state.hubs = [...state.hubs, { id: 'h2' }];
    expect(v(state)).toBe(true);
  });

  it('comprehension-only tasks get no verifyId', () => {
    const pack = customStudyToPack(study);
    expect(pack.tasks[2].verifyId).toBeUndefined();
  });

  it('unknown catalog ids convert to no verifier rather than throwing', () => {
    const pack = customStudyToPack({
      ...study,
      tasks: [{ id: 't', version: 1, title: 'T', scenario: 's', successCriteria: 'c', path: 'happy', hints: [],
        verifierRef: { catalogId: 'does-not-exist' } }],
    });
    expect(pack.tasks[0].verifyId).toBeUndefined();
    expect(validatePacks([pack])).toEqual([]);
  });
});
