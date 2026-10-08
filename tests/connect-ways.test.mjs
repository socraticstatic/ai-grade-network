import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import * as W from '../naas-ways.js';
import { mkC } from './harness.mjs';

// The connect options session (2026-10-06): Recommended shows the
// best ways for each cloud and Ways to connect shows all six for a new customer; "the ultimate flow would be the same"
// from either door, and "if I go back, I lose the whole recommendation part" must not happen.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
if (typeof globalThis.requestAnimationFrame === 'undefined') globalThis.requestAnimationFrame = () => 0;
const store = {};
globalThis.localStorage = globalThis.localStorage || { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const ways = (view = 'partial', extra = {}) => mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'connect', cnPage: 'ways', ...extra });
const recommended = (view = 'partial') => mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'connect', cnPage: 'options' });
const wip = (v, key) => v.cfWip.find(r => r.key === key);

test('Ways to connect draws the six ways, each scored on the five criteria, with its clouds as marks', () => {
  const v = vals(ways());
  // Re-pinned (2026-10-08): the deck's order, transit gateway real, a weighted score on every card.
  assert.deepEqual(v.wayCards.map(w => w.key), ['byo', 'att', 'peer', 'transit', 'cloudwan', 'privatelink']);
  for (const w of v.wayCards) {
    assert.equal(w.rows.length, 5, w.key);
    for (const r of w.rows) { assert.equal(r.segs.length, 5); assert.ok(r.segs.every(g => g.bg), `${w.key} ${r.key}`); }
    for (const l of w.logos) assert.match(l.src, /^brand\/providers\/[a-z-]+\.svg$/, `${w.key} ${l.key}`);
  }
  assert.ok(v.wayCards.every(w => w.notSoon && w.hasPts && /^\d+$/.test(w.pts)), 'every way is live and scored');
  assert.ok(v.wayFoot.includes('proof-of-concept'), 'the footnote says which times are targets');
  assert.ok(v.wayFoot.includes('Decision Matrix'), 'and where the figures come from');
});

test('peering\'s zone chips switch its scores between one zone and across zones', () => {
  const c = ways();
  const peer = () => vals(c).wayCards.find(w => w.key === 'peer');
  assert.deepEqual(peer().zoneChips.map(z => [z.key, z.on]), [['intra', true], ['inter', false]]);
  const before = peer().monthly;
  peer().zoneChips.find(z => z.key === 'inter').go();
  assert.equal(c.state.wayZone, 'inter');
  // Across AZs (the deck): zone-redundant, and the last hop bills $0.01/GB each way.
  assert.ok(peer().monthly > before);
  assert.match(peer().zoneChips.find(z => z.key === 'intra').title, /AWS$/, 'same AZ is AWS only');
});

test('Start carries the way into the flow, which asks next what you connect from; Back returns to Ways to connect', () => {
  const c = ways();
  vals(c).wayCards.find(w => w.key === 'att').start();
  assert.equal(c.state.screen, 's4');
  assert.equal(c.state.compose.way, 'att');
  let v = vals(c);
  assert.equal(v.cfKey, 'type', 'the next decision is the connection type');
  assert.equal(v.cfWay.has, true);
  assert.equal(v.cfWay.title, 'AT&T provides the port', 'before a cloud is chosen, the way reads its own title');
  assert.equal(wip(v, 'way').value, 'AT&T provides the port');
  assert.equal(v.cfBackVis, 'visible');
  assert.equal(v.cfBackLabel, 'Back to Ways to connect');
  v.cfBack();
  assert.equal(c.state.screen, 's3');
  assert.equal(c.state.cnPage, 'ways');
  assert.equal(c.state.compose.way, 'att', 'the order waits in Orders with its way');
});

test('a way a cloud cannot carry dims that cloud on Choose Provider: AT&T cannot provide Google\'s port', () => {
  const c = ways();
  vals(c).wayCards.find(w => w.key === 'att').start();
  vals(c).cfTypes.find(t => t.label === 'DataCenter / CoLocation to Cloud').pick();
  vals(c).cfNext();
  const v = vals(c);
  assert.equal(v.cfKey, 'provider');
  const g = v.cfClouds.find(x => x.cloud === 'GCP'), az = v.cfClouds.find(x => x.cloud === 'Azure');
  assert.equal(g.cant, true);
  assert.match(g.cantWord, /^Not with AT&T provides the port$/);
  assert.equal(az.can, true);
  assert.ok(az.hasMark && az.mark.endsWith('azure.svg'));
  g.regions[0].pick();
  assert.deepEqual(vals(c).cfClouds.flatMap(x => x.regions).filter(r => r.on), [], 'a dimmed cloud never takes the pick');
  az.regions[0].pick();
  const v2 = vals(c);
  assert.equal(v2.cfWay.title, "AT&T's ExpressRoute", 'once the cloud is chosen, the way reads as that cloud names its port');
});

