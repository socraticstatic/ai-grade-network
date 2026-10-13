import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as CV from '../naas-cost-view.js';
import { fmt } from '../naas-logic.js';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// Cost's seven analysis tabs as stories (2026-10-13, Micah, after Estate, Optimize and Govern: "Do this for more pages!
// Great space, great layout, calls to action on all widgets"; "Each page should be its own gorgeous, extremely beautiful
// story, with calls to action on each"; "tell the story with less words, and more visualizations, animations and icons").
// One grammar on Spend, By leg, By region, By destination, By first mile, By bucket and AT&T charges: a top line (the
// question and the key), four equal tiles with the verdict first (each a door, its figure counting up to what it prints),
// then the evidence and the moves as cards whose foot carries the action. Every figure is the finops model's own; green
// is the saving alone.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const CSS = readFileSync(new URL('../storefront.css', import.meta.url), 'utf8');
const ESTATES = ['partial', 'mature', 'trust', 'small'];
const cost = (view, patch = {}) => mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'cost', ...patch });
const panelOf = (gate) => { const a = HTML.indexOf(`<sc-if value="{{ ${gate} }}"`); assert.ok(a > 0, gate); let depth = 0, i = a; const re = /<(\/?)sc-if\b/g; re.lastIndex = a; for (let m; (m = re.exec(HTML));) { depth += m[1] ? -1 : 1; if (!depth) { i = m.index; break; } } return HTML.slice(a, i); };
// The count-up's last frame, as the CSS counters print it: pre, then millions, thousands and units in groups of three.
const counted = (cu) => {
  const p3 = (n) => String(n).padStart(3, '0');
  const body = cu.kOn === 'm' ? `${cu.m},${p3(cu.k)},${p3(cu.r)}` : cu.kOn === 'k' ? `${cu.k},${p3(cu.r)}` : `${cu.r}`;
  return `${cu.pre}${body}${cu.suf}`;
};
// The tiles each tab draws, the verdict first.
const TABS = {
  spend: (v) => v.spendTiles,
  legs: (v) => [v.legLead, ...v.legTiles],
  money: (v) => [v.regionLead, ...v.regionTiles],
  dest: (v) => v.destTiles,
  mile: (v) => v.mileTiles,
  bucket: (v) => v.bucketTiles,
  charges: (v) => v.chargeTiles,
};
// The tab's one headline money figure, as the page already printed it before the stories.
const VERDICT = {
  spend: (v) => v.spendTiles[0].v,
  legs: (v) => v.legTotalF,
  money: (v) => v.regionTotalF,
  dest: (v) => v.bTotalF,
  mile: (v) => v.bySiteTotalF,
  bucket: (v) => v.bSaveF,
  charges: (v) => v.attTotalF,
};
// Tiles that are a saving, and so may wear the success ink.
const SAVING = new Set(['banked', 'could', 'recover', 'save', 'carries', 'net', 'regionSave']);

test('every story tab draws four tiles, the verdict first, each a door with a mark', () => {
  for (const view of ESTATES) for (const [tab, tilesOf] of Object.entries(TABS)) {
    const v = vals(cost(view, { costPanel: tab }));
    const tiles = tilesOf(v);
    assert.equal(tiles.length, 4, `${view} ${tab}: ${tiles.length} tiles`);
    assert.equal(tiles[0].v, VERDICT[tab](v), `${view} ${tab}: the verdict tile reads ${tiles[0].v}`);
    for (const t of tiles) {
      assert.ok(t.key && t.l && t.icon, `${view} ${tab}: a tile without its key, label or mark`);
      assert.equal(typeof t.go, 'function', `${view} ${tab} ${t.key}: no door`);
      assert.ok(t.title, `${view} ${tab} ${t.key}: its sentence lives in the title`);
      for (const k of t.chips || []) { assert.ok(k.key && k.icon && k.title, `${view} ${tab} ${t.key}: a chip without its glyph or title`); if (k.go) assert.equal(typeof k.go, 'function'); }
    }
  }
});

test('every tile figure counts up to exactly what it prints', () => {
  let n = 0;
  for (const view of ESTATES) for (const [tab, tilesOf] of Object.entries(TABS)) for (const t of tilesOf(vals(cost(view, { costPanel: tab })))) {
    if (t.cu.kOn === 'off') continue;
    assert.equal(counted(t.cu), t.v, `${view} ${tab} ${t.key}: counts to ${counted(t.cu)}, prints ${t.v}`);
    assert.equal(t.cu.preCss, `'${t.cu.pre}'`); assert.equal(t.cu.sufCss, `'${t.cu.suf}'`);
    n++;
  }
  assert.ok(n > 80, `only ${n} figures count up`);
  // A million counts in three groups (Trust's legs run past $1.8M).
  const t = vals(cost('trust', { costPanel: 'legs' })).legLead;
  assert.equal(t.cu.kOn, 'm'); assert.equal(counted(t.cu), t.v);
});

