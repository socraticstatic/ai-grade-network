# Cloud Router Many-to-Many Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate CloudRouter from a 1:1 child-of-Connection model to a many-to-many relationship, promote routers to global Zustand store, fix all broken consumers, and surface router context in the three connection views.

**Architecture:** New `cloudRouterSlice` holds all routers globally. `CloudRouter.connectionIds[]` and `Connection.cloudRouterIds[]` form the junction. Downstream components read from the store and filter by ID inclusion.

**Tech Stack:** React 19, TypeScript strict, Vite, Zustand, Vitest

---

## File Map

**Create:**
- `src/store/slices/cloudRouterSlice.ts` — global CRUD slice for CloudRouter[]

**Modify:**
- `src/types/cloudrouter.ts` — connectionId → connectionIds[]
- `src/types/connection.ts` — cloudRouterCount → cloudRouterIds[]
- `src/types/vnf.ts` — cloudRouterId → cloudRouterIds[]
- `src/data/sampleInfrastructure.ts` — migrate connectionId → connectionIds[]
- `src/data/sampleData.ts` — migrate cloudRouterCount → cloudRouterIds[]
- `src/store/useStore.ts` — register cloudRouterSlice, seed from sampleRouters
- `src/components/connection/ConnectionDetails.tsx` — swap local cloudRouters state for store
- `src/components/monitoring/context/MonitoringContext.tsx` — fix filter predicate
- `src/components/connection/cloudrouter/CloudRouterCard.tsx` — fix VNF filter
- `src/components/pages/CloudRouterDetailPage.tsx` — fix lookup, show plural connections
- `src/components/connection/views/ListView.tsx` — add Cloud Routers column
- `src/store/slices/columnVisibilitySlice.ts` — add cloudRouters to connections-list defaults
- `src/components/connection/MiniTopology.tsx` — accept cloudRouters[] instead of count
- `src/components/connection/ConnectionCard.tsx` — pass cloudRouters to MiniTopology
- `src/components/connection/tabs/ConnectionOverview.tsx` — pass cloudRouters to MiniTopology

---

### Task 1: Update type definitions

**Files:**
- Modify: `src/types/cloudrouter.ts`
- Modify: `src/types/connection.ts`
- Modify: `src/types/vnf.ts`

- [ ] **Step 1: Update CloudRouter type**

In `src/types/cloudrouter.ts`, replace line 18 (`connectionId: string;`) with:

```typescript
connectionIds: string[];
```

- [ ] **Step 2: Update Connection type**

In `src/types/connection.ts`, replace line containing `cloudRouterCount?: number;` with:

```typescript
cloudRouterIds?: string[];
```

- [ ] **Step 3: Update VNF type**

In `src/types/vnf.ts`, replace `cloudRouterId?: string;` with:

```typescript
cloudRouterIds?: string[];
```

- [ ] **Step 4: Verify TypeScript compile errors**

```bash
cd /Users/micahbos/Developer/cloud-router-ui/att-netbond-sdci && export PATH=/Users/micahbos/.nvm/versions/node/v20.20.2/bin:$PATH && npx tsc --noEmit 2>&1 | head -60
```

Expected: many errors — these are the downstream consumers we'll fix in subsequent tasks.

- [ ] **Step 5: Commit**

```bash
git add src/types/cloudrouter.ts src/types/connection.ts src/types/vnf.ts
git commit -m "refactor(types): CloudRouter many-to-many — connectionIds[], cloudRouterIds[], VNF cloudRouterIds[]"
```

---

### Task 2: Migrate sample data

**Files:**
- Modify: `src/data/sampleInfrastructure.ts`
- Modify: `src/data/sampleData.ts`

- [ ] **Step 1: Update sampleRouters in sampleInfrastructure.ts**

Replace every `connectionId: 'conn-X'` with `connectionIds: ['conn-X']`. The four existing routers map as follows:

```typescript
// router-1: was connectionId: 'conn-1'
connectionIds: ['conn-1'],

// router-2: was connectionId: 'conn-1'
connectionIds: ['conn-1'],

// router-3: was connectionId: 'conn-2'
connectionIds: ['conn-2'],

// router-4: was connectionId: 'conn-3'
connectionIds: ['conn-3'],
```

