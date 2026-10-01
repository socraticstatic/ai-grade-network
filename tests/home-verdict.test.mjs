import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import * as A from '../naas-addendum.js';
import * as D from '../naas-data.js';
import { CARD_ORDER, ringArcs, words } from '../naas-home.js';
import { heightProblems, HOME_PAGE, TAIL } from '../scripts/fold-rule.mjs';
import { mkC } from './harness.mjs';

// The v2 home's skeptic (verdict-v2-home, 2026-09-30), each problem pinned.
// Micah's asks stand: a high-level glance, not a white paper; snapshot views;
// personal per persona; the take-away first; the Connect map below. The rules
// under them: the take-away leads with the worst live thing for the role; no
// card repeats it; every figure is printed on the page its door opens; the map
// below is never cut mid-diagram by the fold and keeps Connect's legend;
// Waiting on you lists only findings still waiting, each with a real action.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const store = {};
globalThis.localStorage = globalThis.localStorage || { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };

const NOW = '2026-10-05T14:00:00Z';
const LIVE = ['partial', 'mature', 'trust', 'small'];
const ROLES = ['architect', 'neteng', 'security', 'finops', 'exec'];
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const home = (view, patch = {}) => mkC({ view, estateParam: null, screen: 's0', nowIso: NOW, ...patch });
const card = (v, k) => v.homeCards.find(x => x.key === k);
const stat = (v, k) => String(v.invStats.find(x => x.key === k).v);
const tile = (v, k) => v.spendTiles.find(t => t.key === k);
const RANK = { down: 0, slo: 1, risk: 2 };

// What a landed page prints, read from the fields its markup binds on that page.
function landedText(c) {
  const v = vals(c), st = c.state, out = [];
  if (st.screen === 's3') out.push(v.pageVerdict || '');
  if (st.screen === 's1' && (st.discoverView || 'estate') === 'estate' && (st.estPanel || 'glance') === 'glance') {
    assert.ok(st.scanStep >= 4, 'a door into Discover lands mid-scan');
    out.push(...v.glanceRings.flatMap(r => [`${r.centre} ${r.centreSub}`, r.head]));
  }
  if (st.screen === 's3' && st.tab === 'cost' && st.costPanel === 'spend') out.push(...v.spendTiles.flatMap(t => [`${t.l} ${t.v}${t.u}`, t.sub]));
  if (st.screen === 's3' && st.tab === 'govern' && (st.govPanel || 'policies') === 'policies') out.push(v.polViolLine || '');
  if (st.screen === 's3' && st.tab === 'govern' && st.govPanel === 'tags') out.push(v.drawerTagSub || '');
  if (st.screen === 's3' && st.tab === 'observe' && st.obPanel === 'health') out.push(...v.healthTiles.map(t => `${t.l} ${t.v} ${t.u}`), ...v.problemRows.map(p => `${p.where} ${p.appsF}`));
  if (st.screen === 's3' && st.tab === 'observe' && st.insPanel === 'role') out.push(v.roleCountLine || '', ...v.roleActAll.map(a => a.head));
  if (st.screen === 's3' && st.tab === 'connect' && st.cnPage === 'picture' && st.siteFilter && st.siteFilter.reach) out.push(v.siteFilterCount || '');
  return out.join(' | ');
}
// The numbers a figure shows, each as it is printed ("$41,500", "54", "2,680"); a
// name's digits ("eu-central-1") count nothing.
const numbersOf = (t) => (String(t).match(/(?<![\w-])\$?\d[\d,]*(?![\w-])/g) || []);
const printedAs = (hay, n) => new RegExp(`(^|[^\\d,$])${n.replace(/\$/g, '\\$')}(?![\\d,])`).test(hay) || (n.startsWith('$') && hay.includes(n));

