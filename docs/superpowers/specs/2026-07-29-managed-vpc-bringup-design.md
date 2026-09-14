# Managed VPC/VNET Bringup with vSRX (feature 2 of 3)

**Date:** 2026-07-29
**Status:** Approved design, pre-plan
**Driver:** Product-owner scope: "Managed VPC / VNET bringup in AWS and Azure (with vSRX, plumbing towards cloud and plumbing towards AT&T)." Second of three sequential features. Feature 1 (Discover Attachment Map) shipped 2026-07-28. Feature 3 is the NaaS Observe rebuild (Sankey + flow-log records, per the 2026-07-29 exec stakeholder note) fed by this feature's managed VPC.

## Locked decisions

| # | Decision | Choice |
|---|---|---|
| 1 | Entry point | One flow, two doors: NaaS · Connect region panel + the Discover map's ChainDrawer. |
| 2 | Model role | New hop in the attachment chain once live. Existing attach actions unchanged. |
| 3 | Staging | Watchable staged lifecycle (5 beats), `orderCircuit` idiom generalized. |
| 4 | vSRX depth | HA pair, named interfaces, BGP sessions with state, throughput tier. |
| 5 | Fidelity | Engine-backed demo-real. Timers pace the demo; they never decide state — stage advancement is an explicit engine function tests call synchronously. |
| 6 | Provider scope | AWS + Azure. Provider-aware vocabulary everywhere (Managed VPC/TGW/private VIF vs Managed VNET/VNet peering/private peering). |

## 1. Engine — `src/engine/state-managed.ts`

New module in the `state-*.ts` chain, imported in `src/engine/index.ts` after `state-routing` (it reads `onramps`/regions and calls `CC.activateOnramp`). Follows the house style: extends `window.CC`, emits via `CC._.emit`, plain JS-in-TS matching siblings.

### Entity

```ts
interface ManagedVpc {
  id: string;                    // 'mv-' + seq
  cloudId: 'aws' | 'azure';
  regionId: string;
  name: string;                  // 'att-managed-use1' / 'att-managed-wus2'
  cidr: string;                  // deterministic: 10.255.<seq>.0/24
  tier: '500M' | '1G' | '5G';
  stage: 'create' | 'vsrx' | 'cloud-plumbing' | 'att-plumbing' | 'live';
  stages: { key: string; label: string; detail: string; done: boolean }[];
  vsrx: {
    nodes: { id: 'vsrx-0' | 'vsrx-1'; role: 'active' | 'backup'; state: 'launching' | 'up' }[];
    interfaces: { name: 'ge-0/0/0' | 'ge-0/0/1' | 'fxp0'; toward: string; state: 'down' | 'up' }[];
    bgp: { peer: 'cloud' | 'att'; label: string; state: 'idle' | 'established' }[];
    throughput: string;          // '500 Mbps' | '1 Gbps' | '5 Gbps'
  };
  onrampId: string | null;       // the serving ramp att-plumbing rides
}
```

### API

- `CC.deployManagedVpc({cloudId, regionId, tier})` → creates the record at stage `create`, pushes to `CC.managedVpcs`, emits `{type:'policy', label:'Managed VPC deploying · <name>'}`, starts the beat timer, returns the record. Refuses (returns null) if the region already has one or the cloud is not aws/azure.
- `CC.advanceManagedVpc(id)` → advances exactly one stage, mutating the record per the stage table below and emitting one event. THE state-changing function; the internal timer only calls it. Returns the record (or null).
- `CC.managedVpcFor(cloudId, regionId)` / `CC.managedVpcs`.
- Beat timer: `setTimeout` chain, ~4s per stage (`orderCircuit` precedent). Tests never wait on it — they call `advanceManagedVpc` directly.

### Stage table (what each advance does)

| From → To | Mutation | Provider vocabulary (stage detail) |
|---|---|---|
| create → vsrx | both vsrx nodes `launching` | AWS: "VPC + 2 subnets across 2 AZs" · Azure: "VNet + 2 subnets across zones" |
| vsrx → cloud-plumbing | nodes `up`; `ge-0/0/0`, `fxp0` up | "vSRX HA pair up · active/backup" |
| cloud-plumbing → att-plumbing | cloud BGP `established` | AWS: "TGW attachment + route propagation" · Azure: "VNet peering + UDRs" |
| att-plumbing → live | `ge-0/0/1` up; att BGP `established`; if the serving ramp (same resolver as the chain: `servingRamp`) is inactive, `CC.activateOnramp(onrampId)` | AWS: "Private VIF + BGP to AT&T" · Azure: "Private peering + BGP to AT&T" |
| (live) | stage `live`; all stages done; emit "Managed VPC live · <name>" | — |

