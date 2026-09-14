# Cloud Router → Container Full Rename Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the user-facing concept and all supporting code/data from "Cloud Router" to "Container" across the entire app — UI text, routes, RBAC scope keys, TypeScript types, the Zustand store slice, tests, and docs — while keeping the existing icon visual unchanged.

**Architecture:** Mechanical, tiered rename executed outside-in: (1) user-facing strings, (2) routes + redirects, (3) RBAC scope keys, (4) TypeScript identifiers (types/components/store), (5) tests, (6) docs. Each tier ends with a typecheck/build/test gate and a commit so the app is always in a working state. The icon component is renamed for consistency but its rendered SVG/glyph is untouched.

**Tech Stack:** React + TypeScript + Vite + Zustand, React Router (HashRouter), Playwright (e2e), Vitest (unit).

**Decision (locked):** Full rename — every tier. "Container" is the singular noun; "Containers" plural. Icon keeps its current glyph.

**Sequencing note:** Execute this plan BEFORE the wizard-restructure plan (`2026-06-15-connection-wizard-restructure.md`). The wizard references `cloudRouterName` and "Cloud Router" copy; doing the rename first means the wizard plan operates on already-renamed identifiers.

---

## Canonical Rename Mapping

Apply this mapping consistently. Left = old, right = new.

| Old | New | Where |
|---|---|---|
| `Cloud Router` | `Container` | UI text (singular) |
| `Cloud Routers` | `Containers` | UI text (plural) |
| `cloud router` / `cloud routers` | `container` / `containers` | lowercase UI/comments |
| `CloudRouter` | `Container` | type/interface/component names |
| `cloudRouter` | `container` | variables, props, store fields |
| `cloudRouters` | `containers` | arrays/collections |
| `CloudRouterIcon` | `ContainerIcon` | icon fn name (glyph unchanged) |
| `cloudRouter` (icon name string) | `container` | `AttIcon name="..."` calls |
| `/cloud-routers` | `/containers` | route paths / URL segments |
| `cloud-router:*` | `container:*` | RBAC permission/scope keys |
| `cloudRouterSlice` / `CloudRouterSlice` | `containerSlice` / `ContainerSlice` | store slice |
| `createCloudRouterSlice` | `createContainerSlice` | store factory |
| `cloud-routers.csv` | `containers.csv` | export filename |

**Do NOT change:** the icon's actual SVG path / glyph data. Only the function/identifier name changes.

---

## Pre-flight: branch + baseline

- [ ] **Step 1: Create a feature branch**

```bash
cd /Users/micahbos/Developer/att-netbond-sdci
git checkout -b feat/rename-cloud-router-to-container
```

- [ ] **Step 2: Capture a clean baseline so every later gate is comparable**

```bash
npm run typecheck 2>&1 | tee /tmp/rename-baseline-typecheck.txt
npm run build 2>&1 | tail -20
npx playwright test --list 2>&1 | tail -5
```

Expected: typecheck passes (or note any pre-existing errors to /tmp file — those are NOT yours to fix). Record the baseline; any NEW error after a tier is a regression you introduced.

- [ ] **Step 3: Produce the authoritative occurrence inventory** (excluding `src_old/` and `.claude/worktrees/`, which are not shipped)

```bash
rg -n -i --glob '!src_old/**' --glob '!.claude/worktrees/**' --glob '!playwright-report/**' \
  -e 'cloud[ _-]?router' src/ tests/ docs/ > /tmp/rename-inventory.txt
wc -l /tmp/rename-inventory.txt
```

Expected: a file listing every hit with line numbers. Keep it open as your worklist. Re-run after each tier to watch the count drop in that tier's category.

---

## Tier 1: User-facing strings

