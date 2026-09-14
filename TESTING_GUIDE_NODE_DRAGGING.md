# Testing Guide: Node Dragging Fixes

## Quick Test Scenarios

### Test 1: Simple Click (No Movement)
**Expected**: Node selects without moving

1. Open Network Designer
2. Add a node to the canvas
3. Click the node once (try not to move mouse)
4. ✅ **Pass**: Node highlights/selects but stays in exact same position
5. ❌ **Fail**: Node jumps to a different location

---

### Test 2: Minor Mouse Movement During Click
**Expected**: Node still treats as click, not drag

1. Add a node to the canvas
2. Click the node but allow your hand to naturally move 2-3 pixels
3. ✅ **Pass**: Node selects without moving (< 10px movement ignored)
4. ❌ **Fail**: Node moves slightly from original position

---

### Test 3: Intentional Drag
**Expected**: Node follows mouse smoothly, snaps to grid at end

1. Add a node to the canvas
2. Click and drag the node significantly (> 10px)
3. Observe during drag: Node should follow mouse cursor smoothly
4. Release mouse button
5. ✅ **Pass**: Node snaps to nearest grid position (20px intervals)
6. ✅ **Pass**: Drag feels smooth with no jumping during movement
7. ❌ **Fail**: Node jumps around during dragging

---

### Test 4: Double-Click to Configure
**Expected**: Opens config panel without moving node

1. Add a node to the canvas
2. Double-click the node quickly
3. ✅ **Pass**: Configuration panel opens AND node hasn't moved
4. ❌ **Fail**: Node moves or config panel doesn't open

---

### Test 5: Click Multiple Times
**Expected**: Each click selects without cumulative movement

1. Add a node to the canvas
2. Click the node 5 times in rapid succession
3. ✅ **Pass**: Node stays in same position after all clicks
4. ❌ **Fail**: Node drifts/moves with each click

---

### Test 6: Click at Different Zoom Levels
**Expected**: Clicking works correctly at all zoom levels

1. Add a node to the canvas
2. Zoom out to 50% (Ctrl/Cmd + Scroll)
3. Click the node → should select without moving
4. Zoom to 100%
5. Click the node → should select without moving
6. Zoom to 150%
7. Click the node → should select without moving
8. ✅ **Pass**: Works at all zoom levels
9. ❌ **Fail**: Node jumps at any zoom level

---

### Test 7: Click with Canvas Panned
**Expected**: Clicking works with any pan offset

1. Add nodes to the canvas
2. Pan the canvas (Middle-mouse drag or Alt+Drag)
3. Click various nodes in different positions
4. ✅ **Pass**: All nodes select cleanly without jumping
5. ❌ **Fail**: Nodes jump based on pan position

---

### Test 8: Drag Near Canvas Edge
**Expected**: Node respects boundaries, no jumping

1. Add a node near the edge of the canvas
2. Try to drag it beyond the boundary
3. ✅ **Pass**: Node stops at boundary smoothly
4. ❌ **Fail**: Node jumps when hitting boundary

---

### Test 9: Grid Alignment
**Expected**: Nodes align to 20px grid after drag

1. Add a node anywhere on canvas
2. Drag it to a random position
3. Release the mouse
4. Check the node's position visually
5. ✅ **Pass**: Node is aligned to 20px grid (edges align with grid dots)
6. ❌ **Fail**: Node sits between grid lines

---

### Test 10: Rapid Click-Drag-Click Sequence
**Expected**: All interactions work correctly in sequence

1. Add a node
2. Click it (select)
3. Immediately drag it to a new location
4. Release
5. Click it again immediately (select)
6. ✅ **Pass**: Each action works correctly without interference
7. ❌ **Fail**: Node jumps or actions interfere with each other

---

## Visual Inspection Checklist

### During Click (No Drag Intent)
- [ ] Node does not move even 1 pixel
- [ ] Selection highlight appears
- [ ] No visual flickering or jumping
- [ ] Cursor remains as 'grab' (not 'grabbing')

### During Intentional Drag
- [ ] Node follows cursor smoothly
- [ ] Cursor changes to 'grabbing'
- [ ] Node shadow/elevation increases
- [ ] No jumping or snapping during movement
- [ ] Grid dots visible in background

### After Drag Complete
- [ ] Node snaps to nearest grid intersection
- [ ] Final position is clean (aligned to 20px intervals)
- [ ] Selection state maintained
- [ ] Cursor returns to 'grab'

