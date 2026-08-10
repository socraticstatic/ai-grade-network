import { describe, it, expect } from 'vitest';
import { CC } from '../../engine';
import type { CloudControl } from '../../engine/types';
import { networkBinding, buildVerdict } from './networkBinding';

describe('networkBinding', () => {
  const b = networkBinding(CC);
  it('is a network binding with 6 KPIs (incl. Packet Loss), tabs, records, and a briefing', () => {
    expect(b.layer).toBe('network');
    expect(b.kpis()).toHaveLength(6);
    expect(b.kpis().some(k => /loss/i.test(k.label))).toBe(true);
    expect(b.flowTabs().length).toBeGreaterThan(0);
    expect(b.records('none').length).toBeGreaterThan(0);
    expect(b.briefing().narrative.length).toBeGreaterThan(0);
  });
  /* Rows 50-51 of the phase-0 metric audit: "Egress" read as a traffic
     measurement with a dollar sign beside it, and "Under Control" was
     builder language for what the verdict line calls "on the AT&T fabric".
     Labels only — same keys, same values, same derivations. */
  it('names the egress KPI as spend and the control KPI in the product\'s own noun', () => {
    const kpis = b.kpis();
    expect(kpis.find(k => k.key === 'egress')!.label).toBe('Egress Spend');
    expect(kpis.find(k => k.key === 'under-control')!.label).toBe('On the AT&T Fabric');
  });

  /* Rows 55-56 of the phase-0 metric audit: the briefing's first two
     narrative blocks cut — both restated the verdict line (row 46) and the
     KPI strip (rows 50-51) already state the same 13%/87% split, and row
     56's own label ("of flows") measured Gbps, not a flow count. The
     briefing still opens with real content — the engine's own summary. */
  it('the briefing does not restate the verdict line\'s percentages as narrative blocks', () => {
    const narrative = b.briefing().narrative.map(n => n.text);
    expect(narrative.some(t => /% of network traffic \(/.test(t))).toBe(false);
    expect(narrative.some(t => /% of flows \(/.test(t))).toBe(false);
    expect(b.briefing().narrative.length).toBeGreaterThan(0);
  });

  it('group-by path collapses records into private/public buckets', () => {
    const byPath = b.records('path').map(r => r.label.toLowerCase());
    expect(byPath.some(l => /private|public/.test(l))).toBe(true);
  });
  it('is deterministic', () => {
    expect(networkBinding(CC).kpis()).toEqual(networkBinding(CC).kpis());
  });
  it('states a verdict: controlled share, savings per month, and the public remainder', () => {
    const v = networkBinding(CC).verdict!;
    expect(v).toMatch(/% of your traffic rides the AT&T-controlled path/);
    expect(v).toMatch(/saving \$[\d,.]+[kM]?\/mo/);
    expect(v).toMatch(/\./); // it is a sentence, not a fragment
  });
  it('verdict is deterministic', () => {
    expect(networkBinding(CC).verdict).toEqual(networkBinding(CC).verdict);
  });
  it('verdict states the quiet-fabric sentence when there are no route flows at all', () => {
    const emptyCc = {
      routeFlows: () => [],
      routingKpis: () => ({ pctUnderControl: 0, totalGbps: 1 }),
      egress: () => ({ savings: 0 }),
    } as unknown as CloudControl;
    expect(buildVerdict(emptyCc)).toBe('No traffic yet. The fabric is quiet.');
  });
});
