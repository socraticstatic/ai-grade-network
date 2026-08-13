// Load the model modules in dependency order; each extends window.CC.
import './state';
// Must load immediately after ./state, before every other state-* module:
// estateProfile's boot side effect swaps the meridian/acme seed arrays in
// place, and state-billing (loaded below) freezes its steer baseline from
// those same arrays at import time - swap after that and billing's numbers
// are silently stuck on the wrong estate.
import './estateProfile';
import './state-telemetry';
/* Groups must load BEFORE state-rules: flows() tags every flow with group
   membership via CC.groupsFor, and state-billing calls flows() at module load
   to freeze its steer baseline. Load groups later and that call throws into
   billing's try/catch, leaving the steer baseline silently empty. */
import './state-groups';
import './state-rules';
import './state-routing';
import './state-managed';
import './state-apps';
import './state-billing';
import './state-console';
import './state-intents';
import './state-assessment';
import './state-findings';
import './state-share';
import './state-actions';
import { applyTokenScale, resolveProfile } from './estateProfile';
import type { CloudControl } from './types';

/* The AI layer's scale, applied once every state-* module above has
   loaded - state-billing owns the token meters and does not exist when
   estateProfile's own boot swap runs. */
if (typeof location !== 'undefined') {
  applyTokenScale(resolveProfile(location.search, localStorage));
}

export const CC = (window as unknown as { CC: CloudControl }).CC;
export type { CloudControl } from './types';