---

## Debug Mode Testing

If you encounter issues, enable debug mode:

1. Open `src/components/network-designer/Node.tsx`
2. Change line 22: `const DEBUG_DRAG = false;` → `const DEBUG_DRAG = true;`
3. Rebuild: `npm run build`
4. Open browser DevTools Console
5. Perform the failing test
6. Review console logs for:
   - `[Node Debug] Mouse down` - Initial positions
   - `[Node Debug] Mouse move` - Delta calculations
   - `[Node Debug] Drag started` - Threshold detection
   - `[Node Debug] Drag position calculated` - Coordinate math

### Common Debug Log Patterns

**Good (No jump on click)**:
```
[Node Debug] Mouse down { nodePosition: {x: 100, y: 100}, ... }
[Node Debug] Mouse move { deltaX: 1, deltaY: 2, threshold: 10 }
[Node Debug] Mouse move { deltaX: 2, deltaY: 3, threshold: 10 }
// No "Drag started" = correctly treated as click
```

**Good (Successful drag)**:
```
[Node Debug] Mouse down { nodePosition: {x: 100, y: 100}, ... }
[Node Debug] Mouse move { deltaX: 12, deltaY: 5, threshold: 10 }
[Node Debug] Drag started - threshold exceeded
[Node Debug] Drag position calculated { calculatedX: 112, calculatedY: 105 }
// Smooth progression of coordinates
```

**Bad (Would indicate issue)**:
```
[Node Debug] Mouse down { nodePosition: {x: 100, y: 100}, ... }
[Node Debug] Drag position calculated { calculatedX: 140, calculatedY: 120 }
// Jump of 40 pixels = problem with coordinate calculation
```

---

## Performance Testing

### Load Test
1. Add 20+ nodes to the canvas
2. Click and drag multiple nodes rapidly
3. ✅ **Pass**: Smooth performance, no lag
4. ❌ **Fail**: Stuttering or delayed response

### Memory Test
1. Perform 50+ drag operations
2. Check browser memory usage (DevTools Memory tab)
3. ✅ **Pass**: Memory usage stable (no leaks)
4. ❌ **Fail**: Memory increases continuously

---

## Regression Testing

Ensure these existing features still work:

- [ ] Edge creation mode (click nodes to create connections)
- [ ] Node tooltips appear on hover
- [ ] Node name editing (click label)
- [ ] Node deletion
- [ ] Undo/Redo functionality
- [ ] Template application
- [ ] Export functionality
- [ ] Zoom controls
- [ ] Pan controls

---

## Expected Results Summary

| Test Scenario | Expected Behavior | Pass Criteria |
|--------------|-------------------|---------------|
| Simple click | No movement | Node stays put ✅ |
| Click with minor movement | No movement | < 10px ignored ✅ |
| Intentional drag | Smooth drag | Follows mouse ✅ |
| Drag end | Snap to grid | 20px alignment ✅ |
| Double-click | Open config | Panel opens, no move ✅ |
| Multiple clicks | No drift | Same position ✅ |
| Different zoom levels | Works consistently | All levels work ✅ |
| Canvas panned | Works correctly | No position errors ✅ |
| Near boundaries | Respects limits | Smooth stop ✅ |
| Rapid sequences | All work | No interference ✅ |

---

## Reporting Issues

If you find any failing tests, please report with:

1. **Test number** that failed
2. **Browser** and version (Chrome 120, Firefox 121, etc.)
3. **Screen recording** or animated GIF showing the issue
4. **Debug logs** (if debug mode enabled)
5. **Steps to reproduce**

Example:
```
Test #3 Failed: Intentional Drag
Browser: Chrome 120.0.6099.129
Issue: Node jumps 20px to the right when drag starts
Debug logs: [Attach console output]
Steps:
1. Added node at x:100, y:100
2. Clicked and started dragging
3. Node immediately jumped to x:120, y:100
```

---

## Success Criteria

**All fixes are working correctly if:**

✅ All 10 test scenarios pass
✅ Visual inspection checklist complete
✅ No console errors
✅ Performance is smooth with 20+ nodes
✅ No regression in existing features

**The node dragging experience should feel:**
- **Precise**: Clicks don't cause movement
- **Responsive**: Drags follow mouse immediately
- **Smooth**: No jumping during drag
- **Clean**: Grid alignment after drag
- **Professional**: Like a polished application
