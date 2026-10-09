import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import * as J from '../naas-journey.js';
import * as W from '../naas-ways.js';
import { routeRulesOf } from '../naas-policy-layers.js';
import { decide } from '../naas-policy-model.js';
import * as D from '../naas-data.js';
import { mkC } from './harness.mjs';

// Intent before the recommendation (Micah, 2026-10-08: "we need to understand intent in the flow - is it business
// critical? Is it a lab? Does it need priority traffic? Do you care about security? Before recommendations we need some
// kind of intent screen, and need to impact choices, and policy options", then "preferred routing (layer 3)? preferred
// security?" and "not just what you get, but why we recommend it"). The answers are the deck's discovery step (slide 6):
// hard rules remove ways, the five criteria are re-weighted, the top pick and two alternatives each say why.
if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const B = Object.fromEntries(J.BEATS.map((b, i) => [b.key, i]));
const AZURE = [{ provider: 'Azure', estId: 'lastmile', name: 'Microsoft Azure subscription', cadence: 'daily', at: 1 }];
const journey = (extra = {}) => mkC({ view: 'lastmile', estateParam: null, journey: 'existing', screen: 'sj', addedSources: AZURE, jTags: { 'eastus:dispatch-svc': ['Prod'] }, ...extra });
const ranked = (cloud, intent) => W.rankWays(cloud, intent).map(r => r.key + (r.zone === 'intra' ? ':intra' : ''));

test('four questions, the user\'s own: purpose, traffic, security, routing at L3; the defaults read the deck as it stands', () => {
  assert.deepEqual(W.INTENT.map(q => [q.label, q.opts.map(o => o.label)]), [['Purpose', ['Critical', 'Production', 'Lab']], ['Traffic', ['Priority', 'Standard']],
    ['Security', ['Private', 'Inspected', 'Per service']], ['Routing · L3', ['Your BGP', 'AT&T\'s hub', 'Transitive']]]);
  assert.deepEqual(W.intentWeights({}), { cost: 30, perf: 20, sec: 20, setup: 15, scale: 15 }, 'the deck\'s weights');
  for (const it of [{ purpose: 'lab' }, { purpose: 'critical', traffic: 'priority' }, { security: 'inspected', routing: 'transitive' }]) {
    const w = W.intentWeights(it);
    assert.equal(Object.values(w).reduce((a, b) => a + b, 0), 100, JSON.stringify(it));
    assert.ok(Object.values(w).every(x => x >= 4), JSON.stringify(w));
  }
  assert.ok(W.intentWeights({ purpose: 'lab' }).cost > 30 && W.intentWeights({ traffic: 'priority' }).perf > 20);
  // Your tags suggest the first answers.
  assert.deepEqual(W.intentFromTags(['Dev', 'GPU']), { purpose: 'lab', traffic: 'priority', security: 'private', routing: 'bgp' });
});

test('the answers re-rank the ways by the deck\'s own rules', () => {
  assert.deepEqual(ranked('Azure', {}), ['byo', 'att', 'transit'], 'NetBond Advanced, then the hosted transit gateway (the deck\'s example card)');
  // "More than 5-10 VPCs, or inspection required -> Transit Gateway": no NetBond way inspects in path today.
  assert.deepEqual(ranked('Azure', { security: 'inspected' }), ['transit', 'peer', 'cloudwan']);
  // "Customer will not run a gateway in its VPC -> AT&T-hosted options".
  assert.ok(ranked('Azure', { routing: 'hub' }).every(k => W.wayHosted(k)));
  // A few named services across a trust boundary -> PrivateLink; the routed ways behind it, each saying what it misses.
  const svc = W.rankWays('Azure', { security: 'service' });
  assert.equal(svc[0].key, 'privatelink'); assert.equal(svc[0].misses, 0);
  assert.ok(svc.slice(1).every(r => r.misses === 1 && r.why.some(x => x.miss && x.short === 'Routed, not per service')));
  // "AWS, same AZ ID, single-AZ accepted -> Offer Intra-AZ peering": a lab on AWS that lets AT&T run the routing.
  assert.deepEqual(ranked('AWS', { purpose: 'lab', routing: 'hub' })[0], 'peer:intra');
  assert.equal(W.wayLabel('peer', 'AWS', 'intra'), 'Hosted VPC peering, same AZ');
  // Business critical never takes one zone; Azure has no same-AZ rung at all.
  assert.ok(!ranked('AWS', { purpose: 'critical', routing: 'hub' }).includes('peer:intra'));
  assert.ok(!ranked('Azure', { purpose: 'lab', routing: 'hub' }).includes('peer:intra'));
});

