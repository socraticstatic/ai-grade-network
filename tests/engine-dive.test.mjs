import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';
import * as J from '../naas-journey.js';

// Into the policy engine from the flows, without losing one's place (Micah, 2026-10-09: "the simple policy options
// should have a link somewhere, without losing one's place in the flow, to dive into the new policy engine"). The
// wizard's Advanced Settings and the journey's Protect beat each open Govern > Policy engine on their own flow, with
// what was picked read in as a staged policy, and Back returns to the very step.
if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
if (typeof globalThis.requestAnimationFrame === 'undefined') globalThis.requestAnimationFrame = () => 0;
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const B = Object.fromEntries(J.BEATS.map((b, i) => [b.key, i]));
const AZURE = [{ provider: 'Azure', estId: 'lastmile', name: 'Microsoft Azure subscription', cadence: 'daily', at: 1 }];

const advanced = () => {
  const c = mkC({ view: 'partial', estateParam: null, screen: 's3', layer: 'cloud', tab: 'connect', cnPage: 'options' });
  vals(c).moveList.find(m => m.key === 'region:Azure').attach();
  vals(c).cfBandwidths.find(b => b.label === '1 Gbps').pick();
  vals(c).cfNext();
  assert.equal(vals(c).cfKey, 'advanced');
  return c;
};

test('Advanced Settings dives into the engine on this order, its picks read in as "Your order", and Back returns to the step', () => {
  const c = advanced(), before = JSON.stringify(c.state.compose);
  vals(c).cfEngineGo();
  let v = vals(c);
  assert.deepEqual([c.state.screen, c.state.tab, c.state.govPanel], ['s3', 'govern', 'engine']);
  assert.equal(c.state.engFlow.to, 'Azure westeurope');
  assert.equal(v.engPickers[1].value, 'Azure westeurope', 'the picker opens on the order\'s region');
  const yours = v.engLadder.find(r => r.name === 'Your order');
  assert.ok(yours, 'the order\'s picks are on the ladder');
  assert.equal(v.engStaged, true, 'read as staged: a what-if before the order is placed');
  assert.deepEqual([v.backOn, v.backLabel], [true, 'Back to your order']);
  // The order is not placed: the engine reads its region as the order would land it (NetBond), and says so in its head.
  assert.equal(v.engHeadChips[0].key, 'dive'); assert.match(v.engHeadChips[0].title, /^Azure westeurope reads as your order would land it, on NetBond on AT&T\. Nothing is placed yet/);
  assert.deepEqual(v.engStations.map(x => x.stampWord), ['Holds', 'Holds', 'Holds', 'Violated'], 'the order closes the path; six exposed workloads still break it in the cloud');
  // The estate itself is untouched: Discover still reads westeurope public.
  assert.equal(vals(c).allRegions.find(r => r.region === 'westeurope').priv, false);
  // Layers reads it too.
  c.setState({ govPanel: 'layers' });
  assert.ok(vals(c).layCols.flatMap(col => col.bands.flatMap(b => b.rows)).some(r => r.sub === 'Your order'));
  // Back: the same step, the same order in progress, the staged switch as it was, the preview gone.
  vals(c).goBack();
  v = vals(c);
  assert.equal(c.state.screen, 's4'); assert.equal(v.cfKey, 'advanced');
  assert.equal(JSON.stringify(c.state.compose), before, 'nothing about the order in progress moved');
  assert.deepEqual([c.state.engReturn, c.state.engStaged], [null, false]);
});

test('the journey\'s Protect beat dives in with its cards not yet enforced, and Back returns to the beat', () => {
  // West Europe's pass (a region at a time since 2026-10-15): its PCI card leads the deck.
  const c = mkC({ view: 'lastmile', estateParam: null, journey: 'existing', screen: 'sj', addedSources: AZURE, jStep: B.connect, jPick: 0, jRegion: 'westeurope', jTags: { 'eastus:dispatch-svc': ['Prod'], 'westeurope:payments-api': ['PCI', 'Prod'] } });
  vals(c).jActGo(); vals(c).jActGo(); vals(c).jActGo(); vals(c).jActGo();
  assert.equal(c.state.jStep, B.protect);
  const deck = vals(c).jDeck.map(d => d.name);
  vals(c).jEngineGo();
  const v = vals(c);
  assert.deepEqual([c.state.screen, c.state.govPanel, v.backLabel], ['s3', 'engine', 'Back to the journey']);
  assert.equal(v.journeyOn, false, 'the journey\'s stage steps aside so the engine has the page');
  assert.deepEqual([c.state.engFlow.to, c.state.engFlow.tag, v.engWhatIf], ['Azure westeurope', 'PCI', false], 'it opens where the first card\'s workloads sit');
  const staged = v.engLadder.map(r => r.name);
  for (const n of deck) assert.ok(staged.includes(n), `${n} is read in`);
  vals(c).goBack();
  assert.deepEqual([c.state.screen, c.state.jStep, c.state.engReturn, c.state.journey], ['sj', B.protect, null, 'existing']);
});

test('any other way out drops the return, so the preview never lingers in Govern', () => {
  const c = advanced();
  vals(c).cfEngineGo();
  vals(c).goHome();
  assert.equal(c.state.engReturn, null);
  c.setState({ screen: 's3', layer: 'cloud', tab: 'govern', govPanel: 'engine' });
  const v = vals(c);
  assert.ok(!v.engLadder.some(r => r.name === 'Your order'));
  assert.notEqual(v.backLabel, 'Back to your order');
});

test('the markup: a link beside each set of simple policy options', () => {
  assert.match(HTML, /<button class="rec-link cf-eng" onClick="\{\{ cfEngineGo \}\}" title="\{\{ cfEngineTitle \}\}">/);
  assert.match(HTML, /<button class="rec-link js-deckeng" onClick="\{\{ jEngineGo \}\}" title="\{\{ jEngineTitle \}\}">/);
  assert.match(HTML, /engReturn: null/);
});
