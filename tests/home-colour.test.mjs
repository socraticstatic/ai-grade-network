import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import * as A from '../naas-addendum.js';
import * as D from '../naas-data.js';
import * as F from '../naas-flowmap.js';
import { words } from '../naas-home.js';
import { mkC } from './harness.mjs';

// The home's third skeptic (2026-09-30), each problem pinned. One figure, one
// value, one word: the home counts exposed workloads in Discover's word, and the
// PCI finding counts from the estate. One colour, one meaning: the map below has
// no lens control, so its wires say whose path it is and its dots say Health's
// state, keyed; the Tags and Exposed cards draw their sets in ink, not in a
// health colour.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const store = {};
globalThis.localStorage = globalThis.localStorage || { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };

const NOW = '2026-10-05T14:00:00Z';
const LIVE = ['partial', 'mature', 'trust', 'small'];
const ROLES = ['architect', 'neteng', 'security', 'finops', 'exec'];
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const home = (view, patch = {}) => mkC({ view, estateParam: null, screen: 's0', nowIso: NOW, ...patch });
const page = (view, patch) => vals(mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', nowIso: NOW, ...patch }));
const card = (v, k) => v.homeCards.find(x => x.key === k);
const stat = (v, k) => String(v.invStats.find(x => x.key === k).v);
const n = (s) => +String(s).replace(/,/g, '');
const RANK = { ok: 0, risk: 1, slo: 2, down: 3 };
const worst = (states) => states.reduce((a, s) => (RANK[s] > RANK[a] ? s : a), 'ok');

// ---- P6: one word for the exposed workloads ----

test('P6: the home counts exposed workloads in Discover\'s own word, never "reachable from the internet"', () => {
  for (const view of LIVE) {
    const sec = vals(home(view, { persona: 'security' }));
    const e = stat(sec, 'e');
    assert.equal(sec.homeTake.head, `${e} ${e === '1' ? 'workload' : 'workloads'} exposed`, view);
    // Discover's At a glance, where the headline opens, prints the same words.
    assert.equal(sec.glanceRings.find(r => r.key === 'apps').head, `${e} workloads exposed`, view);
    const x = card(vals(home(view)), 'exposed');
    assert.equal(x.unit, 'workloads exposed', view);
    assert.equal(x.wafTitle, `${e} of ${stat(sec, 'w')} workloads exposed`, view);
    for (const persona of ROLES) {
      const v = vals(home(view, { persona }));
      const all = [v.homeTake.head, v.homeTake.sub, ...v.homeCards.flatMap(c => [c.unit, c.wafTitle, ...c.figs.map(f => f.u)])].join(' | ');
      assert.ok(!/reachable from the internet/.test(all), `${view}/${persona}: ${all}`);
    }
  }
});

// ---- P6: the PCI finding counts from the estate ----

// Govern > Tags' pci row, and the exposed workloads in PCI-tagged VPCs of one region.
function pciOf(view, region) {
  const inv = A.inventory(D.ESTATES[view]);
  const vpcs = inv.flatMap(cl => cl.regions.filter(r => !region || r.region === region).flatMap(r => r.vpcs)).filter(v => v.tags.includes('pci'));
  return { wl: vpcs.reduce((a, v) => a + v.wl, 0), exposed: vpcs.reduce((a, v) => a + v.subnets.reduce((b, sn) => b + (sn.workloads || []).filter(w => w.exposed).length, 0), 0) };
}

test('P6: every PCI finding names a PCI-tagged region and counts its exposed PCI-tagged workloads, which the PCI policy counts as violations', () => {
  let seen = 0;
  for (const view of LIVE) {
    const est = D.ESTATES[view], f = est.findings.find(x => x.kind === 'pci');
    const pol = (est.policies || []).find(p => p.match === 'tag PCI');
    if (pol) {
      const tags = page(view, { tab: 'govern', govPanel: 'tags' }).drawerTags.find(t => t.key === 'pci');
      assert.equal(pol.matched, tags ? tags.wl : 0, `${view}: the PCI policy matches ${pol.matched}, Govern > Tags counts ${tags && tags.wl} pci workloads`);
    }
    if (!f) { if (pol) assert.equal(pol.viol, 0, `${view}: PCI violations with no finding`); continue; }
    seen++;
    const region = f.pathDst.replace(/^\S+ /, '');
    const reg = est.regionsList.find(r => r.region === region);
    assert.ok(reg && reg.tags.includes('PCI'), `${view}: the PCI finding is about ${f.pathDst}, which carries no PCI tag`);
    const here = pciOf(view, region);
    const m = f.head.match(/^([\d,]+) PCI-tagged workloads? reach(?:es)? the internet directly$/);
    assert.ok(m, `${view}: "${f.head}"`);
    assert.equal(n(m[1]), here.exposed, `${view}: ${m[1]} PCI-tagged workloads, but ${here.exposed} are exposed in ${region}`);
    assert.equal(f.ev, `${m[1]} of ${here.wl.toLocaleString('en-US')} PCI-tagged workloads in ${region} have a public address and a default route to an internet gateway.`, view);
    assert.equal(pol.viol, here.exposed, `${view}: the PCI policy counts ${pol.viol} violations`);
    // A part never outgrows its whole: the PCI ones are among the exposed workloads the home counts.
    assert.ok(here.exposed <= n(stat(vals(home(view)), 'e')), view);
  }
  assert.equal(seen, 2, 'Growing and Bank scale each carry a PCI finding');
});

// ---- P5: FinOps prints Spend's condition ----

test('P5: FinOps reads Spend\'s Could save with Spend\'s own condition, so it never reads as the Egress card\'s drop', () => {
  for (const view of LIVE) {
    const v = vals(home(view, { persona: 'finops' }));
    const could = v.spendTiles.find(t => t.key === 'could');
    if (!n(could.v.replace('$', ''))) continue;
    assert.equal(v.homeTake.head, `${could.l} ${could.v}${could.u} ${could.sub}`, view);
    assert.ok(words(v.homeTake.head) <= 12, v.homeTake.head);
  }
  // Spend's condition became the moves it counts when Cost v2 merged (2026-09-30).
  assert.equal(vals(home('partial', { persona: 'finops' })).homeTake.head, 'Could save $41,500/mo if you act on Spend and Routing');
});

// ---- P10: the map head names what it counts ----

test('P10: the map head counts regions without flow logs as regions, beside the connections', () => {
  assert.deepEqual(vals(home('partial')).fabricHealth.map(x => x.text), ['1 connection down', '5 regions without flow logs', '1 of 2 connections healthy']);
  for (const view of LIVE) {
    const blind = vals(home(view)).fabricHealth.find(x => x.key === 'blind');
    if (blind) assert.match(blind.text, /^\d+ (region|regions) without flow logs$/, view);
  }
});

// ---- P14: the map below the home: whose path, and Health's state, keyed ----

// The Health state of a region: what Health lists there, else Healthy (w2, 2026-09-30: the one
// rule alone drew GCP europe-west1 At risk at 99 ms where Health lists nothing).
function stateOf(view, v, region) {
  const r = D.ESTATES[view].regionsList.find(x => x.region === region);
  const probs = v.problemRows.filter(p => p.where === `${r.cloud} ${r.region}`).map(p => p.state);
  return worst(['ok', ...probs]);
}

test('P14: on the home, a wire says whose path it is, never a lens the home has no control for', () => {
  for (const view of LIVE) {
    const v = vals(home(view));
    for (const e of v.heroEdges.filter(x => x.region && !x.ghost)) {
      assert.equal(e.stroke, e.priv ? '#3374cc' : 'var(--text-disabled)', `${view} ${e.key}: ${e.stroke}`);
      // Dotted outside AT&T on the home (w2, 2026-09-30), so it never reads as the third party's dash.
      assert.equal(e.dash, e.priv ? 'none' : '2 4', `${view} ${e.key}`);
      assert.ok(!e.amber, `${view} ${e.key}: an amber pulse on the home`);
    }
    assert.ok(!v.overlayLegend.some(l => /lens|good|fair|poor/.test(l.l)), `${view}: ${v.overlayLegend.map(l => l.l).join(' · ')}`);
    assert.ok(v.overlayLegend.some(l => l.l === 'public internet (dotted)' && l.sw === 'var(--text-disabled)'), view);
  }
  // Growing: GCP is not down, so nothing on its wire is red.
  const g = vals(home('partial'));
  assert.ok(!g.heroEdges.some(e => e.stroke === 'var(--error)'), 'a red wire on the Growing home');
});

test('P14: every node dot on the map is Health\'s state for its regions, in Health\'s ink and shape, and the home keys each one it draws', () => {
  for (const view of LIVE) {
    for (const scr of ['s0', 's3']) {
      const v = vals(scr === 's0' ? home(view) : mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'connect', nowIso: NOW }));
      // On Connect the lens colours the wires outside the network, so a cloud card draws no dot and a
      // region's dot is its lens score, keyed with the wires (w2, 2026-09-30; tests/w2-consistency).
      if (scr === 's3') { for (const c of v.heroClouds) assert.equal(c.relFill, 'transparent', `${view} Connect ${c.cloud}`); continue; }
      const drawn = new Set();
      for (const c of v.heroClouds.filter(x => !x.ghost)) {
        const st = worst(D.ESTATES[view].regionsList.filter(r => r.cloud === c.cloud).map(r => stateOf(view, v, r.region)));
        assert.equal(c.relFill, F.HEALTH_INK[st], `${view}/${scr} ${c.cloud}: ${c.relFill}, Health says ${st}`);
        assert.equal(c.relRx, st === 'down' ? 1 : 4, `${view}/${scr} ${c.cloud}: Down is the square dot`);
        assert.ok(c.relTitle.startsWith(F.HEALTH_WORD[st]), `${view}/${scr} ${c.cloud}: "${c.relTitle}"`);
        drawn.add(st);
      }
      for (const r of v.heroRegions.filter(x => !x.ghost && D.ESTATES[view].regionsList.some(y => y.region === x.region))) {
        const st = stateOf(view, v, r.region);
        assert.equal(r.relFill, F.HEALTH_INK[st], `${view}/${scr} ${r.region}`);
        drawn.add(st);
      }
      if (scr !== 's0') continue;
      for (const st of drawn) {
        const k = v.overlayLegend.find(l => l.l === F.HEALTH_WORD[st]);
        assert.ok(k && k.sw === F.HEALTH_INK[st] && k.isDot, `${view}: the map draws ${st} and its legend does not key it`);
      }
    }
  }
  const g = vals(home('partial'));
  assert.equal(g.heroClouds.find(c => c.cloud === 'Azure').relFill, F.HEALTH_INK.down, 'Azure eastus is down');
  assert.equal(g.heroClouds.find(c => c.cloud === 'AWS').relFill, F.HEALTH_INK.slo, 'AWS eu-west-1 runs over SLO at its peak');
});

