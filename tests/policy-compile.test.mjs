import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import * as A from '../naas-addendum.js';
import * as W from '../naas-ways.js';
import * as PC from '../naas-policy-compile.js';
import * as PM from '../naas-policy-model.js';
import { ROUTE_RULES, evalPolicies, routeRulesOf } from '../naas-policy-layers.js';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';
import { readFileSync } from 'node:fs';

// Slice 2 of the policy engine (Micah, 2026-10-09: "keep going with slice 2"; the research: "we need a robust policy
// engine per layer"). An intent is written once and compiled to each layer's enforcement point; every layer walks the
// same tiers by priority, a deny first at a tie, Pass handing down, Always ending; each layer ends in a default, and a
// default that would deny is in Audit. A region's way says which enforcement point its edge really has.
if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const pc = 'Private cloud · Equinix DC2, Ashburn';
const P = D.ESTATES.partial, inv = A.inventory(P);
const rows = (req) => PC.compilePolicy({ req }, ROUTE_RULES).map(r => `${r.layer}/${r.pep}:${r.verb}:${r.dir}:${r.to}${r.ends ? '' : '~'}`);

test('each intent compiles to the enforcement points that can carry it (a snapshot of the table)', () => {
  assert.deepEqual(rows('Private path required'), ['site/cpe:deny:o2p:internet', 'edge/netbond:allow:both:cloud', 'core/vrf:allow:both:cloud', 'cloud/rt:deny:p2o:internet']);
  assert.deepEqual(rows('No direct internet path'), ['site/cpe:deny:o2p:internet', 'edge/vsrx:allow:o2p:internet', 'cloud/rt:allow:p2o:internet']);
  assert.deepEqual(rows('No local internet breakout'), ['site/cpe:deny:o2p:internet~'], 'a site rule that shapes the path, never a deny of the internet');
  assert.deepEqual(rows('Internet egress only through AT&T'), ['edge/netbond:adv:o2p:cloud~', 'edge/vsrx:allow:o2p:internet', 'cloud/rt:allow:p2o:internet']);
  assert.deepEqual(rows('Inline security inspection'), ['edge/vsrx:allow:both:any', 'edge/netbond:manip:both:cloud~', 'cloud/rt:allow:p2o:any~']);
  assert.deepEqual(rows('Segment intra-tag only'), ['site/cpe:allow:both:cloud~', 'edge/netbond:allow:both:cloud~', 'edge/netbond:deny:p2o:cloud~', 'edge/vsrx:allow:both:any~', 'core/vrf:allow:both:cloud', 'cloud/rt:allow:both:cloud~']);
  assert.deepEqual(rows('Priority traffic'), ['site/cpe:manip:o2p:any~', 'core/cos:manip:both:cloud~']);
  assert.deepEqual(rows('Two paths, diverse metros'), ['edge/netbond:manip:both:cloud~']);
  assert.deepEqual(rows('Encrypt in transit'), [], 'not compiled yet: the engine reads it Undetermined');
  // A row's words are the object of its verb: "Deny local breakout", never "Deny no local breakout".
  for (const it of PC.INTENTS) for (const r of PC.compileIntent(it)) assert.doesNotMatch(r.text, /^No /, `${it.key}: ${r.text}`);
  // Every PEP glyph is on disk and every NetBond key a compile emits is a rule NetBond shows, in a direction it offers.
  for (const it of PC.INTENTS) for (const r of PC.compileIntent(it)) for (const [k, v] of Object.entries(r.nb || {})) {
    const rr = ROUTE_RULES.find(x => `${x.section}:${x.id}` === k); assert.ok(rr, k);
    for (const d of ['o2p', 'p2o']) if (v[d]) assert.ok(rr[d], `${it.key}: ${k} ${d} is not offered by NetBond`);
  }
});

test('the corrected NetBond mappings: egress advertises a static 0/0 out, priority traffic pushes nothing, two paths never prepend', () => {
  const eg = routeRulesOf({ path: ['Internet egress only through AT&T'] });
  assert.deepEqual(eg, { 'advanced:advertise-static-routes': { o2p: true } });
  assert.equal(eg['deny:block-default-routes'], undefined);
  assert.deepEqual(routeRulesOf({ req: 'Priority traffic' }), {}, 'a class of service, never a route row');
  assert.equal(PC.intentOf('Priority traffic').key, 'priority');
  assert.equal(routeRulesOf({ path: ['Two paths, diverse metros'] })['manip:prepend-advertisements'], undefined);
  // The template slot "Segment-aware firewall" asks for segments; "No local internet breakout" does not forbid the internet.
  assert.equal(PC.intentOf('Segment-aware firewall').key, 'segment');
  assert.equal(PC.intentOf('No local internet breakout').forbids, false);
});

