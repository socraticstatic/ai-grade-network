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
  { key: 'recommend', label: 'Recommendation', short: 'Recommend', icon: 'lightbulb', title: 'What to connect' },
  { key: 'connect', label: 'Connect', short: 'Connect', icon: 'cable', title: 'Connect' },
  // Act three (2026-10-08, Micah: "after the journey, 'see the dashboard' kind of leaves you hanging ... what if i want
  // to set a policy, or watch how much it might save me, or attach more?"): live, protected, and the saving over a year.
  { key: 'watch', label: 'Watch', short: 'Live', icon: 'verified', title: 'Live on AT&T' },
  { key: 'protect', label: 'Protect', short: 'Protect', icon: 'check-shield', title: 'Set a policy' },
  { key: 'save', label: 'Save', short: 'Save', icon: 'bill', title: 'What it saves' },
];
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
  return { sites: sites.length, metros: new Set(sites.map(s => s.metro).filter(Boolean)).size, dcs: sites.filter(s => /data center/i.test(s.cls || '')).length, groups,
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
  return { today: true, source: !!sourceAdded, found: !!sourceAdded, tag: !!tagsApplied, recommend: picked !== null && picked !== undefined, connect: !!placed, watch: !!live, protect: !!protectedBy, save: !!live };
}