// Every figure door on the home, with the words it shows.
function doorsOf(view, persona) {
  const v = vals(home(view, { persona }));
  const out = [];
  const t = v.homeTake;
  if (t && numbersOf(t.head).length) out.push({ where: 'take-away head', text: t.head, pick: (w) => w.homeTake.headGo });
  (t ? t.parts : []).forEach((p, i) => { if (!p.off && numbersOf(p.t).length) out.push({ where: `take-away part ${i}`, text: p.t, pick: (w) => w.homeTake.parts[i].go }); });
  v.homeCards.forEach((x) => {
    if (!x.valueOff) out.push({ where: `${x.key} value`, text: `${x.value} ${x.unit}`, pick: (w) => card(w, x.key).valueGo });
    x.figs.forEach((f, i) => { if (!f.off) out.push({ where: `${x.key} fig ${i}`, text: `${f.v} ${f.u}`, pick: (w) => card(w, x.key).figs[i].go }); });
    (x.segs || []).forEach((g, i) => out.push({ where: `${x.key} arc ${g.key}`, text: g.title, pick: (w) => card(w, x.key).segs[i].go }));
  });
  return out;
}

// ---- 1. The take-away leads with the worst live thing for the role ----

test('V1: Network Eng leads with the worst live problem: an outage beats over SLO beats at risk', () => {
  for (const view of LIVE) {
    const v = vals(home(view));
    const worst = [...v.problemRows].sort((a, b) => RANK[a.state] - RANK[b.state])[0];
    if (!worst) continue;
    assert.ok(v.homeTake.head.startsWith(`${worst.where} is `), `${view}: "${v.homeTake.head}" is not the worst, ${worst.where} (${worst.state})`);
  }
  const m = vals(home('mature')).homeTake;
  assert.equal(m.head, 'AWS eu-central-1 is down', 'Established: the outage leads, not the at-risk region');
  assert.equal(m.sub, '2 apps ride it · 96 workloads · 22 min');
});

// ---- 2. Every figure is printed on the page its door opens ----

test('V2, V3, V12: every figure door on the home lands on a page that prints that figure, on every estate and persona', () => {
  const miss = [];
  for (const view of LIVE) for (const persona of ROLES) {
    for (const d of doorsOf(view, persona)) {
      const c = home(view, { persona });
      d.pick(vals(c))();
      const txt = landedText(c);
      for (const n of numbersOf(d.text)) if (!printedAs(txt, n)) miss.push(`${view}/${persona} ${d.where} "${d.text}": ${n} is not on ${c.state.screen}/${c.state.tab || ''}/${c.state.cnPage || c.state.costPanel || c.state.govPanel || c.state.obPanel || c.state.insPanel || c.state.estPanel || ''}: ${txt.slice(0, 140)}`);
    }
  }
  assert.deepEqual(miss, []);
});

test('V2: the Security headline opens Discover > At a glance, scanned, where the exposed workloads are printed', () => {
  for (const view of LIVE) {
    const c = home(view, { persona: 'security' });
    const t = vals(c).homeTake;
    t.headGo();
    assert.deepEqual([c.state.screen, c.state.discoverView, c.state.estPanel, c.state.scanStep], ['s1', 'estate', 'glance', 4], view);
    assert.equal(vals(c).glanceRings.find(r => r.key === 'apps').head, `${t.head.split(' ')[0]} workloads exposed`, view);
  }
});

test('Your actions prints how many it lists, so "3 moves" and "All 3" land on their number', () => {
  for (const view of LIVE) for (const persona of ROLES) {
    const v = vals(mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'insights', insPanel: 'role', persona, nowIso: NOW }));
    const n = v.roleActAll.length, noun = persona === 'exec' ? ['move', 'moves'] : ['action', 'actions'];
    assert.equal(v.roleCountLine, n ? `${n} ${n === 1 ? noun[0] : noun[1]}` : '', `${view}/${persona}`);
  }
  const i = HTML.indexOf('{{ roleTitle }}');
  assert.ok(HTML.slice(i, i + 300).includes('{{ roleCountLine }}'), 'the count is not beside the title');
});

test('V3: Violations & policies prints the violation total the home counts', () => {
  for (const view of LIVE) {
    const g = vals(home(view)).rollup.find(r => r.key === 'govern');
    const v = vals(mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'govern', govPanel: 'policies', nowIso: NOW }));
    assert.equal(v.polViolLine, `${g.value} policy violations`, view);
  }
  const i = HTML.indexOf('<sc-if value="{{ govPanelPolicies }}"');
  assert.ok(HTML.slice(i, HTML.indexOf('id="sec-policies"', i) + 400).includes('{{ polViolLine }}'), 'the Policies head does not print the total');
});

