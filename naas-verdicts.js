// The written verdicts. One sentence per screen, derived from the estate and nothing
// else, so they can be asserted without a browser. Observe's verdict is `ob.verdict`
// in naas-addendum.js, which was already pure; it stays where it is. observeNext is
// the "next stop" panel below it, not a sentence: it takes `conns` and returns
// `{title, text, cta}`.
import { fmt, plural, connModeOf } from './naas-logic.js';

// Private is private (2026-09-30, owner decision b): a direct connect or an
// Equinix port is a private path, not the AT&T network, so the verdict says
// how each private region connects, in the order NetBond, direct, Equinix.
const PRIVATE_WAY = [
  ['netbond', () => 'on NetBond'],
  ['direct', (n) => (n === 1 ? 'on a direct connect' : 'on direct connects')],
  ['third', () => 'on Equinix Fabric'],
];
function privateClause(regions) {
  const n = regions.length;
  const ways = PRIVATE_WAY.map(([mode, say]) => { const k = regions.filter(r => connModeOf(r) === mode).length; return k ? { k, say: say(k) } : null; }).filter(Boolean);
  const head = `${n} ${n === 1 ? 'is' : 'are'} private`;
  if (ways.length === 1) return `${head}, ${ways[0].say}.`;
  return `${head}: ${ways.map(w => `${w.k} ${w.say}`).join(', ')}.`;
}

export function connectVerdict(est, layer = 'cloud', items = []) {
  if (est.stage === 'empty') return 'Nothing connected yet. AT&T already sees 41 metros with on-ramps and 12 clouds you could reach.';
  const cloud = layer === 'cloud';
  const base = cloud ? est.regionsList.map(r => ({ exposed: r.priv ? 0 : 1 })) : items;
  const exposedN = base.filter(t => t.exposed > 0).length;
  const totalN = base.length;
  const noun = cloud
    ? ['region', 'regions', 'still ride the public internet']
    : ['site', 'sites', 'reach clouds over the public internet'];
  if (!exposedN) return `Every ${noun[0]} is on a private path.`;
  const onFabric = totalN - exposedN;
  const privSay = cloud ? privateClause(est.regionsList.filter(r => r.priv)) : `${onFabric} ${onFabric === 1 ? 'is' : 'are'} on the AT&T network.`;
  // The rollup clause left (2026-09-28, no scrolling): the picture already
  // carries "N smaller regions rolled up", and the verdict holds to one line.
  return `${exposedN} of ${totalN} ${noun[1]} ${noun[2]}. ${onFabric ? privSay : 'None is on the AT&T network yet.'}`;
}

export function governVerdict(est) {
  if (est.stage === 'empty') return 'No policies yet. Three starting points below.';
  const pci = (est.findings.find(f => f.kind === 'pci') || {}).head;
  const tail = pci || `${est.policiesAuthored - est.policiesEnforced} authored but not enforced`;
  return `${est.policiesEnforced} policies enforced. ${tail.replace(/\.$/, '')}.`;
}

export function costVerdict(est, ob, totalSave, buckets = []) {
  if (est.stage === 'empty') return 'No egress seen yet.';
  if (totalSave) return `${fmt(totalSave)}/mo on the table across ${plural(est.findings.filter(f => f.priced).length, 'priced finding', 'priced findings')}. ${fmt(ob.savingsMo)}/mo already saved on AT&T.`;
  const steerable = buckets.filter(b => b.today > b.fabric);
  if (!steerable.length) return 'Every bucket is already on AT&T.';
  return `${fmt(steerable.reduce((a, b) => a + b.today, 0))}/mo leaves through public egress that the AT&T network would carry for ${fmt(steerable.reduce((a, b) => a + b.fabric, 0))}.`;
}

