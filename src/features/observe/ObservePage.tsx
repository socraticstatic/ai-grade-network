import { useState } from 'react';
import { useCloudControl } from '../../engine/react/useCloudControl';
import { FlowBar } from '../../components/flow/FlowBar';
import { ObservabilityShell } from './ObservabilityShell';
import { networkBinding } from './networkBinding';
import { EventStream } from './EventStream';
import { PathTable } from '../connect/PathTable';
import { VerdictLine } from '../_shared/VerdictLine';
import { useNavigate } from 'react-router-dom';
import { EstateFilterChips } from '../discover/EstateFilterChips';
import { advisorFindings } from '../advisor/advisorModel';
import { FindingCard } from '../advisor/FindingCard';
import { markAdvisorDone } from '../advisor/advisorPhase';
import { resolveProfile } from '../../engine/estateProfile';
import { EMPTY_ESTATE_FILTERS, type EstateFilters } from '../discover/estateFilters';
import type { SiteClass } from '../discover/discoveryModel';
import type { FabricModel } from '../connect/FabricHero';

export function ObservePage() {
  /* One filter vocabulary, two screens: the same chips Discover ships now
     scope the money screen's site band, so "show me just the ATMs" means
     the same thing on both. Drill opens one class into its metros. */
  const [filters, setFilters] = useState<EstateFilters>(EMPTY_ESTATE_FILTERS);
  const [drill, setDrill] = useState<SiteClass | null>(null);
  /* Built per render, NOT inside useCloudControl's selector: that hook
     memoizes on the engine version alone, so a selector closing over React
     state would keep serving the filters it was first called with - the
     chips would render and do nothing. The `cc` subscription below still
     re-renders this page on every engine change. */
  const cc = useCloudControl(c => c);
  const binding = networkBinding(cc, filters, drill);
  const navigate = useNavigate();
  /* Phase 3, the connective tissue: the advisor's money findings render
     HERE as the same cards, with the same offer ladders, that the advisor
     conversation shows. One recommendation surface, wherever the question
     gets asked - Observe is where a FinOps reader asks it. */
  const moneyFindings = advisorFindings(cc).filter(
    f => f.kind === 'egress-bleed' || f.kind === 'unattached-regions',
  );
  const acceptTier = (route: string) => {
    try {
      markAdvisorDone(resolveProfile(window.location.search, window.localStorage));
    } catch {
      /* storage unavailable - the navigation still stands */
    }
    navigate(route);
  };
  const fabricModel = useCloudControl(c => c.fabricModel()) as FabricModel;

  // The shell provides its own "Network Observability" header; the FlowBar sits
  // as the top band (aligned to the shell's px-6 padding), then EventStream
  // (live engine feed) sits below.
  return (
    <div className="max-w-7xl mx-auto pb-8 space-y-4">
      <div className="px-6 pt-6 space-y-3">
        {binding.verdict && <VerdictLine>{binding.verdict}</VerdictLine>}
        <FlowBar cta={{ label: 'See the savings', to: '/naas/cost' }} />
        <EstateFilterChips model={fabricModel} cc={cc} filters={filters} onChange={setFilters} />
      </div>
      <ObservabilityShell binding={binding} sankeyDrill={drill} onSankeyDrill={setDrill} />
      {/* Paths — the steerable flow table (routeFlows / steerFlow / routingFailover),
          relocated here from Connect. Governing individual paths is an observability
          concern; Connect stays focused on fabric attach. */}
      {moneyFindings.length > 0 && (
        <section className="px-6 space-y-3" aria-labelledby="observe-advisor-heading">
          <h2 id="observe-advisor-heading" className="text-figma-lg font-semibold text-fw-heading">
            What your advisor would do with this
          </h2>
          {moneyFindings.map(f => (
            <FindingCard key={f.kind} finding={f} onAcceptTier={acceptTier} />
          ))}
        </section>
      )}
      <section className="px-6 space-y-2" aria-labelledby="observe-paths-heading">
        <h2 id="observe-paths-heading" className="text-figma-lg font-semibold text-fw-heading">Paths</h2>
        <PathTable />
      </section>
      <div className="px-6">
        <EventStream />
      </div>
    </div>
  );
}