test('V4: the Security line counts no policies of its own: its one part is Govern\'s violations', () => {
  for (const view of LIVE) {
    const t = vals(home(view, { persona: 'security' })).homeTake;
    assert.ok(!t.parts.some(p => /\bpolic(y|ies)$/.test(p.t)), `${view}: "${t.sub}"`);
  }
});

// ---- 3. FinOps reads Spend's own words ----

test('V5: FinOps reads Spend\'s Could save, beside what is banked and the regions that move, never a drop the figures do not show', () => {
  for (const view of LIVE) {
    const v = vals(home(view, { persona: 'finops' }));
    const t = v.homeTake;
    assert.equal(t.head, `Save ${tile(v, 'could').v}/mo on egress`, view);
    const banked = tile(v, 'banked').v;
    const pub = +v.rollup.find(r => r.key === 'connect').value.split(' ')[0];
    assert.equal(t.parts[0].t, /^\$0$/.test(banked) ? 'Nothing banked yet' : `${banked} banked to date`, view);
    assert.equal(t.parts[1].t, `${pub} ${pub === 1 ? 'region' : 'regions'} to move`, view);
    assert.ok(!/drop|today|in 90 days/.test(`${t.head} ${t.sub}`), `${view}: "${t.head} · ${t.sub}"`);
  }
});

// ---- 4. One figure, one value: the PCI finding counts from the estate ----

// "84 workloads exposed" over "96 PCI-tagged workloads reach the internet directly" read as a part bigger
// than its whole. They count two things: the inventory's exposed workloads are its internet-facing entry
// points (a public subnet's load balancer and API gateway), reachable from the internet; the PCI finding
// counts workloads with an outbound default route to an internet gateway. The home names the direction.
// (The entry points: a public subnet's load balancer, API gateway, web tier or bastion.)
test('V6: the home counts what the internet can reach and says so; the PCI finding counts an outbound route', () => {
  for (const view of LIVE) {
    const inv = A.inventory(D.ESTATES[view]);
    const exposed = inv.flatMap(cl => cl.regions.flatMap(r => r.vpcs.flatMap(vp => vp.subnets.flatMap(sn => (sn.workloads || []).filter(w => w.exposed).map(w => ({ sn, w }))))));
    assert.ok(exposed.length > 0, view);
    assert.ok(exposed.every(x => x.sn.pub && ['Load balancer', 'API gateway', 'Web tier', 'Bastion'].includes(x.w.type)), `${view}: an exposed workload that is not a public entry point`);
    const v = vals(home(view, { persona: 'security' }));
    assert.equal(v.homeTake.head, `${stat(v, 'e')} workloads reachable from the internet`, view);
    assert.equal(card(vals(home(view)), 'exposed').unit, 'workloads reachable from the internet', view);
  }
  for (const id of ['partial', 'trust']) assert.match(D.ESTATES[id].findings.find(f => f.kind === 'pci').ev, /default route to an internet gateway/, id);
  assert.match(HTML.slice(HTML.indexOf('aria-label="Snapshot"'), HTML.indexOf('aria-label="Waiting on you"')), /\{\{ hc\.unit \}\}/);
});

// ---- 5. Waiting on you ----

