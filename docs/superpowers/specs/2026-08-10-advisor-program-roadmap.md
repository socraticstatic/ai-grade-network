# Advisor Program Roadmap

**Date:** 2026-08-10
**Source:** Aug 7 NAAS brainstorm ([notes](../../naas-brainstorm-2026-08-07-notes.md)), the AT&T Business Advisor demo video, and the NaaS Portal Values deck.

The brainstorm produced five insights, not one. This roadmap turns all five into phased work. Each phase gets its own spec when its turn arrives; Phases 0 and 1 are specced today.

## The five insights

1. **Too many low-value metrics at top level.** Screens must pass three tests (savings-first, connected, right measurement with right label) and the two-second test.
2. **Scale breaks the visuals.** A bank-class customer has thousands of sites; the Sankey, the tree, and the Fabric infographic need rollup-first + filter before rendering entities.
3. **The entry point should be an advisor.** Assess, converse, recommend, deepen - grounded in the estate, offering real AT&T solutions in tiers.
4. **Value on top, evidence below.** Every headline number carries its evidence one click away (the deck's design rule, the video's "why" popover).
5. **Recommendations are the connective tissue.** "Path can be converted to recommendation," simulate-before-enforce as the trust mechanic, persona-voiced per stage.

## Phases

### Phase 0 - Metric audit (immediate, independent)
Apply the four tests to every top-level number in the portal. Produce the inventory, the verdicts, and the cuts. No new surface. Spec: `2026-08-10-metric-audit-design.md`.

### Phase 1 - Bank-scale estate foundation (load-bearing)
Site classes (`dc | office | branch | atm`), a seeded bank-class tenant (~4.2k sites), rollup derivations, class-aware estate filters. One data model consumed by the tree, the advisor, and the Sankey. Spec: `2026-08-10-estate-foundation-design.md`.

### Phase 2a - Discover advisor first-run (needs Phase 1)
For an undiscovered tenant, Discover IS the advisor: AT&T-side head start ("we already see 4,187 of your sites"), credential intake to join estates, narrated scan, four findings (untracked AI flagship; unattached regions; egress steering; exposed/SPOF), each with a good/better/best ladder of real AT&T offers (assessment → AI Fabric → private AI transport; steer → NetBond → NetBond Advanced; Dynamic Defense → SASE). Accepting a tier routes to existing flows - the advisor has no checkout of its own. Return visits get today's tree; findings persist in the rail. Conversation extends `andiBrain` - engine-grounded, no pretend LLM.

### Phase 2b - Observe at scale (needs Phase 1, parallel with 2a)
The Sankey's left column becomes rollup groups (site class / region / business unit) with drill-in, scoped by the same estate chips. The money screen survives Wells Fargo.

### Phase 2c - Evidence layer (independent component work)
One shared "why this number" affordance: headline number → popover with engine-derived evidence and peer framing. Adopted first by Discover and Observe.

### Phase 3 - Advisor across the spine (needs 2a + one of 2b/2c)
Observe recommendations feed the same ladder cards; Govern simulate-before-enforce gates tier acceptance; Andi carries context between screens; copy voiced per persona (Architect / NetOps / FinOps / Security) per the deck's value map.

## Dependency graph

```
Phase 0 ──────────────────────────────► (informs all copy/labels)
Phase 1 ──┬─► Phase 2a ──┬─► Phase 3
          └─► Phase 2b ──┤
Phase 2c ────────────────┘
```

## Binding constraints (all phases)

**Flywheel compliance.** Every new surface uses the Flywheel 3 tokens already in `tailwind.config.js` (`fw-*` colors, ATT Aleck Sans, cobalt-600 primary interactive, the existing radius/spacing idiom of shipped components). No ad-hoc hex values, no new color ramps, no components that couldn't sit in the SDCI Figma. Where the advisor needs a pattern Flywheel doesn't name (scan checklist, evidence chip), it is composed from Flywheel primitives and documented for back-porting into the Figma library.

**Borrowed from the video** (the advisor UX inherits these specific elements, adapted to Flywheel):
- Entry banner: "Not sure..." observation + proof chips + single CTA.
- Minimal intake with inline verification and trust copy at the moment of ask.
- Scan theater: named analysis steps checked off one by one; status chip in the header flipping "Analyzing..." → "Recommendation ready."
- Two panes: chat narrates left, canvas carries the payload right; the canvas must stand alone with the rail deleted.
- Evidence chips land in the rail before the cards finish; every card carries inline evidence with a "why we recommend this" popover citing peer/estate data.
- Savings-led headline card above itemized detail; sticky total with the savings restated.
- Editable recommendation with instant re-check ("change anything and I'll re-check your savings").
- Stateful chat input: disabled "Building your recommendation..." until ready, then "Ask about your recommendation," with seeded suggested questions.

## Out of scope for this program

Real credential handling and live cloud crawling (demo stays engine-seeded), advisor checkout/commerce, LMCC integration changes, portal-wide rebrand work (guarded by rebrand.test.ts, untouched).
