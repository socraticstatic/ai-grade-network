# Cloud Router Many-to-Many - Design Spec

## Problem

The current data model treats `CloudRouter` as a child of `Connection` (`CloudRouter.connectionId: string`). Reality is many-to-many: one router can serve multiple connections, one connection can span multiple routers. This is confirmed by the existing `Connection.cloudRouterCount` field (plural implies multiple) and by real-world AT&T NetBond topology.

CloudRouters are also stored as local component state in `ConnectionDetails.tsx`, making them invisible to monitoring, routing, and other global concerns.

## Solution

1. Fix the data model to many-to-many.
2. Promote CloudRouters to the global Zustand store.
3. Fix all broken downstream consumers.
4. Add router visibility to all three connection views (table, topology, grid) without changing their structure.

## Data Model Changes

**`CloudRouter`** (src/types/cloudrouter.ts):
- Remove `connectionId: string`
- Add `connectionIds: string[]`

**`Connection`** (src/types/connection.ts):
- Remove `cloudRouterCount?: number`
- Add `cloudRouterIds?: string[]`

**`VNF`** (src/types/vnf.ts):
- Remove `cloudRouterId?: string`
- Add `cloudRouterIds?: string[]`

## Architecture

A new `cloudRouterSlice` holds the global router array. `ConnectionDetails` reads from the store filtered by `router.connectionIds.includes(connection.id)`. `MonitoringContext` uses the same filter. `CloudRouterDetailPage` looks up by router ID directly from the store and shows all parent connections.

## Views

- **Table (ListView)**: Add "Cloud Routers" column showing router names. Default hidden in column visibility; user-toggleable.
- **Topology (MiniTopology)**: Accept `cloudRouters?: CloudRouter[]` array instead of `cloudRoutersCount?: number`. Derive count and labels from real data.
- **Grid (ConnectionCard)**: Show router count inline in the card metrics row.

## Out of Scope

- "Group by Router" toggle in the table
- Router cards view replacing the grid
- "By Router" as default view
- Per-connection telemetry scoping in monitoring
- Router create/edit from outside ConnectionDetails

These are Phase 2 when router management becomes a first-class workflow.
