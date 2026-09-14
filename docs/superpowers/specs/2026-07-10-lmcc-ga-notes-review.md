# LMCC GA Notes — Line-by-Line Review & Implementation Implications

**Date:** 2026-07-10 · **Source:** LMCC Design Brief post-preview-launch 07062026 + NBA notes
**Reviewed against:** the app as of commit `7bca899c`

Legend: ✅ already built / aligned · 🔧 change required · 🆕 new build · ⚠️ contradiction or open question

---

## The design challenge (framing section)

The product's one job: make an invisible, self-healing, slightly-stale, cross-company system
feel trustworthy. Implications for us: every status word, wait state, and error is a trust
surface; copy promising real-time certainty is banned (repeated later in Notifications).
🔧 Sweep existing LMCC copy for real-time promises ("is live now", "instantly").

## The three hard problems

**P1 — Tier vs health are two truths.** Tier = the promise bought (Maximum = 4 paths / 2 DCs).
Health = how well the promise is kept right now. One indicator that collapses them is the trap.
🆕 We have status only (dot + text). Build a second, independent **health posture** signal —
`full` / `reduced but healing` / `degraded` — visible beside (never inside) status on list + detail.
Health exists only while Live and never moves status while traffic flows.

**P2 — The key handoff is the anxious centerpiece.** Copy-paste across two portals + an
invisible negotiation. 🔧 Our paste-key flow exists but is demo-grade. GA needs: deliberate
copy control, step-by-step AWS instructions, **bounded wait** (progress with honest language,
no fake precision), **expiry countdown**, and the full error taxonomy (below). The PRD calls
this "your best hours" — P0.

**P3 — Show strength + self-healing without machinery.** Never show devices, datacenters, or
per-path identity (one deliberate exception: the four peering sets, below). 🔧 Our current
`LMCCStatusPanel` VIOLATES this everywhere: it renders datacenters ("Equinix San Jose"),
device ids (MX304-SJ-A), physical ports, and per-path BGP states. Full redesign: replace with
an abstract health representation ("strongest tier; one path is healing itself — no action
needed") + the neutral Peering 1–4 read-only sets.

## Scope

- GA = **Maximum tier, AWS only**. ✅ matches our build focus.
- **Standard = default tier**, routed to the existing NetBond path — this PRD doesn't specify
  it. 🔧 Our resiliency step must make Standard the default selection and fork OUT of the
  LMCC flow when chosen (today Maximum drives the AWS Max flow; the fork copy needs the
  "what each protects against" honesty).
- **High resiliency: absent at GA.** 🔧 Remove/hide any High option in the resiliency step.
- **Azure Maximum previews mid-November** → provider must be a first-class choice from day
  one. ✅ provider is already first-class in list/detail/model. 🔧 Ensure create flow leads
  with provider choice; ⚠️ do NOT show an Azure coming-soon tile (see Multi-cloud).

## Who uses this

- PRD: single full-admin persona at GA, no read-only role.
- ⚠️ **Contradiction with NBA note**: "Should follow NBA RBAC roles for user access."
  Recommendation: keep NBA RBAC (our mock demonstrates it; Test Lab permission-wall studies
  depend on it) and treat the PRD's "full-admin-only" as the LMCC-standalone assumption that
  NBA supersedes. Micah to confirm.
- ✅ The four hats (engineer, architect, finance, security) map cleanly onto our persona library.
- **Ownership check ≠ portal role**: on every key activation the system verifies the signed-in
  account is authorized for the account named in the key. 🆕 Represent this in the paste-key
  flow (the "Wrong account" error) even in the mock.

## In / out of scope

In: both entry directions; full Maximum lifecycle (create, hand off, watch, change bandwidth,
delete); tier fork; ONE customer-facing status; billing at point-of-choice + per-connection +
account overview; last-mile view-only; encrypted-core display; durable activity history.
Out: provider machinery; customer control of L3; Standard/High provisioning; other clouds;
NOC tooling; last-mile ordering; disable-without-delete.
🔧 Deltas: last-mile view (🆕), MACsec indicator (🆕), activity history per connection (🆕),
account billing overview (🔧 extend existing billing surfaces).

## Core journeys

**No separate activate step.** Handing/uploading the key IS the provisioning request; no
paused state after provisioning. ⚠️ Contradicts NBA note "Schedule activation screen … add a
schedule to turn on or activate the connection after it was created" (with validation-first
dependency). These cannot both hold. Options: (a) PRD wins, no scheduling; (b) NBA note wins:
scheduling = choosing WHEN the provisioning request fires (pre-provisioning only), which
doesn't violate "no pause after provisioning". Micah to rule. If (b): 🆕 schedule screen,
gated on validation passing.

