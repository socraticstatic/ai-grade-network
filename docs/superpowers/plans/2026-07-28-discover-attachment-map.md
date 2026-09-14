# Discover Attachment Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A workload-grained Attachment Map on `/discover` — a second lens beside the tree — showing every AWS/Azure VPC/VNet and how it reaches (or fails to reach) the AT&T network, with a per-workload attachment-chain detail drawer.

**Architecture:** Three pure modules (`attachmentModel.ts` chain derivation, `attachmentLayout.ts` deterministic SVG geometry) feed two components (`AttachmentMap.tsx` SVG map, `ChainDrawer.tsx` detail drawer), toggled from `UnifiedDiscovery.tsx` via a Tree|Map segmented control. Everything derives from the engine singleton (`CC` via `useCloudControl`); the only mutation is the existing `activateOnramp`.

**Tech Stack:** React 18 + TypeScript, Vitest + Testing Library, Tailwind (Flywheel `fw-*` tokens), inline SVG (no new deps).

## Global Constraints

- Deterministic everywhere: no `Date.now()`, no `Math.random()` in models, layout, or render.
- Latency figures come ONLY from `regionLatencyMap` / `regionLatencyPathMap` (`discoveryModel.ts`). Never invent a second latency derivation.
- Palette: Flywheel only. Cobalt `#0057b8` = private/on-fabric, slate `#94a3b8` dashed = public, `fw-success` = attached badges. **No amber.**
- Every interactive SVG node is a real `<button>` inside `<foreignObject>` (FabricHero precedent — keyboard accessibility).
- Map scope v1: clouds `aws` and `azure` only. The tree keeps all six clouds.
- Provider BGP ASNs: Azure `12076`, AWS `64512`. Customer ASN `65000`. VLAN = `100 + regionIndex * 10 + vpcIndex`.
- No new engine mutations. Attach CTA calls `CC.activateOnramp(onrampId)`.
- Tests that mutate the engine restore it with `CC.undo()` before the test ends (the engine is a module singleton shared across the vitest file).
- Existing suites must stay green, incl. `src/__tests__/rebrand.test.ts`. `npm run build` runs `tsc --noEmit` first.

---

### Task 1: attachmentModel — the chain derivation

**Files:**
- Create: `src/features/discover/attachmentModel.ts`
- Test: `src/features/discover/attachmentModel.test.ts`

**Interfaces:**
- Consumes: `discoveryModel.ts` (`regionsOf`, `vpcsOf`, `regionLatencyMap`, `regionLatencyPathMap`, types `Cloud`/`Region`/`Vpc`), `buildMap.ts` (`buildMap`), engine `CC`.
- Produces (later tasks import these exact names):
  - `MAP_CLOUDS: readonly ['aws', 'azure']`
  - `CUSTOMER_ASN = 65000`, `PROVIDER_ASN: Record<string, number>`
  - `interface ChainHop { id: string; name: string; type: string }`
  - `interface ChainCircuit { onrampId: string; name: string; type: string; site: string; bandwidth: string; vlan: number; bgp: { customerAsn: number; providerAsn: number } }`
  - `interface AttachmentChain { workload: {...}; gateways: ChainHop[]; circuit: ChainCircuit | null; candidateOnrampId: string | null; path: { kind: 'private' | 'public'; latencyMs: number }; internet: { egressNote: string } | null }`
  - `attachmentChain(cc, cloudId, regionId, vpcId): AttachmentChain | null`
  - `workloadsOnRamp(cc, onrampId): { cloudId: string; regionId: string; vpc: Vpc }[]`
  - `buildAttachmentMapModel(cc): AttachmentMapModel` (shape below)
  - `rampShort(type: string): string`, `bandwidthOf(sub: string): string`, `vlanFor(regionIndex, vpcIndex): number`

- [ ] **Step 1: Write the failing tests**

```ts
// src/features/discover/attachmentModel.test.ts
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

  it('chain latency and path equal the ONE latency derivation', () => {
    const lat = regionLatencyMap(CC);
    const path = regionLatencyPathMap(CC);
    for (const w of eachMapVpc()) {
      const chain = attachmentChain(CC, w.cloudId, w.regionId, w.vpcId)!;
      expect(chain.path.latencyMs).toBe(lat[w.regionId]);
      expect(chain.path.kind).toBe(path[w.regionId]);
    }
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/discover/attachmentModel.test.ts`
Expected: FAIL — `Cannot find module './attachmentModel'`

- [ ] **Step 3: Implement the model**

