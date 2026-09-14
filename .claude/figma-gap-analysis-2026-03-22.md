# Figma Gap Analysis - Updated 2026-03-22
## File: Z2DZTBbatSi8miUWWf5g7B (SDCI.fig)

---

## 1. INVENTORY SUMMARY

| Category | Figma Frames | In Prototype | Needs Cleanup | Missing | Design Ref | Concept |
|----------|-------------|-------------|---------------|---------|------------|---------|
| Entry & Access | 5 | 5 | 0 | 0 | 0 | 0 |
| Create (Wizard + Designer) | 32 | 32 | 0 | 0 | 0 | 0 |
| Manage (Connections + Pools) | 80 | 71 | 2 | 0 | 0 | 0 |
| Monitor | 79 | 72 | 1 | 0 | 0 | 0 |
| Configure | 31 | 29 | 1 | 0 | 0 | 0 |
| NetBond Legacy | 19 | 0 | 0 | 0 | 0 | 19 |
| Utility | 35 | 22 | 2 | 1 | 0 | 0 |
| Help & Ticketing | 35 | 30 | 5 | 0 | 0 | 0 |
| Elements (Design System) | 28 | - | - | - | 28 | 0 |
| Concepts & Future | 86 | 6 | 0 | 0 | 0 | 80 |
| **TOTAL** | **430** | **267** | **11** | **1** | **28** | **99** |

---

## 2. WHAT WAS FIXED THIS SESSION

| Item | Frames | Status |
|------|--------|--------|
| Pools grid view card layout | 2 | Done - 2-col grid, aligned toolbar, Manage Pool button |
| Pools list view badges | 2 | Done - uppercase status, 0.16 opacity, no extraneous icons |
| Pools toolbar | 2 | Done - matches Connections toolbar pattern (ghost buttons, dividers, filled CTA) |
| Create Pool Wizard | 5 | Done - restyled AddGroupModal (1056x636, stepper, Figma inputs, Button component) |
| Onboarding | 4 | Done - default landing page, theme step removed, Figma PNGs, Skip button, animations |
| Design library: Badge | - | Done - shared Badge.tsx with TypeBadge, StatusBadge, color maps |
| Design library: buttons.css | - | Done - 175 lines of !important reduced to 56 clean lines |

**Net change: 8 frames moved from ⚠️/❌ to ✅. Create Pool Wizard moved from ❌ MISSING to ✅ EXISTS.**

---

## 3. MISSING PROTOTYPE SCREENS (Figma exists, no prototype)

| # | Figma Frames | IDs | Priority | Effort |
|---|-------------|-----|----------|--------|
| 1 | **Maintenance page** (3 frames) | 3725:32623, 3831:980, 6394:30670 | Medium | Small - static page with scheduled downtime display |
| 2 | **News page** (1 frame) | 3831:25485 | Low | Small - announcements/updates list |
| 3 | **Impersonation mode** (2 frames) | 5875:21372, 5875:22138 | Low | Medium - admin user-switching UI + multi-tenant selector |

**Create Pool Wizard is no longer missing** - implemented this session.

---

## 4. PROTOTYPE SCREENS NEEDING CLEANUP

