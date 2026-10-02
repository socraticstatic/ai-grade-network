import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { vals, estateFor } from '../naas-app.js';
import * as CF from '../naas-connect-flow.js';
import * as R from '../naas-round2.js';
import { countOf } from '../naas-sites.js';
import { mkC } from './harness.mjs';
import { walkFlow } from './flow-walk.mjs';

// The connect flow (Micah, 2026-09-30): "ways to connect doesn't work - take
// from netbond advanced's flow", "when i attach things that aren't attached,
// why does the flow show already all green on steps?", "the order of connect
// flow needs work - show 'work in progress' somewhere", "which cloud for
// example", and "options and orders is so weird".

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
if (typeof globalThis.requestAnimationFrame === 'undefined') globalThis.requestAnimationFrame = () => 0;
const store = {};
globalThis.localStorage = globalThis.localStorage || { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const S4 = HTML.slice(HTML.indexOf('<!-- ===== S4 COMPOSE ===== -->'), HTML.indexOf('<!-- ===== S5 RECOMMEND ===== -->'));
const SDCI = join(homedir(), 'Developer', 'att-netbond-sdci', 'src');
const read = (p) => { const f = join(SDCI, p); return existsSync(f) ? readFileSync(f, 'utf8') : null; };

const ways = (view = 'partial', extra = {}) => mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'connect', cnPage: 'ways', ...extra });
const flow = (view, compose, extra = {}) => mkC({ view, estateParam: null, screen: 's4', compose: { outcome: null, source: [], dest: [], regionTab: 'US East', metros: [], resiliency: 'Standard', control: [], ...compose }, ...extra });
const row = (v, key) => v.cfWip.find(r => r.key === key);
const stepOf = (v, key) => v.cfSteps.find(s => s.key === key);

// ---------- 1. transcription ----------
// Pinned from att-netbond-sdci src/components/connection/CreateConnectionMenu.tsx
// (OPTIONS, then LMCC_OPTION in its own "AWS Interconnect" category), 2026-09-30.
const MENU = [
  ['Internet to Cloud', 'Public internet on-ramp with DDoS protection'],
  ['Cloud to Cloud', 'Private backbone linking two clouds through one Hub'],
  ['DataCenter / CoLocation to Cloud', 'Direct fiber cross-connect from your data center'],
  ['VPN to Cloud', 'Encrypted IPSec / IKEv2 tunnel over the internet'],
  ['IoT to Cloud', 'Private APN connectivity for your 4G/5G IoT devices'],
  ['Layer 2 to Cloud', 'ASEoD Ethernet from your Layer 2 branch offices'],
  ['Colo to Colo', "Bridge two colo cages over AT&T's private network"],
  ['Site to Cloud', 'Branch / SD-WAN connectivity - coming soon'],
  ['Interconnect - Last Mile', 'Maximum-resiliency AWS interconnect · 4 paths across 2 sites in one metro'],
];
test('the connection types are NetBond Advanced\'s, word for word', () => {
  assert.deepEqual(CF.ALL_TYPES.map(t => [t.label, t.description]), MENU);
  assert.equal(CF.ALL_TYPES.find(t => t.label === 'Site to Cloud').disabled, true, 'Site to Cloud is coming soon');
  const src = read('components/connection/CreateConnectionMenu.tsx');
  if (src) {
    const pairs = [...src.matchAll(/label: '([^']+)',\s*description: ("[^"]+"|'[^']+')/g)].map(m => [m[1], m[2].slice(1, -1)]);
    assert.deepEqual(pairs, MENU, 'the menu in att-netbond-sdci moved; re-transcribe it');
  }
});

