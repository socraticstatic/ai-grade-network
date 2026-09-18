import test from 'node:test';
import assert from 'node:assert/strict';
import { vals, defaults } from '../naas-app.js';

// Task 7: wiring the `level` drawer scope into vals(). These primitives are
// closures over c/s/set, not separately exported, so they are exercised the
// way the brief's Testing section describes: build a fake `c` with defaults()
// and call vals(c) directly. Literals are pinned against the `trust` estate,
// which every other level-* test file in this suite also uses.

function mkC(extra = {}) {
  const state = { ...defaults(), view: 'trust', screen: 's3', layer: 'cloud', tab: 'connect', ...extra };
  return { state, setState: (p) => Object.assign(state, p) };
}

test('openLevel opens a level scope at the column\'s current trail, root or not', () => {
  const c = mkC();
  let v = vals(c);
  assert.equal(typeof v.openLevel, 'function');
  v.openLevel('sites');
  assert.deepEqual(c.state.vol, { kind: 'level', col: 'sites' });
  assert.equal(c.state.drawerOpen, true);
  assert.equal(c.state.volFlat, false);
  v = vals(c);
  assert.equal(v.drawer.col, 'sites');
  assert.equal(v.drawer.title, 'Sites');
  assert.equal(v.drawer.total, 7);
  assert.equal(v.drawer.canBack, false, 'no back at root');
  assert.equal(v.drawer.hasCrumbs, false, 'no crumbs at root');
  assert.equal(v.drawer.isLevel, true);
});

test('colTrail reads the live column trail: s.drill, cloudDrill, or fabDrill', () => {
  const c = mkC({ drill: ['a'], cloudDrill: ['b'], fabDrill: ['fab', 'c'] });
  const v = vals(c);
  // no vol open, so drawer is null; colTrail itself is only reachable through
  // the primitives it drives (levelInto/crumbCut/drawerBack) - proven below.
  assert.equal(v.drawer, null);
});

