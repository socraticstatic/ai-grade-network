import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import * as D from '../naas-data.js';
import * as J from '../naas-journey.js';
import { rightRoots } from '../naas-flowmap.js';
import { mkC } from './harness.mjs';

// The existing customer's journey (Micah, 2026-10-08: "an AT&T existing already last mile, they want to add a new
// source, they want to tag maybe attach, identify workloads maybe, see recommendations, and maybe upsell the customer
// with cloud connect ... story-based, and sequential, without too many words"; then: existing only for now, the beats
// replace the rail, a presenter drives it).
if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const journey = (extra = {}) => mkC({ view: 'lastmile', estateParam: null, journey: 'existing', screen: 'sj', jStep: 0, ...extra });
const AZURE = [{ provider: 'Azure', estId: 'lastmile', name: 'Microsoft Azure subscription', cadence: 'daily', at: 1 }];

test('the existing customer is AT&T sites with no cloud yet: Growing\'s sites on AT&T access, no IPsec, no tunnel', () => {
  const est = D.ESTATES.lastmile;
  assert.equal(est.sites.length, 20);
  assert.ok(est.sites.every(s => !/IPsec/i.test(s.access) && !s.tunnel && !s.tunnelTo));
  assert.deepEqual([est.regionsList.length, est.accounts.length, est.buckets.length, est.findings.length], [0, 0, 0, 0]);
  assert.ok(D.VIEWS.some(v => v.id === 'lastmile'));
});

test('the Customer dropdown opens the journey on its first beat, clean, and the beats replace the rail', () => {
  const c = mkC({ view: 'partial', estateParam: null, screen: 's0', addedSources: AZURE, orders: [{ id: 'o1', journey: true }] });
  vals(c).setJourney({ target: { value: 'existing' } });
  assert.equal(c.state.journey, 'existing'); assert.equal(c.state.view, 'lastmile'); assert.equal(c.state.screen, 'sj'); assert.equal(c.state.jStep, 0);
  assert.equal(c.state.addedSources.length, 0, 'a rehearsal\'s source is gone'); assert.equal(c.state.orders.length, 0, 'and its order');
  const v = vals(c);
  assert.equal(v.journeyOn, true);
  assert.deepEqual(v.railGroups.map(g => g.title), ['Existing customer']);
  assert.deepEqual(v.railGroups[0].items.map(i => i.label), ['1  Today', '2  Add a source', '3  What it found', '4  Tag', '5  Recommendation', '6  Connect']);
  assert.deepEqual(v.railGroups[0].items.map(i => i.op), [1, 1, 0.4, 0.4, 0.4, 0.4], 'a beat opens once the one it needs is done');
  assert.equal(v.showPageTitle, false);
  v.setJourney({ target: { value: '' } });
  assert.equal(c.state.journey, null); assert.equal(c.state.screen, 's0');
});

test('beat 1 says what AT&T carries: 20 sites by the access AT&T sells, and no cloud', () => {
  const v = vals(journey());
  assert.equal(v.jBeat.title, 'Your network on AT&T');
  assert.equal(v.jToday.sitesF, '20');
  assert.deepEqual(v.jToday.groups.map(g => g.label), ['AVPN', 'Ethernet', 'Internet', 'Fiber']);
  assert.equal(v.jToday.groups.reduce((a, g) => a + g.n, 0), 20);
  assert.equal(v.jToday.cloudWord, 'Not connected');
  assert.equal(v.jNextLabel, 'Add a cloud source');
});

test('beat 2 reads Azure with a read-only role; the scan adds the source and lands on what it found', async () => {
  const c = journey({ jStep: 1 });
  let v = vals(c);
  assert.deepEqual(v.jProviders.filter(p => !p.off).map(p => p.key), ['Azure'], 'the demo reads Azure');
  assert.equal(v.jCred, 'Reader role on the subscription');
  assert.equal(v.jNextLabel, 'Connect and scan');
  v.jNext();
  assert.equal(c.state.jScan, 0);
  assert.equal(vals(c).jScanning, true);
  assert.equal(vals(c).jNextOff, true, 'Next waits while it scans');
  await new Promise(r => setTimeout(r, 2900));
  assert.equal(c.state.jStep, 2);
  assert.deepEqual(c.state.addedSources.map(a => [a.provider, a.estId]), [['Azure', 'lastmile']]);
});

test('beat 3 shows what it found: two Azure regions, 68 workloads, four apps, all on the public internet', () => {
  const v = vals(journey({ jStep: 2, addedSources: AZURE }));
  assert.deepEqual(v.jFound.regions.map(r => [r.region, r.wl, r.ms]), [['eastus', 40, 64], ['westeurope', 28, 102]]);
  assert.equal(v.jFound.wlF, '68'); assert.equal(v.jFound.appsF, '4'); assert.equal(v.jFound.publicN, 2);
  assert.deepEqual(v.jFound.regions[1].apps.map(a => a.name), ['payments-api', 'fin-ledger']);
});

