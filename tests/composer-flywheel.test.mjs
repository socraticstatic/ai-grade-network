import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// The composer as NetBond Advanced lays out Configure > Policies (2026-10-02): a vertical tab group with icons under
// category heads, rules as wash rows with a toggle per direction, Reset and the verbs in the footer, and a path strip
// under the sentence that fills in as you pick.
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const onDisk = (n) => existsSync(new URL(`../brand/icons/${n}.svg`, import.meta.url));
const gov = (au) => mkC({ view: 'partial', estateParam: null, screen: 's3', layer: 'cloud', tab: 'govern', govPanel: 'policies', authoring: au });
const PC = 'Private cloud · Equinix DC2, Ashburn';

test('four category heads, five tabs, every tab with a glyph on disk', () => {
  const v = vals(gov({ match: null, scope: null, req: [] }));
  assert.deepEqual(v.aCats.map(c => c.label), ['Policy', 'Routing', 'Security', 'Outcome']);
  assert.deepEqual(v.aCats.map(c => c.tabs.map(t => t.key)), [['intent'], ['services', 'route'], ['security'], ['outcome']]);
  for (const t of v.aTabs) assert.ok(onDisk(t.icon), `${t.key}: ${t.icon}`);
  assert.equal(v.aTabs.find(t => t.key === 'intent').on, true);
});

test('the sides and the requirements each carry a glyph', () => {
  const v = vals(gov({ match: null, scope: null, req: [] }));
  for (const cd of [...v.aMatch, ...v.aScope, ...v.aReq]) assert.ok(onDisk(cd.icon), `${cd.label}: ${cd.icon}`);
  assert.equal(v.aMatch.find(c => c.label === PC).icon, 'hybrid-cloud');
  assert.equal(v.aScope.find(c => c.label === 'the Internet').icon, 'globe');
  assert.equal(v.aReq.find(c => c.label === 'Inline inspection').icon, 'firewall');
});

test('routing and security split the five service groups, each option naming its layer', () => {
  const v = vals(gov({ match: PC, scope: 'AWS us-east-1', req: [], tab: 'services' }));
  assert.deepEqual(v.aRouting.map(g => g.key), ['multipath', 'egress']);
  assert.deepEqual(v.aSecurity.map(g => g.key), ['inline', 'access', 'crypto']);
  for (const g of [...v.aRouting, ...v.aSecurity]) { assert.ok(onDisk(g.icon), g.key); for (const o of g.opts) assert.ok(['Sites', 'Edge', 'Core', 'Cloud'].includes(o.layerLabel), o.label); }
  assert.equal(v.aSvcOn, true); assert.equal(v.aSecOn, false);
  assert.equal(vals(gov({ match: PC, scope: 'AWS us-east-1', req: [], tab: 'security' })).aSecOn, true);
});

test('route policy sits in two columns, Deny with Allow and Manipulations with Advanced, and a toggle reads its state', () => {
  const c = gov({ match: PC, scope: 'AWS us-east-1', req: [], tab: 'route' });
  const v = vals(c);
  assert.deepEqual(v.aRouteCols.map(col => col.secs.map(s => s.key)), [['deny', 'allow'], ['manip', 'advanced']]);
  for (const col of v.aRouteCols) for (const s of col.secs) assert.ok(onDisk(s.icon), s.key);
  const rule = v.aRouteCols[0].secs[0].rules.find(r => r.id === 'block-default-routes');
  assert.equal(rule.o2pOn, false); assert.equal(rule.p2oOff, true, 'NetBond Advanced has no partner-to-on-premise for blocking default routes');
  rule.o2pGo();
  assert.equal(vals(c).aRouteCols[0].secs[0].rules.find(r => r.id === 'block-default-routes').o2pOn, true);
});

test('the strip fills in as you pick: a rule on its layer, a service on its layer, route rules at the edge', () => {
  const c = gov({ match: PC, scope: 'AWS us-east-1', req: [] });
  const any = (v) => v.aStrip.map(l => l.state);
  assert.deepEqual(any(vals(c)), ['any', 'any', 'any', 'any']);
  vals(c).aReq.find(x => x.label === 'Private path required').click();
  assert.equal(vals(c).aStrip.find(l => l.key === 'core').text, 'Private path required');
  vals(c).aGroups.find(g => g.key === 'inline').opts.find(o => o.label === 'NGFW inline').go();
  assert.equal(vals(c).aStrip.find(l => l.key === 'edge').text, 'NGFW inline');
  vals(c).aRoute.find(s => s.key === 'deny').rules.find(r => r.id === 'matching-routes').o2pGo();
  assert.equal(vals(c).aStrip.find(l => l.key === 'edge').text, 'NGFW inline · 1 route rule');
  for (const l of vals(c).aStrip) assert.ok(onDisk(l.icon), l.key);
  vals(c).aReset();
  assert.deepEqual(any(vals(c)), ['any', 'any', 'any', 'any']);
  assert.equal(vals(c).aReady, false, 'Reset leaves nothing to simulate');
});

test('the outcome says what to pick before both sides are named, and what it pushes carries a layer glyph after', () => {
  assert.equal(vals(gov({ match: null, scope: null, req: [], tab: 'outcome' })).aOut.none, true);
  const v = vals(gov({ match: PC, scope: 'AWS us-east-1', req: [], path: ['Via the AT&T network', 'NGFW inline'], tab: 'outcome' }));
  assert.equal(v.aOut.none, false);
  for (const p of v.aOut.pushed) assert.ok(onDisk(p.icon), p.text);
});

test('the markup draws the vertical tab group, the strip and the toggles, and the old direction buttons are gone', () => {
  assert.match(HTML, /<nav class="fw-vtabs" role="tablist" aria-label="Policy views">/);
  assert.match(HTML, /<sc-for list="\{\{ aStrip \}\}"/);
  assert.match(HTML, /aria-pressed="\{\{ rr\.o2pOn \}\}"/);
  assert.ok(!HTML.includes('title="On Premise → Partner"'), 'the text direction buttons were replaced by toggles');
  assert.ok(!HTML.includes('button:disabled[title="On Premise'), 'their CSS went with them');
});
