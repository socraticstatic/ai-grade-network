import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// "We need better drill down indicators. The breadcrumbs get lost, it's easy to
// lose how far down one is" (Micah, 2026-09-25). The trail sat above the tiles,
// far from the picture, and the columns said only "‹ US EAST". Each column now
// carries a ladder of its levels: the ones passed (named, clickable), the one
// you are on, and the ones still below.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const on = (patch = {}) => mkC({ view: 'mature', screen: 's3', tab: 'connect', estateParam: null, ...patch });
const labels = (t) => t.map(c => c.label);

// Fourth cut, same day. The trails crammed into the column headers were
// "really shoved in and sloppy". After NN/g's breadcrumb guidelines: one row
// of its own at the top of the picture, always there so nothing jumps, a trail
// per column. One size; ancestors are links; the last item is the current
// place, darker, not a link; ">" separators; middle truncation.

test('at the top, each trail reads "All sites" / "All clouds", and it is the current place', () => {
  const v = vals(on());
  assert.deepEqual(labels(v.siteTrail), ['All sites']);
  assert.deepEqual(labels(v.cloudTrail), ['All clouds']);
  assert.equal(v.siteTrail[0].isLast, true);
  assert.equal(v.siteTrail[0].isLink, false, 'a link to the page you are on does nothing');
});

test('drilled in, the trail reads the chosen things, ancestors are links, the last is not', () => {
  const v = vals(on({ drill: ['region:US West', 'Denver branch'] }));
  assert.deepEqual(labels(v.siteTrail), ['All sites', 'US West', 'Denver branch']);
  assert.deepEqual(v.siteTrail.map(c => c.isLink), [true, true, false]);
  assert.equal(v.sitesDrilled, true);
});

test('the cloud trail keeps identifiers in their own case', () => {
  const v = vals(on({ cloudPick: 'AWS', cloudDrill: ['us-east-1'] }));
  assert.deepEqual(labels(v.cloudTrail), ['All clouds', 'AWS', 'us-east-1']);
  assert.equal(v.cloudsDrilled, true);
});

test('the deepest trail, five levels, reads whole: nothing folds that has room', () => {
  const t = vals(on({ cloudPick: 'AWS', cloudDrill: ['us-east-1', 'vpc-0-0', 'vpc-0-0-prv-0'] })).cloudTrail;
  assert.equal(t.length, 5, labels(t).join(' > '));
  assert.ok(!t.some(c => c.label === '…'));
  assert.equal(t[4].isLast, true);
});

test('an ancestor takes you back to it', () => {
  const c = on({ cloudPick: 'AWS', cloudDrill: ['us-east-1'] });
  vals(c).cloudTrail[1].go();
  assert.deepEqual(c.state.cloudDrill, []);
  assert.equal(c.state.cloudPick, 'AWS');
  vals(c).cloudTrail[0].go();
  assert.equal(c.state.cloudPick, null);
  const s = on({ drill: ['region:US West', 'Denver branch'] });
  vals(s).siteTrail[1].go();
  assert.deepEqual(s.state.drill, ['region:US West']);
  vals(s).siteTrail[0].go();
  assert.deepEqual(s.state.drill, []);
});

test('the trails sit in one row above the picture; the column headers are just title and door', () => {
  const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
  const bar = HTML.indexOf('aria-label="Where you are"'), svg = HTML.indexOf('<svg viewBox="{{ heroVB }}"');
  assert.ok(bar > 0 && bar < svg, 'the row comes right before the picture');
  const row = HTML.slice(bar, svg);
  assert.match(row, /<sc-for list="\{\{ siteTrail \}\}"/);
  assert.match(row, /<sc-for list="\{\{ cloudTrail \}\}"/);
  const head = (x) => { const i = HTML.indexOf(`<foreignObject x="${x}" y="0"`); return HTML.slice(i, HTML.indexOf('</foreignObject>', i)); };
  assert.doesNotMatch(head('24') + head('{{ rightX }}'), /Trail/);
  assert.doesNotMatch(HTML, /You are here/);
});

// Found 2026-09-25 walking the ladder: hovering a region set hoverRegion, and
// going back up to the provider cards left no region row to anchor its popover,
// so the page threw "Cannot read properties of undefined (reading 'y')".
test('a region still hovered when you climb to the providers does not break the page', () => {
  const v = vals(on({ hoverRegion: 'us-east-1', hoverNode: 'regus-east-1' }));
  assert.ok(v.heroClouds.length > 0);
});
