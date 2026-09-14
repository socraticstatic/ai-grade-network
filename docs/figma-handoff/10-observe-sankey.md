# 10 — Observe · Sankey (the money screen)

Route `/naas/observe`, meridian estate. Artboard 1440×3017. 143 measured
elements — full boxes in `captures/10-observe-sankey/measure.json`; ground truth
`captures/10-observe-sankey/10-observe-sankey@2x.png`; importable master
`artboards/10-observe-sankey.html` (fonts embedded).

State shown: Observe with the flow Sankey — hand-rolled SVG (SankeyChart/
SankeyPanel, VizKit grammar, no chart library), real flow-log records,
KPI populations, event stream. Every Sankey link is an editable vector in
Figma — no raster fallback needed. No drift found.

Chrome: header + rail map to `Header/MainNav` / `Nav/LeftRail`
components (see 13-components.md).
