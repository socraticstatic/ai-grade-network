# 20 — AI · Insights · Performance

Route `/ai/observe`, meridian estate. Artboard 1440×1539. 139 measured
elements — full boxes in `captures/20-ai-insights-performance/measure.json`; ground truth
`captures/20-ai-insights-performance/20-ai-insights-performance@2x.png`; importable master
`artboards/20-ai-insights-performance.html` (fonts embedded).

Insights, Performance tab. KPI band (12.15B tokens · $26.1k spend · 246ms
TTFT p95 · 0 blocked), then latency and throughput per model, and the
filterable request log. Ten SVG <text> labels on this board — all
carrying ATT Aleck Sans, which is what the freeze fix bought.

Audit: CLEAN — no type off the rendered ramp, no spacing off the 4px grid,
no colour outside tokens.json plus the sanctioned fw overrides.

Layers arrive named from the freeze (see METHOD.md §"Naming layers at the
source"): content names clipped at 44 characters, else the established
role vocabulary — Row, Stack, Grid, Card, Section, Flex item, Hover group,
Rule. Chrome maps to `Header/MainNav` / `Nav/LeftRail` on board 13.
