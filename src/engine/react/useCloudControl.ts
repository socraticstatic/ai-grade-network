import { useMemo, useRef, useSyncExternalStore } from 'react';
import { CC } from '../index';
import type { CloudControl, CloudControlEvent } from '../types';

/**
 * Module-level mutation counter.
 *
 * `useSyncExternalStore` requires `getSnapshot` to return a value that is
 * referentially stable between renders unless the underlying store actually
 * changed. A selector like `cc => cc.counts()` returns a brand-new object on
 * every call, so if `getSnapshot` returned `selector(CC)` directly, React
 * would see a "changed" snapshot on every render and throw/loop ("The result
 * of getSnapshot should be cached to avoid an infinite loop").
 *
 * Instead, `getSnapshot` returns this counter (a primitive, trivially
 * stable). It only increments when the engine actually emits a real mutation
 * event (i.e. anything other than a `hits` tick), so React only re-renders
 * when something real happened — never because a selector produced a new
 * object reference for the same underlying state.
 */
let version = 0;

/**
 * The same counter for subscribers that DO want telemetry ticks.
 *
 * Kept separate on purpose. `hits` fires every 3s for the life of the page and
 * carries the token meters with it, so a screen stating live meter figures has
 * to see it — but making every subscriber see it would re-render the whole
 * app on a timer. Each subscriber only ever advances its own counter, so a
 * live subscriber being mounted cannot drag the ordinary ones along.
 *
 * See `useCloudControlLive` for who opts in and why.
 */
let liveVersion = 0;

// Registering the same listener object twice (e.g. React invoking subscribe
// again in StrictMode) would double the increments per mutation; a Set of
// wrapped callbacks keyed by the original `cb` avoids that.
const wrappedByCallback = new WeakMap<() => void, (ev?: CloudControlEvent) => void>();
const liveWrappedByCallback = new WeakMap<() => void, (ev?: CloudControlEvent) => void>();

function subscribe(cb: () => void) {
  let wrapped = wrappedByCallback.get(cb);
  if (!wrapped) {
    wrapped = (ev) => {
      if (ev && ev.type === 'hits') return;
      version++;
      cb();
    };
    wrappedByCallback.set(cb, wrapped);
  }
  // The engine's subscribe() returns a real unsubscribe (state.ts), which is
  // what useSyncExternalStore's contract requires here — returning a no-op
  // left every component that ever mounted subscribed for the life of the
  // page. `wrapped` is stable per `cb` via the WeakMap above, so the teardown
  // removes exactly the listener this call registered.
  return CC.subscribe(wrapped);
}

function subscribeLive(cb: () => void) {
  let wrapped = liveWrappedByCallback.get(cb);
  if (!wrapped) {
    wrapped = () => {
      liveVersion++;
      cb();
    };
    liveWrappedByCallback.set(cb, wrapped);
  }
  return CC.subscribe(wrapped);
}

function getSnapshot() {
  return version;
}

function getLiveSnapshot() {
  return liveVersion;
}

/**
 * Subscribes a component to the Cloud Control engine (`window.CC`) and
 * returns the selected slice of state, re-rendering whenever the engine
 * mutates (telemetry `hits` ticks are intentionally excluded).
 *
 * Safe for selectors that return primitives (`cc => cc.counts().attached`)
 * AND selectors that return fresh objects/arrays each call
 * (`cc => cc.counts()`) — see the `version` counter above for why the latter
 * doesn't throw or infinite-loop.
 */
export function useCloudControl<T>(selector: (cc: CloudControl) => T): T {
  const selectorRef = useRef(selector);
  selectorRef.current = selector;

  const v = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // Re-run the selector only when the engine's version actually changes, not
  // on every render — this is what keeps an object-returning selector from
  // producing a "new" value each render even though the store snapshot (v)
  // is stable.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => selectorRef.current(CC), [v]);
}

/**
 * Same contract as `useCloudControl`, but also re-runs on telemetry `hits`.
 *
 * ## Why this exists
 *
 * `hits` fires every 3s and carries `_.tickTokens` with it, so the AI token
 * meters move while a viewer sits on a page. `useCloudControl` drops the event
 * — correctly, for the ~30 surfaces whose figures only change on a mutation —
 * which means a screen subscribed through it freezes at its mount instant.
 *
 * That was invisible while one screen stated token money. The domain split
 * created a second: `/ai/observe` (Cost + Savings KPIs) and `/ai/cost` (Spend
 * today) now state the same derivation on two screens a viewer crosses
 * between. Mounted at different instants, they froze at different values and
 * disagreed by a tick or two — the same estate, two figures, measured
 * disagreeing on 3 of 5 crossings.
 *
 * ## What it costs
 *
 * One extra React render per 3s tick, per mounted subscriber. It is opt-in for
 * exactly that reason: only the two AI money surfaces use it, so the nav,
 * Discover, and every NaaS screen still ignore `hits` exactly as before. Both
 * of these screens describe themselves as live ("the fabric meters spend as
 * requests are routed", "live meters across every identity"), so the render is
 * the behaviour the copy already claims.
 */
export function useCloudControlLive<T>(selector: (cc: CloudControl) => T): T {
  const selectorRef = useRef(selector);
  selectorRef.current = selector;

  const v = useSyncExternalStore(subscribeLive, getLiveSnapshot, getLiveSnapshot);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => selectorRef.current(CC), [v]);
}

/** Returns the engine handle directly, for calling mutations from components. */
export function useCloudControlActions(): CloudControl {
  return CC;
}
