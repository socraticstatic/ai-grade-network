import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals, estateFor } from '../naas-app.js';
import { mkC } from './harness.mjs';
import { walkFlow } from './flow-walk.mjs';

// An order walked to Go live (2026-10-09), headless at 1440x900 on Growing: Recommended > AT&T's ExpressRoute > 1 Gbps >
// Advanced Settings > Terms > 12-month > Review > Place order > Go live. The walk found three pages past the fold and one
// list that crossed estates; scripts/fold.mjs now walks the same order on every estate (its order beat) and these pin
// the shapes that make the pages fit.
//   Review ran to 964px: the order summary and the selections stood side by side, the selections a column of nine rows.
//   After Go live the Pending actions banner stood over every Observe, Govern and Cost page: Traffic 1030px, Govern >
//   Layers 986px. Traffic has 3px to spare, so no band above a page can fit; the banner now stands only on Orders.
//   Connect > Orders listed every estate's orders but bandwidth changes.
//   Logs > User activity kept a Signals figure's flow explanation over it ("3 of 24 records carry it") and ran to 962px.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
if (typeof globalThis.requestAnimationFrame === 'undefined') globalThis.requestAnimationFrame = () => 0;
const store = {};
globalThis.localStorage = globalThis.localStorage || { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');

const on = (view, extra = {}) => mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'connect', cnPage: 'options', ...extra });

// Recommended > AT&T's ExpressRoute, then the flow to its Review, as the fold's order beat walks it.
function toReview(view = 'partial') {
  const c = on(view);
  const tier = vals(c).moves[0].tiers.find(t => t.label === "AT&T's ExpressRoute");
  assert.ok(tier, "Growing's first recommendation offers AT&T's ExpressRoute");
  tier.connect();
  assert.equal(c.state.screen, 's4');
  c.state.compose = walkFlow(c.state.compose, estateFor(c.state));
  return c;
}

test('Review: the order summary and your selections are two tabs in one slot, the summary first', () => {
  const c = toReview();
  let v = vals(c);
  assert.equal(v.cfIsReview, true);
  assert.deepEqual(v.cfRvTabs.map(t => [t.key, t.label, t.on]), [['summary', 'Order summary', true], ['picks', `Your selections · ${v.cfReviewRows.length}`, false]]);
  assert.deepEqual([v.cfRvSumVis, v.cfRvPickVis], ['visible', 'hidden']);
  assert.ok(v.cfReviewRows.length >= 8, 'every selection is still on Review, behind its tab');
  v.cfRvTabs[1].go();
  v = vals(c);
  assert.deepEqual([v.cfRvSumVis, v.cfRvPickVis, v.cfRvTabs[1].on], ['hidden', 'visible', true]);
  // Placing the order clears the pick, so the next order's Review opens on its summary.
  v.cfPlace();
  assert.equal(c.state.cfRvTab, null);
  assert.equal(c.state.cnPage, 'orders');
});

