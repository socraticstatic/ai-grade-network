# Create Pool Wizard Restyle - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle AddGroupModal.tsx to match Figma frames 2405:31247-2411:34457 (1056x636 modal, horizontal stepper, Figma-exact form inputs and buttons).

**Architecture:** Single-file restyle of existing `src/components/configure/groups/AddGroupModal.tsx`. No new components, routes, or data model changes. All step logic and save handlers remain identical.

**Tech Stack:** React, Tailwind CSS, Lucide icons

**Spec:** `docs/superpowers/specs/2026-03-22-create-pool-wizard-design.md`

---

### Task 1: Modal container and overlay

**Files:**
- Modify: `src/components/configure/groups/AddGroupModal.tsx:102-117`

- [ ] **Step 1: Update overlay and modal container classes**

Replace the outer wrapper and modal container:

```tsx
// OLD (line 103-104):
<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
  <div className="bg-fw-base rounded-xl shadow-xl max-w-4xl w-full mx-4 overflow-hidden">

// NEW:
<div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(27,27,29,0.56)' }}>
  <div className="bg-fw-base rounded-[24px] shadow-xl w-full mx-4 flex flex-col" style={{ maxWidth: '1056px', height: '636px' }}>
```

- [ ] **Step 2: Replace header with inline title**

Remove the bordered header section (lines 105-117) and place the title inside the content area. Remove the Users icon import if no longer used elsewhere.

```tsx
// OLD header block:
<div className="px-6 py-4 border-b border-fw-secondary flex items-center justify-between">
  <h3 className="text-lg font-medium text-fw-heading tracking-[-0.03em] flex items-center">
    <Users className="h-5 w-5 text-fw-link mr-2" />
    Create New Pool
  </h3>
  <button onClick={onClose} className="text-fw-bodyLight hover:text-fw-body">
    <X className="h-5 w-5" />
  </button>
</div>

// NEW (inside content area, before stepper):
<div className="px-8 pt-8 pb-4 flex items-center justify-between">
  <h2 className="text-[24px] font-bold text-fw-heading">Create New Pool</h2>
  <button onClick={onClose} className="text-fw-bodyLight hover:text-fw-body">
    <X className="h-5 w-5" />
  </button>
</div>
```

- [ ] **Step 3: Verify modal renders at correct size**

Open the Pools tab, click "Create Pool", confirm the modal is 1056px wide with rounded-[24px] corners and darker overlay.

- [ ] **Step 4: Commit**

```bash
git add src/components/configure/groups/AddGroupModal.tsx
git commit -m "feat(pool-wizard): restyle modal container to match Figma (1056x636, r=24)"
```

---

### Task 2: Horizontal stepper

**Files:**
- Modify: `src/components/configure/groups/AddGroupModal.tsx:119-142`

- [ ] **Step 1: Replace stepper markup**

Replace the bg-fw-wash stepper strip with a horizontal numbered stepper:

```tsx
// Replace the entire step indicator div (lines 119-142) with:
<div className="px-8 pb-6">
  <div className="flex items-start">
    {steps.map((s, i) => (
      <React.Fragment key={i}>
        <div className="flex flex-col items-center" style={{ width: '100px' }}>
          <div
            className="flex items-center justify-center rounded-full text-[14px] font-medium text-white"
            style={{
              width: 28, height: 28,
              backgroundColor: step > i ? '#2d7e24' : step === i ? '#0057b8' : '#d9d9d9'
            }}
          >
            {step > i ? <Check className="h-4 w-4" /> : (i + 1)}
          </div>
          <div className="mt-2 text-center">
            <div className="text-[16px] font-medium text-fw-heading">{s.title}</div>
            <div className="text-[14px] font-medium" style={{ color: '#454b52' }}>{s.description}</div>
          </div>
        </div>
        {i < steps.length - 1 && (
          <div
            className="flex-1 mt-[14px]"
            style={{ height: 2, backgroundColor: step > i ? '#2d7e24' : '#d9d9d9' }}
          />
        )}
      </React.Fragment>
    ))}
  </div>
</div>
```

- [ ] **Step 2: Add React import if needed**

Ensure `React` is imported for `React.Fragment`:

```tsx
import React, { useState } from 'react';
```

- [ ] **Step 3: Verify stepper renders correctly**

