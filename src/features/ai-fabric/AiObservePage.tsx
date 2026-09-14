import { AiDomainPage } from './AiDomainPage';
import { InsightsPage } from './insights/InsightsPage';

/**
 * AI Fabric · Observe, rebuilt as the gateway's Insights screen (Figma NAAS
 * AI, phase 3): KPI strip, traffic-flow sankey, Performance / Savings /
 * Security tabs, and the filterable request log. Insights IS this layer's
 * Observe surface - the rail item labeled Insights routes here.
 *
 * The old shell's prompt trace and decision log did not leave: they render
 * on the Security tab, trace above log, because the log's empty state still
 * reads "run a trace above to populate this view".
 */
export function AiObservePage() {
  return (
    <AiDomainPage
      verb="Observe"
      description="The token layer, watched: live gateway figures, where every dollar of AI spend flows, and each request judged at the gate."
    >
      <InsightsPage />
    </AiDomainPage>
  );
}
