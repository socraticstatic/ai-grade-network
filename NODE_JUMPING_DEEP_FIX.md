# Node Jumping Deep Fix - Root Cause Resolution

## Executive Summary

This document details the **true root cause** of the node jumping issue and the enhanced fix that addresses it at the fundamental coordinate system level.

## The Problem

When clicking a node in the Network Designer, the node would jump to a different location even though the user only intended to select it, not drag it. This persisted despite multiple previous fixes addressing:
- Drag thresholds
- Snap-to-grid timing
- State update race conditions

## Root Cause Analysis

### The Coordinate System Architecture

The Canvas component applies a CSS transform to its content container:

```css
transform: translate(panOffset.x, panOffset.y) scale(zoomLevel)
```

This creates a coordinate system hierarchy:
1. **Screen Coordinates**: Mouse position on the screen (e.clientX, e.clientY)
2. **Canvas Coordinates**: Position relative to canvas element (subtract rect.left, rect.top)
3. **Panned Coordinates**: Position after accounting for pan (subtract panOffset.x, panOffset.y)
4. **Logical Coordinates**: Final position after zoom (divide by zoomLevel)

### The Missing Link

**The Node component was NOT receiving the `panOffset` prop**, meaning it couldn't account for the canvas pan transform when calculating drag positions.

**The Error Cascade:**
1. Canvas.tsx correctly subtracted panOffset in its own calculations (lines 73-74, 169-170)
2. Canvas passed only `zoomLevel` to Node, but NOT `panOffset`
3. Node calculated drag offset without knowing about the pan transform
4. When any mouse movement occurred, the position calculation was wrong by exactly the panOffset amount
5. Node appeared to "jump" to compensate for the missing offset

### Why Previous Fixes Failed

Previous fixes addressed symptoms rather than the root cause:

| Fix | Why It Didn't Work |
|-----|-------------------|
| Increased drag threshold (5px → 10px) | Doesn't fix coordinate calculation error |
| Removed snap-to-grid during drag | Not the cause of initial jump |
| Prevented position updates during drag | Doesn't fix wrong offset calculation |
| Stored initial node position | Never actually used in calculations |
| Added debug logging | Helpful for diagnosis, but not a fix |

**None of these fixes addressed the missing panOffset in coordinate transformations.**

## The Enhanced Fix

### Changes to Node.tsx

#### 1. Added panOffset to Interface (Line 19)
```typescript
interface NodeProps {
  // ... existing props
  panOffset?: { x: number; y: number };
}
```

#### 2. Added panOffset Parameter with Default (Line 45)
```typescript
export const Node = memo(function Node({
  // ... existing params
  panOffset = { x: 0, y: 0 }
}: NodeProps) {
```

#### 3. Fixed mouseDown Calculation (Lines 269-270)
```typescript
// CRITICAL: Subtract panOffset BEFORE dividing by zoomLevel
const mouseXInCanvas = (e.clientX - parentRect.left - panOffset.x) / zoomLevel;
const mouseYInCanvas = (e.clientY - parentRect.top - panOffset.y) / zoomLevel;
```

**Why This Matters:** The CSS transform is `translate(panOffset) scale(zoomLevel)`, so we must undo the translate BEFORE undoing the scale.

#### 4. Fixed mouseMove Calculation (Lines 99-100)
```typescript
// Calculate position accounting for pan offset, zoom level, and drag offset
const x = ((e.clientX - rect.left - panOffset.x) / zoomLevel) - dragOffset.x;
const y = ((e.clientY - rect.top - panOffset.y) / zoomLevel) - dragOffset.y;
```

#### 5. Updated Dependency Array (Line 143)
```typescript
}, [isDragging, dragOffset, onDrag, onDragEnd, zoomLevel, hasDragged, panOffset]);
```

### Changes to Canvas.tsx

#### Added panOffset Prop to Node (Line 385)
```typescript
<Node
  // ... existing props
  zoomLevel={zoomLevel}
  panOffset={panOffset}
/>
```

## Coordinate Transformation Pipeline

The correct transformation sequence for all mouse events:

```
Screen Coords (e.clientX, e.clientY)
    ↓ subtract canvas rect
Canvas Coords (x - rect.left, y - rect.top)
    ↓ subtract pan offset
Panned Coords (x - panOffset.x, y - panOffset.y)
    ↓ divide by zoom level
Logical Coords ((x - panOffset.x) / zoomLevel, (y - panOffset.y) / zoomLevel)
    ↓ subtract drag offset (only during drag)
Final Node Position
```

**Critical Rule:** The order matters! Pan offset must be subtracted BEFORE dividing by zoom level, because the CSS transform applies translate before scale.

## Testing Strategy

### Test Cases

1. **No Pan, No Zoom (Baseline)**
   - panOffset = {x: 0, y: 0}, zoomLevel = 1
   - Click node → should not move
   - Drag node → should move smoothly

