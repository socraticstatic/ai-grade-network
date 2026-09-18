import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import * as A from '../naas-addendum.js';
import * as S from '../naas-sites.js';
import * as C from '../naas-connections.js';
import { levelHead } from '../naas-volume.js';
import { vals, defaults } from '../naas-app.js';

// Task 7's harness, reused: vals() closes over c/s/set, so it is driven by a
// fake `c` built from defaults().
function mkC(extra = {}) {
  const state = { ...defaults(), view: 'trust', screen: 's3', layer: 'cloud', tab: 'connect', ...extra };
  return { state, setState: (p) => Object.assign(state, p) };
}

const est = D.ESTATES.trust;
const inv = A.inventory(est);
const ob = A.observe(est, [], inv);
const head = (col, trail) => levelHead(est, inv, ob, col, trail);

test('the sites column counts what the drawer will hold', () => {
  assert.deepEqual(pick(head('sites', [])), { total: 7, noun: 'site groups' });
  assert.deepEqual(pick(head('sites', ['Branch'])), { total: 19, noun: 'metros' });
  assert.deepEqual(pick(head('sites', ['Branch#1'])), { total: 6, noun: 'metros' });
  assert.deepEqual(pick(head('sites', ['Branch', 'Branch:1:Atlanta'])), { total: 588, noun: 'remote sites' });
  const site = head('sites', ['Branch', 'Branch:1:Atlanta', 'RS-ATL-0100']);
  assert.equal(site.noun, 'paths');
});

test('the fabric column counts facilities, ports and circuits', () => {
  assert.deepEqual(pick(head('fabric', [])), { total: 4, noun: 'facilities' });
  assert.deepEqual(pick(head('fabric', ['fab'])), { total: 4, noun: 'facilities' });
  assert.deepEqual(pick(head('fabric', ['fab', 'N. Virginia'])), { total: 21, noun: 'ports' });
  const p = head('fabric', ['fab', 'N. Virginia']);
  assert.deepEqual(pick(head('fabric', ['fab', 'N. Virginia', 'port:us-east-1:1'])), { total: 3, noun: 'circuits' });
  assert.ok(p.trail.length === 2);
});

test('the clouds column never claims regions it does not have', () => {
  assert.deepEqual(pick(head('clouds', [])), { total: 6, noun: 'regions' });
  assert.deepEqual(pick(head('clouds', ['us-east-1'])), { total: 3, noun: 'VPCs' });
  assert.deepEqual(pick(head('clouds', ['us-east-1', 'vpc-0-0'])), { total: 6, noun: 'subnets' });
  assert.deepEqual(pick(head('clouds', ['us-east-1', 'vpc-0-0', 'vpc-0-0-pub-0'])), { total: 60, noun: 'workloads' });
});

test('partial proves depth is not level', () => {
  const p = D.ESTATES.partial;
  const pinv = A.inventory(p);
  const pob = A.observe(p, [], pinv);
  assert.equal(levelHead(p, pinv, pob, 'sites', ['Data center']).level, 'site');
  assert.equal(levelHead(p, pinv, pob, 'sites', ['Branch']).level, 'metro');
});

// ---------- Conservation: the door's number is never bigger or smaller than
// what is actually behind it. Every figure below was measured with a real
// node run against `trust`, not derived from the function under test — see
// task-3-report.md for the run that produced them.

/** Drill a rollup group ('<cls>#<ri>') all the way to its individual sites and sum them. */
function siteCountOfGroup(key) {
  const info = C.siteDrillRows(est, [key]);
  const rows = (info ? info.rows : []).filter(r => !r.more);
  return rows.reduce((sum, r) => sum + head('sites', [key, r.drillKey]).total, 0);
}

test('sites: the root conserves — every group, drilled to its sites, sums to sitesCount', () => {
  assert.equal(est.sitesCount, 4120);
  const keys = est.sites.map(s => S.rollupKeyOf(est, s));
  assert.deepEqual(keys, ['Data center#0', 'Branch#0', 'Branch#1', 'Branch#2', 'Branch#3', 'Edge#0', 'Campus#0']);
  const grandTotal = keys.reduce((sum, key) => sum + siteCountOfGroup(key), 0);
  assert.equal(grandTotal, 4120);
});

test('sites: one level down, Branch#1 (Remote sites, East) conserves the same way', () => {
  assert.deepEqual(pick(head('sites', ['Branch#1'])), { total: 6, noun: 'metros' });
  assert.equal(siteCountOfGroup('Branch#1'), 1640);
});

