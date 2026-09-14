# Foundation + Visual Designer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all foundation-level bugs across the app, then make the Visual Designer flow work end-to-end without errors.

**Architecture:** Phase 1 fixes cross-cutting issues (debug logging, wrong routes, asset paths, dead code). Phase 2 fixes Visual Designer bugs in dependency order: undo/history first (needed for testing other fixes), then config panels, canvas interactions, templates, simulation. No new features - only fixing what's broken.

**Tech Stack:** React 18, TypeScript, Zustand, Vite, Tailwind CSS, Vitest

**Spec:** `docs/superpowers/specs/2026-03-20-full-app-quality-pass-design.md`

---

## File Map

### Phase 1 files (modify only):
- `src/components/network-designer/Node.tsx` - disable debug flag
- `src/components/common/GlobalKeyboardShortcuts.tsx` - fix routes
- `index.html` - fix asset paths
- `src/store/useStore.ts` - remove demo reset and console.logs
- `src/App.tsx` - remove dead MobileMenu
- `src/main.tsx` - remove console.logs
- 14 additional files with console.log statements (see Task 2)

### Phase 2 files (modify only):
- `src/hooks/useNetworkHistory.ts` - fix undo/redo stale closure
- `src/components/network-designer/NetworkDesigner.tsx` - wire undo, fix history drawer
- `src/components/network-designer/NodeConfigPanel.tsx` - fix type checks
- `src/components/network-designer/Canvas.tsx` - fix spacebar pan, zoom limits, perf
- `src/components/network-designer/Node.tsx` - fix panOffset dep
- `src/components/network-designer/EdgeConfigPanel.tsx` - fix VLAN NaN
- `src/hooks/useNetworkManager.ts` - fix config merge
- `src/components/network-designer/simulation/runSimulation.ts` - add cleanup
- `src/components/network-designer/types.ts` - type icon field

### Phase 2 files (delete):
- `src/components/network-designer/store/useStore.ts` - dead Zustand store
- `src/components/network-designer/store/` - dead directory

### Phase 2 files (modify - templates):
- `src/hooks/useTemplatesManager.ts` - remove duplicate function, keep drawer state
- `src/components/network-designer/types.ts` - icon field as string for serialization
- `src/components/network-designer/NetworkDesigner.tsx` - template localStorage persistence
- `src/components/network-designer/panels/TemplatesDrawer.tsx` - icon string resolution at render

---

## PHASE 1: FOUNDATION

### Task 1: Disable debug logging in Node.tsx

**Files:**
- Modify: `src/components/network-designer/Node.tsx:23`

- [ ] **Step 1: Change DEBUG_DRAG to false**

```typescript
// Line 23: change from
const DEBUG_DRAG = true;
// to
const DEBUG_DRAG = false;
```

- [ ] **Step 2: Verify no debug console output**

Run: Open browser at dev server URL, open DevTools console, navigate to Create > Visual Designer, drag a node.
Expected: No `[Node Debug]` messages in console.

- [ ] **Step 3: Commit**

```bash
git add src/components/network-designer/Node.tsx
git commit -m "fix: disable debug drag logging in Node.tsx"
```

---

### Task 2: Remove console.log statements across codebase

**Files (33 console.log statements across 16 files):**
- Modify: `src/store/useStore.ts:83,92,100`
- Modify: `src/store/slices/detachedWindowSlice.ts:216,256`
- Modify: `src/store/slices/fontSizeSlice.ts:139,174`
- Modify: `src/store/slices/columnVisibilitySlice.ts:73,86,96,107,177,260`
- Modify: `src/main.tsx:23,26`
- Modify: `src/utils/windowSync.ts:57,62,247`
- Modify: `src/utils/performanceOptimizations.ts:90,93`
- Modify: `src/utils/storageQuotaManager.ts:198,243`
- Modify: `src/utils/localStorageUtils.ts:176,220`
- Modify: `src/components/ConnectionGrid.tsx:70`
- Modify: `src/components/wizard/ConnectionWizard.tsx:113,132,136,178`
- Modify: `src/components/connection/ConnectionVisualization.tsx:226`
- Modify: `src/components/configure/policies/tabs/BandwidthScalingPolicy.tsx:127`
- Modify: `src/components/monitoring/shared/BaseMetricsView.tsx:42`
- Modify: `src/components/network-designer/panels/ReactiveAIPanel.tsx:252`
- Modify: `src/hooks/useVNFSync.ts:60`

