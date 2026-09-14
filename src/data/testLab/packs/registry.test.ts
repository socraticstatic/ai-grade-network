import { describe, it, expect } from 'vitest';
import { validatePacks, resolveInviteCode, dryRunVerifiers, getAllPacks } from './index';
import { saveDraft } from '../builderDrafts';
import type { StudyPack } from '../../../types/testLab';

const fixturePack = (over: Partial<StudyPack> = {}): StudyPack => ({
  id: 'fix-1',
  feature: 'Fixture',
  featureVersion: 'v1',
  personas: [{ id: 'p1', name: 'Pat', bio: 'b', goal: 'g', rbacRole: 'NetworkEngineer' as any, seedId: 's1' }],
  tasks: [
    { id: 't1', version: 1, title: 'T1', scenario: 'do it', successCriteria: 'done', path: 'happy', verifyId: 'v1', hints: [] },
    { id: 't2', version: 1, title: 'T2', scenario: 'do more', successCriteria: 'done', path: 'happy', hints: [], catchUpSeedId: 's1' },
  ],
  scripts: [{ id: 'sc1', personaId: 'p1', taskIds: ['t1', 't2'], inviteCodes: ['FIX-1'], previewCodes: ['FIX-PREVIEW'] }],
  verifiers: { v1: (s) => s.flag === true },
  seeds: { s1: ({ set }) => set({ seeded: true }) },
  ...over,
});

describe('validatePacks', () => {
  it('passes a well-formed pack', () => {
    expect(validatePacks([fixturePack()])).toEqual([]);
  });

  it('flags unknown persona, task, verifier, seed references', () => {
    const bad = fixturePack({
      scripts: [{ id: 'sc1', personaId: 'nope', taskIds: ['t1', 'missing'], inviteCodes: ['X-1'], previewCodes: [] }],
      tasks: [{ id: 't1', version: 1, title: 'T1', scenario: 's', successCriteria: 'c', path: 'happy', verifyId: 'ghost', hints: [] }],
    });
    const errors = validatePacks([bad]);
    expect(errors.some(e => e.includes('nope'))).toBe(true);
    expect(errors.some(e => e.includes('missing'))).toBe(true);
    expect(errors.some(e => e.includes('ghost'))).toBe(true);
  });

  it('flags invite-code collisions across packs', () => {
    const a = fixturePack();
    const b = fixturePack({ id: 'fix-2' });
    const errors = validatePacks([a, b]);
    expect(errors.some(e => e.toLowerCase().includes('code'))).toBe(true);
  });
});

describe('resolveInviteCode', () => {
  it('resolves codes case-insensitively with trim', () => {
    const packs = [fixturePack()];
    const hit = resolveInviteCode('  fix-1 ', packs);
    expect(hit?.script.id).toBe('sc1');
    expect(hit?.preview).toBe(false);
  });

  it('marks preview codes as preview', () => {
    expect(resolveInviteCode('FIX-PREVIEW', [fixturePack()])?.preview).toBe(true);
  });

  it('returns null for unknown codes', () => {
    expect(resolveInviteCode('NOPE', [fixturePack()])).toBeNull();
  });
});

describe('getAllPacks', () => {
  it('includes code packs and localStorage drafts', () => {
    localStorage.clear();
    const before = getAllPacks().length;
    saveDraft({
      id: 'draft-x-r1', feature: 'X', featureVersion: 'GA', createdAt: 'c', updatedAt: 'u',
      persona: { id: 'p', name: 'P', bio: 'b', goal: 'g', rbacRole: 'Viewer' as any, seedId: '' },
      tasks: [{ id: 't', version: 1, title: 'T', scenario: 's', successCriteria: 'c', path: 'happy', hints: [] }],
      inviteCodes: ['DRAFT-X-R1'], previewCodes: ['DRAFT-X-R1-PREVIEW'],
    });
    const packs = getAllPacks();
    expect(packs.length).toBe(before + 1);
    expect(packs.some(p => p.id === 'draft-x-r1')).toBe(true);
  });

  it('resolves draft invite codes (default packs source)', () => {
    expect(resolveInviteCode('draft-x-r1')?.pack.id).toBe('draft-x-r1');
    expect(resolveInviteCode('DRAFT-X-R1-PREVIEW')?.preview).toBe(true);
    localStorage.clear();
    expect(resolveInviteCode('DRAFT-X-R1')).toBeNull();
  });
});

describe('dryRunVerifiers', () => {
  it('reports verifiers that throw', () => {
    const pack = fixturePack({ verifiers: { v1: () => { throw new Error('store drift'); } } });
    const problems = dryRunVerifiers(pack, pack.scripts[0], {});
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('v1');
  });

  it('reports nothing when verifiers run clean', () => {
    expect(dryRunVerifiers(fixturePack(), fixturePack().scripts[0], { flag: false })).toEqual([]);
  });
});
