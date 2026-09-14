# Cloud Router-Centric Manage Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-architect the Manage page so Cloud Router is the primary entity and Connections are collapsible children within each router card, list group, and topology node.

**Architecture:** Replace the three view components (GridView, ListView, TopologyView) with router-centric equivalents. Introduce `CloudRouterCard` with three states (minimized, full-collapsed, full-expanded) and `ConnectionSummaryRow` for lightweight inline connection display. `ConnectionGrid.tsx` loops over `cloudRouters[]` instead of `connections[]`. Sample data restructures to 3 routers each owning 2 connections. `MiniTopology` gains a dual-mode signature so the connection detail page (`ConnectionOverview.tsx`) is not broken.

**Tech Stack:** React 18, TypeScript, Zustand, React Router v6, Tailwind CSS, Vitest + React Testing Library

---

## File Map

### New files
- `src/components/cloudrouter/card/ConnectionSummaryRow.tsx` — lightweight connection row inside router card
- `src/components/cloudrouter/card/CloudRouterCardMinimized.tsx` — 88px minimized state
- `src/components/cloudrouter/card/CloudRouterCard.tsx` — three-state router card
- `src/components/cloudrouter/card/__tests__/ConnectionSummaryRow.test.tsx`
- `src/components/cloudrouter/card/__tests__/CloudRouterCard.test.tsx`

### Modified files
- `src/data/sampleInfrastructure.ts` — replace 8 routers with 3; keep links/VNFs intact
- `src/data/sampleData.ts` — update `cloudRouterIds` back-references on all 6 connections
- `src/components/connection/views/GridView.tsx` — maps `CloudRouter[]` to `CloudRouterCard`
- `src/components/connection/views/ListView.tsx` — grouped table: router header rows + connection child rows
- `src/components/connection/views/TopologyView.tsx` — per-router topology cards
- `src/components/connection/MiniTopology.tsx` — dual-mode: new `router+connections` API alongside existing `connection` API
- `src/components/ConnectionGrid.tsx` — primary loop, search, filter groups
- `src/App.tsx` — pass `cloudRouters` prop to `ConnectionGrid`

---

## Task 1: Restructure sample data

**Files:**
- Modify: `src/data/sampleInfrastructure.ts`
- Modify: `src/data/sampleData.ts`

- [ ] **Step 1: Replace sampleInfrastructure.ts**

Replace the entire `sampleRouters` export. Keep `sampleLinks` and `sampleVNFs` unchanged.

```typescript
// src/data/sampleInfrastructure.ts
import { CloudRouter } from '../types/cloudrouter';
import { VNF } from '../types/vnf';
import { Link } from '../types/connection';

export const sampleRouters: CloudRouter[] = [
  {
    id: 'router-east',
    name: 'AT&T Core East',
    description: 'Primary cloud router for US East connectivity',
    status: 'active',
    location: 'Ashburn, VA',
    locations: ['Ashburn, VA', 'US East'],
    vendor: 'Cisco',
    vendors: ['Cisco'],
    connectionIds: ['conn-1', 'conn-aws-pending-1'],
    createdAt: '2024-01-15T10:00:00Z',
    links: [],
    configuration: {
      asn: 65001,
      bgpEnabled: true,
      routeFilters: ['192.168.0.0/16', '10.0.0.0/8']
    },
    performance: {
      latency: '3.8ms',
      throughput: '8.5 Gbps',
      cpuUsage: 42.5,
      memoryUsage: 68.2,
      bgpSessions: { total: 16, active: 14, idle: 2 },
      routingTableSize: 48532,
      packetForwardingRate: 950,
      controlPlaneLoad: 18.3
    }
  },
  {
    id: 'router-west',
    name: 'AT&T Core West',
    description: 'Primary cloud router for US West / AWS Max connectivity',
    status: 'active',
    location: 'San Jose, CA',
    locations: ['San Jose, CA', 'US West'],
    vendor: 'Juniper',
    vendors: ['Juniper'],
    connectionIds: ['conn-lmcc-1', 'conn-lmcc-pending'],
    createdAt: '2024-01-20T14:00:00Z',
    links: [],
    configuration: {
      asn: 65002,
      bgpEnabled: true,
      routeFilters: ['10.128.0.0/9']
    },
    performance: {
      latency: '2.1ms',
      throughput: '6.2 Gbps',
      cpuUsage: 38.5,
      memoryUsage: 61.4,
      bgpSessions: { total: 12, active: 12, idle: 0 },
      routingTableSize: 38400,
      packetForwardingRate: 820,
      controlPlaneLoad: 14.2
    }
  },
  {
    id: 'router-hub',
    name: 'AT&T Enterprise Hub',
    description: 'Multi-cloud hub for Azure and GCP connectivity',
    status: 'active',
    location: 'Dallas, TX',
    locations: ['Dallas, TX', 'US Central'],
    vendor: 'Arista',
    vendors: ['Arista'],
    connectionIds: ['conn-2', 'conn-3'],
    createdAt: '2024-02-01T09:00:00Z',
    links: [],
    configuration: {
      asn: 65003,
      bgpEnabled: true,
      routeFilters: ['172.16.0.0/12', '10.3.0.0/16']
    },
    performance: {
      latency: '4.5ms',
      throughput: '7.2 Gbps',
      cpuUsage: 45.3,
      memoryUsage: 71.8,
      bgpSessions: { total: 18, active: 17, idle: 1 },
      routingTableSize: 52143,
      packetForwardingRate: 820,
      controlPlaneLoad: 21.5
    }
  }
];

// sampleLinks and sampleVNFs: copy the existing arrays verbatim from the current file.
// They start at approximately line 198 and 346 respectively. Do NOT delete or modify them.
```

> Note: Do not remove `sampleLinks` or `sampleVNFs` — copy them verbatim from the existing file. Only `sampleRouters` is replaced.

- [ ] **Step 2: Update cloudRouterIds back-references in sampleData.ts**

Find each of the 6 connections by ID and update their `cloudRouterIds` field:

```
conn-1            → cloudRouterIds: ['router-east']
conn-aws-pending-1 → cloudRouterIds: ['router-east']
conn-lmcc-1       → cloudRouterIds: ['router-west']   (was ['router-lmcc-1','router-lmcc-2','router-lmcc-3','router-lmcc-4'])
conn-lmcc-pending → cloudRouterIds: ['router-west']   (was [] or missing)
conn-2            → cloudRouterIds: ['router-hub']
conn-3            → cloudRouterIds: ['router-hub']
```

Search for `cloudRouterIds` in `src/data/sampleData.ts` and update each occurrence to match the table above. No other connection fields change.

- [ ] **Step 3: Verify app loads without console errors**

```bash
npm run dev
```

Open the app. Navigate to the Manage tab. The page should render without JS errors. The existing (old) views will still show — full view rewrites come in later tasks.

- [ ] **Step 4: Commit**

```bash
git add src/data/sampleInfrastructure.ts src/data/sampleData.ts
git commit -m "refactor(data): consolidate to 3 cloud routers, update connection back-references"
```

---

## Task 2: ConnectionSummaryRow component

**Files:**
- Create: `src/components/cloudrouter/card/ConnectionSummaryRow.tsx`
- Create: `src/components/cloudrouter/card/__tests__/ConnectionSummaryRow.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/components/cloudrouter/card/__tests__/ConnectionSummaryRow.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ConnectionSummaryRow } from '../ConnectionSummaryRow';
import type { Connection } from '../../../../types';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const activeConnection: Connection = {
  id: 'conn-1',
  name: 'Corporate Cloud Gateway',
  type: 'Internet to Cloud',
  status: 'Active',
  bandwidth: '10 Gbps',
  location: 'Ashburn, VA',
  provider: 'AWS',
  performance: {
    latency: '3.8ms',
    packetLoss: '0.01%',
    uptime: '99.9%',
    throughput: '8.5 Gbps',
    tunnels: 'Active',
    bandwidthUtilization: 72,
    currentUsage: '7.2 Gbps',
    utilizationTrend: [70, 72, 73, 72, 74, 72, 72]
  }
};

describe('ConnectionSummaryRow', () => {
  it('renders connection name and bandwidth', () => {
    render(
      <MemoryRouter>
        <ConnectionSummaryRow connection={activeConnection} />
      </MemoryRouter>
    );
    expect(screen.getByText('Corporate Cloud Gateway')).toBeDefined();
    expect(screen.getByText('10 Gbps')).toBeDefined();
  });

  it('renders Active status badge', () => {
    render(
      <MemoryRouter>
        <ConnectionSummaryRow connection={activeConnection} />
      </MemoryRouter>
    );
    expect(screen.getByText('Active')).toBeDefined();
  });

  it('renders Pending status badge for pending connection', () => {
    render(
      <MemoryRouter>
        <ConnectionSummaryRow connection={{ ...activeConnection, status: 'Pending' }} />
      </MemoryRouter>
    );
    expect(screen.getByText('Pending')).toBeDefined();
  });

  it('navigates to connection detail on click', async () => {
    render(
      <MemoryRouter>
        <ConnectionSummaryRow connection={activeConnection} />
      </MemoryRouter>
    );
    await userEvent.click(screen.getByText('Corporate Cloud Gateway'));
    expect(mockNavigate).toHaveBeenCalledWith('/connections/conn-1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/components/cloudrouter/card/__tests__/ConnectionSummaryRow.test.tsx --reporter=verbose
```