test('inspection on a NetBond-only way is Unenforceable; on the hosted hub the vSRX holds it', () => {
  const f = { from: pc, to: 'AWS us-east-1', tag: 'Internet-facing' }, pol = [{ name: 'Inspect', match: 'tag Internet-facing', scope: 'any cloud', req: 'Inline security inspection', state: 'enforced' }];
  const edge = (est) => PM.decide(est, pol, f, { inv }).layers.find(l => l.key === 'edge');
  assert.deepEqual([edge(P).stamp, edge(P).code], ['unenforceable', 'EDGE_NO_FW']);
  const hosted = { ...P, regionsList: P.regionsList.map(r => (r.region === 'us-east-1' ? { ...r, way: 'hosted' } : r)) };
  assert.deepEqual([edge(hosted).stamp, edge(hosted).code, edge(hosted).text], ['holds', 'EDGE_INSPECTED', 'vSRX in path']);
  assert.equal(edge(hosted).rule.pep, 'vsrx', 'the vSRX row decides the edge on a hosted way');
  const direct = { ...P, regionsList: P.regionsList.map(r => (r.region === 'us-east-1' ? { ...r, way: 'direct' } : r)) };
  assert.equal(edge(direct).code, 'EDGE_NO_ATT_PEP');
  // In the rulebase: the vSRX row reads unenforceable until a hosted way is on record, then enforced.
  const cap = (est) => PM.rulebase(est, pol, { inv }).cols.find(c => c.key === 'edge').rows.find(r => r.pep === 'vsrx').cap;
  const reach = { ...P, regionsList: P.regionsList.map(r => (r.region === 'eu-west-1' ? { ...r, priv: true, way: 'netbond' } : r)) };
  assert.equal(cap(reach), 'unenforceable');
  assert.equal(cap({ ...reach, regionsList: reach.regionsList.map(r => (r.region === 'eu-west-1' ? { ...r, way: 'hosted' } : r)) }), 'ok');
});

test('one precedence walk per layer: tier, then priority, a deny at a tie, Pass hands down, Always ends, the default, Audit', () => {
  const f = { from: pc, to: 'AWS us-east-1', tag: '' };
  const deny = (extra) => ({ name: 'Deny', match: pc, scope: 'AWS us-east-1', route: { 'deny:matching-routes': { o2p: true } }, state: 'enforced', ...extra });
  const allow = (extra) => ({ name: 'Allow', match: pc, scope: 'AWS us-east-1', route: { 'allow:matching-routes': { o2p: true } }, state: 'enforced', ...extra });
  const run = (ps) => { const d = PM.decide(P, ps, f, { inv }); return [d.verdict, d.layers.find(l => l.key === 'edge').rule.policy]; };
  // Tier beats priority: the estate's deny goes before an owner's allow at priority 1.
  assert.deepEqual(run([allow({ custom: true, priority: 1 }), deny()]), ['Denied', 'Deny']);
  // Inside a tier the lower priority goes first...
  assert.deepEqual(run([allow({ priority: 5 }), deny({ priority: 10 })]), ['Allowed', 'Allow']);
  // ...and at a tie the deny does.
  assert.deepEqual(run([allow({ priority: 5 }), deny({ priority: 5 })]), ['Denied', 'Deny']);
  // Pass hands the rest of its tier down: the estate's deny is skipped and the owner's allow decides.
  assert.deepEqual(run([{ ...allow({ priority: 1 }), name: 'Hand down', action: 'pass' }, deny({ priority: 10 }), allow({ custom: true })]), ['Allowed', 'Allow']);
  // Always ends the layer where it stands, even when its rows would only shape (a CV tag), where the deny would decide.
  const tagOnly = { name: 'Always', match: pc, scope: 'AWS us-east-1', route: { 'manip:selective-cv-tagging': { o2p: true } }, state: 'enforced', priority: 1 };
  assert.deepEqual(run([{ ...tagOnly, action: 'always' }, deny({ priority: 2 })]), ['Allowed', 'Always']);
  assert.deepEqual(run([tagOnly, deny({ priority: 2 })]), ['Denied', 'Deny'], 'without Always the tag only shapes, and the deny decides');
  // A NetBond row's direction is its routes': denying the matching routes either way leaves no route, so the flow drops
  // whichever way it runs.
  const p2o = deny({ route: { 'deny:matching-routes': { p2o: true } } });
  assert.equal(PM.decide(P, [p2o], f, { inv }).verdict, 'Denied');
  assert.equal(PM.decide(P, [p2o], f, { inv, dir: 'p2o' }).verdict, 'Denied');
  // Nothing of yours: NetBond's baseline row shapes the edge, the route filter's default decides, and the cloud's default
  // deny on ingress is in Audit, so it never flips the verdict.
  const none = PM.decide(P, [], f, { inv });
  assert.equal(none.verdict, 'Allowed');
  const e = none.layers.find(l => l.key === 'edge'), c = none.layers.find(l => l.key === 'cloud');
  assert.deepEqual([e.rule.byDefault, e.rule.text], [true, 'Permit all routes']);
  assert.deepEqual(e.obligations.map(o => `${o.verb}:${o.text}:${o.policy}`), ['deny:Default routes:NetBond default sheet']);
  assert.deepEqual([c.rule.byDefault, c.rule.verb, c.rule.audit], [true, 'deny', true]);
  // Cloud to site reads the rows the other way round.
  assert.equal(PM.decide(P, [], f, { inv, dir: 'p2o' }).layers.find(l => l.key === 'cloud').rule.verb, 'allow');
});

