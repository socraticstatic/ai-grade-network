# Figma hand-off: transcribe, never generate

Every board is the DOM the running app painted, frozen by `scripts/figma-handoff/freeze.mjs`: the stylesheet inlined, every asset made absolute to the live site, scripts removed, motion stilled. Nothing is re-composed. The reference PNG beside each HTML is the gate: a board that does not pixel-match its reference does not go to the canvas.

```bash
node scripts/figma-handoff/freeze.mjs            # 24 boards into docs/figma-handoff/captures/
node scripts/figma-handoff/freeze.mjs --only portal
```

Boards: the storefront journey (nine beats plus the Why panel), the portal journey (six beats), the four portal pages on Calloway (Set 1) and on the synthetic bank estate (Set 2). `index.json` lists them in order with their titles.

Import: html.to.design, one board at a time, named from the index. Pilot one board, pixel-diff it against its reference, show Micah, then the rest. The captures folder is regenerated and never committed.