test('green is the saving alone: no tile that is not a saving wears the success ink', () => {
  for (const view of ESTATES) for (const [tab, tilesOf] of Object.entries(TABS)) for (const t of tilesOf(vals(cost(view, { costPanel: tab })))) {
    if (!SAVING.has(t.key)) assert.notEqual(t.tone, 'var(--success)', `${view} ${tab} ${t.key} wears the saving's green`);
    for (const k of t.chips || []) assert.doesNotMatch(String(k.ink || ''), /success/, `${view} ${tab} ${t.key} chip ${k.key}`);
  }
});

test('the tiles reuse the model: By leg reads its legs, By region its bars, By bucket its buckets, AT&T charges its bill', () => {
  for (const view of ESTATES) {
    const lg = vals(cost(view, { costPanel: 'legs' }));
    assert.deepEqual(lg.legTiles.map(t => t.v), ['access', 'connect', 'cloud'].map((k, i) => lg.legTiles[i].v));
    // The lead tile's chips are each leg's share, the numbers the leg tiles' lines already print.
    assert.deepEqual(lg.legLead.chips.map(k => k.t), lg.legTiles.map(t => /^(\d+%)/.exec(t.sub)[1]));
    const rg = vals(cost(view, { costPanel: 'money' }));
    assert.equal(rg.regionTiles.find(t => t.key === 'regionSave').v, rg.regionSaveTotalF);
    const bk = vals(cost(view, { costPanel: 'bucket' }));
    assert.deepEqual(bk.bucketTiles.slice(1, 3).map(t => t.v), [bk.bTotalF, bk.bFabF]);
    const ch = vals(cost(view, { costPanel: 'charges' }));
    assert.equal(ch.chargeTiles.find(t => t.key === 'net').v, ch.attNetF);
  }
});

test('the stories add up: every new total is the sum of figures the page already prints', () => {
  const money = (s) => +String(s).replace(/[^0-9.]/g, '');
  for (const view of ['partial', 'mature', 'trust']) {
    // By leg's Who is paid: each ink's whole dollars add to the end-to-end figure, on the estate and on a pick.
    const lg = vals(cost(view, { costPanel: 'legs' }));
    assert.equal(lg.legInks.filter(k => k.vF).reduce((a, k) => a + money(k.vF), 0), money(lg.legTotalF), `${view}: Who is paid`);
    // By region: outside AT&T and could save are the moves list's own rows, added.
    const rg = vals(cost(view, { costPanel: 'money' }));
    const all = []; const c = cost(view, { costPanel: 'money' }); for (let g = 0; g < 10; g++) { const w = vals(c); all.push(...w.regionSaveRows); if (w.regSavePager.nextOp < 1) break; w.regSavePager.next(); }
    assert.equal(money(rg.regionTiles.find(t => t.key === 'out').v), all.reduce((a, r) => a + r.nowN, 0), `${view}: outside AT&T`);
    assert.equal(money(rg.regionTiles.find(t => t.key === 'regionSave').v), all.reduce((a, r) => a + r.saveN, 0), `${view}: could save`);
    // By destination: at the AT&T rate, recoverable and after steering are the egress, whole.
    const ds = vals(cost(view, { costPanel: 'dest' }));
    assert.equal(ds.destTiles.slice(1).reduce((a, t) => a + money(t.v), 0), money(ds.destTiles[0].v), `${view}: what can move`);
    // By first mile: the public first mile is the figure the page's note already says.
    const ml = vals(cost(view, { costPanel: 'mile' }));
    assert.ok(ml.bySiteNote.startsWith(ml.mileTiles.find(t => t.key === 'public').v), `${view}: ${ml.bySiteNote}`);
    // AT&T charges: the net is the savings carried minus the bill.
    const ch = vals(cost(view, { costPanel: 'charges' }));
    assert.equal(money(ch.chargeTiles.find(t => t.key === 'carries').v) - money(ch.attTotalF), money(ch.attNetF) * (/^[−-]/.test(ch.attNetF) ? -1 : 1), `${view}: net`);
  }
});

