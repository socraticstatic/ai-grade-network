/*
 * AT&T AI-grade Network — NaaS storefront prototype
 * Copyright (c) 2026 AT&T Intellectual Property. All rights reserved.
 *
 * AT&T proprietary and confidential. Provided for evaluation and
 * integration by AT&T and its authorised partners. Not for redistribution.
 */
// The existing customer's journey (Micah, 2026-10-08: "really focus on the journey for an AT&T existing already last
// mile, they want to add a new source, they want to tag maybe attach, identify workloads maybe, see recommendations,
// and maybe upsell the customer with cloud connect ... story-based, and sequential, without too many words").
// Six beats, one screen each, the rail their list: what AT&T carries today, add a cloud source, what it found, tag
// the workloads, the recommendation, and the Cloud Connect order. A presenter drives it on scripted data: the estate
// is ESTATES.lastmile (AT&T sites, no cloud yet) and the source it adds is FOUND_SOURCES.Azure.
// Pure: the view words and draws it; naas-app.js holds the state and the doors.

export const BEATS = [
  { key: 'today', label: 'Today', short: 'Today', icon: 'home', title: 'Your network on AT&T' },
  { key: 'source', label: 'Add a source', short: 'Source', icon: 'plus', title: 'Add a cloud source' },
  { key: 'found', label: 'What it found', short: 'Found', icon: 'search', title: 'What it found' },
  { key: 'tag', label: 'Tag', short: 'Tag', icon: 'checklist', title: 'Tag your workloads' },
  // Intent before the recommendation (2026-10-08, Micah: "Before recommendations we need some kind of intent screen, and
  // need to impact choices, and policy options"): purpose, traffic, security, routing; the answers rank the ways
  // (W.rankWays) and shape the policy deck (intentCard).
  { key: 'intent', label: 'Intent', short: 'Intent', icon: 'target', title: 'What it needs' },
  { key: 'recommend', label: 'Recommendation', short: 'Recommend', icon: 'lightbulb', title: 'What to connect' },
  { key: 'connect', label: 'Connect', short: 'Connect', icon: 'cable', title: 'Connect' },
  // Act three (2026-10-08, Micah: "after the journey, 'see the dashboard' kind of leaves you hanging ... what if i want
  // to set a policy, or watch how much it might save me, or attach more?"): live, protected, and the saving over a year.
  { key: 'watch', label: 'Watch', short: 'Live', icon: 'verified', title: 'Live on AT&T' },
  { key: 'protect', label: 'Protect', short: 'Protect', icon: 'check-shield', title: 'Set a policy' },
  { key: 'save', label: 'Save', short: 'Save', icon: 'bill', title: 'What it saves' },
];
/** The policy deck (2026-10-08, "Protect needs visual and options love"): one card per tag on the cloud, each a real
 *  intent the engine evaluates. Known tags carry their own intent; a tag of your own keeps a private path. */
export const DECK = [
  ['PCI', 'Private path required', 'never touches the internet', 'padlock', 'core'],
  ['Finance', 'Private path required', 'stays on AT&T', 'padlock', 'core'],
  ['Internet-facing', 'Inline security inspection', 'is inspected in path', 'firewall', 'edge'],
  ['Prod', 'No direct internet path', 'never reaches the internet directly', 'not-available', 'core'],
];
export function policyDeck(rows, intent = {}) {
  // A lab keeps its compliance tags' policies and drops the production one (no direct internet path).
  const tags = [...new Set(rows.flatMap(r => (r.applied.length ? r.applied : r.suggested)))].filter(t => !(intent.purpose === 'lab' && t === 'Prod'));
  const order = (t) => { const i = DECK.findIndex(d => d[0] === t); return i < 0 ? 99 : i; };
  return tags.sort((a, b) => order(a) - order(b)).map(tag => { const d = DECK.find(x => x[0] === tag) || [tag, 'Private path required', 'stays on AT&T', 'padlock', 'core'];
    const apps = rows.filter(r => (r.applied.length ? r.applied : r.suggested).includes(tag));
    return { tag, req: d[1], word: d[2], icon: d[3], layer: d[4], name: `${tag} ${d[1] === 'Inline security inspection' ? 'inspection' : d[1] === 'No direct internet path' ? 'no direct internet' : 'private path'}`, match: `tag ${tag}`, apps: apps.map(a => a.name), appKeys: apps.map(a => a.key), wl: apps.reduce((s, a) => s + (a.wl || 0), 0) }; });
}
/** What the intent asks of the whole cloud, as one policy: each answer that needs the path to do something adds its
 *  requirement (two paths, a latency SLO, inspection, a per-service allow-list, segments). Null when nothing does. */
