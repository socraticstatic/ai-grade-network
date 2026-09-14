# 14 — Advisor · Tiered offers

Route `/discover/advisor`, meridian estate, full conversation walked
without shortcuts (`scripts/figma-handoff/actions/14-advisor-offers.mjs`):
greet → "What can't you see?" → demo credentials → scan → every finding →
wrap. Artboard 1440×4235.

State shown — the four finding cards, each with its good/better/best
ladder from `offerCatalog.ts` (FindingCard.tsx `finding-tier-*`):

| Finding | Domain chip | Tiers (start · recommended · full control) |
|---|---|---|
| 4 AI workloads, no governance tag | FOR SECURITY & COMPLIANCE | 14-day assessment · AI Fabric governance · Private AI transport |
| Save $36,400/mo — 7 unattached regions | FOR FINOPS & SRE | Steer on the AT&T fabric · NetBond attach · NetBond Adv |
| Save $3,483/mo — 3 flows off public internet | FOR FINOPS & SRE | Steer on the AT&T fabric · NetBond attach · NetBond Adv |
| 1 single-path region, biggest blast radius | FOR SECURITY & COMPLIANCE | Dynamic Defense · SASE · Dual-path attach |

Plus: scan checklist artifact, per-finding evidence/why copy, and the wrap
hero ("You could save $39,883/mo" gradient band) with the 14-day
assessment CTA.

Drift fixed (§14): conversation pills/replies/prompt `text-[15px]` →
`text-figma-base` (16px ramp step), AdvisorConversation.tsx ×3.

Full boxes: `captures/14-advisor-offers/measure.json`; ground truth
`captures/14-advisor-offers/14-advisor-offers@2x.png`; master
`artboards/14-advisor-offers.html`.
