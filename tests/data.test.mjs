import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as D from '../naas-data.js';
import { scheduleId } from '../naas-schedule.js';

for (const id of ['partial', 'mature', 'trust']) {
  test(`${id}: exactly one attached region is degraded`, () => {
    const deg = D.ESTATES[id].regionsList.filter(r => r.link === 'degraded');
    assert.equal(deg.length, 1);
    assert.equal(deg[0].priv, true);
  });
  test(`${id}: DX and ER regions carry an account id`, () => {
    for (const r of D.ESTATES[id].regionsList.filter(r => r.priv && (r.ramp === 'DX' || r.ramp === 'ER'))) assert.ok(r.acct, r.region);
  });
}
test('empty estate has no regions', () => { assert.equal(D.ESTATES.empty.regionsList.length, 0); });

test('small: one cloud, two regions, two sites, nothing attached', () => {
  const e = D.ESTATES.small;
  assert.equal(e.id, 'small');
  assert.equal(e.stage, 'partial');
  assert.equal(e.sites.length, 2);
  assert.equal(e.regionsList.length, 2);
  assert.equal(e.regionsExtra, 0);
  assert.equal(new Set(e.regionsList.map(r => r.cloud)).size, e.clouds);
  assert.equal(e.regionsList.length, e.regions);
  assert.equal(e.regionsList.reduce((a, r) => a + r.wl, 0), e.workloads);
  assert.equal(e.regionsList.filter(r => r.priv).length, 0);
  assert.equal(e.attachedRegions, 0);
});

test('the Estate select and VIEWS cannot drift', async () => {
  const html = await readFile(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
  const sel = /aria-label="View as"[\s\S]*?<\/select>/.exec(html);
  assert.ok(sel, 'the Estate select is gone from the markup');
  const opts = [...sel[0].matchAll(/<option value="([^"]+)">([^<]+)<\/option>/g)]
    .map(m => ({ id: m[1], label: m[2] }));
  assert.deepEqual(opts, D.VIEWS);
});

test('small: one AWS account, regions match regionsList, has a schedule id', () => {
  const e = D.ESTATES.small;
  assert.equal(e.accounts.length, 1);
  const aws = e.regionsList.filter(r => r.cloud === 'AWS').length;
  assert.equal(e.accounts[0].regions, aws);
  assert.notEqual(scheduleId(e.accounts[0].schedule), '');
});
