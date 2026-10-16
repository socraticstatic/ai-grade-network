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
    // The grade in a word (2026-10-15, Micah: "the dashes on the cards for options are hard to understand. hard to tell
    // what one dash is saying from another"): five identical dashes read the same on every row, and on Cost more meant
    // cheaper, so one dash beside the dearest price looked like a low one. Each row now says its grade.
    for (const r of w.rows) { assert.equal(r.segs, undefined, `${w.key} ${r.key} still draws dashes`); assert.match(r.grade, /^(Best|Good|Fair|Weak|Poor)$/, `${w.key} ${r.key}`); assert.ok(r.gradeInk, `${w.key} ${r.key}`); }
    for (const l of w.logos) assert.match(l.src, /^brand\/providers\/[a-z-]+\.svg$/, `${w.key} ${l.key}`);
  }
  assert.ok(v.wayCards.every(w => w.notSoon && w.hasPts && /^\d+$/.test(w.pts)), 'every way is live and scored');
  assert.ok(v.wayFoot.includes('proof-of-concept'), 'the footnote says which times are targets');
  assert.ok(v.wayFoot.includes('Decision Matrix'), 'and where the figures come from');
});

// The grade reads one way on every row (2026-10-15): higher is better, so on Cost the cheapest is Best and the dearest
// Poor, never the reverse. Best wears the link ink as the lit dashes did; every other grade is body ink.
test('each row grades its way in a word, Best for the cheapest and Poor for the dearest', () => {
  const v = vals(ways());
  const g = (key, crit) => v.wayCards.find(w => w.key === key).rows.find(r => r.key === crit);
  assert.equal(g('byo', 'cost').grade, 'Best');
  assert.equal(g('privatelink', 'cost').grade, 'Poor');
  assert.equal(g('att', 'setup').grade, 'Good');
  assert.equal(g('cloudwan', 'setup').grade, 'Fair');
  assert.equal(g('privatelink', 'scale').grade, 'Weak');
  assert.equal(g('byo', 'cost').gradeInk, 'var(--link)');
  assert.equal(g('privatelink', 'cost').gradeInk, 'var(--text-body)');
  assert.match(g('privatelink', 'cost').title, /Poor/, 'the row title names its grade');
  assert.equal(W.gradeOf(null), '', 'an unscored row shows no grade');
});

// Micah, 2026-10-13: "ways to connect is way too crowded and shoved in!" One filled Start on the page, on the best way
// still standing; the rest are outlined, as Recommended draws its options. A way a rule removes is never the pick.
test('only the best way left standing wears the filled Start', () => {
  const v = vals(ways());
  assert.deepEqual(v.wayCards.filter(w => w.top).map(w => w.key), ['byo']);
  const best = Math.max(...v.wayCards.filter(w => !w.out).map(w => Number(w.pts)));
  assert.equal(Number(v.wayCards.find(w => w.top).pts), best);
  // Per service removes every routed way: PrivateLink is the only one left, so it is the pick.
  const ps = vals(ways('partial', { intents: { partial: { security: 'service' } } }));
  assert.deepEqual(ps.wayCards.filter(w => !w.out).map(w => w.key), ['privatelink']);
  assert.deepEqual(ps.wayCards.filter(w => w.top).map(w => w.key), ['privatelink']);
});

// Micah, 2026-10-13, second pass: "still too busy - space out if needed, like products". The ways sit as the Marketplace
// sits its products: a section per family under a kicker and a title, four to a row, and the page may scroll.
test('the ways sit in two sections, NetBond Advanced and AT&T-managed, in the deck\'s order', () => {
  const v = vals(ways());
  assert.deepEqual(v.wayGroups.map(g => [g.kicker, g.title, g.cards.map(w => w.key)]),
    [['2 ways', 'NetBond Advanced', ['byo', 'att']], ['4 ways', 'AT&T-managed', ['peer', 'transit', 'cloudwan', 'privatelink']]]);
  assert.equal(v.wayGroups.flatMap(g => g.cards).filter(w => w.top).length, 1, 'still one filled Start across both sections');
});

