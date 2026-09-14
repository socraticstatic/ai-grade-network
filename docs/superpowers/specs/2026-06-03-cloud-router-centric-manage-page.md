# Cloud Router-Centric Manage Page

**Date:** 2026-06-03
**Status:** Approved for implementation

## Summary

Re-architect the Manage page so Cloud Router is the primary entity and Connections are children within it. The current architecture treats Connection as the atom; this inverts that hierarchy. This is a mock stakeholder demo site - data integrity and persistence are secondary to telling a clear story.

---

## 1. Data Story

### Target sample data structure

Three Cloud Routers, each owning two Connections. Six connections total.

| Router ID | Name | Location | Vendor | Connections |
|---|---|---|---|---|
| `router-east` | AT&T Core East | Ashburn, VA | Cisco | `conn-1` (Corporate Cloud Gateway, AWS, Active) + `conn-aws-pending-1` (AWS Interconnect - Last Mile, AWS, Pending) |
| `router-west` | AT&T Core West | San Jose, CA | Juniper | `conn-lmcc-1` (AWS Max - San Jose Metro, AWS, Active) + `conn-lmcc-pending` (AWS Max - Los Angeles, AWS, Pending) |
| `router-hub` | AT&T Enterprise Hub | Dallas, TX | Arista | `conn-2` (Azure ExpressRoute, Azure, Active) + `conn-3` (GCP Direct Connect, Google, Active) |

### Changes required to sample data

**`src/data/sampleInfrastructure.ts`**
- Replace 8 routers with 3: `router-east`, `router-west`, `router-hub`
- Each router has `connectionIds: [id1, id2]`
- Retain realistic performance data (latency, BGP sessions, CPU/memory usage)

**`src/data/sampleData.ts`**
- Connections `conn-1`, `conn-2`, `conn-3`, `conn-lmcc-1`, `conn-lmcc-pending`, `conn-aws-pending-1` all already exist
- Connection records need one change each: `cloudRouterIds` back-reference updated to point at the new single parent router (e.g., `conn-1.cloudRouterIds = ['router-east']`)
- No other connection fields change

### Relationship canonicalization

`CloudRouter.connectionIds` is the source of truth. `Connection.cloudRouterIds` is a derived back-reference for convenience lookups. No new type changes needed - the field already exists on both types.

---

## 2. Component Architecture

### New components

| Component | Location | Purpose |
|---|---|---|
| `CloudRouterCard` | `src/components/cloudrouter/card/CloudRouterCard.tsx` | Three-state card for grid view |
| `CloudRouterCardMinimized` | `src/components/cloudrouter/card/CloudRouterCardMinimized.tsx` | 88px minimized row (matches ConnectionCardMinimized height) |
| `ConnectionSummaryRow` | `src/components/cloudrouter/card/ConnectionSummaryRow.tsx` | Lightweight connection row inside expanded card |
| `CloudRouterGridView` | `src/components/connection/views/GridView.tsx` | Replace existing GridView; maps routers to CloudRouterCard |
| `CloudRouterListView` | `src/components/connection/views/ListView.tsx` | Replace existing ListView; grouped router+connection table |
| `CloudRouterTopologyView` | `src/components/connection/views/TopologyView.tsx` | Replace existing TopologyView; per-router topology cards |

The existing `ConnectionCard` and its sub-components (`ConnectionCardHeader`, `ConnectionCardMinimized`, `ConnectionCardMetrics`, `ConnectionCardProgress`, `ConnectionCardStatus`, `ConnectionCardAction`) are **not touched**. They remain in use on the connection detail page (`/connections/:id`). The new components are a parallel set at the router level.

### Modified components

| Component | Change |
|---|---|
| `ConnectionGrid.tsx` | Primary data loop changes from `connections[]` to `cloudRouters[]`; filter groups updated; search covers router name + child connection names |
| `MiniTopology.tsx` | Accept `CloudRouter + Connection[]` signature; render multi-connection branching topology |

---

## 3. CloudRouterCard - Three States

### State 1: Minimized (~88px)

Single row. Matches the height and density of `ConnectionCardMinimized` so a grid with mixed states is consistent.

Layout (left to right):
- Status dot (color matches router status: green=active, neutral=inactive, pulsing blue=provisioning)
- Cloud Router icon (AT&T `cloudRouter` AttIcon)
- Router name (semibold) + vendor chip (small pill, muted)
- Connection count pill ("2 connections", `bg-fw-wash border border-fw-secondary`)
- Aggregate bandwidth (e.g., "20 Gbps total")
- `ChevronRight` navigate-to-detail button (ghost icon)
- `Maximize2` expand button (ghost icon)

Minimize All / Expand All toolbar toggle controls this state vs. state 2.

### State 2: Full card, connections collapsed (default on page load)

Full height card. Connections not yet visible.

**Header section (`p-6 border-b border-fw-secondary`):**
- Row 1: Router icon (40×40 rounded-lg bg-fw-wash) + router name (text-figma-lg font-medium) + vendor chip + location label
- Row 2: Status badge + connection count pill + `Minimize2` icon button (right-aligned) + overflow menu (edit/delete)

**Metrics section (`p-6 space-y-4`):**
- `ConnectionCardProgress`-style bandwidth utilization bar: aggregate across all connections (sum of `bandwidthUtilization` across child connections / connection count)
- 2-column metrics grid (mirrors `ConnectionCardMetrics` layout):
  - Left tile: BGP Sessions (active/total from `router.performance.bgpSessions`)
  - Right tile: Location + vendor
- Health signal row: worst-case health across child connections (if any child is critical, router signals critical)

