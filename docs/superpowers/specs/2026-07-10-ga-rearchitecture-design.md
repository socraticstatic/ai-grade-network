# GA Re-architecture + Popup Hygiene

**Date:** 2026-07-10
**Status:** Approved

## Decisions

1. **Kill the auto-modal.** `NetBondMax_Modal_CustomerDemo` (auto-opens on load, carries the
   Preview/GA pill switcher) is unmounted from `App.tsx`. LMCC ordering flows through the two
   existing entry points only: the Marketplace AWS zone and the Create Connection dropdown's
   "AWS Interconnect – Last Mile" item — both route into the interactive wizard at `/create`.
2. **Flip to GA.** `CURRENT_PHASE` in `src/data/lmccService.ts` becomes `'ga'`: metros
   San Jose (Equinix + CoreSite) + Ashburn, bandwidth 50 Mbps–100 Gbps, GA copy. Sweep
   remaining hardcoded "Preview" copy on LMCC surfaces (wizard screens, AWSPartnerZone,
   LMCCCreateFlow, LMCCStatusPanel, Marketplace card).
3. **Channel/BGP model (open item).** Per the encoded product notes: 2 datacenters per metro,
   2 channels each (4 total), each channel with its own BGP session and /30 subnet. Micah's
   recollection ("two channels make up one BGP") differs — keep the notes' model; revisit
   during the line-by-line GA requirements read.
4. **Popup hygiene.** Remove the tour auto-start in App. DemoBar (bottom role switcher)
   hidden by default behind a `uiSlice.demoBarVisible` flag. The feedback panel (right-edge
   message tab) gains two entries above the feedback types: "Take the product tour" and
   "Show demo role switcher". During test sessions only the Task HUD floats.
5. **Retire `lmcc-r1`.** The pack tested preview behavior (1 Gbps cap) that GA removes; its
   registry line is removed (folder and tests stay as history). The GA study replaces it
   after the revisions read.

## Testing

Unit: GA assertions on `lmccService` (`getAvailableMetros()` = SJ + Ashburn; bandwidth
options span to 100 Gbps); registry still validates. Browser E2E: no popup and no DemoBar
on load; Create dropdown → AWS Interconnect → wizard with GA metros/bandwidth; feedback
panel starts tour and summons DemoBar; Test Lab session shows only the HUD.
