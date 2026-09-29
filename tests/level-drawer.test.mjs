import test from 'node:test';
import assert from 'node:assert/strict';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// Task 7: wiring the `level` drawer scope into vals(). These primitives are
// closures over c/s/set, not separately exported, so they are exercised the
// way the brief's Testing section describes: build a fake `c` with defaults()
// and call vals(c) directly (tests/harness.mjs). Literals are pinned against
// the `trust` estate, which every other level-* test file in this suite also
// uses.

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
  // The root is regions (2026-09-29: the site side drills by place).
  assert.equal(v.drawer.total, 4);
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

// The site side drills by place (Micah, 2026-09-29): region, state, metro, then
// the metro's sites, paged by volumeList, then a site's services. Never clouds.
test('sites: root (4 regions) -> US East (4 states) -> Georgia -> Atlanta (292 sites, delegated to volumeList)', () => {
  const c = mkC();
  let v = vals(c);
  v.openLevel('sites');
  v = vals(c);
  assert.equal(v.drawer.total, 4);
  const east = v.drawer.rows.find(r => r.id === 'US East');
  assert.ok(east && east.isDoor);
  east.descend();
  v = vals(c);
  assert.equal(v.drawer.total, 4, 'US East holds 4 states');
  v.drawer.rows.find(r => r.id === 'Georgia').descend();
  v = vals(c);
  const atlanta = v.drawer.rows.find(r => /Atlanta/.test(r.id));
  assert.ok(atlanta && atlanta.isDoor);
  atlanta.descend();
  v = vals(c);
  assert.equal(v.drawer.total, 292, 'Atlanta delegates to volumeList: 292 sites');
  assert.equal(v.drawer.capChips, true, 'caps.chips true at volume');
  assert.equal(v.drawer.capBulk, true, 'caps.bulk true at volume');
  const asset = v.drawer.rows[0];
  assert.equal(typeof asset.selected, 'boolean');
  assert.ok(!/^(AWS|Azure|GCP|Oracle)\b/.test(asset.id), 'a site list never holds a cloud');
});

test('crumb climb-back resets the trail to root and the drawer with it', () => {
  const c = mkC();
  let v = vals(c);
  v.openLevel('sites');
  v = vals(c);
  const east = v.drawer.rows.find(r => r.id === 'US East');
  east.descend();
  v = vals(c);
  const rootCrumb = v.drawer.crumbs[0];
  assert.equal(rootCrumb.notLast, true);
  rootCrumb.go();
  v = vals(c);
  assert.deepEqual(c.state.drill, []);
  assert.equal(v.drawer.total, 4);
  assert.equal(v.drawer.hasCrumbs, false);
});

