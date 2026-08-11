import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCloudControl } from '../../engine/react/useCloudControl';
import { resolveProfile } from '../../engine/estateProfile';
import { markAdvisorDone } from './advisorPhase';
import { buildScript } from './advisorScript';
import { AdvisorConversation } from './AdvisorConversation';

/**
 * `/discover/advisor` — the conversational advisor. One centered column,
 * one page scroll: the advisor's messages flow down the page and each
 * artifact (head-start figures, scan, finding cards, the savings hero)
 * lands inline right after the words that introduced it. One-tap replies
 * drive the flow; free text routes to Andi; the input floats at the
 * bottom. Opt-in only — /discover never redirects here.
 */
export default function AdvisorPage() {
  const cc = useCloudControl(c => c);
  const profile = useMemo(() => {
    try {
      return resolveProfile(window.location.search, window.localStorage);
    } catch {
      return 'acme';
    }
  }, []);
  const beats = useMemo(() => buildScript(cc), [cc]);
  const navigate = useNavigate();

  const leave = () => markAdvisorDone(profile);
  const acceptTier = (route: string) => {
    leave();
    navigate(route);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pb-10 pt-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-figma-lg font-semibold text-fw-heading">Your AT&T advisor</h1>
        <Link
          to="/discover"
          data-testid="advisor-skip"
          onClick={leave}
          className="text-figma-sm font-medium text-fw-link hover:underline"
        >
          Skip to the estate
        </Link>
      </div>
      <AdvisorConversation cc={cc} beats={beats} onLeave={leave} onAcceptTier={acceptTier} />
    </div>
  );
}
