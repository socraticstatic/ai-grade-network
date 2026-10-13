import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals, estateFor } from '../naas-app.js';
import * as D from '../naas-data.js';
import * as J from '../naas-journey.js';
import { rightRoots } from '../naas-flowmap.js';
import { mkC } from './harness.mjs';

// The existing customer's journey (Micah, 2026-10-08: "an AT&T existing already last mile, they want to add a new
// source, they want to tag maybe attach, identify workloads maybe, see recommendations, and maybe upsell the customer
// with cloud connect ... story-based, and sequential, without too many words"), then "make it simpler, more elegant,
// better in every way": one stage (your sites, the AT&T network, your cloud) that builds beat by beat, one sentence and
// one action a beat, a slim stepper in place of the rail.
if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8').replace('<link rel="stylesheet" href="./storefront.css">', () => '<style>\n' + readFileSync(new URL('../storefront.css', import.meta.url), 'utf8') + '</style>') /* the stylesheet moved to storefront.css (2026-10-12); this test reads its rules */;
const journey = (extra = {}) => mkC({ view: 'lastmile', estateParam: null, journey: 'existing', screen: 'sj', jStep: 0, ...extra });
const AZURE = [{ provider: 'Azure', estId: 'lastmile', name: 'Microsoft Azure subscription', cadence: 'daily', at: 1 }];
// A beat by name: Intent came between Tag and Recommend (2026-10-08) and moved every beat after it by one.
const B = Object.fromEntries(J.BEATS.map((b, i) => [b.key, i]));

test('the existing customer is AT&T sites with no cloud yet: Growing\'s sites on AT&T access, no IPsec, no tunnel', () => {
  const est = D.ESTATES.lastmile;
  assert.equal(est.sites.length, 20);
  assert.ok(est.sites.every(s => !/IPsec/i.test(s.access) && !s.tunnel && !s.tunnelTo));
  assert.deepEqual([est.regionsList.length, est.accounts.length, est.buckets.length, est.findings.length], [0, 0, 0, 0]);
  assert.ok(D.VIEWS.some(v => v.id === 'lastmile'));
});

test('the Customer switch opens the journey on its first beat, clean; the stepper replaces the rail', () => {
  const c = mkC({ view: 'partial', estateParam: null, screen: 's0', addedSources: AZURE, orders: [{ id: 'o1', journey: true }] });
  vals(c).setJourney({ target: { value: 'existing' } });
  assert.equal(c.state.journey, 'existing'); assert.equal(c.state.view, 'lastmile'); assert.equal(c.state.screen, 'sj'); assert.equal(c.state.jStep, 0);
  assert.equal(c.state.addedSources.length, 0, 'a rehearsal\'s source is gone'); assert.equal(c.state.orders.length, 0, 'and its order');
  const v = vals(c);
  assert.equal(v.journeyOn, true);
  assert.equal(v.showRail, false, 'no rail in the journey');
  assert.equal(v.showPageTitle, false);
  // Nine beats since act three (2026-10-08): live, protected, saved; ten since Intent, before the recommendation.
  assert.deepEqual(v.jSteps.map(s => s.label), ['Today', 'Source', 'Found', 'Needs', 'Recommend', 'Connect', 'Live', 'Protect', 'Save']);
  assert.deepEqual(v.jSteps.map(s => s.state), ['cur', 'next', 'next', 'next', 'next', 'next', 'next', 'next', 'next']);
  assert.deepEqual(v.jSteps.map(s => s.off), [false, false, true, true, true, true, true, true, true], 'a beat opens once the source is in; act three once the order is');
  v.setJourney({ target: { value: '' } });
  assert.equal(c.state.journey, null); assert.equal(c.state.screen, 's0');
  assert.equal(vals(c).showRail, true);
});

test('one sentence a beat tells the story', () => {
  const lines = [0, 1, 2, 3, 4, 5].map(i => vals(journey({ jStep: i, addedSources: i >= 2 ? AZURE : [] })).jLine);
  assert.deepEqual(lines, ['AT&T already carries your 20 sites.', 'Connect a cloud account. Read only.', 'Azure runs 68 workloads outside the AT&T network.',
    'What does your Azure connection need?', 'Move Azure onto AT&T. Save $3,600 a month.', 'Connect Azure with Your ExpressRoute.']);
  for (const l of lines) assert.ok(l.split(' ').length <= 9, l);
});

