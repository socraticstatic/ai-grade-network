import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// Optimize > Resize review (final review, finding 8, 2026-09-30): the Capacity
// row's Resize landed on a Review page that read "On-demand $0/mo · 36-month
// $0/mo · save 50% vs on-demand", drew a path from "Sized" to "what it carries,
// with the p…", and named j.martinez@meridianlogistics.com on Acme (Growing).
// The review says what changes, never prices nothing, and asks for approval
// on the estate's own domain.
//
// Modify bandwidth (Micah, 2026-09-30: "option to resize bandwidth like the
// netbond advanced flow") retired that route: Resize opens the flow in place.
// The facts the review carried (the ports before and after, where the peak
// lands, one business day) are asserted there; an unpriced order, the shape
// the retired Resize built, still reviews without $0 or a saving on nothing.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const store = {};
globalThis.localStorage = globalThis.localStorage || { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');

// An unpriced order on Review: the shape the retired Resize built (one port off Growing's us-east-1).
const UNPRICED = { title: 'Resize AWS us-east-1', lines: [{ line: 1, product: 'Remove a 10 Gbps port', qty: 1, term: '36-month', monthly: 0, unpriced: true }], policies: [], monthly: 0, savings: 0, days: 1,
  pathSrc: 'Your sites', pathDst: 'AWS us-east-1', pathDesc: 'AWS us-east-1 on NetBond: 3 × 10 Gbps to 2 × 10 Gbps. The peak goes from 41% to about 62% of what is bought.' };
const resized = () => mkC({ view: 'partial', estateParam: null, screen: 's6', term: 36, order: UNPRICED });
// Growing's Optimize > Capacity > Resize, opened in place.
const resizing = () => {
  const c = mkC({ view: 'partial', estateParam: null, screen: 's3', layer: 'cloud', tab: 'cost' });
  const cap = vals(c).optRows.find(r => r.key === 'capacity');
  assert.equal(cap.cta, 'Resize');
  cap.go();
  assert.equal(c.state.screen, 's3');
  return c;
};
// Everything the Review page reads out, as vals hands it over.
const REVIEW_KEYS = ['orderTitle', 'pathDesc', 'reviewSrc', 'reviewDst', 'orderLines', 'pricedTotalF', 'termTotalF', 'termSaveF', 'priceNote', 'unpriced', 'orderTimeline', 'orderSave', 'approver'];
const reviewText = (v) => JSON.stringify(REVIEW_KEYS.map(k => v[k]));

test('Resize shows the real change in place: before and after ports, where the peak lands, when, never $0', () => {
  const v = vals(resizing()), bw = v.bw;
  const text = JSON.stringify(bw);
  assert.ok(!/\$0\b/.test(text), text);
  assert.equal(bw.nowLabel, '3 × 10 Gbps');
  assert.equal(bw.newLabel, '2 × 10 Gbps');
  assert.equal(bw.stats.find(x => x.l === 'Peak').sub, '41% of 30 Gbps');
  const on = bw.choices.find(ch => ch.on);
  assert.equal(on.capF, '20 Gbps'); assert.equal(on.fitWord, 'Holds the peak');
  assert.match(bw.whenLine, /^Takes effect in 1 business day, /);
});

test('an unpriced order reviews the real change: before and after ports, never $0, never a saving on nothing', () => {
  const c = resized(), v = vals(c);
  const text = JSON.stringify(c.state.order) + reviewText(v);
  assert.ok(!/\$0\b/.test(text), text);
  assert.ok(!/save 50%/.test(text), text);
  assert.ok(!/meridianlogistics\.com/.test(text), text);
  assert.match(v.pathDesc, /AWS us-east-1/);
  assert.match(v.pathDesc, /3 × 10 Gbps to 2 × 10 Gbps/);
  assert.match(v.pathDesc, /41%/);
  assert.match(v.pathDesc, /62%/);
  assert.equal(v.orderPriced, false);
  assert.equal(v.hasTermSave, false);
  assert.equal(v.priceNote, 'Priced by AT&T after review');
  assert.equal(v.orderTimeline, '1 business day');
});

test('the Resize path names its two ends, never a cut sentence', () => {
  const v = vals(resized());
  assert.equal(v.reviewDst, 'AWS us-east-1');
  assert.equal(v.reviewSrc, 'Your sites');
});

test('a priced order still shows its totals and its term saving', () => {
  const c = mkC({ view: 'partial', estateParam: null, screen: 's6', term: 36, order: { title: 'Attach', lines: [{ line: 1, product: 'NetBond', qty: 1, term: '36-month', monthly: 4200, unpriced: false }], policies: [], monthly: 4200, savings: 0, days: 5, pathDesc: 'Data center to Clouds · Standard · Ashburn' } });
  const v = vals(c);
  assert.equal(v.orderPriced, true);
  assert.equal(v.pricedTotalF, '$4,200/mo');
  assert.equal(v.termTotalF, '$2,100/mo');
  assert.equal(v.termSaveF, 'save 50% vs on-demand');
  // Review round 2 (2026-09-30): the page never cuts pathDesc on ' to ' for an
  // end. An order with no ends of its own (one saved before orders carried
  // them) reads its product's; this NetBond line's are the generic pair.
  assert.equal(v.reviewSrc, 'Your sites');
  assert.equal(v.reviewDst, 'Your clouds');
  c.setState({ term: 0 });
  assert.equal(vals(c).hasTermSave, false, 'On-demand saves nothing against itself');
});

test('the approver is on the estate\'s own domain until someone types one', () => {
  const want = { partial: 'acme.com', mature: 'dataflowsystems.com', trust: 'meridiannetworks.com', small: 'trinitysupply.com', empty: 'meridianlogistics.com' };
  for (const [view, domain] of Object.entries(want)) {
    const v = vals(mkC({ view, estateParam: null, screen: 's6' }));
    assert.equal(v.approver.split('@')[1], domain, `${view}: ${v.approver}`);
  }
  // The briefing and the approver read one domain.
  const b = vals(mkC({ view: 'partial', estateParam: null, screen: 's3' })).briefWho[0].mail;
  assert.equal(b.split('@')[1], 'acme.com');
  const c = mkC({ view: 'partial', estateParam: null, screen: 's6' });
  vals(c).setApprover({ target: { value: 'pat@acme.com' } });
  assert.equal(vals(c).approver, 'pat@acme.com');
});

test('the page shows what vals says: gated totals, a bound term saving, no fixed approver', () => {
  const s6 = HTML.slice(HTML.indexOf('<!-- ===== S6 REVIEW ===== -->'), HTML.indexOf('<!-- ===== S7 BROWSE ===== -->'));
  assert.ok(!s6.includes('save {{ termDisc }}%'), 'the saving is a bound string, empty when there is nothing to save');
  assert.ok(s6.includes('<sc-if value="{{ orderPriced }}"'), 'the totals hide when the order carries no price');
  // renderVals sets v.hasPrice for the Browse price filter on every render, so the review's gate has its own name.
  for (const k of ['orderPriced', 'orderUnpriced', 'hasTermSave', 'termSaveF', 'priceNote', 'reviewSrc', 'reviewDst']) assert.ok(!new RegExp(`v\\.${k}\\s*=`).test(HTML), `renderVals must not overwrite ${k}`);
  assert.ok(s6.includes('<sc-if value="{{ hasTermSave }}"'));
  assert.ok(s6.includes('{{ priceNote }}'));
  assert.ok(!/meridianlogistics/.test(HTML), 'no approver fixed to another estate\'s domain');
  assert.ok(!/const pd = \(v\.pathDesc/.test(HTML), 'the path ends come from vals, not a split sentence');
});
