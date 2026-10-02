import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// Observe's Health and Paths rows as the seven-station strip (2026-10-02): the same picture Govern draws, in the health inks,
// each station with its glyph; on Paths the milliseconds sit under the node and loss shows only where there is any.
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const onDisk = (n) => existsSync(new URL(`../brand/icons/${n}.svg`, import.meta.url));
const at = (view, extra = {}) => vals(mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', ...extra }));

test('every station has a glyph on disk, in the heads and in every cell', () => {
  const v = at('partial', { obPanel: 'health' });
  assert.equal(v.segHeads.length, 7);
  for (const h of v.segHeads) assert.ok(onDisk(h.icon), `${h.key}: ${h.icon}`);
  assert.ok(v.pathFlowRows.length > 0);
  for (const r of v.pathFlowRows) for (const c of r.cells) { assert.ok(onDisk(c.icon), `${r.tag} ${c.key}: ${c.icon}`); assert.ok(['ok', 'risk', 'slo', 'down', 'nodata', 'none'].includes(c.state), c.state); }
});

test('a Paths cell reads its state off the figures: measured, lossy, or not yet measured', () => {
  const v = at('partial', { obPanel: 'paths' });
  const fin = v.pathTimeRows.find(r => /^finance/.test(r.label));
  assert.ok(fin, 'the finance row');
  const cl = fin.cells.find(c => c.key === 'cloudlink'), hub = fin.cells.find(c => c.key === 'hub');
  assert.equal(cl.state, 'risk'); assert.equal(cl.hasLoss, true);
  assert.equal(hub.state, 'nodata'); assert.equal(hub.hasLoss, false);
  for (const c of fin.cells) assert.ok(onDisk(c.icon), c.key);
});

test('the markup draws both rows as the seven-station strip', () => {
  assert.match(HTML, /<div class="ps seven sm" aria-label="\{\{ pf\.label \}\} across the path">/);
  assert.match(HTML, /<div class="ps seven sm" aria-label="\{\{ pt\.label \}\}, hop by hop">/);
  assert.ok(HTML.includes('.ps.seven{grid-template-columns:repeat(7,minmax(0,1fr))}'));
  for (const st of ['ok', 'risk', 'slo', 'down', 'nodata', 'none']) assert.ok(HTML.includes(`.ps [data-state="${st}"] i{`), st);
});
