import { useEffect } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import { MainNav } from './MainNav';

/* The guided tour is the demo vehicle for this product, and it used to be
   mounted INSIDE the header's `!isMobile` branch (window.innerWidth < 1024).
   Two consequences, both invisible to every other test in this directory:

   1. Below 1024px the launcher button never rendered, so there was no way to
      start the tour at all on the widths where the drawer is the only nav.

   2. `isMobile` is React state updated from a `resize` listener, so dragging
      a window narrower MID-TOUR unmounted <ProductTour /> outright. Its
      `currentStep` lives in its own useState, so the tour did not pause — it
      ceased to exist, spotlight and progress and all, and reopening it later
      started over.

   Both are asserted here against real width changes rather than a snapshot of
   the JSX, so moving the launcher back inside any width-gated branch fails. */

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, onAnimationComplete, ...props }: any) => {
      useEffect(() => {
        onAnimationComplete?.();
      }, []);
      return <div {...props}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const originalWidth = window.innerWidth;

function setWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { value: width, writable: true, configurable: true });
}

function resizeTo(width: number) {
  act(() => {
    setWidth(width);
    window.dispatchEvent(new Event('resize'));
  });
}

function renderNav() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <MainNav />
      </AuthProvider>
    </MemoryRouter>
  );
}

/* The launcher moved into the utility bar's overflow - a control started
   once per session should not hold permanent space beside the ones a
   viewer uses constantly. "Reachable at every width" is still the
   guarantee under test; it is now one click behind the overflow, so these
   helpers open it first. */
const openOverflow = () => {
  const more = screen.queryByTestId('utility-overflow');
  if (more) fireEvent.click(more);
};
const launcher = () => {
  const direct = screen.queryByRole('button', { name: /start guided tour/i });
  if (direct) return direct;
  openOverflow();
  return screen.queryByRole('button', { name: /start guided tour/i });
};

describe('the guided tour is reachable at every width', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    setWidth(originalWidth);
  });

  // 375 = iPhone, 768 = tablet portrait, 900 = the width the drawer finding
  // was measured at, 1279 = one pixel below the horizontal nav's breakpoint.
  it.each([375, 768, 900, 1023, 1279, 1440])('renders the tour launcher at %ipx', width => {
    setWidth(width);
    renderNav();
    expect(launcher()).toBeInTheDocument();
  });

  it('a running tour survives being narrowed past the 1024px mobile breakpoint', () => {
    setWidth(1440);
    renderNav();

    fireEvent.click(launcher()!);
    expect(screen.getByTestId('tour-progress')).toHaveTextContent(/^Step 1 of \d+$/);

    // Advance one beat so a remount would be visible as lost progress rather
    // than only as a lost tour.
    fireEvent.click(screen.getByRole('button', { name: /^next$/i }));
    const atStepTwo = screen.getByTestId('tour-progress').textContent;
    expect(atStepTwo).toMatch(/^Step 2 of \d+$/);

    resizeTo(900);

    // Still open...
    expect(screen.getByTestId('tour-tooltip')).toBeInTheDocument();
    // ...and still on the beat the viewer was on.
    expect(screen.getByTestId('tour-progress')).toHaveTextContent(atStepTwo!);

    // And widening again does not restart it either.
    resizeTo(1440);
    expect(screen.getByTestId('tour-progress')).toHaveTextContent(atStepTwo!);
  });

  it('a tour started narrow survives being widened', () => {
    setWidth(375);
    renderNav();

    fireEvent.click(launcher()!);
    fireEvent.click(screen.getByRole('button', { name: /^next$/i }));
    const beat = screen.getByTestId('tour-progress').textContent;
    expect(beat).toMatch(/^Step 2 of \d+$/);

    resizeTo(1440);
    expect(screen.getByTestId('tour-tooltip')).toBeInTheDocument();
    expect(screen.getByTestId('tour-progress')).toHaveTextContent(beat!);
  });
});