test('V7, V15: Waiting on you lists only findings still waiting, each with a real action; Accept takes it off', () => {
  for (const view of LIVE) for (const persona of ROLES) {
    const v = vals(home(view, { persona }));
    const waiting = v.roleActAll.filter(a => a.waiting);
    assert.deepEqual(v.homeWaiting.map(a => a.key), waiting.slice(0, 3).map(a => a.key), `${view}/${persona}`);
    for (const a of v.homeWaiting) assert.ok(a.canAccept || a.hasDoor, `${view}/${persona}: "${a.head}" has no action`);
    assert.ok(v.homeWaiting.every(a => a.stateLabel === 'Open'), `${view}/${persona}: a chip that is not waiting`);
  }
  // Growing as Network Eng: the IPsec finding is acknowledged, so it is not waiting.
  const c = home('partial');
  const before = vals(c).homeWaiting;
  assert.ok(!before.some(a => /IPsec/.test(a.head)), 'the acknowledged IPsec finding still waits');
  before[0].accept();
  const after = vals(c);
  assert.ok(!after.homeWaiting.some(a => a.key === before[0].key), 'an accepted finding still waits');
  assert.equal(after.roleActAll.find(a => a.key === before[0].key).stateLabel, 'Acknowledged', 'Your actions keeps it, acknowledged');
});

test('V7: nothing waiting reads plainly, never as an all-clear under a warning', () => {
  const v = vals(home('mature', { persona: 'security' }));
  assert.equal(v.homeWaiting.length, 0);
  assert.equal(v.homeWaitingNone, 'No finding waits on you');
  const i = HTML.indexOf('{{ noHomeWaiting }}');
  const none = HTML.slice(i, HTML.indexOf('</sc-if>', i));
  assert.ok(!/✓|--success/.test(none), 'the empty state wears a green check');
  const css = HTML.slice(HTML.indexOf('.hm-none{'), HTML.indexOf('.hm-open{'));
  assert.ok(!/--success/.test(css), 'the empty state is styled as success');
});

// ---- 6. No card repeats the take-away ----

test('V8: no card repeats the take-away: the role\'s own card leaves, and no card prints a take-away figure', () => {
  assert.ok(!CARD_ORDER.security.includes('exposed'), 'Security\'s take-away is the exposed card');
  assert.ok(!CARD_ORDER.architect.includes('onatt'), 'the Architect\'s take-away is the On AT&T card');
  for (const order of Object.values(CARD_ORDER)) assert.equal(order.length, 4);
  // A figure is its number and what it counts: "20 workloads" is not "20 policy violations"; money is money.
  const FIG = /(?<![\w-])(\$?\d[\d,]*(?: of [\d,]+)?)(?:\/mo)?(?![\w-])(?:\s+(\w+))?/g;
  const figsOf = (s) => [...String(s).matchAll(FIG)].map(m => (m[1].startsWith('$') ? m[1] : `${m[1]} ${m[2] || ''}`.trim()));
  for (const view of LIVE) for (const persona of ROLES) {
    const v = vals(home(view, { persona }));
    const take = new Set([v.homeTake.head, ...v.homeTake.parts.map(p => p.t)].flatMap(figsOf));
    for (const x of v.homeCards) for (const f of [`${x.value} ${x.unit}`, ...x.figs.map(g => `${g.v} ${g.u}`)]) {
      for (const fig of figsOf(f)) assert.ok(!take.has(fig), `${view}/${persona}: the ${x.key} card repeats "${fig}" from "${v.homeTake.head} · ${v.homeTake.sub}"`);
    }
  }
});

// ---- 7. The Architect's line ----

test('V9: the Architect\'s line names the clouds the public regions are on, not the estate\'s count', () => {
  const want = { partial: 'on AWS, Azure and GCP', mature: 'on AWS', trust: 'on AWS and Azure', small: 'on AWS' };
  for (const view of LIVE) {
    const t = vals(home(view, { persona: 'architect' })).homeTake;
    assert.equal(t.parts[1].t, want[view], view);
    assert.equal(t.parts[1].off, true, `${view}: a name counts nothing, so it is not a door`);
  }
});

// ---- 8. One word per state, one denominator per noun ----

test('V10: the map head says down where Health says down, and whose "healthy" it counts', () => {
  const h = vals(home('partial')).fabricHealth.map(x => x.text);
  assert.deepEqual(h, ['1 connection down', '5 without flow logs', '1 of 2 connections healthy']);
  const m = vals(home('mature')).fabricHealth.map(x => x.text);
  assert.ok(m.includes('1 connection down') && m.includes('5 of 7 connections healthy'), m.join(' · '));
  for (const view of LIVE) assert.ok(!vals(home(view)).fabricHealth.some(x => /degraded/.test(x.text)), view);
});