```ts
// src/features/discover/attachmentModel.ts
import type { CloudControl } from '../../engine/types';
import { buildMap } from './buildMap';
import {
  regionsOf, vpcsOf, regionLatencyMap, regionLatencyPathMap,
  type Cloud, type Region, type Vpc,
} from './discoveryModel';

/**
 * Pure derivations for the Attachment Map — the chain from a workload through
 * its cloud gateways and AT&T circuit to the fabric, and the map-wide model
 * the layout consumes. Deterministic: VLANs come from seeded array indices,
 * ASNs are constants, latency comes from the ONE derivation
 * (`regionLatencyMap`/`regionLatencyPathMap`) and nothing else.
 */

export const MAP_CLOUDS = ['aws', 'azure'] as const;

export const CUSTOMER_ASN = 65000;
/** Provider-side BGP ASN, per reality: Azure MSEE is fixed 12076; AWS 64512
 *  is the Amazon default for a private VIF on a DX gateway. */
export const PROVIDER_ASN: Record<string, number> = { aws: 64512, azure: 12076 };

export interface ChainHop { id: string; name: string; type: string }
export interface ChainCircuit {
  onrampId: string;
  name: string;
  type: string;
  site: string;
  bandwidth: string;
  vlan: number;
  bgp: { customerAsn: number; providerAsn: number };
}
export interface AttachmentChain {
  workload: {
    id: string; name: string; cidr: string; role: string;
    tags: string[]; vnet: boolean; ai: boolean;
    endpoints: { enis: number; serviceEndpoints: string[] };
  };
  gateways: ChainHop[];
  circuit: ChainCircuit | null;
  /** The ramp that WOULD serve this workload — the drawer's attach CTA target
   *  when `circuit` is null. */
  candidateOnrampId: string | null;
  path: { kind: 'private' | 'public'; latencyMs: number };
  internet: { egressNote: string } | null;
}

interface RampLike {
  id: string; name: string; type: string; sub: string; active?: boolean;
  site: { name: string }; targets: [string, string][];
}

const rampsOf = (cc: CloudControl): RampLike[] =>
  ((cc as unknown as { onramps?: RampLike[] }).onramps ?? []);

/** On-ramps whose targets reach this cloud/region (the engine's rampsFor logic). */
export function servingRamps(cc: CloudControl, cloudId: string, regionId: string): RampLike[] {
  return rampsOf(cc).filter(o => o.targets.some(([c, r]) => c === cloudId && r === regionId));
}

/** Bandwidth as the on-ramp seed states it — '—' when the seed makes no claim. */
export function bandwidthOf(sub: string): string {
  const m = sub.match(/(\d+\s*[GM]bps)/i);
  return m ? m[1].replace(/\s+/, '') : '—';
}

export function vlanFor(regionIndex: number, vpcIndex: number): number {
  return 100 + regionIndex * 10 + vpcIndex;
}

/** Short product label — mirrors FabricHero's onrampShort without a
 *  cross-feature import. */
export function rampShort(type: string): string {
  if (/direct connect/i.test(type)) return 'DX';
  if (/expressroute/i.test(type)) return 'ER';
  if (/interconnect/i.test(type)) return 'IX';
  if (/netbond/i.test(type)) return 'NetBond';
  return type;
}

export function attachmentChain(
  cc: CloudControl, cloudId: string, regionId: string, vpcId: string,
): AttachmentChain | null {
  const cloud = (cc.clouds as Cloud[]).find(c => c.id === cloudId);
  if (!cloud) return null;
  const regions = regionsOf(cc, cloudId);
  const regionIndex = regions.findIndex(r => r.id === regionId);
  if (regionIndex < 0) return null;
  const region: Region = regions[regionIndex];
  const list = vpcsOf(cc, regionId);
  const vpcIndex = list.findIndex(v => v.id === vpcId);
  if (vpcIndex < 0) return null;
  const vpc: Vpc = list[vpcIndex];

  const m = buildMap(vpc, cloud, region);
  const enis = m.subnets.reduce((n, s) => n + s.eni, 0);
  const serviceEndpoints = m.gateways.filter(g => g.ic === 's3').map(g => g.name);
  const gateways: ChainHop[] = m.gateways
    .filter(g => g.ic === 'dx' || g.ic === 'tgw')
    .map(g => ({ id: g.id, name: g.name, type: g.type }));

  const ramps = servingRamps(cc, cloudId, regionId);
  const ramp = ramps.find(r => r.active) ?? ramps[0] ?? null;

  const circuit: ChainCircuit | null = vpc.attached && ramp
    ? {
        onrampId: ramp.id, name: ramp.name, type: ramp.type,
        site: ramp.site.name, bandwidth: bandwidthOf(ramp.sub),
        vlan: vlanFor(regionIndex, vpcIndex),
        bgp: { customerAsn: CUSTOMER_ASN, providerAsn: PROVIDER_ASN[cloudId] ?? CUSTOMER_ASN },
      }
    : null;

  const kind = regionLatencyPathMap(cc)[regionId] ?? 'public';
  const latencyMs = regionLatencyMap(cc)[regionId] ?? 0;

  return {
    workload: {
      id: vpc.id, name: vpc.name, cidr: vpc.cidr, role: vpc.role,
      tags: vpc.tags ?? [], vnet: !!vpc.vnet, ai: !!vpc.ai,
      endpoints: { enis, serviceEndpoints },
    },
    gateways,
    circuit,
    candidateOnrampId: ramp?.id ?? null,
    path: { kind, latencyMs },
    internet: vpc.attached
      ? null
      : { egressNote: 'Traffic leaves through the internet gateway — no AT&T-controlled path.' },
  };
}

/** Every attached AWS/Azure workload riding this circuit. */
export function workloadsOnRamp(
  cc: CloudControl, onrampId: string,
): { cloudId: string; regionId: string; vpc: Vpc }[] {
  const out: { cloudId: string; regionId: string; vpc: Vpc }[] = [];
  for (const cloudId of MAP_CLOUDS) {
    for (const r of regionsOf(cc, cloudId)) {
      const ramps = servingRamps(cc, cloudId, r.id);
      const serving = ramps.find(x => x.active) ?? ramps[0] ?? null;
      if (serving?.id !== onrampId) continue;
      for (const v of vpcsOf(cc, r.id)) {
        if (v.attached) out.push({ cloudId, regionId: r.id, vpc: v });
      }
    }
  }
  return out;
}

export interface MapWorkload { cloudId: string; regionId: string; vpc: Vpc }
export interface AttachmentMapModel {
  sites: { id: string; name: string; city: string; onrampId?: string }[];
  onramps: { id: string; name: string; type: string; short: string; site: string; active: boolean }[];
  groups: {
    cloudId: string; cloudName: string; color: string;
    regions: { region: Region; regionIndex: number; workloads: MapWorkload[] }[];
  }[];
}

export function buildAttachmentMapModel(cc: CloudControl): AttachmentMapModel {
  const branches = ((cc as unknown as { branches?: { id: string; name: string; city: string; onrampId?: string }[] }).branches ?? []);
  const clouds = (cc.clouds as Cloud[]).filter(c => (MAP_CLOUDS as readonly string[]).includes(c.id));
  return {
    sites: branches.map(b => ({ id: b.id, name: b.name, city: b.city, onrampId: b.onrampId })),
    onramps: rampsOf(cc).map(o => ({
      id: o.id, name: o.name, type: o.type, short: rampShort(o.type),
      site: o.site.name, active: !!o.active,
    })),
    groups: clouds.map(c => ({
      cloudId: c.id, cloudName: c.name, color: c.color,
      regions: regionsOf(cc, c.id).map((region, regionIndex) => ({
        region, regionIndex,
        workloads: vpcsOf(cc, region.id).map(vpc => ({ cloudId: c.id, regionId: region.id, vpc })),
      })),
    })),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/discover/attachmentModel.test.ts`
