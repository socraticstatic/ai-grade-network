# NaaS storefront: the first level

Design, 2026-09-22. Builds on `2026-09-17-storefront-story-schedule-scale-design.md`.

Two asks, given in this order:

1. Organize the product into task flows instead of showing every control by default.
2. Stop showing so much on the first level, and carry the depth on click.

They are one ask. The storefront renders every task on every page at every stage,
so the first level is large, most of it is inert, and navigation has grown a
table of contents to cope.

The picture and the fabric model are a separate thread. This spec does not touch them.

---

## 0. What is already true

Every number below was measured in headless Chromium at 1440x900 against the
served build, not inferred from source.

**Fifteen rail rows resolve to four pages.** The rail renders 24 clickable
entries: brand and home at the top, four category titles, sixteen section rows,
and the collapse toggle. Fifteen of those sixteen section rows scroll within a
page they share. Clicking Fabric, Accounts, Off fabric and Paths lands on the
same 2479px page four times, with an identical control count each time. Only
Explore 360 navigates anywhere.

| Rail rows | One page | mature |
|---|---|---|
| Fabric, Accounts, Off fabric, Paths | Discover | 58 controls / 2479px |
| Health, Flow map, Insights, Logs | Observe | 79 controls / 4585px |
| Policies, Templates | Govern | 16 controls / 986px |
| Savings, Egress, Forecast, AT&T charges, Steer to save | Cost | 45 controls / 3215px |
| Explore 360 | its own | 4 controls / 1143px |

**The rail hides two of its own destinations.** AT&T charges sits at y=874 and
Steer to save at y=914 on a 900px viewport. A navigation that scrolls is a
navigation that lies about how many places exist.

**The rail exists because the pages are long.** `naas-app.js:1908` records the
reason: "the page continued, so the tradeoff table, the sources and the products
were only ever found by accident. The rail lists them, clicking one glides
there." That was a correct response to the symptom. This spec removes the cause.

**Three pages run three to five times over the standing fold rule.** The project
already holds 1440x900 with no scroll. Observe is 4585px and was 4405px in
September, so it is still growing. Only Govern and Explore 360 come near the line.

**Twenty controls sit above the fold on a new customer's first screen, and none
of them can act.** On `?estate=empty#s0`: Re-discover with nothing discovered, a
telemetry date range with no telemetry, five drill targets into an empty picture,
an Attach button with nothing to attach, four colour lenses with no paths to
colour. The only control that starts anything is Scan, at y=1199, 299px below
the fold. Compose sits at y=968, also below it.

**Discovery renders as global chrome on all five pages.** The cadence selector,
Re-discover, Manage credentials and the date range appear on Observe, Govern and
Cost, where none of them belong. On an empty estate, Observe carries eight
controls and four of them are that bar.

**The same task appears twice on one page.** Discover carries two cadence
selectors, one at y=126 and one at y=1126, plus Re-discover, Manage credentials,
Add a source, Re-scan and Edit access. Seven controls for one job, in two places.

**Ways to connect never lands where it helps.** It is pinned last in every state:
y=999 on empty, where it is the only education available, and y=2557 on mature,
where the customer has already chosen.

---

## 1. The rule

> A control renders only when it can change something. Each destination fits
> 1440x900 at rest. Everything else is one click deep and opens in place.

The discarded alternative was "hide what is not part of the current task."
Every control belongs to some task, so that test excludes nothing and drifts
under argument. Liveness is mechanical: given the current state, can this control
change anything? It can be asserted per control per stage, which makes it testable.

The rule is a reveal, not a wizard. Sections appear and disappear; controls inside
a visible section stay put. Drills open in place. Nothing leaves the page, and
the storefront stays five dashboards rather than a sequence of steps.

---

## 2. The rail

The rail collapses to five destinations: Discover, Observe, Govern, Cost,
Explore 360.

The fifteen scrolling section rows stop being navigation. Each becomes a drill inside the
page that owns it, reached from the thing it describes rather than from a list
beside it. `SECTIONS` in `naas-app.js:1915` keeps its section ids, which the
drills still use as scroll and open targets; only the rail stops rendering them
as rows.

This removes the two below-fold rail entries by removing the need for a rail
that scrolls.

---

## 3. Discover at rest

Today at mature: 58 controls, 2479px, five tasks stacked.

At rest, three things:

- **The verdict.** One sentence over the state line already written: "1 of 8
  regions still ride the public internet. 7 are on the AT&T fabric."
- **The picture.** Discover's actual answer. It stays.
- **The state row.** The four tiles carry state the rail cannot: "$61,400/mo
  already saved," "104 policy violations." That state survives in some form. It
  reads as state, never as a second navigation. Section 9 leaves the form open.

Everything else drills:

