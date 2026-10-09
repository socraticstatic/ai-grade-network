import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';
import { ESTATES } from '../naas-data.js';
import { routeRulesOf, verbBadges, evalPolicies, ROUTE_RULES, ROUTE_SECTIONS } from '../naas-policy-layers.js';
import { flowSheet } from '../naas-policy-model.js';

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
  // The compile table, corrected (2026-10-09, slice 2): a private path allows the matching routes both ways, and the
  // default-route block is NetBond's own baseline row, not the policy's.
  const priv = routeRulesOf({ req: 'Private path required' });
  assert.equal(priv['deny:block-default-routes'], undefined);
  assert.ok(priv['allow:matching-routes'].o2p && priv['allow:matching-routes'].p2o, 'a private path allows the matching routes both ways');
  // A composer policy that toggled nothing (route: {}) derives its sheet like any other; one toggle on makes the sheet its own.
  assert.deepEqual(routeRulesOf({ req: 'Private path required', route: {} }), priv);
  const insp = routeRulesOf({ req: 'Inline security inspection' });
  assert.ok(insp['manip:selective-cv-tagging'].o2p && insp['manip:community-value-tag'].p2o, 'inspection is a manipulation');
  const seg = routeRulesOf({ req: 'Segment intra-tag only' });
  assert.ok(seg['allow:community-value-filter-customer'].o2p && seg['deny:community-value-filter-att'].p2o);
  // An SLO is a class of service judged on measured latency: no route row, never a prepend.
  assert.deepEqual(routeRulesOf({ req: 'Latency SLO 15 ms' }), {});
  // Egress through AT&T advertises a static 0/0 On Premise → Partner, and never blocks the default route (it was backwards).
  assert.deepEqual(routeRulesOf({ path: ['Internet egress only through AT&T'] }), { 'advanced:advertise-static-routes': { o2p: true } });
  // Two paths prefer by community (local preference), never by prepending.
  const two = routeRulesOf({ path: ['Two paths, diverse metros'] });
  assert.ok(two['manip:selective-cv-tagging'].o2p && !two['manip:prepend-advertisements']);
  assert.deepEqual(routeRulesOf({}), {});
  for (const p of Object.values(ESTATES).flatMap(e => e.policies || [])) for (const k of Object.keys(routeRulesOf(p))) assert.ok(ROUTE_RULES.some(r => `${r.section}:${r.id}` === k), `${p.name}: ${k} is not a NetBond rule`);
});

test('verb badges come first, from the derived sheet, so every estate policy wears a NetBond verb', () => {
  for (const p of est.policies) {
    const b = verbBadges(p);
    assert.ok(['deny', 'allow', 'manip', 'adv'].includes(b[0].cls), `${p.name}: ${JSON.stringify(b)}`);
  }
  // The verbs come from every layer's compiled rows: a private path denies the local breakout and allows the routes.
  assert.deepEqual(verbBadges({ req: 'Private path required' }).map(x => x.label), ['Deny', 'Allow', 'Path']);
  assert.deepEqual(verbBadges({ req: 'Latency SLO 15 ms' }).map(x => x.label), ['Manipulate', 'SLO']);
});

test('the sheet reads one flow: four NetBond sections, every rule, each direction by the policy first in precedence', () => {
  const pols = est.policies;
  const sh = flowSheet(est, pols, { from: 'Ashburn DC', to: 'AWS us-east-1', tag: 'PCI' });
  assert.deepEqual(sh.map(s => s.key), ROUTE_SECTIONS.map(([k]) => k));
  assert.equal(sh.flatMap(s => s.rules).length, ROUTE_RULES.length, 'every rule shows, as NetBond\'s sheet does');
  const deny = sh.find(s => s.key === 'deny'), bdr = deny.rules.find(r => r.id === 'block-default-routes');
  // The default-route block is NetBond's own default sheet (Baseline), on whatever policy matches; NetBond offers it both ways.
  assert.equal(bdr.o2p.on, true); assert.equal(bdr.o2p.by, 'NetBond default sheet');
  assert.equal(bdr.p2o.on, false); assert.equal(bdr.can.p2o, true);
  assert.equal(bdr.nb, 'Block Default Routes', 'named as NetBond shows it');
  const allow = sh.find(s => s.key === 'allow').rules.find(r => r.id === 'matching-routes');
  assert.ok(allow.o2p.on && allow.p2o.on);
  // Nothing tagged, to a cloud: no tag policy matches, so only NetBond's baseline row is on.
  const on = (sh2) => sh2.flatMap(s => s.rules.filter(r => r.o2p.on || r.p2o.on).map(r => `${s.key}:${r.id}`));
  assert.deepEqual(on(flowSheet(est, pols, { from: 'Ashburn DC', to: 'AWS us-east-1', tag: '' })), ['deny:block-default-routes']);
  // A draft never pushes.
  assert.deepEqual(on(flowSheet(est, [{ name: 'D', match: 'tag PCI', req: 'Private path required', state: 'draft' }], { from: 'Ashburn DC', to: 'AWS us-east-1', tag: 'PCI' })), ['deny:block-default-routes']);
  // A flow that crosses no NetBond connection pushes nothing: the cloud's own port (ExpressRoute), the Internet.
  assert.deepEqual(on(flowSheet(est, pols, { from: 'Ashburn DC', to: 'Azure eastus', tag: 'PCI' })), []);
  assert.deepEqual(on(flowSheet(est, pols, { from: 'Ashburn DC', to: 'the Internet', tag: 'PCI' })), []);
});

test('a region-scoped intent compiles its derived rules onto its connection', () => {
  const reg = est.regionsList[0];
  const e = evalPolicies(est, [{ name: 'Here', match: 'tag PCI', scope: `${reg.cloud} ${reg.region}`, req: 'Private path required', state: 'enforced' }]);
  // A private path allows the matching routes both ways; blocking the default route is NetBond's own baseline row (2026-10-09).
  assert.ok(e.connections[0].rules.some(r => /Allow matching routes \(on premise → partner\)/.test(r.text)));
  assert.ok(!e.connections[0].rules.some(r => /block default routes/i.test(r.text)));
});

// The engine view's sheet and trace moved to tests/engine-v3.test.mjs with the rebuild (2026-10-07).