// A mark is its colour and its kind: a solid line, a dashed line or a dot. One mark is one thing, and a
// colour never means both a path and a state (red was a "poor" wire and a Down dot; purple a third
// party and Over SLO). A cloud provider and a third party share the grey of "not AT&T"; the dash says which.
test('P14: on the home, one colour in the map\'s legend means one thing', () => {
  for (const view of LIVE) {
    const v = vals(home(view));
    const by = {}, kinds = {};
    for (const l of v.overlayLegend.filter(x => x.sw)) {
      const kind = l.isDot ? 'dot' : l.dash ? 'dash' : 'line';
      (by[`${l.sw}|${kind}`] = by[`${l.sw}|${kind}`] || new Set()).add(l.l);
      (kinds[l.sw] = kinds[l.sw] || new Set()).add(kind === 'dot' ? 'state' : 'path');
    }
    for (const [k, ls] of Object.entries(by)) assert.equal(ls.size, 1, `${view}: ${k} means ${[...ls].join(' and ')}`);
    for (const [sw, ks] of Object.entries(kinds)) assert.equal(ks.size, 1, `${view}: ${sw} is both a path and a state`);
    // And the map draws no path in a colour its legend gives a state.
    const states = new Set(v.overlayLegend.filter(x => x.isDot).map(x => x.sw));
    for (const e of v.heroEdges) assert.ok(!states.has(e.stroke), `${view} ${e.key}: a wire in ${e.stroke}`);
    for (const p of v.pieces) assert.ok(!states.has(p.stroke), `${view} ${p.key || p.id}: a piece in ${p.stroke}`);
  }
  const i = HTML.indexOf('list="{{ overlayLegend }}"');
  const row = HTML.slice(i, HTML.indexOf('</sc-for>', i));
  assert.match(row, /\{\{ lg\.isDot \}\}/, 'the legend cannot draw a dot');
  assert.match(row, /\{\{ lg\.isBar \}\}/);
  for (const k of ['relRx', 'dotRx', 'dotRy']) assert.ok(HTML.includes(`{{ cc.${k} }}`), `the provider dot does not bind ${k}`);
});