| Today on the page | Opens from |
|---|---|
| Connected accounts, Add a source, Re-scan, Edit access, cadence (`sec-accounts`) | The account count in the verdict |
| Not connected yet, Connect this (`sec-gap`) | The unattached nodes in the picture |
| Ways to connect, four lenses, comparison table (`sec-paths`) | Connect, where the choice is made |
| Scope, Explore the estate | The picture |

Ways to connect then appears at the moment someone is choosing, instead of
2557px below it.

---

## 4. Observe, Govern, Cost

**Observe** is four pages concatenated, and its four sections are its four
former rail rows.

| Section | y | controls |
|---|---|---|
| Health right now (`sec-health`) | 285 | 6 |
| Live flow map (`sec-flow`) | 501 | 24, 1425px tall |
| Connections | 1926 | 7 |
| Insights (`sec-insights`) | 2299 | 12 |
| Logs (`sec-logs`) | 3113 | 18 |

At rest: verdict, health strip, flow map. Connections, Insights and Logs drill.

**Observe cannot satisfy the fold rule with its hero intact.** Verdict plus strip
plus a 1425px flow map is roughly 1900px. The answer is the volume-drawer pattern
already established here: the map samples into a fixed frame and zooms within it,
and the full list opens in a drawer at the point of volume. Weakening the rule
for one page would forfeit it everywhere, so the frame is the work instead.
Observe is therefore the hardest page in this spec and the last one to be touched.

**Cost** is seven sections over five former rail rows: Where the money is,
Egress by destination, Egress by first mile, 90-day forecast, Committed vs
metered, AT&T charges, Savings by bucket. At rest: verdict, Where the money is,
the savings headline. The other five drill.

**Govern** already nearly passes at 986px and 16 controls, nine of them in the
header. Removing the discovery bar fits it.

---

## 5. The reveal ladder

A section appears when its subject exists.

| | empty | small | partial and mature |
|---|---|---|---|
| **Discover** | Discovery setup only | Picture, "nothing attached, start at Connect" | Verdict, picture, state row |
| **Observe** | "No telemetry yet" and one action | same | Flow map |
| **Govern** | "No policies yet" and three starting points | Policies appear | Policies, violations |
| **Cost** | "No egress seen yet" and one action | Where the money is | Full |

All five destinations stay visible in the rail at every stage. Hiding Observe
from a prospect hides what they are buying. Each empty page instead carries
exactly one action, and that action points back at discovery.

Govern's empty state is already written this way: "No policies yet. Three
starting points below." It is the model for the other three.

On an empty estate, Discover's picture holds nothing and earns no space. The
discovery setup takes the fold: organization, provider, credential, scope,
cadence, Scan.

---

## 6. Discovery is a Discover task

The cadence selector, Re-discover, Manage credentials and the date range leave
the global header. They render on Discover, Observe, Govern and Cost; Explore 360
is already clean. Four controls times the three pages that do not own them is
twelve control-instances removed before any page-level work begins.

Discovery consolidates into one place inside Discover: the accounts drill. The
second cadence selector goes. Re-discover, Re-scan, Add a source, Edit access and
Manage credentials become one set of controls with one home.

The date range belongs to telemetry, so it moves to Observe and Cost, where
telemetry exists.

**The intake takes more than one cloud.** `intakeProvider` is a single string in
state (`naas-app.js:2000`), and the form renders one Provider, one Auth type, one
Scope and one Scan. A customer with AWS, Azure and GCP must scan, leave, find
Accounts and add a source twice more. The first-run flow accepts a set of
credentials before the first scan.

---

## 7. Sequencing

Discover pilots the pattern, alone, and is verified against captures before
anything else is touched. Govern follows, because it nearly passes already and
proves the rule cheaply. Cost third. Observe last, because the flow map frame is
real work rather than a layout change.

No bulk edit across pages. `NaaS Storefront.dc.html` is a single 356KB file, and
its markup has been broken before by a patch that touched several sections at
once.

The first implementation plan covers the rail collapse and Discover only.
Govern, Cost and Observe each get their own plan, written after the page before
them has been measured against section 8.

---

## 8. Verification

Every claim in section 0 came from a measurement, and every claim of completion
will too.

- Control census per page per stage, headless at 1440x900: count, count above the
  fold, page height. The numbers in section 0 are the baseline to beat.
- A liveness assertion per control per stage: in this state, can it change
  anything? A rendered control that answers no is a failure.
- `tests/markup.test.mjs` pins the whole-file tag census. Every task here moves
  those pins deliberately, with a comment.
- Open and close each drill and confirm the page returns to its rest height.
- Screenshots of a later screen after any markup patch, not only the screen edited.

---

## 9. Left open

These are not decided, and the implementation plan must not decide them silently.

- Whether the four state tiles survive as tiles or fold into the verdict line.
- Where the accounts drill opens: in the right-hand drawer, or expanded in place
  under the verdict.
- Whether Explore 360 stays a rail destination or becomes a drill from Discover's
  picture. It is the only section row that navigates today, which is an argument
  either way.
- The fixed-frame dimensions for Observe's flow map.
