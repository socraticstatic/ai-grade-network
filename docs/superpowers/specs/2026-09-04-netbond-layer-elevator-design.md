# NetBond and the AI-grade network: the layer elevator

Date: 2026-09-04
Status: design spec, for review before planning
Owner: Micah Boswell, Experience Lead, DNI
Asked by: Ramesh Prabagaran, owner of Cloud_Fabric_with_Control_MVP-v1
Judged by: the demo walk in section 10, in the two React prototypes
Repos: `~/Developer/att-netbond-sdci` (NetBond Advanced) and `~/Developer/cloud-connect` (AI-grade network)

---

## 1. The ask and the answer

Ramesh asked how to integrate the AI-grade network into NetBond.

The answer is one sentence. The name on the brand lockup is the layer you are standing on.

NetBond Advanced is the Cloud layer of the AT&T AI-grade network. It stays NetBond, keeps its name, its wizard, its Hubs, its Pools, and its RBAC. It gains one control in its header: click the lockup and the four network layers drop down. Pick another layer and you ride to the AI-grade network at that layer, with your session and tenant. Pick Cloud and you are back in NetBond.

Three data bridges make the two apps one product. NetBond connections appear as the on-ramps in the fabric picture. NetBond's supply data feeds the store's head start. The advisor's findings land in NetBond's Create wizard pre-filled, and the order flows back.

This is not a product switcher. A switcher moves between two apps. An elevator moves between floors of one building.

## 2. What we are not doing

- **Not a merge.** Two repos, two builds, two deploys. `CASE_AGAINST_PORTAL_CONVERGENCE.md` names the false economy of a single codebase, and it applies here.
- **Not a rename.** "NetBond Advanced" stays on the Cloud layer. "AI-grade network" is the building, never a product tile.
- **Not an absorb.** The AI-grade shell never hosts NetBond's routes. NetBond's IA is untouched below the header.

## 3. Vocabulary

- **Layer**: one of four rows of the network stack. Rows are layers, columns are lifecycle verbs, per spec 2026-07-23.
- **Host**: the app that renders a layer's screens. NetBond hosts Cloud. The AI-grade network hosts the rest.
- **Elevator**: the lockup menu that moves between layers. One control, same anatomy in both apps.
- **Handoff**: a small JSON record one app writes for the other. Three kinds: `estate`, `supply`, `order`.
- **Verb**: Connect, Govern, Observe, Cost. NetBond's Create, Manage, Monitor, Configure are the same verbs in older clothes.

## 4. The four layers and their hosts

Elevation order, top to bottom. AI Fabric rides on the network, so it draws on top.

| Layer | Tagline | Host | Home | Status |
|---|---|---|---|---|
| AI Fabric | The token layer | AI-grade network | `/ai/home` | Live |
| Cloud | The on-ramp layer, with control | **NetBond Advanced** | `/manage` | Live |
| Network services | The services layer | AI-grade network | `/naas/home` | Live |
| Transport and access | The physical layer | none yet | none | Vision |

The AI-grade app's top tab "NaaS" is the Network services row. Its label changes to "Network services" to match the storefront requirements. Nothing else in that app's nav moves.

Transport and access has no screens. It appears in the elevator as a dimmed row with the kicker "Vision". It never links to a page that pretends to be real.

## 5. The elevator control

### 5.1 Anatomy

The lockup in both headers becomes a button with a menu. Two lines:

- Line one, the wordmark as today. NetBond: `AT&T` in AT&T blue, then `NetBond® Advanced` in gray 900. AI-grade: `AT&T` in AT&T blue, then `AI-grade network`.
- Line two, 11px, gray 600: the layer you are on. NetBond: "Cloud on-ramp layer". AI-grade: "Network services layer" or "AI Fabric layer", read from the active top tab.

A 12px chevron sits after line one. The chevron is the only new pixel in the resting header.

### 5.2 The menu

Width 320. Header "AT&T AI-grade network · layers". Four rows in elevation order, each with the layer name, its tagline, and a check on the current row. Rows are 48px, full-width hit targets. Below a hairline, two footer links: "Discover your estate" and "See the whole stack".

| Row | From NetBond goes to | From AI-grade goes to |
|---|---|---|
| AI Fabric | AI-grade `/ai/home` | `/ai/home` |
| Cloud (check when in NetBond) | NetBond `/manage` | NetBond `/manage` |
| Network services | AI-grade `/naas/home` | `/naas/home` |
| Transport and access | dimmed, no link | dimmed, no link |
| Discover your estate | AI-grade `/discover` | `/discover` |
| See the whole stack | AI-grade `/stack` | `/stack` |

Same-verb hops carry the verb. From NetBond `/monitor`, the Network services row lands on `/naas/observe`, not `/naas/home`. Section 6 has the map.

