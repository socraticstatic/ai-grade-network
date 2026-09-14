# 02 — Meridian advisor (first screen)

Route `/discover/advisor`, meridian estate, first visit, **no interaction** —
this is the public site's opening screen (`/` redirects here). The opening
beat streams in on its own (~12s settle:
`scripts/figma-handoff/actions/02-advisor-settle.mjs`). Artboard 1440×965.

State shown: "Your AT&T advisor" header + "Skip to the estate" link;
greeting + sites narrative (18px/500 `#1d2329`, `text-figma-lg`); the
"ALREADY ON THE AT&T NETWORK" artifact (4,183 sites, 4 horizontal bars,
`#0057b8` fills on wash tracks); two reply pills (primary, radius full);
docked prompt bar ("Ask anything about what I found…", input h-56, send
button 56px circle `#0057b8`).

## Regions

| Region | y | h | Notes |
|---|---|---|---|
| Header (`Header/MainNav` instance) | 0 | 65 | shared chrome |
| Advisor header row | 130 | 40 | 18/700 title, link right 16/500 `#0057b8` |
| Conversation column | 195 | ~590 | max-w 46rem, centered |
| Bars artifact | 400 | 270 | label 12/500 +4% uppercase, value 42/700 |
| Reply chips | 745 | 48 | primary pills |
| Prompt bar (docked) | 1160 | 88 | full-width band, top border `#dcdfe3` |

Drift fixed (§02): advisor copy `text-[17px]` → `text-figma-lg` (18px ramp
step) in AdvisorConversation.tsx and FindingCard.tsx.

Full boxes: `captures/02-advisor-first/measure.json`; ground truth
`captures/02-advisor-first/02-advisor-first@2x.png`; master
`artboards/02-advisor-first.html`.
