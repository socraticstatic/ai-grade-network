# NetBond Advanced - Full App Quality Pass

## Context

AT&T NetBond SDCI prototype. React/TypeScript UX validation app for cloud connectivity management. Mock data only - no databases, no APIs. Dual audience: AT&T leadership (polish) and engineering team (patterns for Angular port).

## Goal

Every flow in the app works end-to-end with no dead-ends, no console errors, no broken states. The app is presentable to leadership and useful as a reference for engineering.

## Approach

Top-down by user flow. Each phase produces a presentable increment. Critical bugs fixed as part of making each flow solid.

---

## Phase 1: Foundation

Kill everything that makes the app look broken regardless of which flow you're in.

### Scope

- Set `DEBUG_DRAG = false` in `src/components/network-designer/Node.tsx:23`
- Remove/guard ~35 `console.log` debug statements across 17 files (keep `console.error` in catch blocks)
- Fix keyboard shortcuts navigating to wrong routes in `src/components/common/GlobalKeyboardShortcuts.tsx`:
  - `/connections` -> `/manage`
  - `/monitoring` -> `/monitor`
- Fix GitHub Pages asset paths to use relative paths under `/NetBond_Advanced/`:
  - `index.html`: favicon, manifest, tile image paths
  - PWA scope configuration
- Remove hardcoded demo user reset that overwrites connection status on every reload (`src/store/slices/connectionSlice.ts`)
- Remove dead `MobileMenu` render with `isOpen={false}` in `App.tsx`
- Delete `src_old/` duplicate test directories

### Success Criteria

- Zero `console.log` output on app load and basic navigation
- Keyboard shortcuts navigate to correct pages
- GitHub Pages deploy serves all assets (no 404s on icons/manifest)
- No visible dead UI elements

---

## Phase 2: Visual Designer Flow

The star feature. Add nodes, drag, connect, configure, simulate, create connections.

### Critical Fixes

- **Undo broken:** `useNetworkHistory.undo()` return value is never consumed by NetworkDesigner. Wire return value to `setNodes`/`setEdges`.
- **History drawer empty:** `NetworkDesigner.tsx:661` passes `history={[]}`. Connect to actual history state from `useNetworkHistory`.
- **Node config panels don't render for some node types:** `NodeConfigPanel.tsx` routing tab (line 478) checks `node.type === 'router'` and security tab (lines 544, 564) checks `node.type === 'source'`. Verify which types the toolbar's `addNode` actually creates. If toolbar creates `type: 'function'` with `functionType: 'Router'` instead of `type: 'router'`, the config panels won't show. Align the type checks with actual node creation logic.
- **Spacebar pan jumps:** `Canvas.tsx:141-149` creates synthetic `MouseEvent` with `clientX=0, clientY=0`. Use last-known mouse position instead.

### High-Priority Fixes

- Fix zoom limits mismatch: Canvas hardcodes 0.5-2, constants define max 3. Use `CANVAS_BOUNDS` constants.
- Replace hardcoded magic numbers with constants throughout NetworkDesigner and Canvas.
- Fix VLAN input `parseInt` with no NaN guard in `EdgeConfigPanel.tsx:138`.
- Fix shallow config merge: `useNetworkManager.ts:62` only merges one level deep.
- Fix simulation unmount cleanup: cancel running simulation on component unmount in `runSimulation.ts`.
- Fix custom template persistence: save/load from localStorage.
- Fix template serialization: store icon name strings instead of Lucide component references. Resolve at render time.

### High-Priority Fixes (continued)

- Fix `panOffset` in Node.tsx drag effect dependency array (line 172). The drag handler re-registers on every pan frame, causing potential drag stutter or restart mid-drag. Remove `panOffset` from deps since `getBoundingClientRect` already accounts for parent transforms.

### Performance

- Fix pan/zoom effect re-registering every frame: move pan state to refs in Canvas.tsx.

### Cleanup

- Remove dead Zustand store in `src/components/network-designer/store/`.
- Remove unused imports and orphaned components (verify each is truly unused before deleting).
- Remove duplicate `applyTemplateWithUniqueIds` in `useTemplatesManager.ts`.

### Success Criteria

- Add 3 nodes, drag each to position, connect them, configure each, run simulation, create connections - no errors
- Undo restores previous topology state
- History drawer shows past states
- Router and Source nodes show their config panels
- Spacebar pan moves canvas smoothly
- Custom templates persist across page reload

---

## Phase 3: Create Connection Flow

Three paths from Create Connection: Visual Designer, Wizard, API Toolbox.

### Scope

- **Visual Designer path:** Verify `handleCreateConnections` adds connections to store and navigates to Manage. (Mostly covered by Phase 2.)
- **Wizard path:** Audit each wizard screen for completeness. Remove 7 `console.log` statements. Verify `onComplete` matches store's `addConnection` interface.
- **API Toolbox path:** Verify JSON config maps to valid connection object and creates successfully.
- **All paths:** Verify landing back on Manage page with new connection visible. Verify Create nav item is active on `/create`.

