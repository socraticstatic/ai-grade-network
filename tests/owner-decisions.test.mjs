import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as D from '../naas-data.js';
import { connectVerdict } from '../naas-verdicts.js';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// Three owner decisions on the D-6 model (Micah, 2026-09-30: "proceed on your
// recommendations"; plan docs/superpowers/plans/2026-09-30-naas-home.md, Task 3).
//   (b) Private is private. A direct connect or an Equinix port is a private
//       path, not the AT&T network. The Connect verdict says how each private
//       region connects instead of calling them all "on the AT&T network".
//   (c) Commits are cloud connections. The commit-vs-metered table covers every
//       private region, NetBond or not, so it no longer says "on-ramps".
//   (e) Nothing attached reads 0. A site counts on AT&T only when the map
//       carries something on the AT&T network, picked or not.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');

// ---- (b) private is private ----

test('(b) Growing: the private regions are named by how they connect', () => {
  assert.equal(connectVerdict(D.ESTATES.partial, 'cloud'), '5 of 7 regions still ride the public internet. 2 are private: 1 on NetBond, 1 on a direct connect.');
});

test('(b) Established and Bank scale count NetBond, direct connect and Equinix Fabric apart', () => {
  assert.equal(connectVerdict(D.ESTATES.mature, 'cloud'), '1 of 8 regions still ride the public internet. 7 are private: 2 on NetBond, 4 on direct connects, 1 on Equinix Fabric.');
  assert.equal(connectVerdict(D.ESTATES.trust, 'cloud'), '2 of 6 regions still ride the public internet. 4 are private: 2 on NetBond, 2 on direct connects.');
});

const reg = (region, ramp, priv) => ({ region, cloud: 'AWS', ramp, priv, wl: 10 });
const estOf = (regionsList) => ({ stage: 'partial', regionsList });

test('(b) when every private region shares one way in, the verdict names it once', () => {
  assert.equal(connectVerdict(estOf([reg('a', 'NetBond', true), reg('b', 'NetBond', true), reg('c', null, false)])), '1 of 3 regions still ride the public internet. 2 are private, on NetBond.');
  assert.equal(connectVerdict(estOf([reg('a', 'DX', true), reg('c', null, false)])), '1 of 2 regions still ride the public internet. 1 is private, on a direct connect.');
  assert.equal(connectVerdict(estOf([reg('a', 'EQX', true), reg('b', 'EQX', true), reg('c', null, false)])), '1 of 3 regions still ride the public internet. 2 are private, on Equinix Fabric.');
});

test('(b) all private reads a private path, not the AT&T network', () => {
  assert.equal(connectVerdict(estOf([reg('a', 'NetBond', true), reg('b', 'ER', true)])), 'Every region is on a private path.');
});

test('(b) the empty and the small lines stand', () => {
  assert.equal(connectVerdict(D.ESTATES.empty), 'Nothing connected yet. AT&T already sees 41 metros with on-ramps and 12 clouds you could reach.');
  assert.equal(connectVerdict(D.ESTATES.small), '2 of 2 regions still ride the public internet. None is on the AT&T network yet.');
});

test('(b) Connect\'s title row reads the new verdict', () => {
  const v = vals(mkC({ view: 'partial', estateParam: null, screen: 's3', layer: 'cloud', tab: 'connect' }));
  assert.equal(v.pageVerdict, '5 of 7 regions still ride the public internet. 2 are private: 1 on NetBond, 1 on a direct connect.');
});

// The longer verdict wrapped to two lines beside Connect's scan controls and
// pushed the NaaS landing to 907px (fold, 2026-09-30). The sentence now takes
// the title row's full width under the title and its controls, so it holds to
// one line and the row is no taller than before.
test('(b) the page verdict spans the whole title row', () => {
  const a = HTML.indexOf('<sc-if value="{{ showPageTitle }}"');
  const head = HTML.slice(a, HTML.indexOf('</sc-if>\n\n', a));
  assert.match(head, /^<sc-if[^>]*>\n<div style="display:grid;grid-template-columns:minmax\(0,1fr\) auto;/);
  assert.match(head, /<div style="display:contents"><h1 style="grid-column:1;grid-row:1;/);
  assert.match(head, /<div onClick="\{\{ verdictGo \}\}"[^>]*style="grid-column:1 \/ -1;grid-row:2;/);
  assert.match(head, /<div style="grid-column:2;grid-row:1;display:flex;/);
});

// ---- (c) commits are cloud connections ----

test('(c) the commit table is titled for cloud connections', () => {
  assert.ok(HTML.includes('aria-label="Committed vs metered cloud connections"'));
  assert.match(HTML, />Committed vs metered cloud connections</);
  assert.equal(HTML.indexOf('Committed vs metered on-ramps'), -1);
});

test('(c) Andi names the commit the way the table does', () => {
  const c = mkC({ view: 'partial', estateParam: null, screen: 's3', layer: 'cloud', tab: 'cost', andiInput: 'Should I commit or stay metered?' });
  vals(c).andiSend();
  const a = c.state.andiThread[c.state.andiThread.length - 1].a;
  assert.match(a, /^A committed cloud connection beats metered/);
  assert.ok(!/on-ramp/.test(a), a);
});

// ---- (e) nothing attached reads 0 ----

const flow = (patch = {}) => vals(mkC({ estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', obTab: 'flow', ...patch }));
const tile = (v, k) => v.flowTiles.find(t => t.key === k);

test('(e) Small at the whole estate: nothing attached, so 0 of 2 sites on AT&T', () => {
  const t = tile(flow({ view: 'small' }), 'onatt');
  assert.equal(t.v, '0 of 2');
  assert.equal(t.title, '2 sites buy AT&T access; none reaches a cloud over the AT&T network yet');
});

test('(e) Growing is unchanged at 20 of 25, and its title says what the count is', () => {
  const t = tile(flow({ view: 'partial' }), 'onatt');
  assert.equal(t.v, '20 of 25');
  assert.equal(t.title, '20 of 25 sites buy AT&T access and reach the clouds over the AT&T network');
});

test('(e) every Traffic tile carries a title that says more than its label', () => {
  for (const view of ['small', 'partial', 'mature', 'trust']) {
    for (const t of flow({ view }).flowTiles) {
      assert.ok(t.title && t.title !== t.l, `${view} ${t.key}: ${t.title}`);
      assert.ok(!/—/.test(t.title), `${view} ${t.key}: em dash`);
    }
  }
});