export const INTENT_PARTS = {
  critical: ['Two paths, diverse metros', 'rides two paths', 'merge', 'Two paths'],
  priority: ['Latency SLO 20 ms', 'is held to 20 ms', 'high-meter', '20 ms SLO'],
  inspected: ['Inline security inspection', 'is inspected in path', 'firewall', 'Inspected'],
  service: ['Per-service allow-list', 'is allow-listed per service', 'restricted', 'Allow-list'],
  transitive: ['Segment by environment', 'is segmented by environment', 'global-network', 'Segments'],
};
export function intentCard(intent = {}, found = { regions: [] }, rows = []) {
  const parts = ['purpose', 'traffic', 'security', 'routing'].map(k => INTENT_PARTS[intent[k]]).filter(Boolean);
  if (!parts.length || !found.regions.length) return null;
  return { tag: 'Intent', intent: true, req: parts.map(p => p[0]).join(' and '), word: parts.map(p => p[1]).join(', ').replace(/, (?=[^,]*$)/, ' and '), icon: 'target', layer: 'core',
    short: parts.map(p => p[3]).join(' · '), parts: parts.map(p => ({ key: p[3], icon: p[2], t: p[3], title: p[0] })),
    name: `${found.cloud} intent`, match: `region ${found.regions.map(r => r.region).join(',')}`, apps: rows.map(a => a.name), appKeys: rows.map(a => a.key), wl: rows.reduce((a, r) => a + (r.wl || 0), 0) };
}
/** The policy beat 8 proposes, from the tags you applied: the most sensitive tag on the cloud keeps off the internet. */
export const POLICY_TAGS = [['PCI', 'Private path required', 'never touches the internet'], ['Finance', 'Private path required', 'stays on AT&T'], ['Prod', 'No direct internet path', 'never reaches the internet directly']];
export function proposedPolicy(est, rows = []) {
  const tags = new Set(rows.length ? rows.flatMap(r => r.applied.length ? r.applied : r.suggested) : (est.regionsList || []).filter(r => r.fresh).flatMap(r => r.tags || []));
  const hit = POLICY_TAGS.find(([t]) => tags.has(t));
  return hit ? { tag: hit[0], req: hit[1], word: hit[2], name: `${hit[0]} private path`, match: `tag ${hit[0]}` } : null;
}
export const JOURNEY_ESTATE = 'lastmile';
export const DEMO_SOURCE = 'Azure';

/** The access a site rides, as AT&T sells it. */
const SERVICE = [
  ['avpn', /AVPN/, 'AVPN', 'router', 'AVPN (MPLS VPN)'],
  ['ase', /ASE/, 'Ethernet', 'ethernet', 'AT&T Switched Ethernet'],
  ['adi', /ADI/, 'Internet', 'globe', 'AT&T Dedicated Internet'],
  ['abf', /ABF|Business Fiber/, 'Fiber', 'cable', 'AT&T Business Fiber'],
];
/** Beat 1: the sites AT&T carries, by the access it sells them. */
export function todayOf(est) {
  const sites = est.sites || [];
  const groups = SERVICE.map(([key, re, label, icon, full]) => ({ key, label, icon, full, n: sites.filter(s => re.test(s.access || '')).length })).filter(g => g.n);
  // Every site, grouped by the access it rides (Micah, 2026-10-08: "the 20 on the left - look at how much space is wasted"):
  // the stage draws one glyph per real site, so the sentence's 20 is the picture, not a number in an empty card.
  const cells = SERVICE.flatMap(([key, re, , icon, full]) => sites.filter(s => re.test(s.access || '')).map(s => ({ key: s.name, group: key, icon, name: s.name, metro: s.metro || '', cls: s.cls || '', full })));
  return { sites: sites.length, metros: new Set(sites.map(s => s.metro).filter(Boolean)).size, dcs: sites.filter(s => /data center/i.test(s.cls || '')).length, groups, cells,
    clouds: (est.regionsList || []).length };
}

