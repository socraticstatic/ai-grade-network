# AT&T NetBond SDCI Design System - Figma Audit Reference

Source: Figma file Z2DZTBbatSi8miUWWf5g7B (SDCI.fig)
Last updated: 2026-03-21

---

## 1. Color Tokens (Figma-verified)

### Text Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `text-fw-heading` | `#1d2329` | Page titles, section headings, table headers, inactive tab/nav text |
| `text-fw-body` | `#454b52` | Body text, descriptions, secondary table values |
| `text-fw-bodyLight` | `#686e74` | Labels, captions, placeholders |
| `text-fw-link` | `#0057b8` | Links, active tabs, active nav items |
| `text-fw-disabled` | `#878c94` | Disabled text, hint text |
| `text-fw-success` | `#2d7e24` | Success status text |
| `text-fw-error` | `#c70032` | Error status text |
| `text-fw-purple` | `#af29bb` | Purple accent (Visual Designer) |

### Background Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `bg-fw-base` | `#ffffff` | Card backgrounds, input backgrounds |
| `bg-fw-wash` | `#f8fafb` | Page background, table header bg, metric cells |
| `bg-fw-neutral` | `#f3f4f6` | Subtle backgrounds, card tags |
| `bg-fw-primary` | `#0057b8` | Primary buttons, active segmented controls |
| `bg-fw-accent` | `#e6f6fd` | AT&T blue light tint, selected card bg |
| `bg-fw-disabled` | `#dcdfe3` | Disabled button bg |

### Border Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `border-fw-secondary` | `#dcdfe3` | Most common border (cards, dividers, tables) |
| `border-fw-active` | `#0057b8` | Active tab underline, selected card border |
| `border-fw-primary` | `#686e74` | Input borders (resting state) |

### Brand/Accent
| Token | Hex | Usage |
|-------|-----|-------|
| `brand-accent` | `#009fdb` | AT&T cyan, provider accent |
| `brand-blue` | `#0057b8` | Primary interactive (same as fw-primary) |
| `fw-purple` | `#af29bb` | Visual Designer, secondary flows |
| Warning orange | `#ff8500` | Warning/orange status |

---

## 2. Typography Scale (Figma-verified)

All type uses ATT Aleck Sans. All sizes use `letter-spacing: -0.03em` except tags (`+0.04em`).

| Role | Tailwind | Size | Weight | Color |
|------|----------|------|--------|-------|
| Page title | `text-figma-xl font-bold text-fw-heading tracking-[-0.03em]` | 24px | 700 | `#1d2329` |
| Section heading | `text-figma-lg font-bold text-fw-heading tracking-[-0.03em]` | 16px | 700 | `#1d2329` |
| Subsection heading | `text-figma-lg font-medium text-fw-heading` | 16px | 500 | `#1d2329` |
| Body text | `text-figma-base font-medium text-fw-body` | 14px | 500 | `#454b52` |
| Body dark | `text-figma-base font-medium text-fw-heading` | 14px | 500 | `#1d2329` |
| Labels/captions | `text-figma-sm font-medium text-fw-bodyLight` | 12px | 500 | `#686e74` |
| Stat values | `text-figma-xl font-bold text-fw-heading` | 24px | 700 | `#1d2329` |
| Tiny/hint | `text-figma-xs font-medium text-fw-disabled` | 10px | 500 | `#878c94` |
| Tag text | `text-tag-sm font-medium` (tracking +0.04em) | 12px | 500 | varies |

### Figma fontSize tokens (from tailwind.config.js)
- `text-figma-xs`: 10px
- `text-figma-sm`: 12px
- `text-figma-base`: 14px
- `text-figma-lg`: 16px
- `text-figma-xl`: 24px
- `text-figma-2xl`: 32px
- `text-figma-3xl`: 40px
- `text-figma-4xl`: 48px
- `text-figma-5xl`: 56px

---

## 3. Active State Taxonomy

