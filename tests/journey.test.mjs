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
    // A region at a time since 2026-10-15 ("what if it's an or?"): the lines name the region the pass is about.
    'What does eastus need?', 'Move Azure eastus onto AT&T. Save $4,688 a month.', 'Connect Azure eastus with Your ExpressRoute.']);
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
  assert.deepEqual(v.jRegions.map(r => [r.region, r.wlF]), [['eastus', '40'], ['westeurope', '28']]);
  assert.ok(v.jRegions.every(r => !('msF' in r)), 'a region is never timed (2026-10-15)');
  assert.deepEqual(v.jRegions[1].apps.map(a => a.name), ['payments-api', 'fin-ledger']);
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
  assert.equal(v.jAct, 'Say what eastus needs', 'the primary moves on, naming the region picked; tagging is optional');
  assert.equal(v.jTagRest.has, true); v.jTagRest.go();
  v = vals(c);
  assert.equal(v.jTagRest.has, false, 'every suggestion is on'); assert.equal(v.jAct, 'Say what eastus needs');
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
  // East US alone (2026-10-15): $9,882 today against $3,294 at the AT&T rate, less one port a way. The cloud's finding once
  // took the ports off too, so they came off twice ($2,453, $2,153, $119); it now saves the bucket's premium (landed-egress).
  assert.deepEqual(v.jOptions.map(o => o.delta), ['saves $4,688', 'saves $4,388', 'saves $2,354']);
  assert.ok(v.jOptions.every(o => o.hasPts));
  assert.equal(v.jLink, 'proposed'); assert.equal(v.jLinkWord, 'Your ExpressRoute');
  v.jOptions[1].go();
  v = vals(c);
  assert.equal(v.jLine, 'Move Azure eastus onto AT&T. Save $4,388 a month.');
  assert.equal(v.jAct, "Choose AT&T's ExpressRoute");
  v.jActGo();
  assert.equal(c.state.jStep, B.connect); assert.equal(c.state.jPick, 1);
});

