import { describe, it, expect } from 'vitest';
import { CC } from './index';

/* File-order note: vitest gives this FILE its own window.CC, but records
   persist between tests here — each test deploys into a region no earlier
   test used, and on-ramp activations are undone.

   Ordering hazard: dx1 (seeded inactive) serves THREE targets —
   aws/usw2, aws/euw1, gcp/usc1 — so whichever managed-VPC record takes its
   region live FIRST is the one that actually calls activateOnramp('dx1').
   The deploy tests below create the euw1 record first (test 1) and the
   usw2 record last (the CIDR test, test 4). The advance suite therefore
   drives the FOUR-STAGE LIFECYCLE — including the activation assertions —
   on the usw2 record, since that is the one taken live first in this file.
   The euw1 record is taken live afterward, asserting the no-op branch: dx1
   is already active, so its second activation is skipped and no second
   undo entry is pushed. */

describe('deployManagedVpc', () => {
  it('creates a create-stage record with deterministic CIDR and provider vocabulary', () => {
    const suggested = CC.suggestManagedCidr();
    const m = CC.deployManagedVpc({ cloudId: 'aws', regionId: 'euw1', tier: '1G' })!;
    expect(m.stage).toBe('create');
    expect(m.cidr).toBe(suggested);
    expect(m.name).toBe('att-managed-euw1');
    expect(m.stages.map(s => s.key)).toEqual(['create', 'vsrx', 'cloud-plumbing', 'att-plumbing', 'live']);
    expect(m.stages.every(s => !s.done)).toBe(true);
    expect(m.stages[2].detail).toBe('TGW attachment + route propagation');
    expect(m.vsrx.nodes.map(n => n.role)).toEqual(['active', 'backup']);
    expect(m.vsrx.bgp.every(b => b.state === 'idle')).toBe(true);
    expect(m.vsrx.throughput).toBe('1 Gbps');
  });

  it('uses Azure vocabulary for an Azure region', () => {
    const m = CC.deployManagedVpc({ cloudId: 'azure', regionId: 'uks', tier: '500M' })!;
    expect(m.stages[2].detail).toBe('VNet peering + UDRs');
    expect(m.stages[3].detail).toBe('Private peering + BGP to AT&T');
    expect(m.vsrx.throughput).toBe('500 Mbps');
  });

  it('refuses a second deploy into the same region, unknown regions, and non-AWS/Azure clouds', () => {
    expect(CC.deployManagedVpc({ cloudId: 'aws', regionId: 'euw1' })).toBeNull(); // already deployed above
    expect(CC.deployManagedVpc({ cloudId: 'aws', regionId: 'nope' })).toBeNull();
    expect(CC.deployManagedVpc({ cloudId: 'gcp', regionId: 'usc1' })).toBeNull();
  });

  it('accepts a caller CIDR of the right shape and rejects a malformed one', () => {
    const m = CC.deployManagedVpc({ cloudId: 'azure', regionId: 'wus2', cidr: '10.255.200.0/24' })!;
    expect(m.cidr).toBe('10.255.200.0/24');
    // malformed cidr → falls back to the suggestion, not null (the shape is demo-validated in the wizard)
    const s = CC.suggestManagedCidr();
    const m2 = CC.deployManagedVpc({ cloudId: 'aws', regionId: 'usw2', cidr: 'not-a-cidr' })!;
    expect(m2.cidr).toBe(s);
  });
});

describe('advanceManagedVpc', () => {
  it('four advances land live, flipping nodes/interfaces/BGP in stage order, and activating the serving on-ramp', () => {
    // usw2 record from the CIDR test — its serving ramp is dx1, seeded
    // inactive, and this is the FIRST managed-VPC record taken live in
    // this file, so the activation assertions belong on THIS advance.
    const m = CC.managedVpcFor('aws', 'usw2')!;
    const dx1 = (CC.onramps as { id: string; active?: boolean }[]).find(o => o.id === 'dx1')!;
    expect(dx1.active).toBeFalsy();

    CC.advanceManagedVpc(m.id);                       // create -> vsrx
    expect(m.stage).toBe('vsrx');
    expect(m.stages[0].done).toBe(true);

    CC.advanceManagedVpc(m.id);                       // vsrx -> cloud-plumbing
    expect(m.vsrx.nodes.every(n => n.state === 'up')).toBe(true);
    expect(m.vsrx.interfaces.find(i => i.name === 'ge-0/0/0')!.state).toBe('up');
    expect(m.vsrx.interfaces.find(i => i.name === 'ge-0/0/1')!.state).toBe('down');

    CC.advanceManagedVpc(m.id);                       // cloud-plumbing -> att-plumbing
    expect(m.vsrx.bgp.find(b => b.peer === 'cloud')!.state).toBe('established');
    expect(m.vsrx.bgp.find(b => b.peer === 'att')!.state).toBe('idle');

    CC.advanceManagedVpc(m.id);                       // att-plumbing -> live
    expect(m.stage).toBe('live');
    expect(m.stages.every(s => s.done)).toBe(true);
    expect(m.vsrx.interfaces.every(i => i.state === 'up')).toBe(true);
    expect(m.vsrx.bgp.every(b => b.state === 'established')).toBe(true);
    expect(m.onrampId).toBe('dx1');
    expect(dx1.active).toBe(true);
  });

  it('is idempotent at live', () => {
    const m = CC.managedVpcFor('aws', 'usw2')!;
    const snap = JSON.stringify(m);
    expect(CC.advanceManagedVpc(m.id)).toBe(m);
    expect(JSON.stringify(m)).toBe(snap);
  });

  it('going live on a second dx1-served region no-ops the already-active on-ramp, and one undo restores it', () => {
    // euw1 record from the first test — still at create. dx1 also serves
    // this region (targets: aws/usw2, aws/euw1, gcp/usc1), but usw2 above
    // already activated it, so taking euw1 live must hit the no-op branch:
    // activateOnramp is not called again, and only the ONE undo entry from
    // usw2's activation exists — a single CC.undo() call fully restores dx1.
    const m = CC.managedVpcFor('aws', 'euw1')!;
    const dx1 = (CC.onramps as { id: string; active?: boolean }[]).find(o => o.id === 'dx1')!;
    expect(dx1.active).toBe(true); // still active from the usw2 advance above

    CC.advanceManagedVpc(m.id); CC.advanceManagedVpc(m.id); CC.advanceManagedVpc(m.id); CC.advanceManagedVpc(m.id);
    expect(m.stage).toBe('live');
    expect(m.onrampId).toBe('dx1');
    expect(dx1.active).toBe(true);                    // unchanged — no second activation

    expect(CC.undo()).toBe(true);                      // the one entry, from usw2's activation
    expect(dx1.active).toBeFalsy();                     // restored for later files… and this one
  });
});
