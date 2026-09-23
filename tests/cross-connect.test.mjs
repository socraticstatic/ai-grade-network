import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as D from '../naas-data.js';
import { heroLayout } from '../naas-logic.js';
import { vals } from '../naas-app.js';
import { siteDrillRows } from '../naas-connections.js';
import { mkC } from './harness.mjs';

// A cross-connect is the cable inside a colo between two networks' ports. It is
// not a segment; it sits on a handoff. For a dedicated Direct Connect or
// ExpressRoute Direct port the cloud issues a Letter of Authorization (LOA-CFA)
// and the customer orders the cable from the colo, which bills it and holds its
// SLA: "AWS does not establish cross connects on your behalf" (AWS Direct
// Connect User Guide, Requesting cross connects). A partner-hosted port -
// NetBond is one - is already cross-connected by the partner. So when a
// customer's own cross-connect fails, neither AT&T nor the cloud answers for it.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const L = (opts = {}) => heroLayout(D.ESTATES.mature, { bandX: 300, bandW: 500, ...opts });

test('mature us-west-2 is a dedicated Direct Connect port on the customer\'s own cross-connect', () => {
  const r = D.ESTATES.mature.regionsList.find(x => x.region === 'us-west-2');
  assert.equal(r.ramp, 'DX');
  assert.deepEqual(r.xc, { by: 'yours', at: 'Equinix SE2, Seattle' });
});

test('the cross-connect is marked on the handoff into the cloud\'s edge, not drawn as a leg', () => {
  const l = L();
  assert.equal(l.xconnects.length, 1);
  const xc = l.xconnects[0];
  assert.equal(xc.region, 'us-west-2');
  const edge = l.segments[3];
  assert.equal(xc.x, edge.x, 'the mark is not on the Core-to-Edge boundary');
  const bend = l.bends.find(b => b.region === 'us-west-2');
  assert.ok(bend, 'us-west-2 has no handoff to sit on');
  assert.equal(xc.y, Math.round((bend.y1 + bend.y2) / 2), 'the mark is off the line');
  assert.equal(l.legs.some(g => g.seg === 'XC' || g.owner === 'yours'), false, 'a cross-connect was drawn as a segment');
});

test('no cross-connect is invented: NetBond and unstated regions carry none', () => {
  const l = L();
  const marked = new Set(l.xconnects.map(x => x.region));
  for (const r of D.ESTATES.mature.regionsList) if (!r.xc) assert.equal(marked.has(r.region), false, `${r.region} got a cross-connect it never stated`);
  for (const k of ['small', 'partial', 'trust']) assert.equal(heroLayout(D.ESTATES[k], {}).xconnects.length, 0, k);
});

test('the mark survives the drill into a site', () => {
  const rows = siteDrillRows(D.ESTATES.mature, ['region:US West', 'Denver branch']).rows;
  assert.equal(L({ siteRows: rows }).xconnects.length, 1);
});

test('the mark says who answers for it, in words', () => {
  const v = vals(mkC({ view: 'mature', screen: 's3', tab: 'connect' }));
  const xc = v.xconnects.find(x => x.region === 'us-west-2');
  assert.ok(xc, 'the view model dropped the cross-connect');
  assert.match(xc.title, /Your cross-connect/);
  assert.match(xc.title, /Equinix SE2, Seattle/);
  assert.match(xc.title, /not AT&T/);
  assert.ok(v.overlayLegend.some(e => /cross-connect/.test(e.l)), 'the legend does not say what the mark is');
});

test('the markup draws the marks inside the picture', () => {
  const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
  assert.match(HTML, /<sc-for list="\{\{ xconnects \}\}" as="xc"/);
});
