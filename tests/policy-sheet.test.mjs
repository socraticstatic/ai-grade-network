import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';
import { ESTATES } from '../naas-data.js';
import { routeRulesOf, flowSheet, verbBadges, evalPolicies, ROUTE_RULES, ROUTE_SECTIONS } from '../naas-policy-layers.js';

// The Policy engine on NetBond Advanced's verbs (Micah, 2026-10-05: "doesn't look like a good engine with AT&T's
// allow, deny, manipulate, advertise that's on netbond advanced"). An estate policy carries no route sheet of its
// own; routeRulesOf derives NetBond's rules from what it requires, so the verbs do real work on the Policies list,
// the engine summary and the sheet alike. flowSheet is Configure > Policies' sheet read for one flow: every rule,
// per direction, on when a matching policy pushes it, naming the policy first in precedence.
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const est = ESTATES.mature;
const at = (view, extra = {}) => vals(mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'govern', govPanel: 'engine', ...extra }));

test('an explicit route sheet is its own; an intent derives NetBond\'s rules', () => {
  const own = { route: { 'deny:matching-routes': { o2p: true } } };
  assert.equal(routeRulesOf(own), own.route);
  const priv = routeRulesOf({ req: 'Private path required' });
  assert.ok(priv['deny:block-default-routes'].o2p, 'a private path blocks the default route on premise → partner');
  assert.ok(priv['allow:matching-routes'].o2p && priv['allow:matching-routes'].p2o, 'and allows the matching routes both ways');
  const insp = routeRulesOf({ req: 'Inline security inspection' });
  assert.ok(insp['manip:selective-cv-tagging'].o2p && insp['manip:community-value-tag'].p2o, 'inspection is a manipulation');
  const seg = routeRulesOf({ req: 'Segment intra-tag only' });
  assert.ok(seg['allow:community-value-filter-customer'].o2p && seg['deny:community-value-filter-att'].p2o);
  const slo = routeRulesOf({ req: 'Latency SLO 15 ms' });
  assert.ok(slo['manip:prepend-advertisements'].o2p);
  const eg = routeRulesOf({ path: ['Internet egress only through AT&T'] });
  assert.ok(eg['advanced:advertise-static-routes'].p2o && eg['deny:block-default-routes'].o2p);
  assert.deepEqual(routeRulesOf({}), {});
  for (const p of Object.values(ESTATES).flatMap(e => e.policies || [])) for (const k of Object.keys(routeRulesOf(p))) assert.ok(ROUTE_RULES.some(r => `${r.section}:${r.id}` === k), `${p.name}: ${k} is not a NetBond rule`);
});

test('verb badges come first, from the derived sheet, so every estate policy wears a NetBond verb', () => {
  for (const p of est.policies) {
    const b = verbBadges(p);
    assert.ok(['deny', 'allow', 'manip', 'adv'].includes(b[0].cls), `${p.name}: ${JSON.stringify(b)}`);
  }
  assert.deepEqual(verbBadges({ req: 'Private path required' }).map(x => x.label), ['Deny', 'Allow', 'Path']);
});

test('the sheet reads one flow: four NetBond sections, every rule, each direction by the policy first in precedence', () => {
  const pols = est.policies;
  const sh = flowSheet(est, pols, { from: 'Ashburn DC', to: 'AWS us-east-1', tag: 'PCI' });
  assert.deepEqual(sh.map(s => s.key), ROUTE_SECTIONS.map(([k]) => k));
  assert.equal(sh.flatMap(s => s.rules).length, ROUTE_RULES.length, 'every rule shows, as NetBond\'s sheet does');
  const deny = sh.find(s => s.key === 'deny'), bdr = deny.rules.find(r => r.id === 'block-default-routes');
  assert.equal(bdr.o2p.on, true); assert.equal(bdr.o2p.by, 'PCI private path');
  assert.equal(bdr.p2o.on, false); assert.equal(bdr.can.p2o, false, 'NetBond offers no partner → on premise toggle there');
  const allow = sh.find(s => s.key === 'allow').rules.find(r => r.id === 'matching-routes');
  assert.ok(allow.o2p.on && allow.p2o.on);
  // Nothing tagged, to a cloud: no tag policy matches, so the sheet is quiet.
  const none = flowSheet(est, pols, { from: 'Ashburn DC', to: 'AWS us-east-1', tag: '' });
  assert.equal(none.flatMap(s => s.rules).filter(r => r.o2p.on || r.p2o.on).length, 0);
  // A draft never pushes.
  const d = flowSheet(est, [{ name: 'D', match: 'tag PCI', req: 'Private path required', state: 'draft' }], { from: 'Ashburn DC', to: 'AWS us-east-1', tag: 'PCI' });
  assert.equal(d.flatMap(s => s.rules).filter(r => r.o2p.on).length, 0);
});

