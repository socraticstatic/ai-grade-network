# Visual Designer Rebuild - Design Spec

**Date:** 2026-03-21
**Status:** Draft
**Context:** Stakeholder prototype - AT&T NetBond SDCI

## Purpose

Rebuild the Visual Designer (Network Designer) to model the functionality of [Cloud_Designer](https://socraticstatic.github.io/Cloud_Designer/) while applying the Figma UI and Flywheel Design Library standards. This is a stakeholder demo, not a production system. The designer must look and feel like a real tool without requiring backend integration.

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Abstraction levels | Network View only | Core interaction; Global/Circuit views are Phase 2+ |
| Node taxonomy | Core with VNFs | Full function types, network types, cloud/DC providers. VNFs are important for stakeholder credibility |
| Interaction model | Floating right panels + templates drawer | Replaces bottom config panel. Validation lives in StatusBar |
| Maximize behavior | App-level takeover | Hides nav/sidebar/header. Canvas fills viewport. Floating exit button |
| Approach | Rebuild using Cloud_Designer as reference | Clean integration with NetBond patterns. Flywheel-native from the start |
| Fidelity | Stakeholder mock | Config panels show realistic fields. Validation shows plausible scenarios. No backend wiring needed |

## Architecture

### State Management

Migrate from local `useState` to a dedicated Zustand store.

```typescript
// store/useDesignerStore.ts
interface DesignerState {
  // Canvas
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  panOffset: { x: number; y: number };
  zoomLevel: number;

  // Selection
  selectedNodeId: string | null;
  selectedEdgeId: string | null;

  // Modes
  isCreatingEdge: boolean;
  edgeStartNodeId: string | null;
  isMaximized: boolean;

  // History
  history: { nodes: NetworkNode[][]; edges: NetworkEdge[][]; currentIndex: number };

  // Actions
  addNode: (type: string, functionType: string, position?: { x: number; y: number }) => void;
  updateNode: (id: string, updates: Partial<NetworkNode>) => void;
  removeNode: (id: string) => void;
  moveNode: (id: string, x: number, y: number) => void;
  addEdge: (source: string, target: string) => void;
  updateEdge: (id: string, updates: Partial<NetworkEdge>) => void;
  removeEdge: (id: string) => void;
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  undo: () => void;
  saveToHistory: () => void;
  clearCanvas: () => void;
  toggleMaximize: () => void;
  setPanOffset: (offset: { x: number; y: number }) => void;
  setZoomLevel: (level: number) => void;
  startEdgeCreation: () => void;
  cancelEdgeCreation: () => void;
  loadTemplate: (nodes: NetworkNode[], edges: NetworkEdge[]) => void;
}
```

### Custom Hooks (following Cloud_Designer pattern)

| Hook | Responsibility |
|------|---------------|
| `useNetworkManager` | CRUD operations for nodes and edges. Wraps store actions with business logic (e.g., deleting a node cascades to its edges) |
| `useSelectionManager` | Tracks selected node/edge. Controls floating panel visibility. Handles click-to-select and click-canvas-to-deselect |
| `useEdgeCreator` | Edge creation workflow: toggle mode, capture source click, capture target click, create edge, exit mode |
| `useNetworkHistory` | Undo/redo. Snapshots state after each mutation. Exposes `undo()` and `canUndo` |

### Node Type System

```typescript
// types/designer.ts
interface NetworkNode {
  id: string;
  type: 'function' | 'destination' | 'network' | 'datacenter';
  functionType: string;         // e.g., 'router', 'firewall', 'vnf', 'sdwan', 'flexware'
  subType?: string;             // e.g., 'cloud', 'physical', 'ngfw', 'load-balancer'
  cloudProvider?: string;       // 'aws' | 'azure' | 'gcp' | 'oracle'
  dcProvider?: string;          // 'equinix' | 'digital-realty' | etc.
  x: number;
  y: number;
  name: string;
  icon: string;                 // Lucide icon name (resolved at render time)
  status: 'active' | 'inactive';
  config: Record<string, any>;  // Type-specific config fields
}

interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  type: string;                 // 'mpls' | 'direct-connect' | 'expressroute' | etc.
  bandwidth: string;
  status: 'active' | 'inactive';
  vlan?: number;
  metrics?: {
    latency?: string;
    throughput?: string;
    packetLoss?: string;
  };
  config?: {
    resilience?: 'single' | 'redundant' | 'ha' | 'dual-diverse';
    encrypted?: boolean;
    qosProfile?: string;
  };
}
```

### Node Taxonomy (constants/nodeTypes.ts)

```typescript
const NODE_CATEGORIES = {
  function: {
    label: 'Network Functions',
    items: [
      { type: 'router', subtypes: ['cloud', 'physical', 'virtual', 'edge', 'core'] },
      { type: 'firewall', subtypes: ['ngfw', 'waf', 'stateful', 'ids-ips'] },
      { type: 'vnf', subtypes: ['router', 'firewall', 'load-balancer', 'ids', 'wan-optimizer', 'multifunction'] },
      { type: 'sdwan', subtypes: ['edge', 'controller', 'gateway'] },
      { type: 'flexware', subtypes: [] },  // AT&T uCPE
    ]
  },
  network: {
    label: 'Network Types',
    items: [
      { type: 'internet', label: 'Internet' },
      { type: 'avpn', label: 'AT&T AVPN (MPLS)' },
      { type: 'ase', label: 'AT&T ASE (L2 Ethernet)' },
      { type: 'adi', label: 'AT&T ADI (Dedicated Internet)' },
      { type: 'wavelength', label: 'AT&T Wavelength' },
      { type: 'ipe', label: 'AT&T Core (IPE)' },
    ]
  },
  cloud: {
    label: 'Cloud Providers',
    items: [
      { provider: 'aws', label: 'AWS (Direct Connect)' },
      { provider: 'azure', label: 'Azure (ExpressRoute)' },
      { provider: 'gcp', label: 'Google Cloud (Interconnect)' },
      { provider: 'oracle', label: 'Oracle Cloud (FastConnect)' },
    ]
  },
  datacenter: {
    label: 'Data Centers',
    items: [
      { provider: 'equinix', label: 'Equinix' },
      { provider: 'digital-realty', label: 'Digital Realty' },
      { provider: 'cyrusone', label: 'CyrusOne' },
      { provider: 'coresite', label: 'CoreSite' },
      { provider: 'databank', label: 'DataBank' },
    ]
  }
};
```

### Edge Type Colors (constants/edgeTypes.ts)

Following Cloud_Designer's service-aware color scheme:

| Type | Color | Service |
|------|-------|---------|
| MPLS | Blue (#3b82f6) | AT&T AVPN |
| Direct Connect | Orange (#f97316) | AWS |
| ExpressRoute | Indigo (#6366f1) | Azure |
| Cloud Interconnect | Purple (#8b5cf6) | GCP |
| FastConnect | Red (#ef4444) | Oracle |
| Ethernet | Cyan (#06b6d4) | AT&T ASE |
| Dark Fiber | Purple (#a855f7) | Private |
| Wavelength | Teal (#14b8a6) | AT&T Optical |

### Canvas Bounds (constants/canvasBounds.ts)

```typescript
const CANVAS_BOUNDS = {
  GRID_SIZE: 20,
  SAFE_AREA: { TOP: 56, BOTTOM: 64, LEFT: 72, RIGHT: 56 },
  NODE_SIZE: 64,
  MAX_Y: 800,
  ZOOM_LIMITS: { MIN: 0.5, MAX: 3.0 },
  EDGE_SNAP_RADIUS: 50,
};
```

### Validation Engine (engine/validationEngine.ts)

Rules ported from Cloud_Designer, tuned for demo plausibility:

| Rule | Severity | Description |
|------|----------|-------------|
| Orphan node | Error | Node with no connections |
| Cloud without Cloud Router | Error | Cloud destination not connected through a Cloud Router |
| Cloud Router without IPE | Error | Cloud Router not connected to AT&T Core |
| DC direct to cloud | Error | Datacenter connected directly to cloud (needs router) |
| Single point of failure | Warning | Only one connection between critical nodes |
| No redundancy | Warning | Critical link has no backup path |
| No firewall | Warning | Topology has no security appliance |
| Suggest dual routers | Info | Multiple destinations could benefit from redundant routing |
| Suggest SDWAN | Info | Multiple transport types detected |

Results display in StatusBar. Click to expand details.

## Component Design

### Canvas (Canvas.tsx)

Rebuilt with pan and zoom support. SVG layer for edges, HTML overlay for nodes. Grid renders as radial gradient dots with accent lines every 100px.

**Pan:** Right-click drag or middle-mouse button. Tracks `panOffset` in store.
**Zoom:** Mouse wheel. ZoomControls component for +/- buttons. Range 0.5x to 3x.
**Coordinates:** All positions adjusted for pan offset and zoom level during drag operations.

### Node (Node.tsx)

Draggable HTML element with 6 interaction states (from Cloud_Designer):
1. Default - idle appearance
2. Hover - subtle highlight
3. Selected - blue border, shows config panel
4. Dragging - slight scale + shadow
5. Edge-creation target - pulsing highlight when hovering during edge creation
6. Error - red outline when validation fails

Double-click to rename inline. Icon resolved from Lucide by `functionType`.

### Edge (Edge.tsx)

Quadratic Bezier curves. Arrow marker at target. Inline label showing type and bandwidth. Color determined by edge type (service-aware). Status indicator dot (green active, gray inactive).

Hover: 20px invisible hit area for easy clicking. Selected state: thicker stroke + glow.

### Toolbar (Toolbar.tsx)

Bottom-center floating pill bar. Matches current Figma pattern (rounded-full, shadow, border).

**Left section** (separated by divider):
- Add Node dropdown - categorized menu matching NODE_CATEGORIES. Click category to expand, click item to place node at center of visible canvas area.

**Action section:**
- Connect toggle (starts/cancels edge creation mode)
- Undo
- Save template (opens SaveTemplateModal)
- Export PDF
- Clear canvas (confirmation toast)

**Right section:**
- Create Connections button (converts topology to Connection objects)

### StatusBar (StatusBar.tsx)

Top-center floating pill. Shows:
- Node count + edge count
- Active edges count
- Validation summary (X errors, Y warnings) - click to expand dropdown with categorized issues
- Refresh button

### Floating Panels

**NodeConfigPanel** - appears on right when node selected:
- Node name (editable)
- Node type + subtype (read-only badges)
- Tabbed config sections:
  - **Overview:** Location, status, basic properties
  - **Routing:** ASN, BGP, routing protocol, BFD (for routers/VNFs)
  - **Security:** Encryption, DDoS, inspection (for firewalls/VNFs)
  - **Performance:** Latency target, QoS profile, bandwidth allocation
- Delete button in header
- Close button (X)

**EdgeConfigPanel** - appears on right when edge selected:
- Connection type dropdown
- Bandwidth tier selector
- Resilience dropdown (single/redundant/HA/dual-diverse)
- Status toggle
- VLAN ID input
- Metrics display (read-only, mock data)
- Delete button

All panels styled with Flywheel tokens: `bg-fw-base`, `border-fw-secondary`, `rounded-2xl`, `shadow-lg`. Form fields use standard `h-9`, `text-figma-base`, `rounded-lg`.

### Templates Drawer (TemplatesDrawer.tsx)

Triggered from toolbar. Slides in from left or opens as modal.

Pre-built templates:
- High Availability (dual Cloud Router to IPE)
- Cloud-to-Cloud Local
- Internet-to-Cloud
- SD-WAN Hybrid
- Dual Diverse HA
- Simple VNF Chain

Each template is a card with: name, description, node/edge count, preview thumbnail. Click to load (replaces canvas with confirmation).

### Maximize Mode

When `isMaximized` is true:
1. NetworkDesigner renders with `fixed inset-0 z-50` - covers entire viewport
2. Parent app shell (MainNav, sidebar, page header) is hidden via a CSS class or context flag
3. A floating "Minimize" button appears (top-right or bottom-right)
4. StatusBar and Toolbar remain visible within the maximized canvas
5. Clicking Minimize restores the embedded view

Implementation: The `isMaximized` flag lives in the Zustand store. NetworkDesigner checks it and conditionally applies fullscreen positioning. A context or CSS class (`designer-maximized`) on the app root hides the shell chrome.

## File Structure

```
src/components/network-designer/
├── NetworkDesigner.tsx          # orchestrator
├── Canvas.tsx                   # pan/zoom/grid SVG+HTML
├── Node.tsx                     # draggable node with 6 states
├── Edge.tsx                     # bezier edge + service colors
├── Toolbar.tsx                  # bottom floating bar + add menu
├── StatusBar.tsx                # top validation + stats
├── ZoomControls.tsx             # +/- zoom buttons
├── panels/
│   ├── FloatingPanel.tsx        # panel container (position, animation)
│   ├── NodeConfigPanel.tsx      # node properties (tabbed)
│   └── EdgeConfigPanel.tsx      # edge properties
├── templates/
│   ├── TemplatesDrawer.tsx      # template browser
│   ├── SaveTemplateModal.tsx    # save custom template
│   ├── templateDefinitions.ts   # pre-built topology data
│   └── TemplateCard.tsx         # preview card component
├── store/
│   └── useDesignerStore.ts      # Zustand store
├── hooks/
│   ├── useNetworkManager.ts     # node/edge CRUD + cascade
│   ├── useSelectionManager.ts   # select/deselect + panel control
│   ├── useEdgeCreator.ts        # edge creation workflow
│   └── useNetworkHistory.ts     # undo/redo snapshots
├── engine/
│   └── validationEngine.ts      # topology validation rules
├── constants/
│   ├── nodeTypes.ts             # NODE_CATEGORIES taxonomy
│   ├── edgeTypes.ts             # EDGE_TYPE_COLORS
│   └── canvasBounds.ts          # CANVAS_BOUNDS
└── types/
    └── designer.ts              # NetworkNode, NetworkEdge, etc.
```

## Phases

### Phase 1: Foundation
- Zustand store with full state shape
- Canvas with pan, zoom, grid rendering
- Node component with drag, snap, 6 interaction states
- Edge component with bezier curves and arrows
- Custom hooks (useNetworkManager, useSelectionManager, useEdgeCreator, useNetworkHistory)
- Undo/redo
- **Deliverable:** Draggable nodes, connectable with edges, pan/zoom canvas, undo

### Phase 2: Node Taxonomy and Toolbar
- NODE_CATEGORIES constant with full taxonomy (routers, firewalls, VNFs, SDWAN, FlexWare, networks, clouds, datacenters)
- EDGE_TYPE_COLORS with service-aware styling
- Toolbar rebuild with categorized add-node dropdown
- Edge creation toggle in toolbar
- Proper node icons per functionType
- Node placement logic (smart initial positioning by type)
- **Deliverable:** Full node palette, categorized toolbar, typed edges with colors

### Phase 3: Config Panels and Validation
- FloatingPanel container (positioned right, animated slide-in)
- NodeConfigPanel with tabbed config (Overview, Routing, Security, Performance)
- EdgeConfigPanel with bandwidth, type, resilience, metrics
- Validation engine with 9 rules
- StatusBar integration (click to expand validation details)
- Templates drawer with 6 pre-built topologies
- Save custom template modal
- **Deliverable:** Select-to-configure, real-time validation, template library

### Phase 4: Maximize and Polish
- App-level takeover (fixed positioning, hide app shell)
- Minimize button to restore embedded view
- PDF export (jsPDF + html2canvas)
- Keyboard shortcuts (Delete, Ctrl+Z, Escape)
- Node double-click rename
- Animated transitions (100-300ms)
- Edge hover labels
- **Deliverable:** Fullscreen mode, export, keyboard shortcuts, polish

## Design System Compliance

All components use Flywheel Design Library tokens:
- Backgrounds: `bg-fw-base`, `bg-fw-wash`
- Borders: `border-fw-secondary`
- Text: `text-figma-base` (14px), `text-figma-sm` (12px), `text-figma-lg` (16px)
- Interactive: `text-fw-link`, `hover:bg-fw-wash`
- Cards: `rounded-2xl border border-fw-secondary`
- Form fields: `h-9 px-3 rounded-lg text-figma-base`
- Buttons: ghost variant for toolbar actions, primary for Create
- Toolbar: `rounded-full shadow-lg border border-fw-secondary`

## Migration Notes

- **Props contract:** The existing `NetworkDesigner` accepts `onComplete`, `onCancel`, `initialNodes`, `initialEdges`, `editMode`, and `connectionId`. The rebuilt component must preserve this interface or update call sites in `ConnectionWizard.tsx`.
- **Dropped components:** `ScenarioConsole.tsx` and `AIRecommendationEngine.tsx` are intentionally removed. They are not part of the Cloud_Designer-modeled experience.
- **Lazy loading:** Preserve the `LazyNetworkDesigner.tsx` wrapper for code splitting. It wraps the new component with Suspense and error boundary.
- **Template reconciliation:** Existing templates (7 files) will be replaced with the 6 new template definitions listed above. The `TemplateLoader.ts` pattern (dynamic imports with caching) should be preserved.

## What This Is Not

- Not a production network provisioning tool
- No backend API calls
- No real-time data sync
- Config fields are demonstrative, not wired to a provisioning engine
- Validation is rule-based display, not enforcement
- Templates are static data, not dynamically generated
