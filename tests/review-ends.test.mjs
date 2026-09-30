import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals, estateFor } from '../naas-app.js';
import { mkC } from './harness.mjs';
import { walkFlow } from './flow-walk.mjs';

// Every order review reads true (review round 2, 2026-09-30). Round 1 gave
// Resize its own path ends; every other order still drew its two ends by
// cutting pathDesc (a product promise or a finding head) on ' to ': Hosted VPC
// read "A VPC in your region with ..." to "Destination", C2C "Cloud" to "Cloud
// on AT&T, on the best path, never the public internet.", AVPN "MPLS VPN,
// private end" to "end, into the AT&T network.", and Growing's single-path
// tiers "Azure eastus has one path, and finance rides it" to "Destination".
// 245 of 245 such reviews across the five estates. Every order now carries
// short, true ends (pathSrc, pathDst) from its own compose, its product (or
// the product's category) or its finding. The unpriced Resize also showed
// term chips that change nothing and a headers-only policy table; the lines
// and the pricing box priced in two phrases; and the Product column cut
// "AT&T-hosted VPC per reg...".

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const store = {};
globalThis.localStorage = globalThis.localStorage || { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const APP = readFileSync(new URL('../naas-app.js', import.meta.url), 'utf8');
const S6 = HTML.slice(HTML.indexOf('<!-- ===== S6 REVIEW ===== -->'), HTML.indexOf('<!-- ===== S7 BROWSE ===== -->'));
const NOW = '2026-09-29T12:00:00Z';

// Every door onto Review: each catalog product, each package, each Cost >
// Optimize move and each finding tier, on every estate (and Growing with a
// found Oracle source, whose finding only exists then). A door that opens
// Compose is carried on to Review.
const VARIANTS = [
  { tag: 'Growing', view: 'partial' }, { tag: 'Established', view: 'mature' }, { tag: 'Bank scale', view: 'trust' },
  { tag: 'Small', view: 'small' }, { tag: 'New', view: 'empty' },
  { tag: 'Growing + Oracle', view: 'partial', addedSources: [{ provider: 'Oracle', at: Date.parse(NOW), estId: 'partial' }] },
];
const LAYERS = ['ai', 'cloud', 'net', 'transport'];
let memo = null;
function everyOrder() {
  if (memo) return memo;
  const out = [];
  for (const x of VARIANTS) {
    const c = mkC({ view: x.view, estateParam: null, screen: 's7', layer: 'cloud', tab: 'connect', ...(x.addedSources ? { addedSources: x.addedSources } : {}) });
    const snap = JSON.stringify(c.state);
    const reset = (patch) => { for (const k of Object.keys(c.state)) delete c.state[k]; Object.assign(c.state, JSON.parse(snap), patch || {}); };
    // A door that opens the connect flow (2026-09-30) reaches the flow's own Review
    // step: the order there is the one Place order places.
    const flowReview = () => {
      const done = walkFlow(c.state.compose, estateFor(c.state));
      if (!done) return null;
      c.state.compose = done;
      const v = vals(c);
      assert.equal(v.cfIsReview, true);
      return v.cfOrder;
    };
    const land = (label, go, patch) => {
      reset(patch);
      go();
      if (c.state.screen === 's4') { const o = flowReview(); if (o) out.push({ label: `${x.tag}: ${label}`, order: o, state: JSON.parse(JSON.stringify(c.state)), flow: true }); return; }
      assert.equal(c.state.screen, 's6', `${x.tag} ${label} never reached Review`);
      out.push({ label: `${x.tag}: ${label}`, order: c.state.order, state: JSON.parse(JSON.stringify(c.state)) });
    };
    const v = vals(c);
    for (const card of v.results) land(`product ${card.id}`, card.choose);
    for (const p of v.packages) land(`package ${p.id}`, p.choose);
    // Cost > Optimize: Resize lands on Review; the other moves open Compose, and Compose goes on to Review.
    const OPT = { screen: 's3', layer: 'cloud', tab: 'cost' };
    reset(OPT);
    for (const key of (vals(c).optRows || []).map(r => r.key)) {
      reset(OPT);
      vals(c).optRows.find(r => r.key === key).go();
      if (c.state.screen === 's4') { const o = flowReview(); if (o) out.push({ label: `${x.tag}: optimize ${key}`, order: o, state: JSON.parse(JSON.stringify(c.state)), flow: true }); }
      else if (c.state.screen === 's6') out.push({ label: `${x.tag}: optimize ${key}`, order: c.state.order, state: JSON.parse(JSON.stringify(c.state)) });
    }
    const seen = new Set();
    for (const layer of LAYERS) {
      reset({ screen: 's3', layer });
      const lv = vals(c);
      for (const f of [...lv.connectFindings, ...lv.governFindings, ...lv.observeFindings, ...lv.costFindings]) for (const t of f.tiers) {
        const k = f.kind + '|' + t.name; if (seen.has(k)) continue; seen.add(k);
        land(`tier ${k}`, t.choose, { screen: 's3', layer });
      }
    }
  }
  memo = out;
  return out;
}
const at = (label) => { const o = everyOrder().find(x => x.label === label); assert.ok(o, `no order ${label}`); return o; };
// The two ends an order carries for the Review diagram.
const endsOf = (label) => { const o = at(label).order; return { src: o.pathSrc, dst: o.pathDst }; };

test('every order that reaches Review names two short, true ends', () => {
  const all = everyOrder();
  // 245 reviews plus the 25 tiers that open Compose, and the found Oracle source on top.
  assert.ok(all.length >= 270, `only ${all.length} orders enumerated`);
  const bad = [];
  for (const { label, order } of all) {
    const e = { src: order.pathSrc, dst: order.pathDst };
    for (const [side, end] of [['src', e.src], ['dst', e.dst]]) {
      if (typeof end !== 'string' || !end.trim() || end.length > 22 || /^(source|destination)$/i.test(end.trim()) || / to /.test(end) || /[.,]$/.test(end)) bad.push(`${label} ${side}: ${JSON.stringify(end)}`);
    }
    if (e.src && e.src === e.dst) bad.push(`${label}: both ends read ${e.src}`);
  }
  assert.deepEqual(bad, [], `${bad.length} of ${all.length} reviews:\n${bad.slice(0, 40).join('\n')}`);
});

test('the ends say where the order goes', () => {
  assert.deepEqual(endsOf('Growing: product hosted-vpc'), { src: 'Your sites', dst: 'Your cloud region' });
  assert.deepEqual(endsOf('Growing: product hosted-vnet'), { src: 'Your sites', dst: 'Your Azure region' });
  assert.deepEqual(endsOf('Growing: product c2c'), { src: 'Your cloud region', dst: 'Your other clouds' });
  assert.deepEqual(endsOf('Growing: product avpn'), { src: 'Your sites', dst: 'Your clouds' });
  assert.deepEqual(endsOf('Growing: product neocloud'), { src: 'Your clouds', dst: 'Neoclouds' });
  // The single-path finding names its region, on every tier that builds an order from it.
  assert.deepEqual(endsOf('Growing: tier single|Geodiversity tier with a second metro'), { src: 'Your sites', dst: 'Azure eastus' });
  assert.deepEqual(endsOf('Growing: tier single|Maximum resiliency with a second provider'), { src: 'Your sites', dst: 'Azure eastus' });
  assert.deepEqual(endsOf('Growing: tier pci|Hosted VPC in us-east-1 with the policy enforced'), { src: 'Your sites', dst: 'AWS us-east-1' });
  assert.deepEqual(endsOf('Bank scale: tier pci|Hosted VPC in us-west-2 with the policy enforced'), { src: 'Your sites', dst: 'AWS us-west-2' });
  assert.deepEqual(endsOf('Growing: tier uninspected|NGFW (Palo Alto) in path'), { src: 'AWS eu-west-1', dst: 'The internet' });
  // A tier whose product is itself the far end says so, whatever the finding was about.
  assert.equal(endsOf('Growing: tier crosscloud|Neocloud reach via Equinix Fabric').dst, 'Neoclouds');
  // A tier that opens the connect flow (2026-09-30) ends where its order does: the
  // site at the order's location and the cloud region it reaches, both named. Steer
  // is Internet to Cloud, NetBond Advanced's public internet on-ramp: the internet
  // and the region, never a site nobody attached.
  assert.deepEqual(endsOf('Growing: tier avoidable|Steer this bucket on AT&T'), { src: 'The internet', dst: 'AWS us-east-1' });
  assert.deepEqual(endsOf('Growing: tier pci|Author "private path required" for tag PCI'), { src: 'Ashburn DC', dst: 'AWS us-east-1' });
  // Round 1's Resize keeps its own ends.
  assert.deepEqual(endsOf('Growing: optimize capacity'), { src: 'Your sites', dst: 'AWS us-east-1' });
  // A finding the observe data raises names its one region, or counts them.
  assert.deepEqual(endsOf('Established: tier blindspots|Managed NOC'), { src: 'Your sites', dst: 'AWS ap-southeast-1' });
  assert.deepEqual(endsOf('Growing: tier blindspots|Managed NOC'), { src: 'Your sites', dst: '5 unseen regions' });
  assert.deepEqual(endsOf('Growing + Oracle: tier newcloud-oracle|Oracle FastConnect over NetBond'), { src: 'Your sites', dst: '2 Oracle regions' });
});

test('the page reads the order\'s ends, never a split of pathDesc', () => {
  for (const label of ['Growing: product hosted-vpc', 'Growing: product c2c', 'Bank scale: product avpn', 'Growing: tier single|Geodiversity tier with a second metro']) {
    const o = at(label), v = vals(mkC(o.state));
    for (const end of [v.reviewSrc, v.reviewDst]) assert.ok(end.length <= 22 && !/^(Source|Destination)$/.test(end) && !/ to /.test(end), `${label}: the page draws ${JSON.stringify(end)}`);
    assert.equal(v.reviewSrc, o.order.pathSrc, label);
    assert.equal(v.reviewDst, o.order.pathDst, label);
  }
  assert.ok(!APP.includes(".split(' to ')"), 'nothing cuts a sentence on " to " for a path end');
  assert.ok(!/'(Source|Destination)'/.test(APP.slice(APP.indexOf('// ---- review ----'), APP.indexOf('// ---- browse ----'))), 'no placeholder end on Review');
});

// The block an <sc-if value="{{ key }}"> opens, through its matching close.
const gate = (html, key) => {
  const i = html.indexOf(`<sc-if value="{{ ${key} }}"`);
  if (i < 0) return '';
  const re = /<sc-if\b|<\/sc-if>/g; re.lastIndex = i;
  let depth = 0, m;
  while ((m = re.exec(html))) { depth += m[0] === '</sc-if>' ? -1 : 1; if (!depth) return html.slice(i, re.lastIndex); }
  return '';
};
const resized = () => {
  const c = mkC({ view: 'partial', estateParam: null, screen: 's3', layer: 'cloud', tab: 'cost' });
  vals(c).optRows.find(r => r.key === 'capacity').go();
  assert.equal(c.state.screen, 's6');
  return c;
};

test('an unpriced order offers no term to pick and no empty policy table', () => {
  const r = vals(resized());
  assert.equal(r.orderPriced, false);
  assert.equal(r.hasOrderPolicies, false, 'Resize ships no policy');
  const hv = vals(mkC(at('Growing: product hosted-vpc').state));
  assert.equal(hv.orderPriced, true);
  assert.equal(hv.hasOrderPolicies, true);
  assert.ok(gate(S6, 'orderPriced').includes('{{ termOptions }}'), 'the term chips sit behind the price gate');
  assert.ok(gate(S6, 'hasOrderPolicies').includes('{{ orderPolicies }}'), 'the policy table sits behind its own gate');
  assert.ok(!/v\.hasOrderPolicies\s*=/.test(HTML), 'renderVals must not overwrite hasOrderPolicies');
});

test('an unpriced line and the pricing box say one phrase', () => {
  const PHRASE = 'Priced by AT&T after review';
  const r = vals(resized());
  assert.equal(r.priceNote, PHRASE);
  assert.deepEqual(r.orderLines.map(l => l.monthlyF), [PHRASE]);
  const hv = vals(mkC(at('Growing: product hosted-vpc').state));
  const unpricedLines = hv.orderLines.filter(l => l.unpriced);
  assert.ok(unpricedLines.length > 0);
  for (const l of unpricedLines) assert.equal(l.monthlyF, PHRASE, l.product);
  assert.equal(hv.priceNote, PHRASE);
  for (const other of ['Priced after survey', 'Priced after review']) {
    assert.ok(!APP.includes(other), `naas-app.js still says "${other}"`);
    assert.ok(!HTML.includes(other), `the markup still says "${other}"`);
  }
});

test('the order table lets a long product name read whole', () => {
  const cell = S6.slice(S6.indexOf('data-th="Product"'), S6.indexOf('{{ l.product }}'));
  assert.ok(cell.length > 0, 'the Product cell is gone');
  assert.ok(!/white-space:nowrap/.test(cell), 'the Product cell may wrap');
  assert.ok(!/text-overflow:ellipsis/.test(cell), 'the Product cell never cuts a name');
});
