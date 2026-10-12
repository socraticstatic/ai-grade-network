// The ways model as JSON for the portal team (2026-10-12, spec section 2 point 4): every way AT&T modeled, its clouds,
// monthly per cloud, setup level, who does it, what the customer does, its five scores; the four intent questions; the
// five criteria and their weights; the answers' rules in words; and the ranking rule in words. A starting point for
// their review, never a source. Run: node scripts/export-ways.mjs  -> docs/portal/ways.json
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as W from '../naas-ways.js';
import * as P from '../naas-portal.js';

const PREFER_WORDS = { bgp: 'a way where you run BGP yourself', transitive: 'the transit gateway' };
export function waysExport() {
  return {
    generated: new Date().toISOString(), source: 'naas-ways.js', placeholder: true,
    note: "AT&T's modeled ways and ranking, exported from the storefront prototype. Treat as a starting point for the team's option list, not a source.",
    ways: W.WAYS.map(w => ({ key: w.key, title: w.title, kicker: w.kicker, line: w.line, clouds: w.clouds, soon: !!w.soon, hosted: !!w.hosted, inspect: !!w.inspect,
      monthly: Object.fromEntries(w.clouds.map(c => [c, W.wayMonthly(w.key, c)])), setup: (W.SETUP_LEVEL[w.level] || [''])[0], setupWords: W.waySetup(w.key), time: w.time, proven: !!w.proven,
      who: w.who === 'att' ? 'AT&T' : 'You', youDo: w.youDo ? { short: w.youDo[0], words: w.youDo[1] } : null, products: w.products || [],
      scores: Object.fromEntries(Object.entries(w.score || {}).map(([k, v]) => [k, { score: v[0], words: v[1] }])) })),
    intent: W.INTENT.map(q => ({ key: q.key, label: q.label, options: q.opts.map(o => ({ key: o.key, label: o.label, words: o.title })) })),
    defaults: W.INTENT_DEFAULT,
    criteria: W.CRITERIA.map(c => ({ key: c.key, label: c.label, weight: c.weight })),
    rules: Object.entries(W.RULE).map(([answer, r]) => ({ answer, weights: r.w || {}, removes: r.miss ? `${r.miss[0]}: ${r.miss[1]}` : null, prefers: r.prefer ? PREFER_WORDS[answer] || 'a preferred way' : null })),
    ranking: 'Each answer adds or removes weight on the five criteria (never below 5, scaled to 100). A way scores each criterion 1 to 5; the weighted sum out of 100, plus 5 for each soft preference it meets, is its score. A hard rule a way breaks counts as a miss. Ways sort by fewest misses, then score, then the cheaper monthly.',
  };
}
/** The POP-to-region lookup the join reads. Rows marked verify are from memory of the AWS, Google and Azure lists and
 *  must be checked against them before the team relies on them. */
export function popRegionsExport() {
  return { generated: new Date().toISOString(), note: 'Each cloud publishes which regions a peering location serves (Microsoft: ExpressRoute locations; AWS: Direct Connect locations; Google: Interconnect facilities; Oracle: FastConnect locations). A row marked verify has not been checked against the current list.',
    confirmed: 'Azure Washington DC = Equinix DC2, DC6 -> East US, East US 2 (Microsoft ExpressRoute locations table, read 2026-10-12; AT&T NetBond is a listed provider there).',
    rows: P.POP_REGIONS.map(r => ({ csp: r.csp, provider: r.provider, facility: r.facility, metro: r.metro, location: r.location, regions: r.regions, verify: !!r.verify })),
    aliases: P.REGION_ALIAS };
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'portal');
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'ways.json'), JSON.stringify(waysExport(), null, 2) + '\n');
  writeFileSync(join(out, 'pop-regions.json'), JSON.stringify(popRegionsExport(), null, 2) + '\n');
  console.log('wrote docs/portal/ways.json and docs/portal/pop-regions.json');
}
