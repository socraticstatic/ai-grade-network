import { describe, it, expect } from 'vitest';
import { PERSONA_LIBRARY } from './personaLibrary';
import { TASK_TEMPLATES, instantiateTemplate } from './taskTemplates';
import { VERIFIER_CATALOG } from './verifierCatalog';
import { ROLE_CATALOG } from '../roleCatalog';

describe('persona library', () => {
  it('has the 13 agreed personas with valid RBAC roles', () => {
    expect(PERSONA_LIBRARY).toHaveLength(13); // +Feature Owner, added 2026-07-11 for Monday's round
    expect(PERSONA_LIBRARY.some(p => p.id === 'feature-owner')).toBe(true);
    for (const p of PERSONA_LIBRARY) {
      expect(ROLE_CATALOG[p.rbacRole], `${p.id} role ${p.rbacRole}`).toBeDefined();
      expect(p.bio.length, `${p.id} bio`).toBeGreaterThan(40);
      expect(p.goal.length, `${p.id} goal`).toBeGreaterThan(20);
    }
  });

  it('suggested templates all exist and every persona has at least 3', () => {
    const ids = new Set(TASK_TEMPLATES.map(t => t.id));
    for (const p of PERSONA_LIBRARY) {
      expect(p.suggestedTemplateIds.length, p.id).toBeGreaterThanOrEqual(3);
      for (const tid of p.suggestedTemplateIds) expect(ids.has(tid), `${p.id} → ${tid}`).toBe(true);
    }
  });
});

describe('task templates', () => {
  it('every verifier ref resolves to the catalog', () => {
    const catalogIds = new Set(VERIFIER_CATALOG.map(c => c.id));
    for (const t of TASK_TEMPLATES) {
      if (t.task.verifierRef) expect(catalogIds.has(t.task.verifierRef.catalogId), t.id).toBe(true);
    }
  });

  it('every template is complete', () => {
    for (const t of TASK_TEMPLATES) {
      expect(t.task.scenario.length, `${t.id} scenario`).toBeGreaterThan(40);
      expect(t.task.successCriteria.length, `${t.id} criteria`).toBeGreaterThan(10);
      expect(t.personaIds.length, `${t.id} personas`).toBeGreaterThan(0);
      if (t.task.path === 'permission-wall') expect(t.task.comprehensionCheck, t.id).toBeDefined();
      if (t.task.comprehensionCheck) {
        expect(t.task.comprehensionCheck.options.length, t.id).toBeGreaterThanOrEqual(3);
        expect(t.task.comprehensionCheck.correctIndex, t.id).toBeLessThan(t.task.comprehensionCheck.options.length);
      }
    }
  });

  it('no preview-era framing (GA constraint)', () => {
    for (const t of TASK_TEMPLATES) {
      expect(/preview/i.test(t.task.scenario), t.id).toBe(false);
    }
  });

  it('instantiateTemplate assigns id and version', () => {
    const c = instantiateTemplate(TASK_TEMPLATES[0], 3);
    expect(c.id).toBe(`${TASK_TEMPLATES[0].id}-3`);
    expect(c.version).toBe(1);
  });
});
