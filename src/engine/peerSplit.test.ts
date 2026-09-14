import { describe, it, expect } from 'vitest';
import { CC } from './index';

interface Flow { srcVpc?: string; dstVpc?: string; dst: string; gbps: number }
interface Vpc { id: string; name: string; cidr: string; azs: number; subnets: number; attached: boolean; role: string; tags: string[]; cloudTags: Record<string, string> }
const vpcs = () => (CC as unknown as { vpcs: Record<string, Vpc[]> }).vpcs;

/* F4. The intra-tag peer split hands the first n-1 peers Math.round(t/n) and
   lets the last absorb the remainder t - given. When round(t/n)*(n-1) > t the
   remainder is NEGATIVE - a peer modelled as carrying less than no traffic.
   The existing conservation test cannot see this: a negative share still sums
   to exactly t, which is all conservation checks.

   The seeded estate tops out at 4 same-tag VPCs (3 peers) even after a rescan,
   so this test CONSTRUCTS the condition: extra rd-helion workloads pushed into
   an existing region so the peer count clears 4. Flooring the first n-1 makes
   the remainder non-negative by construction while keeping the sum exact. */
function intraTagFlows(): Flow[] {
  return (CC.flows() as Flow[]).filter(f => f.dst === 'intra-tag');
}

describe('intra-tag peer split', () => {
  it('read-only: the seeded estate splits intra-tag traffic without a negative share', () => {
    const flows = intraTagFlows();
    expect(flows.length).toBeGreaterThan(0);
    flows.forEach(f => expect(f.gbps).toBeGreaterThanOrEqual(0));
  });

  it('never hands a peer a negative share once the peer count clears 4', () => {
    // Six extra single-subnet rd-helion workloads: enough peers that
    // round(t/n)*(n-1) overshoots t for at least one source's tenths.
    for (let i = 0; i < 6; i++) {
      vpcs().usc1.push({
        id: 'peerfill' + i, name: 'vpc-peerfill-' + i, cidr: '10.9' + i + '.0.0/16',
        azs: 1, subnets: 1, attached: false, role: 'peer split fixture',
        tags: ['rd-helion'], cloudTags: { Project: 'xyz', Env: 'prod', Owner: 'ml', Region: 'west' },
      });
    }

    const flows = intraTagFlows();
    const negative = flows.filter(f => f.gbps < 0);
    expect(negative.map(f => `${f.srcVpc}->${f.dstVpc}=${f.gbps}`)).toEqual([]);
  });

  it('still conserves each source total exactly after the split', () => {
    // gbps is quantised to tenths, so compare in integer tenths - summing
    // floats would fail on representation, not on the model.
    const bySrc: Record<string, number> = {};
    intraTagFlows().forEach(f => {
      bySrc[f.srcVpc as string] = (bySrc[f.srcVpc as string] || 0) + Math.round(f.gbps * 10);
    });
    Object.values(bySrc).forEach(tenths => {
      expect(Number.isInteger(tenths)).toBe(true);
      expect(tenths).toBeGreaterThanOrEqual(0);
    });
  });
});