### 5.3 Behavior

- Click or Enter opens. Escape closes. Arrow keys move, Enter selects. Focus returns to the lockup on close. `role="menu"`, `aria-label="Switch network layer"`.
- The old lockup click, which went home, moves to the check row. Clicking the current layer's row closes the menu and goes to that layer's home.
- Mobile: the drawer's brand row becomes the same menu, inline, above the nav items.
- Hover shows nothing. No tooltip, no preview. The menu is the preview.

### 5.4 What crosses on a hop

Both apps deploy under `socraticstatic.github.io`, so localStorage and the Supabase session are already shared in production. Dev runs on two ports, which are two origins. The contract must work on both, so the query string is the contract and localStorage is an enrichment.

Every cross-app link carries `?from=<netbond|agn>&tenant=<tenantId>`. The receiving app reads them on boot, sets the tenant, and strips the params from the URL. If the tenant is unknown to the receiver, it falls back to TNT-001 and shows the existing "Viewing as" banner with the tenant name it was handed.

Auth is not carried. Both apps already share the default Supabase storage key. A hop in production is a page load with the session in place. In `gate` and `off` auth modes the hop behaves the same.

### 5.5 The localStorage collision

Both apps persist their Zustand store under `appState-v3`. On the shared origin, the first hop would overwrite the other app's state. This is a defect today, before the elevator exists.

Fix, in this spec's first task: NetBond keeps `appState-v3`. The AI-grade network renames its key to `agn-state-v1`, with a one-time migration that reads `appState-v3` only if `agn-state-v1` is absent and the payload carries an AI-grade slice. Handoff records use their own keys, section 7.5.

## 6. Verb map and cross-links

### 6.1 The map

| NetBond place | Verb | AI-grade counterpart | Return |
|---|---|---|---|
| Create `/create` | Connect | `/naas/connect` | Cloud stratum in the fabric picture links to `/create` |
| Manage `/manage`, Connections | Connect | `/naas/connect` | NetBond on-ramp chip links to `/connections/:id` |
| Manage, Pools | Govern | `/naas/govern` | none |
| Manage, Insights | Observe | `/naas/observe` | none |
| Monitor `/monitor` | Observe | `/naas/observe` | Observe "Flows & paths" row with a NetBond path links to `/connections/:id` |
| Configure `/configure` | Govern | `/naas/govern` | none |
| Configure, Billing | Cost | `/naas/cost` | Cost egress bucket on a NetBond path links to `/configure?tab=billing` |
| Marketplace tab | store | storefront front door | section 8 |

The elevator uses this map to pick the landing route for a same-verb hop. `counterpartPath()` in the AI-grade app already does this between its own layers. NetBond gets the same function with this table as its data.

### 6.2 Cross-links on NetBond surfaces

Three additions, all in existing chrome, none new pages.

- **Connection detail** `/connections/:id`: two actions in the header overflow. "Observe on the fabric" goes to `/naas/observe?onramp=<id>`. "Govern this path" goes to `/naas/govern?onramp=<id>`. Hidden when the connection is Inactive, Deleting, or Deleted.
- **Manage, Insights tab**: one `MetricCard`, "Under AT&T control", showing the share of this tenant's flows on a controlled path, read from the `estate` handoff's echo (section 7.5). Click goes to `/naas/observe`.
- **Monitor**: one row above the fold, "Fabric telemetry lives one layer up", with the Observe link. Dismissable per session.

### 6.3 Cross-links on AI-grade surfaces

- **Fabric hero**: an on-ramp chip of type NetBond or NetBond Adv links to the NetBond connection detail. Chips from seed data, which have no NetBond id, stay inert.
- **Stack panel and stack deck**: the Cloud stratum links to NetBond `/create`, not `/naas/connect` as today.
- **Advisor ladders**: tiers named "NetBond attach" and "NetBond Adv" route to NetBond `/create` with the prefill contract in section 7.4. Today they route to `/naas/connect`.
- **Observe, Flows & paths**: a row whose path names a NetBond on-ramp links to that connection.

## 7. The three bridges

### 7.1 Principle

Each fact has one owner. NetBond owns connections, hubs, providers, metros, bandwidth ladders, resiliency tiers, and orders. The AI-grade network owns sites, clouds, regions, workloads, policies, flows, findings, and savings. A bridge copies facts across, it never forks them.

### 7.2 Bridge A, connections become on-ramps

NetBond writes an `estate` handoff on every store change. The AI-grade network reads it at boot and on `storage` events, and replaces the seeded `onramps[]` in the engine with mapped records.

Mapping, one on-ramp per active or provisioning NetBond connection:

