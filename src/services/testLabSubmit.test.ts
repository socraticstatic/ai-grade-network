import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  enqueueTaskRow, enqueueSessionRow, flushQueue, queueLength, __setWebhookForTests,
} from './testLabSubmit';
import type { TestLabSession, TaskResult } from '../types/testLab';

const session = {
  sessionId: 'sess-1', inviteCode: 'FIX-1', preview: false, participantName: 'Sam',
  packId: 'fix-1', feature: 'Fixture', featureVersion: 'v1', scriptId: 'sc1', personaId: 'p1',
  appBuild: 'test', userAgent: 'vitest', startedAt: 1000, phase: 'in-task', taskIndex: 0,
  hintsRevealed: 0, routeTrail: [], issues: [], results: [], storeRestored: false,
} as unknown as TestLabSession;

const result = {
  taskId: 't1', taskVersion: 1, path: 'happy', outcome: 'verified', startedAt: 1000, endedAt: 2000,
  durationMs: 1000, hintsUsed: 1, verified: true, directness: 'direct',
  routeTrail: [{ route: '/manage', at: 1500 }], issues: [],
} as unknown as TaskResult;

beforeEach(() => { localStorage.clear(); __setWebhookForTests(undefined); });
afterEach(() => vi.unstubAllGlobals());

describe('testLabSubmit', () => {
  it('enqueues rows and reports queue length', () => {
    enqueueTaskRow(session, result);
    enqueueSessionRow(session);
    expect(queueLength()).toBe(2);
  });

  it('flush without a webhook keeps the queue', async () => {
    enqueueTaskRow(session, result);
    const out = await flushQueue();
    expect(out).toEqual({ sent: 0, remaining: 1 });
  });

  it('flush POSTs each item as text/plain and drains the queue', async () => {
    __setWebhookForTests('https://script.example/exec');
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    enqueueTaskRow(session, result);
    enqueueSessionRow(session);
    const out = await flushQueue();
    expect(out).toEqual({ sent: 2, remaining: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [, init] = fetchMock.mock.calls[0] as any;
    expect(init.method).toBe('POST');
    expect(init.mode).toBe('no-cors');
    const body = JSON.parse(init.body);
    expect(body.kind).toBe('task');
    expect(body.row.sessionId).toBe('sess-1');
    expect(body.row.taskId).toBe('t1');
  });

  it('a failed POST keeps remaining items queued for retry', async () => {
    __setWebhookForTests('https://script.example/exec');
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    enqueueTaskRow(session, result);
    const out = await flushQueue();
    expect(out).toEqual({ sent: 0, remaining: 1 });
    expect(queueLength()).toBe(1);
  });

  it('task rows are flat (no nested objects except JSON-stringified trail/issues)', () => {
    enqueueTaskRow(session, result);
    const item = JSON.parse(localStorage.getItem('testLab-queue-v1')!)[0];
    expect(typeof item.row.routeTrail).toBe('string');
    expect(item.row.feature).toBe('Fixture');
    expect(item.row.preview).toBe(false);
  });
});
