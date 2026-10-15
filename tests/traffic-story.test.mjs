import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// Observe > Traffic as seven stories (2026-10-13, Micah: "Do this for more pages! Great space, great layout, calls to action
// on all widgets, go forth!"; "Each page should be its own gorgeous, extremely beautiful story, with calls to action on each";
// "Elevate this enterprise experience to pure actionable story ... with less words, and more visualizations, animations and
// icons"). Every tab reads verdict, evidence, moves: one strip of glyph tiles whose figures are the model's own and whose
// every tile is a door, the tab's own picture, and a verb on every card. These tests hold the new keys to the model the page
// already had, so the story never invents a figure, and every action they name moves the page somewhere.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const store = {};
globalThis.localStorage = globalThis.localStorage || { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const CSS = readFileSync(new URL('../storefront.css', import.meta.url), 'utf8');
const at = (view, patch = {}) => mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', obTab: 'flow', ...patch });
const PANELS = ['map', 'time', 'where', 'health', 'paths', 'conn', 'changes'];
const VIEWS = ['partial', 'mature', 'trust', 'small'];
const STORY = { map: 'trfMap', time: 'trfTime', where: 'trfWhere', health: 'trfHealth', paths: 'trfPaths', conn: 'trfCap', changes: 'trfChg' };
const snap = (st) => JSON.stringify(st, (k, v) => (typeof v === 'function' ? undefined : v));
const icon = (name) => existsSync(new URL(`../brand/icons/${name}.svg`, import.meta.url));
// Every action a story names: an object with a label (or an aria) and a go, anywhere under the panel's model.
const actsOf = (x, out = [], seen = new Set()) => {
  if (!x || typeof x !== 'object' || seen.has(x)) return out; seen.add(x);
  if (typeof x.go === 'function' && (x.label || x.aria)) out.push(x);
  for (const v of Array.isArray(x) ? x : Object.values(x)) actsOf(v, out, seen);
  return out;
};

test('every Traffic tab opens on its verdict: a strip of glyph tiles, each a figure with its door', () => {
  for (const view of VIEWS) for (const obPanel of PANELS) {
    const v = vals(at(view, { obPanel }));
    assert.ok(Array.isArray(v.trfTiles) && v.trfTiles.length >= 4, `${view} ${obPanel}: ${v.trfTiles && v.trfTiles.length} tiles`);
    assert.equal(v.trfTileN, v.trfTiles.length, `${view} ${obPanel}: the strip's column count is its tile count`);
    for (const t of v.trfTiles) {
      assert.ok(t.icon && icon(t.icon), `${view} ${obPanel} ${t.key}: glyph ${t.icon}`);
      assert.ok(t.l && String(t.v).length, `${view} ${obPanel} ${t.key}: "${t.l}" "${t.v}"`);
      assert.equal(typeof t.go, 'function', `${view} ${obPanel} ${t.key}: the tile is a door`);
      assert.ok(t.title && t.title.length > 8, `${view} ${obPanel} ${t.key}: its words live in its title`);
      // Glyph first, few words: a tile's label is a name, never a sentence.
      assert.ok(t.l.split(/\s+/).length <= 4, `${view} ${obPanel} ${t.key}: label "${t.l}"`);
    }
  }
});

test('the tiles print the figures the tabs already counted, never new ones', () => {
  for (const view of VIEWS) {
    const map = vals(at(view, { obPanel: 'map' }));
    assert.deepEqual(map.trfTiles.map(t => t.l), map.flowTiles.map(t => t.l), `${view}: the map's six rollups`);
    assert.deepEqual(map.trfTiles.map(t => t.v), map.flowTiles.map(t => t.v), `${view}: the map's six figures`);
    const time = vals(at(view, { obPanel: 'time' }));
    assert.deepEqual(time.trfTiles.map(t => `${t.v}${t.u ? ' ' + t.u : ''}`.replace(/ \/mo$/, '')), time.otTiles.map(t => t.v), `${view}: Over time`);
    const health = vals(at(view, { obPanel: 'health' }));
    assert.deepEqual(health.trfTiles.map(t => t.v), health.healthTiles.map(t => t.v), `${view}: Health`);
    const where = vals(at(view, { obPanel: 'where' }));
    const w = Object.fromEntries(where.trfTiles.map(t => [t.key, t.v]));
    assert.equal(w.onatt, where.fabPctF, `${view}: On AT&T is Where it goes' own share`);
    assert.equal(`${w.out} Gbps`, `${where.pubGbps} Gbps`);
    assert.equal(`${w.local} Gbps`, `${where.locGbps} Gbps`);
    const conn = vals(at(view, { obPanel: 'conn' }));
    if (conn.bwTiles.length) assert.deepEqual(conn.trfTiles.map(t => `${t.v} ${t.u}`), conn.bwTiles.map(t => t.v), `${view}: Capacity`);
    const paths = vals(at(view, { obPanel: 'paths' }));
    const p = Object.fromEntries(paths.trfTiles.map(t => [t.key, t]));
    // The slowest path left with the delay figures (2026-10-15): the busiest link and the paths near full are the table's own.
    const busiest = paths.pathTimeAll.filter(r => r.link).sort((a, b) => b.link.pct - a.link.pct)[0];
    if (busiest) assert.equal(`${p.busiest.v}${p.busiest.u}`, busiest.linkF, `${view}: the busiest link is the Paths table's`);
    assert.equal(p.near.v, String(paths.pathTimeAll.filter(r => r.link && r.link.near).length), `${view}: near full`);
    assert.equal(p.ok.v, `${paths.pathTimeAll.filter(r => r.state === 'ok').length} of ${paths.pathTimeAll.length}`);
    const chg = vals(at(view, { obPanel: 'changes' }));
    const c = Object.fromEntries(chg.trfTiles.map(t => [t.key, t.v]));
    assert.equal(c.n, String(chg.changeAll.filter(x => !x.upcoming).length), `${view}: changes in the window`);
    assert.equal(c.lined, String(chg.changeAll.filter(x => x.lined).length), `${view}: lined up with a problem`);
  }
});

test('every tile is a door that moves the page to where you act', () => {
  for (const view of ['partial', 'trust']) for (const obPanel of PANELS) {
    const n = vals(at(view, { obPanel })).trfTiles.length;
    for (let i = 0; i < n; i++) {
      const c = at(view, { obPanel });
      const t = vals(c).trfTiles[i], before = snap(c.state);
      t.go();
      assert.notEqual(snap(c.state), before, `${view} ${obPanel} ${t.key}: pressing the tile changed nothing`);
    }
  }
});

test('every card on every tab carries a verb, and every verb does something', () => {
  for (const view of ['partial', 'mature', 'trust', 'small']) for (const obPanel of PANELS) {
    const v = vals(at(view, { obPanel }));
    const story = v[STORY[obPanel]];
    assert.ok(story && typeof story === 'object', `${view} ${obPanel}: no ${STORY[obPanel]}`);
    assert.ok(story.cta && typeof story.cta.go === 'function' && story.cta.label, `${view} ${obPanel}: the hero card's own action`);
    assert.ok(story.cta.icon && icon(story.cta.icon), `${view} ${obPanel}: the action wears a glyph (${story.cta.icon})`);
    const acts = actsOf(story);
    assert.ok(acts.length >= 1, `${view} ${obPanel}: ${acts.length} actions`);
    for (let i = 0; i < acts.length; i++) {
      const c = at(view, { obPanel });
      const a = actsOf(vals(c)[STORY[obPanel]])[i];
      if (!a || a.disabled) continue;
      const before = snap(c.state);
      a.go();
      assert.notEqual(snap(c.state), before, `${view} ${obPanel}: "${a.label || a.aria}" does nothing`);
    }
  }
});

test('the saving alone wears the green: no delta, health state or spend is success-inked', () => {
  const SAVE = new Set(['could']);
  for (const view of VIEWS) for (const obPanel of PANELS) {
    for (const t of vals(at(view, { obPanel })).trfTiles) {
      const money = /^\$[\d,]+$/.test(t.v) && t.v !== '$0';
      assert.equal(t.tone === 'var(--success)', SAVE.has(t.key) && money, `${view} ${obPanel} ${t.key}: tone ${t.tone}`);
      assert.notEqual(t.deltaInk, 'var(--success)', `${view} ${obPanel} ${t.key}: a delta is not a saving`);
      assert.ok(!/success/.test(t.ring || ''), `${view} ${obPanel} ${t.key}: its ring is not a saving`);
    }
  }
  // Healthy reads blue on Traffic, never the saving's green (the strip, the dots, the Utilization view).
  assert.match(CSS, /\.trf \.ps \[data-state="ok"\] i\{[^}]*var\(--viz-1\)/, 'the strip draws Healthy in the healthy blue');
  const util = vals(at('partial', { mapMode: 'util' }));
  assert.notEqual(util.mapLegend.find(x => x.label === 'Healthy').color, 'var(--success)', 'Healthy is not the saving\'s green');
  assert.ok(util.mapRibbons.every(r => r.fill !== 'var(--success)'), 'no ribbon is the saving\'s green');
});

test('the markup draws one verdict strip, a story per tab, and no sentence on the page', () => {
  const i = HTML.indexOf('<div id="sec-flow"'), j = HTML.indexOf('<sc-if value="{{ isEmpty }}"', i);
  const page = HTML.slice(i, j);
  assert.ok(i > 0 && j > i, 'the Traffic page is gone');
  assert.equal((page.match(/<sc-for list="\{\{ trfTiles \}\}"/g) || []).length, 1, 'one tile strip, shared by every tab');
  for (const k of ['trf-map', 'trf-time', 'trf-where', 'trf-health', 'trf-paths', 'trf-cap', 'trf-chg']) assert.ok(page.includes(`class="${k}`) || page.includes(` ${k}"`) || page.includes(` ${k} `), `no ${k} story`);
  for (const k of Object.values(STORY)) assert.ok(page.includes(`{{ ${k}.cta.go }}`), `${k}'s action is not bound`);
  // The explanations live in titles: no paragraph prints them.
  assert.ok(!/>\s*Compute, database and network are modelled/.test(page), 'App health prints its paragraph again');
  assert.ok(!page.includes('>{{ pathDetail }}<'), 'Paths prints its hop sentence again');
  assert.ok(!page.includes('>{{ pathLine }}<') && !/>\s*How paths are read/.test(page), 'Paths prints its reading note again');
  // Motion rests on its last frame: every trf keyframe names only its first frames, and reduced motion stops it.
  const kf = [...CSS.matchAll(/@keyframes (trf-[\w-]+)\{([^}]*\}[^}]*)\}/g)];
  assert.ok(kf.length >= 3, `${kf.length} trf keyframes`);
  for (const [, name, body] of kf) assert.ok(!/\bto\{|100%\{/.test(body), `${name} names its last frame`);
  assert.match(CSS, /@media \(prefers-reduced-motion: reduce\)\{[^}]*\.trf/, 'reduced motion does not stop the Traffic motion');
});

// Capacity (2026-10-14, "a band of air between the bar and the run chart"): on one row the run chart fills its row
// instead of sitting capped at 260px against the foot, so the six months start under the usage bar.
test('a one-row Capacity card lets its six-month run fill the row', () => {
  const css = readFileSync(new URL('../storefront.css', import.meta.url), 'utf8');
  assert.match(css, /\.trf-cap\[data-rows="1"\] \.trf-cspark\{[^}]*max-height:none/, 'the one-row run chart is still capped');
});