test('an equal stated priority inside a tier is a publish error; across tiers it is not', () => {
  const a = { name: 'A', match: 'tag PCI', req: 'Private path required', state: 'enforced', priority: 20 };
  assert.deepEqual(PC.publishErrors([a, { ...a, name: 'B' }]).map(e => e.text), ['A and B share priority 20 in Estate']);
  assert.deepEqual(PC.publishErrors([a, { ...a, name: 'B', custom: true }]), []);
  assert.deepEqual(PC.publishErrors([a, { ...a, name: 'B', state: 'draft' }]), [], 'a draft is not published');
});

test('the Policies list numbers rows in the order the engine reads them, priorities and tiers included', () => {
  const custom = [{ name: 'Owner first', match: 'tag PCI', scope: 'any cloud', req: 'Inline security inspection', state: 'enforced', custom: true, priority: 1 },
    { name: 'Estate late', match: 'tag Prod', scope: 'any cloud', req: 'Priority traffic', state: 'enforced', tier: 'T1', priority: 5 }];
  const c = mkC({ view: 'partial', estateParam: null, screen: 's3', layer: 'cloud', tab: 'govern', govPanel: 'policies', customPolicies: custom });
  // The list pages within its slot: read every page.
  const all = []; for (let i = 0; i < 4; i += 1) { c.setState({ polPage: i }); for (const r of vals(c).polRows) if (!all.some(x => x.name === r.name)) all.push(r); }
  assert.equal(all.length, P.policies.length + custom.length);
  const order = PM.decide(P, [...P.policies, ...custom], { from: pc, to: 'the Internet', tag: '' }).rungs.map(g => g.name);
  for (const r of all) assert.equal(r.prio, order.indexOf(r.name) + 1, r.name);
  assert.equal(order[0], 'Estate late', 'priority 5 in the Estate tier goes first');
  assert.equal(order.at(-1), 'Owner first', 'the Owners tier follows the Estate tier, whatever its priority');
  assert.match(all.find(r => r.name === 'Owner first').prioWhy, /^Owners tier, priority 1$/);
});

test('a region\'s way comes from a landed order that names it, else its stated ramp, else nothing; never another estate\'s order', () => {
  const way = (id) => Object.fromEntries(D.ESTATES[id].regionsList.map(r => [r.region, W.regionWay(r).cls]));
  assert.deepEqual(way('partial'), { 'us-east-1': 'netbond', 'us-west-2': null, 'eu-west-1': null, eastus: 'direct', westeurope: null, 'us-central1': null, 'europe-west1': null });
  assert.equal(way('mature')['us-east-04'], 'third'); assert.equal(way('mature')['us-west-2'], 'direct');
  const r = { ...P.regionsList.find(x => x.region === 'us-west-2'), priv: true, ramp: 'NetBond', landed: true };
  const s = { landed: ['us-west-2'], orders: [{ id: 'o1', way: 'transit', region: 'us-west-2', est: 'partial' }] };
  assert.deepEqual(W.regionWay(r, s, 'partial'), { cls: 'hosted', key: 'transit', from: 'order', ref: 'o1' });
  assert.equal(W.regionWay(r, s, 'trust').cls, 'netbond', "another estate's order never names this region's way");
  // A landed order that names no way reads as the estate stamps the landing (NetBond), as every other page does.
  assert.equal(W.regionWay(r, { landed: ['us-west-2'], orders: [{ id: 'o2', type: 'Interconnect - Last Mile', way: null, region: 'us-west-2', est: 'partial' }] }, 'partial').cls, 'netbond');
  // In the app: the estate stamps every region, and a landed hosted order puts the vSRX on the path for Prod's send-to row.
  const sendTo = (st) => { const c = mkC({ view: 'partial', estateParam: null, screen: 's3', layer: 'cloud', tab: 'govern', govPanel: 'layers', ...st }); const out = [];
    for (let i = 0; i < 3; i += 1) { c.setState({ layPage: i }); for (const b of vals(c).layCols.find(x => x.key === 'edge').bands) for (const row of b.rows) if (row.sub === 'Prod no direct internet' && row.text === 'Internet via send-to only') out.push(row); }
    return out[0]; };
  assert.equal(sendTo({}).capWord, 'No enforcement point');
  assert.equal(sendTo({ landed: ['us-west-2'], orders: s.orders }).hasCap, false, 'the hosted hub on record enforces it');
  assert.equal(sendTo({ landed: ['us-west-2'], orders: s.orders.map(o => ({ ...o, est: 'trust' })) }).capWord, 'No enforcement point', "another estate's order lights nothing");
});

