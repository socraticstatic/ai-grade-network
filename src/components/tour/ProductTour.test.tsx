import { render, screen, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import { describe, it, expect } from 'vitest';
import {
  ProductTour,
  TourStep,
  choosePlacement,
  planTourScroll,
  tooltipTopFor,
  overlapPxFor,
} from './ProductTour';

/* ProductTour is a SHARED component: the AI-grade network demo tour
   (TourLauncher.tsx) and the main-app onboarding tour (App.tsx, mainAppTour)
   both render it. `resetOnOpen` has to stay scoped to whichever caller asks
   for it — the demo tour wants every launch to start at beat one, the
   main-app tour has always let a user close partway through and pick back
   up where they left off. A behaviour change with no prop would leak from
   one caller into the other, which is exactly what happened before this
   test existed. */

const steps: TourStep[] = [
  { id: 'a', title: 'Step A', description: 'first beat' },
  { id: 'b', title: 'Step B', description: 'second beat' },
];

function Harness({ resetOnOpen }: { resetOnOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <>
      <button onClick={() => setIsOpen(true)}>reopen</button>
      <ProductTour
        steps={steps}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onComplete={() => setIsOpen(false)}
        resetOnOpen={resetOnOpen}
      />
    </>
  );
}

async function advanceThenReopen() {
  fireEvent.click(screen.getByRole('button', { name: /^next$/i }));
  expect(await screen.findByTestId('tour-title')).toHaveTextContent('Step B');

  fireEvent.click(screen.getByLabelText('Close tour'));
  expect(screen.queryByTestId('tour-title')).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'reopen' }));
}

describe('ProductTour — resetOnOpen scoping', () => {
  it('defaults to NOT resetting — reopening a closed tour resumes on the step the user left (mainAppTour contract)', async () => {
    render(<Harness />);
    await advanceThenReopen();
    expect(screen.getByTestId('tour-title')).toHaveTextContent('Step B');
  });

  it('resetOnOpen restarts at step 1 every time the tour opens (AI-grade network demo-tour contract)', async () => {
    render(<Harness resetOnOpen />);
    await advanceThenReopen();
    expect(screen.getByTestId('tour-title')).toHaveTextContent('Step A');
  });
});

/* Every beat of cloudConnectTour asks for `placement: 'top'`, and every one of
   them used to end up at `top: 16` — on top of the spotlight it was supposed to
   sit above. The fix is three cooperating pieces, each covered here because any
   one alone leaves the bug standing:

   - tooltipTopFor / overlapPxFor: the geometry — where the tooltip lands after
     the on-screen clamp, and how much of the spotlight that covers. One source
     of truth for planning, the flip decision, and the render.
   - choosePlacement: render on the side that covers LESS of the spotlight,
     requested side wins ties. Overlap, not fit, so one rule covers every case.
   - planTourScroll: measure each side at the scroll position it can actually
     reach, not where `block: 'center'` happens to leave the target. Centring
     splits the viewport into two halves each too short, so a flip with no
     scroll has nowhere to go. */

const GAP = 28; // highlightPadding 12 + the 16px the tooltip keeps clear
const VIEW = { top: 0, bottom: 720 };

describe('tooltipTopFor', () => {
  it('places the tooltip a gap above/below the target when there is room', () => {
    expect(tooltipTopFor('top', 500, 100, 300, GAP, 720)).toBe(500 - 300 - GAP);
    expect(tooltipTopFor('bottom', 200, 100, 300, GAP, 720)).toBe(200 + 100 + GAP);
  });

  it('clamps to the viewport margin on both edges — the shove the old code relied on', () => {
    // No room above: raw -257 → pinned to the top margin.
    expect(tooltipTopFor('top', 189, 366, 418, GAP, 720)).toBe(16);
    // No room below: raw 410 → pinned to vh - tipH - margin = 286.
    expect(tooltipTopFor('bottom', 16, 366, 418, GAP, 720)).toBe(286);
  });
});

