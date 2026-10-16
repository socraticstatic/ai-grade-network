import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import * as J from '../naas-journey.js';
import * as PJ from '../naas-portal-journey.js';
import { vals as pvals, defaults } from '../naas-portal-app.js';
import { mkC } from './harness.mjs';

// Micah, 2026-10-15: "what if i don't want to do western europe or us east? what if it's an or? re-assess both flows -
// mvp and normal." Both journeys treated a cloud's regions as an AND: the storefront's one move, order, Go live and
// saving spanned every region the scan found, and the portal pushed "Next: West Europe" and copied the answers into it.
// A region is its own choice now: connect one, the other, both one at a time, or neither.
if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const AZURE = [{ provider: 'Azure', estId: 'lastmile', name: 'Microsoft Azure subscription', cadence: 'daily', at: 1 }];
const B = Object.fromEntries(J.BEATS.map((b, i) => [b.key, i]));
const journey = (extra = {}) => mkC({ view: 'lastmile', estateParam: null, journey: 'existing', screen: 'sj', jStep: 0, addedSources: AZURE, ...extra });
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const PHTML = readFileSync(new URL('../portal.dc.html', import.meta.url), 'utf8');
const CSS = readFileSync(new URL('../storefront.css', import.meta.url), 'utf8');

// ---- The storefront journey ----
test('Found asks which region: the picker shows there, and the action names the one picked', () => {
  const c = journey({ jStep: B.found });
  let v = vals(c);
  assert.equal(v.jHasRegionPick, true, 'the choice is made where the regions are found');
  assert.equal(v.jAct, 'Say what eastus needs');
  v.jRegionPick[1].go(); v = vals(c);
  assert.equal(v.jAct, 'Say what westeurope needs');
});

test('the journey estate has a move per region, so a region is priced and ordered on its own', () => {
  const v = vals(journey({ jStep: B.recommend }));
  const az = v.moveList.filter(m => m.kind === 'region' && m.cloud === 'Azure');
  assert.deepEqual(az.map(m => m.regions).sort(), [['eastus'], ['westeurope']]);
  assert.ok(az.every(m => m.key === `region:Azure:${m.regions[0]}`), 'each region its own key, so an order claims only its own');
});

test('the recommendation, the order line and the money are for the picked region only', () => {
  const east = vals(journey({ jStep: B.recommend }));
  assert.equal(east.jRegionsWord, 'eastus');
  assert.match(east.jLine, /^Move Azure eastus onto AT&T\./);
  const west = vals(journey({ jStep: B.recommend, jRegion: 'westeurope' }));
  assert.equal(west.jRegionsWord, 'westeurope');
  assert.match(west.jLine, /^Move Azure westeurope onto AT&T\./);
  assert.notEqual(east.jMoney.before, west.jMoney.before, 'each region\'s own egress today');
  for (const l of [east.jLine, west.jLine]) assert.ok(l.split(' ').length <= 9, l);
});

const placeWest = () => { const c = journey({ jStep: B.connect, jRegion: 'westeurope' }); vals(c).jActGo(); vals(c).jActGo(); return c; };

test('ordering West Europe alone: the order carries West Europe, Go live lands West Europe, East US stays on the internet', () => {
  const c = placeWest();
  const o = c.state.orders.find(x => x.journey);
  assert.deepEqual(o.regions, ['westeurope']); assert.deepEqual(o.moveKeys, ['region:Azure:westeurope']);
  assert.equal(c.state.jStep, B.watch);
  vals(c).jActGo();
  const v = vals(c);
  assert.deepEqual(c.state.landed.map(e => e.region), ['westeurope']);
  assert.equal(v.jLine, 'Azure westeurope is live on AT&T.');
  assert.equal(v.jLink, 'connected');
  assert.equal(v.jNet, 'public', 'eastus still crosses the internet, so the path stays drawn');
  assert.deepEqual(v.jRegions.map(r => [r.region, r.state]), [['eastus', 'out'], ['westeurope', 'live']]);
});

test('Protect proposes policies for the region connected, never for the one left on the internet', () => {
  const c = placeWest(); vals(c).jActGo(); vals(c).jActGo();
  const v = vals(c);
  assert.equal(c.state.jStep, B.protect);
  const apps = [...new Set(v.jDeck.flatMap(d => d.apps))].sort();
  assert.deepEqual(apps, ['fin-ledger', 'payments-api'], 'westeurope\'s workloads only');
  assert.ok(!v.jDeck.some(d => d.tag === 'Internet-facing'), 'customer-portal runs in eastus, which was not connected');
  const intent = v.jDeck.find(d => d.intent);
  if (intent) assert.equal(intent.match, 'region westeurope');
});

