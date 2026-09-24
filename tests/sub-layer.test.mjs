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
  for (const [page, panels] of Object.entries(SUB_PANELS)) {
    assert.ok(Array.isArray(panels) && panels.length > 0, `${page} declares no panels`);
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
  const c = on({ sub: { page: 'connect', panel: 'found' } });
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

test('the verdict line opens the layer at what was found', () => {
  const c = on();
  vals(c).openFindings();
  assert.equal(c.state.sub.panel, 'found');
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
  assert.deepEqual(SUB_PANELS.observe.map(p => p.key), ['insights', 'logs']);
  assert.deepEqual(SUB_PANELS.cost.map(p => p.key), ['forecast', 'charges']);
});

test('the Records and Forecast links open the layer instead of scrolling', () => {
  const c = mkC({ screen: 's3', tab: 'observe' });
  vals(c).railGroups.flatMap(g => g.items).find(r => r.label === 'Records').go();
  assert.deepEqual(c.state.sub, { page: 'observe', panel: 'logs' });
  const k = mkC({ screen: 's3', tab: 'cost' });
  vals(k).railGroups.flatMap(g => g.items).find(r => r.label === 'Forecast').go();
  assert.deepEqual(k.state.sub, { page: 'cost', panel: 'forecast' });
});

test('each drill-down section lives inside the layer, not on its page', async () => {
  const { readFileSync } = await import('node:fs');
  const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
  const a = HTML.indexOf('<aside aria-label="Discovery"');
  const z = HTML.indexOf('</aside>', a);
  const layer = HTML.slice(a, z);
  for (const id of ['sec-insights', 'sec-logs', 'sec-forecast', 'sec-charges']) {
    assert.ok(layer.includes(`id="${id}"`), `${id} is still stacked on its page`);
  }
});

// A balanced census is not a correct structure. The first cut of this move put
// Insights inside the What we found gate (so it could never render) and let
// Ways to connect escape it (so it rendered on every page), and every tag still
// balanced. This walks the gates and pins each section to its own panel.
test('each section in the layer sits under its own panel gate and no other', async () => {
  const { readFileSync } = await import('node:fs');
  const L = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8').split('\n');
  const a = L.findIndex(l => l.includes('<aside aria-label="Discovery"'));
  const z = L.findIndex((l, i) => i > a && l.includes('</aside>'));
  const want = {
    'sec-gap': 'subIsFound', 'sec-paths': 'subIsFound',
    'sec-insights': 'subIsInsights', 'sec-logs': 'subIsLogs',
    'sec-forecast': 'subIsForecast', 'sec-charges': 'subIsCharges',
  };
  const stack = [];
  const seen = new Set();
  for (let n = a; n <= z; n++) {
    for (const m of L[n].matchAll(/<sc-if value="\{\{ (\w+) \}\}"|<\/sc-if>/g)) {
      if (m[1]) stack.push(m[1]); else stack.pop();
    }
    const id = (L[n].match(/id="(sec-[\w-]+)"/) || [])[1];
    if (!id || !want[id]) continue;
    const panels = stack.filter(g => g.startsWith('subIs'));
    assert.deepEqual(panels, [want[id]], `${id} sits under ${JSON.stringify(panels)}`);
    seen.add(id);
  }
  assert.deepEqual([...seen].sort(), Object.keys(want).sort(), 'a section is missing from the layer, so the check above passed on nothing');
});
