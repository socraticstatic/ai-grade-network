import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// Cost > Optimize (notes, 2026-09-30, Task 2.5): "Show summary such as What
// should I change first? Spend ... update connection type. Routing ... update
// routing policy. Resiliency ... add backup path. Capacity ... Resize."

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const store = {};
globalThis.localStorage = globalThis.localStorage || { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const cost = (view, patch = {}) => mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'cost', ...patch });
const dollars = (s) => +String(s).replace(/[^\d]/g, '');

test('Optimize rows come in the stakeholder\'s order, with his verbs', () => {
  const r = vals(cost('partial')).optRows;
  assert.deepEqual(r.map(x => x.label), ['Spend', 'Routing', 'Resiliency', 'Capacity']);
  assert.deepEqual(r.map(x => x.cta), ['Update connection type', 'Update routing policy', 'Add backup path', 'Resize']);
});

test('Growing: the four rows read the estate', () => {
  const [spend, routing, resil, cap] = vals(cost('partial')).optRows;
  assert.equal(spend.figureF, 'Save $28,700/mo');
  assert.equal(routing.figureF, 'Save $12,800/mo');
  assert.ok(resil.lines.some(l => /Azure eastus/.test(l) && /finance/.test(l)), resil.lines.join(' | '));
  assert.ok(cap.lines.some(l => /AWS us-east-1/.test(l) && /2 × 10 Gbps/.test(l)), cap.lines.join(' | '));
});

test('Spend plus Routing is the head\'s potential savings, on every estate', () => {
  for (const view of ['partial', 'mature', 'trust', 'small']) {
    const r = vals(cost(view)).optRows;
    const sum = (r[0].figure || 0) + (r[1].figure || 0);
    const head = vals(mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe' })).pageVerdict;
    const m = head.match(/\$([\d,]+)\/mo potential savings/);
    assert.equal(sum, m ? dollars(m[1]) : 0, `${view}: ${sum} vs ${head}`);
  }
});

test('a dismissed or snoozed finding leaves its row', () => {
  const c = mkC({ view: 'partial', estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'insights', insPanel: 'findings' });
  vals(c).findAll.find(r => r.key === 'ipsecegress').open();
  vals(c).fd.actions.find(a => a.label === 'Snooze 7 days').go();
  c.setState({ tab: 'cost', fdKey: null });
  assert.equal(vals(c).optRows[0].figureF, 'Save $23,200/mo');
});

test('every action lands', () => {
  let c = cost('partial'); vals(c).optRows[0].go();
  assert.equal(c.state.screen, 's4'); assert.equal(c.state.compose.qty, 5); assert.match(c.state.compose.note, /IPsec/);
  c = cost('partial'); vals(c).optRows[1].go();
  assert.equal(c.state.tab, 'govern'); assert.ok(c.state.authoring.req.includes('Cost-aware routing'));
  c = cost('partial'); vals(c).optRows[2].go();
  assert.equal(c.state.screen, 's4'); assert.equal(c.state.compose.prefillRegion, 'Azure eastus');
  assert.equal(c.state.compose.resiliency, 'Geodiversity'); assert.ok(c.state.compose.metros.length >= 2, 'two metros, so Geodiversity is not blocked');
  // Resize opens Modify bandwidth in place at one port fewer (Micah, 2026-09-30: "like the
  // netbond advanced flow"); it no longer stages a Review order (tests/modify-bandwidth.test.mjs).
  c = cost('partial'); vals(c).optRows[3].go();
  assert.equal(c.state.screen, 's3'); assert.equal(c.state.tab, 'cost');
  assert.equal(c.state.bwFor, 'cx-us-east-1'); assert.deepEqual(c.state.bwPick, { id: 'cx-us-east-1', ports: 2, mbps: 10000 });
  assert.equal(vals(c).bw.newLabel, '2 × 10 Gbps');
});

test('small and empty degrade in words, never $0 or NaN', () => {
  for (const view of ['small', 'empty']) {
    const v = vals(cost(view));
    const text = JSON.stringify((v.optRows || []).map(r => [r.head, r.figureF, r.lines]));
    assert.ok(!/\$0\b|NaN|undefined/.test(text), `${view}: ${text}`);
  }
  assert.equal(vals(cost('empty')).optEmpty, 'No egress seen yet.');
});

test('Cost opens on Optimize; the rail lists Optimize, then Spend; old panel keys land on Spend', () => {
  const v = vals(cost('partial'));
  assert.equal(v.costPanels[0].label, 'Optimize');
  assert.ok(v.costPanelOptimize);
  const group = v.railGroups.find(g => g.title === 'Cost');
  assert.deepEqual(group.items.map(i => i.label), ['Optimize', 'Spend']);
  for (const k of ['banked', 'forecast', 'savings']) assert.ok(vals(cost('partial', { costPanel: k })).costPanelSpend, k);
  assert.ok(HTML.includes('id="sec-optimize"'));
  assert.ok(!HTML.includes('{{ costMoves }}'), 'the two-moves strip repeated Optimize');
});