Expected: PASS. If the "attached chains end at a circuit" test fails because an attached VPC has NO serving ramp in the engine seeds, that is a real finding — inspect `CC.onramps` targets vs the attached regions and adjust `servingRamps` fallback ONLY if the engine itself has such a mapping (e.g. region-level `onrampIds` from `fabricModel()`); do not silently invent a ramp.

- [ ] **Step 5: Commit**

```bash
git add src/features/discover/attachmentModel.ts src/features/discover/attachmentModel.test.ts
git commit -m "feat(discover): attachment-chain derivation — the map's pure model"
```

---

### Task 2: attachmentLayout — deterministic geometry

**Files:**
- Create: `src/features/discover/attachmentLayout.ts`
- Test: `src/features/discover/attachmentLayout.test.ts`

**Interfaces:**
- Consumes: `AttachmentMapModel`, `MapWorkload` from `attachmentModel.ts` (Task 1).
- Produces: `computeAttachmentLayout(model: AttachmentMapModel): AttachmentLayout` with the exact shape in the code below. Task 4 renders exclusively from this.

- [ ] **Step 1: Write the failing tests**

```ts
// src/features/discover/attachmentLayout.test.ts
import { describe, it, expect } from 'vitest';
import { CC } from '../../engine';
import { buildAttachmentMapModel } from './attachmentModel';
import { computeAttachmentLayout, VIEW_W } from './attachmentLayout';

describe('computeAttachmentLayout', () => {
  it('is pure: identical model in, identical geometry out', () => {
    const model = buildAttachmentMapModel(CC);
    expect(computeAttachmentLayout(model)).toEqual(computeAttachmentLayout(model));
  });

  it('lays out one row per workload, all inside the viewBox', () => {
    const model = buildAttachmentMapModel(CC);
    const l = computeAttachmentLayout(model);
    const count = model.groups.flatMap(g => g.regions).reduce((n, r) => n + r.workloads.length, 0);
    expect(l.workloads.length).toBe(count);
    for (const w of l.workloads) {
      expect(w.x).toBeGreaterThanOrEqual(0);
      expect(w.x).toBeLessThanOrEqual(VIEW_W);
      expect(w.y).toBeGreaterThan(0);
      expect(w.y).toBeLessThan(l.viewH);
    }
  });

  it('attached workloads route to the fabric; unattached to the internet node', () => {
    const model = buildAttachmentMapModel(CC);
    const l = computeAttachmentLayout(model);
    for (const w of l.workloads) {
      if (w.attached) expect(w.edge.to.x).toBeLessThanOrEqual(l.fabric.x + l.fabric.w + 1);
      else expect(w.edge.to).toEqual({ x: l.internet.x, y: l.internet.y });
    }
  });

  it('the first workload of each region carries the region label slot', () => {
    const model = buildAttachmentMapModel(CC);
    const l = computeAttachmentLayout(model);
    const labeled = l.workloads.filter(w => w.regionLabel);
    const regionCount = model.groups.flatMap(g => g.regions).filter(r => r.workloads.length > 0).length;
    expect(labeled.length).toBe(regionCount);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/discover/attachmentLayout.test.ts`
Expected: FAIL — `Cannot find module './attachmentLayout'`

- [ ] **Step 3: Implement the layout**