test('V11 (ruled out): the Apps card sorts states as the Health page it opens does: its rows and its legend', () => {
  const legend = HTML.slice(HTML.indexOf('aria-label="Health legend"'), HTML.indexOf('</div>', HTML.indexOf('aria-label="Health legend"')));
  for (const view of LIVE) {
    const v = vals(home(view));
    const apps = card(v, 'apps');
    const onHealth = vals(mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', obPanel: 'health', nowIso: NOW }));
    assert.deepEqual(apps.dots.map(d => [d.key, d.ink, d.rad]), onHealth.pathFlowRows.map(r => [r.tag, r.dot, r.rad]), `${view}: the dots are not Health's rows`);
    for (const l of apps.legend) assert.ok(legend.includes(`${l.word}</span>`), `${view}: "${l.word}" is not in Health's legend`);
  }
});

// ---- 9. The ring's arcs ----

test('V13: every arc is drawn long enough to see and click', () => {
  const arcs = ringArcs([{ r: 35, parts: [{ key: 'a', n: 219 }, { key: 'b', n: 2 }] }, { r: 24, parts: [{ key: 'c', n: 7 }, { key: 'd', n: 1 }] }]);
  for (const a of arcs) assert.ok(+a.dash.split(' ')[0] >= 6, `${a.key} is ${a.dash.split(' ')[0]} units`);
  const C = 2 * Math.PI * 35;
  const [a, b] = arcs;
  assert.ok(Math.abs(+a.dash.split(' ')[0] + +b.dash.split(' ')[0] + 2 * 1.6 - C) < 0.05, 'the outer ring still closes');
  for (const view of LIVE) for (const g of card(vals(home(view)), 'onatt').segs) assert.ok(+g.dash.split(' ')[0] >= 6, `${view} ${g.key}: ${g.dash}`);
});

// ---- 10. The map below the fold ----

test('V14: the fold may not cut the map: its diagram starts at the fold or below, its title is whole above it', () => {
  const ok = { top: 843, bottom: 1400, titleBottom: 890, diagramTop: 904 };
  assert.deepEqual(heightProblems({ page: HOME_PAGE, scrollHeight: 1400 + TAIL, limit: 900, below: ok, aboveBottom: 807 }), []);
  assert.deepEqual(heightProblems({ page: HOME_PAGE, scrollHeight: 1218 + TAIL, limit: 900, below: { top: 657, bottom: 1218, titleBottom: 700, diagramTop: 718 }, aboveBottom: 621 }), ['the fold cuts the map at 182']);
  assert.deepEqual(heightProblems({ page: HOME_PAGE, scrollHeight: 1400 + TAIL, limit: 900, below: { top: 880, bottom: 1400, titleBottom: 920, diagramTop: 930 }, aboveBottom: 840 }), ['the fold cuts the map title']);
  const fab = HTML.indexOf('id="sec-fabric"');
  assert.match(HTML.slice(fab, fab + 2400), /data-map-diagram/, 'the diagram box carries its marker');
  const src = readFileSync(new URL('../scripts/fold-rule.mjs', import.meta.url), 'utf8');
  assert.match(src, /data-map-diagram/, 'foldMarks measures the diagram');
});

test('V14: the home fills the first screen, so the map\'s title sits at the fold', () => {
  const i = HTML.indexOf('aria-label="NaaS home"');
  assert.match(HTML.slice(i, i + 400), /min-height:calc\(100vh - \d+px\)/, 'the home does not fill the first screen');
});

test('V14: the map on the home keeps Connect\'s legend and its wire colours', () => {
  for (const view of LIVE) {
    const h = vals(home(view)), cn = vals(mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'connect', nowIso: NOW }));
    assert.equal(h.hasOverlay, true, view);
    assert.deepEqual(h.overlayLegend, cn.overlayLegend, `${view}: the legend is not Connect's`);
    const wires = (v) => v.heroEdges.filter(e => e.region).map(e => [e.key, e.stroke || null]);
    assert.deepEqual(wires(h), wires(cn), `${view}: the wires are not coloured as on Connect`);
    assert.equal(h.showScrub || h.showForecast, false, `${view}: a slider on the home`);
  }
});

