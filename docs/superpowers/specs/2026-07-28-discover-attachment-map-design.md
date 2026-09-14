# Discover — Attachment Map (Discovery, feature 1 of 3)

**Date:** 2026-07-28
**Status:** Approved design, pre-plan
**Driver:** Product-owner scope: "Discovery — discover the endpoints off of AWS, Azure to begin with. Build a map of what workloads exist where and how they are attached to AT&T network (with details)." First of three sequential features (2: managed VPC/VNET bringup with vSRX; 3: managed-VPC → portal information flow). Each gets its own spec.

## Locked decisions

| # | Decision | Choice |
|---|---|---|
| 1 | Sequencing | Three sub-projects, sequential; this spec covers Discovery only. |
| 2 | Fidelity | Engine-backed demo-real (deterministic, no real cloud APIs, no clocks/RNG in render). Persistence = engine state. |
| 3 | Shape | Keep the drill-down tree; add a workload-grained **Attachment Map** as a second lens. |
| 4 | Approach | New map component in FabricHero's visual idiom, VPC-level nodes, attachment-chain detail drawer. Not an extension of FabricHero itself; not geographic. |
| 5 | Layout | Segmented **Tree \| Map** toggle at the top of the estate panel on `/discover`. One view at a time, full width. |
| 6 | Provider scope | Map renders AWS + Azure in v1 (the ask's "to begin with"). Tree keeps all six clouds. Band layout must generalize. |

## Current state (what this builds on)

- `src/features/discover/` — UnifiedDiscovery tree (clouds → regions → VPCs), DiscoveryWizard (simulated scan), `discoveryModel.ts` (pure derivations), `buildMap.ts` (per-VPC resource synthesis: subnets/route tables/gateways), `VpcMap.tsx` (level-4 resource map).
- `src/features/connect/FabricHero.tsx` — the visual idiom to follow: deterministic SVG, fixed coordinates, nodes as real `<button>`s in `foreignObject`, reduced-motion respected, Flywheel palette (cobalt = private/on-fabric, slate dashed = public, fw-success = resilient; no amber).
- Engine: `onramps` (id/name/type/site/targets/active), `branches` (customer sites), `fabricModel()` (sites/onramps/regions/c2c), `regionLatencyMap`/`regionLatencyPathMap` (THE latency derivation — do not introduce a second), `provisionRegion`/`activateOnramp` (the attach actions), `routeFlows()`.

## 1. Derivation layer — `attachmentModel.ts`

New pure module `src/features/discover/attachmentModel.ts`, following the `buildMap.ts` precedent: `(cc, …ids) → model`, deterministic, unit-testable, no DOM/React.

Core export: `attachmentChain(cc, cloudId, regionId, vpcId): AttachmentChain`

```ts
interface AttachmentChain {
  workload: { id; name; cidr; role; tags; vnet; ai;
              endpoints: { enis: number; serviceEndpoints: string[] } };  // from buildMap synthesis
  gateways: ChainHop[];        // AWS: DX gateway + TGW · Azure: ExpressRoute gateway + vWAN hub
  circuit: {                    // null when unattached
    onrampId; name; type;       // NetBond | Direct Connect | ExpressRoute
    site: string;               // colo facility (Equinix IAD …)
    bandwidth: string;          // parsed from onramp seed `sub`
    vlan: number;               // deterministic from stable indices
    bgp: { customerAsn: 65000; providerAsn: number };  // Azure 12076 fixed; AWS 64512 (Amazon default)
  } | null;
  path: { kind: 'private' | 'public'; latencyMs: number };  // from regionLatencyMap/regionLatencyPathMap ONLY
  internet?: { egressNote: string };  // present when unattached: the consequence, stated
}
```

Rules:
- On-ramp resolution reuses the engine's `targets` mapping (the `rampsFor` logic): the on-ramp serving the workload's region.
- VLAN ids derive from stable indices: `100 + regionIndex * 10 + vpcIndex`, where both indices are positions in the engine's seeded arrays — never hashes of mutable strings, never randomness.
- Latency and path come from `regionLatencyMap`/`regionLatencyPathMap` and nothing else. This codebase already unified latency once (`state-routing.ts` comment); this spec does not reopen it.
- Unattached workloads get a full chain terminating at an `internet` node with the public-path latency and egress consequence — the map states the gap, not just the happy path.
- Inverse lookup: `workloadsOnRamp(cc, onrampId)` — every AWS/Azure workload whose chain rides that circuit.

## 2. Map view — `AttachmentMap.tsx`

`src/features/discover/AttachmentMap.tsx`. Deterministic SVG, FabricHero idiom. Four bands left → right:

1. **Sites** — customer branches (from `branches`), first-mile labeled.
2. **AT&T fabric** — one band; on-ramps render as thin labeled edges into it (never blocks — FabricHero's point, kept).
3. **Regions** — grouped by cloud, AWS then Azure.
4. **Workloads** — VPC/VNet nodes per region, with the tree's existing badge vocabulary (AI, tags, attached).

Edges: attached workload → solid cobalt through its region to its on-ramp edge; unattached → dashed slate to an **internet** egress node (bottom right). No amber. Every node a real `<button>` (foreignObject); draw-in animation respects `prefers-reduced-motion`.

## 3. Detail drawer

Right-side drawer, opened by clicking a node:

- **Workload click** → the `AttachmentChain` rendered top-to-bottom: workload (endpoints, CIDR, tags) → gateway hops → circuit (type, colo site, bandwidth, VLAN, both ASNs) → AT&T site; path + latency stated with the path named (the `regionLatencyPathMap` discipline).
- **On-ramp click** → circuit detail + every workload riding it (`workloadsOnRamp`).
- **Unattached workload** → last hop is public internet; CTA is the existing engine-real attach action (`provisionRegion` targeting the serving on-ramp) — the same action the tree offers, so the map can close the gap it names. No new mutations.

## 4. Page integration

- Segmented **Tree \| Map** control in the `UnifiedDiscovery` header. Local `useState`, Tree default.
- Map selection state is local to the map. The tree's selection set (group membership) is a different act and stays untouched.
- The StackPanel/Assessment rail on `/discover` is unaffected.

## 5. Out of scope (v1)

- Managed VPC/VNET + vSRX bringup (feature 2, own spec).
- Managed-VPC → portal telemetry flow (feature 3, own spec).
- GCP / OCI / CoreWeave / Nebius map bands (tree still covers them).
- Any engine mutation beyond the existing `provisionRegion`/`activateOnramp`.
- Geographic rendering, pan/zoom, drag.

## 6. Testing

- **attachmentModel:** every AWS/Azure VPC yields a chain; attached chains end at an active on-ramp, unattached at internet; VLAN/ASN stable across calls; provider ASNs correct per cloud (12076 / 64512); latency equals `regionLatencyMap`'s figure and the path label matches `regionLatencyPathMap`.
- **AttachmentMap:** toggle swaps views; workload click renders VLAN/ASN/circuit details; on-ramp click lists its workloads; attach from the drawer flips the edge solid AND the tree's chip via real engine state (perform, then re-render — no local mirroring).
- Existing suites stay green, incl. `src/__tests__/rebrand.test.ts`. `tsc --noEmit` and `npm run build` clean.
