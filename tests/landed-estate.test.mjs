import test from 'node:test';
import assert from 'node:assert/strict';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';
import * as D from '../naas-data.js';
import * as W from '../naas-ways.js';
import * as J from '../naas-journey.js';

// Landed regions, honest per estate (2026-10-09, found while building the policy engine's Layers tab). A landing names
// its estate and its order, and leaves the region as that order attaches it: private on NetBond or the hosted hub's
// on-ramp for a named way, on the cloud's own port for Interconnect - Last Mile, still public for Internet to Cloud.
// Landing us-west-2 on Growing once landed it on Bank scale and Established too, and every landing read "Hosted VPC".
if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
if (typeof globalThis.requestAnimationFrame === 'undefined') globalThis.requestAnimationFrame = () => 0;
const order = (o) => ({ id: 'o1', title: 'x', what: 'x', monthly: '$1/mo', at: '09:00', stage: 'Submitted for approval', fromFlow: true, region: 'us-west-2', est: 'partial', ...o });
// The order is the estate's it is placed on (2026-10-09: Orders once listed every estate's orders, so Established's
// "already attached" case went live with Growing's order and landed it on Growing).
const orders = (view, o) => mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'connect', cnPage: 'orders', orders: [order({ est: view, ...o })] });
const reg = (c, id) => vals(c).allRegions.find(r => r.region === id);
const goLive = (c) => { const row = vals(c).ordRows[0]; assert.equal(row.canGoLive, true); row.goLive(); };

test('a landing stays on its estate: Growing\'s us-west-2 lands, Bank scale\'s and Established\'s do not move', () => {
  const c = orders('partial', { type: 'DataCenter/CoLocation to Cloud', way: 'byo' });
  goLive(c);
  assert.deepEqual(c.state.landed, [{ est: 'partial', region: 'us-west-2', order: 'o1' }]);
  assert.deepEqual([reg(c, 'us-west-2').priv, reg(c, 'us-west-2').ramp, reg(c, 'us-west-2').way], [true, 'NetBond', 'netbond']);
  c.setState({ view: 'trust' });
  assert.deepEqual([reg(c, 'us-west-2').priv, !!reg(c, 'us-west-2').landed], [false, false], 'Bank scale\'s us-west-2 is still public');
  c.setState({ view: 'mature' });
  const raw = D.ESTATES.mature.regionsList.find(r => r.region === 'us-west-2');
  assert.deepEqual([reg(c, 'us-west-2').ramp, !!reg(c, 'us-west-2').landed], [raw.ramp, false], 'Established keeps its own Direct Connect');
  // Its order reads Live on Growing, and never on another estate's Orders.
  c.setState({ view: 'partial' });
  assert.equal(vals(c).ordRows[0].stage, 'Live');
});

test('what the order attached is what lands', () => {
  // Internet to Cloud goes live over the internet: nothing private, and the event says so.
  const i2c = orders('partial', { type: 'Internet to Cloud', way: null });
  goLive(i2c);
  assert.deepEqual([reg(i2c, 'us-west-2').priv, !!reg(i2c, 'us-west-2').landed, reg(i2c, 'us-west-2').way], [false, false, null]);
  assert.match(i2c.state.events.at(-1).text, /^us-west-2 validated · live, over the internet/);
  assert.equal(vals(i2c).ordRows[0].stage, 'Live');
  // Interconnect - Last Mile (AWS only) is the cloud's own port: Direct Connect, no AT&T edge.
  const lm = orders('partial', { type: 'Interconnect - Last Mile', way: null });
  goLive(lm);
  assert.deepEqual([reg(lm, 'us-west-2').priv, reg(lm, 'us-west-2').ramp, reg(lm, 'us-west-2').way], [true, 'DX', 'direct']);
  assert.match(lm.state.events.at(-1).text, /live on Direct Connect, your own ports/);
  // A NetBond way says NetBond; no landing says "Hosted VPC" unless a hosted way landed.
  const nb = orders('partial', { type: 'DataCenter/CoLocation to Cloud', way: 'att' });
  goLive(nb);
  assert.match(nb.state.events.at(-1).text, /NetBond on AT&T/);
  assert.doesNotMatch(nb.state.events.at(-1).text, /Hosted VPC|hosted hub/);
});

