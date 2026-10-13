import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// Cost > Optimize as a moves board (2026-10-13, Micah: "Make optimize incredibly beautiful, use motion, make it
// extremely enterprise-centric gestalt"). Four cards on one grid; the saving and the risk carried by marks: each money
// move's findings as today-to-on-AT&T bars on one scale, Resiliency's one path over the second it lacks, Capacity's
// port as rings before and after. Every figure counts up to what it prints and is a door; one filled button, on the
// move to start with; green on the saving alone.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const store = {};
globalThis.localStorage = globalThis.localStorage || { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const CSS = readFileSync(new URL('../storefront.css', import.meta.url), 'utf8');
const ESTATES = ['partial', 'mature', 'trust', 'small'];
const opt = (view, patch = {}) => mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'cost', costPanel: 'optimize', ...patch });
const MONEY = ['spend', 'routing'];
const pct = (s) => +String(s).replace('%', '');
// The count-up's last frame, as the CSS counters print it (op-cu: pre, thousands, a comma, three padded digits, suffix).
const counted = (cu) => `${cu.pre}${cu.kOn ? `${cu.k},${String(cu.r).padStart(3, '0')}` : cu.r}${cu.suf}`;
const section = HTML.slice(HTML.indexOf('id="sec-optimize"'), HTML.indexOf('<!-- AT&T charges, a Cost tab'));

test('each money move draws its findings today and on AT&T, on one scale, and each bar keeps its saving', () => {
  for (const view of ESTATES) {
    const c = opt(view);
    const rows = vals(c).optRows.filter(r => MONEY.includes(r.key) && !r.empty);
    assert.ok(rows.length, `${view}: no money move`);
    const scales = new Set();
    for (const r of rows) {
      c.state.optShow = r.key;
      const open = vals(c).optRows.find(x => x.key === r.key);
      assert.equal(open.isMoney, true);
      for (const b of open.lineRows) {
        scales.add(b.scale);
        assert.equal(b.today - b.after, b.partN, `${view} ${r.key} ${b.name}: ${b.today} - ${b.after} is not its saving ${b.partN}`);
        // Both ends are By bucket's own figures: the finding's buckets today, and their on-AT&T price.
        const bks = vals(c).buckets.filter(x => x.finding === open.parts[open.lineRows.indexOf(b)].finding);
        assert.equal(b.today, bks.reduce((a, x) => a + x.today, 0), `${view} ${b.name}: today`);
        assert.equal(b.after, bks.reduce((a, x) => a + x.fabric, 0), `${view} ${b.name}: on AT&T`);
        // The blue (on AT&T) and the stripes (saved) together are the bar's today, on the page's one scale.
        assert.ok(Math.abs(pct(b.wAfter) + pct(b.wSave) - b.today / b.scale * 100) < 0.2, `${view} ${b.name}: ${b.wAfter} + ${b.wSave}`);
        assert.ok(pct(b.wAfter) + pct(b.wSave) <= 100.01, `${view} ${b.name}: past its track`);
        assert.ok(b.name && !/^\$/.test(b.name), `${view}: a bar is named by its sentence, "${b.name}"`);
        assert.match(b.v, /^\$[\d,]+\/mo$/, `${view} ${b.name}: ${b.v}`);
        assert.match(b.todayV, /^\$[\d,]+$/);
      }
      c.state.optShow = null;
    }
    assert.equal(scales.size, 1, `${view}: Spend and Routing draw on ${scales.size} scales`);
  }
});

test('every figure counts up to exactly what it prints', () => {
  let n = 0;
  for (const view of ESTATES) for (const r of vals(opt(view)).optRows.filter(x => !x.empty)) {
    assert.equal(counted(r.cu), r.figV, `${view} ${r.key}: counts to ${counted(r.cu)}, prints ${r.figV}`);
    assert.ok(r.figureF.includes(r.figV.replace(/ Gbps$/, '')), `${view} ${r.key}: ${r.figV} is not in "${r.figureF}"`);
    assert.ok(r.figU, `${view} ${r.key}: the figure has no unit`);
    n++;
  }
  assert.ok(n >= 13, `${n} figures`);
});

test('few words: why is under eight words on the card, the sentence in its title', () => {
  for (const view of ESTATES) for (const r of vals(opt(view)).optRows.filter(x => !x.empty)) {
    assert.ok(r.why.split(/\s+/).length <= 7, `${view} ${r.key}: "${r.why}"`);
    if (r.key === 'resiliency' || (r.key === 'capacity' && r.resize)) assert.match(r.why, new RegExp(`^${r.lines.length} `), `${view} ${r.key}: the why counts what the head counts`);
  }
  assert.ok(section.includes('<p class="op-why" title="{{ o.head }}">{{ o.why }}</p>'));
});

test('green is the saving alone: the money figures and their bars, nothing else', () => {
  for (const view of ESTATES) for (const r of vals(opt(view)).optRows.filter(x => !x.empty)) {
    const money = MONEY.includes(r.key);
    assert.equal(r.figInk === 'var(--success)', money, `${view} ${r.key}: figure ink ${r.figInk}`);
    for (const l of r.lineRows) assert.equal(l.vInk === 'var(--success)', money, `${view} ${r.key} ${l.name}: ${l.vInk}`);
  }
  assert.ok(!/fx-badge new/.test(section), 'Start here wore the lime "new" badge');
});

