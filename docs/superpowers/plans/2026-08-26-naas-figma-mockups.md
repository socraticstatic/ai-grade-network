# NaaS 1440 Mockups → Figma Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix visual drift in the NaaS screens, freeze them as pixel-perfect artboards, and deliver them as editable Figma layers (with shared chrome as real components) in a new drafts file, plus a written handoff spec per screen.

**Architecture:** One Playwright-based tool (`measure.mjs`) audits, captures, and freezes every screen; browser-harness drives Comet (logged into Figma) to import frozen artboards via the html.to.design plugin and componentize the shared chrome. Screens complete one at a time: audit → fix → capture → freeze → import → swap instances → spec.

**Tech Stack:** Playwright (already installed), Vite dev server (localStorage auth gate), browser-harness (CDP → Comet), Figma web + html.to.design plugin.

**Spec:** `docs/superpowers/specs/2026-08-26-naas-figma-mockups-design.md`

## Global Constraints

- Viewport: **1440px wide, deviceScaleFactor 2**, desktop only.
- Estate: **meridian** (`?estate=meridian`); advisor marked done via `localStorage['advisor:meridian:done']='1'` for every screen EXCEPT artboard 02 (advisor first screen), which needs it absent.
- Auth: localStorage gate mode. Dev server must run with `VITE_AUTH_MODE=gate`. Seed keys: `att_nb_user`, `tour-main-app-completed`, `product-tour-completed`, `e2e-skip-demo-modal` (exact values in Task 1's script).
- Dev server port for handoff work: **5177** (never assume 5173 — another repo squats on it; 5199 is reserved for the e2e suite).
- Fidelity: layout and IA stay as shipped. Fix only: off-4px-grid spacing, type off the Flywheel ramp (`docs/figma-reference/DESIGN_SPECS.md`), colors not in `src/tokens/tokens.json`/`fw` Tailwind theme, border/radius/shadow inconsistency between siblings. Anything bigger → log in `docs/figma-handoff/drift-report.md` as SKIPPED, don't fix.
- Figma target: new drafts file **"AI-grade Network — NaaS Mockups"**, page **"NaaS — 1440 Mockups"**. Frames named `NN — <Name>` per the spec's scope table.
- Figma automation: browser-harness + Comet ONLY. Read `~/Developer/browser-harness/helpers.py` and `~/Developer/browser-harness/domain-skills/figma.md` before every Figma task. Never `switch_tab()` on Figma tabs — `bg_attach_url()` only. Re-attach after every cross-origin `goto()`.
- No silent degradation: html.to.design cap reached, plugin missing, font missing → STOP the task, report to Micah, record in drift-report.md. Never substitute flattened images without telling him.
- After every app code change: `npx vitest run` must stay green. Commit per screen, small commits.
- New harness knowledge about Figma (plugin flow, selectors, waits) gets filed into `~/Developer/browser-harness/domain-skills/figma.md` in the same task that learned it.

---

## Per-Screen Procedure (reference)

Every screen task (Tasks 8–18) runs these phases with its own parameters. The concrete commands are repeated inside each task — this section explains the shape once.

- **A. Audit:** `node scripts/figma-handoff/measure.mjs --route <route> --slug <slug> [flags]` → read `docs/figma-handoff/captures/<slug>/measure.json`, compare against `00-foundation.md` tokens, write drift list into `drift-report.md`.
- **B. Fix:** apply in-scope fixes to the screen's source files. `npx vitest run` green. Visual check in Browser pane at 1440.
- **C. Capture+Freeze:** re-run measure.mjs with `--freeze` → `<slug>@2x.png` + `docs/figma-handoff/artboards/<slug>.html`.
- **D. Import:** browser-harness → Figma file → html.to.design → import the frozen HTML → rename frame `NN — <Name>` → position on the page grid (x = (N-1 % 4) * 1640, y = floor((N-1)/4) * 2200).
- **E. Swap instances:** replace imported header / left rail / footer groups with component instances at the measured x/y (from measure.json).
- **F. Spec page:** write `docs/figma-handoff/<slug>.md` — annotated redline table from measure.json (region → x/y/w/h, type, color tokens, spacing), states shown, component mapping.
- **G. Verify:** imported frame side-by-side vs `<slug>@2x.png`; differences beyond antialiasing = defect, fix before proceeding.
- **H. Commit:** app fixes + captures + spec page in one commit `feat(handoff): <slug>`.

---

### Task 1: Measurement + freeze tooling (`measure.mjs`)

**Files:**
- Create: `scripts/figma-handoff/measure.mjs`
- Create: `docs/figma-handoff/captures/.gitkeep`, `docs/figma-handoff/artboards/.gitkeep`

**Interfaces:**
- Produces: CLI `node scripts/figma-handoff/measure.mjs --route <r> --slug <s> [--actions <file.mjs>] [--no-advisor-done] [--freeze]`. Outputs `docs/figma-handoff/captures/<slug>/measure.json`, `<slug>@2x.png`; with `--freeze` also `docs/figma-handoff/artboards/<slug>.html`. Actions modules export `async function run(page)`.
- Consumes: dev server on `http://localhost:5177` (started per-task, see Step 2).

- [ ] **Step 1: Write the script**

```js
// scripts/figma-handoff/measure.mjs
// Audits + captures + freezes one screen at 1440px for the Figma handoff.
// Usage: node scripts/figma-handoff/measure.mjs --route /naas/home --slug 03-naas-home [--actions <file>] [--no-advisor-done] [--freeze]
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const val = (n) => { const i = argv.indexOf(`--${n}`); return i === -1 ? null : argv[i + 1]; };
const route = val('route'); const slug = val('slug');
if (!route || !slug) { console.error('need --route and --slug'); process.exit(1); }
const base = process.env.HANDOFF_BASE ?? 'http://localhost:5177';
const capDir = path.join('docs/figma-handoff/captures', slug);
fs.mkdirSync(capDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await page.addInitScript((seedAdvisor) => {
  localStorage.setItem('tour-main-app-completed', 'true');
  localStorage.setItem('product-tour-completed', 'true');
  localStorage.setItem('e2e-skip-demo-modal', 'true');
  if (seedAdvisor) localStorage.setItem('advisor:meridian:done', '1');
}, !flag('no-advisor-done'));
const sep = route.includes('?') ? '&' : '?';
await page.goto(`${base}${route}${sep}estate=meridian`, { waitUntil: 'networkidle' });
const actions = val('actions');
if (actions) { const mod = await import(path.resolve(actions)); await mod.run(page); }
await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}' });
await page.waitForTimeout(1000);

// Measurements: visible elements to depth 10, geometry + the styles a redline needs.
const data = await page.evaluate(() => {
  const KEYS = ['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','color',
    'backgroundColor','borderRadius','border','boxShadow','padding','margin','gap','display'];
  const out = [];
  const walk = (el, depth, trail) => {
    if (depth > 10) return;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') return;
    const id = `${trail}/${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').slice(0, 3).join('.') : ''}`;
    const styles = {}; KEYS.forEach(k => styles[k] = cs[k]);
    out.push({ id, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
      text: el.children.length === 0 ? (el.textContent || '').trim().slice(0, 60) : undefined, styles });
    [...el.children].forEach((c, i) => walk(c, depth + 1, `${trail}/${i}`));
  };
  walk(document.body, 0, '');
  return { url: location.href, height: document.documentElement.scrollHeight, elements: out };
});
fs.writeFileSync(path.join(capDir, 'measure.json'), JSON.stringify(data, null, 2));
await page.screenshot({ path: path.join(capDir, `${slug}@2x.png`), fullPage: true });

