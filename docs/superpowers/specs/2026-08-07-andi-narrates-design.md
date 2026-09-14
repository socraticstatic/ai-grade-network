# ANDI Narrates (Phase 4) - Design

**Date:** 2026-08-07
**Status:** Executing under the standing approval of the conversational-cloud-connect design (Phase 4 section); scope held to that section's sentence: "ANDI's intent brain maps utterances to spine navigation and wizard answers, and speaks the phase-1 verdict sentences."

## Problem

ANDI answers grounded questions and runs typed engine intents, but it cannot take you anywhere: "show me the estate" falls through to the honest fallback, and "connect us-west-2" is not a thing it understands. The spine's verdict sentences exist but ANDI never speaks them.

## Design

Two additions to the existing brain, both pure and grounded - no generation, no new dependencies.

1. **Spine navigation, spoken in verdicts.** A new pure module `andiSpine.ts` matches navigation utterances to spine destinations and answers with THE VERDICT for that screen as the response text, plus one navigate action:
   - estate/discover phrases → text = `discoverVerdict(cc.fabricModel())`, action → `/discover`
   - fabric/connections phrases → text = `connectVerdict(cc.fabricModel())`, action → `/naas/connect`
   - traffic/observe phrases → text = `buildVerdict(cc)` (the Observe verdict), action → `/naas/observe`
   - savings/cost phrases → text reuses the Observe verdict's savings framing, action → `/naas/cost`
   It slots into `andiAnswer` after typed intents and before the AI/engine answer steps (navigation phrasing never collides with `parseIntent`'s cap/attach/steer grammar).

2. **Wizard answers.** "connect <region> [with dual paths]" resolves the region against `cc.fabricModel()` (by regionId or name, case-insensitive). Attached regions answer with the connect verdict ("already on the fabric"). Public regions answer with a navigate action to `/naas/connect?provision=<regionId>&dual=<0|1>`; ConnectPage reads those params on mount, selects the region, opens the ProvisionWizard, and preselects Dual resiliency when `dual=1` (new optional `initialResilient` prop on ProvisionWizard, default false). ANDI drafts; the human walks the drawn wizard and confirms - consistent with the brain's "Andi drafts, the human commits" rule.

## Error handling

- Unknown region in a connect utterance: honest text naming the regions that ARE public, no action.
- Empty estate: the verdict selectors already return sentences for every state; ANDI speaks them unchanged.

## Testing

- `andiSpine.test.ts`: phrase→destination table, verdict text equality against the selectors, region resolution incl. unknown/attached/dual variants.
- ConnectPage test: `?provision=usw2&dual=1` opens the wizard for usw2 with Dual preselected.
- e2e (`e2e/andi-narrates.spec.ts`): open ANDI, ask "connect us-west-2 with dual paths", click the action, wizard opens preselected, confirm, fabric edge flips private.

## Out of scope

- Free-text generation, LLM calls, multi-turn dialogue state.
- Driving the DeployManagedVpcWizard (provision covers the demo beat).
- Voice.
