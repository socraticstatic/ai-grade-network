import { describe, it, expect, afterEach } from 'vitest';
import { CC } from './index';
import { applyEstateProfile } from './estateProfile';

/* Fix-wave review Finding 1/2 — meridian's estate swap removes acme's own
 * seed region ids (uks, euw1, wus2) from CC.regions, but several engine
 * derivations hardcoded `.find(r=>r.id==='uks')` etc with no null guard,
 * so calling them under `?estate=meridian` threw straight into React and
 * white-screened /naas/observe, /naas/govern, /netops. These are the
 * exact derivations those routes bind to. The engine is a shared
 * singleton — every test here restores acme in `finally`. */
describe('meridian region-guard regression', () => {
  afterEach(() => {
    // belt-and-braces: also restore after any test that doesn't reach its
    // own finally (e.g. an assertion throws mid-test).
    applyEstateProfile(CC as never, 'acme');
  });

  it('scores() and posture() do not throw under meridian (state.ts uks guard) — /naas/govern PosturePanel calls these', () => {
    applyEstateProfile(CC as never, 'meridian');
    try {
      expect(() => CC.scores()).not.toThrow();
      expect(() => CC.posture()).not.toThrow();
      const s = CC.scores();
      expect(typeof s.perf).toBe('number');
      expect(Number.isNaN(s.perf)).toBe(false);
    } finally {
      applyEstateProfile(CC as never, 'acme');
    }
  });

  it('obsSummary() does not throw under meridian (state-telemetry.ts euw1 guard) — /naas/observe renders this', () => {
    applyEstateProfile(CC as never, 'meridian');
    try {
      expect(() => CC.obsSummary()).not.toThrow();
      expect(typeof CC.obsSummary()).toBe('string');
    } finally {
      applyEstateProfile(CC as never, 'acme');
    }
  });

  it('the seeded anomaly explain() does not throw under meridian — /netops signal() calls this by default (no live incident)', () => {
    applyEstateProfile(CC as never, 'meridian');
    try {
      const t = CC.telemetry(56);
      expect(() => t.anomaly.explain()).not.toThrow();
      expect(typeof t.anomaly.explain()).toBe('string');
    } finally {
      applyEstateProfile(CC as never, 'acme');
    }
  });

  it('scores()/posture() do not throw under meridian via the nextMove ranking path (state.ts designedPublic vpcdmz guard) — /naas/govern NextMoveBand calls previewFix -> project -> posture -> scores -> publicVpcs -> designedPublic', () => {
    applyEstateProfile(CC as never, 'meridian');
    try {
      // designedPublic() reads vpcs.use1.find(v=>v.id==='vpcdmz') — 'vpcdmz'
      // is acme's own seed VPC id. meridian replaces cc.vpcs.use1 wholesale
      // with its own hub+spoke VPCs, so the id doesn't resolve there.
      expect(() => CC.previewFix('fwInspection')).not.toThrow();
      expect(() => CC.previewFix('isolateFinance')).not.toThrow();
      expect(() => CC.plan()).not.toThrow();
    } finally {
      applyEstateProfile(CC as never, 'acme');
    }
  });

  it('every postureCatalog category renders score()/summary() under meridian — /naas/govern PosturePanel and /netops both read this catalog', () => {
    applyEstateProfile(CC as never, 'meridian');
    try {
      const cats = CC.postureCatalog as { id: string; score: () => number; summary: () => string }[];
      expect(cats.length).toBeGreaterThan(0);
      for (const cat of cats) {
        expect(() => cat.score(), `${cat.id}.score() threw under meridian`).not.toThrow();
        expect(() => cat.summary(), `${cat.id}.summary() threw under meridian`).not.toThrow();
      }
    } finally {
      applyEstateProfile(CC as never, 'acme');
    }
  });

  it('acme byte-equivalence: scores(), obsSummary(), and postureCatalog summaries are identical before and after a meridian round trip', () => {
    const scoresBefore = CC.scores();
    const summaryBefore = CC.obsSummary();
    const postureBefore = (CC.postureCatalog as { summary: () => string }[]).map(c => c.summary());

    applyEstateProfile(CC as never, 'meridian');
    applyEstateProfile(CC as never, 'acme');

    expect(CC.scores()).toEqual(scoresBefore);
    expect(CC.obsSummary()).toBe(summaryBefore);
    expect((CC.postureCatalog as { summary: () => string }[]).map(c => c.summary())).toEqual(postureBefore);
  });

  it('Finding 2: cloudToCloud pairs under meridian resolve only where both endpoint regions exist (2 of 4)', () => {
    applyEstateProfile(CC as never, 'meridian');
    try {
      const c2cRows = CC.routeFlows().filter((r: { kind: string }) => r.kind === 'c2c');
      // meridian keeps aws/use1 and azure/wus2->scus swap drops wus2, so
      // c2c-aws-azure and c2c-azure-neb (both anchored on azure/wus2) drop;
      // c2c-aws-gcp and c2c-aws-cw (anchored on aws/use1 + gcp/cw, both
      // untouched by meridian) still resolve.
      expect(c2cRows.map((r: { id: string }) => r.id).sort()).toEqual(['c2c-aws-cw', 'c2c-aws-gcp']);
      for (const row of c2cRows) {
        expect(row).not.toBeNull();
      }
    } finally {
      applyEstateProfile(CC as never, 'acme');
    }
  });

  it('cloudToCloud under acme still resolves all 4 pairs (byte-equivalence)', () => {
    const c2cRows = CC.routeFlows().filter((r: { kind: string }) => r.kind === 'c2c');
    expect(c2cRows.map((r: { id: string }) => r.id).sort()).toEqual([
      'c2c-aws-azure',
      'c2c-aws-cw',
      'c2c-aws-gcp',
      'c2c-azure-neb',
    ]);
  });
});
