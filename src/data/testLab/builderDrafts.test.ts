import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadDrafts, saveDraft, deleteDraft, duplicateAsNewRound, exportStudy, importStudy, codesForId,
} from './builderDrafts';
import type { CustomStudy } from '../../types/testLabBuilder';

const base = (): CustomStudy => ({
  id: 'planner-ga-r1', feature: 'Provisioning', featureVersion: 'GA 1116',
  persona: { id: 'p', name: 'Pat', bio: 'b', goal: 'g', rbacRole: 'ProvisioningManager' as any, seedId: '' },
  tasks: [{ id: 't1', version: 1, title: 'T', scenario: 'do', successCriteria: 'done', path: 'happy', hints: [] }],
  inviteCodes: ['PLANNER-GA-R1'], previewCodes: ['PLANNER-GA-R1-PREVIEW'],
  createdAt: '2026-07-10T00:00:00Z', updatedAt: '2026-07-10T00:00:00Z',
});

beforeEach(() => localStorage.clear());

describe('builderDrafts', () => {
  it('saves and loads drafts', () => {
    saveDraft(base());
    expect(loadDrafts().map(d => d.id)).toEqual(['planner-ga-r1']);
  });

  it('auto-bumps task version on substantive edit only', () => {
    saveDraft(base());
    const edited = base();
    edited.tasks[0].scenario = 'do something else';
    const saved = saveDraft(edited);
    expect(saved.tasks[0].version).toBe(2);
    const cosmetic = { ...saved, tasks: [{ ...saved.tasks[0], title: 'Renamed' }] };
    expect(saveDraft(cosmetic).tasks[0].version).toBe(2); // title is cosmetic
  });

  it('deletes drafts', () => {
    saveDraft(base());
    deleteDraft('planner-ga-r1');
    expect(loadDrafts()).toEqual([]);
  });

  it('duplicates as new round with bumped id and regenerated codes', () => {
    const r2 = duplicateAsNewRound(base());
    expect(r2.id).toBe('planner-ga-r2');
    expect(r2.inviteCodes).toEqual(['PLANNER-GA-R2']);
    expect(r2.previewCodes).toEqual(['PLANNER-GA-R2-PREVIEW']);
    const r3 = duplicateAsNewRound(r2);
    expect(r3.id).toBe('planner-ga-r3');
  });

  it('export/import round-trips with schema validation', () => {
    const json = exportStudy(base());
    expect(JSON.parse(json).schemaVersion).toBe(1);
    const back = importStudy(json);
    expect(back.study?.id).toBe('planner-ga-r1');
    expect(importStudy('{"nope":true}').error).toBeTruthy();
    expect(importStudy('not json').error).toBeTruthy();
  });

  it('codesForId derives codes from the id', () => {
    expect(codesForId('billing-ga-r1')).toEqual({
      inviteCodes: ['BILLING-GA-R1'], previewCodes: ['BILLING-GA-R1-PREVIEW'],
    });
  });
});
