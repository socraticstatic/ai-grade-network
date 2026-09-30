/*
 * AT&T AI-grade Network — NaaS storefront prototype
 * Copyright (c) 2026 AT&T Intellectual Property. All rights reserved.
 *
 * AT&T proprietary and confidential. Provided for evaluation and
 * integration by AT&T and its authorised partners. Not for redistribution.
 */
import * as D from './naas-data.js';
import { filterSites, buRows, regionRows, regionOf, onAtt, fmt, pct, plural, estatePhrase, heroLayout, edgePath, arcPath, drillLevel, sankey, RX, FOLDED_SIDE, SITES_END, headUnits, graphUnits , connModeOf, CONN_LABEL, siteModeOf } from './naas-logic.js';
import * as A from './naas-addendum.js';
import * as R from './naas-round2.js';
import * as S from './naas-sites.js';
import * as P from './naas-paths.js';
import * as X from './naas-connections.js';
import * as F from './naas-flowmap.js';
import * as OD from './naas-observe-dash.js';
import * as G from './naas-segments.js';
import * as FB from './naas-fabric.js';
import * as V from './naas-volume.js';
import * as SCH from './naas-schedule.js';
import * as VD from './naas-verdicts.js';
import * as LC from './naas-lifecycle.js';
import { POLICY_LAYERS, policyLayers, layerOfReq, MULTI_LAYER } from './naas-policy-layers.js';
import { appsOf } from './naas-apps.js';

const SCREENS = { s0: 'Front door', s1: 'Discover', s2: 'Floor', s3: 'Department', s4: 'Compose', s5: 'Recommend', s6: 'Review', s7: 'Marketplace', s8: 'Product', s9: 'Help' };
const TABS = ['connect', 'govern', 'observe', 'cost'];

// One layer for sub-content, shared by every page. Each page is a hero plus a
// stack of drill-downs of that hero: Discover's picture over accounts, gap and
// paths; Observe's flow map over insights and logs; Cost's egress over forecast
// and charges. Stacked on the page they are 1285px, 2173px and ~1000px of
// scroll. A page declares its panels here and one aside renders whichever is
// open. Adding Observe or Cost is a new entry, not new markup.
export const SUB_PANELS = {
  // Discover owns the reading of the estate. Connect owns what to do about it.
  // Sources is a page (source management); the drawer adds a source, or edits
  // one's credential, scope and schedule (Micah, 2026-09-23).
  discover: [
    { key: 'add', label: 'Add a source' },
    { key: 'run', label: 'Discovery run' },
  ],
  connect: [],
  // Every page view is a tab on its page (Micah, 2026-09-29: "what else is boxed?"): the drawer only adds or edits a source.
  observe: [],
  govern: [],
  cost: [],
};

// The lifecycle, in the order the work happens. Discover is the inventory: what
// you have. Connect is the work of getting it onto the AT&T network. The app had these
// two swapped - the connect tab was labelled Discover and the inventory was
// exiled to "Explore 360" underneath it - which is why they read as rivals.
export const STOPS = [
  { key: 'discover', label: 'Discover', screen: 's1' },
  { key: 'connect', label: 'Connect', tab: 'connect' },
  { key: 'observe', label: 'Observe', tab: 'observe' },
  { key: 'govern', label: 'Govern', tab: 'govern' },
  { key: 'cost', label: 'Cost', tab: 'cost' },
];

// Which rail a customer gets is decided by what is on AT&T, not by which
// page they are standing on. Nothing attached means the job is a line with an
// end: get connected. Something attached means the job is a loop: keep it right.
export function railFor(est) {
  return { sequence: !est || !est.attachedRegions };
}

// The line. Each step appears only once it can act, so a customer is never
// offered a door to an empty room. Ordering is not a step: you do not navigate
// to Order, you order the thing you picked in Options.
// Each step wears its section's icon (notes, 2026-09-30: one icon per link).
export const STEPS = [
  { key: 'sources', label: 'Sources', icon: 'lock', ready: () => true },
  { key: 'estate', label: 'Estate', icon: 'apis', ready: (est) => est.regions > 0 },
  { key: 'options', label: 'Options', icon: 'cable', ready: (est) => est.regions > 0 },
];

// The loop. Exposed is a filter on the estate, not a stop of its own. Records
// are named once. What needs you is Home, because it spans all five.
export const SECTIONS = {
  discover: [
    ['@estate', 'Estate', 'apis'],
    ['@sources', 'Sources', 'lock'],
  ],
  connect: [
    ['sec-paths', 'Options', 'cable'],
    ['@orders', 'Orders', 'shopping-bag'],
  ],
  observe: [
    // Health is where "Observe" itself lands, so it gives its slot to Insights
    // (2026-09-28): the six cards and the findings open in the layer, and with
    // no rail link they were reachable only through Records' tab strip.
    ['sec-flow', 'Traffic', 'hub'],
    ['@insights', 'Insights', 'lightbulb'],
    ['@logs', 'Logs', 'checklist'],
  ],
  govern: [
    ['sec-policies', 'Violations', 'check-shield'],
    ['sec-starting', 'Policies', 'grid'],
  ],
  // One Cost door (Micah, 2026-09-29: "combine savings and forecast with spend"), then
  // Optimize ahead of it (notes, 2026-09-30: "Cost --> Optimize ... What should I change first?").
  cost: [
    ['sec-optimize', 'Optimize', 'high-meter'],
    ['sec-spend', 'Spend', 'bill'],
  ],
};
const TAB_LABEL = { connect: 'Connect', govern: 'Govern', observe: 'Observe', cost: 'Cost' };
const TIERS = ['Start here', 'Recommended', 'Full control'];
const PERSONA_PRODUCT = { 'Steer this bucket on AT&T': 'steer', 'Steer every internet bucket': 'steer', 'Hosted VPC with AT&T egress for the region': 'hosted-vpc', 'Cloud to Cloud for the pair': 'c2c', 'Multi-region, multi-cloud routing': 'c2c', 'Neocloud reach via Equinix Fabric': 'neocloud', 'Hosted VPC in us-east-1 with the policy enforced': 'hosted-vpc', 'Hosted VPC in us-west-2 with the policy enforced': 'hosted-vpc', 'Hosted VPC plus inline inspection': 'hosted-vpc', 'NGFW (Palo Alto) in path': 'ngfw', 'Hosted VPC with the vSRX pair and AT&T egress': 'hosted-vpc', 'Advanced Network Monitoring for the estate': 'monitoring', 'Advanced Network Monitoring for APAC': 'monitoring', 'Managed NOC with path telemetry': 'noc', 'AWS Interconnect Last Mile, maximum resiliency': 'lmcc', 'Add a second ADI circuit': 'adi', '14-day AI traffic assessment': 'ai-assess', 'Add the providers to AI Fabric': 'ai-gov', 'Virtual keys with team limits': 'ai-gov', 'Connection Hub in Atlanta': 'hub', 'Connection Hubs in Atlanta and Chicago': 'hub', "Segmentation across the region's hosted VNet": 'hosted-vnet' };

// The connect tab's stat line counts cloud regions. Off the cloud layer, the verdict
// above it (naas-verdicts.js connectVerdict) counts sites instead, a different
// subject, so the region/attached count would contradict it rather than agree.
// Pulled out so both branches can be asserted without a browser.
export function connectStat(est, layer) {
  if (layer !== 'cloud') return '';
  return `${est.regionsList.filter(r => !r.priv).length} of ${est.regionsList.length} regions public · ${est.attachedRegions} attached · ${(est.sitesCount || est.sites.length).toLocaleString('en-US')} sites`;
}

// The hash is the app's only route. Pulled out of the listener so it can be asserted
// without a browser, and so an s1 landing can start its scan.
export function hashRoute(hash) {
  const h = (hash || '').replace('#', '').split('/');
  const p = {};
  if (SCREENS[h[0]]) p.screen = h[0];
  if (h[1] && D.LAYERS.find(l => l.id === h[1])) p.layer = h[1];
  if (h[2] && TABS.includes(h[2])) p.tab = h[2];
  return p;
}

export function init(c) {
  // The hash was read once at boot, so a link to #s3/cloud/cost only worked on
  // a cold load - pasting it into an open tab changed the URL and nothing else.
  if (!window.__naasHashWired) {
    window.__naasHashWired = true;
    window.addEventListener('hashchange', () => {
      const p = hashRoute(location.hash);
      if (!Object.keys(p).length) return;
      c.setState(p);
      // Discover reached by a hash change never ran startScan, so the spinner
      // spun forever on a scanStep that nothing was advancing. It must not run
      // again on every arrival: walking back to a page you have already read is
      // not a reason to re-read four cloud accounts.
      if (p.screen === 's1' && (c.state.scanStep || 0) < 4) runScan(c, estateFor({ ...c.state, ...p }));
    });
  }
  try { const h = localStorage.getItem('naas.headOpen'); if (h === 'false') c.setState({ headOpen: false }); } catch (e) {}
  try { if (localStorage.getItem('naas.openHint') === 'seen') c.setState({ openHintSeen: true }); } catch (e) {}
  try { const h = localStorage.getItem('naas.hero'); if (h) c.setState({ heroOpen: JSON.parse(h) }); } catch (e) {}
  try { const fl = localStorage.getItem('naas.life'); if (fl) c.setState({ findingLife: JSON.parse(fl) }); } catch (e) {}
  try { const tg = JSON.parse(localStorage.getItem('naas.tags') || 'null'); if (tg) c.setState({ siteTags: tg.siteTags || {}, buCustom: tg.buCustom || {} }); } catch (e) {}
  const q = new URLSearchParams(location.search);
  const hash = (location.hash || '').replace('#', '').split('/');
  const patch = {};
  if (q.get('view')) patch.view = q.get('view');
  const estateQ = q.get('estate'), estateId = estateQ === 'meridian' ? 'trust' : estateQ;
  if (estateId && D.ESTATES[estateId]) { patch.estateParam = estateId; if (!q.get('view')) patch.view = estateId; }
  if (q.get('mode') === 'browse') patch.screen = 's7';
  if (q.get('category')) { patch.screen = 's7'; patch.browseCat = q.get('category'); }
  if (SCREENS[hash[0]]) patch.screen = hash[0];
  if (!patch.screen && (c.state.screen || 's0') === 's0' && (patch.view || c.state.view) !== 'empty') { patch.screen = 's3'; patch.layer = 'cloud'; patch.tab = 'connect'; }
  if (hash[1] && D.LAYERS.find(l => l.id === hash[1])) patch.layer = hash[1];
  if (hash[2] && TABS.includes(hash[2])) patch.tab = hash[2];
  c.setState(patch);
  if ((patch.screen || c.state.screen) === 's1') runScan(c, estateFor({ ...c.state, ...patch }));
}

// Every naas.* key the app saves (2026-09-30). Reset demo clears them all, so a
// rehearsal's Acknowledge, Snooze, tags or open panels never reach Monday.
export const DEMO_KEYS = ['naas.life', 'naas.tags', 'naas.hero', 'naas.openHint', 'naas.headOpen'];
export function defaults() {
  return {
    // Network Engineering on the Growing estate is the default story (2026-09-28).
    screen: 's0', view: 'partial', persona: 'neteng', estateParam: null, addedSources: [], healthView: 'app', segOpen: null, segTrail: [], segPage: 0, pathSel: null, pathsPage: 0, changesPage: 0, opsPanel: 'overview', andiTickets: true, ticketPage: 0, fixPage: 0, availPage: 0, changePage: 0, rolePage: 0, briefCfg: { cadence: 'monthly' }, mode: 'foryou', theme: 'light', layer: 'cloud', tab: 'connect', logPage: 0, actPage: 0, placeTrail: [], cloudTrailE: [], siteFilter: {}, svcMenu: false, cnPage: 'picture', nowIso: null, prodPanel: 'get', findingLife: {}, fdKey: null, findFilter: 'open', siteGroup: 'region', saveGroup: 'region', siteTags: {}, buCustom: {}, buActive: null, buNew: '',
    steered: [], inv: {}, invSel: [], obTab: 'flow', groupBy: 'Path', breakdownOpen: false, events: [],
    drill: [], sub: null, regionDrill: null, hoverRegion: null, hoverNode: null, bandOpen: false, picked: [], scanStep: 0, treeOrMap: 'tree', openWorkload: null, treeOpen: {}, chips: [],
    compose: { outcome: null, source: [], dest: [], regionTab: 'US East', metros: [], resiliency: 'Standard', control: [] }, freeText: '',
    order: null, submitted: false, pendingDismissed: false, browseQuery: '', browseCat: null, browseSort: 'popular', filtersOpen: false, filterProviders: [], priceCeil: 0, product: null,
    simulated: false, enforced: false, whyOpen: null, levelSort: 'largest', levelQuery: '', intakeOrg: '', intakeSource: 'credential', intakeProvider: 'AWS', approver: 'j.martinez@meridianlogistics.com', term: 36,
  };
}

export function estateFor(s) {
  // ?estate= names an estate outright; it used to be read only when the view
  // was 'live', so ?estate=meridian on its own silently showed the default.
  // Sources added in this session join the estate they were added to (2026-09-30).
  const base = s.estateParam && D.ESTATES[s.estateParam] ? D.ESTATES[s.estateParam] : s.view === 'live' ? D.ESTATES.partial : D.ESTATES[s.view] || D.ESTATES.mature;
  return SCH.withSources(base, s.addedSources || []);
}

export function scrollToResult(label) {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const el = document.querySelector('[data-screen-label="' + label + '"]');
    if (!el) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 16, behavior: 'smooth' });
  }));
}

/**
 * The detail panel's information design.
 *
 * It was one flat run of thirteen label/value rows, every fact weighted the
 * same, the state buried in the middle as the word "Degraded", and long
 * values ellipsised because they had one line to live on. Nothing told you at
 * a glance what this thing is or whether it is in trouble.
 *
 * Three moves. The state leaves the list and becomes a chip beside the title.
 * The two or three numbers worth reading first become tiles. What is left is
 * grouped under quiet headers, because "Metro" and "P95" are not the same
 * kind of fact.
 *
 * Driven off the key names the panel builders already emit, so every kind —
 * site, workload, connection, node — gets it without rewriting its builder.
 */
const PANEL_TILE_KEYS = ['Traffic', 'Latency to the on-ramp', 'Utilization', 'Current · in / out', 'Reaches', 'Share of all traffic', 'On AT&T', 'Instances sharing this app'];
const PANEL_STATE_KEYS = ['State', 'Reachability'];
const PANEL_GROUPS = [
  { title: 'Identity', keys: ['Resource', 'Address', 'Type', 'App tag', 'Class', 'Access'] },
  { title: 'Where it sits', keys: ['VPC / VNet', 'Subnet', 'Availability zone', 'Metro', 'Region', 'PoP'] },
  { title: 'How it connects', keys: ['Path', 'First mile', 'Connection', 'Purchased', 'BGP', 'Drops', 'Average · in / out'] },
];
const panelUnit = (v) => {
  const m = String(v).match(/^([\d.,]+)\s*(.*)$/);
  return m ? { n: m[1], u: m[2] } : { n: String(v), u: '' };
};
function panelShape(pairs) {
  const left = pairs.slice();
  const take = (keys) => { const got = []; for (const k of keys) { const i = left.findIndex(([kk]) => kk === k); if (i >= 0) got.push(left.splice(i, 1)[0]); } return got; };
  const statePair = take(PANEL_STATE_KEYS)[0] || null;
  const tiles = take(PANEL_TILE_KEYS).slice(0, 3).map(([k, v]) => { const { n, u } = panelUnit(v); return { key: k, k, n, u, hasUnit: !!u }; });
  const groups = PANEL_GROUPS.map(g => ({ key: g.title, title: g.title, rows: take(g.keys).map(([k, v]) => ({ key: k, k, v })) })).filter(g => g.rows.length);
  if (left.length) groups.push({ key: 'more', title: 'Also', rows: left.map(([k, v]) => ({ key: k, k, v })) });
  const word = statePair ? String(statePair[1]) : '';
  const bad = /degrad|exposed|public|saturat|blind|over/i.test(word);
  const warn = /single|no |unresolved/i.test(word);
  return {
    tiles, hasTiles: tiles.length > 0, groups, hasGroups: groups.length > 0,
    stateWord: word, hasState: !!word,
    stateInk: bad ? '#8a1c14' : warn ? '#7a4b00' : '#14532d',
    stateBg: bad ? 'rgba(201,54,44,.12)' : warn ? 'rgba(212,140,0,.14)' : 'rgba(30,122,60,.12)',
    stateDot: bad ? 'var(--error)' : warn ? 'var(--warning)' : 'var(--success)',
  };
}

export function vals(c) {
  const s = c.state, set = (p) => c.setState(p), estRaw = estateFor(s);
  const steered = s.steered || [];
  const persona = PERSONA_NAME[s.persona] || 'Cloud & Platform Architect';
  const est0 = { ...estRaw, regionsList: estRaw.regionsList.map(r => r.region === s.landed ? { ...r, priv: true, ramp: r.ramp || 'NetBond', rel: 'ok', landed: true } : r), attachedRegions: estRaw.attachedRegions + (s.landed ? 1 : 0) };
  const inv = A.inventory({ ...est0, regionsList: est0.regionsList.filter((r, i) => facetPass(r, i, s.chips || [])) });
  const obScope = s.obScope || 'all';
  const skSplit = s.skSplit ? X.splitSources(est0, A.observe(R.applyScope(est0, obScope), steered, inv).flows, s.skSplit) : null;
  const ob = A.observe(R.applyScope(est0, obScope), steered, inv, skSplit);
  const obAll = obScope === 'all' ? ob : A.observe(est0, steered, inv);
  const hp = R.health(est0, obAll, steered, SCH.nowOf(s));
  const conns = X.connections(est0, obAll);
  // One incident list (2026-09-30): Home, Alerts, the Health tab and the findings events read it.
  const clockNow = SCH.nowOf(s);
  const incChanges = OD.changes(est0, conns, OD.activityOf(est0, { customPolicies: s.customPolicies || [], steered, conns, now: clockNow }), clockNow);
  const probs = OD.problems(est0, conns, obAll, appsOf(est0, A.inventory(est0), obAll.flows), incChanges, clockNow);
  const probRows = OD.queue(probs, clockNow);
  // Who answers for each piece of every path, read once from the whole estate (2026-09-30).
  const segCtx = G.segCtxOf(est0, { inv: A.inventory(est0), ob: obAll, conns, probs });
  const est = { ...est0, observedPct: ob.total ? ob.covPct : est0.observedPct, findings: [...A.observeFindings(est0, obAll), ...est0.findings] };
  const go = (screen, extra) => () => { const pre = screen === 's4' && !(extra && extra.compose) && !s.compose.outcome ? { compose: prefillCompose(est) } : {}; if (screen === 's1' && s.scanStep < 4) runScan(c, est); c.setState({ screen, hoverRegion: null, andiScope: null, drill: [], cloudDrill: [], cloudPick: null, discoverView: 'estate', fabDrill: [], laneFocus: false, cnPage: 'picture', fdKey: null, ...pre, ...(extra || {}) }); window.scrollTo(0, 0); syncHash(screen, extra && extra.layer || s.layer, extra && extra.tab || s.tab); };
  // Scheduled auto-discovery (wave 4). One clock, one account list and one run
  // history for the whole render. s.acctSched and s.scanRuns are keyed by estate
  // so the demo picker cannot carry one estate's cadence onto another. Neither
  // of them is s.obWindow, which already means two things.
  const nowMs = SCH.nowOf(s);
  const schedOver = (s.acctSched && s.acctSched.est === est.id) ? s.acctSched.map : {};
  const myRuns = (s.scanRuns && s.scanRuns.est === est.id) ? s.scanRuns.list : [];
  const schedView = SCH.scheduleView(est, nowMs, { overrides: schedOver, runs: myRuns });
  const sched = {
    ...schedView,
    setSchedule: (ids) => (e) => {
      const next = SCH.scheduleById(e.target.value);
      if (!next) return;                       // the estate-wide select's "Mixed" entry
      const map = { ...schedOver };
      ids.forEach(id => { map[id] = next; });
      c.setState({ acctSched: { est: est.id, map } });
    },
    runNow: (ids, trigger) => () => {
      if (!ids.length) return;
      const rec = SCH.runRecord({ at: SCH.nowOf(c.state), trigger: trigger || 'manual', accountIds: ids, est });
      c.setState({ scanRuns: { est: est.id, list: [rec, ...myRuns] } });
      startScan(c);
    },
  };
  const isEmpty = est.stage === 'empty', isMature = est.stage === 'mature', isPartial = est.stage === 'partial';
  // A finding's life (notes, 2026-09-29): seeded history under what the customer did here.
  // One clock (review, 2026-09-29): state carries the day when given, so tests and demos do not drift.
  const lifeNow = new Date(SCH.nowOf(s));
  const life = lifeState(s, est);
  const findList = findingList(est, est0, obAll, lifeNow);
  const openF = findList.filter(f => OPEN_STATES.includes(LC.lifeOf(f, life, lifeNow).state));
  const openSave = openF.filter(f => f.priced).reduce((a, f) => a + f.save, 0);
  const observeHead = openF.length ? `${openF.length} ${openF.length === 1 ? 'finding' : 'findings'} open.${openSave ? ` ${fmt(openSave)}/mo potential savings.` : ''}` : '';
  const layer = D.LAYERS.find(l => l.id === s.layer) || D.LAYERS[1];
  const layerProducts = (id) => D.CATALOG.filter(p => p.layer === id);
  const findingsFor = (id, tab) => est.findings.filter(f => f.layer === id && (!tab || f.tab === tab));
  const pKey = persona.split(/\s|&/)[0].toLowerCase();
  const pMatch = (f) => (f.persona || '').toLowerCase().startsWith(pKey) ? 1 : 0;
  const sortF = (arr) => arr.slice().sort((a, b) => (pMatch(b) - pMatch(a)) || ((b.save || 0) - (a.save || 0)));
  const personaTab = PERSONA_TAB[persona] || 'connect';
  // What is on the table is what is still open: a dismissed or resolved finding leaves every figure (review, 2026-09-29).
  const totalSave = openSave;
  const estOpen = { ...est, findings: openF.filter(f => !f.event) };

  // ---- hero ----
  // Drills in place (2026-09-09): the left column explodes class → metro → site → paths, the right column region → VPC → subnet → workload. The band, the lane and the other column stay.
  // The filter row narrows the picture's sites (2026-09-28): by service, place
  // and reach. The rest of the page keeps the whole estate.
  const siteF = s.siteFilter || {};
  const filterOn = !!((siteF.svc || []).length || siteF.loc || siteF.reach);
  const estF = filterOn ? { ...est, sites: filterSites(est.sites, siteF) } : est;
  // The filter row narrows the picture's sites (2026-09-29 audit: it was computed and never applied).
  const siteDrill = s.drill.length ? X.siteDrillRows(estF, s.drill, { pin: s.volPin, tags: ((s.siteTags || {})[est.id]) || {} }) : null;
  const drillInfo = siteDrill ? { level: siteDrill.level, label: siteDrill.label, rows: siteDrill.rows } : null;
  const drillRows = drillInfo ? drillInfo.rows : null;
  const cloudDrill = s.cloudDrill || [];
  // The provider a region drill sits under: the one picked, or, for a region
  // opened from anywhere else, the region's own, so up always passes through it.
  const cloudPick = s.cloudPick || (cloudDrill.length ? (est.regionsList.find(r => r.region === cloudDrill[0]) || {}).cloud || null : null);
  const regionDrill = cloudDrill.length ? X.regionDrillRows(est, inv, cloudDrill) : cloudPick ? X.providerRows(est, cloudPick) : null;
  const cloudsUpNow = () => set(cloudDrill.length ? { cloudDrill: cloudDrill.slice(0, -1), cloudPick } : { cloudPick: null });
  const fabOpenNow = (s.fabDrill || []).length > 0;
  // Access and Edge start folded to card edges; a click unfolds them. The
  // facilities list needs the whole band, so it opens unfolded. Folded or not,
  // the band sits centred between the site cards and the cloud column: folded,
  // it narrows to four card stacks and a 260 Core rather than stranding the
  // stacks at the ends of an empty stage.
  const folded = !s.bandUnfolded && !fabOpenNow;
  const bandW = folded ? 4 * FOLDED_SIDE + 260 : 580;
  const L = heroLayout(estF, { measure: est, groupBy: s.siteGroup, tags: ((s.siteTags || {})[est.id]) || {}, siteRows: drillRows, regionRows: regionDrill ? regionDrill.rows : null, bandX: Math.round(SITES_END + (RX - SITES_END - bandW) / 2), bandW, folded });
  const hoverKey = s.hoverNode;
  const dimFor = (keys) => hoverKey ? (keys.includes(hoverKey) ? 1 : 0.72) : 1;
  const layerEdgeKinds = { ai: ['egress'], cloud: ['egress', 'internet'], net: ['ingress', 'internet'], transport: ['ingress'] };
  const inDept = s.screen === 's3';
  // The five segments of the path. Core is the door into the facilities
  // drill, which the Cloud layer card used to open; the other three layer
  // cards were dim and did nothing, and none of the four was a place a packet
  // passes through.
  // Ownership is drawn inside the band; the security lens still colours the
  // wires outside it. Who holds the SLA and how well the path performs are two
  // different questions, and one colour cannot answer both.
  const OWNER = {
    att: { stroke: '#3374cc', width: 3, dash: 'none', ownerLabel: 'AT&T' },
    cloud: { stroke: 'var(--text-light)', width: 2, dash: 'none', ownerLabel: 'Cloud provider' },
    third: { stroke: 'var(--viz-5)', width: 2, dash: '5 3', ownerLabel: 'Third party' },
  };
  // The things in each segment, named and owned, and the pieces of line between
  // them. A piece takes the style of the thing it belongs to, so a route changes
  // colour exactly where it changes hands.
  const ownerName = (n) => (n.owner === 'cloud' ? (n.cloud || 'Cloud provider') : OWNER[n.owner].ownerLabel);
  // Folded, the backbones are all that is left to read, so they read larger.
  const bigCore = (n) => folded && n.seg === 2;
  const nodesMeta = (L.nodes || []).map(n => ({ ...n, key: 'n:' + n.id, fx: n.x + 2, fy: n.y - (bigCore(n) ? 16 : 10), fw: Math.max(0, n.w - 4), fh: bigCore(n) ? 32 : 20, ph: bigCore(n) ? 30 : 18, plh: bigCore(n) ? 27 : 15, pfs: bigCore(n) ? '15px' : '10px', pdot: bigCore(n) ? 9 : 6, dot: OWNER[n.owner].stroke, op: folded && n.seg !== 2 ? 0 : 1, pe: folded && n.seg !== 2 ? 'none' : 'auto',
    border: `1.5px ${OWNER[n.owner].dash === 'none' ? 'solid' : 'dashed'} ${OWNER[n.owner].stroke}`,
    title: `${n.name} · ${ownerName(n)} · used by ${n.users.slice(0, 4).join(', ')}${n.users.length > 4 ? ` and ${n.users.length - 4} more` : ''}` }));
  const piecesMeta = (L.pieces || []).map(p => ({ ...OWNER[p.owner], ...p }));
  // A folded side's name, upright on its stack and above the lines through it.
  const foldTags = L.segments.filter(sg => sg.side !== 'core').map(sg => ({ key: 'ft' + sg.i, x: sg.x, w: sg.w, y: L.bandY + 3, label: sg.label, op: folded ? 1 : 0, pe: folded ? 'auto' : 'none', open: () => set({ bandUnfolded: true }), tip: `${sg.label}: click to unfold` }));
  // Traffic runs both ways along every route, as it does on the wires outside.
  const routeDots = (L.routes || []).map((r, i) => ({ key: 'rt' + i, id: 'rt' + i, d: r.d, dur: '3.2s', begin: '-' + ((i * 0.37) % 3.2).toFixed(2) + 's', back: '-' + ((i * 0.37 + 1.6) % 3.2).toFixed(2) + 's' }));
  // The customer's own cross-connect: the one cable on the path that neither
  // AT&T nor the cloud answers for. A square, not a colour: every colour here
  // already means an owner or a health state.
  const XC = 10;
  const xconnectsMeta = (L.xconnects || []).map(x => ({ ...x, s: XC, sx: x.x - XC / 2, sy: x.y - XC / 2,
    title: x.region
      ? `Your cross-connect at ${x.at}, into ${x.cloud} ${x.ramp}. You ordered it from the colo, which answers for it - not AT&T, not ${x.cloud}.`
      : `Your cross-connect at ${x.at}, from your ${x.site} circuit to an AT&T port. You ordered it from the colo, which answers for it - not AT&T.` }));
  // Regions (and provider cards) whose on-ramp is already named inside the band.
  const legRegions = new Set((L.routes || []).filter(r => r.side === 'region').map(r => r.region));
  const segmentsMeta = L.segments.map(sg => ({ ...sg,
    y: L.bandY, h: L.bandH, bottom: L.bandY + L.bandH,
    // At the band's top edge: the first route can enter 24px in, so a label any
    // lower is drawn under a line.
    labelY: L.bandY + 3,
    role: sg.side === 'core' ? 'button' : 'presentation',
    isCore: sg.side === 'core',
    open: sg.side === 'core' ? () => set({ fabDrill: ['fab'], bandOpen: true }) : () => set({ bandUnfolded: folded }),
    cursor: 'pointer',
    tip: sg.side === 'core' ? 'Open the facilities' : folded ? `${sg.label}: click to unfold` : `${sg.label}: click to fold`,
    // Folded, a side segment is a stack of card edges with its name on end.
    edgeOp: folded && sg.side !== 'core' ? 1 : 0, pillOp: folded && sg.side !== 'core' ? 0 : 1,
    // The stack starts under its name and stops as far from the floor; its back
    // cards peek outward, left on the site side and right on the cloud side.
    stackH: L.bandH - 92, stackY: L.bandY + 80,
    // Cards 30 wide, offset 7, centred in the 72-unit folded column.
    stackA: sg.side === 'site' ? 28 : 14, stackB: 21, stackC: sg.side === 'site' ? 14 : 28,
    // Access folds to a light stack of two; Edge, a step deeper, to three with
    // more shadow and a blue front card, so the two folds read apart.
    backOp: sg.label === 'Edge' ? 1 : 0,
    frontFill: sg.label === 'Edge' ? 'var(--bg-accent)' : 'var(--bg-base)', frontStroke: sg.label === 'Edge' ? 'var(--band-stroke)' : 'var(--border-primary)',
    frontShadow: sg.label === 'Edge' ? 'drop-shadow(0 2px 4px rgba(0,40,120,.28))' : 'drop-shadow(0 1px 2px rgba(0,0,0,.14))',
    // Depth into the backbone: Access lightest, Edge deeper, Core deepest, so
    // the five columns read apart and the eye lands on the backbone.
    fill: (s.theme === 'dark' ? { Access: 'rgba(255,255,255,0.02)', Edge: 'rgba(255,255,255,0.06)', Core: 'rgba(102,200,240,0.14)' } : { Access: 'rgba(0,87,184,0.02)', Edge: 'rgba(0,87,184,0.08)', Core: 'rgba(0,87,184,0.17)' })[sg.label],
    divider: sg.i > 0 ? 1 : 0,
    pillBg: sg.side === 'core' ? 'var(--cta)' : 'var(--bg-base)', pillColor: sg.side === 'core' ? '#fff' : 'var(--text-body)',
    pillBorder: sg.side === 'core' ? 'var(--cta)' : 'var(--border-secondary)',
    // Folded, CORE is the one label left on the band, so it reads larger.
    pillFs: folded && sg.side === 'core' ? '14px' : '10px', pillLh: folded && sg.side === 'core' ? 22 : 16, pillH: folded && sg.side === 'core' ? 26 : 18, pillPad: folded && sg.side === 'core' ? 12 : 8,
  }));
  const steeredRegionNames = new Set(steered.filter(id => id.startsWith('f-')).map(id => (estRaw.regionsList[+id.split('-')[1]] || {}).region));
  const heroEdges = L.edges.map(e => {
    const keys = [e.site ? 'site' + e.site.name : null, e.region ? 'reg' + e.region.region : null, e.internet ? 'inet' : null].filter(Boolean);
    let op = dimFor(keys);
    if (inDept && !layerEdgeKinds[s.layer].includes(e.kind)) op = Math.min(op, 0.3);
    if (s.laneFocus && !e.viaLane) op = Math.min(op, 0.15);
    const steeredHere = e.region && steeredRegionNames.has(e.region.region);
    if (steeredHere) e = { ...e, priv: true, chip: e.chip || 'Steered', shield: false };
    const simHit = s.simulated && !s.enforced && e.region && ((e.region.tags || []).includes('PCI') || (s.customPolicies || []).some(p => p.state === 'simulated' && (e.region.tags || []).some(t => p.match.toLowerCase().includes(t.toLowerCase()))));
    if (e.kind === 'egress' && e.region && legRegions.has(e.region.region)) e = { ...e, chip: null };
    const dashed = !e.priv || simHit;
    const d = edgePath(e);
    const hh = e.region ? hp.regionHealth[e.region.region] : null;
    const healthStroke = hh === 'red' ? 'var(--error)' : hh === 'amber' ? 'var(--warning)' : null;
    const ov = overlayFor(e, s, est0, ob, hp, R, steered, hoverKey);
    return { ...e, ...ov, key: e.id, d, op: ov.opOverride != null ? Math.min(op, ov.opOverride) : op, landed: !!(e.region && e.region.landed), amber: hh === 'amber' || hh === 'red', openObserve: hh === 'amber' || hh === 'red' ? () => { go('s3', { layer: 'cloud', tab: 'observe', obScope: 'cloud:' + e.region.cloud })(); } : null, stroke: ov.stroke || (e.ghost ? 'var(--border-primary)' : healthStroke || (e.priv ? '#3374cc' : 'var(--text-disabled)')), w: ov.w || (e.priv ? 2 : 1.5), dash: dashed ? '6 6' : 'none', crawl: !e.priv && !e.ghost, mx: (e.x1 + e.x2) / 2, my: (e.y1 + e.y2) / 2, px: e.kind === 'ingress' ? e.x2 : e.x1, py: e.kind === 'ingress' ? e.y2 : e.y1, portFill: e.priv ? '#0057b8' : 'var(--bg-base)', durS: ov.durS || (e.dur ? e.dur + 's' : '2s'), tailBegin: '-0.25s', retBegin: '-' + ((parseFloat(ov.durS || (e.dur ? e.dur + 's' : '2s')) || 2) / 2) + 's', chipW: e.chip ? e.chip.length * 8 + 14 : 0, showChip: !!e.chip && op === 1 || !!e.chip && !hoverKey, pulse: simHit || !!(e.region && e.region.landed) };
  });
  // A provider card's wires say the same thing ("private") side by side; once is enough.
  const saidOnCard = new Set();
  heroEdges.forEach(e => { if (!e.region || !e.region.card || !e.hasLabel) return; const k = e.region.cloud + '|' + e.label; if (saidOnCard.has(k)) e.hasLabel = false; else saidOnCard.add(k); });
  // The open affordance (2026-09-28): a card that opens says what is inside it,
  // and the first open retires the hint for good.
  const seenHint = () => { if (!s.openHintSeen) { set({ openHintSeen: true }); try { localStorage.setItem('naas.openHint', 'seen'); } catch (e) {} } };
  const pillOf = (st) => (st.region ? String(st.count || st.groups || '') : st.rollup && S.countOf(st.name) > 1 ? S.countOf(st.name).toLocaleString('en-US') : '');
  // A region card counts its places the way every level under it does (2026-09-29):
  // "1,640 sites · 154 AT&T" inside must not read "internet · Attach" outside.
  const placeCount = (st) => { if (!String(st.drillKey || '').startsWith('region:') || s.drill.length) return st; const lv = X.siteDrillRows(estF, [st.drillKey]); if (!lv) return st;
    const total = lv.rows.reduce((a, r) => a + (r.count || 0), 0), att = lv.rows.reduce((a, r) => a + (r.att || 0), 0);
    return { ...st, priv: att > 0, access: `${total.toLocaleString('en-US')} ${total === 1 ? 'site' : 'sites'} · ${att.toLocaleString('en-US')} AT&T · ${(total - att).toLocaleString('en-US')} non-AT&T` }; };
  const heroSites = L.sites.map(placeCount).map(st => ({ ...st, key: st.key, hasPill: !st.ghost && !st.leaf && !st.more, pillN: pillOf(st), textW: (SITES_END - 24 - 24 - (!st.ghost && !st.more && !st.priv && !st.leaf ? 86 : !st.ghost && !st.leaf ? 44 : 18)) + 'px', op: dimFor(['site' + st.name]), ty: st.y + 15, ty2: st.y + 29, dash: st.ghost || st.more ? '4 4' : 'none', color: st.ghost ? 'var(--text-disabled)' : st.more ? 'var(--link)' : 'var(--text-heading)', click: () => { if (st.ghost || st.leaf) return; if (st.more) { openLevel('sites'); return; } seenHint(); const place = /^(state|metro):/.test(String(st.drillKey || '')); const isSite = !place && ((s.drill.length >= 2 && st.drillKey) || (st.drillKey && /^(site:|(DC|CAM|OFF|PLT|BR|ATM|FLD)-)/.test(String(st.drillKey))) || (!st.rollup && S.countOf(st.name) === 1 && !st.drillKey && !/\(/.test(st.name))); if (isSite) set({ mapSel: 'asset:' + String(st.drillKey || st.name).replace(/^site:/, ''), panelTab: 'overview' }); const key = st.drillKey || S.rollupKeyOf(est, st) || (S.countOf(st.name) > 1 || st.rollup ? S.classOf(st) : st.name); set({ drill: [...s.drill, key] }); }, enter: () => set({ hoverNode: 'site' + st.name }), leave: () => set({ hoverNode: null }), cursor: st.ghost || st.leaf ? 'default' : 'pointer', caret: st.ghost || st.leaf || st.more ? '' : '›', hasAction: !st.ghost && !st.more && !st.priv && !st.leaf, action: 'Attach', act: () => { c.setState({ screen: 's4', ...newOrder(prefillCompose(est)) }); syncHash('s4', s.layer, s.tab); } }));
  // Workload counts live on hover, not in a column beside the picture (Micah, 2026-09-23).
  const wlTip = (name, r) => (r.wl || r.wlLabel ? `${name} · ${r.wlLabel || plural(r.wl, 'workload', 'workloads')}` : name);
  const heroRegions = L.regions.filter(r => !r.card).map(r => ({ ...r, key: r.key, pillN: '', hasPill: !(r.ghost || r.rollup || r.other || r.pinned || r.leaf), noPill: !!(r.ghost || r.rollup || r.other || r.pinned || r.leaf), tip: wlTip(r.cloud && !r.child ? `${r.cloud} ${r.region}` : r.region, r), op: dimFor(['reg' + r.region]), ty: r.y + 19, dash: r.seeAll ? '3 3' : r.ghost ? '4 4' : 'none', stroke: r.seeAll ? 'var(--cta)' : 'var(--border-primary)', color: r.seeAll ? 'var(--link)' : (r.ghost || r.muted) ? 'var(--text-disabled)' : 'var(--text-heading)', cursor: r.ghost || r.muted ? 'default' : 'pointer', relFill: r.ghost ? 'transparent' : hp.regionHealth[r.region] === 'red' ? 'var(--error)' : hp.regionHealth[r.region] === 'amber' ? 'var(--warning)' : 'var(--success)', relTitle: r.link === 'degraded' ? `Degraded: BGP flapping on ${F.RAMP_NAME[r.ramp] || 'NetBond'}` : hp.regionHealth[r.region] === 'amber' ? 'Degraded: latency spike on the public path' : 'Healthy', rx: L.rightX + (r.indent || 0), dotX: L.rightX + 214, rw: 240 - (r.indent || 0), rh: r.child ? 26 : 28, caret: r.seeAll ? '›' : r.ghost || r.rollup || r.other ? (r.other ? '‹' : '') : (r.pinned ? '‹' : r.leaf ? '' : '›'), action: r.ghost || r.child || r.rollup || r.other || r.pinned ? '' : (r.link === 'degraded' ? 'Impact' : !r.priv ? 'Attach' : (conns.rows.find(c => c.region === r.region) || {}).hot ? 'Add port' : ''), hasAction: !!(r.ghost || r.child || r.rollup || r.other || r.pinned ? '' : (r.link === 'degraded' ? 'Impact' : !r.priv ? 'Attach' : (conns.rows.find(c => c.region === r.region) || {}).hot ? 'Add port' : '')), act: () => { if (r.link === 'degraded') { go('s3', { layer: 'cloud', tab: 'observe', mapSel: 'cx-' + r.region, mapRegion: r.region, panelTab: 'impact' })(); return; } composeFor(go, r)(); }, actionBg: r.link === 'degraded' ? 'var(--warning)' : 'var(--cta)', rectFill: r.seeAll ? 'var(--bg-accent)' : r.pinned ? 'var(--bg-accent)' : r.child ? 'var(--bg-wash)' : 'var(--bg-base)', relOp: r.child || r.other ? 0 : 1, click: () => { if (r.ghost) return; if (r.seeAll) { openWorkloads(r.wlScope.region, r.wlScope.vpcId, r.wlScope.snId); return; } if (r.wlSel) { set({ mapSel: r.wlSel, panelTab: 'overview' }); return; } if (r.toRoot) { set(r.toProvider ? { cloudDrill: [], cloudPick } : { cloudDrill: [], cloudPick: null }); return; } if (r.pinned) { set({ cloudDrill: cloudDrill.slice(0, -1), cloudPick }); return; } if (r.rollup) return; if (r.child) { if (r.drill) set({ cloudDrill: [...cloudDrill, r.drill] }); return; } set({ cloudDrill: [r.region], cloudPick: r.cloud, andiScope: { kind: 'region', id: r.region, label: r.cloud + ' ' + r.region } }); }, enter: () => set({ hoverNode: 'reg' + r.region, hoverRegion: r.ghost || r.rollup ? null : r.region }), leave: () => set({ hoverNode: null, hoverRegion: null }) }));
  // Provider cards: the first level on the right. Each says how many regions it
  // holds and how they are reached, and opens to those regions.
  const heroClouds = L.regions.filter(r => r.card).map(r => {
    const rs = est.regionsList.filter(x => x.cloud === r.cloud);
    const ways = [...new Set(rs.map(x => (x.priv ? CONN_LABEL[connModeOf(x)].short : 'internet')))];
    if (r.ghost) return { ...r, key: 'card:' + r.cloud, x: L.rightX, dotX: L.rightX + 226, tip: 'Discover to find them', op: 1, sub: r.cloud === 'Your clouds' ? 'AWS, Azure, GCP, Oracle' : 'CoreWeave, GPU clouds', relFill: 'transparent', relTitle: '', click: () => {}, enter: () => {}, leave: () => {}, dash: '4 4', color: 'var(--text-disabled)', cursor: 'default', caret: '' };
    const down = rs.some(x => hp.regionHealth[x.region] === 'red'), amber = !down && rs.some(x => hp.regionHealth[x.region] === 'amber');
    return { ...r, dash: 'none', color: 'var(--text-heading)', cursor: 'pointer', caret: '›', hasPill: true, pillN: String(rs.length), key: 'card:' + r.cloud, x: L.rightX, dotX: L.rightX + 226, tip: `${r.cloud} · ${plural(r.count, 'region', 'regions')} · ${plural(r.wl, 'workload', 'workloads')}`, op: dimFor(['reg' + r.region]), sub: `${plural(r.count, 'region', 'regions')} · ${ways.length > 2 ? ways.slice(0, 2).join(', ') + ' +' + (ways.length - 2) : ways.join(', ')}`,
      relFill: down ? 'var(--error)' : amber ? 'var(--warning)' : 'var(--success)', relTitle: down ? 'A region here is degraded' : amber ? 'A region here runs over its latency SLO' : 'Healthy',
      click: () => { seenHint(); set({ cloudPick: r.cloud, cloudDrill: [] }); }, enter: () => set({ hoverNode: 'reg' + r.region }), leave: () => set({ hoverNode: null }) };
  });
  const heroWorkloads0 = L.workloads.map(w => ({ ...w, op: dimFor(['reg' + w.region]), click: () => { const r = est.regionsList.find(x => x.region === w.region); if (r && !cloudDrill.length) set({ cloudDrill: [w.region], cloudPick: r.cloud }); else if (!r && !cloudPick) set({ cloudPick: w.region, cloudDrill: [] }); }, cursor: cloudDrill.length ? 'default' : 'pointer' }));
  const heroWorkloads = heroWorkloads0.map(w => ({ ...w, n: String(w.label).replace(/\s*workloads?$/i, '') }));
  const heroArcs = L.arcs.map(a => ({ ...a, key: a.id, d: arcPath(a), stroke: a.priv ? '#3374cc' : 'var(--text-disabled)', dash: a.priv ? 'none' : '4 4' }));
  const hr = s.hoverRegion && est.regionsList.find(r => r.region === s.hoverRegion);
  const hrNode = hr && L.regions.find(r => r.region === hr.region);
  const bandFill = s.theme === 'dark' ? 'url(#bandGrad)' : 'var(--band)';
  // The stratum card holds 84px of content (18 + 14 + 20, two 6px gaps, two
  // 10px pads). A compact band gives it 72px, so the pads and gaps close up
  // rather than clipping the third line.
  const strataCardH = Math.round(L.bandH / 4) - 12;
  const strataTight = strataCardH < 84;
  const facilities = [{ name: 'AT&T Dallas (Akard)', metro: 'Dallas', ramps: ['NetBond', 'DX', 'ER'], ms: 9 }, { name: 'AT&T Ashburn', metro: 'Ashburn', ramps: ['NetBond', 'DX', 'ER', 'IX'], ms: 8 }, { name: 'Equinix Chicago (CH1)', metro: 'Chicago', ramps: ['NetBond', 'EQX'], ms: 11 }];
  const picked = s.picked;
  const facilityRows = facilities.map((f, i) => ({ ...f, key: f.name, y: L.bandY + 28 + i * 110, ramps: f.ramps.join(' · '), picked: picked.includes(f.metro), pick: () => { const p = picked.includes(f.metro) ? picked.filter(m => m !== f.metro) : [...picked, f.metro].slice(-2); set({ picked: p }); }, fill: picked.includes(f.metro) ? 'var(--cta)' : 'var(--bg-base)', color: picked.includes(f.metro) ? '#fff' : 'var(--text-heading)' }));
  const routePreview = picked.length === 2 ? { a: picked[0], b: picked[1], ms: Math.abs(facilities.find(f => f.metro === picked[0]).ms - facilities.find(f => f.metro === picked[1]).ms) + 14, y1: facilityRows.find(f => f.metro === picked[0]).y + 30, y2: facilityRows.find(f => f.metro === picked[1]).y + 30 } : null;

  // ---- the drawer at the point of volume (Micah, 16:23) ----
  const vol = s.vol || null;
  const volOpts = { q: s.volQ || '', path: s.volPath || 'all', state: s.volState || 'all', page: s.volPage || 1, sel: s.volSel || [] };
  const volSlide = s.volSlide || 0;
  // One trail per column, read live. The drawer no longer owns a path, so the
  // picture and the list are always on the same node by definition.
  const colTrail = (col) => col === 'sites' ? s.drill : col === 'clouds' ? cloudDrill : (s.fabDrill || []);
  // The picture's own band code (below, untouched) reads s.fabDrill raw and
  // trusts trail[0] to be the 'fab' placeholder (naas-fabric.js fabricRows
  // keys off trail LENGTH, not content). colTrail('fabric') stays exactly
  // `s.fabDrill || []` per the brief, so a write here is the one place that
  // must keep that invariant - otherwise a level scope opened before the band
  // ever seeded 'fab' drills the drawer one way and leaves the picture at the
  // facility list, which breaks "the picture follows."
  const setColTrail = (col, next) => set(col === 'sites' ? { drill: next } : col === 'clouds' ? { cloudDrill: next } : { fabDrill: next.length && next[0] !== 'fab' ? ['fab', ...next] : next });
  // The AT&T network trail carries its own root ('fab'); the other two do not, so
  // crumb i cuts one deeper on the band.
  const crumbCut = (col, i) => colTrail(col).slice(0, col === 'fabric' ? i + 1 : i);
  const openLevel = (col) => set({ vol: { kind: 'level', col }, volFlat: false, drawerOpen: true, andiOpen: false, volQ: '', volPath: 'all', volState: 'all', volPage: 1, volSel: [], volSlide: (s.volSlide || 0) + 1 });
  // A level scope holds no ids of its own - the column trail IS the scope. The
  // row handlers below still need cls/metro/region/vpcId, so resolve them once
  // and never read `vol.cls` or `vol.region` again.
  const volCtx = (s.vol && s.vol.kind === 'level')
    ? (s.vol.col === 'clouds'
      ? { region: colTrail('clouds')[0], vpcId: colTrail('clouds')[1], snId: colTrail('clouds')[2] || null, cls: '', metro: '', metroLabel: '' }
      : (() => { const tr = colTrail('sites'); const pm = X.placeMetroScope(est, tr);
          // A place trail (region, state, metro) names its metro and the rollup behind it (2026-09-29).
          if (pm) return { region: '', vpcId: '', cls: pm.cls, metro: pm.metroKey, metroLabel: pm.name };
          return { region: '', vpcId: '', cls: String(tr[0] || '').split('#')[0], metro: tr[1], metroLabel: S.labelOfKey(est, tr[1]) }; })())
    : { ...(s.vol || {}), metroLabel: (s.vol && s.vol.metro) ? S.labelOfKey(est, s.vol.metro) : '' };
  const volList = vol ? (vol.kind === 'level' ? V.levelList(vol.col === 'sites' ? estF : est, inv, obAll, vol.col, colTrail(vol.col), { ...volOpts, flat: !!s.volFlat, group: { by: s.siteGroup || 'region', tags: ((s.siteTags || {})[est.id]) || {} } })
    : vol.kind === 'workloads' ? V.workloadList(est0, inv, vol, volOpts) : V.volumeList(est0, vol, volOpts)) : null;
  /** The column's handoff: every workload in a VPC, or in one subnet of it. */
  const openWorkloads = (region, vpcId, snId) => set({ vol: { kind: 'workloads', region, vpcId, snId: snId || null }, drawerOpen: true, andiOpen: false, volQ: '', volPath: 'all', volState: 'all', volPage: 1, volSel: [], volSlide: 0 });
  /** Slide in one level. For a level scope the COLUMN trail grows, so the picture drills with the drawer. */
  const drawerInto = (patch) => set({ vol: { ...(s.vol || {}), ...patch }, volQ: '', volPath: 'all', volState: 'all', volPage: 1, volSel: [], volSlide: (s.volSlide || 0) + 1 });
  const levelInto = (col, into) => { setColTrail(col, [...colTrail(col), into]); set({ volFlat: false, volQ: '', volPath: 'all', volState: 'all', volPage: 1, volSel: [], volSlide: (s.volSlide || 0) + 1 }); };
  /** Climb back out one level: a slice, never a pair of hardcoded pops. The
   *  fabric trail carries its own root ('fab'), so its floor is one hop, not
   *  zero - `colTrail('fabric')` at rest is `['fab']`, length 1, not `[]`. */
  const drawerFloor = (col) => col === 'fabric' ? 1 : 0;
  const drawerPath = () => { const v = s.vol || {}; return v.kind === 'level' ? colTrail(v.col).slice(drawerFloor(v.col)) : [v.snId, s.volFlat || v.flat].filter(Boolean); };
  const drawerBack = () => {
    const v = s.vol || {};
    if (v.kind === 'level') {
      if (s.volFlat) { set({ volFlat: false, volQ: '', volPath: 'all', volPage: 1, volSlide: volSlide + 1 }); return; }
      const t = colTrail(v.col);
      if (t.length <= drawerFloor(v.col)) return; // already at the column's root; nothing to climb
      setColTrail(v.col, t.slice(0, -1));
      set({ volQ: '', volPath: 'all', volPage: 1, volSlide: volSlide + 1 });
      return;
    }
    if (v.flat) { set({ vol: { ...v, flat: false }, volQ: '', volPath: 'all', volPage: 1, volSlide: volSlide + 1 }); return; }
    if (v.snId) { set({ vol: { ...v, snId: null }, volQ: '', volPath: 'all', volPage: 1, volSlide: volSlide + 1 }); return; }
    closeVolume();
  };
  const closeVolume = () => set({ vol: null, drawerOpen: false, volSel: [], volPin: null, volFlat: false });
  // The footer button's own label already branches on volList.kind (Isolate
  // for a workloads-shaped list, Attach otherwise, in bulkLabel below) - this
  // handler must compose the SAME verb, or a clouds level scope drilled to a
  // VPC/subnet (which delegates to workloadList, so volList.kind==='workloads'
  // exactly like the old 'workloads' scope) shows "Isolate" and then composes
  // an Attach order with a site noun and an empty place.
  const bulkAttach = () => {
    if (!volList) return;
    const cnt = volList.bulk.attach;
    if (volList.kind === 'workloads') {
      const noun = cnt === 1 ? 'workload' : 'workloads';
      const what = `${cnt.toLocaleString('en-US')} exposed ${noun} in ${volCtx.region}`;
      // qty is a site count (composeOrder scales NetBond by it); Isolate never
      // orders a circuit, so it stays unset here - cnt workloads inside one
      // VPC do not buy cnt NetBond ports.
      c.setState({ screen: 's4', ...newOrder({ ...prefillCompose(est), bulk: what, note: `Isolate ${what}: bring them off the public path.` }) });
      syncHash('s4', s.layer, s.tab);
      return;
    }
    const what = `${cnt.toLocaleString('en-US')} ${volList.rows[0] ? (S.CLASS[volCtx.cls] || S.CLASS.Branch).plural : 'sites'} in ${volCtx.metroLabel || volCtx.metro} on a public first mile`;
    c.setState({ screen: 's4', ...newOrder({ ...prefillCompose(est), bulk: what, qty: cnt, note: `Attach ${what}. One order, one policy, ${cnt.toLocaleString('en-US')} circuits.` }) });
    syncHash('s4', s.layer, s.tab);
  };
  // A row's own Attach action (`sitesLevel`/`cloudsLevel` root rows, or a
  // site's `path` level) has no address/metro of its own - those only exist
  // on a delegated volumeList row. Resolve a place from the column's trail so
  // the compose note never prints "undefined"; at a column's root there is no
  // deeper trail to read, so the row's own id (already self-describing there,
  // e.g. "AWS us-east-2") stands alone rather than forcing an empty "in ".
  const attachTrail = vol && vol.kind === 'level' ? colTrail(vol.col) : [];
  const attachPlace = (x) => x.metro || (attachTrail.length ? S.labelOfKey(est, attachTrail[attachTrail.length - 1]) : '') || volCtx.metroLabel || '';
  // Only the old `metro` kind rebuilds `s.drill` on pin. It is opened from the
  // picture's `+N more` row, where the drill can be shorter than the metro the
  // drawer is showing, so the pin drills the picture to that metro - load-bearing.
  // A LEVEL scope has nothing to rebuild: `s.drill` already IS colTrail('sites')
  // by construction. Rebuilding it from volCtx (whose cls/metro are only ever
  // read off the sites trail) writes ['<hop>', undefined] at depth 1 and
  // ['', undefined] on clouds/fabric; siteDrillRows reads either as null, so the
  // drawer unmounts mid-render and openLevel('sites') stays dead afterward.
  const pinMayDrill = vol && vol.kind === 'metro';
  const drawer = volList ? { ...volList, key: 'vol', slideKey: 'sl' + volSlide,
    canBack: drawerPath().length > 0, isLevel: vol && vol.kind === 'level',
    capSearch: !!(volList.caps && volList.caps.search), capChips: !!(volList.caps && volList.caps.chips), capBulk: !!(volList.caps && volList.caps.bulk),
    crumbs: (volList.trail || []).map((name, i, a) => ({ key: 'dc' + i, name, last: i === a.length - 1, notLast: i < a.length - 1, ariaCurrent: i === a.length - 1 ? 'page' : 'false', go: vol && vol.kind === 'level' ? () => { setColTrail(vol.col, crumbCut(vol.col, i)); set({ volFlat: false, volPage: 1, volQ: '', volSlide: volSlide + 1 }); } : () => {} })),
    hasCrumbs: (volList.trail || []).length > 1,
    back: drawerBack, hasFlatDoor: !!volList.flatDoor, flatDoorLabel: volList.flatDoor ? volList.flatDoor.label : '', flatDoorSub: volList.flatDoor ? volList.flatDoor.sub : '', goFlat: vol && vol.kind === 'level' ? () => set({ volFlat: true, volQ: '', volPath: 'all', volPage: 1, volSlide: volSlide + 1 }) : () => drawerInto({ flat: true, snId: null }), isSubnets: volList.level === 'subnets', searchHint: volList.searchHint || (volList.kind === 'workloads' ? 'Search name, ip, type, app' : 'Search id, street, host'), q: s.volQ || '', setQ: (e) => set({ volQ: e.target.value, volPage: 1 }), close: closeVolume,
    paths: (volList.kind === 'workloads' ? [['all', `All apps · ${volList.counts.apps}`], ...volList.apps.slice(0, 6).map(a => [a.tag, `${a.tag} · ${a.count}`])] : [['all', 'All'], ['fabric', 'On AT&T'], ['public', 'Public']]).map(([k, l]) => ({ key: k, label: l, on: (s.volPath || 'all') === k, go: () => set({ volPath: k, volPage: 1 }), bg: (s.volPath || 'all') === k ? 'var(--cta)' : 'var(--bg-base)', color: (s.volPath || 'all') === k ? '#fff' : 'var(--text-heading)', border: (s.volPath || 'all') === k ? 'var(--cta)' : 'var(--border-secondary)' })),
    states: (volList.kind === 'workloads' ? [['all', 'Any state'], ['exposed', `Exposed · ${volList.counts.exposed}`]] : [['all', 'Any state'], ['degraded', 'Degraded']]).map(([k, l]) => ({ key: k, label: l, on: (s.volState || 'all') === k, go: () => set({ volState: k, volPage: 1 }), bg: (s.volState || 'all') === k ? 'var(--cta)' : 'var(--bg-base)', color: (s.volState || 'all') === k ? '#fff' : 'var(--text-heading)', border: (s.volState || 'all') === k ? 'var(--cta)' : 'var(--border-secondary)' })),
    rows: volList.rows.map(x => ({ ...x, key: x.id, selected: !!x.selected, dot: x.state === 'degraded' ? 'var(--error)' : x.state === 'public' ? 'var(--warning)' : 'var(--success)', pinned: s.volPin === x.id, bg: s.volPin === x.id ? 'var(--bg-accent)' : 'transparent', toggle: () => set({ volSel: (s.volSel || []).includes(x.id) ? (s.volSel || []).filter(k => k !== x.id) : [...(s.volSel || []), x.id] }),
      pin: volList.kind === 'workloads' ? () => set({ volPin: x.id, mapSel: `wl:${volCtx.region}|${volCtx.vpcId}|${x.id}`, panelTab: 'overview', andiScope: { kind: 'workload', id: x.id, label: `${x.id} · ${x.tag || 'untagged'}` } })
        : pinMayDrill ? () => set({ volPin: x.id, mapSel: 'asset:' + x.id, panelTab: 'overview', drill: s.drill.length >= 2 ? s.drill : [volCtx.cls, (V.metroOf(est, volCtx.cls, volCtx.metro) || {}).key || volCtx.metro] })
        : () => set({ volPin: x.id, mapSel: 'asset:' + x.id, panelTab: 'overview' }),
      isDoor: !!(x.into || x.descend), notDoor: !(x.into || x.descend), descend: x.into ? () => levelInto(vol.col, x.into) : x.descend ? () => drawerInto({ snId: x.snId }) : () => {}, hasAction: !!x.action,
      act: volList.kind === 'workloads' ? () => { c.setState({ screen: 's4', ...newOrder({ ...prefillCompose(est), bulk: `${x.id} · ${x.tag || 'untagged'} · ${x.ip}`, qty: 1, note: `Isolate ${x.id} (${x.ip}, ${x.tag || 'untagged'}) in ${volCtx.region}: bring it off the public path.` }) }); syncHash('s4', s.layer, s.tab); }
        : x.action === 'Attach' ? () => { const place = attachPlace(x); const addr = x.address ? ` (${x.address})` : ''; const bulk = x.address ? `${x.id} · ${x.address}` : (place ? `${x.id} · ${place}` : x.id); c.setState({ screen: 's4', ...newOrder({ ...prefillCompose(est), bulk, qty: 1, note: place ? `Attach ${x.id}${addr} in ${place}: one circuit onto the AT&T network.` : `Attach ${x.id}${addr}: one circuit onto the AT&T network.` }) }); syncHash('s4', s.layer, s.tab); }
        : () => set({ andiScope: { kind: 'region', id: x.id, label: x.id }, andiOpen: true }) })),
    more: () => set({ volPage: (s.volPage || 1) + 1 }), moreLabel: `Show ${Math.min(60, volList.matching - volList.shownCount)} more · ${volList.shownCount.toLocaleString('en-US')} of ${volList.matching.toLocaleString('en-US')}`,
    selectAll: () => set({ volSel: volList.matchingIds }), clearSel: () => set({ volSel: [] }), hasSel: (s.volSel || []).length > 0, bulkLabel: volList.kind === 'workloads' ? `Isolate ${volList.bulk.attach.toLocaleString('en-US')} exposed · ${volList.bulk.label}` : `Attach ${volList.bulk.attach.toLocaleString('en-US')} · ${volList.bulk.label}`, canBulk: !!(volList.caps && volList.caps.bulk) && volList.bulk.attach > 0, bulkAttach, matchingF: volList.matching.toLocaleString('en-US') } : null;
  const drawerOpen = !!(s.drawerOpen && drawer);

  // ---- inside the AT&T network (Micah, 14:13): facilities → ports → circuits, in place ----
  const fabDrill = s.fabDrill || [];
  const fabInfo = fabDrill.length ? FB.fabricRows(est0, inv, obAll, fabDrill) : null;
  const FAB_STATE = { ok: 'var(--success)', saturating: 'var(--warning)', degraded: 'var(--error)' };
  // The door's right margin inside its header, because the runtime cannot
  // subtract. The 10px edge rule is RENDERED pixels, not viewBox units: the
  // hero draws 1087 CSS px wide for a 1392 viewBox at the 1440x900 reference
  // (scale .7809), so 12 units would clear by 9.37px and fail. 16 units clears
  // by 12.49px there, and holds 10px down to an 870px hero (10 * 1392 / 16).
  // Hoisted above fabRows and fabHead (Task 11 fix round 2): every row in the
  // band - the port rows, the '‹ Up' row, the overflow button - shares this
  // one edge, or their hard edges stagger against each other.
  const EDGE = 16;
  const fabRows = fabInfo ? fabInfo.rows.slice(0, 8).map((r, i) => ({ ...r, key: r.key, x: L.bandX + EDGE, w: L.bandW - 2 * EDGE, y: L.bandY + 40 + i * 32, dot: FAB_STATE[r.state] || FAB_STATE.ok, caret: r.leaf ? '' : '›', cursor: r.leaf ? 'default' : 'pointer', hasAction: !!r.leaf, action: 'Add circuit', act: () => { c.setState({ screen: 's4', ...newOrder(prefillCompose(est)) }); syncHash('s4', s.layer, s.tab); }, click: () => { if (r.leaf) return; set({ fabDrill: [...fabDrill, r.drill] }); } })) : [];
  const fabHead = fabInfo ? { label: fabInfo.label, head: fabInfo.head, more: fabInfo.rows.length > 8 ? `+${fabInfo.rows.length - 8} more · open the list ›` : '', x: L.bandX + EDGE, w: L.bandW - 2 * EDGE, moreY: L.bandY + 40 + 8 * 32 } : null;
  const fabEmpty = !!(fabInfo && fabInfo.empty);
  // go() is the file's own navigator, defined at :165. It already prefills
  // Compose, clears the drills, scrolls to the top and syncs the hash - so the
  // Attach door behaves exactly like every other door rather than a near-copy.
  const fabEmptyGo = go('s4');
  const fabUp = () => set({ fabDrill: fabDrill.slice(0, -1) });
  const fabTrail = fabDrill.map((k, i) => ({ key: 'fb' + i, label: i === 0 ? 'AT&T network' : (i === 1 ? 'AT&T ' + k : String(k).replace(/^port:[^:]+:/, 'port ')), go: () => set({ fabDrill: fabDrill.slice(0, i + 1) }), last: i === fabDrill.length - 1, notLast: i < fabDrill.length - 1 }));

  // ---- the header door (2026-09-17): the count is the door ----
  // Unconditional, so the rule survives contact with every level. The number
  // is the one that fills the drawer, so the cloud root reads "All 6 regions".
  const nfmt = (x) => Number(x).toLocaleString('en-US');
  // EDGE is declared above, before fabRows and fabHead, since the whole band
  // shares it now (Task 11 fix round 2).
  // One source for the clouds header width: the door's gutter and the header
  // itself must move together or the door drifts off its column.
  // Each column's header is its title and its door; the breadcrumb has its own row.
  const cloudsHeadW = regionDrill ? 412 : 240;
  const sitesGutter = (24 + 460) - SITES_END + EDGE;        // header 24..484, cards end at SITES_END
  const cloudsGutter = (L.rightX + cloudsHeadW) - (L.rightX + 240) + EDGE;   // header at rightX, cards end 240 later
  const bandGutter = EDGE;                                  // the header IS the band: same edges
  // `shown` is how many of them the canvas is drawing right now, or null when
  // the canvas is drawing none of them - a closed band is not "4 hidden".
  const siteGroupOpt = { by: s.siteGroup || 'region', tags: ((s.siteTags || {})[est.id]) || {} };
  const doorFor = (col, shown, gutter, open) => {
    const h = col === 'sites' ? V.levelHead(estF, inv, obAll, col, colTrail(col), false, siteGroupOpt) : V.levelHead(est, inv, obAll, col, colTrail(col));
    if (!h) return { has: false, hasNot: true, label: '', title: '', color: 'var(--text-disabled)', gutter, open: () => {} };
    // Zero children still print. A level that holds nothing says so in
    // disabled ink with no caret and no handler: not a dead button, not a
    // button at all. `has` gates the handler, never the words.
    if (!h.total) return { has: false, hasNot: true, label: `0 ${h.noun}`, title: `${h.title}: nothing to open yet`, color: 'var(--text-disabled)', gutter, open: () => {} };
    const hidden = shown == null ? 0 : Math.max(0, h.total - shown);
    return {
      has: true,
      hasNot: false,
      label: hidden ? `All ${nfmt(h.total)} ${h.noun} · ${nfmt(hidden)} hidden ›` : `All ${nfmt(h.total)} ${h.noun} ›`,
      title: `Open the list: ${h.title}`,
      color: hidden ? 'var(--link)' : 'var(--text-light)',
      gutter,
      open,
    };
  };
  // `seeAll` is a door, not a sampled child: counting it would report one
  // fewer hidden workload than the drawer holds.
  // A region card stands for every site group in it. Grouping is not hiding, so
  // the door counts the groups the cards carry, not the cards.
  // The canvas draws one card per region, group or site at this level; the door counts the same things (2026-09-29 audit).
  const sitesDoor = doorFor('sites', L.sites.filter(x => !x.more && !x.ghost).length, sitesGutter, () => openLevel('sites'));
  // A provider card shows every region it holds, so it counts as that many.
  const cloudsDoor = doorFor('clouds', L.regions.filter(x => !x.rollup && !x.other && !x.pinned && !x.ghost && !x.seeAll).reduce((a, x) => a + (x.card ? x.count : 1), 0), cloudsGutter, () => openLevel('clouds'));
  // A closed band has to open with its drawer, or the picture sits on the
  // facility list while the drawer walks off it (see the invariant above).
  const bandDoor = doorFor('fabric', fabDrill.length ? fabRows.length : null, bandGutter, () => { if (!fabDrill.length) set({ fabDrill: ['fab'] }); openLevel('fabric'); });

  // ---- launch cards (Ramesh, 2026-09-09: four launch-off points; new customers start at Connect, everyone else at Observe) ----
  const violationsN = [...(est.policies || []), ...(s.customPolicies || [])].reduce((a, p) => a + (p.viol || 0), 0);
  // Big to tiny (Micah, 14:11): a card lands you inside the picture or the map at the level it names.
  const degConn = conns.rows.find(r => r.degraded) || conns.rows.find(r => r.hot) || null;
  const firstPublic = est.regionsList.find(r => !r.priv) || null;
  const launchGo = { connect: go('s3', { layer: 'cloud', tab: 'connect', cnPage: 'options' }), observe: go('s3', { layer: 'cloud', tab: 'observe', obPage: 'perf', obTab: 'flow', obPanel: 'health', mapSel: degConn ? degConn.id : null, mapRegion: degConn ? degConn.region : null, panelTab: 'impact' }), govern: go('s3', { layer: 'cloud', tab: 'govern' }), cost: go('s3', { layer: 'cloud', tab: 'cost' }) };
  const rollup = X.launchCards({ est: estOpen, ob, conns, totalSave, violations: violationsN, isEmpty }).map(r => ({ ...r, go: launchGo[r.key], hasSub: !!r.sub, barVis: r.bar !== null ? 'visible' : 'hidden', alarm: r.bar !== null && r.bar < 50, barColor: r.bar !== null && r.bar < 50 ? 'var(--warning)' : 'var(--cta)', barW: (r.bar || 0) + '%', hasBar: r.bar !== null, border: r.primary ? 'var(--cta)' : 'var(--border-secondary)', borderW: r.primary ? '2px' : '1px', hasEyebrow: !!r.eyebrow, doorInk: r.primary ? 'var(--cta)' : 'var(--link)', doorBg: r.primary ? 'var(--cta)' : 'transparent', doorColor: r.primary ? '#fff' : 'var(--link)', doorPad: r.primary ? '0 14px' : '0', doorBorder: r.primary ? '0' : '0' }));

  // ---- findings ----
  const findingCard = (f) => {
    const open = s.whyOpen === f.kind;
    return { ...f, key: f.kind, kindLabel: D.KINDS[f.kind], rec: (() => { const tiers = f.ladder.map((t, i) => ({ name: t, i })); const r = tiers[1] || tiers[0]; return { name: r ? r.name : 'Choose', choose: () => { const pid = PERSONA_PRODUCT[r.name]; if (pid) go('s8', { productId: pid })(); else go('s4')(); } }; })(), askAndi: () => set({ andiScope: { kind: 'finding', id: f.kind, label: D.KINDS[f.kind] }, andiOpen: true }), saveLine: f.priced ? `save ${fmt(f.save)}/mo` : '', toggleWhy: () => set({ whyOpen: open ? null : f.kind }), whyOpen: open, whyLabel: open ? 'Hide why' : 'Why we recommend this',
      tiers: f.ladder.map((t, i) => { const pid = PERSONA_PRODUCT[t]; const prod = pid && D.CATALOG.find(p => p.id === pid); const price = prod && prod.price ? `Starting at ${fmt(prod.price)}/mo` : (prod && prod.price === 0 ? 'No charge' : 'Priced after survey'); return { key: t, tier: TIERS[i], name: t, featured: i === 1, price: f.priced && i === 0 ? `save ${fmt(Math.round(f.save * 0.6))}/mo` : f.priced ? `save ${fmt(f.save)}/mo` : price, choose: () => chooseTier(c, f, t, prod, est) }; }) };
  };
  const floorFindings = sortF(est.findings).slice(0, 1).map(findingCard);
  const recFindings = sortF(est.findings).slice(0, 4).map(findingCard);
  const moreByTab = ['connect', 'govern', 'observe', 'cost'].map(t => ({ key: t, label: TAB_LABEL[t], n: est.findings.filter(f => f.tab === t && f.layer !== 'ai').length, go: go('s3', { layer: 'cloud', tab: t }) })).filter(x => x.n > 0);

  // ---- department ----
  const deptFindings = (tab) => sortF(findingsFor(s.layer, tab)).map(findingCard);
  const mostChosen = layerProducts(s.layer).sort((a, b) => b.popular - a.popular).slice(0, 3).map(p => productCard(c, p, est));
  const levelItems = levelMap(s, est, layer, drillInfo, set).filter(t => !s.levelQuery || t.name.toLowerCase().includes(s.levelQuery.toLowerCase()));
  const sorted = levelItems.sort((a, b) => s.levelSort === 'az' ? a.name.localeCompare(b.name) : s.levelSort === 'exposed' ? b.exposed - a.exposed : b.size - a.size).slice(0, 60);
  const connectVerdict = VD.connectVerdict(est, s.layer, levelItems);
  const connectEmptyHead = isEmpty ? 'Nothing connected yet' : connectVerdict;
  const catalogRow = layerProducts(s.layer).sort((a, b) => (a.id === 'hosted-vpc' ? -1 : b.id === 'hosted-vpc' ? 1 : b.popular - a.popular)).map(p => productCard(c, p, est));
  const visionRow = D.VISION.filter(v => v.layer === s.layer).map(v => ({ key: v.name, name: v.name }));
  const policies = [...layerPolicies(s, est, 'all'), ...(s.layer === 'cloud' ? (s.customPolicies || []) : [])].map(p => ({ ...p, key: p.name, dot: p.state === 'enforced' ? 'var(--success)' : p.state === 'simulated' ? 'var(--warning)' : 'var(--text-disabled)', violColor: p.viol ? 'var(--error)' : 'var(--text-body)', matched: p.matched.toLocaleString('en-US'), viol: p.viol.toLocaleString('en-US') }));
  const pciViol = (est.findings.find(f => f.kind === 'pci') || {}).head;
  const governVerdict = VD.governVerdict(est);
  const buckets = layerBuckets(s, est).map(b => ({ ...b, key: b.id, todayF: fmt(b.today), fabricF: fmt(b.fabric),
    explainGo: explainNav(c, { label: b.name || b.id, value: fmt(b.today) + '/mo',
      sub: `${fmt(b.today)}/mo on the hyperscaler against ${fmt(b.fabric)}/mo on AT&T.`,
      cut: 'The flow records in this bucket.',
      pattern: /internet|saas/i.test(b.name || '') ? 'internet' : /cross-cloud|inter/i.test(b.name || '') ? 'clouds' : /gpu|inference/i.test(b.name || '') ? 'internet' : null, parts: [] }), savedF: b.today > b.fabric ? fmt(b.today - b.fabric) : 'On AT&T', saved: b.today - b.fabric, action: b.today > b.fabric ? 'Steer this bucket' : 'Already steered', canSteer: b.today > b.fabric, steer: () => steerBucket(c, b, est), arb: `${fmt(b.today)}/mo today on ${b.cloud} · ${fmt(b.fabric)}/mo on AT&T · save ${fmt(b.today - b.fabric)}/mo` }));
  const steerable = buckets.filter(b => b.canSteer);
  const bTotal = buckets.reduce((a, b) => a + b.today, 0), bFab = buckets.reduce((a, b) => a + b.fabric, 0);
  const costVerdict = VD.costVerdict(estOpen, ob, totalSave, buckets);
  const kpis = isEmpty ? [] : kpiTiles(s, est);
  // The AT&T network picture opens on Home and Fabric; every other screen keeps a one-line strip and a "Show the AT&T network" door (audit finding 2).
  const heroScreen = ['s0', 's2'].includes(s.screen) || (s.screen === 's3' && s.layer === 'cloud' && s.tab === 'connect' && (s.cnPage || 'picture') === 'picture');
  const heroKey = s.screen === 's3' ? `s3/${s.layer}/${s.tab}` : s.screen;
  // One hero graph (Micah, 13:23): the picture is open on home and on all four pages.
  // A new customer's picture is empty; the scan leads and the picture waits behind its strip (no-scroll pass, 2026-09-28).
  const heroDefault = heroScreen && !isEmpty;
  const heroPref = (s.heroOpen || {})[heroKey];
  const heroOpen = heroPref === undefined ? heroDefault : !!heroPref;
  const toggleHero = () => { const next = { ...(s.heroOpen || {}), [heroKey]: !heroOpen }; set({ heroOpen: next }); try { localStorage.setItem('naas.hero', JSON.stringify(next)); } catch (e) {} };
  const sk = isEmpty ? null : sankey(est);
  const sankeyNodes = sk ? sk.nodes.map((n, i) => ({ ...n, key: 'n' + i, fill: n.priv ? '#0057b8' : 'var(--text-disabled)', tx: n.x === 0 ? n.x2 + 8 : n.x > 800 ? n.x - 8 : n.x2 + 8, anchor: n.x > 800 ? 'end' : 'start', ty: n.y + n.h / 2 + 4, h: Math.max(2, n.h) })) : [];
  const sankeyRibbons = sk ? sk.ribbons.map((r, i) => ({ ...r, key: 'r' + i, fill: r.priv ? '#3374cc' : '#8a949c' })) : [];
  const flows = isEmpty ? [] : D.FLOWS.map((f, i) => ({ ...f, key: 'f' + i, deny: f.action === 'deny', bg: f.action === 'deny' ? 'var(--bg-accent)' : 'transparent', dot: f.action === 'deny' ? 'var(--error)' : 'var(--success)' }));
  const verbTabs = TABS.map(t => ({ key: t, label: TAB_LABEL[t], sub: layer.sub ? layer.sub[t] : '', active: s.tab === t, go: () => { set({ tab: t }); syncHash('s3', s.layer, t); scrollToResult('S3 Department'); } }));
  const crumbLabel = (d) => S.labelOfKey(est, d);
  // The cloud crumb starts at the cloud name; the cloud drill starts at the
  // region. Index i of the crumb is depth i of the drill, so "AWS" clears it.
  const cloudCrumbs = ((regionDrill && regionDrill.crumb) || cloudDrill).map((name, i, a) => ({ key: 'c' + i, label: name, notLast: i < a.length - 1, ariaCurrent: i === a.length - 1 ? 'page' : 'false', go: () => set({ cloudDrill: cloudDrill.slice(0, i), cloudPick }) }));
  const crumbs = [{ key: 'floor', label: 'Home', go: go('s3', { layer: 'cloud', tab: 'connect', drill: [], cloudDrill: [], cloudPick: null }) }, ...s.drill.map((d, i) => ({ key: 'd' + i, label: crumbLabel(d), go: () => set({ drill: s.drill.slice(0, i + 1) }) }))].map((c, i, a) => ({ ...c, notLast: i < a.length - 1, ariaCurrent: i === a.length - 1 ? 'page' : 'false' }));
  const drillLabel = drillInfo ? (drillInfo.level === 'path' ? drillInfo.label : `${drillInfo.label} · ${drillInfo.level}s`) : '';
  // Breadcrumbs (2026-09-25, after NN/g's guidelines): one row at the top of the
  // picture, a trail per column. The root names the column, then the chosen
  // things. Ancestors are links; the last item is where you are and is not one.
  // One line, and a long trail keeps the root and the last two, folding the
  // middle into "…".
  const crumb = (label, isLast, goTo) => ({ key: label, label, isLast, isLink: !isLast, sep: true, go: isLast ? () => {} : goTo, title: label });
  const fold = (t) => {
    if (t.length <= 5) return t.map((c, i) => ({ ...c, key: i + ':' + c.key, sep: i > 0 }));
    // The row has room for five whole. Past that, the root, the parent and where
    // you are stay whole; the middle folds into "…", whose hover names it.
    const mid = t.slice(1, -2);
    return [t[0], { key: 'fold', label: '…', isLast: false, isLink: false, go: () => {}, title: mid.map(c => c.label).join(' › ') }, ...t.slice(-2)]
      .map((c, i) => ({ ...c, key: i + ':' + c.key, sep: i > 0 }));
  };
  // One size for the whole row; ancestors are links, the current place is the
  // one thing set darker and heavier, and the fold is quiet.
  const dress = (t) => t.map((c) => ({ ...c, isStatic: !c.isLink, aria: c.isLast ? 'location' : 'false',
    flex: c.isLast || c.label === '…' ? 'none' : '0 1 auto', maxW: c.isLast || c.label === '…' ? 'none' : '220px',
    weight: c.isLast ? 600 : 500, ink: c.label === '…' ? 'var(--text-light)' : 'var(--text-heading)' }));
  const plainKey = (d) => String(d).replace(/^region:/, '');
  // The filter row. A change clears the drill: a trail through a place the
  // filter just removed would drop the picture back to its root anyway.
  const setF = (patch) => set({ siteFilter: { ...siteF, ...patch }, drill: [], locMenu: false });
  const usedSvc = new Set((est.sites || []).flatMap(x => S.servicesOf(x).map(v => v.key)));
  const chipInk = (on) => ({ bg: on ? 'var(--bg-accent)' : 'var(--bg-base)', color: on ? 'var(--link)' : 'var(--text-body)', border: on ? 'var(--border-active)' : 'var(--border-secondary)', weight: on ? 600 : 400 });
  const svcChips = Object.values(S.SERVICE).filter(v => usedSvc.has(v.key)).map(v => { const on = (siteF.svc || []).includes(v.key);
    return { key: v.key, label: v.label, title: v.name, on, ...chipInk(on), go: () => setF({ svc: on ? siteF.svc.filter(k => k !== v.key) : [...(siteF.svc || []), v.key] }) }; });
  const reachChips = [['', 'Any'], ['att', 'On AT&T'], ['outside', 'Outside AT&T']].map(([k, l]) => { const on = (siteF.reach || '') === k; return { key: k || 'any', label: l, on, ...chipInk(on), go: () => setF({ reach: k || undefined }) }; });
  const places = (() => { const out = []; const seen = new Set();
    (est.sites || []).forEach(x => { const r = regionOf(x); if (!seen.has('region:' + r)) { seen.add('region:' + r); out.push({ key: 'region:' + r, label: r, depth: 0, region: r }); } });
    const withStates = out.flatMap(r => { const codes = [...new Set((est.sites || []).filter(x => regionOf(x) === r.region && S.stateOf(x.metro)).map(x => S.stateOf(x.metro)))].sort((a, b) => S.placeName(a).localeCompare(S.placeName(b)));
      return [r, ...codes.map(c => ({ key: 'state:' + c, label: S.placeName(c), depth: 1 }))]; });
    return withStates; })();
  const locLabel = siteF.loc ? (places.find(p => p.key === siteF.loc) || { label: siteF.loc }).label : 'All locations';
  const siteTotal = (est.sites || []).reduce((a, x) => a + S.countOf(x.name), 0), siteShown = (estF.sites || []).reduce((a, x) => a + S.countOf(x.name), 0);
  const nSvc = (siteF.svc || []).length;
  const filterVals = { svcChips, reachChips, filterOn, filterOff: !filterOn, hasSvcChips: svcChips.length > 1,
    svcLabel: nSvc ? (nSvc === 1 ? (S.SERVICE[siteF.svc[0]] || {}).label : `${nSvc} services`) : 'All services', svcOn: nSvc > 0, svcMenu: !!s.svcMenu, toggleSvcMenu: () => set({ svcMenu: !s.svcMenu, locMenu: false }), closeSvcMenu: () => set({ svcMenu: false }),
    svcBorder: nSvc ? 'var(--border-active)' : 'var(--border-secondary)', svcColor: nSvc ? 'var(--link)' : 'var(--text-body)', locBorder2: siteF.loc ? 'var(--border-active)' : 'var(--border-secondary)', locColor2: siteF.loc ? 'var(--link)' : 'var(--text-body)',
    siteFilterCount: `${siteShown.toLocaleString('en-US')} of ${siteTotal.toLocaleString('en-US')} sites`,
    clearFilters: () => set({ siteFilter: {}, drill: [], locMenu: false }),
    locLabel, locOn: !!siteF.loc, ...Object.fromEntries(Object.entries(chipInk(!!siteF.loc)).map(([k, v]) => ['loc' + k[0].toUpperCase() + k.slice(1), v])),
    locMenu: !!s.locMenu, toggleLocMenu: () => set({ locMenu: !s.locMenu, svcMenu: false }),
    locOptions: [{ key: 'all', label: 'All locations', depth: 0 }, ...places].map(p => { const on = (siteF.loc || 'all') === p.key;
      return { ...p, on, pad: p.depth ? '6px 12px 6px 28px' : '6px 12px', weight: on ? 600 : p.depth ? 400 : 600, color: on ? 'var(--link)' : p.depth ? 'var(--text-body)' : 'var(--text-heading)', go: () => setF({ loc: p.key === 'all' ? undefined : p.key }) }; }),
  };
  const siteTrail = dress(fold([
    crumb('All sites', !s.drill.length, () => set({ drill: [] })),
    ...s.drill.map((d, i) => crumb(/^region:/.test(d) ? plainKey(d) : crumbLabel(d), i === s.drill.length - 1, () => set({ drill: s.drill.slice(0, i + 1) }))),
  ]));
  const cloudNames = (regionDrill && regionDrill.crumb) || [];
  const cloudTrail = dress(fold([
    crumb('All clouds', !cloudPick, () => set({ cloudPick: null, cloudDrill: [] })),
    ...cloudNames.map((name, i) => crumb(name, i === cloudNames.length - 1, () => set(i === 0 ? { cloudDrill: [], cloudPick } : { cloudDrill: cloudDrill.slice(0, i), cloudPick }))),
  ]));

  // ---- compose ----
  const cp = s.compose;
  const outcome = D.OUTCOMES.find(o => o.id === cp.outcome);
  // Picking a metro, a control, a resiliency tier keeps building the SAME
  // order, so they spread `cp` unchanged. Changing the outcome on a compose
  // that carries a site count is a NEW order - u2/u3 never consume `qty`, so
  // the label and count would otherwise survive pointing at a price nothing
  // still explains (Fix round 2, finding E).
  // Fix round 3, finding H: guard on what an order actually looks like
  // (carriesOrder), not on `sourceLabel` alone - the drawer's bulk attach
  // carries `bulk`/`qty` with no label and was slipping past a
  // sourceLabel-only guard. `note` now lives inside `compose`, so cleaning
  // it is just part of cleanCompose; no separate parsedNote side effect.
  // Fix round 4, finding N1: carriesOrder must gate only the cleanCompose
  // half. An outcome switch is always a new order - a plain wizard compose
  // (no count, no label, no note; carriesOrder false) still left a stale
  // Review snapshot behind. `order: null` is now unconditional on any
  // outcome switch; a SAME-order patch (no `outcome` key) still leaves
  // `order` untouched either way.
  const setC = (patch) => { const startsNew = patch.outcome !== undefined; set({ compose: { ...(startsNew && carriesOrder(cp) ? cleanCompose(cp) : cp), ...patch, ...(patch.resiliency !== undefined ? { resiliencyChosen: true } : {}) }, ...(startsNew ? { order: null } : {}) }); };
  const toggle = (field, v, single) => () => { if (single) return setC({ [field]: v }); const arr = cp[field]; setC({ [field]: arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v] }); };
  const chipRow = (field, list, single) => list.map(v => ({ key: v, label: v, on: single ? cp[field] === v : cp[field].includes(v), click: toggle(field, v, single) }));
  const metroChips = (D.COMPOSE_CHIPS.regions[cp.regionTab] || []).map(m => ({ key: m, label: m, on: cp.metros.includes(m), click: () => setC({ metros: cp.metros.includes(m) ? cp.metros.filter(x => x !== m) : [...cp.metros, m].slice(-2) }) }));
  const regionTabs = Object.keys(D.COMPOSE_CHIPS.regions).map(r => ({ key: r, label: r, active: cp.regionTab === r, click: () => setC({ regionTab: r }) }));
  const constraint = cp.resiliency === 'Maximum' && cp.metros.length < 2 ? 'Maximum resiliency needs two metros. Add one.' : cp.resiliency === 'Geodiversity' && cp.metros.length < 2 ? 'Geodiversity needs two metros. Add one.' : cp.outcome === 'u3' && cp.dest.length < 1 ? 'Cloud to cloud needs a destination cloud. Pick one.' : '';
  const composed = composeOrder(cp, outcome, est);
  const summary = { ...composed, ready: !!outcome && !constraint, outcomeName: outcome ? outcome.name : 'Pick an outcome to start', dir: outcome ? outcome.dir : '', providers: [...cp.source, ...cp.dest].join(', ') || (outcome ? 'Pick a source and destination' : ''), tier: cp.resiliency, policyLine: composed.policies.map(p => p.req).join(' · ') || 'Control ships with the path', priceLine: composed.monthly ? `Starting at ${fmt(composed.monthly)}/mo` : '', saveLine: composed.savings ? `save ${fmt(composed.savings)}/mo vs public egress` : '', timeline: outcome ? `${composed.days} business days` : 'Set once the order has lines', wires: cp.resiliency === 'Standard' ? 1 : 2, wireW: cp.resiliency === 'Maximum' ? 4 : cp.resiliency === 'Geodiversity' ? 3 : 2, shield: cp.control.includes('Inline inspection') || cp.control.includes('No direct internet path'), ghost: !outcome, srcLabel: cp.source[0] || 'Source', dstLabel: cp.dest[0] || 'Destination', dir: outcome ? outcome.dir : '' };
  const outcomeCards = D.OUTCOMES.map(o => ({ ...o, key: o.id, on: cp.outcome === o.id, click: () => setC({ outcome: o.id, control: o.control.slice(), source: o.id === 'u1' ? ['Data center'] : ['A cloud region'], dest: o.id === 'u2' ? ['The Internet'] : ['Clouds'] }), controlLine: o.control.join(', ') }));

  // ---- review ----
  const ord = s.order || composed;
  const orderLines = (ord.lines || []).map((l, i) => ({ ...l, key: 'l' + i, qtyF: l.qty.toLocaleString('en-US'), monthlyF: l.unpriced ? 'Priced after survey' : l.perSite ? `${fmt(l.unitPrice)}/mo per site` : fmt(l.monthly) + '/mo', color: l.unpriced ? 'var(--text-light)' : 'var(--text-heading)' }));
  const pricedTotal = (ord.lines || []).filter(l => !l.unpriced).reduce((a, l) => a + l.monthly, 0);
  const termDisc = { 0: 0, 12: 15, 24: 30, 36: 50 }[s.term];
  const termTotal = Math.round(pricedTotal * (1 - termDisc / 100));
  const unpriced = (ord.lines || []).filter(l => l.unpriced).map((l, i) => ({ key: 'u' + i, product: l.product }));
  const orderPolicies = (ord.policies || []).map((p, i) => ({ ...p, key: 'p' + i }));
  const orderInspection = (ord.lines || []).some(l => /hosted VPC|hosted VNet|Hosted VPC/i.test(l.product || '')) ? ', with inspection from the vSRX pair' : '';
  const termOptions = [0, 12, 24, 36].map(t => ({ key: 't' + t, label: t ? t + '-month' : 'On-demand', on: s.term === t, click: () => set({ term: t }) }));

  // ---- browse ----
  const q = s.browseQuery.trim().toLowerCase();
  const filtered = D.CATALOG.filter(p => (!s.browseCat || p.cat === s.browseCat) && (!q || (p.name + ' ' + p.promise + ' ' + p.tags.join(' ')).toLowerCase().includes(q)) && (!s.filterProviders.length || s.filterProviders.includes(p.provider)) && (!s.priceCeil || (p.price || 0) <= s.priceCeil));
  const sortedProducts = filtered.sort((a, b) => s.browseSort === 'price' ? (a.price || 0) - (b.price || 0) : s.browseSort === 'name' ? a.name.localeCompare(b.name) : b.popular - a.popular);
  const results = sortedProducts.map(p => productCard(c, p, est));
  const browsing = !!(q || s.browseCat || s.filterProviders.length || s.priceCeil);
  const providers = [...new Set(D.CATALOG.map(p => p.provider))];
  const filterCount = s.filterProviders.length + (s.priceCeil ? 1 : 0) + (s.browseCat ? 1 : 0);
  const categories = D.CATEGORIES.map(cat => ({ ...cat, key: cat.id, count: D.CATALOG.filter(p => p.cat === cat.id).length, on: s.browseCat === cat.id, click: () => set({ browseCat: s.browseCat === cat.id ? null : cat.id }) }));
  const byIds = (ids) => ids.map(id => D.CATALOG.find(p => p.id === id)).filter(Boolean).map(p => productCard(c, p, est));
  const curated = [{ key: 'most', title: 'Most chosen by estates like yours', items: byIds(['hosted-vpc', 'netbond', 'steer', 'ngfw']) }, { key: 'new', title: 'New on AT&T', items: byIds(['hosted-vnet', 'neocloud', 'lmcc', 'ai-transport']) }, { key: 'ai', title: 'Runs with AI Fabric', items: byIds(['ai-gov', 'ai-assess', 'ai-transport', 'neocloud']) }];
  const visionTiles = D.VISION.map(v => ({ key: v.name, name: v.name, layer: D.LAYERS.find(l => l.id === v.layer).label }));

  // ---- product ----
  const prod = D.CATALOG.find(p => p.id === s.product) || D.CATALOG[0];
  const pc = productCard(c, prod, est);
  const productDetail = { ...pc, included: prod.included.map(x => ({ key: x, label: x })), limits: prod.limits.map(x => ({ key: x, label: x })), runsWith: byIds(prod.runsWith || []), evidence: prod.evidence || `${60 + (prod.popular % 30)}% of estates your size run this`, hasEvidence: true, terms: prod.price ? [12, 24, 36].map(t => ({ key: 't' + t, term: t + '-month', price: fmt(prod.price * (1 - { 12: .15, 24: .3, 36: .5 }[t])) + '/mo', save: `save ${{ 12: 15, 24: 30, 36: 50 }[t]}% vs on-demand` })) : [], hasStages: !!prod.stages, stages: D.LIFECYCLE.map((l, i) => ({ key: l, label: l, x: 40 + i * 70 })) };

  // ---- discover ----
  const scanSteps = [
    { label: 'Finding cloud inventory', src: 'regions, VPCs and VNets, subnets, gateways, endpoints, workloads' },
    { label: 'Reading AT&T access records', src: 'NetBond, AVPN (MPLS VPN), ADI (Dedicated Internet), ABF (Business Fiber)' },
    { label: 'Checking on-ramp coverage per metro', src: '41 metros' },
    { label: 'Joining utilization and egress spend', src: 'last 30 days' },
  ].map((st, i) => ({ ...st, key: 'sc' + i, done: s.scanStep > i, active: s.scanStep === i, color: s.scanStep > i ? 'var(--success)' : s.scanStep === i ? 'var(--cta)' : 'var(--border-primary)', textColor: s.scanStep >= i ? 'var(--text-heading)' : 'var(--text-disabled)' }));
  // The app promised "refreshed daily" three times during onboarding and then
  // never mentioned it again. The promise is now a choice, made where the scan
  // ends, and the three intake strings read it back.
  const intakeCadence = s.intakeCadence || 'nightly';
  const intakeSch = SCH.scheduleById(intakeCadence) || SCH.scheduleById('nightly');
  const intakeCadenceLabel = SCH.scheduleLabel(intakeSch);
  const intakeCadenceLower = intakeCadenceLabel.toLowerCase();
  const cadenceAsk = !!s.cadenceAsk && s.scanStep >= 4;
  const cadenceAskText = `Discovery runs ${intakeCadenceLower} from now on, read-only, with no change to routing. Change it here, or later from the Accounts card.`;
  const setIntakeCadence = (e) => set({ intakeCadence: e.target.value });
  const confirmCadence = () => {
    const map = {};
    sched.accounts.forEach(a => { map[a.id] = intakeSch; });
    set({ acctSched: { est: est.id, map }, cadenceAsk: false });
  };
  const discoverVerdict = isEmpty ? 'Add a cloud credential or pick an inventory to start.' : `${estatePhrase(est)}. ${est.privatePct}% already reach AT&T privately.`;
  const discoverKpis = isEmpty ? [] : [{ key: 'a', v: est.workloads.toLocaleString('en-US'), l: 'assets discovered', e: `${plural(est.clouds, 'cloud', 'clouds')}, ${plural(est.regions, 'region', 'regions')}` }, { key: 'b', v: `${est.attachedRegions} of ${est.regions}`, l: 'regions attached', e: 'private path to AT&T' }, { key: 'c', v: `${pct(est.attachedRegions, est.regions)}%`, l: 'cloud attach rate', e: 'regions with a private path' }, { key: 'd', v: est.tags, l: 'tags discovered', e: 'from cloud resource tags' }];
  const chipSets = [{ g: 'Region', v: ['US East', 'US West', 'Europe', 'APAC'] }, { g: 'Site class', v: ['Data center', 'Branch', 'Campus'] }, { g: 'Business unit', v: ['Finance', 'Retail', 'Platform'] }, { g: 'Cloud', v: ['AWS', 'Azure', 'GCP'] }, { g: 'Connection type', v: ['NetBond', 'DX', 'ER', 'Internet'] }];
  const estateChips = chipSets.flatMap(g => g.v.map(v => ({ key: v, label: v, on: s.chips.includes(v), click: () => set({ chips: s.chips.includes(v) ? s.chips.filter(x => x !== v) : [...s.chips, v] }) })));
  const chipScope = s.chips.length ? `Scoped to ${s.chips.join(', ')}` : 'Whole estate';
  const REGION_OF = (r) => /^(us|ca|sa|eastus|centralus|westus)/.test(r) ? (/west/.test(r) && !/eu/.test(r) ? 'US West' : 'US East') : /^(eu|europe|west|north|france|uk)/.test(r) ? 'Europe' : 'APAC';
  const FACETS = [
    { values: ['US East', 'US West', 'Europe', 'APAC'], test: (r, v) => REGION_OF(r.region) === v },
    { values: ['Data center', 'Branch', 'Campus'], test: (r, v, i) => ['Data center', 'Branch', 'Campus'][i % 3] === v },
    { values: ['Finance', 'Retail', 'Platform'], test: (r, v) => v === 'Finance' ? (r.tags || []).includes('Finance') : v === 'Platform' ? (r.tags || []).some(t => /Prod|AI|GPU/.test(t)) : !(r.tags || []).length || (r.tags || []).includes('Internet-facing') },
    { values: ['AWS', 'Azure', 'GCP'], test: (r, v) => r.cloud === v },
    { values: ['NetBond', 'DX', 'ER', 'Internet'], test: (r, v) => v === 'Internet' ? !r.priv : r.ramp === v },
  ];
  const tree = est.regionsList.filter((r, i) => FACETS.every(f => { const sel = s.chips.filter(c => f.values.includes(c)); return !sel.length || sel.some(v => f.test(r, v, i)); })).map(r => {
    const openKey = r.region, open = !!s.treeOpen[openKey];
    const vpcs = [1, 2].map(n => ({ key: r.region + n, name: `${r.cloud === 'Azure' ? 'vnet' : 'vpc'}-${r.region}-${n}`, subnets: n === 1 ? 3 : 2, wl: Math.round(r.wl / 2) }));
    return { ...r, key: r.region, open, caret: open ? 'v' : '>', toggle: () => set({ treeOpen: { ...s.treeOpen, [openKey]: !open } }), vpcs, tagChips: (r.tags || []).map(t => ({ key: t, label: t })), rampLabel: r.ramp || 'Public', rampColor: r.priv ? 'var(--link)' : 'var(--text-light)' };
  });
  const bigEstate = est.id === 'trust';
  const mapRows = tree.map((r, i) => ({ ...r, key: 'm' + r.region, y: 30 + i * 30, cy: 45 + i * 30, open: () => set({ openWorkload: r.region }), stroke: r.priv ? '#3374cc' : 'var(--text-disabled)', dash: r.priv ? 'none' : '5 5', wlLabel: `${r.wl.toLocaleString('en-US')} workloads` }));
  const mapH = 60 + mapRows.length * 30;
  const mapSites = (bigEstate ? est.sites : est.sites).slice(0, 7).map((st, i) => ({ ...st, key: 'ms' + i, y: 30 + i * 30 }));
  const ow = s.openWorkload && est.regionsList.find(r => r.region === s.openWorkload);
  const chain = ow ? [{ key: 'fm', step: 'First mile', v: est.sites[0] ? est.sites[0].access : 'Internet' }, { key: 'or', step: 'On-ramp', v: ow.ramp || 'Public internet' }, { key: 'hv', step: ow.cloud === 'Azure' ? 'Hosted VNet' : 'Hosted VPC', v: ow.priv ? `AT&T-hosted ${ow.cloud === 'Azure' ? 'VNet' : 'VPC'} ${ow.region}` : 'None' }, { key: 'wl', step: 'Workload', v: `${ow.wl} in ${ow.region}` }] : [];
  const chainPolicies = ow ? est.policies.filter(p => (ow.tags || []).some(t => p.match.includes(t))).map(p => ({ key: p.name, ...p })) : [];

  // ---- packages / tailored ----
  const packages = D.PACKAGES.map(p => ({ ...p, key: p.id, odF: fmt(p.od) + '/mo', m36F: `36-month: ${fmt(p.m36)}/mo · save 50% vs on-demand`, included: p.included.map(x => ({ key: x, label: x })), limits: p.limits.join(' · '), bg: p.featured ? 'var(--cta)' : 'var(--bg-base)', color: p.featured ? '#fff' : 'var(--text-heading)', sub: p.featured ? '#cfe3ff' : 'var(--text-light)', border: p.featured ? 'var(--cta)' : 'var(--border-secondary)', btnBg: p.featured ? '#fff' : 'var(--cta)', btnColor: p.featured ? 'var(--cta)' : '#fff', choose: () => { set({ order: packageOrder(p), screen: 's6', term: 36 }); window.scrollTo(0, 0); } }));
  const tl = est.tailored || { addons: [], terms: [], hubs: [] };
  const tailored = { addons: tl.addons.map(a => ({ ...a, key: a.conn })), terms: tl.terms.map(t => ({ ...t, key: t.conn, odF: fmt(t.od), m12F: fmt(t.m12), m36F: fmt(t.m36), save: `save ${pct(t.od - t.m36, t.od)}%` })), hubs: tl.hubs.map(h => ({ ...h, key: h.loc })), automation: ['Portal', 'API', 'Terraform'].map(a => ({ key: a, label: a, active: (s.autoTab || 'Portal') === a, click: () => set({ autoTab: a }) })), autoTab: s.autoTab || 'Portal', autoText: { Portal: 'Every order in this store, with approval flow and Pending Actions.', API: 'Provisioning, Network Insights and Billing APIs. Same contract as the composer.', Terraform: 'att_naas provider: hosted VPC, policy, attach and steer as resources.' }[s.autoTab || 'Portal'] };

  const stageKicker = `For ${persona}: ${PERSONA_LINE[persona] || ''}`;
  const floorVerdict0 = isEmpty ? `${est.name} has no active connections. AT&T already sees 41 metros with on-ramps and 12 clouds you could reach.` : isMature ? `${est.name}: ${est.privatePct}% of ${est.workloads.toLocaleString('en-US')} workloads reach AT&T privately. ${est.findings.length} things left to close.` : `${est.name}: ${est.privatePct}% of ${est.workloads.toLocaleString('en-US')} workloads reach AT&T privately. ${fmt(totalSave)}/mo in savings identified.`;

  const floorVerdict = isEmpty ? '0 connections · 41 metros · 12 clouds reachable' : `${est.privatePct}% of ${est.workloads.toLocaleString('en-US')} workloads private · ${est.findings.length} to close`;
  const showPending = s.submitted && !s.pendingDismissed && (s.screen === 's2' || s.screen === 's6' || (s.screen === 's3' && !!s.landed));
  const landedAll = !!s.landed;
  const pendingStages = D.LIFECYCLE.map((l, i) => landedAll ? ({ key: l, label: l, fill: 'var(--success)', ring: 'var(--success)', color: 'var(--text-heading)', line: 'var(--success)' }) : ({ key: l, label: l, fill: i < 2 ? 'var(--success)' : i === 2 ? 'var(--cta)' : 'var(--bg-base)', ring: i < 2 ? 'var(--success)' : i === 2 ? 'var(--cta)' : 'var(--border-primary)', color: i <= 2 ? 'var(--text-heading)' : 'var(--text-disabled)', line: i < 2 ? 'var(--success)' : 'var(--border-secondary)' }));

  const out = {
    theme: s.theme, themeLabel: s.theme === 'light' ? 'Dark' : 'Light', themeTitle: s.theme === 'light' ? 'Dark mode' : 'Light mode', themeIsLight: s.theme !== 'dark', themeIsDark: s.theme === 'dark', toggleTheme: () => set({ theme: s.theme === 'light' ? 'dark' : 'light' }),
    // An estate switch starts clean (2026-09-30): a By pick or a drill the new
    // estate lacks drew an empty map with a phantom "Internet 1.0 Gbps".
    view: s.view, setView: (e) => set({ view: e.target.value, estateParam: null, fdKey: null, drill: [], cloudDrill: [], cloudPick: null, fabDrill: [], regionDrill: null, simulated: false, enforced: false, scanStep: s.screen === 's1' ? 0 : s.scanStep, obScope: 'all', obDim: 'all', mapOpen: [], mapSel: null, mapRegion: null, cloudTrailE: [], placeTrail: [], cloudPage: 0, placePage: 0, segOpen: null, segTrail: [], segPage: 0, pathSel: null, pathsPage: 0, changesPage: 0, ticketPage: 0, fixPage: 0, availPage: 0, changePage: 0 }),
    resetDemo: () => { try { DEMO_KEYS.forEach(k => localStorage.removeItem(k)); } catch (e) {} const d = defaults(); set({ findingLife: {}, siteTags: {}, buCustom: {}, buActive: null, addedSources: [], heroOpen: undefined, openHintSeen: false, headOpen: undefined, obScope: 'all', obDim: 'all', mapOpen: [], mapSel: null, mapRegion: null, cloudTrailE: d.cloudTrailE, placeTrail: d.placeTrail, cloudPage: 0, placePage: 0, drill: [], cloudDrill: [], cloudPick: null, fabDrill: [], fdKey: null }); },
    // Fix round 4, finding N2: the fresh branch used to call newOrder(...),
    // which nulled s.order even when the live compose had not started an
    // outcome yet - exactly the state right after a marketplace product
    // pick (the product path sets s.order but never touches compose). This
    // shortcut means "start composing," not "discard whatever was just
    // reviewed," so it writes a fresh compose without resetting order; only
    // an actual outcome switch (setC) resets a stale order now.
    goFront: go('s3', { layer: 'cloud', tab: 'connect' }), goFloor: go('s3', { layer: 'cloud', tab: 'connect' }), goDiscover: go('s1'), goCompose: () => { c.setState({ screen: 's4', ...(cp.outcome ? { compose: { ...cp, step: cp.step || 0 } } : { compose: prefillCompose(est) }) }); window.scrollTo(0, 0); syncHash('s4'); }, goBrowse: go('s7', { browseCat: null, browseQuery: '' }), goRecommend: go('s5'), goReview: go('s6'),
    hasTasks: s.submitted, taskCount: 1, showPending, pendingStages, landed: landedAll, notLanded: !landedAll, pendingSub: landedAll ? 'Validated · live. First flow logs are in.' : 'Submitted for approval',
    deliverNow: () => { const cand = (s.compose && s.compose.prefillRegion ? s.compose.prefillRegion.split(' ')[1] : null) || (estRaw.regionsList.find(r => !r.priv) || {}).region; if (!cand) return; c.setState({ landed: cand, layer: 'cloud', tab: 'observe', screen: 's3', events: [...(s.events || []), { key: 'e' + ((s.events || []).length + 1), t: SCH.hhmm(SCH.nowOf(s)), text: `${cand} validated · live. Hosted VPC on AT&T; first flow logs received; coverage up by one region.` }] }); syncHash('s3', 'cloud', 'observe'); scrollToResult('S3 Department'); },
    ...shellVals(s, set, go, est, c, sched),
    headOpen: s.headOpen !== false, headClosed: s.headOpen === false, toggleHead: () => { const v = s.headOpen === false; set({ headOpen: v }); try { localStorage.setItem('naas.headOpen', String(v)); } catch (e) {} }, headRot: s.headOpen === false ? 'rotate(-90deg)' : 'rotate(0deg)',
    ...andiVals(s, set, go, est, ob, { conns, floorVerdict, connectVerdict, governVerdict, costVerdict, discoverVerdict, stageKicker, findingCard, sortF, findingsFor, isEmpty, totalSave, persona, personaTab }),
    pageVerdict: s.screen === 's3' ? (s.tab === 'govern' ? governVerdict : s.tab === 'cost' ? costVerdict : s.tab === 'observe' ? (observeHead || ob.verdict) : connectVerdict) : s.screen === 's2' ? floorVerdict0 : '', pageStat: s.screen === 's3' ? ({ connect: connectStat(est, s.layer), observe: `${(ob.total || 0).toFixed(1)} Gbps · ${ob.covPct || 0}% on AT&T · ${conns.degraded} degraded · ${conns.rows.filter(r => r.hot && !r.degraded).length} saturating · ${(ob.blind || []).length} blind`, govern: `${est.policiesEnforced} of ${est.policiesAuthored} policies enforced · ${violationsN.toLocaleString('en-US')} violations`, cost: `${totalSave ? fmt(totalSave) + '/mo on the table · ' : ''}${fmt(ob.savingsMo || 0)}/mo saved · ${fmt(ob.egressMo || 0)}/mo egress` }[s.tab] || '') : s.screen === 's2' ? floorVerdict : '', hasPageSub: s.screen === 's3' || s.screen === 's2', personaLine: PERSONA_LINE[persona] || '', connectEmptyHead, connectEmptySub: isEmpty ? 'Start with one of the packages below.' : 'Nothing to close here today. The products estates like yours chose, if you want to add more.',
    persona: s.persona || 'neteng', personaName: persona, setPersona: (e) => set({ persona: e.target.value }), personas: PERSONAS.map(p => ({ key: p, label: p })), moreByTab, hasMoreByTab: moreByTab.length > 0, pendingTitle: (s.order && s.order.title) || 'Hosted VPC order', dismissPending: () => set({ pendingDismissed: true }),
    estateName: est.name, isEmpty, isPartial, isMature, notEmpty: !isEmpty, stageKicker, floorVerdict,
    // Discover has two views: the estate, and its sources (source management).
    // A page is titled by its group (2026-09-29 consistency pass); the rail says which view.
    s1Title: 'Discover',
    showSourcesBody: !isEmpty && s.discoverView === 'sources', showEstateBody: !isEmpty && s.discoverView !== 'sources',
    showEstateStats: s.scanStep >= 4 && s.discoverView !== 'sources',
    sS0: s.screen === 's0' || (s.screen === 's2' && isEmpty), sS1: s.screen === 's1', sS2: s.screen === 's2' && !isEmpty, showLaunch: !isEmpty && (s.screen === 's2' || (s.screen === 's3' && s.layer === 'cloud' && s.tab === 'connect' && !['options', 'ways'].includes(s.cnPage))), sS3: s.screen === 's3', sS4: s.screen === 's4', sS5: s.screen === 's5', sS6: s.screen === 's6', sS7: s.screen === 's7', sS8: s.screen === 's8',
    heroVB: `0 0 ${L.W} ${L.H}`,
    fabricHealth: (() => {
      const rows = conns.rows || [];
      const bad = rows.filter(r => r.state === 'Degraded');
      const hot = rows.filter(r => r.state === 'Saturating');
      const blind = (obAll.blind || []).length;
      const ok = rows.length - bad.length - hot.length;
      const parts = [];
      if (bad.length) parts.push({ key: 'bad', dot: 'var(--error)', text: `${bad.length} degraded`, title: bad.map(r => r.cloud + ' ' + r.region).join(', ') });
      if (hot.length) parts.push({ key: 'hot', dot: 'var(--warning)', text: `${hot.length} saturating`, title: hot.map(r => r.region + ' at ' + r.pct + '%').join(', ') });
      if (blind) parts.push({ key: 'blind', dot: 'var(--text-disabled)', text: `${blind} without flow logs`, title: 'Regions sending no flow logs' });
      if (rows.length) parts.push({ key: 'ok', dot: 'var(--success)', text: `${ok} of ${rows.length} healthy`, title: 'Connections healthy' });
      return parts;
    })(), clearHover: () => set({ hoverNode: null, hoverRegion: null }), laneY: L.lane.y, laneH: L.lane.h, bandY: L.bandY, bandH: L.bandH, facH: L.H - L.bandY * 2, strataCardH, strataPadY: strataTight ? 6 : 10, strataRowGap: strataTight ? 3 : 6, footY: L.H - 54, footY2: L.H - 48, heroVisible: heroScreen && heroOpen, heroStrip: heroScreen && !heroOpen, heroCanHide: heroScreen && heroOpen && !heroDefault, toggleHero, heroStripText: isEmpty ? 'Your sites, the AT&T network and your clouds, drawn after the first scan' : `${est.attachedRegions} of ${est.regions} regions on AT&T · ${est.regions - est.attachedRegions} on the public internet · ${(est.sitesCount || est.sites.length).toLocaleString('en-US')} sites`, inDept, overlayLegend: overlayLegend(s, R), hasOverlay: inDept, scrubT: s.scrubT == null ? 100 : s.scrubT, setScrub: (e) => set({ scrubT: +e.target.value }), showScrub: inDept && s.tab === 'observe', showForecast: inDept && s.tab === 'cost', fcT: s.fcT == null ? 0 : s.fcT, setFc: (e) => set({ fcT: +e.target.value }), fcLabel: (s.fcT || 0) === 0 ? 'today' : '+' + Math.round((s.fcT || 0) * 0.9) + ' days', heroRolled: s.screen === 's0', healthStrip: hp.strip, hasHealth: s.screen !== 's3', healthIncidents: probRows.map((x, i) => ({ ...x, text: `${x.where} · ${x.what} · ${x.age}${x.wl ? ` · ${x.wl.toLocaleString('en-US')} workloads behind it` : ''}`, key: 'hi' + i, go: go('s3', { layer: 'cloud', tab: 'observe', mapSel: conns.rows.some(r => r.region === x.region) ? 'cx-' + x.region : null, mapRegion: x.region, panelTab: 'impact' }) })), hasIncidents: probRows.length > 0 && s.screen !== 's3',
    headStart: D.HEADSTART.map(h => ({ ...h, key: h.cat, go: go('s7', { browseCat: h.cat }) })), headStartVerdict: isEmpty ? 'AT&T already sees the metros, clouds and paths you could use. Tell us two things and the store composes the rest.' : `${est.name} is recognized. ${estatePhrase(est)} already visible.`,
    modeTabs: [{ key: 'foryou', label: 'For you', active: !['s7', 's8'].includes(s.screen), click: () => { set({ mode: 'foryou' }); go('s3', { layer: 'cloud', tab: 'connect' })(); } }, { key: 'browse', label: 'Browse the marketplace', active: ['s7', 's8'].includes(s.screen), click: () => { set({ mode: 'browse' }); go('s7')(); } }],
    // The Sources page (a customer with no source yet): each cloud by the
    // credential it takes, and AT&T inventory, which takes none.
    sourcesPage: isEmpty,
    sourceTiles: [['AWS', 'Cross-account role', 'AWS'], ['Azure', 'Service principal', 'Azure'], ['Google Cloud', 'Service account', 'GCP'], ['Oracle Cloud', 'API signing key', 'Oracle'], ['CoreWeave', 'API key', 'CoreWeave'], ['AT&T inventory', 'NetBond and AVPN, no credential', null]].map(([name, cred, key]) => {
      const on = key ? s.intakeSource !== 'inventory' && (s.intakeProvider || 'AWS') === key : s.intakeSource === 'inventory';
      return { key: 'tile:' + name, name, cred, provider: key || 'AT&T', on, border: on ? 'var(--cta)' : 'var(--border-secondary)', bg: on ? 'var(--bg-accent)' : 'var(--bg-base)',
        pick: () => set(key ? { intakeSource: 'credential', intakeProvider: key } : { intakeSource: 'inventory' }) };
    }),
    intakeOrg: s.intakeOrg, setOrg: (e) => set({ intakeOrg: e.target.value }), intakeSource: s.intakeSource, setSource: (v) => () => set({ intakeSource: v }), srcCredential: s.intakeSource === 'credential', srcInventory: s.intakeSource === 'inventory', intakeProvider: s.intakeProvider, setProvider: (e) => set({ intakeProvider: e.target.value }), startScan: () => { set({ view: 'partial', estateParam: null, screen: 's1', discoverView: 'estate', scanStep: 0, cadenceAsk: true }); startScan(c); syncHash('s1'); }, credBorder: s.intakeSource === 'credential' ? 'var(--border-active)' : 'var(--border-secondary)', invBorder: s.intakeSource === 'inventory' ? 'var(--border-active)' : 'var(--border-secondary)',
    // hero
    drawer, drawerOpen, openLevel, hasDrawer: drawerOpen, noDrawer: !drawerOpen, andiFabRight: drawerOpen ? '396px' : '16px',
    fabOpen: fabDrill.length > 0, fabClosed: fabDrill.length === 0, sitesDoor, bandDoor, cloudsDoor, fabRows, fabHead, fabUp, fabTrail, hasFabMore: !!(fabHead && fabHead.more), fabMore: fabHead ? fabHead.more : '', openBandLevel: () => openLevel('fabric'), fabHeadY: L.bandY + 8, fabEmpty, fabEmptyY: L.bandY + 40, fabEmptyHead: fabInfo ? fabInfo.emptyHead : '', fabEmptyLine: fabInfo ? fabInfo.emptyLine : '', fabEmptyCta: fabInfo ? fabInfo.emptyCta : '', fabEmptyGo, bandX: L.bandX, bandW: L.bandW, bandLabelX: L.bandX, laneX: L.lane.x, laneW: L.lane.w,
    laneFocus: !!s.laneFocus, toggleLane: () => set({ laneFocus: !s.laneFocus }), laneTitle: s.laneFocus ? 'Show everything' : 'Show only what rides outside AT&T', laneCount: (() => { const sN = est.sites.filter(x => !x.priv).reduce((a, x) => a + S.countOf(x.name), 0), rN = est.regionsList.filter(r => !r.priv).length; return [sN ? `${sN} ${sN === 1 ? 'site' : 'sites'}` : '', rN ? `${rN} ${rN === 1 ? 'region' : 'regions'}` : ''].filter(Boolean).join(' · ') + ' on the internet'; })(), laneAttach: () => { const r = est.regionsList.find(x => !x.priv); if (r) composeFor(go, r)(); else { c.setState({ screen: 's4', ...newOrder(prefillCompose(est)) }); } },
    heroSites, heroRegions, heroClouds, heroGroups: L.groups.map(g => ({ ...g, key: 'g' + g.cloud + g.y })), heroWorkloads: [], heroEdges, heroArcs, segments: segmentsMeta, nodes: nodesMeta, pieces: piecesMeta, foldTags, routeDots, pipeOp: folded ? 1 : 0, xconnects: xconnectsMeta, ownerKey: Object.entries(OWNER).map(([k, o]) => ({ key: k, ...o })), showWorkloads: false, graphHeadFs: headUnits(L.W) + 'px', rightX: L.rightX,
    // A drilled column sits on a tinted panel.
    colTintH: L.H - 30, siteTintOp: s.drill.length ? 1 : 0, cloudTintOp: cloudPick ? 1 : 0, cloudTintX: L.rightX - 14, internetTx: L.rightX + 12, internetY: L.internet.y, internetTy: L.internet.y + 19, bandFill, bandOpen: false, toggleBand: () => set({ fabDrill: (s.fabDrill || []).length ? [] : ['fab'], picked: [] }), bandLabel: (s.fabDrill || []).length ? '‹ AT&T network' : 'AT&T network  ›', facilityRows, routePreview, hasRoute: !!routePreview, routeLabel: routePreview ? `${routePreview.a} to ${routePreview.b}: ${routePreview.ms} ms on AT&T` : 'Pick two metros to preview a route', ghost: L.ghost, regionDrilled: cloudDrill.length > 0, clearRegionDrill: () => set({ cloudDrill: [] }), drillCount: s.drill.length,
    // The card anchors to the hovered region's row; at the provider level there is no row.
    perfCard: hr && hrNode ? { region: `${hr.cloud} ${hr.region}`, msLine: `${hr.priv ? hr.fab : hr.pub} ms ${hr.priv ? 'on AT&T' : 'public'}${hr.rel === 'warn' ? ' · degraded' : ''}`, pub: `Public today ${hr.pub} ms`, fab: `on AT&T ${hr.fab} ms`, rel: hr.rel === 'warn' ? 'Reliability: degraded' : 'Reliability: healthy', relFill: hr.rel === 'warn' ? 'var(--warning)' : 'var(--success)', top: Math.max(0, Math.min(340, hrNode.y - 70)) + 'px', left: 'calc(100% - 236px)', go: go('s3', { layer: 'cloud', tab: 'observe' }) } : null, hasPerf: !!hr,
    // floor
    openFindingsN: openF.length, findingsAllN: est.findings.length, eventsN: findList.filter(f => f.event).length,
    obWinWords: winLabelOf(s),
    rollup, floorFindings, hasFloorFindings: floorFindings.length > 0, recFindings, hasRecFindings: recFindings.length > 0, packages, tailored, hasTailored: isMature, hasAddons: tailored.addons.length > 0, hasTermUps: tailored.terms.length > 0, hasHubs: tailored.hubs.length > 0,
    // department
    layerBar: D.LAYERS.map(l => ({ key: l.id, label: l.label, on: s.layer === l.id, go: () => { set({ layer: l.id, drill: [], regionDrill: null }); syncHash('s3', l.id, s.tab); scrollToResult('S3 Department'); }, bg: s.layer === l.id ? 'var(--cta)' : 'transparent', color: s.layer === l.id ? '#fff' : 'var(--text-heading)' })),
    backToPicture: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
    // Help & Resources (2026-09-28), modelled on NetBond Advanced's /support page
    // (att-netbond-sdci HelpResourcesPage.tsx): Andi in the hero, guides built
    // from this estate, the seven resources, the storefront's own glossary.
    ...(() => {
      const q = (s.helpQ || '').trim().toLowerCase();
      const iconDir = s.theme === 'dark' ? 'brand/icons-dark' : 'brand/icons-light';
      const hit = (t) => !q || t.toLowerCase().includes(q);
      const tpaN = (est.sites || []).filter(x => !x.priv && S.servicesOf(x).some(v => v.key === 'tpa')).length;
      const pubR = est.regionsList.filter(r => !r.priv);
      const bareTag = (est.policies || []).length < 8;
      const guides = (est.stage === 'empty' ? [
        { key: 'source', icon: 'lock', title: 'Add your first source', steps: ['Pick a cloud account', 'Give AT&T read-only access', 'Discovery draws your estate'], cta: 'Add a source', go: go('s1', { discoverView: 'sources' }) },
        { key: 'first', icon: 'cloud', title: 'Connect your first cloud', steps: ['Choose the region', 'Pick NetBond or the on-ramp', 'Order and watch it come up'], cta: 'Open Connect', go: go('s3', { layer: 'cloud', tab: 'connect' }) },
      ] : [
        ...(tpaN ? [{ key: 'ipsec', icon: 'lock', title: `Move ${tpaN} IPsec ${tpaN === 1 ? 'site' : 'sites'} onto AT&T`, steps: ['Find the IPsec sites on Discover', 'Pick AVPN, ASE on Demand or ADI', 'Order and cut over'], cta: 'Start', go: go('s1') }] : []),
        ...(pubR.length ? [{ key: 'attach', icon: 'cloud', title: `Attach ${pubR.length} ${pubR.length === 1 ? 'region' : 'regions'} privately`, steps: ['Open the region on Connect', 'Compare NetBond with the on-ramp', 'Attach and watch it on Observe'], cta: 'Open Connect', go: go('s3', { layer: 'cloud', tab: 'connect' }) }] : []),
        { key: 'map', icon: 'hub', title: 'Read the Traffic map', steps: ['Sites on the left, by region', 'The path they take in the middle', 'Hover any path for Gbps and cost'], cta: 'Open Traffic', go: go('s3', { layer: 'cloud', tab: 'observe', obPage: 'perf' }) },
        ...(bareTag ? [{ key: 'policy', icon: 'check-shield', title: 'Set a policy for a tag', steps: ['Open Tags on Observe', 'Pick a tag with no policy', 'Require a private path'], cta: 'Open Policies', go: go('s3', { layer: 'cloud', tab: 'govern' }) }] : []),
      ]).slice(0, 4).map(g0 => ({ ...g0, steps: g0.steps.map((l, i) => ({ key: i, n: i + 1, label: l })), iconSrc: iconDir + '/' + g0.icon + '.svg' }))
        .filter(g0 => hit(g0.title + ' ' + g0.steps.map(x => x.label).join(' ')));
      const soon = { soon: true, go: () => {} };
      const resources = [
        { key: 'glossary', icon: 'grid', title: 'Network Glossary', desc: 'The words on these screens', tags: ['Access', 'Core', 'SLO'], cta: 'Open glossary', go: () => set({ helpPanel: 'terms' }) },
        { key: 'tickets', icon: 'checklist', title: 'Support Tickets', desc: 'Open problems and their tickets', tags: ['Trouble report', 'Change'], cta: 'Open tickets', live: true, go: go('s3', { layer: 'cloud', tab: 'observe', obPage: 'insights', insPanel: 'ops', opsPanel: 'tickets' }) },
        { key: 'tour', icon: 'hub', title: 'Interactive Tour', desc: 'A guided walk through the picture', tags: ['Overview', 'Navigation'], cta: 'Start tour', go: () => { set({ openHintSeen: false }); try { localStorage.removeItem('naas.openHint'); } catch (e) {} go('s3', { layer: 'cloud', tab: 'connect', drill: [], cloudPick: null })(); } },
        { key: 'kb', icon: 'apps', title: 'Knowledge Base', desc: 'Articles and FAQs', tags: ['Common issues', 'Use cases'], cta: 'Browse articles', ...soon },
        { key: 'video', icon: 'smart-meter', title: 'Video Tutorials', desc: 'Short how-to videos', tags: ['Quickstart', 'Troubleshooting'], cta: 'Watch videos', ...soon },
        { key: 'docs', icon: 'download', title: 'Documentation', desc: 'Guides, APIs and best practice', tags: ['Getting started', 'API'], cta: 'Read docs', ...soon },
        { key: 'contact', icon: 'person-group', title: 'Contact Support', desc: 'Talk to the AT&T team', tags: ['24/7', 'Billing'], cta: 'Ask Andi first', go: () => set({ andiOpen: true }) },
      ].map(r0 => ({ ...r0, soon: !!r0.soon, live: !r0.soon, tagRows: r0.tags.map(t => ({ key: t, t })), iconSrc: iconDir + '/' + r0.icon + '.svg' }));
      const TERMS = [
        ['Access', 'The first mile: the circuit from a site, or a cloud\'s own port, into a network.'],
        ['Edge', 'Where a circuit lands and gets its service: an AT&T PE, an ENNI, or an on-ramp.'],
        ['Core', 'The backbone between edges. AT&T\'s, or a third party\'s.'],
        ['NetBond', 'AT&T\'s private on-ramp into a cloud, ordered like any other AT&T port.'],
        ['AVPN', 'AT&T VPN over MPLS: private, with classes of service.'],
        ['ASE on Demand', 'AT&T Switched Ethernet you can turn up and resize from the portal.'],
        ['ADI', 'AT&T Dedicated Internet. Internet, but it rides the AT&T core.'],
        ['AIA-B', 'AT&T Internet Air for Business: fixed wireless that rides the AT&T core.'],
        ['Third Party Access', 'Another carrier\'s circuit. Its traffic leaves the AT&T network.'],
        ['IPsec', 'An encrypted tunnel over the public internet. Private payload, public path and bill.'],
        ['Egress', 'What a cloud charges to send data out. Lower on a private on-ramp.'],
        ['SLO', 'The latency or loss a path promises. Over SLO means it missed.'],
        ['Hosted VPC', 'A VPC AT&T runs for you, with inspection and egress built in.'],
        ['Cross-connect', 'A cable inside a colo between two networks. Yours if you ordered it.'],
      ];
      const asks = ['Where is my egress going?', 'Which sites are outside AT&T?', 'What is over its SLO?'].map(a0 => ({ key: a0, q: a0, go: () => set({ andiOpen: true, andiThread: [...(s.andiThread || []), { key: 'q' + ((s.andiThread || []).length + 1), screen: s.screen + (s.tab || ''), q: a0, a: answer(a0, est, ob, s) }] }) }));
      const hk = s.helpPanel === 'terms' ? 'terms' : 'start';
      return { helpPanels: [['start', 'Start here'], ['terms', 'Glossary']].map(([k, l]) => { const on = hk === k; return { key: k, label: l, on, go: () => set({ helpPanel: k }), line: on ? 'var(--cta)' : 'transparent', color: on ? 'var(--text-heading)' : 'var(--text-light)', weight: on ? 700 : 500 }; }), helpPanelStart: hk === 'start', helpPanelTerms: hk === 'terms',
        sS9: s.screen === 's9', goHelp: go('s9'), helpCur: s.screen === 's9', helpQ: s.helpQ || '', setHelpQ: (e) => set({ helpQ: e.target.value, helpPanel: e.target.value ? 'terms' : s.helpPanel }), clearHelpQ: () => set({ helpQ: '' }), hasHelpQ: !!q,
        helpGuides: guides, hasHelpGuides: guides.length > 0, helpResources: resources, helpLive: resources.filter(r0 => r0.live), helpSoonLine: 'Coming soon: ' + resources.filter(r0 => r0.soon).map(r0 => r0.title).join(' · '), helpAsks: asks, askAndiHelp: () => set({ andiOpen: true }),
        helpTerms: TERMS.filter(([t, d]) => hit(t + ' ' + d)).map(([term, def]) => ({ key: term, term, def })), hasHelpTerms: TERMS.some(([t, d]) => hit(t + ' ' + d)),
        helpIcon: iconDir + '/question-circle.svg', helpSoonBg: s.theme === 'dark' ? 'rgba(209,143,224,.16)' : 'rgba(175,41,187,.12)', helpSoonInk: s.theme === 'dark' ? '#e2a6ee' : '#8f2199' };
    })(),
    ...filterVals, showOpenHint: !s.openHintSeen && !s.drill.length && !cloudPick && !isEmpty, dismissOpenHint: () => { set({ openHintSeen: true }); try { localStorage.setItem('naas.openHint', 'seen'); } catch (e) {} },
    crumbs, verbTabs, cloudCrumbs, siteTrail, cloudTrail, sitesDrilled: s.drill.length > 0, cloudsDrilled: !!cloudPick, hasCloudCrumbs: cloudCrumbs.length > 0, showCrumbs: s.drill.length > 0 || cloudDrill.length > 0, drillLabel: [drillLabel, regionDrill ? `${regionDrill.label} · ${regionDrill.level}s` : ''].filter(Boolean).join(' · '), hasDrill: s.drill.length > 0 || cloudDrill.length > 0, drillUp: () => set({ drill: s.drill.slice(0, -1), cloudDrill: cloudDrill.slice(0, -1), cloudPick: cloudDrill.length ? cloudPick : null }), sitesHead: s.drill.length ? '‹ ' + S.labelOfKey(est, s.drill[s.drill.length - 1]) : 'Sites', sitesUp: () => set({ drill: s.drill.slice(0, -1) }), sitesHeadColor: s.drill.length ? 'var(--link)' : 'var(--text-light)', cloudsHead: regionDrill ? '‹ ' + (regionDrill.crumb || [cloudDrill[0]]).slice(-1)[0] : 'Clouds', cloudsUp: cloudsUpNow, cloudsHeadColor: regionDrill ? 'var(--link)' : 'var(--text-light)', cloudsHeadW, showWorkloadsHead: false, tConnect: s.tab === 'connect', tGovern: s.tab === 'govern', tObserve: s.tab === 'observe', tCost: s.tab === 'cost',
    // Scope lives on Traffic; Connect, Govern and Cost read the whole estate (2026-09-29 audit).
    ...connectVals(s, set, est, go, ob),
    connectFindings: deptFindings('connect'), hasConnectFindings: deptFindings('connect').length > 0, tabLabel: TAB_LABEL[s.tab] || 'Connect', noConnectFindings: deptFindings('connect').length === 0, connectOthers: ['govern', 'observe', 'cost'].map(t => ({ key: t, n: findingsFor(s.layer, t).length, label: `${findingsFor(s.layer, t).length} close on ${TAB_LABEL[t]}`, go: () => { set({ tab: t }); syncHash('s3', s.layer, t); scrollToResult('S3 Department'); } })).filter(x => x.n > 0), hasConnectOthers: ['govern', 'observe', 'cost'].some(t => findingsFor(s.layer, t).length > 0), mostChosen, levelTiles: sorted, levelCount: levelItems.length, levelSort: s.levelSort, setLevelSort: (e) => set({ levelSort: e.target.value }), levelQuery: s.levelQuery, setLevelQuery: (e) => set({ levelQuery: e.target.value }), levelTitle: drillInfo ? drillInfo.label : levelMapTitle(layer), levelMore: Math.max(0, levelItems.length - 60), hasLevelMore: levelItems.length > 60, catalogRow, visionRow, hasVision: visionRow.length > 0,
    hasSim: !!s.simulated || (s.customPolicies || []).some(p => p.state === 'simulated'),
    governVerdict, governFindings: deptFindings('govern'), policies, hasPolicies: policies.length > 0, examplePolicies0: [{ key: 'a', t: 'Tag PCI forces a private path', m: 'tag PCI', r: 'Private path required' }, { key: 'b', t: 'Tag Internet-facing gets NGFW plus AT&T egress', m: 'tag Internet-facing', r: 'Inline security inspection' }, { key: 'c', t: 'Branch Finance reaches only finance-tagged workloads', m: 'branch Finance', r: 'Segment intra-tag only' }], authorPolicy: go('s4', { ...newOrder({ ...cleanCompose(cp), outcome: 'u1', control: ['Private path required'], source: ['Data center'], dest: ['Clouds'] }) }), simulate: () => set({ simulated: true, enforced: false }), enforce: () => set({ enforced: true }), undo: () => set({ simulated: false, enforced: false }), simulated: s.simulated, enforced: s.enforced, canEnforce: s.simulated && !s.enforced, simulateText: s.enforced ? 'Enforced. Paths rerouted onto the AT&T network.' : s.simulated ? `Simulated: ${pciViol ? pciViol.split(' ')[0] : 0} paths reroute onto the AT&T network, 2 flows denied. Drawn dashed until enforced.` : 'Simulate shows what changes before enforce is enabled.', enforceBg: s.simulated && !s.enforced ? 'var(--cta)' : 'var(--bg-neutral)', enforceColor: s.simulated && !s.enforced ? '#fff' : 'var(--text-disabled)',
    kpis, hasKpis: kpis.length > 0, sankeyNodes, sankeyRibbons, sankeyW: sk ? sk.W : 900, sankeyH: sk ? sk.H : 260, sankeyVB: `0 0 ${sk ? sk.W : 900} ${sk ? sk.H : 260}`, flows, observeFindings: deptFindings('observe'), seeSavings: () => { set({ tab: 'cost' }); syncHash('s3', s.layer, 'cost'); }, observeVerdict: isEmpty ? 'No telemetry yet. It starts with the first attach.' : `${est.observedPct}% of paths send telemetry. ${flows.filter(f => f.deny).length} flows denied in the last minute by the vSRX pair.`, chipScope,
    ...costVals(s, set, est, A.inventory(est), obAll, go, c),
    costVerdict, buckets, steerRecs: steerable, costFindings: deptFindings('cost'), hasBuckets: buckets.length > 0, bTotalF: fmt(bTotal), bFabF: fmt(bFab), bSaveF: fmt(bTotal - bFab),
    // compose
    ...wizardVals(s, est, cp, setC, outcome, constraint, summary, set, c),
    outcomeCards, hasOutcome: !!outcome, sourceChips: chipRow('source', D.COMPOSE_CHIPS.source), destChips: chipRow('dest', D.COMPOSE_CHIPS.dest), regionTabs, metroChips, resChips: chipRow('resiliency', D.COMPOSE_CHIPS.resiliency, true), controlChips: chipRow('control', D.COMPOSE_CHIPS.control), constraint, hasConstraint: !!constraint, summary, freeText: s.freeText, setFreeText: (e) => set({ freeText: e.target.value }), parseText: () => parseText(c, s.freeText), reviewOrder: () => { if (!summary.ready) return; set({ order: composed, screen: 's6', term: 36 }); window.scrollTo(0, 0); syncHash('s6'); }, reviewBg: summary.ready ? 'var(--cta)' : 'var(--bg-neutral)', reviewColor: summary.ready ? '#fff' : 'var(--text-disabled)',
    // review
    hasOrder: orderLines.length > 0, noOrder: orderLines.length === 0, orderLines, orderPolicies, orderInspection, unpriced, hasUnpriced: unpriced.length > 0, pricedTotalF: fmt(pricedTotal) + '/mo', termTotalF: fmt(termTotal) + '/mo', termDisc, termLabel: s.term ? `${s.term}-month` : 'On-demand', termOptions, orderSave: ord.savings ? `save ${fmt(ord.savings)}/mo vs public egress` : '', hasOrderSave: !!ord.savings, orderTimeline: `${ord.days || 10} business days`, approver: s.approver, setApprover: (e) => set({ approver: e.target.value }), orderTitle: ord.title || 'Order', pathDesc: ord.pathDesc || '', submit: () => { set({ submitted: true, pendingDismissed: false, screen: 's2' }); window.scrollTo(0, 0); syncHash('s2'); }, saveProposal: () => set({ proposalSaved: true }), proposalSaved: !!s.proposalSaved, reviewShield: !!ord.shield, reviewWires: ord.wires || 1,
    // browse
    browseQuery: s.browseQuery, setQuery: (e) => set({ browseQuery: e.target.value }), browseSort: s.browseSort, setSort: (e) => set({ browseSort: e.target.value }), filtersOpen: s.filtersOpen, toggleFilters: () => set({ filtersOpen: !s.filtersOpen }), filterCount, filterLabel: filterCount ? `Filters (${filterCount})` : 'Filters', categories, curated, results, resultCount: results.length, browsing, backToMarket: () => set({ browseQuery: '', browseCat: null, filterProviders: [], priceCeil: 0 }), providerChips: providers.map(p => ({ key: p, label: p, on: s.filterProviders.includes(p), click: () => set({ filterProviders: s.filterProviders.includes(p) ? s.filterProviders.filter(x => x !== p) : [...s.filterProviders, p] }) })), priceChips: [1000, 2500, 5000].map(v => ({ key: 'p' + v, label: `Under ${fmt(v)}/mo`, on: s.priceCeil === v, click: () => set({ priceCeil: s.priceCeil === v ? 0 : v }) })), visionTiles, browseCatLabel: s.browseCat ? D.CATEGORIES.find(cc => cc.id === s.browseCat).label : q ? `Results for "${s.browseQuery}"` : 'Results',
    lmccHero: productCard(c, D.CATALOG.find(p => p.id === 'lmcc'), est), catalogAll: D.CATALOG,
    // product
    product: productDetail,
    // One section at a time (no-scroll pass, 2026-09-29): what you get, term pricing, what it runs with.
    ...(() => { const pd = productDetail || { terms: [], runsWith: [] };
      const avail = [['get', 'What you get'], ...((pd.terms || []).length ? [['terms', 'Term pricing']] : []), ...((pd.runsWith || []).length ? [['runs', 'Runs with']] : [])];
      const pk = avail.some(a => a[0] === s.prodPanel) ? s.prodPanel : 'get';
      return { prodPanels: avail.map(([k, l]) => { const on = pk === k; return { key: k, label: l, on, go: () => set({ prodPanel: k }), line: on ? 'var(--cta)' : 'transparent', color: on ? 'var(--text-heading)' : 'var(--text-light)', weight: on ? 700 : 500 }; }),
        prodPanelGet: pk === 'get', prodPanelTerms: pk === 'terms', prodPanelRuns: pk === 'runs' }; })(),
    // discover
    allRegions: est.regionsList, scanSteps, scanLine: s.scanStep < 4 ? `${scanSteps[Math.min(3, s.scanStep)].label} · ${Math.min(4, s.scanStep + 1)} of 4` : '', scanDone: s.scanStep >= 4, scanning: s.scanStep < 4, intakeCadence, setIntakeCadence, intakeCadenceLabel, intakeCadenceLower, cadenceAsk, cadenceAskText, confirmCadence, discoverVerdict, discoverKpis, estateChips, treeOrMap: s.treeOrMap, isTree: s.treeOrMap === 'tree', isMap: s.treeOrMap === 'map', treeBg: s.treeOrMap === 'tree' ? 'var(--bg-accent)' : 'transparent', treeColor: s.treeOrMap === 'tree' ? 'var(--link)' : 'var(--text-body)', mapBg: s.treeOrMap === 'map' ? 'var(--bg-accent)' : 'transparent', mapColor: s.treeOrMap === 'map' ? 'var(--link)' : 'var(--text-body)', showTree: () => set({ treeOrMap: 'tree' }), showMap: () => set({ treeOrMap: 'map' }), tree, mapRows, mapSites, mapH, mapVB: `0 0 1000 ${mapH}`, bigEstate, sitesCountLabel: est.sitesCount ? `${est.sitesCount.toLocaleString('en-US')} sites, grouped` : plural(est.sites.length, 'site', 'sites'), chain, chainPolicies, hasChain: !!ow, chainRegion: ow ? `${ow.cloud} ${ow.region}` : '', closeChain: () => set({ openWorkload: null }),
    ...addendumVals(c, s, set, est, ob, inv, go, findingCard, totalSave, est0, sched, probRows, obAll, probs, segCtx, incChanges),
  };
  Object.assign(out, briefVals(out, s, set, { est, est0, obAll, conns, life, lifeNow, findList, openF, openSave }));
  if (s.screen === 's3' && s.tab === 'observe' && s.obPage === 'insights' && out.insPanelBrief) Object.assign(out, { andiSub: out.briefText, hasAndiSub: true });
  return pageLists(out, s, set);
}

// Your actions' visuals and Andi's monthly briefing (notes, 2026-09-30, C2, C3):
// read from what the page already rendered, so the words and the cards agree.
function briefVals(out, s, set, { est, est0, obAll, conns, life, lifeNow, findList, openF, openSave }) {
  const rk = roleKeyOf(s), role = ROLE_OF[rk], iw = out.iw || {};
  const bars = (key, title, sub, rows) => ({ key, title, sub, rows: rows.slice(0, 4).map((r, i) => ({ key: r.key || String(i), label: r.label || r.name, sub: r.sub || '', v: r.v, w: r.w, fill: r.fill })) });
  const weeks = (R.egressWeeks(obAll) || []).slice(-4), wMax = Math.max(1e-9, ...weeks.map(w => w.pub));
  const WEEK = ['3 weeks ago', '2 weeks ago', 'Last week', 'This week'];
  const idle = OD.capacity(conns, s.obWindow || '30d').filter(r => r.oversized);
  const V = {
    talkers: () => bars('talkers', 'Top talkers', `Last ${iw.winLabel || '30 days'}`, iw.talkers || []),
    newdest: () => bars('newdest', 'New destinations', `Last ${iw.winLabel || '30 days'}`, iw.newDest || []),
    shadow: () => bars('shadow', 'Shadow SaaS', 'no policy covers these', iw.shadow || []),
    multi: () => bars('multi', 'Cloud to cloud', 'pairs and the path they take', (iw.multi || {}).rows || []),
    slo: () => bars('slo', 'Latency over SLO', iw.sloLegend || '', iw.slo || []),
    problems: () => bars('problems', 'Health problems', 'ranked by apps affected', (out.problemRows || []).map(p => ({ key: p.key, label: `${p.where} · ${p.thing}`, sub: p.what, v: p.appsF.split(' · ')[0], w: '100%', fill: p.dot }))),
    growth: () => bars('growth', 'Public egress', 'the last four weeks', weeks.map((w, i) => ({ key: 'w' + i, label: WEEK[i + 4 - weeks.length], sub: `AT&T ${w.fab.toFixed(1)} Gbps`, v: `${w.pub.toFixed(1)} Gbps`, w: `${(w.pub / wMax * 100).toFixed(1)}%`, fill: 'var(--viz-2)' }))),
    idle: () => bars('idle', 'Idle capacity', 'ports bought and not used', idle.map(r => ({ key: r.region, label: `${r.cloud} ${r.region}`, sub: `${r.ports} ports bought; ${r.resizeTo} hold the peak`, v: `${r.peakPct}% peak`, w: `${r.peakPct}%`, fill: 'var(--viz-3)' }))),
  };
  const roleVisuals = role.visuals.map(k => V[k]()).filter(v => v.rows.length > 0);
  // The briefing's facts, once, from the figures on the page.
  const ym = new Date(+lifeNow).toISOString().slice(0, 7);
  const lives = findList.filter(f => !f.event).map(f => LC.lifeOf(f, life, lifeNow));
  const found = lives.filter(l => String(l.foundAt).slice(0, 7) === ym).length;
  const resolved = lives.filter(l => l.state === 'resolved' && String(l.events[l.events.length - 1].at).slice(0, 7) === ym).length + LC.closedFindings(est).filter(f => String(f.resolvedAt).slice(0, 7) === ym).length;
  const bank = LC.banked(est, life, lifeNow), bankedLast = bank.length > 1 ? bank[bank.length - 2].saved : 0;
  const of = out.opsFacts || { sev1: 0, openN: 0, mttrF: '' }, av = out.availAll || [], next = (out.comingUp || [])[0];
  const briefText = VD.briefingFor(rk, { open: openF.length, onTableF: openSave ? fmt(openSave) : '', bankedLastF: fmt(bankedLast), found, resolved, sev1: of.sev1, ticketsOpen: of.openN, mttrF: of.mttrF,
    availMet: av.filter(r => r.met).length, availN: av.length, top: (out.roleActAll || []).slice(0, 3).map(a => a.head), nextMaint: next ? `${next.touched}, ${next.whenF.replace(/, planned$/, '')}` : '' });
  const domain = String(est0.name || 'example').toLowerCase().replace(/\b(corp|co|inc|llc)\b\.?/g, '').replace(/[^a-z]/g, '') + '.com';
  const briefWho = ['architect', 'neteng', 'security', 'finops', 'exec'].map(k => { const on = k === rk;
    return { key: k, role: ROLE_OF[k].name, mail: `${ROLE_OF[k].mailbox}@${domain}`, on, bg: on ? 'var(--bg-accent)' : 'transparent', go: () => set({ persona: k }) }; });
  const cfg = s.briefCfg || { cadence: 'monthly' }, cadence = cfg.cadence === 'off' ? 'off' : 'monthly';
  const monthly = SCH.BRIEF_CHOICES[0].schedule, nowMs = SCH.nowOf(s);
  const at = (t) => `${new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}, ${SCH.clockLabel(t)}`;
  return { comingSoon: true, roleVisuals, roleNoVisuals: !roleVisuals.length, briefText, briefTitle: `Andi's monthly briefing for ${role.short}`, briefWho, briefCadence: cadence,
    setBriefCadence: (e) => set({ briefCfg: { ...cfg, cadence: e.target.value === 'off' ? 'off' : 'monthly' } }),
    briefLast: at(SCH.prevRunAt(monthly, nowMs)), briefNext: cadence === 'off' ? 'Off' : at(SCH.nextRunAt(monthly, nowMs)) };
}

// A list longer than the fold pages; it never scrolls in a box and never sits
// in a card (Micah, 2026-09-29: "why are you containerizing things like logs").
export function pageRows(rows, size, page, setPage) {
  const n = rows.length, pages = Math.max(1, Math.ceil(n / size)), p = Math.min(Math.max(0, page || 0), pages - 1);
  return { rows: rows.slice(p * size, p * size + size), pager: { label: n ? `${p * size + 1}–${Math.min(n, (p + 1) * size)} of ${n}` : '0 of 0', many: pages > 1,
    prevOp: p > 0 ? 1 : 0.4, nextOp: p < pages - 1 ? 1 : 0.4, prev: () => { if (p > 0) setPage(p - 1); }, next: () => { if (p < pages - 1) setPage(p + 1); } } };
}
const PAGE_SIZE = { insightRows: ['findPage', 6, 'findPager', 'findPageSize'], appRows: ['appPage', 5, 'appPager', 'appPageSize'], buSites: ['buPage', 10, 'buPager', 'buPageSize'], polRows: ['polPage', 5, 'polPager', 'polPageSize'], drawerTags: ['tagPage', 7, 'tagPager', 'tagPageSize'], placeRows: ['placePage', 10, 'placePager', 'placePageSize'], cloudRows: ['cloudPage', 9, 'cloudPager', 'cloudPageSize'],
  segDrillRows: ['segPage', 9, 'segPager', 'segPageSize'], pathTimeRows: ['pathsPage', 8, 'pathsPager', 'pathsPageSize'], roleActRows: ['rolePage', 4, 'rolePager', 'rolePageSize'], ticketRows: ['ticketPage', 6, 'ticketPager', 'ticketPageSize'], fixRows: ['fixPage', 5, 'fixPager', 'fixPageSize'], availRows: ['availPage', 6, 'availPager', 'availPageSize'], opsChangeRows: ['changePage', 5, 'opsChangePager', 'opsChangePageSize'], changeRows: ['changesPage', 6, 'changesPager', 'changesPageSize'], legAccessRows: ['legAPage', 6, 'legAPager', 'legAPageSize'], legConnectRows: ['legCPage', 6, 'legCPager', 'legCPageSize'], legCloudRows: ['legPPage', 6, 'legPPager', 'legPPageSize'], saveRows: ['savePage', 5, 'savePager', 'savePageSize'], pathFlowRows: ['pathPage', 8, 'pathPager', 'pathPageSize'], problemRows: ['probPage', 3, 'probPager', 'probPageSize'], sources: ['srcPage', 8, 'srcPager', 'srcPageSize'] };
function pageLists(out, s, set) {
  for (const [list, [key, size, pagerName, sizeName]] of Object.entries(PAGE_SIZE)) {
    if (!Array.isArray(out[list])) continue;
    const pg = pageRows(out[list], size, s[key], (n) => set({ [key]: n }));
    out[list] = pg.rows; out[pagerName] = pg.pager; out[sizeName] = size;
  }
  if (Array.isArray(out.candGroups)) {
    out.candPageSize = 5;
    out.candGroups = out.candGroups.map(g => { const pg = pageRows(g.rows, 5, (s.candPage || {})[g.key], (n) => set({ candPage: { ...(s.candPage || {}), [g.key]: n } })); return { ...g, rows: pg.rows, pager: pg.pager }; });
  }
  return out;
}

/**
 * The explain contract, shared by every page.
 *
 * Ramesh: from an aggregate figure, cut further, all the way down to the
 * individual logs. Any figure anywhere calls this with the cut that produced
 * it; it lands on Observe's Logs, which names the figure, decomposes it one
 * level, and shows only the records that carry it.
 *
 * `pattern` and `path` are the record's own fields, so the cut is exact and
 * never an approximation of the number above it. A figure the records cannot
 * answer passes no cut and says so in `cut` instead of pretending.
 */
function explainNav(c, ex) {
  return () => {
    c.setState({
      screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'logs', sub: null, obTab: 'flow', logTab: 'flow',
      explain: ex, logQ: '', logPath: 'all', logAct: 'all',
      scrollToSec: 'sec-logs', scrollNonce: (c.state.scrollNonce || 0) + 1,
      drill: [], cloudDrill: [], cloudPick: null, fabDrill: [],
    });
    syncHash('s3', 'cloud', 'observe');
  };
}

function syncHash(screen, layer, tab) {
  try { history.replaceState(null, '', location.pathname + location.search + '#' + [screen, screen === 's3' ? layer : null, screen === 's3' ? tab : null].filter(Boolean).join('/')); } catch (e) { }
}

let scanTimer = null;
/** There is nothing to discover on an estate with no clouds, so the scan must not run. */
export function shouldScan(est) { return !!est && est.stage !== 'empty'; }
/**
 * The scan is Discover's loading state, not an animation: html:573 holds the
 * skeleton while `scanning`, html:582 holds the whole body until `scanDone`.
 * So an estate we do not scan has to arrive at step 4 anyway, or the screen
 * never renders.
 */
export function runScan(c, est) {
  if (shouldScan(est)) return startScan(c);
  clearInterval(scanTimer);
  c.setState({ scanStep: 4, scanBusy: false });
}
export function startScan(c) {
  clearInterval(scanTimer);
  c.setState({ scanStep: 0, scanBusy: true });
  scanTimer = setInterval(() => {
    c.setState(st => {
      if (st.scanStep >= 4) { clearInterval(scanTimer); return { scanBusy: false }; }
      return { scanStep: st.scanStep + 1 };
    });
  }, 750);
}

function levelMapTitle(layer) { return { ai: 'Providers', cloud: 'Regions', net: 'Services by site', transport: 'Sites' }[layer.id]; }

function levelMap(s, est, layer, drillInfo, set) {
  const tile = (t, drillable, label) => ({ ...t, click: drillable ? () => set({ drill: [...s.drill, label] }) : null, drillable, cursor: drillable ? 'pointer' : 'default' });
  if (drillInfo) return drillInfo.rows.map(r => tile({ key: r.key || r.name, name: r.name, sub: r.access, size: r.count, exposed: r.priv ? 0 : r.count, meta: `${r.access} · ${r.priv ? 'private' : 'public'}`, dot: r.priv ? 'var(--success)' : 'var(--warning)' }, r.rollup, r.drillKey || r.name));
  if (layer.id === 'cloud') {
    const extra = ['ap-south-1', 'ca-central-1', 'sa-east-1', 'northeurope', 'japaneast', 'asia-east1', 'australia-southeast1', 'eu-north-1', 'us-east-2', 'francecentral'].slice(0, est.regionsExtra || 0).map((r, i) => ({ region: r, cloud: ['AWS', 'Azure', 'GCP'][i % 3], wl: 3 + i, priv: (i * 37) % 100 < (est.privatePct || 0), tags: [] }));
    return [...est.regionsList, ...extra].map(r => ({ key: r.region, name: r.region, sub: r.cloud, size: r.wl || 0, exposed: r.priv ? 0 : (r.wl || 1), meta: `${(r.wl || 0).toLocaleString('en-US')} workloads · ${r.priv ? 'private' : 'public'}`, dot: r.priv ? 'var(--success)' : 'var(--warning)' }));
  }
  if (layer.id === 'ai') return ['OpenAI', 'Anthropic', 'AWS Bedrock', 'Google Vertex', 'CoreWeave', 'Azure OpenAI'].map((p, i) => ({ key: p, name: p, sub: 'Provider', size: 40 - i * 5, exposed: i < 4 ? 40 - i * 5 : 0, meta: `${(40 - i * 5)} GPU workloads · ${i < 4 ? 'public' : 'private'}`, dot: i < 4 ? 'var(--warning)' : 'var(--success)' }));
  const sites = est.sites.length ? est.sites : [{ name: 'No sites yet', access: '', priv: false }];
  return sites.map(st => tile({ key: st.name, name: st.name, sub: st.access, size: /\((\d[\d,]*)\)/.test(st.name) ? parseInt(/\((\d[\d,]*)\)/.exec(st.name)[1].replace(/,/g, ''), 10) : 1, exposed: st.priv ? 0 : 1, meta: `${st.cls || ''} · ${st.priv ? 'private' : 'public'}`, dot: st.priv ? 'var(--success)' : 'var(--warning)' }, !!st.rollup || /\(/.test(st.name), st.name));
}

function layerPolicies(s, est, scope) {
  const inScope = (list) => { if (!scope || scope === 'all') return list; const name = scope.split(':')[1].toLowerCase(); return list.filter(p => !p.scope || /any cloud/i.test(p.scope) || `${p.match} ${p.scope || ''} ${p.name || ''}`.toLowerCase().includes(name)); };
  if (s.layer === 'cloud') return inScope(est.policies);
  if (s.layer === 'net') return est.policies.filter(p => /Branch|Internet-facing/.test(p.match));
  return est.policies.filter(p => /Branch|region/.test(p.match));
}

function layerBuckets(s, est) {
  if (s.layer === 'cloud') return est.buckets;
  if (est.stage === 'empty') return [];
  if (s.layer === 'net') return [{ id: 'bh', name: 'Internet backhaul from branches', cloud: 'ISP', today: est.id === 'trust' ? 96000 : 8400, fabric: est.id === 'trust' ? 52000 : 5100 }];
  return [{ id: 'mtm', name: 'Month-to-month circuits', cloud: 'AT&T', today: est.id === 'trust' ? 210000 : est.id === 'mature' ? 11200 : 6400, fabric: est.id === 'trust' ? 105000 : est.id === 'mature' ? 5600 : 3200 }];
}

function kpiTiles(s, est) {
  const m = est.id === 'mature' ? 1 : est.id === 'trust' ? 3.2 : 0.4;
  const v = (n, u) => Math.round(n * m).toLocaleString('en-US') + u;
  return [
    { key: 'th', l: 'Throughput', v: v(42, ' Gbps'), e: 'peak, last 24 h' },
    { key: 'lat', l: 'P95 latency', v: est.id === 'partial' ? '41 ms' : '11 ms', e: 'site to region' },
    { key: 'loss', l: 'Packet loss', v: est.id === 'partial' ? '0.4%' : '0.02%', e: 'AT&T paths' },
    { key: 'eg', l: 'Egress', v: v(184, ' TB') , e: 'last 30 days' },
    { key: 'uc', l: 'Under control', v: `${est.observedPct}%`, e: 'paths with a policy' },
    { key: 'sv', l: 'Savings', v: est.savedMo ? fmt(est.savedMo) + '/mo' : 'None yet', e: 'identified' },
  ];
}

function productCard(c, p, est) {
  const price = p.price === null ? '' : p.price === 0 ? 'No charge' : `Starting at ${fmt(p.price)}/mo`;
  return { ...p, key: p.id, priceLine: price, hasPrice: !!price, proof: p.proof.map((x, i) => ({ key: i, label: x, head: ['Uptime', 'Latency', 'Support'][i] })), tagList: p.tags.map(t => ({ key: t, label: t })), open: () => { c.setState({ product: p.id, screen: 's8' }); window.scrollTo(0, 0); syncHash('s8'); }, choose: () => { c.setState({ order: productOrder(p, est), screen: 's6', term: 36 }); window.scrollTo(0, 0); syncHash('s6'); }, layerLabel: D.LAYERS.find(l => l.id === p.layer).label, mark: p.provider === 'AT&T' ? 'AT&T' : p.provider.split(',')[0].slice(0, 2).toUpperCase() };
}

const POLICY_FOR_CONTROL = { 'Private path required': { match: 'tag PCI', req: 'Private path required' }, 'No direct internet path': { match: 'tag Prod', req: 'No direct internet path' }, 'Inline inspection': { match: 'tag Internet-facing', req: 'Inline security inspection' }, 'Inline security inspection': { match: 'tag Internet-facing', req: 'Inline security inspection' }, 'Segment by tag': { match: 'branch Finance', req: 'Segment intra-tag only' }, 'Latency SLO': { match: 'tag GPU', req: 'Latency SLO 15 ms' }, 'Cost-aware routing': { match: 'region *', req: 'Cost-aware routing' } };

function composeOrder(cp, outcome, est) {
  if (!outcome) return { lines: [], policies: [], monthly: 0, savings: 0, days: 0 };
  const mult = { Standard: 1, Geodiversity: 1.6, Maximum: 2.2 }[cp.resiliency];
  // The site-attach routes (gap row, drawer bulk attach, a row's own Attach)
  // are the only writers of `cp.qty`; every wizard-built order leaves it
  // unset and renders exactly as before (siteQty defaults to 1).
  const siteQty = cp.qty || 1;
  const P = (id) => D.CATALOG.find(p => p.id === id);
  const lines = [];
  // unitPrice carries the resiliency multiplier so `monthly` (unitPrice * qty)
  // is exact - no rounding drift between the per-site rate the Monthly column
  // shows and the total that feeds the order's footer sum.
  const add = (p, qty, note, perSite) => { const unitPrice = Math.round((p.price || 0) * mult); lines.push({ line: lines.length + 1, product: note ? `${p.name} (${note})` : p.name, qty, unitPrice, perSite: !!perSite, term: '36-month', monthly: unitPrice * qty, unpriced: p.price === null }); };
  // NetBond is the connectivity line a site-attach order's count belongs on;
  // the hosted VPC, policy and observability lines are per-region/account,
  // not per-site, so they stay at qty 1 regardless of how many sites attach.
  if (outcome.id === 'u1') { add(P('netbond'), siteQty, null, siteQty > 1); if (cp.control.includes('Private path required')) add(P('hosted-vpc'), 1, cp.metros[0] || 'region'); }
  if (outcome.id === 'u2') { add(P('hosted-vpc'), 1, 'AWS us-east-1'); add(P('ngfw'), 1); }
  if (outcome.id === 'u3') { add(P('c2c'), 1); add(P('hub'), cp.metros.length || 1); }
  if (cp.control.includes('Inline inspection') && outcome.id !== 'u2') add(P('ngfw'), 1);
  if (cp.dest.includes('Neoclouds') || cp.dest.includes('AI providers')) add(P('neocloud'), 1);
  if (cp.resiliency === 'Maximum') add(P('lmcc'), 1);
  add(P('policy'), 1); add(P('observability'), 1);
  const policies = cp.control.map(k => POLICY_FOR_CONTROL[k]).filter(Boolean).map(p => ({ ...p, state: 'will be enforced on delivery' }));
  const savings = outcome.id === 'u2' || outcome.id === 'u3' || cp.source.includes('A cloud region') ? Math.round((est.buckets || []).filter(b => b.today > b.fabric).slice(0, outcome.id === 'u3' ? 2 : 1).reduce((a, b) => a + b.today - b.fabric, 0)) : 0;
  const monthly = lines.filter(l => !l.unpriced).reduce((a, l) => a + l.monthly, 0);
  const hosted = lines.some(l => /hosted/i.test(l.product));
  return { lines, policies, monthly, savings, days: hosted ? 10 : 5, title: outcome.name, pathDesc: `${cp.source.join(', ') || 'Source'} to ${cp.dest.join(', ') || 'destination'} · ${cp.resiliency}${cp.metros.length ? ' · ' + cp.metros.join(', ') : ''}`, shield: cp.control.includes('Inline inspection') || cp.control.includes('No direct internet path'), wires: cp.resiliency === 'Standard' ? 1 : 2 };
}

function packageOrder(pkg) {
  const lines = pkg.included.map((x, i) => ({ line: i + 1, product: x, qty: 1, term: '36-month', monthly: i === 0 ? pkg.od : 0, unpriced: false })).filter((l, i) => i === 0);
  lines[0].product = `${pkg.name} package`;
  return { lines, policies: [{ match: 'tag PCI', req: 'Private path required', state: 'will be enforced on delivery' }], monthly: pkg.od, savings: 0, days: 10, title: `${pkg.name} package`, pathDesc: pkg.promise, shield: pkg.id !== 'start', wires: pkg.id === 'start' ? 1 : 2 };
}

function productOrder(p, est) {
  const lines = [{ line: 1, product: p.name, qty: 1, term: '36-month', monthly: p.price || 0, unpriced: p.price === null }];
  if (p.id !== 'policy') lines.push({ line: 2, product: 'Policy engine', qty: 1, term: '36-month', monthly: 0, unpriced: true });
  if (p.id !== 'observability') lines.push({ line: lines.length + 1, product: 'Observability', qty: 1, term: '36-month', monthly: 0, unpriced: true });
  return { lines, policies: [{ match: 'tag PCI', req: 'Private path required', state: 'will be enforced on delivery' }], monthly: p.price || 0, savings: p.id === 'steer' ? (est.buckets || []).filter(b => b.today > b.fabric).reduce((a, b) => a + b.today - b.fabric, 0) : 0, days: p.stages ? 10 : 5, title: p.name, pathDesc: p.promise, shield: /ngfw|hosted|firewall/i.test(p.id + p.name), wires: p.id === 'lmcc' ? 2 : 1 };
}

function chooseTier(c, f, tierName, prod, est) {
  if (/^Author/.test(tierName) || /^Steer/.test(tierName) || /^Attach/.test(tierName) || /^Enable/.test(tierName) || /^Add/.test(tierName) && !prod) {
    const control = /private path/i.test(tierName) ? ['Private path required'] : /inspection/i.test(tierName) ? ['Inline inspection'] : /segment/i.test(tierName) ? ['Segment by tag'] : ['Cost-aware routing'];
    const outcome = /Steer/.test(tierName) ? 'u2' : 'u1';
    c.setState({ screen: 's4', ...newOrder({ outcome, source: outcome === 'u2' ? ['A cloud region'] : ['Data center'], dest: outcome === 'u2' ? ['The Internet'] : ['Clouds'], regionTab: 'US East', metros: ['Ashburn'], resiliency: 'Standard', control }) });
    window.scrollTo(0, 0); syncHash('s4'); return;
  }
  const order = prod ? productOrder(prod, est) : { lines: [{ line: 1, product: tierName, qty: 1, term: '36-month', monthly: 0, unpriced: true }], policies: [], monthly: 0, savings: 0, days: 10, title: tierName, pathDesc: f.head };
  order.title = tierName;
  if (f.priced) order.savings = f.save;
  if (f.kind === 'pci') order.policies = [{ match: 'tag PCI', req: 'Private path required', state: 'will be enforced on delivery' }];
  if (f.kind === 'uninspected') order.policies = [{ match: 'tag Internet-facing', req: 'Inline security inspection', state: 'will be enforced on delivery' }];
  if (!order.policies.length) order.policies = [{ match: 'tag Prod', req: 'No direct internet path', state: 'will be enforced on delivery' }];
  c.setState({ order, screen: 's6', term: 36 }); window.scrollTo(0, 0); syncHash('s6');
}

function steerBucket(c, b, est) {
  c.setState({ screen: 's4', ...newOrder({ outcome: 'u2', source: ['A cloud region'], dest: ['The Internet'], regionTab: 'US East', metros: ['Ashburn'], resiliency: 'Standard', control: ['No direct internet path', 'Cost-aware routing'] }), steerBucket: b.name });
  window.scrollTo(0, 0); syncHash('s4');
}

function parseText(c, t) {
  const s = (t || '').toLowerCase();
  const outcome = /leave|egress|internet/.test(s) ? 'u2' : /two clouds|cloud to cloud|join|between/.test(s) ? 'u3' : 'u1';
  const control = [];
  if (/private/.test(s)) control.push('Private path required');
  if (/inspect|firewall|ngfw/.test(s)) control.push('Inline inspection');
  if (/no direct|block internet|egress/.test(s)) control.push('No direct internet path');
  if (/segment/.test(s)) control.push('Segment by tag');
  if (/latency|slo/.test(s)) control.push('Latency SLO');
  if (/cheap|cost|save/.test(s)) control.push('Cost-aware routing');
  const dest = /neocloud|coreweave|gpu/.test(s) ? ['Neoclouds'] : /openai|anthropic|model|ai provider/.test(s) ? ['AI providers'] : outcome === 'u2' ? ['The Internet'] : ['Clouds'];
  const resiliency = /maximum|max/.test(s) ? 'Maximum' : /geo|dual|two paths/.test(s) ? 'Geodiversity' : 'Standard';
  const metros = ['ashburn', 'dallas', 'chicago', 'san jose', 'frankfurt', 'atlanta', 'denver', 'london'].filter(m => s.includes(m)).map(m => m.replace(/\b\w/g, ch => ch.toUpperCase()));
  const ctl = control.length ? control : D.OUTCOMES.find(o => o.id === outcome).control.slice();
  const source = outcome === 'u1' ? ['Data center'] : ['A cloud region'];
  // Spreads the live compose rather than rebuilding it through prefillCompose,
  // so it is a NEW-order writer that must go through cleanCompose explicitly:
  // the user just typed this order themselves - it does not come "from"
  // anything upstream, so the fields that carry provenance and count are
  // wiped here, not inherited from whatever route ran before it.
  c.setState(st => ({ ...newOrder({ ...cleanCompose(st.compose), outcome, control: ctl, dest, source, resiliency, metros: metros.length ? metros : st.compose.metros, prefilled: false, step: 0, note: `Understood: ${D.OUTCOMES.find(o => o.id === outcome).name.toLowerCase()} · from ${source.join(', ').toLowerCase()} · to ${dest.join(', ').toLowerCase()}${metros.length ? ' · via ' + metros.join(', ') : ''} · ${resiliency.toLowerCase()} resiliency · require ${ctl.join(', ').toLowerCase()}. Each step below is filled; correct anything I got wrong.` }) }));
}


const PERSONAS = ['Cloud & Platform Architect', 'Network Engineering', 'Security & Compliance', 'FinOps & SRE', 'Executive'];
// Insights > Your actions and the monthly briefing (notes, 2026-09-30, C2, C3): each
// role's chip, the Signals cards it reads (the assignments the retired insight-row
// map made), and the mailbox its briefing goes to.
const ROLE_OF = {
  architect: { name: 'Cloud & Platform Architect', short: 'Architect', visuals: ['multi'], mailbox: 'cloud-architecture' },
  neteng: { name: 'Network Engineering', short: 'Network Eng', visuals: ['problems', 'slo'], mailbox: 'network-ops' },
  security: { name: 'Security & Compliance', short: 'Security', visuals: ['newdest', 'shadow'], mailbox: 'security' },
  finops: { name: 'FinOps & SRE', short: 'FinOps & SRE', visuals: ['growth', 'idle'], mailbox: 'finops' },
  exec: { name: 'Executive', short: 'Executive', visuals: ['talkers'], mailbox: 'cio' },
};
const roleKeyOf = (s) => (ROLE_OF[s.persona] ? s.persona : 'neteng');
const PERSONA_NAME = { architect: 'Cloud & Platform Architect', neteng: 'Network Engineering', security: 'Security & Compliance', finops: 'FinOps & SRE', exec: 'Executive' };
const PERSONA_TAB = { 'Cloud & Platform Architect': 'connect', 'Network Engineering': 'connect', 'Security & Compliance': 'govern', 'FinOps & SRE': 'cost', 'Executive': 'observe' };
const PERSONA_LINE = { 'Cloud & Platform Architect': 'see what I actually have across every cloud, one inventory.', 'Network Engineering': 'which paths are private, which still ride the internet.', 'Security & Compliance': 'where policy is enforced and where it is only written.', 'FinOps & SRE': 'where the money leaks and what closes it.', 'Executive': 'one number: how much of the estate is under AT&T control.' };
const REGION_OF_R = (r) => /^(us|ca|sa|eastus|centralus|westus)/.test(r) ? (/west/.test(r) && !/eu/.test(r) ? 'US West' : 'US East') : /^(eu|europe|west|north|france|uk)/.test(r) ? 'Europe' : 'APAC';
const FACET_DEFS = [
  { values: ['US East', 'US West', 'Europe', 'APAC'], test: (r, v) => REGION_OF_R(r.region) === v },
  { values: ['Data center', 'Branch', 'Campus'], test: (r, v, i) => ['Data center', 'Branch', 'Campus'][i % 3] === v },
  { values: ['Finance', 'Retail', 'Platform'], test: (r, v) => v === 'Finance' ? (r.tags || []).includes('Finance') : v === 'Platform' ? (r.tags || []).some(t => /Prod|AI|GPU/.test(t)) : !(r.tags || []).length || (r.tags || []).includes('Internet-facing') },
  { values: ['AWS', 'Azure', 'GCP'], test: (r, v) => r.cloud === v },
  { values: ['NetBond', 'DX', 'ER', 'Internet'], test: (r, v) => v === 'Internet' ? !r.priv : r.ramp === v },
];
function facetPass(r, i, chips) { const regionChips = chips.filter(c => !FACET_DEFS.some(f => f.values.includes(c))); if (regionChips.length && !regionChips.includes(r.region)) return false; return FACET_DEFS.every(f => { const sel = chips.filter(c => f.values.includes(c)); return !sel.length || sel.some(v => f.test(r, v, i)); }); }

// ---------- Addendum 01 ----------
// ---------- Discovery window and labels (AO-353, AO-354, AO-362) ----------
const WIN = { '1h': [1 / 24, 'the last hour'], '24h': [1, '24 hours'], '7d': [7, '7 days'], '30d': [30, '30 days'], '90d': [90, '90 days'], '6m': [182, '6 months'], '12m': [365, '12 months'] };
const winDaysOf = (s) => (WIN[s.obWindow || '30d'] || WIN['30d'])[0];
const winLabelOf = (s) => (WIN[s.obWindow || '30d'] || WIN['30d'])[1];
const sinceLabel = (x) => x.since === 0 ? 'today' : x.since === 1 ? '1 day ago' : `${x.since} days ago`;
/** User labels live in s.labels ({ id: [label] }); one row edits at a time (s.labelEdit, s.labelDraft). */
function labelKit(s, set) {
  const all = s.labels || {};
  const labelsOf = (id) => all[id] || [];
  const close = () => set({ labelEdit: null, labelDraft: '' });
  const commit = (id) => () => { const v = (s.labelDraft || '').trim(); set({ labelEdit: null, labelDraft: '', labels: v ? { ...all, [id]: Array.from(new Set([...labelsOf(id), v])) } : all }); };
  const ui = (id, autos) => ({
    autos: autos.filter(Boolean).map(a => ({ key: a, label: a })),
    labels: labelsOf(id).map(l => ({ key: l, label: l, remove: () => set({ labels: { ...all, [id]: labelsOf(id).filter(x => x !== l) } }) })),
    hasLabels: labelsOf(id).length > 0, labelOpen: s.labelEdit === id, labelClosed: s.labelEdit !== id,
    startLabel: () => set({ labelEdit: id, labelDraft: '' }),
    labelDraft: s.labelEdit === id ? (s.labelDraft || '') : '', setLabelDraft: (e) => set({ labelDraft: e.target.value }),
    labelKey: (e) => { if (e.key === 'Enter') commit(id)(); else if (e.key === 'Escape') close(); },
    commitLabel: commit(id), cancelLabel: close,
  });
  return { labelsOf, ui };
}

/** Insight cards: the generator's rows plus the doors each row and card opens. */
function iwVals(iw, s, set, go, winLabel) {
  if (!iw) return null;
  // Every door that leaves the drawer closes it; the drawer sits over every page.
  const govern = (name) => () => { set({ authoring: { match: 'destination ' + name, scope: 'any cloud', req: ['Inspection in path'] } }); go('s3', { layer: 'cloud', tab: 'govern', sub: null })(); };
  const toMap = (mapMode) => () => { go('s3', { layer: 'cloud', tab: 'observe', obPage: 'perf', sub: null })(); set({ mapMode, scrollToSec: 'sec-flow', scrollNonce: (s.scrollNonce || 0) + 1 }); };
  const andiFlow = (f) => () => set({ andiScope: { kind: 'flow', id: f.id, label: f.name }, andiOpen: true });
  const steer = (f) => () => set({ steered: [...(s.steered || []), f.id], events: [...(s.events || []), { key: 'e' + ((s.events || []).length + 1), t: SCH.hhmm(SCH.nowOf(s)), text: `Steered ${f.name} onto the AT&T network` }] });
  const flowRow = (f) => ({ ...f, go: f.steerable ? steer(f) : andiFlow(f), doorLabel: f.steerable ? 'Steer →' : 'Ask Andi →', doorColor: f.steerable ? 'var(--warning)' : 'var(--link)' });
  return {
    ...iw, winLabel,
    talkers: iw.talkers.slice(0, 4).map(t => ({ ...t, go: () => set({ andiScope: { kind: 'region', id: t.region, label: t.label }, andiOpen: true }), doorLabel: 'Ask Andi →', enter: () => set({ hoverNode: 'reg' + t.region }), leave: () => set({ hoverNode: null }) })), talkersGo: go('s3', { layer: 'cloud', tab: 'observe', obPage: 'logs', sub: null }),
    newDest: iw.newDest.slice(0, 4).map(d => ({ ...d, go: govern(d.name), doorLabel: 'Set policy →' })), hasNewDest: iw.newDest.length > 0, newDestGo: go('s3', { layer: 'cloud', tab: 'govern', sub: null }),
    shadow: iw.shadow.slice(0, 4).map(d => ({ ...d, go: govern(d.name), doorLabel: d.covered ? 'Policy →' : 'Set policy →' })), shadowGo: go('s3', { layer: 'cloud', tab: 'govern', sub: null }),
    growthGo: go('s3', { layer: 'cloud', tab: 'cost', sub: null }),
    multi: { ...iw.multi, rows: iw.multi.rows.map(flowRow), has: iw.multi.rows.length > 0 }, multiGo: toMap('state'),
    slo: iw.slo.map(flowRow), hasSlo: iw.slo.length > 0, sloGo: toMap('slo'), sloLegend: `Over ${iw.SLO} ms`,
  };
}
/**
 * Compose, prefilled for one region or site: the shape composeFor, the gap
 * card's site rows, the Cost tab's "Attach" strip and its arbitrage rows all
 * need. One copy so it can only drift once; the same duplication that let
 * `go()`'s effects (scroll to top; clear hoverRegion/andiScope/drill/
 * cloudDrill/fabDrill/laneFocus) go missing from one of the four call sites
 * produced this wave's Task 1 defect too.
 */
function prefillAttach(r) {
  return { outcome: 'u1', source: ['Data center'], dest: ['Clouds'], regionTab: 'US East', metros: ['Ashburn'], resiliency: 'Standard', control: ['Private path required'], step: 5, prefilled: true, prefillRegion: r.region, prefillWl: r.wl };
}
/** Compose, prefilled for one region: the door the arbitrage table, the utilization card and the strips share. */
function composeFor(go, r) {
  return go('s4', { ...newOrder(prefillAttach(r)) });
}
// One findings list (notes, 2026-09-29): what AT&T found to act on, plus the
// events it saw, each with a life. The Observe head, the Findings tab and its
// chips all count this list.
function eventFound(when, now) {
  const w = String(when || '').toLowerCase();
  // An event that says when it started ('Started 09:13 · 47 min') began today (2026-09-30, one clock).
  return new Date(+now - (/today|^started/.test(w) ? 0 : /yesterday/.test(w) ? 1 : 3) * 86400000).toISOString().slice(0, 10);
}
export function findingList(est, est0, ob, now) {
  const events = ob && ob.total ? R.anomalies(est0, ob, +now) : [];
  // A degraded link and a port near full are findings too (2026-09-30): the
  // same incident list Home and Alerts read, so the head counts them once.
  const incidents = ob && ob.total ? OD.problems(est0, X.connections(est0, ob), ob, [], [], +now).filter(p => p.kind !== 'spike') : [];
  const incidentEvent = (p) => ({ key: p.key, when: `Started ${SCH.hhmm(p.startedAt)} · ${SCH.agoOf(p.startedAt, +now)}`, sev: p.sev === 1 ? 'red' : 'amber', region: p.region,
    head: p.kind === 'link' ? `BGP flapping on ${p.thing} in ${p.where}` : `${p.where} at ${p.what}`,
    cause: p.kind === 'link' ? `The ${p.thing} session to ${p.where} keeps dropping and re-forming: ${p.what.replace(/^BGP flapping · /, '')}.` : `Peak use is ${p.what}.`,
    did: p.kind === 'link' ? `AT&T saw it on the connection. ${p.ownerLabel} holds the SLA.` : 'AT&T flagged it before it saturates.',
    can: p.kind === 'link' ? 'Open a ticket with the cloud provider, or add a second path.' : 'Add a port, or move traffic to a second path.' });
  return [
    ...(est.findings || []).map(f => ({ ...f, key: f.kind, event: false })),
    ...incidents.map(incidentEvent).map(a => ({ kind: a.key, key: a.key, event: true, head: a.head, priced: false, found: eventFound('today', now), persona: 'Network Engineering', a })),
    ...events.map(a => ({ kind: a.key, key: a.key, event: true, head: a.head, priced: false, found: eventFound(a.when, now), persona: a.key === 'an-dest' ? 'Security and Compliance' : a.key === 'an-egress' ? 'FinOps' : 'Network Engineering', a })),
  ];
}
const OPEN_STATES = ['open', 'ack', 'progress'];
function lifeState(s, est) { return { ...LC.lifeFor(est), ...(((s.findingLife || {})[est.id]) || {}) }; }
function addendumVals(c, s, set, est, ob, inv, go, findingCard, totalSave, est0, sched, probRows = [], obAll = ob, probs = [], segCtx = null, incChanges = []) {
  const obScope = s.obScope || 'all';
  const egressBase = egressBaseFor(est0, ob);
  const gpw = R.gbPerWlExport(est0, egressBase);
  const estR = (r) => ({ ...(est0.regionsList.find(x => x.region === r.region) || { ...r, fab: r.latency || 8, pub: r.latency || 60, wl: r.wl || 0 }), gbPerWl: gpw });
  const dark = s.theme === 'dark';
  const steered = s.steered || [];
  const isEmpty = est.stage === 'empty';
  const openMap = s.inv || {}, sel = s.invSel || [];
  const toggle = (id) => () => set({ inv: { ...openMap, [id]: !openMap[id] } });
  // Expand all opens the three cheap levels. Opening every subnet (and every
  // gateway's circuit list) rendered 47,659 DOM nodes over 7.2 seconds on the
  // trust estate; a subnet's workload list and a gateway's circuits open on
  // their own click, where the user asked for them.
  const openKeys = inv.flatMap(cl => [cl.id, ...cl.regions.flatMap(r => [r.id, ...r.vpcs.map(v => v.id)])]);
  // The tag view is not a tree of open nodes: `tagTree` (naas-app.js:1917)
  // walks `cl.regions -> rg.vpcs` to group every VPC by tag, so gating those
  // arrays on open state would empty the whole view. Under `tagView` the tree
  // is built in full, which is what it already cost before this task.
  const branchOpen = (id) => !!s.tagView || !!openMap[id];
  const chip = (t) => { const st = A.tagStyle(t, dark); return { key: t, label: t, bg: st.bg, border: st.border, color: st.color }; };
  const badge = (priv, label) => ({ label: label || (priv ? 'via the AT&T network' : 'public internet'), bg: priv ? (dark ? 'rgba(79,191,116,.12)' : '#eef8f0') : 'var(--bg-wash)', border: priv ? (dark ? 'rgba(79,191,116,.5)' : '#8fd4a4') : 'var(--border-secondary)', color: priv ? (dark ? '#8fe0a8' : '#1e7a3c') : 'var(--text-body)', icon: priv ? 'link' : 'globe' });
  const GW_TINT = { igw: '#0057b8', nat: '#5d6f80', endpoint: '#7b3fbf', dx: '#1e7a3c', tgw: '#00838f' };
  // Path drill (2026-09-09): a region lists the sites that reach it, a site lists the regions it reaches, each row a trace.
  const po = s.pathOpen || {};
  const STATE_COLOR = { ok: 'var(--success)', warn: 'var(--warning)', bad: 'var(--error)' };
  const pathRow = (site, region, side) => {
    const pth = P.path(site, region); const key = `${site.id}|${region.region}`;
    const trail = pth.hops.filter(h => h.kind !== 'site' && h.kind !== 'hub');
    const hopDoor = (h) => h.kind === 'public' ? { doorLabel: `Attach ${region.region}`, go: composeFor(go, region) } : h.kind === 'access' && h.state !== 'ok' ? { doorLabel: 'Control →', go: () => { set({ authoring: { match: 'site ' + site.name, scope: 'any cloud', req: ['Private path required'] } }); go('s3', { layer: 'cloud', tab: 'govern' })(); } } : h.state !== 'ok' ? { doorLabel: 'Ask Andi →', go: () => set({ andiScope: { kind: 'region', id: region.region, label: `${region.cloud} ${region.region}` }, andiOpen: true }) } : null;
    return { key, name: side === 'site' ? `${region.cloud} ${region.region}` : site.name, sub: side === 'site' ? (region.priv ? `${region.ramp || 'NetBond'} · private path` : 'public path · no control') : `${site.clsLabel || site.cls} · ${site.metro}`,
      gbpsF: (P.gbps(est, site, region) >= 0.1 ? P.gbps(est, site, region).toFixed(1) : P.gbps(est, site, region).toFixed(2)) + ' Gbps', msF: `${pth.ms} ms`, dot: STATE_COLOR[pth.state], stateWord: pth.state === 'ok' ? 'healthy' : pth.state === 'warn' ? 'exposed' : 'over SLO',
      trail: trail.map((h, i) => ({ key: i, name: h.name, cls: h.state === 'ok' ? 'hop' : 'hop ' + h.state, notLast: i < trail.length - 1 })),
      traceOpen: s.traceOpen === key, toggleTrace: () => set({ traceOpen: s.traceOpen === key ? null : key }),
      hops: pth.hops.map((h, i) => { const d = hopDoor(h); return { key: i, name: h.name, sub: h.sub, msF: h.ms + ' ms', dot: STATE_COLOR[h.state], hasDoor: !!d, doorLabel: d ? d.doorLabel : '', go: d ? d.go : () => {}, weight: h.state === 'ok' ? 500 : 700 }; }),
      askAndi: () => set({ andiScope: { kind: 'region', id: region.region, label: `${site.name} → ${region.cloud} ${region.region}` }, andiOpen: true }) };
  };
  const winDays = winDaysOf(s), winLabel = winLabelOf(s), newOnly = !!s.newOnly;
  const isNew = (x) => !!x && x.since != null && x.since <= winDays;
  const LK = labelKit(s, set);
  // Each private connection's configured bandwidth, the ports Observe calls purchased (2026-09-28).
  const portsOf = (region) => { const u = (ob.utilRows || []).find(x => x.region === region); return u ? u.ports : 1; };
  const bwWord = (region) => { const u = (ob.utilRows || []).find(x => x.region === region); return u ? u.bwShort : '1G'; };
  const cloudBw = (cl) => { const pr = est.regionsList.filter(r => r.cloud === cl.name && r.priv); return pr.length ? ' · ' + pr.map(r => `${r.region} ${F.RAMP_NAME[r.ramp] || 'private'} ${bwWord(r.region)}`).join(', ') : ''; };
  const tree = inv.filter(cl => !newOnly || cl.regions.some(r => r.vpcs.some(isNew))).map(cl => ({
    key: cl.id, name: cl.name, mark: cl.mark, hasMark: !!cl.mark, noMark: !cl.mark, notTag: true, isTag: false, initials: cl.initials, gpu: cl.gpu, sub: `${cl.regions.length} ${cl.regions.length === 1 ? 'region' : 'regions'} · ${cl.vpcs} VPC · ${cl.wl.toLocaleString('en-US')} workloads${cloudBw(cl)}`,
    open: !!openMap[cl.id], toggle: toggle(cl.id), caret: openMap[cl.id] ? 'rotate(90deg)' : 'rotate(0deg)', badge: badge(cl.priv),
    regions: branchOpen(cl.id) ? cl.regions.filter(r => !newOnly || r.vpcs.some(isNew)).map(r => ({
      key: r.id, region: r.region, city: r.city, open: !!openMap[r.id], toggle: toggle(r.id), caret: openMap[r.id] ? 'rotate(90deg)' : 'rotate(0deg)', badge: badge(r.priv), jumpKey: 'reg:' + r.region,
      pathsOpen: !!po['reg:' + r.region], togglePaths: () => set({ pathOpen: { ...po, ['reg:' + r.region]: !po['reg:' + r.region] } }),
      ...(po['reg:' + r.region] ? (() => { const rs = P.regionSites(est, estR(r)); return { reachSites: rs.rows.map(x => pathRow(x.site, estR(r), 'region')), reachLine: `${rs.total} ${rs.total === 1 ? 'site reaches' : 'sites reach'} ${r.region} · ${rs.gbps} Gbps`, reachHasMore: rs.more > 0, reachMoreLabel: `+${rs.more} more, ranked lower by traffic` }; })() : { reachSites: [], reachLine: '', reachHasMore: false, reachMoreLabel: '' }),
      askAndi: () => set({ andiScope: { kind: 'region', id: r.region, label: r.cloud + ' ' + r.region }, andiOpen: true }),
      ctl: () => set({ authoring: { match: 'region ' + r.region, scope: 'any cloud', req: ['Private path required'] }, screen: 's3', layer: 'cloud', tab: 'govern' }), pathShort: R.PATHS.find(p => p.id === R.regionPath(r)).short, lensDot: R.SCORE_COLOR[R.lensScore(estR(r), s.lens || 'security')], lensWord: R.SCORE_WORD[R.lensScore(estR(r), s.lens || 'security')], compareOpen: s.compareRegion === r.region, toggleCompare: () => set({ compareRegion: s.compareRegion === r.region ? null : r.region }), compare: R.compareRegion(estR(r), egressBase).map(p => ({ ...p, key: p.id, curBg: p.cur ? 'var(--bg-accent)' : 'transparent', curLabel: p.cur ? 'today' : '', egressF: fmt(p.egressMo), relScoreColor: R.SCORE_COLOR[p.relScore], secScoreColor: R.SCORE_COLOR[p.secScore], latScoreColor: R.SCORE_COLOR[p.latScore], costScoreColor: R.SCORE_COLOR[p.costScore] })),
      stats: [{ key: 'v', v: r.vpcs.length, l: 'VPC/VNet' }, { key: 's', v: r.subnets, l: 'Subnets' }, { key: 'l', v: r.latency + 'ms', l: r.priv ? 'Latency · AT&T' : 'Latency · public' }],
      vpcs: branchOpen(r.id) ? r.vpcs.filter(v => !newOnly || isNew(v)).map(v => ({
        key: v.id, jumpKey: 'vpc:' + v.id, isNew: isNew(v), sinceLabel: sinceLabel(v), mgmt: v.managed ? 'AT&T-managed' : 'Customer-managed', mgmtClass: v.managed ? 'fx-badge att' : 'fx-badge', userLabels: LK.labelsOf(v.id), ...LK.ui(v.id, [cl.name, r.region, v.label, r.priv ? (F.RAMP_NAME[r.ramp] || 'NetBond') : 'Internet']), label: v.label, name: v.name, purpose: v.purpose, cidr: v.cidr, wl: v.wl, open: !!openMap[v.id], toggle: toggle(v.id), caret: openMap[v.id] ? 'rotate(90deg)' : 'rotate(0deg)',
        ctl: () => set({ authoring: { match: 'tag ' + (v.tags[0] || 'default'), scope: 'any cloud', req: ['Private path required'] }, screen: 's3', layer: 'cloud', tab: 'govern' }),
        selected: sel.includes(v.id), select: () => set({ invSel: sel.includes(v.id) ? sel.filter(x => x !== v.id) : [...sel, v.id] }), rowBg: sel.includes(v.id) ? 'var(--bg-accent)' : 'var(--bg-base)',
        tags: v.tags.map(chip), stats: [{ key: 'a', v: v.azs, l: 'AZs' }, { key: 's', v: v.subnets.length, l: 'Subnets' }], badge: badge(v.priv, v.priv ? 'Private' : 'Public'),
        azGroups: branchOpen(v.id) ? Array.from(new Set(v.subnets.map(sn => sn.az))).map(az => ({ key: az, az, subnets: v.subnets.filter(sn => sn.az === az).map(sn => ({ ...sn, key: sn.id, open: !!openMap[sn.id], toggle: toggle(sn.id), caret: openMap[sn.id] ? 'rotate(90deg)' : 'rotate(0deg)', wls: (sn.workloads || []).filter(w => !newOnly || isNew(w)).map(w => ({ ...w, key: w.id, isNew: isNew(w), sinceLabel: sinceLabel(w), ...R.endpointsFor(w, cl.name), open: !!openMap[w.id], toggle: toggle(w.id), caret: openMap[w.id] ? 'rotate(90deg)' : 'rotate(0deg)', ctl: () => set({ authoring: { match: 'tag ' + (w.tag || 'default'), scope: 'any cloud', req: ['Private path required'] }, screen: 's3', layer: 'cloud', tab: 'govern' }), tag: chip(w.tag || 'untagged'), dot: w.exposed ? 'var(--warning)' : 'var(--success)', dotLabel: w.exposed ? 'exposed' : 'private' })), moreWl: sn.wl > (sn.workloads || []).length ? `+${sn.wl - (sn.workloads || []).length} more` : '', hasMoreWl: sn.wl > (sn.workloads || []).length, tags: sn.tags.map(chip), pill: sn.pub ? { label: 'public', bg: 'var(--bg-wash)', border: 'var(--border-secondary)', color: 'var(--text-body)', dot: 'transparent', ring: 'var(--text-disabled)' } : { label: 'private', bg: dark ? 'rgba(79,191,116,.12)' : '#eef8f0', border: dark ? 'rgba(79,191,116,.5)' : '#8fd4a4', color: dark ? '#8fe0a8' : '#1e7a3c', dot: '#4fbf74', ring: '#4fbf74' } })) })) : [],
        routeTables: v.routeTables.map(t => ({ ...t, key: t.name, hasViol: t.viol > 0, violLabel: t.viol ? `${t.viol} policy violation${t.viol > 1 ? 's' : ''}` : '' })),
        gws: v.gws.map(g => ({ ...g, key: g.name, tint: GW_TINT[g.kind], tileBg: GW_TINT[g.kind] + (dark ? '2e' : '18'), hasLock: !!g.lock, hasCircuits: !!(g.circuits && g.circuits.length), open: !!openMap[v.id + g.name], toggle: toggle(v.id + g.name), caret: openMap[v.id + g.name] ? 'rotate(90deg)' : 'rotate(0deg)', circuits: (g.circuits || []).map(cx => ({ ...cx, key: cx.id, dot: cx.status === 'Active' ? 'var(--success)' : 'var(--warning)' })) })),
        hasViol: v.violations > 0, violLabel: v.violations ? `${v.violations} policy violation${v.violations > 1 ? 's' : ''}` : '',
      })) : [],
    })) : [],
  }));
  // What arrived inside the window (AO-362): the strip over Explore 360 and the "New" badges.
  const allVpcs = inv.flatMap(cl => cl.regions.flatMap(r => r.vpcs));
  const allWls = allVpcs.flatMap(v => v.subnets.flatMap(sn => sn.workloads || []));
  const allSites = S.siteTree(est).flatMap(cl => cl.children.flatMap(ch => ch.kind === 'metro' ? ch.sites : [ch]));
  const newVpcs = allVpcs.filter(isNew), newWls = allWls.filter(isNew), newSites = allSites.filter(isNew);
  const newN = newVpcs.length + newWls.length + newSites.length;
  const newUnlabeled = [...newVpcs, ...newSites].filter(x => !LK.labelsOf(x.id).length).length;
  const newPublic = newVpcs.filter(v => !v.priv).length + newWls.filter(w => w.exposed).length + newSites.filter(x => !x.priv).length;
  const nn = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const newStrip = {
    title: newOnly ? `Showing only what is new in the last ${winLabel}` : 'Act on it',
    text: newN
      ? `${nn(newN, 'resource was', 'resources were')} discovered in the last ${winLabel}: ${nn(newVpcs.length, 'VPC', 'VPCs')}, ${nn(newWls.length, 'workload', 'workloads')} and ${nn(newSites.length, 'site', 'sites')}. ${newUnlabeled === 0 ? 'All of them carry a label' : `${newUnlabeled} ${newUnlabeled === 1 ? 'has' : 'have'} no label yet`}${newPublic === 0 ? ' and none reach the internet directly.' : ` and ${newPublic} ${newPublic === 1 ? 'reaches' : 'reach'} the internet directly. Label them, then bring the exposed ones under a private-path policy.`}`
      : `Nothing new was discovered in the last ${winLabel}. Widen the range in the title row to look further back.`,
    cta: newOnly ? 'Show everything' : 'Review new', hasNew: newN > 0, pill: newOnly ? `${newN} new · showing only these` : `${newN} new · ${winLabel}`,
    toggle: () => set({ newOnly: !newOnly, inv: newOnly ? openMap : { ...openMap, ...Object.fromEntries(inv.flatMap(cl => [cl.id, ...cl.regions.map(r => r.id)]).map(k => [k, true])) }, siteOpen: newOnly ? (s.siteOpen || {}) : Object.fromEntries(S.siteTree(est).flatMap(cl => [cl.key, ...cl.children.map(ch => ch.key)]).map(k => [k, true])) }),
  };
  // Estate insights (2026-09-28): what you have and what you don't, each card
  // leading with its so-what, its evidence as rows, and one move.
  const enf = (n) => n.toLocaleString('en-US');
  const ecnt = (xs) => xs.reduce((a, x) => a + S.countOf(x.name), 0);
  const eBars = (rows) => { const m = Math.max(1, ...rows.map(r => r.n)); return rows.map(r => ({ ...r, title: r.title || r.label, key: r.key || r.label, w: Math.max(4, Math.round(r.n / m * 100)) + '%' })); };
  const allSitesE = est.sites || [], eSiteN = ecnt(allSitesE), eAttN = ecnt(allSitesE.filter(onAtt));
  // A site counts once, under its primary service: the same count the access grouping and Cost use (2026-09-29).
  const eSvcTally = {}; allSitesE.forEach(x => { const v = S.servicesOf(x)[0]; if (!v) return; eSvcTally[v.key] = eSvcTally[v.key] || { v, n: 0 }; eSvcTally[v.key].n += S.countOf(x.name); });
  const eToSites = () => set({ estPanel: 'sites' });
  const eBwOf = (r) => { const u = (ob.utilRows || []).find(x => x.region === r.region); return u ? u.bwShort : '1G'; };
  const eRegs = est.regionsList || [], ePrivRegs = eRegs.filter(r => r.priv), ePubRegs = eRegs.filter(r => !r.priv), pubWlE = ePubRegs.reduce((a, r) => a + (r.wl || 0), 0);
  // Four rows a card, the rest counted, so two rows of cards fit the fold (2026-09-28).
  const cap4 = (c0) => c0.rows.length <= 4 ? c0 : { ...c0, rows: [...c0.rows.slice(0, 3), { key: 'more', label: `+${c0.rows.length - 3} more`, sub: '', title: c0.rows.slice(3).map(r0 => r0.label).join(', '), w: '0%', fill: 'transparent', value: '' }] };
  const haveCards = [
    { title: 'Sites by service', soWhat: eAttN === eSiteN ? `All ${enf(eSiteN)} sites on AT&T.` : `${enf(eAttN)} of ${enf(eSiteN)} on AT&T · ${enf(eSiteN - eAttN)} on another carrier`,
      rows: eBars(Object.values(S.SERVICE).concat(Object.values(eSvcTally).map(t => t.v).filter(v => !S.SERVICE[v.key])).filter(v => eSvcTally[v.key]).map(v => ({ label: v.label, sub: '', title: v.name, n: eSvcTally[v.key].n, value: enf(eSvcTally[v.key].n), fill: v.onAtt ? 'var(--viz-1)' : 'var(--viz-4)' }))),
      cta: 'Your sites', go: eToSites },
    { title: 'Cloud connections', soWhat: `${ePrivRegs.length} of ${eRegs.length} regions private${ePubRegs.length ? ` · ${enf(pubWlE)} workloads on the internet` : ''}`,
      rows: eBars([...ePrivRegs, ...ePubRegs].slice(0, 6).map(r => ({ key: r.region, label: `${r.cloud} ${r.region}`, sub: r.priv ? (F.RAMP_NAME[r.ramp] || 'Private') : 'public internet', n: r.wl || 0, value: r.priv ? eBwOf(r) : 'Internet', fill: r.priv ? 'var(--viz-1)' : 'var(--viz-6)' }))),
      cta: 'Connect', go: go('s3', { layer: 'cloud', tab: 'connect' }) },
    { title: `New in the last ${winLabel}`, soWhat: newN ? `${enf(newUnlabeled)} unlabeled · ${enf(newPublic)} reach the internet` : 'Nothing new',
      rows: eBars([['VPCs', newVpcs.length], ['Workloads', newWls.length], ['Sites', newSites.length], ['No label yet', newUnlabeled], ['Reach the internet', newPublic]].map(([l, n]) => ({ label: l, sub: '', n, value: enf(n), fill: /label|internet/.test(l) ? 'var(--viz-4)' : 'var(--viz-1)' }))),
      cta: newStrip.cta, go: newN ? newStrip.toggle : eToSites },
  ];
  haveCards.splice(0, haveCards.length, ...haveCards.map(cap4));
  const eOffAtt = allSitesE.filter(x => !onAtt(x));
  const eIpsecB = (est.buckets || []).find(b => b.id === 'ipsec');
  const eSingles = allSitesE.filter(x => onAtt(x) && Array.isArray(x.services) && S.servicesOf(x).length === 1);
  const eByRegion = (xs) => { const m = {}; xs.forEach(x => { const r = regionOf(x); (m[r] = m[r] || []).push(x); }); return Object.entries(m); };
  const lackCards = [
    ...(eOffAtt.length ? [{ title: `Private path for ${enf(ecnt(eOffAtt))} ${ecnt(eOffAtt) === 1 ? 'site' : 'sites'}`,
      soWhat: eIpsecB ? `${fmt(eIpsecB.today)}/mo egress · ${enf(eOffAtt.length)} VPN endpoints exposed` : `${enf(ecnt(eOffAtt))} outside AT&T`,
      rows: eOffAtt.map(x => ({ key: x.name, label: x.name, sub: regionOf(x), title: `${x.name} · ${x.metro} · ${S.servicesOf(x)[0].name}`, w: '0%', fill: 'transparent', value: x.tunnel || (S.countOf(x.name) > 1 ? enf(S.countOf(x.name)) : S.servicesOf(x)[0].label) })),
      cta: 'Move to AT&T', go: go('s4') }] : []),
    ...(ePubRegs.length ? [{ title: `Private connection in ${ePubRegs.length} ${ePubRegs.length === 1 ? 'region' : 'regions'}`,
      soWhat: `${enf(pubWlE)} workloads on the internet${totalSave ? ` · ${fmt(totalSave)}/mo to save` : ''}`,
      rows: eBars(ePubRegs.map(r => ({ key: r.region, label: `${r.cloud} ${r.region}`, sub: `${r.pub} ms`, n: r.wl || 0, value: enf(r.wl || 0), fill: 'var(--viz-6)' }))),
      cta: `Attach ${ePubRegs.length}`, go: composeFor(go, ePubRegs[0]) }] : []),
    ...(eSingles.length ? [{ title: `A backup path at ${enf(eSingles.length)} ${eSingles.length === 1 ? 'site' : 'sites'}`,
      soWhat: 'One circuit failure takes a site offline',
      rows: eBars(eByRegion(eSingles).map(([r, xs]) => ({ key: r, label: r, sub: '', title: xs.map(x => x.name).join(', '), n: xs.length, value: enf(xs.length), fill: 'var(--viz-4)' }))),
      cta: 'Add a backup', go: go('s4') }] : []),
  ];
  const stats = A.inventoryStats(est, inv);
  // At a glance with oomph, down to the app level (Micah, 2026-09-29): four
  // rings whose centres are the header's counts, then the apps themselves.
  const apps = appsOf(est, inv, ob.flows);
  const privWlN = Math.round(apps.reduce((a, x) => a + x.wl * x.onAtt, 0)), pubWlN = Math.max(0, stats.workloads - privWlN);
  const ringOf = (key, title, rows, centre, centreSub, head, cta, go2) => { const d = R.donut(rows); return { key, title, ring: d.ring, centre, centreSub, head, cta, go: go2,
    legend: d.rows.slice(0, 4).map(r => ({ key: r.label, color: r.color, label: r.label, n: enf(r.v) })) }; };
  const byCloudRegs = {}; eRegs.forEach(r => { byCloudRegs[r.cloud] = (byCloudRegs[r.cloud] || 0) + 1; });
  const glanceRings = [
    ringOf('sites', 'Sites', Object.values(eSvcTally).sort((a, b) => b.n - a.n).map((t, i) => ({ label: t.v.label, v: t.n, color: t.v.onAtt ? `var(--viz-${[1, 2, 3, 5][i % 4]})` : 'var(--viz-4)' })), enf(eSiteN), 'sites', eAttN === eSiteN ? 'All on AT&T' : `${enf(eAttN)} on AT&T`, 'Your sites', eToSites),
    ringOf('clouds', 'Clouds', Object.entries(byCloudRegs).sort((a, b) => b[1] - a[1]).map(([c, n]) => ({ label: c, v: n })), enf(eRegs.length), eRegs.length === 1 ? 'region' : 'regions', `${ePrivRegs.length} private`, 'Your clouds', () => set({ estPanel: 'clouds' })),
    ringOf('workloads', 'Workloads', [{ label: 'On AT&T', v: privWlN, color: 'var(--viz-1)' }, { label: 'On the internet', v: pubWlN, color: 'var(--viz-6)' }], enf(stats.workloads), 'workloads', pubWlN ? `${enf(pubWlN)} on the internet` : 'None on the internet', 'Connect them', go('s3', { layer: 'cloud', tab: 'connect', cnPage: 'options' })),
    ringOf('apps', 'Apps', apps.map(x => ({ label: x.tag, v: x.wl })), enf(apps.length), apps.length === 1 ? 'app' : 'apps', `${enf(apps.reduce((a, x) => a + x.exposed, 0))} workloads exposed`, 'Tags', go('s3', { layer: 'cloud', tab: 'govern', govPanel: 'tags' })),
  ];
  const wlMax = Math.max(1, ...apps.map(x => x.wl));
  const H_INK = F.HEALTH_INK; // one ink per state; Over SLO is not Down's red (review, 2026-09-30)
  const appAll = apps.map(x => ({ key: x.tag, name: x.tag, sub: x.topApps.join(', '), wl: x.wl, exposed: x.exposed, wlF: enf(x.wl), wlW: Math.max(3, Math.round(x.wl / wlMax * 100)) + '%',
    runsIn: x.regions.slice(0, 2).join(', ') + (x.regions.length > 2 ? ` +${x.regions.length - 2}` : ''), runsTitle: x.regions.join(', '),
    onAttF: Math.round(x.onAtt * 100) + '%', onAttW: Math.round(x.onAtt * 100) + '%', exposedF: x.exposed ? enf(x.exposed) : 'None', exposedInk: x.exposed ? 'var(--error)' : 'var(--text-light)',
    gbpsF: x.gbps >= 1 ? x.gbps.toFixed(1) + ' Gbps' : Math.round(x.gbps * 1000) + ' Mbps', p95F: `${x.p95} ms`, healthInk: H_INK[x.health], healthTitle: `p95 ${x.p95} ms against a ${x.slo} ms SLO`,
    // An app opens its own records: the Logs filtered to its tag.
    go: () => { go('s3', { layer: 'cloud', tab: 'observe', obPage: 'logs', sub: null })(); set({ logQ: x.tag, logPage: 0 }); } }));
  const selWl = inv.flatMap(cl => cl.regions.flatMap(r => r.vpcs)).filter(v => sel.includes(v.id)).reduce((a, v) => a + v.wl, 0);
  const pubWl = est.regionsList.filter(r => !r.priv).reduce((a, r) => a + r.wl, 0);
  const attachN = selWl || pubWl;
  // The loop is Connect -> Observe -> Govern -> Cost. Explore 360 is the way in, so its
  // one call to action is Connect. (The five-stop model it used to read is deleted.)
  const stationCta = { label: attachN ? `Attach ${attachN.toLocaleString('en-US')}` : 'Connect', go: go('s3', { layer: s.layer, tab: 'connect' }) };
  // observe
  const OBTABS = ['flow', 'trend', 'throughput', 'latency', 'loss', 'egress', 'control'];
  const obTab = s.obTab || 'flow';
  const obTabs = OBTABS.map(t => ({ key: t, label: t === 'control' ? 'Logs' : t[0].toUpperCase() + t.slice(1), on: obTab === t, go: () => set({ obTab: t }), ub: obTab === t ? 'var(--cta)' : 'transparent', uc: obTab === t ? 'var(--link)' : 'var(--text-body)', uw: obTab === t ? 700 : 500 }));
  const trend = obTab === 'flow' ? null : A.trendBand(obTab, ob);
  const sk = ob.sankey;
  const toLogs = (extra) => { set({ obTab: 'control', ...(extra || {}) }); if (typeof document !== 'undefined') setTimeout(() => { const el = document.getElementById('observe-logs'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 80); };
  const skNodes = sk.nodes.map((n, i) => { const left = n.side !== 'r'; const door = n.kind === 'site' ? () => set({ skSplit: 'site:' + n.cls }) : n.kind === 'tag' ? () => set({ skSplit: 'tag:' + n.name }) : (n.kind === 'sitemetro' || n.kind === 'tagregion') ? () => set({ skSplit: null }) : n.kind === 'region' ? () => toLogs({ logPattern: 'clouds' }) : n.kind === 'dest' ? () => toLogs({ logPattern: X.destPattern(n.name) }) : null; return { ...n, key: 'k' + i, fill: n.side === 'm' ? (n.priv ? '#0057b8' : (dark ? '#5d6f80' : '#8a949c')) : (dark ? '#c5cfd9' : '#1a2431'), lx: left ? n.x2 + 6 : n.x - 226, ly: n.y + n.h / 2 - 10, lw: 220, justify: left ? 'flex-start' : 'flex-end', label: n.name, vF: n.v.toFixed(1) + ' Gbps', go: door || (() => {}), cursor: door ? 'pointer' : 'default', title: door ? (n.kind === 'site' ? 'Split by metro' : n.kind === 'tag' ? 'Split by region' : (n.kind === 'sitemetro' || n.kind === 'tagregion') ? 'Merge back' : 'Open the flow logs') : '' }; });
  const skHeads = (sk.heads || []).map((h, i) => ({ ...h, key: 'h' + i, fx: h.anchor === 'end' ? h.x - 240 : h.x, fy: h.y - 13, align: h.anchor === 'end' ? 'right' : 'left' }));
  const skRibbons = sk.ribbons.map((r, i) => ({ ...r, key: 'r' + i, fill: r.priv ? '#3374cc' : (dark ? '#5d6f80' : '#8a949c'), op: r.priv ? 0.55 : 0.3 }));
  const steer = (f) => () => { set({ steered: [...(s.steered || []), f.id], events: [...(s.events || []), { key: 'e' + ((s.events || []).length + 1), t: SCH.hhmm(SCH.nowOf(s)), text: `Steered ${f.name} onto the AT&T network · ${f.gbps} Gbps now under control` }] }); };
  const failover = (f) => () => set({ events: [...(s.events || []), { key: 'e' + ((s.events || []).length + 1), t: SCH.hhmm(SCH.nowOf(s)), text: `Failover test on ${f.name} · secondary path healthy` }] });
  const paths = ob.flows.map(f => ({ ...f, key: f.id, gbpsF: f.gbps.toFixed(1), latF: f.latency + 'ms', perGbF: '$' + f.perGb.toFixed(2) + '/GB', perGbBg: f.controlled ? 'var(--bg-accent)' : 'var(--bg-wash)', perGbColor: f.controlled ? 'var(--link)' : 'var(--text-body)', control: f.controlled ? 'AT&T-controlled' : 'Public', ctlBg: f.controlled ? (dark ? 'rgba(79,191,116,.12)' : '#eef8f0') : 'var(--bg-wash)', ctlColor: f.controlled ? (dark ? '#8fe0a8' : '#1e7a3c') : 'var(--text-body)', diverseF: f.diverse ? 'Yes' : 'No', canSteer: !f.controlled && f.steerable, canFailover: f.controlled, steer: steer(f), failover: failover(f) }));
  const groupBy = s.groupBy || 'Path';
  const records = (groupBy === 'None' ? ob.records.map(r => ({ ...r, time: '14:02:11' })) : ob.records).map(r => ({ ...r, actBg: r.deny ? (dark ? 'rgba(211,47,47,.2)' : '#fdecea') : 'var(--bg-wash)', actColor: r.deny ? 'var(--error)' : 'var(--text-body)' }));
  const briefPills = [{ key: 'a', label: 'Show public flows', go: () => set({ obTab: 'flow' }) }, { key: 'b', label: 'Steer worst offender', go: ob.worst ? steer(ob.worst) : () => {} }, { key: 'c', label: 'Review path diversity', go: () => set({ obTab: 'control' }) }];
  const briefQs = ['Which flow would save the most by steering to AT&T mid-mile?', 'What is driving the public egress spend?', 'Are any controlled flows single-homed (no failover)?'].map((q, i) => ({ key: 'q' + i, q }));
  const events = (s.events || []).slice().reverse();
  // Observe (Ramesh, 2026-09-09): connections, impacted workloads, five patterns, logs.
  const obPage = s.obPage || 'perf';
  const conns = X.connections(est0, ob);
  const obConn = s.obConn && conns.rows.some(r => r.id === s.obConn) ? s.obConn : (conns.rows[0] || {}).id;
  const connRow = conns.rows.find(r => r.id === obConn) || null;
  const connRows = conns.rows.map(r => ({ ...r, key: r.id, label: `${r.cloud} ${r.region}`, sub: `${F.RAMP_NAME[r.ramp] || 'NetBond'} · ${r.bw || r.ports + ' × 10 Gbps'} purchased`, pctF: r.pct + '%', curAvg: `cur ${r.gbps} · avg ${r.avg} Gbps`, on: r.id === obConn, rowBg: r.id === obConn ? 'var(--bg-accent)' : 'transparent', stateColor: r.state === 'Up' ? 'var(--success)' : 'var(--warning)', lineColor: r.degraded ? 'var(--error)' : '#009fdb', select: () => set({ obConn: r.id, cloudDrill: [r.region] }), hasDoor: r.hot, doorLabel: 'Add a port', go: composeFor(go, est0.regionsList.find(x => x.region === r.region) || {}) }));
  const impact0 = X.impacted(est0, inv, connRow);
  const impact = { ...impact0, isNone: impact0.kind === 'none', isHit: impact0.kind !== 'none', hasDown: impact0.downstream.length > 0, hasVpcs: impact0.vpcs.length > 0, vpcs: impact0.vpcs.map(v => ({ ...v, key: v.name, wlF: v.wl.toLocaleString('en-US') + ' workloads', tagsF: v.tags.join(' · ') || 'untagged' })), downstream: impact0.downstream.map(d => ({ ...d, key: d.label, vpcsF: d.vpcs.map(v => v.name).join(', ') })), tone: impact0.kind === 'direct' ? 'var(--error)' : impact0.kind === 'possible' ? 'var(--warning)' : 'var(--success)', title: connRow ? `${connRow.cloud} ${connRow.region} · ${connRow.ramp}` : 'No connection selected', openLogs: () => toLogs({ logPattern: 'all', obScope: connRow ? 'cloud:' + connRow.cloud : obScope }), askAndi: () => set({ andiScope: connRow ? { kind: 'region', id: connRow.region, label: `${connRow.cloud} ${connRow.region}` } : null, andiOpen: true }) };
  const logPattern = s.logPattern || 'all';
  // Logs never replaces the page (Micah, 13:36): it opens under the patterns and the page scrolls to it.
  const patternCards = X.patterns(est0, ob, inv).map(p => ({ ...p, key: p.key, hasRows: p.rows.length > 0, rows: p.rows.map(r => ({ ...r, key: r.key, go: () => toLogs({ logPattern: p.key }) })), legend: p.legend.map(l => ({ ...l, key: l.label })), goLogs: () => toLogs({ logPattern: p.key }) }));
  const logChips = [{ key: 'all', label: 'All' }, ...patternCards.map(p => ({ key: p.key, label: p.title }))].map(ch => ({ ...ch, on: ch.key === logPattern, go: () => set({ logPattern: ch.key }), bg: ch.key === logPattern ? 'var(--cta)' : 'var(--bg-base)', color: ch.key === logPattern ? '#fff' : 'var(--text-heading)', border: ch.key === logPattern ? 'var(--cta)' : 'var(--border-secondary)' }));
  const TILE_ORDER = ['thr', 'util', 'p95', 'loss'];
  const obTiles = ob.kpis.filter(k => TILE_ORDER.includes(k.key)).sort((a, b) => TILE_ORDER.indexOf(a.key) - TILE_ORDER.indexOf(b.key)).map(k => ({ ...k, hasUnit: !!k.u, hasE: !!k.e }));
  // ---- Logs, as a section of Observe rather than a tab inside a panel ----
  // The flow record is the evidence under every number on this page, so it
  // gets the same treatment as the map: its own filters, its own count, and
  // rows that open the thing they name.
  const logQ = (s.logQ || '').trim().toLowerCase();
  const logPath = s.logPath || 'all';
  const logAct = s.logAct || 'all';
  const logAll = X.records(est0, inv, ob, logPattern);
  // "From the aggregate view we need to take them to the explain-this-to-me
  // page where we cut this info further, all the way down to individual logs"
  // (Ramesh). Every aggregate figure carries the cut that produced it, Logs
  // applies that cut, and says which figure it is explaining.
  const explain = s.explain || null;
  const logMatch = logAll.filter(r => {
    if (explain && explain.pattern && r.pattern !== explain.pattern) return false;
    if (explain && explain.path && r.path !== explain.path) return false;
    if (logPath === 'private' && r.path !== 'private') return false;
    if (logPath === 'public' && r.path !== 'public') return false;
    if (logAct === 'allow' && r.deny) return false;
    if (logAct === 'deny' && !r.deny) return false;
    if (logQ && !`${r.srcName} ${r.srcSub} ${r.dstName} ${r.dstSub} ${r.proto}`.toLowerCase().includes(logQ)) return false;
    return true;
  });
  const chipRow = (cur, opts, key) => opts.map(([k, l]) => ({ key: k, label: l, on: cur === k, go: () => set({ [key]: k, logPage: 0 }),
    bg: cur === k ? 'var(--cta)' : 'var(--bg-base)', color: cur === k ? '#fff' : 'var(--text-heading)', border: cur === k ? 'var(--cta)' : 'var(--border-secondary)' }));
  const logPathChips = chipRow(logPath, [['all', 'Any path'], ['private', 'On AT&T'], ['public', 'Outside AT&T']], 'logPath');
  const logActChips = chipRow(logAct, [['all', 'Any action'], ['allow', 'Allowed'], ['deny', 'Denied']], 'logAct');
  const logDeny = logMatch.filter(r => r.deny).length;
  const logPub = logMatch.filter(r => r.path === 'public').length;
  // Logs is the page, and it pages to fit the fold rather than scrolling inside a box (Micah, 2026-09-29).
  const pageOf = (rows, size, key) => pageRows(rows, size, s[key], (n) => set({ [key]: n }));
  // The explanation panel over the logs takes room; the page keeps the fold (2026-09-29 audit).
  const logPageSize = Math.max(3, ((s.logFiltersOpen === undefined ? !s.explain : !!s.logFiltersOpen) ? 6 : 9) - (s.explain ? 2 : 0));
  const flowAll = logMatch.map(r => ({ ...r, key: r.id, actBg: r.deny ? (dark ? 'rgba(211,47,47,.2)' : '#fdecea') : 'var(--bg-wash)', actColor: r.deny ? 'var(--error)' : 'var(--text-body)',
    pathInk: r.path === 'public' ? 'var(--warning)' : 'var(--success)',
    pathWord: r.path === 'public' ? 'outside AT&T' : 'on AT&T' }));
  const flowPage = pageOf(flowAll, logPageSize, 'logPage');
  const flowRecords = flowPage.rows, logPager = flowPage.pager;
  // User activity: the other half of a log. Flow records say what the network
  // carried; these say who changed it. Every row is derived from something
  // that actually exists in the estate - a region that got attached, a policy
  // that got written, a credential that got added.
  const FROM = ['12.34.56.78', '12.34.56.91', '10.42.8.14', 'api · portal token'];
  // One activity list (2026-09-30): dated from the first attach to now, shared
  // with Observe's change list, so every window sees its own history.
  const actNow = SCH.nowOf(s);
  const actRuns = (sched.runs || []).map(r => {
    const how = r.trigger === 'manual' ? 'on demand' : `on schedule at ${SCH.clockLabel(r.at)}`;
    const bits = [`${r.accounts} ${r.accounts === 1 ? 'account' : 'accounts'}`, `${r.regions} ${r.regions === 1 ? 'region' : 'regions'}`];
    if (r.sites) bits.push(`${r.sites.toLocaleString('en-US')} ${r.sites === 1 ? 'site' : 'sites'}`);
    return { ...r, detail: `${bits.join(', ')} · ${how}` };
  });
  const actAll = OD.activityOf(est, { customPolicies: s.customPolicies || [], steered: s.steered || [], conns, runs: actRuns, now: actNow })
    .map(a => ({ ...a, mins: Math.max(0, Math.round((actNow - a.at) / 60000)) }));
  const ago = (m) => m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`;
  const actQ = (s.actQ || '').toLowerCase();
  const actMatch = actAll.filter(a => !actQ || (a.who + ' ' + a.verb + ' ' + a.target + ' ' + a.detail).toLowerCase().includes(actQ));
  const actPageSize = 8;
  const actAllRows = actMatch.map((a, i) => ({
    key: 'ua' + i, when: ago(a.mins), who: a.who, verb: a.verb, target: a.target, detail: a.detail,
    from: FROM[i % FROM.length], result: a.ok ? 'Applied' : 'Denied',
    resBg: a.ok ? 'var(--bg-wash)' : (dark ? 'rgba(211,47,47,.2)' : '#fdecea'),
    resInk: a.ok ? 'var(--text-body)' : 'var(--error)',
  }));
  const actPage = pageOf(actAllRows, actPageSize, 'actPage');
  const actRows = actPage.rows, actPager = actPage.pager;
  const logTab = s.logTab || 'flow';
  const logTabs = [['flow', 'Flow records'], ['user', 'User activity']].map(([k, l]) => ({
    key: k, label: k === 'flow' ? `${l} · ${logAll.length.toLocaleString('en-US')}` : `${l} · ${actAll.length}`,
    on: logTab === k, go: () => set({ logTab: k }),
    line: logTab === k ? 'var(--cta)' : 'transparent', color: logTab === k ? 'var(--text-heading)' : 'var(--text-light)', weight: logTab === k ? 700 : 500,
  }));
  const actVals = {
    logTabs, onFlowTab: logTab === 'flow', onUserTab: logTab === 'user',
    actRows, actPager, actPageSize, logPager, logPageSize, hasAct: actRows.length > 0, noAct: actRows.length === 0,
    actQ: s.actQ || '', setActQ: (e) => set({ actQ: e.target.value, actPage: 0 }),
    actCount: `${actMatch.length} of ${actAll.length} changes`,
    actNote: `Who changed the network, from where, and whether it applied, over ${winLabelOf(s)}.`,
  };
  const explainParts = explain && explain.parts ? explain.parts.map((x, i) => ({
    key: 'ep' + i, label: x.label, value: x.value, share: x.share, w: x.w,
    go: () => set({ logQ: x.q || '', obPage: 'logs', sub: null, scrollToSec: 'sec-logs', scrollNonce: (s.scrollNonce || 0) + 1 }),
  })) : [];
  const explainVals = {
    explainOn: !!explain, explainOff: !explain,
    explainLabel: explain ? explain.label : '',
    explainValue: explain ? explain.value : '',
    explainSub: explain ? explain.sub : '',
    explainCut: explain ? explain.cut : '',
    explainParts, hasExplainParts: explainParts.length > 0,
    explainCount: `${logMatch.length} of ${logAll.length} records carry it`,
    clearExplain: () => set({ explain: null, logQ: '' }),
  };
  const logVals = {
    ...actVals, ...explainVals,
    flowRecords, logChips, logPathChips, logActChips,
    logQ: s.logQ || '', setLogQ: (e) => set({ logQ: e.target.value, logPage: 0 }),
    logCount: `${logMatch.length.toLocaleString('en-US')} of ${logAll.length.toLocaleString('en-US')} records`,
    logNote: logMatch.length ? `${logDeny} denied · ${logPub} outside AT&T · public destinations stay unresolved` : 'Nothing matches these filters.',
    hasLogs: logMatch.length > 0, noLogs: logMatch.length === 0,
    logFiltersOpen: s.logFiltersOpen === undefined ? true : !!s.logFiltersOpen,
    logFiltersShut: !(s.logFiltersOpen === undefined ? !s.explain : !!s.logFiltersOpen),
    toggleLogFilters: () => set({ logFiltersOpen: !(s.logFiltersOpen === undefined ? !s.explain : !!s.logFiltersOpen) }),
    logFilterCount: (() => { const k = (logQ ? 1 : 0) + (logPath !== 'all' ? 1 : 0) + (logAct !== 'all' ? 1 : 0) + (logPattern !== 'all' ? 1 : 0); return k ? `${k} filter${k === 1 ? '' : 's'}` : 'No filters'; })(),
    logFilterToggleWord: (s.logFiltersOpen === undefined ? !s.explain : !!s.logFiltersOpen) ? 'Hide' : 'Show',
    clearLogs: () => set({ logQ: '', logPath: 'all', logAct: 'all', logPattern: 'all', logPage: 0 }),
    logHasFilters: !!(logQ || logPath !== 'all' || logAct !== 'all' || logPattern !== 'all'),
  };
  const nextStop = { ...VD.observeNext(conns), go: go('s3', { layer: 'cloud', tab: 'govern' }) };
  // The gap, itemised. The page could show what you have and what the three
  // paths cost, but never "these eleven things are not connected, here is
  // each one and what it would take". That is the middle rung a customer
  // actually stands on between discovering and ordering.
  const gapRegions = est.regionsList.filter(r => !r.priv).map(r => ({
    key: 'gr-' + r.region, kind: 'region', name: `${r.cloud} ${r.region}`,
    sub: `${(r.wl || 0).toLocaleString('en-US')} workloads · ${r.pub} ms on the public path · ${(r.tags || []).slice(0, 3).join(', ') || 'no tags'}`,
    tags: (r.tags || []).slice(0, 3).map(t => ({ key: t, label: t })),
    hasTags: (r.tags || []).length > 0,
    best: 'NetBond on the AT&T network', bestWhy: `${r.fab} ms · $0.02/GB · from 10 business days`,
    alt: 'or Direct Connect / ExpressRoute · 4 to 8 weeks, you run the routers',
    go: composeFor(go, r),
  }));
  const gapSites = (est.sites || []).filter(x => !x.priv).map(x => {
    const qty = S.countOf(x.name);
    const label = x.name.replace(/\s*\([\d,]+\)\s*$/, '');
    const what = `${qty.toLocaleString('en-US')} ${qty === 1 ? 'site' : 'sites'} · ${label}`;
    const countPrefix = qty === 1 ? '' : `${qty.toLocaleString('en-US')} sites · `;
    return {
      key: 'gs-' + x.name, kind: 'site', name: label, qty,
      sub: `${countPrefix}${x.access || 'first mile'} · ${x.metro || 'various'} · public first mile`,
      tags: [], hasTags: false,
      best: 'Attach the first mile to the AT&T network', bestWhy: 'AVPN or ASE, same-day on existing access',
      alt: 'or keep the internet path with inline inspection',
      // Same entry as composeFor(go, x) on the base - prefillAttach, through
      // go() - so the two row kinds in this card behave as one card, scroll
      // reset and all. The source label and quantity ride inside `compose`;
      // noteStep says which step gets to show the alert they explain (fix
      // round 2, finding A) - the next prefillCompose-based route wipes both,
      // and cleanCompose wipes them explicitly wherever a NEW order starts
      // from a live `compose` instead (fix round 2, finding B).
      go: go('s4', { ...newOrder({ ...prefillAttach(x), bulk: what, qty, sourceLabel: 'Not connected yet', noteStep: 5, note: `Attach ${what}. One order, one policy, ${qty.toLocaleString('en-US')} ${qty === 1 ? 'circuit' : 'circuits'}.` }) }),
    };
  });
  const gapRows = [...gapRegions, ...gapSites];
  // Connect · Options (notes, 2026-09-29): the same candidates as a page, split
  // by what they are, each with its own best option and what else would do.
  const candRow = (row, opt) => ({ ...row, qty: row.qty || 1, bestName: opt.best.name, bestWhy: opt.best.why, altLine: 'or ' + opt.alts.map(a => a.name).join(' · ') });
  const pubSites = (est.sites || []).filter(x => !x.priv);
  const candSiteRows = pubSites.map((x, i) => ({ row: candRow(gapSites[i], S.candidateOptions(x)), dc: S.isDataCenter(x) }));
  const candGroups = [
    ['sites', 'Sites', candSiteRows.filter(r => !r.dc).map(r => r.row)],
    ['dcs', 'Data centers', candSiteRows.filter(r => r.dc).map(r => r.row)],
    ['regions', 'Cloud regions', est.regionsList.filter(r => !r.priv).map((r, i) => candRow(gapRegions[i], S.candidateOptions(r)))],
  ].filter(g => g[2].length).map(([key, label, rows]) => ({ key, label, rows, count: rows.reduce((a, r) => a + r.qty, 0).toLocaleString('en-US') }));
  const gapSiteN = S.gapSiteCount(est);
  const gapSummary = gapRows.length
    ? `${gapRegions.length} cloud ${gapRegions.length === 1 ? 'region' : 'regions'} and ${gapSiteN.toLocaleString('en-US')} ${gapSiteN === 1 ? 'site is' : 'sites are'} still on the public internet, in ${gapRows.length} ${gapRows.length === 1 ? 'group' : 'groups'}.`
    : 'Everything discovered is on the AT&T network.';
  // Connect, as three decisions in the order a customer makes them:
  // which path, how to buy it, what happens after the order is placed.
  const pathPick = s.pathPick || 'fabric';
  const buyPick = s.buyPick || 'hosted';
  const PATH_STEPS = [
    { id: 'fabric', name: 'Private AT&T (NetBond)', tone: '#0057b8',
      what: 'AT&T NetBond into the cloud on-ramp. Private layer 3, never on the public internet.',
      tags: ['Private', 'Any cloud', 'AT&T managed'],
      good: 'Deterministic latency, one SLA end to end, $0.02/GB egress, every cloud off the same port.',
      cost: 'Capacity is committed up front. From 10 business days to stand up.' },
    { id: 'sdwan', name: 'SD-WAN overlay', tone: '#00a8e0',
      what: 'Your SD-WAN extended to the cloud gateway. Encrypted overlay over the access you already have.',
      tags: ['Encrypted', 'Any transport', 'Days not weeks'],
      good: 'Live on existing access, steers around brownouts on its own, no new circuit to order.',
      cost: 'The middle mile is shared transport, so it is best effort. $0.04/GB blended.' },
    { id: 'native', name: 'Hyperscaler-native interconnect', tone: '#5d6f80',
      what: 'Direct Connect, ExpressRoute or Cloud Interconnect straight into one cloud.',
      tags: ['Private', 'One cloud', 'You operate'],
      good: 'Lowest per-GB rate inside that one cloud, with no middle party.',
      cost: 'One cloud per circuit, 4 to 8 weeks, and you own the routers, the LOA and the ticket.' },
  ];
  const pathRows = PATH_STEPS.map(p => {
    const on = p.id === pathPick;
    return { ...p, key: p.id, on, tagRows: p.tags.map(t => ({ key: t, label: t })),
      border: on ? 'var(--cta)' : 'var(--border-secondary)', bg: on ? 'var(--bg-accent)' : 'var(--bg-base)',
      pickLabel: on ? 'Chosen' : 'Choose', pickBg: on ? 'var(--cta)' : 'transparent', pickInk: on ? '#fff' : 'var(--link)',
      pickBorder: on ? 'var(--cta)' : 'var(--border-primary)',
      pick: () => set({ pathPick: p.id }) };
  });
  const pathChosen = PATH_STEPS.find(p => p.id === pathPick) || PATH_STEPS[0];
  const BUY_OPTS = [
    { id: 'hosted', name: 'Hosted private', badge: 'Most chosen',
      what: 'AT&T owns the port, the edge router and the cross-connect. You buy capacity, not hardware.',
      gets: ['One monthly rate per Mbps, one bill, one SLA', 'Change capacity in the portal, no truck roll', 'AT&T holds the ticket end to end'],
      fit: 'Best when you would rather not run edge routers.' },
    { id: 'byoc', name: 'Bring your own circuit', badge: 'BYOC',
      what: 'You keep the access and the LOA-CFA. AT&T rides it and manages the overlay only.',
      gets: ['Lower monthly, because the port is already yours', 'Reuse access that is in place and depreciated', 'You keep the hardware and the first-line ticket'],
      fit: 'Best when the circuit is already there and paid for.' },
  ];
  const buyRows = BUY_OPTS.map(b => {
    const on = b.id === buyPick;
    return { ...b, key: b.id, on, getRows: b.gets.map((g, i) => ({ key: b.id + i, text: g })),
      border: on ? 'var(--cta)' : 'var(--border-secondary)', bg: on ? 'var(--bg-accent)' : 'var(--bg-base)',
      pickLabel: on ? 'Chosen' : 'Choose', pickBg: on ? 'var(--cta)' : 'transparent', pickInk: on ? '#fff' : 'var(--link)',
      pickBorder: on ? 'var(--cta)' : 'var(--border-primary)',
      pick: () => set({ buyPick: b.id }) };
  });
  const buyChosen = BUY_OPTS.find(b => b.id === buyPick) || BUY_OPTS[0];
  const buildText = { fabric: 'AT&T provisions both ends and gives you a build ticket with a date. From 10 business days.', sdwan: 'AT&T pushes the overlay to your edge devices. Days, not weeks.', native: 'You order the port and book the cross-connect; the cloud side is yours. 4 to 8 weeks.' }[pathPick];
  const provSteps = [
    { key: 'p1', n: '1', t: 'Pick what to connect', d: 'Choose a region, a VPC or a site from what discovery already found. Nothing to type in.' },
    { key: 'p2', n: '2', t: 'Size it', d: 'Capacity arrives pre-filled from the traffic Observe already measured. Burst above it is allowed.' },
    { key: 'p3', n: '3', t: 'Order', d: buyPick === 'hosted' ? 'One order. AT&T generates the LOA and books the cross-connect.' : 'One order against your circuit. You send the LOA-CFA, we ride the access.' },
    { key: 'p4', n: '4', t: 'Build', d: buildText },
    { key: 'p5', n: '5', t: 'Turn-up', d: 'BGP comes up, routes advertise, and we run test traffic before you cut over.' },
    { key: 'p6', n: '6', t: 'Policy on day one', d: 'The tags you already govern apply to the new path the moment it carries traffic.' },
  ];
  const provSub = `${pathChosen.name} · ${buyChosen.name}`;
  const stepVals = { pathRows, buyRows, provSteps, provSub, pathChosenName: pathChosen.name, buyChosenName: buyChosen.name };
  // A customer with nothing connected is three steps from Observe; point them at the next one.
  const connectNext = isEmpty ? { title: 'Next stop: Connect your first cloud', text: 'Add a read-only credential, or start from your AT&T inventory. Discovery draws everything else.', cta: 'Add a source', go: go('s1') } : { title: 'Next stop: Observe', text: `${conns.total} ${conns.total === 1 ? 'connection carries' : 'connections carry'} ${(ob.fab || 0).toFixed(1)} Gbps on AT&T. See which one is degraded and what it impacts.`, cta: 'Open Observe', go: () => { go('s3', { layer: 'cloud', tab: 'observe' })(); set({ obPage: 'perf', obTab: 'flow' }); } };
  const governNext = { title: 'Next stop: Cost', text: isEmpty ? 'Policies price themselves once traffic is seen.' : `Every policy that requires a private path moves egress off the hyperscaler rate. ${totalSave ? fmt(totalSave) + '/mo is on the table.' : 'See what the AT&T network already saves.'}`, cta: 'Open Cost', go: go('s3', { layer: 'cloud', tab: 'cost' }) };
  const costNext = { title: 'Next stop: Connect', text: isEmpty ? 'Attach the first region to start saving.' : `${est.regionsList.filter(r => !r.priv).length} ${est.regionsList.filter(r => !r.priv).length === 1 ? 'region still rides the public internet. Attaching it' : 'regions still ride the public internet. Attaching them'} is where the savings above come from.`, cta: 'Open Connect', go: go('s3', { layer: 'cloud', tab: 'connect' }) };

  // ---------- Observe dashboard (2026-09-09): the live flow map, gauges, queue, panel ----------
  const mapOpen = s.mapOpen || []; const mapSel = s.mapSel || null; const mapHov = s.mapHov || null; const mapMode = s.mapMode || 'state'; const mapRegion = s.mapRegion || null; const mapT = (s.mapT == null || s.mapT === '') ? null : +s.mapT;
  const mapZoom = mapOpen.length ? mapOpen[mapOpen.length - 1] : null;
  // The scope chips narrow the picture, not only the tiles (2026-09-29 audit).
  // A cloud scope rides the region matcher, which scales the sites to the share that reaches it;
  // a site, first-mile or app scope narrows the sites themselves, and the right side follows them.
  const scopeCloud = /^cloud:/.test(obScope) ? obScope.slice(6) : null;
  // The By chips regroup the map (Micah, 2026-09-29: "by first mile ... on sankey,
  // it doesn't work"): sites by first mile or by type, destinations by app. A
  // pick narrows it; an app narrows to its own regions, scaled like a cloud.
  const scopeApp = /^app:/.test(obScope) ? obScope.slice(4) : null;
  const mapDim = s.obDim && s.obDim !== 'all' ? s.obDim : (obScope && obScope !== 'all' ? String(obScope).split(':')[0] : 'all');
  const appRegions = scopeApp ? est0.regionsList.filter(r => (r.tags || []).some(t => String(t).toLowerCase() === scopeApp.toLowerCase())).map(r => r.region) : [];
  const mapEst = obScope && obScope !== 'all' && !scopeCloud && !scopeApp ? R.applyScope(est0, obScope) : est0;
  const mapOpts = { open: mapOpen, filterRegion: mapRegion || scopeCloud || (appRegions.length ? appRegions : null), t: mapT, zoom: mapZoom,
    leftBy: mapDim === 'first' ? 'access' : mapDim === 'site' ? 'class' : 'region', rightBy: mapDim === 'app' ? 'app' : 'cloud', tag: scopeApp,
    // A cloud or app pick keeps the other destinations at estate scale (notes, 2026-09-30).
    context: !!(scopeCloud || scopeApp) && !mapRegion,
    // Since sets the window the map averages; Replay plays it (2026-09-29).
    window: { growth: R.growthOf(s.obWindow || '30d') } };
  // The Cost view prices the map from the Cost page's own figures (2026-09-29):
  // on AT&T at your AT&T charges per Gbps on AT&T, outside at the site egress
  // bucket per Gbps outside. Its avoidable share is what could be saved.
  const mapRates = (() => {
    const bk = (est0.buckets || []), sb = bk.find(b => b.id === 'ipsec') || bk.find(b => b.id === 'misc') || { today: 0, fabric: 0 };
    const sp0 = F.flowSplit(est0, ob.flows), attMo = R.attChargeRows(est0, inv).reduce((a, r) => a + r.v, 0);
    // A month's bill over the volume the window averages (2026-09-30): the map
    // draws window-scaled Gbps, so the rate divides by the same level, and
    // Whole estate IPsec prices at its $8,600 bucket in every Since window.
    const k = F.windowLevel(R.growthOf(s.obWindow || '30d')), fabW = sp0.sitesFab * k, pubW = sp0.pubV * k;
    return { att: fabW > 0 ? attMo / fabW : 0, out: pubW > 0 ? sb.today / pubW : 0, saveShare: sb.today > 0 ? Math.max(0, sb.today - sb.fabric) / sb.today : 0 };
  })();
  const mapG = F.buildMap(mapEst, inv, ob.flows, mapOpts);
  const map = mapMode === 'cost' ? F.buildMap(mapEst, inv, ob.flows, { ...mapOpts, weigh: { fab: mapRates.att, pub: mapRates.out } }) : mapG;
  // Latency against the SLO, node by node, from the Gbps map (the same keys in both).
  const perf = F.perfOf(mapG, est0);
  const mapHealth = ['ok', 'risk', 'slo'].includes(s.mapHealth) ? s.mapHealth : 'all';
  const healthOfKey = (k) => (perf.nodes[k] || {}).health || null;
  const rankH = { ok: 0, risk: 1, slo: 2 };
  const ribHealth = (r, i) => (map === mapG && i != null && perf.ribbons[i] ? perf.ribbons[i].health : [healthOfKey(r.from), healthOfKey(r.to)].filter(Boolean).sort((a, b) => rankH[b] - rankH[a])[0] || 'ok');
  // Lighting order: hover, then the pattern lens, then the selection. A selected connection (cx-…) lights nothing on the map; the filter does that.
  const hovLit = F.litFor(map, mapHov); const selLit = mapSel && !mapSel.startsWith('cx-') ? F.litFor(map, mapSel) : null; const mapPattern = s.mapPattern || 'all'; const patLit = F.patternLit(map, mapPattern);
  // A drill traces its traffic across the map (2026-09-29): the branch, its
  // share of each path, its share of each destination. The rest steps back.
  const tr = map.trace; const trOn = !!tr && !hovLit && !patLit && !selLit;
  const trAt = (nd) => !tr ? undefined : nd.side === 'm' ? tr.mid[nd.key] : nd.side === 'r' ? tr.dest[nd.key] : tr.src[nd.key];
  const trHas = (k) => !!tr && ((tr.mid[k] || 0) + (tr.dest[k] || 0) + (tr.src[k] || 0)) > 0.0005;
  const nodeOp = (k) => hovLit ? (hovLit.keys.has(k) ? 1 : 0.3) : mapHealth !== 'all' && healthOfKey(k) ? (healthOfKey(k) === mapHealth ? 1 : 0.25) : patLit ? (patLit.keys.has(k) ? 1 : 0.35) : selLit ? (selLit.keys.has(k) ? 1 : 0.6) : trOn ? (trHas(k) ? 1 : 0.4) : 1;
  // The path filter dims what the viewer set aside (2026-09-28): On AT&T or Outside AT&T.
  const mapPath = s.mapPath || 'all';
  const pathOff = (priv) => (mapPath === 'att' && !priv) || (mapPath === 'out' && priv);
  // Sites fan into every path, so their ribbons rest lighter than the paths' own; hover isolates one region.
  const ribOp = (i, priv, local) => { if (pathOff(priv)) return 0.1; if (!hovLit && mapHealth !== 'all' && ribHealth(map.ribbons[i] || {}, i) !== mapHealth) return 0.08; const fromSite = !String((map.ribbons[i] || {}).from || '').startsWith('mid:'); const base = local ? 0.45 : priv ? (fromSite ? 0.4 : 0.6) : 0.36; return hovLit ? (hovLit.ribbons.has(i) ? 0.8 : 0.08) : patLit ? (patLit.ribbons.has(i) ? 0.8 : 0.07) : selLit ? (selLit.ribbons.has(i) ? 0.8 : 0.18) : trOn ? 0.1 : base; };
  const closeBranch = (arr, key) => arr.filter(k => k !== key && !k.startsWith(key + '/'));
  const toggleOpen = (key, select) => { const isOpen = mapOpen.includes(key); set({ mapOpen: isOpen ? closeBranch(mapOpen, key) : [...mapOpen, key], ...(select ? { mapSel: key, panelTab: s.panelTab || 'overview' } : {}) }); };
  const STATE_FILL = { ok: dark ? '#c5cfd9' : '#1a2431', degraded: 'var(--error)', slo: F.HEALTH_INK.slo };
  /** The volume drawer, for a metro that stands for many sites. Same shape as
   *  the one in vals(); this function cannot see that one either. */
  const openVolume = (cls, metro) => set({ vol: { kind: 'metro', cls, metro }, drawerOpen: true, andiOpen: false, volQ: '', volPath: 'all', volState: 'all', volPage: 1, volSel: [] });
  /** The map's door into the workload drawer. Same shape as the column's in
   *  vals(); this function cannot see that one. */
  const openWorkloads = (region, vpcId, snId) => set({ vol: { kind: 'workloads', region, vpcId, snId: snId || null }, drawerOpen: true, andiOpen: false, volQ: '', volPath: 'all', volState: 'all', volPage: 1, volSel: [], volSlide: 0 });
  // What each path is doing right now, in plain words (2026-09-28): the live
  // latency against the SLO on an AT&T on-ramp, the egress bill on IPsec.
  const gbpsW = (v) => (v >= 1 ? v.toFixed(1) + ' Gbps' : Math.round(v * 1000) + ' Mbps');
  const rampMs = (ramp) => { const rs = est.regionsList.filter(r => r.priv && (F.RAMP_NAME[r.ramp] || 'NetBond') === ramp); return rs.length ? Math.round(rs.reduce((a, r) => a + (r.fab || 0), 0) / rs.length) : null; };
  const pubMs = (() => { const rs = est.regionsList.filter(r => !r.priv); return rs.length ? Math.round(rs.reduce((a, r) => a + (r.pub || 0), 0) / rs.length) : null; })();
  const siteB = (est.buckets || []).find(b => b.id === 'ipsec') || (est.buckets || []).find(b => b.id === 'misc') || { today: 0, fabric: 0 };
  const money = (v) => fmt(v >= 1000 ? Math.round(v / 100) * 100 : Math.round(v));
  const midSay = (nd) => {
    const q = perf.nodes[nd.key] || { ms: 0, slo: F.SLO, health: 'ok' };
    // Cost: what the path costs a month, and what moving it would save.
    if (mapMode === 'cost') {
      // The legend says on-AT&T paths are at your AT&T rate; the line would only repeat it.
      if (nd.priv) return { sub: '', hover: `${nd.name}: ${money(nd.v)}/mo on AT&T, priced from your AT&T charges` };
      const save = nd.v * mapRates.saveShare;
      return { sub: `${money(save)}/mo to save`, hover: `${nd.name}: ${money(nd.v)}/mo of egress outside AT&T · ${money(save)}/mo to save on AT&T` };
    }
    // Performance: the path's p95 against its SLO, in words.
    if (mapMode === 'slo') return { sub: q.health === 'slo' ? `over the ${q.slo} ms SLO by ${q.ms - q.slo} ms` : q.health === 'risk' ? `near the ${q.slo} ms SLO` : `within the ${q.slo} ms SLO`, hover: `${nd.name}: p95 ${q.ms} ms against a ${q.slo} ms SLO` };
    if (nd.ramp) return { sub: `p95 ${q.ms} ms · SLO ${q.slo} ms`, hover: `${nd.name}: ${gbpsW(nd.v)} on AT&T · p95 ${q.ms} ms against a ${q.slo} ms SLO${q.health === 'slo' ? ', over' : ''}` };
    if (nd.wan) return { sub: 'to your data centers', hover: `Private WAN: ${gbpsW(nd.v)} from your sites to your own data centers, on AT&T` };
    // The label prices its own node (2026-09-30): under a pick it is the pick's share, as the Cost view shows.
    if (nd.ipsec) { const mo = nd.v * mapRates.out; return { sub: `${money(mo)}/mo egress`, hover: `IPsec over the internet: ${gbpsW(nd.v)} · ${money(mo)}/mo egress · ${money(mo * mapRates.saveShare)}/mo to save on AT&T` }; }
    return { sub: `p95 ${q.ms} ms · SLO ${q.slo} ms`, hover: `Internet: ${gbpsW(nd.v)} outside AT&T · p95 ${q.ms} ms` };
  };
  const HEALTH_FILL = { ok: dark ? '#4caf50' : '#1e7a3c', risk: dark ? '#ffa25e' : '#e07b00', slo: F.HEALTH_INK.slo, down: F.HEALTH_INK.down };
  const mapNodes = map.nodes.map((nd, i) => { const left = nd.side === 'l'; const mid = nd.side === 'm'; const say = mid ? midSay(nd) : null; const selected = nd.key === mapSel; return { ...nd, key: 'n' + i, id: nd.key, label: nd.name, subLabel: say ? say.sub : nd.sub || '', hasSub: !!(say ? say.sub : nd.sub), pathSay: say ? say.sub : '', pathBg: say && say.sub ? 'var(--bg-base)' : 'transparent', pathPad: say && say.sub ? '0 5px' : '0', sy: nd.y + nd.h / 2 + 10, subPad: 26, subInk: say && !nd.priv ? (dark ? '#ffa25e' : '#b85f00') : 'var(--text-light)', vF: (() => { const tot = nd.tot || nd.v, t = trAt(nd), q = perf.nodes[nd.key];
      // Each view reads in its own unit (2026-09-29): Gbps, dollars a month, or p95.
      if (mapMode === 'slo' && q) return `p95 ${q.ms} ms`;
      if (mapMode === 'cost') return t == null || t >= tot - 0.5 ? `${money(tot)}/mo` : `${money(t)} of ${money(tot)}/mo`;
      const g = (v) => (v >= 1 ? v.toFixed(1) + ' Gbps' : Math.round(v * 1000) + ' Mbps'); if (t == null || t >= tot - 0.01) return g(tot); return (t >= 1) === (tot >= 1) ? `${g(t).replace(/ \S+$/, '')} of ${g(tot)}` : `${g(t)} of ${g(tot)}`; })(),
    health: (perf.nodes[nd.key] || {}).health || null, lx: left || mid ? nd.x2 + 6 : nd.x - 236, ly: nd.y + nd.h / 2 - 10, lw: 230, justify: left || mid ? 'flex-start' : 'flex-end', fill: mapMode === 'slo' && perf.nodes[nd.key] ? HEALTH_FILL[perf.nodes[nd.key].health]
      : mapMode === 'cost' && nd.kind !== 'rollup' ? ((mid ? !nd.priv : (nd.v - (nd.fabV || 0)) > (nd.fabV || 0)) ? (dark ? '#ffa25e' : '#e07b00') : '#0057b8')
      : mid ? (nd.priv ? '#0057b8' : nd.local ? '#00838f' : (dark ? '#5d6f80' : '#8a949c')) : nd.key === 'dest:local' ? '#00838f' : nd.kind === 'rollup' ? (dark ? '#5d6f80' : '#b8c2cc') : nd.state === 'degraded' ? STATE_FILL.degraded : (perf.nodes[nd.key] || {}).health === 'slo' ? STATE_FILL.slo : STATE_FILL.ok, op: nodeOp(nd.key), stroke: selected ? 'var(--cta)' : 'transparent', caret: nd.hasChildren ? (nd.open ? '−' : '+') : nd.kind === 'rollup' ? '‹' : '', cursor: nd.hasChildren || !mid ? 'pointer' : 'default', deltaF: (nd.delta >= 0 ? '+' : '') + nd.delta + '%', deltaColor: nd.delta > 10 ? '#1e7a3c' : nd.delta < -10 ? '#c9362c' : 'var(--text-light)', showDelta: mapMode === 'delta', click: () => { if (nd.kind === 'rollup') { if (nd.foldsKey && !nd.tailOnly) set({ mapOpen: closeBranch(mapOpen, nd.foldsKey), mapSel: null }); return; } if (nd.kind === 'more') { const parts = (nd.parentKey || '').split('/'); if (parts.length >= 2) set({ vol: { kind: 'metro', cls: nd.siteCls || parts[0].replace(/^site:/, ''), metro: nd.metro || parts[1] }, drawerOpen: true, andiOpen: false, volQ: '', volPath: 'all', volState: 'all', volPage: 1, volSel: [] }); return; } if (nd.kind === 'wlmore') { openWorkloads(nd.regionName, nd.vpcId, nd.subnetId); return; } if (nd.kind === 'workload' && nd.wlSel) { set({ mapSel: nd.wlSel, panelTab: 'overview' }); return; } if (nd.hasChildren) { if (mapOpen.includes(nd.key)) set({ mapSel: nd.panelSel || nd.key, panelTab: 'overview' }); else toggleOpen(nd.key); } else set({ mapSel: nd.panelSel || nd.key, panelTab: s.panelTab || 'overview' }); }, pin: () => set({ mapPins: (s.mapPins || []).includes(nd.key) ? (s.mapPins || []).filter(k => k !== nd.key) : [...(s.mapPins || []).slice(-1), nd.key] }), enter: () => set({ mapHov: nd.key }), leave: () => set({ mapHov: null }), title: say ? say.hover : nd.hasChildren ? (nd.open ? 'Click to close' : 'Click to open in place') : 'Click to select', depthPad: (nd.depth || 0) * 8 }; });
  // The other destinations, at estate scale beside a pick (notes, 2026-09-30):
  // muted, outside the flow (no ribbons, no trace, no health), and a door to
  // pick them instead. Your data centers are not a pick, so that row is not a door.
  (map.context || []).forEach((nd, i) => {
    const tmpl = mapNodes.find(n => n.side === 'r') || {};
    const vF = mapMode === 'cost' ? `${money(nd.v)}/mo` : mapMode === 'slo' ? '' : gbpsW(nd.v);
    const pickable = /^(cloud|app):/.test(nd.key);
    mapNodes.push({ ...tmpl, ...nd, key: 'c' + i, id: nd.key, side: 'ctx', label: nd.name, subLabel: '', hasSub: false, pathSay: '', pathBg: 'transparent', pathPad: '0', vF, health: null,
      lx: nd.x - 236, ly: nd.y + nd.h / 2 - 10, lw: 230, sy: nd.y + nd.h / 2 + 10, justify: 'flex-end', fill: dark ? '#5d6f80' : '#b8c2cc', op: 0.45, stroke: 'transparent', caret: '', showDelta: false,
      cursor: pickable ? 'pointer' : 'default', title: `${nd.name} · ${vF}${pickable ? ' · look at this one instead' : ''}`,
      click: pickable ? () => set({ obScope: nd.key, mapOpen: [], mapSel: null, mapRegion: null }) : () => {}, enter: () => {}, leave: () => {} });
  });
  // The two questions the map has to answer without being read closely:
  // where does the traffic go, and how much of it rides AT&T. Both come out
  // of the ribbons already drawn - the destination leg carries the volume and
  // the AT&T network flag, so nothing here is a second set of numbers.
  // The readout answers for the whole estate from the flows themselves.
  // The map now draws only the site-to-cloud story (Dev, 2026-09-11), so
  // deriving the mix from ribbons would silently drop every cloud-egress
  // class the moment it left the picture.
  const MIX = F.mixOf(est0, ob.flows);
  const mixTotal = MIX.total;
  const destName = (k) => (map.nodes.find(n => n.key === k) || {}).name || k;
  // Named in the words the question was asked in.
  const MIX_LABEL = { 'dest:local': 'Cloud to cloud, inside one region', 'dest:regions': 'Ingress to cloud, from sites', 'cloud': 'Ingress to cloud, from sites',
    'dest:public internet': 'Cloud egress to the internet', 'dest:inter-cloud': 'Cloud to cloud, across clouds',
    'dest:AI endpoints': 'Cloud egress to AI endpoints', 'dest:object storage': 'Cloud egress to object storage' };
  const mixBuckets = MIX.buckets.map(b => ({
    key: b.key, keys: [b.key], label: MIX_LABEL[b.key] || destName(b.key.replace(/^dest:/, '')),
    v: b.v, fab: b.fab, local: !!b.local, from: b.from || {},
  })).sort((a, b) => b.v - a.v);
  // Each class knows which flow records make it up, and which sources feed it
  // - so a figure can hand Logs both the cut and one level of decomposition.
  const EXPLAIN_CUT = {
    'dest:local': { pattern: 'region' }, 'dest:regions': { pattern: 'inbound' },
    'dest:public internet': { pattern: 'internet' }, 'dest:inter-cloud': { pattern: 'clouds' },
    'dest:AI endpoints': { pattern: 'internet' }, 'dest:object storage': { pattern: 'regions' },
  };
  const partsFor = (bucket) => {
    // One level of decomposition: the sources that feed the class, straight
    // from the flow records - workload groups for egress, first miles for
    // ingress - so the parts survive whatever the map chooses to draw.
    const src = bucket && bucket.from && Object.keys(bucket.from).length
      ? Object.entries(bucket.from)
      : bucket && bucket.key === 'dest:regions'
        ? map.nodes.filter(n => n.side === 'l' && n.kind === 'site').map(n => [n.name, n.tot || n.v])
        : [];
    const tot = src.reduce((a, [, v]) => a + v, 0) || 1;
    return src.sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([nm, v]) => ({ label: nm, value: v.toFixed(1) + ' Gbps', share: Math.round(v / tot * 100) + '%', w: Math.max(3, v / tot * 100).toFixed(2) + '%', q: '' }));
  };
  const mixRows = mixBuckets.map(b => ({
    key: b.key, label: b.label,
    explainGo: () => set({
      explain: { label: b.label, value: b.v.toFixed(1) + ' Gbps', sub: `${Math.round(b.v / mixTotal * 100)}% of everything the estate carried in this window.`,
        cut: b.local ? 'Flow records that start and end inside one region.' : 'The flow records behind this figure.',
        parts: partsFor(b), ...(EXPLAIN_CUT[b.key] || {}) },
      obPage: 'logs', sub: null, scrollToSec: 'sec-logs', scrollNonce: (s.scrollNonce || 0) + 1,
    }),
    gbps: b.v.toFixed(1), share: Math.round(b.v / mixTotal * 100) + '%',
    w: Math.max(3, b.v / mixTotal * 100).toFixed(2) + '%',
    fabPct: b.local ? '—' : Math.round(b.fab / (b.v || 1) * 100) + '%',
    fabW: b.local ? '0%' : (b.fab / (b.v || 1) * 100).toFixed(2) + '%',
    fabNote: b.local ? 'Never crosses a mid mile, so it is neither on nor outside AT&T' : b.fab / (b.v || 1) >= 0.9 ? 'almost all on AT&T' : b.fab / (b.v || 1) <= 0.1 ? 'almost none on AT&T' : 'split',
    tone: b.local ? '#4db6ac' : b.fab / (b.v || 1) >= 0.5 ? '#3374cc' : (dark ? '#5d6f80' : '#8a949c'),
  }));
  const fabAll = MIX.fabAll, pubAll = MIX.pubAll, locAll = MIX.localV, crossed = MIX.crossed;
  const firstMileRows = map.nodes.filter(n => n.side === 'l' && (n.group || '') === 'sites').map(n => ({
    key: 'fm-' + n.key, label: n.name, gbps: (n.tot || n.v).toFixed(1),
    explainGo: explainNav(c, { label: n.name, value: (n.tot || n.v).toFixed(1) + ' Gbps',
      sub: 'What this first mile carries into the AT&T network.', cut: 'Records that come in from sites.',
      pattern: 'inbound', parts: [] }),
    share: Math.round((n.tot || n.v) / (map.nodes.filter(x => x.side === 'l' && (x.group || '') === 'sites').reduce((a, x) => a + (x.tot || x.v), 0) || 1) * 100) + '%',
    w: Math.max(3, (n.tot || n.v) / (map.nodes.filter(x => x.side === 'l' && (x.group || '') === 'sites').reduce((a, x) => a + (x.tot || x.v), 0) || 1) * 100).toFixed(2) + '%',
  }));
  const fabParts = [
    { label: 'AT&T network', value: fabAll.toFixed(1) + ' Gbps', share: Math.round(fabAll / (crossed || 1) * 100) + '%', w: Math.max(3, fabAll / (crossed || 1) * 100).toFixed(2) + '%' },
    { label: 'Outside AT&T', value: pubAll.toFixed(1) + ' Gbps', share: Math.round(pubAll / (crossed || 1) * 100) + '%', w: Math.max(3, pubAll / (crossed || 1) * 100).toFixed(2) + '%' },
  ];
  const mixVals = {
    explainFabric: explainNav(c, { label: 'On the AT&T network', value: fabAll.toFixed(1) + ' Gbps',
      sub: `${Math.round(fabAll / (crossed || 1) * 100)}% of everything that crosses a mid mile.`,
      cut: 'Records that took a private path.', path: 'private', parts: fabParts }),
    explainOutside: explainNav(c, { label: 'Outside the AT&T network', value: pubAll.toFixed(1) + ' Gbps',
      sub: `${Math.round(pubAll / (crossed || 1) * 100)}% of everything that crosses a mid mile.`,
      cut: 'Records that left on the public path.', path: 'public', parts: fabParts }),
    mixRows, hasMix: mixRows.length > 0,
    firstMileRows, hasFirstMile: firstMileRows.length > 0,
    fabBig: `${Math.round(fabAll / (crossed || 1) * 100)}%`,
    fabShareLine: `of the ${crossed.toFixed(1)} Gbps that crosses a mid mile rides the AT&T network. The ${locAll.toFixed(1)} Gbps that stays inside a region is not counted here.`,
    fabGbps: fabAll.toFixed(1), pubGbps: pubAll.toFixed(1), locGbps: locAll.toFixed(1),
    fabW: (fabAll / (crossed || 1) * 100).toFixed(2) + '%',
    pubW: (pubAll / (crossed || 1) * 100).toFixed(2) + '%',
    fabPctF: Math.round(fabAll / (crossed || 1) * 100) + '%',
    pubPctF: Math.round(pubAll / (crossed || 1) * 100) + '%',
    mixSub: `${(mixTotal).toFixed(1)} Gbps in the window. ${locAll.toFixed(1)} Gbps of it never leaves its region, so it crosses no mid mile at all.`,
  };
  // Cost view: what leaves AT&T is priced at the estate's own avoidable rate, per Gbps outside.
  const egBuckets = est.buckets || [], egSpend = egBuckets.reduce((a, b) => a + b.today, 0), egAvoid = egBuckets.reduce((a, b) => a + Math.max(0, b.today - b.fabric), 0);
  const outGbps = Math.max(0.001, map.ribbons.filter(r => !r.priv && !r.local && String(r.from).startsWith('mid:')).reduce((a, r) => a + r.v, 0));
  // The map draws what sites send, so its outside ribbons are priced against site egress: the IPsec bucket where there is one, else internet egress.
  const siteBucket = egBuckets.find(b => b.id === 'ipsec') || egBuckets.find(b => b.id === 'misc') || { today: 0, fabric: 0 };
  void outGbps; const perGbps = mapRates.out, perSave = mapRates.out * mapRates.saveShare; void perGbps; void perSave;
  const ribFill = (r, i) => { const base = r.local ? '#4db6ac' : r.priv ? '#3374cc' : (dark ? '#5d6f80' : '#8a949c'); if (mapMode === 'slo') return HEALTH_FILL[ribHealth(r, i)]; return mapMode === 'cost' ? (r.priv ? (dark ? '#3374cc' : '#6f9fd8') : (dark ? '#ffa25e' : '#e07b00')) : mapMode === 'delta' ? (r.delta > 10 ? '#1e7a3c' : r.delta < -10 ? '#c9362c' : (dark ? '#5d6f80' : '#b8c2cc')) : mapMode === 'slo' ? (r.state === 'slo' ? HEALTH_FILL.slo : base) : base; };
  const mapTrace = tr ? tr.ribbons.map((r, i) => ({ key: 't' + i, d: r.d, fill: ribFill(r), op: trOn ? 0.85 : 0 })) : [];
  const mapRibbons = map.ribbons.map((r, i) => { const fill = ribFill(r, i); return { key: 'r' + i, d: r.d, fill, op: ribOp(i, r.priv, r.local), pulse: mapMode === 'state' && r.state === 'degraded' ? 'skPulse 1.6s ease-in-out infinite' : 'none', sleeve: (mapMode === 'state' || mapMode === 'slo') && ribHealth(r, i) === 'slo' ? HEALTH_FILL.slo : 'transparent', title: mapMode === 'cost' ? `${money(r.v)}/mo · ${r.priv ? 'on AT&T, at your AT&T rate' : `egress outside AT&T · ${money(r.v * mapRates.saveShare)}/mo to save on AT&T`}` : mapMode === 'slo' ? (() => { const q = perf.ribbons[i] || {}; return `${r.v.toFixed(2)} Gbps · p95 ${q.ms} ms against a ${q.slo} ms SLO${q.health === 'slo' ? ', over' : q.health === 'risk' ? ', near it' : ''}`; })() : `${r.v.toFixed(2)} Gbps · ${r.local ? 'stays in the region' : r.priv ? 'AT&T network' : 'outside AT&T'} · ${(F.PATTERNS.find(x => x[0] === r.pattern) || ['', r.pattern])[1]} · ${(r.delta >= 0 ? '+' : '') + r.delta}% vs prior window` }; });
  // The head's rollups double as filters; the control is the view (2026-09-28).
  const kShort = (n) => (n >= 1000 ? '$' + (Math.round(n / 100) / 10).toString().replace(/\.0$/, '') + 'k' : '$' + n);
  const sloN = (ob.flows || []).filter(f => f.latency > F.SLO).length;
  const tileOn = (k) => ({ traffic: mapMode === 'state' && mapPath === 'all', onatt: mapPath === 'att', cost: mapMode === 'cost' && mapPath === 'all', p95: mapMode === 'slo' && mapHealth === 'all', could: mapMode === 'cost' && mapPath === 'out', slo: mapMode === 'slo' && mapHealth === 'slo' })[k];
  // The tiles read the map they sit on (Micah, 2026-09-29: "the sankey widgets
  // and the sankey graphic doesn't really match"): its traffic, its p95, its
  // dollars, what it could save, and what it draws red.
  const outG = Math.max(0, mapG.total - mapG.fabV);
  const costT = mapG.fabV * mapRates.att + outG * mapRates.out, couldT = outG * mapRates.out * mapRates.saveShare;
  const winTrends = R.trends(ob, s.obWindow || '30d');
  const flowTiles = [
    // Under 1 Gbps the tile reads in Mbps, as the nodes do (2026-09-30: "0.1 Gbps" beside "70 Mbps").
    ['traffic', 'Traffic', mapG.total >= 1 ? mapG.total.toFixed(1) : String(Math.round(mapG.total * 1000)), mapG.total >= 1 ? 'Gbps' : 'Mbps', { mapMode: 'state', mapPath: 'all', mapHealth: 'all' }],
    ['p95', 'P95 latency', String(perf.p95), 'ms', { mapMode: 'slo', mapPath: 'all', mapHealth: 'all' }],
    // Sites, counted as sites (2026-09-29 audit: a traffic share wore a sites label).
    // Under a pick, a site is on AT&T for that pick only if the map carries the
    // pick on AT&T (2026-09-30: "20 of 25" under GCP, which rides IPsec only).
    ['onatt', 'Sites on AT&T', (() => { const all = (mapEst.sites || []).reduce((a, x) => a + S.countOf(x.name), 0), picked = !!(scopeCloud || scopeApp || mapRegion), att = picked && !(mapG.fabV > 0.0005) ? 0 : (mapEst.sites || []).filter(onAtt).reduce((a, x) => a + S.countOf(x.name), 0); return `${att.toLocaleString('en-US')} of ${all.toLocaleString('en-US')}`; })(), '', { mapMode: 'state', mapPath: 'att' }],
    ['cost', 'Cost', money(costT), '/mo', { mapMode: 'cost', mapPath: 'all', mapHealth: 'all' }],
    ['could', 'Could save', money(couldT), '/mo', { mapMode: 'cost', mapPath: 'out', mapHealth: 'all' }],
    ['slo', 'Over SLO', String(perf.over.length), 'on the map', { mapMode: 'slo', mapPath: 'all', mapHealth: 'slo' }],
  ].map(([k, l, v, u, patch]) => { const on = !!tileOn(k);
    // Since is the window the tiles compare against (2026-09-29 audit): now vs the prior window.
    const tr = ({ traffic: 'thr', p95: 'p95' })[k] ? (winTrends.find(x => x.key === ({ traffic: 'thr', p95: 'p95' })[k]) || null) : null;
    return { key: k, l, v, u, on, go: () => set(patch), title: k === 'cost' ? 'Traffic on this map, at your AT&T rate and public egress rates. Site access, AT&T charges and cloud ports are in Cost, By leg.' : l, border: on ? 'var(--border-active)' : 'var(--border-secondary)', bg: on ? 'var(--bg-accent)' : 'var(--bg-base)',
      d: tr ? `${tr.delta} vs prior ${winLabelOf(s)}` : '', dShort: tr ? tr.delta : '', hasD: !!tr, dTone: tr ? tr.deltaTone : 'var(--text-light)' }; });
  const seg = (on) => ({ bg: on ? 'var(--bg-base)' : 'transparent', color: on ? 'var(--text-heading)' : 'var(--text-light)', weight: on ? 600 : 500, shadow: on ? '0 1px 2px rgba(16,24,40,.10), 0 0 0 1px var(--border-secondary)' : 'none' });
  // Over time (2026-09-28): the same traffic, by day, week or month.
  const otGrain = ['daily', 'weekly', 'monthly'].includes(s.otGrain) ? s.otGrain : 'daily';
  const OT = F.overTime({ total: map.total, fab: map.fabV, egressMo: siteBucket.today || egSpend * 0.1, grain: otGrain, seed: est.id });
  const otMax = Math.max(0.001, ...OT.bars.map(b => b.fab + b.out));
  const otBars = map.total > 0.001 && !isEmpty ? OT.bars.map(b => { const tot = b.fab + b.out; return { key: 'ot' + b.i, fabH: (b.fab / otMax * 100).toFixed(2) + '%', outH: (b.out / otMax * 100).toFixed(2) + '%',
    title: `${b.label} · ${gbpsW(tot)} · ${(b.fab / (tot || 1) * 100).toFixed(1)}% on AT&T · ${fmt(Math.round(b.egress))} egress` }; }) : [];
  const otTot = OT.bars.map(b => b.fab + b.out), otFirst = otTot[0] || 0, otLast = otTot[otTot.length - 1] || 0;
  const otTrend = otFirst ? Math.round((otLast - otFirst) / otFirst * 100) : 0;
  const otTiles = [['Peak', gbpsW(Math.max(0, ...otTot))], ['Average', gbpsW(otTot.reduce((a, v) => a + v, 0) / (otTot.length || 1))], ['Trend', `${otTrend >= 0 ? '+' : ''}${otTrend}%`], ['Egress', fmt(Math.round(OT.bars.reduce((a, b) => a + b.egress, 0)))]].map(([l, v]) => ({ key: l, l, v }));
  const otGrains = [['daily', 'Daily'], ['weekly', 'Weekly'], ['monthly', 'Monthly']].map(([k, l]) => { const on = otGrain === k; return { key: k, label: l, on, ...seg(on), go: () => set({ otGrain: k }) }; });
  const otEnds = OT.bars.length ? [OT.bars[0].label, OT.bars[OT.bars.length - 1].label] : ['', ''];
  // One panel at a time under the Traffic head (2026-09-28, "No scrolling").
  // The four questions (notes, 2026-09-30, B2): Health is it up, Paths is it fast, Capacity is it full, Changes what changed.
  const obPanel = ['map', 'time', 'where', 'health', 'paths', 'conn', 'changes'].includes(s.obPanel) ? s.obPanel : 'map';
  const obPanels = [['map', 'Traffic'], ['time', 'Over time'], ['where', 'Where it goes'], ['health', 'Health'], ['paths', 'Paths'], ['conn', 'Capacity'], ['changes', 'Changes']].map(([k, l]) => { const on = obPanel === k;
    return { key: k, label: l, on, go: () => set({ obPanel: k }), line: on ? 'var(--cta)' : 'transparent', color: on ? 'var(--text-heading)' : 'var(--text-light)', weight: on ? 700 : 500 }; });
  const flowViews = [['state', 'Traffic'], ['cost', 'Cost'], ['slo', 'Performance']].map(([k, l]) => { const on = mapMode === k || (k === 'state' && mapMode === 'delta'); return { key: k, label: l, on, ...seg(on), go: () => set({ mapMode: k }) }; });
  const flowPaths = [['all', 'All paths'], ['att', 'On AT&T'], ['out', 'Outside AT&T']].map(([k, l]) => { const on = mapPath === k; return { key: k, label: l, on, ...seg(on), go: () => set({ mapPath: k }) }; });
  const mapHeads = map.heads.map((h, i) => ({ ...h, key: 'h' + i,
    // A column says what its figures are in: dollars a month, or p95.
    text: h.kind === 'col' && mapMode === 'cost' ? `${h.text} · $/mo` : h.kind === 'col' && mapMode === 'slo' ? `${h.text} · p95` : h.text,
    // A centred head gets no trailing rule: the rule is 240px wide and would
    // run straight through the head to its right.
    fx: h.anchor === 'end' ? h.x - 240 : h.anchor === 'middle' ? h.x - 120 : h.x, fy: h.y - 14,
    align: h.anchor === 'end' ? 'right' : h.anchor === 'middle' ? 'center' : 'left',
    justify: h.anchor === 'end' ? 'flex-end' : h.anchor === 'middle' ? 'center' : 'flex-start',
    // The rule leads into the heading on the right-hand column and trails it
    // on the left, so it always points at the column and never reads as a
    // strike through the word.
    ruleBefore: h.anchor === 'end' && h.kind === 'col', ruleAfter: h.anchor === 'start' && h.kind === 'col',
    // A column head names one of the three bands; a group head names a slice
    // of the left one. Same size and weight made the eye count five columns.
    // Column heads use the one graph header style; group heads a step quieter.
    fw: 600,
    fs: (h.kind === 'col' ? headUnits(map.W) : Math.round(headUnits(map.W) * 10 / 11 * 10) / 10) + 'px',
    ink: h.kind === 'col' ? 'var(--text-light)' : 'var(--text-disabled)',
    ruleOn: h.kind === 'col' }));
  const trailKey = (mapSel && !mapSel.startsWith('cx-') && mapSel.includes('/')) ? mapSel : mapZoom;
  const mapTrail = trailKey ? F.trail(trailKey, est0, inv, ob.flows).map((t, i, a) => ({ ...t, key: 'tr' + i, go: () => set({ mapSel: t.key, mapOpen: closeBranch(mapOpen, t.key).concat(i < a.length - 1 ? [t.key] : []) }), last: i === a.length - 1, notLast: i < a.length - 1 })) : [];
  const climb = () => { if (!mapSel || mapSel.startsWith('cx-')) { set({ mapSel: null }); return; } const parent = mapSel.includes('/') ? mapSel.slice(0, mapSel.lastIndexOf('/')) : null; set({ mapOpen: closeBranch(mapOpen, parent || mapSel), mapSel: parent }); };
  const siblings = (key) => map.nodes.filter(x => x.side === (map.nodes.find(y => y.key === key) || {}).side && (x.parentKey || '') === ((map.nodes.find(y => y.key === key) || {}).parentKey || ''));
  const mapKey = (e) => { const k = e.key; if (k === 'Escape' || k === 'Backspace') { e.preventDefault(); climb(); } else if (k === 'Enter' && mapSel) { const nd = map.nodes.find(x => x.key === mapSel); if (nd && nd.hasChildren) toggleOpen(mapSel); } else if (k === 'ArrowDown' || k === 'ArrowUp') { e.preventDefault(); const sib = mapSel ? siblings(mapSel) : map.nodes.filter(x => x.side === 'l' && !x.parentKey); const i = Math.max(0, sib.findIndex(x => x.key === mapSel)); const nx = sib[(i + (k === 'ArrowDown' ? 1 : sib.length - 1)) % Math.max(1, sib.length)]; if (nx) set({ mapSel: nx.key }); } else if (k === '/') { e.preventDefault(); set({ mapJumpOpen: true }); } };
  const jumpTo = (q) => {
    const needle = (q || '').trim().toLowerCase(); if (!needle) return;
    const hit = map.nodes.find(x => x.name.toLowerCase().includes(needle)) || map.nodes.find(x => (x.sub || '').toLowerCase().includes(needle));
    if (hit) { set({ mapSel: hit.key, mapJumpOpen: false, mapJumpQ: '' }); return; }
    const reg = est0.regionsList.find(r => r.region.toLowerCase().includes(needle));
    if (reg) set({ mapRegion: reg.region, mapJumpOpen: false, mapJumpQ: '' });
  };
  const playMap = () => { if (typeof window === 'undefined') return; if (window.__mapTimer) { clearInterval(window.__mapTimer); window.__mapTimer = null; set({ mapPlay: false }); return; } let t = mapT == null || mapT >= 1 ? 0 : mapT; set({ mapPlay: true, mapT: t }); window.__mapTimer = setInterval(() => { t = +(t + 0.02).toFixed(2); if (t >= 1) { clearInterval(window.__mapTimer); window.__mapTimer = null; c.setState({ mapT: 1, mapPlay: false }); } else c.setState({ mapT: t }); }, 110); };
  const capRows = OD.capacity(conns, s.obWindow || '30d');
  const gaugeRows = OD.gauges(conns).map(g => ({ ...g, key: g.id, on: mapRegion === g.region, selected: mapSel === g.id, border: mapSel === g.id ? 'var(--cta)' : mapRegion === g.region ? 'var(--border-primary)' : 'var(--border-secondary)',
    // Same bar grammar as every other figure on the page: a 150px track, an
    // 8px fill, tabular numbers right-aligned. A ring was the only radial
    // object on the screen and read as a foreign dialect.
    w: Math.max(3, Math.min(100, g.pct)).toFixed(2) + '%',
    stateInk: g.degraded ? 'var(--error)' : g.hot ? 'var(--warning)' : 'var(--success)',
    stateWord: g.degraded ? 'Degraded' : g.hot ? 'Saturating' : 'Healthy',
    capacity: `${g.used} of ${g.purchased}`,
    rowBg: mapSel === g.id ? 'var(--bg-accent)' : 'transparent', click: () => set({ mapSel: g.id, mapRegion: mapRegion === g.region ? null : g.region, panelTab: 'impact' }), port: composeFor(go, est0.regionsList.find(x => x.region === g.region) || {}),
    // Bandwidth in the open (Micah, 2026-09-29: "more transparency into bandwidth
    // capacity and utilization"): what you bought, average and peak, what is
    // left, the window's run, and when the port fills at the window's growth.
    // The numbers come from one capacity function (2026-09-30), shared with Cost > Optimize.
    ...(() => { const row = (conns.rows || []).find(r => r.id === g.id) || {}; const cp = capRows.find(x => x.id === g.id) || {}; const { capG, peakG, avgG, toFull, fullIn } = cp;
      const grow = R.growthOf(s.obWindow || '30d');
      const title = `${g.label} · BGP ${g.bgp} · ${g.drops} drops · ${cp.avg6mPct}% on average over 6 months`;
      const series = X.utilSeries(g.id + ':' + (s.obWindow || '30d'), 24, g.pct, grow);
      return { title, capG, peakG, avgG, headG: +(capG - peakG).toFixed(1), toFull, portsF: row.bwShort || '10G', rampName: F.RAMP_NAME[g.ramp] || g.ramp,
        avgF: `${avgG} Gbps`, peakF: `${peakG} Gbps`, headF: `${+(capG - peakG).toFixed(1)} Gbps`, avgW: Math.min(100, avgG / capG * 100).toFixed(1) + '%', peakX: Math.min(100, g.pct).toFixed(1) + '%',
        fullIn, fullInk: toFull < 63 ? 'var(--warning)' : 'var(--text-light)',
        spark: series.map((v, i) => ({ key: 'b' + i, h: v.toFixed(1) + '%', bg: v >= 80 ? 'var(--warning)' : 'var(--viz-1)' })) }; })() }));
  const bwTiles = (() => { const rows = gaugeRows; if (!rows.length) return [];
    const cap = rows.reduce((a, g) => a + g.capG, 0), avg = rows.reduce((a, g) => a + g.avgG, 0), peak = rows.reduce((a, g) => a + g.peakG, 0);
    const busiest = rows.slice().sort((a, b) => b.pct - a.pct)[0], first = rows.slice().sort((a, b) => a.toFull - b.toFull)[0];
    const ports = (conns.rows || []).reduce((a, r) => a + (r.ports || 1), 0);
    return [
      { key: 'cap', l: 'Capacity bought', v: `${Math.round(cap)} Gbps`, sub: `${ports} ${ports === 1 ? 'port' : 'ports'} on ${rows.length} ${rows.length === 1 ? 'connection' : 'connections'}` },
      { key: 'avg', l: 'Carrying', v: `${avg.toFixed(1)} Gbps`, sub: `${Math.round(avg / cap * 100)}% of capacity on average` },
      { key: 'peak', l: 'Peak', v: `${peak.toFixed(1)} Gbps`, sub: `busiest ${busiest.label} at ${busiest.pct}%` },
      { key: 'head', l: 'Headroom', v: `${Math.round(cap - peak)} Gbps`, sub: `${first.label} fills first, ${first.fullIn.toLowerCase()}` },
    ]; })();
  const queueRows = probRows.map(q => ({ ...q, tone: q.sev >= 2 ? 'var(--error)' : 'var(--warning)', go: () => { if (q.action === 'impact') set({ mapSel: q.connId, mapRegion: q.region, panelTab: 'impact' }); else if (q.action === 'port' || q.action === 'attach') composeFor(go, est0.regionsList.find(x => x.region === q.region) || {})(); else if (q.action === 'steer') set({ steered: [...(s.steered || []), q.flowId] }); }, select: () => set({ mapSel: q.connId || (q.region ? null : null), mapRegion: q.region || null, panelTab: 'impact' }), wlF: q.wl ? q.wl.toLocaleString('en-US') + ' workloads' : '' }));
  const panel0 = OD.panelFor(mapSel, { est: est0, inv, flows: ob.flows, map, conns });
  const panelTab = s.panelTab || 'overview';
  const panel = panel0 ? { ...panel0, trail: (panel0.trail || []).map((t, i, a) => ({ ...t, key: 'pt' + i, go: () => set({ mapSel: t.key }), last: i === a.length - 1, notLast: i < a.length - 1 })), overview: panel0.overview.map(([k, v]) => ({ key: k, k, v })), ...panelShape(panel0.overview), hasImpact: !!panel0.impact, noImpact: !panel0.impact, noRecords: panel0.records.length === 0, impact: panel0.impact ? { ...panel0.impact, isHit: panel0.impact.kind !== 'none', vpcs: panel0.impact.vpcs.map(v => ({ ...v, key: v.name, wlF: v.wl.toLocaleString('en-US'), tagsF: (v.tags || []).join(' · ') })), downstream: panel0.impact.downstream.map(d => ({ ...d, key: d.label, vpcsF: d.vpcs.map(v => v.name).join(', ') })), hasDown: panel0.impact.downstream.length > 0, tone: panel0.impact.kind === 'direct' ? 'var(--error)' : panel0.impact.kind === 'possible' ? 'var(--warning)' : 'var(--success)' } : null, records: panel0.records.map(r => ({ ...r, key: r.id })), hasRecords: panel0.records.length > 0, actions: panel0.actions.map(a => ({ ...a, key: a.key, go: a.key === 'attach' && a.site ? () => { c.setState({ screen: 's4', ...newOrder({ ...prefillCompose(est), bulk: a.site, qty: 1, note: `Attach ${a.site}: one circuit onto the AT&T network.` }) }); syncHash('s4', s.layer, s.tab); } : a.key === 'path' ? () => { c.setState({ screen: 's4', ...newOrder({ ...prefillCompose(est), bulk: a.site, qty: 1, note: `Add a second path for ${a.site}: a second metro for geodiversity.` }) }); syncHash('s4', s.layer, s.tab); } : a.key === 'failover' ? () => set({ events: [...(s.events || []), { key: 'e' + ((s.events || []).length + 1), t: SCH.hhmm(SCH.nowOf(s)), text: `Failover test on ${panel0.title} · secondary path healthy` }], panelTab: 'overview' }) : a.key === 'port' || a.key === 'attach' ? composeFor(go, est0.regionsList.find(x => x.region === a.region) || {}) : a.key === 'policy' ? () => { go('s3', { layer: 'cloud', tab: 'govern' })(); set({ authoring: true }); } : a.key === 'steer' ? () => { const f = ob.flows.find(x => x.name === (panel0.title) || (x.region || '').includes(panel0.title)); if (f) set({ steered: [...(s.steered || []), f.id] }); } : () => set({ panelTab: 'records' }) })), isSite: panel0.kind === 'site' || panel0.kind === 'workload', paths: (panel0.paths || []).map(x => ({ ...x, key: x.key, msF: x.ms + ' ms', gbpsF: x.gbps >= 1 ? x.gbps.toFixed(1) + ' Gbps' : Math.round(x.gbps * 1000) + ' Mbps', dot: x.state === 'ok' ? 'var(--success)' : x.state === 'bad' ? 'var(--error)' : 'var(--warning)', word: x.priv ? 'AT&T network' : 'public internet' })), children: panel0.children ? { ...panel0.children, hasNote2: !!panel0.children.note, rows: panel0.children.rows.map((r, i) => ({ ...r, key: r.key || ('leaf' + i), go: r.key ? (r.key.startsWith('vol:') ? () => { const [cls, metro] = r.key.slice(4).split('|'); openVolume(cls, metro); } : () => set({ mapSel: r.key, panelTab: 'overview' })) : () => {}, isLeaf: !r.key, notLeaf: !!r.key, cursor: r.key ? 'pointer' : 'default', hasPort: !!r.port, hasVer: !!r.ver, hasRate: !!r.rate, noteBg: r.warn ? 'rgba(212,140,0,.16)' : 'var(--bg-wash)', dot: r.warn ? 'var(--warning)' : 'var(--success)', portBg: r.warn ? 'rgba(212,140,0,.14)' : 'var(--bg-wash)', portInk: r.warn ? '#7a4b00' : 'var(--text-body)', ink: r.warn ? 'var(--warning)' : 'var(--text-light)', hasNote: !!r.note })) } : null,
    hasChildren2: !!(panel0.children && panel0.children.rows.length),
    talks: (() => { const ts = panel0.talks || []; const max = Math.max(0.0001, ...ts.map(t => t.gbps || 0)); return ts.map(t => ({ ...t, key: t.key, gbpsF: t.gbps >= 1 ? t.gbps.toFixed(1) + ' Gbps' : Math.round(t.gbps * 1000) + ' Mbps', barW: Math.max(3, Math.round((t.gbps || 0) / max * 100)) + '%' })); })(), hasTalks: !!(panel0.talks && panel0.talks.length), backToList: () => set({ mapSel: null }), hasList: !!(s.drawerOpen && s.vol), isPaths: panelTab === 'paths', tabs: (panel0.kind === 'vpc' || panel0.kind === 'subnet' ? [['overview', 'Overview'], ['actions', 'Actions']] : panel0.kind === 'site' || panel0.kind === 'workload' ? [['overview', 'Overview'], ['paths', 'Paths'], ['records', 'Records'], ['actions', 'Actions']] : [['overview', 'Overview'], ['impact', 'Impact'], ['records', 'Records'], ['actions', 'Actions']]).map(([k, l]) => ({ key: k, label: l, on: panelTab === k, go: () => set({ panelTab: k }),
      // A segmented control: the chosen tab rises out of the tray on a white card.
      bg: panelTab === k ? 'var(--bg-base)' : 'transparent', color: panelTab === k ? 'var(--text-heading)' : 'var(--text-light)', weight: panelTab === k ? 600 : 500,
      shadow: panelTab === k ? '0 1px 2px rgba(16,24,40,.10), 0 1px 3px rgba(16,24,40,.08), 0 0 0 1px var(--border-secondary)' : 'none', border: 'transparent' })), isOverview: panelTab === 'overview', isImpact: panelTab === 'impact', isRecords: panelTab === 'records', isActions: panelTab === 'actions', close: () => set({ mapSel: null }), primary: (() => { const a = panel0.actions.find(x => x.key !== 'logs'); return a ? { label: a.label.replace(/ for these workloads| here$/, ''), go: a.key === 'attach' && a.site ? () => { c.setState({ screen: 's4', ...newOrder({ ...prefillCompose(est), bulk: a.site, qty: 1, note: `Attach ${a.site}: one circuit onto the AT&T network.` }) }); syncHash('s4', s.layer, s.tab); } : a.key === 'path' ? () => { c.setState({ screen: 's4', ...newOrder({ ...prefillCompose(est), bulk: a.site, qty: 1, note: `Add a second path for ${a.site}: a second metro for geodiversity.` }) }); syncHash('s4', s.layer, s.tab); } : a.key === 'failover' ? () => set({ events: [...(s.events || []), { key: 'e' + ((s.events || []).length + 1), t: SCH.hhmm(SCH.nowOf(s)), text: `Failover test on ${panel0.title} · secondary path healthy` }], panelTab: 'overview' }) : a.key === 'port' || a.key === 'attach' ? composeFor(go, est0.regionsList.find(x => x.region === a.region) || {}) : a.key === 'policy' ? () => { go('s3', { layer: 'cloud', tab: 'govern' })(); set({ authoring: true }); } : () => set({ panelTab: 'actions' }) } : null; })(), hasPrimary: panel0.actions.some(x => x.key !== 'logs') } : null;
  const PATTERN_ALL = ['all', 'All', 'Every flow the estate carries, whichever way it goes.'];
  // The map draws the site story, so its chips are the patterns that have
  // ribbons - ingress and the internet path. All five patterns keep their
  // chips on Logs, where every one of them has records behind it.
  const MAP_PATTERNS = new Set(['inbound', 'internet']);
  const patterns = [PATTERN_ALL, ...F.PATTERNS.filter(([k]) => MAP_PATTERNS.has(k))].map(([k, l, why]) => ({ key: k, label: l, why, on: mapPattern === k, go: () => set({ mapPattern: k }), bg: mapPattern === k ? 'var(--cta)' : 'var(--bg-base)', color: mapPattern === k ? '#fff' : 'var(--text-heading)', border: mapPattern === k ? 'var(--cta)' : 'var(--border-secondary)' }));
  const patternWhy = (patterns.find(p => p.on) || patterns[0]).why;

  // ---- Observe's scope cut (Ramesh 3: site360, cloud360, trends) ----
  // The same numbers, four ways of asking. A dimension picks the question,
  // a member answers it, and every panel below re-cuts to that answer.
  const scopeParts = String(obScope || 'all').split(':');
  const scopeDim = obScope === 'all' || !obScope ? 'all' : scopeParts[0];
  const scopeName = scopeParts[1] || '';
  const scopeDims = [
    ['all', 'Whole estate'],
    ['cloud', 'By cloud'],
    ['site', 'By site'],
    ['first', 'By first mile'],
    ['app', 'By app'],
  ].map(([k, l]) => { const on = mapDim === k; const pick = on && scopeDim === k && scopeName ? (k === 'first' ? (S.ACCESS_CLASS[scopeName] || {}).label || scopeName : scopeName) : ''; return { key: k, label: pick ? `${l} · ${pick}` : l, on,
    // Pressing a By chip regroups at once and opens its picker; pressing it again toggles the picker.
    go: () => { if (k === 'all') { set({ obScope: 'all', obDim: 'all', obPickOpen: false, mapOpen: [], mapSel: null }); return; } if (on) { set({ obPickOpen: !s.obPickOpen }); return; } set({ obDim: k, obScope: 'all', obPickOpen: true, mapOpen: [], mapSel: null }); },
    bg: on ? 'var(--cta)' : 'var(--bg-base)', color: on ? '#fff' : 'var(--text-heading)',
    border: on ? 'var(--cta)' : 'var(--border-secondary)' }; });
  const obDim = s.obDim || scopeDim;
  const memberList = (() => {
    if (obDim === 'cloud') return [...new Set(est0.regionsList.map(r => r.cloud))];
    if (obDim === 'site') return (est0.sites || []).map(x => x.name);
    if (obDim === 'first') return [...new Set((est0.sites || []).map(x => S.ACCESS_CLASS[S.accessOf(x)].label))];
    if (obDim === 'app') return [...new Set(est0.regionsList.flatMap(r => r.tags || []))];
    return [];
  })();
  const scopeMembers = memberList.slice(0, 10).map(nameOf => {
    const key = obDim === 'first'
      ? Object.keys(S.ACCESS_CLASS).find(k => S.ACCESS_CLASS[k].label === nameOf) || 'other'
      : nameOf;
    const sel = `${obDim}:${key}`;
    return { key: sel, label: nameOf, on: obScope === sel, go: () => set({ obScope: sel, obPickOpen: false, mapOpen: [], mapSel: null }),
      bg: obScope === sel ? 'var(--bg-accent)' : 'transparent', color: obScope === sel ? 'var(--link)' : 'var(--text-heading)',
      border: obScope === sel ? 'var(--cta)' : 'var(--border-secondary)' };
  });
  const scopeLabel = scopeDim === 'all' || !scopeName
    ? 'Whole estate'
    : `${(scopeDims.find(d => d.key === scopeDim) || {}).label} · ${obDim === 'first' ? (S.ACCESS_CLASS[scopeName] || {}).label || scopeName : scopeName}`;
  const mapFiltersOn = (mapPattern !== 'all' ? 1 : 0) + (mapMode !== 'state' ? 1 : 0) + (mapRegion ? 1 : 0);
  const mapFiltersOpen = s.mapFiltersOpen === undefined ? true : !!s.mapFiltersOpen;
  const modes = [['state', 'State'], ['delta', 'Changes'], ['slo', 'Over SLO']].map(([k, l]) => ({ key: k, label: l, on: mapMode === k, go: () => set({ mapMode: k }), bg: mapMode === k ? 'var(--cta)' : 'var(--bg-base)', color: mapMode === k ? '#fff' : 'var(--text-heading)', border: mapMode === k ? 'var(--cta)' : 'var(--border-secondary)' }));
  // Ramesh: "The focus should be on workloads - but observe is still speaking
  // network language only." The row led with Gbps, ms and loss. It leads with
  // what is running and whether any of it is exposed, then how the network is
  // carrying it. Counted from the inventory, cut by the scope in force.
  const scopedRegions = R.applyScope(est0, obScope).regionsList.map(r => r.region);
  const scopedInv = inv.flatMap(c => c.regions).filter(r => scopedRegions.includes(r.region));
  const scopedWl = scopedInv.flatMap(r => r.vpcs.flatMap(v => v.subnets.flatMap(x => x.workloads || [])));
  const scopedApps = new Set(scopedInv.flatMap(r => r.vpcs.flatMap(v => v.subnets.flatMap(x => (x.workloads || []).flatMap(w => (w.endpoints || []).map(e => `${e.app}@${w.tag || v.name}@${r.region}`))))));
  const scopedExposed = scopedWl.filter(w => w.exposed).length;
  const wlTiles = [
    { key: 'wl', l: 'Workloads', v: scopedWl.length.toLocaleString('en-US'), u: '', e: `in ${scopedInv.length} ${scopedInv.length === 1 ? 'region' : 'regions'}`, arrow: '', delta: '' },
    { key: 'apps', l: 'Applications', v: scopedApps.size.toLocaleString('en-US'), u: '', e: 'named on those workloads', arrow: '', delta: '' },
    { key: 'exp', l: 'Exposed', v: scopedExposed.toLocaleString('en-US'), u: '', e: 'reachable from the internet', arrow: '', delta: '' },
  ];
  // Every tile carries a named door, the way the Discover launch cards do:
  // a number alone is a report; a number with the next move is a dashboard.
  // The volume drawer needs a region AND a VPC, so pick the fullest one and
  // the most exposed one rather than handing it a null and opening nothing.
  const vpcPicks = (scopedInv.length ? scopedInv : inv.flatMap(c => c.regions)).flatMap(r => r.vpcs.map(v => ({
    region: r.region, vpcId: v.id,
    wl: v.subnets.reduce((t, x) => t + (x.workloads || []).length, 0),
    exposed: v.subnets.reduce((t, x) => t + (x.workloads || []).filter(w => w.exposed).length, 0),
  })));
  const bigVpc = [...vpcPicks].sort((a, b) => b.wl - a.wl)[0] || null;
  const expVpc = [...vpcPicks].sort((a, b) => b.exposed - a.exposed)[0] || bigVpc;
  const TILE_DOORS = {
    wl: { door: 'See where they run', act: () => { if (bigVpc) openWorkloads(bigVpc.region, bigVpc.vpcId, null); } },
    apps: { door: 'See what is running', act: () => { if (bigVpc) openWorkloads(bigVpc.region, bigVpc.vpcId, null); } },
    exp: { door: 'Isolate the exposed', act: () => { if (expVpc) { openWorkloads(expVpc.region, expVpc.vpcId, null); set({ volState: 'exposed' }); } } },
    thr: { door: 'Explain the throughput', act: explainNav(c, { label: 'Throughput', value: (ob.total || 0).toFixed(1) + ' Gbps',
      sub: 'Measured from the flow records in this window.', cut: 'Every record the estate carried.', parts: [] }) },
    p95: { door: 'Find the worst path' },
    fab: { door: 'Explain what stays public', act: explainNav(c, { label: 'Not on the AT&T network', value: (100 - Math.round((ob.fab || 0) / (ob.total || 1) * 100)) + '%',
      sub: 'The share of measured traffic that did not take a private path.',
      cut: 'Records that left on the public path.', path: 'public', parts: [] }) },
    loss: { door: 'Find the worst path' },
    util: { door: 'Open the hottest connection' },
  };
  const dashTiles = [...wlTiles, ...R.trends(ob, s.obWindow || '30d').filter(k => ['thr', 'p95', 'fab'].includes(k.key))].map(k => ({ ...k, key: k.key, hasUnit: !!k.u, badge: `${k.arrow} ${k.delta}`, on: (k.key === 'loss' && mapMode === 'slo') || (k.key === 'fab' && mapMode === 'state'), border: (k.key === 'loss' && mapMode === 'slo') ? 'var(--cta)' : 'var(--border-secondary)', go: ({ loss: () => set({ mapRegion: null, mapMode: 'slo', panelTab: 'overview' }), p95: () => set({ mapRegion: null, mapMode: 'slo', panelTab: 'overview' }), fab: () => set({ mapMode: 'state', mapRegion: null, mapPattern: 'all', mapSel: 'mid:public', panelTab: 'overview' }), util: () => set({ mapSel: (conns.rows.find(r => r.hot || r.degraded) || conns.rows[0] || {}).id || null, mapRegion: (conns.rows.find(r => r.hot || r.degraded) || conns.rows[0] || {}).region || null, panelTab: 'overview' }), thr: () => { const top = map.nodes.filter(x => x.side === 'l' && x.hasChildren).sort((a, b) => b.v - a.v)[0]; set({ mapRegion: null, mapMode: 'delta', mapOpen: top ? [...new Set([...mapOpen, top.key])] : mapOpen, mapSel: top ? top.key : mapSel, panelTab: 'overview' }); } })[k.key] })).map(k => ({ ...k, door: (TILE_DOORS[k.key] || {}).door || 'Open on the map', hasE: !!k.e, hasDelta: !!(k.delta && String(k.delta).trim()), go: (TILE_DOORS[k.key] || {}).act || k.go }));
  // Insights: the screen was showing what the network carries without ever
  // saying what that means. Two sources, one grammar - an anomaly is something
  // that happened and has a time on it; an insight is something that is true
  // and has a number on it. Both carry the evidence and one thing to do.
  const anomalyRows = R.anomalies(est0, ob, SCH.nowOf(s)).map((a, i) => ({
    key: a.key, persona: a.key === 'an-dest' ? 'Security & Compliance' : a.key === 'an-egress' ? 'FinOps & SRE' : 'Network Engineering',
    kind: 'Event', when: a.when, head: a.head, why: a.cause, did: a.did, hasDid: !!a.did, act: a.can,
    tone: a.sev === 'amber' ? 'var(--warning)' : 'var(--link)',
    toneBg: 'var(--bg-base)',
    cta: a.region ? 'Open it on the map' : 'Open Cost',
    go: a.region
      ? () => { go('s3', { layer: 'cloud', tab: 'observe' })(); set({ obPage: 'perf', obTab: 'flow', mapRegion: a.region, panelTab: 'overview' }); }
      : go('s3', { layer: 'cloud', tab: 'cost' }),
  }));
  // One findings list with a life each (notes, 2026-09-29). The events above
  // are part of it; the standing insights are the Signals cards, so they are
  // not repeated here.
  const now = new Date(SCH.nowOf(s));
  const life = lifeState(s, est);
  const PNAME = { FinOps: 'FinOps & SRE', 'Security and Compliance': 'Security & Compliance' };
  const TONE = { open: 'var(--warning)', ack: 'var(--link)', progress: 'var(--link)', resolved: 'var(--success)', snoozed: 'var(--text-disabled)', dismissed: 'var(--text-disabled)' };
  const list = findingList(est, est0, obAll, now);
  const lifeRows = list.map(f => ({ f, l: LC.lifeOf(f, life, now) }));
  const history = LC.closedFindings(est).map(f => ({ f: { ...f, key: f.kind, history: true }, l: { state: 'resolved', label: 'Resolved', owner: f.owner, foundAt: f.found, ageDays: Math.max(0, Math.floor((+now - Date.parse(f.found)) / 86400000)), events: [{ at: f.found, state: 'open', by: 'Discovery' }, { at: f.resolvedAt, state: 'resolved', by: f.owner.split(' · ')[1] || f.owner }] } }));
  const bucket = (st) => OPEN_STATES.includes(st) ? 'open' : st === 'snoozed' ? 'snoozed' : 'closed';
  const every = [...lifeRows, ...history];
  const openN = every.filter(x => bucket(x.l.state) === 'open').length;
  const findFilter = ['open', 'snoozed', 'closed', 'all'].includes(s.findFilter) ? s.findFilter : 'open';
  const findChips = [['open', 'Open'], ['snoozed', 'Snoozed'], ['closed', 'Closed'], ['all', 'All']].map(([k, l]) => {
    const n = k === 'all' ? every.length : every.filter(x => bucket(x.l.state) === k).length;
    const on = findFilter === k;
    return { key: k, label: `${l} · ${n}`, on, go: () => set({ findFilter: k, findPage: 0 }), bg: on ? 'var(--cta)' : 'var(--bg-base)', color: on ? '#fff' : 'var(--text-heading)', border: on ? 'var(--cta)' : 'var(--border-secondary)' };
  });
  // One source for a finding's evidence and next steps: the table and the
  // drawer read the same records and offer the same moves (2026-09-29).
  const persistLife = (next) => { const all = { ...(s.findingLife || {}), [est.id]: next }; set({ findingLife: all }); try { localStorage.setItem('naas.life', JSON.stringify(all)); } catch (e) {} };
  const moveF = (f, to, extra) => () => { const next = LC.transition(life, f.key, to, { by: 'You', now, ...(extra || {}) }); if (next !== life) persistLife(next); };
  const EVF = { crosscloud: r => r.pattern === 'clouds', ipsecegress: r => r.pattern === 'internet' && r.path === 'public', avoidable: r => r.pattern === 'internet' && r.path === 'public',
    onecloud: r => r.path === 'public', ipsec: r => r.path === 'public', pci: r => r.pattern === 'internet', uninspected: r => r.pattern === 'internet', unsegmented: r => r.pattern === 'regions' || r.pattern === 'region' };
  const evHitOf = (f) => { const rg = f.event && f.a && f.a.region; return EVF[f.kind] || (rg ? (r => `${r.srcSub} ${r.dstSub}`.includes(rg)) : f.tab === 'govern' ? (r => r.deny || r.path === 'public') : (() => true)); };
  const evidenceOf = (f) => logAll.filter(evHitOf(f)).slice().sort((x, y) => (+y.bytes || 0) - (+x.bytes || 0));
  const actsOf = (f, l) => (f.history ? [] : ({
    open: [['Acknowledge', moveF(f, 'ack')], ['Snooze 7 days', moveF(f, 'snoozed', { snoozeDays: 7 })], ['Dismiss', moveF(f, 'dismissed')]],
    ack: [['Snooze 7 days', moveF(f, 'snoozed', { snoozeDays: 7 })], ['Dismiss', moveF(f, 'dismissed')]],
    progress: [['Mark resolved', moveF(f, 'resolved')], ['Snooze 7 days', moveF(f, 'snoozed', { snoozeDays: 7 })], ['Dismiss', moveF(f, 'dismissed')]],
    snoozed: [['Reopen', moveF(f, 'open')], ['Dismiss', moveF(f, 'dismissed')]],
    resolved: [['Reopen', moveF(f, 'open')]], dismissed: [['Reopen', moveF(f, 'open')]],
  })[l.state] || []);
  const maxSave = Math.max(1, ...every.filter(x => x.f.priced && x.f.save).map(x => x.f.save));
  const toRow = ({ f, l }) => ({
    key: f.key, persona: PNAME[f.persona] || f.persona || 'Network Engineering',
    // The table's cells (Micah, 2026-09-29: "a beautiful table underneath (evidence, actions, etc)").
    ...(() => { const ev = evidenceOf(f), top = ev[0], acts = actsOf(f, l);
      const bytes = top ? (typeof top.bytes === 'number' ? top.bytes.toFixed(1) + ' GB' : String(top.bytes)) : '';
      return { evLine: ev.length ? `${ev.length} flow ${ev.length === 1 ? 'record' : 'records'}` : 'No flow records', evTop: top ? `${top.srcName} → ${top.dstName} · ${bytes}` : 'nothing on the wire yet', evInk: top && top.path === 'public' ? 'var(--warning)' : 'var(--success)', hasEvTop: !!top,
        impW: f.priced && f.save ? Math.max(4, Math.round(f.save / maxSave * 100)) + '%' : '0%', impWord: f.priced && f.save ? '' : (f.event ? 'Event' : 'Risk'),
        actLabel: acts.length ? acts[0][0] : 'Open', actGo: acts.length ? acts[0][1] : () => set({ fdKey: f.key }) }; })(),
    kind: f.event ? 'Event' : (D.KINDS[f.kind] || f.pillar || 'Finding'), when: f.event ? f.a.when : '', head: f.head,
    stateLabel: l.label, stateTone: TONE[l.state], owner: l.owner, age: `${l.ageDays}d`,
    saveLine: f.priced && f.save ? `${fmt(f.save)}/mo` : '', hasSave: !!(f.priced && f.save),
    tone: f.event ? 'var(--warning)' : 'var(--link)', toneBg: 'var(--bg-base)',
    cta: f.priced && !f.history ? 'Preview the change' : 'See the evidence',
    open: () => set({ fdKey: f.key }),
  });
  // The Signals cards drill to the findings behind them (2026-09-28), now the actionable ones.
  const CARD_FINDS = { talkers: ['Top talkers', k => ['ipsec', 'onecloud', 'single', 'nothub'].includes(k)], newdest: ['New destinations', k => k === 'an-dest'],
    shadow: ['Shadow SaaS', k => ['uninspected', 'pci', 'unsegmented', 'an-dest'].includes(k)], growth: ['Egress growth', k => ['avoidable', 'ipsecegress', 'an-egress'].includes(k)],
    multi: ['Cloud-to-cloud paths', k => k === 'crosscloud'], slo: ['Latency over SLO', k => ['degraded', 'blindspots', 'unmonitored'].includes(k) || (/^an-/.test(k) && k !== 'an-dest' && k !== 'an-egress')] };
  const insFocus = CARD_FINDS[s.insFocus] ? s.insFocus : null;
  const insDrill = Object.fromEntries(Object.entries(CARD_FINDS).map(([k, [label, hit]]) => { const n0 = lifeRows.filter(x => hit(x.f.key) && bucket(x.l.state) === 'open').length, on = insFocus === k;
    return [k, { n: n0, label: n0 ? `${n0} ${n0 === 1 ? 'finding' : 'findings'} ›` : 'No findings', on, border: on ? 'var(--border-active)' : 'var(--border-secondary)',
      go: () => set({ insFocus: on ? null : k, findFilter: 'open', findPage: 0, insPanel: on ? 'signals' : 'findings' }) }]; }));
  const personaSort = (rows) => rows.slice().sort((a, b) => ((b.persona === (PERSONA_NAME[s.persona] || 'Cloud & Platform Architect')) ? 1 : 0) - ((a.persona === (PERSONA_NAME[s.persona] || 'Cloud & Platform Architect')) ? 1 : 0));
  const insightRowsShown = personaSort(every.filter(x => findFilter === 'all' || bucket(x.l.state) === findFilter).filter(x => !insFocus || CARD_FINDS[insFocus][1](x.f.key)).map(toRow))
    .map(r => ({ ...r, pFor: 'For ' + ({ 'Cloud & Platform Architect': 'Architect', 'Network Engineering': 'Network Eng', 'Security & Compliance': 'Security', 'FinOps & SRE': 'FinOps & SRE', 'Executive': 'Executive' }[r.persona] || r.persona), pInk: r.persona === (PERSONA_NAME[s.persona] || 'Cloud & Platform Architect') ? 'var(--link)' : 'var(--text-disabled)' }));
  // The finding drawer: what AT&T saw, a preview of the change, the evidence, the timeline, the moves.
  const fdPick = every.find(x => x.f.key === s.fdKey) || null;
  const fd = (() => {
    if (!fdPick) return null;
    const { f, l } = fdPick;
    const move = (to, extra) => moveF(f, to, extra);
    // The preview starts from the headline's own figures (review, 2026-09-29): two figures are today and after; one is today.
    const m = /\$([\d,]+)\/mo[^$]*\$([\d,]+)/.exec(f.head || ''), m1 = /\$([\d,]+)\/mo/.exec(f.head || '');
    const beforeN = m ? +m[1].replace(/,/g, '') : m1 ? +m1[1].replace(/,/g, '') : f.priced ? Math.round(f.save / 0.78 / 100) * 100 : 0;
    const afterN = m ? +m[2].replace(/,/g, '') : Math.max(0, beforeN - (f.save || 0));
    // The records behind this finding, not the page's busiest (review, 2026-09-29).
    const evRegion = f.event && f.a && f.a.region;
    const evidence = evidenceOf(f).slice(0, 5)
      .map(r => ({ key: r.id, pattern: r.pattern, time: r.time, src: r.srcName, dst: r.dstName, bytes: typeof r.bytes === 'number' ? r.bytes.toFixed(1) + ' GB' : String(r.bytes), path: r.path === 'public' ? 'outside AT&T' : 'on AT&T', pathInk: r.path === 'public' ? 'var(--warning)' : 'var(--success)' }));
    const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = (iso) => `${MON[+iso.slice(5, 7) - 1]} ${+iso.slice(8, 10)}`;
    const closed = f.history;
    const acts = actsOf(f, l);
    const rec = !f.event && !closed && OPEN_STATES.includes(l.state) && l.state !== 'progress' ? findingCard(f).rec : null;
    const ev = f.event ? anomalyRows.find(r => r.key === f.key) : null;
    const primary = rec ? { label: rec.name, go: () => { move('progress', { note: `Started an order: ${rec.name}` })(); set({ fdKey: null }); rec.choose(); } }
      : ev && !closed ? { label: ev.cta, go: () => { set({ fdKey: null }); ev.go(); } } : null;
    return {
      key: f.key, head: f.head, kind: f.event ? `Event · ${f.a.when}` : (D.KINDS[f.kind] || f.pillar || 'Finding'),
      stateLabel: l.label, stateTone: TONE[l.state], meta: `${l.owner} · found ${day(l.foundAt)} · ${l.ageDays}d`,
      saw: f.event ? f.a.cause : (f.ev || ''), hasSaw: !!(f.event ? f.a.cause : f.ev), why: f.why || (f.event ? f.a.did || '' : ''), hasWhy: !!(f.why || (f.event && f.a.did)),
      hasPreview: !!(f.priced && f.save), noPreview: !(f.priced && f.save),
      before: { label: 'Today', path: 'Public internet', money: `${fmt(beforeN)}/mo` }, after: { label: 'After', path: 'On AT&T', money: `${fmt(afterN)}/mo` },
      beforeW: '100%', afterW: beforeN ? Math.max(4, Math.round(afterN / beforeN * 100)) + '%' : '0%',
      deltaLine: `Saves ${fmt(f.save || 0)}/mo`,
      evidence, hasEvidence: evidence.length > 0, evidenceHead: `Evidence · ${evidence.length} of ${logAll.length} flow records`,
      openLogs: () => { set({ fdKey: null }); go('s3', { layer: 'cloud', tab: 'observe', obPage: 'logs', sub: null })(); set({ logPath: f.tab === 'govern' || f.event ? 'all' : 'public' }); },
      showMap: () => { set({ fdKey: null }); go('s3', { layer: 'cloud', tab: 'observe', obPage: 'perf', obPanel: 'map', sub: null, ...(evRegion ? { mapRegion: evRegion } : {}) })(); },
      timeline: l.events.map((e, i) => ({ key: 't' + i, date: day(e.at), label: LC.STATE_LABEL[e.state] === 'Open' ? 'Found' : LC.STATE_LABEL[e.state], by: e.by, note: e.note ? `· ${e.note}` : e.until ? `· until ${day(e.until)}` : '', dot: TONE[e.state] })),
      primary, hasPrimary: !!primary,
      actions: acts.map(([label, go2]) => ({ key: label, label, go: go2 })),
    };
  })();
  // Three pictures over the table (Micah, 2026-09-29: "make insights more
  // visual less texty"): what is on the table, where each finding is in its
  // life, and how long the open ones have waited.
  const insBand = (() => {
    const openX = every.filter(x => bucket(x.l.state) === 'open');
    const priced = openX.filter(x => x.f.priced && x.f.save).sort((a, b) => b.f.save - a.f.save);
    const tot = priced.reduce((a, x) => a + x.f.save, 0);
    const PAL = ['var(--viz-1)', 'var(--viz-2)', 'var(--viz-3)', 'var(--viz-4)', 'var(--viz-5)', 'var(--viz-6)'];
    const kindOf = (f) => (f.event ? 'Event' : (D.KINDS[f.kind] || f.pillar || 'Finding'));
    const savSegs = priced.map((x, i) => ({ key: x.f.key, n: x.f.save, w: (x.f.save / (tot || 1) * 100).toFixed(2) + '%', color: PAL[i % PAL.length], title: `${x.f.head} · ${fmt(x.f.save)}/mo`, go: () => set({ fdKey: x.f.key }) }));
    const ORDER = [['open', 'Open'], ['ack', 'Acknowledged'], ['progress', 'In progress'], ['snoozed', 'Snoozed'], ['resolved', 'Resolved'], ['dismissed', 'Dismissed']];
    const lifeSegs = ORDER.map(([k, lbl]) => { const n = every.filter(x => x.l.state === k).length; return { key: k, n, w: (n / (every.length || 1) * 100).toFixed(2) + '%', color: TONE[k], title: `${lbl} · ${n}`, label: lbl, go: () => set({ findFilter: bucket(k), findPage: 0 }) }; }).filter(x => x.n > 0);
    const AGES = [[0, 7, 'Under a week'], [8, 14, '1 to 2 weeks'], [15, 30, '2 to 4 weeks'], [31, Infinity, 'Over a month']];
    const ageCols = AGES.map(([a, b, lbl]) => ({ key: lbl, label: lbl, n: openX.filter(x => x.l.ageDays >= a && x.l.ageDays <= b).length }));
    const amax = Math.max(1, ...ageCols.map(c => c.n));
    const oldest = openX.reduce((m, x) => Math.max(m, x.l.ageDays), 0);
    return [
      { key: 'savings', title: 'On the table', big: `${fmt(tot)}/mo`, total: fmt(tot), isBar: true, isAge: false, segs: savSegs, cols: [],
        legend: priced.slice(0, 3).map((x, i) => ({ key: x.f.key, color: PAL[i], label: kindOf(x.f), v: fmt(x.f.save) })) },
      { key: 'life', title: 'Where they are', big: `${openX.length} open`, isBar: true, isAge: false, segs: lifeSegs, cols: [],
        legend: lifeSegs.map(sg => ({ key: sg.key, color: sg.color, label: sg.label, v: String(sg.n) })) },
      { key: 'age', title: 'How long they have waited', big: openX.length ? `${oldest}d oldest` : 'None open', isBar: false, isAge: true, segs: [], legend: [],
        cols: ageCols.map(c => ({ ...c, h: (c.n / amax * 100).toFixed(1) + '%', title: `${c.label} · ${c.n} open` })) },
    ];
  })();
  const insightVals = {
    insBand,
    insightRows: insightRowsShown, hasInsights: insightRowsShown.length > 0, noInsights: insightRowsShown.length === 0, findChips, insDrill, findAll: every.map(toRow),
    ...(() => { const ik = ['signals', 'findings', 'ops', 'brief'].includes(s.insPanel) ? s.insPanel : 'role'; return { insPanels: [['role', 'Your actions'], ['ops', 'Operations'], ['findings', `Findings · ${openN}`], ['signals', 'Signals'], ['brief', 'Monthly briefing']].map(([k, l]) => { const on = ik === k; return { key: k, label: l, on, go: () => set({ insPanel: k }), line: on ? 'var(--cta)' : 'transparent', color: on ? 'var(--text-heading)' : 'var(--text-light)', weight: on ? 700 : 500 }; }), insPanelRole: ik === 'role', insPanelSignals: ik === 'signals', insPanelFindings: ik === 'findings', insPanelOps: ik === 'ops', insPanelBrief: ik === 'brief' }; })(),
    hasInsFocus: !!insFocus, insFocusLabel: insFocus ? CARD_FINDS[insFocus][0] : '', clearInsFocus: () => set({ insFocus: null, findPage: 0 }),
    hasFindings: every.length > 0,
    insightCount: `${openN} open`,
    insightSub: 'Found by AT&T, with what was done about each',
    fd, fdOpen: !!fd, closeFd: () => set({ fdKey: null }),
  };
  // Dev (2026-09-11): "drill down from it for different personas". The header
  // already knows who is looking; this hands each persona their entry point
  // into the same map, instead of a persona-flavoured redesign of it.
  const personaNow = PERSONA_NAME[s.persona] || 'Cloud & Platform Architect';
  const plTopCloud = map.nodes.filter(n => n.side === 'r' && n.kind === 'cloud' && !n.parentKey).sort((a, b) => (b.tot || b.v) - (a.tot || a.v))[0];
  const plInetV = MIX.buckets.filter(b => (EXPLAIN_CUT[b.key] || {}).pattern === 'internet').reduce((a, b) => a + b.v, 0);
  const plFabPct = Math.round(fabAll / (crossed || 1) * 100);
  const PERSONA_LENS = {
    'Executive': { line: `${plFabPct}% of everything that crosses a mid mile rides the AT&T network: ${fabAll.toFixed(1)} of ${crossed.toFixed(1)} Gbps.`, cta: 'See the records', go: mixVals.explainFabric },
    'Cloud & Platform Architect': plTopCloud ? { line: `${plTopCloud.name} takes the most of what your sites send, ${(plTopCloud.tot || plTopCloud.v).toFixed(1)} Gbps. Open it to the region level.`, cta: `Open ${plTopCloud.name}`, go: () => set({ mapOpen: (s.mapOpen || []).includes(plTopCloud.key) ? (s.mapOpen || []) : [...(s.mapOpen || []), plTopCloud.key], mapSel: plTopCloud.key, panelTab: 'overview' }) } : null,
    'Network Engineering': { line: `${pubAll.toFixed(1)} Gbps crosses a mid mile outside AT&T. No latency floor, no SLO, no second path.`, cta: 'See the records', go: mixVals.explainOutside },
    'Security & Compliance': { line: `${plInetV.toFixed(1)} Gbps of cloud egress reaches the internet with no inspection point in the path.`, cta: 'See the records', go: explainNav(c, { label: 'Cloud egress to the internet', value: plInetV.toFixed(1) + ' Gbps', sub: 'AI endpoints and public internet destinations, straight over the hyperscaler exit.', cut: 'Records leaving the cloud for the internet.', pattern: 'internet', parts: [] }) },
    'FinOps & SRE': { line: totalSave > 0 ? `${fmt(totalSave)}/mo is on the table: the same bytes at AT&T rates instead of public ones.` : `The AT&T network is saving ${fmt(ob.savingsMo || 0)}/mo against public rates; egress runs ${fmt(ob.egressMo || 0)}/mo.`, cta: 'Open Cost', go: () => { go('s3', { layer: 'cloud', tab: 'cost' })(); } },
  };
  const plNow = PERSONA_LENS[personaNow] || PERSONA_LENS['Executive'];
  // Observe > Health (notes, 2026-09-30): the path flow, one row per app group, one
  // cell per segment; and the open problems, ranked by apps affected, with Open
  // ticket (a lifecycle move, no second store) and Trace (the Traffic map).
  const INK = F.HEALTH_INK;
  // One ticket number per problem key, shared by Health and Operations.
  const tid = (k) => 'T-' + (1000 + [...k].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) % 9000, 7));
  const healthVals = (() => {
    if (!segCtx) return { pathFlowAll: [], pathFlowRows: [], segHeads: [], healthTiles: [], problemRows: [], healthViews: [], segRows: [], segDrillRows: [], segCrumbs: [], pathTimeAll: [], pathTimeRows: [], changeAll: [], changeRows: [], chgTicks: [], chgBands: [], chgLegend: [], noPaths: true, noChanges: true };
    const all = G.pathFlow(segCtx);
    const segHeads = G.SEGMENTS.map(g => ({ key: g.key, label: g.label, title: g.title }));
    const cellView = (c, i) => {
      const ink = INK[c.state], seg = G.SEGMENTS[i];
      const bg = c.state === 'none' || c.state === 'nodata' || c.limited ? 'transparent' : ink;
      const border = c.state === 'none' ? '0' : c.state === 'nodata' ? '1.5px dashed var(--text-disabled)' : c.limited ? `2px solid ${ink}` : '0';
      const word = { ok: 'Healthy', risk: 'At risk', slo: 'Over SLO', down: 'Down', nodata: 'Not yet measured', none: 'Not on this path' }[c.state];
      const title = c.state === 'none' ? `${seg.label}: not on this path` : `${seg.label} · ${c.thing}${c.owner ? ' · ' + G.OWNERS[c.owner] : ''} · ${word}${c.why && c.why !== 'Healthy' && c.why !== word ? ' · ' + c.why : ''}${c.limited ? ' · limited view' : ''}`;
      return { key: seg.key, state: c.state, thing: c.thing, title, bg, border, limited: !!c.limited, rad: F.healthRadius(c.state) };
    };
    const rows = all.map(r => ({ key: r.tag, tag: r.tag, label: r.label, state: r.state, dot: INK[r.state] || 'var(--text-disabled)', rad: F.healthRadius(r.state), cells: r.cells.map(cellView) }));
    const downN = (conns.rows || []).filter(r => r.degraded).length, riskN = all.filter(r => r.state === 'risk' || r.state === 'slo').length;
    const healthTiles = [
      { key: 'ok', l: 'Apps healthy', v: `${all.filter(r => r.state === 'ok').length} of ${all.length}`, u: '' },
      { key: 'risk', l: 'At risk', v: String(riskN), u: riskN === 1 ? 'app' : 'apps' },
      { key: 'down', l: 'Down', v: String(downN), u: downN === 1 ? 'connection' : 'connections' },
      { key: 'alerts', l: 'Alerts', v: String(probs.length), u: 'open' },
    ];
    const nowMs = SCH.nowOf(s);
    // Is it fast (notes, 2026-09-30, B2): each app group on its worst path, hop by hop.
    const pathAll = G.pathTimes(segCtx);
    const pathKeyFor = (p) => (pathAll.find(r => r.region === p.region && (p.apps || []).includes(r.tag)) || pathAll.find(r => (p.apps || []).includes(r.tag)) || {}).key || null;
    const pathSelRow = pathAll.find(r => r.key === s.pathSel) || null;
    const pathTimeRows = pathAll.map(r => { const sel = !!pathSelRow && r.key === pathSelRow.key;
      return { key: r.key, label: r.label, sub: `${r.site} to ${r.where}`, state: r.state, dot: INK[r.state] || 'var(--text-disabled)', rad: F.healthRadius(r.state), totalF: r.totalF, totalTone: r.state === 'ok' ? 'var(--text-heading)' : INK[r.state], sel, bg: sel ? 'var(--bg-accent)' : 'transparent',
        cells: r.cells.map(c => ({ key: c.key, msShow: c.msF || '—', msTone: c.msF ? 'var(--text-heading)' : 'var(--text-disabled)', lossF: c.lossF, lossTone: c.lossF && c.lossF !== '0.00%' ? 'var(--error)' : 'var(--text-light)', title: c.title })),
        go: () => set({ pathSel: sel ? null : r.key }) }; });
    const pathDetail = pathSelRow ? `${pathSelRow.label}, ${pathSelRow.site} to ${pathSelRow.where}: ${pathSelRow.hops.slice(1).map(h => `${h.name} ${h.ms} ms`).join(' › ')}` : 'Pick a row to see its hops.';
    // What changed (notes, 2026-09-30, B2): the Since window's changes, lined up with the problems they preceded.
    const DAY = 86400000, winMs = winDaysOf(s) * DAY, fromMs = nowMs - winMs;
    const dayF = (t) => new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Chicago' });
    const KIND = { config: ['Config', 'var(--link)'], route: ['Route', 'var(--error)'], maintenance: ['Maintenance', 'var(--warning)'] };
    const regName = (id) => { const r = (est0.regionsList || []).find(x => x.region === id); return r ? `${r.cloud} ${r.region}` : (id || ''); };
    const changeAll = (incChanges || []).filter(x => (x.upcoming ? x.at <= nowMs + 14 * DAY : x.at >= fromMs && x.at <= nowMs)).map(x => { const pb = x.linedUp ? probs.find(p => p.key === x.linedUp) : null;
      return { key: x.key, at: x.at, upcoming: !!x.upcoming, whenF: x.upcoming ? `${dayF(x.at)}, planned` : nowMs - x.at < DAY ? SCH.hhmm(x.at) : dayF(x.at), kind: (KIND[x.kind] || [x.kind])[0], dot: (KIND[x.kind] || [0, 'var(--text-light)'])[1],
        text: x.text, touched: regName(x.region), source: x.source || '', lineF: pb ? `${pb.where} · ${pb.thing}: ${pb.what}` : '', lined: !!pb }; });
    const pctOf = (t) => `${Math.max(0, Math.min(100, (t - fromMs) / winMs * 100)).toFixed(2)}%`;
    const chgTicks = changeAll.filter(x => !x.upcoming).map(x => ({ key: x.key, left: pctOf(x.at), color: x.dot, title: `${x.whenF} · ${x.kind} · ${x.text}` }));
    const chgBands = probs.filter(p => p.startedAt).map(p => ({ key: p.key, left: `${Math.min(98.8, parseFloat(pctOf(Math.max(fromMs, p.startedAt))))}%`, width: `${Math.max(1.2, (nowMs - Math.max(fromMs, p.startedAt)) / winMs * 100).toFixed(2)}%`, title: `${p.where} · ${p.thing}: ${p.what} · started ${SCH.hhmm(p.startedAt)}` }));
    const stateOfKey = (k) => { const ev = (life[k] && life[k].events) || []; return ev.length ? ev[ev.length - 1].state : 'open'; };
    const problemRows = probs.map(p => { const st = stateOfKey(p.key), n = p.apps.length;
      // The state in words beside its dot (review, 2026-09-30): Down, Over SLO and At risk never rest on colour alone.
      return { key: p.key, state: p.state, stateWord: F.HEALTH_WORD[p.state] || '', dot: INK[p.state] || 'var(--warning)', rad: F.healthRadius(p.state), where: p.where, thing: p.thing, what: p.what, ownerLabel: p.ownerLabel,
        appsF: `${n} ${n === 1 ? 'app' : 'apps'} · ${(p.wl || 0).toLocaleString('en-US')} workloads`,
        startedF: `Started ${SCH.hhmm(p.startedAt)} · ${SCH.agoOf(p.startedAt, nowMs)}`, changeF: p.change ? `${p.change.text} at ${SCH.hhmm(p.change.at)}` : '', hasChange: !!p.change,
        ticketed: st === 'progress', ticketF: st === 'progress' ? `${tid(p.key)} · In progress` : '', canTicket: st !== 'progress',
        ticket: moveF({ key: p.key }, 'progress', { note: `Ticket ${tid(p.key)} opened, routed to ${p.ownerLabel}` }),
        trace: () => { const k = pathKeyFor(p), ix = Math.max(0, pathAll.findIndex(r => r.key === k)); set({ obPanel: 'paths', pathSel: k, pathsPage: Math.floor(ix / 8), mapRegion: p.region }); } }; });
    // By segment (notes, 2026-09-30): the stakeholder's nine rows, who answers for
    // each piece and what the product can see of it; a row drills in place.
    const healthView = s.healthView === 'segment' ? 'segment' : 'app';
    const healthViews = [['app', 'By app'], ['segment', 'By segment']].map(([k, l]) => { const on = healthView === k; return { key: k, label: l, on, ...seg(on), go: () => set({ healthView: k, segOpen: null, segTrail: [], segPage: 0 }) }; });
    const dotOf = (state, limited) => { const ink = INK[state] || 'var(--text-disabled)';
      return { rad: F.healthRadius(state), bg: state === 'nodata' || state === 'none' || limited ? 'transparent' : ink, border: state === 'nodata' ? '1.5px dashed var(--text-disabled)' : state === 'none' ? '1.5px solid var(--border-secondary)' : limited ? `2px solid ${ink}` : '0' }; };
    const NOUN = { access: ['site', 'sites'], access3p: ['site', 'sites'], ipsec: ['site', 'sites'], backbone: ['backbone', 'backbone'], onramp: ['on-ramp', 'on-ramps'], cloudlink: ['connection', 'connections'], hub: ['hub', 'hubs'], exit: ['region', 'regions'], app: ['region', 'regions'] };
    const countLine = (counts, noun) => { const n = counts.n; if (!n) return ''; const bad = [['down', 'down'], ['slo', 'over SLO'], ['risk', 'at risk'], ['nodata', 'not yet measured']].filter(([k]) => counts[k]).map(([k, w]) => `${counts[k].toLocaleString('en-US')} ${w}`);
      return [`${n.toLocaleString('en-US')} ${n === 1 ? noun[0] : noun[1]}`, ...bad].join(' · '); };
    const segT = G.segmentTable(segCtx.est, segCtx);
    const segRows = segT.map(r => { const st = !r.counts.n ? 'none' : !r.measured ? 'nodata' : r.now.state, open = !!r.counts.n;
      const nowText = !r.counts.n ? 'None on this estate' : !r.measured ? 'Not yet measured' : st === 'ok' || st === 'nodata' ? 'Healthy' : `${r.now.where} · ${r.now.why}`;
      return { key: r.key, label: r.label, ownerLabel: r.ownerLabel, show: r.show, source: r.source, limited: r.limited, measured: r.measured, state: st, ...dotOf(st, r.limited), nowText, nowSub: [countLine(r.counts, NOUN[r.key]), r.counts.n ? r.gap : ''].filter(Boolean).join(' · '), canOpen: open, cursor: open ? 'pointer' : 'default', caret: open ? '›' : '',
        open: open ? () => set({ segOpen: r.key, segTrail: [], segPage: 0 }) : () => {} }; });
    const segKey = healthView === 'segment' && segRows.some(r => r.key === s.segOpen && r.canOpen) ? s.segOpen : null;
    const segTrail = segKey && Array.isArray(s.segTrail) ? s.segTrail : [];
    const drill = segKey ? G.segmentDrill(segCtx.est, segCtx, segKey, segTrail) : null;
    const segNoun = segKey ? NOUN[segKey] : ['', ''];
    const segLim = !!(segKey && segRows.find(r => r.key === segKey).limited);
    const segDrillRows = drill ? drill.rows.map(x => { const st = x.state, can = !x.leaf && !!x.drillKey;
      const sub = x.leaf ? x.sub : [countLine(x.counts, G.SITE_ROWS.has(segKey) ? ['site', 'sites'] : segNoun), x.worst && x.worst.state !== 'ok' && x.worst.state !== 'nodata' ? `${x.worst.where}: ${x.worst.why}` : ''].filter(Boolean).join(' · ');
      return { key: x.key, name: x.leaf && x.n > 1 ? `${x.name} (${x.n.toLocaleString('en-US')})` : x.name, sub, state: st, ...dotOf(st, segLim), canGo: can, caret: can ? '›' : '', cursor: can ? 'pointer' : 'default',
        go: can ? () => set({ segTrail: [...segTrail, x.drillKey], segPage: 0 }) : () => {} }; }) : [];
    const segLabelOf = (k) => { const v = String(k).replace(/^(region|state|cloud):/, ''); return String(k).startsWith('state:') ? S.placeName(v === '—' ? '' : v) : v; };
    const segHead = segKey ? segRows.find(r => r.key === segKey) : null;
    const segCrumbs = segKey ? [{ key: 'root', label: 'All segments', to: null }, { key: segKey, label: segHead.label.replace(/ \(.*\)$/, ''), to: [] }, ...segTrail.map((k, i) => ({ key: k, label: segLabelOf(k), to: segTrail.slice(0, i + 1) }))]
      .map((c, i, a) => ({ ...c, notLast: i < a.length - 1, weight: i === a.length - 1 ? 700 : 500, color: i === a.length - 1 ? 'var(--text-heading)' : 'var(--link)', go: () => set(c.to ? { segTrail: c.to, segPage: 0 } : { segOpen: null, segTrail: [], segPage: 0 }) })) : [];
    const pathVals = { pathTimeAll: pathAll, pathTimeRows, pathDetail, pathLine: `Is it fast? Each app group on its slowest path, from the site that sends it the most. SLO ${F.SLO_PRIVATE} ms on AT&T, ${F.SLO} ms outside.`, hasPaths: pathAll.length > 0, noPaths: !pathAll.length,
      changeAll, changeRows: changeAll, chgTicks, chgBands, chgFrom: winLabelOf(s), hasChanges: changeAll.length > 0, noChanges: !changeAll.length,
      chgLegend: [['var(--error)', 'Route'], ['var(--link)', 'Config'], ['var(--warning)', 'Maintenance']].map(([color, label]) => ({ key: label, color, label })) };
    return { ...pathVals, pathFlowAll: all, pathFlowRows: rows, segHeads, healthTiles, problemRows, hasProblems: problemRows.length > 0,
      healthViews, healthByApp: healthView === 'app', healthBySegment: healthView === 'segment', segRows, segOpen: !!segKey, segTable: healthView === 'segment' && !segKey, segLevel: drill ? drill.level : null, segDrillRows, segCrumbs,
      segOwner: segHead ? segHead.ownerLabel : '', segSource: segHead ? segHead.source : '', segLimited: !!(segHead && segHead.limited) };
  })();
  // Insights > Operations (notes, 2026-09-30, C1): tickets, how long fixes take,
  // availability against each holder's target, and what changed. Open counts
  // ignore Since; fixes and time to fix follow it. The closed history is a sample.
  const opsVals = (() => {
    const days = winDaysOf(s), nowMs = SCH.nowOf(s), winL = winLabelOf(s);
    const dayF = (t) => new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Chicago' });
    const noteTicket = (k) => { const e = (((life[k] || {}).events) || []).slice().reverse().find(x => /^Ticket T-\d{4}/.test(x.note || '')); return e ? e.note.match(/T-\d{4}/)[0] : null; };
    const tickets = lifeRows.filter(x => x.l.state === 'progress' && noteTicket(x.f.key)).map(x => { const ev = x.l.events || [];
      return { key: x.f.key, sev: 2, where: x.f.where || '', thing: '', what: x.f.title || x.f.kind, owner: 'AT&T', openedAt: ev.length ? +new Date(ev[ev.length - 1].at) : nowMs }; });
    const T = OD.ticketStats(est0, { probs, tickets, now: nowMs, days });
    const AV = OD.availability(est0, { probs, now: nowMs, days });
    const andiOn = s.andiTickets !== false;
    const opsPanel = ['overview', 'tickets', 'avail', 'changes'].includes(s.opsPanel) ? s.opsPanel : 'overview';
    const opsPanels = [['overview', 'Overview'], ['tickets', `Tickets · ${T.openN}`], ['avail', 'Availability'], ['changes', 'Maintenance & Changes']].map(([k, l]) => { const on = opsPanel === k;
      return { key: k, label: l, on, go: () => set({ opsPanel: k }), line: on ? 'var(--cta)' : 'transparent', color: on ? 'var(--text-heading)' : 'var(--text-light)', weight: on ? 700 : 500 }; });
    const none = !T.openN && !T.hasHistory;
    const opsLine = none ? 'No tickets yet. Nothing has been opened or fixed.' : `${T.sev1Open} Sev 1 open now. ${T.openN} ${T.openN === 1 ? 'ticket' : 'tickets'} open. ${T.fixedN ? `Fixes took ${T.mttrF} on average.` : `Nothing was fixed in the last ${winL}.`}`;
    const opsTiles = [
      { key: 'sev1', l: 'Sev 1 open', v: String(T.sev1Open), u: 'now', tone: T.sev1Open ? 'var(--error)' : 'var(--text-heading)' },
      { key: 'open', l: 'Open tickets', v: String(T.openN), u: 'now', tone: 'var(--text-heading)' },
      { key: 'fixed', l: 'Fixed', v: String(T.fixedN), u: `in ${winL}`, tone: 'var(--text-heading)' },
      { key: 'mttr', l: 'Time to fix', v: T.fixedN ? T.mttrF : '—', u: T.fixedN ? 'on average' : '', tone: 'var(--text-heading)' },
    ];
    const ticketAll = T.open.map(t => { const manual = noteTicket(t.key), id = manual || (andiOn && t.kind === 'problem' ? tid(t.key) : null);
      return { key: t.key, sevF: `Sev ${t.sev}`, sevTone: t.sev === 1 ? 'var(--error)' : 'var(--warning)', what: t.what, where: t.thing ? `${t.where} · ${t.thing}` : t.where, owner: t.owner,
        openedF: t.openedAt ? `${SCH.hhmm(t.openedAt)} · ${SCH.agoOf(t.openedAt, nowMs)}` : '', ticketF: manual ? `${manual} · In progress` : id ? `${id} · opened by Andi` : 'No ticket yet', canTicket: !id,
        ticket: moveF({ key: t.key }, 'progress', { note: `Ticket ${tid(t.key)} opened, routed to ${t.owner}` }) }; });
    const fixAll = T.closed.map(x => ({ key: x.key, whenF: dayF(x.closedAt), sevF: `Sev ${x.sev}`, what: x.what, where: x.where, owner: x.owner, tookF: OD.durF(x.fixMin) }));
    const pctF = (u) => (u >= 1 ? '100%' : `${(Math.floor(u * 10000) / 100).toFixed(2)}%`);
    const availRows = AV.map(r => ({ key: r.key, where: r.where, owner: r.owner, targetF: `${r.target}%`, uptimeF: pctF(r.uptime), outageF: r.outageMin ? OD.durF(r.outageMin) : 'None', metF: r.met ? 'Met' : 'Missed', metTone: r.met ? 'var(--success)' : 'var(--error)' }));
    const chg = healthVals.changeAll || [];
    const maintAll = chg.filter(x => x.kind === 'Maintenance');
    const comingUp = maintAll.filter(x => x.upcoming && x.at > nowMs);
    return { opsFacts: { sev1: T.sev1Open, openN: T.openN, fixedN: T.fixedN, mttrF: T.fixedN ? T.mttrF : '' }, opsPanels, opsPanelOverview: opsPanel === 'overview', opsPanelTickets: opsPanel === 'tickets', opsPanelAvail: opsPanel === 'avail', opsPanelChanges: opsPanel === 'changes',
      opsLine, opsTiles,
      ticketAll, ticketRows: ticketAll, hasTickets: ticketAll.length > 0, noTickets: !ticketAll.length,
      andiTicketsLabel: `Andi opens a ticket for each new incident: ${andiOn ? 'On' : 'Off'}`, andiTicketsOn: andiOn, toggleAndiTickets: () => set({ andiTickets: !andiOn }),
      fixAll, fixRows: fixAll, hasFixes: fixAll.length > 0, noFixes: !fixAll.length, fixLabel: `Fixed in the last ${winL} · sample history`, fixEmpty: `Nothing was fixed in the last ${winL}.`,
      availAll: AV, availRows, hasAvail: AV.length > 0, noAvail: !AV.length, availLine: AV.length ? `${AV.filter(r => r.met).length} of ${AV.length} connections met their target over the last ${winL}. Uptime counts Sev 1 outage minutes, open ones and the sample history; targets are NetBond 99.99%, cloud provider 99.9%, public internet 99.5%.` : 'No connections to measure yet.',
      maintAll, comingUp, hasComing: comingUp.length > 0, opsChangeRows: chg.filter(x => !x.upcoming), hasOpsChanges: chg.some(x => !x.upcoming), noOpsChanges: !chg.some(x => !x.upcoming), opsChangeEmpty: `No changes in the last ${winL}.`, opsChangeLabel: `In the last ${winL}` };
  })();
  // Insights > Your actions (notes, 2026-09-30, C2): that role's findings, never
  // events, each with its recommendation. Do it waits; Accept and Defer move the
  // finding's life. A stand-in until the reference file arrives (D-10).
  const roleVals = (() => {
    const rk = roleKeyOf(s), role = ROLE_OF[rk], nowMs = SCH.nowOf(s);
    const cad = SCH.BRIEF_CHOICES.find(b => b.id === ((s.briefCfg || {}).cadence || 'monthly')) || SCH.BRIEF_CHOICES[0];
    const nextBrief = cad.schedule ? SCH.nextRunAt(cad.schedule, nowMs) : null;
    const deferDays = nextBrief ? Math.max(1, Math.ceil((nextBrief - nowMs) / 86400000)) : 7;
    const deferWhen = nextBrief ? new Date(nextBrief).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) : '';
    const live = lifeRows.filter(x => !x.f.event && !['resolved', 'dismissed'].includes(x.l.state));
    const personaOf = (f) => PNAME[f.persona] || f.persona;
    const picked = rk === 'exec' ? live.filter(x => x.f.priced && OPEN_STATES.includes(x.l.state)).sort((a, b) => b.f.save - a.f.save).slice(0, 3)
      : rk === 'architect' ? live.filter(x => x.f.pillar === 'Private reach' || x.f.kind === 'crosscloud')
      : live.filter(x => personaOf(x.f) === role.name);
    const recOf = (f) => (f.ladder && (f.ladder[1] || f.ladder[0])) || 'Review it with AT&T';
    const acts = picked.map(({ f, l }) => { const st = l.state, rec = recOf(f), k = { key: f.kind };
      return { key: f.kind, head: f.head, saveLine: f.priced ? `Save ${fmt(f.save)}/mo` : '', hasSave: !!f.priced, rec: `Recommended: ${rec}`, stateLabel: l.label,
        canAccept: st === 'open' || st === 'snoozed', accept: moveF(k, 'ack', { note: `Accepted: ${rec}` }),
        canDefer: st === 'open', defer: moveF(k, 'snoozed', { snoozeDays: deferDays, note: deferWhen ? `Deferred to the ${deferWhen} briefing` : 'Deferred' }),
        canStart: st === 'ack', start: moveF(k, 'progress'), canSnooze: st === 'ack', snooze: moveF(k, 'snoozed', { snoozeDays: deferDays }), hasDoor: false, doorLabel: '', door: () => {} }; });
    const ports = rk === 'architect' ? OD.capacity(conns, s.obWindow || '30d').filter(r => r.peakPct >= 80).map(r => { const reg = est0.regionsList.find(x => x.region === r.region) || { region: r.region, wl: 0 };
      return { key: 'cap-' + r.region, head: `${r.cloud} ${r.region} peaks at ${r.peakPct}% of ${r.bw || r.ports + ' × 10 Gbps'}`, saveLine: '', hasSave: false, rec: 'Recommended: Add a port', stateLabel: 'Open',
        canAccept: false, canDefer: false, canStart: false, canSnooze: false, hasDoor: true, doorLabel: 'Add a port', door: composeFor(go, reg), accept: () => {}, defer: () => {}, start: () => {}, snooze: () => {} }; }) : [];
    const all = [...acts, ...ports];
    const roleEmpty = all.length ? '' : rk === 'exec' ? 'Nothing priced on the table.' : 'Nothing to act on yet. What AT&T finds for this role lands here.';
    const roleChips = ['architect', 'neteng', 'security', 'finops', 'exec'].map(k => { const on = k === rk; return { key: k, label: ROLE_OF[k].short, on, ...seg(on), go: () => set({ persona: k, rolePage: 0 }) }; });
    return { roleChips, roleTitle: `Actions for ${role.short}`, roleHead: plNow.line, roleCta: plNow.cta, roleGo: plNow.go, roleActAll: all, roleActRows: all, hasRoleActs: all.length > 0,
      roleEmpty, hasRoleEmpty: !all.length, hasRoleEmptyGo: !all.length && rk === 'exec', roleEmptyGo: () => set({ insPanel: 'ops', opsPanel: 'overview' }) };
  })();
  const dash = { ...mixVals, ...insightVals, ...healthVals, ...opsVals, ...roleVals, dashTiles, queueRows, hasQueue: queueRows.length > 0, queueCount: String(queueRows.length), queueOpen: queueRows.length > 0 && !!s.queueOpen, queueClosed: !(queueRows.length > 0 && !!s.queueOpen), openQueue: () => set({ obPanel: 'health', queueOpen: false }), closeQueue: () => set({ queueOpen: false }), plKicker: 'For ' + personaNow, plLine: plNow.line, plCta: plNow.cta, plGo: plNow.go,
    // Node names read as labels (13px) and their numbers as meta (12px) on screen.
    obPanels, obPanelMap: obPanel === 'map', obPanelTime: obPanel === 'time', obPanelWhere: obPanel === 'where', obPanelHealth: obPanel === 'health', obPanelPaths: obPanel === 'paths', obPanelChanges: obPanel === 'changes', obPanelConn: obPanel === 'conn', flowTiles, flowViews, flowPaths, otBars, otTiles, otGrains, hasOverTime: otBars.length > 0, otFrom: otEnds[0], otTo: otEnds[1], otOutFill: dark ? '#ffa25e' : '#e07b00', otFabFill: dark ? '#3374cc' : '#0057b8', mapNodes: mapNodes.map(n => ({ ...n, labelFs: graphUnits(13, map.W) + 'px', valueFs: graphUnits(12, map.W) + 'px' })), mapRibbons, mapTrace, mapHeads, mapVB: `0 0 ${map.W} ${map.H}`, patternWhy, patterns,
    scopeDims, scopeMembers, hasScopeMembers: scopeMembers.length > 0 && !!s.obPickOpen, scopeLabel, mapTotal: mapG.total, mapP95: perf.p95,
    // The Cost view prices traffic only; the door opens the three legs (notes, 2026-09-30, A2).
    costScopeOn: mapMode === 'cost', costScopeLine: 'Traffic only · every leg in Cost ›', costScopeGo: () => go('s3', { layer: 'cloud', tab: 'cost', costPanel: 'legs' })(),
    // The legend says what the colors mean in the view you are in.
    mapLegend: (mapMode === 'cost' ? [['#0057b8', 'On AT&T, at your AT&T rate'], [dark ? '#ffa25e' : '#e07b00', 'Outside AT&T, at egress rates']]
      : mapMode === 'slo' ? [[HEALTH_FILL.ok, 'Within SLO'], [HEALTH_FILL.risk, 'Near SLO'], [HEALTH_FILL.slo, 'Over SLO']]
      : [['#3374cc', 'On AT&T'], ['#8a949c', 'Outside AT&T'], ['var(--error)', 'Degraded'], [HEALTH_FILL.slo, 'Over SLO']]).map(([color, label]) => ({ key: label, color, label })),
    // Health filters the map (Micah, 2026-09-29: "on observe, add a 'health' filter").
    healthChips: [['all', 'All'], ['ok', 'Healthy'], ['risk', 'At risk'], ['slo', 'Over SLO']].map(([k, l]) => { const on = mapHealth === k; return { key: k, label: l, on, ...seg(on), go: () => set({ mapHealth: k }) }; }),
    // Replay plays the Since window, not a fixed 24 hours (2026-09-29).
    replayLabel: (s.obWindow || '30d') === '1h' ? 'Replay the last hour' : `Replay ${winLabelOf(s)}`,
    replayFrom: (s.obWindow || '30d') === '1h' ? '1 hour ago' : `${winLabelOf(s)} ago`,
    mapMoment: mapT == null ? winLabelOf(s) : (() => { const d = (1 - mapT) * winDaysOf(s); return d <= 0.001 ? 'now' : d >= 2 ? `${Math.round(d)} days ago` : d * 24 >= 2 ? `${Math.round(d * 24)} hours ago` : `${Math.max(1, Math.round(d * 1440))} minutes ago`; })(),
    clearScope: () => set({ obScope: 'all', obDim: 'all', obPickOpen: false, mapOpen: [], mapSel: null }), scopeIsAll: !obScope || obScope === 'all',
    mapFiltersOpen, mapFiltersShut: !mapFiltersOpen,
    toggleMapFilters: () => set({ mapFiltersOpen: !mapFiltersOpen }),
    mapFilterSummary: mapFiltersOn
      ? `${(patterns.find(p => p.on) || {}).label} · ${(modes.find(m => m.on) || {}).label}${mapRegion ? ' · ' + mapRegion : ''}`
      : 'All flows · coloured by state',
    mapFilterCount: mapFiltersOn ? `${mapFiltersOn} filter${mapFiltersOn === 1 ? '' : 's'}` : 'No filters',
    mapFilterToggleWord: mapFiltersOpen ? 'Hide' : 'Show', mapZoomLabel: map.zoom ? `zoomed ×${map.zf.toFixed(1)}` : '', hasMapZoom: !!map.zoom, mapSub: `${map.total.toFixed(1)} Gbps now, compared with ${winLabelOf(s)} · what the sites send, ${MIX.crossed > 0.001 ? Math.round(map.total / MIX.crossed * 100) : 0}% of everything that crosses a mid mile · ${Math.round(map.fabV / (map.total || 1) * 100)}% of it on AT&T${mapRegion ? ' · filtered to ' + mapRegion : ''}${mapT != null ? ' · ' + Math.round(24 - mapT * 24) + 'h ago' : ''}`, mapTrail, hasMapTrail: mapTrail.length > 0,
    // The trail sits over the column that was drilled: a cloud's never over the sites (2026-09-29).
    bwTiles, hasBwTiles: bwTiles.length > 0,
    mapTrailSide: /^(cloud|dc|dest):/.test(trailKey || '') ? 'r' : 'l', mapTrailPos: /^(cloud|dc|dest):/.test(trailKey || '') ? 'right:132px' : 'left:72px', mapUp: climb, canClimb: !!mapSel, mapKey, modes, hasMapRegion: !!mapRegion, mapRegion: mapRegion || '', clearMapRegion: () => set({ mapRegion: null }), mapT: mapT == null ? 100 : Math.round(mapT * 100), setMapT: (e) => set({ mapT: +e.target.value / 100 }), mapPlaying: !!s.mapPlay, playLabel: s.mapPlay ? '❚❚' : '▶', playMap, resetMapT: () => set({ mapT: null }), replayOpen: !!s.replayOpen, toggleReplay: () => set({ replayOpen: !s.replayOpen, mapPlay: false, mapT: s.replayOpen ? null : s.mapT }), wholeWindow: () => set({ mapT: null, mapPlay: false }), gaugeRows, hasGauges: gaugeRows.length > 0, noGauges: gaugeRows.length === 0, panel, hasPanel: !!panel, hasPanelOverlay: !!panel, drawerRight: panel ? '380px' : '0px', noPanel: !panel, dashCols: 'minmax(0,1fr)', mapJumpOpen: !!s.mapJumpOpen, mapJumpQ: s.mapJumpQ || '', setMapJumpQ: (e) => set({ mapJumpQ: e.target.value }), mapJumpKey: (e) => { if (e.key === 'Enter') jumpTo(s.mapJumpQ); if (e.key === 'Escape') set({ mapJumpOpen: false }); }, openJump: () => set({ mapJumpOpen: !s.mapJumpOpen }), pins: (s.mapPins || []).map(k => ({ key: k, name: (map.nodes.find(x => x.key === k) || { name: k }).name, v: ((map.nodes.find(x => x.key === k) || { v: 0 }).v).toFixed(1) + ' Gbps', unpin: () => set({ mapPins: (s.mapPins || []).filter(x => x !== k) }) })), hasPins: (s.mapPins || []).length > 0 };
  // Sources (Micah, 14:33: "where can I connect to my current ecosystem?"): what feeds the
  // picture, and the door to add more. The cloud rows are a read of est.accounts through
  // scheduleView; the AT&T rows are inventory AT&T keeps live, not a credential the customer
  // schedules, so they carry no cadence control.
  const acctRow = (a) => ({
    key: 'src:' + a.id, name: a.name, kind: a.cloud, cred: a.cred, scope: a.scope,
    // The run record is written when the scan starts, so this label read
    // "just now" for the two seconds the scan was still running.
    seen: s.scanBusy ? 'scanning…' : SCH.agoLabel(a.lastRun, sched.nowMs),
    nextSeen: SCH.nextLabel(a.schedule, a.nextRun, sched.nowMs),
    cadenceValue: SCH.scheduleId(a.schedule), cadenceLabel: SCH.scheduleLabel(a.schedule),
    setCadence: sched.setSchedule([a.id]), canSchedule: true, noSchedule: false,
    sub: `${a.scope} · ${SCH.scheduleLabel(a.schedule).toLowerCase()}`,
    state: 'Connected', dot: 'var(--success)', rescan: sched.runNow([a.id], 'manual'),
  });
  const attRow = (key, name, scope, sub) => ({
    key, name, kind: 'AT&T', cred: 'AT&T inventory', scope, seen: 'live', nextSeen: 'continuous',
    cadenceValue: '', cadenceLabel: 'AT&T inventory', setCadence: () => {},
    canSchedule: false, noSchedule: true, sub, state: 'Connected', dot: 'var(--success)',
    rescan: sched.runNow(sched.accounts.map(a => a.id), 'manual'),
  });
  const connWord = conns.total === 1 ? 'connection' : 'connections';
  const siteN = (est0.sitesCount || est0.sites.length).toLocaleString('en-US');
  const rawSources = [
    ...sched.accounts.map(acctRow),
    ...(conns.total ? [attRow('src:netbond', 'NetBond inventory', `${conns.total} ${connWord}`, `${conns.total} ${connWord} · live`)] : []),
    ...(est0.sites.length ? [attRow('src:sites', 'AVPN and access sites', `${siteN} sites`, `${siteN} sites · from AT&T inventory`)] : []),
  ];
  const sources = rawSources.map(r => ({ ...r,
    edit: () => set({ sub: { page: 'discover', panel: 'add' }, sourceEdit: r.key }),
    // A source added in this session comes back out the same way (2026-09-30).
    remove: () => { const m = /^src:added-(\d+)-/.exec(r.key); if (!m) return; const mine = (s.addedSources || []).filter(a => a.estId === est.id); const drop = mine[+m[1]];
      set({ addedSources: (s.addedSources || []).filter(a => a !== drop), cloudTrailE: [], cloudPage: 0 }); },
    canRemove: /^src:added-/.test(r.key) }));
  // What the last added source found, said once on the Sources page, with a way in.
  const foundVals = (() => {
    const mine = (s.addedSources || []).filter(a => a.estId === est.id), last = mine[mine.length - 1];
    const regs = last ? est.regionsList.filter(r => r.fresh && r.via === (last.name || last.provider)) : [];
    if (!last || !regs.length) return { hasFound: false, foundLine: '', seeFound: () => {}, foundAttach: () => {} };
    const cloud = regs[0].cloud, noun = cloud === 'Azure' ? 'VNets' : cloud === 'Oracle' ? 'VCNs' : 'VPCs';
    const vpcN = inv.flatMap(c => c.regions || []).filter(r => regs.some(x => x.region === r.region)).reduce((a, r) => a + (r.vpcs || []).length, 0);
    const wl = regs.reduce((a, r) => a + (r.wl || 0), 0), pub = regs.every(r => !r.priv);
    return { hasFound: true, foundLine: `Discovery found ${regs.length} ${cloud} ${regs.length === 1 ? 'region' : 'regions'}, ${vpcN} ${noun} and ${wl.toLocaleString('en-US')} workloads. ${pub ? (regs.length === 2 ? 'Both ride' : regs.length === 1 ? 'It rides' : 'All ride') : 'Some ride'} the public internet.`,
      seeFound: () => set({ screen: 's1', discoverView: 'estate', estPanel: 'clouds', cloudTrailE: ['cloud:' + cloud], cloudPage: 0 }), foundAttach: composeFor(go, regs[0]) };
  })();
  const credScanned = sources.filter(x => x.state === 'Connected').length;
  const gapVals = { candGroups, hasCands: candGroups.length > 0, noCands: candGroups.length === 0, gapRows, hasGap: gapRows.length > 0, noGap: gapRows.length === 0, gapSummary, gapCount: String(gapRows.length) };
  const obX = { ...foundVals, sources, sourcesSub: `${credScanned} connected · ${sched.cadence.empty ? 'nothing on a schedule yet' : sched.cadence.label.toLowerCase()}`, ...(() => {
      // One drawer adds a source or edits one: which cloud (adding only), then its
      // credential, scope and schedule. AT&T inventory has nothing to manage.
      const CRED_OPTS = { AWS: ['Cross-account role', 'Access keys'], Azure: ['Service principal', 'Managed identity'], GCP: ['Service account', 'Workload identity federation'], Oracle: ['API signing key'], CoreWeave: ['API key'] };
      const editing = s.sourceEdit ? sources.find(r => r.key === s.sourceEdit) : null;
      const provOf = (kind) => (/aws/i.test(kind) ? 'AWS' : /azure/i.test(kind) ? 'Azure' : /gcp|google/i.test(kind) ? 'GCP' : /oracle/i.test(kind) ? 'Oracle' : /coreweave/i.test(kind) ? 'CoreWeave' : null);
      const prov = editing ? provOf(editing.kind) : (s.intakeSource === 'inventory' ? null : (s.intakeProvider || 'AWS'));
      const creds = prov ? CRED_OPTS[prov] || [] : [];
      const tile = ['AWS', 'Azure', 'Google Cloud', 'Oracle Cloud', 'CoreWeave'][['AWS', 'Azure', 'GCP', 'Oracle', 'CoreWeave'].indexOf(prov)];
      return {
        srcEditing: !!editing, srcAdding: !editing, srcEditName: editing ? editing.name : '', srcEditKind: editing ? `${editing.kind} · ${editing.scope}` : '',
        srcHasCred: !!prov, srcNoCred: !prov, srcCred: s.srcCred && creds.includes(s.srcCred) ? s.srcCred : (editing && creds.includes(editing.cred) ? editing.cred : creds[0] || ''),
        srcCredOpts: creds.map(o => { const on = o === (s.srcCred && creds.includes(s.srcCred) ? s.srcCred : (editing && creds.includes(editing.cred) ? editing.cred : creds[0])); return { key: o, label: o, on, border: on ? 'var(--cta)' : 'var(--border-secondary)', bg: on ? 'var(--bg-accent)' : 'var(--bg-base)', pick: () => set({ srcCred: o }) }; }),
        setSrcCred: (e) => set({ srcCred: e.target.value }), srcScope: s.srcScope || 'Read-only, all regions', setSrcScope: (e) => set({ srcScope: e.target.value }),
        srcCadence: editing && editing.canSchedule ? editing.cadenceValue : (s.srcCadence || 'nightly'), setSrcCadence: editing && editing.canSchedule ? editing.setCadence : (e) => set({ srcCadence: e.target.value }),
        srcCanSchedule: !editing || editing.canSchedule, srcInventoryNote: editing && !editing.canSchedule ? 'AT&T keeps this inventory live. There is no credential or schedule to manage.' : 'AT&T inventory needs no credential; AT&T keeps it live.',
        srcDoneLabel: editing ? 'Save' : 'Add and scan', srcRescan: editing ? editing.rescan : () => {}, srcCanRescan: !!editing,
        openAddSource: () => set({ sub: { page: 'discover', panel: 'add' }, sourceEdit: null, srcCred: null }),
        // Adding a cloud account adds it to this estate and discovers what it holds (2026-09-30);
        // AT&T inventory is already live, so it adds nothing.
        addSource: () => set(editing || !prov
          ? { sub: null, sourceEdit: null, srcCred: null, ...(editing ? {} : { screen: 's1', discoverView: 'sources' }) }
          : { addedSources: [...(s.addedSources || []), { provider: prov, name: `${tile} account`, cred: s.srcCred && creds.includes(s.srcCred) ? s.srcCred : creds[0] || '', cadence: s.srcCadence || 'nightly', at: SCH.nowOf(s), estId: est.id }], sub: null, sourceEdit: null, srcCred: null, screen: 's1', discoverView: 'sources' }),
      };
    })(), ...dash, nextStop, connectNext, governNext, costNext,
    // Next stop is a button in the title row, not a strip (2026-09-28, no scrolling).
    ...(() => { const nx = s.screen === 's3' ? { connect: connectNext, observe: nextStop, govern: governNext, cost: costNext }[s.tab] : null; return { hasPageNext: !!(nx && nx.title), discDivider: !!(nx && nx.title) && s.tab === 'connect', pageNext: nx && nx.title ? { label: nx.title.replace(/^Next stop:\s*/, 'Next: '), text: nx.text || '', go: nx.go } : { label: '', text: '', go: () => {} } }; })(), obIsPerf: obPage !== 'insights' && obPage !== 'logs', obIsInsights: obPage === 'insights', obIsLogsPage: obPage === 'logs', obIsSec: false, obIsLogs: obTab === 'control', obTiles, connRows, hasConns: conns.rows.length > 0, connHead: `${conns.total} ${conns.total === 1 ? 'connection' : 'connections'}`, connSub: conns.degraded ? `${conns.degraded} degraded · ${conns.rows.filter(r => r.state === 'Saturating').length} saturating` : conns.rows.some(r => r.state === 'Saturating') ? `${conns.rows.filter(r => r.state === 'Saturating').length} saturating · none degraded` : 'all up', impact, patternCards, logChips, logPattern, flowRecords, flowRecordCount: `${flowRecords.length} records`, logsPatternLabel: (logChips.find(ch => ch.on) || {}).label || 'All', goGovern: go('s3', { layer: 'cloud', tab: 'govern' }), goPerf: () => set({ obPage: 'perf', obTab: 'flow' }), closeLogs: () => set({ obTab: 'flow' }) };
  // The Observe drawer's Policies and Tags (2026-09-28). The same policies
  // Govern lists and the same tags the inventory carries, read against each
  // other: what each policy caught, and which tags no policy covers yet.
  // Every door leaves for Govern and closes the drawer.
  const toGovern = (extra) => () => { go('s3', { layer: 'cloud', tab: 'govern', sub: null })(); set({ ...(extra || {}), scrollToSec: 'sec-policies', scrollNonce: (s.scrollNonce || 0) + 1 }); };
  const polAll = [...layerPolicies({ ...s, layer: 'cloud' }, est, 'all'), ...(s.customPolicies || [])];
  const POL_STATE = { enforced: ['Enforced', 'var(--success)'], simulated: ['Simulated', 'var(--warning)'] };
  const drawerPolicies = polAll.map(p => ({ key: p.name, name: p.name, rule: `${p.match} · ${p.req}`,
    stateWord: (POL_STATE[p.state] || ['Draft'])[0], dot: (POL_STATE[p.state] || [0, 'var(--text-disabled)'])[1],
    matched: (p.matched || 0).toLocaleString('en-US'), viol: (p.viol || 0).toLocaleString('en-US'), violColor: p.viol ? 'var(--error)' : 'var(--text-light)',
    go: toGovern() }));
  const violTotal = polAll.reduce((a, p) => a + (p.viol || 0), 0);
  const nOf = (n, one, many) => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;
  const tagKey = (x) => String(x).toLowerCase().replace(/\s+/g, '-');
  const tagPolicy = (t) => polAll.find(p => /^tag /i.test(p.match) && tagKey(p.match.slice(4)) === tagKey(t));
  const tagAgg = {};
  inv.forEach(cl => cl.regions.forEach(rg => rg.vpcs.forEach(v => v.tags.forEach(t => {
    const g = tagAgg[t] = tagAgg[t] || { name: t, vpcs: 0, wl: 0, pub: 0, regions: new Set(), clouds: new Set() };
    g.vpcs++; g.wl += v.wl || 0; if (!v.priv) g.pub++; g.regions.add(rg.region); g.clouds.add(cl.name);
  }))));
  const drawerTags = Object.values(tagAgg).sort((a, b) => b.wl - a.wl || a.name.localeCompare(b.name)).map(g => {
    const pol = tagPolicy(g.name);
    const preset = ['tag PCI', 'tag Prod', 'tag Internet-facing', 'tag GPU'].find(m => tagKey(m.slice(4)) === tagKey(g.name));
    return { key: g.name, name: g.name, chip: chip(g.name), wl: g.wl,
      sub: `${nOf(g.vpcs, 'VPC', 'VPCs')} · ${nOf(g.wl, 'workload', 'workloads')} · ${nOf(g.regions.size, 'region', 'regions')} in ${nOf(g.clouds.size, 'cloud', 'clouds')}`,
      exposure: g.pub ? `${nOf(g.pub, 'VPC', 'VPCs')} on the public internet` : 'All on AT&T', exposureColor: g.pub ? 'var(--warning)' : 'var(--text-light)',
      covered: !!pol, coverLabel: pol ? pol.name : 'No policy', coverColor: pol ? 'var(--text-heading)' : 'var(--text-light)',
      doorLabel: pol ? 'Open policy →' : 'Set policy →',
      go: pol ? toGovern() : toGovern({ authoring: { match: preset || 'tag ' + g.name, scope: 'any cloud', req: ['Private path required'] } }),
      askAndi: () => set({ andiScope: { kind: 'tag', id: g.name, label: 'tag ' + g.name }, andiOpen: true }) };
  });
  const bareTags = drawerTags.filter(t => !t.covered).length;
  const drawerVals = {
    drawerPolicies, hasDrawerPolicies: drawerPolicies.length > 0, hasDrawerPoliciesNot: !drawerPolicies.length,
    drawerPolicySub: `${nOf(polAll.length, 'policy', 'policies')} · ${polAll.filter(p => p.state === 'enforced').length} enforced · ${violTotal ? nOf(violTotal, 'violation', 'violations') : 'no violations'}`,
    drawerAuthor: toGovern({ authoring: { match: null, scope: 'any cloud', req: [] } }),
    drawerTags, hasDrawerTags: drawerTags.length > 0, hasDrawerTagsNot: !drawerTags.length,
    drawerTagSub: `${nOf(drawerTags.length, 'tag', 'tags')} · ${bareTags ? `${bareTags} with no policy` : 'every one covered by a policy'}`,
  };
  return {
    ...drawerVals,
    invTree: s.tagView ? tagTree(inv, tree, chip) : tree, tagView: !!s.tagView, cloudView: !s.tagView, toggleTagView: () => set({ tagView: !s.tagView }), tagViewUb: s.tagView ? 'var(--cta)' : 'transparent', tagViewColor: s.tagView ? 'var(--link)' : 'var(--text-body)', cloudViewUb: !s.tagView ? 'var(--cta)' : 'transparent', cloudViewColor: !s.tagView ? 'var(--link)' : 'var(--text-body)', hasTree: tree.length > 0, invStats: [{ key: 's', v: stats.sites.toLocaleString('en-US'), l: 'sites' }, { key: 'c', v: stats.clouds, l: 'clouds' }, { key: 'r', v: stats.regions, l: 'regions' }, { key: 'w', v: stats.workloads.toLocaleString('en-US'), l: 'workloads' }, { key: 'a', v: stats.attached, l: 'attached' }, { key: 'e', v: stats.exposed.toLocaleString('en-US'), l: 'exposed workloads' }],
    expandAll: () => set({ inv: { ...openMap, ...Object.fromEntries(openKeys.map(k => [k, true])) } }), collapseAll: () => set({ inv: {} }), collapsedLabel: Object.values(openMap).some(Boolean) ? 'Expanded view' : 'Collapsed view',
    // No invented split (2026-09-29 audit): nothing in the data says which of these are on AT&T.
    overflowRow: est.regionsExtra ? `${est.regionsExtra.toLocaleString('en-US')} smaller regions rolled up · no traffic data yet` : '', hasOverflow: !!est.regionsExtra, overflowW: est.regionsExtra ? '60%' : '0%',
    // Sites drilled like clouds: class → metro → site (naas-sites.js). Open state lives in s.siteOpen.
    ...(() => {
      const so = s.siteOpen || {};
      const ico = (n) => (dark ? 'brand/icons-dark/' : 'brand/icons-light/') + n + '.svg';
      const badgeOf = (on, total, unit, plural) => on >= total
        ? { label: 'all on AT&T', bg: dark ? 'rgba(79,191,116,.12)' : '#eef8f0', border: dark ? 'rgba(79,191,116,.5)' : '#8fd4a4', color: dark ? '#8fe0a8' : '#1e7a3c' }
        : { label: `${(total - on).toLocaleString('en-US')} ${total - on === 1 ? unit : plural} on a public first mile`, bg: 'var(--bg-wash)', border: 'var(--border-secondary)', color: 'var(--text-body)' };
      const pillOf = (priv) => priv
        ? { label: 'private', bg: dark ? 'rgba(79,191,116,.12)' : '#eef8f0', border: dark ? 'rgba(79,191,116,.5)' : '#8fd4a4', color: dark ? '#8fe0a8' : '#1e7a3c' }
        : { label: 'public', bg: 'var(--bg-wash)', border: 'var(--border-secondary)', color: 'var(--text-body)' };
      const door = (label, match) => () => { set({ authoring: { match, scope: 'any cloud', req: ['Private path required'] } }); go('s3', { layer: 'cloud', tab: 'govern' })(); };
      const ask = (kind, id, label) => () => set({ andiScope: { kind, id, label }, andiOpen: true });
      const site = (x, cls) => ({ ...x, key: x.key || x.id, sub: `${x.address} · ${x.ms} ms to the nearest on-ramp`, pill: pillOf(x.priv), dot: x.priv ? 'var(--success)' : 'var(--warning)', dotLabel: x.priv ? 'private' : 'exposed', ctl: door('Control', 'site ' + x.name), askAndi: ask('site', x.id, `${x.name} · ${x.metro}`), isNew: isNew(x), sinceLabel: sinceLabel(x), ...LK.ui(x.id, [S.stateOf(x.metro), x.metro, x.access || (cls.access || [])[0]]), jumpKey: 'site:' + x.id,
        pathsOpen: !!po['site:' + x.id], togglePaths: () => set({ pathOpen: { ...po, ['site:' + x.id]: !po['site:' + x.id] } }),
        ...(po['site:' + x.id] ? (() => { const st = { ...x, cls: cls.cls, clsLabel: cls.label, access: x.access || (cls.access || [])[0] }; const sr = P.siteRegions(est, st); return { reachRegions: sr.rows.map(y => pathRow(st, y.region, 'site')), reachLine: `${x.name} reaches ${sr.total} ${sr.total === 1 ? 'region' : 'regions'} · ${sr.gbps} Gbps`, reachHasMore: sr.more > 0, reachMoreLabel: `+${sr.more} more, ranked lower by traffic` }; })() : { reachRegions: [], reachLine: '', reachHasMore: false, reachMoreLabel: '' }) });
      const regionChips = (s.chips || []).filter(c => est0.regionsList.some(r => r.region === c));
      const reachesScope = (x, cls) => !regionChips.length || est0.regionsList.filter(r => regionChips.includes(r.region)).some(r => P.gbps(est, { ...x, cls }, r) > 0.0005 && P.geoOfMetro(x.metro) === P.geoOfRegion(r.region));
      const tree = S.siteTree(est).map(cl => {
        const open = !!so[cl.key];
        const metros = cl.children.filter(ch => ch.kind === 'metro' && (!newOnly || ch.sites.some(isNew)) && ch.sites.some(x => reachesScope(x, cl.cls))).map(m => {
          const mo = !!so[m.key];
          return { ...m, open: mo, caret: mo ? 'rotate(90deg)' : 'rotate(0deg)', toggle: () => set({ siteOpen: mo ? { [cl.key]: true } : { [cl.key]: true, [m.key]: true } }),
            sub: `${m.count.toLocaleString('en-US')} ${m.count === 1 ? cl.unit : cl.plural} · ${m.access} · nearest on-ramp ${m.ramp}`,
            stats: [{ key: 'n', v: m.count.toLocaleString('en-US'), l: cl.plural }, { key: 'f', v: Math.round(100 * m.onFabric / Math.max(1, m.count)) + '%', l: 'on AT&T' }, { key: 'p', v: m.ms + ' ms', l: 'p95' }],
            badge: badgeOf(m.onFabric, m.count, cl.unit, cl.plural), sites: m.sites.filter(x => (!newOnly || isNew(x)) && reachesScope(x, cl.cls)).map(x => site({ ...x, access: m.access }, cl)), moreLabel: m.more ? `+${m.more.toLocaleString('en-US')} more` : '', hasMore: m.more > 0,
            ctl: door('Control', 'site ' + m.name), askAndi: ask('metro', m.key, `${cl.label} · ${m.name}`) };
        });
        const named = cl.children.filter(ch => ch.kind === 'site' && (!newOnly || isNew(ch)) && reachesScope(ch, cl.cls)).map(x => site(x, cl));
        // Your sites drills in place like the picture (2026-09-29): an open class or metro sets its siblings aside.
        const openM = metros.find(m => m.open);
        return { ...cl, open, caret: open ? 'rotate(90deg)' : 'rotate(0deg)', toggle: () => set({ siteOpen: open ? {} : { [cl.key]: true } }), mark: ico(cl.icon),
          sub: `${cl.count.toLocaleString('en-US')} ${cl.count === 1 ? cl.unit : cl.plural} · ${cl.access.join(' · ')}`, badge: badgeOf(cl.onFabric, cl.count, cl.unit, cl.plural),
          hasMetros: metros.length > 0, metros: openM ? [openM] : metros, hasNamed: named.length > 0 && !openM, named };
      }).filter(cl => (!newOnly && !regionChips.length) || cl.metros.length || cl.named.length);
      const treeAll = tree;
      const openCls = treeAll.find(cl => cl.open);
      const openMetro = openCls && openCls.metros.find(m => m.open);
      const crumbs = [{ key: 'root', label: 'Sites', last: !openCls }, ...(openCls ? [{ key: openCls.key, label: openCls.label, last: !openMetro }] : []), ...(openMetro ? [{ key: openMetro.key, label: openMetro.name, last: true }] : [])].map(cb => ({ ...cb, notLast: !cb.last, last: cb.last ? 700 : 400 }));
      const totalSites = tree.reduce((n, cl) => n + cl.count, 0);
      const jumpTo = () => {
        const hit = P.resolve(est, inv, s.jumpQ);
        if (!hit) { set({ jumpHit: `Nothing named "${(s.jumpQ || '').trim()}"` }); return; }
        const after = (key) => setTimeout(() => { const el = document.querySelector(`[data-jump="${key}"]`); if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 120);
        if (hit.kind === 'region') { set({ jumpHit: `Jumped to ${hit.label}`, tagView: false, treeOrMap: 'tree', inv: { ...(s.inv || {}), [hit.cloudId]: true, [hit.regionId]: true }, pathOpen: { ...po, ['reg:' + hit.region.region]: true } }); after('reg:' + hit.region.region); }
        else if (hit.kind === 'site') { const cls = S.classOf(hit.site); const mk = Object.keys(so).length ? null : null; const metroKey = S.siteTree(est).flatMap(cl => cl.children).find(ch => ch.kind === 'metro' && ch.sites.some(x => x.id === hit.site.id)); set({ jumpHit: `Jumped to ${hit.label}`, treeOrMap: 'tree', siteOpen: { ...so, [cls]: true, ...(metroKey ? { [metroKey.key]: true } : {}) }, pathOpen: { ...po, ['site:' + hit.site.id]: true } }); after('site:' + hit.site.id); }
        else { set({ jumpHit: `Jumped to ${hit.label}`, tagView: false, treeOrMap: 'tree', inv: { ...(s.inv || {}), [hit.cloudId]: true, [hit.regionId]: true, [hit.vpcId]: true } }); after('vpc:' + hit.vpcId); }
      };
      return { jumpQ: s.jumpQ || '', setJumpQ: (e) => set({ jumpQ: e.target.value, jumpHit: '' }), jumpKey: (e) => { if (e.key === 'Enter') jumpTo(); }, jumpGo: jumpTo, jumpHit: s.jumpHit || '', hasJumpHit: !!s.jumpHit,
        newStrip, newOnly, haveCards, glanceRings, appAll, appRows: appAll, glanceGaps: lackCards.map(l => ({ key: l.title, title: l.title, soWhat: l.soWhat, cta: l.cta, go: l.go })), lackCards: lackCards.map(cap4), hasLackCards: lackCards.length > 0,
        // Three tabs, one panel at a time (2026-09-28, no scrolling).
        // Group the picture's sites (notes, 2026-09-29): by region, or by how they attach.
        siteGroupValue: ['access', 'bu'].includes(s.siteGroup) ? s.siteGroup : 'region', setSiteGroup: (e) => set({ siteGroup: e.target.value, drill: [] }),
        // Connect is two pages (notes, 2026-09-29): what you have, and the options for what is not on AT&T yet.
        ...(() => { const on3 = s.screen === 's3' && s.layer === 'cloud' && s.tab === 'connect'; const ck = ['options', 'ways'].includes(s.cnPage) ? s.cnPage : 'picture'; return { cnIsOptions: on3 && ck === 'options', cnIsWays: on3 && ck === 'ways', cnIsPicture: on3 && ck === 'picture', cnShowLens: on3 && ck !== 'options', lensValue: s.lens || 'security', setLens: (e) => set({ lens: e.target.value }), cnTabs: on3, heroHead: s.screen !== 's3', cnShowTabs: on3 && ck !== 'picture', cnPanels: [['options', 'Options'], ['ways', 'Ways to connect']].map(([k, l]) => { const on = ck === k; return { key: k, label: l, on, go: () => set({ cnPage: k }), line: on ? 'var(--cta)' : 'transparent', color: on ? 'var(--text-heading)' : 'var(--text-light)', weight: on ? 700 : 500 }; }) }; })(),
        // Your clouds drill like Your sites (2026-09-29): clouds, regions with their bandwidth,
        // VPCs, subnets, workloads. The rollup on top counts the sites that reach them.
        ...(() => {
          const trail = Array.isArray(s.cloudTrailE) ? s.cloudTrailE : [];
          const invAll = inv || [];
          const utilOf = (r) => (ob.utilRows || []).find(u => u.region === r.region);
          const regsOf = (cl) => est.regionsList.filter(r => r.cloud === cl);
          const ir = (reg) => invAll.flatMap(c => c.regions || []).find(x => x.region === reg);
          const nf = (x) => Number(x || 0).toLocaleString('en-US');
          let level = 'cloud', rows = [];
          if (!trail.length) {
            rows = [...new Set(est.regionsList.map(r => r.cloud))].map(cl => { const rs = regsOf(cl), pr = rs.filter(r => r.priv);
              return { key: 'cloud:' + cl, name: cl, sub: `${rs.length} ${rs.length === 1 ? 'region' : 'regions'} · ${pr.length} private · ${rs.length - pr.length} on the internet`, bw: pr.map(r => (utilOf(r) || {}).bwShort).filter(Boolean).join(' + '), priv: pr.length > 0, into: 'cloud:' + cl, next: 'regions' }; });
          } else if (trail.length === 1) {
            level = 'region';
            rows = regsOf(String(trail[0]).slice(6)).map(r => { const u = utilOf(r);
              return { key: r.region, name: `${r.cloud} ${r.region}`, sub: r.priv ? `${F.RAMP_NAME[r.ramp] || 'NetBond'} · ${nf(r.wl)} workloads · ${u ? u.gbps + ' Gbps now' : ''}` : `public internet · ${nf(r.wl)} workloads`, bw: r.priv && u ? u.bwShort : r.priv ? '' : 'Internet', priv: !!r.priv, into: ir(r.region) ? 'region:' + r.region : null, next: 'VPCs' }; });
          } else {
            const reg = ir(String(trail[1]).slice(7));
            if (trail.length === 2) { level = 'vpc'; rows = reg ? reg.vpcs.map(v => ({ key: v.id, name: v.name, sub: `${v.purpose || 'VPC'} · ${nf(v.wl)} workloads`, bw: '', priv: !!v.priv, into: 'vpc:' + v.id, next: 'subnets' })) : []; }
            else { const vpc = reg && reg.vpcs.find(v => 'vpc:' + v.id === trail[2]);
              if (trail.length === 3) { level = 'subnet'; rows = vpc ? vpc.subnets.map(sn => ({ key: sn.id, name: sn.name, sub: `${sn.cidr || ''} · ${nf((sn.workloads || []).length)} workloads`, bw: '', priv: !/pub/.test(sn.id), into: 'sn:' + sn.id, next: 'workloads' })) : []; }
              else { level = 'workload'; const sn = vpc && vpc.subnets.find(x => 'sn:' + x.id === trail[3]); rows = sn ? (sn.workloads || []).map(w => ({ key: w.id, name: w.name || w.id, sub: [w.ip, w.tag].filter(Boolean).join(' · '), bw: '', priv: !w.public, into: null, next: '' })) : []; } }
          }
          const LV = { cloud: ['cloud', 'clouds'], region: ['region', 'regions'], vpc: ['VPC', 'VPCs'], subnet: ['subnet', 'subnets'], workload: ['workload', 'workloads'] }[level];
          const cloudRows = rows.map(r => ({ ...r, dot: r.priv ? 'var(--success)' : 'var(--warning)', level: r.into ? r.next : '', caret: r.into ? '›' : '', cursor: r.into ? 'pointer' : 'default',
            go: r.into ? () => set({ cloudTrailE: [...trail, r.into], cloudPage: 0 }) : () => {} }));
          const labelOf = (k) => { const id = String(k).replace(/^(cloud|region|vpc|sn):/, ''); const reg2 = trail[1] ? ir(String(trail[1]).slice(7)) : null;
            if (String(k).startsWith('vpc:') && reg2) return (reg2.vpcs.find(v => v.id === id) || {}).name || id;
            if (String(k).startsWith('sn:') && reg2) { for (const v of reg2.vpcs) { const sn = v.subnets.find(x => x.id === id); if (sn) return sn.name; } }
            return id; };
          const cloudCrumbsE = [{ key: 'root', label: 'All clouds', to: [] }, ...trail.map((k, i) => ({ key: k, label: labelOf(k), to: trail.slice(0, i + 1) }))]
            .map((c, i, a) => ({ ...c, notLast: i < a.length - 1, weight: i === a.length - 1 ? 700 : 500, color: i === a.length - 1 ? 'var(--text-heading)' : 'var(--link)', go: () => set({ cloudTrailE: c.to, cloudPage: 0 }) }));
          // The tiles count clouds, not sites, and follow the drill (notes, 2026-09-30).
          const sc = X.cloudScope(est, invAll, trail);
          const cloudTiles = sc.tiles.map(t => ({ ...t, tone: 'var(--text-heading)' }));
          const cloudMix = sc.mix.map(m => ({ ...m, w: m.pct + '%', op: m.n ? 1 : 0.4 }));
          const cloudMixLabel = `How they connect · ${sc.siteLine}`, cloudMixTitle = `${sc.noun} by how they attach. ${sc.siteLine} reach the clouds over their own tunnels.`;
          return { cloudRows, cloudCrumbsE, cloudTiles, cloudMix, cloudMixLabel, cloudMixTitle, cloudLine: `${rows.length} ${rows.length === 1 ? LV[0] : LV[1]}` };
        })(),
        // Your sites drill by place (Micah, 2026-09-29): region, state, metro, site, services.
        ...(() => {
          const trail = Array.isArray(s.placeTrail) ? s.placeTrail : [];
          // A state lists its sites, not its metros (notes, 2026-09-30: "once we display States, we
          // should show all city/sites"): the metros flatten into site rows, the metro stays in the
          // trail, and a rolled-up metro's "+N more" opens the whole metro here, paged.
          const lvl0 = trail.length ? X.siteDrillRows(est, trail, { full: true }) : null;
          const flat = lvl0 && lvl0.level === 'metro' ? lvl0.rows.flatMap(m => { const sub = X.siteDrillRows(est, [...trail, m.drillKey]);
            return (sub ? sub.rows : []).map(r => r.more ? { ...r, name: `${r.name} in ${m.name}`, moreTo: [...trail, m.drillKey] } : { ...r, via: [...trail, m.drillKey] }); }) : null;
          const lvl = flat ? { level: 'site', rows: flat } : lvl0;
          const rows0 = lvl ? lvl.rows : regionRows(est).map(r => { const st = X.siteDrillRows(est, ['region:' + r.name]); const att = st ? st.rows.reduce((a, x) => a + (x.att || 0), 0) : r.sites.filter(onAtt).reduce((a, x) => a + S.countOf(x.name), 0);
            return { key: 'region:' + r.name, name: r.name, drillKey: 'region:' + r.name, count: r.count, priv: att > 0, access: `${r.count.toLocaleString('en-US')} ${r.count === 1 ? 'site' : 'sites'} · ${att.toLocaleString('en-US')} AT&T · ${(r.count - att).toLocaleString('en-US')} non-AT&T` }; });
          const level = !trail.length ? 'region' : lvl ? lvl.level : 'region';
          const usRegion = (k) => /^region:(US |Nationwide)/.test(String(k || ''));
          const NEXT = { region: 'states', state: 'metros', metro: 'sites', site: 'services', service: '' };
          const nextOf = (r) => level === 'region' && !usRegion(r.drillKey) ? 'countries' : NEXT[level] || '';
          const placeRows = rows0.map(r => { const can = (!!r.drillKey && !r.leaf && !r.more) || !!r.moreTo;
            return { key: r.key || r.name, name: r.name, access: r.more ? 'the whole metro, here' : (r.svcLine && r.place) || r.access || '', svcLine: r.svcLine || '', bwF: r.bwF || '', dot: r.more ? 'transparent' : r.priv ? 'var(--success)' : 'var(--warning)', level: can && !r.moreTo ? nextOf(r) : '', caret: can ? '›' : '', cursor: can ? 'pointer' : 'default',
              go: !can ? () => {} : r.moreTo ? () => set({ placeTrail: r.moreTo, placePage: 0 }) : () => set({ placeTrail: [...(r.via || trail), r.drillKey], placePage: 0 }) }; });
          const crumbs = [{ key: 'root', label: 'All regions', to: [] }, ...trail.map((k, i) => ({ key: k, label: S.labelOfKey(est, k), to: trail.slice(0, i + 1) }))]
            .map((c, i, a) => ({ ...c, notLast: i < a.length - 1, weight: i === a.length - 1 ? 700 : 500, color: i === a.length - 1 ? 'var(--text-heading)' : 'var(--link)', go: () => set({ placeTrail: c.to, placePage: 0 }) }));
          const total = rows0.reduce((a, r) => a + (r.count || 1), 0);
          // States or countries, read from the codes the level holds (2026-09-30: Nationwide read "6 countries").
          const usCodes = rows0.every(r => { const code = String(r.key || '').replace(/^state:/, ''); return code === '—' || S.isUsState(code); });
          const nounOf = { region: ['region', 'regions'], state: [usCodes ? 'state' : 'country', usCodes ? 'states' : 'countries'], metro: ['metro', 'metros'], site: ['site', 'sites'], service: ['service', 'services'] }[level] || ['row', 'rows'];
          const shown = rows0.filter(r => !r.more).length;
          const sitesN = `${total.toLocaleString('en-US')} ${total === 1 ? 'site' : 'sites'}`;
          const flatLine = flat ? (() => { const n = lvl0.rows.reduce((a, m) => a + (m.count || 1), 0), mN = lvl0.rows.length; return `${n.toLocaleString('en-US')} ${n === 1 ? 'site' : 'sites'} in ${mN} ${mN === 1 ? 'metro' : 'metros'}`; })() : '';
          return { placeRows, placeCrumbs: crumbs, placeLine: flat ? flatLine : level === 'service' || level === 'site' ? (level === 'site' ? sitesN : `${shown} ${shown === 1 ? nounOf[0] : nounOf[1]}`) : `${shown} ${shown === 1 ? nounOf[0] : nounOf[1]} · ${sitesN}` };
        })(),
        // Business units (notes, 2026-09-29): the customer tags sites, and every grouping reads the tags.
        ...(() => {
          const tags = ((s.siteTags || {})[est.id]) || {}, custom = ((s.buCustom || {})[est.id]) || [];
          const save = (siteTags, buCustom) => { set({ siteTags, buCustom }); try { localStorage.setItem('naas.tags', JSON.stringify({ siteTags, buCustom })); } catch (e) {} };
          const groups = buRows(est, tags);
          const names = [...S.BU_DEFAULTS, ...custom.filter(b => !S.BU_DEFAULTS.includes(b))];
          // Every default unit is offered, empty or not, so Manufacturing plant never has to be typed (2026-09-29 audit).
          const known = [...names, ...groups.map(g => g.name).filter(b => !names.includes(b))];
          const active = known.includes(s.buActive) ? s.buActive : null;
          const maxN = Math.max(1, ...groups.map(g => g.count));
          const buList = known.map(b => { const g = groups.find(x => x.name === b); const n = g ? g.count : 0; const on = active === b;
            return { key: b, name: b, n, nF: n.toLocaleString('en-US'), w: Math.round(n / maxN * 100) + '%', on, all: false, go: () => set({ buActive: on ? null : b }), bg: on ? 'var(--bg-accent)' : 'transparent', border: on ? 'var(--border-active)' : 'var(--border-secondary)' }; });
          const buSites = (est.sites || []).map(x => { const bu = S.buOf(x, tags); const target = active && bu !== active ? active : null;
            return { key: x.name, name: x.name, metro: x.metro || 'various', access: x.access || '', count: S.countOf(x.name).toLocaleString('en-US'), bu, moveLabel: target ? `Move to ${target}` : active ? `In ${active}` : 'Pick a unit', canMove: !!target, noMove: !target,
              move: () => { if (!target) return; save({ ...(s.siteTags || {}), [est.id]: { ...tags, [x.name]: target } }, s.buCustom || {}); } }; });
          const addBu = () => { const nm = String(s.buNew || '').trim(); if (!nm) return; if (!known.includes(nm)) save(s.siteTags || {}, { ...(s.buCustom || {}), [est.id]: [...custom, nm] }); set({ buNew: '', buActive: nm }); };
          return { buList, buSites, buActiveName: active || '', hasBuActive: !!active, buHint: active ? `Moving sites into ${active}` : 'Pick a business unit, then move sites into it', buNew: s.buNew || '', setBuNew: (e) => set({ buNew: e.target.value }), addBu };
        })(),
        ...(() => { const ek = ['glance', 'clouds', 'sites', 'bu'].includes(s.estPanel) ? s.estPanel : 'glance'; return { estPanels: [['glance', 'At a glance'], ['clouds', 'Your clouds'], ['sites', 'Your sites'], ['bu', 'Business units']].map(([k, l]) => { const on = ek === k; return { key: k, label: l, on, go: () => set({ estPanel: k }), line: on ? 'var(--cta)' : 'transparent', color: on ? 'var(--text-heading)' : 'var(--text-light)', weight: on ? 700 : 500 }; }), estPanelGlance: ek === 'glance', estPanelClouds: ek === 'clouds', estPanelSites: ek === 'sites', estPanelBu: ek === 'bu' }; })(),
        siteTree: openCls ? [openCls] : treeAll, hasSiteTree: treeAll.length > 0, siteCrumbs: crumbs, hasSiteCrumbs: crumbs.length > 1, cloudsLine: `${stats.clouds} ${stats.clouds === 1 ? 'cloud' : 'clouds'} · ${stats.regions} ${stats.regions === 1 ? 'region' : 'regions'} · ${stats.workloads.toLocaleString('en-US')} workloads`, siteCrumbTail: crumbs[crumbs.length - 1].label, collapseSites: () => set({ siteOpen: {} }), sitesLineTree: `${totalSites.toLocaleString('en-US')} sites · your own buildings, not a cloud` };
    })(),
    siteCards: est.sites.filter(st => !st.rollup).map((st, i) => ({ key: st.name, name: st.name, metro: st.metro, cidr: `10.${60 + i}.0.0/20`, selected: false })), siteRollups: est.sites.filter(st => st.rollup).map(st => ({ key: st.name, name: st.name, n: (st.name.match(/\(([\d,]+)\)/) || [])[1] || '', priv: st.priv, pctW: st.priv ? '100%' : '0%', fill: st.priv ? '#0057b8' : '#8a949c' })), hasSiteRollups: est.sites.some(st => st.rollup), sitesLine: `${stats.sites.toLocaleString('en-US')} premises · your own buildings, not a cloud`,
    discoverVerdictLine: isEmpty ? 'Nothing discovered yet. Connect an account or pick an inventory.' : `${est.regionsList.length - ob.pathsCovered} of your ${est.regionsList.length} cloud regions still ride the public internet. ${ob.pathsCovered} ${ob.pathsCovered === 1 ? 'is' : 'are'} on the AT&T network, across ${plural(inv.length, 'cloud', 'clouds')}.`,
    advisorSave: fmt(totalSave || ob.savingsMo || 0) + '/mo', advisorSub: totalSave ? `on the table across ${plural(lifeRows.filter(x => x.f.priced && bucket(x.l.state) === 'open').length, 'finding', 'findings')}` : `already saved on AT&T · ${plural(est.findings.length, 'open finding', 'open findings')}`, askAdvisor: go('s3', { layer: 'cloud', tab: 'connect' }), hasAdvisor: !isEmpty && (totalSave > 0 || ob.savingsMo > 0), discoverHeadCols: !isEmpty && (totalSave > 0 || ob.savingsMo > 0) ? 'minmax(0,1fr) 300px' : 'minmax(0,1fr)',
    breakdownOpen: !!s.breakdownOpen, toggleBreakdown: () => set({ breakdownOpen: !s.breakdownOpen }), breakdownCaret: s.breakdownOpen ? 'rotate(90deg)' : 'rotate(0deg)',
    stationCta,
    obScope, setObScope: (e) => set({ obScope: e.target.value }),
    obScopes: R.scopes(est0).map(sc => ({ ...sc, on: sc.key === obScope, go: () => set({ obScope: sc.key }), ub: sc.key === obScope ? 'var(--cta)' : 'transparent', uc: sc.key === obScope ? 'var(--link)' : 'var(--text-body)', uw: sc.key === obScope ? 700 : 500 })), obScopeLabel: (R.scopes(est0).find(x => x.key === obScope) || {}).label || 'Whole estate',
    obWindows: ['7d', '30d', '90d'].map(w => ({ key: w, label: w, on: (s.obWindow || '30d') === w, go: () => set({ obWindow: w }), ub: (s.obWindow || '30d') === w ? 'var(--cta)' : 'transparent', uc: (s.obWindow || '30d') === w ? 'var(--link)' : 'var(--text-body)', uw: (s.obWindow || '30d') === w ? 700 : 500 })),
    obTrends: R.trends(ob, s.obWindow || '30d').map(k => ({ ...k, hasUnit: !!k.u, badge: `${k.arrow} ${k.delta}`, go: ({ thr: () => set({ obTab: 'throughput' }), p95: () => set({ obTab: 'latency' }), loss: () => set({ obTab: 'loss' }), egr: () => set({ obTab: 'egress' }), fab: () => set({ obTab: 'flow' }), sav: go('s3', { layer: 'cloud', tab: 'cost' }), util: () => set({ obTab: 'flow' }) })[k.key] || (() => {}) })),
    utilRows: (ob.utilRows || []).map(u => { const hot = u.pct >= 80; const r = est0.regionsList.find(x => x.region === u.region) || { region: u.region, wl: 0 }; return { ...u, key: u.id, label: `${u.cloud} ${u.region}`, sub: `${u.ramp} · ${u.bw || u.ports + ' × 10 Gbps'}`, w: u.pct + '%', v: `${u.gbps} Gbps`, pctF: u.pct + '%', fill: hot ? 'var(--error)' : '#009fdb', doorLabel: hot ? 'Add a port →' : 'Ask Andi →', doorColor: hot ? 'var(--warning)' : 'var(--link)', go: hot ? composeFor(go, r) : () => set({ andiScope: { kind: 'region', id: u.region, label: `${u.cloud} ${u.region}` }, andiOpen: true }) }; }),
    obStrip: (() => { const rows = ob.utilRows || []; const hot = rows.filter(u => u.pct >= 80 && !(connRow && connRow.region === u.region && connRow.degraded)); const blind = ob.blind || []; const parts = []; const deg = conns.rows.find(r => r.degraded); if (deg) parts.push(`${deg.cloud} ${deg.region} is degraded on ${deg.ramp}: BGP flapping, ${deg.drops} drops, ${deg.wl.toLocaleString('en-US')} workloads behind it.`); if (hot.length) parts.push(`${hot.map(u => `${u.cloud} ${u.region}`).join(', ')} ${hot.length === 1 ? 'runs' : 'run'} above 80% of ${hot.length === 1 ? 'its' : 'their'} ports.`); if (blind.length) parts.push(`${blind.length} ${blind.length === 1 ? 'region sends' : 'regions send'} no flow logs, so ${ob.pub.toFixed(1)} Gbps is unseen.`); if (ob.worst && !blind.length) parts.push(`${ob.worst.name} is the slowest public flow at ${ob.worst.latency} ms.`); const first = hot[0] ? est0.regionsList.find(x => x.region === hot[0].region) : blind[0]; return { has: parts.length > 0, title: 'Act on it', text: parts.join(' ') + (hot.length ? ' Add a port before it saturates.' : blind.length ? ' Attach it to bring the traffic under control.' : ''), cta: hot.length ? `Add a port on ${hot[0].region}` : blind.length ? `Attach ${blind[0].region}` : 'Steer worst offender', go: first ? composeFor(go, first) : (ob.worst ? () => set({ steered: [...(s.steered || []), ob.worst.id] }) : () => {}) }; })(), hasUtil: (ob.utilRows || []).length > 0, utilLine: `${ob.util}% of ${ob.capGbps} Gbps in use · ${(ob.utilRows || []).length} ${(ob.utilRows || []).length === 1 ? 'connection' : 'connections'}`, utilHot: (ob.utilRows || []).filter(u => u.pct >= 80).length, anomalies: R.anomalies(R.applyScope(est0, obScope), ob).map(a => ({ ...a, dot: a.sev === 'amber' ? 'var(--warning)' : 'var(--link)', go: a.region ? () => set({ obScope: 'cloud:' + (est0.regionsList.find(r => r.region === a.region) || {}).cloud }) : () => {} })), hasAnomalies: R.anomalies(R.applyScope(est0, obScope), ob).length > 0, insights: R.insights(R.applyScope(est0, obScope), ob), hasInsights: !isEmpty, iw: iwVals(R.insightWidgets(R.applyScope(est0, obScope), ob, winDaysOf(s), { pubRate: (() => { const w = R.egressWeeks(obAll)[11], pubMo = (est0.buckets || []).filter(b => b.today > b.fabric).reduce((a, b) => a + b.today, 0); return w && w.pub > 0 ? pubMo / w.pub : 0; })() }), s, set, go, winLabelOf(s)) || {}, hasIw: !!R.insightWidgets(R.applyScope(est0, obScope), ob, winDaysOf(s)),
    obVerdict: ob.verdict, obCoverage: ob.coverage, obKpis: ob.kpis.map(k => ({ ...k, hasUnit: !!k.u, hasE: !!k.e })), obTabs, obIsFlow: obTab === 'flow', trend, hasTrend: !!trend,
    ...logVals, ...gapVals, ...stepVals,
    skVB: `0 0 ${sk.W} ${sk.H}`, skNodes, skHeads, skRibbons, goLogs: () => toLogs({ logPattern: 'all' }), skSub: ob.subVerdict, skFoot: `All flows · ${ob.flows.filter(f => f.kind === 'App').length} app flows, ${ob.flows.filter(f => f.kind !== 'App').length} cloud-to-cloud. Sites roll up by class; the records table lists cloud flows only.`,
    records, recordCount: `${records.length} groups`, groupBy, setGroupBy: (e) => set({ groupBy: e.target.value }), groupOptions: ['None', 'Source', 'Destination', 'Path', 'Action'].map(o => ({ key: o, label: o })),
    briefing: ob.briefing, briefPills, briefQs, paths, pathsSummary: ob.pathsSummary, restoreAll: () => set({ steered: [] }), hasSteered: steered.length > 0,
    events, eventCount: `${events.length} ${events.length === 1 ? 'event' : 'events'} this session`, hasEvents: events.length > 0,
    ...obX, netObserve: true, noEvents: events.length === 0, hasObserveFindings: est.findings.some(f => f.tab === 'observe' && (f.layer === s.layer || (f.layer === 'net' && s.layer === 'cloud'))),
  };
}


// ---------- Compose wizard + Govern grammar ----------
const STEP_LABELS = ['Outcome', 'Source', 'Destination', 'Metro', 'Resiliency', 'Control'];
const CARD_DESC = {
  source: { 'Data center': 'Sites tagged site/dc-* on AVPN, ASE or Dedicated Internet.', 'Sites': 'Offices, branches, plants and campuses.', 'Internet': 'Any site that only has an internet first mile. IPSec into the AT&T network.', 'A cloud region': 'Resources tagged prod, pci or finance inside a VPC or VNet.', 'AI workloads': 'Resources tagged gpu or ai: ml-infra/gpu-*, rd-helion/*.' },
  dest: { 'Clouds': 'Named resources in AWS, Azure, Google Cloud, Oracle: a region, a VPC, a tag.', 'Neoclouds': 'CoreWeave, Nebius, Lambda through Equinix Fabric.', 'AI providers': 'OpenAI, Anthropic, Bedrock, Vertex behind the AI Fabric gateway.', 'The Internet': 'Egress through inspection instead of the hyperscaler exit.', 'The WAN': 'Back to your sites over AVPN.' },
  resiliency: { 'Standard': 'One metro, one path. 99.99% uptime. The right default for most regions.', 'Geodiversity': 'Two metros, two on-ramps, active/standby. 99.995%.', 'Maximum': 'Two metros, two paths, managed failover. 99.999%. AWS Interconnect Last Mile.' },
  control: { 'Private path required': 'Traffic may never touch the public internet. Enforced on the path.', 'No direct internet path': 'Cloud workloads leave only through the AT&T network and its inspection.', 'Inline inspection': 'NGFW in path. Every session judged before it leaves.', 'Segment by tag': 'Workloads talk only to their own tag. East-west contained.', 'Latency SLO': 'A millisecond ceiling per tag; the AT&T network re-routes when it is at risk.', 'Cost-aware routing': 'When two paths meet policy, take the cheaper one.' },
};
const METRO_RAMPS = { Ashburn: 'NetBond · DX · ER · IX · 8 ms', Atlanta: 'NetBond · DX · 11 ms', 'New York': 'NetBond · DX · ER · 9 ms', Dallas: 'NetBond · DX · ER · 9 ms', Chicago: 'NetBond · DX · ER · 10 ms', Denver: 'NetBond · 14 ms', 'San Jose': 'NetBond · DX · ER · 7 ms', 'Los Angeles': 'NetBond · DX · 9 ms', Seattle: 'DX · ER · 11 ms', Frankfurt: 'NetBond · DX · ER · 9 ms', London: 'NetBond · DX · ER · 8 ms', Amsterdam: 'NetBond · DX · 10 ms', Singapore: 'NetBond · DX · 12 ms', Tokyo: 'DX · ER · 13 ms', Sydney: 'DX · 15 ms' };
const REGION_OF_METRO = (m) => Object.keys(D.COMPOSE_CHIPS.regions).find(r => D.COMPOSE_CHIPS.regions[r].includes(m)) || 'US East';
const REGION_GEO = { 'us-east-1': 'Ashburn', 'us-east-2': 'Chicago', 'us-west-2': 'Seattle', 'eu-central-1': 'Frankfurt', 'eu-west-1': 'London', 'ap-southeast-1': 'Singapore', eastus: 'Ashburn', westeurope: 'Amsterdam', centralus: 'Dallas', 'us-central1': 'Chicago', 'us-east-04': 'New York', 'uk-south': 'London' };

/**
 * Strips a compose of everything that names where it came from, how many of
 * it there are, or what it says about itself: `sourceLabel` (the alert's
 * title), `bulk` and `qty` (the count a site-attach route wrote), `noteStep`
 * (the step that count's alert belongs on), and `note` (fix round 3: the
 * alert's body text itself, moved in from the top-level `parsedNote` this
 * was previously named for - the root fix. A fresh compose no longer needs
 * a fresh writer to remember to clear a sibling field; there is no sibling
 * field left). Every route that starts a genuinely NEW order from a compose
 * that might carry those - Govern's "Author policy", the free-text parser,
 * and switching the outcome under an order-carrying compose - runs it
 * through this first. A route that is still building the SAME order
 * (picking a metro, adding a control, resuming the header's "Compose"
 * shortcut) spreads `cp` unchanged; those fields are exactly what should
 * survive.
 */
const cleanCompose = (cp) => ({ ...cp, sourceLabel: null, bulk: null, qty: 1, noteStep: 0, note: null });

/**
 * Whether a compose carries an order at all - fix round 3, finding H: the
 * round-2 guard keyed on `sourceLabel` alone, which only the gap route
 * writes, so an outcome switch after the drawer's bulk attach (label-less,
 * but `bulk`/`qty` both set) slipped through uncleaned. This names every
 * shape a "this compose is about N sites/a labelled card/a written note"
 * order can take, so a future writer that sets any one of them is covered
 * without a fourth patch.
 */
const carriesOrder = (cp) => !!(cp.sourceLabel || cp.bulk || (cp.qty || 1) > 1 || cp.note);

/**
 * Fix round 3, finding R3 (the reviewer's own, pre-existing on the base):
 * `s.order` freezes whatever Review last showed - set by choosing a
 * marketplace product or package, or by Review itself - and nothing cleared
 * it when a NEW order started from Compose. Every NEW-order writer spreads
 * this alongside its `compose`, so Review's `s.order || composed` falls
 * through to the live compose instead of a stale snapshot. SAME-order
 * writers (setC's general case, goCompose's resume branch) do not use this -
 * they are still building toward whatever `s.order` already is or isn't.
 */
const newOrder = (compose) => ({ compose, order: null });

function prefillCompose(est) {
  const base = { outcome: null, source: [], dest: [], regionTab: 'US East', metros: [], resiliency: 'Standard', control: [], step: 0, prefilled: false };
  if (!est || est.stage === 'empty') return base;
  const r = est.regionsList.find(x => !x.priv) || est.regionsList[0];
  if (!r) return base;
  const metro = REGION_GEO[r.region] || 'Ashburn';
  const control = ['Private path required', ...(r.tags.includes('PCI') || r.tags.includes('Prod') ? ['No direct internet path'] : []), ...(r.tags.includes('GPU') ? ['Latency SLO'] : [])];
  return { outcome: 'u1', source: ['Data center'], dest: ['Clouds'], regionTab: REGION_OF_METRO(metro), metros: [metro], resiliency: r.tags.includes('PCI') ? 'Geodiversity' : 'Standard', control, step: 0, prefilled: true, prefillRegion: r.cloud + ' ' + r.region, prefillWl: r.wl };
}

function wizardVals(s, est, cp, setC, outcome, constraint, summary, set, c) {
  const step = cp.step || 0;
  const filled = [!!cp.outcome, cp.source.length > 0, cp.dest.length > 0, cp.metros.length > 0, !!cp.resiliencyChosen, cp.control.length > 0];
  const goStep = (i) => () => setC({ step: i });
  const steps = STEP_LABELS.map((l, i) => ({ key: l, n: i + 1, label: l, cur: i === step, done: filled[i] && i !== step, go: goStep(i), fill: i === step ? 'var(--cta)' : filled[i] ? 'var(--success)' : 'transparent', ring: i === step ? 'var(--cta)' : filled[i] ? 'var(--success)' : 'var(--border-primary)', color: i === step ? 'var(--link)' : filled[i] ? 'var(--text-heading)' : 'var(--text-light)', weight: i === step ? 700 : 500, mark: filled[i] && i !== step ? '✓' : String(i + 1), markColor: i === step || filled[i] ? '#fff' : 'var(--text-light)', notLast: i < 5, flex: i < 5 ? '1 1 0' : '0 0 auto' }));
  const card = (field, v, single, desc) => { const on = single ? cp[field] === v : cp[field].includes(v); return { key: v, label: v, desc: desc || '', on, click: () => { if (single) return setC({ [field]: v }); const arr = cp[field]; setC({ [field]: arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v] }); }, border: on ? 'var(--cta)' : 'var(--border-secondary)', bg: on ? 'var(--bg-accent)' : 'var(--bg-base)', check: on ? 'var(--cta)' : 'transparent', checkRing: on ? 'var(--cta)' : 'var(--border-primary)' }; };
  const stepMeta = [
    { q: 'What should this connection do?', help: 'One outcome per order. The choice sets the control that ships with the path; you can change it at step 6.' },
    { q: 'Where does the traffic start?', help: 'Pick every source that applies. Sites and data centers reach the AT&T network on the access you already have.' },
    { q: 'Where is it going?', help: 'The destination decides the on-ramp: NetBond, Direct Connect, ExpressRoute, or Equinix Fabric for neoclouds.' },
    { q: 'Through which AT&T metro?', help: 'A metro is where your path enters the AT&T network. Two metros are needed for geodiversity and maximum resiliency.' },
    { q: 'How much resiliency?', help: 'Standard is one path. The other two add a second metro and a second on-ramp; maximum adds managed failover.' },
    { q: 'What must always be true?', help: 'This is the policy. It ships with the path and is enforced from delivery; Govern shows it in the same words.' },
  ];
  const sentence = {
    src: cp.source.join(' and '), dst: cp.dest.join(' and '), metro: cp.metros.join(' and '), res: cp.resiliency ? cp.resiliency.toLowerCase() : '', ctl: cp.control.map(x => x.toLowerCase()).join(' and '),
    verb: outcome ? (outcome.id === 'u2' ? 'Let' : outcome.id === 'u3' ? 'Join' : 'Connect') : 'Connect', join: outcome && outcome.id === 'u2' ? 'reach' : outcome && outcome.id === 'u3' ? 'with' : 'to',
  };
  const slot = (v, i, empty) => ({ text: v || empty, filled: !!v, go: goStep(i), bg: v ? 'var(--bg-accent)' : 'transparent', color: v ? 'var(--link)' : 'var(--text-disabled)', border: v ? 'transparent' : 'var(--border-primary)' });
  const policySentence = { match: cp.source[0] ? (cp.source[0] === 'A cloud region' ? 'a cloud region' : cp.source[0] === 'AI workloads' ? 'tag GPU' : cp.source[0].toLowerCase()) : 'the source', scope: cp.dest[0] ? cp.dest[0].toLowerCase() : 'the destination', req: cp.control.map(x => x.toLowerCase()).join(' and ') || '…' };
  // Govern authoring
  const au = s.authoring || null;
  const A_MATCH0 = ['tag PCI', 'tag Prod', 'tag Internet-facing', 'branch Finance', 'tag GPU', 'region ap-*'];
  const A_MATCH = s.authoring && s.authoring.match && !A_MATCH0.includes(s.authoring.match) ? [s.authoring.match, ...A_MATCH0] : A_MATCH0;
  const A_SCOPE = ['any cloud', 'the Internet', 'a cloud region', 'the WAN', 'AI providers'];
  const aSet = (p) => set({ authoring: { ...(au || { match: null, scope: null, req: [] }), ...p } });
  const aCard = (field, v, single) => { const cur = au ? au[field] : (single ? null : []); const on = single ? cur === v : (cur || []).includes(v); return { key: v, label: v, desc: field === 'req' ? CARD_DESC.control[v] : '', on, click: () => { if (single) return aSet({ [field]: v }); aSet({ [field]: on ? cur.filter(x => x !== v) : [...(cur || []), v] }); }, border: on ? 'var(--cta)' : 'var(--border-secondary)', bg: on ? 'var(--bg-accent)' : 'var(--bg-base)', check: on ? 'var(--cta)' : 'transparent', checkRing: on ? 'var(--cta)' : 'var(--border-primary)' }; };
  const aReady = !!(au && au.match && au.scope && au.req && au.req.length);
  const commit = (state) => () => { if (!aReady) return; const matched = { 'tag PCI': 34, 'tag Prod': 478, 'tag Internet-facing': 19, 'branch Finance': 228, 'tag GPU': 174, 'region ap-*': 52 }[au.match] || (est.regionsList.find(r => 'region ' + r.region === au.match) || {}).wl || 40; const viol = state === 'simulated' ? Math.round(matched * 0.18) : 0; const pol = { name: au.templateName || `${au.match.replace(/^tag |^branch |^region /, '')} · ${au.req[0]}`, match: au.match, scope: au.scope, req: au.req.join(' and '), matched, viol, state, custom: true, ...(au.layers ? { layers: au.layers } : {}) }; set({ customPolicies: [...(s.customPolicies || []), pol], authoring: null, simulated: state === 'simulated' ? true : s.simulated,
    // The list opens on the page that holds what you just authored.
    polPage: Math.floor(((s.layer === 'cloud' ? layerPolicies(s, est, 'all').length : 0) + (s.customPolicies || []).length) / PAGE_SIZE.polRows[1]) }); };
  const openAuthor = (m, r) => () => set({ authoring: { match: m || null, scope: 'any cloud', req: r ? [r] : [] } });
  const polSentence = (p) => ({ match: p.match, scope: p.scope || (/internet/i.test(p.req) ? 'the Internet' : 'any cloud'), req: p.req.toLowerCase() });
  return {
    wizSteps: steps, wizStep: step, wizNotLast: step < 5, backVis: step === 0 ? 'hidden' : 'visible', aNotReady: !aReady, wizQ: stepMeta[step].q, wizHelp: stepMeta[step].help, wizIsFirst: step === 0, wizIsLast: step === 5, wizNext: () => setC({ step: Math.min(5, step + 1) }), wizBack: () => setC({ step: Math.max(0, step - 1) }), wizNextLabel: step === 5 ? 'Review' : STEP_LABELS[step + 1], wizNextDisabled: !filled[step] || (step === 4 && !!constraint), wizNextBg: !filled[step] || (step === 4 && !!constraint) ? 'var(--bg-neutral)' : 'var(--cta)', wizNextColor: !filled[step] || (step === 4 && !!constraint) ? 'var(--text-disabled)' : '#fff',
    stepIs0: step === 0, stepIs1: step === 1, stepIs2: step === 2, stepIs3: step === 3, stepIs4: step === 4, stepIs5: step === 5,
    srcCards: D.COMPOSE_CHIPS.source.map(v => card('source', v, false, CARD_DESC.source[v])), dstCards: D.COMPOSE_CHIPS.dest.map(v => card('dest', v, false, CARD_DESC.dest[v])), resCards: D.COMPOSE_CHIPS.resiliency.map(v => card('resiliency', v, true, CARD_DESC.resiliency[v])), ctlCards: D.COMPOSE_CHIPS.control.map(v => card('control', v, false, CARD_DESC.control[v])),
    metroCards: (D.COMPOSE_CHIPS.regions[cp.regionTab] || []).map(m => ({ ...card('metros', m, false, METRO_RAMPS[m] || 'NetBond'), })),
    parsedNote: cp.note || '', parsedNoteTitle: cp.sourceLabel || 'From the drawer', hasParsedNote: !!cp.note && step === (cp.noteStep ?? 0), prefilled: !!cp.prefilled && !cp.note, prefillLine: cp.prefilled ? `Started from your estate: ${cp.prefillRegion} has ${cp.prefillWl} workloads on the public internet. Every step is filled; change what you like.` : '',
    slotRows: [['Outcome', outcome ? outcome.name : '', 0, 'Pick an outcome'], ['From', cp.source.join(', '), 1, 'Pick a source'], ['To', cp.dest.join(', '), 2, 'Pick a destination'], ['Via', cp.metros.join(', '), 3, 'Pick a metro'], ['Resiliency', cp.resiliencyChosen ? cp.resiliency : `${cp.resiliency} (default)`, 4, ''], ['Require', cp.control.join(', '), 5, 'Pick a control']].map(([label, v, i, empty]) => ({ key: label, label, text: v || empty, go: goStep(i), cur: step === i, weight: v ? 500 : 400, color: step === i ? 'var(--link)' : v ? 'var(--text-heading)' : 'var(--text-disabled)' })),
    sent: sentence, slotSrc: slot(sentence.src, 1, 'a source'), slotDst: slot(sentence.dst, 2, 'a destination'), slotMetro: slot(sentence.metro, 3, 'a metro'), slotRes: slot(sentence.res, 4, 'resiliency'), slotCtl: slot(sentence.ctl, 5, 'a control'), slotOutcome: slot(outcome ? outcome.name.toLowerCase() : '', 0, 'an outcome'),
    polSent: policySentence, hasConstraintNow: !!constraint && step === 4,
    // govern
    notAuthoring: !au,
    // Two tabs, one at a time (2026-09-28, no scrolling).
    ...(() => { const gk = ['templates', 'tags'].includes(s.govPanel) ? s.govPanel : 'policies'; return { govPanels: [['policies', 'Violations & policies'], ['templates', 'Templates'], ['tags', 'Tags']].map(([k, l]) => { const on = gk === k; return { key: k, label: l, on, go: () => set({ govPanel: k }), line: on ? 'var(--cta)' : 'transparent', color: on ? 'var(--text-heading)' : 'var(--text-light)', weight: on ? 700 : 500 }; }), govPanelPolicies: gk === 'policies', govPanelTemplates: gk === 'templates', govPanelTags: gk === 'tags' }; })(),
    authoring: !!au, openAuthor: openAuthor(), closeAuthor: () => set({ authoring: null }), aMatch: A_MATCH.map(v => aCard('match', v, true)), aScope: A_SCOPE.map(v => aCard('scope', v, true)), aReq: D.COMPOSE_CHIPS.control.map(v => aCard('req', v, false)),
    aSent: { match: au && au.match || 'something', scope: au && au.scope || 'somewhere', req: au && au.req && au.req.length ? au.req.map(x => x.toLowerCase()).join(' and ') : '…', matchOn: !!(au && au.match), scopeOn: !!(au && au.scope), reqOn: !!(au && au.req && au.req.length) },
    aSimulate: commit('simulated'), aEnforce: commit('enforced'), aReady, aBg: aReady ? 'var(--cta)' : 'var(--bg-neutral)', aColor: aReady ? '#fff' : 'var(--text-disabled)',
    // Policies read by layer (Micah, 2026-09-29: "give me policies that are multi-layer").
    polLayerHeads: POLICY_LAYERS.map(l => ({ key: l.key, label: l.label })),
    aLayers: au && au.layers ? POLICY_LAYERS.map(l => ({ key: l.key, label: l.label, text: au.layers[l.key] || 'Any' })) : [], hasALayers: !!(au && au.layers),
    polRows: (s.layer === 'cloud' ? [...layerPolicies(s, est, 'all'), ...(s.customPolicies || [])] : layerPolicies(s, est, 'all')).map((p, i) => ({ ...p, key: 'pr' + i, sent: polSentence(p),
      appliesTo: `${p.match} · ${p.matched} matched`,
      // A rule sits in the layer it governs; a violation is marked where it breaks.
      layers: (() => { const L = policyLayers(p), own = layerOfReq(String(p.req).split(' and ')[0]); return POLICY_LAYERS.map(l => { const text = L[l.key], broken = p.viol > 0 && l.key === own && !!text;
        return { key: l.key, label: l.label, text: text || 'Any', set: !!text, broken, ink: broken ? 'var(--error)' : text ? 'var(--text-heading)' : 'var(--text-disabled)', bar: broken ? 'var(--error)' : text ? 'var(--cta)' : 'var(--border-secondary)', weight: broken ? 600 : 400 }; }); })(), dot: p.state === 'enforced' ? 'var(--success)' : p.state === 'simulated' ? 'var(--warning)' : 'var(--text-disabled)', violColor: p.viol ? 'var(--error)' : 'var(--text-light)', hasViol: p.viol > 0, violLabel: p.viol ? `${p.viol} violations` : 'no violations', matchedLabel: `${p.matched} matched`,
      // A violation you cannot act on is a number on a wall. Every violating
      // policy opens the workloads breaking it, on the map, filtered to them.
      act: p.viol ? (p.state === 'simulated' ? 'Enforce' : 'See what is breaking it') : (p.state === 'simulated' ? 'Enforce' : ''),
      hasAct: !!(p.viol || p.state === 'simulated'),
      // wizardVals has no `go` in scope, so this navigates through the
      // component the same way go() does. Calling go() here failed silently.
      actGo: p.viol
        ? () => { c.setState({ screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', obTab: 'flow', mapMode: 'slo', panelTab: 'impact', drill: [], cloudDrill: [], fabDrill: [] }); syncHash('s3', 'cloud', 'observe'); window.scrollTo(0, 0); }
        : () => set({ authoring: { match: p.match, scope: 'any cloud', req: [p.req] } }),
      actBg: p.viol ? 'var(--cta)' : 'transparent',
      actInk: p.viol ? '#fff' : 'var(--link)',
      actBorder: p.viol ? 'var(--cta)' : 'var(--border-primary)' })),
    // Multi-layer starting points: a rule at every layer, carried into the author.
    examplePolicies: MULTI_LAYER.map(t => ({ key: t.key, t: t.name, m: t.match, why: t.why, r: t.layers.core,
      layers: POLICY_LAYERS.map(l => ({ key: l.key, label: l.label, text: t.layers[l.key] })),
      go: () => set({ govPanel: 'policies', authoring: { match: t.match, scope: 'any cloud', req: [t.layers.core], layers: t.layers, templateName: t.name } }) })),
  };
}


// ---------- Shell: elevator, top tabs, rail ----------
function shellVals(s, set, go, est, c, sched) {
  const dark = s.theme === 'dark';
  const iconDir = dark ? 'brand/icons-dark' : 'brand/icons-light', iconLink = dark ? 'brand/icons-linkdark' : 'brand/icons-link';
  // Scheduled discovery, read once for the title row and the rail.
  const schedAcctIds = sched.accounts.map(a => a.id);
  const nextWord = SCH.nextLabel(sched.nextSchedule, sched.nextAt, sched.nowMs);
  const scannedWord = SCH.agoLabel(sched.lastRun ? sched.lastRun.at : null, sched.nowMs);
  const schedLine = s.scanBusy ? 'Scanning…'
    : sched.cadence.empty ? 'No accounts connected yet'
    : `Scanned ${scannedWord} · next ${nextWord}`;
  const schedTitle = sched.cadence.empty
    ? 'Connect a cloud account to put discovery on a schedule'
    : sched.accounts.map(a => `${a.name}: ${SCH.scheduleLabel(a.schedule)}`).join(' · ');
  const cadenceValue = sched.cadence.id;
  const setCadence = sched.setSchedule(schedAcctIds);
  const wide = typeof window !== 'undefined' ? window.innerWidth >= 1440 : true;
  // Closed by default (Micah, 13:30); opens from the header button or any Ask Andi door.
  const andiOpen = !!s.andiOpen;
  const andiDocked = andiOpen && wide;
  // The AI Fabric layer is out of this build entirely (2026-09-10): the
  // storefront ships the network layer only, so a collaborator picking it up
  // never has to reason about a second layer that is not there.
  const top = s.screen === 's1' ? 'discover' : 'net';
  const layerSubtitle = top === 'discover' || s.screen === 's7' || s.screen === 's8' ? 'All layers' : 'Network services layer';
  // The sub layer belongs to the visit, not the session: leaving the page it
  // was opened on shuts it.
  const close = { elevatorOpen: false, sub: null };
  const goTab = (screen, extra) => () => { go(screen, extra)(); set(close); };
  const topTabs = [
    { key: 'discover', label: 'Discover', current: top === 'discover', go: goTab('s1') },
    { key: 'net', label: 'Network services', current: top === 'net' && s.screen !== 's7' && s.screen !== 's8', go: goTab('s3', { layer: 'cloud', tab: 'connect' }) },
  ].map(t => ({ ...t, border: t.current ? 'var(--cta)' : 'transparent', color: t.current ? 'var(--link)' : 'var(--text-heading)', weight: t.current ? 700 : 500 }));
  const railCur = s.screen === 's2' || s.screen === 's0' ? 'Home' : s.screen === 's3' ? ({ connect: 'Connect', govern: 'Govern', observe: 'Observe', cost: 'Cost' }[s.tab] || 'Home') : ['s4', 's5', 's6'].includes(s.screen) ? 'Connect' : null;
  const dataLayer = 'cloud';
  const rail = [['Home', 'home', () => go('s3', { layer: 'cloud', tab: 'connect' })()], ['Connect', 'cable', go('s3', { layer: dataLayer, tab: 'connect' })], ['Govern', 'check-shield', go('s3', { layer: dataLayer, tab: 'govern' })], ['Observe', 'high-meter', go('s3', { layer: dataLayer, tab: 'observe' })], ['Cost', 'bill', go('s3', { layer: dataLayer, tab: 'cost' })]].map(([label, ic, fn]) => ({ key: label, label, done: label === 'Home' ? false : label === 'Connect' ? est.regionsList.some(r => r.priv) : label === 'Govern' ? est.policiesEnforced > 0 : label === 'Observe' ? (est.observedPct || 0) > 0 : label === 'Cost' ? !!(s.steered && s.steered.length) : false, go: () => { fn(); set(close); }, cur: railCur === label, icon: (railCur === label ? iconLink : iconDir) + '/' + ic + '.svg', bg: railCur === label ? 'var(--bg-accent)' : 'transparent', color: railCur === label ? 'var(--link)' : 'var(--text-heading)', weight: railCur === label ? 700 : 500 }));
  // ---- Chrome switches, for dropping these screens into another shell ----
  // ?chrome=off   hide both the top header and the left rail
  // ?chrome=norail   keep the header, drop the rail
  // ?chrome=noheader keep the rail, drop the header
  // The page body is untouched either way, so the screens can be lifted into
  // a host application's own frame without editing this file.
  const chrome = (() => {
    try { return (new URLSearchParams(window.location.search).get('chrome') || '').toLowerCase(); } catch (e) { return ''; }
  })();
  const showRail = !(chrome === 'off' || chrome === 'norail');
  const showHeader = !(chrome === 'off' || chrome === 'noheader');
  const storeCur = s.screen === 's7' || s.screen === 's8';
  const curLayer = top === 'net' ? 'net' : null;
  const elevator = [
    // Cloud is the only live layer. Network services and Transport and access
    // draw greyed and inert — `vision` is what greys a row.
    { key: 'cloud', name: 'Cloud · NetBond Advanced', tag: 'The on-ramp layer, with control', icon: iconDir + '/cloud.svg', kicker: '', href: 'Elevator Boards.dc.html', go: () => {} },
    { key: 'net', name: 'Network services', tag: 'The services layer', icon: iconDir + '/hub.svg', kicker: '', vision: true, go: (e) => e.preventDefault(), href: '#' },
    { key: 'transport', name: 'Transport and access', tag: 'The physical layer', icon: iconDir + '/cable.svg', kicker: 'Vision', vision: true, go: (e) => e.preventDefault(), href: '#' },
  ].map(l => ({ ...l, cur: l.key === curLayer, notCur: l.key !== curLayer, bg: l.key === curLayer ? 'var(--bg-accent)' : 'transparent', hover: l.vision ? 'transparent' : l.key === curLayer ? 'var(--bg-accent)' : 'var(--bg-neutral)', op: l.vision ? 0.4 : 1, cursor: l.vision ? 'default' : 'pointer' }));
  // ---- Shell (Figma page 113:51): pills, grouped rail, page title, range.
  // The export was drawn for a 64px rail beside a docked Andi at 1440. The
  // 240px rail starts expanded only from 1600, where both fit beside the
  // screens as drawn; the toggle overrides at any width.
  const wideRail = typeof window !== 'undefined' ? window.innerWidth >= 1600 : true;
  // A right-hand surface and an expanded rail squeeze the content from both
  // sides at once. The rail gives its width back for as long as a surface is
  // open, and takes it again when the surface closes.
  const surfaceOpen = !!(s.drawerOpen || s.queueOpen || s.mapSel);
  const railCollapsed = surfaceOpen ? true : (s.railCollapsed === undefined ? (andiDocked && !wideRail) : !!s.railCollapsed);
  const railBtnPad = railCollapsed ? '4px 0' : '4px 8px';
  const pillBg = (on) => on ? 'var(--bg-accent)' : 'transparent';
  const pills = [
    { key: 'net', label: 'NaaS', current: true, off: false, go: est.stage === 'empty' ? goTab('s0', { layer: 'cloud' }) : goTab('s3', { layer: 'cloud', tab: 'connect' }) },
  ].map(p => ({ ...p, bg: pillBg(p.current), op: p.off ? 0.4 : 1, cursor: p.off ? 'default' : 'pointer', hover: p.off ? 'transparent' : 'var(--bg-wash)', dis: p.off ? 'true' : 'false' }));
  const obTabNow = s.obTab || 'flow';
  const logsTab = (typeof OBTABS !== 'undefined' && OBTABS.includes('records')) ? 'records' : 'control';
  // later: not in the first cut Ramesh asked for (2026-09-09); still reachable, drawn at 40 percent.
  // `sub` is the stage's job in the customer's words, drawn under the label.
  // A four-word loop only teaches itself if each word says what it is for.
  // `close` clears the sub layer, so a row whose whole job is to open a panel
  // has to close everything else without closing itself.
  const closeKeepSub = { elevatorOpen: false };
  const item = (label, ic, fn, cur, later, sub, keepSub) => ({ key: label, label, pad: railBtnPad, sub: sub || '', hasSub: !!sub, cur: !!cur, go: () => { fn(); set(keepSub ? closeKeepSub : close); }, icon: iconDir + '/' + ic + '.svg', bg: cur ? 'var(--sidebar-accent)' : 'transparent', color: cur ? 'var(--sidebar-fg)' : 'var(--sidebar-muted)', radius: cur ? '8px' : '4px', op: later ? 0.4 : 1, title: later ? label + ' · later, not in the first cut' : (sub ? label + ' · ' + sub : label) });
  const onS3 = (layer, tab) => s.screen === 's3' && s.layer === layer && s.tab === tab;
  const composeCur = ['s4', 's5', 's6'].includes(s.screen);
  /**
   * The sections of the page you are on, as sub-items under the stage.
   *
   * Everything below the picture was invisible: nothing on screen said the
   * page continued, so the tradeoff table, the sources and the products were
   * only ever found by accident. The rail lists them, clicking one glides
   * there, and each section carries the same words as its nav item — so the
   * name you clicked is the name you land on.
   */
  const activeSec = s.activeSec || '';
  const subNav = ((s.screen !== 's3' && s.screen !== 's1')) ? [] : (SECTIONS[s.screen === 's1' ? 'connect' : s.tab] || []).map(([id, label, ic]) => {
    const isNav = id.startsWith('@');
    const on = isNav ? s.screen === 's1' : (activeSec === id && s.screen === 's3');
    return { key: id, id, label, on, icon: iconDir + '/' + (ic || 'apps') + '.svg', go: isNav ? go('s1') : id.startsWith('sec-') ? () => set({ scrollToSec: id, scrollNonce: (s.scrollNonce || 0) + 1 }) : () => set({ sub: { page: s.tab, panel: id } }),
      bg: on ? 'var(--sidebar-accent)' : 'transparent', color: on ? 'var(--sidebar-fg)' : 'var(--sidebar-muted)', radius: on ? '8px' : '4px' };
  });
  const hasSubNav = false;
  // The rail carries the cadence with no new markup: item() already takes a sub.
  const railSub = { sources: sched.cadence.empty ? '' : `Next scan ${nextWord}` };
  const railGroups = (() => {
        // Their rail, our destinations. Home on top, then a bold group label
        // per verb over the very rows the sub-nav already carried. Nothing
        // moves, nothing is added, nothing is dropped.
        const seq = railFor(est).sequence;
        const TABS = STOPS.map(st => [st.key, st.label]);
        const row = (tab, id, label, ic, sub) => {
          // Three kinds of sub-task: a view on the inventory, a section of the
          // stop's own page, and a panel in the sub layer.
          const isView = id.startsWith('@');
          const isPanel = !isView && !id.startsWith('sec-');
          const view = isView ? id.slice(1) : '';
          const cur = isView ? (view === 'insights' || view === 'logs' ? onS3('cloud', 'observe') && s.obPage === view : view === 'estate' ? s.screen === 's1' && s.discoverView !== 'sources' : view === 'sources' ? s.screen === 's1' && s.discoverView === 'sources' : ['s4', 's5', 's6'].includes(s.screen))
            : isPanel ? (onS3('cloud', tab) && s.sub && s.sub.page === tab && s.sub.panel === id)
            : id === 'sec-paths' ? (onS3('cloud', 'connect') && s.cnPage === 'options')
            : tab === 'govern' ? (onS3('cloud', tab) && (id === 'sec-starting' ? 'templates' : 'policies') === (s.govPanel || 'policies'))
            : tab === 'cost' ? (onS3('cloud', tab) && costPanelOf(s.costPanel) === (COST_DOOR[id] || 'spend') && !(s.sub && s.sub.page === 'cost'))
            : (onS3('cloud', tab) && activeSec === id && (tab !== 'observe' || !['insights', 'logs'].includes(s.obPage)));
          const goTo = isView ? (view === 'insights' || view === 'logs' ? go('s3', { layer: 'cloud', tab: 'observe', obPage: view, sub: null }) : view === 'estate' ? go('s1') : view === 'sources' ? go('s1', { discoverView: 'sources' }) : go('s4'))
            : isPanel ? () => { go('s3', { layer: 'cloud', tab })(); set({ sub: { page: tab, panel: id } }); }
            : id === 'sec-paths' ? go('s3', { layer: 'cloud', tab: 'connect', cnPage: 'options' })
            : () => { go('s3', { layer: 'cloud', tab, ...(tab === 'observe' ? { obPage: 'perf', obPanel: 'map' } : {}), ...(tab === 'cost' ? { costPanel: COST_DOOR[id] || 'spend' } : {}), ...(tab === 'govern' ? { govPanel: id === 'sec-starting' ? 'templates' : 'policies' } : {}) })(); set({ scrollToSec: id, scrollNonce: (s.scrollNonce || 0) + 1 }); };
          // A section sits one step in from the category that owns it.
          return { ...item(label, ic, goTo, cur, false, sub, isPanel || isView), pad: railCollapsed ? '4px 0' : '4px 8px 4px 24px' };
        };
        const goTabRow = (key) => key === 'discover' ? go('s1')
          : key === 'observe' ? () => { go('s3', { layer: 'cloud', tab: 'observe' })(); set({ obPage: 'perf', obTab: 'flow' }); }
          // Connect is its own page now, opening on Options; the home is NaaS.
          : key === 'connect' ? go('s3', { layer: 'cloud', tab: 'connect', cnPage: 'options' })
          : go('s3', { layer: 'cloud', tab: key });
        return [
          { key: 'home', hasTitle: false, title: '', items: [
            item('NaaS', 'home', () => { if (est.stage === 'empty') go('s0')(); else go('s3', { layer: 'cloud', tab: 'connect' })(); }, (s.screen === 's3' && s.tab === 'connect' && !['options', 'ways'].includes(s.cnPage)) || s.screen === 's0'),
          ] },
          // Discover, Observe, Govern and Cost are the same kind of thing - the
          // four categories. They get one treatment, always, and the one you
          // are in lists its sections underneath. Rendering three of them as
          // icon rows and the fourth as a group label made peers look like two
          // different levels depending on where you stood.
          ...(seq ? [{
            key: 'steps', hasTitle: true, title: 'Get connected',
            titleGo: () => { go('s1')(); set(close); }, titleCur: s.screen === 's1' || s.screen === 's0',
            items: STEPS.filter(st => st.ready(est)).map(st => ({
              ...item(st.label, st.icon, () => {
                // Until there is a source, adding one is the task, so it is a page;
                // after that, managing them sits in the drawer beside the picture.
                if (st.key === 'sources') { go('s1', { discoverView: 'sources' })(); return; }
                if (st.key === 'estate') { go('s1')(); return; }
                if (st.key === 'options') { go('s3', { layer: 'cloud', tab: 'connect', cnPage: 'options' })(); return; }
                go('s4')();
              }, st.key === 'sources' ? s.screen === 's1' && (s.discoverView === 'sources' || !sched.accounts.length) : st.key === 'estate' ? s.screen === 's1' && s.discoverView !== 'sources' : st.key === 'options' ? s.screen === 's3' && s.tab === 'connect' && s.cnPage === 'options' : false, false, '', st.key === 'sources'), pad: railCollapsed ? '4px 0' : '4px 8px 4px 24px', ready: true }),
            ),
          }] : []),
          ...(seq ? [] : TABS).map(([tab, title]) => {
            const here = tab === 'discover' ? s.screen === 's1'
              : onS3('cloud', tab) || (tab === 'connect' && (s.screen === 's0' || s.screen === 's2'));
            return {
              key: tab, hasTitle: true, title, titleGo: () => { goTabRow(tab)(); set(close); }, titleCur: here,
              // Every category shows its sections all the time. The rail scrolls.
              items: (SECTIONS[tab] || []).map(([id, label, ic]) => row(tab, id, label, ic, railSub[id] || '')),
            };
          }),
        ];
      })();
  const pageTitle = s.screen === 's9' ? 'Help & Resources' : s.screen === 's1' ? 'Discover' : ['s4', 's5', 's6'].includes(s.screen) ? 'Connect' : storeCur ? 'Marketplace'
    // The NaaS home is its own page (Micah, 2026-09-29: "Naas home is called 'Connect'. It needs to be called something else").
    : s.screen === 's3' && s.tab === 'connect' && !['options', 'ways'].includes(s.cnPage) ? 'Your network'
    : s.screen === 's3' ? ({ connect: 'Connect', govern: 'Govern', observe: (obTabNow === logsTab ? 'Observe · Logs' : 'Observe'), cost: 'Cost' }[s.tab] || 'Connect')
    : 'Discover';
  // Re-discover keeps its one click and finally has somewhere to report: the
  // run opens as a panel instead of a two-second flicker on a page of other things.
  const rescanNow = sched.runNow(schedAcctIds, 'manual');
  const rescan = () => { set({ sub: { page: 'discover', panel: 'run' } }); rescanNow(); };
  const credsN = sched.accounts.length;
  const credsLabel = credsN ? `Manage credentials (${credsN})` : 'Manage credentials';
  const credsTitle = credsN
    ? `${credsN} connected ${credsN === 1 ? 'account' : 'accounts'}; this picture is what they can see`
    : 'Connect a cloud account to scan it';
  // Manage credentials went to the empty-estate front door, which is not where
  // the accounts are. It scrolls to the Accounts card by the same mechanism the
  // rail already uses (naas-app.js:1576), and only falls back to s0 when there
  // is genuinely nothing to scroll to.
  // The sub layer. `s.sub` is {page, panel} or null and one aside renders it.
  // A panel may hand over to another when its work is done, which is how the
  // discovery run becomes its own result without a timer.
  const subPage = s.sub ? s.sub.page : null;
  const subPanels = SUB_PANELS[subPage] || [];
  const subDef = subPanels.find(p => p.key === (s.sub && s.sub.panel));
  const subPanelNow = s.sub ? ((subDef && subDef.handoff && subDef.handoff(s)) || s.sub.panel) : null;
  const openSub = (page, panel) => () => set({ ...close, sub: { page, panel } });
  const closeSub = () => set({ sub: null });
  const subOpen = !!s.sub;
  // The open panel's tab reads as chosen; two identical pills never said which was open.
  const subTabs = subPanels.filter(p => p.tab !== false).map(p => { const on = p.key === subPanelNow; return { key: p.key, label: p.label, on, go: openSub(subPage, p.key),
    bg: on ? 'var(--bg-accent)' : 'var(--bg-base)', color: on ? 'var(--link)' : 'var(--text-body)', border: on ? 'var(--border-active)' : 'var(--border-secondary)', weight: on ? 600 : 400 }; });
  const subTitle = subPanelNow === 'add' && s.sourceEdit ? 'Edit a source' : (subPanels.find(p => p.key === subPanelNow) || {}).label || '';
  const openFindings = go('s3', { layer: 'cloud', tab: 'connect', cnPage: 'options', sub: null });
  // The verdict sentence is the door to the findings, but only where the
  // findings exist. Elsewhere it carries no affordance rather than a dead one.
  // Connect's opens its Options; Observe's opens the findings it counts (notes, 2026-09-29).
  const verdictIsDoor = s.screen === 's3' && (s.tab === 'connect' || s.tab === 'observe');
  const verdictGo = !verdictIsDoor ? () => {} : s.tab === 'observe' ? go('s3', { layer: 'cloud', tab: 'observe', obPage: 'insights', insPanel: 'findings', sub: null }) : () => set({ cnPage: 'options' });
  const verdictRole = verdictIsDoor ? 'button' : '';
  const verdictTab = verdictIsDoor ? '0' : '';
  const verdictCursor = verdictIsDoor ? 'pointer' : 'default';
  const verdictLine = verdictIsDoor ? 'underline' : 'none';
  // Panels are gated by position, not by name, so every page uses the same
  // three booleans and a new page needs no new ones. No page has more than three.
  // One answer to "does anything need me", because the question spans all five
  // stops and putting it under one of them means checking four.
  // Discovery is Discover's task, not chrome on five pages. The telemetry
  // window belongs where telemetry is. Govern owns neither and carried both.
  // Discovery belongs to Discover, but Discover is s1 and s1 draws its own
  // header, so the bar has nowhere to land there yet. It stays where the sub
  // layer is until the layer moves out of the Connect block.
  // Discovery is Discover's task, but s1 draws its own header and the shared
  // title row skips s1 entirely, so the controls have nowhere to land there.
  // They stay on Connect until s1's header can carry them.
  const ownsDiscovery = s.screen === 's0' || (s.screen === 's3' && s.tab === 'connect');
  // Cost's figures are monthly rates a window cannot change, so Since lives on Observe only (2026-09-29 audit).
  const ownsTelemetry = s.screen === 's3' && s.tab === 'observe';
  const railIsSequence = railFor(est).sequence;
  const rl = est.regionsList || [];
  const needsYou = [];
  const degradedN = rl.filter(r => r.link === 'degraded').length;
  const exposedN = rl.filter(r => !r.priv).length;
  const unenforced = Math.max(0, (est.policiesAuthored || 0) - (est.policiesEnforced || 0));
  if (degradedN) needsYou.push(`${degradedN} degraded`);
  if (exposedN) needsYou.push(`${exposedN} exposed`);
  if (unenforced) needsYou.push(`${unenforced} unenforced`);
  const needsYouLabel = needsYou.length ? needsYou.join(' · ') : 'Nothing needs you';
  // Exposed is a filter on the estate, not a stop of its own.
  const estateExposedGo = () => { go('s1')(); set({ chips: ['exposed'] }); };
  const subIsAdd = subPanelNow === 'add';
  const subIsRun = subPanelNow === 'run';
  const subIsInsights = subPanelNow === 'insights', subIsLogs = subPanelNow === 'logs';
  // Manage credentials scrolled to a card that is now a panel. It opens it.
  const manageCreds = () => {
    go('s1', { discoverView: 'sources' })();
    set(close);
  };
  const windowLabel = winLabelOf(s);
  const rangeValue = s.obWindow || '30d';
  const setRange = (e) => set({ obWindow: e.target.value });
  const bellLabel = s.submitted ? 'Pending actions: 1 order in flight' : 'Notifications';
  // Screens that carry their own heading (Discover, Compose, Recommend, Review, Marketplace) keep it; the frame's title row stands only where there is none.
  const showPageTitle = !['s1', 's4', 's5', 's6', 's7', 's8'].includes(s.screen);
  return {
    demoOpen: !!s.demoOpen, toggleDemo: () => set({ demoOpen: !s.demoOpen }),
    pills, railGroups, subNav, hasSubNav, pageTitle, credsLabel, credsTitle, manageCreds, showPageTitle, rangeValue, setRange, bellLabel, buildLabel: (typeof window !== 'undefined' && window.__naasVersion) ? `v${window.__naasVersion.build} · ${window.__naasVersion.date}` : '', hasBuildLabel: !!(typeof window !== 'undefined' && window.__naasVersion), railCollapsed, railExpanded: !railCollapsed, railToggleTitle: railCollapsed ? 'Expand navigation' : 'Collapse navigation', iconAndi: 'brand/andi-symbol.svg', iconCalendar: iconDir + '/checklist.svg', goBrowseClose: () => { go('s7')(); set({ demoOpen: false }); },
    topTabs, layerSubtitle, elevatorOpen: !!s.elevatorOpen, toggleElevator: () => set({ elevatorOpen: !s.elevatorOpen }), closeElevator: () => set(close), chevronRot: s.elevatorOpen ? 'rotate(180deg)' : 'rotate(0deg)', elevator,
    goDiscoverClose: goTab('s1'), goHomeClose: goTab('s3', { layer: 'cloud', tab: 'connect' }),
    showRail, showHeader, schedLine, subOpen, subPage, subPanelNow, subTabs, subTitle, closeSub, openFindings, railIsSequence, needsYouLabel, estateExposedGo, ownsDiscovery, ownsTelemetry, verdictGo, verdictRole, verdictTab, verdictCursor, verdictLine, subIsAdd, subIsRun, subIsInsights, subIsLogs, schedTitle, cadenceValue, setCadence, rescan, windowLabel, iconFabric: iconDir + '/cable.svg', toggleRail: () => set({ railCollapsed: !railCollapsed }), railW: railCollapsed ? '64px' : '240px', railPad: railCollapsed ? '16px 12px' : '16px', railJustify: railCollapsed ? 'center' : 'flex-start', railBtnPad, railToggleLabel: railCollapsed ? '›' : '‹', shellCols: (showRail ? (railCollapsed ? '64px ' : '240px ') : '') + 'minmax(0,1fr)' + (andiDocked ? ' 340px' : ''), shellPadRight: '0px', andiOpen, andiClosed: !andiOpen, andiDocked, andiFloating: andiOpen && !andiDocked, andiPos: andiDocked ? 'sticky' : 'fixed', andiRight: andiDocked ? 'auto' : '0', andiShadow: andiDocked ? 'none' : '-8px 0 32px rgba(0,0,0,.14)', andiZ: andiDocked ? '1' : '45', andiW: andiDocked ? 'auto' : '340px', toggleAndi: () => set({ andiOpen: !andiOpen }), shellBg: 'none', railTitle: top === 'ai' ? 'AI Fabric' : 'Network services', rail, storeCur, storeBg: storeCur ? 'var(--bg-accent)' : 'transparent', storeColor: storeCur ? 'var(--link)' : 'var(--text-heading)', storeIcon: (storeCur ? iconLink : iconDir) + '/shopping-bag.svg', iconSearch: iconDir + '/search.svg', iconBell: iconDir + '/bell.svg', iconPerson: iconDir + '/person.svg', iconGear: iconDir + '/gear.svg',
  };
}


// ---------- Round 2: Connect lenses, Cost arbitrage, tag tree ----------
function connectVals(s, set, est, go, ob) {
  const lens = s.lens || 'security';
  const lenses = R.LENSES.map(l => ({ ...l, key: l.id, on: l.id === lens, go: () => set({ lens: l.id }), ub: l.id === lens ? 'var(--cta)' : 'transparent', uc: l.id === lens ? 'var(--link)' : 'var(--text-body)', uw: l.id === lens ? 700 : 500 }));
  const lensQ = (R.LENSES.find(l => l.id === lens) || {}).q;
  const rs = est.regionsList;
  const sample = rs.find(r => !r.priv) || rs[0] || { fab: 8, pub: 60, wl: 100 };
  const cell = (p, l) => ({ security: { text: p.sec.split(' · ')[0], sub: p.sec.split(' · ').slice(1).join(' · '), score: p.secScore }, performance: { text: p.latLabel(sample).split(' · ')[0], sub: p.latLabel(sample).split(' · ')[1], score: p.latScore }, reliability: { text: p.relLabel.split(' · ')[0], sub: p.relLabel.split(' · ')[1], score: p.relScore }, cost: { text: '$' + p.egress.toFixed(2) + '/GB', sub: 'egress, every GB out', score: p.costScore } }[l]);
  // Ramesh (1): the tradeoff between the three ways to reach a region is the
  // thing a customer cannot work out for themselves. It was already modelled
  // in full — uptime, latency, egress per GB, lead time, who runs the kit —
  // and then hidden behind a tab row labelled "Lens" and a collapsed
  // <details>. The lenses are the COLUMNS of one comparison, not a mode you
  // switch the page into.
  const pathCount = (id) => rs.filter(r => R.regionPath(r) === id).length;
  const matrix = R.PATHS.map(p => {
    const n = pathCount(p.id);
    return {
      key: p.id, name: p.name, short: p.short, tone: p.tone, count: n,
      setup: p.setup,
      yours: n === 0 ? 'none today' : `${n} of your ${rs.length} ${n === 1 ? 'region' : 'regions'}`,
      hasYours: n > 0,
      yoursBg: n > 0 ? 'var(--bg-accent)' : 'transparent',
      yoursInk: n > 0 ? 'var(--link)' : 'var(--text-disabled)',
      cells: R.LENSES.map(l => ({ key: l.id, label: l.label, ...cell(p, l.id), color: R.SCORE_COLOR[cell(p, l.id).score], word: R.SCORE_WORD[cell(p, l.id).score], hi: l.id === lens })),
    };
  });
  const spread = R.PATHS.map(p => ({ id: p.id, short: p.short, n: pathCount(p.id) })).filter(x => x.n > 0);
  const pathsSub = rs.length
    ? `Your ${rs.length} regions today: ` + spread.map(x => `${x.n} ${x.short}`).join(' · ')
    : 'Nothing connected yet.';
  const lensRegions = rs.map(r => ({ key: r.region, enter: () => set({ hoverNode: 'reg' + r.region, hoverRegion: r.region }), leave: () => set({ hoverNode: null, hoverRegion: null }), askAndi: () => set({ andiScope: { kind: 'region', id: r.region, label: r.cloud + ' ' + r.region }, andiOpen: true }), region: r.cloud + ' ' + r.region, path: R.PATHS.find(p => p.id === R.regionPath(r)).short, score: R.lensScore(r, lens), dot: R.SCORE_COLOR[R.lensScore(r, lens)], word: R.SCORE_WORD[R.lensScore(r, lens)] })).sort((a, b) => a.score - b.score);
  return { lenses, lens, lensQ, lensVerdict: R.lensVerdict(est, lens), matrix, pathsSub, matrixHeads: R.LENSES.map(l => ({ key: l.id, label: l.label, hi: l.id === lens, color: l.id === lens ? 'var(--link)' : 'var(--text-light)' })), lensRegions, hasLensRegions: rs.length > 0, isCloudLayer: s.layer === 'cloud', notCloudLayer: s.layer !== 'cloud' };
}
/** Cost's views. Savings (Banked) and Forecast are part of Spend now; their old doors land there. */
// Cost lands on Optimize (2026-09-30); the panels that folded into Spend still land there.
const costPanelOf = (k) => (['optimize', 'spend', 'legs', 'money', 'dest', 'mile', 'bucket', 'charges'].includes(k) ? k : ['banked', 'forecast', 'savings'].includes(k) ? 'spend' : 'optimize');
const COST_DOOR = { 'sec-optimize': 'optimize', 'sec-spend': 'spend' };
function egressBaseFor(est, ob) { const bucketToday = (est.buckets || []).reduce((a, b) => a + b.today, 0); return bucketToday || ob.egressMo || 0; }
/** AT&T's own monthly charges for an estate: on-ramps, hosted VPCs, L3
 *  attaches. Cost › AT&T charges lists them; the Sankey's Cost view prices
 *  the on-AT&T paths with them, so the two agree (2026-09-29). */
function costVals(s, set, est, invAll, ob, go, c) {
  const base = egressBaseFor(est, ob);
  // What should I change first (notes, 2026-09-30): four moves, each landing on a real flow.
  const optNow = new Date(SCH.nowOf(s)), optLife = lifeState(s, est);
  const optOpen = findingList(est, est, ob, optNow).map(f => ({ ...f, state: LC.lifeOf(f, optLife, optNow).state })).filter(f => OPEN_STATES.includes(f.state));
  const optCap = OD.capacity(X.connections(est, ob), s.obWindow || '30d');
  const optBase = R.optimizeRows(est, { open: optOpen, capacity: optCap, apps: appsOf(est, invAll, ob.flows || []) });
  const ipsecSites = (est.sites || []).filter(x => siteModeOf(x) === 'ipsec');
  const optGo = {
    spend: () => { const r = est.regionsList.find(x => !x.priv) || est.regionsList[0] || {}; const n = ipsecSites.reduce((a, x) => a + S.countOf(x.name), 0);
      if (n) go('s4', { ...newOrder({ ...prefillAttach(r), source: ['Branch'], bulk: `${n} IPsec ${n === 1 ? 'site' : 'sites'}`, qty: n, sourceLabel: 'Optimize', noteStep: 5, note: `Move ${n} ${n === 1 ? 'site' : 'sites'} off IPsec onto AT&T: ${ipsecSites.map(x => x.name).join(', ')}.` }) })();
      else go('s4', { ...newOrder({ outcome: 'u2', source: ['A cloud region'], dest: ['The Internet'], regionTab: 'US East', metros: ['Ashburn'], resiliency: 'Standard', control: ['Cost-aware routing'], sourceLabel: 'Optimize', noteStep: 0, note: 'Steer the internet egress onto AT&T.' }) })(); },
    routing: () => { go('s3', { layer: 'cloud', tab: 'govern', govPanel: 'policies' })(); set({ authoring: { match: 'region *', scope: 'any cloud', req: ['Cost-aware routing'] } }); },
    resiliency: (r) => { if (!r) return; const metro = REGION_GEO[r.region] || 'Ashburn', group = REGION_OF_METRO(metro), second = (D.COMPOSE_CHIPS.regions[group] || []).find(m => m !== metro) || 'Atlanta';
      go('s4', { ...newOrder({ outcome: 'u1', source: ['Data center'], dest: ['Clouds'], regionTab: group, metros: [metro, second], resiliency: 'Geodiversity', resiliencyChosen: true, control: ['Private path required'], step: 4, prefilled: true, prefillRegion: `${r.cloud} ${r.region}`, prefillWl: r.wl, sourceLabel: 'Optimize', noteStep: 4, note: `Add a second path for ${r.cloud} ${r.region}: a second metro, for geodiversity.` }) })(); },
    capacity: (cp, resize) => { if (!cp) return; const r = est.regionsList.find(x => x.region === cp.region) || {};
      if (!resize) return composeFor(go, r)();
      go('s6', { term: 36, order: { title: `Resize ${cp.cloud} ${cp.region}`, lines: [{ line: 1, product: `Port change, ${F.RAMP_NAME[cp.ramp] || 'NetBond'} ${cp.region}: ${cp.ports} × ${cp.portG} Gbps to ${cp.resizeTo} × ${cp.portG} Gbps`, qty: 1, term: '36-month', monthly: 0, unpriced: true }], policies: [], monthly: 0, savings: 0, days: 1, pathDesc: 'Sized to what it carries, with the peak under 80%' } })(); },
  };
  const optTop = optBase.slice(0, 2).reduce((w, r) => (r.figure > (w ? w.figure : 0) ? r : w), null);
  const optRows = optBase.map(r => ({ ...r, go: r.empty ? () => {} : r.key === 'resiliency' ? () => optGo.resiliency(r.target) : r.key === 'capacity' ? () => optGo.capacity(r.target, r.resize) : optGo[r.key],
    hasCta: !r.empty, hasStart: !!optTop && optTop.key === r.key, hasState: !!r.state, op: r.empty ? 0.6 : 1, lineRows: r.lines.slice(0, 2).map((t, i) => ({ key: r.key + i, text: t })) }));
  const optSave = optBase[0].figure + optBase[1].figure;
  const optVals = { optRows, hasOptRows: est.regionsList.length > 0, optIsEmpty: !est.regionsList.length, optEmpty: 'No egress seen yet.',
    optLine: optSave ? `Save ${fmt(Math.round(optSave / 100) * 100)}/mo across Spend and Routing` : 'Nothing priced to move today' };
  const bT = (est.buckets || []).reduce((a, b) => a + b.today, 0), bF = (est.buckets || []).reduce((a, b) => a + b.fabric, 0);
  const targetSave = bT > bF ? bT - bF : 0;
  const arb = R.arbitrage(est, base, targetSave);
  const fc = R.forecast({ ...ob, egressMo: base }, arb);
  const maxNow = Math.max(1, ...arb.map(a => a.saveN / 0.07 * 0.09));
  // AT&T charges (AO-360): catalog prices against what is attached. Fabric egress is the "On AT&T" total from the buckets.
  const attached = est.regionsList.filter(r => r.priv);
  // `invAll` is the unscoped, unfiltered tree (A.inventory on the same estate
  // applyScope received), intersected down to `est`'s (scoped) region list.
  // Base built vpcsAll straight off a scoped `A.inventory(scopedEst)`, which
  // this reproduces exactly for what vpcsAll reads (v.managed, v.priv - the
  // FIELDS are scope-independent, but the SET of VPCs is not: base's tree
  // only ever contained the scoped regions' VPCs, and a wider tree filtered
  // down to the same region set gives the same counts). Taking `invAll`
  // rather than vals()'s facet-filtered `inv` also keeps a Discover chip
  // from moving the Cost card, which the base never allowed either. When no
  // chip is active this is a cache hit on the same key `inv` already built;
  // one chip active costs one extra cache entry, never a second full build
  // of the scoped tree naas-round2.js's applyScope used to force.
  const inScope = new Set(est.regionsList.map(r => r.region));
  const vpcsAll = invAll.flatMap(c => c.regions.filter(r => inScope.has(r.region)).flatMap(r => r.vpcs));
  const hostedN = vpcsAll.filter(v => v.managed).length, l3N = vpcsAll.filter(v => v.priv && !v.managed).length;
  void hostedN; void l3N;
  const chargeRows = R.attChargeRows(est, invAll);
  const chargeMax = Math.max(1, ...chargeRows.map(r => r.v));
  const attTotal = chargeRows.reduce((a, r) => a + r.v, 0);
  const attCharges = chargeRows.map(r => ({ ...r, vF: fmt(r.v), w: Math.round(r.v / chargeMax * 100) + '%' }));
  // Cost by site class (AO-359): the egress base split by class weight, with the on-fabric share drawn as its own series.
  const SITE_W = { 'Data center': 120, Campus: 20, Plant: 10, Office: 3, Branch: 1, Edge: 0.1, Field: 0.3 };
  const accGroups = {};
  (est.sites || []).forEach(x => {
    // By the service the site buys, in the catalog's words, as every other view counts them (2026-09-29).
    const sv = S.servicesOf(x)[0] || { key: 'other', label: 'Other access' }, k = sv.key, count = S.countOf(x.name);
    const g = accGroups[k] = accGroups[k] || { key: k, label: sv.label, unit: 'site', plural: 'sites', count: 0, onFabric: 0, w: 0 };
    g.count += count; g.onFabric += onAtt(x) ? count : 0; g.w += (SITE_W[S.classOf(x)] || 1) * count;
  });
  const siteCls = Object.values(accGroups);
  const wSum = siteCls.reduce((a, c) => a + c.w, 0) || 1;
  // Where the estate names what its IPsec sites bill (the ipsec bucket), that row
  // carries that figure and the rest of the base splits by weight, so Cost, the
  // Sankey and the savings table all say the same thing (2026-09-28).
  const ipB = (est.buckets || []).find(b => b.id === 'ipsec'); const ipCls = ipB && siteCls.find(c => c.key === 'tpa');
  const wRest = siteCls.filter(c => c !== ipCls).reduce((a, c) => a + c.w, 0) || 1, baseRest = ipCls ? Math.max(0, base - ipB.today) : base;
  const siteRows = siteCls.map(c => { const today = c === ipCls ? ipB.today : Math.round(baseRest * c.w / (ipCls ? wRest : wSum)); const fabPart = Math.round(today * c.onFabric / Math.max(1, c.count)); return { key: c.key, label: c.label, sub: `${c.count.toLocaleString('en-US')} ${c.count === 1 ? c.unit : c.plural} · ${c.onFabric.toLocaleString('en-US')} on AT&T`, today, fabPart, pubPart: today - fabPart }; }).sort((a, b) => b.today - a.today);
  { const drift = base - siteRows.reduce((a, r) => a + r.today, 0); const big = siteRows.filter(r => r.key !== 'ipsec').sort((a, b) => b.today - a.today)[0]; if (big && drift) { big.today += drift; big.fabPart = big.today - big.pubPart; } }
  const siteMax = Math.max(1, ...siteRows.map(r => r.today));
  const bySite = siteRows.map(r => ({ ...r, todayF: fmt(r.today), wFab: Math.round(r.fabPart / siteMax * 100) + '%', wPub: Math.round(r.pubPart / siteMax * 100) + '%', doorLabel: r.pubPart > 0 ? 'Drill →' : 'Drill →',
    explainGo: explainNav(c, { label: r.label || r.key, value: fmt(r.today) + '/mo',
      sub: 'What this first mile costs a month in egress.', cut: 'The records that come in from these sites.',
      pattern: 'inbound', parts: [] }), go: go('s1', { siteOpen: { [r.key]: true }, treeOrMap: 'tree' }) }));
  const attNet = (ob.savingsMo || 0) - attTotal;
  const pubSite = siteRows.filter(r => r.pubPart > 0).sort((a, b) => b.pubPart - a.pubPart)[0];
  const top = arb[0];
  // Banked (notes, 2026-09-29): what acting actually saved, as a running total, beside what is still open.
  const bNow = new Date(SCH.nowOf(s));
  const bLife = lifeState(s, est);
  const bankSeries = LC.banked(est, bLife, bNow);
  const bankTo = bankSeries.length ? bankSeries[bankSeries.length - 1] : { saved: 0, cumulative: 0 };
  const stillOpen = findingList(est, est, ob, bNow).filter(f => f.priced && OPEN_STATES.includes(LC.lifeOf(f, bLife, bNow).state)).reduce((a, f) => a + f.save, 0);
  const hasBank = bankTo.cumulative > 0;
  const MON3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = (m) => `${MON3[+m.slice(5, 7) - 1]} ${m.slice(0, 4)}`;
  const bankMax = Math.max(1, ...bankSeries.map(b => b.cumulative));
  const bySiteTotal = siteRows.reduce((a, r) => a + r.today, 0);
  // Three rings instead of one four-tint bar. Every figure here is already
  // somewhere else on this page; the rings are the shape of it, not new data.
  // Compact money for the middle of a ring, where "$121,400" will not fit.
  // One decimal always: $17.5k has to read back to the $17,500 in the headline.
  const kF = (v) => v >= 1000 ? '$' + (v / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : fmt(v);
  const dcls = R.destClasses(ob, base, targetSave);
  const fabPart = siteRows.reduce((a, r) => a + r.fabPart, 0), pubPart = siteRows.reduce((a, r) => a + r.pubPart, 0);
  const bks = est.buckets || [];
  const atRate = bks.filter(b => b.today <= b.fabric).reduce((a, b) => a + b.today, 0);
  const recover = bks.reduce((a, b) => a + Math.max(0, b.today - b.fabric), 0);
  const residual = bks.filter(b => b.today > b.fabric).reduce((a, b) => a + b.fabric, 0);
  const costDonuts = [
    R.donut(dcls.map(d => ({ label: d.label, v: Math.round((base || 0) * d.share), sub: `${d.hyperF}/GB → ${d.fabricF}/GB` })),
      { key: 'dest', title: 'Where the egress goes', sub: 'Four destination classes, this month', centre: kF(base || 0), centreSub: 'a month' }),
    R.donut([
      { label: 'On the AT&T network', v: fabPart, color: 'var(--viz-1)', sub: `${siteRows.filter(r => r.pubPart === 0).length} of ${siteRows.length} first miles` },
      { label: 'Public first mile', v: pubPart, color: 'var(--viz-4)', sub: 'no rate control' },
    ], { key: 'path', title: 'How it leaves the building', sub: 'The same bill, split by first mile', centre: (bySiteTotal ? Math.round(fabPart / bySiteTotal * 100) : 0) + '%', centreSub: 'of egress' }),
    R.donut([
      { label: 'Already at AT&T rate', v: atRate, color: 'var(--viz-3)', sub: 'nothing to recover' },
      { label: 'Recoverable now', v: recover, color: 'var(--viz-4)', sub: 'the premium over $0.02/GB' },
      { label: 'Base after steering', v: residual, color: 'var(--viz-2)', sub: 'the bytes still cost something' },
    ], { key: 'move', title: 'What can actually move', sub: 'Every bucket, by whether steering changes the bill', centre: kF(recover), centreSub: 'recoverable' }),
  ].filter(d => d.total > 1).map(d => ({ ...d, rows: d.rows.map(r => ({ ...r, key: d.key + ':' + r.label })) }));
  return { ...optVals, attCharges, hasAttCharges: attCharges.length > 0, attTotalF: fmt(attTotal), attNetF: (attNet >= 0 ? '+' : '−') + fmt(Math.abs(attNet)), attNetLabel: attNet >= 0 ? 'Net saving after charges' : 'Net cost after savings', attNetColor: attNet >= 0 ? 'var(--success)' : 'var(--warning)', attNote: `${fmt(attTotal)}/mo · carries ${fmt(ob.savingsMo || 0)}/mo of savings`, goMarketplace: go('s7'),
    // Two moves, not a paragraph (2026-09-28): the biggest region to attach and
    // the sites still outside AT&T, each a figure and one button.
    // Spend, savings and forecast in one view (Micah, 2026-09-29: "combine
    // savings and forecast with spend"): the tiles and the chart share one model.
    ...(() => {
      const moveSave = arb.reduce((a, r) => a + r.saveN, 0);
      const st = R.spendStory({ base, moveSave, series: bankSeries });
      const last = st.past[st.past.length - 1] || { spend: base, saved: 0 };
      const n3 = st.next[st.next.length - 1];
      const mx = Math.max(1, ...st.past.map(p => p.spend + p.saved), ...st.next.map(n => n.asIs));
      const pct = (v) => (v / mx * 100).toFixed(2) + '%';
      const lastMonth = st.past.length ? st.past[st.past.length - 1].month : null;
      const aheadName = (m) => { if (!lastMonth) return `+${m} mo`; const y = +lastMonth.slice(0, 4), mo = +lastMonth.slice(5, 7) - 1 + m; return `${MON3[mo % 12]} ${y + Math.floor(mo / 12)}`; };
      const short = (name) => name.split(' ')[0];
      // Money on a tile is whole hundreds, as on every other tile.
      const r100 = (v) => Math.round(v / 100) * 100;
      return {
        spendTiles: [
          { key: 'spend', l: 'Spend this month', v: fmt(last.spend), u: '/mo', sub: 'egress, every bucket', tone: 'var(--text-heading)' },
          { key: 'banked', l: 'Banked to date', v: fmt(bankTo.cumulative), u: '', sub: `${fmt(last.saved)} this month`, tone: 'var(--success)' },
          { key: 'could', l: 'Could save', v: fmt(Math.round(moveSave / 100) * 100), u: '/mo', sub: 'if every public region moves', tone: 'var(--success)' },
          { key: 'ahead', l: 'In 90 days', v: fmt(r100(n3 ? n3.moved : last.spend)), u: '/mo', sub: n3 ? `with the moves · ${fmt(r100(n3.asIs))} as is` : 'as is', tone: 'var(--text-heading)' },
        ],
        spendFrom: st.past.length ? monthName(st.past[0].month) : '', spendTo: st.next.length ? aheadName(st.next[st.next.length - 1].m) : '',
        spendCols: [
          ...st.past.map((p, i) => ({ key: p.key, kind: 'past', label: i === 0 || i === st.past.length - 1 ? monthName(p.month) : short(monthName(p.month)), spendN: p.spend, baseN: p.spend, topN: p.saved,
            baseH: pct(p.spend), topH: pct(p.saved), baseFill: 'var(--viz-1)', topFill: 'var(--success)', topBorder: 'none', opacity: 1,
            title: `${monthName(p.month)} · spent ${fmt(p.spend)} · banked ${fmt(p.saved)} by acting` })),
          ...st.next.map(n => ({ key: n.key, kind: 'next', label: short(aheadName(n.m)), spendN: n.moved, movedN: n.moved, baseN: n.moved, topN: n.asIs - n.moved,
            baseH: pct(n.moved), topH: pct(n.asIs - n.moved), baseFill: 'var(--viz-1)', topFill: 'transparent', topBorder: '1.5px dashed var(--warning)', opacity: 0.55,
            title: `${aheadName(n.m)} · ${fmt(n.moved)} with the moves · ${fmt(n.asIs)} as is · ${fmt(n.asIs - n.moved)} to save` })),
        ],
        spendNowIx: st.past.length,
        spendLegend: [['var(--viz-1)', 'Spend', 'none'], ['var(--success)', 'Banked savings', 'none'], ['var(--viz-1)', 'With the moves', 'none'], ['transparent', 'Could save', '1.5px dashed var(--warning)']].map(([c, l, b], i) => ({ key: l, color: c, label: l, border: b, op: i === 2 ? 0.55 : 1 })),
      };
    })(),
    bankTiles: [
      { key: 'to', l: 'Banked to date', v: fmt(bankTo.cumulative), u: '', tone: 'var(--success)' },
      { key: 'mo', l: 'This month', v: fmt(bankTo.saved), u: '/mo', tone: 'var(--success)' },
      { key: 'open', l: 'Still open', v: fmt(stillOpen), u: '/mo', tone: 'var(--text-heading)' },
      { key: 'pct', l: 'Realised', v: `${Math.round(bankTo.saved / ((bankTo.saved + stillOpen) || 1) * 100)}%`, u: 'of what is on the table', tone: 'var(--text-heading)' },
    ],
    // Savings by region, business unit or cloud (notes, 2026-09-29): this month's banked and what is still open, split.
    ...(() => { const dim = ['region', 'bu', 'cloud'].includes(s.saveGroup) ? s.saveGroup : 'region';
      const rows = LC.savingsBy(est, dim, { banked: bankTo.saved, open: stillOpen }, ((s.siteTags || {})[est.id]) || {});
      const mx = Math.max(1, ...rows.map(r => r.banked + r.open));
      return { saveGroupValue: dim, setSaveGroup: (e) => set({ saveGroup: e.target.value }),
        saveRows: rows.map(r => ({ key: r.key, label: r.label, bankedN: r.banked, openN: r.open, bankedF: fmt(r.banked), openF: fmt(r.open), bw: (r.banked / mx * 100).toFixed(1) + '%', ow: (r.open / mx * 100).toFixed(1) + '%' })) }; })(),
    bankBars: bankSeries.map(b => ({ key: b.month, h: (b.cumulative / bankMax * 100).toFixed(2) + '%', title: `${monthName(b.month)} · ${fmt(b.saved)} banked · ${fmt(b.cumulative)} to date` })),
    bankFrom: bankSeries.length ? monthName(bankSeries[0].month) : '', bankTo: bankSeries.length ? monthName(bankSeries[bankSeries.length - 1].month) : '',
    // One slot per Cost panel (2026-09-29 audit): the summary or its arithmetic, never both stacked.
    costDetail: !!s.costDetail, costSummary: !s.costDetail, toggleCostDetail: () => set({ costDetail: !s.costDetail }), costDetailWord: s.costDetail ? 'Show the summary' : 'Show the arithmetic',
    // One panel at a time (2026-09-28, no scrolling).
    // Cost in three legs (notes, 2026-09-30, A2): site access, cloud connectivity, the cloud provider.
    ...(() => { const legs = R.costLegs(est, invAll, ob.utilRows);
      const row = (r) => ({ key: r.key, label: r.label, sub: r.sub, title: r.title || r.sub, vF: fmt(Math.round(r.v)), modelled: !!r.modelled, mark: r.modelled ? 'Modelled' : '' });
      const share = (v) => (legs.total > 0 ? Math.round(v / legs.total * 100) : 0);
      return { legTiles: [legs.access, legs.connect, legs.cloud].map(l => ({ key: l.key, l: l.label, v: fmt(Math.round(l.total)), u: '/mo', sub: `${share(l.total)}% of ${fmt(Math.round(legs.total))}` })),
        legAccessRows: legs.access.rows.map(row), legConnectRows: legs.connect.rows.map(row), legCloudRows: legs.cloud.rows.map(row),
        hasLegs: legs.total > 0, noLegs: !(legs.total > 0), legEmpty: legs.total > 0 ? '' : 'No egress seen yet.',
        legLine: `${fmt(Math.round(legs.total))}/mo end to end. AT&T charges are catalog prices; other providers' list prices are marked Modelled.` }; })(),
    ...(() => { const cpk = costPanelOf(s.costPanel); void hasBank;
      return { costPanels: [['optimize', 'Optimize'], ['spend', 'Spend'], ['legs', 'By leg'], ['money', 'By region'], ['dest', 'By destination'], ['mile', 'By first mile'], ['bucket', 'By bucket'], ['charges', 'AT&T charges']].map(([k, l]) => { const on = cpk === k; return { key: k, label: l, on, go: () => set({ costPanel: k }), line: on ? 'var(--cta)' : 'transparent', color: on ? 'var(--text-heading)' : 'var(--text-light)', weight: on ? 700 : 500 }; }),
        costPanelOptimize: cpk === 'optimize', costPanelSpend: cpk === 'spend', costPanelLegs: cpk === 'legs', costPanelMoney: cpk === 'money', costPanelCharges: cpk === 'charges', costPanelDest: cpk === 'dest', costPanelMile: cpk === 'mile', costPanelBucket: cpk === 'bucket' }; })(),
    bySite, hasBySite: bySite.length > 0, bySiteTotalF: fmt(bySiteTotal), bySiteNote: `${fmt(siteRows.reduce((a, r) => a + r.pubPart, 0))}/mo still on a public first mile`, goSites: go('s1'),
    costDonuts, hasCostDonuts: costDonuts.length > 0,
    arbitrage: arb.map(a => ({ ...a, fabW: Math.round(a.saveN / 0.07 * 0.02 / maxNow * 100) + '%', premW: Math.round(a.saveN / maxNow * 100) + '%',
      explainGo: explainNav(c, { label: `${a.cloud || ''} ${a.region || a.label || ''}`.trim() + ' · what it would save', value: a.saveF || fmt(a.saveN) + '/mo',
        sub: 'The premium this region pays for leaving on the public path.',
        cut: 'The records this region sent on the public path.', path: 'public', parts: [] }), enter: () => set({ hoverNode: 'reg' + a.regionId }), leave: () => set({ hoverNode: null }), attach: go('s4', { ...newOrder(prefillAttach(a)) }) })), hasArbitrage: arb.length > 0, arbTotal: fmt(arb.reduce((a, r) => a + r.saveN, 0)), arbTotalYr: fmt(arb.reduce((a, r) => a + r.saveN, 0) * 12),
    // Cost figures reach the same records. A dollar figure is bytes times a
    // rate, so it explains through the flows that carried the bytes.
    destClasses: R.destClasses(ob, base, targetSave).map((d, i) => ({ ...d, op: [1, 0.75, 0.5, 0.3][i] || 0.3,
      explainGo: explainNav(c, { label: d.label, value: d.nowF || ('$' + (d.now || 0).toLocaleString('en-US') + '/mo'),
        sub: `${d.gbF} GB a month at ${d.hyperF} on the hyperscaler against ${d.fabricF} on AT&T.`,
        cut: 'The flow records that carried those bytes.',
        pattern: { ai: 'internet', obj: 'regions', inet: 'internet', x: 'clouds' }[d.key], parts: [] }) })), forecast: fc, fcVB: `0 0 ${fc.W} ${fc.H}`, commitments: R.commitments(est, base).map(cm => ({ ...cm, short: /^Commit/.test(cm.verdict) ? 'Commit' : 'Stay metered',
      explainGo: explainNav(c, { label: (cm.label || cm.region || 'On-ramp') + ' · metered volume', value: cm.gbF ? cm.gbF + ' GB/mo' : '',
        sub: 'The bytes the metered bill is charging for.', cut: 'The records this region carried.', parts: [] }) })), hasCommitments: R.commitments(est, base).length > 0 };
}
function tagTree(inv, tree, chip) {
  const groups = {};
  tree.forEach(cl => cl.regions.forEach(rg => rg.vpcs.forEach(vp => { [(vp.tags[0] || { label: 'untagged' }).label, ...(vp.userLabels || [])].forEach(t => { groups[t] = groups[t] || { key: 'tag-' + t, name: t, tagChip: chip(t), regions: {}, wl: 0, priv: true }; const rk = cl.name + ' ' + rg.region; groups[t].regions[rk] = groups[t].regions[rk] || { ...rg, key: t + rk, region: rk, vpcs: [] }; groups[t].regions[rk].vpcs.push(vp); groups[t].wl += vp.wl || 0; if (!vp.priv) groups[t].priv = false; }); })));
  return Object.values(groups).map(g => ({ ...g, isTag: true, notTag: false, askAndi: () => {}, hasMark: false, noMark: false, gpu: false, open: true, toggle: () => {}, caret: 'rotate(90deg)', sub: (() => { const nr = Object.keys(g.regions).length, nc = new Set(Object.keys(g.regions).map(k => k.split(' ')[0])).size; return `${nr} region${nr === 1 ? '' : 's'} across ${nc} cloud${nc === 1 ? '' : 's'} · ${g.wl.toLocaleString('en-US')} workload${g.wl === 1 ? '' : 's'} · one policy covers all of it`; })(), badge: { label: g.priv ? 'all on AT&T' : 'some on the public internet', bg: g.priv ? '#eef8f0' : 'var(--bg-wash)', border: g.priv ? '#8fd4a4' : 'var(--border-secondary)', color: g.priv ? '#1e7a3c' : 'var(--text-body)' }, regions: Object.values(g.regions) })).sort((a, b) => b.wl - a.wl);
}


// ---------- Andi: the advice layer ----------
function andiVals(s, set, go, est, ob, x) {
  const { findingCard, sortF, findingsFor, isEmpty } = x;
  const scope = s.andiScope || null; // {kind:'region'|'tag'|'finding'|'flow', id, label}
  const naasFindings = est.findings.filter(f => f.layer !== 'ai');
  const screenFindings = s.screen === 's3' ? sortF(findingsFor(s.layer, s.tab).filter(f => f.layer !== 'ai')) : s.screen === 's2' || s.screen === 's1' || s.screen === 's0' ? sortF(naasFindings) : [];
  let lead = '', sub = '', focus = null, qs = [], acts = [];
  if (s.screen === 's2' || s.screen === 's0') { const c = x.conns; const deg = c && c.rows.find(r => r.degraded); lead = isEmpty ? 'Nothing connected yet. Connect a cloud and the picture fills in.' : deg ? `${deg.cloud} ${deg.region} is degraded on ${deg.ramp}: ${deg.wl.toLocaleString('en-US')} workloads behind it. ${x.floorVerdict}` : x.floorVerdict; sub = isEmpty ? 'Connect, then Observe, then Govern, then Cost. Each page ends with the next stop.' : 'Connect what is still public. Observe what the AT&T network carries. Govern it. Cost proves it.'; qs = isEmpty ? ['What do I need to connect?', 'What will I see once attached?', 'What does it cost?'] : ['What is degraded and what does it impact?', 'Which region should I attach first?', 'How much is on the table?']; }
  else if (s.screen === 's1') { lead = x.discoverVerdict; sub = 'Open a cloud to see regions, VPCs, subnets, endpoints and resources. Tags are how you will control them.'; qs = ['Which VPCs are internet-exposed?', 'What does tag PCI touch?', 'Where are my sites attached?']; }
  else if (s.screen === 's3') {
    lead = { connect: x.connectVerdict, govern: x.governVerdict, observe: ob.verdict, cost: x.costVerdict }[s.tab] || '';
    sub = { connect: 'Compare the three paths on any region, or switch the lens to see performance, reliability and cost.', govern: 'Policies are sentences over tags and regions. Simulate before you enforce.', observe: ob.briefing, cost: 'Every figure derives from one egress base; the arbitrage table shows the arithmetic.' }[s.tab] || '';
    qs = { connect: ['Which region should I attach first?', 'What does NetBond give me over Direct Connect?', 'Where does latency vary by hour?'], govern: ['Which policy has violations?', 'What would enforcing PCI change?', 'Is anything internet-facing uninspected?'], observe: ['Which flow saves most if steered?', 'What is driving public egress?', 'Is any controlled flow single-homed?'], cost: ['Where is the biggest arbitrage?', 'Commit or stay metered?', 'What does the 90-day curve assume?'] }[s.tab] || [];
    if (s.tab === 'observe') acts = [{ key: 'a', label: 'Show public flows', go: () => set({ obTab: 'flow' }) }, { key: 'b', label: 'Steer worst offender', go: ob.worst ? () => set({ steered: [...(s.steered || []), ob.worst.id] }) : () => {} }, { key: 'c', label: 'Path diversity', go: () => set({ obTab: 'control' }) }];
  }
  else if (s.screen === 's4') { lead = (s.compose && s.compose.note) || (s.compose && s.compose.prefilled ? `Started from your estate: ${s.compose.prefillRegion} has ${s.compose.prefillWl} workloads on the public internet. Every step is filled; change what you like.` : 'Describe the outcome. AT&T composes the connection.'); sub = ['One outcome per order; the control ships with the path.', 'Pick every source that applies.', 'The destination decides the on-ramp.', 'Two metros for geodiversity or maximum resiliency.', 'Standard is one path; the other two add a second metro.', 'This is the policy, in Govern\'s words.'][(s.compose && s.compose.step) || 0]; qs = ['Why two metros?', 'What does inline inspection cost?', 'How long until it is live?']; }
  else if (s.screen === 's6') { lead = 'Review the order. Nothing is ordered until you submit.'; qs = ['What ships on day one?', 'Can I change the policy later?']; }
  else if (s.screen === 's7' || s.screen === 's8') { lead = 'Filter by what the path must do, not by product name.'; qs = ['Which products fit tag PCI?', 'What do estates like mine choose?']; }
  // scoped focus
  if (scope && scope.kind === 'region') { const r = est.regionsList.find(z => z.region === scope.id); if (r) { const deg = r.link === 'degraded'; lead = deg ? `${r.cloud} ${r.region} is degraded on ${F.RAMP_NAME[r.ramp] || 'NetBond'}: BGP flapping, 0.31% drops, ${r.wl} workloads behind it${(r.paths || 1) >= 2 ? ', a second path holding' : ', single path'}.` : `${r.cloud} ${r.region}: ${r.wl} workloads, ${r.priv ? 'on AT&T at ' + r.fab + ' ms' : 'on the public internet at ' + r.pub + ' ms'}. Tags ${r.tags.join(', ') || 'none'}.`; sub = deg ? ((r.paths || 1) >= 2 ? 'Access holds. Govern it: a policy that requires the second path keeps it that way.' : 'Access is lost if this link fails. Add a second path, then a policy that requires it.') : r.priv ? 'Already attached. The remaining lever is policy: which tags may reach the internet.' : `Attaching it moves ${r.wl} workloads to $0.02/GB and ${r.fab} ms, deterministic.`; qs = deg ? ['Which workloads are impacted?', 'What does a second path cost?', 'Author the policy'] : ['Compare the three paths here', 'What would a private-path policy change?', 'Who owns these resources?']; } }
  if (scope && scope.kind === 'tag') { lead = `Tag ${scope.id} spans clouds. One policy covers every VPC carrying it.`; sub = 'When tag ' + scope.id + ' reaches any cloud, require a private path.'; qs = ['Author that policy', 'Which VPCs carry it?', 'Any of them internet-exposed?']; }
  const top = scope && scope.kind === 'finding' ? est.findings.find(f => f.kind === scope.id) : screenFindings[0];
  if (top) focus = findingCard(top);
  const more = screenFindings.filter(f => !top || f.kind !== top.kind).slice(0, 4).map(f => ({ key: f.kind, head: f.head, save: f.priced ? fmt(f.save) + '/mo' : '', go: () => set({ andiScope: { kind: 'finding', id: f.kind, label: f.head }, andiOpen: true }) }));
  const thread = (s.andiThread || []).filter(t => t.screen === s.screen + (s.tab || '')).slice(-6);
  const ask = (q) => () => set({ andiThread: [...(s.andiThread || []), { key: 'q' + ((s.andiThread || []).length + 1), screen: s.screen + (s.tab || ''), q, a: answer(q, est, ob, s) }] });
  return {
    andiLead: lead, andiSub: sub, hasAndiSub: !!sub, andiFocus: focus, hasAndiFocus: !!focus, andiMore: more, hasAndiMore: more.length > 0, andiQs: qs.map((q, i) => ({ key: 'q' + i, q, ask: ask(q) })), andiActs: acts, hasAndiActs: acts.length > 0,
    andiThread: thread, hasAndiThread: thread.length > 0, andiScopeLabel: scope ? scope.label : '', hasAndiScope: !!scope, clearAndiScope: () => set({ andiScope: null }),
    andiInput: s.andiInput || '', setAndiInput: (e) => set({ andiInput: e.target.value }), andiSend: () => { if (!s.andiInput) return; ask(s.andiInput)(); set({ andiInput: '' }); }, andiKey: (e) => { if (e.key === 'Enter' && s.andiInput) { ask(s.andiInput)(); set({ andiInput: '' }); } },
    andiIsEmpty: isEmpty,
  };
}
function answer(q, est, ob, s) {
  const l = q.toLowerCase();
  const pub = est.regionsList.filter(r => !r.priv);
  const worst = pub.slice().sort((a, b) => b.wl - a.wl)[0];
  if (/first|start/.test(l)) return worst ? `Attach ${worst.cloud} ${worst.region}: ${worst.wl} workloads on the public internet, the largest single gap. It closes cost, security and the latency spike at once.` : 'Everything is attached. The next lever is policy: enforce the simulated ones.';
  if (/outlier|latency|vary/.test(l)) { const w = est.regionsList.find(r => r.rel === 'warn') || worst; return w ? `${w.cloud} ${w.region}: ${w.pub} ms on the public path, ${w.fab} ms on AT&T. Public transit has no latency floor; it varies by hour.` : 'No outliers in this window.'; }
  if (/table|much|save|arbitrage|biggest/.test(l)) { const t = (est.buckets || []).reduce((a, b) => a + Math.max(0, b.today - b.fabric), 0); return `${fmt(t)}/mo is on the table across the public regions; the arbitrage table shows the arithmetic per region. ${fmt(ob.savingsMo)}/mo is already saved on AT&T.`; }
  if (/netbond|direct connect|expressroute|native/.test(l)) return 'NetBond: 99.99% with dual PE and managed failover, any cloud from one port, AT&T provisions both ends in about 10 days. Direct Connect or ExpressRoute: 99.9% on a single circuit unless you buy two, one cloud per port, you order the LOA and cross-connect, 4 to 8 weeks. Same $0.02/GB either way.';
  if (/exposed|internet-facing|uninspected/.test(l)) { const f = est.findings.find(x => /internet|exposed|inspect/i.test(x.head)); return f ? f.head + '. ' + f.ev : 'Nothing internet-facing is uninspected.'; }
  if (/pci/.test(l)) { const f = est.findings.find(x => x.kind === 'pci'); return f ? f.head + '. Enforcing "when tag PCI reaches any cloud, require private path" closes it; simulate first to see the affected paths dashed on the picture.' : 'No PCI-tagged workload touches the internet.'; }
  if (/violation/.test(l)) return 'Simulated policies show violations without changing traffic. Enforced ones show zero by definition; the count you see is what enforcement would have blocked.';
  if (/steer|flow/.test(l)) return ob.worst ? `${ob.worst.name}: ${ob.worst.gbps} Gbps at ${ob.worst.latency} ms on the public path. Steering it saves about ${fmt(Math.round(ob.worst.gbps * 190))}/mo and puts it under AT&T control.` : 'Every flow is already controlled.';
  if (/egress|driving/.test(l)) return `Object-storage reads and AI-endpoint traffic from ${pub.map(r => r.region).slice(0, 2).join(' and ') || 'the public regions'} at $0.09/GB. The same bytes on AT&T are $0.02.`;
  if (/single-homed|diversity|failover/.test(l)) return 'Controlled flows on a single metro have no second path. Geodiversity adds a second metro and on-ramp; maximum adds managed failover.';
  if (/commit|metered/.test(l)) return 'A committed on-ramp beats metered above about 100,000 GB/mo per region. Below that, stay metered; the table on Cost gives the verdict per region.';
  if (/90|curve|assume/.test(l)) return 'As-is grows 6% a month, the observed rate. The moved curve applies the arbitrage savings over the first 20 days and grows at 40% of that rate, since bytes on AT&T are cheaper to add.';
  if (/two metros|metro/.test(l)) return 'A metro is where your path enters the AT&T network. Two metros give two on-ramps; if one fails the other carries the path. Standard resiliency is one metro.';
  if (/inspection|firewall/.test(l)) return 'Inline inspection is the vSRX pair in the hosted VPC: from $2,400/mo per region, every session judged before it leaves.';
  if (/long|live|day one|ships/.test(l)) return 'About 10 business days for NetBond; AT&T provisions both ends. Telemetry starts with the first attach, so Observe fills in on day one.';
  if (/own|owner|who/.test(l)) return 'Owners come from the resource tags: payments-platform for PCI, platform-eng for Prod, ml-infra for GPU. Open a workload in the tree to see each one.';
  if (/site/.test(l)) return `${est.sites.filter(x => x.priv).length} of ${est.sites.length} sites reach the AT&T network on the access they already have. The rest are internet-only.`;
  if (/tag|vpc/.test(l)) return 'Switch the tree to By tag: one row per tag across every cloud, with the VPCs that carry it. A policy on the tag covers all of them.';
  if (/fit|choose|estates/.test(l)) return 'Hosted VPC with the vSRX pair is what estates this size choose most; the Marketplace filters by what the path must do.';
  if (/policy|change/.test(l)) return 'Yes. Policies live in Govern and change without re-ordering; the path stays, the rule changes.';
  return 'I can answer from what the traffic shows: paths, tags, spend and health. Try one of the questions below, or click a region, tag or finding to scope me to it.';
}


// ---------- Department overlays on AT&T picture ----------
const SLO = 100;
function overlayFor(e, s, est, ob, hp, R, steered, hoverKey) {
  if (s.screen !== 's3' || !e.region || e.ghost) return {};
  const r = est.regionsList.find(x => x.region === e.region.region) || e.region;
  const flows = ob.flows.filter(f => f.region === r.cloud + ' ' + r.region);
  const gbps = flows.reduce((a, f) => a + f.gbps, 0);
  const lat = r.priv ? r.fab : r.pub;
  const gb = Math.round(r.wl * (R.gbPerWlExport(est, (est.buckets || []).reduce((a, b) => a + b.today, 0) || ob.egressMo) || 42));
  const rate = r.priv ? 0.02 : 0.09;
  const dollars = Math.round(gb * rate);
  const premium = r.priv ? 0 : Math.round(gb * 0.07);
  const hovered = hoverKey === 'reg' + r.region;
  const tab = s.tab;
  const lens = s.lens || 'security';
  const score = R.lensScore(r, lens);
  const lensVal = { security: r.priv ? 'private' : 'public', performance: lat + ' ms', reliability: r.priv ? (r.ramp === 'DX' || r.ramp === 'ER' ? '99.9%' : '99.99%') : '99.5%', cost: '$' + rate.toFixed(2) + '/GB' }[lens];
  // Labels sit just right of the band, above the wire, clear of the on-ramp chips at the region end.
  // A wire out to the cloud is labelled where it lands, where the wires have
  // spread apart, not where it leaves the band packed beside its neighbours.
  const lx = e.kind === 'egress' ? e.x2 - 72 : e.x1 + 4, ly = e.kind === 'egress' ? e.y2 - 16 : e.y1 - 17;
  // The band already says whose each segment is, so on Connect the default lens
  // does not print "private" and "public" on every wire (Micah, 2026-09-23).
  if (tab === 'connect') return { stroke: R.SCORE_COLOR[score], w: 2.5, label: lensVal, lx, ly, hasLabel: lens !== 'security', shield: false, compare: hovered ? R.compareRegion({ ...r, gbPerWl: gb / Math.max(1, r.wl) }).map((p, i) => ({ key: p.id, short: p.short, y: i * 16, w: Math.round(p.egressMo / Math.max(1, Math.max(...R.compareRegion({ ...r }).map(z => z.egressMo))) * 120), fill: p.tone, val: '$' + Math.round(p.egressMo / 1000) + 'k · ' + p.latMs + ' ms', cur: p.cur })) : null, hasCompare: hovered, cx: e.x2 - 150, cy: e.y2 + 8 };
  if (tab === 'observe') { const t = (s.scrubT == null ? 100 : s.scrubT) / 100; const g = gbps * (0.75 + 0.25 * Math.sin(t * 6.28 + r.region.length)) ; const l = Math.round(lat * (t > 0.6 && t < 0.75 && r.rel === 'warn' ? 1.4 : 1)); return { stroke: r.priv ? '#0057b8' : '#8a949c', sleeve: l > SLO, sleeveW: Math.max(4, Math.min(12, g * 1.6 + 3)), w: Math.max(1.5, Math.min(9, g * 1.6)), durS: (Math.max(0.6, 3 - g * 0.4)).toFixed(1) + 's', label: g.toFixed(1) + ' Gbps · ' + l + ' ms', lx, ly, hasLabel: true, pin: r.rel === 'warn' && t > 0.6 && t < 0.75, pinX: (e.x1 + e.x2) / 2, pinY: (e.y1 + e.y2) / 2 - 14, comet: true }; }
  if (tab === 'govern') { const pol = [...(s.customPolicies || [])].filter(p => p.state !== 'draft'); const tagHit = (r.tags || []).some(t => /PCI/i.test(t)) || pol.some(p => (r.tags || []).some(t => p.match.toLowerCase().includes(t.toLowerCase()))); const au = s.authoring; const authHit = au && au.match && ((/^tag /.test(au.match) && (r.tags || []).some(t => au.match.toLowerCase().includes(t.toLowerCase()))) || au.match === 'region ' + r.region); const viol = !r.priv && (r.tags || []).some(t => /PCI|Prod/i.test(t)); return { stroke: authHit ? '#00abeb' : tagHit ? '#0057b8' : 'var(--text-disabled)', w: authHit ? 4 : tagHit ? 2.5 : 1.5, gate: tagHit || authHit, gx: (e.x1 + e.x2) / 2, gy: (e.y1 + e.y2) / 2, gateFill: authHit ? '#00abeb' : s.enforced ? '#0057b8' : 'var(--bg-base)', gateCheck: authHit || s.enforced ? '#fff' : '#0057b8', violPulse: viol, pinX: e.x2 - 8, pinY: e.y2 - 12, label: tagHit ? (r.tags || []).filter(t => /PCI|Prod|Finance|GPU/i.test(t)).slice(0, 2).map(t => 'tag ' + t).join(' · ') : '', lx, ly, hasLabel: tagHit, opOverride: authHit ? 1 : (au && au.match ? 0.35 : null) }; }
  if (tab === 'cost') { const ft = (s.fcT || 0) / 100; const prem = Math.round(premium * (1 - ft)); return { stroke: r.priv ? '#0057b8' : 'var(--text-disabled)', w: Math.max(2, Math.min(10, dollars / 4000)), sleeve: prem > 0, sleeveW: Math.max(3, Math.min(14, prem / 2500)), label: '$' + (dollars >= 1000 ? (dollars / 1000).toFixed(1) + 'k' : dollars) + '/mo' + (prem ? ' · +$' + (prem / 1000).toFixed(1) + 'k' : ''), lx, ly, hasLabel: true, math: hovered ? gb.toLocaleString('en-US') + ' GB × $' + rate.toFixed(2) + (prem ? ' (AT&T $0.02: −$' + prem.toLocaleString('en-US') + ')' : '') : '', hasMath: hovered && !!gb, cx: e.x2 - 150, cy: e.y2 + 8 }; }
  return {};
}
function overlayLegend(s, R) {
  if (s.screen !== 's3') return [];
  const tab = s.tab;
  // Inside the band a wire's colour says who holds the SLA; outside it, how the
  // path performs. The legend says which is which.
  if (tab === 'connect') return [
    { key: 'oa', sw: '#3374cc', l: 'AT&T' }, { key: 'oc', sw: 'var(--text-light)', l: 'cloud provider' }, { key: 'ot', sw: 'var(--viz-5)', l: 'third party (dashed)' },
    { key: 'oh', sw: null, l: 'a drop = a handoff off AT&T' },
    { key: 'xc', sw: null, l: '□ your cross-connect (the colo answers for it)' },
    { key: 'g', sw: 'var(--success)', l: 'good' }, { key: 'f', sw: 'var(--warning)', l: 'fair' }, { key: 'p', sw: 'var(--error)', l: 'poor' },
    { key: 'lens', sw: null, l: 'outside the network, wire colour follows the ' + (s.lens || 'security') + ' lens' }];
  if (tab === 'observe') return [{ key: 'w', sw: null, l: 'thickness = Gbps' }, { key: 'b', sw: '#0057b8', l: 'AT&T network' }, { key: 'p', sw: '#8a949c', l: 'public internet' }, { key: 'r', sw: 'var(--error)', l: 'red sleeve = over 100 ms' }, { key: 'd', sw: null, l: 'dashed = public path' }];
  if (tab === 'govern') return [{ key: 'g', sw: '#0057b8', l: 'gate = policy on this path' }, { key: 'o', sw: '#00abeb', l: 'matched by the policy you are authoring' }, { key: 'v', sw: 'var(--error)', l: 'violation' }, { key: 'd', sw: null, l: 'dashed = simulated' }];
  if (tab === 'cost') return [{ key: 'w', sw: null, l: 'thickness = $/mo' }, { key: 'r', sw: 'var(--error)', l: 'red sleeve = premium over the AT&T rate' }, { key: 's', sw: null, l: 'slide the forecast to land the moves' }];
  return [];
}
