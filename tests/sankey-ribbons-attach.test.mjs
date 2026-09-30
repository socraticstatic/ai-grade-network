import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import * as A from '../naas-addendum.js';
import * as F from '../naas-flowmap.js';
import * as R from '../naas-round2.js';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// A path's traffic leaves from its own bar (review round 2, 2026-09-30).
// buildMap's link() kept one offset per node, so a bar in the middle stacked
// its outgoing ribbons under its incoming ones: Growing's NetBond bar spans
// y 30.1..205.3 and its ribbons left at 205.3..380.6, from the bars below it;
// Small's Internet bar spans 36.5..351.5 and its ribbon to AWS left at
// 351.5..666.5, off the bottom of an SVG 388 tall. The shared offset is as old
// as the middle column in this repo (9922b09, 2026-09-14, then "AT&T fabric"
// and "Outside the fabric"); 1b229d9 (2026-09-28) split the middle into paths
// and kept it. A middle bar takes its traffic in on its left face and sends
// it on from its right face, each from the top.
//
// The Cost view weighs the same map in dollars, so Over time and the map's
// sub line read dollars as Gbps unless they read the Gbps map (Small's peak
// read "2751.1 Gbps"). And the empty estate's map carried the divide-by
// guard as its total, 1.0 Gbps of nothing.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const at = (view, patch = {}) => mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', obTab: 'flow', ...patch });
const ESTATES = Object.keys(D.ESTATES);
const EPS = 0.01;
const f1 = (x) => x.toFixed(1);
// Every pick the By cloud and By site pickers offer.
const picks = (id) => ['cloud', 'site'].flatMap(dim => vals(at(id, { obDim: dim })).scopeMembers.map(m => m.key));

// The map for a pick, built as vals builds it: a cloud filters the regions and
// keeps the rest as context; a site scopes the estate and reads sites by class.
function mapsFor(id) {
  const est = D.ESTATES[id], inv = A.inventory(est), flows = A.observe(est, [], inv).flows;
  const window = { growth: R.growthOf('30d') };
  const scoped = [['Whole estate', est, { window }], ...picks(id).map(k => {
    const i = k.indexOf(':'), dim = k.slice(0, i), name = k.slice(i + 1);
    return dim === 'cloud' ? [k, est, { window, filterRegion: name, context: true }] : [k, R.applyScope(est, k), { window, leftBy: 'class' }];
  })];
  // The Cost view weighs the same map in dollars; any rates do for geometry.
  // Since 2026-09-30 (owner decision a) each path has its own: direct connect
  // at a list price, Equinix Fabric unpriced, so its bars leave the dollar map.
  const weigh = { fab: 700, pub: 1900, ramp: { [F.RAMP_NAME.DX]: 2600, [F.RAMP_NAME.EQX]: 0 } };
  return scoped.flatMap(([label, e, o]) => [[`${label} · Gbps`, F.buildMap(e, inv, flows, o)], [`${label} · $/mo`, F.buildMap(e, inv, flows, { ...o, weigh })]]);
}

// The spans must lie end to end from y to y + h: no gap, no overlap, no overhang.
function tiles(y, h, spans) {
  const s = spans.slice().sort((a, b) => a[0] - b[0]);
  let at0 = y;
  for (const [a, b] of s) { if (Math.abs(a - at0) > EPS) return false; at0 = b; }
  return Math.abs(at0 - (y + h)) <= EPS;
}
const spanText = (spans) => spans.length ? `${f1(Math.min(...spans.map(s => s[0])))}..${f1(Math.max(...spans.map(s => s[1])))}` : 'nothing';

for (const id of ESTATES) {
  test(`${id}: every bar's ribbons leave from its right face and land on its left face, top to bottom, at every scope, in Gbps and in dollars`, () => {
    const bad = [];
    for (const [label, m] of mapsFor(id)) {
      const byKey = new Map(m.nodes.map(nd => [nd.key, nd]));
      for (const nd of m.nodes) {
        const out = m.ribbons.filter(r => r.from === nd.key), inn = m.ribbons.filter(r => r.to === nd.key);
        const outS = out.map(r => [r.g[1], r.g[1] + r.g[2]]), inS = inn.map(r => [r.g[4], r.g[4] + r.g[5]]);
        if (nd.side !== 'r' && !tiles(nd.y, nd.h, outS)) bad.push(`${label} ${nd.name}: bar ${f1(nd.y)}..${f1(nd.y + nd.h)}, ribbons leave ${spanText(outS)}`);
        if (nd.side !== 'l' && !tiles(nd.y, nd.h, inS)) bad.push(`${label} ${nd.name}: bar ${f1(nd.y)}..${f1(nd.y + nd.h)}, ribbons land ${spanText(inS)}`);
      }
      for (const r of m.ribbons) {
        const a = byKey.get(r.from), b = byKey.get(r.to);
        if (!a || !b || Math.abs(r.g[0] - a.x2) > EPS || Math.abs(r.g[3] - b.x) > EPS) bad.push(`${label} ${r.from} > ${r.to}: not drawn between its two bars`);
      }
    }
    assert.equal(bad.length, 0, '\n  ' + bad.slice(0, 16).join('\n  ') + (bad.length > 16 ? `\n  ... ${bad.length - 16} more` : ''));
  });
}

