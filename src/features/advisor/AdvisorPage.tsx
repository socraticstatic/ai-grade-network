import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCloudControl } from '../../engine/react/useCloudControl';
import { resolveProfile } from '../../engine/estateProfile';
import { markAdvisorDone } from './advisorPhase';
import { buildScript, type CanvasItem } from './advisorScript';
import { AdvisorConversation } from './AdvisorConversation';
import { AdvisorCanvas } from './AdvisorCanvas';

/**
 * `/discover/advisor` — the conversational advisor. The conversation IS the
 * experience: the advisor opens with what AT&T already sees, asks to look
 * at the cloud side, narrates the scan, and delivers findings one at a
 * time as observations — while the canvas on the right materializes the
 * artifact for whatever was just said. One-tap replies drive the whole
 * flow (a demo never types); free text routes to Andi's grounded brain.
 *
 * Opt-in only: /discover never redirects here (every profile boots with
 * the done flag seeded); the rail's "Run the advisor" card and this URL
 * are the two ways in. Leaving by any route marks the flag - belt and
 * suspenders, in case the boot seeding ever changes.
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
  const [canvasItems, setCanvasItems] = useState<CanvasItem[]>([]);
  const navigate = useNavigate();

  const leave = () => markAdvisorDone(profile);
  const acceptTier = (route: string) => {
    leave();
    navigate(route);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pb-8 pt-6 sm:px-6 lg:px-8">
      <div className="mb-4 flex items-center justify-between gap-3">
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

      <div className="flex flex-col gap-6 lg:h-[calc(100vh-190px)] lg:flex-row">
        <section
          aria-label="Conversation with the advisor"
          className="min-h-[420px] w-full rounded-2xl border border-fw-secondary bg-fw-base p-4 lg:h-full lg:w-[440px] lg:shrink-0"
        >
          <AdvisorConversation
            cc={cc}
            beats={beats}
            onCanvas={item => setCanvasItems(prev => [...prev, item])}
            onLeave={leave}
          />
        </section>
        <section aria-label="What the advisor found" className="min-w-0 flex-1 lg:overflow-y-auto">
          {canvasItems.length === 0 ? (
            <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-fw-secondary text-figma-sm text-fw-bodyLight">
              What I find lands here as we talk.
            </div>
          ) : (
            <AdvisorCanvas cc={cc} items={canvasItems} onAcceptTier={acceptTier} />
          )}
        </section>
      </div>
    </div>
  );
}
