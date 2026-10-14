import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { wedgeOf, words } from '../naas-home.js';
import { mkC } from './harness.mjs';

// The home as a story (Micah, 2026-10-13: "Each page should be its own gorgeous, extremely beautiful story, with calls
// to action on each"; "tell the story with less words, and more visualizations, animations and icons"). Three acts in
// one grammar: the verdict (a seal, the figure that counts up, the line as glyph chips, the role's own picture and its
// two doors), the evidence (four tiles whose rings are doors, then the role's own panel), and the moves (Do next and
// Needs attention, each line led by its mark and closed by its verb). Every figure is the page's own; the home only
// draws it.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const store = {};
globalThis.localStorage = globalThis.localStorage || { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };

const NOW = '2026-10-05T14:00:00Z';
const LIVE = ['partial', 'mature', 'trust', 'small'];
const ROLES = ['architect', 'neteng', 'security', 'finops', 'exec'];
const home = (view, patch = {}) => mkC({ view, estateParam: null, screen: 's0', nowIso: NOW, ...patch });
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const CSS = readFileSync(new URL('../storefront.css', import.meta.url), 'utf8');
const block = () => { const i = HTML.indexOf('aria-label="NaaS home"'); return HTML.slice(i, HTML.indexOf('</section>', i)); };
const num = (s) => +String(s).replace(/[^\d.]/g, '');

// ---- Act 1: the verdict ----

test('the verdict leads with its figure: pre, figure and rest read the headline, and money that is saved is green', () => {
  for (const view of LIVE) for (const persona of ROLES) {
    const t = vals(home(view, { persona })).homeTake, f = t.fig;
    assert.ok(f, `${view}/${persona}: no figure block`);
    if (!f.has) { assert.equal(f.pre, t.head, `${view}/${persona}: a verdict without a figure prints its head`); continue; }
    assert.ok(t.head.startsWith(`${f.pre ? f.pre + ' ' : ''}${f.n}${f.u}`), `${view}/${persona}: "${t.head}" is not "${f.pre} ${f.n}${f.u}"`);
    if (f.rest) assert.ok(t.head.includes(f.rest), `${view}/${persona}: "${f.rest}" is not in "${t.head}"`);
    assert.ok(words(`${f.pre} ${f.n}${f.u} ${f.rest}`) <= 9, `${view}/${persona}: the headline runs on`);
    if (persona === 'exec' || persona === 'finops') assert.equal(f.ink, /\$/.test(f.n) && /save|table/i.test(t.head) ? 'var(--success)' : 'var(--text-heading)', `${view}/${persona}`);
    else assert.notEqual(f.ink, 'var(--success)', `${view}/${persona}: green on a figure that is not a saving`);
  }
});

