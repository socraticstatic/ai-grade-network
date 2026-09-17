import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import * as A from '../naas-addendum.js';
import { connectVerdict, governVerdict, costVerdict, observeNext } from '../naas-verdicts.js';
import { connections } from '../naas-connections.js';

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

const NEXT = {
  partial: '40 workloads behind Azure eastus ride a single path with no policy that requires a second. Author the policy, simulate it, then enforce it.',
  mature: '96 workloads behind AWS eu-central-1 ride a single path with no policy that requires a second. Author the policy, simulate it, then enforce it.',
  trust: '420 workloads behind AWS us-east-2 ride a single path with no policy that requires a second. Author the policy, simulate it, then enforce it.',
};

test('Observe points at the degraded connection and the policy that would fix it', () => {
  for (const id of ['partial', 'mature', 'trust']) {
    const est = D.ESTATES[id];
    const ob = A.observe(est, [], A.inventory(est));
    const next = observeNext(connections(est, ob));
    assert.equal(next.title, 'Next stop: Govern', id);
    assert.equal(next.text, NEXT[id], id);
    assert.equal(next.cta, 'Open Govern', id);
  }
});

test('with nothing connected, Observe still names a next stop', () => {
  const est = D.ESTATES.empty;
  const ob = A.observe(est, [], A.inventory(est));
  const next = observeNext(connections(est, ob));
  assert.equal(next.text, 'Every connection is up. Set a latency SLO for the tags that still cross the public internet, then enforce it.');
});