- [ ] **Step 1: Remove or comment out all console.log statements**

**Rule:** Keep `console.error` and `console.warn` in catch blocks. Remove all `console.log` calls. For statements that are useful for future debugging, replace with a no-op that can be re-enabled:

```typescript
// Replace: console.log('[Store Init] Merged connections:', mergedConnections);
// With: nothing (delete the line)
```

- [ ] **Step 2: Verify with grep that no console.log remains**

Run: `grep -r "console.log" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v console.error | grep -v console.warn | wc -l`
Expected: 0

Also open browser DevTools console, navigate to Create, Manage, Monitor. Confirm zero console.log output.

- [ ] **Step 3: Commit**

```bash
git add src/store/useStore.ts src/store/slices/detachedWindowSlice.ts src/store/slices/fontSizeSlice.ts src/store/slices/columnVisibilitySlice.ts src/main.tsx src/utils/windowSync.ts src/utils/performanceOptimizations.ts src/utils/storageQuotaManager.ts src/utils/localStorageUtils.ts src/components/ConnectionGrid.tsx src/components/wizard/ConnectionWizard.tsx src/components/connection/ConnectionVisualization.tsx src/components/configure/policies/tabs/BandwidthScalingPolicy.tsx src/components/monitoring/shared/BaseMetricsView.tsx src/components/network-designer/panels/ReactiveAIPanel.tsx src/hooks/useVNFSync.ts
git commit -m "fix: remove 33 console.log debug statements across 16 files"
```

---

### Task 3: Fix keyboard shortcuts navigating to wrong routes

**Files:**
- Modify: `src/components/common/GlobalKeyboardShortcuts.tsx:71,81`

- [ ] **Step 1: Read the file and identify wrong routes**

Read the full file. Cross-reference each `navigate()` call against routes in `src/App.tsx`.

Known issues:
- Line 71: `navigate('/connections')` should be `navigate('/manage')`
- Line 81: `navigate('/monitoring')` should be `navigate('/monitor')`

Verify all other navigate calls match actual routes in App.tsx.

- [ ] **Step 2: Fix the routes**

```typescript
// Line 71: change
navigate('/connections');
// to
navigate('/manage');

// Line 81: change
navigate('/monitoring');
// to
navigate('/monitor');
```

- [ ] **Step 3: Verify shortcuts work**

Run: Open browser, press the shortcut keys for each navigation item.
Expected: Each shortcut navigates to the correct page (not 404)

- [ ] **Step 4: Commit**

```bash
git add src/components/common/GlobalKeyboardShortcuts.tsx
git commit -m "fix: keyboard shortcuts navigate to correct routes"
```

---

### Task 4: Fix GitHub Pages asset paths in index.html

**Files:**
- Modify: `index.html:18-20,23,36-37`

- [ ] **Step 1: Change absolute paths to relative**

```html
<!-- Line 18: change from -->
<link rel="icon" type="image/png" sizes="32x32" href="/icon-192x192.png">
<!-- to -->
<link rel="icon" type="image/png" sizes="32x32" href="./icon-192x192.png">

<!-- Line 19: change from -->
<link rel="icon" type="image/png" sizes="16x16" href="/icon-192x192.png">
<!-- to -->
<link rel="icon" type="image/png" sizes="16x16" href="./icon-192x192.png">

<!-- Line 20: change from -->
<link rel="apple-touch-icon" sizes="180x180" href="/icon-192x192.png">
<!-- to -->
<link rel="apple-touch-icon" sizes="180x180" href="./icon-192x192.png">

<!-- Line 23: change from -->
<link rel="manifest" href="/manifest.json">
<!-- to -->
<link rel="manifest" href="./manifest.json">

<!-- Line 36: change from -->
<meta name="msapplication-TileImage" content="/icon-144x144.png">
<!-- to -->
<meta name="msapplication-TileImage" content="./icon-144x144.png">

<!-- Line 37: change from -->
<meta name="msapplication-config" content="/browserconfig.xml">
<!-- to -->
<meta name="msapplication-config" content="./browserconfig.xml">
```

- [ ] **Step 2: Check PWA scope configuration**