test('levelInto grows the column trail and the drawer follows, for all three columns', () => {
  for (const col of ['sites', 'clouds', 'fabric']) {
    const c = mkC();
    let v = vals(c);
    v.openLevel(col);
    v = vals(c);
    const door = v.drawer.rows.find(r => r.isDoor);
    assert.ok(door, `${col} root has at least one door row`);
    assert.equal(v.drawer.rows.every(r => r.dot === 'var(--success)' || r.dot === 'var(--warning)' || r.dot === 'var(--error)'), true, 'dot is always a CSS token, never a hex');
    door.descend();
    v = vals(c);
    const trailKey = col === 'sites' ? 'drill' : col === 'clouds' ? 'cloudDrill' : 'fabDrill';
    assert.equal(c.state[trailKey].length > 0, true, `${col}: s.${trailKey} grew`);
    assert.equal(v.drawer.canBack, true, `${col}: canBack true one level in`);
    assert.equal(v.drawer.hasCrumbs, true, `${col}: hasCrumbs true one level in`);
    const base = (s) => s.replace(/\s*[(·].*$/, '').trim(); // strip a trailing " (N)" or " · ..."
    assert.equal(base(v.drawer.title), base(door.id), `${col}: the drawer title (${v.drawer.title}) is now the row descended into (${door.id})`);
  }
});

test('sites: root (7 groups) -> East (6 metros) -> Atlanta (588 sites, delegated to volumeList)', () => {
  const c = mkC();
  let v = vals(c);
  v.openLevel('sites');
  v = vals(c);
  assert.equal(v.drawer.total, 7);
  const east = v.drawer.rows.find(r => /East/.test(r.id));
  assert.ok(east && east.isDoor);
  east.descend();
  v = vals(c);
  assert.equal(v.drawer.total, 6, 'East group has 6 metros');
  assert.equal(v.drawer.title.startsWith('Remote sites, East'), true);
  const atlanta = v.drawer.rows.find(r => /Atlanta/.test(r.id));
  assert.ok(atlanta && atlanta.isDoor);
  atlanta.descend();
  v = vals(c);
  assert.equal(v.drawer.total, 588, 'Atlanta delegates to volumeList: 588 sites');
  assert.equal(v.drawer.title, 'Atlanta · 588 remote sites');
  assert.equal(v.drawer.capChips, true, 'caps.chips true at 588 rows');
  assert.equal(v.drawer.capBulk, true, 'caps.bulk true at 588 rows');
  // asset rows here are not doors, and carry a real, defaulted `selected`
  const asset = v.drawer.rows[0];
  assert.equal(asset.isDoor, false);
  assert.equal(asset.notDoor, true);
  assert.equal(typeof asset.selected, 'boolean');
});

test('crumb climb-back resets the trail to root and the drawer with it', () => {
  const c = mkC();
  let v = vals(c);
  v.openLevel('sites');
  v = vals(c);
  const east = v.drawer.rows.find(r => /East/.test(r.id));
  east.descend();
  v = vals(c);
  const rootCrumb = v.drawer.crumbs[0];
  assert.equal(rootCrumb.notLast, true);
  rootCrumb.go();
  v = vals(c);
  assert.deepEqual(c.state.drill, []);
  assert.equal(v.drawer.total, 7);
  assert.equal(v.drawer.hasCrumbs, false);
});

test('drawerBack pops one level (a slice, not a special case)', () => {
  const c = mkC();
  let v = vals(c);
  v.openLevel('sites');
  v = vals(c);
  v.drawer.rows.find(r => /East/.test(r.id)).descend();
  v = vals(c);
  v.drawer.rows.find(r => /Atlanta/.test(r.id)).descend();
  v = vals(c);
  assert.equal(c.state.drill.length, 2);
  v.drawer.back();
  v = vals(c);
  assert.equal(c.state.drill.length, 1);
  assert.equal(v.drawer.total, 6, 'back at the East group again');
});

test('fabric: setColTrail keeps the "fab" placeholder even when the band was never opened, so the picture follows the drawer', () => {
  const c = mkC(); // fabDrill is untouched (undefined) - the band was never toggled open
  let v = vals(c);
  v.openLevel('fabric');
  v = vals(c);
  assert.equal(c.state.fabDrill, undefined, 'openLevel does not itself touch fabDrill');
  const door = v.drawer.rows.find(r => r.isDoor);
  door.descend();
  v = vals(c);
  assert.equal(c.state.fabDrill[0], 'fab', 'the write side seeds the placeholder the picture\'s band code (naas-fabric.js fabricRows) requires');
  // The picture (fabHead/fabRows, built from the raw s.fabDrill at naas-app.js
  // ~279-283, untouched by this task) must show the SAME node as the drawer.
  assert.equal(v.fabHead.label, door.id, 'picture drilled to the same facility the drawer opened');
  assert.equal(v.drawer.title, door.id);
  assert.equal(v.fabOpen, true);

  // Crumb back to root: the band stays open at its root, not fully collapsed.
  v.drawer.crumbs[0].go();
  v = vals(c);
  assert.deepEqual(c.state.fabDrill, ['fab']);
  assert.equal(v.fabOpen, true, 'band stays open (picture does not disappear)');
  assert.equal(v.fabHead.label, 'AT&T fabric');
});

test('fabric: when the band WAS already seeded by the picture, behavior is unchanged', () => {
  const c = mkC({ fabDrill: ['fab'] });
  let v = vals(c);
  v.openLevel('fabric');
  v = vals(c);
  const door = v.drawer.rows.find(r => r.isDoor);
  door.descend();
  v = vals(c);
  assert.deepEqual(c.state.fabDrill.slice(0, 1), ['fab']);
  assert.equal(c.state.fabDrill.length, 2);
  assert.equal(v.fabHead.label, v.drawer.title);
});

test('clouds: root (regions) -> a region -> a VPC opens the subnet list, delegated to workloadList', () => {
  const c = mkC();
  let v = vals(c);
  v.openLevel('clouds');
  v = vals(c);
  const region = v.drawer.rows.find(r => r.isDoor);
  region.descend();
  v = vals(c);
  assert.equal(c.state.cloudDrill.length, 1);
  const vpc = v.drawer.rows.find(r => r.isDoor);
  assert.ok(vpc, 'a region lists its VPCs as doors');
  vpc.descend();
  v = vals(c);
  assert.equal(c.state.cloudDrill.length, 2);
  assert.equal(v.drawer.kind, 'workloads', 'the VPC subnet list keeps its delegate kind for chips/search-hint/pin/act');
  assert.ok(v.drawer.hasFlatDoor, 'the VPC level offers "skip the subnets"');
});

test('volCtx never lets a raw key reach bulkAttach\'s compose wording', () => {
  const c = mkC();
  let v = vals(c);
  v.openLevel('sites');
  v = vals(c);
  v.drawer.rows.find(r => /East/.test(r.id)).descend();
  v = vals(c);
  v.drawer.rows.find(r => /Atlanta/.test(r.id)).descend();
  v = vals(c);
  assert.equal(v.drawer.canBulk, true);
  v.drawer.bulkAttach();
  assert.equal(c.state.screen, 's4');
  assert.match(c.state.parsedNote, /in Atlanta on a public first mile/);
  assert.doesNotMatch(c.state.parsedNote, /Branch|#|:/, 'never a raw class or rollup key in the compose note');
});

test('regression: the two existing drawer kinds still open and are untouched by the level branch', () => {
  const c = mkC({ vol: { kind: 'metro', cls: 'Branch#1', metro: 'Branch:1:Atlanta' } });
  const v = vals(c);
  assert.ok(v.drawer, 'metro kind still produces a drawer');
  assert.equal(v.drawer.canBack, false, 'metro kind never carries snId/flat here, so no back');
  assert.equal(v.drawer.isLevel, false);
  assert.equal(v.drawer.hasCrumbs, false, 'volumeList never returns a trail field');

  const c2 = mkC({ vol: { kind: 'workloads', region: 'us-east-1', vpcId: 'vpc-0-0', snId: null } });
  const v2 = vals(c2);
  assert.ok(v2.drawer, 'workloads kind still produces a drawer');
  assert.equal(v2.drawer.kind, 'workloads');
});