// "and fix" (2026-10-13): in the flow the rail lit Orders, though Back reads "Back to Ways to connect". The page an order
// started on lights while you compose it; an order resumed from Orders still lights Orders.
test('composing a way lights the page it started on in the rail', () => {
  const lit = (c) => vals(c).railGroups.flatMap(g => g.items).filter(i => i.cur).map(i => i.label);
  const c = ways();
  vals(c).wayCards.find(w => w.key === 'byo').start();
  assert.equal(c.state.screen, 's4');
  assert.deepEqual(lit(c), ['Ways to connect']);
  const r = recommended();
  vals(r).moves[0].tiers.find(t => t.isOption).connect();
  assert.equal(r.state.compose.origin, 'options');
  assert.deepEqual(lit(r), ['Recommended']);
  c.setState({ compose: { ...c.state.compose, origin: null } });
  assert.deepEqual(lit(c), ['Orders']);
});

// The banner over the flow cut the way's own name ("Bring your ow...") to fit a setup sentence. The name never shrinks;
// the setup reads short, its whole sentence in the title.
test('the flow\'s way banner keeps the name whole and the setup short', () => {
  const c = ways();
  vals(c).wayCards.find(w => w.key === 'byo').start();
  const v = vals(c);
  assert.equal(v.cfWay.setup, 'Guided reconfig · <15 min');
  assert.match(v.cfWay.setupTitle, /first time needs your cloud gateway/);
  // The way is the order's first chip since 2026-10-16 (the pill beside the title went: "really?"); its whole title in the chip, its words in the tooltip.
  const chip = HTML.slice(HTML.indexOf('<button class="cw-chip"'), HTML.indexOf('</button>', HTML.indexOf('<button class="cw-chip"')));
  assert.ok(chip.includes('{{ w.label }} <b>{{ w.value }}</b>') && chip.includes('title="{{ w.title }}"'), 'the chip lost its label, value or words');
  assert.ok(!/text-overflow:\s*ellipsis/.test(chip), 'the chip clips');
});

// The storyboards (2026-10-16): no zones on the card or in the banner; the banner says what the constraint is.
test('peering has no zone chips; the way banner says same region as the hub', () => {
  const c = ways();
  const peer = () => vals(c).wayCards.find(w => w.key === 'peer');
  assert.equal(peer().hasZones, undefined);
  assert.equal(peer().zoneChips, undefined);
  assert.equal(c.state.wayZone, undefined, 'the zone state is gone');
  peer().start();
  const v = vals(c);
  assert.equal(v.cfWay.title, 'Hosted peering');
  assert.equal(v.cfWay.hubNote, "Same region as AT&T's hub");
  assert.equal(v.cfWay.zone, undefined);
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
  const g = v.cfCloudTiles.find(x => x.cloud === 'GCP'), az = v.cfCloudTiles.find(x => x.cloud === 'Azure');
  assert.equal(g.cant, true);
  assert.match(g.cantWord, /^Not with AT&T provides the port$/);
  assert.equal(az.can, true);
  assert.ok(az.hasMark && az.mark.endsWith('azure.svg'));
  g.pick();
  assert.deepEqual(vals(c).cfCloudTiles.filter(t => t.on), [], 'a dimmed cloud never takes the pick');
  az.pick();
  const v2 = vals(c);
  assert.equal(v2.cfWay.title, "AT&T's ExpressRoute", 'once the cloud is chosen, the way reads as that cloud names its port');
});

