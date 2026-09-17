import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import * as A from '../naas-addendum.js';
import { connectVerdict, governVerdict, costVerdict } from '../naas-verdicts.js';

// Measured against commit 04bbb1e. Change one of these only when the copy is meant to change.
const EXPECT = {
  empty: {
    connect: 'Nothing connected yet. AT&T already sees 41 metros with on-ramps and 12 clouds you could reach.',
    govern: 'No policies yet. Three starting points below.',
    cost: 'No egress seen yet.',
    observe: 'No telemetry yet.',
  },
  partial: {
    connect: '5 of 7 regions still ride the public internet. 2 are on the AT&T fabric, plus 5 smaller regions rolled up.',
    govern: '4 policies enforced. 11 PCI-tagged workloads reach the internet directly',
    cost: '$36,000/mo on the table across 2 priced findings. $0/mo already saved on the fabric.',
    observe: '40% of traffic on the AT&T fabric, saving $0/mo. 5 regions are blind.',
  },
  mature: {
    connect: '1 of 8 regions still ride the public internet. 7 are on the AT&T fabric, plus 10 smaller regions rolled up.',
    govern: '14 policies enforced. 2 authored but not enforced.',
    cost: '$32,800/mo leaves through public egress that the fabric would carry for $15,300.',
    observe: '95% of traffic on the AT&T fabric, saving $61.4k/mo. 1 region is blind.',
  },
  trust: {
    connect: '2 of 6 regions still ride the public internet. 4 are on the AT&T fabric, plus 8 smaller regions rolled up.',
    govern: '9 policies enforced. 96 PCI-tagged workloads reach the internet directly',
    cost: '$132,000/mo on the table across 2 priced findings. $0/mo already saved on the fabric.',
    observe: '77% of traffic on the AT&T fabric, saving $0/mo. 2 regions are blind.',
  },
};

for (const id of ['empty', 'partial', 'mature', 'trust']) {
  test(`${id}: each of the four screens carries a written verdict`, () => {
    const est = D.ESTATES[id];
    const ob = A.observe(est, [], A.inventory(est));
    const totalSave = est.findings.filter(f => f.priced).reduce((a, f) => a + f.save, 0);
    assert.equal(connectVerdict(est, 'cloud'), EXPECT[id].connect);
    assert.equal(governVerdict(est), EXPECT[id].govern);
    assert.equal(costVerdict(est, ob, totalSave, est.buckets || []), EXPECT[id].cost);
    assert.equal(ob.verdict, EXPECT[id].observe);
  });
}

test('off the cloud layer the connect verdict counts sites, not regions', () => {
  const est = D.ESTATES.mature;
  const items = [{ exposed: 2 }, { exposed: 0 }, { exposed: 0 }];
  assert.equal(
    connectVerdict(est, 'net', items),
    '1 of 3 sites reach clouds over the public internet. 2 are on the AT&T fabric.',
  );
});