```ts
// src/features/discover/attachmentLayout.ts
import type { AttachmentMapModel, MapWorkload } from './attachmentModel';

/**
 * Pure, deterministic geometry for the Attachment Map. Four bands left→right:
 * sites → AT&T fabric (a single band; on-ramps are labeled edges into it,
 * never blocks) → regions (grouped by cloud) → workloads. One row per
 * workload; the region label rides the first workload row of its region.
 * FabricHero precedent: fixed coordinates, no clocks, no RNG.
 */

export interface Pt { x: number; y: number }

export const VIEW_W = 1000;
const ROW_H = 48;
const TOP_PAD = 40;

const SITE_X = 28;
export const SITE_W = 148;
const FABRIC_X = 250;
const FABRIC_W = 84;
const REGION_ANCHOR_X = 470;
const WL_X = 620;
export const WL_W = 352;
export const NODE_H = 40;

export interface LayoutSite { id: string; name: string; city: string; x: number; y: number; edge: { from: Pt; to: Pt } }
export interface LayoutWorkload {
  wl: MapWorkload;
  attached: boolean;
  ai: boolean;
  x: number; y: number;
  /** Present on the first workload row of each region — the label slot. */
  regionLabel?: { cloudName: string; regionName: string; x: number; y: number };
  edge: { from: Pt; to: Pt; viaShort: string | null; dashed: boolean };
}
export interface AttachmentLayout {
  viewW: number;
  viewH: number;
  fabric: { x: number; y: number; w: number; h: number };
  sites: LayoutSite[];
  workloads: LayoutWorkload[];
  internet: Pt;
}

export function computeAttachmentLayout(model: AttachmentMapModel): AttachmentLayout {
  const flat: { wl: MapWorkload; first: boolean; cloudName: string; regionName: string; short: string | null }[] = [];
  for (const g of model.groups) {
    for (const r of g.regions) {
      const ramp = model.onramps.find(o => (r.region as unknown as { onrampIds?: string[] }).onrampIds?.includes(o.id))
        ?? null;
      r.workloads.forEach((wl, i) => {
        flat.push({
          wl, first: i === 0, cloudName: g.cloudName, regionName: r.region.name,
          short: ramp ? ramp.short : null,
        });
      });
    }
  }

  const rows = Math.max(flat.length, model.sites.length);
  const viewH = TOP_PAD * 2 + Math.max(0, rows - 1) * ROW_H + NODE_H + 56; // + internet row
  const bandTop = 24;
  const bandBottom = viewH - 72;
  const fabric = { x: FABRIC_X, y: bandTop, w: FABRIC_W, h: bandBottom - bandTop };
  const clampBand = (y: number) => Math.min(bandBottom - 12, Math.max(bandTop + 12, y));

  const siteGap = Math.min(80, (bandBottom - bandTop) / Math.max(1, model.sites.length));
  const siteStart = (bandTop + bandBottom) / 2 - ((model.sites.length - 1) * siteGap) / 2;
  const sites: LayoutSite[] = model.sites.map((s, i) => {
    const y = siteStart + i * siteGap;
    return {
      id: s.id, name: s.name, city: s.city, x: SITE_X, y,
      edge: { from: { x: SITE_X + SITE_W, y }, to: { x: FABRIC_X, y: clampBand(y) } },
    };
  });

  const internet: Pt = { x: REGION_ANCHOR_X, y: viewH - 34 };

  const workloads: LayoutWorkload[] = flat.map((f, i) => {
    const y = TOP_PAD + i * ROW_H;
    const attached = f.wl.vpc.attached;
    return {
      wl: f.wl,
      attached,
      ai: !!f.wl.vpc.ai,
      x: WL_X, y,
      regionLabel: f.first
        ? { cloudName: f.cloudName, regionName: f.regionName, x: REGION_ANCHOR_X, y }
        : undefined,
      edge: attached
        ? { from: { x: WL_X, y }, to: { x: FABRIC_X + FABRIC_W, y: clampBand(y) }, viaShort: f.short, dashed: false }
        : { from: { x: WL_X, y }, to: internet, viaShort: null, dashed: true },
    };
  });

  return { viewW: VIEW_W, viewH, fabric, sites, workloads, internet };
}
```

Note the region→ramp lookup reads `region.onrampIds` — `FabricRegion` carries it, but the discovery `Region` type may not. If `onrampIds` is absent on the seeded region objects, replace that lookup with `servingRamps` from `attachmentModel.ts` (import it; pick `.find(r => r.active) ?? ramps[0]`, then map to its `short` via `rampShort`). Keep the chosen mechanism consistent with `attachmentChain`'s ramp choice so the edge label and the drawer never disagree.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/discover/attachmentLayout.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/discover/attachmentLayout.ts src/features/discover/attachmentLayout.test.ts
git commit -m "feat(discover): deterministic attachment-map geometry"
```

---

### Task 3: ChainDrawer — the detail drawer

**Files:**
- Create: `src/features/discover/ChainDrawer.tsx`
- Test: `src/features/discover/ChainDrawer.test.tsx`

**Interfaces:**
- Consumes: `attachmentChain`, `workloadsOnRamp`, `rampShort`, `bandwidthOf` (Task 1); `useCloudControl`, `useCloudControlActions`.
- Produces: `export type MapSelection = { kind: 'workload'; cloudId: string; regionId: string; vpcId: string } | { kind: 'onramp'; onrampId: string };` and `export function ChainDrawer({ selection, onClose }: { selection: MapSelection; onClose: () => void })`. Task 4 renders it.

- [ ] **Step 1: Write the failing tests**

```tsx
// src/features/discover/ChainDrawer.test.tsx
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { CC } from '../../engine';
import { regionsOf, vpcsOf } from './discoveryModel';
import { attachmentChain, MAP_CLOUDS } from './attachmentModel';
import { ChainDrawer } from './ChainDrawer';
import type { Cloud } from './discoveryModel';

afterEach(cleanup);

const findVpc = (attached: boolean) => {
  for (const c of (CC.clouds as Cloud[]).filter(c => (MAP_CLOUDS as readonly string[]).includes(c.id))) {
    for (const r of regionsOf(CC, c.id)) {
      for (const v of vpcsOf(CC, r.id)) {
        if (v.attached === attached) return { cloudId: c.id, regionId: r.id, vpcId: v.id };
      }
    }
  }
  throw new Error(`no ${attached ? 'attached' : 'unattached'} vpc in seeds`);
};

describe('ChainDrawer — workload selection', () => {
  it('states the full chain for an attached workload: circuit, VLAN, both ASNs, path', () => {
    const w = findVpc(true);
    const chain = attachmentChain(CC, w.cloudId, w.regionId, w.vpcId)!;
    render(<ChainDrawer selection={{ kind: 'workload', ...w }} onClose={() => {}} />);
    expect(screen.getByText(chain.circuit!.name)).toBeInTheDocument();
    expect(screen.getByText(`VLAN ${chain.circuit!.vlan}`)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`${chain.circuit!.bgp.customerAsn}.*${chain.circuit!.bgp.providerAsn}`))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`${chain.path.latencyMs}\\s*ms`))).toBeInTheDocument();
  });

  it('an unattached workload ends at the internet and offers the real attach action', () => {
    const w = findVpc(false);
    const chain = attachmentChain(CC, w.cloudId, w.regionId, w.vpcId)!;
    expect(chain.circuit).toBeNull();
    render(<ChainDrawer selection={{ kind: 'workload', ...w }} onClose={() => {}} />);
    expect(screen.getByText(chain.internet!.egressNote)).toBeInTheDocument();
    const cta = screen.getByRole('button', { name: /attach via/i });
    fireEvent.click(cta);
    // Engine-real: the chain now derives a circuit from the SAME engine.
    const after = attachmentChain(CC, w.cloudId, w.regionId, w.vpcId)!;
    expect(after.circuit).not.toBeNull();
    // Restore the singleton for the rest of the suite.
    expect(CC.undo()).toBe(true);
  });
});