Also add four LMCC routers after router-4 so conn-lmcc-1 has real routers:

```typescript
{
  id: 'router-lmcc-1',
  name: 'LMCC-SJ-Router-A',
  description: 'AWS Max San Jose primary path A',
  status: 'active' as const,
  location: 'San Jose, CA',
  vendor: 'Cisco',
  connectionIds: ['conn-lmcc-1'],
  createdAt: '2026-07-01T14:00:00Z',
  links: [],
  configuration: { asn: 65011, bgpEnabled: true, routeFilters: [] },
  performance: {
    latency: '1.8ms', throughput: '0.95 Gbps', cpuUsage: 31, memoryUsage: 55,
    bgpSessions: { total: 4, active: 4, idle: 0 },
    routingTableSize: 12400, packetForwardingRate: 220, controlPlaneLoad: 9
  }
},
{
  id: 'router-lmcc-2',
  name: 'LMCC-SJ-Router-B',
  description: 'AWS Max San Jose primary path B',
  status: 'active' as const,
  location: 'San Jose, CA',
  vendor: 'Juniper',
  connectionIds: ['conn-lmcc-1'],
  createdAt: '2026-07-01T14:00:00Z',
  links: [],
  configuration: { asn: 65012, bgpEnabled: true, routeFilters: [] },
  performance: {
    latency: '1.9ms', throughput: '0.92 Gbps', cpuUsage: 29, memoryUsage: 52,
    bgpSessions: { total: 4, active: 4, idle: 0 },
    routingTableSize: 12200, packetForwardingRate: 215, controlPlaneLoad: 8
  }
},
{
  id: 'router-lmcc-3',
  name: 'LMCC-SJ-Router-C',
  description: 'AWS Max San Jose secondary path A',
  status: 'active' as const,
  location: 'San Jose, CA',
  vendor: 'Cisco',
  connectionIds: ['conn-lmcc-1'],
  createdAt: '2026-07-01T14:00:00Z',
  links: [],
  configuration: { asn: 65013, bgpEnabled: true, routeFilters: [] },
  performance: {
    latency: '2.1ms', throughput: '0.88 Gbps', cpuUsage: 27, memoryUsage: 49,
    bgpSessions: { total: 4, active: 4, idle: 0 },
    routingTableSize: 11800, packetForwardingRate: 208, controlPlaneLoad: 7
  }
},
{
  id: 'router-lmcc-4',
  name: 'LMCC-SJ-Router-D',
  description: 'AWS Max San Jose secondary path B',
  status: 'active' as const,
  location: 'San Jose, CA',
  vendor: 'Juniper',
  connectionIds: ['conn-lmcc-1'],
  createdAt: '2026-07-01T14:00:00Z',
  links: [],
  configuration: { asn: 65014, bgpEnabled: true, routeFilters: [] },
  performance: {
    latency: '2.2ms', throughput: '0.85 Gbps', cpuUsage: 25, memoryUsage: 46,
    bgpSessions: { total: 4, active: 4, idle: 0 },
    routingTableSize: 11600, packetForwardingRate: 200, controlPlaneLoad: 7
  }
},
```

- [ ] **Step 2: Update sampleConnections in sampleData.ts**

Replace every `cloudRouterCount: N` with `cloudRouterIds: [...]` based on the router IDs above:

```typescript
// conn-lmcc-1 (was cloudRouterCount: 4)
cloudRouterIds: ['router-lmcc-1', 'router-lmcc-2', 'router-lmcc-3', 'router-lmcc-4'],

// conn-lmcc-pending (was cloudRouterCount: 0)
cloudRouterIds: [],

// conn-aws-pending-1 (was cloudRouterCount: 0)
cloudRouterIds: [],

// conn-1 (was cloudRouterCount: 2)
cloudRouterIds: ['router-1', 'router-2'],

// conn-2 (was cloudRouterCount: 3)
cloudRouterIds: ['router-3'],

// conn-3 (was cloudRouterCount: 5)
cloudRouterIds: ['router-4'],
```

- [ ] **Step 3: Commit**

```bash
git add src/data/sampleInfrastructure.ts src/data/sampleData.ts
git commit -m "feat(data): migrate cloudRouterCount→cloudRouterIds, add LMCC routers to sample infrastructure"
```

