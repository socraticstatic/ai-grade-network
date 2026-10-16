import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// The order wizard on Govern's grammar (2026-10-02): the steps as a vertical tab group under What, Where, How, Terms and
// Review; the panel's picture as the four-station strip, dashed where the estate filled it; Review opening with the outcome.
if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const S4 = HTML.slice(HTML.indexOf('<!-- ===== S4 COMPOSE ===== -->'), HTML.indexOf('<!-- ===== S5 RECOMMEND ===== -->'));
const onDisk = (n) => existsSync(new URL(`../brand/icons/${n}.svg`, import.meta.url));
const flow = (compose, extra = {}) => mkC({ view: 'partial', estateParam: null, screen: 's4', compose: { outcome: null, source: [], dest: [], regionTab: 'US East', metros: [], resiliency: 'Standard', control: [], ...compose }, ...extra });
const DC = 'DataCenter / CoLocation to Cloud';

test('the steps carry a category head and a glyph, the head on the first step of each', () => {
  const v = vals(flow({ ctype: DC, from: { ctype: 'you' }, passed: ['type'], fk: 'provider' }));
  assert.deepEqual(v.cfSteps.map(s => s.cat), ['What', 'Where', 'How', 'How', 'Terms', 'Review']);
  assert.deepEqual(v.cfSteps.map(s => s.catFirst), [true, true, true, false, true, true]);
  for (const s of v.cfSteps) assert.ok(onDisk(s.icon), `${s.key}: ${s.icon}`);
  assert.deepEqual(v.cfSteps.map(s => s.isCurrent), [false, true, false, false, false, false]);
  assert.equal(v.cfSteps[0].mark, '✓'); assert.equal(v.cfSteps[0].state, 'done');
});

// The strip tests left with the strip (2026-10-16): the wizard's bar is buttons only; Orders' rows draw their own path.

test('Review opens with today against the order, the price and when it stands up', () => {
  const v = vals(flow({ ctype: DC, regions: ['AWS us-west-2'], metros: ['Seattle'], bandwidth: '10 Gbps', resiliency: 'Standard', term: 12, from: { ctype: 'you', regions: 'you', loc: 'you', bandwidth: 'you', tier: 'you', term: 'you' }, passed: ['type', 'provider', 'basic', 'advanced', 'terms'], fk: 'review' }));
  assert.equal(v.cfIsReview, true);
  assert.equal(v.cfOutcome.has, true);
  assert.equal(v.cfOutcome.todayPath, 'Public internet');
  // Today and after read the path and its uptime, never a delay (2026-10-15).
  assert.equal(v.cfOutcome.todayLine, 'Best effort, no SLA on the middle');
  assert.equal(v.cfOutcome.afterPath, 'Private on the AT&T network');
  assert.match(v.cfOutcome.afterLine, /^99\.99% · Private/);
  assert.equal(v.cfOutcome.todayMs, undefined);
  assert.match(v.cfOutcome.standUp, /business days/);
  assert.match(v.cfOutcome.priceBig, /^\$[\d,]+\/mo$/);
});

test('the S4 markup draws the stepper and the outcome, and the strip, the old vertical tabs and the svg are gone', () => {
  // The steps ran down the left from 2026-10-02; since 2026-10-16 they run across the top in NetBond Advanced's shape.
  assert.match(S4, /<nav class="cw-steps" aria-label="Steps"/);
  assert.ok(!S4.includes('<nav class="fw-vtabs"'), 'the vertical tab group left');
  assert.ok(!S4.includes('<div class="ps mid"'), 'the strip is in the wizard; it left on 2026-10-16, the bar is buttons only');
  assert.ok(S4.includes('{{ cfOutcome.todayPath }}') && S4.includes('{{ cfOutcome.priceBig }}'));
  assert.ok(!S4.includes('<ol aria-label="Steps"'), 'the horizontal stepper left');
  assert.ok(!S4.includes('viewBox="0 0 284 92"'), 'the three-box svg left');
});