test('clouds: the root reports the 6 regions with data behind them, never the +8 with none', () => {
  const h = head('clouds', []);
  assert.equal(h.total, 6);
  assert.equal(est.regionsList.length, 6);
  assert.equal(est.regionsExtra, 8);
  assert.notEqual(h.total, est.regionsList.length + est.regionsExtra);
});

test('fabric: a facility reports every port, not the 8-row band cap', () => {
  const h = head('fabric', ['fab', 'N. Virginia']);
  assert.equal(h.total, 21);
  assert.notEqual(h.total, 8);
});

function pick(h) { return { total: h.total, noun: h.noun }; }

// ---- Task 9: the three header doors, as values ----
// The door is the count, so its label is pinned as a literal at every level of
// every column. If a literal here and the drawer's total ever disagree, one of
// them is lying to the customer.

test('the door copy matches the design, level by level', () => {
  const copy = (col, trail, shown) => {
    const h = levelHead(est, inv, ob, col, trail);
    const hidden = Math.max(0, h.total - shown);
    return hidden ? `All ${h.total} ${h.noun} · ${hidden} hidden ›` : `All ${h.total} ${h.noun} ›`;
  };
  assert.equal(copy('sites', [], 7), 'All 7 site groups ›');
  assert.equal(copy('sites', ['Branch'], 6), 'All 19 metros · 13 hidden ›');
  assert.equal(copy('sites', ['Branch', 'Branch:1:Atlanta'], 6), 'All 588 remote sites · 582 hidden ›');
  assert.equal(copy('fabric', [], 4), 'All 4 facilities ›');
  assert.equal(copy('fabric', ['fab', 'N. Virginia'], 8), 'All 21 ports · 13 hidden ›');
  assert.equal(copy('clouds', [], 6), 'All 6 regions ›');
  assert.equal(copy('clouds', ['us-east-1'], 3), 'All 3 VPCs ›');
  assert.equal(copy('clouds', ['us-east-1', 'vpc-0-0'], 6), 'All 6 subnets ›');
  assert.equal(copy('clouds', ['us-east-1', 'vpc-0-0', 'vpc-0-0-pub-0'], 6), 'All 60 workloads · 54 hidden ›');
});

const door = (col, extra) => vals(mkC(extra))[col];

test('the three doors read the spec table on trust, level by level', () => {
  // SITES
  assert.equal(door('sitesDoor').label, 'All 7 site groups ›');
  assert.equal(door('sitesDoor', { drill: ['Branch'] }).label, 'All 19 metros · 13 hidden ›');
  assert.equal(door('sitesDoor', { drill: ['Branch', 'Branch:1:Atlanta'] }).label, 'All 588 remote sites · 582 hidden ›');
  assert.equal(door('sitesDoor', { drill: ['Branch', 'Branch:1:Atlanta', 'RS-ATL-0100'] }).label, 'All 6 paths ›');
  // FABRIC
  assert.equal(door('bandDoor').label, 'All 4 facilities ›');
  assert.equal(door('bandDoor', { fabDrill: ['fab', 'N. Virginia'] }).label, 'All 21 ports · 13 hidden ›');
  assert.equal(door('bandDoor', { fabDrill: ['fab', 'N. Virginia', 'port:us-east-1:1'] }).label, 'All 3 circuits ›');
  // CLOUDS
  assert.equal(door('cloudsDoor').label, 'All 6 regions ›');
  assert.equal(door('cloudsDoor', { cloudDrill: ['us-east-1'] }).label, 'All 3 VPCs ›');
  assert.equal(door('cloudsDoor', { cloudDrill: ['us-east-1', 'vpc-0-0'] }).label, 'All 6 subnets ›');
  assert.equal(door('cloudsDoor', { cloudDrill: ['us-east-1', 'vpc-0-0', 'vpc-0-0-prv-0'] }).label, 'All 89 workloads · 83 hidden ›');
});

test('hidden is the drawer total less what the canvas is actually drawing', () => {
  // 19 metros at the CLASS level, 6 on the canvas.
  assert.equal(door('sitesDoor', { drill: ['Branch'] }).label, 'All 19 metros · 13 hidden ›');
  // The East rollup GROUP is a real level too, and it hides nothing.
  assert.equal(door('sitesDoor', { drill: ['Branch#1'] }).label, 'All 6 metros ›');
  // 588 remote sites in Atlanta, 6 on the canvas.
  assert.equal(door('sitesDoor', { drill: ['Branch', 'Branch:1:Atlanta'] }).label, 'All 588 remote sites · 582 hidden ›');
  // 21 ports at N. Virginia, the band draws 8.
  assert.equal(door('bandDoor', { fabDrill: ['fab', 'N. Virginia'] }).label, 'All 21 ports · 13 hidden ›');
});

