import { describe, it, expect, beforeEach, vi } from 'vitest';
import { create } from 'zustand';
import { createTestLabSlice, TestLabSlice, SNAPSHOT_KEYS } from './testLabSlice';
import type { StudyPack } from '../../types/testLab';

vi.mock('../../services/testLabSubmit', () => ({
  enqueueTaskRow: vi.fn(),
  enqueueSessionRow: vi.fn(),
  flushQueue: vi.fn(async () => ({ sent: 0, remaining: 0 })),
}));

const pack: StudyPack = {
  id: 'fix-1',
  feature: 'Fixture',
  featureVersion: 'v1',
  personas: [{ id: 'p1', name: 'Pat', bio: 'b', goal: 'g', rbacRole: 'NetworkEngineer' as any, seedId: 'seed-base' }],
  tasks: [
    { id: 't1', version: 1, title: 'T1', scenario: 'do it', successCriteria: 'flag set', path: 'happy', verifyId: 'v-flag', hints: ['h1', 'h2'], expectedRoutePrefixes: ['/manage'] },
    { id: 't2', version: 2, title: 'T2', scenario: 'again', successCriteria: 'n/a', path: 'happy', hints: [], catchUpSeedId: 'seed-catchup' },
  ],
  scripts: [{ id: 'sc1', personaId: 'p1', taskIds: ['t1', 't2'], inviteCodes: ['FIX-1'], previewCodes: ['FIX-P'] }],
  verifiers: { 'v-flag': (s) => s.fixtureFlag === true },
  seeds: {
    'seed-base': ({ set }) => set({ fixtureSeeded: true }),
    'seed-catchup': ({ set }) => set({ fixtureCaughtUp: true }),
  },
};

type TestStore = TestLabSlice & Record<string, any>;

const makeStore = () =>
  create<TestStore>((set, get) => ({
    ...createTestLabSlice(set as any, get as any, [pack]),
    // minimal app-store surface the slice snapshots/mutates
    connections: [{ id: 'c1' }],
    hubs: [], vnfs: [], groups: [], activeTab: 'connections',
    currentRole: 'admin', activePersona: null,
    impersonation: { isImpersonating: false, targetUser: null, originalUser: null, startTime: null },
    setActivePersona: (p: string) => set({ activePersona: p, currentRole: 'user' }),
    fixtureFlag: false,
  }));

beforeEach(() => localStorage.clear());

