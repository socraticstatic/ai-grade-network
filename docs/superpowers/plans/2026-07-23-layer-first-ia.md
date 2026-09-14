# Layer-First IA Implementation Plan

> **For agentic workers:** Execute task-by-task; each task ends independently
> testable. Spec: docs/superpowers/specs/2026-07-23-layer-first-ia-design.md

**Goal:** Replace the flat 9-link nav with layer-first navigation (dropdowns),
add vertical stack traversal (rail + Discover front door), and ship a
standalone /stack concept deck in the Intent style.

**Architecture:** navItems.ts stays the single source of truth; it gains layer
metadata and a counterpart-path helper. MainNav renders dropdowns from it.
StackRail and the Discover stack panel are new leaf components. /stack is a
standalone route outside DashboardLayout.

**Tech stack:** React 18, react-router (HashRouter), Tailwind + fw-* Flywheel
tokens, vitest + RTL, Playwright.

## Global constraints
- Routes /ai/* and /naas/* do not change; no new verb routes.
- No nav item may point at a page that does not exist (Cloud, Transport are
  vision strata only, visually distinct and labeled).
- Verb labels never appear twice in the same visible surface.
- fw-* tokens only; no raw grays. Deck page may use the Intent deck's literal
  palette (#001a3d, #f8fafb, #dcdfe3, #0057b8, #009fdb) — it is a document,
  not app chrome.
- All existing e2e suites end green: `npm run verify`.

---

### Task 1: navItems.ts → NAV_LAYERS + counterpartPath
**Files:** modify src/components/navigation/navItems.ts,
src/components/navigation/navItems.test.ts

- Rename `NavDomain`→`NavLayer`, `NAV_DOMAINS`→`NAV_LAYERS` (keys stay
  'naas' | 'ai'). Add `tagline: string` per layer (rail/stack copy).
- Add and test:
```ts
/** Same verb, other layer: /ai/cost ↔ /naas/cost. Falls back to the
 *  target layer's first item when pathname isn't a verb page. */
export function counterpartPath(pathname: string, target: NavLayer['key']): string
```
- Tests: counterpart both directions for all four verbs; fallback for
  /discover and unknown paths; NAV_ITEMS order unchanged (Discover first).
- Grep all `NAV_DOMAINS` consumers (MainNav, MobileMenu, NavigationContext,
  tests) and update imports in the same commit so the build never breaks.

### Task 2: MainNav layer dropdowns
**Files:** create src/components/navigation/LayerMenu.tsx (+test), modify
MainNav.tsx, MainNav.test.tsx, MainNav.curated.test.tsx

- LayerMenu: trigger (layer label + chevron) + panel (blurb, 4 verb rows with
  AttIcon, label, description). Open on hover-intent (150ms) or click;
  closes on Esc / outside click / route change. aria-haspopup="menu",
  aria-expanded, panel role="menu", items role="menuitem"; ArrowDown/Up
  cycle, Home/End, Esc returns focus to trigger.
- Trigger active (underline/active token) when isNavRouteActive for any item
  in the layer.
- MainNav: replace the grouped flat row with Discover + LayerMenu × NAV_LAYERS.
  Keep TourLauncher slot, right cluster, and the `items` escape hatch.
- Check the existing "+ Create" button: its menu entries must each name their
  layer (verb-first global action per spec). If no menu exists, single global
  Create menu listing NaaS + AI creatable entry points.
- Tests: dropdown opens/closes, keyboard path, unique visible labels when
  closed, active-state mapping, tour button still reachable.

### Task 3: StackRail
**Files:** create src/components/navigation/StackRail.tsx (+test), modify
DashboardLayout (mount; find it via grep "DashboardLayout").

- Renders only when pathname matches /^\/(ai|naas)\// and viewport ≥1280
  (CSS hidden below, same pattern as MainNav's min-[1280px]).
- Top-to-bottom: AI Fabric segment, dashed "Cloud — next" slot
  (aria-hidden, pointer-events-none, visibly a roadmap marker), NaaS segment.
- Current layer lit (fw-active border + label); other layer is a Link to
  counterpartPath(pathname, otherKey) with title="[Verb], on the [layer]".
- Fixed left, vertically centered, ~44px wide, must not overlap content:
  add left padding to the layer-page container at ≥1280 only.
- Tests: renders on /ai/cost with NaaS link to /naas/cost; absent on
  /discover; Cloud slot non-interactive.

### Task 4: Discover stack panel
**Files:** create src/features/discover/StackPanel.tsx (+test), mount at top
of DiscoverPage/UnifiedDiscovery (above existing sections; keep all
data-tour anchors).

- Four bands, top to bottom: AI Fabric (live → /ai/connect…verbs listed),
  Cloud (vision band; deep-link caption → /naas/connect), NaaS (live),
  Transport & Access (vision; media tiles Fiber · Dark fiber · Wireless ·
  Satellite, non-navigating). Live vs vision bands visually distinct
  (solid vs dashed border, fw tokens).
- Tests: live bands navigate, vision bands don't render links to
  nonexistent routes.

### Task 5: /stack concept deck  (delegated to parallel agent, worktree)
**Files:** create src/features/stack-deck/StackDeckPage.tsx (+ sections as
needed, render test), modify App.tsx (standalone route beside /onboarding).

- Full spec section 5: cover, premise, interactive matrix, elevation with the
  email's two journeys, when/then rules, before/after nav, sticky-columns
  close. Print styles per Intent deck. Vocabulary equivalence strip:
  Create≈Connect, Configure≈Govern, Monitor≈Observe, + Cost.
- Render test: every section heading present; live-row links point at real
  routes; vision rows carry no app links.

### Task 6: Dependent sweep + verify
**Files:** MobileMenu(.test), NavigationContext, CommandPalette (grep
NAV_ITEMS/NAV_DOMAINS), e2e: domain-split, mobile-nav, tour, smoke,
discover-routes; new e2e/stack.spec.ts.

- e2e stack.spec.ts: Discover → click NaaS band → land /naas/connect →
  open AI Fabric dropdown → /ai/govern → rail hop → /naas/govern →
  visit /stack → matrix visible → print header present.
- `npm run verify` green.

### Task 7: Browser verification + merge
- preview_start, walk the full flow as a user at desktop and mobile widths,
  screenshot: new bar closed + open, rail, Discover stack, /stack cover +
  matrix. Fix anything seen. Merge feat/layer-first-ia → main.