test('after Save the other region is offered, never forced; taking it starts its own pass with no order', () => {
  const c = placeWest(); vals(c).jActGo(); vals(c).jActGo(); vals(c).jActGo();
  c.setState({ jStep: B.save });
  let v = vals(c);
  assert.equal(v.jAct, 'Open the dashboard', 'done is the primary');
  assert.equal(v.jNext.has, true); assert.equal(v.jNext.name, 'eastus'); assert.equal(v.jNext.kind, 'region');
  v.jNext.go(); v = vals(c);
  assert.equal(c.state.jRegion, 'eastus'); assert.equal(c.state.jStep, B.intent);
  assert.equal(v.jPlaced, false, 'the West Europe order is not claimed by East US');
  assert.equal(v.jRegionsWord, 'eastus', 'its own move');
  assert.equal(v.jLine, 'What does eastus need?');
});

test('picking another region after Recommend with no order for it goes back to its Needs', () => {
  const c = placeWest();
  vals(c).jRegionPick[0].go();
  assert.equal(c.state.jRegion, 'eastus'); assert.equal(c.state.jStep, B.intent);
  vals(c).jRegionPick[1].go();
  assert.equal(c.state.jRegion, 'westeurope'); assert.equal(c.state.jStep, B.intent, 'from Needs, a pick stays on Needs');
});

test('from Needs on, the region outside this pass folds to its head line; on Found both show their workloads to tag', () => {
  const found = vals(journey({ jStep: B.found }));
  assert.deepEqual(found.jRegions.map(r => r.pass), ['here', '']);
  const needs = vals(journey({ jStep: B.intent, jRegion: 'westeurope' }));
  assert.deepEqual(needs.jRegions.map(r => r.pass), ['other', 'here']);
  assert.match(CSS, /\.js-region\[data-pass="other"\] \.js-app\{display:none\}/);
});

