# AI Gateway — Pixel-Level Component Specs

Extracted 2026-07-24 from Figma "NAAS AI" (fileKey `nYZz6X2Zcj2CNfo2mCgtpQ`), frame `1:5087` "insights" and siblings. All measurements in px at 1x. Font is ATT Aleck Sans throughout. Source layer/copy typos are quoted verbatim and flagged "[sic], do not copy".

## Shared design tokens

| Token | Value | Used for |
|---|---|---|
| `--background/base` | `#ffffff` | card/table/nav surfaces |
| `--background/wash` | `#f8fafb` | table header row fill, active tab fill |
| `--background/neutral` | `#f3f4f6` | avatar fill |
| `--background/accent` | `#f2fafd` | filter chip fill |
| `--background/info` | `#0074b3` | sankey node bars (cols 1-3), chip label prefix |
| `--background/gradient-start` | `rgba(186,238,252,0.8)` | active left-nav pill |
| `--surface/accent/accent` | `#dcf3fa` | segmented-toggle track |
| `--surface/muted/muted` | `#f8fafb` | segmented-toggle active tab |
| `--border/secondary` / `--stroke/border/border` | `#dcdfe3` | all card/control/table borders, dividers |
| `--data-viz/border/borderl1` | `#f3f4f6` | left-nav site-selector bottom border |
| `--text/headings` | `#13171b` | titles, KPI values, header labels |
| `--text/body` | `#454b52` | table cell text, section titles |
| `--text/bodylight` | `#686e74` | subtext, secondary cell lines, placeholder, inactive nav |
| `--text/f3-text/body` | `#1d2329` | select values, chip values, tab labels |
| `--text/success` | `#2d7e24` | savings green (KPI, table savings columns, tooltip "Saved") |
| `--text/error` | `#c70032` | alert red (Total time column values) |
| `--text/foreground/secondary-foreground` | `#00388f` | "Clear all" link button |
| `--data-viz/primary/backgroundp1` | `#009fdb` | AWS Bedrock series |
| `--data-viz/primary/backgroundp2` | `#00388f` | Anthropic series |
| `--data-viz/primary/backgroundp3` | `#00c9ff` | OpenAI series + selected-ribbon cyan |
| `--data-viz/primary/backgroundp4` | `#49eedc` | Self-hosted series |
| (raw) | `#5b3bee` | "Other" series (no token in file) |
| `Box shadow/shadow-xs` | `0 1px 2px rgba(0,0,0,0.05)` (cards) / `0 1px 1px rgba(0,0,0,0.1)` (controls) | KPI cards / inputs, selects, buttons |
| `Shadow-MD` | `0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)` | sankey tooltip |

Recurring type styles (family ATT Aleck Sans):

| Style | Size/LH | Weight | Letter-spacing |
|---|---|---|---|
| Body XS Regular | 12/16 | 400 | -0.36 |
| Body XS Medium | 12/16 | 500 | -0.36 |
| Body SM Regular | 14/20 | 400 | -0.42 (F3 variants -0.4) |
| Body SM Medium | 14/20 | 500 | -0.42 / -0.4 |
| Body SM Bold | 14/20 | 700 | -0.42 |
| Body Base Bold | 16/24 | 700 | -0.48 |
| Heading SM Bold | 24/32 | 700 | -0.72 |
| Heading LG Bold | 36/40 | 700 | -1.08 |

Icon system: AT&T functional icons (att.com `scmsassets/global/icons/svg/...`), rendered at 16px inside controls, 20-24px in headers.

---

## 1. Stats cards — `1:5088` "stats cards" (1480x121)

Purpose: 5-up KPI strip summarizing gateway traffic for the selected window.

Box anatomy
- Row of 5 cards, `gap: 16`, each card `flex: 1 0 0` (equal widths, ~283 each at 1480).
- Card: height 121, `padding: 16`, `border-radius: 16`, `border: 1px solid #dcdfe3`, bg `#ffffff`, shadow `0 1px 2px rgba(0,0,0,0.05)`, content vertically centered, `overflow: clip`.
- Internal column `gap: 8` between value block and subtext row; title and value stacked with 0 gap; title sits in a 21px-high row with 2px horizontal padding; subtext row height 18.

Typography

