import { AiDomainPage } from './AiDomainPage';
import { TokenPolicies } from './TokenPolicies';
import { AgentsPanel } from './AgentsPanel';

/**
 * AI Fabric · Govern. The authority screen, and the landing point for the
 * retired `/ai-fabric` path — the token-policy table is what that page always
 * led with. Two blocks moved here whole: the policies themselves, and the
 * agents those policies bind.
 */
export function AiGovernPage() {
  return (
    <AiDomainPage
      verb="Govern"
      description="Token policy is the control surface for the AI Fabric: what each identity may call, the budget it may spend, and whether a guardrail inspects the request. Agents are the callers those policies bind."
    >
      <div className="space-y-4">
        <TokenPolicies />
        <AgentsPanel />
      </div>
    </AiDomainPage>
  );
}