test('the order prices the way: AT&T\'s port beside NetBond; a hosted way the on-ramp, its last hop and the hub in place of NetBond', () => {
  const lineIds = (way) => { const c = ways(); vals(c).wayCards.find(w => w.key === way).start(); vals(c).cfTypes.find(t => t.label === 'DataCenter / CoLocation to Cloud').pick(); vals(c).cfNext(); vals(c).cfCloudTiles.find(x => x.cloud === 'Azure').pick(); vals(c).cfNext(); vals(c).cfRegionGroups[0].regions[0].pick(); return vals(c).cfOrder.lines.map(l => l.product); };
  assert.ok(lineIds('att').some(p => /^Cloud port, AT&T-provided/.test(p)), lineIds('att').join(' | '));
  // Re-pinned (2026-10-16, the storyboards): a hosted way rides AT&T's on-ramp into its hub, not NetBond; the peering is regional.
  const peer = lineIds('peer');
  assert.deepEqual(peer.slice(0, 3), ['AT&T cloud on-ramp into the hosted hub, 1 Gbps', 'VNet or VPC peering data, $0.01/GB each way at 50% use, 1 Gbps', 'AT&T hosted hub: vSRX and compute'], peer.join(' | '));
  assert.ok(!peer.some(p => /^NetBond Advanced/.test(p)), peer.join(' | '));
  assert.ok(!lineIds('byo').some(p => /Cloud port|hosted/i.test(p)), lineIds('byo').join(' | '));
});

test('Connect on an Azure option carries its way; the flow lands on the profile and Back returns to Recommended', () => {
  const c = recommended();
  const az = vals(c).moveList.find(m => m.key === 'region:Azure');
  // 2026-10-09: one ranking for the site, the deck's slide-6 step (rankWays) on every estate; under the default answers the
  // hosted transit gateway ranks third where the 10-06 session put peering (one model, not two that drift).
  assert.deepEqual(az.tiers.map(t => t.label), ['Your ExpressRoute', "AT&T's ExpressRoute", 'Hosted transit gateway']);
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
  for (const k of ['<sc-for list="{{ wg.cards }}"', '<sc-for list="{{ wc.rows }}"', '{{ cr.grade }}', '<sc-for list="{{ wc.logos }}"', '{{ wc.start }}', '{{ wayFoot }}', '{{ goRecommended }}']) assert.ok(blk.includes(k), k);
  assert.ok(!blk.includes('cr.segs') && !blk.includes('way-meter'), 'the five-dash meters are back');
  assert.doesNotMatch(blk, /<(svg|table|select)\b/);
  // Uncrowded (2026-10-13): Sites, Edge and Core were the same three stations on all six cards; the tile is the way's
  // mark, so the strip goes. The ring sits by the name at a size that holds 100; clouds, zones and Start share a foot.
  assert.ok(!blk.includes('wc.strip'), 'the six identical path strips are back');
  assert.match(blk, /class="way-head"[\s\S]*?class="js-score md"/, 'the ring is not beside the name at md');
  // Like products (2026-10-13): a section per family, four cards to a row, the root marked as a page that may scroll.
  assert.match(blk, /<sc-for list="\{\{ wayGroups \}\}" as="wg"[\s\S]*?\{\{ wg\.kicker \}\}[\s\S]*?\{\{ wg\.title \}\}[\s\S]*?<sc-for list="\{\{ wg\.cards \}\}" as="wc"/, 'the sections are gone');
  assert.match(blk, /id="sec-paths"[^>]*data-fold="scrolls"/, 'the page is not marked as one that may scroll');
  assert.match(blk, /class="way-marks"[\s\S]*?wc\.logos/, 'the clouds do not sit under the name');
  assert.ok(!blk.includes('zoneChips'), 'the zone chips are back');
  assert.match(blk, /class="way-start" data-primary="\{\{ wc\.top \}\}"/, 'Start lost its one-primary binding');
  for (const w of W.WAYS) for (const ic of [w.icon]) assert.ok(readFileSync(new URL(`../brand/icons/${ic}.svg`, import.meta.url)), ic);
  assert.ok(HTML.includes('{{ cfBackLabel }}') && HTML.includes('{{ cfCancelLabel }}') && HTML.includes('{{ ht.cantWord }}'));
});