test('beat 1: the stage holds your sites by the access AT&T sells, the AT&T network, and a cloud AT&T cannot name', () => {
  const v = vals(journey());
  assert.equal(v.jSites.n, '20');
  assert.deepEqual(v.jSites.groups.map(g => [g.label, g.n]), [['AVPN', 7], ['Ethernet', 6], ['Internet', 3], ['Fiber', 4]]);
  // The 20 is drawn as the 20 (2026-10-08): one glyph per real site, grouped and inked by its access, its name in the title.
  assert.equal(v.jSites.cells.length, 20);
  // One access model (2026-10-09): the groups are naas-sites' SERVICE keys, named by its full names.
  assert.deepEqual([...new Set(v.jSites.cells.map(c => c.group))], ['avpn', 'aseod', 'adi', 'abf']);
  assert.match(v.jSites.cells[0].title, /^Ashburn DC: AT&T VPN \(MPLS\), data center$/);
  assert.equal(v.jSites.cells[0].ink, v.jSites.groups[0].ink, 'a glyph and its legend share one ink');
  assert.equal(v.jCloud.state, 'unknown');
  assert.equal(v.jLink, 'none'); assert.equal(v.jNet, 'off');
  assert.equal(v.jAct, 'Find your clouds');
});

test('beat 2: Azure with a read-only role; the scan ticks on the cloud node, adds the source and moves on', async () => {
  const c = journey({ jStep: 1 });
  let v = vals(c);
  assert.equal(v.jCloud.state, 'picking');
  assert.deepEqual(v.jProviders.filter(p => !p.off).map(p => p.key), ['Azure', 'AWS'], 'the demo reads Azure first, AWS when you attach more');
  assert.equal(v.jCred, 'Reader role on the subscription');
  assert.equal(v.jAct, 'Scan Azure');
  v.jActGo();
  v = vals(c);
  assert.equal(v.jCloud.state, 'scanning'); assert.equal(v.jActOff, true); assert.equal(v.jActBusy, true, 'the scan reads as work under way, not a dead button'); assert.equal(v.jLine, 'Reading your Microsoft Azure subscription.');
  await new Promise(r => setTimeout(r, 2900));
  assert.equal(c.state.jStep, B.found);
  assert.deepEqual(c.state.addedSources.map(a => [a.provider, a.estId]), [['Azure', 'lastmile']]);
});

test('beat 3: the cloud node becomes Azure, its regions and apps; the public internet path appears under AT&T', () => {
  const v = vals(journey({ jStep: 2, addedSources: AZURE }));
  assert.equal(v.jCloud.state, 'found'); assert.equal(v.jCloud.wl, '68'); assert.equal(v.jWide, true);
  assert.deepEqual(v.jRegions.map(r => [r.region, r.wlF, r.msF]), [['eastus', '40', '64 ms'], ['westeurope', '28', '102 ms']]);
  assert.deepEqual(v.jRegions[1].apps.map(a => a.name), ['payments-api', 'fin-ledger']);
  // The latency is a figure of its own on the path (2026-10-08), not part of the word.
  assert.equal(v.jNet, 'public'); assert.equal(v.jNetWord, 'Not on AT&T network');
  // The public path is named, never timed: nobody measures it (2026-10-09).
  assert.equal(v.jNetMs, undefined); assert.doesNotMatch(HTML, /jNetMs|jNetHasMs/);
});