| Element | Font | Size/LH | Weight | LS | Color |
|---|---|---|---|---|---|
| Title | Aleck Sans Medium | 14/20 | 500 | -0.42 | `#13171b` |
| Value | Aleck Sans Bold | 36/40 (h 42) | 700 | -1.08 | `#13171b` |
| Value unit ("ms" in 735ms) | Aleck Sans Bold | 20/28 | 700 | -0.6 | `#13171b` |
| Neutral subtext | Aleck Sans Regular | 12/16 | 400 | -0.36 | `#686e74` |
| Savings subtext | Aleck Sans Medium | 12/16 | 500 | -0.36 | `#2d7e24` |

Per-card copy (verbatim)

| Card | Title | Value | Subtext |
|---|---|---|---|
| 1 | `Tokens` | `80k` | `20k in ` + `60k out` (two texts, 4px gap, neutral) |
| 2 | `Cost` | `$25` | `Savings    $12 (37%)` (green, whitespace preserved) |
| 3 | `TTFT (p95 latency)` | `735` + `ms` | `Savings    300 ms (37%) ` (green, trailing space in source) |
| 4 | `Requests` | `96` | `Total` (neutral) |
| 5 | `Blocked requests` | `4` | `3 Policy violations` • `1 Token ivalidation` [sic], do not copy — "invalidation" |

- Card 5 separator: 4px circle (ellipse asset), 6px gaps either side.
- Note: alert-red is NOT used on this strip in the source — the Blocked value renders in `#13171b` like the others.

---

## 2. Filter + chips — `1:5581` "filter+chips" (1528x124)

Purpose: search + five scoped dropdown filters with applied-filter chips.

Box anatomy
- Container: bg white, `padding: 24`, column `gap: 16`; inner filters-bar is 1480 wide, `justify-content: space-between`.
- Search input: width 284, height 36 (`px:12, py:8` around 20px line), `border-radius: 8`, `border: 1px solid #dcdfe3`, drop shadow `0 1px 1px rgba(0,0,0,0.1)`, leading 16px search icon, 8px gap. Placeholder `Search identity, modal...` [sic], do not copy — "model".
- Filter cluster: 5 groups, `gap: 20`, each group = label + Select with 8px gap, control height 36.
- Select control: `px:12, py:8`, `border-radius: 8`, `border: 1px solid #dcdfe3`, shadow `0 1px 1px rgba(0,0,0,0.1)`, bg white, trailing 16px chevron-down. Fixed widths: Provider 148, Model 151, Identity 103, Path 103, Status 102.

Typography / colors
- Group label: Aleck Sans Medium 14/20, ls -0.4, `#13171b`. Labels: `Provider`, `Model`, `Identity`, `Path`, `Status`.
- Select value: Aleck Sans Regular 14/20, ls -0.4, `#1d2329`. Values shown: `OpenAI`, `All`, `Private`, `All`, `All`.
- Placeholder text: same face, `#686e74`.

Chip anatomy (applied filter "Badge")
- Pill: bg `#f2fafd`, `border: 1px solid #dcdfe3`, `border-radius: 9999`, `px:8, py:2`, `gap: 4`; height 24 in row context (`gap: 8` between chips).
- Left slot: 16px icon; right slot: 16px close (×) icon (AT&T `close_16`) — the remove affordance.
- Text: Aleck Sans Medium 12/16, ls -0.4. Label prefix span in `#0074b3` (`Provider: `, `Model: `, `Identity: `), value span in `#1d2329` (`OpenAI`, `gpt-4`, `Private`).
- "Clear all": ghost button, transparent bg, height 24, `px:8`, `border-radius: 8`; text Aleck Sans Medium 12/16, `#00388f`.

---

## 3. Requests table — `1:5302` "Frame 427319832" (1480x724)

Purpose: request-level log of gateway traffic with cost/latency savings per request.

Section header (`1:5303`, h 36; table starts at y 52 → 16px gap)
- Left: `Requests (24)` — Aleck Sans Bold 16/24, ls -0.48, `#454b52`, ellipsis overflow.
- Right: `Group by` label (Medium 14/20, ls -0.4, `#13171b`) + Select, width 151, h 36, same select anatomy as section 2, value `None`.
- A hidden alternate title exists in the file: `Company traffic across top 3 AI providers` (hidden layer, with chevron-down_24).

Header row (`1:5313`, h 56)
- Cell: bg `#f8fafb`, `border-bottom: 1px solid #dcdfe3`, `py:8`, `px:12` (first column `px:16`), `gap: 4`, left-aligned, vertically centered.
- Label: ATT Aleck Sans Bold 14, line-height 22.4, ls -0.42, `#13171b`. Each header carries a 16px sort-icon slot (12x12.66 glyph) and a hidden "Alt heading" text (Regular 14, `#686e74`) — both hidden in the rendered design.

