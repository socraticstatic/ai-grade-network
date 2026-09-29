import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import { vals, runScan, SUB_PANELS } from '../naas-app.js';
import { mkC } from './harness.mjs';

// go() calls window.scrollTo(0, 0) unconditionally and Node has no window.
// Same no-op stub tests/gap-count.test.mjs uses; nothing here reads scroll.
if (typeof globalThis.window === 'undefined') {
  globalThis.window = { scrollTo: () => {}, scrollY: 0 };
}

const on = (patch = {}) => mkC({ screen: 's3', tab: 'connect', ...patch });

// startScan leaves a 750ms interval running. runScan against an estate with
// nothing to find clears it, so a test that starts a scan can put it back.
const stopScan = (c) => runScan(c, D.ESTATES.empty);

// ---- the mechanism ----

test('every page that declares sub-content declares it the same way', () => {
  // Only Discover keeps a drawer, to add or edit a source; every other view is a
  // tab on its page (Micah, 2026-09-29: "what else is boxed? ... go").
  assert.deepEqual(Object.keys(SUB_PANELS).filter(k => SUB_PANELS[k].length), ['discover']);
  for (const [page, panels] of Object.entries(SUB_PANELS)) {
    assert.ok(Array.isArray(panels), `${page} declares no panel list`);
    for (const p of panels) {
      assert.ok(p.key, `${page} has a panel with no key`);
      assert.ok(p.label, `${page}:${p.key} has no label`);
    }
    const keys = panels.map(p => p.key);
    assert.equal(new Set(keys).size, keys.length, `${page} declares a duplicate panel key`);
  }
});

test('the sub layer is shut on arrival', () => {
  const v = vals(on());
  assert.equal(v.subOpen, false);
  assert.equal(v.subPanelNow, null);
});

test('closing the sub layer leaves nothing open', () => {
  const c = on({ sub: { page: 'discover', panel: 'add' } });
  vals(c).closeSub();
  assert.equal(c.state.sub, null);
  assert.equal(vals(c).subOpen, false);
});

test('the open panel is switchable from inside the layer', () => {
  const c = on({ sub: { page: 'discover', panel: 'add' } });
  const tabs = vals(c).subTabs;
  assert.deepEqual(tabs.map(t => t.key), SUB_PANELS.discover.map(p => p.key));
  assert.equal(tabs.find(t => t.key === 'add').on, true);
  tabs.find(t => t.key === 'run').go();
  assert.equal(vals(c).subPanelNow, 'run');
});

// ---- Discover's three doors ----

// Sources is a page now (source management, 2026-09-23); the drawer adds or edits one.
test('Manage credentials opens the Sources page, not a drawer', () => {
  const c = on();
  vals(c).manageCreds();
  assert.equal(c.state.screen, 's1');
  assert.equal(c.state.discoverView, 'sources');
  assert.ok(!c.state.sub);
});

test('Re-discover opens the layer on the run, and still starts the scan', () => {
  const c = on();
  vals(c).rescan();
  assert.equal(c.state.sub.panel, 'run');
  assert.equal(c.state.scanBusy, true, 'the one-click scan stopped working');
  stopScan(c);
});

test('the verdict line opens Options, the page that replaced what was found', () => {
  const c = on();
  vals(c).openFindings();
  assert.equal(c.state.sub, null);
  assert.equal(c.state.cnPage, 'options');
});

// ---- the run hands over to its own result ----

test('a finished run stays a run; it does not jump to another page\'s panel', () => {
  const done = vals(on({ sub: { page: 'discover', panel: 'run' }, scanStep: 4 }));
  assert.equal(done.subPanelNow, 'run');
});

test('a panel opened directly does not move when a scan finishes', () => {
  const v = vals(on({ sub: { page: 'discover', panel: 'add' }, scanStep: 4 }));
  assert.equal(v.subPanelNow, 'add');
});

// ---- the bug inside the task ----
// Measured 2026-09-23: pressing Re-discover flipped every account row's Last
// scan to "just now" immediately, so for the two seconds the scan ran the table
// reported a scan that had not happened.

