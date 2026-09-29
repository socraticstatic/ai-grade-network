import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// "Why is forecast in a drawer, and why are you containerizing things like
// logs?" (Micah, 2026-09-29). Forecast is a Cost view like Spend and Savings;
// Logs is the page, not a card holding a box that scrolls. It pages to fit.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const rail = (c, label) => vals(c).railGroups.flatMap(g => g.items).find(i => i.label === label);

test('Forecast is a Cost tab; the rail opens it and lights', () => {
  const c = mkC({ view: 'partial', screen: 's3', tab: 'connect', estateParam: null });
  rail(c, 'Forecast').go();
  assert.equal(c.state.tab, 'cost');
  assert.equal(c.state.costPanel, 'forecast');
  assert.equal(c.state.sub, null, 'no drawer');
  const v = vals(c);
  assert.equal(v.costPanelForecast, true);
  assert.ok(v.costPanels.some(p => p.key === 'forecast' && p.label === 'Forecast'));
  assert.equal(rail(c, 'Forecast').cur, true);
});

test('the forecast draws on the Cost page, not in the drawer', () => {
  const a = HTML.indexOf('<sc-if value="{{ costPanelForecast }}"');
  assert.ok(a > 0);
  assert.match(HTML.slice(a, a + 3000), /aria-label="Egress forecast"/);
  assert.equal(HTML.indexOf('subIsForecast'), -1);
});

test('Logs is not a card, and nothing on it scrolls inside a box', () => {
  assert.match(HTML, /<div id="sec-logs" style="display:grid;gap:12px">/);
  assert.equal(HTML.indexOf('class="log-frame"'), -1);
});

test('the flow records page to fit the fold, and say where you are', () => {
  const c = mkC({ view: 'partial', screen: 's3', tab: 'observe', obPage: 'logs', estateParam: null });
  let v = vals(c);
  assert.ok(v.flowRecords.length > 0 && v.flowRecords.length <= v.logPageSize);
  assert.equal(v.logPager.label, `1–${v.logPageSize} of 20`);
  assert.equal(v.logPager.prevOp, 0.4, 'no page before the first');
  v.logPager.next();
  v = vals(c);
  assert.equal(v.logPager.label, `${v.logPageSize + 1}–${v.logPageSize * 2} of 20`);
  v.setLogQ({ target: { value: 'prod' } });
  assert.equal(vals(c).logPager.label.startsWith('1–'), true, 'a new filter starts at the first page');
});

test('user activity pages the same way', () => {
  const c = mkC({ view: 'partial', screen: 's3', tab: 'observe', obPage: 'logs', logTab: 'user', estateParam: null });
  const v = vals(c);
  assert.ok(v.actRows.length <= v.actPageSize);
  assert.match(v.actPager.label, /^1–\d+ of 18$/);
  assert.match(HTML, /aria-label="Next page"/);
});
