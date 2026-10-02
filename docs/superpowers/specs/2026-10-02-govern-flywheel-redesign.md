# Govern on NetBond Advanced's policy patterns, and an AT&T icon system

Date: 2026-10-02. Status: built under stated assumptions; Micah corrects on review.

## Why

Micah, 2026-10-02: "So verbose, not very visual, and the policy engine really
didn't borrow from the policy stuff on netbond advanced. it's very ugly. I need
more icon and flywheel beauty, and more."

## Assessment, measured headless at 1440x900 on Growing

Strong already: the home (KPI cards, egress chart, Do next), Discover > Estate
(rings, apps table), Connect > Connections (the network picture), Observe >
Traffic (the Sankey). Each has one picture and the numbers around it.

Weak:

- **Govern > Policies.** Four columns of sentences per policy. A rule reads as
  a wall of 12px text; nothing in the row is a shape. The findings' fix buttons
  run to 55 characters.
- **The composer.** Three columns of plain radio cards (18 of them). Path &
  services is five columns of text chips. Route policy is eleven cards with two
  text buttons each. Outcome opens as three empty boxes.
- **Policy engine.** Chips, a word, four bordered boxes of text, a list. No
  picture of the path it decides.
- **Templates.** A four-row label table inside each card.
- **Cost > Optimize.** Four prose rows, no mark per move.
- **Icons.** 27 glyphs in `brand/icons-*`, used only in the rail and the help
  cards. The AT&T set has 751.

NetBond Advanced's policy UI (att-netbond-sdci, Configure > Policies and the
connection's Policies tab) has what Govern lacks: a vertical tab group with
icons and category heads (Routing, Scaling, Security); rules as rows on a wash
background with a toggle switch per direction (On Premise → Partner, Partner →
On Premise) under section heads (Deny actions, Manipulations, Allow actions,
Advanced); a policy list where each row leads with an enable toggle, a priority
square, the name, and color badges for the verb (ALLOW green, DENY red,
MANIPULATE orange, ADVERTISE blue); expandable detail under the row; Reset and
Save in a footer.

## Design

### 1. Icons, one system

`brand/icons/<name>.svg`: the AT&T glyphs copied from the brand package's
currentColor set. Drawn as CSS masks tinted by `currentColor`:

```html
<span class="ic" style="--ic:url('brand/icons/firewall.svg')"></span>
```

One file serves both themes and every ink (link, success, error). Sizes `.s14`
to `.s28`; `.ic-tile` is the 40px accent square NetBond uses beside a title.
`ICON(name)` in naas-app.js returns the style string so bound icons stay one
expression. A test checks every icon named in the markup or the app exists on
disk.

### 2. Flywheel primitives (CSS, in the page's style block)

`.fw-toggle` (36x20 switch, cobalt when `aria-pressed="true"`), `.fw-badge`
with `.allow .deny .manip .adv`, `.fw-prio` (the priority square), `.fw-vtabs`
/ `.fw-vcat` / `.fw-vtab` (the vertical tab group), `.fw-row` (a wash row),
`.fw-dir` (a direction toggle with its label), `.fw-sec` (a section with an
h4). Theme tokens only.

### 3. The path strip

One picture for a policy: four nodes on a line, in path order, Sites & first
mile (building), AT&T edge (firewall), AT&T core (hub), Cloud & workload
(cloud). A node is set (cobalt ring, link ink), broken (error ring) or any
(grey). Its caption is the rule at that layer. The strip replaces every
four-column text block in Govern: the policy row, the composer's "Layers this
policy sets" grid, the engine's four verdict boxes, the template cards' tables.
`.ps` is the row size, `.ps.big` the panel size with wrapping captions.

### 4. Govern > Policies, the list

Row: enable toggle (on = enforced; on a simulated policy it enforces) ·
priority square (the engine's precedence number, so the list and the engine
agree) · name, verb badges, "applies to" with an icon by kind (tag, building,
private cloud, region) · the path strip · status and violations · one action
(the violations door). The row's name opens the detail: the four rules in
words, and the sentence. Verb badges come off the policy: ALLOW / DENY /
MANIPULATE / ADVERTISE from its route rules, PATH / INSPECT / SEGMENT / SLO /
EGRESS / ENCRYPT / ACCESS from its requirements, three at most.

Findings' fix buttons cap at 300px with the full label as a title.

### 5. The composer

```
When A reaches B, require …                                        ×
[path strip, captions live as you pick]
┌ POLICY            ┐
│  Intent           │   (content)
│ ROUTING           │
│  Multi-path & egress
│  Route policy     │
│ SECURITY          │
│  Inspection & access
│ OUTCOME           │
│  Simulate         │
└───────────────────┘
                                   Reset   Simulate   Enforce
```

- Intent: three icon lists (When, Reaches, Require), 36px rows, a radio dot.
- Multi-path & egress and Inspection & access: the five service groups as
  `.fw-sec` sections, each option a `.fw-row` with a `.fw-toggle`.
- Route policy: NetBond Advanced's rows as they are, two columns (Deny actions
  and Allow actions; Manipulations and Advanced), each row a label and two
  direction toggles. A direction a rule does not have is disabled.
- Simulate: Today / With this policy / Price change as tiles with an icon, the
  big strip for what it pushes, Missing rows with the order button. Nothing
  picked: one line.

Tab keys stay `intent`, `services`, `route`, `outcome`; `security` is new.
`aGroups` is unchanged; each tab reads its groups.

### 6. Policy engine

From / To / Carrying chips carry an icon by kind. The verdict is a badge
(ALLOWED success, DENIED error) with its icon, then "decided by". The four
boxes become the big strip. The trace and the side panels stay; the blurb
shrinks to one line.

### 7. Templates

Card: icon tile, title, one-line why, the strip, "Start from this" as a button
with the two sides. Each template names its icon.

### 8. Cost > Optimize

A mark per move: Spend (bill), Routing (router), Resiliency (sync), Capacity
(high-meter).

## Gates

`npm test` (the markup census moves and says why), `node scripts/fold.mjs
--pages govern,cost` on all five estates, both themes, 0 FAIL. Headless only.

## Order of work

1. Icons, primitives, strip CSS, `ICON`, the icon test.
2. The policy list.
3. The composer.
4. The engine and templates.
5. Optimize marks and the copy trims. Deploy.

## Out of scope

Rail and page-tab icons beyond what exists, Observe and Discover retouches, a
new Govern IA. Those are the backlog once this lands.
