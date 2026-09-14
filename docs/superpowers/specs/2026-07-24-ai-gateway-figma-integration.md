# AT&T AI Gateway (Figma NAAS AI) — Assessment + Integration Plan

**Date:** 2026-07-24
**Source:** Figma file `nYZz6X2Zcj2CNfo2mCgtpQ` ("NAAS AI"), reviewed frame by
frame via the Figma MCP. Captures saved in scratchpad/figma/.
**Instruction:** borrow the UX structure, keep Flywheel.

## What the Figma is

It is the **AI Fabric layer, built to production fidelity** — the same layer
our app already ships as `/ai/*`, but far deeper — plus two things we don't
have: a conversational assistant ("Andi") and a 14-day onboarding assessment
funnel. Its design tokens ARE Flywheel (verified in the code context:
`--background/wash #f8fafb`, `--border/secondary #dcdfe3`, `--text/headings
#13171b`, `--surface/cta/cta-primary #00388f`, ATT Aleck Sans). So this is not
a restyle — it's the same design system, and we adopt structure directly.

### The frames (7 core screens)

1. **Insights — anatomy** (`1:5087`). The AI Fabric detail screen. Top: a
   **gateway-location selector** (`NYC-DC-01 ▾`) + product mark "AI Gateway".
   Left rail: AI Fabric · Insights, then a **Governance** group: Policies ·
   Teams & limits · Providers · Virtual keys. Body: KPI stat row (Tokens,
   Cost, TTFT p95, Requests, Blocked requests) → a **Traffic-flow Sankey**
   (Identity → Source/ingress → Fabric route → Provider/model, each node
   priced) → a **Requests table** (Time, Status, Identity, Source, Route,
   Model, Tokens, Cost, Cost-savings, TTFT, TTFT-savings, sizes, total time).
   Filters: Provider / Model / Identity / Path / Status + removable chips.