test('Review markup: tabs over one slot, both panels in its one cell, the selections three across', () => {
  const i = HTML.indexOf('{{ cfIsReview }}'), j = HTML.indexOf('{{ cfBack }}', i);
  const rv = HTML.slice(i, j);
  assert.match(rv, /role="tablist" aria-label="Review views"/);
  assert.match(rv, /<sc-for list="\{\{ cfRvTabs \}\}"/);
  const sum = rv.match(/<div role="tabpanel" aria-label="Order summary" style="([^"]*)"/), picks = rv.match(/<div role="tabpanel" aria-label="Your selections" style="([^"]*)"/);
  assert.ok(sum && picks, 'both tab panels are on Review');
  // One cell for both, the one not picked hidden: the slot keeps the taller panel's height and Place order holds still.
  for (const [m, vis] of [[sum, 'cfRvSumVis'], [picks, 'cfRvPickVis']]) { assert.match(m[1], /grid-area:1 \/ 1/); assert.ok(m[1].includes(`visibility:{{ ${vis} }}`)); }
  assert.match(picks[1], /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.doesNotMatch(rv, /grid-template-columns:112px minmax\(0,1fr\)/, 'the column of label-and-value rows is gone');
});

test('after Go live the pending banner stands on Connect > Orders only, with its stages, Observe and Dismiss', () => {
  const c = toReview();
  vals(c).cfPlace();
  // Placed, not yet live: the order's own row carries Go live; the banner is not on Orders twice over.
  assert.equal(vals(c).showPending, false);
  const row = vals(c).ordRows[0];
  assert.equal(row.canGoLive, true);
  row.goLive();
  let v = vals(c);
  assert.equal(v.ordRows[0].stage, 'Live');
  assert.equal(v.showPending, true, 'Orders carries the banner once the order is live');
  assert.deepEqual([v.landed, v.pendGoLive], [true, false], 'Observe, not Go live');
  assert.ok(v.pendingStages.length >= 3 && v.pendingStages.every(st => st.fill === 'var(--cta)'), 'every stage lit');
  for (const page of [{ tab: 'observe' }, { tab: 'govern' }, { tab: 'govern', govPanel: 'layers' }, { tab: 'cost' }, { tab: 'connect', cnPage: 'options' }, { tab: 'connect', cnPage: 'ways' }, { tab: 'connect', cnPage: 'picture' }]) {
    c.setState(page);
    assert.equal(vals(c).showPending, false, `the banner stands over ${JSON.stringify(page)}`);
  }
  c.setState({ tab: 'connect', cnPage: 'orders' });
  v = vals(c);
  // Observe: the banner's door when live goes to Observe and lands nothing twice.
  const landed = JSON.stringify(c.state.landed);
  v.deliverNow();
  assert.deepEqual([c.state.screen, c.state.tab, JSON.stringify(c.state.landed)], ['s3', 'observe', landed]);
  c.setState({ tab: 'connect', cnPage: 'orders' });
  vals(c).dismissPending();
  assert.equal(vals(c).showPending, false, 'Dismiss puts it away');
});

test('the banner markup sits under the Connect views, so on Orders it reads with the order it speaks for', () => {
  const tabs = HTML.indexOf('aria-label="Connect views"'), ban = HTML.indexOf('<sc-if value="{{ showPending }}"'), hero = HTML.indexOf('<!-- ===== THE FABRIC HERO');
  assert.ok(tabs > 0 && ban > tabs && ban < hero, 'Pending actions follows the Connect views and leads the hero');
  assert.equal(HTML.split('{{ showPending }}').length, 2, 'one banner');
  const sec = HTML.slice(ban, HTML.indexOf('</section>', ban));
  for (const b of ['{{ pendingStages }}', '{{ deliverNow }}', '{{ dismissPending }}', '{{ pendingTitle }}']) assert.ok(sec.includes(b), `${b} left the banner`);
});

test('Connect > Orders lists this estate\'s orders, and an older order that names none', () => {
  const o = (id, extra) => ({ id, title: id, what: 'x', monthly: '$1/mo', at: '09:00', stage: 'Submitted for approval', fromFlow: true, region: 'us-west-2', ...extra });
  const bw = (id, est) => ({ id, kind: 'bandwidth', est, title: id, stage: 'Scheduled', at: '09:00', approver: 'a', effectiveF: 'Oct 10', effectiveAt: Date.parse('2026-10-10T00:00:00Z') });
  const orders = [o('growing', { est: 'partial' }), o('bank', { est: 'trust' }), o('older'), bw('bw-bank', 'trust'), bw('bw-growing', 'partial')];
  const ids = (view) => vals(on(view, { cnPage: 'orders', orders })).ordRows.map(r => r.id);
  assert.deepEqual(ids('trust'), ['bw-bank', 'older', 'bank']);
  assert.deepEqual(ids('partial'), ['bw-growing', 'older', 'growing']);
  // An estate with none of its own reads as such: not another estate's order.
  const mature = vals(on('mature', { cnPage: 'orders', orders: [o('growing', { est: 'partial' })] }));
  assert.deepEqual([mature.hasOrdRows, mature.noOrders], [false, true]);
});

test('Logs: a Signals figure\'s explanation stands over Flow records, not over User activity', () => {
  const c = mkC({ view: 'partial', estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'insights', insPanel: 'signals', persona: 'neteng' });
  (vals(c).sigAll || []).find(x => x.key === 'talkers').all[0].figGo();
  assert.equal(vals(c).explainOn, true);
  c.setState({ logTab: 'user' });
  assert.equal(vals(c).explainOn, false, 'a flow explanation explains nothing about who changed the network');
  c.setState({ logTab: 'flow' });
  assert.equal(vals(c).explainOn, true, 'and it is still there on Flow records');
});