// The loop is Connect -> Observe -> Govern -> Cost -> Connect. Observe's stop is Govern,
// and it points at the one connection that would justify the policy. With nothing
// connected there is no connection to point at, so this gets its own branch, same as
// its three siblings (connectNext, governNext, costNext in naas-app.js).
export function observeNext(conns) {
  const rows = conns.rows || [];
  const deg = rows.find(r => r.degraded);
  return {
    title: 'Next stop: Govern',
    text: !rows.length
      ? 'Attach the first region to give Govern something to enforce.'
      : deg
        ? `${deg.wl.toLocaleString('en-US')} workloads behind ${deg.cloud} ${deg.region} ${deg.paths >= 2 ? 'have a second path but no policy that requires one' : 'ride a single path with no policy that requires a second'}. Author the policy, simulate it, then enforce it.`
        : 'Every connection is up. Set a latency SLO for the tags that still cross the public internet, then enforce it.',
    cta: 'Open Govern',
  };
}

// Andi's monthly briefing (notes, 2026-09-30, C3): four to six sentences for one
// role, from figures the page already shows, so the words and the page agree.
const ROLE_WORD = { exec: 'the executive team', architect: 'cloud architecture', neteng: 'network engineering', security: 'security', finops: 'FinOps' };
// The heads are whole clauses, some with their own ", and" and some two sentences
// long (review, 2026-09-30). In the list each gives its first sentence, lower-cased
// only when it opens on a common word (never Azure, AWS or a place), and the items
// split on semicolons so no clause's "and" runs into the list's.
const COUNT = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const COMMON_LEAD = /^(?:Both|Every|All|Each|No|None|Some|Most|One|Two|Three|Four|Five|Finance|Object|Hosted|Public|New)\b/;
const clause = (h) => { const c = String(h).split(/(?<=\.)\s+/)[0].replace(/\.$/, ''); return COMMON_LEAD.test(c) ? c[0].toLowerCase() + c.slice(1) : c; };
const listOf = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join('; ')}; and ${xs[xs.length - 1]}`);
function actionsLine(who, heads) {
  const all = heads || [], named = all.slice(0, 3).map(clause), word = COUNT[all.length] || String(all.length);
  if (!all.length) return `Nothing waits on ${who} this month.`;
  if (all.length > named.length) return `Of ${word} things waiting on ${who}, ${COUNT[named.length]} come first: ${listOf(named)}.`;
  return `For ${who}, ${word} ${all.length === 1 ? 'thing waits' : 'things wait'}: ${listOf(named)}.`;
}
export function briefingFor(role, f) {
  const n = (x, one, many) => `${x} ${x === 1 ? one : many}`;
  const who = ROLE_WORD[role] || 'you';
  const banked = f.bankedLastF && f.bankedLastF !== '$0' ? `Acting banked ${f.bankedLastF} last month` : 'Nothing was banked last month';
  return [
    `${n(f.open, 'finding', 'findings')} open${f.onTableF ? `, with ${f.onTableF}/mo potential savings` : ''}.`,
    `${banked}; this month AT&T found ${f.found ? n(f.found, 'finding', 'findings') : 'none'} and resolved ${f.resolved ? n(f.resolved, 'finding', 'findings') : 'none'}.`,
    // None open reads as words, never "Operations has 0 Sev 1 open now" (sweep, 2026-09-30).
    f.sev1
      ? `Operations has ${f.sev1} Sev 1 open now, ${n(f.ticketsOpen, 'ticket', 'tickets')} open${f.mttrF ? `, and fixes took ${f.mttrF} on average` : ''}.`
      : `No Sev 1 is open now; Operations has ${n(f.ticketsOpen, 'ticket', 'tickets')} open${f.mttrF ? `, and fixes took ${f.mttrF} on average` : ''}.`,
    f.availN ? `${f.availMet} of ${f.availN} connections met their availability target.` : '',
    actionsLine(who, f.top),
    f.nextMaint ? `Next AT&T maintenance: ${f.nextMaint}.` : '',
  ].filter(Boolean).join(' ');
}