---

### Task 3: Create cloudRouterSlice

**Files:**
- Create: `src/store/slices/cloudRouterSlice.ts`

- [ ] **Step 1: Write the failing test**

Create `src/store/slices/cloudRouterSlice.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../useStore';
import { CloudRouter } from '../../types/cloudrouter';

const makeRouter = (overrides: Partial<CloudRouter> = {}): CloudRouter => ({
  id: 'test-router',
  name: 'Test Router',
  description: '',
  status: 'active',
  location: 'US East',
  connectionIds: ['conn-1'],
  createdAt: new Date().toISOString(),
  links: [],
  ...overrides,
});

describe('cloudRouterSlice', () => {
  beforeEach(() => {
    useStore.setState({ cloudRouters: [] });
  });

  it('initializes with empty array', () => {
    expect(useStore.getState().cloudRouters).toEqual([]);
  });

  it('adds a cloud router', () => {
    const router = makeRouter();
    useStore.getState().addCloudRouter(router);
    expect(useStore.getState().cloudRouters).toHaveLength(1);
    expect(useStore.getState().cloudRouters[0].id).toBe('test-router');
  });

  it('updates a cloud router', () => {
    useStore.setState({ cloudRouters: [makeRouter()] });
    useStore.getState().updateCloudRouter('test-router', { name: 'Updated' });
    expect(useStore.getState().cloudRouters[0].name).toBe('Updated');
  });

  it('removes a cloud router', () => {
    useStore.setState({ cloudRouters: [makeRouter()] });
    useStore.getState().removeCloudRouter('test-router');
    expect(useStore.getState().cloudRouters).toHaveLength(0);
  });

  it('getRoutersForConnection returns routers with matching connectionId', () => {
    useStore.setState({
      cloudRouters: [
        makeRouter({ id: 'r1', connectionIds: ['conn-1'] }),
        makeRouter({ id: 'r2', connectionIds: ['conn-2'] }),
        makeRouter({ id: 'r3', connectionIds: ['conn-1', 'conn-2'] }),
      ],
    });
    const result = useStore.getState().getRoutersForConnection('conn-1');
    expect(result.map(r => r.id)).toEqual(['r1', 'r3']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/micahbos/Developer/cloud-router-ui/att-netbond-sdci && export PATH=/Users/micahbos/.nvm/versions/node/v20.20.2/bin:$PATH && npx vitest run src/store/slices/cloudRouterSlice.test.ts 2>&1 | tail -20
```

Expected: FAIL — `cloudRouters` and related actions not yet on store.

- [ ] **Step 3: Create the slice**

Create `src/store/slices/cloudRouterSlice.ts`:

```typescript
import { StateCreator } from 'zustand';
import { CloudRouter } from '../../types/cloudrouter';

export interface CloudRouterSlice {
  cloudRouters: CloudRouter[];
  addCloudRouter: (router: CloudRouter) => void;
  updateCloudRouter: (id: string, updates: Partial<CloudRouter>) => void;
  removeCloudRouter: (id: string) => void;
  getRoutersForConnection: (connectionId: string) => CloudRouter[];
}

export const createCloudRouterSlice: StateCreator<CloudRouterSlice> = (set, get) => ({
  cloudRouters: [],

  addCloudRouter: (router) => {
    set((state) => ({ cloudRouters: [...state.cloudRouters, router] }));
  },

  updateCloudRouter: (id, updates) => {
    set((state) => ({
      cloudRouters: state.cloudRouters.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      ),
    }));
  },

  removeCloudRouter: (id) => {
    set((state) => ({
      cloudRouters: state.cloudRouters.filter((r) => r.id !== id),
    }));
  },

  getRoutersForConnection: (connectionId) => {
    return get().cloudRouters.filter((r) =>
      r.connectionIds.includes(connectionId)
    );
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/micahbos/Developer/cloud-router-ui/att-netbond-sdci && export PATH=/Users/micahbos/.nvm/versions/node/v20.20.2/bin:$PATH && npx vitest run src/store/slices/cloudRouterSlice.test.ts 2>&1 | tail -20
```