test('beat 4 suggests tags by what a workload is; applied tags join the estate, and never suggest themselves to siblings', async () => {
  const c = journey({ jStep: 3, addedSources: AZURE });
  let v = vals(c);
  const sug = Object.fromEntries(v.jTagRows.map(r => [r.name, r.suggested]));
  assert.deepEqual(sug['payments-api'], ['PCI', 'Prod', 'Finance']);
  assert.deepEqual(sug['customer-portal'], ['Internet-facing', 'Prod']);
  assert.deepEqual(sug['dispatch-svc'], ['Prod']);
  v.jApplyAll();
  v = vals(c);
  assert.equal(v.jTagsDone, true);
  assert.deepEqual(vals(c).jTagRows.find(r => r.name === 'dispatch-svc').suggested, ['Prod'], 'the portal\'s Internet-facing stays the portal\'s');
  // The estate reads them: westeurope carries PCI now, which it did not before the tags.
  const before = vals(journey({ jStep: 4, addedSources: AZURE })).jMoves[0].foundTags.map(t => t.t);
  assert.ok(!before.includes('PCI'), before.join(','));
  const { estateFor } = await import('../naas-app.js');
  const est = estateFor({ view: 'lastmile', estateParam: null, addedSources: AZURE, jTags: c.state.jTags });
  assert.ok(est.regionsList.find(r => r.region === 'westeurope').tags.includes('PCI'));
});

test('beat 5 is the recommendation for the cloud it found: Azure\'s three ways, each scored; Choose picks it for beat 6', () => {
  const c = journey({ jStep: 4, addedSources: AZURE });
  const v = vals(c);
  assert.equal(v.jHasMove, true);
  assert.deepEqual(v.jMoves[0].tiers.map(t => t.label), ['Your ExpressRoute', "AT&T's ExpressRoute", 'Hosted VNet peering']);
  assert.ok(v.jMoves[0].tiers.every(t => t.hasPts && t.ctaWord === 'Choose'));
  v.jMoves[0].tiers[1].connect();
  assert.equal(c.state.jPick, 1); assert.equal(c.state.jStep, 5);
});

test('beat 6 orders the pick: its lines, its monthly, Place order; the order is a real one, and its phases follow', () => {
  const c = journey({ jStep: 5, jPick: 1, addedSources: AZURE });
  let v = vals(c);
  assert.equal(v.jBeat.title, 'Connect to Azure');
  assert.deepEqual(v.jLines.map(l => [l.name, l.n, l.v]), [['NetBond for Cloud', 2, '$3,800/mo'], ['Cloud port, AT&T-provided', 2, '$600/mo']]);
  assert.equal(v.jTotal, '$4,400/mo');
  assert.equal(v.jNextLabel, 'Place order');
  v.jNext();
  v = vals(c);
  assert.equal(v.jPlaced, true);
  const o = c.state.orders.find(x => x.journey);
  assert.equal(o.stage, 'Submitted for approval'); assert.deepEqual(o.moveKeys, ['region:Azure']); assert.equal(o.way, 'att');
  assert.deepEqual(v.jPhases.map(p => [p.label, p.state]), [['Ordered', 'ok'], ['Provision', 'set'], ['Live', 'any'], ['Insight', 'any']]);
  assert.equal(v.jNextLabel, 'Open Orders');
  v.jNext();
  assert.equal(c.state.journey, null); assert.equal(c.state.cnPage, 'orders');
  assert.ok(vals(c).ordRows.some(r => /AT&T's ExpressRoute/.test(r.title)), 'Orders lists it in the dashboard');
});

test('a hosted pick adds the hub, priced at review', () => {
  const v = vals(journey({ jStep: 5, jPick: 2, addedSources: AZURE }));
  assert.deepEqual(v.jLines.map(l => l.name), ['AT&T cloud on-ramp into the hosted hub, 1 Gbps', 'Cross-AZ peering into your VPC or VNet', 'AT&T hosted hub: vSRX and compute']);
  assert.equal(v.jLines[2].v, 'At review');
  assert.match(v.jTotal, / \+ hub$/);
});

test('before a cloud is discovered, the map lands its cloud traffic on Clouds not yet discovered, so it still adds up', () => {
  const col = (v, side) => v.mapNodes.filter(n => n.side === side).reduce((a, n) => a + n.v, 0);
  const v = vals(mkC({ view: 'lastmile', estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', obTab: 'flow' }));
  const unknown = v.mapNodes.find(n => n.side === 'r' && n.name === 'Clouds not yet discovered');
  assert.ok(unknown && unknown.v > 30, 'most of the sites\' traffic is bound for clouds AT&T cannot name yet');
  assert.ok(Math.abs(col(v, 'l') - col(v, 'r')) < 1e-6, `left ${col(v, 'l')} right ${col(v, 'r')}`);
  // Once the source names them, the regions take it.
  const after = vals(mkC({ view: 'lastmile', estateParam: null, addedSources: AZURE, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', obTab: 'flow' }));
  assert.ok(!after.mapNodes.some(n => n.name === 'Clouds not yet discovered'));
  assert.equal(rightRoots(D.ESTATES.partial, []).some(n => n.key === 'cloud:unknown'), false, 'an estate with clouds never draws it');
});

test('?journey=existing opens the journey; the markup draws a beat per sc-if and the rail foot the Customer dropdown', () => {
  assert.match(HTML, /<select value="\{\{ journeyValue \}\}" onChange="\{\{ setJourney \}\}" aria-label="Customer"/);
  assert.match(HTML, /<option value="new" disabled="true">New customer · next<\/option>/);
  for (const k of ['jIsToday', 'jIsSource', 'jIsFound', 'jIsTag', 'jIsRec', 'jIsConnect']) assert.match(HTML, new RegExp(`<sc-if value="\\{\\{ ${k} \\}\\}"`), k);
  assert.match(HTML, /<button class="jr-next" onClick="\{\{ jNext \}\}" disabled="\{\{ jNextOff \}\}">/);
  assert.match(HTML, /<sc-for list="\{\{ jMoves \}\}" as="mv"[^>]*>\s*<section class="rec-hero" aria-label="\{\{ mv\.title \}\}" data-journey="true">/);
  assert.deepEqual(J.BEATS.map(b => b.key), ['today', 'source', 'found', 'tag', 'recommend', 'connect']);
});