test('Found: tags suggested by what a workload is, there to confirm or add, never a beat (2026-10-12); Tag them all is the side door; the tags join the estate', () => {
  const c = journey({ jStep: 2, addedSources: AZURE });
  let v = vals(c);
  const chips = (name) => v.jRegions.flatMap(r => r.apps).find(a => a.name === name).chips.map(x => x.t);
  assert.deepEqual(chips('payments-api'), ['PCI', 'Finance', 'Prod'], 'a tag keeps its slot: PCI, Finance, Internet-facing, then Prod beside the +');
  assert.deepEqual(chips('customer-portal'), ['Internet-facing', 'Prod']);
  assert.deepEqual(chips('dispatch-svc'), ['Prod']);
  assert.equal(v.jAct, 'Say what it needs', 'the primary moves on; tagging is optional');
  assert.equal(v.jTagRest.has, true); v.jTagRest.go();
  v = vals(c);
  assert.equal(v.jTagRest.has, false, 'every suggestion is on'); assert.equal(v.jAct, 'Say what it needs');
  assert.deepEqual(chips('dispatch-svc'), ['Prod'], 'the portal\'s Internet-facing stays the portal\'s');
  const est = estateFor({ view: 'lastmile', estateParam: null, addedSources: AZURE, jTags: c.state.jTags });
  assert.ok(est.regionsList.find(r => r.region === 'westeurope').tags.includes('PCI'));
});

test('beat 6: the three ways as one choice, Recommended first; the AT&T line is proposed; the sentence follows the pick', () => {
  const c = journey({ jStep: B.recommend, addedSources: AZURE });
  let v = vals(c);
  // The default intent (production, standard, private, your BGP) ranks the deck's way: NetBond Advanced on your port,
  // on AT&T's, then the hosted transit gateway (the deck's own example card: NetBond Advanced, Transit Gateway, peering).
  assert.deepEqual(v.jOptions.map(o => [o.label, o.on]), [['Your ExpressRoute', true], ["AT&T's ExpressRoute", false], ['Hosted transit gateway', false]]);
  assert.deepEqual(v.jOptions.map(o => o.delta), ['saves $3,600', 'saves $3,000', 'adds $1,068']);
  assert.ok(v.jOptions.every(o => o.hasPts));
  assert.equal(v.jLink, 'proposed'); assert.equal(v.jLinkWord, 'Your ExpressRoute');
  v.jOptions[1].go();
  v = vals(c);
  assert.equal(v.jLine, 'Move Azure onto AT&T. Save $3,000 a month.');
  assert.equal(v.jAct, "Choose AT&T's ExpressRoute");
  v.jActGo();
  assert.equal(c.state.jStep, B.connect); assert.equal(c.state.jPick, 1);
});