// Pinned from att-netbond-sdci src/utils/wizardDoor.ts (STD_STEP_META and the step orders).
test('the steps are NetBond Advanced\'s, in its orders and its words', () => {
  assert.deepEqual(CF.STD_STEP_KEYS, ['type', 'provider', 'basic', 'advanced', 'terms', 'review']);
  assert.deepEqual(CF.STD_STEP_KEYS_LMCC, ['type', 'provider', 'basic', 'terms', 'confirm']);
  assert.deepEqual(CF.STD_STEP_KEYS_COLO, ['type', 'endpoints', 'basic', 'terms', 'confirm']);
  assert.deepEqual(CF.STD_STEP_KEYS_LMCC_EXPRESS, ['basic', 'terms', 'confirm']);
  assert.deepEqual(Object.fromEntries(Object.entries(CF.STEP_META).map(([k, m]) => [k, m.title])), { type: 'Connection Type', provider: 'Choose Provider', basic: 'Connection Profile', advanced: 'Advanced Settings', review: 'Review', terms: 'Terms', confirm: 'Confirm', endpoints: 'Colo Endpoints' });
  const src = read('utils/wizardDoor.ts');
  if (src) {
    for (const [k, m] of Object.entries(CF.STEP_META)) assert.ok(src.includes(`${k}:`) && src.includes(`title: '${m.title}'`) && src.includes(`description: '${m.description}'`), `${k} drifted from wizardDoor.ts`);
    for (const [name, keys] of [['STD_STEP_KEYS', CF.STD_STEP_KEYS], ['STD_STEP_KEYS_LMCC', CF.STD_STEP_KEYS_LMCC], ['STD_STEP_KEYS_COLO', CF.STD_STEP_KEYS_COLO], ['STD_STEP_KEYS_LMCC_EXPRESS', CF.STD_STEP_KEYS_LMCC_EXPRESS]]) {
      const m = new RegExp(`export const ${name}: StdStepKey\\[\\] = \\[([^\\]]+)\\]`).exec(src);
      assert.ok(m, `${name} is gone from wizardDoor.ts`);
      assert.deepEqual(m[1].split(',').map(x => x.trim().replace(/'/g, '')), keys, name);
    }
  }
  const tiers = read('components/wizard/screens/ResiliencySelection.tsx');
  if (tiers) for (const t of CF.TIERS) assert.ok(tiers.includes(`subtitle: '${CF.TIER_PROTECTS[t]}'`), `${t} drifted from TIER_META`);
});

// ---------- 2. Ways to connect ----------
test('Ways to connect is NetBond Advanced\'s entry: every type, each counting what it applies to here', () => {
  for (const view of ['partial', 'mature', 'trust', 'small', 'empty']) {
    const c = ways(view);
    const v = vals(c);
    assert.equal(v.cnIsWays, true, view);
    assert.deepEqual(v.wayTypes.map(t => t.label), MENU.map(m => m[0]), view);
    const soon = v.wayTypes.find(t => t.label === 'Site to Cloud');
    assert.equal(soon.disabled, true, `${view}: Site to Cloud starts nothing`);
    assert.match(soon.description, /coming soon/);
    for (const t of v.wayTypes) {
      if (!t.hasCount) { assert.equal(t.n, 0, `${view} ${t.label}`); assert.ok(t.none, `${view} ${t.label} says why it counts nothing`); continue; }
      t.openSet();
      const w = vals(c);
      assert.equal(w.waySet.has, true, `${view} ${t.label}`);
      assert.equal(w.waySet.key, t.key);
      // The figure opens exactly what it counts: every member, and nothing else.
      const n = w.waySet.all.reduce((a, r) => a + (r.kind === 'sites' ? countOf(r.name) : 1), 0);
      assert.equal(n, t.n, `${view} ${t.label}: the list holds ${n}, the figure says ${t.n}`);
      assert.equal(w.waySet.count, t.phrase, 'the list is headed by the same words the figure said');
    }
  }
});

test('the three-card comparison and its Chosen button are gone; the path table moved into Connection Profile', () => {
  assert.ok(!HTML.includes('pathRows'), 'the three NetBond / SD-WAN / Hyperscaler cards are still bound');
  assert.ok(!/>\s*Chosen\s*</.test(HTML) && !HTML.includes('pt.pickLabel'), 'a Chosen button is still in the markup');
  const scan = (x, path = []) => {
    if (typeof x === 'string') { assert.notEqual(x, 'Chosen', `vals.${path.join('.')} reads Chosen`); return; }
    if (!x || typeof x !== 'object') return;
    for (const [k, y] of Object.entries(x)) if (typeof y !== 'function' && path.length < 4) scan(y, [...path, k]);
  };
  scan(vals(ways()));
  scan(vals(flow('partial', {})));
  // The comparison (security, performance, reliability, cost, time to stand up, per path) is Connection Profile's reference.
  const basic = S4.slice(S4.indexOf('<sc-if value="{{ cfIsBasic }}"'));
  assert.ok(S4.includes('<sc-if value="{{ cfIsBasic }}"'), 'Connection Profile has no gate');
  assert.ok(basic.includes('<sc-for list="{{ cfPaths }}"') && basic.includes('{{ pt.setup }}') && basic.includes('{{ pt.reliability }}'), 'the path table is not in Connection Profile');
  const waysBlock = HTML.slice(HTML.indexOf('<sc-if value="{{ cnIsWays }}"'), HTML.indexOf('<sc-if value="{{ cnIsOptions }}"'));
  assert.ok(!waysBlock.includes('{{ matrix }}'), 'the path table is still on Ways to connect');
});

test('picking a type starts the flow on the next decision; the type step is done because you passed it', () => {
  const c = ways();
  vals(c).wayTypes.find(t => t.label === 'DataCenter / CoLocation to Cloud').start();
  assert.equal(c.state.screen, 's4');
  const v = vals(c);
  assert.equal(v.cfKey, 'provider');
  assert.deepEqual(v.cfSteps.map(s => s.title), ['Connection Type', 'Choose Provider', 'Connection Profile', 'Advanced Settings', 'Terms', 'Review']);
  assert.deepEqual(v.cfSteps.map(s => s.state), ['done', 'current', 'todo', 'todo', 'todo', 'todo']);
  assert.equal(row(v, 'type').value, 'DataCenter / CoLocation to Cloud');
  assert.equal(row(v, 'type').word, 'You picked');
  assert.equal(row(v, 'cloud').value, 'Not chosen yet');
  // A new order from Ways carries nothing an earlier entry left behind.
  assert.equal(v.hasParsedNote, false);
});

test('Colo to Colo and Interconnect - Last Mile walk their own step lists', () => {
  const c = ways();
  vals(c).wayTypes.find(t => t.label === 'Colo to Colo').start();
  assert.deepEqual(vals(c).cfSteps.map(s => s.key), CF.STD_STEP_KEYS_COLO);
  assert.equal(vals(c).cfKey, 'endpoints');
  const d = ways();
  vals(d).wayTypes.find(t => t.label === 'Interconnect - Last Mile').start();
  const v = vals(d);
  assert.deepEqual(v.cfSteps.map(s => s.key), CF.STD_STEP_KEYS_LMCC);
  assert.equal(v.cfKey, 'provider');
  // Only AWS regions are offered; Last Mile is AWS.
  assert.deepEqual(v.cfClouds.map(g => g.cloud), ['AWS']);
  // Internet to Cloud on AWS alone at Maximum turns into the Last Mile flow (wizardDoor.ts tierForkArmed).
  assert.deepEqual(CF.stepKeysFor({ ctype: 'Internet to Cloud', regions: ['AWS us-west-2'], tier: 'Maximum', passed: [] }), CF.STD_STEP_KEYS_LMCC);
  assert.deepEqual(CF.stepKeysFor({ ctype: 'Internet to Cloud', regions: ['Azure eastus'], tier: 'Maximum', passed: [] }), CF.STD_STEP_KEYS);
});

// ---------- 3. the contract with the options builder ----------
test('attaching Charlotte branch prefills it as a site, with its class and metro, and passes nothing for you', () => {
  const c = flow('partial', { prefillSets: [{ sites: ['Charlotte branch'], sourceLabel: 'Recommended' }] });
  const v = vals(c);
  assert.equal(row(v, 'sites').value, 'Charlotte branch (Branch) · Charlotte');
  assert.equal(row(v, 'sites').word, 'From your estate');
  assert.equal(row(v, 'loc').value, 'Charlotte');
  assert.equal(row(v, 'loc').word, 'From your estate');
  assert.ok(!v.cfSteps.some(s => s.state === 'done'), `a step reads done that you never passed: ${JSON.stringify(v.cfSteps.map(s => s.state))}`);
  // No type came with it, so the flow starts where a decision is needed.
  assert.equal(v.cfKey, 'type');
  assert.equal(v.hasParsedNote, true);
  assert.equal(v.parsedNoteTitle, 'Recommended');
  assert.match(v.parsedNote, /Charlotte branch \(Branch · Charlotte\)|Charlotte branch \(Branch\) · Charlotte/);
  assert.equal(v.cfDiagram.left, 'Charlotte branch');
});

test('attaching AWS us-west-2 prefills AWS us-west-2 as the cloud and region', () => {
  const c = flow('partial', { prefillSets: { regions: ['AWS us-west-2'], connectionType: 'Internet to Cloud', sourceLabel: 'Recommended' } });
  const v = vals(c);
  assert.equal(row(v, 'cloud').value, 'AWS us-west-2');
  assert.equal(row(v, 'cloud').word, 'From your estate');
  assert.equal(stepOf(v, 'provider').state, 'filled');
  assert.equal(stepOf(v, 'provider').value, 'AWS us-west-2');
  assert.equal(stepOf(v, 'type').state, 'filled');
  assert.equal(v.cfKey, 'basic', 'the first step that needs a decision');
  assert.equal(v.cfDiagram.right, 'AWS us-west-2');
  assert.match(v.parsedNote, /AWS us-west-2/);
});

test('two sites and a region make one order that names all three, in the banner, the panel and the picture', () => {
  const c = flow('partial', { prefillSets: [{ sites: ['Charlotte branch', 'Phoenix branch'], connectionType: 'VPN to Cloud', sourceLabel: 'Recommended' }, { regions: ['AWS us-west-2'] }] });
  let v = vals(c);
  for (const name of ['Charlotte branch', 'Phoenix branch']) {
    assert.ok(row(v, 'sites').value.includes(name), `the panel does not name ${name}`);
    assert.ok(v.parsedNote.includes(name), `the banner does not name ${name}`);
  }
  assert.equal(row(v, 'cloud').value, 'AWS us-west-2');
  assert.ok(v.parsedNote.includes('AWS us-west-2'));
  assert.equal(v.cfDiagram.left, '2 sites');
  assert.equal(v.cfDiagram.right, 'AWS us-west-2');
  // Two metros and Standard resiliency: where it enters the AT&T network is a decision, not a guess.
  assert.equal(row(v, 'loc').value, 'Not chosen yet');
  assert.equal(v.cfKey, 'basic');
  walkToReview(c);
  v = vals(c);
  assert.equal(v.cfOrder.lines.filter(l => /Internet to Cloud/.test(l.product)).length, 1, 'one order, one connection line');
  v.cfPlace();
  assert.equal(c.state.orders.length, 1);
  assert.match(c.state.orders[0].what, /AWS us-west-2/);
});

// ---------- 4. the tiers ----------
test('Standard, Maximum and Geodiversity each say what they get you, from the paths and the catalog', () => {
  const c = ways();
  vals(c).wayTypes.find(t => t.label === 'DataCenter / CoLocation to Cloud').start();
  vals(c).cfClouds.find(g => g.cloud === 'Azure').regions.find(r => r.name === 'Azure eastus').pick();
  vals(c).cfNext();
  const v = vals(c);
  assert.equal(v.cfKey, 'basic');
  assert.deepEqual(v.cfTiers.map(t => t.tier), ['Standard', 'Maximum', 'Geodiversity']);
  const netbond = R.PATHS.find(p => p.id === 'netbond');
  for (const t of v.cfTiers) {
    assert.equal(t.protects, CF.TIER_PROTECTS[t.tier]);
    assert.equal(t.security, netbond.sec.split(' · ')[0]);
    assert.match(t.performance, /^\d+ ms · deterministic$/);
    assert.equal(t.costSub, 'Modelled · list price');
  }
  // NetBond for Cloud, $1,800 list, times composeOrder's tier multipliers.
  assert.deepEqual(v.cfTiers.map(t => t.cost), ['$1,800/mo', '$3,960/mo', '$2,880/mo']);
});

// ---------- 5. the panel ----------
test('the panel names the chosen cloud and region at every step after Choose Provider, and not chosen yet before', () => {
  const c = ways();
  vals(c).wayTypes.find(t => t.label === 'DataCenter / CoLocation to Cloud').start();
  let v = vals(c);
  assert.equal(v.cfWipTitle, 'Your order, in progress');
  assert.equal(row(v, 'cloud').value, 'Not chosen yet');
  v.cfClouds.find(g => g.cloud === 'Azure').regions.find(r => r.name === 'Azure eastus').pick();
  v = vals(c);
  assert.equal(stepOf(v, 'provider').state, 'current', 'picking is not passing');
  v.cfNext();
  for (const key of ['basic', 'advanced', 'terms', 'review']) {
    v = vals(c);
    assert.equal(v.cfKey, key);
    assert.equal(row(v, 'cloud').value, 'Azure eastus', `${key}: the panel lost the cloud`);
    assert.equal(row(v, 'cloud').word, 'You picked');
    assert.equal(stepOf(v, 'provider').state, 'done');
    decide(c, v);
    if (key !== 'review') vals(c).cfNext();
  }
});

test('a step is done only when you passed it; filled from your estate is its own state and shows the value', () => {
  const c = flow('partial', { prefillSets: { regions: ['Azure eastus'], connectionType: 'DataCenter / CoLocation to Cloud', tier: 'standard' } });
  let v = vals(c);
  assert.deepEqual(v.cfSteps.map(s => s.state), ['filled', 'filled', 'current', 'todo', 'todo', 'todo']);
  for (const s of v.cfSteps.filter(x => x.state === 'filled')) assert.ok(s.value, `${s.key} is filled and shows no value`);
  decide(c, v); vals(c).cfNext();
  v = vals(c);
  assert.equal(stepOf(v, 'basic').state, 'done');
  assert.equal(stepOf(v, 'type').state, 'filled', 'you never passed it, so it is not done');
});

// ---------- 6. every entry still reaches Review ----------
function decide(c, v) {
  const k = v.cfKey;
  if (k === 'type' && v.cfBlock) v.cfTypes.find(t => !t.disabled).pick();
  if (k === 'provider' && v.cfBlock) {
    const regions = v.cfClouds.flatMap(g => g.regions.map(r => ({ ...r, cloud: g.cloud })));
    if (/two clouds|second cloud/.test(v.cfBlock)) { const other = regions.find(r => r.cloud !== (regions.find(x => x.on) || regions[0]).cloud); (regions.find(x => x.on) ? other : regions[0]).pick(); }
    else if (/carries one cloud/.test(v.cfBlock)) regions.filter(r => r.on).slice(1).forEach(r => vals(c).cfClouds.flatMap(g => g.regions).find(x => x.name === r.name).pick());
    else regions[0].pick();
    const w = vals(c);
    if (w.cfBlock && /two clouds|second cloud/.test(w.cfBlock)) { const rs = w.cfClouds.flatMap(g => g.regions.map(r => ({ ...r, cloud: g.cloud }))); const on = rs.find(x => x.on); rs.find(r => r.cloud !== on.cloud).pick(); }
  }
  if (k === 'endpoints') { const e = vals(c).cfEndpoints; if (!e.a.sites.some(x => x.on)) e.a.sites[0].pick(); const e2 = vals(c).cfEndpoints; if (!e2.b.sites.some(x => x.on)) e2.b.sites.find(x => !x.taken).pick(); vals(c).cfEndpoints.a.fabrics[0].pick(); vals(c).cfEndpoints.b.fabrics[0].pick(); }
  if (k === 'basic') {
    let w = vals(c);
    if (/Maximum is live/.test(w.cfBlock)) { w.cfTiers.find(t => t.tier === 'Standard').pick(); w = vals(c); }
    while (/metro|location|two/i.test(w.cfBlock || '') && w.cfMetros.some(m => !m.on)) { if (!w.cfMetros.some(m => !m.on && m.pickable)) { w.cfAreas.find(a => !a.on).go(); w = vals(c); continue; } w.cfMetros.find(m => !m.on && m.pickable).pick(); w = vals(c); }
    if (/bandwidth/.test(w.cfBlock || '')) w.cfBandwidths[0].pick();
  }
  if ((k === 'advanced' || k === 'confirm' || k === 'review') && /always be true/.test(vals(c).cfBlock || '')) vals(c).cfPolicy[0].pick();
  if (k === 'terms' && vals(c).cfBlock) vals(c).cfTerms.find(t => t.m === 36).pick();
}
function walkToReview(c) {
  for (let i = 0; i < 14; i++) {
    const v = vals(c);
    if (c.state.screen !== 's4') throw new Error(`left the flow for ${c.state.screen}`);
    if (v.cfIsReview && !v.cfBlock) return v;
    decide(c, v);
    const w = vals(c);
    if (w.cfIsReview) continue;
    if (w.cfBlock) throw new Error(`stuck at ${w.cfKey}: ${w.cfBlock}`);
    w.cfNext();
  }
  throw new Error(`never reached Review: at ${vals(c).cfKey} (${vals(c).cfBlock})`);
}

// The entry enumeration walks each compose through the pure flow (tests/flow-walk.mjs);
// every walk still ends in the page's own Review and Place order.
test('every entry into the flow still reaches Review and places one order', () => {
  const NOW = '2026-09-29T12:00:00Z';
  const walked = new Set();
  let n = 0, stops = 0;
  const check = (label, c) => {
    if (c.state.screen !== 's4') return;
    const est = estateFor(c.state);
    const key = `${c.state.view}|${JSON.stringify(c.state.compose)}`;
    if (walked.has(key)) return;
    walked.add(key);
    const done = walkFlow(c.state.compose, est);
    if (!done) {
      // An order this estate cannot complete (Cloud to Cloud with one cloud, Colo to Colo
      // with its data centers grouped) says why on the step, and stops there.
      const v = vals(c);
      assert.ok(v.hasCfBlock && /discovery found|grouped|no AWS/i.test(v.cfBlock), `${label}: stuck without saying why (${v.cfBlock})`);
      stops++; return;
    }
    c.state.compose = done;
    const v = vals(c);
    assert.equal(v.cfIsReview, true, `${label}: not on Review`);
    assert.equal(v.cfCanPlace, true, `${label}: Review cannot place (${v.cfBlock})`);
    const before = (c.state.orders || []).length;
    v.cfPlace();
    assert.equal(c.state.orders.length, before + 1, `${label}: Place order recorded nothing`);
    assert.equal(c.state.cnPage, 'orders', `${label}: Place order did not land on Orders`);
    assert.equal(c.state.orders.at(-1).stage, 'Submitted for approval');
    n++;
  };
  for (const view of ['partial', 'mature', 'trust', 'small']) {
    const c = mkC({ view, estateParam: null, nowIso: NOW });
    const snap = JSON.stringify(c.state);
    const reset = (patch) => { for (const k of Object.keys(c.state)) delete c.state[k]; Object.assign(c.state, JSON.parse(snap), patch || {}); };
    const land = (label, fire, patch) => { reset(patch); fire(); check(`${view} ${label}`, c); };
    // Cost > Optimize moves.
    const OPT = { screen: 's3', layer: 'cloud', tab: 'cost' };
    reset(OPT);
    for (const r of vals(c).optRows || []) if (!r.empty) land(`optimize ${r.key}`, r.go, OPT);
    // Every finding tier that opens the flow, on every layer.
    for (const layer of ['cloud', 'net', 'transport', 'ai']) {
      reset({ screen: 's3', layer });
      const lv = vals(c);
      for (const f of [...lv.connectFindings, ...lv.governFindings, ...lv.observeFindings, ...lv.costFindings]) for (const t of f.tiers) land(`${layer} tier ${f.kind}|${t.name}`, t.choose, { screen: 's3', layer });
    }
    // The gap rows (a region and a site), the egress buckets, the header shortcut, Ways to connect.
    reset();
    const v0 = vals(c);
    for (const gr of v0.gapRows || []) land(`gap ${gr.name}`, gr.go);
    for (const [i, b] of (v0.buckets || []).entries()) land(`bucket ${i}`, b.steer);
    reset({ screen: 's6' });
    land('goCompose', vals(c).goCompose, { screen: 's6' });
    reset({ cnPage: 'ways' });
    for (const t of vals(c).wayTypes.filter(x => !x.disabled)) land(`ways ${t.label}`, t.start, { cnPage: 'ways' });
  }
  assert.ok(n >= 40, `only ${n} distinct entries walked to a placed order`);
  assert.ok(stops <= 3, `${stops} entries stopped short`);
});

// ---------- 7. Orders ----------
test('Orders holds the order in progress and the orders placed this session, never invented history', () => {
  const c = mkC({ view: 'partial', estateParam: null, screen: 's3', layer: 'cloud', tab: 'connect', cnPage: 'orders' });
  let v = vals(c);
  assert.equal(v.cnIsOrders, true);
  assert.equal(v.noOrders, true);
  assert.equal(v.ordersEmpty, 'No orders yet');
  assert.equal(v.ordInProgress.has, false);
  // Start one: it is in progress, and Resume goes back to where you were.
  c.state.cnPage = 'ways';
  vals(c).wayTypes.find(t => t.label === 'Cloud to Cloud').start();
  c.state.screen = 's3'; c.state.cnPage = 'orders';
  v = vals(c);
  assert.equal(v.ordInProgress.has, true);
  assert.equal(v.noOrders, false);
  assert.ok(v.ordInProgress.rows.some(r => r.key === 'type' && r.value === 'Cloud to Cloud'));
  v.ordInProgress.resume();
  assert.equal(c.state.screen, 's4');
  assert.equal(vals(c).cfKey, 'provider');
  walkToReview(c);
  vals(c).cfPlace();
  v = vals(c);
  assert.equal(c.state.screen, 's3');
  assert.equal(v.cnIsOrders, true);
  assert.equal(v.ordInProgress.has, false, 'a placed order is no longer in progress');
  assert.equal(v.ordRows.length, 1);
  assert.equal(v.ordRows[0].stage, 'Submitted for approval');
  assert.match(v.ordRows[0].type, /Cloud to Cloud/);
  // A catalog order placed from Review lands there too.
  const p = mkC({ view: 'partial', estateParam: null });
  vals(p).mostChosen[0].choose();
  vals(p).submit();
  assert.equal(p.state.orders.length, 1);
  assert.equal(p.state.orders[0].stage, 'Submitted for approval');
});

// ---------- 8. markup ----------
test('the flow is bound: the steps, the panel titled plainly, and nothing drawn by a loop inside an svg', () => {
  assert.ok(S4.includes('Your order, in progress') || S4.includes('{{ cfWipTitle }}'), 'the panel has no plain title');
  assert.ok(!S4.includes('Composed so far'), 'the old summary box is back');
  for (const g of ['cfIsType', 'cfIsProvider', 'cfIsBasic', 'cfIsAdvanced', 'cfIsTerms', 'cfIsReview', 'cfIsEndpoints']) assert.ok(S4.includes(`<sc-if value="{{ ${g} }}"`), `${g} is not a gate in S4`);
  for (const b of ['{{ cfWip }}', '{{ cfSteps }}', '{{ cfPrice.big }}', '{{ cfDiagram.right }}', '{{ cfPlace }}', '{{ cfNext }}']) assert.ok(S4.includes(b.replace('{{ cfWip }}', 'list="{{ cfWip }}"').replace('{{ cfSteps }}', 'list="{{ cfSteps }}"')) || S4.includes(b), `${b} is not bound in S4`);
  // The flow's own markup (S4, Ways to connect, Orders): no loop inside an svg, a table or a select.
  const WAYS = HTML.slice(HTML.indexOf('<sc-if value="{{ cnIsWays }}"'), HTML.indexOf('<sc-if value="{{ cnIsOptions }}"'));
  for (const block of [S4, WAYS]) for (const m of block.matchAll(/<(svg|table|select)\b[\s\S]*?<\/\1>/g)) assert.ok(!m[0].includes('<sc-for'), `an sc-for inside a <${m[1]}> never renders`);
  assert.ok(HTML.includes('<sc-if value="{{ cnIsOrders }}"'), 'Orders has no page');
  // New state keys live in defaults() and the markup constructor alike.
  const ctor = HTML.slice(HTML.indexOf('constructor(p)'), HTML.indexOf('constructor(p)') + 4000);
  for (const k of ['orders:', 'waySet:', 'cfArea:', 'wipList:', 'wipListPage:']) assert.ok(ctor.includes(k), `the markup constructor has no ${k}`);
});

// ---------- 9. resumed build (2026-09-30, after the headless walk) ----------
// Each of these came from looking at the flow as a user, headless, on every estate.
const startWays = (label, view = 'partial') => { const c = ways(view); vals(c).wayTypes.find(t => t.label === label).start(); return c; };
const pickRegion = (c, name) => vals(c).cfClouds.flatMap(g => g.regions).find(r => r.name === name).pick();

test('a location the flow filled from the region you picked reads From your estate, never You picked', () => {
  const c = startWays('DataCenter / CoLocation to Cloud');
  pickRegion(c, 'Azure eastus');
  const v = vals(c);
  assert.equal(row(v, 'cloud').word, 'You picked');
  assert.equal(row(v, 'loc').value, 'Ashburn');
  assert.equal(row(v, 'loc').word, 'From your estate', 'you never picked a location');
  assert.equal(row(v, 'sites').word, 'From your estate', 'you never picked a site');
  vals(c).cfNext();
  vals(c).cfMetros.find(m => m.metro === 'Ashburn').pick();
  assert.equal(row(vals(c), 'loc').word, 'You picked', 'picking it makes it yours');
});

test('the Sites row says when this type has none at the location, and Cloud to Cloud has no Sites row', () => {
  const c = startWays('DataCenter / CoLocation to Cloud');
  pickRegion(c, 'AWS us-east-1');
  vals(c).cfNext();
  vals(c).cfMetros.find(m => m.metro === 'Atlanta').pick();
  const v = vals(c);
  assert.equal(row(v, 'sites').value, 'No data centers in Atlanta');
  // The flow looked in your estate and found none there: that is what your estate says, not a choice left open.
  assert.equal(row(v, 'sites').word, 'From your estate');
  assert.ok(!vals(startWays('Cloud to Cloud')).cfWip.some(r => r.key === 'sites'), 'Cloud to Cloud joins two clouds; it carries no sites');
});

test('the path table in Connection Profile reads the region this order reaches, the same latency the tiers read', () => {
  const c = startWays('DataCenter / CoLocation to Cloud');
  pickRegion(c, 'Azure eastus');
  vals(c).cfNext();
  const v = vals(c);
  assert.equal(v.cfPathsFor, 'Azure eastus');
  assert.deepEqual(v.cfPaths.map(p => p.short), R.PATHS.map(p => p.short));
  const nb = v.cfPaths.find(p => p.key === 'netbond');
  assert.equal(nb.performance, '11 ms', 'Azure eastus rides the AT&T network at 11 ms');
  for (const t of v.cfTiers) assert.match(t.performance, /^11 ms/);
  assert.equal(nb.rides, true, 'DataCenter / CoLocation to Cloud rides NetBond');
  assert.equal(v.cfPaths.filter(p => p.rides).length, 1);
  for (const p of v.cfPaths) for (const x of [p.security, p.performance, p.reliability, p.cost, p.setup]) assert.ok(!/of your/.test(x), 'a count of your regions is not what this order gets');
  const i2c = startWays('Internet to Cloud');
  pickRegion(i2c, 'AWS us-west-2');
  vals(i2c).cfNext();
  assert.equal(vals(i2c).cfPaths.find(p => p.rides).key, 'internet');
});

test('the policy sentence agrees with what it names, and names sites rather than counting them', () => {
  let v = vals(flow('partial', { prefillSets: { sites: ['Charlotte branch'], regions: ['AWS us-west-2'], connectionType: 'VPN to Cloud' } }));
  assert.equal(v.cfPolicySent.match, 'Charlotte branch');
  assert.equal(v.cfPolicySent.verb, 'reaches');
  v = vals(flow('partial', { prefillSets: [{ sites: ['Charlotte branch', 'Phoenix branch'], connectionType: 'VPN to Cloud' }, { regions: ['AWS us-west-2'] }] }));
  assert.equal(v.cfPolicySent.match, 'Charlotte branch and Phoenix branch');
  assert.equal(v.cfPolicySent.verb, 'reach');
  // Four sites at a location the flow filled: named as a group, never counted.
  const dc = startWays('Layer 2 to Cloud');
  pickRegion(dc, 'Azure eastus');
  vals(dc).cfNext();
  vals(dc).cfMetros.find(m => m.metro === 'New York').pick();
  v = vals(dc);
  assert.ok(!/\d/.test(v.cfPolicySent.match), `the sentence counts: ${v.cfPolicySent.match}`);
  // Internet to Cloud is the public internet reaching a cloud region (NetBond Advanced's
  // "public internet on-ramp"): its policy is the region's, and it carries no sites of yours.
  const i2c = startWays('Internet to Cloud');
  pickRegion(i2c, 'AWS us-west-2');
  v = vals(i2c);
  assert.equal(v.cfPolicySent.match, 'AWS us-west-2');
  assert.equal(v.cfPolicySent.verb, 'reaches');
  assert.equal(v.cfPolicySent.scope, 'the internet');
  assert.ok(!v.cfWip.some(r => r.key === 'sites'), 'Internet to Cloud named sites nobody attached');
  assert.equal(v.cfDiagram.left, 'The internet');
});

test('a tier card quotes the price its order will carry once picked, and Maximum on AWS alone says it becomes Last Mile', () => {
  const c = startWays('Internet to Cloud');
  pickRegion(c, 'AWS us-west-2');
  vals(c).cfNext();
  const cards = vals(c).cfTiers;
  for (const t of cards.map(x => x.tier)) {
    const quoted = vals(c).cfTiers.find(x => x.tier === t);
    quoted.pick();
    const v = vals(c);
    assert.equal(quoted.cost, `${v.cfPrice.big}/mo`, `${t} quoted ${quoted.cost}, the order then costs ${v.cfPrice.big}/mo`);
  }
  // wizardDoor.ts tierForkArmed: Internet to Cloud, AWS alone, Maximum is Interconnect - Last Mile.
  assert.equal(cards.find(x => x.tier === 'Maximum').becomes, 'Becomes Interconnect - Last Mile');
  assert.equal(cards.find(x => x.tier === 'Standard').becomes, '');
});

test('Review totals the order at its term, the same price the panel shows', () => {
  const v = walkToReview(startWays('DataCenter / CoLocation to Cloud'));
  assert.equal(v.cfTotal.has, true);
  assert.equal(v.cfTotal.price, `${v.cfPrice.big}/mo`);
  assert.equal(v.cfTotal.sub, 'Modelled · list price');
  assert.match(v.cfTotal.label, /36-month/);
});

test('Orders spans the page when nothing is in progress, and makes room for the order in progress when there is one', () => {
  const c = mkC({ view: 'partial', estateParam: null, screen: 's3', layer: 'cloud', tab: 'connect', cnPage: 'orders' });
  assert.equal(vals(c).ordCols, 'minmax(0,1fr)');
  c.state.cnPage = 'ways';
  vals(c).wayTypes.find(t => t.label === 'Cloud to Cloud').start();
  Object.assign(c.state, { screen: 's3', cnPage: 'orders' });
  assert.match(vals(c).ordCols, /^minmax\(0,1fr\) minmax\(/);
});

test('a member of a type\'s set starts the flow with it attached, filled from your estate', () => {
  const c = ways();
  vals(c).wayTypes.find(t => t.label === 'Internet to Cloud').openSet();
  vals(c).waySet.rows.find(r => r.name === 'AWS us-west-2').start();
  assert.equal(c.state.screen, 's4');
  let v = vals(c);
  assert.equal(row(v, 'type').word, 'You picked');
  assert.equal(row(v, 'cloud').value, 'AWS us-west-2');
  assert.equal(row(v, 'cloud').word, 'From your estate');
  assert.equal(stepOf(v, 'type').state, 'done');
  assert.equal(stepOf(v, 'provider').state, 'filled');
  assert.equal(v.cfKey, 'basic');
  const d = ways();
  vals(d).wayTypes.find(t => t.label === 'VPN to Cloud').openSet();
  vals(d).waySet.rows.find(r => r.name === 'Charlotte branch').start();
  v = vals(d);
  assert.equal(row(v, 'sites').value, 'Charlotte branch (Branch) · Charlotte');
  assert.equal(row(v, 'sites').word, 'From your estate');
  assert.equal(v.cfKey, 'provider');
});

test('on Connection Type, the types that fit what you attached say so', () => {
  const v = vals(flow('partial', { prefillSets: [{ sites: ['Charlotte branch'], sourceLabel: 'Recommended' }] }));
  assert.equal(v.cfTypes.find(t => t.label === 'VPN to Cloud').fits, 'Fits Charlotte branch');
  assert.equal(v.cfTypes.find(t => t.label === 'DataCenter / CoLocation to Cloud').fits, '');
  const w = vals(flow('partial', { prefillSets: [{ regions: ['AWS us-west-2'] }] }));
  assert.equal(w.cfTypes.find(t => t.label === 'Internet to Cloud').fits, 'Fits AWS us-west-2');
  assert.equal(w.cfTypes.find(t => t.label === 'Interconnect - Last Mile').fits, 'Fits AWS us-west-2');
});

test('Colo to Colo says what its price waits on', () => {
  assert.equal(vals(startWays('Colo to Colo')).cfPrice.line, 'Priced once both colo endpoints are chosen');
});

test('no word in the flow counts what it does not open', () => {
  for (const view of ['partial', 'mature', 'trust', 'small']) {
    const est = estateFor({ view, estateParam: null, addedSources: [] });
    for (const m of CF.metroOptions({ regions: [], sites: [], ctype: null, loc: [], tier: null }, est)) assert.ok(!/\d+ more/.test(m.near), `${view} ${m.metro}: ${m.near}`);
  }
  const c = startWays('Cloud to Cloud');
  for (const n of ['AWS us-east-1', 'Azure eastus', 'GCP us-central1']) pickRegion(c, n);
  const v = vals(c);
  assert.ok(!/\d+ more/.test(v.cfSteps.find(s => s.key === 'provider').sub), 'the stepper counts regions it does not open');
  const r = row(v, 'cloud');
  assert.equal(r.hasMore, true);
  assert.equal(r.moreLabel, 'All 3 regions');
  r.openMore();
  const w = vals(c);
  assert.equal(w.cfWipList.has, true);
  assert.deepEqual(w.cfWipList.all.map(x => x.name), ['AWS us-east-1', 'Azure eastus', 'GCP us-central1'], 'the list holds exactly what the figure counted');
  w.cfWipList.close();
  assert.equal(vals(c).cfWipList.has, false);
  // The picture's far end counts the clouds linked to the first, and opens exactly those.
  assert.equal(vals(c).cfDiagram.left, 'AWS us-east-1');
  assert.equal(vals(c).cfDiagram.right, '2 regions');
  vals(c).cfDiagram.rightGo();
  assert.deepEqual(vals(c).cfWipList.all.map(x => x.name), ['Azure eastus', 'GCP us-central1']);
});

test('with no cloud found, Choose Provider says so and opens Sources; the order waits in Orders', () => {
  const c = startWays('DataCenter / CoLocation to Cloud', 'empty');
  const v = vals(c);
  assert.equal(v.cfKey, 'provider');
  assert.equal(v.noCfClouds, true);
  // The step's own line says why it cannot pass; the door beside it says what would clear it, without repeating it.
  assert.match(v.cfBlock, /no cloud region yet/);
  assert.equal(v.cfNoCloudsLine, 'Add a source and its cloud regions show here.');
  v.cfAddSource();
  assert.equal(c.state.screen, 's1');
  assert.equal(c.state.discoverView, 'sources');
  Object.assign(c.state, { screen: 's3', layer: 'cloud', tab: 'connect', cnPage: 'orders' });
  assert.equal(vals(c).ordInProgress.has, true);
});

test('Or just say it: a sentence on Connection Type fills what it names, the cloud region too, and passes nothing for you', () => {
  const c = startWays('DataCenter / CoLocation to Cloud');
  vals(c).cfBack();
  assert.equal(vals(c).cfKey, 'type');
  assert.ok(S4.includes('{{ setFreeText }}') && S4.includes('{{ parseText }}'), 'the free-text box left the flow');
  c.state.freeText = 'AWS us-west-2 to the internet, no direct internet path';
  vals(c).parseText();
  const v = vals(c);
  assert.equal(row(v, 'type').value, 'Internet to Cloud');
  assert.equal(row(v, 'type').word, 'You picked');
  assert.equal(row(v, 'cloud').value, 'AWS us-west-2');
  assert.equal(row(v, 'cloud').word, 'You picked');
  assert.equal(row(v, 'policy').value, 'No direct internet path');
  assert.equal(v.cfKey, 'basic', 'it lands on the first step still needing you');
  assert.deepEqual(v.cfSteps.slice(0, 2).map(s => s.state), ['filled', 'filled'], 'typed, not passed: filled, never done');
  assert.match(v.cfSteps[1].sub, /^From what you typed: AWS us-west-2$/);
  // The banner is titled for what it is, and the location the region implies is filled from your estate.
  assert.equal(v.parsedNoteTitle, 'From what you typed');
  assert.equal(row(v, 'loc').value, 'Seattle');
  assert.equal(row(v, 'loc').word, 'From your estate');
});

test('Orders calls the order in progress by the name you gave it', () => {
  const c = startWays('DataCenter / CoLocation to Cloud');
  c.state.compose = { ...c.state.compose, name: 'Ashburn to eastus' };
  Object.assign(c.state, { screen: 's3', layer: 'cloud', tab: 'connect', cnPage: 'orders' });
  assert.equal(vals(c).ordInProgress.title, 'Ashburn to eastus');
});

test('the sites an order carries open from the panel and the picture, exactly those', () => {
  const c = flow('partial', { prefillSets: [{ sites: ['Charlotte branch', 'Phoenix branch', 'Madrid branch'], connectionType: 'VPN to Cloud', sourceLabel: 'Recommended' }] });
  const v = vals(c);
  const r = row(v, 'sites');
  assert.equal(r.hasMore, true);
  assert.equal(r.moreLabel, 'All 3 sites');
  assert.equal(v.cfDiagram.left, '3 sites');
  assert.equal(v.cfDiagram.leftOpens, true);
  v.cfDiagram.leftGo();
  assert.deepEqual(vals(c).cfWipList.all.map(x => x.name), ['Charlotte branch', 'Phoenix branch', 'Madrid branch']);
});

test('Place order lands on Orders; Deliver now validates the region that order reaches, and its stage says so', () => {
  const c = startWays('Internet to Cloud');
  pickRegion(c, 'GCP us-central1');
  walkToReview(c);
  vals(c).cfPlace();
  assert.equal(c.state.orders.at(-1).region, 'us-central1');
  vals(c).deliverNow();
  assert.equal(c.state.landed, 'us-central1');
  Object.assign(c.state, { screen: 's3', layer: 'cloud', tab: 'connect', cnPage: 'orders' });
  assert.equal(vals(c).ordRows[0].stage, 'Validated · live');
});

test('the Connect tabs name the destinations: Recommended, Ways to connect, Orders', () => {
  assert.deepEqual(vals(ways()).cnPanels.map(p => p.label), ['Recommended', 'Ways to connect', 'Orders']);
});

test('the stepper and the panel never clip a word', () => {
  // The steps are the vertical tab group since 2026-10-02; a step's value wraps under its title, never cut with an ellipsis.
  const stepper = S4.slice(S4.indexOf('<nav class="fw-vtabs" aria-label="Steps"'), S4.indexOf('</nav>'));
  assert.ok(stepper.length > 0);
  assert.ok(!/text-overflow:\s*ellipsis/.test(stepper), 'a step subtitle is cut off with an ellipsis');
  assert.ok(!/\.fw-vtab \.lbl>small\{[^}]*ellipsis/.test(HTML), 'the step sub-line clips in CSS');
  const wip = S4.slice(S4.indexOf('<aside aria-label="Your order, in progress"'), S4.indexOf('</aside>'));
  assert.ok(wip.length > 0);
  assert.ok(!/text-overflow:\s*ellipsis/.test(wip), 'the picture cuts a name off');
  // Lists are the page, never boxed (2026-09-29): what "All N" opens sits in the main column, not in the panel's card.
  assert.ok(!wip.includes('cfWipList.rows'), 'the order\'s list opens inside the panel card');
  assert.ok(S4.includes('<sc-for list="{{ cfWipList.rows }}"'), 'the order\'s list has no page');
});
