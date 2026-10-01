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
    // Re-pinned (2026-09-30, owner decision b): private is private; a direct connect is not the AT&T network.
    connect: '5 of 7 regions still ride the public internet. 2 are private: 1 on NetBond, 1 on a direct connect.',
    // Re-pinned (third skeptic, 2026-09-30): the PCI finding counts its region's exposed PCI-tagged workloads.
    // Re-pinned (w2-govern, 2026-09-30): one rule for a PCI workload, so the apps table's 58 and 6 exposed are Govern's too.
    govern: '4 policies enforced. 6 PCI-tagged workloads reach the internet directly.',
    // The IPsec egress finding (2026-09-28) adds $5,500 and a third priced finding;
    // saved money counts on any estate with something attached, not only mature.
    cost: '$41,500/mo on the table across 3 priced findings. $36,000/mo already saved on AT&T.',
    observe: '40% of all traffic on AT&T, saving $36k/mo. 5 regions are blind.',
  },
  mature: {
    // Re-pinned (2026-09-30, owner decision b).
    connect: '1 of 8 regions still ride the public internet. 7 are private: 2 on NetBond, 4 on direct connects, 1 on Equinix Fabric.',
    // Re-pinned (w2-govern, 2026-09-30): the head counts the six policies Govern lists, not a tally it never shows,
    // and Established's exposed PCI workloads carry a finding, as on every estate.
    govern: '5 policies enforced. 6 PCI-tagged workloads reach the internet directly.',
    // Established prices its savings (2026-09-30), so Cost leads with what is on the table.
    cost: '$17,500/mo on the table across 2 priced findings. $61,400/mo already saved on AT&T.',
    // us-west-2 to us-central1 rides the public internet (2026-09-30), as the AWS West/EU cross-cloud
    // bucket and the crosscloud finding already billed it: 3.2 Gbps left AT&T, 95% became 92%.
    observe: '92% of all traffic on AT&T, saving $61.4k/mo. 1 region is blind.',
  },
  trust: {
    // Re-pinned (2026-09-30, owner decision b).
    connect: '2 of 6 regions still ride the public internet. 4 are private: 2 on NetBond, 2 on direct connects.',
    // Re-pinned (third skeptic, 2026-09-30): us-east-2 carries the PCI tag; us-west-2 never did.
    // Re-pinned (w2-govern, 2026-09-30): the four policies Govern lists, three enforced; the PCI rule counts both PCI regions.
    govern: '3 policies enforced. 12 PCI-tagged workloads reach the internet directly.',
    cost: '$132,000/mo on the table across 2 priced findings. $148,000/mo already saved on AT&T.',
    observe: '77% of all traffic on AT&T, saving $148k/mo. 2 regions are blind.',
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
    '1 of 3 sites reach clouds over the public internet. 2 are on the AT&T network.',
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
  assert.equal(next.text, 'Attach the first region to give Govern something to enforce.');
});

test('the five-stop model is gone; the shipped four-word order is the only loop', async () => {
  const addendum = await import('../naas-addendum.js');
  for (const name of ['STOPS', 'STOP_LABEL', 'stopCta']) {
    assert.equal(name in addendum, false, `naas-addendum still exports ${name}`);
  }
  assert.ok(typeof addendum.observe === 'function', 'observe() must survive the deletion');
});