test('beat 7: one line of the order, Place order; then the line is AT&T\'s, the internet path fades, and the phases follow', () => {
  const c = journey({ jStep: B.connect, jPick: 1, addedSources: AZURE });
  let v = vals(c);
  assert.deepEqual(v.jLines.map(l => [l.name, l.n, l.v]), [['NetBond Advanced', 2, '$3,800/mo'], ['Cloud port, AT&T-provided', 2, '$600/mo']]);
  assert.equal(v.jTotal, '$4,400/mo'); assert.equal(v.jRegionsWord, 'eastus · westeurope');
  assert.equal(v.jAct, 'Place order');
  v.jActGo();
  v = vals(c);
  assert.equal(v.jPlaced, true);
  assert.equal(v.jLine, 'Ordered. AT&T is provisioning it.');
  // Ordered is not live: the way stays proposed and the traffic on the internet until Go live (the Watch beat's picture).
  assert.equal(v.jLink, 'proposed'); assert.equal(v.jNet, 'public'); assert.equal(v.jFlow, 'net');
  const o = c.state.orders.find(x => x.journey);
  assert.equal(o.stage, 'Submitted for approval'); assert.deepEqual(o.moveKeys, ['region:Azure']); assert.equal(o.way, 'att');
  assert.deepEqual(v.jPhases.map(p => [p.label, p.state]), [['Ordered', 'done'], ['Provision', 'set'], ['Live', 'any'], ['Insight', 'any']]);
  assert.equal(v.jAct, 'Watch it go live');
  assert.ok(vals(mkC({ ...c.state, journey: null, screen: 's3', layer: 'cloud', tab: 'connect', cnPage: 'orders' })).ordRows.some(r => /AT&T's ExpressRoute/.test(r.title)), 'Orders lists it in the dashboard');
});

test('a hosted pick adds the hub, priced at review', () => {
  const v = vals(journey({ jStep: B.connect, jPick: 2, addedSources: AZURE }));
  assert.deepEqual(v.jLines.map(l => l.name), ['AT&T cloud on-ramp into the hosted hub, 1 Gbps', 'Shared transit gateway attachment', 'AT&T hosted hub: vSRX and compute']);
  assert.equal(v.jLines[2].v, 'At review');
  assert.match(v.jTotal, / \+ hub$/);
});

test('before a cloud is discovered, the map lands its cloud traffic on Clouds not yet discovered, so it still adds up', () => {
  const col = (v, side) => v.mapNodes.filter(n => n.side === side).reduce((a, n) => a + n.v, 0);
  const v = vals(mkC({ view: 'lastmile', estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', obTab: 'flow' }));
  const unknown = v.mapNodes.find(n => n.side === 'r' && n.name === 'Clouds not yet discovered');
  assert.ok(unknown && unknown.v > 30, 'most of the sites\' traffic is bound for clouds AT&T cannot name yet');
  assert.ok(Math.abs(col(v, 'l') - col(v, 'r')) < 1e-6, `left ${col(v, 'l')} right ${col(v, 'r')}`);
  const after = vals(mkC({ view: 'lastmile', estateParam: null, addedSources: AZURE, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', obTab: 'flow' }));
  assert.ok(!after.mapNodes.some(n => n.name === 'Clouds not yet discovered'));
  assert.equal(rightRoots(D.ESTATES.partial, []).some(n => n.key === 'cloud:unknown'), false, 'an estate with clouds never draws it');
});

test('the markup: one stage of three nodes and two wires, the internet path, a stepper, one action; the header switch and theme', () => {
  // The Customer select left the header for the rail (2026-10-12, tests/journey-rail.test.mjs); the journey keeps its exit there.
  assert.equal(HTML.includes('aria-label="Customer"'), false);
  const a = HTML.indexOf('<section class="js"'), b = HTML.indexOf('</section>', a);
  const blk = HTML.slice(a, b);
  assert.match(blk, /<ol class="js-steps"[^>]*><sc-for list="\{\{ jSteps \}\}"/);
  assert.match(blk, /<div class="js-stage" data-wide="\{\{ jWide \}\}" data-link="\{\{ jLink \}\}" data-net="\{\{ jNet \}\}" data-flow="\{\{ jFlow \}\}" data-live="\{\{ jLive \}\}" data-verdict="\{\{ jVerdict \}\}" data-why="\{\{ jDetailOpen \}\}">/);
  assert.equal((blk.match(/class="js-node /g) || []).length, 3);
  assert.equal((blk.match(/class="js-wire"/g) || []).length, 2);
  assert.match(blk, /<div class="js-net" data-state="\{\{ jNet \}\}"/);
  assert.match(blk, /<button class="js-go" onClick="\{\{ jActGo \}\}" disabled="\{\{ jActOff \}\}" aria-busy="\{\{ jActBusy \}\}">\{\{ jAct \}\}/);
  assert.doesNotMatch(blk, /<(table|select)\b/);
  assert.match(HTML, /<sc-if value="\{\{ journeyOn \}\}"[^>]*><button class="hdr-theme" onClick="\{\{ toggleTheme \}\}"/);
  assert.match(HTML, /@media \(prefers-reduced-motion: reduce\)\{\.js-wire\[data-state="proposed"\] i/);
  assert.deepEqual(J.BEATS.map(b2 => b2.key), ['today', 'source', 'found', 'intent', 'recommend', 'connect', 'watch', 'protect', 'save']);
});

test('the picture carries the figures (2026-10-08): latency on each wire, the monthly before and after, the traffic on the path it rides', () => {
  const found = vals(journey({ jStep: 2, addedSources: AZURE }));
  assert.equal(found.jNetMs, undefined); assert.equal(found.jFlow, 'net'); assert.equal(found.jLinkHasMs, false); assert.equal(found.jMoney.has, false);
  const rec = vals(journey({ jStep: B.recommend, addedSources: AZURE }));
  // Azure's AT&T latency reads 19 ms (the seed's, inside the 20 ms private SLO, as the Oracle seed's is): 102 -> 19.
  assert.equal(rec.jLinkMs, '19 ms'); assert.equal(rec.jLinkDrop, '−83 ms'); assert.equal(rec.jLinkHasDrop, true);
  assert.deepEqual([rec.jMoney.has, rec.jMoney.before, rec.jMoney.after, rec.jMoney.up], [true, '$16,800/mo', '$13,200/mo', false]);
  const hosted = vals(journey({ jStep: B.recommend, jPick: 2, addedSources: AZURE }));
  assert.equal(hosted.jMoney.up, true, 'a dearer way reads in heading ink, never green');
  const c = journey({ jStep: B.connect, jPick: 1, addedSources: AZURE });
  vals(c).jActGo();
  assert.equal(vals(c).jFlow, 'net', 'ordered, the traffic still rides the internet');
  vals(c).jActGo(); vals(c).jActGo();
  assert.equal(vals(c).jFlow, 'att', 'Go live moves the traffic onto AT&T');
  assert.match(HTML, /<div class="js-stage"[^>]* data-flow="\{\{ jFlow \}\}"/);
  assert.match(HTML, /<i class="js-dots"><\/i>/);
  assert.match(HTML, /<div class="js-money" data-up="\{\{ jMoney\.up \}\}">/);
});

// ---- Act three (2026-10-08): live, protected, saved, and attach more ----
const placedAzure = () => { const c = journey({ jStep: B.connect, jPick: 1, addedSources: AZURE }); vals(c).jActGo(); vals(c).jActGo(); return c; };

test('beat 7: Go live lands both regions at once; every app blinks green; the internet path is gone; every page reads them private', () => {
  const c = placedAzure();
  let v = vals(c);
  assert.equal(c.state.jStep, B.watch); assert.equal(v.jLine, 'Provisioning.'); assert.equal(v.jAct, 'Go live');
  v.jActGo();
  v = vals(c);
  assert.deepEqual(c.state.landed.map(e => [e.est, e.region, e.order]), [['lastmile', 'eastus', 'o1'], ['lastmile', 'westeurope', 'o1']], 'landed on the journey estate, for its order');
  assert.equal(v.jLine, 'Azure is live on AT&T.'); assert.equal(v.jNet, 'gone'); assert.equal(v.jLink, 'connected'); assert.equal(v.jLive, true);
  assert.deepEqual(v.jPhases.map(p => p.state), ['done', 'done', 'done', 'set'], 'one lifecycle: finished phases are done, the stepper\'s blue');
  assert.match(HTML, /<sc-if value="\{\{ jIsWatch \}\}"[^>]*><div class="js-order"><div class="ps big js-phases"/, 'the phases tick on the Watch beat itself');
  assert.match(HTML, /\.ps \[data-state="done"\] i\{border-color:var\(--cta\)/, 'done reads blue, as the stepper does, on every phase strip');
  assert.match(HTML, /\.ps \[data-state="ok"\] i\{border-color:var\(--success\)/, 'health keeps its green');
  assert.equal(v.jHealth.length, 4);
  // The figures survive the move leaving the ranked list: the order snapshotted them at Place.
  assert.equal(v.jLinkMs, '19 ms'); assert.equal(v.jMoney.after, '$13,800/mo');
  // One lifecycle (2026-10-09): Orders reads the journey's Go live; it once still said Submitted for approval.
  const ord = vals(mkC({ ...c.state, journey: null, screen: 's3', layer: 'cloud', tab: 'connect', cnPage: 'orders' })).ordRows.find(r => r.journey);
  assert.equal(ord.stage, 'Live'); assert.equal(ord.canGoLive, false);
  const home = vals(mkC({ ...c.state, journey: null, screen: 's0' }));
  assert.ok(home.homeCards.find(x => x.key === 'onatt').big === '2', 'the home counts both regions private');
});

test('beat 8: a deck of policies from the tags, each a real intent with the engine\'s verdicts; hover previews, click enforces, all at once or one by one', () => {
  const c = placedAzure(); vals(c).jActGo(); vals(c).jActGo();
  let v = vals(c);
  assert.equal(c.state.jStep, B.protect);
  assert.deepEqual(v.jDeck.map(d => [d.tag, d.req, d.cloudV, d.netV]), [['PCI', 'Private path required', 'Allowed', 'Denied'], ['Finance', 'Private path required', 'Allowed', 'Denied'], ['Internet-facing', 'Inline security inspection', 'Allowed', 'Allowed'], ['Prod', 'No direct internet path', 'Allowed', 'Denied']]);
  assert.deepEqual(v.jDeck.map(d => d.apps), [['payments-api'], ['payments-api', 'fin-ledger'], ['customer-portal'], ['dispatch-svc', 'customer-portal', 'payments-api', 'fin-ledger']]);
  assert.equal(v.jLine, '4 policies from your tags. Enforce them.'); assert.equal(v.jAct, 'Enforce them all'); assert.equal(v.jVerdict, 'none');
  // Each card is NetBond's sheet for its intent: the verb, the rule, the direction (2026-10-08). A private path allows the
  // matching routes both ways; blocking the default route is NetBond's own baseline, not the card's (2026-10-09).
  assert.deepEqual(v.jDeck[0].rules.map(r => [r.verb, r.label, r.dir]), [['Allow', 'Matching routes', '⇄']]);
  assert.deepEqual(v.jDeck[2].rules.map(r => [r.verb, r.label, r.dir]), [['Manipulate', 'CV tagging', '→'], ['Manipulate', 'Tag by CV', '←']]);
  assert.equal(v.jDeck[0].rules[0].dirWord, 'both ways');
  // Short on the card, NetBond's whole name in the title (2026-10-08: "making text more concise").
  assert.match(v.jDeck[0].rules[0].title, /^Allow matching routes, both ways$/);
  // Short on the deck, the whole of it in the title (2026-10-08: "lots of words still").
  assert.equal(v.jDeckWhere, 'NetBond Advanced route policy'); assert.match(v.jDeckWhereTitle, /^Enforced as route policy on NetBond Advanced/); assert.equal(v.jDeckNba, true);
  assert.deepEqual(v.jDeck.map(d => d.reqWord), ['Private', 'Private', 'Inspected', 'No internet']);
  // A hosted pick enforces on the vSRX in AT&T's hub and the cloud's route tables (the deck, slide 5), not as BGP route rules.
  const h = journey({ jStep: B.connect, jPick: 2, addedSources: AZURE }); vals(h).jActGo(); vals(h).jActGo(); vals(h).jActGo(); vals(h).jActGo();
  const hv = vals(h);
  // On a NetBond way, no card lists a vSRX: a card NetBond carries no rule for shows the site and the cloud (2026-10-09).
  assert.ok(v.jDeck.every(d => d.rules.every(r => !/vSRX/i.test(r.title))), 'no hosted hub is invented under the NetBond header');
  assert.deepEqual(v.jDeck.find(d => d.tag === 'Prod').rules.map(r => [r.verb, r.label]), [['Deny', 'Local breakout'], ['Allow', '0/0 via AT&T']]);
  assert.equal(hv.jDeckHosted, true); assert.equal(hv.jDeckWhere, 'vSRX and your route tables'); assert.match(hv.jDeckWhereTitle, /^Enforced on the vSRX in AT&T's hub/);
  assert.deepEqual(hv.jDeck[0].rules.map(r => [r.verb, r.label]), [['Inspect', 'vSRX, L3 to L7'], ['Route', 'Route tables']]);
  assert.match(HTML, /<span class="js-rule" title="\{\{ rr\.title \}\}"><span class="fw-badge \{\{ rr\.cls \}\}">\{\{ rr\.verb \}\}<\/span>/);
  assert.match(HTML, /<div class="js-deckkey"/);
  // Hover previews: the stamps take that card's verdicts, dashed; the apps it covers light, the rest dim.
  v.jDeck[2].enter();
  v = vals(c);
  assert.equal(v.jVerdict, 'preview'); assert.deepEqual([v.jStampCloud, v.jStampNet], ['Allowed', 'Allowed']);
  assert.deepEqual(v.jRegions[0].apps.map(a => [a.name, a.hl]), [['dispatch-svc', 'off'], ['customer-portal', 'on']]);
  assert.equal(v.jLine, 'Internet-facing is inspected in path.');
  v.jDeck[2].leave();
  // One at a time.
  vals(c).jDeck[0].go();
  v = vals(c);
  assert.deepEqual(v.jDeck.map(d => d.on), [true, false, false, false]);
  assert.equal(v.jLine, '1 of 4 enforced. 14 workloads never touch the internet.');
  assert.equal(v.jVerdict, 'enforced'); assert.deepEqual([v.jStampCloud, v.jStampNet], ['Allowed', 'Denied']);
  assert.deepEqual([v.jDeckRest.has, v.jDeckRest.n, v.jAct], [true, '3', 'See what it saves']);
  const pol = c.state.customPolicies.find(p => p.journey);
  assert.deepEqual([pol.name, pol.match, pol.req, pol.state, pol.cloud, pol.tag], ['PCI private path', 'tag PCI', 'Private path required', 'enforced', 'Azure', 'PCI']);
  assert.ok(vals(mkC({ ...c.state, journey: null, screen: 's3', layer: 'cloud', tab: 'govern', govPanel: 'policies' })).polRows.some(r => r.name === 'PCI private path'), 'Govern lists it');
  // The rest at once.
  v.jDeckRest.go();
  v = vals(c);
  assert.ok(v.jDeck.every(d => d.on)); assert.equal(v.jDeckRest.has, false);
  assert.equal(v.jLine, 'All 4 enforced. 68 workloads never touch the internet.');
  assert.equal(c.state.customPolicies.filter(p => p.journey).length, 4);
  assert.match(HTML, /<button role="listitem" class="js-pcard" data-on="\{\{ pd\.on \}\}" data-hover="\{\{ pd\.hover \}\}" onClick="\{\{ pd\.go \}\}" onMouseEnter="\{\{ pd\.enter \}\}" onMouseLeave="\{\{ pd\.leave \}\}"/);
});

test('beat 9: the saving a month and a year; Attach AWS loops to the source with Azure done; Open the dashboard lands home', async () => {
  const c = placedAzure(); vals(c).jActGo(); vals(c).jActGo(); vals(c).jActGo(); vals(c).jActGo();
  let v = vals(c);
  assert.equal(c.state.jStep, B.save);
  assert.equal(v.jLine, '$3,000 a month. $36,000 a year.');
  assert.deepEqual([v.jSave.month, v.jSave.year, v.jSave.months.length], ['$3,000', '$36,000', 12]);
  assert.deepEqual([v.jNext.has, v.jNext.name], [true, 'AWS']);
  v.jNext.go();
  v = vals(c);
  assert.equal(c.state.jStep, B.source); assert.deepEqual(c.state.jDone, ['Azure']); assert.equal(c.state.jLive, false);
  assert.equal(v.jAct, 'Scan AWS'); assert.equal(v.jCloud.state, 'picking'); assert.equal(v.jHasDone, true);
  v.jActGo(); await new Promise(r => setTimeout(r, 2900));
  v = vals(c);
  assert.equal(v.jLine, 'AWS runs 54 workloads outside the AT&T network.');
  assert.equal(v.jCloud.name, 'AWS');
  assert.deepEqual(c.state.addedSources.map(a => a.provider).sort(), ['AWS', 'Azure'], 'Azure stays discovered');
  assert.equal(v.jVerdict, 'none', 'the earlier policy\'s stamps do not sit on a wire that is not there yet');
  // Open the dashboard: the home, with the estate changed.
  const d = placedAzure(); vals(d).jActGo(); vals(d).jActGo(); vals(d).jActGo(); vals(d).jActGo();
  assert.equal(vals(d).jAct, 'Open the dashboard');
  vals(d).jActGo();
  assert.equal(d.state.journey, null); assert.equal(d.state.screen, 's0');
});

test('Found again (2026-10-08, moved 2026-10-12): any known tag from a palette, and your own; Recommend: the picked option in full, in place', () => {
  const c = journey({ jStep: 2, addedSources: AZURE });
  let v = vals(c);
  const row = v.jRegions[0].apps[0];
  assert.equal(row.canAdd, true); assert.equal(v.jTagPalette.open, false);
  row.pick();
  v = vals(c);
  assert.equal(v.jTagPalette.open, true); assert.equal(v.jTagPalette.name, 'dispatch-svc');
  assert.ok(v.jTagPalette.tags.some(t => t.t === 'Finance') && v.jTagPalette.tags.some(t => t.t === 'Dev'), 'the known tags are on offer');
  v.jTagPalette.tags.find(t => t.t === 'Finance').go();
  v.jTagPalette.setText({ target: { value: 'Depot' } }); vals(c).jTagPalette.add();
  v = vals(c);
  assert.deepEqual(c.state.jTags['eastus:dispatch-svc'], ['Finance', 'Depot']);
  assert.ok(v.jRegions[0].apps[0].chips.find(x => x.t === 'Depot' && x.on), 'your own tag is a chip, on');
  assert.deepEqual(v.jRegions[0].apps[0].chips.map(x => x.t), ['Depot', 'Finance', 'Prod'], 'your own leads; the known tags keep their slots');
  assert.ok(!v.jTagPalette.tags.some(t => t.t === 'Finance'), 'an applied tag leaves the palette');
  v.jTagPalette.close();
  assert.equal(vals(c).jTagPalette.open, false);
  const r = journey({ jStep: B.recommend, addedSources: AZURE });
  let w = vals(r);
  assert.equal(w.jDetailOpen, false);
  w.toggleDetail();
  w = vals(r);
  assert.equal(w.jDetailOpen, true);
  assert.equal(w.jDetail.label, 'Your ExpressRoute');
  assert.deepEqual(w.jDetail.metrics.map(m => m.key), ['sec', 'perf', 'cost', 'setup', 'you']);
  assert.match(w.jDetail.metrics[2].words, /^Egress \$16,800 to/);
  assert.deepEqual(w.jDetail.products.map(p => [p.name, p.n]), [['NetBond Advanced', '2']]);
  assert.match(w.jDetail.youDo, /^Accept the connection/);
  assert.match(HTML, /<button class="js-more js-deeper" onClick="\{\{ toggleDetail \}\}" aria-expanded="\{\{ jDetailOpen \}\}">/);
  assert.match(HTML, /<sc-if value="\{\{ ap\.picking \}\}"[^>]*><div class="js-palette" role="group" aria-label="Tags for \{\{ ap\.name \}\}">/, 'the palette opens in the row it edits');
});

test('tags show where they do work: Found, Needs and Protect; the beats between carry the intent glyphs alone (2026-10-08, "lots of words still")', () => {
  const T = { 'eastus:dispatch-svc': ['Prod'], 'westeurope:payments-api': ['PCI', 'Prod'] };
  const chipsAt = (k, extra = {}) => vals(journey({ jStep: B[k], addedSources: AZURE, jTags: T, ...extra })).jRegions.flatMap(r => r.apps).flatMap(a => a.chips.map(c => c.t));
  assert.ok(chipsAt('found').includes('PCI')); assert.ok(chipsAt('intent').includes('PCI'));
  assert.deepEqual(chipsAt('recommend'), []); assert.deepEqual(chipsAt('connect', { jPick: 0 }), []);
});

test('the home offers the journey (2026-10-09): sites and no cloud read its first beat, and Find your clouds resumes at Source', () => {
  const c = mkC({ view: 'lastmile', estateParam: null, screen: 's0' });
  const v = vals(c);
  assert.equal(v.homeTake.head, 'AT&T already carries your 20 sites.');
  assert.equal(v.homeTake.cta, 'Find your clouds');
  assert.deepEqual(v.homeTake.parts.map(p => p.t), ['7 AVPN', '6 Ethernet', '3 Internet', '4 Fiber']);
  assert.ok(v.homeCards.every(k => !k.hasPill), 'a card with nothing to count wears no verdict');
  v.homeTake.go();
  assert.deepEqual([c.state.journey, c.state.screen, c.state.jStep], ['existing', 'sj', B.source]);
  assert.notEqual(vals(mkC({ view: 'partial', estateParam: null, screen: 's0' })).homeTake.key, 'journey', 'an estate with clouds keeps its own take-away');
});