The spec mentions "PWA scope configuration." Check if `manifest.json` exists in the project root. If it does, update `scope` and `start_url` to use relative paths (`./`). If it doesn't exist (current state: no manifest.json in repo), skip this step - the link in index.html already points to `./manifest.json` which will 404 harmlessly.

- [ ] **Step 3: Verify build serves assets**

Run: `npx vite build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "fix: use relative asset paths for GitHub Pages subdirectory deployment"
```

---

### Task 5: Remove demo reset in useStore.ts

**Note:** The spec says this code is in `src/store/slices/connectionSlice.ts`, but it's actually in `src/store/useStore.ts:95-107`. The plan path is correct.

**Files:**
- Modify: `src/store/useStore.ts:95-107`

- [ ] **Step 1: Remove the demo reset block**

Delete the block at lines 95-107 that resets `conn-aws-pending-1` to `Pending` status on every page reload. Connection status should persist from localStorage.

- [ ] **Step 2: Verify connections persist across reload**

Run: Open app, change a connection status (if UI allows), refresh page.
Expected: Status is preserved, not reset to Pending

- [ ] **Step 3: Commit**

```bash
git add src/store/useStore.ts
git commit -m "fix: remove demo reset that overwrites connection status on reload"
```

---

### Task 6: Remove dead MobileMenu render in App.tsx

**Files:**
- Modify: `src/App.tsx:477-482`

- [ ] **Step 1: Remove the dead MobileMenu component**

Delete the MobileMenu JSX block that renders with `isOpen={false}` and `onClose={() => {}}`. This is dead code - it renders invisible DOM that's never opened.

```tsx
// Delete these lines (477-482):
<MobileMenu
  isOpen={false}
  onClose={() => {}}
  userInfo={userInfo}
  notifications={3}
/>
```

Also remove the `MobileMenu` import if it's no longer used elsewhere in the file.

- [ ] **Step 2: Verify app still renders**

Run: Refresh browser, navigate between pages.
Expected: No errors, no visible change (component was invisible anyway)

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "fix: remove dead MobileMenu render with hardcoded isOpen=false"
```

---

### Task 7: Delete src_old/ duplicate test directories

**Files:**
- Delete: `src_old/` (entire directory)

- [ ] **Step 1: Verify src_old contains only duplicates**

Run: `ls -la src_old/` and compare against `src/`. These are old copies of store and component tests that multiply test failures.

- [ ] **Step 2: Delete src_old/**

```bash
rm -rf src_old/
```

- [ ] **Step 3: Run tests to verify reduced failure count**

Run: `npx vitest run 2>&1 | tail -10`
Expected: Significantly fewer test file failures (most of the 55 failing files were in src_old)

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "fix: delete src_old/ duplicate test directories reducing test failures"
```

---

## PHASE 2: VISUAL DESIGNER

### Task 8: Fix undo/redo stale closure in useNetworkHistory

**Files:**
- Modify: `src/hooks/useNetworkHistory.ts:17-45`

- [ ] **Step 1: Read the current implementation**

Read `src/hooks/useNetworkHistory.ts` fully. The bug: `undo()`, `redo()`, and `saveToHistory()` all use `history` from the closure, not functional updater form of `setHistory`. Rapid calls read stale state.

- [ ] **Step 2: Fix all three functions to use functional updater with ref for return value**

**Important:** React 18 may batch `setState` updaters asynchronously. A local `let result` variable set inside the updater callback could still be `null` when the function returns. Use a `useRef` to safely pass the result out.

Add a ref at the top of the hook:

```typescript
const undoRedoResult = useRef<{ nodes: NetworkNode[]; edges: NetworkEdge[] } | null>(null);
```

Replace the implementations:

```typescript
const saveToHistory = (newNodes: NetworkNode[], newEdges: NetworkEdge[]) => {
  setHistory(prev => ({
    nodes: [...prev.nodes.slice(0, prev.currentIndex + 1), [...newNodes]],
    edges: [...prev.edges.slice(0, prev.currentIndex + 1), [...newEdges]],
    currentIndex: prev.currentIndex + 1
  }));
};

const undo = () => {
  undoRedoResult.current = null;
  setHistory(prev => {
    if (prev.currentIndex > 0) {
      const newIndex = prev.currentIndex - 1;
      undoRedoResult.current = {
        nodes: [...prev.nodes[newIndex]],
        edges: [...prev.edges[newIndex]]
      };
      return { ...prev, currentIndex: newIndex };
    }
    return prev;
  });
  return undoRedoResult.current;
};

const redo = () => {
  undoRedoResult.current = null;
  setHistory(prev => {
    if (prev.currentIndex < prev.nodes.length - 1) {
      const newIndex = prev.currentIndex + 1;
      undoRedoResult.current = {
        nodes: [...prev.nodes[newIndex]],
        edges: [...prev.edges[newIndex]]
      };
      return { ...prev, currentIndex: newIndex };
    }
    return prev;
  });
  return undoRedoResult.current;
};
```

