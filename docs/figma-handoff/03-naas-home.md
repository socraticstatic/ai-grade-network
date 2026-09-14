# 03 — NaaS Home

Route `/naas/home`, meridian estate. Artboard 1440×1269. 128 measured
elements — full boxes in `captures/03-naas-home/measure.json`; ground truth
`captures/03-naas-home/03-naas-home@2x.png`; importable master
`artboards/03-naas-home.html` (fonts embedded).

State shown: exec hero ("8 priced moves…", $39.9k/mo savings block with
"Why this number", public-internet/fabric split bar, Review 8 moves CTA);
side stats ($29.9k/mo egress, 100% invisible traffic, 8 open findings);
"Across the lifecycle" — five stage cards (Discover 4,183 / Connect 1 of 8 /
Govern 0 of 8 / Observe 33% / Cost $29.9k/mo) with progress bars and
sparklines; Standing intents band (4 declare-intent chips); "Work this
layer" — four verb cards.

Widget sources: src/features/layer-home/dashboard/widgets/*. Hero:
LayerHero.tsx.

Drift fixed (§03): hero verdict text-[19px] → text-figma-lg;
verb-card gap-3.5 → gap-4.

Chrome: header + rail map to `Header/MainNav` / `Nav/LeftRail`
components (see 13-components.md).