test('beat 7: one line of the order, Place order; then the line is AT&T\'s, the internet path fades, and the phases follow', () => {
  const c = journey({ jStep: B.connect, jPick: 1, addedSources: AZURE });
  let v = vals(c);
  // One region, one port of each (2026-10-15: the order is for the region picked, not the cloud).
  assert.deepEqual(v.jLines.map(l => [l.name, l.n, l.v]), [['NetBond Advanced', 1, '$1,900/mo'], ['Cloud port, AT&T-provided', 1, '$300/mo']]);
  assert.equal(v.jTotal, '$2,200/mo'); assert.equal(v.jRegionsWord, 'eastus');
  assert.equal(v.jAct, 'Place order');
  v.jActGo();
  v = vals(c);
  assert.equal(v.jPlaced, true);
  assert.equal(v.jLine, 'Ordered. AT&T is provisioning it.');
  // Ordered is not live: the way stays proposed and the traffic on the internet until Go live (the Watch beat's picture).
  assert.equal(v.jLink, 'proposed'); assert.equal(v.jNet, 'public'); assert.equal(v.jFlow, 'net');
  const o = c.state.orders.find(x => x.journey);
  assert.equal(o.stage, 'Submitted for approval'); assert.deepEqual(o.moveKeys, ['region:Azure:eastus']); assert.deepEqual(o.regions, ['eastus']); assert.equal(o.way, 'att');
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

// No wire is timed since 2026-10-15 ("we can't measure that"): the picture carries the money and the traffic only.
test('the picture carries the figures (2026-10-08): the monthly before and after, the traffic on the path it rides; no wire is timed', () => {
  const found = vals(journey({ jStep: 2, addedSources: AZURE }));
  assert.equal(found.jNetMs, undefined); assert.equal(found.jFlow, 'net'); assert.equal(found.jMoney.has, false);
  const rec = vals(journey({ jStep: B.recommend, addedSources: AZURE }));
  for (const k of ['jLinkMs', 'jLinkDrop', 'jLinkHasDrop', 'jLinkHasMs']) assert.equal(rec[k], undefined, k);
  assert.doesNotMatch(HTML, /jLinkMs|jLinkDrop|jLinkHasMs|js-ms/);
  assert.deepEqual([rec.jMoney.has, rec.jMoney.before, rec.jMoney.after, rec.jMoney.up], [true, '$9,882/mo', '$5,194/mo', false], 'East US\'s own egress at the AT&T rate plus its port (2026-10-15)');
  // AWS eu-west-1's hosted way costs more than its $3,800 of egress (2026-10-15: each region priced alone, the ports counted
  // once; no Azure way is dearer than today any more).
  const hosted = vals(journey({ jStep: B.recommend, jPick: 2, jProv: 'AWS', jRegion: 'eu-west-1', addedSources: [{ provider: 'AWS', estId: 'lastmile', name: 'AWS account', cadence: 'daily', at: 1 }] }));
  assert.deepEqual([hosted.jMoney.before, hosted.jMoney.after], ['$3,800/mo', '$5,534/mo']);
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

// Go live lands the region ordered, never the cloud (2026-10-15, "what if it's an or?"): West Europe stays on the internet.
test('beat 7: Go live lands the region ordered; its apps blink green; the internet path stays for the region left on it; every page reads it private', () => {
  const c = placedAzure();
  let v = vals(c);
  assert.equal(c.state.jStep, B.watch); assert.equal(v.jLine, 'Provisioning.'); assert.equal(v.jAct, 'Go live');
  v.jActGo();
  v = vals(c);
  assert.deepEqual(c.state.landed.map(e => [e.est, e.region, e.order]), [['lastmile', 'eastus', 'o1']], 'landed on the journey estate, for its order, East US alone');
  assert.equal(v.jLine, 'Azure eastus is live on AT&T.'); assert.equal(v.jNet, 'public', 'westeurope still crosses the internet'); assert.equal(v.jLink, 'connected'); assert.equal(v.jLive, true);
  assert.deepEqual(v.jRegions.map(r => r.state), ['live', 'out']);
  assert.deepEqual(v.jPhases.map(p => p.state), ['done', 'done', 'done', 'set'], 'one lifecycle: finished phases are done, the stepper\'s blue');
  assert.match(HTML, /<sc-if value="\{\{ jIsWatch \}\}"[^>]*><div class="js-order"><div class="ps big js-phases"/, 'the phases tick on the Watch beat itself');
  assert.match(HTML, /\.ps \[data-state="done"\] i\{border-color:var\(--cta\)/, 'done reads blue, as the stepper does, on every phase strip');
  assert.match(HTML, /\.ps \[data-state="ok"\] i\{border-color:var\(--success\)/, 'health keeps its green');
  assert.equal(v.jHealth.length, 4);
  // The figures survive the move leaving the ranked list: the order snapshotted them at Place.
  assert.equal(v.jMoney.after, '$5,494/mo', 'East US with AT&T\'s ExpressRoute: $3,294 + $2,200');
  // One lifecycle (2026-10-09): Orders reads the journey's Go live; it once still said Submitted for approval.
  const ord = vals(mkC({ ...c.state, journey: null, screen: 's3', layer: 'cloud', tab: 'connect', cnPage: 'orders' })).ordRows.find(r => r.journey);
  assert.equal(ord.stage, 'Live'); assert.equal(ord.canGoLive, false);
  const home = vals(mkC({ ...c.state, journey: null, screen: 's0' }));
  assert.ok(home.homeCards.find(x => x.key === 'onatt').big === '1', 'the home counts the one region private');
});

// The deck is the region's (2026-10-15, "what if it's an or?"): East US's workloads carry Internet-facing and Prod, West
// Europe's PCI, Finance and Prod; a pass never proposes a policy for a region it did not connect.
test('beat 8: a deck of policies from the region\'s tags, each a real intent with the engine\'s verdicts; hover previews, click enforces, all at once or one by one', () => {
  const c = placedAzure(); vals(c).jActGo(); vals(c).jActGo();
  let v = vals(c);
  assert.equal(c.state.jStep, B.protect);
  assert.deepEqual(v.jDeck.map(d => [d.tag, d.req, d.cloudV, d.netV]), [['Internet-facing', 'Inline security inspection', 'Allowed', 'Allowed'], ['Prod', 'No direct internet path', 'Allowed', 'Denied']]);
  assert.deepEqual(v.jDeck.map(d => d.apps), [['customer-portal'], ['dispatch-svc', 'customer-portal']]);
  assert.equal(v.jLine, '2 policies from your tags. Enforce them.'); assert.equal(v.jAct, 'Enforce them all'); assert.equal(v.jVerdict, 'none');
  // Each card is NetBond's sheet for its intent: the verb, the rule, the direction (2026-10-08).
  assert.deepEqual(v.jDeck[0].rules.map(r => [r.verb, r.label, r.dir]), [['Manipulate', 'CV tagging', '→'], ['Manipulate', 'Tag by CV', '←']]);
  // Short on the deck, the whole of it in the title (2026-10-08: "lots of words still").
  assert.equal(v.jDeckWhere, 'NetBond Advanced route policy'); assert.match(v.jDeckWhereTitle, /^Enforced as route policy on NetBond Advanced/); assert.equal(v.jDeckNba, true);
  assert.deepEqual(v.jDeck.map(d => d.reqWord), ['Inspected', 'No internet']);
  // On a NetBond way, no card lists a vSRX: a card NetBond carries no rule for shows the site and the cloud (2026-10-09).
  assert.ok(v.jDeck.every(d => d.rules.every(r => !/vSRX/i.test(r.title))), 'no hosted hub is invented under the NetBond header');
  assert.deepEqual(v.jDeck.find(d => d.tag === 'Prod').rules.map(r => [r.verb, r.label]), [['Deny', 'Local breakout'], ['Allow', '0/0 via AT&T']]);
  // A hosted pick enforces on the vSRX in AT&T's hub and the cloud's route tables (the deck, slide 5), not as BGP route rules.
  const h = journey({ jStep: B.connect, jPick: 2, addedSources: AZURE }); vals(h).jActGo(); vals(h).jActGo(); vals(h).jActGo(); vals(h).jActGo();
  const hv = vals(h);
  assert.equal(hv.jDeckHosted, true); assert.equal(hv.jDeckWhere, 'vSRX and your route tables'); assert.match(hv.jDeckWhereTitle, /^Enforced on the vSRX in AT&T's hub/);
  assert.deepEqual(hv.jDeck[0].rules.map(r => [r.verb, r.label]), [['Inspect', 'vSRX, L3 to L7'], ['Route', 'Route tables']]);
  assert.match(HTML, /<span class="js-rule" title="\{\{ rr\.title \}\}"><span class="fw-badge \{\{ rr\.cls \}\}">\{\{ rr\.verb \}\}<\/span>/);
  assert.match(HTML, /<div class="js-deckkey"/);
  // Hover previews: the stamps take that card's verdicts, dashed; the apps it covers light, the rest dim.
  v.jDeck[0].enter();
  v = vals(c);
  assert.equal(v.jVerdict, 'preview'); assert.deepEqual([v.jStampCloud, v.jStampNet], ['Allowed', 'Allowed']);
  assert.deepEqual(v.jRegions[0].apps.map(a => [a.name, a.hl]), [['dispatch-svc', 'off'], ['customer-portal', 'on']]);
  assert.equal(v.jLine, 'Internet-facing is inspected in path.');
  v.jDeck[0].leave();
  // West Europe's own pass: its PCI, Finance and Prod cards.
  const w = journey({ jStep: B.connect, jPick: 1, jRegion: 'westeurope', addedSources: AZURE }); vals(w).jActGo(); vals(w).jActGo(); vals(w).jActGo(); vals(w).jActGo();
  v = vals(w);
  assert.equal(w.state.jStep, B.protect);
  assert.deepEqual(v.jDeck.map(d => [d.tag, d.req, d.cloudV, d.netV]), [['PCI', 'Private path required', 'Allowed', 'Denied'], ['Finance', 'Private path required', 'Allowed', 'Denied'], ['Prod', 'No direct internet path', 'Allowed', 'Denied']]);
  assert.deepEqual(v.jDeck.map(d => d.apps), [['payments-api'], ['payments-api', 'fin-ledger'], ['payments-api', 'fin-ledger']]);
  // A private path allows the matching routes both ways; blocking the default route is NetBond's own baseline (2026-10-09).
  assert.deepEqual(v.jDeck[0].rules.map(r => [r.verb, r.label, r.dir]), [['Allow', 'Matching routes', '⇄']]);
  assert.equal(v.jDeck[0].rules[0].dirWord, 'both ways');
  assert.match(v.jDeck[0].rules[0].title, /^Allow matching routes, both ways$/);
  // One at a time.
  vals(w).jDeck[0].go();
  v = vals(w);
  assert.deepEqual(v.jDeck.map(d => d.on), [true, false, false]);
  assert.equal(v.jLine, '1 of 3 enforced. 14 workloads never touch the internet.');
  assert.equal(v.jVerdict, 'enforced'); assert.deepEqual([v.jStampCloud, v.jStampNet], ['Allowed', 'Denied']);
  assert.deepEqual([v.jDeckRest.has, v.jDeckRest.n, v.jAct], [true, '2', 'See what it saves']);
  const pol = w.state.customPolicies.find(p => p.journey);
  assert.deepEqual([pol.name, pol.match, pol.req, pol.state, pol.cloud, pol.tag], ['PCI private path', 'tag PCI', 'Private path required', 'enforced', 'Azure', 'PCI']);
  assert.ok(vals(mkC({ ...w.state, journey: null, screen: 's3', layer: 'cloud', tab: 'govern', govPanel: 'policies' })).polRows.some(r => r.name === 'PCI private path'), 'Govern lists it');
  // The rest at once.
  v.jDeckRest.go();
  v = vals(w);
  assert.ok(v.jDeck.every(d => d.on)); assert.equal(v.jDeckRest.has, false);
  assert.equal(v.jLine, 'All 3 enforced. 28 workloads never touch the internet.');
  assert.equal(w.state.customPolicies.filter(p => p.journey).length, 3);
  assert.match(HTML, /<button role="listitem" class="js-pcard" data-on="\{\{ pd\.on \}\}" data-hover="\{\{ pd\.hover \}\}" onClick="\{\{ pd\.go \}\}" onMouseEnter="\{\{ pd\.enter \}\}" onMouseLeave="\{\{ pd\.leave \}\}"/);
});

// Save offers both doors (2026-10-15): the cloud's region not yet ordered, and the next cloud. Neither is forced.
test('beat 9: the saving a month and a year; Connect westeurope and Attach AWS beside it; Attach AWS loops to the source with Azure done; Open the dashboard lands home', async () => {
  const c = placedAzure(); vals(c).jActGo(); vals(c).jActGo(); vals(c).jActGo(); vals(c).jActGo();
  let v = vals(c);
  assert.equal(c.state.jStep, B.save);
  assert.equal(v.jLine, '$4,388 a month. $52,656 a year.');
  assert.deepEqual([v.jSave.month, v.jSave.year, v.jSave.months.length], ['$4,388', '$52,656', 12]);
  assert.deepEqual(v.jNexts.map(n => [n.kind, n.word]), [['region', 'Connect westeurope'], ['cloud', 'Attach AWS']]);
  v.jNexts[1].go();
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
  assert.match(w.jDetail.metrics[2].words, /^Egress \$9,882 to/, 'East US\'s egress');
  assert.deepEqual(w.jDetail.products.map(p => [p.name, p.n]), [['NetBond Advanced', '1']]);
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
