# Lessons Learned

## 2026-03-22

### 1. Fix the root cause, not the symptom
**Correction:** User asked to standardize tables TWICE. I fixed BaseTable's border but missed EnhancedTable and all section wrappers. Then fixed some wrappers but missed others.
**Rule:** When fixing a pattern issue, grep the ENTIRE codebase for ALL instances. Do not fix one file and declare done.
**How to apply:** `grep -rn "pattern" src/` before and after fixing. Count instances. Fix ALL of them.

### 2. Build shared components FIRST, not inline patches
**Correction:** User asked for consistent search/filter bars. I patched individual files with inline changes instead of building a shared SearchFilterBar component upfront.
**Rule:** If the same UI pattern appears in 3+ places, create a shared component BEFORE touching any instance. Then wire all instances to use it.
**How to apply:** Count how many files have the pattern. If >= 3, create the component first.

### 3. Verify by looking at EVERY affected page, not just one
**Correction:** Declared table borders "fixed" after checking only the Pools list view. Links, VNFs, Cloud Routers still had double borders.
**Rule:** After any shared component change, screenshot EVERY page that uses it. Not just the one you're looking at.
**How to apply:** List all consumers of the changed component. Visit each one. Screenshot.

### 4. Don't declare done until the user's actual complaint is resolved
**Correction:** User said "Create Connection doesn't right-align." I measured bounding boxes and said they matched. The visual problem was that the search bar was fixed-width leaving dead space.
**Rule:** Look at the screenshot with the user's eyes. If something looks wrong, it IS wrong. Don't argue with measurements.

### 5. Read the behavioral guidelines at session start
**Correction:** Had the guidelines in memory but didn't actively follow them. No lessons file. No self-improvement loop.
**Rule:** Read feedback_behavioral_guidelines.md at the start of every session. Create tasks/lessons.md immediately.

### 6. Build the common component AFTER perfecting one instance
**Correction:** Tried to standardize tables across 19 files without having a single perfect reference. Each fix was partial.
**Rule:** Perfect ONE table completely (alignment, borders, sort, gear, overflow, column visibility, SearchFilterBar). Then extract the pattern into a shared component. Then wire all instances.

### 7. Compare feature-by-feature, not just structure
**Correction:** Said Logs matched Connections but missed sort arrows, gear icon, and column visibility. Compared container/border structure but not interactive features.
**Rule:** Make a checklist: container, border, thead border-b, sort arrows, gear icon, column visibility, divide-y on tbody, hover states, overflow menu alignment, text truncation, table-fixed. Check EVERY item.

### 8. Components often have mobile AND desktop render paths
**Correction:** Fixed Refresh button in the mobile render path of DashboardFilters but the desktop path (line 352) still had variant="ghost".
**Rule:** When fixing a component, search for ALL instances of the element. grep the file for the handler name (e.g. handleRefresh) to find every render path.

### 9. The table pattern (from Connections ListView)
**Standard checklist:**
- Container: `rounded-lg border border-fw-secondary overflow-hidden`
- No parent `p-6` wrapper that misaligns edges
- `<table className="w-full table-fixed">`
- `<thead className="bg-fw-wash border-b border-fw-secondary">`
- Header cells: `px-6 h-12 text-[14px] font-medium text-fw-heading whitespace-nowrap overflow-hidden text-ellipsis align-middle`
- Sort arrows: ChevronUp/ChevronDown per sortable column
- Gear column: `w-16 px-6 h-12 align-middle` with Settings icon + ColumnVisibilityPopover
- `<tbody className="bg-fw-base divide-y divide-fw-secondary">`
- Row: `hover:bg-fw-wash transition-colors cursor-pointer`
- Body cells: `px-6 py-4 text-[14px] text-fw-body whitespace-nowrap overflow-hidden text-ellipsis`
- Actions cell: `w-16 px-6 py-4` with `flex justify-end` wrapper
- Column visibility: useColumnVisibility hook, guard `visibleColumns.length === 0` to show all
- SearchFilterBar inside border: `px-6 py-4 border-b border-fw-secondary`
