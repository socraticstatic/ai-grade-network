# Create Pool Wizard - Figma Restyle

## Summary

Restyle the existing `AddGroupModal.tsx` to match Figma frames 2405:31247 through 2411:34457. No new components, routes, or data model changes. The 5-step wizard logic and save handler remain identical. Only the modal container, stepper, form inputs, and buttons change.

## Figma Reference

- **File:** Z2DZTBbatSi8miUWWf5g7B
- **Frames:** 2405:31247 (#1), 2411:33024 (#2), 2411:33553 (#3), 2411:34005 (#4), 2411:34457 (#5)
- **Modal:** 1056x636, white fill, r=24, overlay rgba(27,27,29,0.56)

## What Changes

### 1. Modal container

**Current:** `max-w-4xl`, `rounded-xl`, header with Users icon and border-b, bg-fw-wash footer strip.

**Target:**
- Width: `max-w-[1056px]`, height: `h-[636px]`
- Border radius: `rounded-[24px]`
- Overlay: `bg-[rgba(27,27,29,0.56)]`
- No header border, no header icon
- Title: "Create New Pool" at 24px/700 #1d2329, inside the content area (not a separate header)
- No bg-fw-wash strips on header or footer

### 2. Step indicator

**Current:** Circles on bg-fw-wash row with vertical layout per step. Active = bg-fw-cobalt-600, completed = bg-fw-success, pending = bg-fw-neutral.

**Target:**
- Numbered circles: 28x28, border-radius 50%
- Active step: bg #0057b8, text white
- Completed step: bg #2d7e24, text white (show checkmark)
- Pending step: bg #d9d9d9, text white
- Connecting lines: 2px height, flex-1, #d9d9d9 (pending) or #2d7e24 (completed)
- Labels below each circle: title 16px/500 #1d2329, subtitle 14px/500 #454b52
- No background strip behind stepper

### 3. Form inputs (Step 1 - Basic Info)

**Current:** `px-4 py-3`, rounded-lg, border-fw-secondary.

**Target:**
- Height: 36px (h-9)
- Border radius: 8px (rounded-lg) - same
- Border color: #686e74 (darker than current fw-secondary)
- Labels: 14px/500 #1d2329 with red asterisk (*) for required fields in #c70032
- Placeholder text: 14px/500 #454b52 (name, type) or #686e74 (description)
- Pool Name input: single line, h-9
- Pool Type: dropdown/select, h-9, default "Business"
- Description: textarea, h-[76px]
- Full width (1008px in Figma, maps to w-full with modal padding)

### 4. Members table (Step 2)

**Current:** Checkbox table with Name, Role, Email columns. "X users selected" text below.

**Target:**
- Same structure, same columns
- Header row: "Select Users" title 16px/700 with badge "0 users selected" in pill (bg rgba(0,87,184,0.16), text #0057b8, r=800)
- Table headers: 14px/500 #1d2329 (Name, Role, E-mail)
- Table rows: Name 14px/700 #454b52, Role 14px/500 #454b52, Email 14px/500 #454b52
- Checkbox column remains

### 5. Connections table (Step 3)

**Current:** Checkbox table with Name, Type, Status columns.

**Target:**
- Same structure
- Table headers: Name, Type, Status at 14px/500 #1d2329
- Status badges: "Active" with fill rgba(45,126,36,0.16), text #2d7e24, r=4
- Connection type shown as plain text 14px/500 #454b52

### 6. Details form (Step 4)

No Figma frame data extracted for step 4 specifics. Keep existing layout (address + contact + tags) with updated input styling (h-9, border #686e74, r=8).

### 7. Review (Step 5)

No Figma frame data for step 5 specifics. Keep existing review layout with updated typography to match Figma tokens.

### 8. Action buttons

**Current:** "Back"/"Next" in bg-fw-wash footer strip, using Button component outline/primary variants.

**Target:**
- No background strip - buttons sit at bottom of content area
- Right-aligned, gap-2
- Step 1: "Cancel" (outline, r=800, 104x36) + "Continue" (filled #0057b8, r=800, 120x36)
- Steps 2-4: "Back" (outline, r=800, 92x36) + "Continue" (filled #0057b8, r=800, 120x36)
- Step 5: "Back" + "Create Pool" (filled)
- Button text: 14px/500

## What Does Not Change

- File location: `src/components/configure/groups/AddGroupModal.tsx`
- Props interface: `AddGroupModalProps`
- State management: all useState hooks
- Step definitions array
- handleNext, handleBack, handleSave, handleAddTag, handleRemoveTag
- Data model: Group type, GroupAddress, GroupContact
- All callers: GroupGrid.tsx, ManageGroupsPage.tsx

## Files Modified

1. `src/components/configure/groups/AddGroupModal.tsx` - restyle only
