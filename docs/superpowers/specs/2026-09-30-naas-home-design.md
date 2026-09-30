# NaaS home: the whole network at a glance, by persona

Date: 2026-09-30. Status: approved in conversation; this spec awaits Micah's review.

## Why

Micah: "the NaaS home page should be a high level at a glance view of it all, not the infographic for connect."

Today the **NaaS** rail button lands on Connect ("Your network": four summary tiles over the full network map). The old home screen `s0` still exists but no link reaches it, and it runs past the fold.

## Who it is for

Every persona (Micah's pick). It is one page. The Persona setting changes what the top band says, not just the order of things.

## What a person sees (1440 x 900, no scroll, light and dark)

1. **Title row.**
   - "Good morning, Network Eng". The greeting follows the one clock in Chicago time: "Good morning" before 12:00, "Good afternoon" before 17:00, then "Good evening".
   - Role chips (Architect, Network Eng, Security, FinOps & SRE, Executive), bound to `s.persona`, the same setting the rail's Persona select and Insights > Your actions use.
   - The Since select, as in Observe's title row.
   - Under the title, one line that is the same for every role: the Observe head ("13 findings open. $41,500/mo potential savings."), then "1 Sev 1 open now." from the ops facts. With no Sev 1 open, that clause is left out.

2. **The persona band.** Left about 60%, right about 40%. Both are bare sections with a left rule, like Your actions, never cards or scroll boxes.
   - **Andi's briefing.** The same text `briefingFor(role, facts)` builds for Insights > Monthly briefing, titled "Andi's briefing". Nothing sends from here.
   - **Waiting on you.** The first three rows of that role's Your actions (`roleActAll`): head, recommendation, state, "Do it · Coming soon" (disabled), and Accept and Defer, which work exactly as they do on Your actions. Then "All N in Your actions ›".
   - Changing the role changes both halves.

3. **The five-area strip**, the same for every role. Each tile shows its figure and sub-line from the page it opens and ends in that page's door. Tiles are never recomputed here.
   - Discover: sites and clouds (`invStats` s, c), plus the "new · 30 days" pill when present. Opens Discover > Estate.
   - Connect, Observe, Govern, Cost: the existing `rollup` tiles, as they read on Connect today: "5 of 7 regions · still ride the public internet · Attach the 5 regions", "1 of 2 connections · degraded", "166 · policy violations across 7 policies", "$41,500/mo · on the table across 3 findings". Their doors are the same.

4. **Now.**
   - Up to three open problems from Health (`problemRows`): the state's shape and word (Down square, Over SLO, At risk), "where · thing", what, age, and Trace (opens Paths on that problem).
   - After the rows: "+N more in Health ›" when there are more; "Nothing is down or over SLO." when there are none.

## Empty and small estates

- Words, never "0", "$0" or "0 of 0". The rollup tiles already read "Nothing connected yet", "No telemetry yet" and "No policies yet" on Empty.
- On Empty, the persona band shows the one step to take instead: "Add a source to see your network". It opens Discover > Sources and Add a source. Andi's briefing is left out.
- On Small, every band renders with its own figures. No band claims traffic "on AT&T" when nothing is attached.

## Routing

- The **NaaS** rail button goes to the home (`s0`). The brand dropdown is unchanged. `railCur` lights "NaaS" there.
- Connect keeps its network map. Its four summary tiles move to the home (Micah approved the move), and Connect's title row keeps its own verdict and Next.
- Every door leaves the home for its page. Nothing opens in an overlay on the home.

## Where the numbers come from

All are existing `vals` fields, read, never recomputed:

- `observeHead`, exposed to the home as `homeHead`
- `opsFacts.sev1`
- `briefText` for the role
- `roleActAll`
- `invStats`
- the "new" pill
- `rollup`
- `problemRows`

The home adds only its layout and a greeting.

## Out of scope

- New figures, charts or a mini map.
- Sending the briefing.
- A per-role layout.
- Rebuilding Your actions from the stakeholder's reference file (still owed, D-10).

## Tests

1. On all five estates and for all five roles, every home figure equals its source:
   - the strip equals `rollup` and `invStats`;
   - the head equals the Observe head;
   - the briefing equals Monthly briefing's `briefText`;
   - Waiting on you equals the first three of `roleActAll`;
   - Now equals the first three of `problemRows`.
2. The role chips set `s.persona`. Accept and Defer on the home move the finding's life, as on Your actions.
3. Empty reads its one step and no zeros; Small reads no "on AT&T" claim.
4. The NaaS rail button lands on the home, and Connect no longer draws the four tiles.
5. `node scripts/fold.mjs` (width, copy and height checks, both themes) is 0 FAIL, and the home is included.
6. `scripts/demo-walk.mjs` gains beat 0: the home on Growing as Network Eng. It asserts the head, the briefing, three waiting rows, five tiles and the eastus problem, and it asserts that switching the role to Executive changes the briefing.

## Constraints

- 1440 x 900 with no page scroll either way.
- No button within 10px of a card edge.
- Lists are the page, never boxed.
- Theme tokens only.
- No em dashes, no codes (ER, DX, EQX), "the AT&T network", "Andi".
- New state keys go in `defaults()` and the markup constructor.
- No `sc-for` inside svg, table or select.
- Bound `disabled`.
