import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import * as A from '../naas-addendum.js';
import { plural, estatePhrase } from '../naas-logic.js';
import { fabricRows } from '../naas-fabric.js';
import { costVerdict } from '../naas-verdicts.js';

test('one of a thing reads as one', () => {
  assert.equal(plural(1, 'cloud', 'clouds'), '1 cloud');
  assert.equal(plural(0, 'cloud', 'clouds'), '0 clouds');
  assert.equal(plural(2, 'cloud', 'clouds'), '2 clouds');
  assert.equal(plural(4120, 'site', 'sites'), '4,120 sites');

  assert.equal(estatePhrase(D.ESTATES.small), '1 cloud, 2 regions, 20 workloads');
  // The big estates' copy must not drift while the small one is fixed.
  assert.equal(estatePhrase(D.ESTATES.mature), '4 clouds, 18 regions, 940 workloads');
  assert.equal(estatePhrase(D.ESTATES.trust), '3 clouds, 14 regions, 2,860 workloads');

  // A live n=1 defect on a shipping estate: the Virginia facility has one port.
  const e = D.ESTATES.partial, i = A.inventory(e), o = A.observe(e, [], i);
  assert.equal(fabricRows(e, i, o, ['fab', 'Virginia']).head, '1 port · ER');
  assert.equal(fabricRows(e, i, o, ['fab', 'N. Virginia']).head, '3 ports · NetBond');
});

test('the Cost door findings count on small reads singular', () => {
  const est0 = D.ESTATES.small;
  const i = A.inventory(est0);
  const ob = A.observe(est0, [], i);
  const est = { ...est0, observedPct: ob.total ? ob.covPct : est0.observedPct, findings: [...A.observeFindings(est0, ob), ...est0.findings] };
  const totalSave = est.findings.filter(f => f.priced).reduce((a, f) => a + f.save, 0);
  assert.equal(totalSave > 0, true);
  assert.match(costVerdict(est, ob, totalSave), /on the table across 1 priced finding\. /);
});
