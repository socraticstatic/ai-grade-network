import type {
  TestLabSession, TaskResult, WrapUp, StudyPack, TestTask, Directness,
} from '../../types/testLab';
import { getAllPacks, resolveInviteCode, dryRunVerifiers } from '../../data/testLab/packs';
import { enqueueTaskRow, enqueueSessionRow, flushQueue } from '../../services/testLabSubmit';

const SESSION_KEY = 'testLab-session-v1';
export const SNAPSHOT_KEYS = [
  'connections', 'hubs', 'vnfs', 'groups', 'activeTab',
  'currentRole', 'activePersona', 'impersonation', 'testLabSeedMeta',
] as const;

const APP_BUILD = (import.meta as any).env?.VITE_BUILD_ID ?? 'dev';

interface Persisted { session: TestLabSession; snapshot: Record<string, unknown> | null }

function save(session: TestLabSession | null, snapshot: Record<string, unknown> | null) {
  try {
    if (!session) localStorage.removeItem(SESSION_KEY);
    else localStorage.setItem(SESSION_KEY, JSON.stringify({ session, snapshot } satisfies Persisted));
  } catch { /* storage full/unavailable — session continues in memory */ }
}

function load(): Persisted | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Persisted) : null;
  } catch { return null; }
}

function takeSnapshot(state: Record<string, any>): Record<string, unknown> {
  const snap: Record<string, unknown> = {};
  for (const key of SNAPSHOT_KEYS) snap[key] = JSON.parse(JSON.stringify(state[key] ?? null));
  return snap;
}

export interface TestLabSlice {
  testLabSession: TestLabSession | null;
  testLabStart: (code: string, name: string) => string | null;
  testLabBegin: () => void;
  testLabResume: () => void;
  testLabHint: () => void;
  testLabIssue: (text: string, route: string) => void;
  testLabVerified: () => void;
  testLabRoute: (route: string) => void;
  testLabFirstClick: (label: string, route: string) => void;
  testLabComplete: (opts: { easeRating?: number; comment?: string; comprehensionCorrect?: boolean; comprehensionAnswer?: string }) => void;
  testLabGiveUp: (reason?: string) => void;
  testLabSkip: () => void;
  testLabWrapUp: (wrapUp: WrapUp) => void;
  testLabExit: () => void;
  testLabDryRun: () => string[];
}

// packsOverride exists so tests can inject fixture packs.
/** Deterministic per-session shuffle: same sessionId always yields the same order,
 *  so resume/refresh never re-deals the deck mid-study. */
