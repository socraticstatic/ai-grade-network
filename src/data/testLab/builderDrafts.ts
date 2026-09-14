import type { CustomStudy, CustomTask, StudyExport } from '../../types/testLabBuilder';

const DRAFTS_KEY = 'testLab-drafts-v1';

export const nowIso = () => new Date().toISOString();

export function loadDrafts(): CustomStudy[] {
  try { return JSON.parse(localStorage.getItem(DRAFTS_KEY) ?? '[]'); } catch { return []; }
}

function writeDrafts(drafts: CustomStudy[]) {
  try { localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts)); } catch { /* ignore */ }
}

/** Substance = what changes the meaning of a result row. Title/hints are cosmetic. */
const substance = (t: CustomTask) => JSON.stringify({
  scenario: t.scenario, path: t.path, verifierRef: t.verifierRef ?? null,
  comprehensionCheck: t.comprehensionCheck ?? null,
});

export function saveDraft(study: CustomStudy): CustomStudy {
  const drafts = loadDrafts();
  const prev = drafts.find(d => d.id === study.id);
  const tasks = study.tasks.map(t => {
    const before = prev?.tasks.find(p => p.id === t.id);
    if (before && substance(before) !== substance(t) && t.version <= before.version) {
      return { ...t, version: before.version + 1 };
    }
    return t;
  });
  const saved: CustomStudy = { ...study, tasks, updatedAt: nowIso() };
  writeDrafts([...drafts.filter(d => d.id !== study.id), saved]);
  return saved;
}

export function deleteDraft(id: string): void {
  writeDrafts(loadDrafts().filter(d => d.id !== id));
}

export function codesForId(id: string): { inviteCodes: string[]; previewCodes: string[] } {
  const code = id.toUpperCase();
  return { inviteCodes: [code], previewCodes: [`${code}-PREVIEW`] };
}

export function duplicateAsNewRound(study: CustomStudy): CustomStudy {
  const m = study.id.match(/^(.*)-r(\d+)$/);
  const id = m ? `${m[1]}-r${Number(m[2]) + 1}` : `${study.id}-r2`;
  return { ...study, id, ...codesForId(id), createdAt: nowIso(), updatedAt: nowIso() };
}

export function exportStudy(study: CustomStudy): string {
  const payload: StudyExport = { schemaVersion: 1, study };
  return JSON.stringify(payload, null, 2);
}

export function importStudy(json: string): { study?: CustomStudy; error?: string } {
  try {
    const parsed = JSON.parse(json);
    if (parsed?.schemaVersion !== 1 || !parsed.study?.id || !Array.isArray(parsed.study?.tasks)) {
      return { error: 'Not a Test Lab study export (expected schemaVersion 1 with a study).' };
    }
    return { study: parsed.study as CustomStudy };
  } catch {
    return { error: 'Invalid JSON.' };
  }
}