test('a hosted way that lands reads hosted, and lights the vSRX in Govern > Layers', () => {
  const sendTo = (c) => { const out = []; for (let i = 0; i < 3; i += 1) { c.setState({ layPage: i });
    for (const b of vals(c).layCols.find(x => x.key === 'edge').bands) for (const r of b.rows) if (r.sub === 'Prod no direct internet' && r.text === 'Internet via send-to only') out.push(r); }
    return out[0]; };
  const c = orders('partial', { type: 'DataCenter/CoLocation to Cloud', way: 'transit' });
  c.setState({ tab: 'govern', govPanel: 'layers' });
  assert.equal(sendTo(c).capWord, 'No enforcement point', 'no hosted hub on record yet');
  c.setState({ tab: 'connect', cnPage: 'orders', layPage: 0 });
  goLive(c);
  const r = reg(c, 'us-west-2');
  assert.deepEqual([r.priv, r.way], [true, 'hosted']);
  assert.equal(W.regionWay(D.ESTATES.partial.regionsList.find(x => x.region === 'us-west-2'), c.state, 'partial').cls, 'hosted');
  assert.match(c.state.events.at(-1).text, /AT&T's hosted hub, the vSRX in path/);
  c.setState({ tab: 'govern', govPanel: 'layers' });
  assert.equal(sendTo(c).hasCap, false, 'the hosted hub on record enforces it');
  // On another estate the same order lights nothing.
  c.setState({ view: 'trust' });
  assert.equal(reg(c, 'us-west-2').way, null);
});

test('Go live lands every region an order reaches; an older bare id still lands on any estate', () => {
  const c = orders('partial', { type: 'DataCenter/CoLocation to Cloud', way: 'byo', regions: ['us-west-2', 'eu-west-1'] });
  goLive(c);
  assert.deepEqual(c.state.landed.map(e => e.region), ['us-west-2', 'eu-west-1']);
  assert.ok(reg(c, 'eu-west-1').priv && reg(c, 'us-west-2').priv);
  // Older state (and tests) set bare region ids: those land wherever they are read, as every landing once did.
  const old = mkC({ view: 'trust', estateParam: null, screen: 's3', layer: 'cloud', tab: 'connect', cnPage: 'orders', landed: ['us-west-2'] });
  assert.equal(reg(old, 'us-west-2').priv, true);
  assert.deepEqual(W.landedIdsOn({ landed: ['a', { est: 'x', region: 'b', order: null }, { est: 'y', region: 'c', order: null }] }, 'x'), ['a', 'b']);
});

test('Deliver now delivers only what this estate ordered: no order, nothing lands', () => {
  const c = mkC({ view: 'partial', estateParam: null, screen: 's6', submitted: true, orders: [order({ est: 'trust', type: 'DataCenter/CoLocation to Cloud', way: 'byo' })] });
  vals(c).deliverNow();
  assert.deepEqual(W.landedEntries(c.state), [], 'Bank scale\'s order is not Growing\'s, and the first public region is no longer landed for nothing');
  c.setState({ orders: [order({ type: 'DataCenter/CoLocation to Cloud', way: 'byo' })] });
  vals(c).deliverNow();
  assert.deepEqual(c.state.landed, [{ est: 'partial', region: 'us-west-2', order: 'o1' }]);
});

test('starting the journey again clears only the journey estate\'s landings', () => {
  const c = mkC({ view: 'partial', estateParam: null, screen: 's0', landed: [{ est: 'partial', region: 'us-west-2', order: 'o1' }, { est: J.JOURNEY_ESTATE, region: 'eastus', order: 'o2' }, 'eu-west-1'] });
  vals(c).setJourney({ target: { value: 'existing' } });
  assert.deepEqual(c.state.landed, [{ est: 'partial', region: 'us-west-2', order: 'o1' }]);
});

test('the pending banner\'s stages follow what the order attaches: a vSRX pair only for a hosted way', () => {
  const stages = (o) => vals(mkC({ view: 'partial', estateParam: null, screen: 's6', submitted: true, orders: [order(o)] })).pendingStages.map(x => x.label);
  assert.ok(stages({ way: 'transit' }).includes('vSRX HA pair'));
  assert.deepEqual(stages({ type: 'DataCenter/CoLocation to Cloud', way: 'att' }), ['Order accepted', 'NetBond port', 'BGP session up', 'Route policy pushed', 'Validated live']);
  assert.ok(!stages({ type: 'Internet to Cloud', way: null }).some(x => /vSRX|VPC/.test(x)));
});

// ---- The review's findings (2026-10-09), each pinned ----
test('an order\'s type comes before its way: Internet to Cloud stays public, Last Mile is the cloud\'s port, Cloud to Cloud carries no way', () => {
  const landIt = (o, id = 'us-west-2', view = 'partial') => { const c = orders(view, { region: id, ...o }); goLive(c); return reg(c, id); };
  assert.deepEqual([landIt({ type: 'Internet to Cloud', way: 'peer' }).priv], [false], 'a way picked on a Ways card never makes Internet to Cloud private');
  const lm = landIt({ type: 'Interconnect - Last Mile', way: 'byo' });
  assert.deepEqual([lm.ramp, lm.way], ['DX', 'direct']);
  const c2c = landIt({ type: 'Cloud to Cloud', way: 'transit' });
  assert.deepEqual([c2c.priv, c2c.ramp, c2c.way], [true, 'NetBond', 'netbond'], 'NetBond does not price a way on Cloud to Cloud, so it does not land one');
  assert.equal(W.landingKind({ type: 'Internet to Cloud', way: 'peer' }), 'internet');
  assert.equal(W.landingKind({ lmcc: true, type: 'Internet to Cloud', way: 'byo' }), 'direct');
});

test('a region already attached stays as the estate states it: no new ramp, no second count, and the event says so', () => {
  const raw = D.ESTATES.mature.regionsList.find(r => r.region === 'us-west-2');
  const c = orders('mature', { type: 'AVPN to Cloud', way: null });
  goLive(c);
  const r = reg(c, 'us-west-2');
  assert.deepEqual([r.priv, r.ramp, !!r.landed, r.way], [true, raw.ramp, false, 'direct']);
  assert.match(c.state.events.at(-1).text, /It was already attached on Direct Connect/);
  // Even a hosted way ordered onto it leaves the estate's own attachment as stated.
  const h = orders('mature', { type: 'DataCenter/CoLocation to Cloud', way: 'transit' });
  goLive(h);
  assert.deepEqual([reg(h, 'us-west-2').ramp, reg(h, 'us-west-2').way], [raw.ramp, 'direct']);
});

test('each order lands for itself: an earlier internet landing never makes a later private order read Live', () => {
  const c = orders('partial', { type: 'Internet to Cloud', way: null });
  goLive(c);
  c.setState({ orders: [...c.state.orders, order({ id: 'o2', type: 'DataCenter/CoLocation to Cloud', way: 'byo' })] });
  const row = (id) => vals(c).ordRows.find(x => x.id === id);
  assert.notEqual(row('o2').stage, 'Live'); assert.equal(row('o2').canGoLive, true);
  row('o2').goLive();
  assert.equal(row('o2').stage, 'Live');
  assert.deepEqual([reg(c, 'us-west-2').priv, reg(c, 'us-west-2').way], [true, 'netbond'], 'the private landing wins over the internet one');
});

test('Recommended: an internet landing never claims a private move, and another estate\'s order never shows', () => {
  const c = orders('partial', { type: 'Internet to Cloud', way: null });
  goLive(c);
  c.setState({ cnPage: 'options' });
  const m = vals(c).moveList.find(x => x.regions && x.regions.includes('us-west-2'));
  assert.ok(m, 'us-west-2 is still public, so its move is still offered');
  assert.deepEqual([m.hasTask, m.canConnect], [false, true]);
  const t = mkC({ view: 'trust', estateParam: null, screen: 's3', layer: 'cloud', tab: 'connect', cnPage: 'options', orders: [order({ type: 'DataCenter/CoLocation to Cloud', way: 'byo', moveKeys: ['region:AWS'] })], landed: [{ est: 'partial', region: 'us-west-2', order: 'o1' }] });
  assert.ok(vals(t).moveList.every(x => !x.hasTask), "Growing's order is not Bank scale's task");
});

test('the pending banner speaks for this estate\'s order: none on another estate, and no Go live without a region to deliver', () => {
  const other = mkC({ view: 'trust', estateParam: null, screen: 's2', submitted: true, orders: [order({ type: 'DataCenter/CoLocation to Cloud', way: 'byo' })] });
  assert.equal(vals(other).showPending, false);
  const catalog = mkC({ view: 'partial', estateParam: null, screen: 's2', submitted: true, orders: [order({ region: null, type: 'Hosted VPC', hosted: true })] });
  const v = vals(catalog);
  assert.deepEqual([v.showPending, v.pendGoLive], [true, false], 'a catalog order names no region: nothing for Go live to deliver');
  assert.ok(v.pendingStages.some(x => x.label === 'vSRX HA pair'), 'a hosted VPC order shows the hosted lifecycle');
  const nb = vals(mkC({ view: 'partial', estateParam: null, screen: 's2', submitted: true, orders: [order({ type: 'DataCenter/CoLocation to Cloud', way: 'byo' })] }));
  assert.deepEqual([nb.showPending, nb.pendGoLive, nb.pendingTitle], [true, true, 'x']);
});
