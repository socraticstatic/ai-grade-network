import type { FabricModel } from '../connect/FabricHero';

/** Phase-1 verdict for Discover: the estate in one sentence pair. */
export function discoverVerdict(model: FabricModel): string {
  const total = model.regions.length;
  if (!total) return 'No estate mapped yet. Connect a cloud to begin.';
  const clouds = new Set(model.regions.map(r => r.cloudId)).size;
  const attached = model.regions.filter(r => r.path === 'private').length;
  const pub = total - attached;
  // Row 18 of the phase-0 metric audit: the sentence opened on inventory
  // ("spans 9 regions") and buried the gap in its last clause. Same three
  // numbers, reordered so the gap leads — copy only.
  return `${pub} of your ${total} cloud region${total === 1 ? '' : 's'} still ride${pub === 1 ? 's' : ''} the public internet. ` +
    `${attached} ${attached === 1 ? 'is' : 'are'} on the AT&T fabric, across ${clouds} cloud${clouds === 1 ? '' : 's'}.`;
}
