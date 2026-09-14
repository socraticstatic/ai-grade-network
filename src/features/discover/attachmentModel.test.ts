import { describe, it, expect } from 'vitest';
import { CC } from '../../engine';
import { regionsOf, vpcsOf, regionLatencyMap, regionLatencyPathMap } from './discoveryModel';
import {
  MAP_CLOUDS, CUSTOMER_ASN, PROVIDER_ASN,
  attachmentChain, workloadsOnRamp, buildAttachmentMapModel,
  bandwidthOf, vlanFor, rampShort,
} from './attachmentModel';
import type { Cloud } from './discoveryModel';

const eachMapVpc = () => {
  const out: { cloudId: string; regionId: string; vpcId: string; attached: boolean }[] = [];
  for (const c of (CC.clouds as Cloud[]).filter(c => (MAP_CLOUDS as readonly string[]).includes(c.id))) {
    for (const r of regionsOf(CC, c.id)) {
      for (const v of vpcsOf(CC, r.id)) out.push({ cloudId: c.id, regionId: r.id, vpcId: v.id, attached: v.attached });
    }
  }
  return out;
};

describe('attachmentChain', () => {
  it('yields a chain for every AWS/Azure VPC', () => {
    const all = eachMapVpc();
    expect(all.length).toBeGreaterThan(0);
    for (const w of all) {
      expect(attachmentChain(CC, w.cloudId, w.regionId, w.vpcId)).not.toBeNull();
    }
  });

  it('attached chains end at a circuit; unattached at internet — never both', () => {
    for (const w of eachMapVpc()) {
      const chain = attachmentChain(CC, w.cloudId, w.regionId, w.vpcId)!;
      if (w.attached) {
        expect(chain.circuit).not.toBeNull();
        expect(chain.internet).toBeNull();
      } else {
        expect(chain.circuit).toBeNull();
        expect(chain.internet).not.toBeNull();
      }
    }
  });

  it('provider ASN is 12076 on Azure and 64512 on AWS; customer ASN 65000', () => {
    expect(PROVIDER_ASN.azure).toBe(12076);
    expect(PROVIDER_ASN.aws).toBe(64512);
    for (const w of eachMapVpc().filter(w => w.attached)) {
      const c = attachmentChain(CC, w.cloudId, w.regionId, w.vpcId)!.circuit!;
      expect(c.bgp.customerAsn).toBe(CUSTOMER_ASN);
      expect(c.bgp.providerAsn).toBe(PROVIDER_ASN[w.cloudId]);
    }
  });

  it('chain latency and path are the honest per-workload figure — private only when this workload actually rides a private-path circuit', () => {
    const path = regionLatencyPathMap(CC);
    for (const w of eachMapVpc()) {
      const chain = attachmentChain(CC, w.cloudId, w.regionId, w.vpcId)!;
      const regionPrivate = path[w.regionId] === 'private';
      const pair = CC.regionLatency(w.regionId)!;
      if (chain.circuit && regionPrivate) {
        expect(chain.path.kind).toBe('private');
        expect(chain.path.latencyMs).toBe(pair.privateMs);
      } else {
        expect(chain.path.kind).toBe('public');
        expect(chain.path.latencyMs).toBe(pair.publicMs);
      }
    }
  });

  it('an unattached VPC in an attached (private-path) region gets the honest public figure, not the region private figure', () => {
    const chain = attachmentChain(CC, 'aws', 'use1', 'vpcdmz')!;
    expect(chain.path).toEqual({ kind: 'public', latencyMs: CC.regionLatency('use1')!.publicMs });
  });

  it('is stable across calls (deterministic VLAN/ASN)', () => {
    const w = eachMapVpc().find(x => x.attached)!;
    const a = attachmentChain(CC, w.cloudId, w.regionId, w.vpcId)!;
    const b = attachmentChain(CC, w.cloudId, w.regionId, w.vpcId)!;
    expect(a.circuit).toEqual(b.circuit);
  });

  it('endpoint counts come from the buildMap subnet synthesis (non-zero ENIs)', () => {
    const w = eachMapVpc()[0];
    const chain = attachmentChain(CC, w.cloudId, w.regionId, w.vpcId)!;
    expect(chain.workload.endpoints.enis).toBeGreaterThan(0);
  });
});

describe('helpers', () => {
  it('vlanFor is the spec formula', () => {
    expect(vlanFor(0, 0)).toBe(100);
    expect(vlanFor(2, 3)).toBe(123);
  });
  it('bandwidthOf parses the on-ramp sub string and never invents capacity', () => {
    expect(bandwidthOf('Equinix IAD · 10Gbps')).toBe('10Gbps');
    expect(bandwidthOf('not yet provisioned')).toBe('—');
  });
  it('rampShort maps product names', () => {
    expect(rampShort('Direct Connect')).toBe('DX');
    expect(rampShort('ExpressRoute')).toBe('ER');
    expect(rampShort('NetBond')).toBe('NetBond');
  });
});

describe('workloadsOnRamp / buildAttachmentMapModel', () => {
  it('every attached AWS/Azure workload appears on exactly one ramp', () => {
    const rampIds = (CC.onramps as { id: string }[]).map(o => o.id);
    const seen = new Map<string, number>();
    for (const id of rampIds) {
      for (const w of workloadsOnRamp(CC, id)) {
        seen.set(w.vpc.id, (seen.get(w.vpc.id) ?? 0) + 1);
      }
    }
    for (const w of eachMapVpc().filter(w => w.attached)) {
      expect(seen.get(w.vpcId)).toBe(1);
    }
  });

  it('the map model covers AWS + Azure only, with no workload dropped', () => {
    const model = buildAttachmentMapModel(CC);
    expect(model.groups.map(g => g.cloudId)).toEqual(['aws', 'azure']);
    const modeled = model.groups.flatMap(g => g.regions.flatMap(r => r.workloads.map(w => w.vpc.id)));
    const expected = eachMapVpc().map(w => w.vpcId);
    expect(modeled.sort()).toEqual(expected.sort());
  });
});
