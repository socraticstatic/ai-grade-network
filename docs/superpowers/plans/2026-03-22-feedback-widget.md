# Feedback Widget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a floating multi-step feedback panel accessible from all authenticated pages.

**Architecture:** Self-contained FeedbackWidget component with internal state machine (3 steps: type selection, form, confirmation). Rendered alongside SmartAssistant in App.tsx outside route tree. Panel slides in from right edge via framer-motion.

**Tech Stack:** React 18, TypeScript, framer-motion, lucide-react, Tailwind CSS (fw-* tokens), Button component

---

### Task 1: Create FeedbackWidget component

**Files:**
- Create: `src/components/feedback/FeedbackWidget.tsx`

- [ ] **Step 1: Write the component**

Full implementation (see task description for spec). Named export `FeedbackWidget`.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/micahbos/Desktop/cloud-router-ui/att-netbond-sdci/.claude/worktrees/wonderful-vaughan && npx tsc --noEmit 2>&1 | head -30`
Expected: No errors for FeedbackWidget.tsx

---

### Task 2: Wire into App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Import FeedbackWidget**

Add import alongside SmartAssistant import.

- [ ] **Step 2: Render FeedbackWidget**

Add `<FeedbackWidget />` alongside `<SmartAssistant />` in the `!isDetachedWindow && !isStandalonePage` block.

- [ ] **Step 3: Verify TypeScript**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: No errors

---

### Task 3: Commit

- [ ] `git add src/components/feedback/FeedbackWidget.tsx src/App.tsx`
- [ ] `git commit -m "feat(feedback): add floating FeedbackWidget with 3-step flow"`