if (flag('freeze')) {
  const html = await page.evaluate(() => {
    // Canvas → img so charts survive the freeze.
    document.querySelectorAll('canvas').forEach(c => {
      try { const img = document.createElement('img'); img.src = c.toDataURL('image/png');
        img.style.cssText = getComputedStyle(c).cssText; c.replaceWith(img); } catch {}
    });
    document.querySelectorAll('script,link[rel="modulepreload"]').forEach(s => s.remove());
    const inline = (el) => { el.setAttribute('style', getComputedStyle(el).cssText);
      [...el.children].forEach(inline); };
    inline(document.body);
    return '<!doctype html>\n' + document.documentElement.outerHTML;
  });
  fs.mkdirSync('docs/figma-handoff/artboards', { recursive: true });
  fs.writeFileSync(path.join('docs/figma-handoff/artboards', `${slug}.html`), html);
}
await browser.close();
console.log('wrote', capDir);
```

- [ ] **Step 2: Start the handoff dev server** (background, leave running across tasks)

```bash
export PATH=/Users/micahbos/.nvm/versions/node/v20.20.2/bin:$PATH
VITE_AUTH_MODE=gate npm run dev -- --port 5177 --strictPort
```

Run in background. Verify: `curl -s -o /dev/null -w "%{http_code}" http://localhost:5177` → `200`.

- [ ] **Step 3: Smoke-run against /naas/home**

Run: `node scripts/figma-handoff/measure.mjs --route /naas/home --slug smoke-test --freeze`
Expected: `docs/figma-handoff/captures/smoke-test/measure.json` exists with `elements.length > 100`; `smoke-test@2x.png` is 2880px wide; `docs/figma-handoff/artboards/smoke-test.html` opens in the Browser pane and visually matches the live route (open both, compare). If the frozen HTML renders broken (fonts, layout), fix the freeze serializer NOW — every later task depends on it.

- [ ] **Step 4: Check the frozen file's fonts**

Open `artboards/smoke-test.html` in the Browser pane; run in console: `getComputedStyle(document.body).fontFamily`. If ATT Aleck Sans is not resolving, add a font-inlining step to the freezer: read the `@font-face` blocks from `src/styles/fonts.css`, base64 the referenced font files, and prepend a `<style>` tag with data-URI @font-face rules to the frozen HTML string before writing.

- [ ] **Step 5: Delete smoke artifacts, commit**