test('every move is a door to where you act', () => {
  for (const view of ESTATES) {
    // By bucket: each bucket that can move steers itself; the one with the most to save is the filled button.
    const bk = vals(cost(view, { costPanel: 'bucket' }));
    assert.equal(bk.bucketRows.length, bk.buckets.length);
    for (const [i, r] of bk.bucketRows.entries()) { assert.equal(r.canSteer, bk.buckets[i].canSteer); if (r.canSteer) assert.equal(r.steer, bk.buckets[i].steer); }
    assert.ok(bk.bucketRows.filter(r => r.primary).length <= 1, `${view}: more than one filled Steer`);
    // The bar is today: on AT&T in blue and the saving striped, on one scale.
    for (const r of bk.bucketRows) assert.ok(Math.abs(parseFloat(r.wAfter) + parseFloat(r.wSave) - parseFloat(r.wToday)) < 0.2, `${view} ${r.name}`);
    // By first mile: each first mile still public moves its own sites onto AT&T, through the order flow.
    const c = cost(view, { costPanel: 'mile' });
    const mv = vals(c).mileMoves;
    for (const m of mv) assert.ok(m.sites.length > 0, `${view} ${m.label}: a move with no sites`);
    if (mv.length) { mv[0].go(); assert.equal(c.state.screen, 's4', `${view}: Move to AT&T lands on ${c.state.screen}`); for (const nm of mv[0].sites) assert.ok(JSON.stringify(c.state).includes(nm), `${view}: the order lost ${nm}`); }
    // By destination: Act opens the moves; the buckets door opens By bucket.
    const d = cost(view, { costPanel: 'dest' });
    vals(d).destActGo(); assert.equal(d.state.costPanel, 'optimize');
    const d2 = cost(view, { costPanel: 'dest' });
    vals(d2).destBucketsGo(); assert.equal(d2.state.costPanel, 'bucket');
    // Spend: the savings card's foot acts on the moves.
    const sp = cost(view, { costPanel: 'spend' });
    vals(sp).spendActGo(); assert.equal(sp.state.costPanel, 'optimize');
    // By leg: each leg's card carries its own action.
    const lg = vals(cost(view, { costPanel: 'legs' }));
    assert.deepEqual(lg.legCards.map(k => k.key), ['access', 'connect', 'cloud']);
    for (const k of lg.legCards) { assert.ok(k.cta, `${view} ${k.key}: no verb`); assert.equal(typeof k.ctaGo, 'function'); }
    assert.equal(lg.legCards.filter(k => k.primary).length, 1, `${view}: one filled button on By leg`);
  }
});

test('a leg row reads short: count × unit in a few words, the arithmetic in its title', () => {
  for (const view of ESTATES) {
    const v = vals(cost(view, { costPanel: 'legs' }));
    for (const r of [...v.legAccessRows, ...v.legConnectRows, ...v.legCloudRows]) {
      assert.ok(r.short, `${view} ${r.label}: no short line`);
      assert.ok(r.short.split(/\s+/).length <= 6, `${view} ${r.label}: "${r.short}"`);
      assert.ok(r.title.length >= r.short.length, `${view} ${r.label}: the title says less than the line`);
    }
  }
  // The row helper itself: a priced row leads with its count, egress with what is outside AT&T.
  const row = { key: 'avpn', n: 9, unit: 1600, eachWord: true, nouns: ['circuit', 'circuits'], parts: [{ role: 'backup', n: 2 }] };
  assert.equal(CV.shortWords(row), '9 circuits × $1,600');
  assert.equal(CV.shortWords({ key: 'tpa', n: 5, carrier: true, nouns: ['circuit', 'circuits'] }), '5 circuits · not priced');
  assert.match(CV.shortWords({ key: 'egress', n: 6, parts: [{ ink: 'public', v: 71600 }, { ink: 'att', v: 18000 }] }), /^\$71,600 outside AT&T$/);
  assert.equal(fmt(71600), '$71,600');
});

test('the markup: each story tab is one grammar of top line, tiles and cards, and every action has somewhere to go', () => {
  for (const gate of ['costPanelSpend', 'costPanelLegs', 'costPanelMoney', 'costPanelDest', 'costPanelMile', 'costPanelBucket', 'costPanelCharges']) {
    const html = panelOf(gate);
    assert.match(html, /class="cst-top"><h3 title="\{\{ [\w.]+ \}\}">[^<]+\?<\/h3>/, `${gate}: no question in its top line`);
    assert.match(html, /class="cst-tiles/, `${gate}: no tiles`);
    assert.match(html, /class="fx-card cst-tile"/, `${gate}: no tile card`);
    assert.match(html, /class="fx-card cst-card"/, `${gate}: no evidence card`);
    for (const m of html.matchAll(/<button class="(?:op-go|cst-do)"[^>]*>/g)) assert.match(m[0], /onClick="\{\{ [\w.]+ \}\}"/, `${gate}: ${m[0]}`);
    // Type: nothing below 12px, so the 11px house chips stay off the stories.
    assert.doesNotMatch(html, /class="fx-chip"/, `${gate}: an 11px chip`);
    assert.doesNotMatch(html, /—/, `${gate}: an em dash`);
  }
  // Motion that rests: every cst- keyframe names only its first frames, and reduced motion stills them all.
  for (const m of CSS.matchAll(/@keyframes (cst-[\w-]+)\{([^@]*?)\}\}/g)) assert.doesNotMatch(m[2], /(^|\})\s*(to|100%)\{/, `${m[1]} names its last frame`);
  assert.match(CSS, /@media \(prefers-reduced-motion: ?reduce\)\{[^@]*\.cst-/, 'reduced motion stills the stories');
});