test('the markup: each region card carries its state, and the next-region door rides the Save beat', () => {
  assert.match(HTML, /<div class="js-region" data-state="\{\{ rg\.state \}\}" data-pass="\{\{ rg\.pass \}\}">/);
  assert.match(HTML, /<span class="js-doors"><sc-for list="\{\{ jNexts \}\}"/, 'Save\'s two doors sit side by side in one cell');
  assert.match(CSS, /\.js-act>\.js-doors\{grid-area:1 \/ 3;justify-self:start;display:flex;/);
  assert.match(CSS, /\.js-region\[data-state="out"\]>\*\{opacity:\.5\}/);
  assert.match(HTML, /<sc-for list="\{\{ jNexts \}\}" as="jn"[^>]*><button class="js-more" onClick="\{\{ jn\.go \}\}">.*\{\{ jn\.word \}\}/);
});

// ---- The portal MVP journey ----
const EAST = 'Azure/eastus', WEST = 'Azure/westeurope';
const PB = Object.fromEntries(PJ.BEATS.map((b, i) => [b.key, i]));
const pC = (extra = {}) => { const state = { ...defaults(), ...extra }; return { state, setState: (p) => Object.assign(state, typeof p === 'function' ? p(state) : p) }; };
const portal = (extra = {}) => pC({ fixture: 'calloway', journey: true, jStep: PB.intent, jProv: 'Azure', jScan: 4, jRegion: EAST, ...extra });

test('portal: Found names the region the next step is for', () => {
  const c = portal({ jStep: PB.found });
  assert.equal(pvals(c).jr.act.label, 'Say what East US needs');
  c.setState({ jRegion: WEST });
  assert.equal(pvals(c).jr.act.label, 'Say what West Europe needs');
});

test('portal: answers stay with their region unless the customer copies them', () => {
  const c = portal({ intents: { [EAST]: { purpose: 'critical' } } });
  const v = pvals(c);
  assert.equal(v.jr.needs.copy.on, false, 'off until asked');
  v.jr.act.go();
  assert.equal(c.state.jStep, PB.recommend); assert.equal(c.state.intents[WEST], undefined);
  const d = portal({ intents: { [EAST]: { purpose: 'critical' } } });
  pvals(d).jr.needs.copy.toggle(); pvals(d).jr.act.go();
  assert.deepEqual(d.state.intents[WEST], { purpose: 'critical' }, 'copied when asked');
});

test('portal: after one request the journey can end; the other region is a choice beside it', () => {
  const c = portal({ jStep: PB.recommend });
  pvals(c).jr.act.go();
  assert.equal(c.state.jStep, PB.request); assert.equal(c.state.requests.length, 1);
  let v = pvals(c);
  assert.equal(v.jr.act.label, 'Open Cloud discovery', 'done is the primary');
  assert.equal(v.jr.also.has, true); assert.equal(v.jr.also.label, 'West Europe too');
  v.jr.also.go();
  assert.equal(c.state.jRegion, WEST); assert.equal(c.state.jStep, PB.intent);
  v = pvals(c); assert.equal(v.jr.also.has, false);
  assert.match(PHTML, /<sc-if value="\{\{ jr\.also\.has \}\}"[^>]*><button class="js-more" onClick="\{\{ jr\.also\.go \}\}"/);
});

test('only a live region\'s workloads blink live; a region left on the internet stays still', () => {
  assert.match(CSS, /\.js-region\[data-state="live"\] \.js-dot\{display:block;/);
  assert.doesNotMatch(CSS, /\.js-stage\[data-live="true"\] \.js-dot\{/, 'the whole stage no longer lights every app');
});

test('Recommended keeps the move you answered in front, though the answer re-ranks it below another region', () => {
  const c = mkC({ view: 'lastmile', estateParam: null, screen: 's3', layer: 'cloud', tab: 'connect', cnPage: 'options', addedSources: AZURE });
  let v = vals(c);
  assert.equal(v.moves[0].key, 'region:Azure:eastus');
  v.moves[0].intentQs.find(q => q.key === 'routing').opts.find(o => o.key === 'hub').go();
  assert.deepEqual(c.state.jIntents, { eastus: { routing: 'hub' } }, 'the answer is East US\'s');
  v = vals(c);
  assert.equal(v.moves[0].key, 'region:Azure:eastus', 'the hero stays on the move answered');
  assert.ok(v.moves[0].tiers.every(t => ['transit', 'peer', 'cloudwan', 'privatelink'].includes(t.way)), 'AT&T\'s hub: hosted ways only');
  assert.equal(v.movesPager.label, '2 of 2', 'it now ranks second, and says so');
  v.movesPager.prev();
  assert.equal(vals(c).moves[0].key, 'region:Azure:westeurope', 'the pager still walks the rest');
});

test('the Protect beat dives into the engine on a tag the customer applied, so the flow is real', () => {
  const c = journey({ jStep: B.connect, jPick: 0, jTags: { 'eastus:dispatch-svc': ['Prod'] } });
  vals(c).jActGo(); vals(c).jActGo(); vals(c).jActGo(); vals(c).jActGo();
  assert.equal(c.state.jStep, B.protect);
  vals(c).jEngineGo();
  assert.deepEqual([c.state.engFlow.to, c.state.engFlow.tag, vals(c).engWhatIf], ['Azure eastus', 'Prod', false]);
});

test('the intent card lights the region connected, not the one left on the internet', () => {
  const c = journey({ jStep: B.connect, jPick: 0, jIntent: { traffic: 'priority' } });
  vals(c).jActGo(); vals(c).jActGo(); vals(c).jActGo(); vals(c).jActGo();
  let v = vals(c);
  assert.equal(v.jDeck[0].tag, 'Intent'); assert.equal(v.jDeck[0].match, 'region eastus');
  v.jDeck[0].enter(); v = vals(c);
  assert.deepEqual(v.jRegions.map(r => [r.region, [...new Set(r.apps.map(a => a.hl))]]), [['eastus', ['on']], ['westeurope', ['off']]]);
});

test('portal: the page\'s own constructor starts with the copy off too, and its placeholder carries the side door', () => {
  const ctor = PHTML.slice(PHTML.indexOf('constructor(p)'), PHTML.indexOf('componentDidMount'));
  assert.match(ctor, /jCopy: false/);
  assert.equal(defaults().jCopy, false);
  const ph = PHTML.slice(PHTML.indexOf('renderVals()'), PHTML.indexOf('return this.app.vals(this)'));
  assert.match(ph, /also: \{ has: false \}/, 'the side door reads before the app loads');
});
