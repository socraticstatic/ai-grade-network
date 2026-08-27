# Next session: complete the Aleck Sans sweep (boards 04-08, 10, 11)

> **READ `METHOD.md` FIRST.** It records why these boards are
> high-fidelity: every pixel is a transcription of the running app, never a
> generated or re-composed design. A later session degraded quality by
> re-deriving geometry. Do not repeat it.


**Auth state (2026-08-26):** figma + html-to-design tokens are short-lived and
WILL show "needs authentication" again. Do not ask Micah to re-auth. Recipe:
osascript → open Terminal.app → `claude` → type `/mcp` → select server →
Authenticate (OAuth completes silently against the logged-in browser). Verify
with `claude mcp list`. A session started before re-auth cannot load the tools.

Both MCP servers registered in the user's Claude config:

- `figma` → https://mcp.figma.com/mcp (remote, OAuth'd)
- `html-to-design` → https://mcp.to.design (PRO; `import-html`, `import-url`)

Target file: `GMSruRYGS5uyQLRBk2ADMB` ("AI-grade Network — NaaS Mockups",
Drafts, page "NaaS — 1440 Mockups").

---

## Session 2026-08-26 — what was completed

### Phase A: Layer renames — DONE

All 13 active boards renamed from h2d `div.*/span.*` CSS-class layer names to
human-readable names. 2,524 total layers renamed.

Hash verification (SHA-256, before vs after, 2x PNG exports):

| Board | Match |
|---|---|
| 01 — Discover entry | PASS |
| 02 — Meridian advisor | PASS |
| 03 — NaaS Home | PASS |
| 04 — Connect · Fabric overview | PASS |
| 05 — Connect · Fabric drill | PASS |
| 06 — Connect · Estate map | PASS |
| 07 — Connect · Path choice | PASS |
| 08 — Connect · Provision wizard | PASS |
| 09 — Govern | PASS |
| 10 — Observe · Sankey | PASS |
| 11 — Cost | PASS |
| 13 — Components | PASS |
| 14 — Advisor · Tiered offers | PASS (674px/0.01% delta = pre-existing exchange icon that was absent in before-export now renders; matches frozen capture; not a rename artifact) |

Zero layout shifts across all 13 boards. Renames are metadata-only — confirmed.

### Phase B: Aleck Sans audit — DONE; sweep blocked (see precondition)

Full font audit of all 16 boards:

**100% ATT Aleck Sans (9 boards — nothing to do):**
00 — Cover, 00a — Thumbnail, 01 — Discover entry, 02 — Meridian advisor,
03 — NaaS Home, 09 — Govern, 12 — Foundation, 13 — Components,
14 — Advisor · Tiered offers.

**Non-Aleck text found (7 boards, all Inter / Regular):**

| Board | Count | What |
|---|---|---|
| 04 — Connect · Fabric overview | 7 | "NetBond", "DX" connection badge labels |
| 05 — Connect · Fabric drill | 7 | Same — "NetBond", "DX" |
| 06 — Connect · Estate map | 7 | Same — "NetBond", "DX" |
| 07 — Connect · Path choice | 7 | Same — "NetBond", "DX" |
| 08 — Connect · Provision wizard | 14 | "NetBond", "DX" + 7 more (some Inter / Bold) |
| 10 — Observe · Sankey | 16 | Sankey node labels: "2,840 branches ▸", "AWS us-east-1", etc. |
| 11 — Cost | 3 | Cost rate callouts: "$1.4k/d", "$0.9k/d", "$0.5k/d" |

**Total: 61 Inter segments across 7 boards.**

Board 04 pilot node IDs and pre-swap bounds (size/weight unchanged for swap):

