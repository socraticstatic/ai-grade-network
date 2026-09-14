# Connection Hubs — Information Architecture Re-spec

**Status:** Spec / not yet implemented
**Date:** 2026-06-26
**Owner:** Micah Boswell (Experience Lead, DNI)
**Decision record:** Wizard creates the Hub (name optional) and can also add a connection into an existing Hub · Group by connection type · Ship as one big-bang branch.

> **This is a stakeholder demo mock.** No backend, no real auth, no wire API. State is Zustand + localStorage; data is `src/data/sample*.ts`. Optimize for how it *looks and demos*. Rename and restructure freely — there are no production records to migrate and nothing operational to break.

> ## ⛔ TERMINOLOGY — NON-NEGOTIABLE
> **The word "Gateway" is eliminated.** The entity is a **Connection Hub** ("Hub" for short). This is total — it applies to UI text, routes, type/interface names, field names, function names, file names, CSS/icon names, tests, and sample data IDs. After this work, `grep -ri "gateway" src/` returns **only** the carve-out below.
>
> Concretely: `Gateway`→`ConnectionHub`; `gatewayIds`→`hubIds`; `getGateway*`→`getHub*`; `GatewayCard/GatewayTable/GatewayDetailPage/GatewaySection/GatewayModal/gatewayCardFields`→`Hub*`/`hub*`; `gatewaySlice`→`hubSlice`; route `/gateways/:id`→`/hubs/:id`; the `ConnectionType` union value **`'Gateway Test'`→`'Connection Hub Test'`** (or removed — see §3d); sample IDs `router-*`/`gw-*`→`hub-*`; RBAC `gateway:*`→`hub:*`.
>
> **Only carve-out — third-party product names we don't own** (the connection-builder skill mandates provider-native language): **Azure VPN Gateway**, **AWS Transit Gateway** / **Direct Connect Gateway**, **Oracle DRG (Dynamic Routing Gateway)**. These literal strings stay in provider-context copy. A blind global find/replace would corrupt them into "Azure VPN Connection Hub" — so the sweep is scripted to skip provider-product strings, not run naïvely.

---

## 0. Ruthless re-assessment — what's spine vs gold-plating

This is a **demo mock**. The pitch lives or dies on three screens. Everything is ranked against that.