**Note:** The `useRef` approach works because React's `flushSync` behavior in event handlers ensures the updater runs synchronously in most cases. For extra safety, the consuming code in Task 9 should handle `null` return gracefully.

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useNetworkHistory.ts
git commit -m "fix: use functional updater in useNetworkHistory to prevent stale closure"
```

---

### Task 9: Wire undo return value in NetworkDesigner

**Files:**
- Modify: `src/components/network-designer/NetworkDesigner.tsx:583-584`

- [ ] **Step 1: Read how undo is currently wired**

Line 583: `onCancel={undo}` passes `undo` directly to Toolbar's `onCancel` prop. The return value (the restored nodes/edges) is never used to update state.

- [ ] **Step 2: Create a handler that consumes the return value**

Add a handler function near the other handlers:

```typescript
const handleUndo = () => {
  const restored = undo();
  if (restored) {
    setNodes(restored.nodes);
    setEdges(restored.edges);
    clearSelection();
  }
};
```

Then wire it:

```typescript
// Line 583: change from
onCancel={undo}
// to
onCancel={handleUndo}
```

- [ ] **Step 3: Verify undo works**

Run: Open Visual Designer, add 2 nodes, click undo.
Expected: Last node is removed. Click undo again, first node removed.

- [ ] **Step 4: Commit**

```bash
git add src/components/network-designer/NetworkDesigner.tsx
git commit -m "fix: wire undo return value to restore nodes/edges state"
```

---

### Task 10: Fix History drawer receiving empty array

**Files:**
- Modify: `src/components/network-designer/NetworkDesigner.tsx:661`

- [ ] **Step 1: Read useNetworkHistory exports**

Check what history state the hook exposes. We need to pass the actual history entries to the HistoryDrawer.

- [ ] **Step 2: Expose history from useNetworkHistory**

If `useNetworkHistory` doesn't already export the history state, add it:

```typescript
// In useNetworkHistory.ts, add to the return object:
return { saveToHistory, undo, redo, canUndo, canRedo, history };
```

- [ ] **Step 3: Wire history to HistoryDrawer**

```typescript
// In NetworkDesigner.tsx, destructure history from the hook:
const { saveToHistory, undo, canUndo, history: networkHistory } = useNetworkHistory();

// Line 661: change from
history={[]}
// to
history={networkHistory.nodes.map((nodes, index) => ({
  id: `history-${index}`,
  timestamp: new Date().toISOString(),
  label: `State ${index + 1}`,
  nodes: nodes,
  edges: networkHistory.edges[index] || []
}))}
```

- [ ] **Step 4: Verify history drawer shows entries**

Run: Open Visual Designer, add nodes, open History drawer.
Expected: Drawer shows history entries, not "No topology history yet."

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useNetworkHistory.ts src/components/network-designer/NetworkDesigner.tsx
git commit -m "fix: connect history drawer to actual network history state"
```

---

### Task 11: Fix NodeConfigPanel type checks

**Files:**
- Modify: `src/components/network-designer/NodeConfigPanel.tsx:478,546,564`

- [ ] **Step 1: Verify actual node types created by toolbar**

Read `src/hooks/useNetworkManager.ts` `addNode()` function to see what `type` values are actually used. Check `src/components/network-designer/types.ts` line 2 for the type union: `'function' | 'destination' | 'network' | 'datacenter'`.

- [ ] **Step 2: Fix routing tab type check**

```typescript
// Line 478: change from
node.type === 'router'
// to
(node.type === 'function' && node.functionType === 'Router')
```

- [ ] **Step 3: Fix security tab type checks**

```typescript
// Lines 546, 564: change from
node.type === 'source'
// to a type that actually exists, based on what makes sense for security config.
// If security should show for all node types, remove the type guard.
// If security should show for network/internet nodes:
node.type === 'network'
```

