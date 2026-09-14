import { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Check, Sparkles, MousePointer } from 'lucide-react';
import { Button } from '../common/Button';

/** A beat's copy. A plain string for static prose; a thunk when the copy
 *  states a FIGURE — every number the tour speaks has to be a live engine
 *  derivation read at the moment its beat is shown, not one frozen at module
 *  load, because the beats before it deliberately move the estate. */
export type TourCopy = string | (() => string);

export function readCopy(copy: TourCopy): string {
  return typeof copy === 'function' ? copy() : copy;
}

/** Gutter the tooltip is never allowed to cross — the same 16px the on-screen
 *  clamp below enforces on all four sides. */
const VIEWPORT_MARGIN = 16;

/** Consecutive frames the target rect must hold still before the tooltip stops
 *  chasing it, and the hard cap on how long it may chase. One second is longer
 *  than any smooth scroll here; the cap only exists so a genuinely animating
 *  target cannot pin a rAF loop open for the length of the beat. */
const SETTLE_STABLE_FRAMES = 3;
const SETTLE_FRAME_BUDGET = 60;

/** A side is preferred over the other only when it beats it by more than this
 *  many pixels of overlap. Inside the band the two are a tie and the step
 *  author's requested side wins — so sub-pixel rect jitter can't flip a beat
 *  back and forth between frames. */
const OVERLAP_TIE_PX = 1;

/** How much of the spotlight must stay on screen. A target taller than this is
 *  pushed only until this much shows, trading the rest for a clear tooltip; a
 *  shorter one is kept whole. Without a floor, minimising overlap alone would
 *  scroll the spotlight clean off the page — an off-screen target overlaps
 *  nothing, which the geometry would otherwise score as the perfect result. */
const MIN_SPOTLIGHT_VISIBLE = 200;

export type TourPlacement = NonNullable<TourStep['placement']>;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Where the tooltip's top edge lands for a given side, AFTER the same on-screen
 * clamp the render path applies. This is the single source of truth for tooltip
 * position — planning, the flip decision, and the final render all derive from
 * it, so a beat can never be decided against one geometry and drawn with
 * another.
 */
export function tooltipTopFor(
  placement: 'top' | 'bottom',
  rectTop: number,
  rectHeight: number,
  tooltipHeight: number,
  gap: number,
  viewportHeight: number,
): number {
  const raw = placement === 'top' ? rectTop - tooltipHeight - gap : rectTop + rectHeight + gap;
  return clamp(raw, VIEWPORT_MARGIN, viewportHeight - tooltipHeight - VIEWPORT_MARGIN);
}

/** Pixels of the target the tooltip would cover on `placement`, at the clamped
 *  position above. Zero when the tooltip clears the spotlight; that is the
 *  number the whole feature is trying to drive to zero. */
export function overlapPxFor(
  placement: 'top' | 'bottom',
  rectTop: number,
  rectHeight: number,
  tooltipHeight: number,
  gap: number,
  viewportHeight: number,
): number {
  const tipTop = tooltipTopFor(placement, rectTop, rectHeight, tooltipHeight, gap, viewportHeight);
  return Math.max(
    0,
    Math.min(rectTop + rectHeight, tipTop + tooltipHeight) - Math.max(rectTop, tipTop),
  );
}

/**
 * Which side the tooltip renders on, given how much each side would overlap the
 * spotlight. Only the vertical placements flip; `left`/`right`/`center` pass
 * through.
 *
 * The rule is simply: the side that covers LESS of the target wins, and the
 * requested side wins ties. Framed as overlap rather than fit, one rule covers
 * every case. When a side fits, its overlap is 0 and it can only lose to the
 * other side also fitting — where the tie hands it back to the requested side.
 * When NEITHER side fits — a target too tall to share the viewport with the
 * tooltip — the smaller overlap is a real, visible win, not a rounding artefact:
 * the AI Fabric close loads at the top of a page that cannot scroll up, so its
 * `top` side is frozen at ~245px of overlap while placing `bottom` (target
 * scrolled to the top, tooltip below) costs ~96px. An earlier "requested side
 * always wins when neither fits" rule shipped the 245px.
 */