**Tier fork.** Standard default → routes out. Maximum → this flow. High absent. 🔧 as above.

**Last-mile (runs alongside, never blocks).** Ordered via existing AT&T process outside the
portal; shown view-only with our own state vocabulary; a connection may go Live before the
last mile is. 🆕 Last-mile block on connection detail: access type (internet/MPLS/Ethernet),
status, "ordered through AT&T, not here". Keep visually separate from tier/health (repeated
in Resiliency section).

**AWS-started (paste key).** Steps: copy key in AWS → sign in → add connection → paste →
system shows key contents for confirmation (where, bandwidth, which account) + billing info
incl. "billing starts at Live" → confirm/submit = provisioning request → authorization check →
key confirmation with AWS → Provisioning → Live when BOTH providers confirm. Billing starts
at Live. 🔧 Our paste flow shows key contents; add billing preview at that moment; wire the
status ladder; end at Live (see status vocabulary).

**Portal-started (generate key).** Choose metro (live list, never hardcoded), bandwidth (per
metro), destination AWS account ID, contract term → billing preview BEFORE commit ("billing
starts at Live, not key creation") → key generated + instructions to upload in AWS → upload
is the provisioning request, NO Activate button → Pending → Provisioning → Live. Identity
check happens on the AWS side in this direction. 🔧 Our wizard has most inputs; needs term
selection in-flow, billing preview placement, and key-handoff screen upgrades (countdown).

**Expiry.** Pending key never provisioned → **Expired at 7 days**; never auto-deleted from the
customer's environment; carries no config/traffic/billing. Customer can still delete the card
(NBA note). 🆕 Expired status + countdown on key handoff + deletable expired cards.

**Change bandwidth — asymmetric by design.**
- Upgrade: penalty-free, availability check, no outage, show new rate, confirm.
- Downgrade: **change fee** — surface fee + new rate BEFORE confirm, explicit acknowledgment.
- "Do not present up and down as one neutral control." 🆕 Direction-aware bandwidth-change
  flow (today bandwidth editing is a neutral control).
- ⚠️ Interconnect Migration: some changes rebuild the connection on another interconnect
  (AWS still reviewing). Treat "could not complete provisioning seamlessly" as a REAL state →
  maps to Needs attention with plain next steps. Design happy path now.

**Delete — a commercial event.** Contract signed at provisioning (M2M/12/24/36). Early delete
= early-termination charge, amount from the billing system of record (portal displays, never
calculates). Explicit confirmation showing consequence; then Deleting → Deleted; recurring
billing ends at delete; framing = "ends your service and may trigger a charge".
🔧 Our store currently BLOCKS deleting an Active connection ("deactivate first") — that guard
is wrong for LMCC GA; delete of Live must be allowed with the commercial confirmation.
🆕 Delete confirmation surface with penalty amount; Deleting/Deleted states.

**No disable at GA.** No pause/disable control, no Disabled state (customer OR operations).
✅ nothing to build; 🔧 verify no disable affordance exists on LMCC connections.

## Screens table — gap check

| Screen | State in app | Gap |
|---|---|---|
| Connections list | ✅ exists | 🔧 add per-connection: provider, tier, health posture, last change, **cost at top level** (NBA note); status never hidden in any view mode |
| Connection detail | ✅ exists (10 tabs) | 🔧 status in plain words; tier + "what it protects against"; health posture; MACsec indicator; term + remaining commitment + renewal date; billing summary + start date; read-only 4 peering sets; last-mile status; activity history; actions = change bandwidth, delete; **no internal identifiers** |
| Resiliency tier choice | 🔧 exists | Standard default + honest protection copy; High removed |
| Create flow (Maximum) | 🔧 exists | term picker, live metro list, billing preview, review, generate key |
| Paste-key flow | 🔧 exists | key readout + billing preview + confirm |
| Key handoff | 🔧 exists | copy control, AWS step-by-step, waiting state, **expiry countdown** |
| Bandwidth change | 🆕 | current vs new, availability, billing delta, direction-aware |
| Last-mile view | 🆕 | type, status, "ordered via AT&T" signal, view-only |
| Billing overview | 🔧 partial | account-level plans/rates/terms/renewals/start dates, totals, link-outs; reads system of record |
| Delete confirmation | 🆕 | consequence statement, billing-stops, explicit confirm |
| Needs-attention detail | 🆕 | plain-language what-went-wrong + what-to-do-next |

## Read-only technical details — the four peering sets

- Each of the four paths has its OWN VLAN, IP subnet, and **BGP session**. Four peering
  configurations, not one. **This resolves the open BGP question: it is per-path BGP (4
  sessions), not two-channels-per-BGP.**
- This is the ONE place the four-path structure is deliberately exposed.
- Show per set: VLAN ID, IPv4 subnet+prefix, IPv6 if present, MTU, BGP ASN both sides, peer
  IP. Label neutrally: **Peering 1–4**. Omit: MD5 password, channel identifiers, device
  identity, anything tying a set to a physical device.
- ⚠️ **Contradiction with the subnet-edit feature we just shipped**: PRD is explicit that the
  customer never sets IP addressing and these are read-only ("the settings for your side").
  Micah's instruction earlier today: "Subnets are editable." One must win. Recommendation:
  revert to read-only per PRD unless the editable requirement came from a newer stakeholder
  decision.

## The single status

Vocabulary: **Pending · Provisioning · Live · Needs attention · Expired · Deleting · Deleted**.
"Live is our only word… do not introduce active or provisioning as competing labels."
- ⚠️ Internal contradiction: the NBA-notes section says "Pending, Provisioning, then
  **active**… Billing starts at Active" and cites AWS's requested/pending/active. The PRD's
  emphatic NOTE says Live only. Recommendation: **Live** (the PRD note is deliberate;
  the NBA passage reads like an unedited earlier draft). Micah to confirm.
- 🔧 Major: our connections use `Active`/`Inactive`/etc. LMCC connections need the GA
  vocabulary end to end (list, cards, detail, topology, monitoring). Mapping layer from
  internal provisioning states → the 7 customer words.

**Worked example (derivation rules):**
- Provisioning with 3/4 paths ready → still Provisioning (Live requires BOTH providers'
  confirmation). NBA note "if three channels is up the connection is considered up" applies
  to the OPERATING state (Live with reduced health), not the provisioning gate.
- Live, then one path drops → **status stays Live**, health → reduced-but-healing, NO alarm,
  "no action needed". Self-healing = Feature redrive (AWS+AT&T renegotiate the down channel).
- One line: status = can the customer use it; health = how well we protect it. Independent.
🆕 This derivation becomes our status engine (pure function: paths+confirmations → status,
health). Perfect target for Test Lab comprehension tasks later.

## Lifecycle (two tracks)

Status track + health track (health exists only while Live). Design must make them FEEL
separate. 🆕 Two-track presentation on detail (and compressed on list rows).

## Error taxonomy (paste-key)

| Error | Treatment |
|---|---|
| Invalid key (malformed) | Inline field error, retry copy from AWS |
| Key not recognized (AWS keyValid:false) | **Full-screen**; regenerate in AWS; **security event logged** |
| Already-used key | Full-screen; link to connections list + create-new option |
| Key expired (>7 days) | Full-screen; show expiry date if available; regenerate |
| Wrong account | Full-screen; **never display the account ID from the key** (security) |

🆕 All five must exist as real, reachable states in the mock (Test Lab bad-input tasks write
themselves). The security-event log entries feed activity history/audit.

## How we talk about resiliency

- Maximum: 4 independent paths across 2 DCs in-metro; survives paths, devices, a datacenter.
- Say what the tier protects against in customer terms, **never path counts** in tier copy.
- Tier ≠ health; show both. Health words: full / reduced but healing / degraded.
- **Scope the promise:** tier covers the AT&T↔AWS core only, NOT the last mile; single-link
  last mile is a weak point the tier doesn't address. Keep last-mile visually separate from
  tier/health; never merge into "everything is resilient". 🔧 copy + layout rule.

## Encryption / Billing / Notifications / History

- **MACsec** on by default, cannot be disabled, read-only assurance, scope = interconnect
  only, must not read as end-to-end. 🆕 detail-page indicator.
- **Billing:** system of record elsewhere; three surfaces (preview at choice; per-connection
  summary; account overview with link-outs). Portal never calculates penalties/fees — it
  displays amounts from the record. 🔧 extend. NBA notes add: **term discount + volume
  discount must be applied for accuracy** in displayed pricing; consider a ledger line-item
  that subtracts from total. Open question (theirs): how deep billing can go in NBA.
- **Notifications:** both providers will notify; never contradict AWS. Notify on: Live,
  needs-attention, bandwidth change finished/failed, expiring, delete complete. 🔧 wire to
  existing in-app notification slice. Copy must not promise real-time certainty (status can lag).
- **Activity history:** durable, timestamped, per-connection lifecycle record: created, Live,
  bandwidth changed, expired, deleted — **with the acting admin**. "A toast is not a record."
  🆕 per-connection activity tab fed by real store events.

## Multi-cloud frame

Provider first-class everywhere (✅). Azure gets its own provisioning flow later; list/status/
health/resiliency/billing/IA must not need rebuilding (✅ our architecture holds). Do NOT
design Azure screens; do NOT show a coming-soon tile. 🔧 confirm no Azure teaser exists.

## Craft priority

P0: status+health system, key handoff. P1: list, detail, create flow. P2: billing overview,
last-mile view, analytics. → This ordering drives the implementation phases below.

## Appendix A deltas worth calling out

- **Bandwidth tiers: 1, 2, 5, 10, 20, 50, 100 Gbps** — 🔧 our GA config has **25**, PRD says
  **20**. One-line fix in `lmccService`.
- Contract terms M2M/12/24/36 with different discounts ✅ (discount display 🔧 per NBA note).
- Inputs are business choices only (metro, tier, bandwidth, term, account) ✅ wizard aligns.
- One logical connection over four paths, not four resources ✅ model aligns.
- Metro menu never hardcoded — mock draws from the data module; note for prod API.
- Deleting tears down everything underneath automatically ✅ messaging point.

## NBA-notes-only items (not in the PRD body)

1. "Status should never be hidden" — audit all view modes (mini cards, list, topology).
2. Top level of connection shows: location, bandwidth, **cost** — add cost to cards/rows.
3. Rename Cloud Router → Connection Hub ✅ done previously.
4. **Charts:** bits in/out, draw-box zoom in/out, cumulative level retained — PerformanceChart work.
5. **Schedule activation** — ⚠️ contradiction with "no activate step" (see Core journeys).
6. **Creation workflow:** replace stepper icons with the live connection diagram (adding a
   cloud adds a leaf; VNFs are leafs too) — evolve our "You're building" strip into the
   stepper itself.
7. **Hubs:** "create a new hub or use existing… existing-hub option for cloud-to-cloud…
   technology-type restriction (can't combine internet with VPN — two route tables)" —
   ⚠️ **Direct contradiction with this morning's directive** (hub invisible, auto-grouped by
   location, never shown in the wizard). One model must win; the tech-type restriction is
   new either way (hub composition rule).
8. Visual designer: high-level view for complex connections + drill-in; card not active until
   BGP up via API; health display for channel-down-but-connection-up (matches health model).
9. Delete "not different than NBA" ✅ consistency requirement.
10. Term at connection level must align with NBA ✅/🔧 surface term on detail.

## Contradictions — RULED 2026-07-10 (Micah)

1. **Hub model → HYBRID**: hubs auto-derive from connection location AND technology type
   (internet and VPN connections never share a hub — two route tables). No hub step in any
   wizard. Rename only on the Connection Hub details page.
2. **Status word → LIVE** (PRD wins; never "active" for LMCC connections).
3. **Subnets → READ-ONLY** (revert today's subnet-edit feature; ships as the four read-only
   Peering 1–4 sets in Phase 3).
4. **Schedule activation → DROPPED** (PRD wins; no activate step, no scheduling screen).
5. **RBAC → NBA RBAC stands** (NBA note supersedes the PRD's full-admin-only assumption).

## Implementation phases (once rulings land)

- **Phase 1 — Status & health engine (P0):** GA status vocabulary + mapping, health posture
  model, two-track UI on list/detail, worked-example derivation as a pure tested function,
  bandwidth tier fix (20 for 25), no-real-time-certainty copy sweep.
- **Phase 2 — Key handoff centerpiece (P0):** handoff screen (copy control, AWS steps,
  countdown, bounded wait), paste flow (readout + billing preview), all five error states,
  Expired lifecycle, security-event logging into activity history.
- **Phase 3 — Detail page GA (P1):** four peering sets (read-only pending ruling), MACsec,
  term/renewal, per-connection billing summary, last-mile block, activity history tab,
  needs-attention detail, LMCCStatusPanel machinery removal.
- **Phase 4 — Commercial flows (P1):** direction-aware bandwidth change (+ migration failure
  state), delete-as-commercial-event, notifications wiring.
- **Phase 5 — List + create + fork polish (P1):** list columns (provider/tier/health/cost/
  last change), tier fork with Standard default, term in create flow, stepper-as-diagram.
- **Phase 6 — P2 surfaces:** billing overview with discounts, charts (bits in/out, box zoom,
  cumulative), visual-designer high-level/drill-in.
- **Phase 7 — Test Lab GA study:** author the LMCC GA rounds against all of the above
  (status/health comprehension, key-handoff error recovery, delete-consequence comprehension).

---

## Compliance re-audit — 2026-07-11 (post Phase 7, commit f503b826)

Every line re-checked against the running build. Result: **compliant**, with one item
deliberately held for a ruling.

**Verified compliant (spot-checked in browser + code):** two-track status/health engine
(11 tests); Live vocabulary on cards, flat list, grouped tables, topology, detail, toasts;
derived Expired on every list surface; machinery-free detail (no devices/DCs/ports; Peering
1–4 the sole four-path exposure, read-only, no MD5); key handoff (copy control, countdown,
7-day expiry); all five paste-key error states (wrong-account never echoes the id;
not-recognized logs a security event); billing preview at both choice moments with
"billing starts at Live"; direction-aware bandwidth change (downgrade fee + ack; ≥100G
migration notice + reachable failure); delete as commercial event (termination charge
pre-confirm, Deleting→Deleted, Expired cards deletable); last-mile view-only block kept
visually separate from tier/health; MACsec indicator scoped to the interconnect; durable
activity history with acting admin; account billing overview with term+volume discount
ledger and Business Center link-out; tiers 1/2/5/10/20/50/100; High tier absent; Standard
default in the wizard; metro list from the data module; hybrid hub auto-grouping; NBA RBAC;
cost/health/last-change at list level; status visible in every view mode; charts (bits
in/out, box zoom, cumulative); designer high-level/drill-in (pre-existing); no real-time-
certainty copy; Test Lab GA study live (LMCC-GA1 / LMCC-GA1B).

**Gaps found by this audit and closed same-day (f503b826):**
1. Disable affordances on LMCC — card pill toggles and hub-row Activate/Deactivate. Removed.
2. Notifications unwired — Live / needs-attention / bandwidth complete / key-expiry /
   delete-complete now feed the in-app notification slice.
3. Topology view still said Active/Inactive for LMCC. Now Live + derived Expired.
4. Marketplace carried Azure "Q1 2027" + GCP/Oracle roadmap LMCC tiles — the brief bans
   provider teasers. Removed (single revert if storytelling wants them back).
5. Update toast leaked "now Active/Inactive" for LMCC. Now Live / Needs attention.

**Open — needs Micah's ruling:** NBA note 6, stepper-as-diagram (replace wizard step icons
with the live connection diagram). Conflicts with the previously approved clickable stepper;
not building either way without a call.

**Noted, judged compliant:** wizard order is type → provider (provider first-class at step
2 — the standing NetBond pattern); health label "Reduced — healing" vs the brief's
"reduced but healing" (same meaning); Azure's provider-side tier NAME "High Resiliency"
remains in a data map as Azure's own naming — the High tier itself is not offered.

## Second-pass re-audit — 2026-07-11 (commit d7d7f5f8)

Fresh pass over every line, targeting surfaces the first audit accepted without evidence.

**Four more gaps found and closed:**
1. The network designer's AWS Max template exposed device + site identity
   (MX304-SV1-A … MX304-SV5-B) — renamed to neutral Path 1–4.
2. The detail page never said what Maximum protects against; added customer-terms copy
   with the scoped promise ("Covers the AT&T–AWS core, not the last mile").
3. Mobile connection detail rendered raw Active/Inactive for LMCC — now GA vocabulary
   (its pause/activate toggle was already AWS-gated).
4. Mixed-fleet status filter said only Active/Inactive — labels now read
   "Active / Live" and "Inactive / Needs attention".

**Re-verified with evidence this pass:** all five paste-key error states wired; zero
real-time-promise copy (including the new notifications); term picker + billing preview
present in the generate-key direction; upgrade shows availability-confirmed copy; no
machinery on any LMCC detail tab (Links / Policies / API walked in-browser); flat grid
view delegates to the compliant cards; "3/4 paths active" readouts are the sanctioned
health exposure, not tier copy (tier copy carries no counts).

**Unchanged open item:** stepper-as-diagram (NBA note 6) — awaiting Micah's ruling.