**Files (UI text — visible labels/headings/buttons/tooltips/placeholders):**
- Modify: `src/components/connection/cloudrouter/CloudRouterSection.tsx`
- Modify: `src/components/connection/ConnectionTabs.tsx`
- Modify: `src/components/connection/cloudrouter/CloudRouterModal.tsx`
- Modify: `src/components/connection/cloudrouter/DeleteCloudRouterModal.tsx`
- Modify: `src/components/pages/CloudRouterDetailPage.tsx`
- Modify: `src/components/pages/GlossaryPage.tsx`
- Modify: `src/data/tourSteps.ts` (visible tour copy only — NOT the `id:` fields yet)
- Modify: `src/components/**/ConceptHierarchyDiagram.tsx`
- Plus any other UI_TEXT hits from `/tmp/rename-inventory.txt`

> Note: filenames are renamed in Tier 4, not here. Tier 1 changes only the **strings inside** files.

- [ ] **Step 1: Replace visible singular/plural strings**

For each UI file above, replace user-visible text only. Example edits in `CloudRouterDetailPage.tsx` — change headings/labels:

```
"Cloud Router"  → "Container"
"Cloud Routers" → "Containers"
```

Leave any code identifier (e.g. `cloudRouterName`, `CloudRouter` type) untouched in this tier. Use targeted Edit calls per occurrence; do NOT blanket-sed source files in Tier 1 (it would hit identifiers too).

- [ ] **Step 2: Verify no user-facing "Cloud Router" string remains**

```bash
rg -n 'Cloud Router' src/components | rg -v 'CloudRouter'
```

Expected: zero hits that are quoted JSX/string content. (Hits that are part of `CloudRouter` identifiers are fine — those are Tier 4.)

- [ ] **Step 3: Typecheck (strings only — should be clean)**

Run: `npm run typecheck`
Expected: no NEW errors vs `/tmp/rename-baseline-typecheck.txt`.

- [ ] **Step 4: Visual spot-check the renamed surfaces**