// ---- The Tags and Exposed cards draw their sets in ink ----

test('Tags and Exposed draw the set they count in ink, never in a health colour or the ring\'s', () => {
  const taken = new Set([...Object.values(F.HEALTH_INK), 'var(--viz-1)', 'var(--viz-2)', 'var(--viz-6)', 'var(--border-primary)', 'var(--text-disabled)']);
  for (const view of LIVE) {
    const v = vals(home(view, { persona: 'architect' }));
    const tags = card(v, 'tags'), ex = card(v, 'exposed');
    for (const d of tags.dots) assert.ok(!taken.has(d.ink), `${view} tag ${d.key}: ${d.ink}`);
    for (const l of tags.legend) assert.ok(!taken.has(l.ink), `${view} tag legend ${l.word}: ${l.ink}`);
    assert.ok(!taken.has(tags.swatch) && !taken.has(ex.swatch), `${view}: ${tags.swatch} / ${ex.swatch}`);
    for (const c of ex.waffle.filter(x => x.on)) assert.ok(!taken.has(c.ink), `${view} exposed cell: ${c.ink}`);
    // The tags with no policy are the set the card counts, filled; a covered tag is the outline.
    const bare = tags.dots.filter(d => /No policy$/.test(d.title));
    assert.ok(bare.every(d => d.ink === tags.swatch && d.ring === 'none'), view);
    assert.ok(tags.dots.filter(d => !/No policy$/.test(d.title)).every(d => d.ink === 'transparent' && /inset/.test(d.ring)), view);
  }
  const i = HTML.indexOf('list="{{ hc.dots }}"');
  assert.match(HTML.slice(i, HTML.indexOf('</sc-for>', i)), /box-shadow:\{\{ dt\.ring \}\}/, 'a dot cannot draw its outline');
});

