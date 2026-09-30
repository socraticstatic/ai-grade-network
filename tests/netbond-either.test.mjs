import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import * as A from '../naas-addendum.js';
import * as R from '../naas-round2.js';

// "NetBond and AT&T VPC are either, not and. If a person uses one, they don't use
// the other" (Micah, 2026-09-30); he chose "NetBond today": no estate has an
// AT&T-hosted VPC yet, and hosted VPC stays an upgrade in place of NetBond.
test('no estate runs an AT&T-hosted VPC today, so no region is billed both', () => {
  for (const view of ['partial', 'mature', 'trust', 'small']) {
    const inv = A.inventory(D.ESTATES[view]);
    assert.ok(inv.every(c => (c.regions || []).every(r => (r.vpcs || []).every(v => !v.managed))), view);
    assert.deepEqual(R.attChargeRows(D.ESTATES[view], inv).map(r => r.key).filter(k => k !== 'nb'), [], view);
  }
  const nb = (view) => (R.attChargeRows(D.ESTATES[view], A.inventory(D.ESTATES[view])).find(r => r.key === 'nb') || { v: 0 }).v;
  assert.deepEqual([nb('partial'), nb('mature'), nb('trust')], [1800, 3600, 3600]);
  assert.ok(D.CATALOG.some(p => p.id === 'hosted-vpc'), 'hosted VPC is still offered');
});