export function choosePlacement(
  requested: TourPlacement,
  overlapTop: number,
  overlapBottom: number,
): TourPlacement {
  if (requested !== 'top' && requested !== 'bottom') return requested;
  if (overlapTop < overlapBottom - OVERLAP_TIE_PX) return 'top';
  if (overlapBottom < overlapTop - OVERLAP_TIE_PX) return 'bottom';
  return requested;
}

interface ScrollPlan {
  placement: TourPlacement;
  /** Absolute destination for the scroller, already reachable. */
  scrollTop: number;
}

/**
 * Where to scroll so the tooltip covers as little of the spotlight as possible,
 * and which side that is.
 *
 * This is the half of the fix that flipping cannot do on its own. Every beat
 * used to get `scrollIntoView({ block: 'center' })`, and centring a target in a
 * 720px-tall viewport leaves roughly 316px clear on EACH side while these
 * tooltips run 314–456px tall — so neither side fits and there is nothing to
 * flip TO. The side has to be chosen against the room the page COULD be
 * scrolled to give it, not the room a centred target happens to leave.
 *
 * Hence the two candidate positions. `top` only ever pushes the target down
 * (opening room above), `bottom` only ever pulls it up, and both are clamped to
 * what the scroll range actually allows — a target already at the top of its
 * page cannot be pushed lower, which is exactly the AI Fabric case where `top`
 * is stuck and `bottom` wins. `bottom` is additionally floored at the viewport
 * margin: a beat that scrolls the head of its own target off-screen to make
 * room has traded one hidden spotlight for another. Each candidate's overlap is
 * then measured at the position it can actually reach, and the lesser wins.
 */
export function planTourScroll(args: {
  requested: TourPlacement;
  rect: { top: number; height: number };
  tooltipHeight: number;
  gap: number;
  /** The scroller's visible box, in client coordinates. */
  view: { top: number; bottom: number };
  scrollTop: number;
  maxScroll: number;
}): ScrollPlan {
  const { requested, rect, tooltipHeight, gap, view, scrollTop, maxScroll } = args;
  if (requested !== 'top' && requested !== 'bottom') {
    return { placement: requested, scrollTop };
  }

  const need = tooltipHeight + VIEWPORT_MARGIN;
  const reachMax = rect.top + scrollTop; // scrolled fully up
  const reachMin = rect.top - (maxScroll - scrollTop); // scrolled fully down
  const reachable = (t: number) => Math.max(reachMin, Math.min(reachMax, t));

  // Keep at least this much of the spotlight on screen when choosing where a
  // target may sit — the whole thing if it is short enough, a band otherwise.
  const keepVisible = Math.min(rect.height, MIN_SPOTLIGHT_VISIBLE);

  // 'top' wants the target LOW (room for the tooltip above it), but bounded on
  // BOTH ends: `loTop` is the lowest position that still leaves the tooltip
  // fully above; `hiTop` is as low as it may go before the spotlight stops
  // being visible. Clamping rect.top INTO [loTop, hiTop] — rather than only
  // pushing it up to loTop — is what stops a target that loads far below the
  // fold from being left there (its overlap reads 0 only because it is off
  // screen). When the band inverts (a target too tall to seat the tooltip above
  // AND stay visible), visibility wins and the overlap comparison below takes
  // it from there.
  const loTop = view.top + gap + need;
  const hiTop = view.bottom - VIEWPORT_MARGIN - keepVisible;
  const forTop = reachable(loTop <= hiTop ? Math.max(loTop, Math.min(rect.top, hiTop)) : hiTop);

  // 'bottom' wants the target HIGH; the same clamp keeps its top on screen.
  const forBottom = reachable(
    Math.max(
      view.top + VIEWPORT_MARGIN,
      Math.min(rect.top, view.bottom - gap - need - rect.height),
    ),
  );

  // Each side is judged at the position IT can reach, not at a shared one:
  // `top` scrolls the target to forTop, `bottom` scrolls it to forBottom, and
  // whichever leaves less of the spotlight covered is the one to render.
  const vh = view.bottom - view.top;
  const overlapTop = overlapPxFor('top', forTop - view.top, rect.height, tooltipHeight, gap, vh);
  const overlapBottom = overlapPxFor('bottom', forBottom - view.top, rect.height, tooltipHeight, gap, vh);

  const placement = choosePlacement(requested, overlapTop, overlapBottom);
  const targetTop = placement === 'top' ? forTop : forBottom;
  return { placement, scrollTop: scrollTop + (rect.top - targetTop) };
}

