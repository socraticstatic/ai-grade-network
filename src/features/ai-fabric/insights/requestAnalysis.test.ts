import { describe, it, expect } from 'vitest';
import { CC } from '../../../engine';
import { requestRows } from './insightsFigures';
import { requestVerdict, requestFacets, requestOutliers } from './requestAnalysis';

/* The decision log starts empty under test (state-console.ts only starts the
   agents that would otherwise drive it outside `underTest`) - so this suite
   drives a handful of real traces itself, the same way insightsFigures.test.ts
   does, to give `rows` the identities/models/outcomes the facets and verdict
   are meant to describe. */
CC.promptTrace!('rd-helion', 'helion-70b', 'request analysis test · rd-helion 1');
CC.promptTrace!('rd-helion', 'helion-70b', 'request analysis test · rd-helion 2');
CC.promptTrace!('shared-services', 'gpt-class', 'request analysis test · shared-services');
/* classified-helion's token policy carries guardrail:true and scope
   'no-external'. scopeDenies only ever denies modelId 'gpt-class', so
   routing it to helion-70b instead clears the gate and lands on
   recordDecision(true, true, ...) - a genuine ok:true, guarded:true row,
   the same shape GovernanceDecisions.tsx counts as its Guardrail bar. */
CC.promptTrace!('classified-helion', 'helion-70b', 'request analysis test · classified-helion guarded');
CC.promptTrace!('classified-helion', 'gpt-class', 'request analysis test · classified-helion denied');

const rows = requestRows(CC);

describe('requestVerdict', () => {
  it('states count, outcome split, spend and savings in one sentence pair', () => {
    const v = requestVerdict(rows);
    expect(v).toMatch(new RegExp(`^${rows.length} requests today: \\d+ allowed, \\d+ guardrailed, \\d+ denied\\.`));
    expect(v).toMatch(/\$[\d,.]+ spent, \$[\d,.]+ saved\.$/);
  });
  it('empty rows return a sentence, not silence', () => {
    expect(requestVerdict([])).toBe('No requests traced yet. Run a trace to populate this view.');
  });
  it('counts a real ok+guarded row as guardrailed, not allowed', () => {
    // The seeded classified-helion/helion-70b trace above is ok:true, guarded:true.
    expect(rows.some(r => r.ok && r.guarded)).toBe(true);
    const v = requestVerdict(rows);
    const guardrailed = Number(v.match(/(\d+) guardrailed/)![1]);
    expect(guardrailed).toBeGreaterThan(0);
  });
});

describe('requestFacets', () => {
  it('returns the four facets with desc-sorted buckets whose values sum to the row count', () => {
    const facets = requestFacets(rows);
    expect(facets.map(f => f.id)).toEqual(['identity', 'model', 'route', 'outcome']);
    for (const f of facets) {
      const values = f.buckets.map(b => b.value);
      expect([...values].sort((a, b) => b - a)).toEqual(values);
      expect(values.reduce((s, v) => s + v, 0)).toBe(rows.length);
    }
  });
  it('facet buckets carry the filter vocabulary applyFilters understands', () => {
    const route = requestFacets(rows).find(f => f.id === 'route')!;
    for (const b of route.buckets) expect(b.filterKey).toBe('path');
  });
});

describe('requestOutliers', () => {
  it('top five by cost and by slowness, descending', () => {
    const { cost, slow } = requestOutliers(rows);
    expect(cost.length).toBeLessThanOrEqual(5);
    expect(slow.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < cost.length; i++) expect(cost[i].row.cost).toBeLessThanOrEqual(cost[i - 1].row.cost);
    for (let i = 1; i < slow.length; i++) expect(slow[i].row.ttftMs).toBeLessThanOrEqual(slow[i - 1].row.ttftMs);
  });
});