test('every way says why, in the deck\'s words: what fits, what to watch, what it misses', () => {
  const byo = W.wayWhy('byo', 'Azure', {});
  assert.deepEqual(byo.filter(x => x.ok).map(x => x.short), ['Never the internet', 'Your BGP', 'Flat bill']);
  const tgw = W.wayWhy('transit', 'Azure', { security: 'inspected' });
  assert.ok(tgw.some(x => x.ok && x.short === 'L3 to L7') && tgw.some(x => x.ok && x.short === 'Many VPCs'));
  assert.ok(tgw.some(x => x.warn && x.short === 'Static route'), 'your BGP is a preference a hosted way cannot meet; it says so');
  assert.ok(W.wayWhy('byo', 'Azure', { security: 'inspected' }).some(x => x.miss && x.short === 'No inspection in path'));
  for (const w of W.WAYS) for (const x of W.wayWhy(w.key, 'AWS', {})) assert.ok(x.icon && x.short && x.words && x.short.split(' ').length <= 4, `${w.key} ${x.short}`);
});

test('the Intent beat sits before the recommendation; an answer re-ranks at once and the wire proposes the new pick', () => {
  const c = journey({ jStep: B.intent });
  let v = vals(c);
  assert.equal(v.jIsIntent, true); assert.equal(v.jLine, 'What does Azure need?'); assert.equal(v.jAct, 'See the recommendation');
  assert.deepEqual(v.jIntentQs.map(q => q.opts.filter(o => o.on).map(o => o.key)[0]), ['prod', 'standard', 'private', 'bgp']);
  assert.equal(v.jLink, 'proposed'); assert.equal(v.jLinkWord, 'Your ExpressRoute');
  v.jIntentQs.find(q => q.key === 'security').opts.find(o => o.key === 'inspected').go();
  v = vals(c);
  assert.deepEqual(c.state.jIntent, { security: 'inspected' });
  assert.equal(v.jLinkWord, 'Hosted transit gateway', 'the picture moves with the answer');
  v.jActGo();
  v = vals(c);
  assert.equal(c.state.jStep, B.recommend);
  assert.deepEqual(v.jOptions.map(o => o.label), ['Hosted transit gateway', 'Hosted VNet peering', 'Hosted Cloud WAN']);
  // The intent rides the cloud's head from here on, as glyphs.
  assert.equal(v.jHasIntentChips, true); assert.deepEqual(v.jIntentChips.map(x => x.icon), ['apps', 'smart-meter', 'firewall', 'router']);
});

