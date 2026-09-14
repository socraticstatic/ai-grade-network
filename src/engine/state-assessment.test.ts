import { describe, it, expect } from 'vitest';
import { CC } from './index';

/**
 * The assessment stage machine and its all-derived report. Engine
 * singleton: read-only report assertions first, stage mutations last,
 * everything unwound through the same Undo it asserts.
 */

(CC.agentList() as { id: string; enabled: boolean }[])
  .filter(a => a.enabled)
  .forEach(a => CC.toggleAgent(a.id));

describe('the report derives from the same getters the portal states', () => {
  it('recoverable money is arbitrage plus the AI routing saving', () => {
    const r = CC.assessmentReport();
    expect(r.recoverableMo).toBeCloseTo(CC.arbitrage().availableSavings + r.aiSavingMo, 6);
    expect(r.aiSavingMo).toBeGreaterThanOrEqual(0);
  });

  it('security events are denials plus violations, each source named', () => {
    const r = CC.assessmentReport();
    const denials = CC.decisionLog!().filter(d => !d.allowed).length;
    expect(r.securityBreakdown).toEqual({ denials, violations: CC.violations().length });
    expect(r.securityEvents).toBe(denials + CC.violations().length);
  });

  it('wasted milliseconds sum the fabric delta of unattached regions only', () => {
    const r = CC.assessmentReport();
    const expected = CC.fabricModel().regions
      .filter(x => !x.attached)
      .reduce((s, x) => {
        const L = CC.regionLatency(x.regionId)!;
        return s + Math.max(0, L.publicMs - L.privateMs);
      }, 0);
    expect(r.msWasted).toBe(Math.round(expected));
  });

  it('the invisible share names its basis on an unmetered estate', () => {
    const r = CC.assessmentReport();
    expect(['tokens', 'flows']).toContain(r.invisibleBasis);
    expect(r.invisibleSharePct).toBeGreaterThanOrEqual(0);
    expect(r.invisibleSharePct).toBeLessThanOrEqual(100);
  });

  it('counters count what their labels claim', () => {
    const r = CC.assessmentReport();
    expect(r.counters.identities).toBe(CC.tokenMeterList().length);
    expect(r.counters.requestsAnalyzed).toBe(CC.decisionLog!().length);
    expect(r.counters.toolsInUse).toBe((CC.modelCatalog!() as unknown[]).length);
    expect(r.counters.ungovernedTools).toBe(
      (CC.modelRoutes!() as { path: string }[]).filter(x => x.path === 'public').length,
    );
  });

  it('a driven trace moves requestsAnalyzed - the counters are live', () => {
    const before = CC.assessmentReport().counters.requestsAnalyzed;
    CC.promptTrace!('rd-helion', 'helion-70b', 'assessment counter drive');
    expect(CC.assessmentReport().counters.requestsAnalyzed).toBe(before + 1);
  });
});

describe('the stage machine', () => {
  it('walks not-started → measuring → report → closed, gated at every step', () => {
    expect(CC.assessment().stage).toBe('not-started');
    expect(CC.advanceAssessment(), 'cannot advance before starting').toBe(false);
    expect(CC.closeAssessment(), 'cannot close before the report').toBe(false);

    expect(CC.startAssessment()).toBe(true);
    expect(CC.assessment()).toMatchObject({ stage: 'measuring', day: 1 });
    expect(CC.startAssessment(), 'cannot start twice').toBe(false);

    expect(CC.advanceAssessment(5)).toBe(true);
    expect(CC.assessment()).toMatchObject({ stage: 'measuring', day: 6 });

    expect(CC.advanceAssessment(99)).toBe(true);
    expect(CC.assessment()).toMatchObject({ stage: 'report', day: 14 });

    expect(CC.closeAssessment()).toBe(true);
    expect(CC.assessment().stage).toBe('closed');
  });

  it('undo unwinds the stages in order', () => {
    CC.undo(); // close
    expect(CC.assessment().stage).toBe('report');
    CC.undo(); // the 99-day advance
    expect(CC.assessment()).toMatchObject({ stage: 'measuring', day: 6 });
    CC.undo(); // the 5-day advance
    expect(CC.assessment()).toMatchObject({ stage: 'measuring', day: 1 });
    CC.undo(); // the start
    expect(CC.assessment().stage).toBe('not-started');
  });

  it('a started assessment rides the share payload and lands mid-stage', () => {
    CC.startAssessment();
    CC.advanceAssessment(3);
    const s = CC.serialize();
    expect(s.length).toBeGreaterThan(0);

    // Recipient simulation: unwind locally, then replay the payload.
    CC.undo();
    CC.undo();
    expect(CC.assessment().stage).toBe('not-started');
    expect(CC.applyShareData(s)).not.toBe(false);
    expect(CC.assessment()).toMatchObject({ stage: 'measuring', day: 4 });
  });
});
