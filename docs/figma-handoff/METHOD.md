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

# 3. read the audit, fix any drift IN THE REACT SOURCE, npx vitest run

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

## Provenance of the cover art

The cover and 16:9 thumbnail are the only hand-authored boards. They are
generated by node scripts into the same frozen-HTML format, so they travel
the identical import path. Copy rules learned the hard way: no em dashes,
no board counts (they change), no font name-dropping, no internal jargon
("meridian estate"), no purple phrasing. Current tagline:
*"Next-generation monitoring and control for the entire cloud estate."*
Art is a stylized Sankey — the product's own money screen, in ribbon form.
