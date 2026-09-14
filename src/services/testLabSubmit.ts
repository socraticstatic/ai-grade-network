import type { TestLabSession, TaskResult } from '../types/testLab';

const QUEUE_KEY = 'testLab-queue-v1';

let webhookOverride: string | undefined | null = null; // null = no override
export function __setWebhookForTests(url: string | undefined) { webhookOverride = url; }

function webhookUrl(): string | undefined {
  if (webhookOverride !== null) return webhookOverride;
  return (import.meta as any).env?.VITE_TESTLAB_WEBHOOK || undefined;
}
export function webhookConfigured(): boolean { return !!webhookUrl(); }

type QueueItem = { kind: 'task' | 'session'; row: Record<string, unknown> };

function readQueue(): QueueItem[] {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]'); } catch { return []; }
}
function writeQueue(items: QueueItem[]) {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(items)); } catch { /* ignore */ }
}
export function queueLength(): number { return readQueue().length; }

function sessionColumns(s: TestLabSession) {
  return {
    sessionId: s.sessionId, inviteCode: s.inviteCode, preview: s.preview,
    participantName: s.participantName, packId: s.packId, feature: s.feature,
    featureVersion: s.featureVersion, scriptId: s.scriptId, personaId: s.personaId,
    appBuild: s.appBuild, userAgent: s.userAgent,
    sessionStartedAt: new Date(s.startedAt).toISOString(),
  };
}

export function enqueueTaskRow(s: TestLabSession, r: TaskResult): void {
  const row = {
    ...sessionColumns(s),
    taskId: r.taskId, taskVersion: r.taskVersion, path: r.path, outcome: r.outcome,
    verified: r.verified, directness: r.directness, durationMs: r.durationMs,
    hintsUsed: r.hintsUsed, easeRating: r.easeRating ?? '',
    comprehensionCorrect: r.comprehensionCorrect ?? '',
    comprehensionAnswer: r.comprehensionAnswer ?? '',
    giveUpReason: r.giveUpReason ?? '',
    comment: r.comment ?? '',
    firstClickLabel: r.firstClick?.label ?? '', firstClickRoute: r.firstClick?.route ?? '',
    routeTrail: JSON.stringify(r.routeTrail), issues: JSON.stringify(r.issues),
    taskStartedAt: new Date(r.startedAt).toISOString(), taskEndedAt: new Date(r.endedAt).toISOString(),
  };
  writeQueue([...readQueue(), { kind: 'task', row }]);
}

export function enqueueSessionRow(s: TestLabSession): void {
  const row = {
    ...sessionColumns(s),
    completedAt: s.completedAt ? new Date(s.completedAt).toISOString() : '',
    taskCount: s.results.length,
    verifiedCount: s.results.filter(r => r.outcome === 'verified').length,
    gaveUpCount: s.results.filter(r => r.outcome === 'gave-up').length,
    umuxCapabilities: s.wrapUp?.umuxCapabilities ?? '',
    umuxEaseOfUse: s.wrapUp?.umuxEaseOfUse ?? '',
    likedMost: s.wrapUp?.likedMost ?? '', likedLeast: s.wrapUp?.likedLeast ?? '',
  };
  writeQueue([...readQueue(), { kind: 'session', row }]);
}

export async function flushQueue(): Promise<{ sent: number; remaining: number }> {
  const url = webhookUrl();
  let queue = readQueue();
  if (!url || queue.length === 0) return { sent: 0, remaining: queue.length };
  const token = (import.meta as any).env?.VITE_TESTLAB_TOKEN ?? '';
  let sent = 0;
  while (queue.length > 0) {
    const item = queue[0];
    try {
      // Apps Script pattern: text/plain + no-cors avoids preflight; response is opaque.
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ token, kind: item.kind, row: item.row }),
      });
      sent += 1;
      queue = queue.slice(1);
      writeQueue(queue);
    } catch {
      break; // offline — keep the rest for retry
    }
  }
  return { sent, remaining: queue.length };
}

export function downloadSessionJson(s: TestLabSession): void {
  const blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `testlab-${s.packId}-${s.sessionId.slice(0, 8)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
