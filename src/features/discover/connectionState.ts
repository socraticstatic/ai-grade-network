import type { CloudControl } from '../../engine/types';

/**
 * Connection-state derivation for the Discover estate rows.
 *
 * Pure Discovery frames every cloud and region as either reached over the
 * AT&T fabric (a private on-ramp) or exposed over the public internet. The
 * truth lives in the engine's fabric model: `CC.fabricModel().regions` shapes
 * each region with `path: 'private' | 'public'` and `attached`. A region is
 * connected when its fabric path is private (an active on-ramp reaches it); a
 * cloud is connected when any of its regions is.
 *
 * The specific transport product (NetBond / Direct Connect / ExpressRoute) is
 * abstracted away here — Discover only ever says "via the AT&T fabric". The
 * on-ramp is detail-on-demand, surfaced on Connect.
 */

export type ConnState = 'connected' | 'public';

export interface ConnMeta {
  state: ConnState;
  connected: boolean;
  /** Short row label: "via the AT&T fabric" vs "public internet". */
  label: string;
  /** lucide-react icon name for the inline indicator. */
  icon: 'link' | 'globe';
}

/** The engine's fabric regions, defensively defaulted to []. */
function fabricRegions(cc: CloudControl) {
  const model = cc.fabricModel?.();
  return model?.regions ?? [];
}

/** A region is connected when its fabric path is private (active on-ramp). */
export function regionConnection(cc: CloudControl, cloudId: string, regionId: string): ConnState {
  const fr = fabricRegions(cc).find(r => r.cloudId === cloudId && r.regionId === regionId);
  return fr && fr.path === 'private' ? 'connected' : 'public';
}

/** A cloud is connected when any of its regions is reached over the fabric. */
export function cloudConnection(cc: CloudControl, cloudId: string): ConnState {
  const anyPrivate = fabricRegions(cc).some(r => r.cloudId === cloudId && r.path === 'private');
  return anyPrivate ? 'connected' : 'public';
}

/** Presentation metadata for a connection state — label + icon, no amber. */
export function connMeta(state: ConnState): ConnMeta {
  return state === 'connected'
    ? { state, connected: true, label: 'via the AT&T fabric', icon: 'link' }
    : { state, connected: false, label: 'public internet', icon: 'globe' };
}
