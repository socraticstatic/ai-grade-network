import { Link } from 'react-router-dom';
import { useCloudControl } from '../../engine/react/useCloudControl';
import type { FabricModel } from '../connect/FabricHero';
import { VerdictLine } from '../_shared/VerdictLine';
import { discoverVerdict } from './verdict';
import { UnifiedDiscovery } from './UnifiedDiscovery';
import { StackPanel } from './StackPanel';
import { AssessmentBanner } from '../assessment/AssessmentBanner';
import { resolveProfile } from '../../engine/estateProfile';
import { resetAdvisorDone } from '../advisor/advisorPhase';

/**
 * Re-entry into the first-run advisor. Same card + CTA shape as
 * AssessmentBanner (border-fw-secondary/bg-fw-wash wrapper, fw-ctaPrimary
 * pill Link) so the rail reads as one visual language, not two affordance
 * styles bolted together. Clears the ACTIVE profile's done-flag on click,
 * before the Link's own navigation to /discover/advisor - App.tsx's
 * DiscoverEntry gate reads that flag on every /discover render, but not on
 * this one: this Link goes straight to /discover/advisor, so the gate never
 * gets a chance to bounce it back.
 */
function RunAdvisorCard() {
  const profile = resolveProfile(window.location.search, window.localStorage);
  return (
    <div
      data-testid="discover-run-advisor-card"
      className="flex flex-wrap items-center gap-3 rounded-2xl border border-fw-secondary bg-fw-wash px-4 py-3"
    >
      <p className="min-w-[14rem] flex-1 text-figma-sm text-fw-body">
        Want a fresh look? Re-run the estate advisor for updated savings recommendations.
      </p>
      <Link
        to="/discover/advisor"
        data-testid="discover-run-advisor"
        onClick={() => resetAdvisorDone(profile)}
        className="rounded-full bg-fw-ctaPrimary px-4 py-1.5 text-figma-sm font-medium text-white hover:bg-fw-ctaPrimaryHover"
      >
        Run the advisor
      </Link>
    </div>
  );
}

/**
 * Two columns, and the order is the argument. The page opens on "Discover"
 * because that is what the route promises: the estate, and the tree you came
 * to read. The assessment invitation and the stack cross-section are context
 * for that reading, not a preamble to it - so they sit beside it in a rail
 * rather than pushing the heading 900px down the page.
 *
 * Below lg there is no side, so the rail falls under the tree. That keeps the
 * one thing this layout is for: the page still starts where "Discover" is.
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
          aria-label="Assessment and the stack"
          data-testid="discover-rail"
          className="w-full shrink-0 space-y-4 lg:w-[360px] xl:w-[400px]"
        >
          <AssessmentBanner />
          <RunAdvisorCard />
          {/* rail: the panel's rows stack instead of splitting left/right,
              because Tailwind's sm: is a viewport query and this column is
              360px wide inside a 1440px window. */}
          <StackPanel rail />
        </aside>
      </div>
    </div>
  );
}
