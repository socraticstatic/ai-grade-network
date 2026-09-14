/**
 * Findings: turn raw TaskResults rows (pasted straight from the results sheet as CSV)
 * into the numbers a study reader actually wants — success rates, time-on-task,
 * the misconceptions named by wrong comprehension answers, and why people gave up.
 * Pure functions; no network, no store.
 */

export interface TaskResultRow {
  sessionId: string;
  preview: boolean;
  taskId: string;
  outcome: string;
  verified: boolean;
  durationMs: number;
  hintsUsed: number;
  easeRating: number | null;
  comprehensionCorrect: boolean | null;
  comprehensionAnswer: string;
  giveUpReason: string;
  participantName: string;
}

export interface TaskFinding {
  taskId: string;
  n: number;
  verifiedPct: number;
  gaveUpPct: number;
  medianDurationS: number;
  meanEase: number | null;
  hintsPerRun: number;
  comprehensionPct: number | null;
  misconceptions: { answer: string; count: number }[];
  giveUpReasons: { reason: string; count: number }[];
}

/** RFC-4180 CSV parser: quoted fields may contain commas, quotes ("" escape), newlines. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field); field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      rows.push(row); row = [];
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.length > 1 || (r.length === 1 && r[0] !== ''));
}

const truthy = (v: string) => /^true$/i.test(v.trim());

export function parseTaskResultsCsv(text: string): TaskResultRow[] {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const header = rows[0].map(h => h.trim());
  const idx = (name: string) => header.indexOf(name);
  const col = (r: string[], name: string) => { const i = idx(name); return i >= 0 ? (r[i] ?? '') : ''; };
  return rows.slice(1)
    .filter(r => col(r, 'taskId') !== '')
    .map(r => ({
      sessionId: col(r, 'sessionId'),
      preview: truthy(col(r, 'preview')),
      taskId: col(r, 'taskId'),
      outcome: col(r, 'outcome'),
      verified: truthy(col(r, 'verified')),
      durationMs: Number(col(r, 'durationMs')) || 0,
      hintsUsed: Number(col(r, 'hintsUsed')) || 0,
      easeRating: col(r, 'easeRating') === '' ? null : Number(col(r, 'easeRating')),
      comprehensionCorrect: col(r, 'comprehensionCorrect') === '' ? null : truthy(col(r, 'comprehensionCorrect')),
      comprehensionAnswer: col(r, 'comprehensionAnswer'),
      giveUpReason: col(r, 'giveUpReason'),
      participantName: col(r, 'participantName'),
    }));
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function tally(values: string[]): { key: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const v of values) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
}

export function aggregateFindings(
  rows: TaskResultRow[],
  opts: { includePreview?: boolean } = {},
): TaskFinding[] {
  const usable = opts.includePreview ? rows : rows.filter(r => !r.preview);
  const byTask = new Map<string, TaskResultRow[]>();
  for (const r of usable) {
    if (!byTask.has(r.taskId)) byTask.set(r.taskId, []);
    byTask.get(r.taskId)!.push(r);
  }
  const findings: TaskFinding[] = [];
  for (const [taskId, taskRows] of byTask) {
    const n = taskRows.length;
    const eases = taskRows.map(r => r.easeRating).filter((v): v is number => v != null);
    const compRows = taskRows.filter(r => r.comprehensionCorrect !== null);
    findings.push({
      taskId,
      n,
      verifiedPct: Math.round((taskRows.filter(r => r.verified).length / n) * 100),
      gaveUpPct: Math.round((taskRows.filter(r => r.outcome === 'gave-up').length / n) * 100),
      medianDurationS: Math.round(median(taskRows.map(r => r.durationMs)) / 1000),
      meanEase: eases.length ? Math.round((eases.reduce((a, b) => a + b, 0) / eases.length) * 10) / 10 : null,
      hintsPerRun: Math.round((taskRows.reduce((a, r) => a + r.hintsUsed, 0) / n) * 10) / 10,
      comprehensionPct: compRows.length
        ? Math.round((compRows.filter(r => r.comprehensionCorrect).length / compRows.length) * 100)
        : null,
      misconceptions: tally(
        taskRows.filter(r => r.comprehensionCorrect === false).map(r => r.comprehensionAnswer),
      ).map(({ key, count }) => ({ answer: key, count })),
      giveUpReasons: tally(taskRows.map(r => r.giveUpReason)).map(({ key, count }) => ({ reason: key, count })),
    });
  }
  // Worst first: the reader's eye should land on the problem.
  return findings.sort((a, b) => a.verifiedPct - b.verifiedPct);
}
