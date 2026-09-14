# Gap Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the top priority gaps from the Figma gap analysis: centralize form inputs, pre-load Insights widgets, restyle Edit Connection forms, and build the Maintenance page.

**Architecture:** Four independent tasks targeting different areas of the codebase. Each produces a working, testable result. Form input centralization is a CSS-only change. Insights pre-loads default widgets on first visit. Edit Connection applies Figma form tokens. Maintenance page is a new standalone route.

**Tech Stack:** React, Tailwind CSS, Framer Motion, Zustand (store)

**Spec:** `.claude/figma-gap-analysis-2026-03-22.md`

---

## File Structure

```
src/
  styles/
    forms.css                    # NEW - Figma form input tokens
  components/
    pages/
      MaintenancePage.tsx        # NEW - scheduled maintenance display
    control-center/
      ControlCenterManager.tsx   # MODIFY - pre-load default widgets
    connection/
      ConnectionDetails.tsx      # MODIFY - apply form tokens to edit mode
  App.tsx                        # MODIFY - add /maintenance route
```

---

### Task 1: Centralize form input styles

**Files:**
- Create: `src/styles/forms.css`
- Modify: `src/styles/buttons.css` (already has form section)
- Modify: `src/index.css` (import new file)

- [ ] **Step 1: Create forms.css with Figma input tokens**

```css
/* src/styles/forms.css */
/* Figma form input tokens: h-9, r=8, border #686e74, text 14px, focus #0057b8 */

.fw-input {
  @apply w-full px-3 h-9 text-[14px] border rounded-lg;
  border-color: #686e74;
}

.fw-input:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(0, 87, 184, 0.15);
  border-color: #0057b8;
}

.fw-input::placeholder {
  @apply text-fw-disabled;
}

.fw-select {
  @apply w-full px-3 h-9 text-[14px] border rounded-lg appearance-none;
  border-color: #686e74;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23686e74' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  padding-right: 2.5rem;
}

.fw-select:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(0, 87, 184, 0.15);
  border-color: #0057b8;
}

.fw-textarea {
  @apply w-full px-3 py-2 text-[14px] border rounded-lg resize-none;
  border-color: #686e74;
}

.fw-textarea:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(0, 87, 184, 0.15);
  border-color: #0057b8;
}

.fw-label {
  @apply block text-[14px] font-medium text-fw-heading mb-1.5;
}

.fw-label-required::after {
  content: ' *';
  color: #c70032;
}
```

- [ ] **Step 2: Import forms.css in index.css**

Add to `src/index.css` after the buttons.css import:
```css
@import './styles/forms.css';
```

- [ ] **Step 3: Remove duplicate form styles from buttons.css**

Remove the `/* FORM ELEMENT STYLES */` section (lines 32-50 in current buttons.css) since forms.css now handles this. Keep only the form radius rules that don't conflict.

- [ ] **Step 4: Apply fw-input to AddGroupModal as proof of concept**

Replace inline input styling in `src/components/configure/groups/AddGroupModal.tsx` Step 1 form fields:
```tsx
// OLD:
className="w-full px-3 h-9 text-[14px] border rounded-lg focus:ring-2 focus:ring-fw-active focus:border-fw-active"
style={{ borderColor: '#686e74' }}

// NEW:
className="fw-input"
```

- [ ] **Step 5: Verify form inputs render correctly**

Open Create Pool wizard, confirm inputs have h-9 height, #686e74 border, focus ring.

- [ ] **Step 6: Commit**

```bash
git add src/styles/forms.css src/index.css src/styles/buttons.css src/components/configure/groups/AddGroupModal.tsx
git commit -m "feat(design-library): centralize form input styles as fw-input/fw-select/fw-textarea"
```

---

### Task 2: Insights Dashboard default widgets

**Files:**
- Modify: `src/components/control-center/ControlCenterManager.tsx`

- [ ] **Step 1: Read ControlCenterManager to understand widget loading**

Read the file to find how widgets are added and what the empty state looks like.

- [ ] **Step 2: Add default widget pre-loading**

If no widgets are saved in store, pre-load 4 default widgets on mount:
- Network Performance (monitoring category)
- Quick Actions (quick-access category)
- Security Status (security category)
- Billing Overview (billing category)

