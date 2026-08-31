# The method: how the high-fidelity boards were made

Written 2026-08-27, after a later session degraded board quality by
re-deriving geometry instead of transcribing it. This file exists so the
method survives the session that produced it.

**The one-sentence version: every pixel is a transcription of the running
app, and nothing is ever drawn, described, generated, or re-composed.**

---

## Why it works

A mockup made by generating design from intent is a *plausible* picture of
the product. A mockup made by freezing the product's own rendered DOM is
the product. The first can be wrong in ways nobody notices until a
developer builds from it. The second cannot disagree with the app, because
it is made out of the app.

Everything below serves that single property. When a step is ambiguous,
the resolving question is always: *does this transcribe, or does it
re-derive?*

---

## The chain, link by link

### 1. Render the real thing, at the real size

`scripts/figma-handoff/measure.mjs` drives Playwright against the actual
dev server:

- Dev server on **5177**, `VITE_AUTH_MODE=gate` (never 5173, never 5199 —
  those belong to other checkouts and the e2e suite).
- Viewport **exactly 1440×900, deviceScaleFactor 2**.
- HashRouter: `http://localhost:5177/?estate=meridian#/naas/home` — the
  estate flag goes *before* the hash, the route after. Getting this
  backwards silently lands you on the advisor and you capture the wrong
  screen.
- Real seeded engine data. 4,183 sites. $39,883/mo. 6 clouds. Not lorem,
  not placeholders, not invented numbers. A designer reading the board
  sees what a customer sees.
- Animations killed via injected CSS (`animation:none`, `transition:none`,
  `caret-color:transparent`) and a settle wait, so captures are
  deterministic.

### 2. Reach interaction states the way a user does

Boards 05–08 and 14 are not resting screens. Each has an action module in
`scripts/figma-handoff/actions/` that *clicks through the real app*:

- Selectors mined from the app's own `e2e/` specs and `data-testid`
  attributes — never guessed, never invented.
- Board 14 walks the entire advisor conversation: greet → "What can't you
  see?" → demo credentials → scan → every finding → wrap. All four tier
  ladders appear because the app produced them, in order, on its own.
- Board 02 waits for the opening monologue to finish streaming, then
  checks whether text is still growing before capturing.

If the app cannot reach a state, that state does not get a board. No
hand-built variants.

### 3. Freeze the computed DOM, not the source

The `--freeze` path is the heart of the method:

- Walk every element, write `getComputedStyle(el).cssText` onto it as an
  inline style. The frozen file carries **resolved** values, so no
  stylesheet, cascade, or breakpoint can reinterpret it later.
- `<canvas>` → `toDataURL()` → `<img>`, so chart pixels survive.
- Strip `<script>` and modulepreload links.
- **Inline the fonts.** Rewrite every `/src/assets/fonts/*.woff2` URL to a
  base64 data URI. Without this the artboard renders in a fallback the
  moment it leaves this machine — and it will *look* fine locally, which
  is the dangerous part. (Found exactly this way: the file "worked"
  because this Mac has Aleck installed.)

Result: `docs/figma-handoff/artboards/NN-*.html` — self-contained, no dev
server, no network, byte-identical anywhere.

**These frozen files are the durable asset.** The Figma file is downstream
and reproducible. If the boards were lost tomorrow, they rebuild exactly
from these.

### 4. Convert; never create

html.to.design transcribes HTML into native Figma layers — text stays
text, SVG stays vector, auto-layout mirrors flex. It has no opinion about
what the design *should* be. That lack of opinion is precisely why
fidelity survives.

Settings that matter: **1440 viewport**, Autolayout on, hyperlinks on
where the board has links.

### 5. Fix drift in the source, never in Figma

Every board was audited before it was frozen: `measure.json` computed
styles compared against `00-foundation.md` tokens — type off the ramp,
spacing off the 4px grid, colors not in `tokens.json`.

