import { describe, it, expect } from 'vitest';
import { CC } from '../../engine';
import { applyEstateProfile } from '../../engine/estateProfile';
import { branchesOf } from '../discover/discoveryModel';
import {
  levelNodes,
  edgeTrail,
  edgeCaption,
  descend,
  scopeNode,
  membersAt,
  currentDim,
  dimValue,
  NO_EDGE_DRILL,
  GEO_CHAIN,
  COLUMN_MAX,
  type EdgeDrill,
  type EdgeNode,
} from './edgeDrill';

/**
 * The ingress drill's contract: a meta view of the whole estate that reaches
 * an individual building without ever hiding a group on the way.
 */

/* These assertions are about a BANK-scale estate — the whole point of the
   drill is what happens at 4,183 sites — so the suite runs on meridian. */
applyEstateProfile(CC as unknown as Parameters<typeof applyEstateProfile>[0], 'meridian');
const cc = CC;
const branches = branchesOf(cc);

/** Walk to the bottom of the tree along the largest node at each level. */
function walkDown(start: EdgeDrill = NO_EDGE_DRILL): { drill: EdgeDrill; rows: EdgeNode[] }[] {
  const steps: { drill: EdgeDrill; rows: EdgeNode[] }[] = [];
  let drill = start;
  for (let guard = 0; guard < 12; guard++) {
    const rows = levelNodes(cc, branches, drill);
    if (rows.length === 0) break;
    steps.push({ drill, rows });
    const biggest = [...rows].sort((a, b) => b.count - a.count)[0];
    const next = descend(drill, biggest);
    if (!next) break;
    drill = next;
  }
  return steps;
}

describe('the estate carries a real geographic spine', () => {
  it('every site has a region, a state and a metro', () => {
    expect(branches.length).toBeGreaterThan(4000);
    for (const b of branches) {
      expect(b.region, b.id).toBeTruthy();
      expect(b.state, b.id).toBeTruthy();
      expect(b.city, b.id).toBeTruthy();
    }
  });

  it('states hold more than one metro, so state is not a metro alias', () => {
    const metrosByState = new Map<string, Set<string>>();
    for (const b of branches) {
      const set = metrosByState.get(b.state!) ?? new Set<string>();
      set.add(b.city);
      metrosByState.set(b.state!, set);
    }
    const multi = [...metrosByState.values()].filter(s => s.size > 1);
    expect(multi.length).toBeGreaterThanOrEqual(4);
  });

  it('the retail estate is districted below the metro', () => {
    const retail = branches.filter(b => b.siteClass === 'branch' || b.siteClass === 'atm');
    expect(retail.every(b => !!b.district)).toBe(true);
    // and non-retail is not, because "the North district" of three data
    // centres would be a level that means nothing.
    expect(branches.filter(b => b.siteClass === 'dc').every(b => !b.district)).toBe(true);
  });
});

describe('levelNodes', () => {
  it('returns EVERY group at the level — never a truncated set', () => {
    const rows = levelNodes(cc, branches, NO_EDGE_DRILL);
    const distinct = new Set(branches.map(b => dimValue('class', b)));
    expect(rows.length).toBe(distinct.size);
    expect(rows.reduce((n, r) => n + r.count, 0)).toBe(branches.length);
  });

  it('accounts for every site in scope at every level of a full descent', () => {
    for (const { drill, rows } of walkDown()) {
      const scope = membersAt(branches, drill);
      expect(rows.reduce((n, r) => n + r.count, 0)).toBe(scope.length);
      expect(rows.reduce((n, r) => n + r.onFabric, 0)).toBe(scope.filter(b => b.onrampId).length);
      // No lump row: every row is a real group with a real value.
      expect(rows.every(r => r.value.length > 0)).toBe(true);
      expect(rows.some(r => /more|other/i.test(r.label) && r.count > 1 && !r.drillable)).toBe(false);
    }
  });

  it('a level can hold far more groups than the diagram column draws', () => {
    const deep = walkDown().find(s => s.rows.length > COLUMN_MAX);
    expect(deep, 'expected at least one level wider than the column').toBeTruthy();
  });

  it('sorts by the question being asked', () => {
    const drill = descend(NO_EDGE_DRILL, levelNodes(cc, branches, NO_EDGE_DRILL)[2])!;
    const largest = levelNodes(cc, branches, drill, { sort: 'largest' });
    const exposed = levelNodes(cc, branches, drill, { sort: 'exposed' });
    const az = levelNodes(cc, branches, drill, { sort: 'name' });
    expect(largest[0].count).toBeGreaterThanOrEqual(largest[largest.length - 1].count);
    expect(exposed[0].count - exposed[0].onFabric).toBeGreaterThanOrEqual(
      exposed[exposed.length - 1].count - exposed[exposed.length - 1].onFabric,
    );
    expect(az.map(r => r.label)).toEqual([...az.map(r => r.label)].sort((a, b) => a.localeCompare(b)));
  });

  it('search narrows the level without changing what a group means', () => {
    const drill = descend(NO_EDGE_DRILL, levelNodes(cc, branches, NO_EDGE_DRILL)[2])!;
    const all = levelNodes(cc, branches, drill);
    const hit = all[0].label.slice(0, 3);
    const found = levelNodes(cc, branches, drill, { query: hit });
    expect(found.length).toBeGreaterThan(0);
    expect(found.length).toBeLessThanOrEqual(all.length);
    expect(found.every(r => r.label.toLowerCase().includes(hit.toLowerCase()))).toBe(true);
  });
});