### Success Criteria

- Each of the three paths creates a connection that appears in the Manage grid
- No console errors during any creation flow
- Navigation state is correct throughout

---

## Phase 4: Manage Flow

Landing page. Connection grid, details, VLAN, VNF, links.

### Scope

- Verify connection grid renders all mock connections with correct status, bandwidth, usage
- Search and filter work
- ConnectionDetails: all tabs render content
- VLAN management: list, add, edit, delete
- VNF management: list, view details
- Links tab renders
- Edit connection: navigates to Visual Designer in edit mode with topology pre-loaded
- Delete connection: removes from grid with confirmation
- Grid/List/Topology view toggles all render
- Connection visualization (mini topology on card) renders correctly

### Polish

- Empty states for zero connections, VLANs, VNFs
- Toast confirmations on create, update, delete

### Success Criteria

- Click through every tab and action on a connection without dead-ends
- Edit flow round-trips through Visual Designer and back
- Delete removes and confirms
- All view modes render

---

## Phase 5: Monitor Flow

Dashboard, charts, alerts, metrics.

### Scope

- MonitoringDashboard renders with mock metric data
- Time range selector works (1h, 6h, 24h, 7d, 30d)
- All chart types render: bandwidth, latency, packet loss, throughput
- Alerts list populates with mock alerts
- Alert severity filtering works
- Click alert to see details
- Refresh button triggers visual feedback
- Chart data hooks return sensible mock data at every time range
- Mobile monitoring view works at tablet/mobile breakpoints

### Polish

- Loading states while "fetching" metrics
- Empty states if no alerts

### Success Criteria

- Every chart renders data at every time range
- Alert filtering narrows the list correctly
- No blank panels or missing data

---

## Phase 6: Configure Flow

Admin section. Users, groups, policies, billing, partners, reporting, system.

### Scope

- ConfigureHub renders all sub-sections as navigable cards/tabs
- Users: list, add, edit, delete, role assignment
- Groups: list, create, manage membership
- Policies: bandwidth scaling, routing, security render and save
- Billing: invoices, usage, payment methods render
- Partners: partner list renders
- Reporting: reports render
- System: settings, audit logs render
- Verify every sub-route under `/configure/*` resolves
- Verify tenant route ordering (`/configure/platform/tenants/:id/*` before `/configure/*`). Note: React Router v6 ranks routes by specificity automatically, so this may self-resolve. Verify at runtime.
- Remove `console.log` in BandwidthScalingPolicy.tsx

### Polish

- Consistent empty states across all admin panels
- Confirmation dialogs on destructive actions

### Success Criteria

- Every Configure sub-section is reachable and renders content
- No 404s within Configure
- CRUD operations complete with feedback

---

## Phase 7: Pools Flow

Group/pool management.

### Scope

- GroupGrid renders all mock pools with member counts, status
- Search and filter pools
- Pool detail view with widgets (bandwidth allocation, members, utilization)
- Add/remove connections from pool
- Create and delete pools
- Pool CRUD updates store and reflects in grid immediately

### Polish

- Empty state for zero pools
- Toast confirmations on pool actions

### Success Criteria

- Create pool, add connections, view details, delete pool - full cycle works
- No blank widgets or missing data

---

## Phase 8: Cross-cutting Quality

Spans the full app. Ordered by impact.

### Test Suite

- Delete `src_old/` directories (done in Phase 1)
- Fix or remove broken test imports (missing `../test/utils`, wrong component paths)
- Fix `addConnection` store test root cause
- Add content to empty ConnectionWizard test files or remove them
- Target: all remaining tests pass green

### Type Safety

- Eliminate 47 `as any` casts with proper types
- Replace 20 `Record<string, any>` with typed interfaces
- Consolidate duplicate type names (`ConnectionConfig`, `ViewMode`, `Toast`)
- Export missing types from `types/index.ts` barrel
- Type `icon` field on NetworkNode as `React.ComponentType`

### Accessibility

- Add `aria-live="polite"` to ToastContainer
- Add skip-link to main content
- Add keyboard navigation for canvas (arrow keys, Tab, Enter)
- Add `aria-pressed`/`aria-current` to toggle buttons
- Guard keyboard shortcuts against firing during text input
- Add text alternatives for color-only status indicators

### Performance

- Throttle localStorage persistence to meaningful changes only
- Debounce resize listeners
- Memoize expensive computations in StatusBar and EdgeControls
- Code-split large configure and vendor chunks

### Error Handling

- Add per-section error boundaries
- Strip component stack traces from production error boundary UI
- Add retry mechanism for failed lazy imports

### Success Criteria

- Test suite: 0 failures
- Zero `as any` in production code
- Lighthouse accessibility score > 90
- No jank on resize or rapid interaction
- Section crash doesn't nuke the whole app