test('the order prices the way: AT&T\'s port beside NetBond; a hosted way the on-ramp, its last hop and the hub in place of NetBond', () => {
  const lineIds = (way) => { const c = ways(); vals(c).wayCards.find(w => w.key === way).start(); vals(c).cfTypes.find(t => t.label === 'DataCenter / CoLocation to Cloud').pick(); vals(c).cfNext(); vals(c).cfClouds.find(x => x.cloud === 'Azure').regions[0].pick(); return vals(c).cfOrder.lines.map(l => l.product); };
  assert.ok(lineIds('att').some(p => /^Cloud port, AT&T-provided/.test(p)), lineIds('att').join(' | '));
  // Re-pinned (2026-10-08, the deck): a hosted way rides AT&T's on-ramp into its hub, not NetBond; Azure peers across AZs.
  const peer = lineIds('peer');
  assert.deepEqual(peer.slice(0, 3), ['AT&T cloud on-ramp into the hosted hub, 1 Gbps', 'Cross-AZ peering into your VPC or VNet', 'AT&T hosted hub: vSRX and compute'], peer.join(' | '));
  assert.ok(!peer.some(p => /^NetBond Advanced/.test(p)), peer.join(' | '));
  assert.ok(!lineIds('byo').some(p => /Cloud port|hosted/i.test(p)), lineIds('byo').join(' | '));
});

test('Connect on an Azure option carries its way; the flow lands on the profile and Back returns to Recommended', () => {
  const c = recommended();
  const az = vals(c).moveList.find(m => m.key === 'region:Azure');
  assert.deepEqual(az.tiers.map(t => t.label), ['Your ExpressRoute', "AT&T's ExpressRoute", 'Hosted VNet peering']);
  assert.equal(az.hasSetup, true, 'a move whose tiers are ways reads setup on a row of its own');
  assert.ok(az.tiers.every(t => t.setup), 'every option says who sets it up and how long');
  az.tiers[1].pick();
  vals(c).moveList.find(m => m.key === 'region:Azure').attach();
  assert.equal(c.state.screen, 's4');
  const v = vals(c);
  assert.equal(v.cfKey, 'basic', 'type and region came from the move');
  assert.equal(v.cfWay.title, "AT&T's ExpressRoute");
  assert.equal(v.cfWay.changeLabel, 'Change on Recommended');
  assert.equal(wip(v, 'way').value, "AT&T's ExpressRoute");
  assert.equal(v.cfBackLabel, 'Back to Recommended');
  v.cfBack();
  assert.equal(c.state.cnPage, 'options', 'Back returns to the recommendation, not to a step the move filled');
});

test('a placed order says its way', () => {
  const c = recommended();
  vals(c).moveList.find(m => m.key === 'region:Azure').attach();
  const step = () => vals(c);
  vals(c).cfBandwidths.find(b => b.label === '1 Gbps').pick();
  for (let i = 0; i < 4 && !step().cfIsReview; i++) { if (step().cfIsTerms) step().cfTerms[1].pick(); step().cfNext(); }
  assert.equal(step().cfIsReview, true);
  step().cfPlace();
  const o = c.state.orders[c.state.orders.length - 1];
  assert.equal(o.way, 'byo');
  assert.match(o.what, /^Your ExpressRoute · /);
});

test('the markup binds the six ways, their meters and marks, and loops inside no table, svg or select', () => {
  const a = HTML.indexOf('<sc-if value="{{ cnIsWays }}"'), b = HTML.indexOf('<!-- Orders (2026-09-30', a);
  assert.ok(a > 0 && b > a);
  const blk = HTML.slice(a, b);
  for (const k of ['<sc-for list="{{ wayCards }}"', '<sc-for list="{{ wc.rows }}"', '<sc-for list="{{ cr.segs }}"', '<sc-for list="{{ wc.logos }}"', '{{ wc.start }}', '{{ wayFoot }}', '{{ goRecommended }}']) assert.ok(blk.includes(k), k);
  assert.doesNotMatch(blk, /<(svg|table|select)\b/);
  for (const w of W.WAYS) for (const ic of [w.icon]) assert.ok(readFileSync(new URL(`../brand/icons/${ic}.svg`, import.meta.url)), ic);
  assert.ok(HTML.includes('{{ cfBackLabel }}') && HTML.includes('{{ cfWay.title }}') && HTML.includes('{{ cg.cantWord }}'));
});