describe('testLabSlice', () => {
  it('rejects unknown invite codes', () => {
    const store = makeStore();
    expect(store.getState().testLabStart('NOPE', 'Sam')).toBeTruthy();
    expect(store.getState().testLabSession).toBeNull();
  });

  it('starts a session in briefing phase; preview codes flagged', () => {
    const store = makeStore();
    expect(store.getState().testLabStart('fix-p', 'Sam')).toBeNull();
    const s = store.getState().testLabSession!;
    expect(s.phase).toBe('briefing');
    expect(s.preview).toBe(true);
    expect(s.packId).toBe('fix-1');
  });

  it('begin snapshots the store, seeds, applies persona, enters in-task', () => {
    const store = makeStore();
    store.getState().testLabStart('FIX-1', 'Sam');
    store.getState().testLabBegin();
    const st = store.getState();
    expect(st.testLabSession!.phase).toBe('in-task');
    expect(st.fixtureSeeded).toBe(true);
    expect(st.activePersona).toBe('NetworkEngineer');
    expect(localStorage.getItem('testLab-session-v1')).toBeTruthy();
  });

  it('records hints, routes, first click, issues on the live task', () => {
    const store = makeStore();
    store.getState().testLabStart('FIX-1', 'Sam');
    store.getState().testLabBegin();
    store.getState().testLabHint();
    store.getState().testLabRoute('/manage');
    store.getState().testLabFirstClick('Create button', '/manage');
    store.getState().testLabIssue('confusing label', '/manage');
    const s = store.getState().testLabSession!;
    expect(s.hintsRevealed).toBe(1);
    expect(s.routeTrail.map(h => h.route)).toContain('/manage');
    expect(s.firstClick?.label).toBe('Create button');
    expect(s.issues).toHaveLength(1);
  });

  it('complete records verified outcome + directness and advances', () => {
    const store = makeStore();
    store.getState().testLabStart('FIX-1', 'Sam');
    store.getState().testLabBegin();
    store.getState().testLabRoute('/manage');
    store.setState({ fixtureFlag: true });
    store.getState().testLabVerified();
    store.getState().testLabComplete({ easeRating: 6 });
    const s = store.getState().testLabSession!;
    expect(s.results).toHaveLength(1);
    expect(s.results[0].outcome).toBe('verified');
    expect(s.results[0].directness).toBe('direct');
    expect(s.results[0].easeRating).toBe(6);
    expect(s.taskIndex).toBe(1);
  });

  it('give-up applies next task catch-up seed', () => {
    const store = makeStore();
    store.getState().testLabStart('FIX-1', 'Sam');
    store.getState().testLabBegin();
    store.getState().testLabGiveUp();
    const st = store.getState();
    expect(st.testLabSession!.results[0].outcome).toBe('gave-up');
    expect(st.fixtureCaughtUp).toBe(true);
  });

  it('finishing the last task enters wrap-up and restores the snapshot', () => {
    const store = makeStore();
    store.getState().testLabStart('FIX-1', 'Sam');
    store.getState().testLabBegin();
    store.setState({ connections: [{ id: 'c1' }, { id: 'made-in-test' }] });
    store.getState().testLabComplete({});
    store.getState().testLabComplete({});
    const st = store.getState();
    expect(st.testLabSession!.phase).toBe('wrap-up');
    expect(st.testLabSession!.storeRestored).toBe(true);
    expect(st.connections).toHaveLength(1); // snapshot restored
  });

  it('wrap-up submits and exit clears everything', () => {
    const store = makeStore();
    store.getState().testLabStart('FIX-1', 'Sam');
    store.getState().testLabBegin();
    store.getState().testLabComplete({});
    store.getState().testLabComplete({});
    store.getState().testLabWrapUp({ umuxCapabilities: 6, umuxEaseOfUse: 5, likedMost: 'a', likedLeast: 'b' });
    expect(store.getState().testLabSession!.phase).toBe('submitted');
    store.getState().testLabExit();
    expect(store.getState().testLabSession).toBeNull();
    expect(localStorage.getItem('testLab-session-v1')).toBeNull();
  });

  it('session resumes from localStorage on store creation', () => {
    const store = makeStore();
    store.getState().testLabStart('FIX-1', 'Sam');
    store.getState().testLabBegin();
    const revived = makeStore(); // simulates refresh
    expect(revived.getState().testLabSession?.phase).toBe('in-task');
    revived.getState().testLabResume();
    expect(revived.getState().activePersona).toBe('NetworkEngineer');
  });

  it('comprehension-only tasks verify on a correct answer', () => {
    const comprehensionPack: StudyPack = {
      ...pack,
      id: 'fix-c',
      tasks: [{
        id: 'tc', version: 1, title: 'TC', scenario: 'answer it', successCriteria: 'correct answer',
        path: 'happy', hints: [],
        comprehensionCheck: { question: 'q', options: ['a', 'b'], correctIndex: 1 },
      }],
      scripts: [{ id: 'scc', personaId: 'p1', taskIds: ['tc'], inviteCodes: ['FIX-C'], previewCodes: [] }],
    };
    const store = create<TestStore>((set, get) => ({
      ...createTestLabSlice(set as any, get as any, [comprehensionPack]),
      connections: [], hubs: [], vnfs: [], groups: [], activeTab: 'connections',
      currentRole: 'admin', activePersona: null,
      impersonation: { isImpersonating: false, targetUser: null, originalUser: null, startTime: null },
      setActivePersona: (p: string) => set({ activePersona: p }),
    }));
    store.getState().testLabStart('FIX-C', 'Sam');
    store.getState().testLabBegin();
    store.getState().testLabComplete({ comprehensionCorrect: true });
    expect(store.getState().testLabSession!.results[0].outcome).toBe('verified');
  });

  it('exposes SNAPSHOT_KEYS covering role + data state', () => {
    for (const k of ['connections', 'hubs', 'vnfs', 'groups', 'activeTab', 'currentRole', 'activePersona', 'impersonation']) {
      expect(SNAPSHOT_KEYS).toContain(k);
    }
  });
});
