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

// Third cut, same day, after research (NN/g breadcrumb guidelines; drill-down
// dashboard practice): the trail lives in each column's own header, where the
// eye already is. The column title is the root, then the chosen things; every
// ancestor is a link, the last item is the current place and not a link, one
// line, ">" separators, middle truncation. Depth is the trail's own length.

test('at the top, each column header is just its title, and it is the current place', () => {
  const v = vals(on());
  assert.deepEqual(labels(v.siteTrail), ['Sites']);
  assert.deepEqual(labels(v.cloudTrail), ['Clouds']);
  assert.equal(v.siteTrail[0].isLast, true);
  assert.equal(v.siteTrail[0].isLink, false, 'a link to the page you are on does nothing');
});

test('drilled in, the header reads the chosen things, ancestors are links, the last is not', () => {
  const v = vals(on({ drill: ['region:US West', 'Denver branch'] }));
  assert.deepEqual(labels(v.siteTrail), ['Sites', 'US West', 'Denver branch']);
  assert.deepEqual(v.siteTrail.map(c => c.isLink), [true, true, false]);
  assert.equal(v.sitesDrilled, true);
});

test('the cloud trail keeps identifiers in their own case', () => {
  const v = vals(on({ cloudPick: 'AWS', cloudDrill: ['us-east-1'] }));
  assert.deepEqual(labels(v.cloudTrail), ['Clouds', 'AWS', 'us-east-1']);
  assert.equal(v.cloudsDrilled, true);
});

test('a long trail keeps the root and where you are, and folds the rest into a named "…"', () => {
  const v = vals(on({ cloudPick: 'AWS', cloudDrill: ['us-east-1', 'vpc-0-0', 'vpc-0-0-prv-0'] }));
  const t = v.cloudTrail;
  assert.equal(t.length, 3, labels(t).join(' > '));
  assert.equal(t[0].label, 'Clouds');
  assert.equal(t[1].label, '…');
  assert.equal(t[1].isLink, false);
  assert.match(t[1].title, /AWS › us-east-1 › /);
  assert.equal(t[2].isLast, true);
  const four = vals(on({ cloudPick: 'AWS', cloudDrill: ['us-east-1', 'vpc-0-0'] })).cloudTrail;
  assert.equal(four.length, 4, 'four levels still show whole');
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

test('the trails live in the column headers; no second bar, no "you are here"', () => {
  const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
  const head = (x) => { const i = HTML.indexOf(`<foreignObject x="${x}" y="0"`); return HTML.slice(i, HTML.indexOf('</foreignObject>', i)); };
  assert.match(head('24'), /<sc-for list="\{\{ siteTrail \}\}"/);
  assert.match(head('{{ rightX }}'), /<sc-for list="\{\{ cloudTrail \}\}"/);
  assert.doesNotMatch(HTML, /aria-label="Where you are"|You are here|<nav aria-label="Breadcrumb"/);
});

// Found 2026-09-25 walking the ladder: hovering a region set hoverRegion, and
// going back up to the provider cards left no region row to anchor its popover,
// so the page threw "Cannot read properties of undefined (reading 'y')".
test('a region still hovered when you climb to the providers does not break the page', () => {
  const v = vals(on({ hoverRegion: 'us-east-1', hoverNode: 'regus-east-1' }));
  assert.ok(v.heroClouds.length > 0);
});
