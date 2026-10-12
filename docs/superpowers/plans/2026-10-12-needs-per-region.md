# Needs per region: one kind of choice, made where it applies

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In both journeys, tags stop being a choice and intent becomes the only choice, asked per region inside the cloud node in sentence language, with one explicit "apply the same to the other region" toggle and a loop over regions.

**Architecture:** `W.INTENT_SENTENCE` (naas-ways.js) carries the stems and verbs both journeys speak. Portal: answers live in `s.intents[regionKey]` (shared with Recommended), the Needs beat renders the four questions under the picked region in the cloud node, `jCopy` copies answers to regions without any, Request loops to the next region. Storefront: the Tag beat goes, tags are read-only on Found, intent is per region with the same toggle, the deck reads the found tags.

**Spec:** Micah, 2026-10-12 18:23 ("the tags and the security options are separate, but should they be together? ... they apply to both us east and westeurope ... better, simpler selection language ... should they be applied as a whole to what was found on azure?") and the reply that followed.

## Review Focus
1. A cloud with one region: no copy toggle, no "Next" loop; Request ends on Open Cloud discovery. (Task 1)
2. Copy never overwrites a region the user already answered. (Task 1)
3. Recommended for a region reads the same answers the journey wrote for it, and the request record carries them. (Task 1)
4. Storefront: Protect's deck is unchanged for the demo estate once the Tag beat is gone (suggested tags were already the fallback). (Task 2)
5. Storefront: the Recommend beat ranks per region; two regions with different answers get different top picks. (Task 2)

### Task 1: the portal journey
Create `tests/portal-needs.test.mjs`. Modify `naas-ways.js` (INTENT_SENTENCE), `naas-portal-journey.js` (beat label Needs, lineOf "What does East US need?"), `naas-portal-app.js` (intents store, needs, copy, loop; Recommended reads intents), `portal.dc.html` (questions in the cloud node, toggle, the old block gone). Fold, frames, zip, deploy.

### Task 2: the storefront journey
Create `tests/journey-needs.test.mjs`. Modify `naas-journey.js` (BEATS without tag), `naas-app.js` (jIntents per region, copy, read-only tags on Found, Recommend per picked region, loop), `NaaS Storefront.dc.html` (Tag beat markup out, questions in the cloud node), the tests that pin ten beats. Fold, frames, deploy.