Determine the correct behavior by reading what the security section contains and which node type it logically applies to.

- [ ] **Step 4: Verify config panels render**

Run: Open Visual Designer, add a Cloud Router node (type: 'function'), double-click to configure. Switch to Routing tab.
Expected: ASN, BGP, and route config fields are visible.

- [ ] **Step 5: Commit**

```bash
git add src/components/network-designer/NodeConfigPanel.tsx
git commit -m "fix: NodeConfigPanel type checks match actual NetworkNode type union"
```

---

### Task 12: Fix spacebar pan jump in Canvas

**Files:**
- Modify: `src/components/network-designer/Canvas.tsx:141-149`

- [ ] **Step 1: Read the spacebar handler**

Lines 141-149: When Space is pressed, a synthetic `MouseEvent` is created with `clientX=0, clientY=0`. This causes the pan start position to jump to `(0 - panOffset.x, 0 - panOffset.y)`.

- [ ] **Step 2: Track last mouse position and use it for spacebar pan**

Add a ref to track the last known mouse position:

```typescript
const lastMousePosition = useRef({ x: 0, y: 0 });
```

Update it in the existing mousemove handler (or add a passive listener):

```typescript
// In the mousedown/mousemove section, track mouse position:
const handleMouseMoveTrack = (e: MouseEvent) => {
  lastMousePosition.current = { x: e.clientX, y: e.clientY };
};
element.addEventListener('mousemove', handleMouseMoveTrack);
// Add to cleanup
```

Fix the spacebar handler:

```typescript
// Lines 141-149: change from
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.code === 'Space' && !isPanning) {
    e.preventDefault();
    setIsPanning(true);
    const mouseEvent = new MouseEvent('mousemove');
    setStartPanPosition({
      x: mouseEvent.clientX - panOffset.x,
      y: mouseEvent.clientY - panOffset.y
    });
    document.body.style.cursor = 'grab';
  }
};
// to
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.code === 'Space' && !isPanning) {
    e.preventDefault();
    setIsPanning(true);
    setStartPanPosition({
      x: lastMousePosition.current.x - panOffset.x,
      y: lastMousePosition.current.y - panOffset.y
    });
    document.body.style.cursor = 'grab';
  }
};
```

- [ ] **Step 3: Verify spacebar pan works smoothly**

Run: Open Visual Designer, add nodes, hover over canvas, press and hold Space, move mouse.
Expected: Canvas pans from current mouse position without jumping.

- [ ] **Step 4: Commit**

```bash
git add src/components/network-designer/Canvas.tsx
git commit -m "fix: spacebar pan uses last mouse position instead of synthetic event"
```

---

### Task 13: Fix zoom limits and hardcoded constants

**Files:**
- Modify: `src/components/network-designer/Canvas.tsx:173`
- Modify: `src/components/network-designer/NetworkDesigner.tsx:193,201`

- [ ] **Step 1: Fix Canvas zoom limits**

```typescript
// Canvas.tsx line 173: change from
const newZoomLevel = Math.max(0.5, Math.min(zoomLevel + delta, 2));
// to
const newZoomLevel = Math.max(ZOOM_LIMITS.MIN, Math.min(zoomLevel + delta, ZOOM_LIMITS.MAX));
```

Ensure `ZOOM_LIMITS` is imported from `designer-constants.ts`.

- [ ] **Step 2: Fix NetworkDesigner hardcoded values**

```typescript
// NetworkDesigner.tsx line 193: change from
setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, x, y: Math.min(y, 800 - 64) } : n));
// to
setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, x, y: Math.min(y, CANVAS_BOUNDS.MAX_Y - CANVAS_BOUNDS.NODE_SIZE) } : n));

// NetworkDesigner.tsx line 201: change from
const gridSize = 20;
// to
const gridSize = CANVAS_BOUNDS.GRID_SIZE;
```

Ensure `CANVAS_BOUNDS` is imported from `designer-constants.ts`.

- [ ] **Step 3: Verify zoom works to full range**

Run: Open Visual Designer, Ctrl+scroll to zoom.
Expected: Zoom goes up to 3x (not capped at 2x). Zoom goes down to 0.5x.

- [ ] **Step 4: Commit**