Columns in order (x / width)

| # | Header | x | w |
|---|---|---|---|
| 1 | `Time` | 0 | 80 |
| 2 | `Status` | 80 | 67 |
| 3 | `Identity` | 147 | 112 |
| 4 | `Source` | 259 | 120 |
| 5 | `Route` | 379 | 96 |
| 6 | `Model` | 475 | 136 |
| 7 | `Tokens` | 611 | 104 |
| 8 | `Cost` | 715 | 96 |
| 9 | `Cost savings` | 811 | 120 |
| 10 | `TTFT` | 931 | 80 |
| 11 | `TTFT savings` | 1011 | 120 |
| 12 | `Request` | 1131 | 96 |
| 13 | `Response` | 1227 | 96 |
| 14 | `Total time` | 1323 | 104 |
| 15 | `Total time savings time` [sic], do not copy — awkward source copy; treat as "Total time savings" | 1427 | 120 |

Data rows (12 rows, `1:5329` ff., layer name "connectin row" [sic])
- Row: height 56, bg white, `border-bottom: 1px solid #dcdfe3` (the divider system — no vertical rules).
- Single-line cell: `padding: 12`, text Aleck Sans Regular 14/20, ls -0.42, `#454b52`. Cells carry hidden 24px image-placeholder and 16px icon slots (not rendered).
- Two-line cell (Source, Model, Tokens): primary Regular 14/20 `#454b52` + secondary Regular 12/16, ls -0.36, `#686e74`, 4px gap (Model cell uses 2px), vertically centered.
- Savings cells (Cost savings, TTFT savings, Total time savings): BOTH lines `#2d7e24` — primary = absolute saved value (14/20), secondary = percent (12/16). This is the green treatment; weight stays Regular.
- Status cell: pill `gap: 4`, h 24, `border-radius: 16`; dot 8px, `border-radius: 8`, bg `#2d7e24`; text `200` Regular 14/20 `#454b52`. (All 12 rows show green/200 in the source.)
- Total time column: value rendered in `#c70032` (alert red) on every row (e.g. `18s`, `11s`, `15s`).

Sample row 1 (verbatim): `18:34:00` | ●`200` | `jchen@corp` | `Data center`/`Ashburn` | `US West` | `Self-hosted`/`Llama-3-70b` | `2.6k` / `1.5k in   1.1k out` | `$0.0010` | `$0.0003`/`70%` | `671ms` | `125ms`/`16%` | `5.8 KB` | `4.3 KB` | `18s` (red) | `120ms`/`1%`.

Other visible row data (from render): identities `s.okafor@corp`, `m.jones@corp`, `a.smith@corp`, `l.brown@corp`, `k.wilson@corp`, `p.kumar@corp`, `r.tan@corp`, `a.miller@corp`, `b.johnson@corp`, `c.wang@corp`; sources `Edge/Atlanta`, `Cloud/Seattle`, `Hybrid/San Francisco`, `Local/Chicago`, `On-premise/New York`, `Cloud/Austin`, `Edge/Denver`, `Data center/Boston`, `Hybrid/Philadelphia`, `Local/San Diego`; routes `US East`, `US West`, `US Central`, `US South`, `US Northeast`; models `Anthropic/claude-sonnet-4-6`, `OpenAI/gpt-4`, `Google/bard-3`, `Microsoft/azure-ai-7`, `IBM/watson-5`, `Amazon/gpt-3.5-turbo`, `Meta/lerna-8`, `Oracle/dall-e-5`, `Salesforce/chatgpt-v2`, `Tencent/turing-ai-9`.

---

## 4. Traffic-flow Sankey — `1:5149` "Frame 427319242" (1480x566)

Purpose: 4-stage flow of AI spend: Identity → Source → Fabric route → Provider/model.

Card
- bg white, `border: 1px solid #dcdfe3`, `border-radius: 16`, `overflow: clip`. Content inset: 31px left margin (title row at x31 y23, width 1416).

Title row (y 23)
- `Traffic flow` — Aleck Sans Bold 16/24, ls -0.48, `#454b52`.
- Right cluster `gap: 24`: legend (`gap: 16`) + expand button.
- Legend chip: h 24, `gap: 4`; swatch 8px square, `border-radius: 2`; label Regular 14/20, ls -0.42, `#454b52`. Series: `AWS Bedrock` `#009fdb`, `Antropic` [sic], do not copy — "Anthropic" `#00388f`, `OpenAI` `#00c9ff`, `Self-hosted` `#49eedc`, `Other` `#5b3bee`.
- Expand button: 32x32, `border-radius: 8`, `border: 1px solid #dcdfe3`, bg white, shadow `0 1px 1px rgba(0,0,0,0.1)`, 16px minimize-2 icon centered.