Expected: FAIL — `Cannot find module '../ConnectionSummaryRow'`

- [ ] **Step 3: Create the component**

```typescript
// src/components/cloudrouter/card/ConnectionSummaryRow.tsx
import { ChevronRight, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Connection } from '../../../types';

interface ConnectionSummaryRowProps {
  connection: Connection;
}

export function ConnectionSummaryRow({ connection }: ConnectionSummaryRowProps) {
  const navigate = useNavigate();

  const isActive = connection.status === 'Active';
  const isPending = connection.status === 'Pending' || connection.status === 'Provisioning';
  const isLmcc = connection.configuration?.isLmcc;

  return (
    <div
      className="px-4 py-3 flex items-center gap-4 hover:bg-fw-wash transition-colors cursor-pointer border-b border-fw-secondary last:border-0"
      onClick={() => navigate(`/connections/${connection.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && navigate(`/connections/${connection.id}`)}
    >
      {/* Left: name + type */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-figma-sm font-semibold text-fw-heading truncate">
            {connection.name}
          </span>
          {isLmcc && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0"
              style={{ color: '#0057b8', backgroundColor: 'rgba(0,87,184,0.16)' }}
            >
              <Shield className="h-2.5 w-2.5" />
              AWS Max
            </span>
          )}
        </div>
        <p className="text-figma-xs text-fw-bodyLight truncate">{connection.type}</p>
      </div>

      {/* Status badge */}
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-figma-xs font-medium shrink-0 ${
        isActive  ? 'bg-fw-successLight text-fw-success' :
        isPending ? 'bg-brand-lightBlue text-fw-link' :
                    'bg-fw-secondary text-fw-disabled'
      }`}>
        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
          isActive  ? 'bg-fw-success' :
          isPending ? 'bg-fw-active animate-pulse' :
                      'bg-fw-disabled'
        }`} />
        {isActive ? 'Active' : isPending ? 'Pending' : 'Inactive'}
      </span>

      {/* Bandwidth */}
      <span className="text-figma-xs font-medium text-fw-heading tabular-nums shrink-0 hidden sm:inline">
        {connection.bandwidth}
      </span>

      {/* Latency (hidden if N/A — pending connections) */}
      {connection.performance?.latency && connection.performance.latency !== 'N/A' && (
        <span className="text-figma-xs text-fw-bodyLight tabular-nums shrink-0 hidden md:inline">
          {connection.performance.latency}
        </span>
      )}

      <ChevronRight className="h-3.5 w-3.5 text-fw-disabled shrink-0" />
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/components/cloudrouter/card/__tests__/ConnectionSummaryRow.test.tsx --reporter=verbose
```

Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/cloudrouter/card/ConnectionSummaryRow.tsx \
        src/components/cloudrouter/card/__tests__/ConnectionSummaryRow.test.tsx
git commit -m "feat(cloudrouter): add ConnectionSummaryRow lightweight connection row"
```

---

## Task 3: CloudRouterCardMinimized component

**Files:**
- Create: `src/components/cloudrouter/card/CloudRouterCardMinimized.tsx`

- [ ] **Step 1: Create the component**

No separate test file needed — `CloudRouterCard.test.tsx` (Task 4) covers the minimized render path.

```typescript
// src/components/cloudrouter/card/CloudRouterCardMinimized.tsx
import { ChevronRight, Maximize2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AttIcon } from '../../icons/AttIcon';
import type { CloudRouter } from '../../../types/cloudrouter';
import type { Connection } from '../../../types';

interface CloudRouterCardMinimizedProps {
  router: CloudRouter;
  connections: Connection[];
  onMaximize: () => void;
}

export function CloudRouterCardMinimized({
  router,
  connections,
  onMaximize
}: CloudRouterCardMinimizedProps) {
  const navigate = useNavigate();

  // Sum numeric bandwidth values (e.g. "10 Gbps" + "1 Gbps" → "11 Gbps")
  const bandwidthSum = connections
    .map(c => parseFloat(c.bandwidth?.replace(/[^\d.]/g, '') || '0'))
    .reduce((a, b) => a + b, 0);
  const bandwidthUnit = connections.find(c => c.bandwidth)?.bandwidth?.replace(/[\d.\s]/g, '') || 'Gbps';
  const totalBandwidthLabel = bandwidthSum > 0 ? `${bandwidthSum} ${bandwidthUnit}` : '—';

  const statusDotColor =
    router.status === 'active'       ? 'bg-fw-success' :
    router.status === 'provisioning' ? 'bg-fw-link animate-pulse' :
    router.status === 'error'        ? 'bg-fw-error' :
                                       'bg-fw-neutral';

  return (
    <div className="h-full px-5 flex items-center gap-4">
      {/* Status dot */}
      <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${statusDotColor}`} />

      {/* Icon */}
      <AttIcon name="cloudRouter" className="h-5 w-5 text-fw-link shrink-0" />

      {/* Name + vendor */}
      <div className="min-w-0 flex-1">
        <p className="text-figma-sm font-semibold text-fw-heading truncate leading-tight">
          {router.name}
        </p>
        {router.vendor && (
          <p className="text-figma-xs text-fw-bodyLight truncate">{router.vendor}</p>
        )}
      </div>

      {/* Connection count pill */}
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-figma-xs bg-fw-wash border border-fw-secondary text-fw-body shrink-0">
        {connections.length} connection{connections.length !== 1 ? 's' : ''}
      </span>

      {/* Aggregate bandwidth */}
      <span className="text-figma-sm font-medium text-fw-heading tabular-nums shrink-0">
        {totalBandwidthLabel}
      </span>

      {/* Action buttons */}
      <div
        className="flex items-center gap-1 shrink-0"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={e => { e.stopPropagation(); navigate(`/cloud-routers/${router.id}`); }}
          className="p-1.5 rounded-full text-fw-bodyLight hover:text-fw-heading hover:bg-fw-neutral transition-colors"
          title="Router details"
          aria-label="Router details"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          onClick={e => { e.stopPropagation(); onMaximize(); }}
          className="p-1.5 rounded-full text-fw-bodyLight hover:text-fw-heading hover:bg-fw-neutral transition-colors"
          title="Expand"
          aria-label="Expand card"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/cloudrouter/card/CloudRouterCardMinimized.tsx