**Demo-critical spine (build this, it's the actual ask):**
1. Connection Hub = a real container holding connections of mixed types.
2. **Per-type grouped tables on the Hub detail** — the literal request ("separate tables in one Hub for different connection types").
3. `HubCompositionChips` ("3 VPN · 2 C2C") on the Hub list + detail.
4. Wizard: create-new-Hub (name optional) **or** add-to-existing.
5. The showcase sample Hub (3 VPN + 2 C2C, mixed providers) — without it, nothing renders.
6. The total Gateway→Connection Hub rename + grep gate.

**CUT — RBAC.** Display-only, not the pitch. Collapsed to a label rename (§5c), folded into the sweep. No tier work.

**Deferrable / gold-plating for a mock (ranked worst value-per-effort first):**
- **StandardReports 16/17 redesign (§5b)** — deep report internals, rarely demoed live.
- **`Link.connectionId` attribution + Links-tab grouping** — only matters if someone drills into the Links tab of a multi-connection Hub. The tab can stay Hub-flat for the demo.
- **Monitor per-type metric breakdown** — nice, not pivotal.
- **Topology type-coloring** — the topology already renders N connections; coloring is polish.

**Corrections to my own earlier drafts (defects found on re-read):**
- **Killed the transitional `Gateway` alias** — it contradicted the grep gate. Can't keep the word and ban the word.
- **Over-modeled "disparate columns."** Most §3d provider attributes (OCID, pairing/service keys, account IDs, VLANs) are **detail-pane fields, never table columns**. Real per-type column delta is ~1–2 fields. The `providerColumns`/hoisting machinery largely evaporates; the registry may collapse to 5 inline arrays. See §3 "what is NOT a column."
- **Monitor OverviewTab is a PRE-EXISTING bug, not a regression** — `r.connectionId` never existed on the router type, so that count reads 0 today. Opportunistic fix, not a rename obligation.
- **Verified (not assumed):** `getGateway*` utils exist (`connectionFacts.ts`), `GatewayCard.tsx:290` `connectionIds?.[0]` is real (latent — only wrong once a Hub holds >1 connection; a one-liner, not a tentpole).

**The one call worth re-litigating: big-bang.** A ~130-file rename + restructure + nested RBAC + new components in a single branch has **no working checkpoint**. "tsc green at each commit" (§8) is aspirational, not guaranteed. If it breaks the day before the demo, the whole app is dark. **Restructure-first** (build Hub detail + grouped tables behind existing data, rename second) keeps a runnable app the entire way. You chose big-bang; for a demo I'd push restructure-first once, then defer to you.

---

## 1. The problem

"Gateways" is being renamed to **Connection Hubs**, but the rename is the small half. The real change is structural:

A Connection Hub holds **multiple connections of different types** — e.g. *3 VPN to Cloud + 2 Cloud to Cloud* — and each connection type carries **disparate attributes**. AWS Internet-to-Cloud shows VIF type and Account ID. Azure shows Service Key and SKU. Google shows Pairing Key and edge-availability domain. Oracle shows OCID and DRG. Cloud-to-Cloud has no single bandwidth — it has per-leg bandwidth across a source→destination pair. A VPN connection has a tunnel type, encryption, peer IP, and no provider interconnect product at all.

A single flat table or a single card cannot represent that. Today's `GatewayTable` flattens every connection into the same seven columns and throws the type-specific attributes away.

**Two findings frame the work:**

1. The data model already allows 1-to-many. `Gateway.connectionIds: string[]` and `Connection.gatewayIds: string[]` are many-to-many. But the wizard creates exactly **one gateway per one connection** every time (`buildGatewayForNewConnection` in `src/utils/wizardConnection.ts`), so in practice a "gateway" is a per-connection wrapper. The container exists in the schema and is unused in the product.

2. The disparate-columns problem is real and provider-driven. The connection-type × provider matrix (`src/data/providerConnectionTypes.ts`, `providerCredentialFields.ts`, `providerBandwidth.ts`, `providerResiliency.ts`) produces structurally different attribute sets. Flattening them is lossy.

So the spec does two things at once: make the Hub a genuine 1-to-many container, and render its heterogeneous contents as **grouped, type-specific tables** driven by a column-schema registry.

---

## 2. Target information architecture

```
Connection Hub  (the container — renamed from Gateway)
├── composition summary: "3 VPN · 2 Cloud-to-Cloud"  (type breakdown)
├── aggregate bandwidth, peak util, SLA, provider-logo union
│
├── Group: "Internet to Cloud"   → ConnectionTypeTable (schema: internet-to-cloud)
├── Group: "Cloud to Cloud"      → ConnectionTypeTable (schema: cloud-to-cloud, leg-aware)
├── Group: "VPN to Cloud"        → ConnectionTypeTable (schema: vpn-to-cloud)
├── Group: "DataCenter/CoLo to Cloud" → ConnectionTypeTable (schema: dc-to-cloud)
└── Group: "Site to Cloud"       → (coming soon)
```

- **Primary grouping axis: connection type.** One table per type present in the Hub. A type group with zero connections is not rendered.
- **Provider lives inside each type table.** If a type group is provider-homogeneous (all 3 VPNs are AWS), provider-specific columns are hoisted into the table header. If the group spans multiple providers, render a `Provider` badge column plus an expandable detail row carrying that provider's specific attributes. This keeps each type table coherent without inventing a ragged column set.
- **Cloud-to-Cloud is leg-aware.** A C2C row renders its `legs[]` as a `Source ⇄ Destination` cell with per-leg bandwidth/status on expand, not as a single bandwidth value.

---

## 3. The column-schema registry (core new abstraction)

This is the piece that makes the system scale as new connection types and providers are added. A single registry defines, per connection type, which columns its table renders — common columns, type-specific columns, and provider-specific columns.

New file: `src/data/connectionTableSchemas.tsx`

```ts
import type { ReactNode } from 'react';
import type { Connection, ConnectionType, CloudProvider } from '../types/connection';

export interface ColumnDef {
  id: string;
  label: string;
  accessor: (conn: Connection) => ReactNode;
  width?: string;
  align?: 'left' | 'right' | 'center';
  /** Only shown when the group is homogeneous for the dimension that owns it. */
  hoistWhenHomogeneous?: boolean;
}

export interface ConnectionTypeTableSchema {
  type: ConnectionType;
  label: string;            // group heading, e.g. "VPN to Cloud"
  icon: string;             // AttIcon name
  /** Columns shared by every type. */
  commonColumns: ColumnDef[];
  /** Columns specific to this connection type, all providers. */
  typeColumns: ColumnDef[];
  /** Provider-specific columns, hoisted only when the group is single-provider. */
  providerColumns: Partial<Record<CloudProvider, ColumnDef[]>>;
  /** Renderer for the per-row expandable detail (provider attrs when mixed-provider). */
  rowDetail?: (conn: Connection) => ReactNode;
}
```

### Common columns (every type)

| id | label | source |
|---|---|---|
| `name` | Name | `connection.name` → links to `/connections/:id` |
| `status` | Status | `connection.status` badge |
| `providers` | Provider(s) | `getHubProviders` (renamed from `getGatewayProviders`) → logo set |
| `resiliency` | Resiliency | `connection.resiliencyTier` (Local/Geo/Max) |
| `peakUtil` | Peak Util | `getHubPeakUtilization` (renamed from `getGatewayPeakUtilization`) |
| `sla` | SLA (mo) | `getHubSla` (renamed from `getGatewaySla`) |
| `actions` | — | overflow menu |

### Type-specific columns (summary — full inventory in §3d)

The exact field keys come from `Connection.configuration` as written by `AdvancedSettings.tsx`, the `LMCC*` types, and the network-designer node/edge types. Summarized:

**Internet to Cloud** — `bandwidth`, `configuration.ddosProtection`, `configuration.serviceAccessType`, `configuration.vifType`. Provider overlay: AWS `vifType`+account creds (LMCC when resiliency=Max); Azure `azureSku`+`expressRouteCircuitKey`; Google `gcpInterconnectType`+`gcpPairingKey`; Oracle `oracleOcid`/`oracleCompartmentId`/`oracleDrgId`.

**Cloud to Cloud** — `legs[]` (per-leg provider/location/bandwidth/status — leg-aware cell), `configuration.peeringType`, `configuration.encryptionMode`, `configuration.routeExchange`.

**VPN to Cloud** — `security.ipSecEnabled`, `configuration.tunnelProtocol` (ipsec/gre/vxlan), `performance.tunnels`, peer IPs. No interconnect product → no VIF/circuit/pairing-key/OCID columns.

**DataCenter/CoLocation to Cloud** — `features.dedicatedConnection` (Dedicated, not Hosted), `facility`/`facilityCode`, cross-connect, optics. Colo provider creds (Equinix/CoreSite/Digital Realty/Centersquare/DataBank/Cisco Jasper) differ from cloud creds.

**Site to Cloud** (disabled) — SD-WAN: `sdwanRole`, `tunnelProtocol`, `appSteering`, `wanOptimization`, vendor.

**Internet Direct** / **Gateway Test** — minimal/diagnostic; see §3d.

A new connection type or provider attribute is added by editing this one registry file + §3d's matrix. No table component changes.

---

## 3d. Connection-type attribute inventory (code-grounded)

Sourced by reading `types/connection.ts` (`Connection`, `Link`, `ConnectionLegConfig`), `types/lmcc.ts`, `types/vnf.ts`, `types/network-designer-types.ts`, `data/providerCredentialFields.ts`, and `wizard/screens/AdvancedSettings.tsx` (the screen that gates every `configuration.*` field by provider + type). Field names below are the **actual keys**, not invented.

### A. Attributes common to EVERY connection (`Connection` fields)
Render-once, identical across types — these are the `commonColumns` and the Hub-overview facts:
- **Identity/placement:** `id`, `name`, `type`, `status` (Active/Inactive/Pending/Provisioning/Deleted), `location`/`locations[]`, `datacenters[]`, `pool`/`poolName`, `hubIds` (was `gatewayIds`), `createdAt`, `origin` (manual / aws-marketplace / azure-marketplace / gcp-marketplace).
- **Capacity:** `bandwidth`, `linkCount`, `primaryIPE`/`secondaryIPE`/`ipeRedundancy`.
- **Health/perf:** `health{overall, throughputStatus, configurationStatus, lastChecked}`, `performance{latency, packetLoss, uptime, throughput, tunnels, bandwidthUtilization, currentUsage, utilizationTrend[], downtimeEvents[]}`, `alerts[]`.
- **Features:** `features{dedicatedConnection, redundantPath, autoScaling, loadBalancing}`.
- **Security:** `security{encryption, firewall, ddosProtection, ipSecEnabled}`.
- **Billing:** `billing{baseFee, usage, total, currency, lastBill, nextBill, additionalServices[]}`.

### B. Configuration fields common to the cloud/colo types (`configuration.*`, from AdvancedSettings)
Shared by Internet-to-Cloud, Cloud-to-Cloud, and DataCenter-to-Cloud (network + BGP blocks):
`internetSubnets[]`, `stackType` (ipv4/ipv6/dual), `qosClassifier` (best-effort/out-of-contract), `peerAsn` (public/private/global) + `peerAsnRange`, `bgpAuthKey`, `mtuSize`/`l3mtu`, `customerSubnet`, `providerSubnet`, `localPreference`, `prefixLimit`, `communityString`, `routeFilter` (PERMIT_ALL/CUSTOMER_ONLY/CUSTOM), `bfdEnabled`, `serviceAccessType` (internet/l3vmp/restricted), `ddosProtection`, `advancedMonitoring`.

### C. Per-type UNIQUE attributes

| Type | Unique attributes (field key → meaning) | Provider/credential overlay |
|---|---|---|
| **Internet to Cloud** | `vifType` (internet/L3VPN/private/3rd-party-internet/ethernet — drives MTU 1500/9001/8500); declared features: dedicated bandwidth, DDoS, auto-scaling, 24/7 monitoring. **AWS+Max ⇒ LMCC** (see row below). | AWS: Account ID, Access Key, Secret, Region · Azure: `azureSku` (local/standard/premium), `azureSubscriptionId`, `expressRouteCircuitKey`, Tenant/Client/Secret · Google: `gcpInterconnectType` (dedicated/partner), `gcpPairingKey`, Project ID, SA Key · Oracle: `oracleOcid`, `oracleCompartmentId`, `oracleDrgId`, Tenancy OCID |
| **Cloud to Cloud** | `legs[]` = per-destination `{provider, location, bandwidth, status}` (the heterogeneity *within one row*); `peeringType` (private/direct/exchange); `encryptionMode` (ipsec/macsec/none); `routeExchange` (full/partial/default); `providers[]` (2+). | Credentials per leg-provider. Provider context: AWS Transit VIF · Azure Global Reach · Google multi VLAN-attachment · Oracle multi virtual-circuit. |
| **DataCenter/CoLocation to Cloud** | `features.dedicatedConnection=true` (Dedicated, not Hosted); `facility`/`facilityCode`; cross-connect info; LOA-CFA; optics (LR/LR4); Layer-2/Layer-3 option; dedicated fiber path. | Colo creds differ: Equinix (Client ID/Secret/Metro) · CoreSite/Digital Realty/Centersquare/DataBank (Portal Account/Site Access/Cross-Connect) · Cisco Jasper (Account/API Key/Org ID). Plus the same cloud BGP block. |
| **VPN to Cloud** | `security.ipSecEnabled=true`; `tunnelProtocol` (ipsec/gre/vxlan/proprietary); `performance.tunnels` (active count); peer IPs; split-tunnel; redundant endpoints; policy-based routing. **No** VIF/circuit/pairing-key/OCID. | Uses each cloud's *VPN* product, not its interconnect: AWS Site-to-Site VPN · Azure VPN Gateway · Google Cloud VPN · OCI Site-to-Site VPN. Provider shown as badge only. |
| **Site to Cloud** *(disabled — Coming Soon)* | SD-WAN: `sdwanRole` (edge/controller/orchestrator/gateway), `sdwanType`, `tunnelProtocol`, `appSteering` (dynamic/static/hybrid), `wanOptimization`, `trafficPolicies`; branch auto-discovery; zero-touch; automated failover. | Vendors: Versa, Cisco Viptela, VMware VeloCloud, Silver Peak, Fortinet. |
| **Internet Direct** | Direct internet egress (no cloud destination). Minimal: `bandwidth`, DDoS, subnets. Appears as an edge type + billing category. | None (no cloud provider). |
| **Gateway Test** | Diagnostic/synthetic connection used in tests and the type-icon set. Minimal — test target + last-run status. **Flag for product:** confirm whether this should surface in the Hub UI at all or stay test-only. | None. |

### D. LMCC overlay (AWS Internet-to-Cloud at Maximum resiliency) — richest attribute set
When `provider=AWS && resiliency=maximum && type='Internet to Cloud'`, the connection becomes an LMCC product with its own attributes (`types/lmcc.ts`):
- **Customer-set:** `lmccContractTerm` (trial/monthly/fixed-12/24/36), `lmccTransport` (mpls/internet), metro, bandwidthMbps, awsAccountId (12-digit).
- **4 paths** (fixed tuple), each: `ipeId` (Juniper MX-304), `datacenter`, `awsConnectionId`, `vlanId` (AWS-assigned), `bgpState` (idle→established), `physicalPort`, `status` (pending/active/warning/down), `subnet{network, attPeerIp, awsPeerIp}` (/30, auto-assigned).
- **Auto-negotiated (read-only):** `bgp{partnerASN 7018, customerASN, md5Key}`, `bfd{interval, multiplier}` (300ms/3×/900ms failover), `billing{trigger:'bgp-established', model}`, `activationKey{...}` (7-day expiry, Flow 03/04).
- **Provisioning status:** key-generated → key-accepted → negotiating → bgp-forming → live (+ degraded/disconnected operational states).

This is why LMCC connections need their own expandable detail inside the Internet-to-Cloud group — a flat row can't carry 4 paths × 7 fields.

### E. Underlying AT&T transport attributes (per edge, `NetworkEdge.config`)
Every connection rides a transport whose attributes live on the designer edge: `resilience` (single/redundant/ha/dualdiverse), `recoveryTime`, `encrypted`, `bfd`, `qosProfile` (besteffort/voice/video/critical/bulk), `fastConvergence`, `replication`, `syncType`; node `networkType` (internet/vpn/ethernet/iot/private). These feed the resiliency/transport detail, not the main type table.

### How this maps to the registry — and what is NOT a column
- **A + B** → `commonColumns` (name, status, providers, bandwidth, resiliency, peak util, SLA).
- **C (type row)** → each schema's `typeColumns` — and this is SMALL: C2C shows a legs cell (source⇄dest) instead of a single endpoint; VPN shows tunnel type + peer IP; DC shows facility/cross-connect. ~1–2 distinct columns per type, not a sprawl.
- **Credentials and IDs are NOT columns.** OCID, pairing key, service key, BGP auth key, subscription ID, account ID, VLAN IDs, /30 subnets — nobody puts these in a table column. They belong in the per-connection **detail pane**, not the grouped table. The §3d provider inventory is therefore primarily a **detail-pane spec**, not a column spec. (Corrected: an earlier draft implied a heavy `providerColumns` matrix hoisted into table headers — that over-modeled the problem. Provider rarely changes the *columns*; it changes the *detail fields*.)
- **D (LMCC)** → expandable `rowDetail` inside the Internet-to-Cloud group (4 paths × fields can't be a row).
- **E** → resiliency/transport sub-view, not the table.

This shrinks the registry: with provider attributes pushed to the detail pane, `providerColumns`/hoisting logic is mostly unneeded. The registry could even collapse to ~5 inline column arrays. Keep the registry only if the abstraction earns its ceremony; for 5 fixed types in a mock, inline arrays are defensible.

---

## 4. Component changes

### New components
- `src/components/connection/hub/HubConnectionGroups.tsx` — given a Hub, computes the type groups present and renders one `ConnectionTypeTable` per group with a collapsible group header (icon, type label, count, aggregate bandwidth).
- `src/components/connection/hub/ConnectionTypeTable.tsx` — generic table driven by a `ConnectionTypeTableSchema`. Resolves columns: common + type + (hoisted provider columns if homogeneous). Renders expandable `rowDetail` when mixed-provider.
- `src/components/connection/hub/HubCompositionChips.tsx` — the "3 VPN · 2 C2C" type-breakdown summary used in the Hub list and Hub detail header.
- `src/components/connection/hub/legCell.tsx` — the C2C `Source ⇄ Destination` leg-aware cell with per-leg expansion.

### Rewritten (behavior change, not just rename)
- `src/components/connection/gateway/GatewayTable.tsx` → `hub/HubTable.tsx`. The Hub **list** table drops per-connection columns and shows Hub-level aggregates + a Composition column (`HubCompositionChips`). The per-connection detail moves into the grouped tables.
- `src/components/pages/GatewayDetailPage.tsx` → `HubDetailPage.tsx`. The **Connections** tab swaps `ConnectionFlatListView` for `HubConnectionGroups`. All other tabs (Links, VNFs, Policies, API, Access, Billing, Versions, Logs) keep their structure; labels update.
- `src/components/gateway/card/GatewayCard.tsx` + `GatewayCardMinimized.tsx` → `hub/` equivalents. Expanded card's connection tray groups its preview by type and shows composition chips instead of a flat 3-connection list.
- `src/components/connection/gateway/GatewayCard.tsx` (network-tab container) — group its VLAN/VNF preview by the owning connection's type.

### Wizard (parenting change)
- `src/components/wizard/ConnectionWizard.tsx` + `src/utils/wizardConnection.ts`:
  - Replace `buildGatewayForNewConnection` with `buildHubForNewConnection` (name optional — auto-name from provider + type + index when blank, e.g. "AWS Hub 1").
  - Add a parenting choice. New early screen `src/components/wizard/screens/HubSelection.tsx`: **Create new Connection Hub** (default) or **Add to existing Hub** (picker listing hubs with `HubCompositionChips`, location, status).
  - `STEP_KEYS` becomes `['hub', 'type', 'provider', 'resiliency', 'locations', 'bandwidth', 'advanced', 'review']`.
  - On submit:
    - *New hub:* create Hub, `connection.hubIds = [hub.id]`, `hub.connectionIds = [connId]`.
    - *Existing hub:* no new Hub; `connection.hubIds = [selected.id]`; push `connId` into `selected.connectionIds` via `updateHub`.
  - `ReviewConfiguration.tsx` shows the target Hub (existing name or "New Hub").

---

## 5. Data model & store

### Type renames (`src/types/`)
- `gateway.ts` → `hub.ts`: `interface Gateway` → `interface ConnectionHub`. **No transitional alias** — an `export type Gateway = ConnectionHub` would directly violate the §7 grep gate (can't keep the word and forbid the word). Big-bang means the old name is gone in the same commit. (Corrected: earlier draft proposed an alias; it contradicted the acceptance gate.)
- `connection.ts`: `Connection.gatewayIds` → `hubIds`; `Link.gatewayIds` → `hubIds`; comment at line ~29 updated.
- `vnf.ts`: `VNF.gatewayIds` → `hubIds`.
- `rbac.ts`: **label rename only** — `ScopeTier` value `'gateway'`→`'hub'` (same rank), `gateway:*`→`hub:*` strings. No tier re-rank, no nesting. See §5c.
- `routingPolicy.ts`: `PolicyAppliesTo` value `'gateways'` → `'hubs'`.

### Store (`src/store/`)
- `slices/gatewaySlice.ts` → `slices/hubSlice.ts`: `gateways` → `hubs`; `addGateway/updateGateway/removeGateway/getRoutersForConnection` → `addHub/updateHub/removeHub/getHubsForConnection`.
- `useStore.ts`: persist field `gateways` → `hubs`.
- **New: `updateHub` must support adding/removing a connectionId** (used by the wizard "add to existing" path and by delete cascades).
- localStorage: just bump the persist version / clear the old `appState` key so stale `gateways` data doesn't linger. No data migrator needed — it's sample data; it reseeds.

### Sample data (`src/data/`)
- `sampleInfrastructure.ts`: `sampleRouters` → `sampleHubs`. **Add the showcase Hub**: one Hub containing 3 VPN-to-Cloud + 2 Cloud-to-Cloud connections across mixed providers, so the grouped UI and tests have real heterogeneous data to render. Existing `router-east/west/hub`, `gw-c2c-demo` renamed to `hub-*`.
- `sampleData.ts`: connection `gatewayIds` → `hubIds`.

---

## 5b. Cross-surface impact (topology · monitor · configure · detail sub-tabs · cards)

A full audit of the rest of the site. Each surface is tagged: **OK** (already N-connection-aware, rename only) · **VISUAL** (works but must show type composition) · **STRUCTURAL** (real logic/data change).

### Topology & visual views — mostly OK, two real fixes
- **`TopologyView.tsx`, `MiniTopology.tsx`, `miniTopologyBuilder.ts` — OK.** These already filter `connections.filter(c => hub.connectionIds.includes(c.id))` and flatten every connection's legs (`buildGatewayTopology`, builder ~L120). They render N connections today; the Hub model doesn't break them.
- **VISUAL gap:** the flattened cloud nodes carry no connection-type. A Hub with 8 legs shows "AWS" three times with no hint they're 3 different connection types, and the `+N more` overflow badge (`MiniTopology.tsx` ~L160) doesn't say what overflowed. Fix: add `connectionType` to `MiniNode`; color/label nodes by type; make the overflow badge break down by type.
- **STRUCTURAL bug — `src/components/connection/gateway/GatewayCard.tsx:290`:** passes `connectionId={gateway.connectionIds?.[0] ?? ''}` to the VLAN modal — hardwires "first connection is the only one." In a multi-connection Hub, VLAN context for connections 2–N is wrong. Fix: pass `hubId` and resolve connection context from the link/selection, not index 0.
- **`ResiliencyMap.tsx` — OK as-is** because it renders one connection at a time at the connection-detail level. If we ever add a Hub-level resiliency overview, it must iterate per connection (each type has its own resiliency story). Not in scope now.
- **Network designer — OK.** It's a from-scratch canvas, not a Hub browser; a Hub node with N edges is already valid. Optional: a "mixed-connection Hub" template to demo the capability.

### Monitoring — one stale-field break, two report redesigns
- **PRE-EXISTING BUG (not a regression) — `monitoring/tabs/OverviewTab.tsx:140,144`:** filters routers with `r.connectionId === connection.id`, but the Hub/router type has **no singular `connectionId`** — only `connectionIds[]` (verified: `types/gateway.ts:18`). So this count is **already `0` today**, before any rename. My change doesn't break it; it's already dead. Fix opportunistically to `r.connectionIds?.includes(connection.id)`. (VNFs on the same screen *do* have a singular `connectionId`, so the VNF count works — don't touch that one.)
- **VISUAL — `metrics/RouterMetricsView.tsx`:** CPU/memory/BGP/throughput are simulated per-router as a single blended value. Keep them Hub-level, but when `connectionIds.length > 1` add a "This Hub carries N connection types" line; optionally a per-type breakdown. A blended CPU across a VPN + a 10G Direct Connect is misleading without that label.
- **VISUAL — `components/DashboardFilters.tsx`:** router dropdown shows `name (vendor)` only. Add a composition suffix ("3 VPN · 2 C2C") so a Hub is distinguishable.
- **STRUCTURAL — `reporting/StandardReports.tsx` Reports 16 & 17:** both assume one gateway ≈ one connection type. Report 16's "Links by Provider" and capacity tiers go ambiguous for a mixed Hub; Report 17's hierarchy (`Connection → Gateway → Link → VNF`) inverts. Redesign to `Hub → Connections (by type) → Links → VNFs`, and add a Hub-composition / homogeneity column.

### Configure / RBAC — concept diagram is wrong today; tier depth is a decision
- **STRUCTURAL — `common/ConceptHierarchyDiagram.tsx`:** currently draws `Connection → Gateway → Link → VNF` and *claims containment*, but the scope model treats Connection and Gateway as siblings. The Hub model finally makes a true containment story real: **`Hub → Connection → Link → VNF`.** Rewrite the diagram nodes + the "contains"/"traffic flow" copy to match. This is the one configure change that's clearly required, not optional.
- **DECISION (see below) — scope tier depth.** Today `gateway` is a first-class scope tier, sibling to `connection` (`types/rbac.ts` `ScopeTier`, `scopeCatalog.ts`, `roleCatalog.ts`, `ScopePicker/ScopeInput/MultiScopePanel/ScopeDimensionsPanel`). RBAC here is **display-only** (mock). Two ways to land it — see §5c.
- Label-level either way: `gateway:*` permission strings → `hub:*`, `OBJECT_LABELS`/`TIER_LABELS` `gateway`→`hub`, `TenantDetailPage` feature flag `gateway`→`connection-hubs`, role descriptions.

### Detail sub-tabs & cards
- **Overview tab — OK.** Bandwidth/perf aggregate across `parentConnections` already; sensible Hub-level rollups.
- **VNFs tab — OK.** VNFs attach to the Hub via `gatewayIds`; a firewall on the Hub applies to all traffic through it. No per-type split needed.
- **STRUCTURAL — Links / VLANs tab (`LinkSection`, `LinkTable`, `VLANTable`):** links are stored on the Hub (`Gateway.links`, keyed by `gatewayId`) and carry **no connection/type reference**. To group links by connection type inside a Hub, `Link` needs an optional `connectionId` (and/or derived `connectionType`) attribution, plus a type column/group in the table. This is the only genuine data-model *addition* beyond the rename. (If we don't add it, the Links tab stays Hub-flat — acceptable for the demo, but it won't group like the Connections tab does.)
- **STRUCTURAL — Policies tab (`PoliciesTab`):** custom policies target `links/gateways/vnfs` via `appliesTo`+`targetIds`; inherited policies are protocol-context aware but not connection-type aware. To scope a policy to "the VPN connections only," add an optional `connectionType` filter. Lower priority than Links.
- **VISUAL — cards (`gateway/card/GatewayCard.tsx`, `GatewayCardMinimized.tsx`):** the expanded card computes a single `avgUtilization` across all connections and a health badge off "any connection hot" — blends disparate types misleadingly. Add the `HubCompositionChips` ("3 VPN · 2 C2C") to both, and show utilization/health with type context. Minimized card (88px) gets a small composition pill only.

### Cross-surface verdict table

| Surface | Verdict | The actual change |
|---|---|---|
| TopologyView / MiniTopology | VISUAL | type-color nodes + type-aware overflow |
| `connection/gateway/GatewayCard.tsx:290` | STRUCTURAL | drop `connectionIds[0]`; pass `hubId` |
| ResiliencyMap, Network designer | OK | rename only |
| Monitor OverviewTab | STRUCTURAL | `connectionId` → `connectionIds.includes()` |
| RouterMetricsView, DashboardFilters | VISUAL | "carries N types" label + composition in filter |
| StandardReports 16 & 17 | STRUCTURAL | Hub→Connections(by type)→Links→VNFs; composition column |
| ConceptHierarchyDiagram | STRUCTURAL | redraw as Hub→Connection→Link→VNF |
| RBAC | OK | label rename only — §5c |
| Overview tab, VNFs tab | OK | rename only |
| Links / VLAN tab | STRUCTURAL | add `Link.connectionId` attribution + type group |
| Policies tab | STRUCTURAL (lower) | optional `connectionType` policy filter |
| Hub cards (expanded + mini) | VISUAL | composition chips, type-aware metrics |

---

## 5c. DECIDED — RBAC: **label rename only, no structural change**

RBAC is display-only in the mock and not part of the pitch. It is **not a feature** here. The entire RBAC scope of this work is: rename the strings so the word "gateway" doesn't survive the grep gate. No tier re-rank, no nested scope, no catalog restructure, no `HUB_SCOPE` builder.

- **`types/rbac.ts`:** `ScopeTier` value `'gateway'` → `'hub'` (same rank, sibling to connection — unchanged structure); permission strings `gateway:*` → `hub:*`.
- **`data/scopeCatalog.ts`, `roleCatalog.ts`, `utils/rbacLabels.ts`, `MultiScopePanel.tsx`, `ScopePicker.tsx`, `ScopeInput.tsx`, `RoleCatalog.tsx`, `TenantDetailPage.tsx`:** find/replace `gateway`→`hub` in labels, keys, example paths, feature flag. Mechanical.
- **No** scope-path nesting, **no** `hubId` segment, **no** `ScopeDimensionsPanel` re-rank. (Reversed the earlier "nested" decision — not worth it for a display-only screen.)
- This is part of the label sweep (step 8), not a separate workstream.

---

## 6. Routing, nav, and labels (big-bang sweep)

### Routes (`src/App.tsx`)
- New canonical: `/hubs/:id`.
- Keep `/gateways/:id` **and** `/cloud-routers/:id` as redirects to `/hubs/:id` (preserve bookmarks; `LegacyGatewayRedirect` gains a second alias).

### Navigation labels
- `src/components/connection/ConnectionTabs.tsx:14` and `src/components/connection/tabs/ConnectionTabs.tsx:33`: tab `'Gateways'` → `'Connection Hubs'`, tab id `'gateways'` → `'hubs'`.
- `GatewaySection.tsx`: heading, "Add Gateway" → "Add Connection Hub", empty states, export toast.
- `ConnectionGrid.tsx`: search placeholder, empty state, CSV headers.

### Table column labels
- `LinkTable.tsx`, `VLANTable.tsx`, `VNFTable.tsx`, `ConnectionFlatListView.tsx`, `gatewayCardFields.tsx`: column `'Gateway'` → `'Hub'`.

### Content & help
- `src/data/glossary.ts`: rewrite the "Gateway" entry as "Connection Hub" (define it as a container of connections, note the type-grouping).
- `src/data/tourSteps.ts`: onboarding mentions of "Gateways".
- `src/data/scopeCatalog.ts`, `roleCatalog.ts`, `rbacLabels.ts`, `MultiScopePanel.tsx`, `ScopePicker.tsx`, `ScopeInput.tsx`, `ConceptHierarchyDiagram.tsx`, `TenantDetailPage.tsx`: scope/feature labels.

### Network designer
- `constants/nodeTypes.ts`, `Toolbar.tsx`, `NodeConfigPanel.tsx`, `AIRecommendationEngine.tsx`, `templates/templateDefinitions.ts`, `DefaultNetworkSetup.tsx` (`cloudRouterName` state + "Gateway name is required"): node label → "Connection Hub" / "Hub". Confirm the designer's node still represents the routing instance inside a Hub, not the Hub itself — keep that distinction in copy.

### Monitoring
- `monitoring/tabs/OverviewTab.tsx`, `DashboardFilters.tsx`, `RouterMetricsView.tsx`, `StandardReports.tsx`: Hub counts/filters/reports.

### Utils, types, and identifiers (the part the rename usually misses)
- `src/utils/connectionFacts.ts`: `getGatewayUtilization/getGatewayPeakUtilization/getGatewaySla/getGatewayProviders/getGatewayRegionCount` → `getHub*`.
- `src/types/connection.ts`: `ConnectionType` union value `'Gateway Test'` → `'Connection Hub Test'` (or remove — §3d); update `ConnectionTypeIcon`, `EdgeConfigPanel`, `CostAnalyticsWidget`, and the icon test that reference it.
- `src/store/slices/gatewaySlice.ts` → `hubSlice.ts`; `getRoutersForConnection` → `getHubsForConnection`; sample-data variable `sampleRouters` → `sampleHubs`; sample IDs `router-east/west/hub`, `gw-c2c-demo` → `hub-*`.
- `miniTopologyBuilder.ts` `buildGatewayTopology` → `buildHubTopology`; `MiniTopology` prop `router` → `hub`.
- `utils/rbacLabels.ts`, `scopeCatalog.ts` keys, `routingPolicy.ts` `'gateways'`→`'hubs'`.

### Sweep guardrail (scripted, not naïve)
The rename is run as a scripted codemod with a **provider-product allowlist** so these literals are never touched: `Azure VPN Gateway`, `Transit Gateway`, `Direct Connect Gateway`, `Dynamic Routing Gateway`, `DRG`. **Acceptance gate:** after the sweep, `grep -rin "gateway" src/` returns *only* lines containing one of those allowlisted provider-product strings — nothing else.

---

## 7. Tests

- Update existing Playwright gateway specs (the repo already has `gateways-Gateways-RouterTe-*` runs) to `/hubs/:id` and Hub labels.
- New specs:
  - Hub detail renders one table per connection type present; absent types render no table.
  - A mixed-provider type group shows the Provider column + expandable provider-attr detail; a single-provider group hoists provider columns.
  - C2C rows render leg cells with per-leg bandwidth/status.
  - Wizard "Add to existing Hub" path: new connection lands in the chosen Hub; Hub composition chips update.
  - Wizard "Create new Hub" with blank name auto-names the Hub.
- Unit: `connectionTableSchemas` resolves columns correctly for each type × homogeneity case. `updateHub` add/remove connectionId.
- **Terminology gate (CI-worthy):** `grep -rin "gateway" src/` returns only the provider-product allowlist (Azure VPN Gateway, Transit/Direct Connect Gateway, Oracle DRG). Any other hit fails the rename.

---

## 8. Work breakdown (single branch: `feat/connection-hubs-ia`)

Ordered so the app compiles and tests pass at each commit, even though it ships as one branch.

1. **Types + alias.** Rename `Gateway`→`ConnectionHub` with transitional alias; field renames (`gatewayIds`→`hubIds`); add optional `Link.connectionId` attribution (§5b Links). `tsc` green.
2. **Store + sample data.** `hubSlice`, `updateHub` connectionId add/remove, bump persist version, `sampleHubs` + the showcase Hub (3 VPN + 2 C2C, mixed providers; links attributed to their connections).
3. **Column-schema registry.** `connectionTableSchemas.tsx` with all five type schemas + provider columns. Unit-tested in isolation.
4. **Grouped tables + composition.** `ConnectionTypeTable`, `HubConnectionGroups`, `legCell`, `HubCompositionChips`.
5. **Hub detail + list + cards.** `HubDetailPage`, `HubTable`, hub cards (composition chips, type-aware metrics); wire Connections tab to `HubConnectionGroups`; group/attribute the Links tab by connection.
6. **Wizard parenting.** `HubSelection` screen, `buildHubForNewConnection`, add-to-existing submit path, review summary.
7. **Topology + monitor.** `MiniNode.connectionType` + type-aware nodes/overflow; fix `GatewayCard.tsx:290` `connectionIds[0]` bug; `OverviewTab` `connectionId`→`connectionIds.includes`; `RouterMetricsView`/`DashboardFilters` composition labels; StandardReports 16/17 `Hub→Connections(by type)→Links→VNFs` redesign.
8. **Routes + redirects + label sweep.** `/hubs/:id` canonical + legacy redirects; nav, tabs, columns, glossary, tour, designer, monitoring labels; `ConceptHierarchyDiagram` redrawn as `Hub→Connection→Link→VNF`.
9. **Verification.** Update + add Playwright/unit; run dev server; walk the real flow (create a connection into an existing Hub, see it land in the right type group; open a Hub with mixed types and confirm topology, monitor, Links, and per-connection scope all read correctly). Bump persist version so old sample data reseeds clean.

---

## 9. Watch-outs (demo correctness, not prod)

- **Mixed-provider type groups** are the layout edge case. The hoist-vs-expand rule (Section 3) must be enforced or columns go ragged on screen — exactly what a stakeholder will catch.
- **C2C double nesting.** A C2C connection is itself multi-legged; inside a type table its row expands to legs. Don't let that collide with the provider-attr expandable detail — C2C uses the leg expansion, not the provider-detail expansion.
- **Showcase Hub must exist in sample data.** The whole point only lands on screen if `sampleHubs` includes the heterogeneous Hub. Build that sample first so every screen has something real to render in the demo.
