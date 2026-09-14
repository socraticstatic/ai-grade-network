import { describe, it, expect, afterEach } from 'vitest';
import { CC } from '../../engine/index';
import { applyEstateProfile } from '../../engine/estateProfile';
import { advisorDraft } from '../discover/stackFigures';
import { advisorFindings, advisorHeadline, headStart } from './advisorModel';

/* Meridian/acme swap idiom established in
 * src/engine/meridianRegionGuards.test.ts — the engine is a shared
 * singleton, so every test restores acme in a finally, and afterEach is a
 * belt-and-braces restore for a test whose own finally never runs (e.g. an
 * assertion throws mid-test). */
describe('advisorModel', () => {
  afterEach(() => {
    applyEstateProfile(CC as never, 'acme');
  });

  describe('advisorFindings', () => {
    it('under meridian: all four kinds present, count > 0, in fixed order', () => {
      applyEstateProfile(CC as never, 'meridian');
      try {
        const findings = advisorFindings(CC as never);
        expect(findings.map(f => f.kind)).toEqual([
          'untracked-ai',
          'unattached-regions',
          'egress-bleed',
          'exposed-spof',
        ]);
        for (const f of findings) expect(f.count).toBeGreaterThan(0);
      } finally {
        applyEstateProfile(CC as never, 'acme');
      }
    });

    it('under meridian: untracked-ai count equals the untagged ai-lab vpcs in the seed (one per region, 4 regions)', () => {
      applyEstateProfile(CC as never, 'meridian');
      try {
        const finding = advisorFindings(CC as never).find(f => f.kind === 'untracked-ai');
        expect(finding?.count).toBe(4);
        expect(finding?.savingsMo).toBeNull();
      } finally {
        applyEstateProfile(CC as never, 'acme');
      }
    });

    it('under meridian: exposed-spof merges spof regions (1: eus2) and exposed vpcs (0) — count 1', () => {
      applyEstateProfile(CC as never, 'meridian');
      try {
        const finding = advisorFindings(CC as never).find(f => f.kind === 'exposed-spof');
        expect(finding?.count).toBe(1);
        expect(finding?.savingsMo).toBeNull();
      } finally {
        applyEstateProfile(CC as never, 'acme');
      }
    });

    it('under acme: unattached-regions and egress-bleed are present with count > 0', () => {
      const findings = advisorFindings(CC as never);
      const kinds = findings.map(f => f.kind);
      expect(kinds).toContain('unattached-regions');
      expect(kinds).toContain('egress-bleed');
      for (const kind of ['unattached-regions', 'egress-bleed'] as const) {
        const f = findings.find(x => x.kind === kind)!;
        expect(f.count).toBeGreaterThan(0);
        expect(f.savingsMo).not.toBeNull();
        expect(f.savingsMo).toBeGreaterThan(0);
      }
    });

    it('under acme: untracked-ai is omitted (both AI vpcs — cwgpu, nbgpu — carry a governance tag)', () => {
      const kinds = advisorFindings(CC as never).map(f => f.kind);
      expect(kinds).not.toContain('untracked-ai');
    });

    it('under acme: exposed-spof merges spof regions (1: uks) and exposed vpcs (1: vpc-dmz-03 · internet-facing) — count 2', () => {
      const finding = advisorFindings(CC as never).find(f => f.kind === 'exposed-spof');
      expect(finding?.count).toBe(2);
      expect(finding?.savingsMo).toBeNull();
    });

    it('findings render verbatim: title/evidence/why are non-empty strings, evidence carries the count, no retired-brand references anywhere', () => {
      // Built by concatenation, not a literal, so this guard itself doesn't
      // trip src/__tests__/rebrand.test.ts's scan for the retired brand
      // string across tracked src/**/*.ts files.
      const retiredBrand = ['Cloud', 'Connect'].join(' ');
      const retiredBrandPattern = new RegExp(retiredBrand, 'i');
      for (const f of advisorFindings(CC as never)) {
        expect(f.title.length).toBeGreaterThan(0);
        expect(f.evidence.length).toBeGreaterThan(0);
        expect(f.why.length).toBeGreaterThan(0);
        expect(f.title).not.toMatch(retiredBrandPattern);
        expect(f.evidence).not.toMatch(retiredBrandPattern);
        expect(f.why).not.toMatch(retiredBrandPattern);
      }
    });
  });

  describe('advisorHeadline', () => {
    it('savingsMo equals advisorDraft(cc).deltas.egressSavingMo under acme', () => {
      expect(advisorHeadline(CC as never).savingsMo).toBe(advisorDraft(CC as never).deltas.egressSavingMo);
    });

    it('savingsMo equals advisorDraft(cc).deltas.egressSavingMo under meridian', () => {
      applyEstateProfile(CC as never, 'meridian');
      try {
        expect(advisorHeadline(CC as never).savingsMo).toBe(advisorDraft(CC as never).deltas.egressSavingMo);
      } finally {
        applyEstateProfile(CC as never, 'acme');
      }
    });

    it('findings equals advisorFindings(cc).length', () => {
      expect(advisorHeadline(CC as never).findings).toBe(advisorFindings(CC as never).length);
      applyEstateProfile(CC as never, 'meridian');
      try {
        expect(advisorHeadline(CC as never).findings).toBe(advisorFindings(CC as never).length);
      } finally {
        applyEstateProfile(CC as never, 'acme');
      }
    });
  });

  describe('headStart', () => {
    it('totals 4,183 and exact per-class counts under meridian, in dc→office→branch→atm order', () => {
      applyEstateProfile(CC as never, 'meridian');
      try {
        const hs = headStart(CC as never);
        expect(hs.total).toBe(4183);
        expect(hs.byClass).toEqual([
          { siteClass: 'dc', count: 3 },
          { siteClass: 'office', count: 210 },
          { siteClass: 'branch', count: 2840 },
          { siteClass: 'atm', count: 1130 },
        ]);
        expect(hs.onNet).toBe(3 + 210 + 2840 + 456); // atm: 60% off-net per meridianEstate's rnd() < 0.6 branch
        expect(hs.cloudsVisible).toBe(true); // aws attached:true under meridian
      } finally {
        applyEstateProfile(CC as never, 'acme');
      }
    });

    it('under acme: totals match siteRollup (1 dc + 5 offices = 6 sites, all on-net) and cloudsVisible is true (aws attached)', () => {
      const hs = headStart(CC as never);
      expect(hs.total).toBe(6);
      expect(hs.onNet).toBe(6);
      expect(hs.byClass).toEqual([
        { siteClass: 'dc', count: 1 },
        { siteClass: 'office', count: 5 },
      ]);
      expect(hs.cloudsVisible).toBe(true);
    });
  });
});