git commit -m "feat(cloudrouter): add CloudRouterCardMinimized 88px row"
```

---

## Task 4: CloudRouterCard — three-state card

**Files:**
- Create: `src/components/cloudrouter/card/CloudRouterCard.tsx`
- Create: `src/components/cloudrouter/card/__tests__/CloudRouterCard.test.tsx`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/components/cloudrouter/card/__tests__/CloudRouterCard.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CloudRouterCard } from '../CloudRouterCard';
import type { CloudRouter } from '../../../../types/cloudrouter';
import type { Connection } from '../../../../types';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

const router: CloudRouter = {
  id: 'router-east',
  name: 'AT&T Core East',
  description: 'Test router',
  status: 'active',
  location: 'Ashburn, VA',
  vendor: 'Cisco',
  connectionIds: ['conn-1', 'conn-2'],
  createdAt: '2024-01-15T10:00:00Z',
  links: [],
  performance: {
    latency: '3.8ms',
    throughput: '8.5 Gbps',
    cpuUsage: 42,
    memoryUsage: 68,
    bgpSessions: { total: 16, active: 14, idle: 2 },
    routingTableSize: 48532,
    packetForwardingRate: 950,
    controlPlaneLoad: 18
  }
};

const connections: Connection[] = [
  {
    id: 'conn-1',
    name: 'Corporate Cloud Gateway',
    type: 'Internet to Cloud',
    status: 'Active',
    bandwidth: '10 Gbps',
    location: 'Ashburn, VA',
    provider: 'AWS'
  },
  {
    id: 'conn-2',
    name: 'AWS Interconnect',
    type: 'Internet to Cloud',
    status: 'Pending',
    bandwidth: '1 Gbps',
    location: 'Ashburn, VA',
    provider: 'AWS'
  }
];

describe('CloudRouterCard', () => {
  it('renders router name and vendor in full (state 2)', () => {
    render(
      <MemoryRouter>
        <CloudRouterCard
          router={router}
          connections={connections}
          isMinimized={false}
          onMinimize={vi.fn()}
          onMaximize={vi.fn()}
        />
      </MemoryRouter>
    );
    expect(screen.getByText('AT&T Core East')).toBeDefined();
    expect(screen.getByText('Cisco')).toBeDefined();
  });

  it('renders connection count pill', () => {
    render(
      <MemoryRouter>
        <CloudRouterCard
          router={router}
          connections={connections}
          isMinimized={false}
          onMinimize={vi.fn()}
          onMaximize={vi.fn()}
        />
      </MemoryRouter>
    );
    expect(screen.getByText('2 connections')).toBeDefined();
  });

  it('connections are hidden by default (state 2)', () => {
    render(
      <MemoryRouter>
        <CloudRouterCard
          router={router}
          connections={connections}
          isMinimized={false}
          onMinimize={vi.fn()}
          onMaximize={vi.fn()}
        />
      </MemoryRouter>
    );
    expect(screen.queryByText('Corporate Cloud Gateway')).toBeNull();
    expect(screen.getByText('Show connections (2)')).toBeDefined();
  });

  it('reveals connections after clicking expand handle (state 3)', async () => {
    render(
      <MemoryRouter>
        <CloudRouterCard
          router={router}
          connections={connections}
          isMinimized={false}
          onMinimize={vi.fn()}
          onMaximize={vi.fn()}
        />
      </MemoryRouter>
    );
    await userEvent.click(screen.getByText('Show connections (2)'));
    expect(screen.getByText('Corporate Cloud Gateway')).toBeDefined();
    expect(screen.getByText('AWS Interconnect')).toBeDefined();
  });

  it('hides connections after clicking collapse handle', async () => {
    render(
      <MemoryRouter>
        <CloudRouterCard
          router={router}
          connections={connections}
          isMinimized={false}
          onMinimize={vi.fn()}
          onMaximize={vi.fn()}
        />
      </MemoryRouter>
    );
    await userEvent.click(screen.getByText('Show connections (2)'));
    await userEvent.click(screen.getByText('Hide connections'));
    expect(screen.queryByText('Corporate Cloud Gateway')).toBeNull();
  });

  it('renders minimized state (state 1)', () => {
    render(
      <MemoryRouter>
        <CloudRouterCard
          router={router}
          connections={connections}
          isMinimized={true}
          onMinimize={vi.fn()}
          onMaximize={vi.fn()}
        />
      </MemoryRouter>
    );
    expect(screen.getByText('AT&T Core East')).toBeDefined();
    // Metrics section should not be present
    expect(screen.queryByText('BGP Sessions')).toBeNull();
  });

  it('calls onMinimize when minimize button is clicked', async () => {
    const onMinimize = vi.fn();
    render(
      <MemoryRouter>
        <CloudRouterCard
          router={router}
          connections={connections}
          isMinimized={false}
          onMinimize={onMinimize}
          onMaximize={vi.fn()}
        />
      </MemoryRouter>
    );
    await userEvent.click(screen.getByTitle('Minimize'));
    expect(onMinimize).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/components/cloudrouter/card/__tests__/CloudRouterCard.test.tsx --reporter=verbose
```

Expected: FAIL — `Cannot find module '../CloudRouterCard'`

- [ ] **Step 3: Create CloudRouterCard**

```typescript
// src/components/cloudrouter/card/CloudRouterCard.tsx
import { useState } from 'react';
import { ChevronDown, ChevronUp, Minimize2, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AttIcon } from '../../icons/AttIcon';
import { OverflowMenu } from '../../common/OverflowMenu';
import { CloudRouterCardMinimized } from './CloudRouterCardMinimized';
import { ConnectionSummaryRow } from './ConnectionSummaryRow';
import type { CloudRouter } from '../../../types/cloudrouter';
import type { Connection } from '../../../types';

interface CloudRouterCardProps {
  router: CloudRouter;
  connections: Connection[];
  isMinimized?: boolean;
  onMinimize: () => void;
  onMaximize: () => void;
}

export function CloudRouterCard({
  router,
  connections,
  isMinimized = false,
  onMinimize,
  onMaximize
}: CloudRouterCardProps) {
  const navigate = useNavigate();
  const [connectionsVisible, setConnectionsVisible] = useState(false);

  const statusBadgeClass =
    router.status === 'active'       ? 'bg-fw-successLight text-fw-success' :
    router.status === 'inactive'     ? 'bg-fw-secondary text-fw-disabled' :
    router.status === 'provisioning' ? 'bg-brand-lightBlue text-fw-link' :
                                       'bg-fw-errorLight text-fw-error';

  // Aggregate average bandwidth utilization across child connections
  const avgUtilization = connections.length > 0
    ? connections.reduce((sum, c) => sum + (c.performance?.bandwidthUtilization || 0), 0) / connections.length
    : 0;

  // Worst-case health signal: any child critical → critical; any warning → warning
  const hasError   = connections.some(c => (c.performance?.bandwidthUtilization || 0) > 90);
  const hasWarning = connections.some(c => (c.performance?.bandwidthUtilization || 0) > 80);
  const healthLabel =
    hasError   ? 'CRITICAL' :
    hasWarning ? 'WARNING' :
    router.status === 'active' ? 'GOOD' : 'INACTIVE';
  const healthClass =
    hasError   ? 'bg-fw-errorLight text-fw-error' :
    hasWarning ? 'bg-fw-accent text-fw-link' :
    router.status === 'active' ? 'bg-fw-accent text-fw-link' :
                                 'bg-fw-secondary text-fw-disabled';

  if (isMinimized) {
    return (
      <div className="relative bg-fw-base rounded-2xl border border-fw-secondary shadow-sm h-[88px]">
        <CloudRouterCardMinimized
          router={router}
          connections={connections}
          onMaximize={onMaximize}
        />
      </div>
    );
  }

  return (
    <div className="relative bg-fw-base rounded-2xl border border-fw-secondary shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-fw-secondary">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 shrink-0 flex items-center justify-center bg-fw-wash rounded-lg">
              <AttIcon name="cloudRouter" className="h-5 w-5 text-fw-link" />
            </div>
            <div className="min-w-0">
              <h3 className="text-figma-lg font-medium text-fw-heading truncate">{router.name}</h3>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {router.vendor && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-figma-xs bg-fw-wash border border-fw-secondary text-fw-bodyLight">
                    {router.vendor}
                  </span>
                )}
                <span className="text-figma-xs text-fw-bodyLight">{router.location}</span>
              </div>
            </div>
          </div>

          <div
            className="flex items-center gap-2 shrink-0"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={onMinimize}
              className="p-1.5 rounded-full text-fw-bodyLight hover:text-fw-heading hover:bg-fw-neutral transition-colors"
              title="Minimize"
              aria-label="Minimize card"
            >
              <Minimize2 className="h-4 w-4" />
            </button>
            <OverflowMenu
              items={[
                {
                  id: 'details',
                  label: 'Router Details',
                  icon: <ExternalLink className="h-4 w-4" />,
                  onClick: () => navigate(`/cloud-routers/${router.id}`),
                },
              ]}
            />
          </div>
        </div>

        {/* Status + count + health row */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-figma-xs font-medium ${statusBadgeClass}`}>
            {router.status.charAt(0).toUpperCase() + router.status.slice(1)}
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-figma-xs bg-fw-wash border border-fw-secondary text-fw-body">
            {connections.length} connection{connections.length !== 1 ? 's' : ''}
          </span>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-figma-xs font-medium ml-auto ${healthClass}`}>
            {healthLabel}
          </span>
        </div>
      </div>

      {/* Metrics */}
      <div className="p-6 space-y-4 flex-grow">
        {/* Aggregate utilization bar */}
        <div>
          <div className="flex justify-between text-figma-xs text-fw-bodyLight mb-1.5">
            <span>Avg Bandwidth Utilization</span>
            <span className="font-medium text-fw-heading">{Math.round(avgUtilization)}%</span>
          </div>
          <div className="h-2 bg-fw-secondary rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-fw-link transition-all duration-500"
              style={{ width: `${Math.min(avgUtilization, 100)}%` }}
            />
          </div>
        </div>

        {/* 2-column metrics: BGP Sessions + Latency */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-start space-x-3 p-4 bg-fw-wash rounded-lg">
            <div className="min-w-0 flex-1">
              <span className="text-figma-base font-medium text-fw-body block">BGP Sessions</span>
              <p className="text-figma-lg font-medium text-fw-heading tabular-nums">
                {router.performance?.bgpSessions?.active ?? '—'}/{router.performance?.bgpSessions?.total ?? '—'}
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3 p-4 bg-fw-wash rounded-lg">
            <div className="min-w-0 flex-1">
              <span className="text-figma-base font-medium text-fw-body block">Latency</span>
              <p className="text-figma-lg font-medium text-fw-heading tabular-nums">
                {router.performance?.latency ?? '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Expand / collapse connections */}
      <div className="mt-auto">
        {connectionsVisible ? (
          <>
            <div className="border-t border-fw-secondary">
              {connections.map(c => (
                <ConnectionSummaryRow key={c.id} connection={c} />
              ))}
            </div>
            <button
              onClick={() => setConnectionsVisible(false)}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-figma-xs font-medium text-fw-bodyLight hover:text-fw-heading bg-fw-wash border-t border-fw-secondary transition-colors rounded-b-2xl"
            >
              <ChevronUp className="h-3.5 w-3.5" />
              Hide connections
            </button>
          </>
        ) : (
          <button
            onClick={() => setConnectionsVisible(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-figma-xs font-medium text-fw-bodyLight hover:text-fw-heading bg-fw-wash border-t border-fw-secondary transition-colors rounded-b-2xl"
          >
            <ChevronDown className="h-3.5 w-3.5" />
            Show connections ({connections.length})
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/components/cloudrouter/card/__tests__/CloudRouterCard.test.tsx --reporter=verbose
```

