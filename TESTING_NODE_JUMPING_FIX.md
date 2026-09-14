# Testing Guide: Node Jumping Fix Verification

## Quick Test (2 minutes)

1. **Open the Network Designer**
   - Navigate to the network designer page
   - Add 3-4 nodes to the canvas

2. **Test Basic Click (No Pan/Zoom)**
   - Click on a node
   - ✅ PASS: Node stays in place
   - ❌ FAIL: Node jumps to a different location

3. **Test Pan + Click**
   - Hold Space and drag to pan the canvas
   - Release Space
   - Click on a node
   - ✅ PASS: Node stays in place
   - ❌ FAIL: Node jumps

4. **Test Zoom + Click**
   - Use zoom controls to zoom in (1.5x or 2x)
   - Click on a node
   - ✅ PASS: Node stays in place
   - ❌ FAIL: Node jumps

5. **Test Pan + Zoom + Click**
   - Pan the canvas
   - Zoom in or out
   - Click on a node
   - ✅ PASS: Node stays in place
   - ❌ FAIL: Node jumps

## Comprehensive Test (5 minutes)

### Setup
1. Open Network Designer
2. Add 5-6 nodes scattered across the canvas
3. Have browser console open (F12) for debug messages (optional)

### Test Matrix

| Test # | Pan Offset | Zoom | Action | Expected Result |
|--------|-----------|------|--------|-----------------|
| 1 | (0, 0) | 1.0x | Click node | No movement |
| 2 | (0, 0) | 1.0x | Drag node | Smooth drag from click point |
| 3 | (100, 50) | 1.0x | Click node | No movement |
| 4 | (100, 50) | 1.0x | Drag node | Smooth drag from click point |
| 5 | (-100, -50) | 1.0x | Click node | No movement |
| 6 | (0, 0) | 1.5x | Click node | No movement |
| 7 | (0, 0) | 1.5x | Drag node | Smooth drag, scaled correctly |
| 8 | (0, 0) | 0.5x | Click node | No movement |
| 9 | (100, 50) | 1.5x | Click node | No movement |
| 10 | (100, 50) | 1.5x | Drag node | Smooth drag, scaled and offset correctly |
| 11 | (-200, -100) | 2.0x | Click node | No movement |
| 12 | (-200, -100) | 2.0x | Drag node | Smooth drag, scaled and offset correctly |

### How to Pan
- Hold `Space` key
- Click and drag on the canvas
- Release Space

### How to Zoom
- Use the zoom controls in the UI
- Or use mouse wheel (if implemented)

### Pass Criteria

For each test:
- **Click**: Node should not move AT ALL when clicked
- **Drag**:
  - Node should not jump when drag starts
  - Node should follow mouse cursor smoothly
  - Node should snap to grid only when drag ends
  - Drag should work correctly regardless of pan/zoom

## Debug Mode Testing

If you want detailed coordinate information:

1. **Enable Debug Mode**:
   ```typescript
   // In src/components/network-designer/Node.tsx, line 22:
   const DEBUG_DRAG = true;  // Change from false to true
   ```

2. **Rebuild**: `npm run build`

3. **Open Browser Console** (F12)

4. **Perform Actions**:
   - Click a node → See "Mouse down - initializing drag" log
   - Drag a node → See "Mouse move" and "Drag position calculated" logs

5. **Check the Logs**:
   - `panOffset` should match current canvas pan
   - `mouseInCanvas` should be relative to panned canvas
   - `calculatedOffset` should be distance from mouse to node corner
   - Node should NOT jump even with large panOffset values

## Common Issues and What They Mean

### Issue: Node jumps when clicked (no drag)
**Cause**: Coordinate calculation error (the fix should prevent this)
**Check**: Is panOffset being passed to Node component?

### Issue: Node jumps when drag starts
**Cause**: Initial drag offset calculation is wrong
**Check**: Is panOffset subtracted in mouseDown handler?

### Issue: Node drifts during drag
**Cause**: Drag offset not applied correctly during move
**Check**: Is panOffset subtracted in mouseMove handler?

### Issue: Node jumps only when panned
**Cause**: panOffset not being used in calculations
**Check**: Both Node and Canvas should use panOffset consistently

### Issue: Node jumps only when zoomed
**Cause**: Zoom level applied in wrong order
**Check**: panOffset should be subtracted BEFORE dividing by zoomLevel

## Expected Behavior After Fix

### ✅ What Should Work

1. **Clicking a node**:
   - No movement at any zoom level
   - No movement at any pan offset
   - Selection highlight appears

2. **Dragging a node**:
   - Drag starts only after 10px movement threshold
   - Node follows mouse cursor smoothly
   - No jumping when drag starts
   - Works correctly at any zoom level
   - Works correctly at any pan offset

3. **Snap-to-grid**:
   - Does NOT happen during drag
   - ONLY happens when drag ends
   - Snaps to nearest 20px grid point

4. **Combined operations**:
   - Pan → Zoom → Click: No jump
   - Zoom → Pan → Drag: Smooth drag
   - Multiple pans and zooms: Always works correctly

### ❌ What Should NOT Happen

1. Node jumping when clicked
2. Node jumping when drag starts
3. Node drifting away from mouse cursor during drag
4. Different behavior at different zoom levels
5. Different behavior at different pan offsets

## Video Testing Checklist

If recording a demo video, show:

1. ✅ Click node without pan/zoom - no jump
2. ✅ Pan canvas, then click node - no jump
3. ✅ Zoom in, then click node - no jump
4. ✅ Pan + zoom, then click node - no jump
5. ✅ Drag node smoothly - follows cursor
6. ✅ Drag with pan offset - still smooth
7. ✅ Drag with zoom - scales correctly
8. ✅ Snap to grid happens only at end of drag

## Debugging Failed Tests

If a test fails:

1. **Check panOffset is passed**:
   ```typescript
   // In Canvas.tsx, look for:
   <Node panOffset={panOffset} ... />
   ```

2. **Check panOffset is used**:
   ```typescript
   // In Node.tsx mouseDown, should see:
   (e.clientX - parentRect.left - panOffset.x) / zoomLevel
   ```

3. **Check dependency array**:
   ```typescript
   // In Node.tsx useEffect, should include:
   [isDragging, dragOffset, onDrag, onDragEnd, zoomLevel, hasDragged, panOffset]
   ```

4. **Enable debug mode** and check console logs for coordinate values

5. **Verify build** succeeded without TypeScript errors

## Performance Verification

The fix should NOT affect performance:

- ✅ No lag when clicking nodes
- ✅ No lag when dragging nodes
- ✅ Smooth animations during drag
- ✅ No jank when panning canvas
- ✅ No jank when zooming canvas

## Browser Compatibility

Test in multiple browsers if possible:

- Chrome/Edge (Chromium)
- Firefox
- Safari (if on macOS)

The fix uses standard JavaScript and CSS transforms, so should work identically across browsers.

## Success Criteria

**The fix is successful if:**

1. ✅ All 12 comprehensive tests pass
2. ✅ No node jumping in any scenario
3. ✅ Smooth drag behavior at all zoom levels
4. ✅ Smooth drag behavior at all pan offsets
5. ✅ No performance degradation
6. ✅ Snap-to-grid works correctly

**Report any test failures with:**
- Browser and version
- Which test failed (test number)
- Pan offset and zoom level at time of failure
- Console errors (if any)
- Screenshots or video if possible

---

**Fix Version:** Deep Coordinate System Fix
**Date:** March 11, 2026
**Status:** Ready for Testing
