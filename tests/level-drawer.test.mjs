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

// ---------- Fix round 1 (review findings) ----------

test('fix (Important 1): fabric canBack is false at the root (trail floor is 1, not 0), and Back never collapses the band', () => {
  // The band is already open at its root, exactly as toggleBand leaves it -
  // this is the state the review reproduced against (canBack was true here).
  const c = mkC({ fabDrill: ['fab'] });
  let v = vals(c);
  v.openLevel('fabric');
  v = vals(c);
  assert.deepEqual(c.state.fabDrill, ['fab']);
  assert.equal(v.drawer.canBack, false, 'fabric root (raw trail length 1, the "fab" floor) must not show Back');
  assert.equal(v.fabOpen, true);
  v.drawer.back(); // a no-op even called directly, not just hidden in the DOM
  v = vals(c);
  assert.deepEqual(c.state.fabDrill, ['fab'], 'Back at the root must never collapse fabDrill to []');
  assert.equal(v.fabOpen, true, 'the band stays open - it must not disappear from the picture');
  assert.equal(v.fabHead.label, 'AT&T fabric');

  // One level in: canBack true, Back pops exactly one hop, never past the floor.
  const door = v.drawer.rows.find(r => r.isDoor);
  door.descend();
  v = vals(c);
  assert.equal(v.drawer.canBack, true);
  assert.equal(c.state.fabDrill.length, 2);
  v.drawer.back();
  v = vals(c);
  assert.deepEqual(c.state.fabDrill, ['fab']);
  assert.equal(v.drawer.canBack, false);
});

test('fix (Important 2): bulkAttach composes Isolate (not Attach) for any workloads-shaped list, with a real place', () => {
  // A clouds level scope drilled to a VPC, flattened past the subnets -
  // delegates to workloadList, so volList.kind is 'workloads' exactly like
  // the old 'workloads' scope, and the footer button already says "Isolate".
  const c = mkC();
  let v = vals(c);
  v.openLevel('clouds');
  v = vals(c);
  v.drawer.rows.find(r => r.isDoor).descend(); // a region
  v = vals(c);
  v.drawer.rows.find(r => r.isDoor).descend(); // a VPC (subnet listing)
  v = vals(c);
  assert.equal(v.drawer.kind, 'workloads');
  v.drawer.goFlat(); // "same through the flat door" per the finding
  v = vals(c);
  assert.equal(v.drawer.kind, 'workloads');
  assert.match(v.drawer.bulkLabel, /^Isolate \d+ exposed/);
  assert.equal(v.drawer.canBulk, true);
  v.drawer.bulkAttach();
  assert.equal(c.state.screen, 's4');
  assert.match(c.state.parsedNote, /^Isolate \d+ exposed workloads? in us-east-1: bring them off the public path\.$/);
  assert.doesNotMatch(c.state.parsedNote, /Attach|undefined|in {2}|in a public first mile/, 'never the Attach verb, an empty place, or a raw site noun');

  // The pre-existing old 'workloads' kind had the identical bug (read "in
  // undefined" before this fix, per the review) - confirm it too now composes.
  const c2 = mkC({ vol: { kind: 'workloads', region: 'us-east-1', vpcId: 'vpc-0-0', snId: 'vpc-0-0-pub-0' } });
  const v2 = vals(c2);
  assert.equal(v2.drawer.kind, 'workloads');
  v2.drawer.bulkAttach();
  assert.match(c2.state.parsedNote, /^Isolate \d+ exposed workloads? in us-east-1: bring them off the public path\.$/);
});

test('fix (Important 3): a row\'s own Attach action never prints "undefined" when the row carries no address/metro', () => {
  // Reproduce exactly as the review did: drill the PICTURE to an actual site
  // (three real hops: rollup group -> metro -> site), then open the sites
  // level drawer at that same position. That is the site's PATH level -
  // frame()-built rows with no address/metro of their own.
  const c = mkC();
  let v = vals(c);
  for (let i = 0; i < 3; i++) {
    const row = v.heroSites.find(x => !x.ghost && !x.leaf && !x.more);
    assert.ok(row, `a clickable site-tree row exists at depth ${i}`);
    row.click();
    v = vals(c);
  }
  assert.equal(c.state.drill.length, 3, 'drilled the picture three levels deep, onto an actual site');
  v.openLevel('sites');
  v = vals(c);
  assert.equal(v.drawer.level, 'path');
  const attachRow = v.drawer.rows.find(r => r.action === 'Attach');
  assert.ok(attachRow, 'a path level has at least one Attach row');
  assert.equal(attachRow.address, undefined, 'a frame()-built row really does carry no address');
  assert.equal(attachRow.metro, undefined, 'and no metro either - that is the defect this guards');
  attachRow.act();
  assert.equal(c.state.screen, 's4');
  assert.doesNotMatch(c.state.parsedNote, /undefined/, 'the compose note never prints the word undefined');
  assert.doesNotMatch(c.state.compose.bulk, /undefined/);
  // the trail-derived place is the site's own id/drillKey - never empty here,
  // since the trail is three deep.
  assert.match(c.state.parsedNote, new RegExp(`^Attach ${attachRow.id} in \\S+: one circuit onto the fabric\\.$`));

  // Bonus, same defect class: a clouds ROOT row (also frame()-built, also no
  // address/metro) must compose cleanly too - but at the root there is no
  // trail to resolve a place from, so the row's own (self-describing) id
  // stands alone rather than forcing an empty "in ".
  const c3 = mkC();
  let v3 = vals(c3);
  v3.openLevel('clouds');
  v3 = vals(c3);
  const cloudsAttach = v3.drawer.rows.find(r => r.action === 'Attach');
  assert.ok(cloudsAttach);
  cloudsAttach.act();
  assert.doesNotMatch(c3.state.parsedNote, /undefined/);
  assert.equal(c3.state.parsedNote, `Attach ${cloudsAttach.id}: one circuit onto the fabric.`);
});