describe('ChainDrawer — on-ramp selection', () => {
  it('lists the circuit detail and every workload riding it', () => {
    render(<ChainDrawer selection={{ kind: 'onramp', onrampId: 'nb1' }} onClose={() => {}} />);
    const ramp = (CC.onramps as { id: string; name: string }[]).find(o => o.id === 'nb1')!;
    expect(screen.getByText(ramp.name)).toBeInTheDocument();
    expect(screen.getByTestId('ramp-workloads').children.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/discover/ChainDrawer.test.tsx`
Expected: FAIL — `Cannot find module './ChainDrawer'`

- [ ] **Step 3: Implement the drawer**

```tsx
// src/features/discover/ChainDrawer.tsx
import { X, Link2, Globe, Network, ArrowDown } from 'lucide-react';
import { useCloudControl, useCloudControlActions } from '../../engine/react/useCloudControl';
import { attachmentChain, workloadsOnRamp, rampShort, bandwidthOf } from './attachmentModel';

/**
 * The Attachment Map's detail drawer. A workload selection renders the chain
 * top-to-bottom — workload → gateways → circuit → AT&T site — each hop with
 * its details; the unattached variant ends at the public internet and offers
 * the SAME engine attach action the tree offers (`activateOnramp`), so the
 * map can close the gap it names. An on-ramp selection shows the inverse:
 * the circuit, and every workload riding it.
 */

export type MapSelection =
  | { kind: 'workload'; cloudId: string; regionId: string; vpcId: string }
  | { kind: 'onramp'; onrampId: string };

function Hop({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-fw-secondary bg-fw-base px-3 py-2">
      <div className="text-figma-sm font-medium text-fw-heading">{title}</div>
      {sub && <div className="text-[11px] text-fw-bodyLight">{sub}</div>}
      {children}
    </div>
  );
}

const Down = () => (
  <div className="flex justify-center py-0.5 text-fw-bodyLight">
    <ArrowDown size={13} aria-hidden="true" />
  </div>
);

export function ChainDrawer({ selection, onClose }: { selection: MapSelection; onClose: () => void }) {
  const cc = useCloudControl(c => c);
  const actions = useCloudControlActions();

  return (
    <aside
      role="dialog"
      aria-label="Attachment detail"
      data-testid="chain-drawer"
      className="w-full shrink-0 space-y-2 rounded-xl border border-fw-secondary bg-fw-wash/40 p-4 lg:w-[340px]"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-figma-base font-semibold text-fw-heading">
          {selection.kind === 'workload' ? 'Attachment chain' : 'Circuit detail'}
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close detail"
          className="rounded-md p-1 text-fw-bodyLight transition-colors hover:bg-fw-wash hover:text-fw-heading"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      {selection.kind === 'workload' ? (() => {
        const chain = attachmentChain(cc, selection.cloudId, selection.regionId, selection.vpcId);
        if (!chain) return <p className="text-figma-sm text-fw-bodyLight">Workload not found.</p>;
        const ramp = chain.candidateOnrampId
          ? (cc as unknown as { onramps: { id: string; name: string }[] }).onramps.find(o => o.id === chain.candidateOnrampId)
          : undefined;
        return (
          <div>
            <Hop title={chain.workload.name} sub={`${chain.workload.cidr} · ${chain.workload.role}`}>
              <div className="mt-1 text-[11px] text-fw-bodyLight">
                {chain.workload.endpoints.enis} endpoints · {chain.workload.endpoints.serviceEndpoints.join(', ') || 'no service endpoints'}
              </div>
            </Hop>
            {chain.gateways.map(g => (
              <div key={g.id}>
                <Down />
                <Hop title={g.name} sub={g.type} />
              </div>
            ))}
            <Down />
            {chain.circuit ? (
              <>
                <Hop title={chain.circuit.name} sub={`${chain.circuit.type} · ${chain.circuit.site} · ${chain.circuit.bandwidth}`}>
                  <div className="mt-1 space-y-0.5 text-[11px] text-fw-bodyLight">
                    <div>{`VLAN ${chain.circuit.vlan}`}</div>
                    <div>{`BGP ${chain.circuit.bgp.customerAsn} ↔ ${chain.circuit.bgp.providerAsn}`}</div>
                  </div>
                </Hop>
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-fw-success bg-fw-successLight px-2 py-0.5 text-[11px] font-medium text-fw-success">
                  <Link2 size={12} aria-hidden="true" />
                  {`Private path · ${chain.path.latencyMs} ms`}
                </div>
              </>
            ) : (
              <>
                <Hop title="Public internet" sub={chain.internet?.egressNote} />
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-fw-secondary bg-fw-wash px-2 py-0.5 text-[11px] font-medium text-fw-bodyLight">
                  <Globe size={12} aria-hidden="true" />
                  {`Public path · ${chain.path.latencyMs} ms`}
                </div>
                {ramp && (
                  <button
                    type="button"
                    onClick={() => actions.activateOnramp(ramp.id)}
                    className="mt-3 inline-flex h-8 w-full items-center justify-center rounded-lg bg-fw-ctaPrimary px-3 text-figma-xs font-semibold text-white transition-colors hover:bg-fw-ctaPrimaryHover"
                  >
                    {`Attach via ${ramp.name}`}
                  </button>
                )}
              </>
            )}
          </div>
        );
      })() : (() => {
        const ramp = (cc as unknown as { onramps: { id: string; name: string; type: string; sub: string; active?: boolean; site: { name: string } }[] })
          .onramps.find(o => o.id === selection.onrampId);
        if (!ramp) return <p className="text-figma-sm text-fw-bodyLight">Circuit not found.</p>;
        const riders = workloadsOnRamp(cc, ramp.id);
        return (
          <div className="space-y-2">
            <Hop title={ramp.name} sub={`${rampShort(ramp.type)} · ${ramp.site.name} · ${bandwidthOf(ramp.sub)}`}>
              <div className="mt-1 text-[11px] text-fw-bodyLight">{ramp.active ? 'Active' : 'Not active'}</div>
            </Hop>
            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-fw-bodyLight">
                Workloads riding this circuit
              </div>
              <ul data-testid="ramp-workloads" className="space-y-1">
                {riders.map(w => (
                  <li key={w.vpc.id} className="flex items-center gap-2 rounded-lg border border-fw-secondary bg-fw-base px-3 py-1.5 text-figma-sm text-fw-heading">
                    <Network size={13} className="shrink-0 text-fw-bodyLight" aria-hidden="true" />
                    {w.vpc.name}
                    <span className="ml-auto font-mono text-[11px] text-fw-bodyLight">{w.vpc.cidr}</span>
                  </li>
                ))}
                {riders.length === 0 && (
                  <li className="text-figma-sm text-fw-bodyLight">No attached workloads yet.</li>
                )}
              </ul>
            </div>
          </div>
        );
      })()}
    </aside>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/discover/ChainDrawer.test.tsx`
Expected: PASS. The attach test asserts through the engine (`attachmentChain` after click), so a pass proves the CTA is engine-real, not local state.

- [ ] **Step 5: Commit**

```bash
git add src/features/discover/ChainDrawer.tsx src/features/discover/ChainDrawer.test.tsx
git commit -m "feat(discover): chain drawer — the details, and the attach action that closes the gap"
```

---

### Task 4: AttachmentMap — the SVG map

**Files:**
- Create: `src/features/discover/AttachmentMap.tsx`
- Test: `src/features/discover/AttachmentMap.test.tsx`

**Interfaces:**
- Consumes: `buildAttachmentMapModel` (Task 1), `computeAttachmentLayout`, `NODE_H`, `SITE_W`, `WL_W` (Task 2), `ChainDrawer`, `MapSelection` (Task 3), `useCloudControl`.
- Produces: `export function AttachmentMap()` — no props; Task 5 mounts it.

- [ ] **Step 1: Write the failing tests**

```tsx
// src/features/discover/AttachmentMap.test.tsx
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { CC } from '../../engine';
import { buildAttachmentMapModel } from './attachmentModel';
import { AttachmentMap } from './AttachmentMap';

afterEach(cleanup);

describe('AttachmentMap', () => {
  it('renders a button per AWS/Azure workload and per site', () => {
    render(<AttachmentMap />);
    const model = buildAttachmentMapModel(CC);
    for (const g of model.groups) {
      for (const r of g.regions) {
        for (const w of r.workloads) {
          expect(screen.getByRole('button', { name: new RegExp(w.vpc.name) })).toBeInTheDocument();
        }
      }
    }
    for (const s of model.sites) {
      expect(screen.getByRole('button', { name: new RegExp(s.name) })).toBeInTheDocument();
    }
  });

  it('clicking a workload opens the chain drawer with its details', () => {
    render(<AttachmentMap />);
    const model = buildAttachmentMapModel(CC);
    const first = model.groups[0].regions[0].workloads[0];
    fireEvent.click(screen.getByRole('button', { name: new RegExp(first.vpc.name) }));
    const drawer = screen.getByTestId('chain-drawer');
    expect(within(drawer).getByText(first.vpc.cidr, { exact: false })).toBeInTheDocument();
  });

  it('unattached workloads ride dashed public edges; attached ride solid', () => {
    render(<AttachmentMap />);
    const dashed = document.querySelectorAll('[data-edge="public"]');
    const solid = document.querySelectorAll('[data-edge="private"]');
    const model = buildAttachmentMapModel(CC);
    const all = model.groups.flatMap(g => g.regions.flatMap(r => r.workloads));
    expect(dashed.length).toBe(all.filter(w => !w.vpc.attached).length);
    expect(solid.length).toBe(all.filter(w => w.vpc.attached).length);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/discover/AttachmentMap.test.tsx`
Expected: FAIL — `Cannot find module './AttachmentMap'`

- [ ] **Step 3: Implement the map**

```tsx
// src/features/discover/AttachmentMap.tsx
import { useState } from 'react';
import { Globe } from 'lucide-react';
import { useCloudControl } from '../../engine/react/useCloudControl';
import { ProviderLogo } from '../../components/brand/ProviderLogo';
import { buildAttachmentMapModel } from './attachmentModel';
import { computeAttachmentLayout, NODE_H, SITE_W, WL_W } from './attachmentLayout';
import { ChainDrawer, type MapSelection } from './ChainDrawer';

/**
 * The Attachment Map — the second lens on Discover. Four bands: sites →
 * AT&T fabric → regions → workloads, FabricHero idiom throughout: fixed
 * deterministic coordinates, every node a real <button> in a foreignObject,
 * cobalt solid = private path, slate dashed = public. Selection is local to
 * the map (the tree's selection set is a different act and stays untouched).
 */

const HEX = {
  cobalt: '#0057b8',
  slate: '#94a3b8',
  band: '#eef4fb',
  bandStroke: '#c7ddf5',
  line: '#dcdfe3',
} as const;

export function AttachmentMap() {
  const cc = useCloudControl(c => c);
  const model = buildAttachmentMapModel(cc);
  const layout = computeAttachmentLayout(model);
  const [sel, setSel] = useState<MapSelection | null>(null);

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start" data-testid="attachment-map">
      <div className="min-w-0 flex-1 overflow-x-auto rounded-2xl border border-fw-secondary bg-fw-base p-3">
        <svg
          viewBox={`0 0 ${layout.viewW} ${layout.viewH}`}
          className="min-w-[860px]"
          role="group"
          aria-label="Attachment map: workloads and their paths to the AT&T network"
        >
          {/* fabric band */}
          <rect
            x={layout.fabric.x} y={layout.fabric.y} width={layout.fabric.w} height={layout.fabric.h}
            rx={14} fill={HEX.band} stroke={HEX.bandStroke}
          />
          <text
            x={layout.fabric.x + layout.fabric.w / 2} y={layout.fabric.y + 18}
            textAnchor="middle" fontSize={11} fontWeight={600} fill="#1d2329"
          >
            AT&amp;T fabric
          </text>

          {/* site edges + nodes */}
          {layout.sites.map(s => (
            <g key={s.id}>
              <line x1={s.edge.from.x} y1={s.edge.from.y} x2={s.edge.to.x} y2={s.edge.to.y} stroke={HEX.line} strokeWidth={1.5} />
              <foreignObject x={s.x} y={s.y - NODE_H / 2} width={SITE_W} height={NODE_H}>
                <button
                  type="button"
                  className="h-full w-full truncate rounded-lg border border-fw-secondary bg-fw-base px-2 text-left text-[11px] font-medium text-fw-heading transition-colors hover:bg-fw-wash"
                  onClick={() => {
                    const branch = model.sites.find(b => b.id === s.id);
                    if (branch?.onrampId) setSel({ kind: 'onramp', onrampId: branch.onrampId });
                  }}
                >
                  {s.name}
                  <span className="block text-[10px] font-normal text-fw-bodyLight">{s.city}</span>
                </button>
              </foreignObject>
            </g>
          ))}

          {/* workload edges (under nodes) */}
          {layout.workloads.map(w => (
            <g key={`e-${w.wl.vpc.id}`}>
              <path
                data-edge={w.attached ? 'private' : 'public'}
                d={`M ${w.edge.from.x} ${w.edge.from.y} L ${w.edge.to.x} ${w.edge.to.y}`}
                fill="none"
                stroke={w.attached ? HEX.cobalt : HEX.slate}
                strokeWidth={w.attached ? 2 : 1.5}
                strokeDasharray={w.edge.dashed ? '5 4' : undefined}
              />
              {w.edge.viaShort && (
                <text
                  x={(w.edge.from.x + w.edge.to.x) / 2}
                  y={(w.edge.from.y + w.edge.to.y) / 2 - 5}
                  textAnchor="middle" fontSize={10} fill={HEX.cobalt} fontWeight={600}
                >
                  {w.edge.viaShort}
                </text>
              )}
            </g>
          ))}

          {/* region labels */}
          {layout.workloads.filter(w => w.regionLabel).map(w => (
            <text
              key={`r-${w.wl.regionId}`}
              x={w.regionLabel!.x} y={w.regionLabel!.y - NODE_H / 2 - 4}
              fontSize={10} fontWeight={600} fill="#475569"
              textTransform="uppercase"
            >
              {`${w.regionLabel!.cloudName} · ${w.regionLabel!.regionName}`}
            </text>
          ))}

          {/* workload nodes */}
          {layout.workloads.map(w => (
            <foreignObject key={w.wl.vpc.id} x={w.x} y={w.y - NODE_H / 2} width={WL_W} height={NODE_H}>
              <button
                type="button"
                aria-pressed={sel?.kind === 'workload' && sel.vpcId === w.wl.vpc.id}
                className={`flex h-full w-full items-center gap-2 rounded-lg border px-2 text-left transition-colors ${
                  sel?.kind === 'workload' && sel.vpcId === w.wl.vpc.id
                    ? 'border-fw-ctaPrimary bg-fw-accent'
                    : 'border-fw-secondary bg-fw-base hover:bg-fw-wash'
                }`}
                onClick={() => setSel({ kind: 'workload', cloudId: w.wl.cloudId, regionId: w.wl.regionId, vpcId: w.wl.vpc.id })}
              >
                <ProviderLogo id={w.wl.cloudId} size={16} />
                <span className="min-w-0">
                  <span className="block truncate text-[11px] font-medium text-fw-heading">{w.wl.vpc.name}</span>
                  <span className="block font-mono text-[10px] text-fw-bodyLight">{w.wl.vpc.cidr}</span>
                </span>
                {w.ai && (
                  <span className="ml-auto shrink-0 rounded-full border border-fw-primary/30 bg-fw-accent px-1.5 py-px text-[9px] font-medium text-fw-primary">
                    AI
                  </span>
                )}
              </button>
            </foreignObject>
          ))}

          {/* internet node */}
          <foreignObject x={layout.internet.x - 70} y={layout.internet.y - 16} width={140} height={32}>
            <div className="flex h-full items-center justify-center gap-1.5 rounded-full border border-fw-secondary bg-fw-wash text-[11px] font-medium text-fw-bodyLight">
              <Globe size={12} aria-hidden="true" /> Public internet
            </div>
          </foreignObject>
        </svg>

        {/* legend */}
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-fw-secondary pt-2 text-[11px] text-fw-bodyLight">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-5 rounded" style={{ background: HEX.cobalt }} /> private · on the fabric
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0 w-5 border-t-2 border-dashed" style={{ borderColor: HEX.slate }} /> public internet
          </span>
        </div>
      </div>

      {sel && <ChainDrawer selection={sel} onClose={() => setSel(null)} />}
    </div>
  );
}
```

Check `ProviderLogo`'s actual props before using (`src/components/brand/ProviderLogo.tsx`) — if its prop is `cloudId` or `provider` rather than `id`, or `size` is a class not a number, match its real signature. Same for SVG `<text textTransform>`: if TypeScript rejects it, use `style={{ textTransform: 'uppercase' }}`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/discover/AttachmentMap.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/discover/AttachmentMap.tsx src/features/discover/AttachmentMap.test.tsx
git commit -m "feat(discover): the attachment map — workloads, and the paths they actually ride"
```

---

### Task 5: Tree | Map toggle in UnifiedDiscovery

**Files:**
- Modify: `src/features/discover/UnifiedDiscovery.tsx` (state near line ~391 `wizardOpen`; render near line ~521 "Tree controls")
- Test: `src/features/discover/UnifiedDiscovery.viewToggle.test.tsx` (new file — keep the existing big test file untouched)

**Interfaces:**
- Consumes: `AttachmentMap` (Task 4).
- Produces: the user-facing toggle; no exports.

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/discover/UnifiedDiscovery.viewToggle.test.tsx
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UnifiedDiscovery } from './UnifiedDiscovery';

afterEach(cleanup);

const renderUD = () =>
  render(<MemoryRouter initialEntries={['/discover']}><UnifiedDiscovery /></MemoryRouter>);

describe('UnifiedDiscovery view toggle', () => {
  it('defaults to the tree, with the toggle stating both views', () => {
    renderUD();
    expect(screen.getByRole('button', { name: 'Tree view', pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Map view', pressed: false })).toBeInTheDocument();
    expect(screen.queryByTestId('attachment-map')).not.toBeInTheDocument();
  });

  it('Map swaps the tree for the attachment map, and back', () => {
    renderUD();
    fireEvent.click(screen.getByRole('button', { name: 'Map view' }));
    expect(screen.getByTestId('attachment-map')).toBeInTheDocument();
    // the tree's cloud rows are gone while the map is up
    expect(screen.queryByRole('button', { name: 'CoreWeave' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tree view' }));
    expect(screen.queryByTestId('attachment-map')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'CoreWeave' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/discover/UnifiedDiscovery.viewToggle.test.tsx`
Expected: FAIL — no button named "Tree view"

- [ ] **Step 3: Implement the toggle**

In `UnifiedDiscovery.tsx`:

1. Add the import: `import { AttachmentMap } from './AttachmentMap';`
2. Add state beside `wizardOpen` (~line 391): `const [view, setView] = useState<'tree' | 'map'>('tree');`
3. In the "Tree controls" row (~line 521, the `flex items-center justify-between` div), insert a segmented control as the FIRST child, and only show `openSummary`/Expand/Collapse when `view === 'tree'`:

```tsx
<div className="flex items-center justify-between">
  <div className="flex items-center gap-3">
    <div
      role="group"
      aria-label="Estate view"
      className="flex items-center gap-0.5 rounded-lg border border-fw-secondary bg-fw-wash p-0.5"
    >
      {([['tree', 'Tree view', 'Tree'], ['map', 'Map view', 'Map']] as const).map(([v, name, label]) => (
        <button
          key={v}
          type="button"
          aria-label={name}
          aria-pressed={view === v}
          onClick={() => setView(v)}
          className={`h-6 rounded-md px-2.5 text-figma-xs font-medium transition-colors ${
            view === v ? 'bg-fw-base text-fw-heading shadow-sm' : 'text-fw-bodyLight hover:text-fw-heading'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
    {view === 'tree' && (
      <span className="text-[11px] uppercase tracking-wide text-fw-bodyLight">{openSummary(open)}</span>
    )}
  </div>
  {view === 'tree' && (
    <div className="flex items-center gap-1.5">
      {/* existing Expand all / Collapse all buttons, unchanged */}
    </div>
  )}
</div>
```

4. Wrap the existing cloud-tree block (`<div className="space-y-2.5">…`) in `{view === 'tree' && ( … )}` and add `{view === 'map' && <AttachmentMap />}` beside it.

Do not touch the selection-set logic, the wizard, or the estate header.

- [ ] **Step 4: Run the toggle test AND the existing discover suites**

Run: `npx vitest run src/features/discover/`
Expected: ALL PASS — the new toggle tests and every pre-existing discover test (the tree is untouched in tree view, so nothing should move).

- [ ] **Step 5: Commit**

```bash
git add src/features/discover/UnifiedDiscovery.tsx src/features/discover/UnifiedDiscovery.viewToggle.test.tsx
git commit -m "feat(discover): Tree | Map — two lenses on one estate"
```

---

### Task 6: Full verification

**Files:** none new.

- [ ] **Step 1: Full unit suite**

Run: `npx vitest run`
Expected: ALL PASS, including `src/__tests__/rebrand.test.ts` and every feature suite. If a non-discover test fails, the engine singleton was left mutated — find the test missing its `CC.undo()` restore and fix it.

- [ ] **Step 2: Types + production build**

Run: `npm run build`
Expected: `tsc --noEmit` clean, vite build succeeds.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: clean (`--max-warnings 0`).

- [ ] **Step 4: Commit anything the verification pass touched**

```bash
git status --short   # only commit if fixes were needed
```

- [ ] **Step 5: In-session browser verification (performed by the orchestrating session, not a subagent)**

Start the dev server via the launch config / preview tooling, open `/discover`, and walk the flow as a user: toggle to Map, click an attached workload (drawer shows circuit/VLAN/ASNs), click an unattached workload, press "Attach via …", watch the edge turn solid AND toggle back to Tree to confirm the same workload's chip now reads Private. Screenshot as evidence.