| # | Screen | Frames | Issue | Priority |
|---|--------|--------|-------|----------|
| 1 | **Marketplace Products/Solutions** | 2 | 2-col layout vs Figma 3-col (270px cards). Content density makes 2-col more usable. Layout choice, not a bug. | Low |
| 2 | **Insights Dashboard** | 7 | Widget dashboard empty state is correct. Figma variants are pre-filled states. Need default widgets pre-loaded. | Medium |
| 3 | **Edit Connection** | 2 | Edit mode exists but form styling needs Figma comparison (h-9 inputs, #686e74 borders). | Medium |
| 4 | **Custom Reports** | 1 | Partial implementation - 8 Figma frames show full custom report builder. | Medium |
| 5 | **Configure Policies** | 1 | Needs Figma comparison for layout/spacing. | Low |
| 6 | **CMS Banner admin** | 5 | Admin-only editor for help section banners. Low priority unless admin features are in scope. | Low |
| 7 | **User Profile Edit** | 1 | Partial - edit mode exists but needs Figma review. | Low |
| 8 | **Feedback Widget** | 11 | 11 Figma frames for floating feedback flow. Partially implemented. | Low |
| 9 | **IPAM Create Asset** | 6 | 6-step asset creation flow. Partially implemented. | Low |

---

## 5. DESIGN LIBRARY GAP ANALYSIS

### 5.1 Completed (this session)

| Component | Status | Details |
|-----------|--------|---------|
| **Badge** | Done | `src/components/common/Badge.tsx` - TypeBadge, StatusBadge, healthColors, poolTypeColors, statusColors |
| **buttons.css** | Done | Removed global `rounded-full !important`. 175 -> 56 lines. No more specificity wars. |
| **Button disabled state** | Done | Shared `opacity-50 cursor-not-allowed` pattern via Button component |

### 5.2 Remaining Gaps

| Component | Current State | Figma Spec | Effort |
|-----------|--------------|------------|--------|
| **Form inputs** | Inline styles scattered (h-9, border #686e74, r=8). Each component defines its own. | Centralized: h-9, px-3, text-[14px], border #686e74, rounded-lg, focus ring #0057b8 | Small - extract CSS utility classes or shared input component |
| **Table component** | BaseTable exists but 20 Figma reference frames define advanced patterns (gear button, filters, multi-select, column resize, overflow) not yet implemented. | Full-featured table with column management, row selection, filter bar, sort indicators | Large - systematic audit of BaseTable against 20 Figma table frames |
| **Card component** | Multiple card patterns: connection cards (rounded-2xl), pool cards (rounded-[16px]), widget cards (rounded-lg), mode selection cards (rounded-xl). No shared base. | Consistent card patterns per context: connection/pool cards at r=16, widgets at r=8, mode selection at r=12 | Medium - extract shared CardBase with variant slots |
| **Modal component** | Modal.tsx exists. AddGroupModal uses 1056x636/r=24 (just fixed). Other modals use different sizes. | Consistent modal pattern: dark overlay rgba(27,27,29,0.56), white content r=24, right-aligned pill buttons | Small - standardize Modal wrapper with Figma overlay/radius |
| **Separator** | Inconsistent: `mx-6 border-t`, `border-t border-fw-secondary`, `h-px bg-fw-secondary`. | Figma uses 1px #dcdfe3 lines, typically at full card width or 320px within cards | Small - document pattern, no new component needed |
| **Tag/Pill** | Tags in pool cards use inline styling (r=800, h=28, bg-fw-wash). | Figma: r=800, h=28, bg #f8fafb, border #dcdfe3, icon 16x16, text 12px/500 #878c94 | Small - TagPill component or extend Badge |

### 5.3 Figma Design System Reference Frames (28 frames, for audit use)

These are not screens to build - they define patterns:
- **Left Menu** (3 frames): Desktop/Tablet/Mobile navigation layouts
- **Multi-tenant Selector** (2 frames): Header tenant picker patterns
- **Search** (1 frame): Header search component
- **Tables** (19 frames): Column resize, multi-select, filters, gear button, overflow
- **Modals** (3 frames): Standard modal patterns with sizing

---

## 6. PRIORITY RECOMMENDATIONS

### Immediate (high value, low effort)
1. **Form input centralization** - Extract shared input styles to avoid inline border/height duplication
2. **Insights Dashboard default widgets** - Pre-load 4 default widgets so it's not empty on first visit

### Next sprint
3. **Edit Connection styling** - Apply Figma form tokens to edit mode
4. **Custom Reports builder** - 8 Figma frames, significant feature
5. **Maintenance page** - 3 frames, static utility page

### Backlog
6. **Table audit** - Compare BaseTable against 20 Figma reference frames
7. **Card consolidation** - Shared CardBase component
8. **News page** - 1 frame, low priority
9. **Impersonation mode** - Admin feature, 2 frames
10. **CMS Banner editor** - Admin feature, 5 frames

---

## 7. WHAT DOESN'T NEED ACTION

| Category | Frames | Reason |
|----------|--------|--------|
| NetBond Legacy | 19 | Legacy VLAN creation screens. Not in scope for new prototype. |
| Concepts & Future | 80 | Exploration/iteration frames. Not expected in prototype. |
| Presentation Slides | 18 | Slide decks for stakeholder presentations. |
| Cover | 1 | Figma file thumbnail. |