Start the dev server and confirm the renamed labels render. (Use the project's run skill / `npm run dev`.) Walk: Manage page → the Container section, a Container detail page, the Glossary entry, and the product tour. Confirm "Container/Containers" appears and the icon is unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/
git commit -m "rename(ui): Cloud Router → Container in all user-facing text"
```

---

## Tier 2: Routes + redirects

**Files:**
- Modify: `src/App.tsx` (route definition near line 842: `/cloud-routers/:id`)
- Modify: `src/components/**/CloudRouterTable.tsx` (`navigate()` calls, ~line 64)
- Modify: `src/components/connection/ConnectionGrid.tsx` (CSV export name, ~line 192)
- Modify: `src/data/tourSteps.ts` (tour `id: 'cloud-routers'` at ~lines 72, 130)
- Any other ROUTE hits from inventory

- [ ] **Step 1: Add the new route and a redirect from the old path**

In `src/App.tsx`, rename the primary route to `/containers/:id` and add a permanent redirect so existing bookmarks/links keep working:

```tsx
{/* New canonical route */}
<Route path="/containers/:id" element={<CloudRouterDetailPage />} />
{/* Back-compat: old links → new path (preserve :id) */}
<Route path="/cloud-routers/:id" element={<Navigate to="/containers/:id" replace />} />
<Route path="/cloud-routers" element={<Navigate to="/containers" replace />} />
```

> `Navigate` is already imported in `ConnectionWizard.tsx`; confirm `App.tsx` imports it from `react-router-dom`. If the old route used a list path too, redirect both.

- [ ] **Step 2: Update all internal navigation to the new path**

Replace every `navigate('/cloud-routers...')` and `<Link to="/cloud-routers...">` with `/containers...`:

```bash
rg -n "/cloud-routers" src/
```

Edit each hit to `/containers`. Update the CSV export filename in `ConnectionGrid.tsx`: `cloud-routers.csv` → `containers.csv`.

- [ ] **Step 3: Update tour step ids**

In `src/data/tourSteps.ts`, change `id: 'cloud-routers'` → `id: 'containers'` (both occurrences). If any component targets those ids (search `'cloud-routers'`), update those references too.

- [ ] **Step 4: Verify routing**

```bash
rg -n "/cloud-routers" src/ | rg -v 'Navigate to'
```

Expected: zero hits except the two redirect routes. Then in the running app, manually visit `#/cloud-routers/<some-id>` and confirm it redirects to `#/containers/<same-id>` and the detail page loads.

- [ ] **Step 5: Commit**

```bash
git add src/
git commit -m "rename(routes): /cloud-routers → /containers with redirects"
```

---

## Tier 3: RBAC scope keys

**Files:**
- Modify: `src/types/rbac.ts` (`cloud-router:*` at lines ~11, 107, 145-149, 442, 473-475, 529)
- Modify: `src/utils/rbacLabels.ts` (line ~7)
- Modify: `src/components/**/ScopePicker.tsx` (scope path segments)

- [ ] **Step 1: Inventory the RBAC key usages**

```bash
rg -n "cloud-router:" src/
rg -n "cloud-routers" src/types/rbac.ts src/components/**/ScopePicker.tsx
```

- [ ] **Step 2: Rename permission keys and scope path segments**

Replace `cloud-router:` → `container:` (permission keys) and the scope-path segment `cloud-routers` → `containers` (e.g. `/tenants/{t}/clients/{c}/pools/{p}/cloud-routers/{r}` → `.../containers/{r}`) in `rbac.ts`, `rbacLabels.ts`, and `ScopePicker.tsx`.

> **Data-migration caveat:** any persisted role assignments referencing `cloud-router:*` will not match the new keys. Add a normalization shim where assignments are loaded so old keys map to new at read time:

```ts
// in the RBAC loader/normalizer
const normalizeScopeKey = (k: string) =>
  k.replace(/(^|[/:])cloud-router(s?)\b/g, (_, p, s) => `${p}container${s}`);
```

Apply `normalizeScopeKey` to any scope/permission strings read from storage so existing assignments keep resolving.

- [ ] **Step 3: Typecheck + run RBAC unit/e2e**

```bash
npm run typecheck
npx playwright test tests/e2e/rbac-consistency.spec.ts tests/e2e/rbac-assignments.spec.ts
```

Expected: typecheck clean; RBAC e2e specs pass (they may need string updates — if a spec asserts the old label, update the assertion to "Container" as part of Tier 6, and note it here).

- [ ] **Step 4: Commit**

```bash
git add src/
git commit -m "rename(rbac): cloud-router:* scope keys → container:* with read-time normalization"
```

---

## Tier 4: TypeScript identifiers (types, components, store) + file renames

This is the highest-blast-radius tier. Do it in one coherent pass so the project compiles at the end.

**Files (rename file + contents):**
- `src/types/cloudrouter.ts` → `src/types/container.ts` (`CloudRouter` interface → `Container`)
- `src/store/slices/cloudRouterSlice.ts` → `src/store/slices/containerSlice.ts` (`cloudRouterSlice`/`CloudRouterSlice`/`createCloudRouterSlice`, methods `addCloudRouter`/`updateCloudRouter`/`removeCloudRouter`, state field `cloudRouters`)
- `src/store/slices/cloudRouterSlice.test.ts` → `src/store/slices/containerSlice.test.ts`
- `src/utils/vnfTypes.ts` (`CloudRouterIcon` → `ContainerIcon`, mapping `router: CloudRouterIcon` → `router: ContainerIcon`; **glyph unchanged**)
- Component files under `src/components/connection/cloudrouter/` and `src/components/cloudrouter/card/` and `src/components/pages/CloudRouterDetailPage.tsx` — rename `CloudRouter*` → `Container*`
- Every importer of the above

- [ ] **Step 1: Rename store/type files with git mv (preserves history)**

```bash
git mv src/types/cloudrouter.ts src/types/container.ts
git mv src/store/slices/cloudRouterSlice.ts src/store/slices/containerSlice.ts
git mv src/store/slices/cloudRouterSlice.test.ts src/store/slices/containerSlice.test.ts
```

- [ ] **Step 2: Rename component files with git mv**

For each `CloudRouter*.tsx` (find them first), git mv to `Container*.tsx`:

```bash
rg --files src/ | rg -i 'cloudrouter'
```

Then for each, e.g.:

```bash
git mv src/components/connection/cloudrouter/CloudRouterSection.tsx src/components/connection/cloudrouter/ContainerSection.tsx
git mv src/components/connection/cloudrouter/CloudRouterModal.tsx src/components/connection/cloudrouter/ContainerModal.tsx
git mv src/components/connection/cloudrouter/DeleteCloudRouterModal.tsx src/components/connection/cloudrouter/DeleteContainerModal.tsx
git mv src/components/connection/cloudrouter/CloudRouterTable.tsx src/components/connection/cloudrouter/ContainerTable.tsx
git mv src/components/pages/CloudRouterDetailPage.tsx src/components/pages/ContainerDetailPage.tsx
git mv src/components/cloudrouter/card/CloudRouterCard.tsx src/components/cloudrouter/card/ContainerCard.tsx
git mv src/components/cloudrouter/card/CloudRouterCardMinimized.tsx src/components/cloudrouter/card/ContainerCardMinimized.tsx
```

Then rename the containing directories:

```bash
git mv src/components/connection/cloudrouter src/components/connection/container
git mv src/components/cloudrouter src/components/container
```

(Adjust the exact list to whatever `rg --files | rg -i cloudrouter` returns.)

- [ ] **Step 3: Rewrite identifiers inside all source files**

Apply the identifier mapping across `src/` with case-aware replacements. Run these in order (most specific first):

```bash
# Icon fn (glyph unchanged, name only)
rg -l 'CloudRouterIcon' src/ | xargs sed -i '' 's/CloudRouterIcon/ContainerIcon/g'
# Store slice symbols
rg -l 'CloudRouterSlice\|cloudRouterSlice\|createCloudRouterSlice' src/ | xargs sed -i '' \
  -e 's/createCloudRouterSlice/createContainerSlice/g' \
  -e 's/CloudRouterSlice/ContainerSlice/g' \
  -e 's/cloudRouterSlice/containerSlice/g'
# Store methods + collection field
rg -l 'addCloudRouter\|updateCloudRouter\|removeCloudRouter\|cloudRouters' src/ | xargs sed -i '' \
  -e 's/addCloudRouter/addContainer/g' \
  -e 's/updateCloudRouter/updateContainer/g' \
  -e 's/removeCloudRouter/removeContainer/g' \
  -e 's/cloudRouters/containers/g'
# Type name (word boundary so it doesn't touch CloudRouterIcon already renamed)
rg -l '\bCloudRouter\b' src/ | xargs sed -i '' 's/\bCloudRouter\b/Container/g'
# Remaining camelCase identifiers (props/vars) — EXCLUDE cloudRouterName (handled by wizard plan)
rg -l 'cloudRouter' src/ | xargs sed -i '' 's/cloudRouterId/containerId/g'
# Import path updates for moved files/dirs
rg -l "components/cloudrouter\|connection/cloudrouter\|types/cloudrouter\|slices/cloudRouterSlice" src/ | xargs sed -i '' \
  -e 's#components/cloudrouter#components/container#g' \
  -e 's#connection/cloudrouter#connection/container#g' \
  -e 's#types/cloudrouter#types/container#g' \
  -e 's#slices/cloudRouterSlice#slices/containerSlice#g'
```

> **Deliberately preserved:** `cloudRouterName` in the wizard is intentionally NOT renamed here — it is owned by the wizard-restructure plan (which also removes/relocates it). If you rename it now you create a merge conflict with that plan. Leave it.

- [ ] **Step 4: Typecheck and fix fallout**

```bash
npm run typecheck
```

Expected: errors will point to any import the sed missed or a stray identifier. Fix each (usually an import path or a missed `CloudRouter` in a JSX tag). Re-run until clean.

- [ ] **Step 5: Build**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 6: Run the store unit tests**

```bash
npx vitest run src/store/slices/containerSlice.test.ts
```

Expected: pass (the test file was renamed and its identifiers rewritten in Step 3). Fix any remaining `cloudRouter*` references in assertions.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "rename(code): CloudRouter types/store/components → Container (icon glyph unchanged)"
```

---

## Tier 6: Tests

**Files:**
- `tests/e2e/cloud-routers.spec.ts` → `tests/e2e/containers.spec.ts`
- Any e2e spec asserting "Cloud Router" text or `/cloud-routers` URLs (rbac specs, connection specs)
- `src/store/slices/containerSlice.test.ts` (already handled in Tier 4 — re-verify here)

- [ ] **Step 1: Rename the e2e spec and update its contents**

```bash
git mv tests/e2e/cloud-routers.spec.ts tests/e2e/containers.spec.ts
rg -l 'Cloud Router\|cloud-router' tests/ | xargs sed -i '' \
  -e 's/Cloud Routers/Containers/g' -e 's/Cloud Router/Container/g' \
  -e 's#/cloud-routers#/containers#g' -e 's/cloud-router/container/g'
```

- [ ] **Step 2: Run the full e2e suite**

```bash
npx playwright test
```

Expected: green. Investigate any failure — most will be stale text/URL assertions; fix the assertion to match the new naming. A genuine behavior failure means a missed rename upstream — trace it back to the right tier.

- [ ] **Step 3: Run all unit tests**

```bash
npx vitest run
```

Expected: green.

- [ ] **Step 4: Commit**

```bash
git add tests/ src/
git commit -m "rename(tests): update specs for Container naming"
```

---

## Tier 7: Docs + analytics spec

**Files:**
- `QUICK_START.md`, `README*.md`
- `docs/mixpanel-event-tracking-spec.csv`
- `docs/superpowers/plans/2026-05-26-cloud-router-many-to-many.md`, `docs/superpowers/plans/2026-06-03-cloud-router-centric-manage-page.md`, `docs/superpowers/specs/2026-06-03-cloud-router-centric-manage-page.md`

- [ ] **Step 1: Update docs prose** (these are reference docs; rename for consistency, keep historical plan filenames as-is)

```bash
rg -l 'Cloud Router' QUICK_START.md README* docs/mixpanel-event-tracking-spec.csv | xargs sed -i '' \
  -e 's/Cloud Routers/Containers/g' -e 's/Cloud Router/Container/g'
```

> Leave the dated plan/spec filenames under `docs/superpowers/` unchanged (they are historical records). Updating their bodies is optional; if analytics event NAMES in the mixpanel CSV are wired to code, keep the event keys stable and only change human labels — confirm against `rg -n 'cloud.?router' src/` that no analytics key string is referenced in code before changing it.

- [ ] **Step 2: Final full-repo sweep**

```bash
rg -n -i --glob '!src_old/**' --glob '!.claude/worktrees/**' --glob '!docs/superpowers/plans/2026-0[56]-*' \
  'cloud[ _-]?router' src/ tests/ | rg -v 'cloudRouterName'
```

Expected: zero hits (except `cloudRouterName`, owned by the wizard plan, and historical dated plans). Any other hit is a miss — fix it in its proper tier.

- [ ] **Step 3: Final gates**

```bash
npm run typecheck && npm run build && npx vitest run && npx playwright test
```

Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "rename(docs): Cloud Router → Container in docs and analytics labels"
```

---

## Self-Review Checklist

- **Icon untouched:** confirm the renamed `ContainerIcon` renders the identical glyph — diff the function body, only the name changed.
- **Redirects work:** old `/cloud-routers/:id` bookmarks resolve to `/containers/:id`.
- **RBAC back-compat:** `normalizeScopeKey` maps any persisted `cloud-router:*` assignment to `container:*` at read time — existing roles still grant access.
- **`cloudRouterName` deliberately untouched** — it belongs to the wizard plan; verify it is the ONLY remaining `cloudRouter*` token in `src/`.
- **No placeholders:** every `ALTER INDEX` and RLS predicate filled from the Step-1 enumeration, not left as a comment.
