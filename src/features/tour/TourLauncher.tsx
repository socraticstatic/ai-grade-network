import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play } from 'lucide-react';
import { useTour } from '../../hooks/useTour';
import { ProductTour, TourStep } from '../../components/tour/ProductTour';
import { activeCloudConnectTour } from './cloudConnectTour';

/**
 * Launches the guided AI-grade network tour — Discover -> Connect -> Govern ->
 * Observe -> Cost -> AI Fabric — reusing NetBond's `useTour`/`ProductTour`
 * infra. Each step in `cloudConnectTour` carries a `route`; `onStepChange`
 * navigates there before ProductTour's spotlight looks for the step's
 * `targetSelector` on the new page.
 */
/* The event the overflow menu's row fires to start a tour.
 *
 * The launcher OWNS the running tour (ProductTour is its child and the
 * step index lives in ProductTour's own state), so it has to stay mounted
 * wherever the trigger happens to live. Putting the whole component inside
 * the utility bar's collapsible overflow unmounted a RUNNING tour the
 * moment the menu closed - the same class of bug the width-gate comment in
 * MainNav warns about. So the launcher stays mounted at the bar level and
 * the menu row just shouts. */
export const START_TOUR_EVENT = 'cc:start-tour';

export function TourLauncher({ trigger = 'button' }: { trigger?: 'button' | 'none' } = {}) {
  const { isOpen, startTour, closeTour } = useTour('cloud-connect');
  const navigate = useNavigate();

  /* The steps of THIS run. Recomputed at every launch, not at module load:
     a step's `when` predicate (the tour's skip mechanism — see
     cloudConnectTour.ts) reads the estate and the DOM as they are the
     moment the viewer presses play, and both move between rehearsals. */
  const [steps, setSteps] = useState<TourStep[]>(activeCloudConnectTour);

  const handleStart = useCallback(() => {
    setSteps(activeCloudConnectTour());
    startTour();
  }, [startTour]);

  useEffect(() => {
    const onStart = () => handleStart();
    window.addEventListener(START_TOUR_EVENT, onStart);
    return () => window.removeEventListener(START_TOUR_EVENT, onStart);
  }, [handleStart]);

  const handleStepChange = useCallback(
    (step: TourStep) => {
      const route = (step as TourStep & { route?: string }).route;
      if (route) navigate(route);
    },
    [navigate]
  );

  return (
    <>
      {/* Rendered as a menu row where a trigger is wanted; `trigger:none`
          keeps the tour mounted with no visible control of its own. */}
      {trigger === 'button' && (
      <button
        type="button"
        onClick={handleStart}
        aria-label="Start guided tour"
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-figma-sm text-fw-body transition-colors hover:bg-fw-wash"
      >
        <Play className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>Start guided tour</span>
      </button>
      )}

      <ProductTour
        steps={steps}
        isOpen={isOpen}
        onClose={closeTour}
        onComplete={closeTour}
        onStepChange={handleStepChange}
        storageKey="tour-cloud-connect-completed"
        resetOnOpen
      />
    </>
  );
}
