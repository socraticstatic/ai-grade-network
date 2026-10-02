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

test('the strip fills in as the order does: nothing, then the cloud, then the first mile and the core', () => {
  const c = flow({ ctype: DC, from: { ctype: 'you' }, passed: ['type'], fk: 'provider' });
  let v = vals(c);
  assert.deepEqual([v.cfStrip.site, v.cfStrip.edge, v.cfStrip.core, v.cfStrip.cloud], ['any', 'any', 'any', 'any']);
  assert.equal(v.cfStrip.coreText, 'Standard until you pick');
  for (const n of [v.cfStrip.siteIcon, v.cfStrip.edgeIcon, v.cfStrip.cloudIcon]) assert.ok(onDisk(n), n);
  v.cfClouds.flatMap(cl => cl.regions).find(r => r.name === 'AWS us-east-1').pick();
  v = vals(c);
  assert.equal(v.cfStrip.cloud, 'set'); assert.equal(v.cfDiagram.right, 'AWS us-east-1');
  v.cfNext(); v = vals(c);
  v.cfTiers.find(t => t.tier === 'Maximum').pick(); v = vals(c);
  assert.equal(v.cfStrip.core, 'set'); assert.equal(v.cfStrip.coreText, 'Maximum · 2 paths');
  v.cfBandwidths.find(b => b.label === '10 Gbps').pick(); v = vals(c);
  assert.equal(v.cfStrip.edge, 'set'); assert.match(v.cfStrip.edgeText, /10 Gbps/);
});

test('an end the estate filled is dashed, not solid', () => {
  const v = vals(flow({ ctype: DC, regions: ['AWS us-west-2'], from: { ctype: 'you', regions: 'estate' }, passed: ['type'], fk: 'provider' }));
  assert.equal(v.cfStrip.cloud, 'filled');
});

test('Review opens with today against the order, the price and when it stands up', () => {
  const v = vals(flow({ ctype: DC, regions: ['AWS us-west-2'], metros: ['Seattle'], bandwidth: '10 Gbps', resiliency: 'Standard', term: 12, from: { ctype: 'you', regions: 'you', loc: 'you', bandwidth: 'you', tier: 'you', term: 'you' }, passed: ['type', 'provider', 'basic', 'advanced', 'terms'], fk: 'review' }));
  assert.equal(v.cfIsReview, true);
  assert.equal(v.cfOutcome.has, true);
  assert.equal(v.cfOutcome.todayPath, 'Public internet');
  assert.match(v.cfOutcome.todayMs, /^\d+ ms p95$/);
  assert.equal(v.cfOutcome.afterPath, 'Private on the AT&T network');
  assert.match(v.cfOutcome.afterLine, /ms · 99\.99% · Private/);
  assert.match(v.cfOutcome.standUp, /business days/);
  assert.match(v.cfOutcome.priceBig, /^\$[\d,]+\/mo$/);
});

test('the S4 markup draws the vertical tabs, the strip and the outcome, and the old stepper and svg are gone', () => {
  assert.match(S4, /<nav class="fw-vtabs" aria-label="Steps"/);
  assert.match(S4, /<div class="ps mid" role="img" aria-label="The path, as it fills in"/);
  assert.ok(S4.includes('{{ cfOutcome.todayPath }}') && S4.includes('{{ cfOutcome.priceBig }}'));
  assert.ok(!S4.includes('<ol aria-label="Steps"'), 'the horizontal stepper left');
  assert.ok(!S4.includes('viewBox="0 0 284 92"'), 'the three-box svg left');
});
