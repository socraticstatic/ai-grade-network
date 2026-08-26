# Next session: execute the six MCP upgrades

Both MCP servers are registered in the user's Claude config (added via
`claude mcp add`) and load on session start:

- `figma` → https://mcp.figma.com/mcp (remote, OAuth'd; Code-to-Canvas
  WRITE: create/update frames, components, variables)
- `html-to-design` → https://mcp.to.design (PRO; `import-html`,
  `import-url`)

Target file: `GMSruRYGS5uyQLRBk2ADMB` ("AI-grade Network — NaaS Mockups",
Drafts, page "NaaS — 1440 Mockups"). State: `figma-state.json` here.
Node ids for all boards: previously collected; re-read from the file via
the Figma MCP rather than trusting the stale scratchpad copy.

Execute in order, validating each on a scratch section first:

1. **Validate both servers** — list tools; import a trivial HTML via
   `import-html`; read the page tree via the Figma MCP; delete scratch.
2. **Instance swaps** — replace each screen's imported "Main navigation"
   frame (and rail frame where present) with an instance of
   `Header/MainNav` / `Nav/LeftRail` via the write API. This retires the
   manual paste-to-replace note in 13-components.md.
3. **Variant sets** — split Button (6 states), Toggle (3), Badge/Status
   (5) into proper Figma variant properties.
4. **Layer renames** — walk each screen's tree and rename the h2d
   `div.*`/`span.*` layers to human-readable names, guided by the
   `NN-*.md` spec pages and `captures/*/measure.json` regions. (Micah's
   explicit ask; undelivered by browser automation.)
5. **One-command pipeline** — extend `scripts/figma-handoff/measure.mjs`
   with a `--publish` flag: freeze → `import-html` → rename/position/link
   via Figma MCP. Document in 00-foundation.md §"How to add a screen".
6. **Live sync** — a small script (or CI hook) that re-freezes changed
   screens after a drift fix on `main` and republishes their boards.

Known constraints from the browser era (all bypassed by the MCPs, kept
for reference): Figma web rejects synthetic clipboard events; h2d plugin
UI needs file-chooser interception on BOTH targets; Alt+L on the layers
panel with nothing selected collapses the whole Layers band; linked
canvas text opens new tabs on plain click (Cmd+click only).
