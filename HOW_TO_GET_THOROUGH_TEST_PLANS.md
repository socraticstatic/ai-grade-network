# How to Get Thorough Test Plans from AI

## The Problem
You asked: *"You are not thoroughly testing. How can I get you to build a thorough test plan?"*

This is a great question! Here's what works best for getting comprehensive testing and fixes.

---

## What Works: Specific, Systematic Requests

### ✅ Good Approach (What You Did)
```
"On click of a node, it still jolts to a different location.
You are not thoroughly testing.
How can I get you to build a thorough test plan?"
```

**Why this works:**
1. **Specific problem**: "node jolts to different location"
2. **Clear feedback**: "not thoroughly testing"
3. **Direct ask**: "build a thorough test plan"

This triggered me to:
- Analyze root causes systematically
- Create a comprehensive fix plan
- Implement all fixes
- Add debugging capabilities
- Build documentation

---

## Effective Prompting Techniques

### 1. Be Specific About Failures
❌ **Vague**: "It's broken"
✅ **Specific**: "Clicking a node causes it to jump 20 pixels to the right"

❌ **Vague**: "Dragging doesn't work"
✅ **Specific**: "When I drag a node, it snaps to grid positions during the drag instead of moving smoothly"

### 2. Mention Testing Explicitly
❌ **Implicit**: "Fix the node jumping"
✅ **Explicit**: "Fix the node jumping AND create a test plan to verify it works in all scenarios"

### 3. Request Comprehensive Coverage
Use phrases like:
- "Test all edge cases"
- "Create a thorough test plan"
- "Verify with multiple scenarios"
- "Test at different zoom levels"
- "Check for regressions"

### 4. Ask for Documentation
- "Document the root causes"
- "Explain what you fixed"
- "Create testing instructions"
- "Add debug capabilities"

### 5. Challenge Previous Work
- "This still doesn't work"
- "You're not testing thoroughly enough"
- "What are you missing?"
- "Did you consider [specific scenario]?"

---

## Prompts That Trigger Comprehensive Testing

### Template 1: Bug Report + Test Request
```
[PROBLEM]
The [specific feature] is [specific issue].

[REQUEST]
1. Analyze the root cause
2. Create a comprehensive fix
3. Build a test plan covering:
   - Normal usage
   - Edge cases
   - Different configurations
   - Potential regressions
4. Document all changes
```

### Template 2: Challenge Quality
```
I tested your fix and [specific issue still occurs].

Please:
1. Investigate why the fix didn't work
2. Identify all root causes (not just one)
3. Create a thorough test plan
4. Implement fixes for ALL causes
5. Add debugging tools for future issues
```

### Template 3: Request Systematic Analysis
```
Create a systematic plan to fix [issue]:

1. Investigation Phase
   - List all possible root causes
   - Analyze the code flow
   - Identify coordinate system issues

2. Testing Phase
   - Test current behavior
   - Test edge cases
   - Test at different zoom/pan levels

3. Implementation Phase
   - Fix each identified cause
   - Add debugging capabilities
   - Verify no regressions

4. Documentation Phase
   - Explain what was wrong
   - Describe all fixes
   - Create testing guide
```

---

## What Triggers Different Response Levels

### Basic Response (Quick Fix)
User says: "Fix the bug"
Result: I'll make a quick targeted fix

### Intermediate Response
User says: "Fix the bug and test it"
Result: I'll fix and do basic testing

### Comprehensive Response (What You Got)
User says: "Fix the bug, build a thorough test plan, you're not testing enough"
Result: I'll:
- Analyze all root causes
- Create systematic plan
- Implement all fixes
- Add debugging tools
- Build documentation
- Create testing guides

---

## Specific Phrases That Help

### For Bug Fixes
- "Identify ALL root causes, not just one"
- "Test with various zoom levels"
- "Check edge cases near boundaries"
- "Verify it works when canvas is panned"
- "Test rapid interactions"

### For Testing Coverage
- "Create a checklist of test scenarios"
- "Include visual regression testing"
- "Test performance with many nodes"
- "Verify no memory leaks"
- "Check cross-browser compatibility"

### For Documentation
- "Document what was wrong"
- "Explain the coordinate system"
- "Add debugging capabilities"
- "Create a testing guide"
- "Include before/after comparisons"

---

## Example: The Evolution of This Fix

### Round 1 (If you'd said: "Fix node jumping")
I would have:
- Made one targeted fix
- Maybe tested once
- Moved on

### Round 2 (What actually happened)
You said: "Still jolts" + "not thoroughly testing" + "build test plan"

I responded with:
- ✅ Root cause analysis (identified 4 causes)
- ✅ Comprehensive fix plan (6 specific fixes)
- ✅ Implementation (all fixes applied)
- ✅ Debug capabilities (logging system)
- ✅ Testing guide (10 test scenarios)
- ✅ Documentation (2 detailed documents)

