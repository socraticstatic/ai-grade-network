import { describe, it, expect } from 'vitest';
import { CC } from '../../engine';
import { branchesOf, ROLLUP_THRESHOLD } from '../discover/discoveryModel';
import { edgeNodes, edgeTrail, edgeCaption, descend, scopeNode, NO_EDGE_DRILL } from './edgeDrill';

/**
 * The ingress column's contract, which is the rollup-first contract: at bank
 * scale the column must never render one row per site, must always state the
 * count it stands on, and must lose nothing on the way down.
 */

const cc = CC;
const branches = branchesOf(cc);

describe('edgeNodes', () => {
  it('roots on site classes and accounts for every site', () => {
    const rows = edgeNodes(cc, branches, NO_EDGE_DRILL);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.reduce((n, r) => n + r.count, 0)).toBe(branches.length);
    expect(rows.reduce((n, r) => n + r.onFabric, 0)).toBe(branches.filter(b => b.onrampId).length);
  });

  it('never renders more rows than the column budget, at any level', () => {
    const root = edgeNodes(cc, branches, NO_EDGE_DRILL);
    expect(root.length).toBeLessThanOrEqual(7);
    for (const r of root) {
      const next = descend(NO_EDGE_DRILL, r);
      if (!next) continue;
      const metros = edgeNodes(cc, branches, next);
      expect(metros.length).toBeLessThanOrEqual(7);
      for (const m of metros) {
        const deeper = descend(next, m);
        if (!deeper) continue;
        expect(edgeNodes(cc, branches, deeper).length).toBeLessThanOrEqual(7);
      }
    }
  });

  it('a class drill loses no site — the tail row carries the remainder', () => {
    const root = edgeNodes(cc, branches, NO_EDGE_DRILL);
    const biggest = [...root].sort((a, b) => b.count - a.count)[0];
    const next = descend(NO_EDGE_DRILL, biggest)!;
    const metros = edgeNodes(cc, branches, next);
    expect(metros.reduce((n, r) => n + r.count, 0)).toBe(biggest.count);
  });

  it('states a count for every row rather than a bare label', () => {
    for (const r of edgeNodes(cc, branches, NO_EDGE_DRILL)) {
      expect(r.sub).toMatch(/on fabric|on the fabric|public internet/);
    }
  });

  it('a group larger than the rollup threshold is never a leaf', () => {
    for (const r of edgeNodes(cc, branches, NO_EDGE_DRILL)) {
      if (r.count > ROLLUP_THRESHOLD) expect(r.drillable).toBe(true);
    }
  });
});

describe('edgeTrail / scopeNode', () => {
  it('the trail grows one hop per level and always offers the way back', () => {
    expect(edgeTrail(NO_EDGE_DRILL)).toHaveLength(1);
    const root = edgeNodes(cc, branches, NO_EDGE_DRILL);
    const cls = descend(NO_EDGE_DRILL, root.find(r => r.drillable)!)!;
    expect(edgeTrail(cls)).toHaveLength(2);
    expect(edgeTrail(cls)[0].drill).toEqual(NO_EDGE_DRILL);

    const metro = edgeNodes(cc, branches, cls).find(r => r.drillable);
    if (metro) {
      const deep = descend(cls, metro)!;
      expect(edgeTrail(deep)).toHaveLength(3);
    }
  });

  it('the scope node summarises the level you are standing in', () => {
    expect(scopeNode(cc, branches, NO_EDGE_DRILL)).toBeNull();
    const root = edgeNodes(cc, branches, NO_EDGE_DRILL);
    const target = root.find(r => r.drillable)!;
    const cls = descend(NO_EDGE_DRILL, target)!;
    const scope = scopeNode(cc, branches, cls)!;
    expect(scope.count).toBe(target.count);
    expect(scope.onFabric).toBe(target.onFabric);
  });
});

describe('edgeCaption', () => {
  it('says "the estate" only when nothing has been narrowed', () => {
    const root = edgeNodes(cc, branches, NO_EDGE_DRILL);
    expect(edgeCaption(root, branches.length)).toContain('the estate');

    const cls = descend(NO_EDGE_DRILL, root.find(r => r.drillable)!)!;
    const drilled = edgeNodes(cc, branches, cls);
    const caption = edgeCaption(drilled, branches.length);
    expect(caption).not.toContain('the estate');
    expect(caption).toContain(branches.length.toLocaleString('en-US'));
  });
});