export function seededTaskOrder(taskIds: string[], seed: string): string[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  let st = h >>> 0;
  const rand = () => { st = (Math.imul(st, 1664525) + 1013904223) >>> 0; return st / 4294967296; };
  const order = [...taskIds];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

export const createTestLabSlice = (
  set: (partial: Record<string, any>) => void,
  get: () => Record<string, any>,
  packsOverride?: StudyPack[],
): TestLabSlice => {
  const packs = () => packsOverride ?? getAllPacks();
  let snapshot: Record<string, unknown> | null = null;

  const persisted = load();
  if (persisted) snapshot = persisted.snapshot;

  const ctx = () => {
    const session = get().testLabSession as TestLabSession | null;
    if (!session) return null;
    const pack = packs().find(p => p.id === session.packId);
    const script = pack?.scripts.find(s => s.id === session.scriptId);
    const persona = pack?.personas.find(p => p.id === session.personaId);
    if (!pack || !script || !persona) return null;
    const order = session.taskOrder ?? script.taskIds;
    const task: TestTask | undefined = pack.tasks.find(t => t.id === order[session.taskIndex]);
    return { session, pack, script, persona, task };
  };

  const update = (partial: Partial<TestLabSession>) => {
    const session = get().testLabSession as TestLabSession | null;
    if (!session) return;
    const next = { ...session, ...partial };
    set({ testLabSession: next });
    save(next, snapshot);
  };

  const runSeed = (pack: StudyPack, seedId: string | undefined) => {
    if (!seedId) return;
    pack.seeds[seedId]?.({ set, get });
  };

  const restoreSnapshot = () => {
    const session = get().testLabSession as TestLabSession | null;
    if (!snapshot || session?.storeRestored) return;
    set({ ...(snapshot as Record<string, any>) });
  };

  const classify = (task: TestTask | undefined, trail: TestLabSession['routeTrail']): Directness => {
    if (!task?.expectedRoutePrefixes?.length) return 'n/a';
    const visited = trail.map(h => h.route);
    const offPath = visited.filter(r => !task.expectedRoutePrefixes!.some(p => r.startsWith(p)) && r !== task.startRoute);
    return offPath.length === 0 ? 'direct' : 'indirect';
  };

  const finalize = (outcome: TaskResult['outcome'], opts: { easeRating?: number; comment?: string; comprehensionCorrect?: boolean; comprehensionAnswer?: string; giveUpReason?: string } = {}) => {
    const c = ctx();
    if (!c || !c.task || c.session.phase !== 'in-task') return;
    const { session, pack, script, task } = c;
    const now = Date.now();
    let verified = session.verifiedAt != null;
    if (!verified && task.verifyId) {
      try { verified = pack.verifiers[task.verifyId]?.(get()) === true; } catch { verified = false; }
    }
    // Comprehension-only tasks (no store footprint): a correct answer IS the verification.
    if (!task.verifyId && !verified && task.comprehensionCheck) {
      verified = opts.comprehensionCorrect === true;
    }
    const effectiveOutcome: TaskResult['outcome'] =
      outcome !== 'gave-up' && outcome !== 'skipped'
        ? (verified && (opts.comprehensionCorrect ?? true) ? 'verified' : 'claimed')
        : outcome;
    const result: TaskResult = {
      taskId: task.id,
      taskVersion: task.version,
      path: task.path,
      outcome: effectiveOutcome,
      startedAt: session.taskStartedAt ?? now,
      endedAt: now,
      durationMs: now - (session.taskStartedAt ?? now),
      hintsUsed: session.hintsRevealed,
      verified,
      directness: classify(task, session.routeTrail),
      comprehensionCorrect: opts.comprehensionCorrect,
      comprehensionAnswer: opts.comprehensionAnswer,
      giveUpReason: opts.giveUpReason,
      easeRating: opts.easeRating,
      comment: opts.comment,
      firstClick: session.firstClick,
      routeTrail: session.routeTrail,
      issues: session.issues,
    };
    const results = [...session.results, result];
    enqueueTaskRow({ ...session, results }, result);
    void flushQueue();

    const nextIndex = session.taskIndex + 1;
    if (nextIndex >= script.taskIds.length) {
      update({ results, phase: 'wrap-up', taskIndex: nextIndex, taskStartedAt: undefined });
      restoreSnapshot();
      update({ storeRestored: true });
      return;
    }
    const nextTask = pack.tasks.find(t => t.id === (session.taskOrder ?? script.taskIds)[nextIndex]);
    if (nextTask?.reseedId) runSeed(pack, nextTask.reseedId);
    if (effectiveOutcome !== 'verified' && nextTask?.catchUpSeedId) runSeed(pack, nextTask.catchUpSeedId);
    update({
      results, taskIndex: nextIndex, taskStartedAt: Date.now(),
      hintsRevealed: 0, verifiedAt: undefined, firstClick: undefined, routeTrail: [], issues: [],
    });
  };

  return {
    testLabSession: persisted?.session ?? null,

    testLabStart: (code, name) => {
      const hit = resolveInviteCode(code, packs());
      if (!hit) return 'That code isn’t active. Check it and try again.';
      const sessionId = (crypto as any).randomUUID?.() ?? `s-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
      const session: TestLabSession = {
        sessionId,
        inviteCode: code.trim().toUpperCase(),
        preview: hit.preview,
        participantName: name.trim(),
        packId: hit.pack.id,
        feature: hit.pack.feature,
        featureVersion: hit.pack.featureVersion,
        scriptId: hit.script.id,
        personaId: hit.script.personaId,
        appBuild: APP_BUILD,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        startedAt: Date.now(),
        phase: 'briefing',
        taskIndex: 0,
        taskOrder: hit.script.randomizeTaskOrder
          ? seededTaskOrder(hit.script.taskIds, sessionId)
          : undefined,
        hintsRevealed: 0,
        routeTrail: [],
        issues: [],
        results: [],
        storeRestored: false,
      };
      set({ testLabSession: session });
      save(session, snapshot);
      return null;
    },

    testLabBegin: () => {
      const c = ctx();
      if (!c || c.session.phase !== 'briefing') return;
      snapshot = takeSnapshot(get());
      runSeed(c.pack, c.persona.seedId);
      get().setActivePersona?.(c.persona.rbacRole);
      update({ phase: 'in-task', taskStartedAt: Date.now() });
    },

    testLabResume: () => {
      const c = ctx();
      if (!c || c.session.phase !== 'in-task') return;
      if (get().activePersona !== c.persona.rbacRole) get().setActivePersona?.(c.persona.rbacRole);
    },

    testLabHint: () => {
      const c = ctx();
      if (!c?.task) return;
      update({ hintsRevealed: Math.min(c.session.hintsRevealed + 1, c.task.hints.length) });
    },

    testLabIssue: (text, route) => {
      const c = ctx();
      if (!c) return;
      update({ issues: [...c.session.issues, { text, route, at: Date.now() }] });
    },

    testLabVerified: () => {
      const c = ctx();
      if (!c || c.session.verifiedAt) return;
      update({ verifiedAt: Date.now() });
    },

    testLabRoute: (route) => {
      const c = ctx();
      if (!c || c.session.phase !== 'in-task') return;
      const trail = c.session.routeTrail;
      if (trail.length && trail[trail.length - 1].route === route) return;
      update({ routeTrail: [...trail, { route, at: Date.now() }] });
    },

    testLabFirstClick: (label, route) => {
      const c = ctx();
      if (!c || c.session.firstClick || c.session.phase !== 'in-task') return;
      update({ firstClick: { label, route } });
    },

    testLabComplete: (opts) => finalize('claimed', opts),
    testLabGiveUp: (reason?: string) => finalize('gave-up', { giveUpReason: reason }),
    testLabSkip: () => { if (ctx()?.session.preview) finalize('skipped'); },

    testLabWrapUp: (wrapUp) => {
      const c = ctx();
      if (!c || c.session.phase !== 'wrap-up') return;
      update({ wrapUp, phase: 'submitted', completedAt: Date.now() });
      const s = get().testLabSession as TestLabSession;
      enqueueSessionRow(s);
      void flushQueue();
    },

    testLabExit: () => {
      restoreSnapshot();
      snapshot = null;
      save(null, null);
      set({ testLabSession: null });
    },

    testLabDryRun: () => {
      const c = ctx();
      if (!c) return [];
      return dryRunVerifiers(c.pack, c.script, get());
    },
  };
};