2. **Insights — Cost tab** (`1:8938`, day-1 variant). Tabs
   **Performance / Cost / Security**. Cards: "Potential monthly saving with
   routing" (bar: current vs routed), "Projected monthly savings with caching
   (35% hit rate)" (per-model bars), "Annual budget tracking" (line: spent vs
   predicted vs budget, with an over-budget alert + "Add policy"), per-team
   cards (Marketing/Design/Engineering — spend vs avg, driver, "Update limits"
   / "Ask Andi"), and "Cost share by top providers" (stacked bars, Week/Month/
   Year). Each card that finds waste carries an inline **alert + action button**
   ("Routing policy not configured → Set policy", "Caching disabled → Enable
   Caching").

3. **Andi assistant** (`1:10695`). A right-hand chat panel, 480px. Header
   "Andi" + andi glyph. Empty state: "Ask anything about this view, or trigger
   an action below. **Every change is reversible and time-boxed by default.**"
   Two sections: **Resolve** (action cards — e.g. "Budget policy not configured
   → Set budget policy / Update budget") and **Ask** (suggested prompts —
   "Which team is driving most spend?"). Thread view: user bubble → answer →
   **"Yes, draft a proposal"** button → thumbs up/down + timestamp. Prompt box
   pinned to a context chip ("NYC-DC-01 · Overview"), mic + send. Legal line:
   "AI-generated. Review every proposal before applying." This is **our
   advisor + proposal loop, as a conversation.**

4. **Setup** (`1:9298`). Onboarding. "In 14 days, find out what your AI traffic
   is costing and risking, before you commit to anything." Three value props
   (overpaying / getting through unprotected / slowing every request), a
   3-step timeline (Today → Day 2-14 → Day 14), then a **connectors list**
   (each optional, "+ Add") and "Start assessment".

5. **Trial — day 1** (`1:8555` variant / `1:8938`). "Your AI traffic is being
   measured right now. Nothing is blocked or routed." Read-only badge, live
   counters (Employees using AI, Requests analyzed, Tools in use, Ungoverned
   tools, Security events), collapsible detection rows (Invisible AI traffic,
   Security events, AI spend, Latency). "Collecting data…" ticker.

6. **Trial — day 14 report** (`1:8555`). "Your AI traffic has ~4k/mo in
   unclaimed savings and 37 events that went through unprotected." Three head
   stats (recoverable/mo, security events, ms wasted) + a stat row + expandable
   **findings** ("71% of your AI traffic is invisible", "Two thirds of your AI
   spend is avoidable" with the routing/caching charts inline, "37 security
   events happened. Zero were stopped") + a downloadable report card.

7. **Day 15** (`1:8298`). "Completed on Jul 26" — the assessment closed,
   findings frozen, "Start 14 days free trial" CTA.

## How it maps onto what we have

| Figma | Our app today | Gap |
|---|---|---|
| Left rail: AI Fabric · Insights · Governance(Policies/Teams/Providers/Virtual keys) | `/ai` left rail: Home · Connect · Govern · Observe · Cost | Their rail is **richer within the layer** — a second-level nav. Ours is the four verbs. |
| Gateway-location selector (`NYC-DC-01 ▾`) | none | New: a scope switcher for the AI layer. |
| Insights KPI row + Sankey + Requests table | `/ai/observe` (KPIs + flow bars + records) | We have the shape; theirs adds the **Sankey** and a **savings-per-row** table. |
| Cost tab (routing/caching savings, budget tracking, per-team, provider share) | `/ai/cost` (spend, budgets) | We have spend/budgets; theirs adds **caching savings, annual budget line, per-team drivers, provider-share chart**. |
| Andi (Resolve + Ask + draft-a-proposal, reversible/time-boxed) | our **advisor draft** + **proposal links** + **⌘K intents** + **Undo** | Same concepts, different surface. Ours is a tray + palette; theirs is a **named conversational panel**. |
| 14-day assessment funnel (Setup → Trial → Report) | none | Entirely new: an onboarding/land funnel for the AI layer. |

**The headline:** we already built the *mechanics* the Figma implies (engine-
priced advice, reversible proposals, live figures). The Figma gives us the
*presentation* and two net-new surfaces (Andi, the assessment funnel). And it
confirms the shell we shipped yesterday — a layer with a left rail of its own
sections — so this drops in on top of the left-rail nav, not against it.

## Integration plan (phased, each phase ships + verifies on its own)

Every figure stays engine-derived (our law); the Figma supplies layout and
components, not numbers. Flywheel tokens throughout — which is what the Figma
already uses.

### Phase 1 — AI Fabric's own left rail (second-level nav)
The Figma's left rail for the AI layer is richer than four verbs: AI Fabric,
Insights, and a Governance group (Policies, Teams & limits, Providers, Virtual
keys). Extend `navItems` so a layer can carry **grouped rail sections**, and
render them in `LeftRail`. Add the **gateway-location selector** to the top of
the AI layer's rail (scopes the AI figures; starts single-option `NYC-DC-01`).
Routes for the new sections reuse existing pages where they exist
(Providers/Policies ≈ our Govern surfaces) and stub the rest.

### Phase 2 — Insights, rebuilt to the Figma
Rebuild `/ai/observe` (or a new `/ai/insights`) to the anatomy screen: the KPI
row, the **Traffic-flow Sankey** (a new `viz/` component, fed by our
routeFlows/token data), and the **Requests table** with the savings columns.
Add the **Performance / Cost / Security** tab set. All figures from the engine.

### Phase 3 — the Cost tab
Rebuild `/ai/cost` to the Figma's Cost layout: routing-savings and
caching-savings cards (each with its inline alert + action), the **annual
budget line**, **per-team driver cards**, and the **provider-share** stacked
bar. Reuse `aiSpend`/`stackFigures`; add caching + per-team derivations.

### Phase 4 — Andi (the assistant panel)
A right-hand **Andi** panel available on the AI layer. It is our existing brain
in the Figma's clothes: **Resolve** = advisor draft rendered as action cards;
**Ask** = ⌘K intents/suggested prompts; **"draft a proposal"** = our proposal
link; **reversible/time-boxed** = Undo + an auto-expire timer on staged moves.
No new engine work — it re-skins advisorDraft + proposalUrl + commitMoves into
a conversational surface. Andi is AT&T brand (link to brand center in the file).

### Phase 5 — the 14-day assessment funnel
A standalone **`/assessment`** flow (outside DashboardLayout, like `/stack`):
Setup (connectors) → Trial read-only day-N (live counters, detection rows) →
Day-14 report (findings + downloadable) → Day-15 closed. This is a demo/land
narrative; wire counters to the engine's discovery model so the report figures
are real. Print/share-ready like the Intent deck.

## Complete-review addendum (every frame, 2026-07-24)

The four "insights | Performance" frames are four STATES of one screen, and
they matter to the build:
- **Performance tab** (`1:4324`): a regional **incident strip** on top (three
  latency events, each narrated with driver + mitigation, carrying "Ask Andi"
  and — on the config-caused one — **"Rollback"**), then latency-routing
  savings ("120 hrs", p50 −33% / p95 −39%, Direct vs With-routing bars), then
  provider cost share.
- **Cost tab, warning state** (`1:3498`): savings cards footed by alerts
  ("Routing policy not configured → Set policy", "Caching disabled → Enable
  Caching"), annual budget line with over-budget October, team driver cards,
  provider share.
- **Cost tab, achieved state** (`1:4674`): the SAME cards after adoption —
  green footers ("AT&T AI Gateway saved you $1,500 by selecting cost
  effective models"), "Cost spike detection" label over the team cards.
  Build both states; the engine's policy flags pick which renders.
- **Dark theme** (`1:3911`): a full dark variant of Insights — matches the
  Make file's stated aesthetic. Treat as future theming, not phase scope.

**Sankey, frame-fidelity spec** (`1:5149`): title "Traffic flow" + provider
legend (AWS Bedrock, Anthropic, OpenAI, Self-hosted, Other) + expand control;
four columns — Identity (User/Agent), Source (Ingress site), Fabric route
(Egress path), Provider/Model (Destination); every node = vertical cobalt bar
+ label + $ value; ~5 nodes per column with "Other" catch-alls; ribbons in
pale blue-grey, the SELECTED path highlighted cyan end-to-end; hover tooltip
"Event path" with Cost, green "Saved", and the four hops named. (The frame
carries two typos — "IDENTIDY", "Antropic" — do not copy.)

**Sibling "NAAS AI Project File"** (`figma.com/make/f4tGwwW1c8xsidVepI5eRT`):
a Figma **Make** prototype, Version 1, effectively empty — one generation
prompt for a NAAS AI landing page ("deep navy ground, electric cyan accents,
geometric sans type, animated network topology hero"). Nothing to integrate;
noted as the intended marketing-page aesthetic.

## Decisions (Micah, 2026-07-24)
1. **Insights** — rebuild `/ai/observe` in place. Insights IS the AI layer's
   Observe surface; the rail item labeled "Insights" routes to `/ai/observe`.
2. **Andi** — spans the **whole app, all layers**. It reads the active layer's
   advisor draft / intents / proposals, so it generalizes for free.
3. **Assessment funnel** — a **real onboarding path** that gates into the app,
   not just a deck. Counters wired to the discovery engine.
4. **Order** — rail → Andi → Insights → Cost → funnel.

## The AI Fabric rail (adopted from the Figma)
The AI layer adopts the Figma's bespoke rail instead of the four generic verbs
(NaaS keeps verbs until it gets its own design):
- **AI Fabric** → `/ai/home` (overview)
- **Insights** → `/ai/observe` (rebuilt; the Perf/Cost/Security tabs live here)
- *Governance* group: **Policies** → `/ai/govern` · **Teams & limits** →
  `/ai/teams` · **Providers** → `/ai/providers` · **Virtual keys** → `/ai/keys`
- **Gateway-location selector** (`NYC-DC-01 ▾`) pinned at the rail top.
Legacy `/ai/connect` and `/ai/cost` routes stay alive (redirect/deep-link) so
nothing 404s; Connect folds into Providers, Cost becomes the Insights · Cost tab.
