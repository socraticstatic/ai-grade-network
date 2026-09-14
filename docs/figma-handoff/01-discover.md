# 01 — Discover entry

Route `/discover`, meridian estate, advisor skipped in-session (meridian
never persists its advisor-done flag — `scripts/figma-handoff/actions/01-discover.mjs`
walks the real skip path). Artboard 1440×1324.

State shown: Tree view, collapsed; six clouds (AWS/Azure on the AT&T fabric,
GCP/Oracle/CoreWeave/Nebius on public internet); KPI band (4,183 sites ·
6·8 clouds/regions · 1,104 workloads · 4 attached VPCs · 7 exposed
endpoints); Your sites rollup by type; advisor card ($39,883/mo, 4 findings).

## Regions

| Region | y | h | Notes |
|---|---|---|---|
| Header (`Header/MainNav` instance) | 0 | 65 | full-bleed, sticky |
| Journey band (Discover→Cost + CTA) | 96 | 120 | stepper 16px labels, CTA primary pill |
| Page title block | 240 | 110 | "Discover" 26/700, desc 16/500 `#454b52` |
| View toggle + filters row | 360 | 100 | Tree/Map segmented + 7 filter dropdowns |
| Cloud rows ×6 | 470 | 88 each | card radius 12, border `#dcdfe3`, provider mark 36px |
| KPI band | 1005 | 90 | 5 stat cells, values 26/700 |
| Your sites rollup | 1170 | 154+ | 4 collapsible type rows |
| Advisor card (right rail) | 275 | 190 | wash bg, $ 26/700, CTA primary pill |

No drift found (§01) — chrome and primitive fixes from Tasks 5–6 carried
through. Full boxes: `captures/01-discover/measure.json`; ground truth
`captures/01-discover/01-discover@2x.png`; master `artboards/01-discover.html`.