describe('overlapPxFor', () => {
  it('is zero when the tooltip clears the spotlight', () => {
    expect(overlapPxFor('top', 500, 100, 300, GAP, 720)).toBe(0);
    expect(overlapPxFor('bottom', 100, 100, 300, GAP, 720)).toBe(0);
  });

  it('measures the AI Fabric close: top side frozen at 245px, bottom side only 96px', () => {
    // Target 366px tall, tooltip 418px — cannot coexist in 720px. Pinned to the
    // top of a page that cannot scroll up, `top` covers 245px; scrolled to the
    // top with the tooltip below, `bottom` covers 96px. This is why it flips.
    expect(overlapPxFor('top', 189, 366, 418, GAP, 720)).toBe(245);
    expect(overlapPxFor('bottom', 16, 366, 418, GAP, 720)).toBe(96);
  });
});

describe('choosePlacement', () => {
  it('keeps the requested side when it covers no more of the spotlight', () => {
    expect(choosePlacement('top', 0, 100)).toBe('top');
    expect(choosePlacement('bottom', 100, 0)).toBe('bottom');
  });

  it('flips to the side that covers less of the spotlight', () => {
    expect(choosePlacement('top', 100, 0)).toBe('bottom');
    expect(choosePlacement('bottom', 0, 100)).toBe('top');
  });

  it('flips even when NEITHER side fits — the AI Fabric case, 96px beats 245px', () => {
    expect(choosePlacement('top', 245, 96)).toBe('bottom');
  });

  it('treats a sub-pixel difference as a tie and keeps the requested side', () => {
    // Rect jitter of a fraction of a pixel must not flip the beat frame to frame.
    expect(choosePlacement('top', 50, 50.5)).toBe('top');
    expect(choosePlacement('bottom', 50.5, 50)).toBe('bottom');
  });

  it('leaves the non-vertical placements alone', () => {
    expect(choosePlacement('center', 0, 400)).toBe('center');
    expect(choosePlacement('left', 400, 0)).toBe('left');
    expect(choosePlacement('right', 0, 400)).toBe('right');
  });
});

describe('planTourScroll', () => {
  const plan = (over: Partial<Parameters<typeof planTourScroll>[0]> = {}) =>
    planTourScroll({
      requested: 'top',
      rect: { top: 336, height: 190 },
      tooltipHeight: 430,
      gap: GAP,
      view: VIEW,
      scrollTop: 0,
      maxScroll: 4000,
      ...over,
    });

  it('scrolls the target DOWN to open a band above it, and stays on top', () => {
    // 336px above the target, 446px needed — but the page is scrolled to the
    // top of a long document, so the target can be pushed down to make room.
    const { placement, scrollTop } = plan({ scrollTop: 600 });
    expect(placement).toBe('top');
    expect(scrollTop).toBe(600 - (474 - 336)); // rect.top lands on margin+h+gap
  });

  it('flips to bottom — and scrolls UP to open the band there — when the target is already at the top of its page', () => {
    /* The measured failure: at scrollTop 0 the target cannot be pushed any
       lower, so `top` is unreachable no matter how the page scrolls. */
    const { placement, scrollTop } = plan();
    expect(placement).toBe('bottom');
    // rect.bottom must land at 720 - 16 - 430 - 28 = 246, i.e. rect.top at 56.
    expect(scrollTop).toBe(336 - 56);
  });

  it('never scrolls the head of its own target off-screen to make room below', () => {
    // A 600px target scrolled up to fit the tooltip below would hide its own
    // head: `bottom` would cover 342px vs `top`'s 110px, so top wins and the
    // page is already as low as scrollTop 0 allows.
    const { placement, scrollTop } = plan({ rect: { top: 336, height: 600 } });
    expect(placement).toBe('top');
    expect(scrollTop).toBe(0);
  });

  it('cannot invent scroll range that does not exist', () => {
    // Short page: nothing to scroll, so both sides are stuck where the target
    // already sits. `top` covers 110px there, `bottom` 190px — top wins, and
    // there is no scroll to apply.
    const { placement, scrollTop } = plan({ maxScroll: 0 });
    expect(placement).toBe('top');
    expect(scrollTop).toBe(0);
  });

  it('passes the non-vertical placements through untouched', () => {
    const { placement, scrollTop } = plan({ requested: 'center', scrollTop: 900 });
    expect(placement).toBe('center');
    expect(scrollTop).toBe(900);
  });
});
