import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// Discover > Estate, the beauty pass (Micah, 2026-10-13: "Make the 'estate' page extremely beautiful, extremely
// enterprise ready and amazing please"). The figures and their doors are the ones the page already had; what changes is
// how they read: every count wears its glyph, every row and card leads with its mark, green only on a money saving, the
// sentences go into titles. These tests pin the presentation keys the markup reads.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const store = {};
globalThis.localStorage = globalThis.localStorage || { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const ESTATES = ['partial', 'mature', 'trust', 'small'];
const disc = (view, patch = {}) => mkC({ view, estateParam: null, screen: 's1', scanStep: 4, estPanel: 'glance', ...patch });
const glyph = (n) => existsSync(new URL(`../brand/icons/${n}.svg`, import.meta.url));
const mark = (p) => existsSync(new URL(`../${p}`, import.meta.url));
const GREEN = /var\(--success\)|var\(--viz-3\)/;

test('the title row: each count is its glyph and its number, the words in its label', () => {
  for (const view of ESTATES) {
    const v = vals(disc(view));
    assert.equal(v.invStats.length, 6, view);
    for (const k of v.invStats) {
      assert.ok(k.icon && glyph(k.icon), `${view} ${k.l}: no glyph (${k.icon})`);
      assert.equal(k.aria, `${k.v} ${k.l}`, `${view} ${k.l}`);
      assert.ok(!GREEN.test(k.ink), `${view} ${k.l}: a count in green`);
    }
    const ex = v.invStats.find(k => k.key === 'e');
    assert.equal(ex.ink, ex.can ? 'var(--error)' : 'var(--text-light)', `${view}: exposed is the one problem`);
    assert.equal(new Set(v.invStats.map(k => k.icon)).size, 6, `${view}: two counts share a glyph`);
  }
});

test('the rings: the number carries its unit only where the card title does not already say it', () => {
  for (const view of ESTATES) {
    const v = vals(disc(view));
    const by = Object.fromEntries(v.glanceRings.map(r => [r.key, r]));
    assert.equal(by.sites.hasUnit, false, view); assert.equal(by.sites.unit, '', view);
    assert.equal(by.workloads.hasUnit, false, view);
    // The Clouds ring counts regions: its number says so.
    assert.equal(by.clouds.hasUnit, true, view); assert.match(by.clouds.unit, /^regions?$/, view);
    for (const r of v.glanceRings) assert.equal(r.hasUnit, !!r.unit, `${view} ${r.key}`);
  }
});

test('Spend: the bar is the legs its legend lists, each its share of the month', () => {
  for (const view of ESTATES) {
    const sp = vals(disc(view)).glanceSpend;
    const tot = +String(sp.totalF).replace(/[^0-9]/g, '');
    let sum = 0;
    for (const l of sp.legs) {
      assert.match(l.w, /^\d+(\.\d+)?%$/, `${view} ${l.key}`);
      assert.match(l.color, /^var\(--viz-[1-6]\)$/, `${view} ${l.key}`);
      assert.ok(!GREEN.test(l.color), `${view} ${l.key}: a cost in green`);
      const v0 = +String(l.vF).replace(/[^0-9]/g, '');
      if (tot) assert.ok(Math.abs(parseFloat(l.w) - v0 / tot * 100) < 0.6, `${view} ${l.key}: ${l.w} of ${sp.totalF} for ${l.vF}`);
      sum += parseFloat(l.w);
    }
    if (tot) assert.ok(Math.abs(sum - 100) < 1, `${view}: the legs make ${sum}%`);
    assert.equal(new Set(sp.legs.map(l => l.color)).size, 3, `${view}: two legs share an ink`);
  }
});

test('Apps: where an app runs is its clouds\' marks and their regions; Peak is green nowhere', () => {
  for (const view of ESTATES) {
    const v = vals(disc(view));
    for (const a of v.appAll) {
      const regs = a.runsTitle.split(', ');
      assert.ok(a.runs.length >= 1 && a.runs.length <= 2, `${view} ${a.name}: ${a.runs.length} clouds shown`);
      const shown = a.runs.reduce((n, g) => n + g.t.split(', ').length, 0);
      assert.equal(shown + (a.runsMore ? +a.runsMore.replace(/\D/g, '') : 0), regs.length, `${view} ${a.name}: ${shown} shown + ${a.runsMore} of ${regs.length}`);
      assert.equal(a.hasRunsMore, !!a.runsMore, `${view} ${a.name}`);
      for (const g of a.runs) {
        assert.ok(regs.some(r => r.startsWith(g.cloud + ' ')), `${view} ${a.name}: ${g.cloud} is not where it runs`);
        assert.ok(!g.t.includes(g.cloud + ' '), `${view} ${a.name}: the cloud's word repeats beside its mark`);
        assert.equal(g.hasMark, !!g.mark, `${view} ${a.name} ${g.cloud}`); assert.equal(g.noMark, !g.mark);
        if (g.mark) assert.ok(mark(g.mark), `${view} ${g.cloud}: ${g.mark} missing`);
        assert.equal(g.title, `${g.cloud} ${g.t}`);
      }
      // Peak replaced p95 (2026-10-15): a link's state is its ink, never the saving's green.
      assert.ok(!GREEN.test(a.linkFill) && !GREEN.test(a.linkRing), `${view} ${a.name}: Peak in green`);
      if (a.link && a.link.state !== 'ok') assert.equal(a.linkFill, a.linkRing, `${view} ${a.name}: a problem keeps its ink`);
    }
  }
});

test('the gaps: each leads with its glyph; a line of words with no door goes to the title; only a saving is green', () => {
  for (const view of ESTATES) {
    const v = vals(disc(view));
    for (const g of v.glanceGaps) {
      assert.ok(g.icon && glyph(g.icon), `${view} ${g.title}: no glyph`);
      assert.equal(g.hasSo, g.soParts.some(p => p.can), `${view} ${g.title}`);
      for (const p of g.soParts) assert.equal(p.ink === 'var(--success)', /to save/.test(p.t), `${view} ${g.title}: "${p.t}" ink ${p.ink}`);
      assert.ok(g.soWhat, `${view} ${g.title}: the title attribute lost its sentence`);
      // Its figures as chips: each door a glyph and its figure, the part's words its title.
      const doors = g.soParts.filter(p => p.can);
      assert.equal(g.chips.length, doors.length, `${view} ${g.title}`);
      g.chips.forEach((ch, i) => {
        assert.ok(ch.icon && glyph(ch.icon), `${view} ${g.title}: chip ${ch.title} has no glyph`);
        assert.equal(ch.title, doors[i].t); assert.ok(ch.t && doors[i].t.includes(ch.t) && /\d/.test(ch.t), `${view} "${ch.t}" of "${ch.title}"`);
        assert.equal(ch.go, doors[i].go); assert.equal(ch.ink === 'var(--success)', /to save/.test(ch.title));
      });
      assert.equal(g.hasSo, g.chips.length > 0);
    }
    assert.equal(new Set(v.glanceGaps.map(g => g.icon)).size, v.glanceGaps.length, `${view}: two gaps share a glyph`);
  }
});

test('Your clouds: each tile wears its glyph; each row leads with its mark and says private or internet as a glyph', () => {
  for (const view of ESTATES) {
    for (const trail of [[], null]) {
      const c = disc(view, { estPanel: 'clouds' });
      let v = vals(c);
      if (trail === null) { const r0 = v.cloudRows.find(r => r.canGo); if (!r0) continue; r0.go({ stopPropagation() {} }); v = vals(c); }
      for (const t of v.cloudTiles) assert.ok(t.icon && glyph(t.icon), `${view} tile ${t.l}: no glyph (${t.icon})`);
      for (const r of v.cloudRows) {
        assert.equal(r.hasMark, !!r.mark, `${view} ${r.name}`); assert.equal(r.noMark, !r.mark, `${view} ${r.name}`);
        if (r.mark) assert.ok(mark(r.mark), `${view} ${r.name}: ${r.mark}`); else assert.ok(r.icon && glyph(r.icon), `${view} ${r.name}: no mark and no glyph`);
        assert.equal(r.stateIcon, r.dot === 'var(--success)' ? 'padlock' : 'globe', `${view} ${r.name}`);
        assert.ok(r.stateTitle, `${view} ${r.name}`);
        assert.ok(!GREEN.test(r.stateInk), `${view} ${r.name}: green on a row that is not money`);
      }
    }
  }
  // The dark theme draws the dark AWS mark.
  const vd = vals(disc('partial', { estPanel: 'clouds', theme: 'dark' }));
  const aws = vd.cloudRows.find(r => r.name === 'AWS');
  if (aws) assert.equal(aws.mark, 'brand/providers/aws-dark.svg');
});

// A row's line under its name (2026-10-13): each count it carries is a glyph and its figure, the part's words its title;
// the separators go; words with no count stay words. Every door stays a door.
const chipCheck = (r, where) => {
  const parts = r.parts.filter(p => p.t.trim() && p.t.trim() !== '·');
  assert.equal(r.chips.length, parts.length, `${where} ${r.name}: ${r.chips.map(c => c.t).join('|')} for ${parts.map(p => p.t).join('|')}`);
  r.chips.forEach((ch, i) => {
    assert.equal(ch.title, parts[i].t, where); assert.equal(ch.go, parts[i].go, where); assert.equal(ch.cant, parts[i].cant, where);
    assert.equal(ch.hasIcon, !!ch.icon, where); assert.equal(ch.noIcon, !ch.icon, where);
    if (ch.icon) { assert.ok(glyph(ch.icon), `${where}: ${ch.icon}`); assert.ok(parts[i].t.includes(ch.t), `${where}: "${ch.t}" of "${parts[i].t}"`); }
    else assert.equal(ch.t, parts[i].t.trim(), where);
  });
};
test('Your clouds and Your sites: a row\'s counts are glyphs and figures', () => {
  for (const view of ESTATES) {
    const c = disc(view, { estPanel: 'clouds' });
    for (let d = 0; d < 4; d++) { const v = vals(c); v.cloudRows.forEach(r => chipCheck(r, `${view} clouds ${d}`)); const r0 = v.cloudRows.find(r => r.canGo); if (!r0) break; r0.go({ stopPropagation() {} }); }
    const v0 = vals(disc(view, { estPanel: 'clouds' }));
    for (const r of v0.cloudRows) assert.deepEqual(r.chips.map(ch => ch.icon), ['map', 'padlock', 'globe'], `${view} ${r.name}`);
    const cs = disc(view, { estPanel: 'sites' });
    for (let d = 0; d < 4; d++) { const v = vals(cs); v.placeRows.forEach(r => chipCheck(r, `${view} sites ${d}`)); const r0 = v.placeRows.find(r => r.canGo); if (!r0) break; r0.go({ stopPropagation() {} }); }
  }
});

test('Your sites: on AT&T or not is a glyph, never a green dot', () => {
  for (const view of ESTATES) {
    const v = vals(disc(view, { estPanel: 'sites' }));
    for (const r of v.placeRows) {
      if (r.dot === 'transparent') { assert.equal(r.hasState, false, `${view} ${r.name}`); continue; }
      assert.equal(r.hasState, true, `${view} ${r.name}`);
      assert.equal(r.stateIcon, r.dot === 'var(--success)' ? 'hub' : 'globe', `${view} ${r.name}`);
      assert.ok(r.stateTitle && !GREEN.test(r.stateInk), `${view} ${r.name}`);
    }
  }
});

test('Business units: with no unit picked a row says nothing; with one picked it says where the site is', () => {
  const c = disc('partial', { estPanel: 'bu' });
  let v = vals(c);
  for (const r of v.buSites) { assert.equal(r.idle, true, r.name); assert.equal(r.inUnit, false, r.name); }
  // Each unit leads with its own mark.
  for (const b of v.buList) assert.ok(b.icon && glyph(b.icon), `${b.name}: no glyph`);
  assert.equal(new Set(v.buList.map(b => b.icon)).size, v.buList.length, 'two units share a glyph');
  v.buList.find(b => b.name === 'HQ').go({ stopPropagation() {} });
  v = vals(c);
  for (const r of v.buSites) {
    assert.equal(r.idle, false, r.name);
    assert.equal(r.inUnit, r.bu === 'HQ', r.name);
    assert.equal(r.canMove, r.bu !== 'HQ', r.name);
  }
});

test('the markup: the Estate panels read the new keys and draw no green', () => {
  const a = HTML.indexOf('<sc-if value="{{ showEstateBody }}"');
  const panel = HTML.slice(a, HTML.indexOf('<sc-if value="{{ isEmpty }}"', a));
  assert.ok(!GREEN.test(panel), 'green ink written into the Estate markup');
  for (const k of ['{{ gr.unit }}', '{{ gl.w }}', '{{ rg.mark }}', '{{ ap.runsMore }}', '{{ ap.linkFill }}', '{{ gg.icon }}', '{{ gs.ink }}', '{{ gs.icon }}', '{{ ct.icon }}', '{{ cr.mark }}', '{{ cr.stateIcon }}', '{{ pr.stateIcon }}', '{{ bs.inUnit }}'])
    assert.ok(panel.includes(k), `${k} is not bound on Estate`);
  const head = HTML.slice(HTML.indexOf('<!-- ===== S1 DISCOVER ===== -->'), a);
  for (const k of ['{{ k.icon }}', '{{ k.aria }}']) assert.ok(head.includes(k), `${k} is not bound in the title row`);
  assert.ok(!/class="fx-badge new"/.test(head), 'the new pill is still the lime badge');
});
