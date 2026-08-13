import { useSearchParams } from 'react-router-dom';
import { PageSection } from '../../components/common/layouts';
import { TabGroup } from '../../components/navigation/TabGroup';
import { AttIcon } from '../../components/icons/AttIcon';
import { useCloudControl } from '../../engine/react/useCloudControl';
import { FlowBar } from '../../components/flow/FlowBar';
import { RulesPanel } from './RulesPanel';
import { PosturePanel } from './PosturePanel';
import { GroupsPanel } from './GroupsPanel';
import { ServiceInsertion } from './ServiceInsertion';
import { StageIntent } from '../_shared/StageIntent';

type GovernTab = 'policies' | 'groups' | 'posture';

const TABS: GovernTab[] = ['policies', 'groups', 'posture'];

/* The tab lives in the URL, not in component state. Groups is a destination —
   the guided tour routes straight to it, and Discover's "See it in Govern →
   Groups" confirmation should land on the groups table rather than on
   Policies with a tab still to find. An unknown or absent ?tab= falls back
   to policies, so /govern keeps meaning exactly what it used to. */
function tabFromParam(value: string | null): GovernTab {
  return TABS.includes(value as GovernTab) ? (value as GovernTab) : 'policies';
}

export function GovernPage() {
  const [params, setParams] = useSearchParams();
  const activeTab = tabFromParam(params.get('tab'));
  const setActiveTab = (id: GovernTab) =>
    // replace, not push: flipping a tab is not a navigation someone wants to
    // walk back through one press of Back at a time. Mutate the EXISTING
    // params rather than construct a fresh object — `{ tab: id }` clobbered
    // any other query param a caller had put on the URL.
    setParams(prev => {
      if (id === 'policies') prev.delete('tab');
      else prev.set('tab', id);
      return prev;
    }, { replace: true });
  const violations = useCloudControl(cc => cc.violations()) as unknown[];
  // Subscribing selector — the badge is a live CC derivation, so creating a
  // group moves the count without a reload.
  const groupCount = useCloudControl(cc => cc.groupList().length) as number;

  const tabs = [
    {
      id: 'policies',
      label: 'Policies',
      icon: <AttIcon name="check-shield" className="h-4 w-4 mr-1.5" />,
      count: violations.length || undefined,
      // Row 58 of the phase-0 metric audit: a bare count on a "Policies"
      // tab inherits that noun and reads as a (wrong) policy count. The
      // number is right; it needed its own accessible name.
      countLabel: violations.length ? `${violations.length} open violations` : undefined,
    },
    // Groups sits beside Policies because a group is what a policy names —
    // the two are read together, and a group was until now invisible.
    { id: 'groups', label: 'Groups', count: groupCount },
    { id: 'posture', label: 'Posture' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-8 space-y-6">
      <PageSection
        title="Govern"
        description="Govern · policy & segmentation — rules, enforcement, violations, and impact on the live engine."
      >
        <StageIntent stage="govern" />

        <FlowBar cta={{ label: 'Observe the impact', to: '/naas/observe' }} />

        <TabGroup tabs={tabs} activeTab={activeTab} onChange={id => setActiveTab(id as GovernTab)} />

        {activeTab === 'policies' && (
          <div className="space-y-4">
            <RulesPanel />
            <ServiceInsertion />
          </div>
        )}

        {activeTab === 'groups' && <GroupsPanel />}

        {activeTab === 'posture' && <PosturePanel />}
      </PageSection>
    </div>
  );
}