test('the verdict\'s line is glyph chips: one a part, the part\'s words in its title, its door the part\'s', () => {
  for (const view of LIVE) for (const persona of ROLES) {
    const t = vals(home(view, { persona })).homeTake;
    assert.equal(t.chips.length, t.parts.length, `${view}/${persona}`);
    t.chips.forEach((ch, i) => {
      const p = t.parts[i];
      assert.equal(ch.title, p.t, `${view}/${persona}: chip ${i}`);
      assert.ok(ch.icon, `${view}/${persona}: chip ${i} has no glyph`);
      assert.ok(words(ch.t) <= 2, `${view}/${persona}: chip ${i} reads "${ch.t}"`);
      assert.equal(ch.go, p.go, `${view}/${persona}: chip ${i} is not the part's door`);
      assert.equal(ch.off, p.off, `${view}/${persona}: chip ${i}`);
    });
  }
  // The Architect's clouds are their marks, not their names.
  const arch = vals(home('partial', { persona: 'architect' })).homeTake;
  const on = arch.chips.find(c => c.hasMarks);
  assert.ok(on && on.marks.length === 3 && on.marks.every(m => /brand\/providers\//.test(m.src)), 'the clouds are not marks');
});

test('each role\'s verdict draws its own picture from figures the page already prints', () => {
  for (const view of LIVE) {
    // Network Eng: the worst problem's path, sites to the thing that broke to the region.
    const ne = vals(home(view, { persona: 'neteng' }));
    const worst = ne.problemRows.slice().sort((a, b) => ({ down: 0, slo: 1, risk: 2 }[a.state] ?? 3) - ({ down: 0, slo: 1, risk: 2 }[b.state] ?? 3))[0];
    if (worst) {
      const z = ne.homeTake.viz;
      assert.equal(z.kind, 'path', view);
      assert.equal(z.stations.length, 3, view);
      assert.equal(z.stations[1].state, worst.state === 'risk' ? 'risk' : 'broken', `${view}: the thing that broke is not marked`);
      assert.equal(z.stations[1].label, worst.thing, view);
      assert.equal(z.stations[2].label, worst.where.split(' ').slice(1).join(' ') || worst.where, view);
      assert.equal(typeof z.go, 'function', view);
    }
    // Security: the exposed share on a hundred cells.
    const se = vals(home(view, { persona: 'security' }));
    const sz = se.homeTake.viz, e = num(se.invStats.find(x => x.key === 'e').v), w = num(se.invStats.find(x => x.key === 'w').v);
    assert.equal(sz.kind, 'waffle', view);
    assert.equal(sz.cells.length, 100, view);
    assert.equal(sz.cells.filter(c => c.on).length, e ? Math.min(100, Math.max(1, Math.round(e / w * 100))) : 0, view);
    // The Architect: one dot a region, by cloud, the private ones filled.
    const ar = vals(home(view, { persona: 'architect' }));
    const az = ar.homeTake.viz, regs = ar.allRegions || [];
    assert.equal(az.kind, 'dots', view);
    assert.equal(az.clouds.reduce((a, g) => a + g.dots.length, 0), regs.length, view);
    assert.equal(az.clouds.flatMap(g => g.dots).filter(d => d.priv).length, regs.filter(r => r.priv).length, view);
    for (const g of az.clouds) for (const d of g.dots) assert.equal(typeof d.go, 'function', `${view}: ${d.title}`);
    // FinOps: what is banked, month by month, Spend's own bars.
    const fi = vals(home(view, { persona: 'finops' }));
    const banked = fi.spendTiles.find(x => x.key === 'banked');
    if (banked && banked.hasSpark) { assert.equal(fi.homeTake.viz.kind, 'spark', view); assert.deepEqual(fi.homeTake.viz.bars.map(b => b.h), banked.spark.map(b => b.h), view); }
    // The Executive: the money on the table, a striped segment a move, in proportion.
    const ex = vals(home(view, { persona: 'exec' }));
    const ez = ex.homeTake.viz;
    if (ez.kind === 'moves') {
      const tot = ez.segs.reduce((a, g) => a + parseFloat(g.w), 0);
      assert.ok(Math.abs(tot - 100) < 0.6, `${view}: segments add to ${tot}%`);
      for (const g of ez.segs) assert.ok(ex.roleActAll.some(a => a.saveFig && g.title.includes(a.saveFig.replace(/\/mo$/, ''))), `${view}: ${g.title} is not a move's saving`);
    }
  }
});

// ---- Act 2: the evidence ----

test('a wedge is a polygon from the centre round its arc, a step at most a twelfth of a turn', () => {
  const w = wedgeOf(0, 0.25);
  assert.match(w, /^polygon\(50% 50%, /);
  const pts = w.slice(8, -1).split(', ').slice(1).map(p => p.split(' ').map(parseFloat));
  assert.ok(pts.length >= 4, `${pts.length} points`);
  // Twelve o'clock first, then clockwise to three o'clock; every point outside the ring's circle.
  assert.ok(Math.abs(pts[0][0] - 50) < 0.01 && pts[0][1] < 0, `starts at ${pts[0]}`);
  const last = pts[pts.length - 1];
  assert.ok(last[0] > 100 && Math.abs(last[1] - 50) < 0.01, `ends at ${last}`);
  for (const [x, y] of pts) assert.ok(Math.hypot(x - 50, y - 50) >= 70, `${x},${y} inside the ring`);
  assert.equal(wedgeOf(0.3, 0.3), 'polygon(50% 50%)', 'an empty wedge draws nothing');
});

test('each tile\'s ring is its bar: one wedge a segment, in order, and each a door', () => {
  for (const view of LIVE) for (const persona of ROLES) {
    for (const c of vals(home(view, { persona })).homeCards) {
      let at = 0;
      for (const b of c.bar) {
        const f = parseFloat(b.w) / 100;
        assert.match(b.clip, /^polygon\(50% 50%/, `${view}/${persona} ${c.key} ${b.key}`);
        assert.equal(b.from, +at.toFixed(4), `${view}/${persona} ${c.key} ${b.key}: the wedge does not start where the last one ended`);
        at += f;
        assert.equal(typeof b.go, 'function');
      }
      assert.ok(at <= 1.002, `${view}/${persona} ${c.key}: the ring overruns at ${at}`);
      // The pill is a glyph and its figure; the words ride in its title.
      if (c.hasPill) { assert.ok(c.pillIcon, `${c.key}: no pill glyph`); assert.ok(words(c.pillN) <= 1, `${c.key}: "${c.pillN}"`); }
      assert.ok(c.cu && c.cu.kOn, `${view}/${persona} ${c.key}: the figure does not count`);
    }
  }
});

test('each role has its own evidence panel, every row a door to the page that prints it', () => {
  const want = { exec: 'chart', finops: 'fin', neteng: 'paths', security: 'exposure', architect: 'regions' };
  for (const view of LIVE) for (const persona of ROLES) {
    const v = vals(home(view, { persona })), p = v.homePanel;
    assert.equal(p.kind, want[persona], `${view}/${persona}`);
    assert.ok(p.cta && p.cta.label && typeof p.cta.go === 'function', `${view}/${persona}: the panel has no call to action`);
    assert.equal(typeof p.go, 'function', `${view}/${persona}: the panel's head is no door`);
    if (!p.isBars) continue;
    assert.ok(p.rows.length > 0 && p.rows.length <= 6, `${view}/${persona}: ${p.rows.length} rows`);
    for (const r of p.rows) {
      assert.equal(typeof r.go, 'function', `${view}/${persona} ${r.key}`);
      assert.ok(words(r.name) <= 4, `${view}/${persona}: "${r.name}"`);
      const tot = r.segs.reduce((a, g) => a + parseFloat(g.w), 0);
      assert.ok(tot <= 100.5, `${view}/${persona} ${r.key}: the bar overruns at ${tot}%`);
    }
    if (persona === 'neteng') for (const r of p.rows) assert.ok(v.pathTimeAll.some(x => x.key === r.key && x.totalF === r.v), `${view}: ${r.key} ${r.v} is not Paths' own`);
    if (persona === 'security') for (const r of p.rows) assert.ok(v.appAll.some(a => a.key === r.key && a.exposedF === r.v), `${view}: ${r.key} ${r.v} is not Discover's own`);
    if (persona === 'architect') for (const r of p.rows) assert.ok(v.allRegions.some(g => `${g.cloud} ${g.region}` === r.title.split(' · ')[0] && String(g.wl) === r.v), `${view}: ${r.title} ${r.v}`);
  }
});

test('the bar panels page: more rows than fit turn a page, never scroll', () => {
  const c = home('trust', { persona: 'neteng' });
  const p = vals(c).homePanel;
  if (!p.pager.many) return;
  const first = p.rows.map(r => r.key);
  p.pager.next();
  const next = vals(c).homePanel.rows.map(r => r.key);
  assert.notDeepEqual(next, first);
});

// ---- Act 3: the moves ----

test('Do next leads each line with its mark and closes it with its verb; a saving is the one green figure', () => {
  for (const view of LIVE) for (const persona of ROLES) {
    for (const d of vals(home(view, { persona })).homeDo) {
      assert.ok(d.outIcon && d.label && typeof d.go === 'function', `${view}/${persona} ${d.key}`);
      assert.equal(d.hasSave, /^Save \$/.test(d.outcome), `${view}/${persona} ${d.key}`);
      if (d.hasSave) assert.equal(d.saveT, d.outcome.replace(/^Save /, ''), `${view}/${persona} ${d.key}`);
      assert.ok(words(d.head) <= 9, `${view}/${persona}: "${d.head}"`);
    }
  }
});

test('Needs attention names each problem in a few words, its figures as chips, the sentence in the title', () => {
  for (const view of LIVE) {
    const v = vals(home(view));
    // Health's problems in Health's order; the home lists five, Health pages its own three at a time.
    v.homeAttn.forEach((a, i) => {
      assert.ok(words(a.name) <= 4, `${view}: "${a.name}"`);
      if (i < v.problemRows.length) assert.equal(a.title, v.problemRows[i].what, view);
      for (const f of a.figs) assert.ok(a.title.includes(f.t), `${view}: ${f.t} is not in "${a.title}"`);
      // One figure a line: name, figure, region, apps and workloads are its five pieces of text.
      assert.ok(a.figs.length <= 1, `${view}: ${a.figs.length} figures`);
    });
  }
  const p = vals(home('partial')).homeAttn;
  assert.equal(p[0].name, 'BGP flapping');
  assert.deepEqual(p[0].figs.map(f => f.t), ['0.31%']);
  assert.equal(p[1].name, 'Latency spike');
  assert.deepEqual(p[1].figs.map(f => f.t), ['136 ms']);
  assert.deepEqual(vals(home('trust')).homeAttn.find(a => a.name === 'Capacity').figs.map(f => f.t), ['81%']);
});

// ---- The markup ----

test('the markup: the verdict, the tiles, the panel and the moves, one prefixed grammar, motion that rests', () => {
  const b = block();
  for (const k of ['{{ homeTake.fig.n }}', '<sc-for list="{{ homeTake.chips }}"', '{{ homeTake.viz.isPath }}', '{{ homeTake.viz.isWaffle }}', '{{ homeTake.viz.isDots }}', '{{ homeTake.viz.isSpark }}', '{{ homeTake.viz.isMoves }}',
    '<sc-for list="{{ hc.bar }}"', '{{ kb.clip }}', '{{ hc.pillIcon }}', '{{ homePanel.isChart }}', '{{ homePanel.isFin }}', '{{ homePanel.isBars }}', '<sc-for list="{{ homePanel.rows }}"', '{{ homePanel.cta.go }}',
    '{{ dn.saveT }}', '{{ na.name }}', '<sc-for list="{{ na.figs }}"']) assert.ok(b.includes(k), `${k} is not in the home`);
  for (const tag of ['svg', 'table', 'select']) for (const m of b.matchAll(new RegExp(`<${tag}\\b[^]*?</${tag}>`, 'g'))) assert.ok(!m[0].includes('<sc-for'), `an sc-for inside a ${tag}`);
  // Motion names only its first frames, and it stops under reduced motion.
  const frames = [...CSS.matchAll(/@keyframes (home-[\w-]+)\{([^}]*\{[^}]*\})+\}/g)];
  assert.ok(frames.length >= 4, `${frames.length} home keyframes`);
  for (const f of frames) assert.ok(!/\bto\{|100%\{/.test(f[0]), `${f[1]} names its last frame`);
  assert.match(CSS, /@media \(prefers-reduced-motion: reduce\)\{[^}]*\.home-/);
  // No orange, no purple: the block's inks are tokens.
  const sheet = CSS.slice(CSS.indexOf('/* The home as a story'), CSS.indexOf('/* end of the home story */'));
  assert.ok(sheet.length > 2000, 'the home story block is missing');
  assert.ok(!/#[0-9a-f]{3,8}\b/i.test(sheet.replace(/#000\b/g, '')), 'a raw colour in the home block');
  assert.ok(!/font-size:(?:[0-9]|1[01])(?:\.\d+)?px/.test(sheet), 'type below 12px');
});
