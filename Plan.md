# Plan.md - AT&T NetBond SDCI UI Enhancement Implementation Plan

## Overview

This document outlines the implementation plan for AT&T NetBond SDCI UI enhancements. This is a **self-contained, offline-first demo application** with no database dependencies. All data persistence uses localStorage with elegant browser caching for an optimal user experience.

**Architecture Philosophy:**
- Pure client-side application
- No backend required
- No authentication system
- localStorage for all persistence
- BroadcastChannel API for cross-tab sync
- Works completely offline
- Optimized bundle size
- Production-ready demo/vision mock-up

---

## PART 1: FONT SCALING SYSTEM (90 min)

### Chunk 1A: Font Size Store Slice (20 min)
**Create: src/store/slices/fontSizeSlice.ts**

**Implementation Steps:**
- Define interface: `{ fontSize: 87.5 | 100 | 112.5 | 125 }`
- State: `fontSize: number` (default 100)
- Action: `setFontSize(size: number)`
- Action: `loadFromStorage()` - reads from localStorage on init
- Persistence key: `netbond_font_size`
- Load persisted value on store initialization

**TypeScript Interface:**
```typescript
export interface FontSizeSlice {
  fontSize: number;
  setFontSize: (size: number) => void;
}
```

**localStorage Structure:**
```json
{
  "netbond_font_size": 100
}
```

**Optimization:**
- Single state value (minimal memory)
- Synchronous localStorage writes (fast)
- No debouncing needed (infrequent changes)

**Test Immediately:**
```typescript
const store = useStore();
store.setFontSize(112.5);
console.log(localStorage.getItem('netbond_font_size')); // "112.5"
```

**Success Criteria:** Font size state managed, persists correctly

---

### Chunk 1B: Font Scaling CSS Foundation (20 min)
**Update: src/index.css**

**Implementation Steps:**
- Add CSS custom property: `:root { --font-scale: 1; }`
- Add smooth transition: `* { transition: font-size 0.3s ease; }`
- Update all base font-size declarations to use: `calc(1rem * var(--font-scale))`
- Ensure rem units used throughout (not px for fonts)

**CSS Updates:**
```css
:root {
  --font-scale: 1;
}

html {
  font-size: calc(16px * var(--font-scale));
}

body {
  transition: font-size 0.3s ease;
}
```

**Optimization:**
- Single CSS variable prevents re-renders
- Hardware-accelerated transition
- Uses native CSS cascade (no JS overhead)

**Test Immediately:**
- Manually change `--font-scale` in DevTools
- Verify entire UI scales smoothly
- Check no layout shifts

**Success Criteria:** CSS foundation ready, smooth transitions

---

### Chunk 1C: Font Scale Application Utility (15 min)
**Create: src/utils/fontScale.ts**

**Implementation Steps:**
- Function to apply font scale to DOM
- Convert percentage to scale factor: `87.5% → 0.875`
- Apply using `document.documentElement.style.setProperty()`
- Use `requestAnimationFrame` for smooth application

**Code:**
```typescript
export function applyFontScale(percentage: number): void {
  const scale = percentage / 100;
  requestAnimationFrame(() => {
    document.documentElement.style.setProperty('--font-scale', scale.toString());
  });
}
```

**Optimization:**
- requestAnimationFrame ensures smooth visual update
- Direct DOM manipulation (faster than React state)
- Single reflow/repaint

**Success Criteria:** Utility function works, smooth application

---

### Chunk 1D: Apply Font Scaling to DOM (30 min)
**Update: src/main.tsx**

**Implementation Steps:**
- Import `applyFontScale` utility
- Read `fontSize` from store on mount
- Apply to DOM on initial load
- Add storage event listener for cross-tab sync
- Apply on storage event from other tabs

**Code Pattern:**
```typescript
import { useStore } from './store/useStore';
import { applyFontScale } from './utils/fontScale';

// On app initialization
useEffect(() => {
  const fontSize = useStore.getState().fontSize;
  applyFontScale(fontSize);

  // Cross-tab sync
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === 'netbond_font_size' && e.newValue) {
      applyFontScale(parseFloat(e.newValue));
    }
  };

  window.addEventListener('storage', handleStorageChange);
  return () => window.removeEventListener('storage', handleStorageChange);
}, []);
```

**Optimization:**
- Single CSS variable prevents component re-renders
- Passive event listener (better scroll performance)
- Cleanup on unmount

**Test Immediately:**
- Start app, check computed style in DevTools
- Change font size in store
- Verify entire UI scales smoothly
- Open second tab, change size, verify first tab updates

**Success Criteria:** All text scales smoothly, no jank, cross-tab sync works

---

### Chunk 1E: Font Size UI in UserProfile (20 min)
**Update: src/components/profile/UserProfile.tsx**

**Implementation Steps:**
- Import `fontSize` from store
- Add new section after "User Preferences"
- Create 4 radio buttons with labels:
  - Small (87.5%)
  - Normal (100%)
  - Large (112.5%)
  - Extra Large (125%)
- Wire `onChange` to `setFontSize()` and `applyFontScale()`
- Show current selection with CheckCircle icon
- Add toast notification on change
- Style consistently with existing sections