Every fix landed **in the React source**, then the screen was re-measured
and re-frozen. Twelve real fixes shipped this way (rail microcopy, Create
pill padding, QuickStatCard type, Cost title, advisor 15/17/19px strays,
and a genuine bug: `ring-fw-base` compiled to nothing and rendered
Tailwind's stock blue).

Never touch up the board in Figma. A retouched board is a lie about the
app, and the next screenshot exposes it.

### 6. Verify by rendering, never by reasoning

Nothing was ever called done because it should work:

- Every screen read back as a real PNG and looked at.
- Frozen HTML served on a local port and compared against the live route.
- `document.fonts.check('16px "ATT Aleck Sans"')` to prove the typeface.
- Full `vitest` run (1709 tests) after every source fix.

---

## What destroys it

Any step that **re-derives** geometry rather than transcribing it. These
all produce plausible design, and plausible is the enemy:

| Anti-pattern | Why it degrades |
|---|---|
| `generate_figma_design` / code-to-canvas | Synthesizes a design from code *semantics*. Beautiful for greenfield; fatal for reproduction — it draws what the code means, not what it renders. |
| Instance swaps into transcribed frames | Replacing a transcribed frame with a component instance re-derives layout from the component's own auto-layout. Ran 2026-08-26, broke pixel-matched boards, reverted from version history. **Permanently retired.** |
| Re-import / regenerate / reposition a good board | The 16 boards are good. Refine in place only. |
| Editing the board to fix what the app got wrong | Makes the mockup disagree with the app. Fix the app. |
| Trusting geometry numbers over pixels | Bounds can match while rendering differs. Export and hash. |

---

## The discipline rules that emerged

- **Pixel-diff gate.** No bulk canvas write without a one-board pilot, a
  pixel diff against `captures/<slug>/<slug>@2x.png`, and an explicit go.
  Save the before-export *before* the first change.
- **RENDER verify.** Confirm every canvas change by PNG export and hash,
  never by reading geometry.
- **Direction is improvement or hold.** Never "close enough."
- **Ground truth is permanent.** `captures/*@2x.png` is what each board
  must look like, forever. Any future operation is checkable against it.

---

## Runbook: add or refresh a screen

```bash
# 1. dev server (gate mode, port 5177)
VITE_AUTH_MODE=gate npm run dev -- --port 5177 --strictPort

# 2. audit — writes captures/<slug>/measure.json + <slug>@2x.png
node scripts/figma-handoff/measure.mjs --route /naas/home --slug 03-naas-home

# 3. audit it against the foundation (exits non-zero on drift)
node scripts/figma-handoff/audit.cjs 03-naas-home
#    fix anything it reports IN THE REACT SOURCE, then npx vitest run

# 4. re-measure until clean, then freeze
node scripts/figma-handoff/measure.mjs --route /naas/home --slug 03-naas-home --freeze

# 5. look at the PNG. Actually look at it.

# 6. import artboards/<slug>.html at 1440, autolayout on
# 7. name it, place it, write its NN-<slug>.md spec page
```

For an interaction state, add an action module in
`scripts/figma-handoff/actions/` first, with selectors taken from `e2e/`
or the component's own `data-testid` — then pass `--actions`.

---

## Naming layers at the source

html.to.design names a Figma layer from the element's `aria-label` when one
is present, and falls back to `tag.class` otherwise — that fallback is where
`div.flex-1` / `span.truncate` layer soup comes from. So the freeze labels
containers *before* export rather than renaming thousands of layers after
import. `aria-label` is metadata; it cannot move a pixel.

The vocabulary matches the names already in the file, so new boards read as
one library rather than two conventions:

1. An author's own `aria-label` always wins ("Collapse sidebar",
   "Tasks: 10 pending").
2. A **thin wrapper** — one that owns exactly one run of text — takes that
   text, clipped at 44 characters plus an ellipsis. Aggregate containers must
   not, or you get layers named with every descendant string concatenated,
   which is worse than the class name it replaced.
3. Everything else takes a role word: Row, Stack, Grid, Card, Section,
   Flex item, Full width, Hover group, Rule, List item, Navigation, Table.
4. Skip a container whose parent resolves to the same name. h2d collapses
   redundant wrappers on import and joins their names with an arrow, so
   naming every level of a nested wrapper produces
   "AI Fabric → AI Fabric → AI Fabric". Only the outermost of a run is named.

## Two traps worth remembering

**SVG loses its styling in the freeze unless you rebuild it.** Chrome
serialises `getComputedStyle(el).cssText` to an empty string for SVG
elements, so the naive inline pass writes `style=""` onto every `<text>` and
`<path>` and throws the font away. Those labels then import in the
converter's fallback face — the origin of 61 stray Inter segments across
boards 04–11. The freeze now rebuilds the declaration property by property
for anything `cssText` refuses to serialise. Any board frozen after this fix
is 100% Aleck without a post-import sweep.

**Figma ignores programmatically assigned input values.** Setting `.value`
with the native setter plus an `input` event — which works for Figma's
position and opacity fields — silently fails for the hyperlink popover. The
value appears in the field and is never committed. A link edited *in Figma*
must be typed with real key events: Cmd+click the text, click the hyperlink
control, Cmd+A, type the URL, Enter. And "Create link" in the properties
panel is a static button label, not a state indicator: the only reliable
check that a link exists is hovering the text on canvas and looking for the
link chip.

