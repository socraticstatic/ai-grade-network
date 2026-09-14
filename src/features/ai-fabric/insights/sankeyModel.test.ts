import { describe, it, expect, beforeAll } from 'vitest';
import { CC } from '../../../engine';
import { aiSpendRows } from '../aiSpend';
import { sankeyGraph } from './sankeyModel';

/* These tests drive the real engine, not fixtures: the graph's whole promise
   is that every bar and ribbon is an aiSpendRows() figure at call time. Each
   assertion derives graph and rows inside one synchronous test body, so the
   engine's 3s/7s tick timers cannot meter tokens between the two reads. */

describe('sankeyGraph — one path per metered identity, values from aiSpend', () => {
  beforeAll(() => {
    // Force the spend basis: one real trace meters real tokens at a real
    // price, so spendToday > 0 for at least one identity from here on.
    CC.promptTrace('rd-helion', 'helion-70b', 'sankey model test');
  });

  it('draws one path per metered identity, keyed by its tag', () => {
    const g = sankeyGraph(CC);
    const rows = aiSpendRows(CC);
    expect(g.paths.length).toBe(rows.length);
    expect(g.paths.map(p => p.id).sort()).toEqual(rows.map(r => r.tag).sort());
  });

  it('titles exactly four columns with our estate nouns', () => {
    const g = sankeyGraph(CC);
    expect(g.columns).toEqual([
      { title: 'Identity', subtitle: 'User / Agent' },
      { title: 'Source', subtitle: 'Model endpoint' },
      { title: 'Fabric route', subtitle: 'Egress path' },
      { title: 'Provider / model', subtitle: 'Destination' },
    ]);
  });

  it('every path walks four existing nodes, one per column in order', () => {
    const g = sankeyGraph(CC);
    for (const p of g.paths) {
      expect(p.nodes).toHaveLength(4);
      p.nodes.forEach((id, col) => {
        const node = g.nodes.find(n => n.id === id);
        expect(node, `${p.id} hop ${col} (${id}) must exist`).toBeDefined();
        expect(node!.col).toBe(col);
      });
    }
  });

  it('a node states the sum of the paths through it, and totalValue the sum of all', () => {
    const g = sankeyGraph(CC);
    for (const n of g.nodes) {
      const through = g.paths
        .filter(p => p.nodes.includes(n.id))
        .reduce((s, p) => s + p.value, 0);
      expect(n.value, `node ${n.id}`).toBeCloseTo(through, 10);
    }
    const all = g.paths.reduce((s, p) => s + p.value, 0);
    expect(g.totalValue).toBeCloseTo(all, 10);
  });

  it('a driven trace forces the spend basis, and every $ figure is aiSpendRows money', () => {
    const g = sankeyGraph(CC);
    const rows = aiSpendRows(CC);
    expect(g.basis).toBe('spend');
    for (const row of rows) {
      const p = g.paths.find(x => x.id === row.tag)!;
      expect(p.value).toBeCloseTo(row.spendToday, 10);
      expect(p.cost).toBeCloseTo(row.spendToday, 10);
      expect(p.saved).toBeCloseTo(Math.max(0, row.spendIfExternal - row.spendToday), 10);
    }
  });

  it('colors columns 0-2 info blue and column 3 by provider', () => {
    const g = sankeyGraph(CC);
    for (const n of g.nodes.filter(x => x.col < 3)) {
      expect(n.color, `node ${n.id}`).toBe('#0074b3');
    }
    const dstColor = (tag: string) => {
      const p = g.paths.find(x => x.id === tag)!;
      return g.nodes.find(n => n.id === p.nodes[3])!.color;
    };
    // rd-helion rides CoreWeave, classified-helion Nebius, shared-services OpenAI.
    expect(dstColor('rd-helion')).toBe('#009fdb');
    expect(dstColor('classified-helion')).toBe('#00388f');
    expect(dstColor('shared-services')).toBe('#00c9ff');
  });

  it('names the hops with engine words: endpoint, routeLabel, provider', () => {
    const g = sankeyGraph(CC);
    const p = g.paths.find(x => x.id === 'rd-helion')!;
    const route = (CC.modelRoutes() as { tag: string; endpoint: string }[])
      .find(r => r.tag === 'rd-helion')!;
    expect(p.hops.identity).toBe('rd-helion');
    expect(p.hops.source).toBe(route.endpoint);
    expect(['AT&T private fabric', 'Governed egress', 'Public internet'])
      .toContain(p.hops.route);
    expect(p.hops.provider).toBe('CoreWeave');
  });
});
