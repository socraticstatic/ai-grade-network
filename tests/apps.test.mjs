import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import * as A from '../naas-addendum.js';
import * as F from '../naas-flowmap.js';
import { appsOf } from '../naas-apps.js';

// "go down to the app level" (Micah, 2026-09-29). An app is the workloads
// that carry its tag. Its traffic is its workloads' share of their regions'
// traffic on the map, so the apps add up to the map.

const ctx = (id) => { const est = D.ESTATES[id]; const inv = A.inventory(est); return { est, inv, flows: A.observe(est, [], inv).flows }; };

for (const id of ['partial', 'mature', 'trust']) {
  test(`${id}: the apps hold every workload and every Gbps the map sends to the clouds`, () => {
    const { est, inv, flows } = ctx(id);
    const apps = appsOf(est, inv, flows);
    assert.ok(apps.length >= 3);
    assert.equal(apps.reduce((a, x) => a + x.wl, 0), est.regionsList.reduce((a, r) => a + (r.wl || 0), 0));
    const clouds = F.rightRoots(est, flows).filter(x => x.kind === 'cloud').reduce((a, x) => a + x.v, 0);
    const gb = apps.reduce((a, x) => a + x.gbps, 0);
    assert.ok(Math.abs(gb - clouds) < 0.01 * clouds, `${gb} vs ${clouds}`);
    for (const x of apps) {
      assert.ok(x.onAtt >= 0 && x.onAtt <= 1 && x.exposed <= x.wl, x.tag);
      assert.ok(x.regions.length >= 1 && x.clouds.length >= 1, x.tag);
      assert.ok(x.p95 > 0 && ['ok', 'risk', 'slo'].includes(x.health), x.tag);
      assert.ok(Array.isArray(x.topApps) && x.topApps.length <= 3, x.tag);
    }
    assert.deepEqual(apps.map(x => x.wl), apps.map(x => x.wl).slice().sort((a, b) => b - a), 'largest first');
  });
}

test('an app whose p95 is over its SLO reads Over SLO', () => {
  const { est, inv, flows } = ctx('mature');
  for (const x of appsOf(est, inv, flows)) if (x.p95 > x.slo) assert.equal(x.health, 'slo', `${x.tag} ${x.p95}/${x.slo}`);
  const fin = appsOf(est, inv, flows).find(x => x.tag === 'finance');
  assert.equal(fin.health, 'slo', 'westeurope at 21 ms carries a third of finance');
});