test('a region-scoped intent compiles its derived rules onto its connection', () => {
  const reg = est.regionsList[0];
  const e = evalPolicies(est, [{ name: 'Here', match: 'tag PCI', scope: `${reg.cloud} ${reg.region}`, req: 'Private path required', state: 'enforced' }]);
  assert.ok(e.connections[0].rules.some(r => /Deny block default routes \(on premise → partner\)/.test(r.text)));
});

test('the engine view carries the sheet, and its trace wears the precedence square and the verbs', () => {
  const v = at('mature');
  assert.ok(v.engHas);
  assert.equal(v.engSheet.length, 4);
  for (const s of v.engSheet) { assert.ok(['deny', 'manip', 'allow', 'adv'].includes(s.cls), s.key); assert.ok(s.icon); assert.match(s.count, /^\d+ of \d+$/); for (const r of s.rules) { assert.equal(typeof r.o2pOn, 'boolean'); assert.equal(typeof r.o2pOff, 'boolean'); assert.equal(typeof r.by, 'string'); assert.ok(existsSync(new URL(`../brand/icons/${r.icon}.svg`, import.meta.url)), `${r.key}: ${r.icon}`); } }
  for (const t of v.engTrace) assert.ok(existsSync(new URL(`../brand/icons/${t.icon}.svg`, import.meta.url)), `${t.name}: ${t.icon}`);
  assert.ok(v.engSheet.some(s => s.rules.some(r => r.o2pOn || r.p2oOn)), 'the default flow on Established sets something');
  assert.equal(v.engSheet.flatMap(s => s.rules).length, ROUTE_RULES.length);
  for (const t of v.engTrace) { assert.ok(/^\d+$/.test(String(t.prio)), `${t.name}: prio ${t.prio}`); assert.ok(Array.isArray(t.badges)); assert.ok(['Won'].includes(t.result) || /^Overridden by /.test(t.result)); }
  assert.ok(v.engTrace.length <= 4, 'four trace rows keep the panel in the fold');
  assert.equal(v.engSheetCols.length, 2); assert.deepEqual(v.engSheetCols.flatMap(c => c.secs.map(x => x.key)), ['deny', 'manip', 'allow', 'advanced']);
});

test('the markup draws the sheet as NetBond\'s wash rows with a toggle per direction, and the trace with a square', () => {
  const a = HTML.indexOf('<sc-if value="{{ govPanelEngine }}"'), b = HTML.indexOf('<sc-if value="{{ govPanelTemplates }}"', a);
  const blk = HTML.slice(a, b);
  assert.match(blk, /<sc-for list="\{\{ engSheetCols \}\}" as="sc"/);
  assert.match(blk, /<sc-for list="\{\{ sc\.secs \}\}" as="sh"/);
  assert.match(blk, /<sc-for list="\{\{ sh\.rules \}\}" as="sr"/);
  assert.match(blk, /class="fw-row rt[^"]*"[^>]*><b><span class="ic s14" style="--ic:url\('brand\/icons\/\{\{ sr\.icon \}\}\.svg'\)[^"]*"><\/span>\{\{ sr\.label \}\}/);
  assert.match(blk, /\{\{ tr\.icon \}\}/);
  assert.match(blk, /class="fw-toggle sm inert" aria-pressed="\{\{ sr\.o2pOn \}\}" disabled="\{\{ sr\.o2pOff \}\}"/);
  assert.match(blk, /class="fw-toggle sm inert" aria-pressed="\{\{ sr\.p2oOn \}\}" disabled="\{\{ sr\.p2oOff \}\}"/);
  assert.match(blk, /class="fw-badge \{\{ sh\.cls \}\}"/);
  assert.match(blk, /class="fw-prio sm">\{\{ tr\.prio \}\}/);
  assert.match(blk, /<sc-for list="\{\{ tr\.badges \}\}"/);
  assert.doesNotMatch(blk, /<(svg|table|select)\b/);
});