```bash
rm -rf docs/figma-handoff/captures/smoke-test docs/figma-handoff/artboards/smoke-test.html
git add scripts/figma-handoff docs/figma-handoff && git commit -m "feat(handoff): measure/freeze tooling for Figma export"
```

---

### Task 2: Foundation spec + drift report skeleton

**Files:**
- Create: `docs/figma-handoff/00-foundation.md`
- Create: `docs/figma-handoff/drift-report.md`

**Interfaces:**
- Consumes: `src/tokens/tokens.json`, `tailwind.config.js`, `docs/figma-reference/DESIGN_SPECS.md`, Task 1's measure.mjs.
- Produces: `00-foundation.md` — the token/type/spacing reference every audit compares against. `drift-report.md` with one `## NN — <name>` section per artboard (13 sections), each starting empty.

- [ ] **Step 1: Write 00-foundation.md.** Sections, in order: (1) Color tokens — every color from `src/tokens/tokens.json` as a table (token path, hex, usage description from the json); (2) Type ramp — copy the Figma-verified ramp table from `docs/figma-reference/DESIGN_SPECS.md` §2, note ATT Aleck Sans + `-0.03em` tracking rule; (3) Spacing — the 4px grid rule, Tailwind screens (`xs 320 … 2xl 1920`), state that 1440 = `xl`; (4) Elevation/radius — grep `borderRadius` and `boxShadow` from `tailwind.config.js` and list them; (5) A "How to read the screen specs" section explaining the measure.json → redline table mapping (columns: region, x, y, w, h, type style, color token, spacing notes).
- [ ] **Step 2: Write drift-report.md skeleton** — title, fidelity contract quoted from the spec, then 13 empty sections `## 01 — Discover entry` … `## 13 — Components`, each with `### Fixed` and `### Skipped (logged)` sub-heads.
- [ ] **Step 3: Verify** — every hex in 00-foundation.md's color table appears in tokens.json (spot-check 5); type ramp matches DESIGN_SPECS.md exactly.
- [ ] **Step 4: Commit** — `git add docs/figma-handoff && git commit -m "docs(handoff): foundation spec + drift report skeleton"`

---

### Task 3: Figma file + page setup (browser-harness)

**Files:**
- Create: `docs/figma-handoff/figma-state.json`
- Modify: `~/Developer/browser-harness/domain-skills/figma.md` (append findings)

**Interfaces:**
- Consumes: `~/Developer/browser-harness/helpers.py` (read it first), `domain-skills/figma.md` (read it first — the CDP session gotchas there are load-bearing).
- Produces: `figma-state.json` → `{ "fileKey": "<key>", "fileUrl": "https://www.figma.com/design/<key>/...", "pageName": "NaaS — 1440 Mockups" }`. Every later Figma task reads this file for the target.