**UI Structure:**
```tsx
<div className="space-y-4">
  <h3>Font Size</h3>
  <fieldset>
    <legend className="sr-only">Choose font size</legend>
    {[
      { value: 87.5, label: 'Small' },
      { value: 100, label: 'Normal' },
      { value: 112.5, label: 'Large' },
      { value: 125, label: 'Extra Large' }
    ].map(option => (
      <label key={option.value}>
        <input
          type="radio"
          name="fontSize"
          value={option.value}
          checked={fontSize === option.value}
          onChange={() => handleFontSizeChange(option.value)}
        />
        {option.label}
        {fontSize === option.value && <CheckCircle />}
      </label>
    ))}
  </fieldset>
</div>
```

**Best Practices:**
- Semantic HTML: radio buttons in fieldset with legend
- ARIA labels for accessibility
- Visual feedback on selection
- Toast notification for confirmation

**Test Immediately:**
- Navigate to `/profile`
- Click each font size option
- Verify UI scales immediately
- Verify toast appears
- Refresh page, verify selection persists

**Success Criteria:** Font size changes instantly, persists, shows feedback

---

### CHECKPOINT 1 COMPLETE ✓

**Validation:**
- Font scaling working end-to-end
- localStorage persistence working
- Cross-tab sync working
- Performance: <2KB bundle addition
- No component re-renders on scale change

**Run Tests:**
```bash
npm run test
npm run build
# Check bundle size increase
```

---

## PART 2: COLUMN VISIBILITY SYSTEM (125 min)

### Chunk 2A: Column Visibility Store Slice (30 min)
**Create: src/store/slices/columnVisibilitySlice.ts**

**Implementation Steps:**
- Define interface: `ColumnConfig = Record<tableId, string[]>`
- Create default column sets for each table ID
- State: `columnVisibility: Record<string, string[]>`
- Action: `getVisibleColumns(tableId)` - selector
- Action: `setVisibleColumns(tableId, columns)` - setter
- Action: `toggleColumn(tableId, columnId)` - toggle single
- Action: `showAllColumns(tableId)` - show all
- Action: `hideAllColumns(tableId)` - keep minimum 2 visible
- Action: `resetToDefaults(tableId)` - restore defaults
- Persist to localStorage per table: `netbond_columns_${tableId}`
- Load from localStorage on init with fallback to defaults

**TypeScript Interface:**
```typescript
export interface ColumnVisibilitySlice {
  columnVisibility: Record<string, string[]>;
  getVisibleColumns: (tableId: string) => string[];
  setVisibleColumns: (tableId: string, columns: string[]) => void;
  toggleColumn: (tableId: string, columnId: string) => void;
  showAllColumns: (tableId: string) => void;
  hideAllColumns: (tableId: string) => void;
  resetToDefaults: (tableId: string) => void;
}
```

**Default Columns Map:**
```typescript
const DEFAULT_COLUMNS = {
  'connections-grid': ['name', 'status', 'type', 'bandwidth', 'location'],
  'connections-list': ['name', 'status', 'type', 'bandwidth', 'location', 'provider'],
  'groups-list': ['name', 'type', 'members', 'connections', 'status'],
  'users-list': ['name', 'email', 'role', 'status', 'lastActive'],
  // ... other tables
};
```

**localStorage Structure:**
```json
{
  "netbond_columns_connections-grid": ["name", "status", "bandwidth"],
  "netbond_columns_groups-list": ["name", "type", "members"]
}
```

**Success Criteria:** Column state managed per table, persists correctly

---

## CONSISTENCY IMPROVEMENTS

### Column Gear Element Standardization

**Problem:** Three different implementations exist across the codebase
1. EnhancedTable.tsx - Settings icon + ColumnVisibilityPopover ✓ CORRECT
2. ListView.tsx - Custom ColumnSelector component
3. ColumnSelector.tsx - Standalone with drag-and-drop

**Solution:** Standardize on EnhancedTable.tsx pattern
- Settings gear icon in toolbar (right side)
- Opens ColumnVisibilityPopover
- Uses useColumnVisibility hook
- Persists to localStorage via store

---

## KEY ARCHITECTURE PRINCIPLES

### No Database / No Backend
- Zero backend dependencies
- Pure localStorage persistence
- No API calls (except sample data loading)
- No authentication system
- Completely offline-capable
- Self-contained demo application

### Browser-Only Storage
- localStorage for all persistent data
- BroadcastChannel API for cross-tab sync
- localStorage fallback for BroadcastChannel
- WeakMap for temporary references (auto GC)
- No IndexedDB (keep it simple)

### Performance Targets
- <20KB total bundle increase
- 95+ Lighthouse score
- <100ms cross-tab sync
- 60fps smooth scrolling
- <3s Time to Interactive

---

## IMPLEMENTATION TIMELINE

**Total: 20-22 hours**

1. Font Scaling (1.5 hours)
2. Column Visibility (2 hours)
3. Table Detachment (5 hours)
4. Performance Optimization (3 hours)
5. Table Integration (1.5 hours)
6. Consistency Improvements (2 hours)
7. Documentation (2 hours)
8. Testing (4.5 hours)

---

## SUCCESS CRITERIA

✅ Font scales smoothly across entire app
✅ Persists to localStorage
✅ Column management on all tables
✅ Table detachment with bidirectional sync
✅ <20KB bundle increase
✅ 95+ Lighthouse score
✅ WCAG AA accessible
✅ Works completely offline

---

*This is a database-independent, offline-first application using only localStorage for persistence.*