```bash
git add src/components/network-designer/Canvas.tsx src/components/network-designer/NetworkDesigner.tsx
git commit -m "fix: use designer-constants for zoom limits and canvas bounds"
```

---

### Task 14: Fix VLAN input NaN in EdgeConfigPanel

**Files:**
- Modify: `src/components/network-designer/EdgeConfigPanel.tsx:138`

- [ ] **Step 1: Add NaN guard to parseInt**

```typescript
// Line 138: change from
onChange={(e) => onUpdate({ vlan: parseInt(e.target.value) })}
// to
onChange={(e) => {
  const val = parseInt(e.target.value);
  if (!isNaN(val) && val >= 1 && val <= 4094) {
    onUpdate({ vlan: val });
  }
}}
```

- [ ] **Step 2: Verify VLAN input rejects invalid values**

Run: Open Visual Designer, create an edge, open edge config, clear VLAN field and type "abc".
Expected: VLAN value doesn't change to NaN. Only valid numbers 1-4094 are accepted.

- [ ] **Step 3: Commit**

```bash
git add src/components/network-designer/EdgeConfigPanel.tsx
git commit -m "fix: guard VLAN input against NaN and enforce 1-4094 range"
```

---

### Task 15: Fix shallow config merge in useNetworkManager

**Files:**
- Modify: `src/hooks/useNetworkManager.ts:62`

- [ ] **Step 1: Implement deep merge for config**

```typescript
// Line 62: change from
config: updates.config ? { ...node.config, ...updates.config } : node.config
// to
config: updates.config
  ? Object.entries(updates.config).reduce(
      (merged, [key, value]) => ({
        ...merged,
        [key]: value && typeof value === 'object' && !Array.isArray(value) && merged[key] && typeof merged[key] === 'object'
          ? { ...merged[key], ...value }
          : value
      }),
      { ...node.config }
    )
  : node.config
```

- [ ] **Step 2: Verify nested config updates merge correctly**

Run: Open Visual Designer, add a node, configure it with provider + region. Then update just the region.
Expected: Provider is preserved, region is updated (not the entire config object replaced).

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useNetworkManager.ts
git commit -m "fix: deep merge node config to preserve nested properties"
```

---

### Task 16: Fix panOffset in Node.tsx drag effect deps

**Files:**
- Modify: `src/components/network-designer/Node.tsx:172`

- [ ] **Step 1: Remove panOffset from dependency array**

```typescript
// Line 172: change from
}, [isDragging, dragOffset, onDrag, onDragEnd, zoomLevel, hasDragged, panOffset]);
// to
}, [isDragging, dragOffset, onDrag, onDragEnd, zoomLevel, hasDragged]);
```

The drag handler already accounts for parent transforms via `getBoundingClientRect()`. Including `panOffset` causes the effect to re-register on every pan frame, potentially interrupting an active drag.

- [ ] **Step 2: Verify drag works while panning**

Run: Open Visual Designer, add nodes, pan the canvas, then drag a node.
Expected: Node drags smoothly without stutter or jumps.

- [ ] **Step 3: Commit**

```bash
git add src/components/network-designer/Node.tsx
git commit -m "fix: remove panOffset from drag effect deps to prevent mid-drag re-register"
```

---

### Task 17: Add simulation unmount cleanup

**Files:**
- Modify: `src/components/network-designer/simulation/runSimulation.ts:21-25`
- Modify: `src/components/network-designer/NetworkDesigner.tsx` (add cleanup effect)

- [ ] **Step 1: Export a cancel function from runSimulation**

```typescript
// In runSimulation.ts, add after line 25:
export function cancelSimulation() {
  simulationCancelled = true;
  simulationPaused = false;
}
```

- [ ] **Step 2: Add cleanup effect in NetworkDesigner**

```typescript
// In NetworkDesigner.tsx, add a useEffect for cleanup:
import { cancelSimulation } from './simulation/runSimulation';