test('fix (Important 4): pinning a fabric circuit never writes s.drill, and the sites drawer still opens afterward', () => {
  const c = mkC(); // s.drill is untouched - the sites column was never drilled
  let v = vals(c);
  v.openLevel('fabric');
  v = vals(c);
  v.drawer.rows.find(r => r.isDoor).descend(); // facility -> ports
  v = vals(c);
  v.drawer.rows.find(r => r.isDoor).descend(); // port -> circuits
  v = vals(c);
  const circuit = v.drawer.rows.find(r => r.notDoor);
  assert.ok(circuit, 'a circuit is a leaf asset row, not a door');
  assert.deepEqual(c.state.drill, [], 'sanity: s.drill starts empty');
  circuit.pin();
  assert.deepEqual(c.state.drill, [], 's.drill must be untouched by a fabric pin - it is not the sites column\'s to write');
  assert.equal(c.state.mapSel, 'asset:' + circuit.id, 'the pin itself still works');
  assert.equal(c.state.volPin, circuit.id);

  // The consequence the review found: siteDrillRows(est, ['', undefined])
  // returns null, so a later openLevel('sites') produced a null (dead) drawer.
  v = vals(c);
  v.drawer.close();
  v = vals(c);
  v.openLevel('sites');
  v = vals(c);
  assert.ok(v.drawer, 'the sites drawer must still open after a fabric pin');
  assert.equal(v.drawer.title, 'Sites');
  assert.equal(v.drawer.total, 7);
});

// ---------- Fix round 2 (re-review finding) ----------

test('fix (round 2): a sites level scope never rebuilds s.drill - only the old `metro` kind does', () => {
  // mature's sites root lists individual sites, so one descend lands on a
  // one-hop `path` level with six pinnable rows. volCtx.metro is
  // colTrail('sites')[1] - undefined at depth 1 - so the old rebuild wrote
  // ['Ashburn DC', undefined], which siteDrillRows reads as null: the drawer
  // dies on that very render and never reopens.
  const c = mkC({ view: 'mature' });
  let v = vals(c);
  v.openLevel('sites');
  v = vals(c);
  v.drawer.rows.find(r => r.id === 'Ashburn DC').descend();
  v = vals(c);
  assert.deepEqual(c.state.drill, ['Ashburn DC'], 'sanity: the sites trail is one hop deep');
  assert.equal(v.drawer.level, 'path');
  const row = v.drawer.rows.find(r => r.notDoor);
  assert.ok(row, 'a path level row is a leaf asset, not a door');
  row.pin();
  assert.deepEqual(c.state.drill, ['Ashburn DC'], 's.drill IS this scope\'s column trail - a pin must not rewrite it');
  assert.equal(c.state.mapSel, 'asset:' + row.id, 'the pin itself still works');
  assert.equal(c.state.volPin, row.id);
  v = vals(c);
  assert.ok(v.drawer, 'the drawer must survive its own pin, not unmount under an open s.drawerOpen');
  assert.equal(v.drawer.title, 'Ashburn DC · paths');

  // The dead-drawer chain the review traced: a later openLevel('sites') returned null.
  // It reopens at the column's LIVE trail (still one hop, so still the path
  // level), and climbing out of that lands on a healthy root - proving
  // siteDrillRows is unpoisoned at both depths.
  v.drawer.close();
  v = vals(c);
  v.openLevel('sites');
  v = vals(c);
  assert.ok(v.drawer, 'openLevel("sites") must not return a dead drawer afterward');
  assert.equal(v.drawer.title, 'Ashburn DC \u00b7 paths');
  assert.equal(v.drawer.total, 6);
  v.drawer.back();
  v = vals(c);
  assert.deepEqual(c.state.drill, []);
  assert.equal(v.drawer.title, 'Sites');
  assert.equal(v.drawer.total, 7);

  // The old `metro` kind's rebuild is load-bearing - it is opened from `+N more`
  // on the picture, where s.drill may be short - and must stay exactly as it was.
  const c2 = mkC({ vol: { kind: 'metro', cls: 'Branch#1', metro: 'Branch:1:Atlanta' } });
  const v2 = vals(c2);
  assert.deepEqual(c2.state.drill, [], 'sanity: opened from the picture with a short drill');
  v2.drawer.rows.find(r => r.notDoor).pin();
  assert.deepEqual(c2.state.drill, ['Branch#1', 'Branch:1:Atlanta'], 'the metro kind still drills the picture to the pinned site\'s metro');
});