test('an accent door means something is hidden; a plain one means nothing is', () => {
  assert.equal(door('sitesDoor', { drill: ['Branch'] }).color, 'var(--link)');
  assert.equal(door('sitesDoor').color, 'var(--text-light)');
  assert.equal(door('bandDoor', { fabDrill: ['fab', 'N. Virginia'] }).color, 'var(--link)');
  assert.equal(door('bandDoor').color, 'var(--text-light)');
  assert.equal(door('cloudsDoor').color, 'var(--text-light)');
});

test('a closed band still counts its facilities and hides nothing', () => {
  const v = vals(mkC());
  assert.equal(v.fabClosed, true);
  assert.equal(v.bandDoor.has, true);
  assert.equal(v.bandDoor.label, 'All 4 facilities ›');
  assert.equal(v.bandDoor.color, 'var(--text-light)');
});

test('every field a door carries is a plain value the dc-runtime can bind', () => {
  const v = vals(mkC({ drill: ['Branch'] }));
  for (const k of ['sitesDoor', 'bandDoor', 'cloudsDoor']) {
    const d = v[k];
    assert.deepEqual(Object.keys(d).sort(), ['color', 'gutter', 'has', 'label', 'open', 'title'], k);
    assert.equal(typeof d.has, 'boolean', k + '.has');
    assert.equal(typeof d.label, 'string', k + '.label');
    assert.equal(typeof d.title, 'string', k + '.title');
    assert.equal(typeof d.color, 'string', k + '.color');
    assert.equal(typeof d.gutter, 'number', k + '.gutter');
    assert.equal(typeof d.open, 'function', k + '.open');
    assert.ok(!/#[0-9a-f]{3,6}/i.test(d.color), k + '.color is a token, never a hex');
  }
});

test('the gutter lands each door 12px inside its column card edge', () => {
  // SITES header x=24 w=460 -> right 484; the 200-wide card ends at 224.
  assert.equal(vals(mkC()).sitesDoor.gutter, 484 - (224 - 12));
  // CLOUDS header x=980; w=240 closed, 412 drilled; the card ends at 1220.
  assert.equal(vals(mkC()).cloudsDoor.gutter, 980 + 240 - (1220 - 12));
  assert.equal(vals(mkC({ cloudDrill: ['us-east-1'] })).cloudsDoor.gutter, 980 + 412 - (1220 - 12));
  // The band door sits 12px inside the band, open (380..800) or closed (560..800).
  assert.equal(vals(mkC()).bandDoor.gutter, 12);
  assert.equal(vals(mkC({ fabDrill: ['fab'] })).bandDoor.gutter, 12);
});

test('the door opens the drawer on that column, in place', () => {
  const c = mkC({ drill: ['Branch'] });
  vals(c).sitesDoor.open();
  assert.deepEqual(c.state.vol, { kind: 'level', col: 'sites' });
  assert.equal(c.state.drawerOpen, true);
  assert.equal(vals(c).drawer.total, 19, 'the door total is the drawer total');
});

test('on the empty estate no header is a door at all', () => {
  const v = vals(mkC({ view: 'empty' }));
  for (const k of ['sitesDoor', 'bandDoor', 'cloudsDoor']) {
    assert.equal(v[k].has, false, k);
    assert.equal(v[k].label, '', k);
    assert.equal(v[k].title, '', k);
    assert.equal(typeof v[k].open, 'function', k + ' still safe to call');
    assert.doesNotThrow(() => v[k].open(), k);
  }
});

test('the roots still read on partial and mature', () => {
  for (const [view, sites, fab, clouds] of [['partial', 5, 2, 7], ['mature', 7, 7, 8]]) {
    const v = vals(mkC({ view }));
    assert.ok(v.sitesDoor.label.startsWith(`All ${sites} `), `${view} sites: ${v.sitesDoor.label}`);
    assert.ok(v.bandDoor.label.startsWith(`All ${fab} `), `${view} fabric: ${v.bandDoor.label}`);
    assert.ok(v.cloudsDoor.label.startsWith(`All ${clouds} `), `${view} clouds: ${v.cloudsDoor.label}`);
  }
});

test('the clouds door never counts the regions with no data behind them', () => {
  assert.equal(est.regionsExtra, 8);
  assert.equal(vals(mkC()).cloudsDoor.label, 'All 6 regions ›');
  assert.ok(!vals(mkC()).cloudsDoor.label.includes('14'));
});