// ---- 11. The exposed card prints its denominator ----

test('V16: Exposed prints how many of how many, and draws the share on a hundred cells', () => {
  for (const view of LIVE) {
    const v = vals(home(view, { persona: 'neteng' }));
    const x = card(v, 'exposed');
    const e = stat(v, 'e'), w = stat(v, 'w');
    assert.equal(x.value, `${e} of ${w}`, view);
    assert.equal(x.waffle.length, 100, view);
    const lit = x.waffle.filter(c => c.on).length, share = +e.replace(/,/g, '') / +w.replace(/,/g, '');
    assert.equal(lit, Math.max(1, Math.round(share * 100)), view);
    assert.match(x.wafTitle, new RegExp(`^${e} of ${w} workloads reachable from the internet$`), view);
  }
  assert.equal(card(vals(home('trust')), 'exposed').value, '84 of 2,680');
});

// ---- 12. No door lands mid-scan ----

test('V17: no door on the home lands on Discover mid-scan', () => {
  for (const view of LIVE) for (const persona of ROLES) {
    const all = doorsOf(view, persona);
    for (const d of all) {
      const c = home(view, { persona, scanStep: 0 });
      d.pick(vals(c))();
      if (c.state.screen === 's1') assert.equal(c.state.scanStep, 4, `${view}/${persona} ${d.where}`);
    }
  }
});

// ---- 13. The Tags card, Security's snapshot ----

test('the Tags card counts Govern\'s tags with no policy, one mark a tag, each opening Govern > Tags on its page', () => {
  for (const view of LIVE) {
    const v = vals(home(view, { persona: 'security' }));
    const x = card(v, 'tags');
    assert.ok(x, `${view}: Security has no Tags card`);
    const g = vals(mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'govern', govPanel: 'tags', nowIso: NOW }));
    const [, all, bare] = g.drawerTagSub.match(/^(\d+) tags? · (?:(\d+) with no policy|every one covered by a policy)$/);
    assert.equal(x.value, `${bare || 0} of ${all}`, view);
    assert.equal(x.unit, 'tags with no policy');
    assert.equal(x.dots.length, +all, view);
    assert.deepEqual(x.dots.slice(0, g.drawerTags.length).map(d => d.key), g.drawerTags.map(t => t.key), `${view}: the marks are not Govern's tags in order`);
    assert.equal(x.dots.filter(d => d.ink === 'var(--warning)').length, +(bare || 0), `${view}: a tag with no policy is at risk`);
    x.dots.forEach((d, i) => {
      const c = home(view, { persona: 'security' });
      card(vals(c), 'tags').dots[i].go();
      assert.deepEqual([c.state.screen, c.state.tab, c.state.govPanel, c.state.tagPage], ['s3', 'govern', 'tags', Math.floor(i / 7)], `${view} ${d.key}`);
    });
    const c = home(view, { persona: 'security' });
    card(vals(c), 'tags').valueGo();
    assert.deepEqual([c.state.screen, c.state.tab, c.state.govPanel], ['s3', 'govern', 'tags']);
  }
});

// ---- 14. Words ----

test('every new line keeps to twelve words, no em dash', () => {
  for (const view of LIVE) for (const persona of ROLES) {
    const v = vals(home(view, { persona }));
    for (const s of [v.homeTake.head, v.homeTake.sub, v.homeWaitingNone, ...v.homeCards.flatMap(x => [x.value, x.unit, x.wafTitle || '', ...x.legend.map(l => l.word)])].filter(Boolean)) {
      assert.ok(words(s) <= 12 && !/—/.test(s), `${view}/${persona}: "${s}"`);
    }
  }
});

test('V18: the demo walk\'s beat 8 comment no longer says the four tiles live on the home', () => {
  const src = readFileSync(new URL('../scripts/demo-walk.mjs', import.meta.url), 'utf8');
  assert.ok(!/four tiles live on the home/.test(src));
});