useEffect(() => {
  return () => {
    cancelSimulation();
  };
}, []);
```

- [ ] **Step 3: Verify no React warnings on unmount during simulation**

Run: Open Visual Designer, add nodes and edges, start simulation, navigate away before it completes.
Expected: No "Can't perform state update on unmounted component" warning in console.

- [ ] **Step 4: Commit**

```bash
git add src/components/network-designer/simulation/runSimulation.ts src/components/network-designer/NetworkDesigner.tsx
git commit -m "fix: cancel simulation on component unmount to prevent stale state updates"
```

---

### Task 18: Fix Canvas pan/zoom performance

**Files:**
- Modify: `src/components/network-designer/Canvas.tsx:55-57,109-203`

- [ ] **Step 1: Convert pan state to refs**

The `isPanning` and `startPanPosition` states cause the entire pan/zoom effect to re-register on every change. Convert to refs:

```typescript
// Change from (lines 55-56):
const [isPanning, setIsPanning] = useState(false);
const [startPanPosition, setStartPanPosition] = useState({ x: 0, y: 0 });
// to:
const isPanningRef = useRef(false);
const startPanPositionRef = useRef({ x: 0, y: 0 });
const [isPanning, setIsPanning] = useState(false); // keep for cursor style render
```

Update all references in the effect to use refs for reads, and only call `setIsPanning` for the cursor style change (which needs to trigger a re-render).

- [ ] **Step 2: Reduce effect dependency array**

After converting to refs, the effect deps should only include `[canvasRef, panOffset, zoomLevel]` - not `isPanning` or `startPanPosition`.

- [ ] **Step 3: Verify pan/zoom still works**

Run: Open Visual Designer, middle-click drag to pan, Ctrl+scroll to zoom.
Expected: Same behavior, but smoother (fewer effect re-registrations).

- [ ] **Step 4: Commit**

```bash
git add src/components/network-designer/Canvas.tsx
git commit -m "perf: convert pan state to refs to reduce effect re-registration"
```

---

### Task 19: Delete dead Zustand store and clean up duplicate template logic

**Files:**
- Delete: `src/components/network-designer/store/useStore.ts`
- Delete: `src/components/network-designer/store/` (directory)
- Modify: `src/hooks/useTemplatesManager.ts` (remove duplicate `applyTemplateWithUniqueIds`, keep drawer state)

- [ ] **Step 1: Verify store is unused**

Run: Search for imports of `network-designer/store`:

```bash
grep -r "network-designer/store" src/ --include="*.ts" --include="*.tsx"
```

Expected: No results (confirming it's dead code).

- [ ] **Step 2: Delete the store**

```bash
rm -rf src/components/network-designer/store/
```

- [ ] **Step 3: Remove duplicate applyTemplateWithUniqueIds from useTemplatesManager**

Read `src/hooks/useTemplatesManager.ts`. Remove the `applyTemplateWithUniqueIds` function (lines 11-39) since it duplicates `useNetworkManager.applyTemplate`. Keep only the drawer visibility state management.

- [ ] **Step 4: Verify no import errors**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "cleanup: remove dead network-designer Zustand store and duplicate template logic"
```

---

### Task 20: Template icon serialization (string names instead of component refs)

**Files:**
- Modify: `src/components/network-designer/types.ts:8`
- Modify: `src/components/network-designer/NetworkDesigner.tsx` (icon resolution)
- Modify: `src/components/network-designer/Node.tsx` (icon resolution)
- Modify: `src/hooks/useNetworkManager.ts` (addNode icon as string)

**Context:** The spec requires "store icon name strings instead of Lucide component references. Resolve at render time." This enables templates to survive `JSON.stringify`/localStorage round-trips since component references can't be serialized.

- [ ] **Step 1: Create icon registry utility**

Create `src/utils/iconRegistry.ts`:

```typescript
import { Cloud, Server, Shield, Globe, Router, Database, Wifi, Network, Cpu, HardDrive, Radio, Lock, Zap, Box } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  Cloud, Server, Shield, Globe, Router, Database, Wifi, Network, Cpu, HardDrive, Radio, Lock, Zap, Box
};

export function resolveIcon(iconName: string): LucideIcon {
  return ICON_MAP[iconName] || Box;
}

export function getIconName(icon: LucideIcon | string): string {
  if (typeof icon === 'string') return icon;
  // Reverse lookup
  for (const [name, component] of Object.entries(ICON_MAP)) {
    if (component === icon) return name;
  }
  return 'Box';
}
```

- [ ] **Step 2: Change icon type to string**

```typescript
// types.ts line 8: change from
icon: any;
// to
icon: string;
```

- [ ] **Step 3: Update Node.tsx to resolve icon at render time**

```typescript
// In Node.tsx, replace:
const Icon = node.icon;
// with:
import { resolveIcon } from '../../utils/iconRegistry';
const Icon = resolveIcon(node.icon);
```