test('the recommendation says why: reasons on each card, the deck\'s Why line and the weights in the detail', () => {
  const c = journey({ jStep: B.recommend, jIntent: { security: 'service' } });
  let v = vals(c);
  const [pick, alt] = v.jOptions;
  assert.equal(pick.label, 'Hosted PrivateLink');
  assert.ok(pick.hasWhy && pick.why.every(x => x.ok), 'the pick leads with what fits');
  assert.equal(alt.why[0].short, 'Routed, not per service', 'an alternative leads with what it misses');
  assert.equal(alt.hasPts, false, 'a way a hard rule removes shows no score');
  v.toggleDetail();
  v = vals(c);
  assert.match(v.jDetail.whyLine, /^Why: Per-service allow-list, one endpoint each/);
  assert.deepEqual(v.jDetail.weights.map(w => w.key), ['cost', 'perf', 'sec', 'setup', 'scale']);
  assert.equal(v.jDetail.weights.reduce((a, w) => a + Number(w.w), 0), 100);
  assert.match(v.jDetail.weightsTitle, /^Weighed for what you said: cost \d+/);
  assert.match(HTML, /<span>Why<\/span><\/button>/, 'one word beside the pick it explains');
  assert.deepEqual(v.jOptions.map(o => o.tierShort), ['Recommended', '', ''], 'only the pick is named; order says the rest');
  // Why as a story (2026-10-08, "make the 'why' more beautiful"): every answer joined to what it got; the weights as yours
  // over the deck's; the panel covers the stage exactly.
  assert.deepEqual(v.jDetail.pairs.map(p => [p.aLabel, p.kind]), [['Production', 'quiet'], ['Standard', 'quiet'], ['Per service', 'ok'], ['Your BGP', 'warn']]);
  assert.equal(v.jDetail.pairs[2].reasons[0].short, 'Per-service allow-list');
  assert.deepEqual(v.jDetail.wtYou.map(w => w.key), ['cost', 'perf', 'sec', 'setup', 'scale']);
  assert.equal(v.jDetail.wtYou.reduce((a, w) => a + Number(w.w), 0), 100); assert.equal(v.jDetail.wtDeck.reduce((a, w) => a + Number(w.w), 0), 100);
  assert.match(HTML, /<sc-if value="\{\{ jDetailOpen \}\}"[^>]*><div class="js-whyp" role="dialog" aria-label="Why \{\{ jDetail\.label \}\}"/);
  const st = HTML.indexOf('<div class="js-stage"'), wp = HTML.indexOf('<div class="js-whyp"'), sEnd = HTML.indexOf('<sc-if value="{{ jIsIntent }}"');
  assert.ok(st < wp && wp < sEnd, 'the Why lives inside the stage');
  assert.match(HTML, /\.js-whyp\{position:absolute;inset:0;/);
  assert.match(HTML, /<span class="js-score" style="--p:\{\{ op\.ptsPct \}\}"/);
  assert.match(HTML, /<span class="js-wbadge" data-flip="\{\{ jLinkBadge\.flip \}\}"/);
  assert.match(HTML, /<span class="js-why" aria-label="Why">/);
});

test('the intent shapes the policy deck: one intent card leads, a real policy the engine reads; a lab drops the production card', () => {
  const card = J.intentCard({ purpose: 'critical', traffic: 'priority', security: 'inspected' }, { cloud: 'Azure', regions: [{ region: 'eastus' }, { region: 'westeurope' }] }, []);
  assert.equal(card.req, 'Two paths, diverse metros and Latency SLO 20 ms and Inline security inspection');
  assert.equal(card.short, 'Two paths · 20 ms SLO · Inspected');
  assert.equal(card.match, 'region eastus,westeurope');
  // NetBond Advanced's sheet for it: prepend ASNs for the second path and the SLO, CV tagging to steer inspection.
  const rt = routeRulesOf({ req: card.req });
  assert.ok(rt['manip:prepend-advertisements'] && rt['manip:selective-cv-tagging']);
  // The comma list matches both regions in the engine, and nothing else.
  const est = { ...D.ESTATES.lastmile, regionsList: [{ cloud: 'Azure', region: 'eastus' }, { cloud: 'Azure', region: 'westeurope' }] };
  const pol = { name: 'x', match: card.match, scope: 'any cloud', req: card.req, state: 'enforced' };
  assert.equal(decide(est, [pol], { from: 'HQ', to: 'Azure westeurope' }).decidedBy, 'x');
  assert.notEqual(decide(est, [pol], { from: 'HQ', to: 'Azure northeurope' }).decidedBy, 'x');
  assert.equal(J.intentCard({}, { cloud: 'Azure', regions: [{ region: 'eastus' }] }, []), null, 'the default intent asks nothing more of the path');
  // In the journey: placed, live, on Protect.
  const run = (jIntent) => { const c = journey({ jStep: B.connect, jPick: 0, jIntent, jTags: { 'eastus:dispatch-svc': ['Prod'], 'westeurope:payments-api': ['PCI', 'Prod'] } });
    vals(c).jActGo(); vals(c).jActGo(); vals(c).jActGo(); vals(c).jActGo(); return c; };
  const c = run({ traffic: 'priority' });
  let v = vals(c);
  assert.equal(c.state.jStep, B.protect);
  // A workload not tagged yet reads its suggested tags, so every tag the cloud's workloads carry has its card.
  assert.deepEqual(v.jDeck.map(d => d.tag), ['Intent', 'PCI', 'Finance', 'Internet-facing', 'Prod']);
  assert.deepEqual([v.jDeck[0].headIcon, v.jDeck[0].reqWord], ['target', '20 ms SLO']);
  assert.deepEqual(v.jDeck[0].rules.map(r => [r.verb, r.label, r.dir]), [['Manipulate', 'Prepend ASNs', '⇄']]);
  v.jDeck[0].enter(); v = vals(c);
  assert.equal(v.jLine, 'Intent is held to 20 ms.');
  assert.ok(v.jRegions.flatMap(r => r.apps).every(a => a.hl === 'on'), 'the intent covers every workload on the cloud');
  v.jDeck[0].go(); v = vals(c);
  assert.ok(c.state.customPolicies.some(p => p.journey && p.tag === 'Intent' && p.match === 'region eastus,westeurope' && p.req === 'Latency SLO 20 ms'));
  const lab = vals(run({ purpose: 'lab' }));
  assert.deepEqual(lab.jDeck.map(d => d.tag), ['PCI', 'Finance', 'Internet-facing'], 'a lab keeps compliance and inspection, and drops the production policy');
});

test('once ordered, the answers stand; the dashboard ranks by the same model', () => {
  const c = journey({ jStep: B.connect, jPick: 0 });
  vals(c).jActGo();
  c.state.jStep = B.intent;
  const v = vals(c);
  assert.ok(v.jIntentQs.every(q => q.opts.every(o => o.off)));
  v.jIntentQs[0].opts[2].go();
  assert.equal(c.state.jIntent ?? null, null, 'a placed order is not re-ranked under it');
  // Recommended on the dashboard ranks by the same model (2026-10-09): its own estate's answers, none given here, so the
  // defaults and the region's tags: the deck's top pick and two alternatives.
  const dash = vals(mkC({ view: 'partial', estateParam: null, screen: 's3', layer: 'cloud', tab: 'connect', cnPage: 'options', jIntent: { security: 'inspected' } }));
  assert.deepEqual(dash.moves[0].tiers.map(t => t.way), ['byo', 'att', 'transit']);
});

test('the markup: four question groups of glyph answers, the AT&T node a rounded rectangle', () => {
  const a = HTML.indexOf('<sc-if value="{{ jIsIntent }}"'), blk = HTML.slice(a, HTML.indexOf('</sc-if>', HTML.indexOf('</sc-for></div></div></sc-for>', a)));
  assert.match(blk, /<div class="js-intent" role="group" aria-label="What it needs"><sc-for list="\{\{ jIntentQs \}\}" as="iq"/);
  assert.match(blk, /<button role="radio" class="js-io" aria-checked="\{\{ io\.on \}\}" disabled="\{\{ io\.off \}\}" onClick="\{\{ io\.go \}\}" title="\{\{ io\.title \}\}">/);
  assert.match(HTML, /\.js-att\{[^}]*border-radius:20px/, 'a rounded rectangle, not a pill (Micah, 2026-10-08)');
  assert.doesNotMatch(HTML.match(/\.js-att\{[^}]*\}/)[0], /9999px/);
});