**Expand handle (bottom of card):**
- Full-width `button` with `ChevronDown` + "Show connections (2)" label
- `bg-fw-wash border-t border-fw-secondary` treatment
- On click: transitions to State 3

### State 3: Full card, connections visible

Header and metrics sections identical to State 2.

**Connection list (replaces expand handle):**
- Each child connection renders as a `ConnectionSummaryRow`
- List is scrollable if more than 4 connections (max-h with overflow-y-auto)
- Collapse handle at bottom: `ChevronUp` + "Hide connections"

**`ConnectionSummaryRow` layout:**
- Left: provider icon (12×12) + connection name (text-figma-sm font-semibold) + connection type (text-figma-xs text-fw-bodyLight)
- Center: status badge (Active/Pending/Inactive - same pill pattern as ListView)
- Right: bandwidth (tabular-nums) + latency (tabular-nums) + `ChevronRight` navigate icon
- `cursor-pointer`, full row click navigates to `/connections/:id`
- Pending/AWS connections show the same AWS/LMCC chips that `ConnectionCardHeader` currently renders, but at xs scale
- `hover:bg-fw-wash transition-colors` on each row

The `ConnectionSummaryRow` intentionally excludes: name editing, provisioning timers, minimize toggle, billing info, utilization trend sparkline. Those stay on the detail page.

---

## 4. ListView - Grouped Table

### Router header rows

Visually differentiated from connection rows: `bg-fw-wash font-semibold`, not `bg-fw-base`.

Columns: Router Name | Vendor | Location | Status | Connections | Total Bandwidth | (actions)

Router name cell includes a `ChevronDown/Up` expand toggle on the left. Click anywhere on the row expands/collapses its connection children.

Router rows are not sortable - they maintain a stable display order (matching sample data order).

### Connection child rows

Standard `bg-fw-base` rows. Left-padded with `pl-10` to create visual indentation.

Columns: Connection Name | Provider | Type | Status | Bandwidth | Resiliency | Location | (actions)

Same column visibility controls as the existing `ListView` apply to connection columns. Column visibility does not affect router header columns.

Clicking a connection row navigates to `/connections/:id`. The overflow menu per row retains Details + Delete actions.

Sort applies within each router group independently - sorting by name sorts each router's connections alphabetically without reordering the router groups themselves.

### Empty state

If a router has no connections: a single placeholder row beneath the router header row reads "No connections" in `text-fw-disabled`.

---

## 5. TopologyView - Per-Router Topology Cards

Grid of cards (same 2-col grid as current topology view). Each card = one Cloud Router.

### Card anatomy

**Header:** Router name + status dot + latency reading

**Topology diagram (`MiniTopology` updated):**

Current signature: `MiniTopology({ connection, cloudRouters?, linksCount?, vnfsCount? })`
New signature: `MiniTopology({ router: CloudRouter, connections: Connection[] })`

Rendering logic:
- Left node: AT&T Core (IPE icon, location label)
- Center node: Cloud Router (cloudRouter icon, router name, vendor sublabel)
- Right nodes: one cloud endpoint per connection, stacked vertically if multiple
  - Each endpoint: cloud icon, provider name, bandwidth sublabel, status dot
  - Active connections: solid blue line
  - Pending connections: dashed gray line
  - If > 3 connections: show first 2 endpoints + "+N more" label

The flex-based layout in `MiniTopology` already handles left→center→right ordering. The change is: instead of one hardcoded cloud1/cloud2 node pair derived from a single connection, the nodes are generated by iterating `connections[]`.

**Footer:** Aggregate bandwidth + connection count chips

---

## 6. ConnectionGrid.tsx - Container Changes

### Primary data source

```
// Before
const connections = useStore(state => state.connections);
// After
const cloudRouters = useStore(state => state.cloudRouters);
const connections = useStore(state => state.connections); // still needed for child lookups
```

### Search behavior

Search query matches on:
- Router name
- Router location
- Any child connection name, provider, or type

If a child connection matches, its parent router is included in results with that connection highlighted.

### Filter groups

Replace connection-level filter groups with router-level groups:

```
[
  { id: 'status',   label: 'Status',   options: ['active','inactive','provisioning','error'] },
  { id: 'vendor',   label: 'Vendor',   options: derived from router data },
  { id: 'location', label: 'Location', options: derived from router data },
]
```

Connection-level filters (provider, connection type) move inside the expanded connection list in the card/row - out of scope for this spec.

### Toolbar

"Minimize All / Expand All" toggle remains. Semantics change: it now controls CloudRouterCard state 1 (minimized) vs. state 2 (full, connections collapsed). State 3 (connections visible) is always per-card, never triggered by the toolbar toggle.

"Create Connection" button remains. The wizard already handles Cloud Router context selection - no change needed.

---

## 7. What Does Not Change

- `ConnectionCard` and all its sub-components - untouched
- `ConnectionDetails` page and all its tabs - untouched
- `CloudRouterDetailPage` (`/cloud-routers/:id`) - untouched
- RBAC permission checks (`usePermission`) - applied the same way
- Export CSV - now exports router+connection pairs
- Mobile view (`MobileConnectionGrid`) - out of scope for this change
- `ManageGroupsPage` - not affected

---

## 8. Known Gaps / Out of Scope

- **Creating a new Cloud Router** via the Manage page is not in scope. Routers are created elsewhere (wizard flow).
- **Editing a Cloud Router** from the card overflow menu is not in scope - existing `CloudRouterModal` handles this but wiring it into the new card is a follow-on.
- **Persisting router expanded state** across page refreshes is not implemented. State resets to all-collapsed on navigation.
- **LMCC-specific card treatments** (4-path display, AWS Max badge) are preserved in `ConnectionSummaryRow` at xs scale but not fully re-implemented at the router card level.