| NetBond field | On-ramp field |
|---|---|
| `id` | `id`, prefixed `nb:` |
| `name` | `name` |
| `type === 'AWS Last Mile'` | `type: 'NetBond Adv'`, sub reads "Max resiliency · 4 paths" |
| any other type | `type: 'NetBond'` |
| `location` metro | `site.name`, `site.lat`, `site.lon` from the metro table |
| `provider` and cloud region | `targets` |
| `status === 'Provisioning'` | `planned: true` |
| `bandwidth` | `sub` |

Connections with no provider, such as Hub Test or Colo to Colo, do not become on-ramps. Direct Connect and ExpressRoute on-ramps that AT&T sees but does not own stay seeded, since discovery, not NetBond, is their source.

If no handoff exists, the seed stays. The demo build on the shared origin always has one.

### 7.3 Bridge B, supply feeds the head start

Two head starts exist. NetBond's counts what AT&T has: metros with on-ramps, providers reachable, Last Mile metros live, connection types orderable. The AI-grade advisor counts what AT&T sees of the customer: sites, on-net share, clouds visible.

Both survive, as two bands of one head start. The storefront front door, and the advisor's head-start card, show "What AT&T has" above "What AT&T sees of you". NetBond writes the four supply counters as a `supply` handoff at boot. The AI-grade app ships a fixture copy of the same four counters, regenerated by `scripts/pull-supply-fixture.mjs` from NetBond's data files, so dev and the standalone build never show zeros. Each counter keeps its NetBond link, so "Connection types orderable now" opens NetBond Create.

### 7.4 Bridge C, findings become orders

An advisor ladder tier that names NetBond opens NetBond's wizard pre-filled. NetBond `/create` already reads `?lmccExpress=1&mode=step-by-step`. The contract extends that.

```
/create?from=agn
       &tenant=TNT-001
       &mode=step-by-step
       &type=<ConnectionType>
       &provider=<CloudProvider>
       &resiliency=local|geo|max
       &metro=<metroId>
       &bandwidth=<label>
       &finding=<findingId>
       &headline=<urlencoded savings line>
```

Rules:

- The wizard reads the params once, on mount, then strips them. This respects the stale-prefill lesson recorded at `ConnectionWizard.tsx:144`.
- `type` is required. Without it the wizard opens at the type step with no prefill and no banner.
- Every other param is optional and prefills its step. An unknown value is ignored, never invented.
- With a `finding`, the wizard shows a banner above the stepper: kicker "Recommended by your advisor", the headline, and a link "Why" back to `/discover/advisor?finding=<id>`. The banner persists through the steps and appears on Review.
- The stepper shows from the type step onward, as it does today once a type is chosen.

On submit, NetBond writes an `order` handoff: `{ findingId, connectionId, tenantId, at }`. The advisor marks that finding "Ordered", the fabric hero shows the new on-ramp as planned, and Observe's under-control share moves when the connection goes Active. The customer sees the loop close without leaving the building.

### 7.5 Handoff records

Keys and shapes. All JSON, all versioned, all written by one app and read by the other.

| Key | Writer | Reader | Shape |
|---|---|---|---|
| `att.handoff.estate.v1` | NetBond | AI-grade | `{ tenantId, exportedAt, connections: [{ id, name, type, provider, bandwidth, location, status, resiliency }], hubs: [{ id, name, connectionIds }] }` |
| `att.handoff.supply.v1` | NetBond | AI-grade | `{ exportedAt, counters: [{ key, label, value, to }] }` |
| `att.handoff.order.v1` | NetBond | AI-grade | `{ findingId, connectionId, tenantId, at }` |
| `att.handoff.control.v1` | AI-grade | NetBond | `{ tenantId, at, underControlPct, controlledFlows, totalFlows }` |

The fourth record is the echo that feeds the Insights card in section 6.2. Readers validate the version and the tenant. A record for another tenant is ignored. A malformed record is ignored and logged. Nothing here reaches a backend.

## 8. One store, two departments

Both repos now carry a NaaS storefront. Integration keeps one.

- The AI-grade front door, spec 2026-09-03, is the store. Four departments, one per layer.
- NetBond's Marketplace tab becomes the Cloud department. It keeps its stage model, head start, findings, ladders, packages, and view-as switcher. Its Browse mode lists Cloud-layer products only.
- The Marketplace tab gains one row at the top: "This is the Cloud layer of the AT&T store" with the link "See all layers", which opens the front door with `?category=cloud`.
- The front door's Cloud department does not duplicate NetBond's per-connection offers. It links into the Marketplace tab for them.
- A finding renders in the department that owns its remedy. Single path, unprotected, unmonitored, not in a hub, month to month: Cloud, from NetBond's derivation. Unattached regions, public egress, missing inspection, latency over SLO: fabric, from the AI-grade derivation. Both use the same card shape, per addendum 01.