Column headers (y 81, relative x within 1417-wide band starting at x31)
- Stage title: Aleck Sans Bold 14/20, ls -0.42, `#13171b`, ALL-CAPS in source; subtitle: Medium 12, ls -0.36, `#13171b`.
- `IDENTIDY` [sic], do not copy — "IDENTITY" / `User/ Agent` at x0; `SOURCE` / `Ingress site` at x467; `FABRIC ROUTE` / `Egress path` at x934; `PROVIDER / MODEL` / `Destination` at x1290.

Node bars (container x31 y133, 1417x400)
- Bar width 16, columns at x-offsets 0, 467, 934, 1400 within the container; each column is a vertical stack with `gap: 16`, total height 400.
- Columns 1-3: all bars `#0074b3` (`--background/info`). Segment heights — col 1: 84, 73, 64, 57, remainder-flex; col 2: flex, flex, 64, 40, 31; col 3: flex, flex, 64, 25, 72.
- Column 4 (providers): `#009fdb` flex, `#00388f` flex, `#00c9ff` 48, `#49eedc` 40, `#5b3bee` 29 — one bar per provider series.

Node labels (12px, ls -0.36, name + value with 4px gap; label blocks start 6-14px right of each bar)
- Default: name Regular `#454b52`, value Medium `#13171b`. Selected-path node: BOTH name and value Medium `#13171b` (e.g. `jchen@corp`, `Data center, Ashburn`, `EU East`, `AWS Bedrock/titan`).
- Identity: `jchen@corp $0.032`, `s.okafor@corp $0.028`, `m.tanaka@corp $0.015`, `a.mueller@corp $0.011`, `Other $0.009`.
- Source: `Data center, Ashburn $0.014`, `Data center, Atlanta $0.012`, `Edge, San Francisco $0.009`, `Data center, Austin $0.008`, `Other $0.052`.
- Fabric route: `US West $0.018`, `EU Central $0.016`, `EU East $0.011`, `US East $0.007`, `Other $0.052`.
- Provider/model: `OpenAI/gpt-4 $0.032`, `Anthropic/claude-3 $0.028`, `AWS Bedrock/titan $0.015`, `Self-hosted/llama-3 $0.006`, `Other $0.052`.

Ribbons
- Flattened image groups in the file (no vector data exposed). Rendered treatment: default ribbons are the node blue at low opacity (pale blue-gray, roughly 8-12% of `#0074b3` over white); the selected path ribbon is solid opaque cyan matching `--data-viz/primary/backgroundp3 #00c9ff` (EU East → AWS Bedrock/titan in the comp). Hovered path also tints its upstream row band `#f2fafd`-ish.

Tooltip (layer `kpi crad hover` [sic] — hover card, `1:5301`, shown at x232 y204)
- Card: bg white, `border: 1px solid #dcdfe3`, `border-radius: 12`, `padding: 12`, column `gap: 12`, shadow `0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)`, `overflow: clip`.
- Row 1 (justify-between, Bold 14/20 ls -0.42): left `Event path` `#13171b`; right group `gap: 16`: `Cost $0.014` `#13171b`, `Saved $0.08` in `#2d7e24` (the green Saved treatment).
- Row 2: four columns, `gap: 24`, 12px text ls -0.36 — label Bold `#13171b` (capitalize) over value Regular `#454b52`: `Identity`/`jchen@corp`, `Source`/`Data center, Ashburn`, `Fabric Route`/`US West`, `Provider/model`/`OpenAI/gpt-4`.

---

## 5. Navigation chrome

### 5a. Left nav — `1:5633` "left nav" (200x1726)

- Panel: bg white, `border-right: 1px solid #dcdfe3`.
- Site selector: height 64, `px:24, py:16`, `gap: 8`, `border-bottom: 1px solid #f3f4f6`. 16px pinpoint icon + `NYC-DC-01` (Bold 16/24, ls -0.48, `#454b52`, ellipsis) + 16px chevron-down.
- Nav items container: `padding: 16`, `gap: 24` between groups; `gap: 16` between items within a group; Governance group uses `gap: 8` between its label and item stack.
- Nav item: full-width, `px:8, py:4` (28px tall), `gap: 8`, `border-radius: 8` (sub-group items use radius 4 in source), 16px icon + label Regular 14/20, ls -0.42.
  - Active state: bg `rgba(186,238,252,0.8)` (`--background/gradient-start`) pill, text `#13171b`.
  - Inactive: transparent, text `#686e74`.