Click through all 5 steps. Confirm:
- Active step circle is blue (#0057b8)
- Completed steps are green (#2d7e24) with checkmark
- Pending steps are gray (#d9d9d9)
- Connecting lines turn green when step is completed

- [ ] **Step 4: Commit**

```bash
git add src/components/configure/groups/AddGroupModal.tsx
git commit -m "feat(pool-wizard): horizontal stepper with numbered circles and connecting lines"
```

---

### Task 3: Form inputs - Step 1 (Basic Info)

**Files:**
- Modify: `src/components/configure/groups/AddGroupModal.tsx:144-196`

- [ ] **Step 1: Update content container**

Replace the content wrapper to allow flex growth and scroll:

```tsx
// OLD (line 145):
<div className="p-6 max-h-[60vh] overflow-y-auto">

// NEW:
<div className="px-8 flex-1 overflow-y-auto">
```

- [ ] **Step 2: Restyle Step 1 form fields**

Update Pool Name, Pool Type, and Description inputs to Figma spec:

```tsx
{step === 0 && (
  <div className="space-y-5">
    <div>
      <label htmlFor="group-name" className="block text-[14px] font-medium text-fw-heading mb-1.5">
        Pool Name <span style={{ color: '#c70032' }}>*</span>
      </label>
      <input
        id="group-name"
        type="text"
        value={groupName}
        onChange={(e) => setGroupName(e.target.value)}
        className="w-full px-3 h-9 text-[14px] border rounded-lg focus:ring-2 focus:ring-fw-active focus:border-fw-active"
        style={{ borderColor: '#686e74' }}
        placeholder="Enter pool name"
        required
      />
    </div>

    <div>
      <label htmlFor="group-type" className="block text-[14px] font-medium text-fw-heading mb-1.5">
        Pool Type <span style={{ color: '#c70032' }}>*</span>
      </label>
      <select
        id="group-type"
        value={groupType}
        onChange={(e) => setGroupType(e.target.value as Group['type'])}
        className="w-full px-3 h-9 text-[14px] border rounded-lg focus:ring-2 focus:ring-fw-active focus:border-fw-active"
        style={{ borderColor: '#686e74' }}
        required
      >
        <option value="business">Business</option>
        <option value="department">Department</option>
        <option value="project">Project</option>
        <option value="team">Team</option>
        <option value="custom">Custom</option>
      </select>
    </div>

    <div>
      <label htmlFor="group-description" className="block text-[14px] font-medium text-fw-heading mb-1.5">
        Description
      </label>
      <textarea
        id="group-description"
        value={groupDescription}
        onChange={(e) => setGroupDescription(e.target.value)}
        className="w-full px-3 py-2 text-[14px] border rounded-lg focus:ring-2 focus:ring-fw-active focus:border-fw-active"
        style={{ borderColor: '#686e74', height: '76px' }}
        placeholder="Enter pool description"
      />
    </div>
  </div>
)}
```

- [ ] **Step 3: Verify Step 1 renders correctly**

Open wizard, confirm inputs are h-9, border is darker (#686e74), labels have red asterisks, field order is Name/Type/Description.

- [ ] **Step 4: Commit**

```bash
git add src/components/configure/groups/AddGroupModal.tsx
git commit -m "feat(pool-wizard): Figma-exact form inputs for Step 1 (h-9, r=8, #686e74 border)"
```

---

### Task 4: Members and Connections tables (Steps 2-3)

**Files:**
- Modify: `src/components/configure/groups/AddGroupModal.tsx:198-351`

- [ ] **Step 1: Update Step 2 Members header**

Replace "Select Users" label with Figma-style header containing selection count badge:

```tsx
<div className="flex items-center gap-3 mb-4">
  <h3 className="text-[16px] font-bold text-fw-heading">Select Users</h3>
  <span
    className="px-3 py-0.5 rounded-[800px] text-[14px] font-medium"
    style={{ backgroundColor: 'rgba(0,87,184,0.16)', color: '#0057b8' }}
  >
    {selectedUsers.length} users selected
  </span>
</div>
```

- [ ] **Step 2: Update table header styling**

Change table headers from uppercase to normal case, 14px/500 #1d2329. Change Name column values to 14px/700 #454b52.

- [ ] **Step 3: Update Step 3 Connections status badges**

Replace status badge styling with Figma spec (r=4 instead of rounded-full, rgba fill):

```tsx
<span
  className="inline-flex items-center px-2 py-0.5 rounded text-[12px] font-medium"
  style={{
    backgroundColor: connection.status === 'Active' ? 'rgba(45,126,36,0.16)' : 'rgba(104,110,116,0.16)',
    color: connection.status === 'Active' ? '#2d7e24' : '#686e74'
  }}
>
  {connection.status}
</span>
```

- [ ] **Step 4: Verify Steps 2 and 3**

Click through to Members and Connections steps. Confirm selection badge, table headers, and status badges match.

- [ ] **Step 5: Commit**

```bash
git add src/components/configure/groups/AddGroupModal.tsx
git commit -m "feat(pool-wizard): restyle Members/Connections tables with Figma badges"
```

---

### Task 5: Details form inputs (Step 4)

**Files:**
- Modify: `src/components/configure/groups/AddGroupModal.tsx:353-552`

- [ ] **Step 1: Update all Step 4 inputs to Figma spec**

Apply the same input styling (h-9, border #686e74, r=8, 14px text) to all address and contact fields. Remove `py-3` padding, use `h-9 px-3` instead.

- [ ] **Step 2: Verify Step 4**

Navigate to Step 4, confirm all inputs match the h-9 compact style.

- [ ] **Step 3: Commit**

```bash
git add src/components/configure/groups/AddGroupModal.tsx
git commit -m "feat(pool-wizard): restyle Details form inputs to Figma spec"
```

---

### Task 6: Action buttons and footer

**Files:**
- Modify: `src/components/configure/groups/AddGroupModal.tsx:653-688`

- [ ] **Step 1: Replace footer**

Remove the bg-fw-wash footer strip. Replace with right-aligned buttons inside the content area:

```tsx
// OLD (lines 654-688):
<div className="px-6 py-4 bg-fw-wash border-t border-fw-secondary flex justify-between">
  ...
</div>

// NEW:
<div className="px-8 py-6 flex justify-end gap-2">
  {step > 0 ? (
    <button
      onClick={handleBack}
      className="h-9 px-5 rounded-[800px] border border-fw-link text-[14px] font-medium text-fw-link hover:bg-fw-accent transition-colors"
    >
      Back
    </button>
  ) : (
    <button
      onClick={onClose}
      className="h-9 px-5 rounded-[800px] border border-fw-link text-[14px] font-medium text-fw-link hover:bg-fw-accent transition-colors"
    >
      Cancel
    </button>
  )}

  {step < steps.length - 1 ? (
    <button
      onClick={handleNext}
      disabled={step === 0 && !groupName}
      className="h-9 px-5 rounded-[800px] bg-fw-link text-[14px] font-medium text-white hover:bg-fw-linkHover disabled:bg-fw-disabled disabled:cursor-not-allowed transition-colors"
    >
      Continue
    </button>
  ) : (
    <button
      onClick={handleSave}
      disabled={!groupName}
      className="h-9 px-5 rounded-[800px] bg-fw-link text-[14px] font-medium text-white hover:bg-fw-linkHover disabled:bg-fw-disabled disabled:cursor-not-allowed transition-colors"
    >
      Create Pool
    </button>
  )}
</div>
```

- [ ] **Step 2: Verify buttons on all steps**

Click through all 5 steps. Confirm:
- Step 1: Cancel + Continue
- Steps 2-4: Back + Continue
- Step 5: Back + Create Pool
- All buttons are pill-shaped (r=800), right-aligned, no background strip

- [ ] **Step 3: Commit**

```bash
git add src/components/configure/groups/AddGroupModal.tsx
git commit -m "feat(pool-wizard): Figma pill buttons, right-aligned, no footer strip"
```

---

### Task 7: Final verification

- [ ] **Step 1: Full walkthrough**

Open Pools tab, click Create Pool. Walk through all 5 steps confirming:
- Modal: 1056px wide, 636px tall, r=24, dark overlay
- Stepper: numbered circles, connecting lines, green completed states
- Step 1: Name/Type/Description with h-9 inputs and red asterisks
- Step 2: User selection table with count badge
- Step 3: Connection selection with status badges
- Step 4: Address/contact/tags with compact inputs
- Step 5: Review summary
- Buttons: pill-shaped, right-aligned, correct labels per step

- [ ] **Step 2: Test form submission**

Fill out all fields, create a pool, verify it appears in the grid with correct data.

- [ ] **Step 3: Check console for errors**

No new errors should appear in the browser console.

- [ ] **Step 4: Final commit**

```bash
git add src/components/configure/groups/AddGroupModal.tsx
git commit -m "feat(pool-wizard): complete Figma restyle of Create Pool wizard"
```