Use the existing widget registry and addWidget store action.

- [ ] **Step 3: Verify Insights tab shows pre-loaded widgets**

Navigate to Manage > Insights tab. Confirm 4 widgets appear instead of empty state.

- [ ] **Step 4: Commit**

```bash
git add src/components/control-center/ControlCenterManager.tsx
git commit -m "feat(insights): pre-load 4 default widgets on first visit"
```

---

### Task 3: Edit Connection form styling

**Files:**
- Modify: `src/components/connection/ConnectionDetails.tsx`
- Modify: `src/components/connection/tabs/ConnectionOverview.tsx` (if edit mode is here)

- [ ] **Step 1: Find where edit mode renders form inputs**

Search ConnectionDetails.tsx and overview tab for edit mode forms. Identify all `<input>` and `<select>` elements in edit mode.

- [ ] **Step 2: Apply fw-input class to all edit mode inputs**

Replace inline input styling with `className="fw-input"`, `className="fw-select"`, `className="fw-textarea"` from Task 1.

- [ ] **Step 3: Apply fw-label class to all edit mode labels**

Replace label styling with `className="fw-label"` or `className="fw-label fw-label-required"` for required fields.

- [ ] **Step 4: Verify edit mode renders correctly**

Navigate to a connection detail page, enter edit mode, confirm form inputs match Figma spec (h-9, #686e74 border, focus ring).

- [ ] **Step 5: Commit**

```bash
git add src/components/connection/ConnectionDetails.tsx
git commit -m "feat(connection): apply Figma form tokens to edit mode inputs"
```

---

### Task 4: Maintenance page

**Files:**
- Create: `src/components/pages/MaintenancePage.tsx`
- Modify: `src/App.tsx` (add route)

- [ ] **Step 1: Pull Figma maintenance frame details**

```bash
curl -s -H "X-Figma-Token: REVOKED_TOKEN" \
  "https://api.figma.com/v1/files/Z2DZTBbatSi8miUWWf5g7B/nodes?ids=3725:32623,3831:980&depth=3"
```

Extract layout structure, text content, and styling details.

- [ ] **Step 2: Create MaintenancePage.tsx**

Build the page based on Figma data. Expected structure:
- Full-screen centered layout (standalone, no DashboardLayout)
- AT&T NetBond branding header
- Maintenance icon (wrench or clock)
- "Scheduled Maintenance" heading
- Date/time window for maintenance
- Description text
- "Check Status" or "Return to Login" action button
- Estimated completion time

Use existing design tokens (fw-heading, fw-body, fw-link, fw-wash).

- [ ] **Step 3: Add route to App.tsx**

Add `/maintenance` as a standalone route (no DashboardLayout), similar to `/login` and `/onboarding`:

```tsx
<Route path="/maintenance" element={
  <Suspense fallback={<LoadingFallback />}>
    <LazyMaintenancePage />
  </Suspense>
} />
```

Add lazy import at top of App.tsx:
```tsx
const LazyMaintenancePage = lazy(() =>
  import('./components/pages/MaintenancePage').then(module => ({
    default: module.MaintenancePage
  }))
);
```

Add `/maintenance` to the `isStandalonePage` check.

- [ ] **Step 4: Verify maintenance page renders**

Navigate to `/maintenance`, confirm layout matches Figma frame.

- [ ] **Step 5: Commit**

```bash
git add src/components/pages/MaintenancePage.tsx src/App.tsx
git commit -m "feat(utility): add Maintenance page matching Figma frames"
```

---

### Task 5: Re-assess and update gap analysis

- [ ] **Step 1: Run visual verification across all changed pages**

Screenshot: Pools (grid + list), Create Pool wizard, Onboarding (all steps), Insights, Edit Connection, Maintenance page.

- [ ] **Step 2: Check console for errors**

Verify zero new errors across all pages.

- [ ] **Step 3: Update gap analysis document**

Update `.claude/figma-gap-analysis-2026-03-22.md` with new status for each item. Move completed items to a "Done" section.

- [ ] **Step 4: Update memory**

Save session state to memory for next conversation.

- [ ] **Step 5: Final commit**

```bash
git add .claude/figma-gap-analysis-2026-03-22.md
git commit -m "docs: update gap analysis after remediation sprint"
```