### Horizontal Tabs
- Active: `border-b-2 border-fw-active text-fw-link` (cobalt underline + cobalt text)
- Inactive: `text-fw-heading` (#1d2329) - NOT fw-bodyLight
- No border-radius. No background fill.

### Vertical Sidebar Nav (Left-Hand Nav Standard)
- Width: `w-[186px]` (186px) - NEVER w-48, w-56, or w-64
- Container: `shrink-0 border-r border-fw-secondary pr-4`
- Active item: `border-l-2 border-fw-active text-fw-link` (cobalt left border + cobalt text)
- Inactive item: `border-l-2 border-transparent text-fw-heading` (#1d2329)
- NO background fill on active state
- Item padding: `px-4 py-3`
- Item text: `text-figma-base font-medium tracking-[-0.03em]` (14px/500) - NOT text-sm
- Item text alignment: always left-aligned (`text-left` or default)
- Icons: `h-5 w-5 mr-3`, active=`text-fw-link`, inactive=`text-fw-heading`
- Category headers: `text-figma-sm font-medium text-fw-bodyLight uppercase tracking-wider mb-2 px-4`
- Use `no-rounded` class on all buttons to prevent pill override
- Prefer the `VerticalTabGroup` component for consistency

### Segmented Controls (quick-action-btn)
- Active: `bg-fw-primary text-white` (filled cobalt)
- Inactive: transparent bg, cobalt text
- Uses `quick-action-btn` class (rounded-md, 6px)

### Capsule Toggles
- Active: `bg-fw-base shadow-sm text-fw-heading` (white with shadow)
- Inactive: transparent

### Selectable Cards
- Selected: `border-fw-active bg-fw-accent shadow-md` (cobalt border + light blue bg)
- Unselected: `border-fw-secondary bg-fw-base`

---

## 4. Border Radius Scale (Figma-verified)

| Element | Tailwind | Pixels |
|---------|----------|--------|
| Inputs, dropdowns | `rounded-lg` | 8px |
| Metric cells | `rounded-lg` | 8px |
| Cards, containers | `rounded-2xl` | 16px |
| Tables | `rounded-2xl` | 16px |
| Report cards | `rounded-3xl` | 24px |
| Modals | `rounded-3xl` | 24px |
| Role cards | `rounded-3xl` | 24px |
| Wizard container | `rounded-3xl` | 24px |
| Marketplace hero | `rounded-[32px]` | 32px |
| Buttons, pills | `rounded-full` | pill |
| Search bar | `rounded-full` | pill |
| Tags/badges (status) | `rounded-lg` | 8px |
| Tags/badges (pill) | `rounded-full` | pill |
| Progress bars | `rounded-full` | pill (r=30) |
| Toggle switches | `rounded-full` | pill |
| Nav tabs | `rounded-none` | 0 |

---

## 5. Component Standards

### Page Layout
- Page background: `bg-fw-wash` (#f8fafb) - NEVER white
- Content max-width: 1280px (max-w-7xl)

### Hero Banners (Promotional/Feature Banners)
- Background: `bg-gradient-to-br from-[#0057b8] via-[#003d82] to-[#009fdb]` (AT&T brand gradient)
- NEVER `bg-black`, `bg-gray-900`, `bg-slate-900`, or any dark/black solid
- Radius: `rounded-2xl` (16px) or `rounded-[32px]` (32px) for marketplace hero
- Text on banner: `text-white`, secondary text `text-white/80`
- Badge tags on banner: `bg-white/15 text-white rounded-lg`
- CTA button on banner: `bg-white text-[#0057b8] rounded-full` (inverted primary)
- Decorative icons: `text-white/20` for background, `text-white` for foreground
- Modal overlays are the ONLY valid use of `bg-black` (as `bg-black/40` or `bg-black bg-opacity-50`)

### Promo Strips (Inline Promotional Bars)
- Background: `bg-gradient-to-r from-[#0057b8] to-[#009fdb]` (horizontal AT&T gradient)
- Radius: `rounded-2xl` (16px)
- Text: `text-white font-bold`, description `text-white/90`

### Cards
- Background: `bg-fw-base` (#ffffff) with `border border-fw-secondary` (#dcdfe3)
- Radius: `rounded-2xl` (16px)
- Card title: `text-figma-lg font-bold text-fw-heading` or `font-medium`
- Card description: `text-figma-base font-medium text-fw-body`
- Card tags: `bg-fw-neutral rounded-lg` text 12px
- Card icon container: 40x40, `bg-fw-wash rounded-lg`

### Tables
- Container: `rounded-2xl` (16px) with `border border-fw-secondary`
- Header: `text-figma-base font-medium text-fw-heading bg-fw-wash`
- Header text is NOT uppercase, NOT tracking-wider
- Row height: 48px (3rem)
- Row dividers: `border-fw-secondary`
- Body text: `text-figma-base font-medium text-fw-heading` (names), `text-fw-body` (secondary)

### Buttons
- Primary: `bg-fw-primary text-white rounded-full` h=36px
- Outline: `border-[#0057b8] text-[#0057b8] rounded-full` - NOT gray border
- Disabled: `bg-fw-disabled text-fw-disabled rounded-full`
- Icon button: 36x36, `rounded-full`, 20x20 icon

### Search Bar
- `rounded-full bg-fw-base border border-fw-secondary`
- Width: 560px, Height: h-10 (40px)
- Icon: 20x20, Placeholder: `text-fw-bodyLight`

### Inputs/Forms
- Height: `h-10` (40px)
- Radius: `rounded-lg` (8px)
- Border: `border-fw-secondary` resting, `border-fw-active` focus
- Focus ring: `0 0 0 2px rgba(0, 87, 184, 0.15)`

### Navigation
- Nav bar height: 64px, `bg-fw-wash`, bottom border `border-fw-secondary`
- Nav items: 14px medium, gap=8 icon-to-text
- Utility icons: 20x20, separated by vertical dividers
- Vertical separator lines: `h-5 w-px bg-fw-secondary` (20px tall)

### Icon Sizes
- Inline (body text): `h-4 w-4` (16px)
- Navigation: `h-5 w-5` (20px)
- Stat cards/containers: `h-6 w-6` (24px)

### Sidebar
- Vertical tab group width: 186px
- Overlay nav panel width: 320px

### Modals
- Radius: `rounded-3xl` (24px)
- Title: `text-figma-xl font-bold text-fw-heading`
- Overlay: `bg-black/40`
- Max-width: 720px

---

## 6. Color Usage Rules

### NEVER use these Tailwind defaults:
- `gray-50`, `gray-100`, `gray-200`, ..., `gray-900` - use `fw-gray-*` tokens
- `slate-50`, `slate-100`, etc. - use `fw-*` tokens
- `bg-white` - use `bg-fw-base`
- `text-gray-*` - use `text-fw-heading`, `text-fw-body`, `text-fw-bodyLight`

### Status Colors (always these exact values):
- Success: `fw-success` (#2d7e24)
- Error: `fw-error` (#c70032)
- Warning: `#ff8500` (orange) or `#ea712f` (fw-warn)
- Info: `#0074b3` (functional blue)

### Provider Accents:
- AT&T brand: `brand-accent` (#009fdb)
- Primary interactive: `brand-blue` / `fw-primary` (#0057b8)

---

## 7. Page-specific Figma Frame IDs

### Create Wizard
- Step 1 (Cloud Router Name): 5052:129307
  - Wizard container: 1152x720, fill=#ffffff, r=24
  - Step circles: 20x20 ellipse, fill=#878c94, text 14px w500 #ffffff
  - Completed step: fill=#2d7e24, check icon
  - Step connector: 132x2, fill=#d9d9d9, r=800
  - Input field: 500x36, stroke=#686e74/1.0, r=8
  - Hint text: 10px w500 #878c94
- Step 2 (Connection Type): 5052:121727
  - Type cards: 1024x180, stroke=#dcdfe3/1.0, r=16
  - Disabled cards: fill=#f8fafb, stroke=#dcdfe3
  - Coming soon badge: fill=#000000 r=8, text 12px w500 #ffffff
- Step 3 (Choose Provider): 5052:128451

### Manage - Connections Grid
- Frame: 237:15043

### Manage - Connection Detail
- Overview: 5052:14020
- Network/Links: 5049:27755
- Network/Cloud Routers: 6473:35730
- Network/Functions: 6473:29419

### Monitor
- Overview: 2549:26900
  - Performance summary: 1152x240, r=16
  - Metric cells: 264x144, fill=#f8fafb, r=8
  - Values: 24px w700 #1d2329
  - Labels: 16px w700 #1d2329
  - Sub-labels: 14px w500 #454b52
  - Toolbar dropdowns: 330x36, stroke=#686e74/1.0, r=8

### Reports (5052:72020)
- Sidebar: vertical nav, active fill=#0057b8 r=8
- Report cards: 447x376, r=24
- Generate button: fill=#0057b8, r=800

### Configure - Users (762:37337)
- Sidebar tabs: vertical, active fill=#0057b8 r=8
- User table: fill=#ffffff, r=16
- User avatars: 48x48 ellipse fill=#f8fafb
- Active badge: fill=#2d7e24 r=8, text 10px w500

### Help/Information Center (5098:39625)
- Hero banner: 1152x304, fill=#000000, r=16
- Resource cards: 368x320, r=16
- Coming soon badge: fill=#af29bb r=8

### Last Mile Modal (6985:48515, 6985:48800)
- Modal: 762x588, fill=#ffffff, r=24
- AWS bar: 714x80, fill=#0057b8, r=8
- Type cards: 345x320, r=16

---

## 8. Frames with NO Prototype Implementation

These Figma frames exist but have no corresponding code in the application yet.

| Frame | Figma ID | Notes |
|-------|----------|-------|
| Login screen | 5052:154644 | No auth UI implemented |
| Onboarding flow | 2050:22322 | 11 sub-frames: T&C, theme selection, timezone, walkthrough |
| Oracle Advanced Settings | 5164:40393 | Provider disabled state |
| Microsoft Government | 5164:41336 | Gov cloud provider variant |
| Ticketing index | 5994:21142 | Support ticket list |
| Ticketing detail | 5994:23587 | Individual ticket view |
| Ticket detail (alt) | 5466:19129 | Alternate ticket layout |
| Offboarding step 1 | 5397:4595 | Account deactivation flow |
| Offboarding step 2 | 5397:6121 | Data export options |
| Offboarding step 3 | 5397:6415 | Service disconnection |
| Offboarding step 4 | 5397:6714 | Confirmation |
| Offboarding step 5 | 5397:7013 | Final summary |
| No Internet page | 3716:13320 | Offline state |
| Maintenance modal 1 | 3831:245 | Scheduled maintenance notice |
| Maintenance modal 2 | 3831:330 | Emergency maintenance notice |
| Minimized Network Designer | 1969:18899 | Collapsed designer view |
| Pano View | 5466:31626 | Panoramic network visualization |
| Regional Performance | 5705:27571 | Geographic performance map |
| Multi-tenant Selector | 762:49818 | Nav dropdown for tenant switching (admin pages exist, no nav dropdown) |