test('review fixes (2026-10-09): a phrase the engine cannot judge, segmentation and the internet, a third party\'s sources, a direct way', () => {
  // A saved "Latency SLO" is no typed intent since 2026-10-15: Undetermined on its layer, and never counted violated.
  const slo = [{ name: 'SLO', match: 'tag PCI', scope: 'any cloud', req: 'Latency SLO', state: 'enforced' }];
  const core = PM.decide(P, slo, { from: pc, to: 'AWS us-east-1', tag: 'PCI' }, { inv }).layers.find(l => l.key === 'core');
  assert.deepEqual([core.stamp, core.text], ['undetermined', 'No data']);
  assert.ok(!PM.sweep(P, slo, { inv }).violated.some(v => v.name === 'SLO'));
  // Segmentation keeps traffic in its VLAN; it never decides an internet flow ahead of a breakout deny.
  const seg = [{ name: 'Seg', match: 'tag PCI', scope: 'any cloud', req: 'Segment by tag and Inline inspection', state: 'enforced' },
    { name: 'Off the internet', match: 'tag PCI', scope: 'any cloud', req: 'No direct internet path', state: 'enforced' }];
  const d = PM.decide(P, seg, { from: pc, to: 'the Internet', tag: 'PCI' }, { inv });
  assert.deepEqual([d.verdict, d.blocker], ['Denied', 'site']);
  // A policy whose only source is a third party's site has no AT&T enforcement point, in Layers as in the engine.
  const M = D.ESTATES.mature, minv = A.inventory(M), lum = [{ name: 'Phoenix private', match: 'Phoenix DC', scope: 'any cloud', req: 'Private path required', state: 'enforced' }];
  const caps = PM.rulebase(M, lum, { inv: minv }).cols.flatMap(c => c.rows).filter(r => r.name === 'Phoenix private').map(r => `${r.pep}:${r.cap}`);
  assert.deepEqual(caps, ['cpe:unenforceable', 'netbond:unenforceable', 'vrf:unenforceable', 'rt:asserted']);
  // On the cloud's own port (ExpressRoute) AT&T's edge and core are off the path: no NetBond default, no VRF decides.
  const er = [{ name: 'ER private', match: pc, scope: 'Azure eastus', req: 'Private path required', state: 'enforced' }];
  const de = PM.decide(P, er, { from: pc, to: 'Azure eastus', tag: '' }, { inv });
  assert.equal(de.layers.find(l => l.key === 'edge').rule, null);
  assert.equal(de.layers.find(l => l.key === 'core').rule, null);
  assert.deepEqual([de.layers.find(l => l.key === 'core').stamp, de.layers.find(l => l.key === 'core').code], ['unenforceable', 'CORE_NO_ATT_PEP']);
  // On a hosted way the hub's on-ramp carries a private path's matching routes: its NetBond row is not a false alarm.
  const hosted = { ...P, regionsList: P.regionsList.map(r => (r.region === 'us-east-1' ? { ...r, way: 'hosted' } : r)) };
  const pci = [P.policies.find(p => p.name === 'PCI private path')];
  assert.equal(PM.rulebase(hosted, pci, { inv }).cols.find(c => c.key === 'edge').rows.find(r => r.name === 'PCI private path').cap, 'ok');
  assert.equal(PM.decide(hosted, pci, { from: pc, to: 'AWS us-east-1', tag: 'PCI' }, { inv }).layers.find(l => l.key === 'edge').rule.policy, 'PCI private path');
});

test('review fixes in the app: the wizard says when NetBond carries no rule, the journey invents no hub, the engine help', () => {
  const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
  assert.match(HTML, /The engine reads every enforced policy in precedence order \(the tier: Estate, then Owners, then Baseline; then the priority; then a deny before an allow; then the order written\)/);
  assert.doesNotMatch(HTML, /an asset pair before a region/);
  assert.match(HTML, /\{\{ cfRouteNoneText \}\}/);
});