// ---- P11: Health's tile counts what the home's legend names ----

test('P11: Health\'s tile names both states it counts, so the home\'s Over SLO and At risk add up on it', () => {
  for (const view of LIVE) {
    const h = page(view, { tab: 'observe', obPage: 'perf', obPanel: 'health' });
    const t = h.healthTiles.find(x => x.key === 'risk');
    assert.equal(t.l, 'Over SLO or at risk', view);
    const apps = card(vals(home(view)), 'apps');
    const named = apps.dots.filter(d => / · (Over SLO|At risk)$/.test(d.title)).length;
    assert.equal(+t.v, named, `${view}: the home draws ${named} over SLO or at risk, Health counts ${t.v}`);
  }
});

// ---- Minor: a picture fills its card's middle ----

// The section fills the first screen, so each card is 406 to 470px tall and its middle 230 to 294px:
// eight app dots or nine tag dots floated in it (third skeptic, 2026-09-30). The dots lay out as a
// near-square grid of large marks, and the ring, the waffle and the sparkline take the middle's size.
test('a picture fills its card\'s middle: dots in a near-square grid of large marks, the ring, waffle and sparkline sized to the middle', () => {
  for (const view of LIVE) for (const persona of ROLES) {
    for (const x of vals(home(view, { persona })).homeCards.filter(c => c.isDots)) {
      const nDots = x.dots.length, cols = Math.max(1, Math.min(4, Math.ceil(Math.sqrt(nDots))));
      if (nDots > 16) continue;
      const [btn, size] = nDots <= 4 ? [76, 56] : [52, 36];
      assert.equal(x.dotW, `${cols * btn + (cols - 1) * 8}px`, `${view}/${persona} ${x.key}: ${nDots} dots`);
      assert.ok(x.dots.every(d => d.size === `${size}px` && d.btn === `${btn}px`), `${view}/${persona} ${x.key}`);
    }
  }
  const css = (sel) => { const i = HTML.indexOf(sel + '{'); return HTML.slice(i, HTML.indexOf('}', i)); };
  assert.match(css('.hm-ring'), /width:min\(100%,216px\)/);
  assert.match(css('.hm-ring'), /aspect-ratio:1/);
  assert.match(css('.hm-spark'), /height:100%/);
  assert.match(css('.hm-waffle'), /repeat\(10,17px\)/);
  const i = HTML.indexOf('list="{{ hc.dots }}"');
  assert.match(HTML.slice(i - 200, i), /width:\{\{ hc\.dotW \}\}/, 'the dots do not lay out as the card says');
  const loop = HTML.slice(i, HTML.indexOf('</sc-for>', i));
  assert.match(loop, /width:\{\{ dt\.btn \}\};height:\{\{ dt\.btn \}\}/);
  assert.match(loop, /width:\{\{ dt\.size \}\};height:\{\{ dt\.size \}\}/);
});

// ---- Minor: the count beside Waiting on you reads as a count ----

test('one finding in Your actions reads "1 in Your actions", never "All 1"', () => {
  for (const view of LIVE) for (const persona of ROLES) {
    const v = vals(home(view, { persona }));
    const nActs = v.roleActAll.length;
    assert.equal(v.homeWaitingMore, nActs > 1 ? `All ${nActs} in Your actions ›` : nActs === 1 ? '1 in Your actions ›' : '', `${view}/${persona}`);
  }
});
