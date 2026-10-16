import * as CF from '../naas-connect-flow.js';
import { countOf } from '../naas-sites.js';

// Walks a compose through the connect flow (2026-09-30) to its Review, making
// the first decision a person could at each step that needs one, and passing
// every step in order. It works on the compose through the pure flow
// (naas-connect-flow.js) because vals() is too slow to call at every step of
// the dozens of orders the entry tests walk; each walk still ends in the
// page's own Review and Place order. Returns null when this estate cannot
// complete the order (Cloud to Cloud with one cloud, Colo to Colo with its
// data centers grouped), which the page says on the step.
export function decideFlow(cp, est) {
  const f = CF.flowOf(cp, est), k = CF.currentKey(f), why = CF.blockOf(k, f);
  const you = (field, value) => ({ ...cp, [field]: value, from: { ...(cp.from || {}), [field]: 'you' }, fk: k });
  if (!why) return cp;
  if (k === 'type') return you('ctype', 'Internet to Cloud');
  // Choose Provider picks the cloud (the storyboards, 2026-10-16); the region waits for Connection Profile.
  if (k === 'provider') {
    const clouds = [...new Set(est.regionsList.map(r => r.cloud))].filter(c => CF.cloudCarries(c, f.ctype));
    if (!clouds.length) return null;
    const pick = (cs) => ({ ...you('clouds', cs), cloud: cs[0] || null, regions: f.regions.filter(r => cs.includes(CF.cloudOfName(r))) });
    if (/second cloud/.test(why)) { const other = clouds.find(c => !CF.cloudsOf(f).includes(c)); return other ? pick([...CF.cloudsOf(f), other]) : null; }
    return pick([clouds[0]]);
  }
  if (k === 'endpoints') { const d = est.sites.filter(x => x.cls === 'Data center' && countOf(x.name) === 1); return d.length < 2 ? null : you('colo', { a: { site: d[0].name, fabric: 'Equinix Fabric' }, b: { site: d[1].name, fabric: 'ServiceFabric' } }); }
  if (k === 'basic') {
    if (/Paste the activation key/.test(why)) return you('actKey', 'LMCC-7F3A-9B4D-4E8F');
    if (/region/i.test(why)) {
      // One region per chosen cloud; a hosted order's where AT&T has a hub.
      const groups = CF.regionChoicesOf(f, est);
      const want = groups.map(g => f.regions.find(r => CF.cloudOfName(r) === g.cloud) || (g.regions.find(r => !r.off) || {}).name).filter(Boolean);
      return want.length === groups.length ? you('regions', want) : null;
    }
    if (/Maximum is live/.test(why)) return you('tier', 'Standard');
    if (/APN-VPN/.test(why)) return you('apn', CF.APN_VPN.find(m => m.status === 'Active').id);
    if (/EVC this order rides/.test(why)) return you('evc', CF.EVCS.find(e => e.status === 'Active').id);
    if (/metro|location/i.test(why)) { const ms = CF.metroOptions(f, est).map(m => m.metro); return you('loc', CF.tierOf(f) === 'Geodiversity' ? ms.slice(0, 2) : [ms[0]]); }
    if (/AWS account/.test(why)) return you('awsAccount', '123456789012');
    const fit = CF.bandwidthsFor(f).filter(b => CF.bwMbps(b) <= CF.cirOf(f));
    return you('bandwidth', fit[0]);
  }
  if (/always be true/.test(why)) return you('policy', ['Private path required']);
  if (k === 'terms') return you('term', 36);
  return cp;
}
export function walkFlow(cp, est) {
  for (let i = 0; i < 30; i++) {
    const f = CF.flowOf(cp, est), k = CF.currentKey(f);
    if ((k === 'review' || k === 'confirm') && !CF.blockOf(k, f)) return cp;
    if (CF.blockOf(k, f)) { cp = decideFlow(cp, est); if (!cp) return null; continue; }
    const keys = CF.stepKeysFor(f);
    cp = { ...cp, passed: [...new Set([...f.passed, k])], fk: keys[keys.indexOf(k) + 1], ...(k === 'basic' && !f.tier ? { tier: 'Standard' } : {}) };
  }
  throw new Error(`never reached Review: ${JSON.stringify(CF.flowOf(cp, est).passed)}`);
}