- [ ] **Step 4: Update addNode in useNetworkManager to store string**

Update all `icon: SomeComponent` assignments to `icon: 'ComponentName'` string.

- [ ] **Step 5: Update built-in templates to use string icon names**

In TemplatesDrawer.tsx, change template node definitions from `icon: Cloud` to `icon: 'Cloud'`.

- [ ] **Step 6: Verify type check passes**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 7: Verify nodes still render with correct icons**

Run: Open Visual Designer, add nodes from toolbar.
Expected: All node types show their correct icons.

- [ ] **Step 8: Commit**

```bash
git add src/utils/iconRegistry.ts src/components/network-designer/types.ts src/components/network-designer/Node.tsx src/hooks/useNetworkManager.ts src/components/network-designer/panels/TemplatesDrawer.tsx
git commit -m "fix: serialize node icons as string names for localStorage/template persistence"
```

---

### Task 21: Custom template localStorage persistence

**Files:**
- Modify: `src/components/network-designer/NetworkDesigner.tsx:58` (customTemplates state init + save effect)

**Context:** The spec requires "Fix custom template persistence: save/load from localStorage." The project already has `safeGetItem`/`safeSetItem` utilities in `src/utils/localStorageUtils.ts` with the `netbond_` namespace prefix.

**Prerequisite:** Task 20 must be complete (icons serialized as strings, so templates survive JSON round-trip).

- [ ] **Step 1: Initialize customTemplates from localStorage**

```typescript
import { safeGetItem, safeSetItem } from '../../utils/localStorageUtils';

// Line 58: change from
const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
// to
const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>(() => {
  const saved = safeGetItem('custom_templates');
  return saved ? JSON.parse(saved) : [];
});
```

- [ ] **Step 2: Add save effect when customTemplates change**

```typescript
useEffect(() => {
  safeSetItem('custom_templates', JSON.stringify(customTemplates));
}, [customTemplates]);
```

- [ ] **Step 3: Verify templates persist across reload**

Run: Open Visual Designer, create a topology, save as custom template, refresh page, open Templates drawer.
Expected: Custom template appears in the drawer after refresh.

- [ ] **Step 4: Commit**

```bash
git add src/components/network-designer/NetworkDesigner.tsx
git commit -m "fix: persist custom templates to localStorage"
```

---

### Task 22: Audit unused imports in network-designer module

**Files:**
- Modify: various files in `src/components/network-designer/`

**Context:** Spec Phase 2 Cleanup says "Remove unused imports and orphaned components (verify each is truly unused before deleting)."

- [ ] **Step 1: Run TypeScript compiler to find unused imports**

Run: `npx tsc --noEmit 2>&1 | grep "declared but" | head -30`

This shows variables/imports that are declared but never used.

- [ ] **Step 2: Remove unused imports**

For each unused import in the `network-designer/` directory, remove it. Verify each removal doesn't break anything.

- [ ] **Step 3: Verify clean compile**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/components/network-designer/
git commit -m "cleanup: remove unused imports in network-designer module"
```

---

## End-to-End Verification

After all tasks are complete:

- [ ] **Run full build:** `npx vite build 2>&1 | tail -10` - Expected: exit 0
- [ ] **Run TypeScript check:** `npx tsc --noEmit 2>&1` - Expected: 0 errors
- [ ] **Run tests:** `npx vitest run 2>&1 | tail -10` - Expected: fewer failures than before
- [ ] **Manual smoke test the Visual Designer flow:**
  1. Navigate to Create > Visual Designer
  2. Add 3 nodes (Cloud Router, AWS Cloud, Datacenter)
  3. Drag each to a different position on canvas
  4. Connect them with edges
  5. Double-click a Cloud Router node - verify config panel opens with routing tab
  6. Configure VLAN on an edge - verify only valid numbers accepted
  7. Click Undo - verify last action is reversed
  8. Open History drawer - verify entries shown
  9. Press Space and drag to pan - verify smooth, no jump
  10. Ctrl+scroll to zoom - verify goes to 3x
  11. Run simulation - navigate away before completion - verify no console errors
  12. Save topology as custom template, refresh page, verify template persists
  13. Create connections - verify they appear in Manage grid
- [ ] **Check browser console:** Zero console.log output throughout the entire flow