Expected: 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/cloudrouter/card/CloudRouterCard.tsx \
        src/components/cloudrouter/card/__tests__/CloudRouterCard.test.tsx
git commit -m "feat(cloudrouter): add CloudRouterCard with three states (minimized/collapsed/expanded)"
```

---

## Task 5: Update GridView

**Files:**
- Modify: `src/components/connection/views/GridView.tsx`

- [ ] **Step 1: Replace GridView**

The new GridView receives `routers: CloudRouter[]` and derives connections from the store. It tracks per-card minimized state and syncs with the `isMinimized` prop from the toolbar.

```typescript
// src/components/connection/views/GridView.tsx
import { useState, useEffect } from 'react';
import { useStore } from '../../../store/useStore';
import { CloudRouterCard } from '../../cloudrouter/card/CloudRouterCard';
import type { CloudRouter } from '../../../types/cloudrouter';

interface GridViewProps {
  routers: CloudRouter[];
  isMinimized?: boolean;
}

export function GridView({ routers, isMinimized = false }: GridViewProps) {
  const connections = useStore(state => state.connections);
  const [minimizedIds, setMinimizedIds] = useState<Set<string>>(new Set());

  // Sync global minimize-all / expand-all with per-card state
  useEffect(() => {
    if (isMinimized) {
      setMinimizedIds(new Set(routers.map(r => r.id)));
    } else {
      setMinimizedIds(new Set());
    }
  }, [isMinimized, routers]);

  const handleMinimize = (id: string) =>
    setMinimizedIds(prev => new Set([...prev, id]));

  const handleMaximize = (id: string) =>
    setMinimizedIds(prev => { const n = new Set(prev); n.delete(id); return n; });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {routers.map(router => {
        const routerConnections = connections.filter(c =>
          router.connectionIds.includes(c.id)
        );
        return (
          <CloudRouterCard
            key={router.id}
            router={router}
            connections={routerConnections}
            isMinimized={minimizedIds.has(router.id)}
            onMinimize={() => handleMinimize(router.id)}
            onMaximize={() => handleMaximize(router.id)}
          />
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/connection/views/GridView.tsx
git commit -m "feat(views): rewrite GridView to render CloudRouterCard per router"
```

---

## Task 6: Update ListView

**Files:**
- Modify: `src/components/connection/views/ListView.tsx`

- [ ] **Step 1: Replace ListView**

Grouped table: router header rows (full-width colspan) + connection child rows. Sort applies within each router group. Column visibility controls connection columns only.

```typescript
// src/components/connection/views/ListView.tsx
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Settings, Trash2, ExternalLink, AlertTriangle, X } from 'lucide-react';
import { AttIcon } from '../../icons/AttIcon';
import { OverflowMenu } from '../../common/OverflowMenu';
import { ColumnVisibilityPopover, ColumnDefinition } from '../../common/ColumnVisibilityPopover';
import { useColumnVisibility } from '../../../hooks/useColumnVisibility';
import { useStore } from '../../../store/useStore';
import { getMetroById, LMCC_METROS } from '../../../data/lmccService';
import type { CloudRouter } from '../../../types/cloudrouter';
import type { Connection } from '../../../types';

interface ListViewProps {
  routers: CloudRouter[];
  highlightedConnectionId?: string;
}

const TABLE_ID = 'connections-list';

const ALL_COLUMNS: ColumnDefinition[] = [
  { id: 'name',      label: 'Connection' },
  { id: 'provider',  label: 'Provider' },
  { id: 'type',      label: 'Type' },
  { id: 'status',    label: 'Status' },
  { id: 'bandwidth', label: 'Bandwidth' },
  { id: 'resiliency',label: 'Resiliency' },
  { id: 'location',  label: 'Location' },
];

const SORTABLE_COLUMNS = ['name', 'provider', 'type', 'status', 'bandwidth', 'location'];

export function ListView({ routers, highlightedConnectionId }: ListViewProps) {
  const navigate = useNavigate();
  const { isVisible } = useColumnVisibility(TABLE_ID);
  const [sortField, setSortField] = useState<keyof Connection>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showColumnPopover, setShowColumnPopover] = useState(false);
  const [expandedRouterIds, setExpandedRouterIds] = useState<Set<string>>(
    new Set(routers.map(r => r.id)) // default: all expanded
  );
  const columnButtonRef = useRef<HTMLButtonElement>(null);
  const removeConnection = useStore(state => state.removeConnection);
  const connections = useStore(state => state.connections);
  const [pendingDelete, setPendingDelete] = useState<Connection | null>(null);

  const displayColumns = ALL_COLUMNS.filter(col => isVisible(col.id));
  const colSpanTotal = displayColumns.length + 1; // +1 for actions col

  const toggleRouter = (id: string) =>
    setExpandedRouterIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const handleSort = (field: keyof Connection) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortConnections = (conns: Connection[]) =>
    [...conns].sort((a, b) => {
      if (highlightedConnectionId) {
        if (String(a.id) === highlightedConnectionId) return -1;
        if (String(b.id) === highlightedConnectionId) return 1;
      }
      const aVal = a[sortField] ?? '';
      const bVal = b[sortField] ?? '';
      const mod = sortDirection === 'asc' ? 1 : -1;
      return aVal < bVal ? -1 * mod : aVal > bVal ? 1 * mod : 0;
    });

  const renderColumnHeader = (col: ColumnDefinition) => {
    if (!SORTABLE_COLUMNS.includes(col.id)) return <span>{col.label}</span>;
    const isSorted = sortField === col.id;
    return (
      <button
        onClick={() => handleSort(col.id as keyof Connection)}
        className="group inline-flex items-center gap-1 text-left"
        aria-sort={isSorted ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
      >
        <span>{col.label}</span>
        <span className="flex flex-col">
          <ChevronUp className={`h-3 w-3 ${isSorted && sortDirection === 'asc' ? 'text-fw-body' : 'text-fw-disabled group-hover:text-fw-bodyLight'}`} />
          <ChevronDown className={`h-3 w-3 -mt-1 ${isSorted && sortDirection === 'desc' ? 'text-fw-body' : 'text-fw-disabled group-hover:text-fw-bodyLight'}`} />
        </span>
      </button>
    );
  };

  const renderConnectionCell = (connection: Connection, columnId: string) => {
    switch (columnId) {
      case 'name':
        return <div className="text-figma-sm font-semibold text-fw-heading">{connection.name}</div>;

      case 'provider':
        return <span className="text-figma-sm text-fw-heading">{connection.provider || '—'}</span>;

      case 'type':
        return <span className="text-figma-sm text-fw-heading truncate">{connection.type}</span>;

      case 'status': {
        const s = connection.status;
        const isAws = connection.provider === 'AWS';
        const isPending = s === 'Provisioning' || s === 'Pending';
        const isActive = isAws ? !isPending : s === 'Active';
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-figma-xs font-medium ${
            isActive  ? 'bg-fw-successLight text-fw-success' :
            isPending ? 'bg-brand-lightBlue text-fw-link' :
                        'bg-fw-secondary text-fw-disabled'
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
              isActive  ? 'bg-fw-success' :
              isPending ? 'bg-fw-active animate-pulse' :
                          'bg-fw-disabled'
            }`} />
            {isActive ? 'Active' : isPending ? 'Pending' : 'Inactive'}
          </span>
        );
      }

      case 'bandwidth': {
        const bw = String(connection.bandwidth || '').split('×')[0].trim();
        return <span className="text-figma-sm font-medium text-fw-heading tabular-nums">{bw}</span>;
      }

      case 'resiliency': {
        const isLmcc = (connection as any).configuration?.isLmcc === true;
        const isAws = connection.provider === 'AWS';
        const label = (isLmcc || isAws) ? 'Maximum' : 'Standard';
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-figma-xs font-semibold bg-fw-wash border border-fw-secondary text-fw-body">
            {label}
          </span>
        );
      }

      case 'location': {
        const isAws = connection.provider === 'AWS';
        if (isAws) return <span className="text-figma-sm text-fw-heading">San Jose - SJ</span>;
        const raw = String((connection as any).configuration?.lmccMetro || connection.location || '');
        const metro = raw.startsWith('metro-')
          ? getMetroById(raw)
          : LMCC_METROS.find(m => m.name === raw);
        return <span className="text-figma-sm text-fw-heading">{metro?.name ?? raw}</span>;
      }

      default:
        return null;
    }
  };

  const handleConfirmDelete = () => {
    if (!pendingDelete) return;
    removeConnection(pendingDelete.id.toString());
    window.addToast({ type: 'success', title: 'Connection deleted', message: `${pendingDelete.name} has been removed.`, duration: 3000 });
    setPendingDelete(null);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px]">
        <caption className="sr-only">Network connections grouped by cloud router</caption>
        <thead className="bg-fw-wash border-b border-fw-secondary">
          <tr>
            {displayColumns.map(col => (
              <th
                key={col.id}
                scope="col"
                className="px-5 h-10 text-left text-[11px] font-semibold text-fw-bodyLight uppercase tracking-[0.06em] whitespace-nowrap align-middle"
              >
                {renderColumnHeader(col)}
              </th>
            ))}
            <th scope="col" className="relative px-5 h-10 w-14 align-middle">
              <div className="flex justify-end">
                <button
                  ref={columnButtonRef}
                  onClick={() => setShowColumnPopover(true)}
                  className="p-2 text-fw-disabled hover:text-fw-bodyLight rounded-full hover:bg-fw-wash transition-colors"
                  title="Manage columns"
                  aria-label="Manage table columns"
                >
                  <Settings className="h-5 w-5" />
                </button>
                {showColumnPopover && (
                  <ColumnVisibilityPopover
                    tableId={TABLE_ID}
                    allColumns={ALL_COLUMNS}
                    onClose={() => setShowColumnPopover(false)}
                    anchorEl={columnButtonRef.current}
                  />
                )}
              </div>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-fw-base divide-y divide-fw-secondary">
          {routers.map(router => {
            const routerConnections = connections.filter(c => router.connectionIds.includes(c.id));
            const sortedConns = sortConnections(routerConnections);
            const isExpanded = expandedRouterIds.has(router.id);

            return (
              <>
                {/* Router header row */}
                <tr
                  key={`router-${router.id}`}
                  className="bg-fw-wash cursor-pointer hover:brightness-[0.97] transition-all"
                  onClick={() => toggleRouter(router.id)}
                >
                  <td colSpan={colSpanTotal} className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {isExpanded
                        ? <ChevronUp className="h-4 w-4 text-fw-bodyLight shrink-0" />
                        : <ChevronDown className="h-4 w-4 text-fw-bodyLight shrink-0" />
                      }
                      <AttIcon name="cloudRouter" className="h-4 w-4 text-fw-link shrink-0" />
                      <span className="text-figma-sm font-semibold text-fw-heading">{router.name}</span>
                      {router.vendor && (
                        <span className="text-figma-xs text-fw-bodyLight">{router.vendor}</span>
                      )}
                      <span className="text-figma-xs text-fw-bodyLight">&middot; {router.location}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-figma-xs font-medium ${
                        router.status === 'active' ? 'bg-fw-successLight text-fw-success' : 'bg-fw-secondary text-fw-disabled'
                      }`}>
                        {router.status.charAt(0).toUpperCase() + router.status.slice(1)}
                      </span>
                      <span className="ml-auto text-figma-xs text-fw-bodyLight">
                        {routerConnections.length} connection{routerConnections.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </td>
                </tr>

                {/* Connection child rows (visible when expanded) */}
                {isExpanded && (sortedConns.length === 0 ? (
                  <tr key={`${router.id}-empty`}>
                    <td
                      colSpan={colSpanTotal}
                      className="px-5 py-4 pl-14 text-figma-sm text-fw-disabled"
                    >
                      No connections
                    </td>
                  </tr>
                ) : sortedConns.map((connection, rowIndex) => (
                  <tr
                    key={connection.id}
                    onClick={() => navigate(`/connections/${connection.id}`)}
                    className={`hover:bg-fw-wash transition-colors duration-100 cursor-pointer ${
                      String(connection.id) === highlightedConnectionId ? 'row-highlight' : ''
                    }`}
                    aria-rowindex={rowIndex + 1}
                  >
                    {displayColumns.map(col => (
                      <td
                        key={col.id}
                        className={`px-5 py-3.5 whitespace-nowrap align-middle ${col.id === 'name' ? 'pl-14' : ''}`}
                      >
                        {renderConnectionCell(connection, col.id)}
                      </td>
                    ))}
                    <td className="px-5 py-3.5 whitespace-nowrap w-14 align-middle">
                      <div onClick={e => e.stopPropagation()} className="flex justify-end">
                        <OverflowMenu
                          items={[
                            {
                              id: 'details',
                              label: 'Details',
                              icon: <ExternalLink className="h-4 w-4" />,
                              onClick: () => navigate(`/connections/${connection.id}`),
                            },
                            {
                              id: 'delete',
                              label: 'Delete',
                              icon: <Trash2 className="h-4 w-4" />,
                              onClick: () => setPendingDelete(connection),
                              variant: 'danger',
                            },
                          ]}
                          className="z-30 rounded-full"
                        />
                      </div>
                    </td>
                  </tr>
                )))}
              </>
            );
          })}
        </tbody>
      </table>

      {pendingDelete && (
        <div
          className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setPendingDelete(null)}
        >
          <div
            className="bg-fw-base rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-connection-title"
          >
            <div className="px-6 pt-6 pb-5 flex items-start gap-4">
              <div className="shrink-0 h-11 w-11 rounded-full bg-fw-errorLight flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-fw-error" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 id="delete-connection-title" className="text-figma-lg font-bold text-fw-heading tracking-[-0.02em] leading-tight">
                  Delete this connection?
                </h2>
                <p className="text-figma-sm text-fw-body mt-2 leading-relaxed">
                  <span className="font-semibold text-fw-heading">{pendingDelete.name}</span> will be permanently removed.
                </p>
              </div>
              <button onClick={() => setPendingDelete(null)} aria-label="Dismiss" className="shrink-0 p-1.5 -mt-1 -mr-1 rounded-full text-fw-bodyLight hover:text-fw-heading hover:bg-fw-neutral transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-6 py-4 bg-fw-wash border-t border-fw-secondary flex items-center justify-end gap-3">
              <button onClick={() => setPendingDelete(null)} className="h-9 px-4 rounded-full border border-fw-secondary bg-fw-base text-figma-sm font-semibold text-fw-body hover:border-fw-bodyLight hover:text-fw-heading transition-colors">Cancel</button>
              <button onClick={handleConfirmDelete} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-fw-error text-white text-figma-sm font-semibold hover:brightness-90 transition-all">
                <Trash2 className="h-3.5 w-3.5" />
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/connection/views/ListView.tsx
git commit -m "feat(views): rewrite ListView with grouped router header rows and connection child rows"
```

---

## Task 7: Update MiniTopology — dual-mode signature

**Files:**
- Modify: `src/components/connection/MiniTopology.tsx`

`ConnectionOverview.tsx` passes `connection={...}` (old API). `TopologyView.tsx` will pass `router={...} connections={[...]}` (new API). Both must work.

- [ ] **Step 1: Update MiniTopology to handle both modes**

Add the new `router` + `connections` props as optional alongside the existing `connection` prop. When `router` and `connections` are provided, use the new rendering logic. Otherwise fall back to the existing logic unchanged.

At the top of the existing `MiniTopologyProps` interface, add:

```typescript
// src/components/connection/MiniTopology.tsx
// — Add these two lines to the existing MiniTopologyProps interface:
//   router?: CloudRouter;
//   connections?: Connection[];  (rename to avoid conflict with existing Connection import)
```

Full updated file:

```typescript
// src/components/connection/MiniTopology.tsx
import { Fragment, useMemo } from 'react';
import { Cloud } from 'lucide-react';
import { AttIcon } from '../icons/AttIcon';
import type { Connection } from '../../types';
import type { CloudRouter } from '../../types/cloudrouter';

// Existing single-connection mode (used by ConnectionOverview)
interface LegacyMiniTopologyProps {
  connection: Connection;
  cloudRouters?: CloudRouter[];
  linksCount?: number;
  vnfsCount?: number;
}

// New router-centric mode (used by TopologyView)
interface RouterMiniTopologyProps {
  router: CloudRouter;
  connections: Connection[];
  connection?: never;
  cloudRouters?: never;
  linksCount?: never;
  vnfsCount?: never;
}

type MiniTopologyProps = LegacyMiniTopologyProps | RouterMiniTopologyProps;

interface MiniNode {
  id: string;
  x: number;
  y: number;
  label: string;
  sublabel?: string;
  icon: 'cloudRouter' | 'cloud' | 'ipe';
  isActive: boolean;
  cloudProvider?: string;
}

interface MiniEdge {
  from: string;
  to: string;
  isActive: boolean;
}

function getProviderLabel(connection: Connection): string {
  if (connection.provider) return connection.provider;
  if (connection.providers && connection.providers.length > 0) return connection.providers[0];
  return 'Cloud';
}

function friendlyLoc(loc: string | undefined): string | undefined {
  if (!loc) return undefined;
  if (loc.startsWith('metro-sj')) return 'San Jose, CA';
  if (loc.startsWith('metro-la')) return 'Los Angeles, CA';
  if (loc.startsWith('metro-ashburn')) return 'Ashburn, VA';
  return loc;
}

// Build nodes for a single connection (legacy mode)
function buildLegacyNodes(connection: Connection, cloudRoutersCount: number) {
  const n: MiniNode[] = [];
  const e: MiniEdge[] = [];
  const isActive = connection.status === 'Active';
  const hasMultiCloud = connection.providers && connection.providers.length > 1;
  const isAws = connection.provider === 'AWS';
  const centerY = 80;

  n.push({
    id: 'core', x: 60, y: centerY,
    label: isAws ? 'Your Network' : (friendlyLoc(connection.location) || 'AT&T Core'),
    sublabel: isAws ? (friendlyLoc(connection.location) || undefined) : (connection.type === 'Internet to Cloud' ? 'Internet' : 'MPLS'),
    icon: 'ipe', isActive,
  });
  n.push({
    id: 'router', x: 260, y: centerY,
    label: isAws ? 'AT&T NetBond Advanced' : 'Cloud Router',
    sublabel: isAws ? '4 diverse paths' : (cloudRoutersCount > 0 ? `${cloudRoutersCount} active` : undefined),
    icon: 'cloudRouter', isActive,
  });
  e.push({ from: 'core', to: 'router', isActive });

  const provider = getProviderLabel(connection);
  n.push({
    id: 'cloud1', x: 460, y: hasMultiCloud ? centerY - 50 : centerY,
    label: isAws ? 'AWS Direct Connect' : `${provider} Cloud`,
    sublabel: connection.bandwidth, icon: 'cloud', isActive,
    cloudProvider: provider.toLowerCase(),
  });
  e.push({ from: 'router', to: 'cloud1', isActive });

  if (hasMultiCloud && connection.providers && connection.providers[1]) {
    n.push({
      id: 'cloud2', x: 460, y: centerY + 50,
      label: `${connection.providers[1]} Cloud`,
      sublabel: connection.bandwidth, icon: 'cloud', isActive: false,
      cloudProvider: connection.providers[1].toLowerCase(),
    });
    e.push({ from: 'router', to: 'cloud2', isActive: false });
  }

  return { nodes: n, edges: e };
}

// Build nodes for a router with multiple connections (new mode)
function buildRouterNodes(router: CloudRouter, connections: Connection[]) {
  const n: MiniNode[] = [];
  const e: MiniEdge[] = [];
  const routerActive = router.status === 'active';
  const centerY = 80;

  // Left: AT&T Core
  n.push({
    id: 'core', x: 60, y: centerY,
    label: 'AT&T Core',
    sublabel: router.location,
    icon: 'ipe', isActive: routerActive,
  });

  // Center: this router
  n.push({
    id: 'router', x: 260, y: centerY,
    label: router.name,
    sublabel: router.vendor,
    icon: 'cloudRouter', isActive: routerActive,
  });
  e.push({ from: 'core', to: 'router', isActive: routerActive });

  // Right: one cloud endpoint per connection (cap at 3, show "+N more" otherwise)
  const displayConns = connections.slice(0, 3);
  const extraCount = connections.length - displayConns.length;

  displayConns.forEach((conn, idx) => {
    const cloudId = `cloud${idx}`;
    const isConnActive = conn.status === 'Active';
    const provider = getProviderLabel(conn);
    const offsetY = displayConns.length === 1 ? 0 : (idx - (displayConns.length - 1) / 2) * 50;
    n.push({
      id: cloudId, x: 460, y: centerY + offsetY,
      label: `${provider} Cloud`,
      sublabel: conn.bandwidth,
      icon: 'cloud', isActive: isConnActive,
      cloudProvider: provider.toLowerCase(),
    });
    e.push({ from: 'router', to: cloudId, isActive: isConnActive });
  });

  return { nodes: n, edges: e, extraCount };
}

export function MiniTopology(props: MiniTopologyProps) {
  const isRouterMode = 'router' in props && props.router !== undefined;

  const { nodes, edges, extraCount } = useMemo(() => {
    if (isRouterMode) {
      const result = buildRouterNodes(props.router, props.connections);
      return { ...result };
    } else {
      const cloudRoutersCount = (props.cloudRouters ?? []).length;
      const result = buildLegacyNodes(props.connection, cloudRoutersCount);
      return { ...result, extraCount: 0 };
    }
  }, [props, isRouterMode]);

  const orderedNodes = [...nodes].sort((a, b) => a.x - b.x);
  const isEdgeActiveBetween = (fromId: string, toId: string) =>
    edges.find(e =>
      (e.from === fromId && e.to === toId) ||
      (e.from === toId && e.to === fromId)
    )?.isActive === true;

  return (
    <div className="bg-fw-base rounded-xl overflow-hidden py-6 px-4 sm:px-6">
      <div className="flex items-center justify-between gap-2 sm:gap-4 w-full">
        {orderedNodes.map((node, idx) => {
          const isLast = idx === orderedNodes.length - 1;
          const nextNode = orderedNodes[idx + 1];
          const edgeActive = nextNode ? isEdgeActiveBetween(node.id, nextNode.id) : false;
          return (
            <Fragment key={node.id}>
              <div className="flex flex-col items-center text-center shrink-0 min-w-0">
                <div className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center border-2 transition-shadow ${
                  node.isActive ? 'bg-fw-wash border-fw-link/40' : 'bg-fw-wash border-fw-secondary border-dashed'
                }`}>
                  {node.icon === 'cloudRouter' ? (
                    <AttIcon name="cloudRouter" className="w-6 h-6 sm:w-7 sm:h-7 text-fw-bodyLight" />
                  ) : (
                    <Cloud className="w-5 h-5 sm:w-6 sm:h-6 text-fw-bodyLight" />
                  )}
                  <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${node.isActive ? 'bg-fw-success' : 'bg-fw-neutral'}`} />
                </div>
                <span className="text-figma-xs font-medium text-fw-heading mt-1.5 max-w-[120px] leading-snug">
                  {node.label}
                </span>
                {node.sublabel && (
                  <span className="text-[11px] text-fw-bodyLight leading-snug mt-0.5 max-w-[120px]">
                    {node.sublabel}
                  </span>
                )}
              </div>

              {!isLast && (
                <div
                  className="flex-1 min-w-[24px] border-t-2 self-start mt-[28px] sm:mt-[32px]"
                  style={{
                    borderColor: edgeActive ? '#0057b8' : '#9ca3af',
                    borderStyle: edgeActive ? 'solid' : 'dashed',
                  }}
                />
              )}
            </Fragment>
          );
        })}
        {extraCount > 0 && (
          <div className="flex flex-col items-center text-center shrink-0">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-fw-wash border-2 border-dashed border-fw-secondary">
              <span className="text-figma-xs font-medium text-fw-bodyLight">+{extraCount}</span>
            </div>
            <span className="text-[11px] text-fw-bodyLight mt-1.5">more</span>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify ConnectionOverview still compiles**

```bash
npx tsc --noEmit 2>&1 | grep -E "ConnectionOverview|MiniTopology"
```

Expected: no errors for these files.

- [ ] **Step 3: Commit**

```bash
git add src/components/connection/MiniTopology.tsx
git commit -m "feat(topology): add dual-mode to MiniTopology for router-centric rendering"
```

---

## Task 8: Update TopologyView

**Files:**
- Modify: `src/components/connection/views/TopologyView.tsx`

- [ ] **Step 1: Replace TopologyView**

```typescript
// src/components/connection/views/TopologyView.tsx
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../../store/useStore';
import { MiniTopology } from '../MiniTopology';
import { OverflowMenu } from '../../common/OverflowMenu';
import { ExternalLink } from 'lucide-react';
import type { CloudRouter } from '../../../types/cloudrouter';

interface TopologyViewProps {
  routers: CloudRouter[];
}

export function TopologyView({ routers }: TopologyViewProps) {
  const navigate = useNavigate();
  const connections = useStore(state => state.connections);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {routers.map(router => {
        const routerConnections = connections.filter(c => router.connectionIds.includes(c.id));
        const isActive = router.status === 'active';

        return (
          <div
            key={router.id}
            className="bg-fw-base rounded-xl border border-fw-secondary overflow-hidden hover:shadow-md transition-shadow duration-200"
          >
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-fw-secondary flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`h-2 w-2 rounded-full shrink-0 ${isActive ? 'bg-fw-success' : 'bg-fw-neutral'}`} />
                <div className="min-w-0">
                  <h3 className="text-figma-sm font-semibold text-fw-heading truncate">{router.name}</h3>
                  <p className="text-figma-xs text-fw-bodyLight truncate">{router.vendor} &middot; {router.location}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                {router.performance?.latency && (
                  <span className="text-figma-xs font-medium text-fw-heading tabular-nums">
                    {router.performance.latency}
                  </span>
                )}
                <div onClick={e => e.stopPropagation()}>
                  <OverflowMenu
                    items={[
                      {
                        id: 'details',
                        label: 'Router Details',
                        icon: <ExternalLink className="h-4 w-4" />,
                        onClick: () => navigate(`/cloud-routers/${router.id}`),
                      },
                    ]}
                  />
                </div>
              </div>
            </div>

            {/* Topology diagram */}
            <div className="px-5 pt-3 pb-1">
              <MiniTopology router={router} connections={routerConnections} />
            </div>

            {/* Footer: aggregate bandwidth + connection count */}
            <div className="px-5 py-3 flex items-center justify-between border-t border-fw-secondary mt-1">
              <div className="flex items-center gap-4 text-figma-xs text-fw-bodyLight">
                <span>
                  <span className="font-medium text-fw-heading">{routerConnections.length}</span>
                  {' '}connection{routerConnections.length !== 1 ? 's' : ''}
                </span>
                <span>
                  <span className="font-medium text-fw-heading">{router.location}</span>
                </span>
              </div>
              <button
                onClick={() => navigate(`/cloud-routers/${router.id}`)}
                className="flex items-center gap-1 text-figma-xs text-fw-link hover:text-fw-linkHover transition-colors"
              >
                View router
                <ExternalLink className="h-3 w-3" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/connection/views/TopologyView.tsx
git commit -m "feat(views): rewrite TopologyView with per-router topology cards"
```

---

## Task 9: Update ConnectionGrid.tsx — primary loop, search, filters

**Files:**
- Modify: `src/components/ConnectionGrid.tsx`

- [ ] **Step 1: Update ConnectionGrid**

Change the prop from `connections: Connection[]` to `routers: CloudRouter[]`. Derive connections from the store for search matching. Update filter groups to router-level fields.

```typescript
// src/components/ConnectionGrid.tsx
import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { GridView } from './connection/views/GridView';
import { ListView } from './connection/views/ListView';
import { TopologyView } from './connection/views/TopologyView';
import { MobileConnectionGrid } from './connection/MobileConnectionGrid';
import { Search, LayoutGrid, List, Network, Download, Minimize2, Maximize2, PlusCircle } from 'lucide-react';
import { ViewMode } from '../types';
import { Button } from './common/Button';
import { SearchFilterBar } from './common/SearchFilterBar';
import { TableFilterPanel, useTableFilters, FilterGroup } from './common/TableFilterPanel';
import { useStore } from '../store/useStore';
import { useIsMobile } from '../hooks/useMobileDetection';
import { usePermission } from '../hooks/usePermission';
import type { CloudRouter } from '../types/cloudrouter';

interface ConnectionGridProps {
  routers: CloudRouter[];
}

export function ConnectionGrid({ routers }: ConnectionGridProps) {
  const connections = useStore(state => state.connections);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const highlightedConnectionId = (location.state as any)?.highlightedConnectionId as string | undefined;
  const initialViewMode = ((location.state as any)?.viewMode as ViewMode | undefined) ?? 'list';
  const canCreate = usePermission('create');

  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const [searchQuery, setSearchQuery] = useState('');
  const [areAllMinimized, setAreAllMinimized] = useState(false);

  // Filter groups derived from router data
  const routerFilterGroups = useMemo<FilterGroup[]>(() => [
    {
      id: 'status',
      label: 'Status',
      type: 'checkbox' as const,
      options: [
        { value: 'active',       label: 'Active',       color: 'success' as const },
        { value: 'inactive',     label: 'Inactive',     color: 'warning' as const },
        { value: 'provisioning', label: 'Provisioning'  },
        { value: 'error',        label: 'Error'         },
      ],
    },
    {
      id: 'vendor',
      label: 'Vendor',
      type: 'checkbox' as const,
      options: Array.from(new Set(routers.map(r => r.vendor).filter(Boolean))) .map(v => ({ value: v!, label: v! })),
    },
    {
      id: 'location',
      label: 'Location',
      type: 'checkbox' as const,
      options: Array.from(new Set(routers.map(r => r.location))).map(l => ({ value: l, label: l })),
    },
  ], [routers]);

  const { filters, setFilters, isOpen, toggle, activeCount } = useTableFilters({
    groups: routerFilterGroups,
  });

  const filteredRouters = useMemo(() => {
    return routers.filter(router => {
      // Status filter
      const statusFilters = filters.status || [];
      if (statusFilters.length > 0 && !statusFilters.includes(router.status)) return false;

      // Vendor filter
      const vendorFilters = filters.vendor || [];
      if (vendorFilters.length > 0 && !vendorFilters.includes(router.vendor ?? '')) return false;

      // Location filter
      const locationFilters = filters.location || [];
      if (locationFilters.length > 0 && !locationFilters.includes(router.location)) return false;

      // Search: match on router name, location, vendor, OR any child connection name/provider/type
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const routerMatch =
          router.name.toLowerCase().includes(q) ||
          router.location.toLowerCase().includes(q) ||
          (router.vendor ?? '').toLowerCase().includes(q);

        const childMatch = connections
          .filter(c => router.connectionIds.includes(c.id))
          .some(c =>
            c.name.toLowerCase().includes(q) ||
            (c.provider ?? '').toLowerCase().includes(q) ||
            c.type.toLowerCase().includes(q)
          );

        if (!routerMatch && !childMatch) return false;
      }

      return true;
    });
  }, [routers, connections, searchQuery, filters]);

  if (isMobile) {
    // MobileConnectionGrid still takes connections[] — pass all connections for now
    return <MobileConnectionGrid connections={connections} />;
  }

  return (
    <div className="space-y-6 min-h-[calc(100vh-16rem)] pb-12">
      <div className="flex items-center space-x-4 max-w-full">
        <div className="flex-1">
          <SearchFilterBar
            searchPlaceholder="Search cloud routers and connections..."
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            onFilter={toggle}
            activeFilterCount={activeCount}
            isFilterOpen={isOpen}
            filterPanel={
              <TableFilterPanel
                groups={routerFilterGroups}
                activeFilters={filters}
                onFiltersChange={setFilters}
                isOpen={isOpen}
                onToggle={toggle}
                searchQuery={searchQuery}
                onClearSearch={() => setSearchQuery('')}
              />
            }
            onExport={() => {
              const rows: string[][] = [['Router', 'Vendor', 'Location', 'Status', 'Connection', 'Provider', 'Type', 'Bandwidth']];
              filteredRouters.forEach(router => {
                const routerConns = connections.filter(c => router.connectionIds.includes(c.id));
                routerConns.forEach(c => {
                  rows.push([router.name, router.vendor ?? '', router.location, router.status, c.name, c.provider ?? '', c.type, c.bandwidth]);
                });
              });
              const csv = rows.map(r => r.join(',')).join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = 'cloud-routers.csv';
              link.click();
              URL.revokeObjectURL(url);
              window.addToast({ type: 'success', title: 'Export Complete', message: 'Exported successfully', duration: 3000 });
            }}
            actions={
              viewMode === 'grid' ? (
                <Button
                  variant="ghost"
                  icon={areAllMinimized ? Maximize2 : Minimize2}
                  onClick={() => setAreAllMinimized(!areAllMinimized)}
                  size="md"
                >
                  {areAllMinimized ? 'Expand All' : 'Minimize All'}
                </Button>
              ) : null
            }
          />
        </div>

        <div className="h-6 w-px bg-fw-secondary" />

        {/* View toggles */}
        <div className="flex items-center bg-fw-base rounded-lg border border-fw-secondary p-1">
          {(['grid', 'list', 'topology'] as ViewMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`quick-action-btn p-2 transition-colors ${viewMode === mode ? 'text-white bg-fw-primary' : 'text-fw-disabled hover:text-fw-bodyLight'}`}
              title={`${mode.charAt(0).toUpperCase() + mode.slice(1)} View`}
            >
              {mode === 'grid'     && <LayoutGrid className="h-4 w-4" />}
              {mode === 'list'     && <List className="h-4 w-4" />}
              {mode === 'topology' && <Network className="h-4 w-4" />}
            </button>
          ))}
        </div>

        <div className="h-6 w-px bg-fw-secondary" />

        {canCreate && (
          <Button variant="primary" icon={PlusCircle} onClick={() => navigate('/create')} size="md" className="px-6">
            Create Connection
          </Button>
        )}
      </div>

      <div>
        {filteredRouters.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-fw-disabled">No cloud routers match your search criteria</p>
          </div>
        ) : viewMode === 'list' ? (
          <ListView routers={filteredRouters} highlightedConnectionId={highlightedConnectionId} />
        ) : viewMode === 'topology' ? (
          <div className="bg-fw-base rounded-2xl border border-fw-secondary p-6">
            <TopologyView routers={filteredRouters} />
          </div>
        ) : (
          <GridView routers={filteredRouters} isMinimized={areAllMinimized} />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ConnectionGrid.tsx
git commit -m "feat(manage): update ConnectionGrid to route over cloudRouters[] as primary entity"
```

---

## Task 10: Update App.tsx — pass routers prop

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Update ConnectionGrid call site in App.tsx**

Find the line in `App.tsx` that renders `<ConnectionGrid connections={safeConnections} />` and update it:

```typescript
// App.tsx — find and add cloudRouters selector near the connections selector
const cloudRouters = useStore(state => state.cloudRouters);

// Then update the render:
// Before:
<ConnectionGrid connections={safeConnections} />

// After:
<ConnectionGrid routers={cloudRouters} />
```

The `safeConnections` variable is still used by other consumers in `App.tsx` (monitoring dashboard, control center). Do not remove it.

- [ ] **Step 2: Fix TypeScript errors**

```bash
npx tsc --noEmit 2>&1
```

Resolve any type errors that appear. Common ones:
- `ConnectionGrid` prop mismatch if `Connection[]` prop was aliased somewhere
- `GridView`, `ListView`, `TopologyView` if they still have the old `connections` prop — those were already rewritten in Tasks 5-8

- [ ] **Step 3: Run all tests**

```bash
npx vitest run --reporter=verbose
```

Expected: all tests pass (no regressions).

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat(app): pass cloudRouters to ConnectionGrid"
```

---

## Task 11: Smoke test — verify in browser

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Verify Grid view**

Navigate to the Manage tab. Default view is List. Switch to Grid.

Confirm:
- 3 Cloud Router cards visible: AT&T Core East, AT&T Core West, AT&T Enterprise Hub
- Each card shows: router name, vendor chip, location, status badge, connection count pill ("2 connections"), BGP session metrics, latency
- "Show connections (2)" button at bottom of each card
- Clicking it reveals 2 `ConnectionSummaryRow` items with status badges and bandwidth
- Clicking a connection row navigates to `/connections/:id`
- "Hide connections" button collapses back to State 2
- "Minimize All" button collapses all to 88px State 1 rows

- [ ] **Step 3: Verify List view**

Switch to List view.

Confirm:
- 3 router header rows (darker background, chevron, router name, vendor, location, status badge, connection count)
- Each router row expands/collapses on click
- Connection child rows indented under their router
- Column visibility gear icon works
- Sort by Name sorts within each router group
- Clicking a connection row navigates to `/connections/:id`

- [ ] **Step 4: Verify Topology view**

Switch to Topology view.

Confirm:
- 3 topology cards: one per router
- Each card shows AT&T Core → Cloud Router → 2 cloud endpoints
- Active connections show solid blue lines; Pending connections show dashed gray lines
- "View router" link navigates to `/cloud-routers/:id`

- [ ] **Step 5: Verify search**

Type "Azure" in the search box.

Confirm: AT&T Enterprise Hub card appears (because it contains the Azure ExpressRoute connection). AT&T Core East and AT&T Core West should be filtered out.

Type "AT&T Core West" in the search box.

Confirm: Only AT&T Core West appears (router name match).

- [ ] **Step 6: Verify connection detail page is not broken**

Click through to any connection detail. Confirm the Topology tab in `ConnectionOverview` still renders the single-connection MiniTopology correctly (legacy mode).

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat(manage): cloud router-centric manage page — complete"
```