test('one filled button, on the move to start with; the rest outlined', () => {
  for (const view of ESTATES) {
    const rows = vals(opt(view)).optRows;
    assert.equal(rows.filter(r => r.hasStart).length, 1, `${view}: ${rows.filter(r => r.hasStart).length} Start here`);
  }
  assert.equal((section.match(/data-primary="/g) || []).length, 1, 'one primary binding on the board');
  assert.match(section, /class="op-go" data-primary="\{\{ o\.hasStart \}\}" onClick="\{\{ o\.go \}\}"/);
});

test('Resiliency draws its one path over the second it lacks; Capacity its port before and after', () => {
  for (const view of ['partial', 'mature', 'trust']) {
    const rows = vals(opt(view)).optRows;
    const res = rows.find(r => r.key === 'resiliency'), cap = rows.find(r => r.key === 'capacity');
    assert.equal(res.isResil, true);
    assert.equal(res.lane.length, 4, `${view}: the path is four stations`);
    assert.deepEqual(res.lane.map(n => n.short), ['Sites', 'Edge', 'Core', res.target.cloud]);
    assert.ok(res.lane[3].mark, `${view}: the cloud station wears its provider's mark`);
    // The one path as Govern's strip draws it (a cloud's own port is not AT&T's to see), never a station it lacks.
    assert.ok(res.lane.every(n => n.state !== 'none'), `${view}: the one path has a gap`);
    assert.equal(res.lane[0].state, 'set'); assert.equal(res.lane[3].state, 'set');
    assert.match(res.laneTitle, new RegExp(res.target.region));
    // A lone part is the headline already: its own figure and bar show only beside a second part.
    for (const l of res.lineRows) { assert.ok(l.mark, `${view} ${l.name}: no provider mark`); assert.equal(l.hasBar, res.lines.length > 1); assert.equal(l.showV, res.lines.length > 1); assert.ok(pct(l.w) > 0 && pct(l.w) <= 100); }
    for (const l of cap.lineRows) { assert.ok(l.mark, `${view} ${l.name}: no provider mark`); assert.equal(l.hasBar, false, `${view}: a port's rings draw its use; its row has no bar`); }
    assert.equal(cap.isCap, true);
    const t = cap.target;
    assert.equal(cap.rings[0].p, t.peakPct, `${view}: today's ring`);
    if (cap.resize) {
      assert.equal(cap.rings.length, 2);
      assert.equal(cap.rings[1].p, t.resizePct, `${view}: the resized ring`);
      assert.equal(cap.rings[0].sub, `${t.ports} × ${t.portG}G`); assert.equal(cap.rings[1].sub, `${t.resizeTo} × ${t.portG}G`);
    } else {
      assert.equal(cap.rings.length, 1, `${view}: near full draws one ring`);
      assert.equal(cap.why, `Full ${t.fullIn} at this growth`, `${view}: near full, the why says when it fills`);
      assert.equal(cap.rings[0].ink, 'var(--warning)', `${view}: over 80% wears the bandwidth page's ink`);
    }
  }
});

test('every part figure is a door to where it acts', () => {
  const c = opt('partial');
  for (const r of vals(c).optRows.filter(x => !x.empty)) {
    for (const [i, l] of vals(c).optRows.find(x => x.key === r.key).lineRows.entries()) {
      const d = opt('partial');
      vals(d).optRows.find(x => x.key === r.key).lineRows[i].partGo();
      if (MONEY.includes(r.key)) assert.equal(d.state.fdKey, r.parts[i].finding, `${r.key} ${l.name}`);
      if (r.key === 'resiliency') { assert.equal(d.state.screen, 's1'); assert.ok(d.state.cloudTrailE.includes('region:' + r.parts[i].region)); }
      if (r.key === 'capacity') { assert.equal(d.state.mapSel, r.parts[i].conn); assert.equal(d.state.obPanel, 'conn'); }
    }
  }
  // Today's figure opens By bucket, where each bucket's today and on-AT&T price sit.
  const d = opt('partial');
  vals(d).optRows[0].lineRows[0].todayGo();
  assert.equal(d.state.costPanel, 'bucket');
  // A ring opens its connection.
  const e = opt('partial');
  vals(e).optRows.find(r => r.key === 'capacity').rings[0].go();
  assert.equal(e.state.mapSel, 'cx-us-east-1');
});

test('the board: one grid of four cards, each visual bound, the figure a button that counts', () => {
  assert.match(section, /class="op-grid"/);
  assert.match(section, /<sc-for list="\{\{ optRows \}\}" as="o"/);
  assert.match(section, /class="fx-card op-card"/);
  for (const k of ['o.isMoney', 'o.isResil', 'o.isCap', 'o.rings', 'o.lane', 'o.lineRows', 'b.wAfter', 'b.wSave', 'o.cu.k', 'o.cu.r']) assert.ok(section.includes(k), k);
  assert.ok(section.includes('onClick="{{ o.figGo }}"'), 'the figure is a door');
  assert.ok(!/overflow:auto|overflow-y:auto/.test(section), 'nothing on the board scrolls in a box');
});

test('the motion collapses to the last frame: every op- keyframe starts from its start, never sets an end', () => {
  const frames = [...CSS.matchAll(/@keyframes (op-[\w-]+)\{(.*?\})\}/g)];
  assert.ok(frames.length >= 4, `${frames.length} op- keyframes`);
  for (const [, name, body] of frames) assert.ok(!/(^|\})\s*to\{|100%\{/.test(body), `${name} sets an end frame, so animation:none would not be its last frame`);
  for (const p of ['--op-p', '--op-k', '--op-r']) assert.match(CSS, new RegExp(`@property ${p}\\{`), p);
  assert.match(CSS, /@media \(prefers-reduced-motion: ?reduce\)\{[^@]*\.op-/, 'reduced motion stills the board');
});
