import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import * as A from '../naas-addendum.js';
import { facilities, ports, circuits, fabricRows } from '../naas-fabric.js';
const est = D.ESTATES.mature; const inv = A.inventory(est); const ob = A.observe(est, [], inv);
test('the AT&T network opens to facilities, a facility to ports, a port to circuits that land on sites', () => {
  // (2026-09-30, D-6 restored) Facilities hold NetBond only: Established's
  // Direct Connect and ExpressRoute ports left, 5 -> 2, and its flap is on
  // Direct Connect (eu-central-1), the cloud provider's, so no AT&T facility is
  // degraded. A NetBond flap still marks its facility.
  const f = facilities(est, inv, ob); assert.deepEqual(f.map(x => x.city).sort(), ['Iowa', 'N. Virginia']); assert.ok(!f.some(x => x.state === 'degraded'));
  const flap = { ...est, regionsList: est.regionsList.map(r => (r.region === 'us-east-1' ? { ...r, link: 'degraded' } : r)) };
  assert.equal(facilities(flap, inv, ob).find(x => x.city === 'N. Virginia').state, 'degraded');
  const l1 = fabricRows(est, inv, ob, ['fab']); assert.equal(l1.level, 'facility'); assert.ok(l1.rows[0].drill);
  const l2 = fabricRows(est, inv, ob, ['fab', l1.rows[0].drill]); assert.equal(l2.level, 'port'); assert.ok(l2.rows.length >= 1); assert.match(l2.rows[0].name, /port 1/);
  const l3 = fabricRows(est, inv, ob, ['fab', l1.rows[0].drill, l2.rows[0].drill]); assert.equal(l3.level, 'circuit'); assert.ok(l3.rows.length >= 1); assert.ok(l3.rows[0].leaf); assert.ok(l3.rows[0].site);
  assert.equal(fabricRows(est, inv, ob, []), null); assert.equal(fabricRows(est, inv, ob, ['fab', 'Nowhere']), null);
});
test('the band has something to say when nothing is attached', () => {
  const e = D.ESTATES.small, i = A.inventory(e), o = A.observe(e, [], i);
  assert.equal(facilities(e, i, o).length, 0);
  const l1 = fabricRows(e, i, o, ['fab']);
  assert.equal(l1.level, 'facility');
  assert.deepEqual(l1.rows, []);
  assert.equal(l1.empty, true);
  assert.equal(l1.head, '0 facilities');
  assert.ok(l1.emptyHead && l1.emptyLine && l1.emptyCta, 'the empty state has no copy');
  assert.equal(fabricRows(e, i, o, ['fab', 'N. Virginia']), null);
  // An estate with facilities is untouched. (2026-09-30, D-6 restored: NetBond only, two on Established.)
  const full = fabricRows(est, inv, ob, ['fab']);
  assert.equal(full.empty, false);
  assert.equal(full.rows.length, 2);
});
