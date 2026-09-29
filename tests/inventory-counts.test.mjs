import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import * as A from '../naas-addendum.js';

// The app level sums workloads (Micah, 2026-09-29: "go down to the app
// level"), so every level has to add up: subnets to their VPC, VPCs to their
// region, regions to the estate. Rounding each share on its own lost or found
// a few workloads at every level (875 listed against 880 counted).
for (const id of ['small', 'partial', 'mature', 'trust']) {
  test(`${id}: workloads add up at every level`, () => {
    const est = D.ESTATES[id];
    for (const c of A.inventory(est)) for (const r of c.regions) {
      const reg = est.regionsList.find(x => x.region === r.region);
      assert.equal(r.vpcs.reduce((a, v) => a + v.wl, 0), reg.wl, `${r.region}: VPCs ${r.vpcs.map(v => v.wl)} vs ${reg.wl}`);
      for (const v of r.vpcs) {
        assert.equal(v.subnets.reduce((a, s) => a + s.wl, 0), v.wl, `${v.name}: subnets vs VPC`);
        for (const s of v.subnets) assert.equal((s.workloads || []).length, s.wl, `${s.id}: listed vs counted`);
      }
    }
  });
}
