import type { ReactNode } from 'react';
import { PageSection } from '../../components/common/layouts';

/**
 * The frame shared by the four AI Fabric screens (/ai/connect, /ai/govern,
 * /ai/observe, /ai/cost). One domain, four verbs — the heading names both, so
 * a viewer who lands deep never has to infer which fabric they are looking at.
 *
 * The `FlowBar` deliberately does NOT appear here. That rail renders the NaaS
 * spine (Discover → Connect → Govern → Observe → Cost, see useFlowProgress);
 * on an AI Fabric route none of its stages is current, so it would sit beside
 * a nav that says "AI Fabric · Connect" while showing nothing as current —
 * a rail contradicting the screen it is on. NaaS keeps it; AI does not.
 */
export function AiDomainPage({
  verb,
  description,
  children,
}: {
  verb: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-8 space-y-6">
      <PageSection title={`AI Fabric · ${verb}`} description={description}>
        {children}
      </PageSection>
    </div>
  );
}