The att-plumbing → live activation is the honest one-action arc: deploying into us-west-2 lights dx1 and attaches the region — the same engine effect the tree and map already render. On an already-active ramp it is a no-op (no false claim, `activateOnramp` returns false silently).

### Determinism rules

- CIDR from a module sequence counter, never random. No `Date.now`/`Math.random` anywhere.
- `advanceManagedVpc` is idempotent at `live` (returns the record unchanged).
- Undo: deployment records ARE undoable narrative — but v1 records no undo entry (precedent: `addGroup`'s comment in `state.ts:232` — deliberate; teardown is out of scope, so undo would claim a delete that doesn't exist).

## 2. Wizard — `src/features/connect/DeployManagedVpcWizard.tsx`

Modal in the `ProvisionWizard` idiom (role=dialog, step dots, fw-* palette). Steps:

1. **Region** — AWS + Azure regions without a managed VPC; pre-selected and locked when opened from the map drawer.
2. **vSRX tier** — 500M / 1G / 5G cards; HA pair stated as standard, not optional.
3. **CIDR** — the engine's suggested next block shown, editable, shape-validated (`/^10\.255\.\d{1,3}\.0\/24$/` is sufficient for the demo); copy states it must not overlap workload VPCs.
4. **Confirm** — summary with provider vocabulary ("This deploys a Managed VPC in us-west-2: vSRX HA pair, TGW attachment, private VIF to AT&T over Direct Connect · Equinix DC2").

On confirm: `deployManagedVpc(...)` and the modal swaps to a **live stage tracker**: the five stages listed, each flipping done as engine events land (subscribe via `useCloudControl`; the timer paces it). A Close button is always available — closing never cancels the deploy (state lives in the engine).

Pure logic (step validation, region eligibility, CIDR suggestion display) lives in `src/features/connect/managedVpcWizardModel.ts` for unit tests, per the `wizardModel.ts` precedent.

## 3. Two doors

- **Connect:** `RegionPanel` gains a "Managed VPC" block: none → "Deploy managed VPC" CTA opening the wizard; deploying → current stage line; live → name, tier, vSRX summary line, link to the Discover map drawer for the full chain.
- **Discover map:** `ChainDrawer`'s workload view, when the region has no managed VPC, adds a secondary action "Deploy managed VPC in <region>" opening the same wizard (region locked). When one exists, the chain shows it (below).

## 4. Chain + map integration

- `attachmentChain` (feature 1) inserts a hop between gateways and circuit when `managedVpcFor(cloudId, regionId)` is `live`: `{id, name, type: 'AT&T managed VPC · vSRX HA pair'}` — and the chain result gains `managedVpc: ManagedVpc | null` so the drawer can render detail without a second lookup.
- `ChainDrawer` renders the managed hop with its detail: nodes (active/backup), interfaces with state, both BGP sessions, tier. Not-yet-live managed VPCs do NOT appear in the chain (nothing claims what isn't up); the drawer's deploy door hides once one exists in any stage (offering a second deploy would be false).
- `AttachmentMap`: regions with a live managed VPC render a small shield marker on their fabric-side path (`buildAttachmentMapModel` regions gain `managedVpc: boolean`); clicking the region label area is out of scope — the drawer reaches the detail through any workload in the region.

## 5. Out of scope (v1)

- Flow-log emission / Observe integration (feature 3 opens with it).
- Teardown/undo of a managed VPC; editing tier/CIDR after deploy.
- Egress/latency figure changes beyond the existing `activateOnramp` effect.
- Inspection-policy entanglement with `fixes.fwInspection` / buildMap violations.
- GCP/OCI/neoclouds. Multi-managed-VPC per region.

## 6. Testing

- **Engine (`state-managed` via CC):** deploy creates a record with deterministic CIDR and correct provider stage details; five advances land `live` with all interfaces/BGP up; att-plumbing activates an inactive serving ramp (usw2/dx1) and no-ops on an active one (use1/nb1); second deploy into the same region refused; `advanceManagedVpc` idempotent at live. Isolation: vitest gives each test FILE a fresh jsdom `window.CC`, so managed records only leak between tests in the same file — order tests within a file so later assertions tolerate earlier deploys, and restore onramp activations with `CC.undo()`. No test-only reset API.
- **Wizard model:** eligibility excludes regions with any managed VPC; step gating; CIDR validation.
- **Wizard component:** walk to confirm → engine record exists; tracker reflects `advanceManagedVpc` calls.
- **Chain/drawer/map:** hop absent before live, present after; drawer renders BGP/interface detail; map shield appears; deploy door hidden once deploying.
- Full suite, `tsc --noEmit`, `npm run build` green. Browser walkthrough: deploy into us-west-2 from the Connect door, watch five beats, confirm dx1 lit + tree/map agree; open the map drawer and read the vSRX hop.