| ID | chars | size | x | y | w | h |
|---|---|---|---|---|---|---|
| 2:1154 | NetBond | 11.5 | 604 | 26 | 48 | 14 |
| 2:1157 | DX | 11.5 | 620 | 86 | 16 | 14 |
| 2:1160 | NetBond | 11.5 | 604 | 146 | 48 | 14 |
| 2:1165 | DX | 11.5 | 620 | 266 | 16 | 14 |
| 2:1168 | NetBond | 11.5 | 604 | 325 | 48 | 14 |
| 2:1171 | NetBond | 11.5 | 604 | 385 | 48 | 14 |
| 2:1174 | NetBond | 11.5 | 604 | 445 | 48 | 14 |

Before-export for board 04 pilot saved at:
`/tmp/claude-501/font-pilot/board04-before.png` (451,227 bytes, valid PNG).

### FigmaAgent / loadFontAsync gap

FigmaAgent (new instance, port 44950/44960) DOES have ATT Aleck Sans in its
`font-files` endpoint (46 Aleck family entries confirmed). The block is that
Figma Desktop built its plugin font cache at launch time; `loadFontAsync` and
`listAvailableFontsAsync` both use that stale cache — ATT Aleck Sans is absent.
fsType=0x0008 (Editable) — not a licensing restriction.

Existing nodes in the .fig file already carry ATT Aleck Sans correctly (set
during h2d import). This session confirmed board 01: 76 text nodes, 187
segments, 100% ATT Aleck Sans. The gap only blocks NEW font assignments via the
plugin API.

---

## Precondition for next session

**Micah restarts Figma Desktop whenever convenient** (not now, not on command
— at his own pace). At next restart the new FigmaAgent serves ATT Aleck Sans
on first connection. `loadFontAsync({ family: 'ATT Aleck Sans', style:
'Regular' })` will succeed.

---

## Next session execution plan

Execute in order, validating each step:

1. **Validate font loads** — call `figma.loadFontAsync({ family: 'ATT Aleck
   Sans', style: 'Regular' })` before touching any board. If it fails, STOP:
   the precondition (Figma Desktop restart) has not been met.

2. **Board 04 pilot swap** (per pixel-diff gate):
   - Before-export already at `/tmp/claude-501/font-pilot/board04-before.png`.
     If that file is gone, re-export node `2:957` at 2x first.
   - Swap 7 Inter nodes (IDs above) to ATT Aleck Sans Regular, size unchanged.
   - Record before/after bounds per node; flag any w/h delta.
   - Export board 04 after (node `2:957`, 2x).
   - Diff after vs frozen capture at
     `docs/figma-handoff/captures/04-connect-fabric/04-connect-fabric@2x.png`.
   - Also diff before vs after — must be near-zero outside the badge areas.
   - Save before/after crops of NetBond/DX badges to
     `/tmp/claude-501/font-pilot/`.
   - STOP and report numbers. Micah reviews before boards 05-11.

3. **Boards 05-08, 10, 11** — same pattern per board: export, swap, diff,
   report. All Inter node IDs to discover fresh (audit data above gives counts;
   re-run the per-board findAll query at the start of each board's pass).

4. **One-command pipeline** — step 5 from original plan: extend
   `scripts/figma-handoff/measure.mjs` with a `--publish` flag.

5. **Live sync** — step 6: CI hook for drift-fix re-publish.

---

## Standing constraints (carry forward)

**HARD CONSTRAINT (Micah, 2026-08-26): the 16 boards are good.** Refine in
place only. Never re-import, regenerate, delete, or reposition a board.

**Pixel-diff gate:** No bulk canvas write without one-board pilot + pixel-diff
vs captures + Micah's explicit go. Before-export must be saved before any swap
begins. Hashes must be recorded. Direction: improvement or hold.

**RENDER verify:** Every canvas change verified by export (PNG hash), never by
geometry alone.

**Instance swaps (step 2 from original plan): PERMANENTLY RETIRED.** The swap
run on 2026-08-26 broke pixel-matched layouts and was reverted from version
history. Do not re-run under any circumstances without a one-board pilot,
pixel-diff, and explicit go from Micah.