// What the page draws: each ribbon's two ends sit on a bar, inside the frame.
const ends = (d) => { const t = d.match(/-?\d+(\.\d+)?(e-?\d+)?/g).map(Number); return { x1: t[0], a: [t[1], t[t.length - 1]], x2: t[6], b: [t[7], t[9]] }; };
for (const id of ESTATES) {
  test(`${id}: every ribbon the page draws starts and ends on a bar inside the map's frame, Traffic and Cost`, () => {
    const bad = [];
    for (const scope of [null, ...picks(id)]) {
      for (const mode of ['state', 'cost']) {
        const v = vals(at(id, { mapMode: mode, ...(scope ? { obDim: scope.split(':')[0], obScope: scope } : {}) }));
        const H = +v.mapVB.split(' ')[3], bars = v.mapNodes.filter(n => n.side !== 'ctx');
        const on = (x, face, [y0, y1]) => bars.some(n => Math.abs((face === 'r' ? n.x2 : n.x) - x) <= EPS && y0 >= n.y - EPS && y1 <= n.y + n.h + EPS);
        for (const r of v.mapRibbons) {
          const e = ends(r.d), where = `${scope || 'Whole estate'} · ${mode} ${r.key}`;
          if (Math.min(...e.a, ...e.b) < -EPS || Math.max(...e.a, ...e.b) > H + EPS) bad.push(`${where}: spans ${f1(Math.min(...e.a, ...e.b))}..${f1(Math.max(...e.a, ...e.b))} in a frame ${f1(H)} tall`);
          if (!on(e.x1, 'r', e.a)) bad.push(`${where}: leaves at ${f1(e.a[0])}..${f1(e.a[1])}, on no bar`);
          if (!on(e.x2, 'l', e.b)) bad.push(`${where}: lands at ${f1(e.b[0])}..${f1(e.b[1])}, on no bar`);
        }
      }
    }
    assert.equal(bad.length, 0, '\n  ' + bad.slice(0, 16).join('\n  ') + (bad.length > 16 ? `\n  ... ${bad.length - 16} more` : ''));
  });
}

// Over time reads traffic, whatever the map weighs (pinned 2026-09-30): the
// Cost view's bars and rollups are the Traffic view's, and the latest bar is
// the traffic the map carries now.
const gbpsW = (x) => (x >= 1 ? x.toFixed(1) + ' Gbps' : Math.round(x * 1000) + ' Mbps');
for (const id of ['partial', 'small']) {
  test(`${id}: Over time reads Gbps in the Cost view, the same as in the Traffic view`, () => {
    const g = vals(at(id, { mapMode: 'state', obPanel: 'time' })), c = vals(at(id, { mapMode: 'cost', obPanel: 'time' }));
    assert.ok(g.otBars.length > 0);
    assert.deepEqual(c.otTiles.map(t => `${t.l} ${t.v}`), g.otTiles.map(t => `${t.l} ${t.v}`));
    assert.deepEqual(c.otBars.map(b => b.title), g.otBars.map(b => b.title));
    assert.ok(c.otBars[c.otBars.length - 1].title.includes(` · ${gbpsW(g.mapTotal)} · `), c.otBars[c.otBars.length - 1].title);
    assert.match(c.otTiles.find(t => t.l === 'Peak').v, /^\d+(\.\d)? (Gbps|Mbps)$/);
  });
  test(`${id}: the map's sub line reads Gbps in the Cost view too`, () => {
    const g = vals(at(id, { mapMode: 'state' })), c = vals(at(id, { mapMode: 'cost' }));
    assert.ok(g.mapSub.startsWith(`${g.mapTotal.toFixed(1)} Gbps now`), g.mapSub);
    assert.equal(c.mapSub, g.mapSub);
  });
}

// The rule behind both: in the Cost view nothing reads the weighed map's
// dollars as Gbps. A selected bar's drawer said "Traffic 2400.00 Gbps" and its
// Compare pin "2400.0 Gbps" on Small. Every Gbps figure the Cost view reads is
// one the Traffic view reads, with a bar selected and pinned, on every panel.
const RX = /\d[\d,]*(\.\d+)? ?(Gbps|Mbps)/g;
function figures(o, path, out, seen) {
  if (o == null) return out;
  if (typeof o === 'string') { for (const m of o.matchAll(RX)) out.push(`${path} = ${m[0]}`); return out; }
  if (typeof o !== 'object' || seen.has(o)) return out;
  seen.add(o);
  for (const [k, v] of Object.entries(o)) if (typeof v !== 'function') figures(v, `${path}.${k}`, out, seen);
  return out;
}
for (const id of ['partial', 'mature', 'trust', 'small']) {
  test(`${id}: the Cost view reads no Gbps figure the Traffic view does not, bar selected and pinned`, () => {
    const sel = id === 'small' ? 'mid:internet' : 'mid:NetBond', bad = [];
    for (const obPanel of ['map', 'time', 'where']) {
      const p = { mapSel: sel, mapPins: [sel], obPanel };
      const g = new Set(figures(vals(at(id, { ...p, mapMode: 'state' })), '', [], new Set()).map(x => x.split(' = ')[1]));
      bad.push(...figures(vals(at(id, { ...p, mapMode: 'cost' })), obPanel, [], new Set()).filter(x => !g.has(x.split(' = ')[1])));
    }
    assert.deepEqual(bad, []);
  });
}

test('empty: the map carries no traffic, so its total is 0, not the divide-by guard', () => {
  const est = D.ESTATES.empty, inv = A.inventory(est), flows = A.observe(est, [], inv).flows;
  assert.equal(F.buildMap(est, inv, flows, {}).total, 0);
  const v = vals(at('empty'));
  assert.equal(v.mapTotal, 0);
  const t = v.flowTiles.find(x => x.key === 'traffic');
  assert.equal(`${t.v} ${t.u}`, '0 Mbps');
});