test('an account row does not report a scan that is still running', () => {
  const busy = vals(on({ scanBusy: true })).sources.filter(r => r.kind !== 'AT&T');
  assert.ok(busy.length > 0, 'no cloud accounts to check');
  for (const r of busy) assert.equal(r.seen, 'scanning…', `${r.name} still claims a finished scan`);
  const idle = vals(on()).sources.filter(r => r.kind !== 'AT&T');
  for (const r of idle) assert.notEqual(r.seen, 'scanning…');
});

test('AT&T inventory rows are live and never say scanning', () => {
  const att = vals(on({ scanBusy: true })).sources.filter(r => r.kind === 'AT&T');
  assert.ok(att.length > 0, 'no AT&T rows to check');
  for (const r of att) assert.equal(r.seen, 'live');
});

// ---- Observe and Cost layer their drill-downs ----
// Observe was 4566px: a 1377px flow map with Insights (782) and Logs (1391)
// stacked under it. Cost was 3196px: egress with Forecast (608) and Charges
// (358) under it. Those are drill-downs of the hero, not peers of it.

test('Observe and Cost declare their drill-downs as panels', () => {
  // Policies and Tags joined Observe's drawer on 2026-09-28; Records stays a panel without a tab.
  // Every drill-down is a tab on its page now (2026-09-29): Forecast and AT&T charges on Cost, Tags on Govern.
  assert.deepEqual(SUB_PANELS.observe, []);
  assert.deepEqual(SUB_PANELS.cost, []);
});

test('Logs opens its page and Forecast opens its Cost tab, neither in a drawer', () => {
  const c = mkC({ screen: 's3', tab: 'observe' });
  // Logs is a page of its own (2026-09-28); Forecast is a Cost tab (2026-09-29).
  vals(c).railGroups.flatMap(g => g.items).find(r => r.label === 'Logs').go();
  assert.equal(c.state.obPage, 'logs');
  assert.equal(c.state.sub, null);
  // Forecast joined Spend (2026-09-29): the Spend door opens it.
  const k = mkC({ screen: 's3', tab: 'cost' });
  vals(k).railGroups.flatMap(g => g.items).find(r => r.label === 'Spend').go();
  assert.equal(k.state.sub, null);
  assert.equal(k.state.costPanel, 'spend');
});

test('each former drill-down section lives on its page, not in the layer', async () => {
  const { readFileSync } = await import('node:fs');
  const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
  const a = HTML.indexOf('<aside aria-label="Discovery"');
  const layer = HTML.slice(a, HTML.indexOf('</aside>', a));
  for (const id of ['sec-charges', 'sec-forecast', 'sec-obs-tags', 'sec-paths', 'sec-gap', 'sec-obs-policies']) assert.ok(!layer.includes(`id="${id}"`), `${id} is still in the drawer`);
});

// A balanced census is not a correct structure: this walks the gates and pins
// each section under its own page tab.
test('each section sits under its own tab gate and no other', async () => {
  const { readFileSync } = await import('node:fs');
  const L = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8').split('\n');
  const want = { 'sec-paths': 'cnIsWays', 'sec-obs-tags': 'govPanelTags', 'sec-charges': 'costPanelCharges', 'sec-spend': 'costPanelSpend' };
  const tabGate = /^(cnIs|govPanel|costPanel|estPanel|insPanel|obPanel)/;
  const stack = [];
  const seen = new Set();
  for (const line of L) {
    for (const m of line.matchAll(/<sc-if value="\{\{ ([\w.]+) \}\}"|<\/sc-if>/g)) { if (m[1]) stack.push(m[1]); else stack.pop(); }
    const id = (line.match(/id="(sec-[\w-]+)"/) || [])[1];
    if (!id || !want[id]) continue;
    assert.deepEqual(stack.filter(g => tabGate.test(g)), [want[id]], `${id} sits under ${JSON.stringify(stack)}`);
    seen.add(id);
  }
  assert.deepEqual([...seen].sort(), Object.keys(want).sort());
});