2. **Pan Only**
   - panOffset = {x: 100, y: 50}, zoomLevel = 1
   - Click node → should not move
   - Drag node → should move smoothly from click position

3. **Zoom Only**
   - panOffset = {x: 0, y: 0}, zoomLevel = 1.5
   - Click node → should not move
   - Drag node → should move smoothly with correct scaling

4. **Combined Pan and Zoom**
   - panOffset = {x: 100, y: 50}, zoomLevel = 1.5
   - Click node → should not move
   - Drag node → should move smoothly with correct scaling and offset

5. **Negative Pan Offset**
   - panOffset = {x: -200, y: -100}, zoomLevel = 1
   - Click node → should not move
   - Drag node → should move smoothly

6. **Extreme Zoom**
   - panOffset = {x: 0, y: 0}, zoomLevel = 0.5 and 2.0
   - Click node → should not move
   - Drag node → should move smoothly with correct scaling

### How to Test

1. **Enable Debug Mode** (Optional):
   - Open `src/components/network-designer/Node.tsx`
   - Change line 22: `const DEBUG_DRAG = true;`
   - Open browser console to see detailed coordinate calculations

2. **Test Procedure**:
   - Load the Network Designer
   - Add several nodes to the canvas
   - Pan the canvas using space + drag
   - Zoom in and out using the zoom controls
   - For each zoom/pan combination:
     - Click a node (no movement)
     - Click and hold (no movement until threshold)
     - Click and drag (smooth movement from click position)

### Expected Results

After this fix:
- ✅ Clicking a node does NOT cause any position change
- ✅ Dragging starts smoothly from the exact click position
- ✅ Pan offset does not interfere with drag calculations
- ✅ Zoom level correctly scales all movements
- ✅ Combined pan and zoom work correctly
- ✅ No jumping at any zoom level or pan offset
- ✅ Snap-to-grid only applies when drag ends

## Why This Fix Works

This fix addresses the **FUNDAMENTAL** issue rather than symptoms:

### Previous Approach (Symptoms)
- Adjusted timing (when snap happens)
- Adjusted thresholds (when drag starts)
- Adjusted state updates (when position changes)

### This Approach (Root Cause)
- Fixed coordinate space transformation
- Aligned Canvas and Node coordinate systems
- Properly accounted for CSS transform hierarchy
- Ensured all calculations follow the same pipeline

### The Key Insight

The node jumping occurred because Node component was calculating positions as if panOffset didn't exist, but the visual rendering was affected by panOffset through the CSS transform. This created a systematic offset error that manifested as jumping.

By passing panOffset to Node and using it correctly in ALL coordinate calculations, the coordinate systems now align properly throughout the entire transformation pipeline.

## Technical Details

### CSS Transform Order

The canvas applies transforms in this order:
```css
transform: translate(panOffset.x, panOffset.y) scale(zoomLevel)
```

To reverse this in coordinate calculations, we must:
1. First undo the translate (subtract panOffset)
2. Then undo the scale (divide by zoomLevel)

This is why the calculation is:
```typescript
(clientX - rect.left - panOffset.x) / zoomLevel
```

NOT:
```typescript
(clientX - rect.left) / zoomLevel - panOffset.x  // WRONG!
```

### Memory and Performance

Adding panOffset to the dependency array does not cause performance issues because:
- panOffset only changes during pan operations (relatively rare)
- The useEffect already re-runs on drag state changes
- The calculation itself is lightweight (simple arithmetic)

## Files Modified

1. **src/components/network-designer/Node.tsx**
   - Added panOffset to NodeProps interface
   - Added panOffset parameter with default value
   - Updated mouseDown coordinate calculation
   - Updated mouseMove coordinate calculation
   - Added panOffset to useEffect dependencies
   - Enhanced debug logging to include panOffset

2. **src/components/network-designer/Canvas.tsx**
   - Added panOffset prop to Node component invocation

## Regression Prevention

To prevent similar issues in the future:

1. **Document the Coordinate System**
   - All new coordinate calculations should follow the documented pipeline
   - Comments should explain transform order and rationale

2. **Consistent Pattern**
   - Any component that calculates mouse positions should receive both zoomLevel AND panOffset
   - All calculations should follow: `(screen - rect - pan) / zoom`

3. **Code Review Checklist**
   - Does this component handle mouse events?
   - Does the parent have pan or zoom transforms?
   - Are all transform parameters passed down?
   - Are they applied in the correct order?

## Conclusion

The node jumping issue was caused by a **coordinate system mismatch** between the Canvas parent component (which knew about pan offset) and the Node child component (which didn't). By passing panOffset to Node and using it correctly in all coordinate transformations, the coordinate systems now align properly and nodes no longer jump when clicked or dragged.

This fix addresses the root cause rather than symptoms, ensuring robust behavior across all pan and zoom combinations.

---

**Fix Implemented:** March 11, 2026
**Build Status:** ✅ Successful
**TypeScript Errors:** None
**Affected Components:** Node.tsx, Canvas.tsx