describe('descent', () => {
  it('reaches an individual site, and stops there', () => {
    const steps = walkDown();
    const last = steps[steps.length - 1];
    const leafRow = [...last.rows].sort((a, b) => b.count - a.count)[0];
    expect(descend(last.drill, leafRow)).toBeNull();
    expect(leafRow.count).toBe(1);
    expect(leafRow.members[0].name).toBe(leafRow.label);
  });

  it('descends through region and state, not straight from type to metro', () => {
    const dims = walkDown().map(s => currentDim(s.drill));
    expect(dims.slice(0, 4)).toEqual(['class', 'region', 'state', 'metro']);
    expect(dims).toContain('district');
    expect(dims[dims.length - 1]).toBe('site');
  });

  it('skips a level that cannot split the group it was handed', () => {
    // Offices have no district, so an office metro descends straight to sites.
    const classes = levelNodes(cc, branches, NO_EDGE_DRILL);
    const offices = classes.find(r => r.value === 'office')!;
    let drill = descend(NO_EDGE_DRILL, offices)!;
    for (let i = 0; i < 6; i++) {
      const rows = levelNodes(cc, branches, drill);
      const next = descend(drill, [...rows].sort((a, b) => b.count - a.count)[0]);
      if (!next) break;
      drill = next;
    }
    expect(drill.chain).not.toContain('district');
  });

  it('honours an alternative chain', () => {
    const geo: EdgeDrill = { path: [], chain: GEO_CHAIN };
    expect(currentDim(geo)).toBe('region');
    const rows = levelNodes(cc, branches, geo);
    expect(rows.reduce((n, r) => n + r.count, 0)).toBe(branches.length);
    expect(currentDim(descend(geo, rows[0])!)).toBe('state');
  });
});

describe('breadcrumb and scope', () => {
  it('the trail grows one hop per level and always offers the way back', () => {
    expect(edgeTrail(branches, NO_EDGE_DRILL)).toHaveLength(1);
    for (const { drill } of walkDown()) {
      const trail = edgeTrail(branches, drill);
      expect(trail).toHaveLength(drill.path.length + 1);
      expect(trail[0].drill.path).toEqual([]);
    }
  });

  it('the scope node summarises exactly the level you are standing in', () => {
    const steps = walkDown();
    for (const { drill } of steps.slice(1)) {
      const scope = scopeNode(cc, branches, drill)!;
      const members = membersAt(branches, drill);
      expect(scope.count).toBe(members.length);
      expect(scope.onFabric).toBe(members.filter(b => b.onrampId).length);
      expect(scope.share).toBeCloseTo(scope.onFabric / scope.count, 10);
    }
    expect(scopeNode(cc, branches, NO_EDGE_DRILL)).toBeNull();
  });
});

describe('edgeCaption', () => {
  it('says "the whole estate" only at the top, and names what the column left out', () => {
    const rows = levelNodes(cc, branches, NO_EDGE_DRILL);
    expect(edgeCaption(rows, branches.length, rows.length, 'class')).toContain('the whole estate');

    const drill = descend(NO_EDGE_DRILL, rows[2])!;
    const all = levelNodes(cc, branches, drill);
    const head = all.slice(0, COLUMN_MAX);
    const caption = edgeCaption(head, branches.length, all.length, currentDim(drill));
    expect(caption).not.toContain('the whole estate');
    if (all.length > head.length) expect(caption).toContain(`of ${all.length}`);
  });
});