- Group label: `Governance` — Medium 12/16, ls -0.36, `#686e74`, same `px:8, py:4` inset.
- Items (icon → label): home_24 → `AI Fabric` (active); eye_16 → `Insights`; under Governance: check-shield_16 → `Policies`; person-group_24 → `Teams & limits`; apps_16 → `Providers`; key_24 → `Virtual keys`.

### 5b. Main nav — `1:5651` "Main Nav" (1728x64)

- Bar: bg white, `border-bottom: 1px solid #dcdfe3`, `px:24, py:8`, justify-between.
- Left: AT&T "AI Gateway" lockup, 119x36 (AT&T wordmark 9px tall above `AI Gateway` 22.5px tall — export as asset).
- Right cluster `gap: 16`:
  - Andi orb: 40px circle, gradient `linear-gradient(134.57deg, #00c9ff 21.5%, #009fdb 48.7%, #0079b1 86.9%)`, 24px white Andi glyph centered.
  - Bell icon 24px (`bell_24`), `#13171b`-family stroke.
  - Avatar: 32px circle, bg `#f3f4f6`, `border: 1px solid #686e74`, initials `JD` Medium 14/16, ls +0.28, `#454b52`.

### 5c. Inner header — `1:5611` "inner-header" (1528x64)

- Bar: bg white, `border-bottom: 1px solid #dcdfe3`, `px:24, py:8`, justify-between.
- Title: `AI Fabric` — Aleck Sans Bold 24/32, ls -0.72, `#13171b`.
- Right cluster `gap: 24`:
  - `Updated 5m ago` — Regular 12/16, ls -0.36, `#686e74` — followed by a 32px circular icon button (`border-radius: 96`, `padding: 4`) holding a 16px refresh/step-forward icon.
  - Vertical divider: 1x16, `#dcdfe3`.
  - Date-range control: `gap: 6`, `px:6` — 20px calendar-1 icon + `Last 24h` Medium 12/16, ls -0.36, `#454b52` + 8x4 chevron.
  - Segmented toggle (Tabs): track bg `#dcf3fa`, `border-radius: 12`, `padding: 4`; each tab h 29, `px:8, py:4`, `border-radius: 8`, label Medium 14/20, ls -0.4, `#1d2329`. Active tab (`Tokens`): bg `#f8fafb` + drop shadow `0 1px 1.5px rgba(0,0,0,0.1)`. Tabs: `Tokens` (active), `Requests`, `Cost`.

---

## 6. Reference images (screenshot catalog only)

- `1:5663` "image 106": LiteLLM Request Logs screen with the time-range dropdown open (Last Minute → Custom Range), Live Tail toggle, auto-refresh banner, and dense logs table — benchmark reference for the requests-log pattern.
- `1:5664` "image 107": LiteLLM request-detail drawer for a failed `claude-sonnet` call — 403 "Request Failed" banner, Request Details, Metrics, collapsed Cost Breakdown / Request & Response / Metadata sections.
- `1:5665` "image 108": LiteLLM request detail, success case (`gpt-4o-mini`) — expanded Cost Breakdown (input/output/final cost), "Request/Response Data Not Available" config notice, Request & Response with Pretty/JSON toggle.
- `1:11312` "Frame 427319898" (contains images 11-16): long-scroll "AI Visibility Assessment" report concept — executive-summary gap cards ($3.3-4.0k, 23→0, 109ms), findings sections with horizontal bar charts, latency/security breakdowns, and a dark before/after CTA panel ("Some traffic, one switch away").

---

## Source typos ledger (never copy into implementation)

| Where | Source text | Correct |
|---|---|---|
| KPI card 5 subtext | `1 Token ivalidation` | Token invalidation |
| Search placeholder | `Search identity, modal...` | model |
| Sankey col 1 header | `IDENTIDY` | IDENTITY |
| Sankey legend | `Antropic` | Anthropic |
| Table col 15 | `Total time savings time` | Total time savings |
| Layer names | `connectin row`, `kpi crad hover`, `site selectopb`, `nav tem`, `.Table ststus` | (layer names only, cosmetic) |
