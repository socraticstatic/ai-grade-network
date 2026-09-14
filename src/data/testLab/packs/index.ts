// Study Pack registry — the ONLY file through which the engine sees packs.
import type { StudyPack, TestScript } from '../../../types/testLab';
import type { StudyExport } from '../../../types/testLabBuilder';
import { customStudyToPack } from '../builderConversion';
import { loadDrafts } from '../builderDrafts';
import { lmccGa1 } from './lmcc-ga1';
/** Code-defined studies. Adding/retiring one is a one-line change here.
 *  lmcc-r1 (./lmcc-r1) retired 2026-07-10: it tested Preview behavior (1 Gbps cap)
 *  that GA removes. lmcc-ga1 is its replacement, built against the GA build. */
export const STUDY_PACKS: StudyPack[] = [lmccGa1];

// Published builder studies: JSON files committed by Helen, loaded at build time.
const publishedModules = (typeof import.meta.glob === 'function'
  ? import.meta.glob('./studies/*.json', { eager: true })
  : {}) as Record<string, { default: StudyExport }>;

function publishedPacks(): StudyPack[] {
  return Object.values(publishedModules)
    .map(m => m.default)
    .filter(x => x?.schemaVersion === 1 && !!x.study)
    .map(x => customStudyToPack(x.study));
}

function draftPacks(): StudyPack[] {
  const packs: StudyPack[] = [];
  for (const draft of loadDrafts()) {
    try { packs.push(customStudyToPack(draft)); }
    catch (err) { console.error(`[test-lab] draft "${draft?.id}" failed to convert:`, err); }
  }
  return packs;
}

/** Everything resolvable right now: code packs + published studies + local drafts. */
export function getAllPacks(): StudyPack[] {
  return [...STUDY_PACKS, ...publishedPacks(), ...draftPacks()];
}

/** Ids of builder studies that ship in the bundle (committed JSON). */
export function publishedStudyIds(): string[] {
  return Object.values(publishedModules)
    .map(m => m.default?.study?.id)
    .filter(Boolean) as string[];
}

export interface ResolvedCode {
  pack: StudyPack;
  script: TestScript;
  preview: boolean;
}

export function validatePacks(packs: StudyPack[]): string[] {
  const errors: string[] = [];
  const seenCodes = new Map<string, string>();
  for (const pack of packs) {
    for (const script of pack.scripts) {
      const where = `${pack.id}/${script.id}`;
      const persona = pack.personas.find(p => p.id === script.personaId);
      if (!persona) errors.push(`${where}: unknown persona "${script.personaId}"`);
      else if (!pack.seeds[persona.seedId]) errors.push(`${where}: unknown seed "${persona.seedId}"`);
      for (const taskId of script.taskIds) {
        const task = pack.tasks.find(t => t.id === taskId);
        if (!task) { errors.push(`${where}: unknown task "${taskId}"`); continue; }
        if (task.verifyId && !pack.verifiers[task.verifyId]) errors.push(`${where}: unknown verifier "${task.verifyId}" on task "${task.id}"`);
        if (task.reseedId && !pack.seeds[task.reseedId]) errors.push(`${where}: unknown reseed "${task.reseedId}" on task "${task.id}"`);
        if (task.catchUpSeedId && !pack.seeds[task.catchUpSeedId]) errors.push(`${where}: unknown catch-up seed "${task.catchUpSeedId}" on task "${task.id}"`);
      }
      for (const code of [...script.inviteCodes, ...script.previewCodes]) {
        const key = code.trim().toUpperCase();
        const owner = seenCodes.get(key);
        if (owner && owner !== where) errors.push(`invite code "${code}" claimed by both ${owner} and ${where}`);
        seenCodes.set(key, where);
      }
    }
  }
  return errors;
}

export function resolveInviteCode(raw: string, packs: StudyPack[] = getAllPacks()): ResolvedCode | null {
  const code = raw.trim().toUpperCase();
  if (!code) return null;
  for (const pack of packs) {
    for (const script of pack.scripts) {
      if (script.inviteCodes.some(c => c.trim().toUpperCase() === code)) return { pack, script, preview: false };
      if (script.previewCodes.some(c => c.trim().toUpperCase() === code)) return { pack, script, preview: true };
    }
  }
  return null;
}

/** Preview-mode guard against store-shape drift: run every verifier the script uses, report throwers. */
export function dryRunVerifiers(pack: StudyPack, script: TestScript, state: Record<string, any>): string[] {
  const problems: string[] = [];
  for (const taskId of script.taskIds) {
    const task = pack.tasks.find(t => t.id === taskId);
    if (!task?.verifyId) continue;
    try {
      pack.verifiers[task.verifyId]?.(state);
    } catch (err) {
      problems.push(`verifier "${task.verifyId}" (task "${task.id}") threw: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return problems;
}

// Dev-time validation on module load (drafts may be mid-edit: log, never throw).
if (import.meta.env?.DEV) {
  try {
    const errors = validatePacks(getAllPacks());
    if (errors.length) console.error('[test-lab] pack validation errors:\n' + errors.join('\n'));
  } catch (err) {
    console.error('[test-lab] pack validation failed:', err);
  }
}