/** The element that actually scrolls `el`. `scrollIntoView` resolves this for
 *  free; landing the target on a COMPUTED offset instead means resolving it
 *  here. Falls back to the document scroller, which is what these pages use. */
function scrollParentOf(el: HTMLElement): HTMLElement {
  for (let n = el.parentElement; n; n = n.parentElement) {
    if (/(auto|scroll|overlay)/.test(getComputedStyle(n).overflowY) && n.scrollHeight > n.clientHeight) {
      return n;
    }
  }
  return (document.scrollingElement as HTMLElement | null) ?? document.documentElement;
}

/**
 * Run `planTourScroll` against the live DOM and scroll there.
 *
 * The destination is absolute, not a relative nudge, because `updatePosition`
 * re-runs on every scroll event — a relative `scrollBy` would keep stacking new
 * deltas onto an in-flight smooth scroll and overshoot. Recomputing the same
 * absolute destination each time converges instead.
 */
function scrollTargetIntoPlace(
  el: HTMLElement,
  requested: TourPlacement,
  tooltipHeight: number,
  gap: number,
): void {
  if (requested !== 'top' && requested !== 'bottom') {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const scroller = scrollParentOf(el);
  const isRoot = scroller === document.scrollingElement || scroller === document.documentElement;
  const view = isRoot ? { top: 0, bottom: window.innerHeight } : scroller.getBoundingClientRect();
  const rect = el.getBoundingClientRect();

  const plan = planTourScroll({
    requested,
    rect: { top: rect.top, height: rect.height },
    tooltipHeight,
    gap,
    view,
    scrollTop: scroller.scrollTop,
    maxScroll: Math.max(0, scroller.scrollHeight - (isRoot ? window.innerHeight : scroller.clientHeight)),
  });

  scroller.scrollTo({ top: plan.scrollTop, behavior: 'smooth' });
}

export interface TourStep {
  id: string;
  title: string;
  description: TourCopy;
  targetSelector?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  highlightPadding?: number;
  scrollIntoView?: boolean;
  /** Optional route this step lives on. ProductTour itself is route-agnostic
   * (it only knows the DOM) — a consumer that spans multiple pages can read
   * this off the step passed to `onStepChange` and navigate there. */
  route?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ProductTourProps {
  steps: TourStep[];
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  storageKey?: string;
  /** Fires whenever the active step changes (including the initial step when
   * the tour opens). Lets a multi-page tour navigate to `step.route` before
   * the spotlight looks for `step.targetSelector` on the new page. */
  onStepChange?: (step: TourStep, index: number) => void;
  /** Restart at step 1 every time the tour opens. Off by default, which
   * preserves the long-standing contract of `mainAppTour` (App.tsx): a user
   * who closes it partway through and reopens it lands back where they
   * left off. The AI-grade network demo tour (TourLauncher.tsx) opts in
   * explicitly — rehearsing a demo means opening it again and again, and
   * every launch has to begin at the beginning. This is a shared component;
   * the reset behaviour must stay scoped to the caller that asked for it. */
  resetOnOpen?: boolean;
}

export function ProductTour({ steps, isOpen, onClose, onComplete, storageKey = 'product-tour-completed', onStepChange, resetOnOpen = false }: ProductTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  /* The side the tooltip ENDED UP on, which is not always the side the step
     asked for — see resolvePlacement. The bouncing pointer reads this rather
     than `step.placement`, or a flipped beat would point up at nothing while
     its tooltip sat below the target. */
  const [placement, setPlacement] = useState<TourPlacement>('bottom');
  const tooltipRef = useRef<HTMLDivElement>(null);
  /** Which step's target has already been scrolled to, so the scroll fires
   *  once per beat instead of once per scroll event. */
  const scrolledForStep = useRef<number | null>(null);
  const settleFrame = useRef<number | null>(null);

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const progress = ((currentStep + 1) / steps.length) * 100;

  /* Closing the tour does not unmount this component — `isOpen` only gates
     the render — so `currentStep` survives a close by default and the next
     launch resumes where the last one left off. `resetOnOpen` callers (the
     AI-grade network demo tour) want the opposite: every launch begins at the
     beginning, because rehearsing a demo means opening the tour again and
     again. Gating on the prop keeps that behaviour from leaking into the
     main-app onboarding tour, which never asked for it. */
  useEffect(() => {
    if (isOpen && resetOnOpen) setCurrentStep(0);
  }, [isOpen, resetOnOpen]);

  useEffect(() => {
    if (isOpen && step) {
      onStepChange?.(step, currentStep);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currentStep, step]);

  useEffect(() => {
    if (!isOpen || !step?.targetSelector) {
      setTargetRect(null);
      return;
    }

    const updatePosition = () => {
      const element = document.querySelector(step.targetSelector!);
      /* A step whose target is NOT on the page must drop the spotlight, not
         inherit the previous step's. Leaving the stale rect in place made a
         broken beat look like a working one — it lit up whatever the beat
         before it had highlighted, on a page where that element no longer
         exists. Falling back to the flat overlay says "nothing to point at",
         which is the truth. */
      if (!element) {
        setTargetRect(null);
        return;
      }
      {
        const requested = step.placement || 'bottom';
        const padding = step.highlightPadding || 8;
        /* Clear space the tooltip keeps between itself and the spotlight. The
           highlight already extends `padding` past the target, so the visible
           gap is the extra 16. */
        const gap = padding + 16;

        /* Scroll ONCE per step, not once per `updatePosition`. This function
           also runs on every scroll event, and re-issuing a smooth scroll from
           inside the scroll it started restarts the animation every frame —
           the target creeps toward the destination and the beat is still
           moving when the viewer (or a test) looks at it. */
        if (step.scrollIntoView !== false && scrolledForStep.current !== currentStep) {
          scrolledForStep.current = currentStep;
          const tipHeight = tooltipRef.current?.getBoundingClientRect().height ?? 0;
          scrollTargetIntoPlace(element as HTMLElement, requested, tipHeight, gap);
        }

        /* Place immediately, then keep re-placing until the target stops
           moving. The old code measured once, 300ms after asking for a smooth
           scroll, and took whatever it found — which on a page still settling
           (a chart reflowing, a route's DOM landing late) was a rect the
           tooltip then sat against for the rest of the beat. A fixed delay
           cannot know when layout is done; watching the rect can. */
        const place = () => {
          const rect = element.getBoundingClientRect();
          /* Bail out of the state update when nothing moved. `place` now runs
             every frame while the page settles, and a fresh object each time
             would re-render the overlay 60x a second for no change. */
          setTargetRect(prev =>
            prev && prev.top === rect.top && prev.left === rect.left
              && prev.width === rect.width && prev.height === rect.height
              ? prev
              : rect,
          );

          if (tooltipRef.current) {
            const tooltipRect = tooltipRef.current.getBoundingClientRect();
            /* Re-decide against where the scroll ACTUALLY landed, using the same
               overlap geometry the plan did. The plan aims at a destination; the
               page may not have reached it (short page, another scroll in
               flight), so the side that renders follows the pixels, not the
               intent. Both sides are measured at this one landed rect — the side
               the scroll optimised for wins because the target is now near that
               side's edge. */
            const vh = window.innerHeight;
            const resolved = (requested === 'top' || requested === 'bottom')
              ? choosePlacement(
                  requested,
                  overlapPxFor('top', rect.top, rect.height, tooltipRect.height, gap, vh),
                  overlapPxFor('bottom', rect.top, rect.height, tooltipRect.height, gap, vh),
                )
              : requested;
            setPlacement(resolved);

            let top = 0;
            let left = 0;

            switch (resolved) {
              case 'top':
                top = rect.top - tooltipRect.height - gap;
                left = rect.left + (rect.width - tooltipRect.width) / 2;
                break;
              case 'bottom':
                top = rect.bottom + gap;
                left = rect.left + (rect.width - tooltipRect.width) / 2;
                break;
              case 'left':
                top = rect.top + (rect.height - tooltipRect.height) / 2;
                left = rect.left - tooltipRect.width - gap;
                break;
              case 'right':
                top = rect.top + (rect.height - tooltipRect.height) / 2;
                left = rect.right + gap;
                break;
              case 'center':
                top = window.innerHeight / 2 - tooltipRect.height / 2;
                left = window.innerWidth / 2 - tooltipRect.width / 2;
                break;
            }

            // Ensure tooltip stays on screen
            left = Math.max(VIEWPORT_MARGIN, Math.min(left, window.innerWidth - tooltipRect.width - VIEWPORT_MARGIN));
            top = Math.max(VIEWPORT_MARGIN, Math.min(top, window.innerHeight - tooltipRect.height - VIEWPORT_MARGIN));

            setTooltipPosition(prev => (prev.top === top && prev.left === left ? prev : { top, left }));
          }
          return `${rect.top}|${rect.left}|${rect.width}|${rect.height}`;
        };

        /* One settle loop at a time — every scroll frame calls updatePosition,
           and N overlapping loops would all chase the same rect. The loop ends
           on a few CONSECUTIVE unchanged frames, not the first one: a smooth
           scroll's easing can hold still for a frame before it gets going, and
           stopping there would leave the beat placed against the rect the
           scroll started from. */
        if (settleFrame.current !== null) cancelAnimationFrame(settleFrame.current);
        let seen = place();
        let frames = 0;
        let stable = 0;
        const settle = () => {
          const now = place();
          stable = now === seen ? stable + 1 : 0;
          seen = now;
          if (stable < SETTLE_STABLE_FRAMES && ++frames < SETTLE_FRAME_BUDGET) {
            settleFrame.current = requestAnimationFrame(settle);
          } else {
            settleFrame.current = null;
          }
        };
        settleFrame.current = requestAnimationFrame(settle);
      }
    };

    updatePosition();
    const resizeObserver = new ResizeObserver(updatePosition);
    const mutationObserver = new MutationObserver(updatePosition);

    /* A resize changes how much room each side has, so the beat has earned a
       fresh scroll — this is the one event that may re-run the once-per-step
       scroll above. */
    const onResize = () => {
      scrolledForStep.current = null;
      updatePosition();
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', updatePosition, true);

    /* Watch the document ALWAYS, not only when the target happens to be
       present at this instant. A multi-page tour navigates on step change,
       so the new page's DOM usually lands a tick AFTER this effect runs —
       gating the observer on the element being there already meant a step
       that arrived early never recovered, and (before the guard above) sat
       there showing the last step's spotlight instead. */
    mutationObserver.observe(document.body, { childList: true, subtree: true });
    const element = document.querySelector(step.targetSelector);
    if (element) resizeObserver.observe(element);

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', updatePosition, true);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      if (settleFrame.current !== null) {
        cancelAnimationFrame(settleFrame.current);
        settleFrame.current = null;
      }
    };
  }, [isOpen, step, currentStep]);

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    if (storageKey) {
      localStorage.setItem(storageKey, 'true');
    }
    onComplete();
    onClose();
  };

  const handleSkip = () => {
    if (storageKey) {
      localStorage.setItem(storageKey, 'true');
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999]">
      {targetRect && step.targetSelector ? (
        <>
          {/* Dark overlay with cutout */}
          <div
            data-testid="tour-spotlight"
            className="absolute rounded-lg animate-in fade-in zoom-in-95 duration-300"
            style={{
              top: targetRect.top - (step.highlightPadding || 8),
              left: targetRect.left - (step.highlightPadding || 8),
              width: targetRect.width + (step.highlightPadding || 8) * 2,
              height: targetRect.height + (step.highlightPadding || 8) * 2,
              boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.7), 0 0 0 9999px rgba(0, 0, 0, 0.8)',
              pointerEvents: 'none',
              zIndex: 10000
            }}
          />

          {/* Pulsing border */}
          <div
            className="absolute animate-pulse"
            style={{
              top: targetRect.top - (step.highlightPadding || 8) - 3,
              left: targetRect.left - (step.highlightPadding || 8) - 3,
              width: targetRect.width + (step.highlightPadding || 8) * 2 + 6,
              height: targetRect.height + (step.highlightPadding || 8) * 2 + 6,
              border: '3px solid rgba(59, 130, 246, 1)',
              borderRadius: '0.875rem',
              pointerEvents: 'none',
              zIndex: 10001
            }}
          />

          {/* Corner accents for better visual focus */}
          <div
            className="absolute"
            style={{
              top: targetRect.top - (step.highlightPadding || 8) - 8,
              left: targetRect.left - (step.highlightPadding || 8) - 8,
              width: targetRect.width + (step.highlightPadding || 8) * 2 + 16,
              height: targetRect.height + (step.highlightPadding || 8) * 2 + 16,
              pointerEvents: 'none',
              zIndex: 10001
            }}
          >
            {/* Top-left corner */}
            <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-fw-active rounded-tl-lg" />
            {/* Top-right corner */}
            <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-fw-active rounded-tr-lg" />
            {/* Bottom-left corner */}
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-fw-active rounded-bl-lg" />
            {/* Bottom-right corner */}
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-fw-active rounded-br-lg" />
          </div>

          {/* Animated pointer based on tooltip placement */}
          {step.placement && placement !== 'center' && (
            <div
              className="absolute animate-bounce"
              style={{
                ...(placement === 'top' && {
                  top: targetRect.top - (step.highlightPadding || 8) - 40,
                  left: targetRect.left + targetRect.width / 2 - 12,
                }),
                ...(placement === 'bottom' && {
                  top: targetRect.bottom + (step.highlightPadding || 8) + 16,
                  left: targetRect.left + targetRect.width / 2 - 12,
                }),
                ...(placement === 'left' && {
                  top: targetRect.top + targetRect.height / 2 - 12,
                  left: targetRect.left - (step.highlightPadding || 8) - 40,
                }),
                ...(placement === 'right' && {
                  top: targetRect.top + targetRect.height / 2 - 12,
                  left: targetRect.right + (step.highlightPadding || 8) + 16,
                }),
                pointerEvents: 'none',
                zIndex: 10001
              }}
            >
              <MousePointer className="w-6 h-6 text-fw-active drop-shadow-lg" />
            </div>
          )}
        </>
      ) : (
        <div className="absolute inset-0 bg-black bg-opacity-80 animate-in fade-in duration-300" />
      )}

      <div
        ref={tooltipRef}
        data-testid="tour-tooltip"
        className="absolute bg-fw-base rounded-2xl shadow-2xl border border-fw-secondary overflow-hidden animate-in fade-in zoom-in-95 duration-300"
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
          maxWidth: '420px',
          width: step.placement === 'center' ? '420px' : 'auto',
          zIndex: 10002
        }}
      >
        <div className="bg-gradient-to-r from-[#0057b8] to-fw-cobalt-700 px-6 py-4 text-white">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white bg-opacity-20 rounded-lg backdrop-blur-sm">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 data-testid="tour-title" className="text-figma-lg font-bold tracking-[-0.03em]">
                {step.title}
              </h3>
            </div>
            <button
              onClick={handleSkip}
              className="p-1 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
              aria-label="Close tour"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center gap-2 text-figma-sm text-white/80">
            <span data-testid="tour-progress" className="font-medium">Step {currentStep + 1} of {steps.length}</span>
            <div className="flex-1 h-1.5 bg-fw-cobalt-900/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="p-6">
          <p className="text-figma-base font-medium text-fw-body leading-relaxed mb-6">
            {readCopy(step.description)}
          </p>

          {step.action && (
            <button
              data-testid="tour-action"
              onClick={step.action.onClick}
              className="w-full mb-4 px-4 py-2.5 bg-fw-accent hover:bg-fw-accent border-2 border-fw-active text-fw-link font-medium rounded-full transition-all duration-200"
            >
              {step.action.label}
            </button>
          )}

          <div className="flex items-center justify-between gap-3">
            <button
              onClick={handleSkip}
              className="px-4 py-2 text-figma-base text-fw-bodyLight hover:text-fw-heading font-medium transition-colors"
            >
              Skip Tour
            </button>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className="!px-3"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={handleNext}
                className="!px-4 bg-fw-active hover:bg-fw-linkHover"
              >
                {isLastStep ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Finish
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
