import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// Findings that agree with the data (notes, 2026-09-30, Task 1.7). Established
// showed "Could save $17,500" beside "Still open $0" because it had no priced
// findings, and Growing's "4 data centers have one path" contradicted sites
// that each declare a backup.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };

test('Established prices its savings, and the head says so', () => {
  const v = vals(mkC({ view: 'mature', estateParam: null, screen: 's3', tab: 'observe' }));
  // 8 open since Task 1.4 (its two incidents joined), plus the two priced findings; plus its PCI finding (w2-govern,
  // 2026-09-30): one rule on every estate, and Established's own inventory holds 6 exposed PCI workloads.
  assert.equal(v.pageVerdict, '11 findings open. $17,500/mo potential savings.');
});

test('Established Spend: Still open equals Could save', () => {
  const v = vals(mkC({ view: 'mature', estateParam: null, screen: 's3', tab: 'cost' }));
  const could = v.spendTiles.find(t => t.l === 'Could save').v;
  assert.equal(could, '$17,500');
  assert.equal(v.bankTiles.find(t => t.l === 'Still open').v, could);
});

test('Growing: the single-path finding names the one region with one path', () => {
  const f = D.ESTATES.partial.findings.find(x => x.kind === 'single');
  assert.match(f.head, /Azure eastus/);
  assert.match(f.head + ' ' + f.ev, /finance/i);
});

test('no single-path finding names a place that has a second path', () => {
  for (const view of ['partial', 'mature', 'trust', 'small']) {
    const est = D.ESTATES[view];
    for (const f of est.findings.filter(x => x.kind === 'single')) {
      for (const r of est.regionsList) if (f.head.includes(r.region)) assert.ok((r.paths || 1) < 2, `${view}: ${r.region} has ${r.paths} paths`);
      for (const s of est.sites) if ((f.head + f.ev).includes(s.name.split(' ')[0]) && s.services) assert.ok(s.services.filter(x => x.role === 'backup').length === 0, `${view}: ${s.name} declares a backup`);
    }
  }
});