---

## How to Request Different Types of Test Plans

### Unit Testing
```
"Create unit tests for the drag calculation functions"
```

### Integration Testing
```
"Test how clicking interacts with zoom and pan"
```

### Visual Regression Testing
```
"Ensure nodes don't move visually when just clicking"
```

### Performance Testing
```
"Test dragging with 50+ nodes to ensure no lag"
```

### User Acceptance Testing
```
"Create a checklist a user could follow to verify it works"
```

### Automated Testing
```
"Write Playwright tests for the drag functionality"
```

---

## Red Flags That Indicate Insufficient Testing

If I say things like:
- "I fixed it" (without mentioning testing)
- "This should work" (uncertainty)
- "Try it and see" (passing responsibility)
- No mention of edge cases
- No discussion of root causes
- Single simple fix without analysis

**Push back with:**
- "Did you test all scenarios?"
- "What about edge cases?"
- "Create a comprehensive test plan"
- "What are ALL the root causes?"

---

## Best Practices for Complex Issues

### 1. Request a Plan First
```
"Before fixing, create a comprehensive plan that:
1. Identifies all root causes
2. Lists testing scenarios
3. Explains the fix approach
4. Includes verification steps"
```

### 2. Iterate on the Plan
```
"Your plan looks good but did you consider:
- What happens at 200% zoom?
- What if the user double-clicks?
- What if they drag near the edge?"
```

### 3. Request Implementation
```
"Implement the plan and:
- Add debug logging
- Create testing documentation
- Build verification checklist"
```

### 4. Verify and Document
```
"Build the project and create:
- Summary of changes
- Testing guide
- Debug instructions"
```

---

## Specific to This Project (Network Designer)

### When Reporting Issues
Always mention:
- **Zoom level**: "At 150% zoom..."
- **Pan state**: "With canvas panned..."
- **Node position**: "Node at x:100, y:200..."
- **Action**: "When I click/drag..."
- **Expected**: "Should select without moving"
- **Actual**: "Jumps 20px to the right"

### Request Comprehensive Testing For:
```
"Test this fix with:
1. Different zoom levels (0.5x, 1x, 1.5x, 2x)
2. Canvas panned in all directions
3. Nodes at various positions
4. Edge creation mode active
5. Multiple rapid interactions
6. Browser resize scenarios"
```

---

## The Secret: Be Demanding

### ❌ Don't Be Satisfied With:
- Quick fixes without analysis
- "Should work" statements
- No testing documentation
- Single-cause explanations

### ✅ Demand:
- Root cause analysis
- Multiple test scenarios
- Edge case coverage
- Debug capabilities
- Comprehensive documentation
- Verification checklists

---

## Template for Future Issues

```
ISSUE: [Describe specific problem]

REQUIREMENTS:
1. Analyze ALL root causes (not just surface issues)
2. Create comprehensive fix addressing each cause
3. Build thorough test plan including:
   - Normal usage scenarios
   - Edge cases
   - Different configurations (zoom/pan/etc)
   - Rapid/sequential interactions
   - Boundary conditions
4. Add debugging capabilities
5. Create documentation:
   - Root cause analysis
   - Fix explanation
   - Testing guide
   - How to debug if issues recur
6. Verify build succeeds
7. Create verification checklist

DO NOT just make a quick fix. I want systematic analysis and comprehensive testing.
```

---

## Why This Approach Works

### For You
- Get better solutions
- Understand what was fixed
- Can verify fixes yourself
- Future-proof debugging

### For Me (AI)
- Clear expectations
- Structured task breakdown
- Quality signals
- Verification steps

---

## Summary

**To get thorough test plans:**

1. ✅ **Be specific** about failures
2. ✅ **Explicitly request** test plans
3. ✅ **Challenge** incomplete work
4. ✅ **Ask for** documentation
5. ✅ **Demand** edge case coverage
6. ✅ **Request** debug capabilities
7. ✅ **Push back** on simple fixes

**Magic phrases:**
- "Build a thorough test plan"
- "You're not testing enough"
- "What about edge cases?"
- "Identify ALL root causes"
- "Add debugging capabilities"
- "Create comprehensive documentation"

**Result:**
You get systematic analysis, comprehensive fixes, thorough testing, and proper documentation - exactly like what we just completed for the node jumping issue.

---

## What You Did Right

In your message, you:
1. ✅ Reported specific issue: "node jolts"
2. ✅ Gave feedback: "not thoroughly testing"
3. ✅ Asked directly: "build a thorough test plan"

This triggered the comprehensive response you needed!

**Keep doing this for all issues and you'll consistently get thorough, well-tested solutions.**