- [ ] **Step 1: Create the drafts file.** browser-harness: `new_tab("https://www.figma.com/files/drafts")` → `bg_attach_url("figma.com")` → click the "Create new" / "+ Design file" button (find by exact text in DOM; drafts page chrome is HTML). A new file opens; grab `/design/([A-Za-z0-9]+)/` from the URL.
- [ ] **Step 2: Name the file** — with the file open, use Figma quick actions: `press_key` Cmd+/ → `type_text("Rename file")` → Enter → `type_text("AI-grade Network — NaaS Mockups")` → Enter. Verify via `document.title` containing the name.
- [ ] **Step 3: Rename Page 1** to `NaaS — 1440 Mockups` — double-click the page row in the left panel (page rows are HTML DOM; find via `js` querySelector on text "Page 1") → type the name → Enter. Verify the panel text updated.
- [ ] **Step 4: Verify html.to.design is reachable** — Cmd+/ → `type_text("html.to.design")` → check the quick-actions results list (DOM) for the plugin entry. If present, Esc (don't run it yet). If absent: open Community search for "html.to.design", note whether it can be run without install ("Run" button). If it needs Micah's action (install/auth/paid cap), STOP and tell him — do not continue to Task 4.
- [ ] **Step 5: Write figma-state.json** with fileKey, fileUrl, pageName. Append everything learned (create-file selectors, rename flow, plugin-launch flow, waits) to `~/Developer/browser-harness/domain-skills/figma.md`.
- [ ] **Step 6: Commit** — `git add docs/figma-handoff/figma-state.json && git commit -m "chore(handoff): figma target file created"`

---

### Task 4: Dev-only components gallery route

**Files:**
- Create: `src/features/handoff/HandoffGallery.tsx`
- Modify: `src/App.tsx` (one route, dev-gated)
- Test: `src/features/handoff/HandoffGallery.test.tsx`

**Interfaces:**
- Consumes: `MainNav`, `LeftRail`, `SubNav`, `Footer` from `src/components/navigation` / `src/components/common`; primitives `Button`, `Card`, `MetricCard`, `QuickStatCard`, `StatusBadge`, `Badge`, `Toggle`, `SearchFilterBar`, `StandardTable` from `src/components/common`.
- Produces: route `/__handoff/gallery` (dev builds only) rendering each shared element in a labeled white section, stacked vertically, 1440-wide. Section wrapper: `<section data-handoff="<name>">` with a 12px gray label above each element. This is the source for artboard 13.

- [ ] **Step 1: Write the failing test** — `HandoffGallery.test.tsx`: render `<HandoffGallery />` inside the app's providers (copy the provider wrapper pattern from `src/features/layer-home/LayerHomePage.test.tsx`); assert `screen.getByText('MainNav')` label exists and `document.querySelectorAll('[data-handoff]').length >= 10`.
- [ ] **Step 2: Run it** — `npx vitest run src/features/handoff` → FAIL (module not found).
- [ ] **Step 3: Implement HandoffGallery.tsx** — a page component: white background, one `<section data-handoff={name}>` per element in this order: MainNav, LeftRail, SubNav, Footer, Button (variants: primary/secondary/ghost/disabled in a row), Card, MetricCard, QuickStatCard, StatusBadge (one per status the component supports — read its props type), Badge, Toggle (on/off), SearchFilterBar, StandardTable (header + 3 rows of representative NaaS connection data, hardcoded in the gallery file). Label each section with the component name in 12px `#686e74`. Import concrete props from each component's own types; where a component needs store state (MainNav, LeftRail), wrap in the same providers the test uses.
- [ ] **Step 4: Register the route in App.tsx** — inside the routes, OUTSIDE `DashboardLayout` (the gallery renders chrome itself): `{import.meta.env.DEV && <Route path="/__handoff/gallery" element={<HandoffGallery />} />}`.
- [ ] **Step 5: Run tests** — `npx vitest run src/features/handoff && npx vitest run src/App.routing.test.tsx` → PASS. Then `npm run build` → succeeds (route tree-shaken in prod).
- [ ] **Step 6: Visual check** — Browser pane → `http://localhost:5177/__handoff/gallery` — every section renders, no error boundaries.
- [ ] **Step 7: Commit** — `git commit -m "feat(handoff): dev-only components gallery route"`

---

### Task 5: Chrome drift audit + fix (MainNav, LeftRail, SubNav, Footer)

**Files:**
- Modify (as drift demands): `src/components/navigation/MainNav.tsx`, `LeftRail.tsx`, `SubNav.tsx`, `src/components/common/Footer.tsx`
- Modify: `docs/figma-handoff/drift-report.md` (§13)

**Interfaces:**
- Consumes: Task 1 CLI, Task 2 foundation, Task 4 gallery route.
- Produces: chrome that measures clean against the foundation; drift-report §13 filled.

- [ ] **Step 1: Measure** — `node scripts/figma-handoff/measure.mjs --route /__handoff/gallery --slug 13-components`
- [ ] **Step 2: Audit** — from `captures/13-components/measure.json`, for the four chrome sections: list every fontSize/weight/color not in the foundation ramp, every padding/margin/gap not divisible by 4, every borderColor/backgroundColor hex not in tokens.json. Write the list into drift-report §13.
- [ ] **Step 3: Fix** — apply the in-scope corrections in the four source files (Tailwind class changes; e.g. a stray `text-[13px]` → `text-figma-base`, `p-[10px]` → `p-2` or `p-3` per the closer grid value, raw hex → `fw` token class). Anything structural → drift-report §13 Skipped.
- [ ] **Step 4: Test** — `npx vitest run src/components/navigation && npx vitest run` → all green. Re-run Step 1; confirm the fixed items now measure clean.
- [ ] **Step 5: Visual check** — Browser pane: `/naas/home` and `/naas/observe` at 1440 — chrome looks right in situ, nothing shifted.
- [ ] **Step 6: Commit** — `git commit -m "fix(handoff): chrome drift — nav/rail/subnav/footer on grid and tokens"`

---

### Task 6: Primitives drift audit + fix

**Files:**
- Modify (as drift demands): `src/components/common/Button.tsx`, `Card.tsx`, `MetricCard.tsx`, `QuickStatCard.tsx`, `StatusBadge.tsx`, `Badge.tsx`, `Toggle.tsx`, `SearchFilterBar.tsx`, `StandardTable.tsx`
- Modify: `docs/figma-handoff/drift-report.md` (§13)

Same five-step shape as Task 5, scoped to the primitive sections of `captures/13-components/measure.json`:

- [ ] **Step 1: Re-measure** — `node scripts/figma-handoff/measure.mjs --route /__handoff/gallery --slug 13-components`
- [ ] **Step 2: Audit** primitives sections against foundation; append findings to drift-report §13.
- [ ] **Step 3: Fix** in-scope drift in the nine component files. `Button.test.tsx` exists — extend it if a fix changes a class the test asserts.
- [ ] **Step 4: Test** — `npx vitest run` green; re-measure to confirm.
- [ ] **Step 5: Commit** — `git commit -m "fix(handoff): primitive drift — buttons/cards/badges/tables on grid and tokens"`

---

### Task 7: Components board in Figma (import + componentize)

**Files:**
- Create: `docs/figma-handoff/13-components.md`
- Modify: `docs/figma-handoff/figma-state.json` (add `componentIds` map), `~/Developer/browser-harness/domain-skills/figma.md`

**Interfaces:**
- Consumes: Task 3 figma-state.json, clean gallery from Tasks 5–6.
- Produces: Figma components on the page: `Header/MainNav`, `Nav/LeftRail`, `Nav/SubNav`, `Footer`, `Button/*`, `Card`, `MetricCard`, `QuickStatCard`, `Badge/Status/*`, `Badge`, `Toggle/*`, `SearchFilterBar`, `Table/Row`. `figma-state.json.componentIds` maps name → Figma node id. Screen tasks swap to THESE names.

- [ ] **Step 1: Freeze the gallery** — `node scripts/figma-handoff/measure.mjs --route /__handoff/gallery --slug 13-components --freeze`
- [ ] **Step 2: Import** — browser-harness: open `figma-state.json.fileUrl`, `bg_attach_url` per figma.md. Launch html.to.design (Cmd+/ flow from Task 3). In the plugin iframe (`iframe_target("html.to.design")` or the plugin's actual iframe URL — discover and file it), find the file/code import input; feed `docs/figma-handoff/artboards/13-components.html` via `DOM.setFileInputFiles` on the plugin's `input[type=file]`. Wait for the frame to appear on canvas (poll the layers panel DOM for a new top-level row). If the plugin refuses (cap, auth): STOP, tell Micah, log in drift-report §13.
- [ ] **Step 3: Componentize** — for each `data-handoff` section's layer group: select its row in the layers panel (HTML DOM — click it), press Cmd+Option+K ("create component"), rename via the layers-panel double-click flow to the names in Interfaces above. Variants (Button, StatusBadge, Toggle): select the sibling state components and use quick actions → "Combine as variants". If layer-panel selection proves unreliable after 3 attempts on the first component, STOP and report — Micah componentizes manually, plan continues from Task 8 with the mapping recorded in `13-components.md` instead of automated swaps.
- [ ] **Step 4: Record** — read each component's node id from the URL (`node-id=` when selected) via `js("location.href")`; write the name → id map into `figma-state.json.componentIds`. File the whole working flow into figma.md domain skill.
- [ ] **Step 5: Spec page** — write `13-components.md`: table of every component, its Figma name, source file path, variant list, and key measurements from `captures/13-components/measure.json`.
- [ ] **Step 6: Verify + commit** — components visible on the page and listed in Assets panel. `git commit -m "feat(handoff): components board live in Figma"`

---

### Task 8: Screen 01 — Discover entry

**Files:**
- Modify (as drift demands): `src/features/discover/DiscoverPage.tsx`, `UnifiedDiscovery.tsx`, `StackPanel.tsx`, `IntentThreads.tsx`
- Create: `docs/figma-handoff/01-discover.md`
- Modify: `docs/figma-handoff/drift-report.md` (§01)

**Interfaces:**
- Consumes: Task 1 CLI, Task 7 componentIds.
- Produces: frame `01 — Discover entry` in Figma at page position x=0 y=0; spec page `01-discover.md`.

- [ ] **Step 1: Audit** — `node scripts/figma-handoff/measure.mjs --route /discover --slug 01-discover` (advisor-done seeded by default, so DiscoverPage renders, not the redirect). Drift list → drift-report §01.
- [ ] **Step 2: Fix** in-scope drift in the discover feature files. `npx vitest run src/features/discover && npx vitest run` green. Visual check at 1440.
- [ ] **Step 3: Freeze** — `node scripts/figma-handoff/measure.mjs --route /discover --slug 01-discover --freeze`
- [ ] **Step 4: Import** — html.to.design flow from Task 7 with `artboards/01-discover.html`; rename frame `01 — Discover entry`; set X=0 Y=0 via the properties-panel inputs.
- [ ] **Step 5: Swap chrome** — delete the imported header/left-rail/footer groups (locate rows in layers panel by the imported node names html.to.design gives them — file the naming pattern into figma.md on first sight); place instances of `Header/MainNav`, `Nav/LeftRail`, `Footer` (copy from components board, paste, set X/Y from `captures/01-discover/measure.json` header/rail/footer rects).
- [ ] **Step 6: Spec** — write `01-discover.md`: redline table (top 30 regions from measure.json: region id, x/y/w/h, type style, color→token, spacing), state shown ("meridian estate, advisor done"), component mapping (header/rail/footer → instance names).
- [ ] **Step 7: Verify** — frame vs `01-discover@2x.png` side by side. Fix real deltas.
- [ ] **Step 8: Commit** — `git commit -m "feat(handoff): 01 discover entry — fixed, frozen, in Figma"`

---

### Task 9: Screen 02 — Meridian advisor, first screen

**Files:**
- Modify (as drift demands): `src/features/advisor/` components (locate via `ls src/features/advisor`)
- Create: `docs/figma-handoff/02-advisor-first.md`
- Modify: `docs/figma-handoff/drift-report.md` (§02)

Same steps as Task 8 with these parameters — commands concretely:

- [ ] **Step 1: Audit** — `node scripts/figma-handoff/measure.mjs --route /discover/advisor --slug 02-advisor-first --no-advisor-done` (MUST use `--no-advisor-done`: this artboard is the pre-interaction first screen, the public site's opener). Drift → §02.
- [ ] **Step 2: Fix** — in-scope only; `npx vitest run` green; visual check.
- [ ] **Step 3: Freeze** — same command + `--freeze`.
- [ ] **Step 4: Import** — rename `02 — Meridian advisor (first screen)`; X=1640 Y=0.
- [ ] **Step 5: Swap chrome** — NOTE: the advisor may render outside the standard chrome; if measure.json shows no MainNav region, record "no chrome — full-bleed screen" in the spec page and skip swapping.
- [ ] **Step 6: Spec** — `02-advisor-first.md`, state: "meridian estate, first visit, no interaction".
- [ ] **Step 7: Verify** side-by-side. **Step 8: Commit** `feat(handoff): 02 advisor first screen`.

---

### Task 10: Screen 03 — NaaS Home

**Files:** modify as drift demands `src/features/layer-home/LayerHomePage.tsx` + `dashboard/` widgets; create `docs/figma-handoff/03-naas-home.md`; drift-report §03.

- [ ] **Step 1: Audit** — `node scripts/figma-handoff/measure.mjs --route /naas/home --slug 03-naas-home`
- [ ] **Step 2: Fix** — `npx vitest run src/features/layer-home && npx vitest run` green; visual check.
- [ ] **Step 3: Freeze** — same + `--freeze`.
- [ ] **Step 4: Import** — rename `03 — NaaS Home`; X=3280 Y=0.
- [ ] **Step 5: Swap chrome** instances (header/rail/footer, positions from measure.json).
- [ ] **Step 6: Spec** — `03-naas-home.md` incl. dashboard widget inventory (each widget region → source file under `src/features/layer-home/dashboard/widgets/`).
- [ ] **Step 7: Verify.** **Step 8: Commit** `feat(handoff): 03 naas home`.

---

### Task 11: Screen 04 — Connect, fabric overview

**Files:** modify as drift demands `src/features/connect/ConnectPage.tsx`, `FabricHero.tsx`; create `docs/figma-handoff/04-connect-fabric.md`; drift-report §04.

- [ ] **Step 1: Audit** — `node scripts/figma-handoff/measure.mjs --route /naas/connect --slug 04-connect-fabric`
- [ ] **Step 2: Fix** — FabricHero is 713 lines; keep fixes surgical, class-level only. `npx vitest run src/features/connect && npx vitest run` green.
- [ ] **Step 3: Freeze** — same + `--freeze`. FabricHero may render SVG — SVG freezes fine; note any `<canvas>` regions (they become PNG) in the spec page.
- [ ] **Step 4: Import** — rename `04 — Connect · Fabric overview`; X=4920 Y=0.
- [ ] **Step 5–8:** swap chrome, spec `04-connect-fabric.md`, verify, commit `feat(handoff): 04 connect fabric overview`.

---

### Task 12: Screen 05 — Connect, fabric drill

**Files:** create `scripts/figma-handoff/actions/05-fabric-drill.mjs`; create `docs/figma-handoff/05-connect-drill.md`; drift-report §05. (Drift fixes for connect components already largely landed in Task 11; fix any drill-only surfaces: `EdgeGroupPanel.tsx`, `EdgeTrail.tsx`.)

- [ ] **Step 1: Write the actions module** — inspect FabricHero in the Browser pane to find the drill affordance (a building node; check `src/features/connect/FabricHero.tsx` for its click handler/test id, and `e2e/` specs that exercise the drill for a ready-made selector). Then:

```js
// scripts/figma-handoff/actions/05-fabric-drill.mjs
export async function run(page) {
  // Selector verified against FabricHero at implementation time — take it from
  // the e2e spec that drills (grep e2e/ for 'drill' / 'building'), not from guesswork.
  await page.click('<verified-selector-from-e2e>');
  await page.waitForTimeout(600); // drill transition settles
}
```

The `<verified-selector-from-e2e>` placeholder is resolved in THIS step by grepping `e2e/` and `FabricHero.tsx` — the file committed must contain the real selector.

- [ ] **Step 2: Audit** — `node scripts/figma-handoff/measure.mjs --route /naas/connect --slug 05-connect-drill --actions scripts/figma-handoff/actions/05-fabric-drill.mjs`
- [ ] **Step 3: Fix** drill-only drift; tests green.
- [ ] **Step 4: Freeze** — same command + `--freeze`.
- [ ] **Step 5: Import** — rename `05 — Connect · Fabric drill`; X=0 Y=2200.
- [ ] **Step 6–8:** swap chrome, spec `05-connect-drill.md` (state: which building is drilled), verify, commit `feat(handoff): 05 connect drill`.

---

### Task 13: Screen 06 — Connect, estate map

**Files:** create `scripts/figma-handoff/actions/06-estate-map.mjs`; modify as drift demands `src/features/connect/EstateLevelMap.tsx`; create `docs/figma-handoff/06-estate-map.md`; drift-report §06.

- [ ] **Step 1: Actions module** — find how EstateLevelMap is reached (grep `EstateLevelMap` usages in `ConnectPage.tsx`/`FabricHero.tsx` for the toggle/control; verify in Browser pane); write `06-estate-map.mjs` with the real click sequence, same shape as Task 12's module.
- [ ] **Step 2: Audit** — `node scripts/figma-handoff/measure.mjs --route /naas/connect --slug 06-estate-map --actions scripts/figma-handoff/actions/06-estate-map.mjs`
- [ ] **Step 3: Fix**; tests green. **Step 4: Freeze.**
- [ ] **Step 5: Import** — rename `06 — Connect · Estate map`; X=1640 Y=2200.
- [ ] **Step 6–8:** swap chrome, spec, verify, commit `feat(handoff): 06 estate map`.

---

### Task 14: Screen 07 — Connect, path choice

**Files:** create `scripts/figma-handoff/actions/07-path-choice.mjs`; modify as drift demands `src/features/connect/PathChoice.tsx`, `PathTable.tsx`; create `docs/figma-handoff/07-path-choice.md`; drift-report §07.

- [ ] **Step 1: Actions module** — reach PathChoice+PathTable (grep `PathChoice` usage; `PathChoice.test.tsx` shows the entry conditions); real click sequence into `07-path-choice.mjs`.
- [ ] **Step 2: Audit** — `node scripts/figma-handoff/measure.mjs --route /naas/connect --slug 07-path-choice --actions scripts/figma-handoff/actions/07-path-choice.mjs`
- [ ] **Step 3: Fix**; `npx vitest run src/features/connect` + full run green. **Step 4: Freeze.**
- [ ] **Step 5: Import** — rename `07 — Connect · Path choice`; X=3280 Y=2200.
- [ ] **Step 6–8:** swap chrome, spec (`PathTable` column redlines mandatory — tables are where Avshalom needs exact widths), verify, commit `feat(handoff): 07 path choice`.

---

### Task 15: Screen 08 — Connect, provision wizard

**Files:** create `scripts/figma-handoff/actions/08-wizard.mjs`; modify as drift demands `src/features/connect/ProvisionWizard.tsx`, `WizardCanvas.tsx`; create `docs/figma-handoff/08-wizard.md`; drift-report §08.

- [ ] **Step 1: Actions module** — open ProvisionWizard and advance to its most representative step: the step with the densest form UI (read `ProvisionWizard.tsx` step list; pick the step showing fields + summary rail; name the choice in the spec page). Real sequence into `08-wizard.mjs`.
- [ ] **Step 2: Audit** — `node scripts/figma-handoff/measure.mjs --route /naas/connect --slug 08-wizard --actions scripts/figma-handoff/actions/08-wizard.mjs`
- [ ] **Step 3: Fix**; tests green. **Step 4: Freeze.**
- [ ] **Step 5: Import** — rename `08 — Connect · Provision wizard`; X=4920 Y=2200.
- [ ] **Step 6–8:** swap chrome, spec (include form-field states: rest/focus/filled as measured), verify, commit `feat(handoff): 08 provision wizard`.

---

### Task 16: Screen 09 — Govern

**Files:** modify as drift demands `src/features/govern/GovernPage.tsx`, `RulesPanel.tsx`, `RuleBuilder.tsx`, `ProposalBand.tsx`; create `docs/figma-handoff/09-govern.md`; drift-report §09.

- [ ] **Step 1: Audit** — `node scripts/figma-handoff/measure.mjs --route /naas/govern --slug 09-govern`
- [ ] **Step 2: Fix**; `npx vitest run src/features/govern` + full run green. **Step 3: Freeze.**
- [ ] **Step 4: Import** — rename `09 — Govern`; X=0 Y=4400.
- [ ] **Step 5–8:** swap chrome, spec `09-govern.md`, verify, commit `feat(handoff): 09 govern`.

---

### Task 17: Screen 10 — Observe, Sankey (money screen)

**Files:** modify as drift demands `src/features/observe/ObservePage.tsx` + Sankey component (locate via `grep -rn -i sankey src/features/observe src/components/charts`); create `docs/figma-handoff/10-observe-sankey.md`; create `docs/figma-handoff/assets/observe-sankey.svg`; drift-report §10.

- [ ] **Step 1: Audit** — `node scripts/figma-handoff/measure.mjs --route /naas/observe --slug 10-observe-sankey` (if the Sankey lives behind a tab, add an actions module `scripts/figma-handoff/actions/10-observe.mjs` the same way as Task 12 and pass `--actions`).
- [ ] **Step 2: Fix**; tests green. **Step 3: Freeze.** The Sankey is ECharts — the freezer converts its canvas to PNG. Additionally export true vectors: in the Browser pane on the live route, run `echarts.getInstanceByDom(document.querySelector('<sankey-container-selector>')).renderToSVGString()` — if the instance was initialized with the canvas renderer this API needs `renderer:'svg'`; in that case re-init just for export via a temporary `js` call that creates an SVG-renderer instance with the same option (`getOption()` → `echarts.init(tmpDiv, null, {renderer:'svg'})` → `setOption`). Save output to `docs/figma-handoff/assets/observe-sankey.svg`.
- [ ] **Step 4: Import** — rename `10 — Observe · Sankey`; X=1640 Y=4400. Then import `observe-sankey.svg` separately (Figma accepts SVG drop/paste: copy the SVG markup, paste into the frame via Cmd+V with the frame selected) and place it beside the raster Sankey, labeled "vector source".
- [ ] **Step 5–8:** swap chrome, spec `10-observe-sankey.md` (flow palette table: each Sankey link color → token), verify, commit `feat(handoff): 10 observe sankey`.

---

### Task 18: Screen 11 — Cost

**Files:** modify as drift demands `src/features/cost/CostPage.tsx`; create `docs/figma-handoff/11-cost.md`; drift-report §11.

- [ ] **Step 1: Audit** — `node scripts/figma-handoff/measure.mjs --route /naas/cost --slug 11-cost`
- [ ] **Step 2: Fix** — remember the vocabulary rule: labels lead with savings framing, "Cost" only where the figure is literally spend; flag any label violating it as drift (copy fixes are in scope only if single-word label swaps; else log as Skipped).
- [ ] **Step 3: Freeze.** **Step 4: Import** — rename `11 — Cost`; X=3280 Y=4400.
- [ ] **Step 5–8:** swap chrome, spec `11-cost.md`, verify, commit `feat(handoff): 11 cost`.

---

### Task 19: Foundation + Redlines boards in Figma (artboard 12)

**Files:**
- Create: `scripts/figma-handoff/foundation-board.mjs` (small generator)
- Create: `docs/figma-handoff/artboards/12-foundation.html`

**Interfaces:**
- Consumes: `00-foundation.md`, tokens.json.
- Produces: frame `12 — Foundation` in Figma; a `Redlines` frame linking the annotations.

- [ ] **Step 1: Write foundation-board.mjs** — a node script (no browser) that reads `src/tokens/tokens.json` and emits `artboards/12-foundation.html`: 1440-wide white page with (a) color swatch grid — 96×96 swatches, token path + hex labels below, grouped by tokens.json's top-level keys; (b) the type ramp — one line per ramp row rendered in its actual size/weight/color with the token annotation beside it; (c) spacing scale — bars at 4/8/12/16/24/32/48/64px, labeled. Inline styles only (no external CSS) so it imports losslessly.
- [ ] **Step 2: Run it** — `node scripts/figma-handoff/foundation-board.mjs`; open the HTML in the Browser pane; verify swatches match tokens.json hexes (spot-check 5).
- [ ] **Step 3: Import** — html.to.design flow; rename `12 — Foundation`; X=4920 Y=4400.
- [ ] **Step 4: Redlines frame** — in Figma, add a frame `Redlines — how to read this file` at X=0 Y=6600 containing a text block (typed via harness `type_text`) with: repo-free reading order (Foundation → Components → screens 01–11), the note that per-screen measurement tables live in `docs/figma-handoff/NN-*.md` (Micah shares those with the designer), and the ATT Aleck substitution note if fonts fell back.
- [ ] **Step 5: Commit** — `git commit -m "feat(handoff): foundation board + redlines frame"`

---

### Task 20: Final verification + drift report close-out

**Files:**
- Modify: `docs/figma-handoff/drift-report.md`
- Modify: `README.md` (one line under docs pointing to `docs/figma-handoff/`)

- [ ] **Step 1: Figma page check** — via harness on the file: 13 frames + Redlines present, named `NN — <Name>`, positioned on the grid, correct order. Screenshot the zoomed-out page; save to `docs/figma-handoff/captures/page-overview.png`.
- [ ] **Step 2: Instance check** — for three spot-check screens (03, 09, 11): select the header layer, confirm the layers panel shows the instance marker (◇) and name `Header/MainNav`. Same for rail + footer. Any detached copy → fix, re-verify.
- [ ] **Step 3: Spec completeness** — `grep -rn "TBD\|TODO" docs/figma-handoff/` → zero hits; every `NN-*.md` exists (13 files + 00-foundation + drift-report).
- [ ] **Step 4: Drift report close-out** — every section has content (or an explicit "no drift found"); every Skipped item has a reason.
- [ ] **Step 5: Full test + build** — `npx vitest run && npm run build` → green.
- [ ] **Step 6: Commit + push** — `git add -A docs/figma-handoff README.md && git commit -m "docs(handoff): close out NaaS Figma handoff" && git push`
- [ ] **Step 7: Report to Micah** — Figma file URL, page name, count of frames, drift fixed/skipped totals, and anything that stopped short (font substitution, import caps, manual componentization).