## 9. Brand and copy rules

- "NetBond® Advanced" appears in the lockup on the Cloud layer, in the elevator's Cloud row as "Cloud · NetBond Advanced", and in ladder tier names. Nowhere else in AI-grade display copy.
- "AI-grade network" appears in the lockup on every AI-grade layer and in the elevator header. It is never a tile, a tier, or a product in the catalog.
- The subtitle line names the layer, never the product: "Cloud on-ramp layer", "Network services layer", "AI Fabric layer".
- Never "Cloud Connect", never "Gateway", never "Cloud Router". The routing entity is "Connection Hub".
- Save, not cost. Handoff banners lead with the savings headline.
- Aleck Sans everywhere the header is drawn.

## 10. The demo walk

This is what Ramesh judges. Seven steps, one tenant, no reload that loses state.

1. Land in NetBond Manage as the Meridian estate. Connections, Pools, Insights as today. The lockup reads "Cloud on-ramp layer".
2. Open the lockup. Four layers. The check is on Cloud. Say the sentence: the name on the lockup is the layer you are standing on.
3. Ride to Network services. Observe. The Sankey's AT&T band carries flows over "NetBond · PE-IAD-02". Those are the connections from step 1, mapped by bridge A.
4. Discover your estate. The advisor scans, then finds "Save $50,400/mo by attaching 8 unattached regions". The ladder offers Steer on the AT&T fabric, NetBond attach, NetBond Adv.
5. Choose NetBond attach. The elevator drops you into NetBond Create, pre-filled, with the advisor's banner above the stepper. Walk to Review. Submit.
6. Ride back up to Observe. The new on-ramp draws as planned on the fabric picture. The finding reads Ordered. Under control moves when the connection goes Active.
7. Open Manage, Insights. The "Under AT&T control" card shows the same figure Observe showed. One building, one number.

That walk is the MVP spine. Discover in the AI-grade network, Attach in NetBond, Govern and Observe one layer up, and the order closing the loop.

## 11. What this serves in the MVP

| MVP pillar or metric | Where it lives after integration |
|---|---|
| Private reach | NetBond, the Cloud layer, reached from any finding in one hop |
| Optimal path, policy control, cost control, observability | Network services layer, reading NetBond's connections as on-ramps |
| Spine Discover, Attach, Govern, Observe | Discover and Govern and Observe in the AI-grade network, Attach in NetBond |
| Metric: attach rate on the NetBond and AVPN base | Instrumented by bridge A, counted in the S2 Fabric attach card |
| Hosted VPC per region, the anchor product | Unchanged, `/naas/connect`, reached from the Cloud stratum or the ladder |

## 12. What NetBond keeps untouched

The wizard's steps and rules, the LMCC flows, Connection Hubs and their auto-grouping, Pools, RBAC roles and scope tiers, Configure, Support, Tickets, News, the API toolbox, the visual designer. RBAC stays NetBond's. The AI-grade network reads the tenant id and nothing else about permissions.

## 13. Out of scope

Pricing engine, checkout, any backend, real telemetry, Angular parity, a unified RBAC, a shared component package, single sign-on work beyond the shared Supabase key that already exists, the Transport and access layer's screens.

## 14. Testing

- **Unit, NetBond**: verb map lookup, prefill parser for every param and every bad value, `estate` and `supply` writers, `order` writer on submit, `control` reader.
- **Unit, AI-grade**: on-ramp mapper for every connection type, handoff readers with tenant and version rejection, storage key migration, ladder routing to NetBond.
- **E2E, each repo**: the elevator opens, lists four rows, checks the current row, moves by keyboard, lands on the right route with `from` and `tenant` stripped.
- **E2E, the pair**: `scripts/serve-pair.mjs` serves both builds from one static origin at `/NetBond_Advanced/` and `/ai-grade-network/`, matching GitHub Pages, so the same-origin handoff is under test. The demo walk in section 10 runs as one Playwright spec across both apps.
- **Pixel gate**: the header changes on every frozen Figma board. Re-freeze the boards through the existing pipeline after one-board pilot and pixel-diff, per the standing rule. No bulk canvas write before that.

## 15. Build order

1. Storage key split and migration. Ships alone, first, because it fixes a live defect.
2. Elevator in both headers, query-string carry, verb map. Demo-able on its own.
3. Bridge A and the fabric hero cross-link. Step 3 of the walk works.
4. Bridge C, the prefill contract, the advisor banner, the `order` echo. Steps 4 to 6 work.
5. Bridge B and the storefront resolution. Front door shows two head-start bands, Marketplace tab gains its row.
6. Insights card and `control` echo. Step 7 works.
7. Board re-freeze.

Each step leaves both apps shippable. Any step can be the demo if the date moves.