Expected: PASS — all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/store/slices/cloudRouterSlice.ts src/store/slices/cloudRouterSlice.test.ts
git commit -m "feat(store): add cloudRouterSlice with CRUD and getRoutersForConnection"
```

---

### Task 4: Register cloudRouterSlice in useStore

**Files:**
- Modify: `src/store/useStore.ts`

- [ ] **Step 1: Add import**

At the top of `src/store/useStore.ts`, add after the existing slice imports:

```typescript
import { createCloudRouterSlice, CloudRouterSlice } from './slices/cloudRouterSlice';
import { sampleRouters } from '../data/sampleInfrastructure';
```

- [ ] **Step 2: Add CloudRouterSlice to Store interface**

In the `interface Store extends ...` block, add `CloudRouterSlice,`:

```typescript
interface Store extends
  ConnectionSlice,
  AlertSlice,
  UserSlice,
  UISlice,
  WidgetSlice,
  GroupSlice,
  RuleSlice,
  AgenticSlice,
  APIToolboxSlice,
  NotificationSlice,
  FontSizeSlice,
  ColumnVisibilitySlice,
  DetachedWindowSlice,
  KeyboardShortcutsSlice,
  RoleSlice,
  BillingSlice,
  TenantContextSlice,
  RbacSlice,
  CloudRouterSlice {}
