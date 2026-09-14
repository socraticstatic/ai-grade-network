import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement } from 'react';
import { CC } from '../../engine';
import { cloudConnectTour } from './cloudConnectTour';
import { UnifiedDiscovery } from '../discover/UnifiedDiscovery';
import { FabricHero } from '../connect/FabricHero';
import { RulesPanel } from '../govern/RulesPanel';
import { GroupsPanel } from '../govern/GroupsPanel';
import { ObservabilityShell } from '../observe/ObservabilityShell';
import { networkBinding } from '../observe/networkBinding';
import { CostPage } from '../cost/CostPage';
import { TokenPolicies } from '../ai-fabric/TokenPolicies';
import { AssessmentBanner } from '../assessment/AssessmentBanner';
import { IntentThreads } from '../discover/IntentThreads';
import { InsightsPage } from '../ai-fabric/insights/InsightsPage';
import { MainNav } from '../../components/navigation/MainNav';
import { StackPanel } from '../discover/StackPanel';
import { TasksPage } from '../work/TasksPage';
import { LayerDashboard } from '../layer-home/dashboard/LayerDashboard';
import { ProposalBand } from '../govern/ProposalBand';
import { AiKeysPage } from '../ai-fabric/GatewayGovernancePages';

/**
 * Every guided-tour step targets a `data-tour` anchor. The Discover and Observe
 * rebuilds (EstateTable→UnifiedDiscovery, TelemetryCharts→ObservabilityShell)
 * previously deleted `discover-estate` and `observe-telemetry`, silently
 * breaking the tour. This renders the screen that HOSTS each step's anchor and
 * asserts the selector resolves to a real DOM node — it fails if any anchor is
 * missing, not just if the selector string changes.
 */
const screenFor: Record<string, () => ReactElement> = {
  discover: () => <UnifiedDiscovery />,
  // The banner is its own host: DiscoverPage renders it above the stack, and
  // in a fresh engine (stage 'not-started') it renders its anchor.
  assessment: () => <AssessmentBanner />,
  'discover-sites': () => <UnifiedDiscovery />,
  // The standing-intents band renders its anchor with zero intents declared —
  // the empty state is still the <section data-testid="intent-threads">.
  intents: () => <IntentThreads />,
  // The Andi toggle lives in the top bar, which renders on every route. jsdom
  // reports innerWidth 1024, exactly the desktop breakpoint, so the header's
  // !isMobile branch (innerWidth < 1024) holds here.
  andi: () => (
          <MainNav />  ),
  // The twin's entry control lives in the stack panel's header and renders
  // unconditionally — unlike the tray, which exists only while moves are
  // staged, and which is why the beat does not point at it.
  twin: () => <StackPanel />,
  // The header, not the queue: TasksPage swaps the queue for an empty-state
  // <p> when nothing waits, and the anchor must survive that.
  tasks: () => <TasksPage />,
  // The `manage` render of the intents band — the one with the mode switch.
  // TasksPage mounts it with the default (manage: true); StackPanel passes
  // manage={false}, which is why the Discover intents beat cannot carry this.
  'intent-control': () => <TasksPage />,
  'layer-home': () => <LayerDashboard surface="naas" />,
  connect: () => <FabricHero model={CC.fabricModel()} />,
  // ProposalBand renders the band only while a proposal exists; on the seeded
  // engine four findings are active, and the beat carries a `when` for the
  // estate where none is.
  proposals: () => <ProposalBand />,
  govern: () => <RulesPanel />,
  'govern-groups': () => <GroupsPanel />,
  // The payoff beat points back at the rules table — the rule it authors has
  // to land somewhere a viewer can read it.
  'group-policy': () => <RulesPanel />,
  observe: () => <ObservabilityShell binding={networkBinding(CC)} />,
  cost: () => <CostPage />,
  gateway: () => <AiKeysPage />,
  insights: () => <InsightsPage />,
  'ai-fabric': () => <TokenPolicies />,
};

describe('guided-tour anchors resolve in the DOM', () => {
  for (const step of cloudConnectTour) {
    it(`step "${step.id}" anchor ${step.targetSelector} exists on its screen`, () => {
      const build = screenFor[step.id];
      expect(build, `no screen mapped for tour step "${step.id}"`).toBeTruthy();
      const { container } = render(<MemoryRouter>{build()}</MemoryRouter>);
      expect(step.targetSelector).toBeTruthy();
      expect(
        container.querySelector(step.targetSelector!),
        `anchor ${step.targetSelector} missing from "${step.id}" screen`,
      ).not.toBeNull();
    });
  }
});
