import { describe, it, expect } from 'vitest';
import { CC } from './index';

interface Flow { srcTag?: string | null; dstTag?: string | null; srcCloud?: string | null; dstCloud?: string; srcBranch?: string; dst: string; dstVpc?: string; gbps: number; ports: string }

describe('branch-originated flows', () => {
  it('emits flows whose source is a branch', () => {
    const branchFlows = (CC.flows() as Flow[]).filter(f => f.srcBranch);
    expect(branchFlows.length).toBeGreaterThan(0);
  });

  it('points every branch flow at a real VPC', () => {
    const vpcIds = new Set(Object.values(CC.vpcs).flat().map((v: { id: string }) => v.id));
    (CC.flows() as Flow[]).filter(f => f.srcBranch).forEach(f => {
      expect(vpcIds.has(f.dstVpc!), `flow to unknown vpc ${f.dstVpc}`).toBe(true);
    });
  });

  it('is deterministic across calls', () => {
    const a = JSON.stringify(CC.flows());
    const b = JSON.stringify(CC.flows());
    expect(a).toBe(b);
  });

  it('still emits the original VPC-originated flows', () => {
    const vpcFlows = (CC.flows() as Flow[]).filter(f => !f.srcBranch);
    expect(vpcFlows.length).toBeGreaterThan(0);
    expect(vpcFlows.some(f => f.dst === 'internet')).toBe(true);
  });

  // A customer branch carries no governance tag. srcTag on a branch flow
  // must be null so tag-based rules (pol-insp etc.) never mis-match a
  // branch as if it were the tagged, classified party - group membership
  // is the correct match mechanism for branches, added in a later task.
  it('sets srcTag to null on every branch flow - branches carry no governance tag', () => {
    const branchFlows = (CC.flows() as Flow[]).filter(f => f.srcBranch);
    expect(branchFlows.length).toBeGreaterThan(0);
    branchFlows.forEach(f => {
      expect(f.srcTag).toBe(null);
    });
  });

  // The destination VPC's tag is still useful information - it's carried
  // under its own honestly-named field instead of being discarded.
  it('carries the destination VPC\'s first governance tag as dstTag on every branch flow', () => {
    const vpcById: Record<string, { tags?: string[] }> = Object.values(CC.vpcs).flat()
      .reduce((acc: Record<string, { tags?: string[] }>, v: any) => { acc[v.id] = v; return acc; }, {});
    const branchFlows = (CC.flows() as Flow[]).filter(f => f.srcBranch);
    expect(branchFlows.length).toBeGreaterThan(0);
    branchFlows.forEach(f => {
      const dstVpc = vpcById[f.dstVpc!];
      expect(dstVpc, `no vpc found for ${f.dstVpc}`).toBeTruthy();
      const expected = (dstVpc.tags || [])[0] || null;
      expect(f.dstTag).toBe(expected);
    });
  });

  // pol-insp ("Inspect classified egress") matches src.tag === 'classified-helion'.
  // Branch flows must never match it via srcTag - only group membership
  // (a later task) is a valid way for a branch to be subject to a tag rule.
  it('never matches the seeded "Inspect classified egress" rule against a branch flow', () => {
    const branchFlows = (CC.flows() as Flow[]).filter(f => f.srcBranch);
    expect(branchFlows.length).toBeGreaterThan(0);
    const rule = (CC.ruleList() as { id: string }[]).find(r => r.id === 'pol-insp')!;
    expect(rule).toBeTruthy();
    const result = CC.dryRun(rule) as { matched: { flow: Flow }[] };
    const branchMatches = result.matched.filter(m => m.flow.srcBranch);
    expect(branchMatches.length).toBe(0);
  });

  // A branch is not "in" a cloud - it reaches one over an on-ramp. srcCloud
  // must therefore be null on branch flows (mirrors srcTag:null above); the
  // cloud the on-ramp reaches is carried honestly as dstCloud instead of
  // being mislabeled as the flow's origin cloud.
  it('sets srcCloud to null and carries the reached cloud as dstCloud on every branch flow', () => {
    const branchFlows = (CC.flows() as Flow[]).filter(f => f.srcBranch);
    expect(branchFlows.length).toBeGreaterThan(0);
    branchFlows.forEach(f => {
      expect(f.srcCloud).toBe(null);
      expect(f.dstCloud).toBeTruthy();
    });
  });

  // The bug this guards: srcCloud used to hold the DESTINATION cloud, so a
  // rule authored as src:{tag:'any',cloud:'aws'} would match a branch flow
  // whose branch merely reaches AWS - matching by destination, not origin.
  // ruleMatch is a pure read of engine state, safe to call directly here.
  it('does not let a cloud-scoped rule match a branch flow by the cloud it reaches', () => {
    const branchFlows = (CC.flows() as Flow[]).filter(f => f.srcBranch);
    const withCloud = branchFlows.find(f => f.dstCloud);
    expect(withCloud, 'no branch flow carries a dstCloud').toBeTruthy();
    const rule = { src: { tag: 'any', cloud: withCloud!.dstCloud }, dst: 'any', ports: 'any' };
    expect(CC.ruleMatch(rule, withCloud)).toBe(false);
  });

  // Regression guard: the VPC-originated flows (the pre-existing table) must
  // stay byte-identical now that branch flows are appended after them. That
  // property holds today only because the branch block runs AFTER the VPC
  // loop, so it can't consume any of the VPC loop's RNG draws - nothing
  // pinned that ordering until this test. Snapshot is generated from the
  // current (correct) output via `vitest run -u`, not hand-written.
  it('keeps every pre-existing VPC-originated flow byte-identical', () => {
    const vpcFlows = (CC.flows() as Flow[]).filter(f => !f.srcBranch);
    expect(vpcFlows.length).toBeGreaterThan(0);
    expect(vpcFlows).toMatchInlineSnapshot(`
      [
        {
          "dst": "storage",
          "dstGroups": [],
          "gbps": 1.9,
          "id": "f1",
          "ports": "443",
          "srcCloud": "aws",
          "srcGroups": [],
          "srcName": "vpc-prod-01",
          "srcTag": "rd-helion",
          "srcVpc": "vpcprod",
          "viaPublic": false,
        },
        {
          "dst": "ai-endpoints",
          "dstGroups": [],
          "gbps": 4.3,
          "id": "f2",
          "ports": "443",
          "srcCloud": "aws",
          "srcGroups": [],
          "srcName": "vpc-prod-01",
          "srcTag": "rd-helion",
          "srcVpc": "vpcprod",
          "viaPublic": false,
        },
        {
          "dst": "intra-tag",
          "dstGroups": [
            "west-workloads",
          ],
          "dstVpc": "vnetapp",
          "gbps": 1.1,
          "id": "f3",
          "ports": "5432, 8443",
          "srcCloud": "aws",
          "srcGroups": [],
          "srcName": "vpc-prod-01",
          "srcTag": "rd-helion",
          "srcVpc": "vpcprod",
          "viaPublic": false,
        },
        {
          "dst": "intra-tag",
          "dstGroups": [],
          "dstVpc": "cwgpu",
          "gbps": 1.1,
          "id": "f4",
          "ports": "5432, 8443",
          "srcCloud": "aws",
          "srcGroups": [],
          "srcName": "vpc-prod-01",
          "srcTag": "rd-helion",
          "srcVpc": "vpcprod",
          "viaPublic": false,
        },
        {
          "dst": "storage",
          "dstGroups": [],
          "gbps": 1.3,
          "id": "f5",
          "ports": "443",
          "srcCloud": "aws",
          "srcGroups": [],
          "srcName": "vpc-data-02",
          "srcTag": "finance-invoices",
          "srcVpc": "vpcdata",
          "viaPublic": false,
        },
        {
          "dst": "internet",
          "dstGroups": [],
          "gbps": 2.2,
          "id": "f6",
          "ports": "443",
          "srcCloud": "aws",
          "srcGroups": [],
          "srcName": "vpc-data-02",
          "srcTag": "finance-invoices",
          "srcVpc": "vpcdata",
          "viaPublic": true,
        },
        {
          "dst": "storage-external",
          "dstGroups": [],
          "gbps": 1,
          "id": "f7",
          "ports": "443",
          "srcCloud": "aws",
          "srcGroups": [],
          "srcName": "vpc-data-02",
          "srcTag": "finance-invoices",
          "srcVpc": "vpcdata",
          "viaPublic": false,
        },
        {
          "dst": "storage",
          "dstGroups": [],
          "gbps": 1.3,
          "id": "f8",
          "ports": "443",
          "srcCloud": "aws",
          "srcGroups": [],
          "srcName": "vpc-dmz-03",
          "srcTag": "classified-helion",
          "srcVpc": "vpcdmz",
          "viaPublic": false,
        },
        {
          "dst": "internet",
          "dstGroups": [],
          "gbps": 2.2,
          "id": "f9",
          "ports": "443",
          "srcCloud": "aws",
          "srcGroups": [],
          "srcName": "vpc-dmz-03",
          "srcTag": "classified-helion",
          "srcVpc": "vpcdmz",
          "viaPublic": true,
        },
        {
          "dst": "ai-endpoints",
          "dstGroups": [],
          "gbps": 1.9,
          "id": "f10",
          "ports": "443",
          "srcCloud": "aws",
          "srcGroups": [],
          "srcName": "vpc-dmz-03",
          "srcTag": "classified-helion",
          "srcVpc": "vpcdmz",
          "viaPublic": false,
        },
        {
          "dst": "dns-exfil",
          "dstGroups": [],
          "gbps": 0.5,
          "id": "f11",
          "ports": "53",
          "srcCloud": "aws",
          "srcGroups": [],
          "srcName": "vpc-dmz-03",
          "srcTag": "classified-helion",
          "srcVpc": "vpcdmz",
          "viaPublic": true,
        },
        {
          "dst": "storage",
          "dstGroups": [],
          "gbps": 1.9,
          "id": "f12",
          "ports": "443",
          "srcCloud": "aws",
          "srcGroups": [
            "west-workloads",
          ],
          "srcName": "vpc-west-01",
          "srcTag": "shared-services",
          "srcVpc": "vpcwest",
          "viaPublic": true,
        },
        {
          "dst": "internet",
          "dstGroups": [],
          "gbps": 3.4,
          "id": "f13",
          "ports": "443",
          "srcCloud": "aws",
          "srcGroups": [
            "west-workloads",
          ],
          "srcName": "vpc-west-01",
          "srcTag": "shared-services",
          "srcVpc": "vpcwest",
          "viaPublic": true,
        },
        {
          "dst": "ai-endpoints",
          "dstGroups": [],
          "gbps": 4.3,
          "id": "f14",
          "ports": "443",
          "srcCloud": "aws",
          "srcGroups": [
            "west-workloads",
          ],
          "srcName": "vpc-west-01",
          "srcTag": "shared-services",
          "srcVpc": "vpcwest",
          "viaPublic": true,
        },
        {
          "dst": "storage",
          "dstGroups": [],
          "gbps": 1,
          "id": "f15",
          "ports": "443",
          "srcCloud": "aws",
          "srcGroups": [
            "west-workloads",
          ],
          "srcName": "vpc-backup-02",
          "srcTag": "untagged",
          "srcVpc": "vpcbak",
          "viaPublic": true,
        },
        {
          "dst": "internet",
          "dstGroups": [],
          "gbps": 1.7,
          "id": "f16",
          "ports": "443",
          "srcCloud": "aws",
          "srcGroups": [
            "west-workloads",
          ],
          "srcName": "vpc-backup-02",
          "srcTag": "untagged",
          "srcVpc": "vpcbak",
          "viaPublic": true,
        },
        {
          "dst": "storage",
          "dstGroups": [],
          "gbps": 1.3,
          "id": "f17",
          "ports": "443",
          "srcCloud": "aws",
          "srcGroups": [],
          "srcName": "vpc-eu-01",
          "srcTag": "shared-services",
          "srcVpc": "vpceu",
          "viaPublic": true,
        },
        {
          "dst": "internet",
          "dstGroups": [],
          "gbps": 2.2,
          "id": "f18",
          "ports": "443",
          "srcCloud": "aws",
          "srcGroups": [],
          "srcName": "vpc-eu-01",
          "srcTag": "shared-services",
          "srcVpc": "vpceu",
          "viaPublic": true,
        },
        {
          "dst": "ai-endpoints",
          "dstGroups": [],
          "gbps": 2.9,
          "id": "f19",
          "ports": "443",
          "srcCloud": "aws",
          "srcGroups": [],
          "srcName": "vpc-eu-01",
          "srcTag": "shared-services",
          "srcVpc": "vpceu",
          "viaPublic": true,
        },
        {
          "dst": "storage",
          "dstGroups": [],
          "gbps": 2.8,
          "id": "f20",
          "ports": "443",
          "srcCloud": "azure",
          "srcGroups": [
            "west-workloads",
          ],
          "srcName": "vnet-app-02",
          "srcTag": "rd-helion",
          "srcVpc": "vnetapp",
          "viaPublic": true,
        },
        {
          "dst": "internet",
          "dstGroups": [],
          "gbps": 4.9,
          "id": "f21",
          "ports": "443",
          "srcCloud": "azure",
          "srcGroups": [
            "west-workloads",
          ],
          "srcName": "vnet-app-02",
          "srcTag": "rd-helion",
          "srcVpc": "vnetapp",
          "viaPublic": true,
        },
        {
          "dst": "ai-endpoints",
          "dstGroups": [],
          "gbps": 6.3,
          "id": "f22",
          "ports": "443",
          "srcCloud": "azure",
          "srcGroups": [
            "west-workloads",
          ],
          "srcName": "vnet-app-02",
          "srcTag": "rd-helion",
          "srcVpc": "vnetapp",
          "viaPublic": true,
        },
        {
          "dst": "intra-tag",
          "dstGroups": [],
          "dstVpc": "vpcprod",
          "gbps": 1.6,
          "id": "f23",
          "ports": "5432, 8443",
          "srcCloud": "azure",
          "srcGroups": [
            "west-workloads",
          ],
          "srcName": "vnet-app-02",
          "srcTag": "rd-helion",
          "srcVpc": "vnetapp",
          "viaPublic": true,
        },
        {
          "dst": "intra-tag",
          "dstGroups": [],
          "dstVpc": "cwgpu",
          "gbps": 1.6,
          "id": "f24",
          "ports": "5432, 8443",
          "srcCloud": "azure",
          "srcGroups": [
            "west-workloads",
          ],
          "srcName": "vnet-app-02",
          "srcTag": "rd-helion",
          "srcVpc": "vnetapp",
          "viaPublic": true,
        },
        {
          "dst": "storage",
          "dstGroups": [],
          "gbps": 1,
          "id": "f25",
          "ports": "443",
          "srcCloud": "azure",
          "srcGroups": [
            "west-workloads",
          ],
          "srcName": "vnet-data-03",
          "srcTag": "untagged",
          "srcVpc": "vnetdata",
          "viaPublic": true,
        },
        {
          "dst": "internet",
          "dstGroups": [],
          "gbps": 1.7,
          "id": "f26",
          "ports": "443",
          "srcCloud": "azure",
          "srcGroups": [
            "west-workloads",
          ],
          "srcName": "vnet-data-03",
          "srcTag": "untagged",
          "srcVpc": "vnetdata",
          "viaPublic": true,
        },
        {
          "dst": "storage",
          "dstGroups": [],
          "gbps": 1.6,
          "id": "f27",
          "ports": "443",
          "srcCloud": "azure",
          "srcGroups": [],
          "srcName": "vnet-emea-01",
          "srcTag": "untagged",
          "srcVpc": "vnetemea",
          "viaPublic": true,
        },
        {
          "dst": "internet",
          "dstGroups": [],
          "gbps": 2.8,
          "id": "f28",
          "ports": "443",
          "srcCloud": "azure",
          "srcGroups": [],
          "srcName": "vnet-emea-01",
          "srcTag": "untagged",
          "srcVpc": "vnetemea",
          "viaPublic": true,
        },
        {
          "dst": "storage",
          "dstGroups": [],
          "gbps": 1.4,
          "id": "f29",
          "ports": "443",
          "srcCloud": "azure",
          "srcGroups": [],
          "srcName": "vnet-dmz-uk",
          "srcTag": "untagged",
          "srcVpc": "vnetdmz",
          "viaPublic": true,
        },
        {
          "dst": "internet",
          "dstGroups": [],
          "gbps": 2.5,
          "id": "f30",
          "ports": "443",
          "srcCloud": "azure",
          "srcGroups": [],
          "srcName": "vnet-dmz-uk",
          "srcTag": "untagged",
          "srcVpc": "vnetdmz",
          "viaPublic": true,
        },
        {
          "dst": "storage",
          "dstGroups": [],
          "gbps": 0.6,
          "id": "f31",
          "ports": "443",
          "srcCloud": "gcp",
          "srcGroups": [
            "west-workloads",
          ],
          "srcName": "vpc-gke-prod",
          "srcTag": "untagged",
          "srcVpc": "vpcgcp1",
          "viaPublic": true,
        },
        {
          "dst": "internet",
          "dstGroups": [],
          "gbps": 1.1,
          "id": "f32",
          "ports": "443",
          "srcCloud": "gcp",
          "srcGroups": [
            "west-workloads",
          ],
          "srcName": "vpc-gke-prod",
          "srcTag": "untagged",
          "srcVpc": "vpcgcp1",
          "viaPublic": true,
        },
        {
          "dst": "storage",
          "dstGroups": [],
          "gbps": 0.8,
          "id": "f33",
          "ports": "443",
          "srcCloud": "gcp",
          "srcGroups": [
            "west-workloads",
          ],
          "srcName": "vpc-svc-02",
          "srcTag": "untagged",
          "srcVpc": "vpcgcp2",
          "viaPublic": true,
        },
        {
          "dst": "internet",
          "dstGroups": [],
          "gbps": 1.4,
          "id": "f34",
          "ports": "443",
          "srcCloud": "gcp",
          "srcGroups": [
            "west-workloads",
          ],
          "srcName": "vpc-svc-02",
          "srcTag": "untagged",
          "srcVpc": "vpcgcp2",
          "viaPublic": true,
        },
        {
          "dst": "storage",
          "dstGroups": [],
          "gbps": 1.7,
          "id": "f35",
          "ports": "443",
          "srcCloud": "oci",
          "srcGroups": [],
          "srcName": "vcn-prod-01",
          "srcTag": "untagged",
          "srcVpc": "ocivcn",
          "viaPublic": true,
        },
        {
          "dst": "internet",
          "dstGroups": [],
          "gbps": 2.9,
          "id": "f36",
          "ports": "443",
          "srcCloud": "oci",
          "srcGroups": [],
          "srcName": "vcn-prod-01",
          "srcTag": "untagged",
          "srcVpc": "ocivcn",
          "viaPublic": true,
        },
        {
          "dst": "storage",
          "dstGroups": [],
          "gbps": 1,
          "id": "f37",
          "ports": "443",
          "srcCloud": "cw",
          "srcGroups": [],
          "srcName": "gpu-cluster-01",
          "srcTag": "rd-helion",
          "srcVpc": "cwgpu",
          "viaPublic": true,
        },
        {
          "dst": "internet",
          "dstGroups": [],
          "gbps": 1.7,
          "id": "f38",
          "ports": "443",
          "srcCloud": "cw",
          "srcGroups": [],
          "srcName": "gpu-cluster-01",
          "srcTag": "rd-helion",
          "srcVpc": "cwgpu",
          "viaPublic": true,
        },
        {
          "dst": "ai-endpoints",
          "dstGroups": [],
          "gbps": 2.2,
          "id": "f39",
          "ports": "443",
          "srcCloud": "cw",
          "srcGroups": [],
          "srcName": "gpu-cluster-01",
          "srcTag": "rd-helion",
          "srcVpc": "cwgpu",
          "viaPublic": true,
        },
        {
          "dst": "intra-tag",
          "dstGroups": [],
          "dstVpc": "vpcprod",
          "gbps": 0.5,
          "id": "f40",
          "ports": "5432, 8443",
          "srcCloud": "cw",
          "srcGroups": [],
          "srcName": "gpu-cluster-01",
          "srcTag": "rd-helion",
          "srcVpc": "cwgpu",
          "viaPublic": true,
        },
        {
          "dst": "intra-tag",
          "dstGroups": [
            "west-workloads",
          ],
          "dstVpc": "vnetapp",
          "gbps": 0.6,
          "id": "f41",
          "ports": "5432, 8443",
          "srcCloud": "cw",
          "srcGroups": [],
          "srcName": "gpu-cluster-01",
          "srcTag": "rd-helion",
          "srcVpc": "cwgpu",
          "viaPublic": true,
        },
        {
          "dst": "storage",
          "dstGroups": [],
          "gbps": 1,
          "id": "f42",
          "ports": "443",
          "srcCloud": "neb",
          "srcGroups": [],
          "srcName": "nb-gpu-net",
          "srcTag": "classified-helion",
          "srcVpc": "nbgpu",
          "viaPublic": true,
        },
        {
          "dst": "internet",
          "dstGroups": [],
          "gbps": 1.7,
          "id": "f43",
          "ports": "443",
          "srcCloud": "neb",
          "srcGroups": [],
          "srcName": "nb-gpu-net",
          "srcTag": "classified-helion",
          "srcVpc": "nbgpu",
          "viaPublic": true,
        },
        {
          "dst": "ai-endpoints",
          "dstGroups": [],
          "gbps": 1.4,
          "id": "f44",
          "ports": "443",
          "srcCloud": "neb",
          "srcGroups": [],
          "srcName": "nb-gpu-net",
          "srcTag": "classified-helion",
          "srcVpc": "nbgpu",
          "viaPublic": true,
        },
        {
          "dst": "dns-exfil",
          "dstGroups": [],
          "gbps": 0.4,
          "id": "f45",
          "ports": "53",
          "srcCloud": "neb",
          "srcGroups": [],
          "srcName": "nb-gpu-net",
          "srcTag": "classified-helion",
          "srcVpc": "nbgpu",
          "viaPublic": true,
        },
      ]
    `);
  });
});