**But do not edit links in Figma at all.** With "Add hyperlinks" on, h2d
transcribes every `<a href>` into a real Figma hyperlink on import. Bake the
URLs into the artboard HTML and all 22 TOC links arrive already wired —
verified 22/22 on 2026-08-27, no typing pass. This is the same principle as
the rest of the method: fix it in the source, not on the canvas. The typing
recipe above is only a rescue path for a link that has to change without a
re-import.

## Cover TOC mechanics

The cover is generated by a node script into the same frozen-HTML format and
imported through the identical path, so it is never a special case. Its table
of contents is 22 rows in two balanced columns of eleven (`column-count: 2`),
each row a number span plus a label.

Rebuilding it after boards change:

1. Collect every board's `node-id` (select each section, read it off the
   URL). The ids are not stable across a re-import, so re-collect rather than
   trusting a saved map.
2. Regenerate the cover with the URLs baked into the `<a href>`s, replacing
   only the TOC block — gradient, Sankey art and header copy are untouched.
   Name the containers with `aria-label` here too; the cover is hand-authored
   but it earns readable layers the same way every other board does.
3. Import with "Add hyperlinks" on. Delete the old section only *after* the
   new one has landed, so nothing good is destroyed before its replacement
   exists. Name it, place at x=-1700, and check opacity is 100% (stray
   keystrokes into panel inputs have set it to 20% more than once).
4. Verify by hovering every row for the link chip. Aim at the *start* of the
   label — a short one like "Cost" ends well before a long one, and hovering
   past it reads as a missing link when the link is fine. Read the result
   from `document.body.innerText`, not from 22 screenshots.
5. Diff the hrefs in the artboard HTML against the *live* node-ids read back
   off the canvas. A link can be present and still point at a node that no
   longer exists; only the diff catches that.

**Verify by reading input values, not by looking at panels.** Every field in
the Design panel is a real `<input>` with an `aria-label` — X-position,
Y-position, Opacity, Horizontal resizing. Reading them is exact, cheap, and
immune to the collapsed-panel false negatives that produced the "I now have
two covers" incident. Screenshots are for judging design; input values are
for verifying state.

**Tab moves the selection.** In a Figma position field, Tab commits and
advances — but if focus has drifted to the canvas it selects the next
sibling instead, and the keystrokes that follow land on a different board.
After any panel typing, re-select the node and read its values back.

## Provenance of the cover art

The cover and 16:9 thumbnail are the only hand-authored boards. They are
generated by node scripts into the same frozen-HTML format, so they travel
the identical import path. Copy rules learned the hard way: no em dashes,
no board counts (they change), no font name-dropping, no internal jargon
("meridian estate"), no purple phrasing. Current tagline:
*"Next-generation monitoring and control for the entire cloud estate."*
Art is a stylized Sankey — the product's own money screen, in ribbon form.

---

## Dark mode (added 2026-08-31)

The dark boards are the same transcription chain with one switch flipped, not
a second method. What matters:

- **The theme lives in the app, never in the boards.** Two layers, one palette:
  `src/styles/dark.css` (generated by
  `scripts/figma-handoff/generate-dark-css.mjs` — edit the generator's palette
  maps or the OVERRIDES block, then re-run it) restyles every Tailwind utility
  and semantic CSS var under `html.dark`; JS-driven viz (ECharts Sankey,
  FabricHero, VizKit) resolves `--viz-*` vars via `useVizHex()`. ECharts parses
  color strings, so it needs resolved hexes, not `var()` — that hook is why.
- **Light parity is provable, and proved.** Every rule is scoped under
  `html.dark`, so light mode cannot move. Verified byte-identical (SHA-256 of
  fresh light captures vs `captures/*@2x.png` ground truth) on 03, 10 and 06
  after all dark work landed.
- **Activation:** `?theme=dark` before the hash (`/?estate=meridian&theme=dark#/naas/home`),
  applied pre-paint in `main.tsx`, never persisted. `measure.mjs --dark` sets
  the class plus `theme-mode` localStorage so ThemeProvider keeps it.
- **Sweep:** `scripts/figma-handoff/sweep-dark.sh [--freeze] [prefix]` runs all
  22 board routes with the right actions per board.
- Palette anchors (AT&T Flywheel dark): wash #111821, card #1a2431, neutral
  #1e2731→#222e3c, borders #2f3d4d/#4e5e6f, text #f2f6fa/#c5cfd9/#97a3b0,
  link #66c8f0 (AT&T Blue 100), CTA cobalt #0057b8 with hover brightening to
  #0064d6, active/indicator #009fdb. Backgrounds are never pure black.
