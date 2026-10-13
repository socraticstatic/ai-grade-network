# Figma hand-off: transcribe, never generate

Every board is the DOM the running app painted, frozen by `scripts/figma-handoff/freeze.mjs`: the stylesheet inlined, every asset made absolute to the live site, scripts removed, motion stilled. Nothing is re-composed. The reference PNG beside each HTML is the gate: a board that does not pixel-match its reference does not go to the canvas.

```bash
node scripts/figma-handoff/freeze.mjs            # 24 boards into docs/figma-handoff/captures/
node scripts/figma-handoff/freeze.mjs --only portal
```

Boards: the storefront journey (nine beats plus the Why panel), the portal journey (six beats), the four portal pages on Calloway (Set 1) and on the synthetic bank estate (Set 2). `index.json` lists them in order with their titles.

Import: html.to.design by URL, one board at a time, named from the index; the captures are tracked so the live site serves them (https://socraticstatic.github.io/ai-grade-network/docs/figma-handoff/captures/<slug>.html). Pilot one board, pixel-diff it against its reference, show Micah, then the rest. Re-freeze and commit after any change to the pages.

## Import-ready boards (2026-10-13)

`node scripts/figma-handoff/wrap.mjs --index docs/figma-handoff/captures/index.json --out docs/figma-handoff/import` turns captures into files the html.to.design File tab imports as sections named by title (viewport 1440, Autolayout, hyperlinks, HTML layer names on). The site boards come from `--only site` and `captures-site/index.json`. A `--notes <map>.local.json` (slug → [their ask, applied here]) puts a requirement card above a board; the map is local, not committed.

What wrap.mjs fixes, each found on the canvas and verified by pixel-diff against the frozen PNG: the plugin turns a label with a CSS margin into a fixed-width text a pixel short of its glyphs, so Figma breaks the word (margins fold into padding, labels get nowrap and flex-shrink:0); table header and body cells hug differently in auto-layout, so columns drift (every cell gets its rendered width); the path strip's full-width line showed through station circles whose fill the plugin drops (the line is drawn as two segments that stop at the ring). Text Chrome clips becomes the visible part plus an ellipsis; nothing wraps that did not wrap in Chrome.

Figma MCP on a Starter team allows 20 tool calls a month; placement and renames otherwise go through the browser harness (domain-skills/figma.md).
