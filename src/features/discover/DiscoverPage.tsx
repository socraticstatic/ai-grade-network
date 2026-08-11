import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useCloudControl } from '../../engine/react/useCloudControl';
import type { FabricModel } from '../connect/FabricHero';
import { VerdictLine } from '../_shared/VerdictLine';
import { discoverVerdict } from './verdict';
import { UnifiedDiscovery } from './UnifiedDiscovery';
import { advisorHeadline } from '../advisor/advisorModel';
import { resolveProfile } from '../../engine/estateProfile';
import { resetAdvisorDone } from '../advisor/advisorPhase';

const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

/**
 * The rail is ONE card now - the brainstorm's "too busy" critique applied
 * to this page's own margins. The advisor owns everything the old rail
 * held: the savings number leads (value on top), the conversation is one
 * tap away, and deepening (the 14-day assessment) happens inside the
 * advisor's own flow rather than as a second banner competing for the
 * same eyes. The stack cross-section moved out entirely; it reads better
 * where the money story lives.
 */
function AdvisorCard() {
  const head = useCloudControl(cc => advisorHeadline(cc));
  const profile = resolveProfile(window.location.search, window.localStorage);
  return (
    <div
      data-testid="discover-run-advisor-card"
      className="rounded-2xl border border-fw-secondary bg-fw-wash p-5"
    >
      <p className="flex items-center gap-1.5 text-figma-xs font-semibold uppercase tracking-[0.06em] text-fw-bodyLight">
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Your advisor
      </p>
      {head.savingsMo > 0 && (
        <p className="mt-2 text-[28px] font-semibold leading-tight text-fw-heading">
          {money(head.savingsMo)}/mo
          <span className="block text-figma-sm font-normal text-fw-body">on the table across {head.findings} findings</span>
        </p>
      )}
      <Link
        to="/discover/advisor"
        data-testid="discover-run-advisor"
        onClick={() => resetAdvisorDone(profile)}
        className="mt-4 inline-block rounded-full bg-fw-ctaPrimary px-5 py-2 text-figma-sm font-medium text-white hover:bg-fw-ctaPrimaryHover"
      >
        Ask the advisor
      </Link>
    </div>
  );
}

/**
 * Two columns, and the order is the argument. The page opens on "Discover"
 * because that is what the route promises: the estate, and the tree you came
 * to read. The advisor card is the only context beside it - one number, one
 * door. Below lg the rail falls under the tree.
 */
export function DiscoverPage() {
  const model = useCloudControl(cc => cc.fabricModel()) as FabricModel;
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-8 space-y-4">
      <VerdictLine>{discoverVerdict(model)}</VerdictLine>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* A div, not a <main>: App.tsx already owns the one main landmark
            (#main-content), and this column renders inside it. */}
        <div className="min-w-0 flex-1">
          <UnifiedDiscovery />
        </div>
        <aside
          aria-label="Your advisor"
          data-testid="discover-rail"
          className="w-full shrink-0 lg:w-[320px]"
        >
          <AdvisorCard />
        </aside>
      </div>
    </div>
  );
}
