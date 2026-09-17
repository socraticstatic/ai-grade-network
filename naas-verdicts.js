// The written verdicts. One sentence per screen, derived from the estate and nothing
// else, so they can be asserted without a browser. Observe's verdict is `ob.verdict`
// in naas-addendum.js, which was already pure; it stays where it is.
import { fmt } from './naas-logic.js';

export function connectVerdict(est, layer = 'cloud', items = []) {
  if (est.stage === 'empty') return 'Nothing connected yet. AT&T already sees 41 metros with on-ramps and 12 clouds you could reach.';
  const cloud = layer === 'cloud';
  const base = cloud ? est.regionsList.map(r => ({ exposed: r.priv ? 0 : 1 })) : items;
  const exposedN = base.filter(t => t.exposed > 0).length;
  const totalN = base.length;
  const noun = cloud
    ? ['region', 'regions', 'still ride the public internet']
    : ['site', 'sites', 'reach clouds over the public internet'];
  if (!exposedN) return `Every ${noun[0]} is on the AT&T fabric.`;
  const onFabric = totalN - exposedN;
  const extra = cloud && est.regionsExtra ? `, plus ${est.regionsExtra} smaller regions rolled up` : '';
  return `${exposedN} of ${totalN} ${noun[1]} ${noun[2]}. ${onFabric} ${onFabric === 1 ? 'is' : 'are'} on the AT&T fabric${extra}.`;
}

export function governVerdict(est) {
  if (est.stage === 'empty') return 'No policies yet. Three starting points below.';
  const pci = (est.findings.find(f => f.kind === 'pci') || {}).head;
  return `${est.policiesEnforced} policies enforced. ${pci || (est.policiesAuthored - est.policiesEnforced) + ' authored but not enforced.'}`;
}

export function costVerdict(est, ob, totalSave, buckets = []) {
  if (est.stage === 'empty') return 'No egress seen yet.';
  if (totalSave) return `${fmt(totalSave)}/mo on the table across ${est.findings.filter(f => f.priced).length} priced findings. ${fmt(ob.savingsMo)}/mo already saved on the fabric.`;
  const steerable = buckets.filter(b => b.today > b.fabric);
  if (!steerable.length) return 'Every bucket is already on the fabric.';
  return `${fmt(steerable.reduce((a, b) => a + b.today, 0))}/mo leaves through public egress that the fabric would carry for ${fmt(steerable.reduce((a, b) => a + b.fabric, 0))}.`;
}
