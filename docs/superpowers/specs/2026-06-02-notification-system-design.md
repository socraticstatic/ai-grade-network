# Notification System Design
**Date:** 2026-06-02  
**Status:** Approved  
**Scope:** Stakeholder demo - FLYWHEEL-compliant notification components + showcase page

---

## Overview

A set of five notification components for the NetBond Advanced demo, plus a `/notifications` showcase page that lets stakeholders trigger and interact with each type. This is a demo environment - the goal is to show how notifications look and behave, not to wire every call site.

---

## Content Framework (from image spec)

Every Alert and Warning dialog must contain all five elements:

1. **Title** - Say what happened. Clear, specific, no jargon.
2. **Reassurance** - Lead with what was preserved ("Your changes were saved").
3. **Reason** - Brief technical cause ("due to a technical issue on our end").
4. **Fix** - Primary action ("Please try connecting again").
5. **Escalation** - Support link ("contact your support team").
6. **Support ID** - Bottom-left, clickable, links to mock ticket.

---

## Color System

Left vertical bar is the single color signal. Everything else (title, body, cancel button) stays in FLYWHEEL neutrals.

| Type | Bar token | Hex | Icon token |
|---|---|---|---|
| Alert | `border-fw-error` | `#c70032` | `text-fw-error` |
| Warning | `border-fw-warn` | `#ea712f` | `text-fw-warn` |
| Success toast | `border-fw-success` | `#2d7e24` | `text-fw-success` |
| Info toast | `border-fw-info` | `#0074b3` | `text-fw-info` |
| Announcement | `border-fw-info` | `#0074b3` | `text-fw-info` |

Bar width: `border-l-4` (4px). Background: `bg-fw-base` (white) on modals and toasts. Announcement uses `bg-fw-accent` (#e6f6fd).

Three color touches maximum per component: bar + icon + primary action button. No tinted backgrounds on modals.

---

## Components

### 1. AlertDialog
**Severity:** Critical / Error  
**Behavior:** Modal. No backdrop dismiss. No X close. Focus trapped. Acknowledge button required.  
**Structure:**
- `border-l-4 border-fw-error` on modal panel
- Red `AlertCircle` icon inline with title
- Five-part content body (see framework above)
- Support ID: bottom-left, monospace, `text-fw-link`, underlined, links to `/support/tickets/:id`
- Buttons: ghost "Cancel" + red primary (label configurable: "Try Again", "Contact Support", etc.)

**Props:** `title`, `reassurance`, `reason`, `fix`, `escalation`, `supportId`, `actionLabel`, `onAction`, `onClose`

---

### 2. WarningDialog
**Severity:** Warning  
**Behavior:** Modal. No backdrop dismiss. No X close. Focus trapped. Acknowledgement required.  
**Structure:** Same as AlertDialog with `border-fw-warn` and amber icon (`AlertTriangle`).  
**Buttons:** ghost "Cancel" + amber primary (label configurable: "I Understand", "Proceed", etc.)

**Props:** Same shape as AlertDialog. `actionLabel` defaults to "I Understand".

---

### 3. Toast (Info / Success / Error)
**Severity:** Non-blocking  
**Behavior:** Slides in from bottom-right. Auto-dismisses (info/success: 5s, error: no auto-dismiss). Max 3 stacked, FIFO. Pause on hover. Manual X dismiss always available.  
**Structure:**
- White background, `border-l-4` in severity color
- Small icon in severity color
- Title + message in dark FLYWHEEL text
- Progress bar at bottom (severity color, low opacity) counts down auto-dismiss
- No Support ID (toasts are lightweight)

**Variants:** `info` | `success` | `error`  
**Props:** `type`, `title`, `message`, `duration?`

---

### 4. AnnouncementBanner
**Severity:** Informational / System  
**Behavior:** Fixed strip at top of page (below nav). Persists until dismissed. One at a time.  
**Structure:**
- `bg-fw-accent` (#e6f6fd) + `border-l-4 border-fw-info`
- Left: `Megaphone` or `Info` icon + bold title + body text
- Right: optional CTA link (cobalt) + X dismiss button
- Full width, `z-[9998]` (below Alert/Warning modals)

**Props:** `title`, `message`, `ctaLabel?`, `ctaHref?`, `onDismiss`

---

### 5. ConfirmDialog
**Severity:** Neutral / Destructive  
**Behavior:** Modal. Backdrop dismiss allowed. Cancel always available.  
**Variants:**
- `standard` - Cancel + cobalt primary action
- `destructive` - Cancel + red primary action (for deletes, removes)

**Structure:**
- White modal, no left bar (this is procedural, not an alert)
- Icon slot (optional)
- Title + body
- Buttons: ghost "Cancel" + primary action

**Props:** `title`, `message`, `variant?`, `confirmLabel?`, `cancelLabel?`, `icon?`, `onConfirm`, `onClose`

---

### 6. SupportID (shared primitive)
Renders `Support ID: {id}` with the ID in monospace font, underlined, `text-fw-link` color. Clicking navigates to `/support/tickets/{id}`. Used inside AlertDialog and WarningDialog only.

**Props:** `id: string`

---

## Showcase Page (`/notifications`)

Route: `/notifications`  
Nav: accessible as a direct route (not wired to nav - demo environment).

**Layout:** Full page with FLYWHEEL page header, then a grid of trigger cards - one per notification type. Each card shows:
- Type name + severity color chip
- One-line description of when this type fires in production
- Pre-loaded realistic NetBond copy
- "Trigger" button that fires the notification

**Demo scenarios (realistic NetBond copy):**

| Type | Scenario |
|---|---|
| Alert | Failed to connect to Azure ITC endpoint after bandwidth change |
| Warning | Editing this connection will interrupt active traffic on 3 links |
| Info toast | Bandwidth updated to 500 Mbps |
| Success toast | Group policy applied to 4 connections |
| Error toast | Export failed - please try again |
| Announcement | Scheduled maintenance window: June 5, 02:00-06:00 AM EST |
| Confirm (standard) | Apply this policy to all connections in the group? |
| Confirm (destructive) | Delete this connection? This cannot be undone. |

---

## File Structure

```
src/components/common/
  notifications/
    AlertDialog.tsx
    WarningDialog.tsx
    Toast.tsx
    ToastContainer.tsx        (replaces OptimizedToast)
    AnnouncementBanner.tsx
    ConfirmDialog.tsx         (replaces existing ConfirmDialog.tsx)
    SupportID.tsx
    index.ts

src/components/pages/
  NotificationsShowcase.tsx

src/store/
  notificationStore.ts       (Zustand slice)
```

---

## Z-index Layering

| Layer | Value |
|---|---|
| Announcement banner | `z-[9997]` |
| Toast container | `z-[9998]` |
| WarningDialog | `z-[9999]` |
| AlertDialog | `z-[10000]` |

---

## Accessibility

- Alert/Warning: `role="alertdialog"`, `aria-modal="true"`, focus trapped, focus the primary button on open
- Toasts: `role="alert"` (error), `role="status"` (info/success), `aria-live="assertive"` / `"polite"`
- Announcement: `role="banner"`
- All modals: return focus to trigger element on close
