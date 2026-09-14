import { describe, it, expect } from 'vitest';
import { CC } from './index';

interface Flow { srcVpc?: string; dstVpc?: string; dst: string; gbps: number; srcGroups?: string[]; dstGroups?: string[] }
interface Vpc { id: string; subnets: number }

/* Flows carry no region field, so region has to be resolved from the estate.
   CC.vpcs is keyed by region id, which makes a vpcId -> regionId index the
   only honest way to assert anything cross-REGION rather than merely
   cross-VPC. Built fresh on each call so it sees post-rescan discoveries. */
function regionIndex(): Record<string, string> {
  const idx: Record<string, string> = {};
  const byRegion = (CC as unknown as { vpcs: Record<string, Vpc[]> }).vpcs;
  Object.keys(byRegion).forEach(regionId => {
    byRegion[regionId].forEach(v => { idx[v.id] = regionId; });
  });
  return idx;
}

/* The source's pre-split intra-tag gbps is base*0.9, and base is
   subnets * round(2 + rng()*6) / 10 - an integer multiple of subnets/10 that
   the test cannot redraw without a second RNG. It CAN be recovered exactly:
   every VPC also emits a storage flow at base*0.8, and the seven candidate
   multipliers are far enough apart (>= 1.6 tenths for subnets >= 2) that
   exactly one of them reproduces the observed storage gbps. */
function recoverBase(subnets: number, storageGbps: number): number {
  const hits: number[] = [];
  for (let k = 2; k <= 8; k++) {
    const base = subnets * k / 10;
    if (Math.round(base * 0.8 * 10) / 10 === storageGbps) hits.push(base);
  }
  expect(hits.length, `base for subnets=${subnets} storage=${storageGbps} is ambiguous`).toBe(1);
  return hits[0];
}

/* Sum of every intra-tag flow gbps per source VPC, against the pre-split
   total that source should conserve. */
function intraTagConservation() {
  const flows = CC.flows() as Flow[];
  const byRegion = (CC as unknown as { vpcs: Record<string, Vpc[]> }).vpcs;
  const subnetsOf: Record<string, number> = {};
  Object.keys(byRegion).forEach(r => byRegion[r].forEach(v => { subnetsOf[v.id] = v.subnets; }));

  const rows: { srcVpc: string; sum: number; expected: number }[] = [];
  const sources = new Set(flows.filter(f => f.srcVpc && f.dst === 'intra-tag').map(f => f.srcVpc as string));
  sources.forEach(srcVpc => {
    const sum = Math.round(flows.filter(f => f.srcVpc === srcVpc && f.dst === 'intra-tag')
      .reduce((s, f) => s + f.gbps, 0) * 10) / 10;
    const storage = flows.find(f => f.srcVpc === srcVpc && f.dst === 'storage') as Flow;
    const base = recoverBase(subnetsOf[srcVpc], storage.gbps);
    rows.push({ srcVpc, sum, expected: Math.round(base * 0.9 * 10) / 10 });
  });
  return rows;
}

describe('workload-to-workload intra-group', () => {
  it('gives every intra-tag flow a concrete destination VPC', () => {
    const intra = (CC.flows() as Flow[]).filter(f => f.dst === 'intra-tag' && f.srcVpc);
    expect(intra.length).toBeGreaterThan(0);
    intra.forEach(f => expect(f.dstVpc, `${f.srcVpc} intra-tag flow has no dstVpc`).toBeTruthy());
  });

  it('never points a VPC flow at itself', () => {
    (CC.flows() as Flow[]).filter(f => f.srcVpc && f.dstVpc)
      .forEach(f => expect(f.dstVpc).not.toBe(f.srcVpc));
  });

  it('populates dstGroups for VPC-originated flows', () => {
    const tagged = (CC.flows() as Flow[]).filter(f => f.srcVpc && (f.dstGroups || []).length > 0);
    expect(tagged.length).toBeGreaterThan(0);
  });

  /* west-workloads is now honestly region-scoped (Region:west), so it holds
     only one of the three rd-helion VPCs (vnetapp - vpcprod is us-east-1,
     cwgpu is US-EAST-04A). That is correct behaviour for Task C2, but it
     means west-workloads itself can no longer demonstrate a VPC-to-VPC
     cross-region intra-group match - there is only one western node in the
     mesh. The property under test ("same group, DIFFERENT regions, one
     rule") is still a real engine capability, so it is proven here against
     a group that actually spans the mesh: every rd-helion VPC, by
     governance tag rather than by region. */
  it('matches a workload-to-workload intra-group rule across regions', () => {
    CC.addGroup({
      id: 'rd-helion-mesh', label: 'RD Helion mesh (test)', kind: 'workload', members: [],
      predicates: [{ source: 'governanceTag', values: ['rd-helion'] }],
    });
    const rule = { src: { group: 'rd-helion-mesh' }, dst: 'intra-group', ports: 'any', action: 'allow', chain: [] };
    const matched = CC.dryRun(rule).matched as { flow: Flow }[];
    expect(matched.length).toBeGreaterThan(0);

    /* The point of the whole feature: same group, DIFFERENT regions, one
       rule. Asserting on distinct srcVpc ids would pass on two VPCs sharing
       a region, which proves nothing - so resolve both endpoints to their
       region and require at least one genuine cross-region pair. */
    const idx = regionIndex();
    const crossRegion = matched.filter(m => {
      const f = m.flow;
      if (!f.srcVpc || !f.dstVpc) return false;
      return idx[f.srcVpc] && idx[f.dstVpc] && idx[f.srcVpc] !== idx[f.dstVpc];
    });
    expect(crossRegion.length,
      'no matched flow connects two VPCs in different regions').toBeGreaterThan(0);
    CC.removeGroup('rd-helion-mesh');
  });

  it('is deterministic', () => {
    expect(JSON.stringify(CC.flows())).toBe(JSON.stringify(CC.flows()));
  });

  /* Dividing a source's intra-tag gbps across its peers must not invent
     traffic. Rounding each peer's share independently does not always err
     downward - the direction depends on the remainder - so the split has to
     conserve the source total exactly. */
  it('conserves each source VPC intra-tag gbps across the peer split', () => {
    const rows = intraTagConservation();
    expect(rows.length).toBeGreaterThan(0);
    rows.forEach(r => expect(r.sum, `${r.srcVpc} intra-tag split inflates`).toBe(r.expected));
  });

  /* MUTATING - keep last. rescanAccount('gcp') permanently surfaces vpcml
     (tagged rd-helion) onto the shared singleton, taking rd-helion from 3
     VPCs to 4 and every source from 2 peers to 3. An odd peer count is
     exactly where per-flow rounding used to round UP. */
  it('still conserves intra-tag gbps after a GCP rescan discovers a fourth peer', () => {
    const before = intraTagConservation().length;
    expect(CC.rescanAccount('gcp')).toBe('vpc-ml-suite');

    const rows = intraTagConservation();
    expect(rows.length).toBe(before + 1);
    rows.forEach(r => expect(r.sum, `${r.srcVpc} intra-tag split inflates after rescan`).toBe(r.expected));
  });
});
