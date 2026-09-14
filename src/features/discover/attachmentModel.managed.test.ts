import { describe, it, expect } from 'vitest';
import { CC } from '../../engine';
import { attachmentChain, buildAttachmentMapModel } from './attachmentModel';

describe('attachmentChain × managed VPC', () => {
  it('no hop and null field before live; hop + field once live', () => {
    const before = attachmentChain(CC, 'aws', 'use1', 'vpcprod')!;
    expect(before.managedVpc).toBeNull();
    expect(before.gateways.some(g => /managed/i.test(g.type))).toBe(false);

    const m = CC.deployManagedVpc({ cloudId: 'aws', regionId: 'use1' })!;
    const deploying = attachmentChain(CC, 'aws', 'use1', 'vpcprod')!;
    expect(deploying.managedVpc).toBeNull();          // nothing claims what isn't up

    CC.advanceManagedVpc(m.id); CC.advanceManagedVpc(m.id); CC.advanceManagedVpc(m.id); CC.advanceManagedVpc(m.id);
    const after = attachmentChain(CC, 'aws', 'use1', 'vpcprod')!;
    expect(after.managedVpc?.id).toBe(m.id);
    const hop = after.gateways[after.gateways.length - 1];
    expect(hop.name).toBe('att-managed-use1');
    expect(hop.type).toBe('AT&T managed VPC · vSRX HA pair');
  });

  it('the map model flags only live managed regions', () => {
    const model = buildAttachmentMapModel(CC);
    const use1 = model.groups.find(g => g.cloudId === 'aws')!.regions.find(r => r.region.id === 'use1')!;
    const usw2 = model.groups.find(g => g.cloudId === 'aws')!.regions.find(r => r.region.id === 'usw2')!;
    expect(use1.managedVpc).toBe(true);               // taken live above (same file)
    expect(usw2.managedVpc).toBe(false);
  });
});