```

- [ ] **Step 3: Add slice to store creation and seed initial data**

In the `const store = { ... }` block, add `...createCloudRouterSlice(set, get),` alongside the other slices.

In `initialState`, add:

```typescript
cloudRouters: [...sampleRouters],
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /Users/micahbos/Developer/cloud-router-ui/att-netbond-sdci && export PATH=/Users/micahbos/.nvm/versions/node/v20.20.2/bin:$PATH && npx tsc --noEmit 2>&1 | grep "cloudRouter\|CloudRouter" | head -20
```

Expected: errors only in files not yet updated (ConnectionDetails, MonitoringContext, etc.) — not in useStore or the slice.

- [ ] **Step 5: Commit**

```bash
git add src/store/useStore.ts
git commit -m "feat(store): register cloudRouterSlice, seed from sampleRouters"
```

---

### Task 5: Fix ConnectionDetails — swap local state for store

**Files:**
- Modify: `src/components/connection/ConnectionDetails.tsx`

- [ ] **Step 1: Replace local cloudRouters state**

Find the block starting at `const [cloudRouters, setCloudRouters] = useState<CloudRouter[]>([` and delete it entirely (the entire useState with its hardcoded initial value — roughly lines 312–391).

Replace with a store read:

```typescript
const cloudRouters = useStore((state) =>
  state.getRoutersForConnection(connection?.id?.toString() || '')
);
const addCloudRouter = useStore((state) => state.addCloudRouter);
const updateCloudRouter = useStore((state) => state.updateCloudRouter);
const removeCloudRouter = useStore((state) => state.removeCloudRouter);
```

- [ ] **Step 2: Update handleSaveCloudRouter**

Replace the existing `handleSaveCloudRouter` function:

```typescript
const handleSaveCloudRouter = (cloudRouter: CloudRouter) => {
  if (editingCloudRouter) {
    updateCloudRouter(cloudRouter.id, cloudRouter);
    window.addToast({ type: 'success', title: 'Cloud Router Updated', message: `${cloudRouter.name} has been updated successfully.`, duration: 3000 });
  } else {
    const newRouter: CloudRouter = {
      ...cloudRouter,
      connectionIds: [connection?.id?.toString() || ''],
    };
    addCloudRouter(newRouter);
    window.addToast({ type: 'success', title: 'Cloud Router Added', message: `${cloudRouter.name} has been created successfully.`, duration: 3000 });
  }
  setShowAddCloudRouterModal(false);
  setEditingCloudRouter(undefined);
};
```

- [ ] **Step 3: Update handleConfirmDeleteCloudRouter**

Replace the delete handler to use the store action:

```typescript
const handleConfirmDeleteCloudRouter = () => {
  if (!deletingCloudRouter) return;
  removeCloudRouter(deletingCloudRouter.id);
  window.addToast({ type: 'success', title: 'Cloud Router Deleted', message: 'Cloud router has been successfully deleted.', duration: 3000 });
  setDeletingCloudRouter(undefined);
};
```

- [ ] **Step 4: Remove the useVNFSync onCloudRoutersUpdate callback**

The `useVNFSync` call passes `onCloudRoutersUpdate: setCloudRouters`. With the global store, cross-window sync can write directly to the store. Change that prop to:

```typescript
onCloudRoutersUpdate: (routers) => {
  routers.forEach((r) => updateCloudRouter(r.id, r));
},
```

- [ ] **Step 5: Verify the connection detail page renders**

Start the dev server if not running, open `http://localhost:5173`, navigate to any connection detail page, confirm cloud routers section loads without error.

- [ ] **Step 6: Commit**

```bash
git add src/components/connection/ConnectionDetails.tsx
git commit -m "refactor(ConnectionDetails): replace local cloudRouters state with global cloudRouterSlice"
```

---

### Task 6: Fix MonitoringContext filter predicate

**Files:**
- Modify: `src/components/monitoring/context/MonitoringContext.tsx`

- [ ] **Step 1: Fix the router filter**

Find line 112 (approximately):
```typescript
: allRouters.filter(router => router.connectionId === selectedConnection);
```

Replace with:
```typescript
: allRouters.filter(router => router.connectionIds?.includes(selectedConnection));
```

- [ ] **Step 2: Update the routers source**

MonitoringContext currently derives `allRouters` from connections. Find where `allRouters` is populated and replace it with a store read. Add at the top of the provider component:

```typescript
const storeRouters = useStore((state) => state.cloudRouters);
```

Then where `allRouters` is currently set (likely derived from connections), use `storeRouters` directly.

- [ ] **Step 3: Verify monitoring dashboard**

Navigate to the Monitor tab in the running app, select a connection, confirm the router filter works without console errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/monitoring/context/MonitoringContext.tsx
git commit -m "fix(monitoring): update router filter predicate for many-to-many connectionIds"
```

---

### Task 7: Fix CloudRouterCard VNF filter

**Files:**
- Modify: `src/components/connection/cloudrouter/CloudRouterCard.tsx`

- [ ] **Step 1: Fix the filter**

Find line 39:
```typescript
const associatedVNFs = vnfs.filter(vnf => vnf.cloudRouterId === cloudRouter.id);
```

Replace with:
```typescript
const associatedVNFs = vnfs.filter(vnf =>
  vnf.cloudRouterIds?.includes(cloudRouter.id) ?? false
);
```

- [ ] **Step 2: Commit**

```bash
git add src/components/connection/cloudrouter/CloudRouterCard.tsx
git commit -m "fix(CloudRouterCard): VNF filter uses cloudRouterIds array includes"
```

---

### Task 8: Fix CloudRouterDetailPage

**Files:**
- Modify: `src/components/pages/CloudRouterDetailPage.tsx`

- [ ] **Step 1: Replace the broken lookup**

The current `useEffect` searches `connections.find(c => c.cloudRouters?.some(...))`. Replace the entire data-fetching logic:

```typescript
const cloudRouter = useStore((state) =>
  state.cloudRouters.find((r) => r.id === id)
);
const connections = useStore((state) => state.connections);
const parentConnections = connections.filter((c) =>
  cloudRouter?.connectionIds?.includes(c.id) ?? false
);
```

Remove the `useState` for `cloudRouter` and `parentConnection` and the `useEffect` that populated them.

- [ ] **Step 2: Update the "View Parent Connection" link to show all parents**

Find the single `Link` that says "View Parent Connection" and replace with:

```typescript
{parentConnections.map((conn) => (
  <Link
    key={conn.id}
    to={`/connections/${conn.id}`}
    className="inline-flex items-center text-figma-sm text-fw-link hover:text-fw-linkHover"
  >
    <ExternalLink className="h-4 w-4 mr-1" />
    {conn.name}
  </Link>
))}
```

- [ ] **Step 3: Update the navigate-on-delete to go to /connections**

The delete handler currently navigates to `parentConnection.id`. With multiple parents, navigate to `/connections`:

```typescript
const handleDelete = async () => {
  setShowDeleteConfirm(false);
  removeCloudRouter(id!);
  navigate('/connections');
  window.addToast({ type: 'success', title: 'Cloud Router Deleted', message: 'Cloud router has been successfully deleted.', duration: 3000 });
};
```

Add `removeCloudRouter` from the store at the top of the component:
```typescript
const removeCloudRouter = useStore((state) => state.removeCloudRouter);
```

- [ ] **Step 4: Guard for not-found**

If `cloudRouter` is undefined (ID not in store), replace the current `if (!cloudRouter || !parentConnection) return null;` with:

```typescript
if (!cloudRouter) {
  navigate('/connections');
  return null;
}
```

- [ ] **Step 5: Verify the detail page**

Navigate to `/cloud-routers/router-1` in the running app. Confirm it loads, shows "AWS-Primary-Router", and lists both `conn-1` parent connections.

- [ ] **Step 6: Commit**

```bash
git add src/components/pages/CloudRouterDetailPage.tsx
git commit -m "fix(CloudRouterDetailPage): read from global store, show all parent connections"
```

---

### Task 9: Add Cloud Routers column to ListView

**Files:**
- Modify: `src/components/connection/views/ListView.tsx`
- Modify: `src/store/slices/columnVisibilitySlice.ts`

- [ ] **Step 1: Add the column definition**

In `ListView.tsx`, find `ALL_COLUMNS` and add:

```typescript
{ id: 'cloudRouters', label: 'Cloud Routers' },
```

Add `'cloudRouters'` to `SORTABLE_COLUMNS` if you want it sortable (skip it — router count sorting is low value).

- [ ] **Step 2: Add the column to renderColumnContent**

In the `renderColumnContent` switch, add a case:

```typescript
case 'cloudRouters': {
  const routerIds = connection.cloudRouterIds ?? [];
  if (routerIds.length === 0) return <span className="text-figma-sm text-fw-bodyLight">—</span>;
  const cloudRouters = useStore.getState().cloudRouters.filter(r => routerIds.includes(r.id));
  const names = cloudRouters.map(r => r.name);
  const display = names.length <= 2
    ? names.join(', ')
    : `${names[0]}, ${names[1]} +${names.length - 2}`;
  return (
    <span className="text-figma-sm text-fw-heading" title={names.join(', ')}>
      {display}
    </span>
  );
}
```

Note: `useStore.getState()` (not a hook) is fine here since `renderColumnContent` is called inside a render function that already re-renders when the store updates via the connection row's own subscription.

- [ ] **Step 3: Add to column visibility defaults**

In `src/store/slices/columnVisibilitySlice.ts`, find:

```typescript
'connections-list': ['name', 'provider', 'type', 'status', 'bandwidth', 'resiliency', 'location'],
```

Replace with:

```typescript
'connections-list': ['name', 'provider', 'type', 'status', 'bandwidth', 'resiliency', 'location', 'cloudRouters'],
```

- [ ] **Step 4: Verify in browser**

Reload the app, open the Connections table in list view, confirm the "Cloud Routers" column appears and shows router names for `conn-1` (should show "AWS-Primary-Router, AWS-Secondary-Router").

- [ ] **Step 5: Commit**

```bash
git add src/components/connection/views/ListView.tsx src/store/slices/columnVisibilitySlice.ts
git commit -m "feat(ListView): add Cloud Routers column showing router names per connection"
```

---

### Task 10: Update MiniTopology to use real router data

**Files:**
- Modify: `src/components/connection/MiniTopology.tsx`
- Modify: `src/components/connection/ConnectionCard.tsx`
- Modify: `src/components/connection/tabs/ConnectionOverview.tsx`

- [ ] **Step 1: Update MiniTopology props**

In `src/components/connection/MiniTopology.tsx`, change the interface:

```typescript
interface MiniTopologyProps {
  connection: Connection;
  cloudRouters?: CloudRouter[];
  linksCount?: number;
  vnfsCount?: number;
}
```

Add the import at the top:
```typescript
import type { CloudRouter } from '../../types/cloudrouter';
```

Update the function signature:
```typescript
export function MiniTopology({ connection, cloudRouters = [], linksCount = 0, vnfsCount = 0 }: MiniTopologyProps) {
```

- [ ] **Step 2: Replace cloudRoutersCount usages inside MiniTopology**

Find every reference to `cloudRoutersCount` inside the component body and replace with `cloudRouters.length`. For the sublabel line that currently shows `${cloudRoutersCount} active`, change to:

```typescript
sublabel: cloudRouters.length > 0 ? `${cloudRouters.length} active` : undefined,
```

- [ ] **Step 3: Update ConnectionCard to pass cloudRouters**

In `src/components/connection/ConnectionCard.tsx`, add store read:

```typescript
const cloudRouters = useStore((state) =>
  state.getRoutersForConnection(connection.id)
);
```

Pass it wherever `MiniTopology` is rendered:

```tsx
<MiniTopology connection={connection} cloudRouters={cloudRouters} />
```

- [ ] **Step 4: Update ConnectionOverview to pass cloudRouters**

In `src/components/connection/tabs/ConnectionOverview.tsx`, find where `cloudRoutersCount` prop is used and replace with `cloudRouters`. Add the store read if not already present:

```typescript
const cloudRouters = useStore((state) =>
  state.getRoutersForConnection(connection.id)
);
```

Then pass `cloudRouters={cloudRouters}` to `<MiniTopology>`.

- [ ] **Step 5: Verify grid view in browser**

Open the Connections grid view. Each card should show the MiniTopology diagram. Cards for `conn-1` should reflect 2 cloud routers in the topology node.

- [ ] **Step 6: Commit**

```bash
git add src/components/connection/MiniTopology.tsx src/components/connection/ConnectionCard.tsx src/components/connection/tabs/ConnectionOverview.tsx
git commit -m "feat(MiniTopology): accept cloudRouters[] array, derive count from real store data"
```

---

### Task 11: Final TypeScript check, full test run, and push

- [ ] **Step 1: Fix any remaining TypeScript errors**

```bash
cd /Users/micahbos/Developer/cloud-router-ui/att-netbond-sdci && export PATH=/Users/micahbos/.nvm/versions/node/v20.20.2/bin:$PATH && npx tsc --noEmit 2>&1
```

Fix any remaining errors. Common culprits: places that still reference `cloudRouterCount` or `cloudRouterId` (singular).

- [ ] **Step 2: Run full test suite**

```bash
cd /Users/micahbos/Developer/cloud-router-ui/att-netbond-sdci && export PATH=/Users/micahbos/.nvm/versions/node/v20.20.2/bin:$PATH && npx vitest run 2>&1 | tail -30
```

Expected: all tests pass.

- [ ] **Step 3: Verify in browser — golden path**

With the dev server running at `http://localhost:5173`:
1. Open Connections → List view → confirm "Cloud Routers" column shows names
2. Open Connections → Grid view → confirm card MiniTopology nodes render
3. Click "AWS Max - San Jose Metro" → open connection detail → Cloud Routers section shows 4 LMCC routers
4. Click a router in the detail → navigate to router detail page → confirm it loads and shows parent connection link
5. Open Monitor tab → select a connection → confirm no console errors about `connectionId`

- [ ] **Step 4: Build check**

```bash
cd /Users/micahbos/Developer/cloud-router-ui/att-netbond-sdci && export PATH=/Users/micahbos/.nvm/versions/node/v20.20.2/bin:$PATH && npm run build 2>&1 | tail -20
```

Expected: build succeeds with no errors.

- [ ] **Step 5: Push to remote**

```bash
git push origin main
```

---

## Self-Review Notes

- Task 5 Step 4: `useVNFSync` hook has `onCloudRoutersUpdate` callback — handled by writing to store via `updateCloudRouter` per-router. If the hook passes a full replacement array this approach still works since it maps each router individually.
- Task 9 Step 2: `useStore.getState()` inside `renderColumnContent` avoids hook-in-non-hook violation since `renderColumnContent` is not itself a hook. Acceptable pattern for imperative reads; the row re-renders when the connection changes anyway.
- `conn-lmcc-1` router IDs (`router-lmcc-1` through `router-lmcc-4`) are consistent across Tasks 2 and the sample data migration. Cross-checked.
- `conn-2` only gets `router-3` (not 3 routers as `cloudRouterCount: 3` implied). `cloudRouterCount` was aspirational/inaccurate. The real infrastructure only has one router for `conn-2`. This is correct — we're fixing the data, not preserving an inaccurate count.