/** Beat 2: the clouds a source can read; the demo reads Azure (Oracle reads too). */
export const PROVIDERS = [
  { key: 'Azure', name: 'Microsoft Azure', mark: 'brand/providers/azure.svg', cred: 'Reader role on the subscription', live: true },
  { key: 'AWS', name: 'AWS', mark: 'brand/providers/aws.svg', cred: 'Read-only IAM role', live: true },
  { key: 'GCP', name: 'Google Cloud', mark: 'brand/providers/google-icon.svg', cred: 'Viewer service account', live: false },
  { key: 'Oracle', name: 'Oracle Cloud', mark: 'brand/providers/oracle.svg', cred: 'Read-only policy', live: false },
];

/** The tags a workload earns from what it is and where it runs (beat 4 suggests them; you apply them). */
const SUGGEST = [
  [/payment|card|checkout/i, ['PCI', 'Prod']],
  [/ledger|finance|payable|erp/i, ['Finance', 'Prod']],
  [/portal|web|ebs/i, ['Internet-facing', 'Prod']],
];
export function suggestedTags(app, regionTags = []) {
  const hit = SUGGEST.find(([re]) => re.test(`${app.name} ${app.purpose}`));
  return [...new Set([...(hit ? hit[1] : ['Prod']), ...regionTags.filter(t => t !== 'Prod')])];
}

/** Beat 3: the regions and workloads the new source found, each region's path today. */
export function foundOf(est, done = []) {
  // The cloud this pass of the journey is about: the newest source, never one already carried through (attach more).
  const fresh = (est.regionsList || []).filter(r => r.fresh && !done.includes(r.cloud));
  // A region's own tags seed the suggestions; the ones you apply join it, and must not suggest themselves to its other workloads.
  const regions = fresh.map(r => ({ key: r.region, cloud: r.cloud, region: r.region, wl: r.wl, ms: r.pub, priv: !!r.priv, tags: r.baseTags || r.tags || [],
    apps: (r.apps || []).map(([name, version, port, purpose, kind]) => ({ key: `${r.region}:${name}`, name, version, port, purpose, kind, region: r.region })) }));
  const apps = regions.flatMap(r => r.apps.map(a => ({ ...a, wl: Math.max(1, Math.round(r.wl / Math.max(1, r.apps.length))), regionTags: r.tags })));
  return { has: regions.length > 0, regions, apps, wl: regions.reduce((a, r) => a + r.wl, 0), publicN: regions.filter(r => !r.priv).length, cloud: (regions[0] || {}).cloud || '' };
}

/** Beat 4: each workload with its suggested tags and the ones applied. */
export function tagRows(found, applied = {}) {
  return found.apps.map(a => { const sug = suggestedTags(a, a.regionTags), on = applied[a.key] || [];
    return { ...a, suggested: sug, applied: on, done: sug.every(t => on.includes(t)) }; });
}

/** Where the journey is: a beat is done once its work is, so the rail and Next agree. */
export function progressOf({ sourceAdded, tagsApplied, picked, placed, live, protectedBy }) {
  return { today: true, source: !!sourceAdded, found: !!sourceAdded, tag: !!tagsApplied, intent: !!tagsApplied, recommend: picked !== null && picked !== undefined, connect: !!placed, watch: !!live, protect: !!protectedBy, save: !!live };
}
