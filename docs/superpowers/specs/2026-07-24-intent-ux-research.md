# Intent-Based UX Research (NaaS orchestration + AI gateways)

Compiled 2026-07-24 from live web research. Companion to
2026-07-24-intent-inventory.md; feeds the intent-experience design doc.

## The 8 patterns worth stealing
1. Staged workspace, gated commit (Juniper Apstra): edits accumulate in a
   staged blueprint; an Uncommitted view diffs each change; Commit is
   disabled until validation passes and demands a named revision
   (Time Voyager rollback labels).
2. Change set vs LIVE with a pre-verified ready state (AWS Cloud WAN): the
   system compiles the declared policy into a concrete change list,
   shows previous/new per change, and signals it verified the set before
   offering Execute. Separate the intent from the moves it implies.
3. Dynamic groups as the nouns of intent (Aviatrix SmartGroups, Azure VNM
   network groups): tag-based membership keeps intent true as inventory
   changes. (We have groups + tags already.)
4. Watch-before-enforce (Aviatrix DCF): a committed rule can run log-only,
   showing what it WOULD have done against real traffic before the
   enforcement toggle. Enforcement is separate from existence.
5. Constraints as flow nodes with explicit failure edges (Cloudflare AI
   Gateway dynamic routing): a budget is not an alert, it is a routing
   branch the user wired ("when exceeded -> fallback model").
6. The review page emits the code (Equinix Fabric): before Submit, the
   wizard offers the Terraform/API equivalent of the configured intent.
7. Drift as an object state with a repair verb (Nokia NSP: audit ->
   misaligned -> Synchronize; Apstra IBA anomalies): every intent carries
   aligned/misaligned, repair is one click back to declared state.
8. Driver-assist vs self-driving per action class (Juniper Marvis):
   recommend-and-wait or auto-remediate, toggled per action, with a
   report-back on whether the fix worked.

## AI-gateway landscape, one line each
LiteLLM: config-first; budgets genuinely declarative on keys/teams.
Portkey: versioned Gateway Config objects (strategy + guardrails) by id.
Kong: decK GitOps; semantic routing INFERS intent from the prompt.
Cloudflare: the best UI; budget/rate-limit as graph nodes with fallbacks.
TrueFoundry: graduated consequences (throttle -> downgrade -> block).
Martian: pure outcome declaration (cost/quality dial), no plan preview.
OpenRouter: per-request constraint block; publishes its default algorithm.

## The 3 failure modes to design against
1. Abstraction rigidity: intent only works inside the vendor's reference
   design (Apstra pre-Freeform). Every intent needs an honest boundary
   and a graceful escape hatch.
2. The trust gap: engineers reject outcomes they cannot inspect. The
   antidote is transparency mechanics: per-change diffs, change-set
   compare, emitted code. Show the moves, never just the outcome.
3. The assurance half never closes: intent drift went unsolved and the
   category faded. If intents lack a living aligned/drifting/violated
   status, the demo reproduces the industry's actual failure.

Full per-product findings with URLs live in the session research; the
patterns above are the design-load-bearing subset.
