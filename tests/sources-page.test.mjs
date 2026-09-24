import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// "Why is sources in a right hand drawer when the page is empty?" (Micah,
// 2026-09-23). The drawer is right for a customer managing credentials beside a
// picture they already have. For a customer with no source yet, adding one is
// the whole task, so Sources is a page: a tile per cloud, each saying what it
// needs, and one button that starts discovery.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const empty = (patch = {}) => mkC({ view: 'empty', estateParam: null, screen: 's3', tab: 'connect', ...patch });
const step = (v, label) => v.railGroups.flatMap(g => g.items).find(i => i.label === label);

test('with no source yet, Sources is a page, not a drawer', () => {
  const c = empty();
  step(vals(c), 'Sources').go();
  assert.equal(c.state.screen, 's1');
  assert.ok(!c.state.sub, 'a drawer opened over the page');
  assert.equal(vals(c).sourcesPage, true);
});

test('the Sources page offers each cloud, and AT&T inventory, by what it needs', () => {
  const v = vals(empty({ screen: 's1' }));
  assert.deepEqual(v.sourceTiles.map(t => t.name), ['AWS', 'Azure', 'Google Cloud', 'Oracle Cloud', 'CoreWeave', 'AT&T inventory']);
  assert.deepEqual(v.sourceTiles.map(t => t.cred), ['Cross-account role', 'Service principal', 'Service account', 'API signing key', 'API key', 'NetBond and AVPN, no credential']);
  assert.equal(v.sourceTiles.filter(t => t.on).length, 1, 'no tile, or more than one, is chosen');
});

test('picking a tile chooses it, and AT&T inventory needs no credential', () => {
  const c = empty({ screen: 's1' });
  vals(c).sourceTiles.find(t => t.name === 'Azure').pick();
  assert.equal(vals(c).sourceTiles.find(t => t.on).name, 'Azure');
  assert.equal(c.state.intakeSource, 'credential');
  vals(c).sourceTiles.find(t => t.name === 'AT&T inventory').pick();
  assert.equal(c.state.intakeSource, 'inventory');
  assert.equal(vals(c).sourceTiles.find(t => t.on).name, 'AT&T inventory');
});

// Opened as ?estate=empty the URL's estate outranked the scan's result, so the
// button ran a scan and left the page empty.
test('the one button starts discovery, and what it finds replaces the empty estate', () => {
  const c = empty({ screen: 's1', estateParam: 'empty' });
  vals(c).startScan();
  assert.equal(c.state.screen, 's1');
  assert.equal(c.state.scanBusy, true);
  assert.equal(c.state.estateParam, null);
  assert.notEqual(vals(c).sourcesPage, true, 'the scan left the Sources page up');
});

test('Manage credentials with nothing to manage opens the Sources page', () => {
  const c = empty();
  vals(c).manageCreds();
  assert.equal(c.state.screen, 's1');
  assert.ok(!c.state.sub);
});

test('the Connect page points a new customer at Sources, not three steps ahead', () => {
  const c = empty();
  const next = vals(c).connectNext;
  assert.match(next.title, /Connect your first cloud/);
  next.go();
  assert.equal(c.state.screen, 's1');
});

// ---- with sources: source management is a page, and the drawer adds or edits one ----
// "Connected accounts on main page, drawer for new account form ... add or edit a
// source ... edit the automation or credentials of another" (Micah, 2026-09-23).
test('with a source, Sources is a page listing the connected accounts', () => {
  const c = mkC({ view: 'small', estateParam: null, screen: 's3', tab: 'connect' });
  step(vals(c), 'Sources').go();
  const v = vals(c);
  assert.equal(c.state.screen, 's1');
  assert.ok(!c.state.sub, 'a drawer opened over the page');
  assert.equal(v.s1Title, 'Sources');
  assert.equal(v.showSourcesBody, true);
  assert.equal(v.showEstateBody, false);
  assert.ok(v.sources.length > 0);
});

test('Add a source opens the drawer to add one', () => {
  const c = mkC({ view: 'small', estateParam: null, screen: 's1', discoverView: 'sources' });
  vals(c).openAddSource();
  const v = vals(c);
  assert.deepEqual(c.state.sub, { page: 'discover', panel: 'add' });
  assert.equal(v.subTitle, 'Add a source');
  assert.equal(v.srcAdding, true);
  assert.deepEqual(v.subTabs.map(t => t.label), ['Add a source', 'Discovery run']);
  vals(c).sourceTiles.find(t => t.name === 'Azure').pick();
  assert.deepEqual(vals(c).srcCredOpts.map(o => o.label), ['Service principal', 'Managed identity']);
  vals(c).addSource();
  assert.ok(!c.state.sub, 'the drawer stayed open after adding');
  assert.ok(vals(c).sources.some(r => r.name === 'Azure account'), 'the new source is not on the page');
});

test('Edit access opens the same drawer on that source: its credential, scope and schedule', () => {
  const c = mkC({ view: 'mature', estateParam: null, screen: 's1', discoverView: 'sources' });
  const aws = vals(c).sources.find(r => r.kind === 'AWS');
  aws.edit();
  const v = vals(c);
  assert.equal(v.subTitle, 'Edit a source');
  assert.equal(v.srcEditing, true);
  assert.equal(v.srcEditName, aws.name);
  assert.deepEqual(v.srcCredOpts.map(o => o.label), ['Cross-account role', 'Access keys']);
  assert.equal(v.srcCadence, aws.cadenceValue, 'the schedule is not the source\'s own');
  v.setSrcCadence({ target: { value: 'weekly' } });
  assert.equal(vals(c).sources.find(r => r.key === aws.key).cadenceValue, 'weekly', 'changing the schedule did not reach the source');
  assert.equal(v.srcDoneLabel, 'Save');
});

test('AT&T inventory has nothing to manage, and says so', () => {
  const c = mkC({ view: 'mature', estateParam: null, screen: 's1', discoverView: 'sources' });
  vals(c).sources.find(r => r.kind === 'AT&T').edit();
  const v = vals(c);
  assert.equal(v.srcNoCred, true);
  assert.match(v.srcInventoryNote, /nothing|no credential/i);
});

test('the drawer subtitle counts what is connected and never points "above"', () => {
  const v = vals(mkC({ view: 'small', estateParam: null, screen: 's3', tab: 'connect', sub: { page: 'discover', panel: 'sources' } }));
  assert.doesNotMatch(v.sourcesSub, /above|0 of 0/);
  assert.match(v.sourcesSub, /^\d+ connected/);
});

test('the markup draws the Sources page tiles', () => {
  const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
  assert.match(HTML, /<sc-for list="\{\{ sourceTiles \}\}" as="st"/);
});

// The drawer sat inside the Connect screen's gate, so on Discover "Add a source"
// set the state and nothing appeared. vals() tests cannot see the markup.
test('the sub layer is not inside any screen\'s gate', () => {
  const L = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8').split('\n');
  const stack = [];
  for (const l of L) {
    if (l.includes('<aside aria-label="Discovery"')) break;
    for (const m of l.matchAll(/<sc-if value="\{\{ ([\w.]+) \}\}"|<\/sc-if>/g)) { if (m[1]) stack.push(m[1]); else stack.pop(); }
  }
  assert.deepEqual(stack, ['subOpen'], `the drawer is gated by ${stack.join(' > ')}`);
});