test('drawerBack pops one level (a slice, not a special case)', () => {
  const c = mkC();
  let v = vals(c);
  v.openLevel('sites');
  v = vals(c);
  v.drawer.rows.find(r => r.id === 'US East').descend();
  v = vals(c);
  v.drawer.rows.find(r => r.id === 'Georgia').descend();
  v = vals(c);
  assert.equal(c.state.drill.length, 2);
  v.drawer.back();
  v = vals(c);
  assert.equal(c.state.drill.length, 1);
  assert.equal(v.drawer.total, 4, 'back at US East, four states');
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
  assert.equal(v.fabHead.label, 'AT&T network');
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
  v.drawer.rows.find(r => r.id === 'US East').descend();
  v = vals(c);
  v.drawer.rows.find(r => r.id === 'Georgia').descend();
  v = vals(c);
  v.drawer.rows.find(r => /Atlanta/.test(r.id)).descend();
  v = vals(c);
  assert.equal(v.drawer.canBulk, true);
  v.drawer.bulkAttach();
  assert.equal(c.state.screen, 's4');
  assert.match(c.state.compose.note, /in Atlanta on a public first mile/);
  assert.doesNotMatch(c.state.compose.note, /Branch|#|:|state|region/, 'never a raw class, rollup or place key in the compose note');
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
  assert.equal(v.fabHead.label, 'AT&T network');

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
  assert.match(c.state.compose.note, /^Isolate \d+ exposed workloads? in us-east-1: bring them off the public path\.$/);
  assert.doesNotMatch(c.state.compose.note, /Attach|undefined|in {2}|in a public first mile/, 'never the Attach verb, an empty place, or a raw site noun');

  // The pre-existing old 'workloads' kind had the identical bug (read "in
  // undefined" before this fix, per the review) - confirm it too now composes.
  const c2 = mkC({ vol: { kind: 'workloads', region: 'us-east-1', vpcId: 'vpc-0-0', snId: 'vpc-0-0-pub-0' } });
  const v2 = vals(c2);
  assert.equal(v2.drawer.kind, 'workloads');
  v2.drawer.bulkAttach();
  assert.match(c2.state.compose.note, /^Isolate \d+ exposed workloads? in us-east-1: bring them off the public path\.$/);
});

test('fix (Important 3): a row\'s own Attach action never prints "undefined" when the row carries no address/metro', () => {
  // Reproduce exactly as the review did: drill the PICTURE to an actual site
  // (three real hops: rollup group -> metro -> site), then open the sites
  // level drawer at that same position. That is the site's PATH level -
  // frame()-built rows with no address/metro of their own.
  const c = mkC();
  let v = vals(c);
  // Four hops now: the root is regions, so region -> rollup group -> metro -> site.
  for (let i = 0; i < 4; i++) {
    const row = v.heroSites.find(x => !x.ghost && !x.leaf && !x.more);
    assert.ok(row, `a clickable site-tree row exists at depth ${i}`);
    row.click();
    v = vals(c);
  }
  assert.equal(c.state.drill.length, 4, 'drilled the picture four levels deep, onto an actual site');
  // Region, state, metro, site: a site opens to its services, never its clouds (2026-09-29).
  // Step back to the metro's site list, where rows can be attached.
  c.state.drill = c.state.drill.slice(0, 3);
  v = vals(c);
  v.openLevel('sites');
  v = vals(c);
  assert.equal(v.drawer.level, 'site');
  const attachRow = v.drawer.rows.find(r => r.action === 'Attach') || v.drawer.rows.find(r => r.action);
  assert.ok(attachRow, 'a path level has at least one Attach row');
  attachRow.act();
  assert.equal(c.state.screen, 's4');
  assert.doesNotMatch(c.state.compose.note, /undefined/, 'the compose note never prints the word undefined');
  assert.doesNotMatch(c.state.compose.bulk, /undefined/);
  // the trail-derived place is the site's own id/drillKey - never empty here,
  // since the trail is three deep.
  assert.doesNotMatch(c.state.compose.note, /state:|metro:|region:/, 'no raw place key');

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
  assert.doesNotMatch(c3.state.compose.note, /undefined/);
  assert.equal(c3.state.compose.note, `Attach ${cloudsAttach.id}: one circuit onto the AT&T network.`);
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
  assert.equal(v.drawer.total, 4);
});

// ---------- Fix round 2 (re-review finding) ----------

test('fix (round 2): a sites level scope never rebuilds s.drill - only the old `metro` kind does', () => {
  // Walk the place drill to a site, then open its services (2026-09-29: the
  // site side ends in services, never clouds). A pin there must not rewrite
  // s.drill, and the drawer must survive it and reopen at the live trail.
  const c = mkC({ view: 'mature' });
  let v = vals(c);
  v.openLevel('sites');
  v = vals(c);
  for (const name of ['US East', 'Virginia', 'Ashburn', 'Ashburn DC']) {
    const row = v.drawer.rows.find(r => r.id === name);
    assert.ok(row && row.isDoor, `${name} is a door: ${v.drawer.rows.map(r => r.id).join(', ')}`);
    row.descend();
    v = vals(c);
  }
  assert.equal(c.state.drill.length, 4, 'sanity: the sites trail is four hops deep');
  assert.equal(v.drawer.level, 'service');
  const row = v.drawer.rows.find(r => r.notDoor);
  assert.ok(row, 'a service row is a leaf asset, not a door');
  const trail = [...c.state.drill];
  row.pin();
  assert.deepEqual(c.state.drill, trail, 's.drill IS this scope\'s column trail - a pin must not rewrite it');
  assert.equal(c.state.volPin, row.id);
  v = vals(c);
  assert.ok(v.drawer, 'the drawer must survive its own pin');
  v.drawer.close();
  v = vals(c);
  v.openLevel('sites');
  v = vals(c);
  assert.ok(v.drawer, 'openLevel("sites") must not return a dead drawer afterward');
  assert.equal(v.drawer.level, 'service');
  c.state.drill = [];
  v = vals(c);
  assert.equal(v.drawer.title, 'Sites');
  assert.equal(v.drawer.total, 5, 'mature has five regions');

  // The old `metro` kind's rebuild is load-bearing - Task 11 rerouted the
  // picture's own `+N more` row to `openLevel('sites')`, but `metro` is still
  // opened from the flow map's `more` node (naas-app.js, mapNodes' click on
  // `nd.kind === 'more'`) and from panel `vol:` children (addendumVals' own
  // openVolume, called where a children row's key starts with `vol:`) - and
  // must stay exactly as it was.
  const c2 = mkC({ vol: { kind: 'metro', cls: 'Branch#1', metro: 'Branch:1:Atlanta' } });
  const v2 = vals(c2);
  assert.deepEqual(c2.state.drill, [], 'sanity: opened from the picture with a short drill');
  v2.drawer.rows.find(r => r.notDoor).pin();
  assert.deepEqual(c2.state.drill, ['Branch#1', 'Branch:1:Atlanta'], 'the metro kind still drills the picture to the pinned site\'s metro');
});
