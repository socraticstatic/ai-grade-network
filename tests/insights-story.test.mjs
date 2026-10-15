import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import * as SG from '../naas-signals.js';
import { mkC } from './harness.mjs';

// Insights as five stories (Micah, 2026-10-13, after Estate, Optimize and Govern: "Do this for more pages! Great space,
// great layout, calls to action on all widgets"; "Each page should be its own gorgeous, extremely beautiful story, with
// calls to action on each"; "tell the story with less words, and more visualizations, animations and icons"). Each tab
// reads verdict, evidence, moves: one headline figure as glyph and number, the cards or pictures that show why, and a
// verb on every widget. Every figure comes from the model the page already had; these tests hold the new keys to it.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const store = {};
globalThis.localStorage = globalThis.localStorage || { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const ins = (view, patch = {}) => mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'insights', ...patch });
const PERSONAS = ['architect', 'neteng', 'security', 'finops', 'exec'];
const VIEWS = ['partial', 'mature', 'trust', 'small'];
const snap = (st) => JSON.stringify(st);

test('heroOf reads a card head into its headline figure, the words under it, and the rest', () => {
  const h = (head) => { const x = SG.heroOf(head); return { v: x.v, unit: x.unit, rest: x.rest, calm: x.calm, save: x.save }; };
  assert.deepEqual(h('3 problems · 2 apps affected'), { v: '3', unit: 'problems', rest: ['2 apps affected'], calm: false, save: false });
  assert.deepEqual(h('3 of 23 paths near full · 1 down'), { v: '3 of 23', unit: 'paths near full', rest: ['1 down'], calm: false, save: false });
  assert.deepEqual(h('None of 2 above 80% at peak · 1 could shrink'), { v: 'None of 2', unit: 'above 80% at peak', rest: ['1 could shrink'], calm: false, save: false });
  // A head that names its place first leads with the figure, and the place rides as a chip.
  assert.deepEqual(h('AWS us-east-1 · 31% of traffic'), { v: '31%', unit: 'of traffic', rest: ['AWS us-east-1'], calm: false, save: false });
  assert.deepEqual(h('Public egress +$6,800/mo in 11 weeks · +10%'), { v: '+$6,800/mo', unit: 'in 11 weeks', rest: ['+10%'], calm: false, save: false });
  assert.deepEqual(h('6 new, by volume · sample'), { v: '6', unit: 'new, by volume', rest: ['sample'], calm: false, save: false });
  assert.deepEqual(h('4 with no policy · 7.1 GB/day · sample'), { v: '4', unit: 'with no policy', rest: ['7.1 GB/day', 'sample'], calm: false, save: false });
  // A saving reads as one: the figure, to save, and the whole it comes out of as a chip.
  assert.deepEqual(h('Save $41,500/mo of $89,600/mo egress'), { v: '$41,500/mo', unit: 'to save', rest: ['$89,600/mo egress'], calm: false, save: true });
  assert.deepEqual(h('$71,600/mo billed public · 27.5 Gbps outside AT&T'), { v: '$71,600/mo', unit: 'billed public', rest: ['27.5 Gbps outside AT&T'], calm: false, save: false });
  assert.deepEqual(h('27.5 Gbps public · 60% of traffic'), { v: '27.5 Gbps', unit: 'public', rest: ['60% of traffic'], calm: false, save: false });
  assert.deepEqual(h('2 of 7 regions on AT&T · 40% of traffic'), { v: '2 of 7', unit: 'regions on AT&T', rest: ['40% of traffic'], calm: false, save: false });
  assert.deepEqual(h('None of 20 links near full'), { v: 'None of 20', unit: 'links near full', rest: [], calm: false, save: false });
  // No figure at all is a calm card: its words, no number.
  assert.deepEqual(h('No problems open'), { v: '', unit: 'No problems open', rest: [], calm: true, save: false });
  assert.deepEqual(h('Every domain has a policy · sample'), { v: '', unit: 'Every domain has a policy', rest: ['sample'], calm: true, save: false });
});

test('heroOf counts up only what it can count: a whole number with its prefix and suffix', () => {
  assert.deepEqual(SG.heroOf('Save $41,500/mo of $89,600/mo egress').cu, { on: true, k: 41, r: 500, kOn: true, preCss: "'$'", sufCss: "'/mo'" });
  assert.deepEqual(SG.heroOf('3 problems · 2 apps affected').cu, { on: true, k: 0, r: 3, kOn: false, preCss: "''", sufCss: "''" });
  assert.deepEqual(SG.heroOf('AWS us-east-1 · 31% of traffic').cu, { on: true, k: 0, r: 31, kOn: false, preCss: "''", sufCss: "'%'" });
  assert.deepEqual(SG.heroOf('Public egress +$6,800/mo in 11 weeks · +10%').cu, { on: true, k: 6, r: 800, kOn: true, preCss: "'+$'", sufCss: "'/mo'" });
  // A decimal, a ratio and None hold still.
  for (const head of ['27.5 Gbps public', '3 of 23 paths near full', 'None of 2 above 80% at peak', 'No problems open']) assert.equal(SG.heroOf(head).cu.on, false, head);
});

test('Signals: every card leads with a figure off its own head and carries one verb', () => {
  for (const view of VIEWS) for (const p of PERSONAS) {
    const v = vals(ins(view, { persona: p }));
    for (const x of v.sigAll) {
      assert.ok(x.hero, `${view} ${p} ${x.key}: no hero`);
      if (!x.hero.calm) assert.ok(x.head.includes(x.hero.v), `${view} ${p} ${x.key}: "${x.hero.v}" is not in "${x.head}"`);
      assert.ok(x.cta && x.cta.label && typeof x.cta.go === 'function', `${view} ${p} ${x.key}: no action`);
      assert.ok(x.cta.aria && x.cta.aria.startsWith(x.cta.label), `${view} ${p} ${x.key}: "${x.cta.aria}" does not say its verb first`);
    }
  }
});

test('Signals: each card\'s verb lands somewhere, on every estate and persona', () => {
  for (const view of VIEWS) for (const p of PERSONAS) {
    const keys = vals(ins(view, { persona: p })).sigAll.map(x => x.key);
    for (const k of keys) {
      const c = ins(view, { persona: p });
      const before = snap(c.state);
      vals(c).sigAll.find(x => x.key === k).cta.go();
      assert.notEqual(snap(c.state), before, `${view} ${p} ${k}: the card's verb went nowhere`);
    }
  }
});

test('Signals: the lead card\'s verb is the one filled button, on page one only', () => {
  for (const p of PERSONAS) {
    const c = ins('partial', { persona: p });
    const v = vals(c);
    assert.deepEqual(v.sigCards.map(x => !!x.primary), [true, false, false, false, false, false], p);
    v.sigPager.next();
    assert.ok(vals(c).sigCards.every(x => !x.primary), `${p}: page two fills a button`);
  }
});

test('Signals: a full page shows three rows a card; a page of one row gives its cards the height of two', () => {
  for (const view of ['partial', 'trust']) {
    const c = ins(view, { persona: 'neteng' });
    const v = vals(c);
    assert.equal(v.sigTall, false);
    for (const x of v.sigCards) if (!x.isCols) assert.equal(x.rows.length, Math.min(3, x.all.length), `${view} ${x.key} page one`);
    v.sigPager.next();
    const w = vals(c);
    // Eight cards since Latency over SLO left (2026-10-15): six on page one, two on page two.
    assert.equal(w.sigCards.length, 2);
    assert.equal(w.sigTall, true);
    for (const x of w.sigCards) if (!x.isCols) assert.equal(x.rows.length, Math.min(8, x.all.length), `${view} ${x.key} page two`);
  }
});

test('Signals: the index is the eight cards in order, each a door, the ones with findings marked', () => {
  for (const view of VIEWS) for (const p of PERSONAS) {
    const c = ins(view, { persona: p });
    const v = vals(c);
    assert.deepEqual(v.sigIndex.map(x => x.key), v.sigAll.map(x => x.key), `${view} ${p}`);
    for (const x of v.sigIndex) {
      const card = v.sigAll.find(y => y.key === x.key);
      assert.equal(x.hot, card.finds.n > 0, `${view} ${p} ${x.key}`);
      assert.ok(x.icon && x.title.startsWith(card.title), `${view} ${p} ${x.key}: ${x.title}`);
      assert.equal(x.on, v.sigCards.some(y => y.key === x.key), `${view} ${p} ${x.key}: on the page shown`);
    }
    assert.equal(v.sigHotN, v.sigIndex.filter(x => x.hot).length);
  }
  // A tile opens what its card's title opens.
  const c = ins('partial', { persona: 'neteng' });
  vals(c).sigIndex.find(x => x.key === 'talkers').go();
  assert.equal(c.state.sigOpen, 'talkers');
});

test('Signals for FinOps: the spend-to-optimized picture carries Spend by bucket\'s verb', () => {
  for (const view of ['partial', 'mature', 'trust']) {
    const c = ins(view, { persona: 'finops' });
    const v = vals(c);
    assert.equal(v.sigFin, true);
    assert.equal(v.sigFinCta.label, v.sigAll.find(x => x.key === 'spend').cta.label, view);
    v.sigFinCta.go();
    assert.equal(c.state.tab, 'cost', view);
  }
  const a = HTML.indexOf('<sc-if value="{{ insPanelSignals }}"'), p = HTML.slice(a, HTML.indexOf('<!-- Operations (notes', a));
  assert.match(p, /<button[^>]*onClick="\{\{ sigFinCta\.go \}\}"/);
});

test('Signals markup: the index, the hero that counts up, and the verb on a button', () => {
  const a = HTML.indexOf('<sc-if value="{{ insPanelSignals }}"'), p = HTML.slice(a, HTML.indexOf('<!-- Operations (notes', a));
  assert.match(p, /aria-label="Signal index"/);
  assert.match(p, /<sc-for list="\{\{ sigIndex \}\}" as="si"/);
  assert.match(p, /<button[^>]*onClick="\{\{ si\.go \}\}"/);
  assert.match(p, /class="op-cu[^"]*"[^>]*--op-r:\{\{ sg\.hero\.cu\.r \}\}/);
  assert.match(p, /<button[^>]*onClick="\{\{ sg\.cta\.go \}\}"[^>]*data-primary="\{\{ sg\.primary \}\}"|<button[^>]*data-primary="\{\{ sg\.primary \}\}"[^>]*onClick="\{\{ sg\.cta\.go \}\}"/);
});

const usd = (t) => +(String(t).match(/\$([\d,]+)/) || [0, '0'])[1].replace(/,/g, '');
const fmtUsd = (n) => '$' + Math.round(n).toLocaleString('en-US');

test('Your actions: the verdict counts the role\'s moves, the ones waiting and under way, and what the priced ones save', () => {
  for (const view of VIEWS) for (const p of PERSONAS) {
    const v = vals(ins(view, { persona: p, insPanel: 'role' }));
    const all = v.roleActAll, rv = v.roleVerdict;
    assert.equal(rv.n, all.length, `${view} ${p}`);
    assert.equal(rv.waitingN, all.filter(a => a.waiting).length, `${view} ${p}`);
    assert.equal(rv.underWayN, all.filter(a => a.underWay).length, `${view} ${p}`);
    const save = all.filter(a => a.hasSave).reduce((t, a) => t + usd(a.saveLine), 0);
    assert.equal(rv.hasSave, save > 0, `${view} ${p}`);
    if (save) assert.equal(rv.saveF, `${fmtUsd(save)}/mo`, `${view} ${p}`);
    for (const k of ['nTitle', 'waitingTitle', 'underWayTitle']) assert.ok(rv[k] && /\d|No|None/.test(rv[k]), `${view} ${p} ${k}`);
  }
});

test('Your actions: three moves a page, each leading with what it gets you, where it sits on the path, and one filled verb', () => {
  const c = ins('partial', { persona: 'neteng', insPanel: 'role' });
  const v = vals(c);
  assert.equal(v.rolePageSize, 3);
  assert.ok(v.roleActRows.length <= 3);
  for (const view of VIEWS) for (const p of PERSONAS) {
    const w = vals(ins(view, { persona: p, insPanel: 'role' }));
    w.roleActRows.forEach((a, i) => {
      assert.ok(a.outIcon, `${view} ${p} ${a.key}: no outcome glyph`);
      assert.equal(a.hasSaveFig, !!a.hasSave, `${view} ${p} ${a.key}`);
      if (a.hasSaveFig) assert.ok(a.saveLine.includes(a.saveFig), `${view} ${p} ${a.key}: ${a.saveFig} against ${a.saveLine}`);
      else assert.equal(a.outWords, a.outcome);
      assert.deepEqual(a.strip.map(n => n.short), ['Sites', 'Edge', 'Core', 'Cloud'], `${view} ${p} ${a.key}`);
      assert.ok(a.recName && !/^Recommended/.test(a.recName) && a.rec.endsWith(a.recName), `${view} ${p} ${a.key}: ${a.recName}`);
      assert.equal(!!a.primary, i === 0, `${view} ${p} ${a.key}: the first move on page one is the filled one`);
    });
  }
  const many = ins('partial', { persona: 'neteng', insPanel: 'role' });
  vals(many).rolePager.next();
  assert.ok(vals(many).roleActRows.every(a => !a.primary), 'page two fills a button');
});

test('Your actions: each picture is a door, every bar in it is too, and it carries its Signals card\'s verb', () => {
  for (const view of ['partial', 'mature', 'trust']) for (const p of PERSONAS) {
    const v = vals(ins(view, { persona: p, insPanel: 'role' }));
    for (const [i, rv] of v.roleVisuals.entries()) {
      assert.ok(rv.icon, `${view} ${p} ${rv.key}`);
      for (const [label, fire] of [['door', (x) => x.roleVisuals[i].go()], ['verb', (x) => x.roleVisuals[i].cta.go()], ...rv.rows.map((r, j) => [`bar ${j}`, (x) => x.roleVisuals[i].rows[j].go()])]) {
        const c = ins(view, { persona: p, insPanel: 'role' });
        const before = snap(c.state);
        fire(vals(c));
        assert.notEqual(snap(c.state), before, `${view} ${p} ${rv.key}: its ${label} went nowhere`);
      }
      assert.ok(rv.cta.label && rv.cta.aria.startsWith(rv.cta.label), `${view} ${p} ${rv.key}`);
    }
  }
});

test('Your actions markup: the verdict chips, the pictures as doors, the moves with their strip and verbs', () => {
  const a = HTML.indexOf('aria-label="Your actions"'), p = HTML.slice(a, HTML.indexOf('<!-- Monthly briefing', a));
  assert.match(p, /\{\{ roleVerdict\.n \}\}/);
  assert.match(p, /<button[^>]*onClick="\{\{ rv\.go \}\}"/);
  assert.match(p, /<button[^>]*onClick="\{\{ rb\.go \}\}"/);
  assert.match(p, /<button[^>]*onClick="\{\{ rv\.cta\.go \}\}"/);
  assert.match(p, /<sc-for list="\{\{ ra\.strip \}\}" as="rs"[^>]*>[\s\S]*?\{\{ rs\.short \}\}/);
  assert.match(p, /data-primary="\{\{ ra\.primary \}\}"/);
  assert.match(p, /<button[^>]*onClick="\{\{ roleMore\.go \}\}"/);
});

test('Operations: four cards tell it, each its figure off the facts, its picture, a door to its view and a verb that lands', () => {
  for (const view of VIEWS) {
    const v = vals(ins(view, { insPanel: 'ops' }));
    const f = v.opsFacts;
    assert.equal(v.opsNow.n, f.openN, view);
    assert.equal(v.opsNow.sev1, f.sev1, view);
    assert.equal(v.opsNow.hasSev1, f.sev1 > 0, view);
    assert.equal(v.opsNow.dots.length, v.ticketAll.length, view);
    for (const d of v.opsNow.dots) assert.match(d.ink, /^var\(--(error|warning)\)$/, `${view} ${d.title}`);
    assert.equal(v.opsFix.n, f.fixedN, view);
    if (f.fixedN) assert.equal(v.opsFix.v, f.mttrF, view);
    assert.equal(v.opsFix.cols.length, v.fixAll.length, view);
    for (const col of v.opsFix.cols) assert.ok(parseFloat(col.h) > 0 && parseFloat(col.h) <= 100, `${view} ${col.title} ${col.h}`);
    assert.equal(v.opsAvail.n, v.availAll.length, view);
    assert.equal(v.opsAvail.met, v.availAll.filter(r => r.met).length, view);
    assert.equal(v.opsChg.n, v.opsChangePager.many ? +v.opsChangePager.label.match(/of (\d+)$/)[1] : v.opsChangeRows.length, view);
    assert.equal(v.opsChg.hasNext, v.comingUp.length > 0, view);
    for (const k of ['opsNow', 'opsFix', 'opsAvail', 'opsChg']) {
      for (const [what, fire] of [['door', (x) => x[k].go()], ['verb', (x) => x[k].cta.go()]]) {
        const c = ins(view, { insPanel: 'ops' });
        const before = snap(c.state);
        fire(vals(c));
        assert.notEqual(snap(c.state), before, `${view} ${k}: its ${what} went nowhere`);
      }
      assert.ok(v[k].cta.label && v[k].cta.aria.startsWith(v[k].cta.label), `${view} ${k}`);
    }
  }
});

test('Operations: every list line leads with its mark; the holder is a glyph; fixes and uptime draw their bars', () => {
  for (const view of VIEWS) {
    const v = vals(ins(view, { insPanel: 'ops' }));
    for (const r of [...v.ticketAll, ...v.fixAll, ...v.availRows]) assert.ok(['hub', 'cloud', 'internet', 'person-group'].includes(r.ownerIcon), `${view} ${r.where}: ${r.ownerIcon}`);
    for (const r of [...v.ticketAll, ...v.fixAll]) assert.equal(String(r.sevN), r.sevF.replace(/^Sev /, ''), `${view} ${r.key}`);
    for (const r of v.fixAll) assert.ok(parseFloat(r.tookW) > 0 && parseFloat(r.tookW) <= 100, `${view} ${r.key}`);
    for (const r of v.availRows) { assert.ok(parseFloat(r.upW) >= 0 && parseFloat(r.upW) <= 100, `${view} ${r.key}`); assert.ok(parseFloat(r.tickW) > 0 && parseFloat(r.tickW) <= 100, `${view} ${r.key}`); assert.equal(r.met, r.metF === 'Met'); }
  }
});

test('Operations markup: the four cards and their verbs, the lines with their marks', () => {
  const a = HTML.indexOf('aria-label="Operations"'), p = HTML.slice(a, HTML.indexOf('<sc-if value="{{ insPanelFindings }}"', a));
  for (const k of ['opsNow', 'opsFix', 'opsAvail', 'opsChg']) {
    assert.match(p, new RegExp(`<button[^>]*onClick="\\{\\{ ${k}\\.go \\}\\}"`), `${k} door`);
    assert.match(p, new RegExp(`<button[^>]*onClick="\\{\\{ ${k}\\.cta\\.go \\}\\}"`), `${k} verb`);
  }
  assert.match(p, /class="op-ring[^"]*"[^>]*--op-p:\{\{ opsAvail\.p \}\}/);
  assert.match(p, /role="note"[^>]*title="\{\{ opsLine \}\}"|title="\{\{ opsLine \}\}"[^>]*role="note"/);
});

test('Findings: the three pictures each have a figure that opens what it counts and a verb that lands', () => {
  for (const view of ['partial', 'mature', 'trust', 'small']) {
    const v = vals(ins(view, { insPanel: 'findings' }));
    assert.deepEqual(v.insBand.map(b => b.key), ['savings', 'life', 'age'], view);
    for (const [i, b] of v.insBand.entries()) {
      assert.ok(b.icon && b.cta && b.cta.label && b.cta.aria.startsWith(b.cta.label), `${view} ${b.key}`);
      for (const [what, fire] of [['figure', (x) => x.insBand[i].go()], ['verb', (x) => x.insBand[i].cta.go()]]) {
        const c = ins(view, { insPanel: 'findings', findFilter: 'closed' });
        const before = snap(c.state);
        fire(vals(c));
        assert.notEqual(snap(c.state), before, `${view} ${b.key}: its ${what} went nowhere`);
      }
    }
    // A saving is the one green, in steps of the same ink; the life bar never paints green.
    for (const sg of v.insBand[0].segs) assert.match(sg.color, /var\(--success\)/, `${view} ${sg.title}`);
    for (const sg of v.insBand[1].segs) assert.doesNotMatch(sg.color, /success|viz-3/, `${view} ${sg.title}`);
    assert.equal(v.insBand[0].save, true);
    // Every life segment does something from the page as it lands: its set, or (one finding, or the set already shown) its longest-waiting finding.
    for (const sg of v.insBand[1].segs) {
      const c = ins(view, { insPanel: 'findings' });
      const before = snap(c.state);
      vals(c).insBand[1].segs.find(x => x.key === sg.key).go();
      assert.notEqual(snap(c.state), before, `${view} ${sg.title}: the segment went nowhere`);
    }
    // Each age column opens the oldest finding it counts.
    for (const col of v.insBand[2].cols) {
      if (!col.n) continue;
      const c = ins(view, { insPanel: 'findings' });
      vals(c).insBand[2].cols.find(x => x.key === col.key).go();
      assert.ok(c.state.fdKey, `${view} ${col.label}: no finding opened`);
    }
  }
});

test('Findings: each line leads with its kind\'s glyph, holds five words at most, and only the first fills its verb', () => {
  for (const view of ['partial', 'mature', 'trust']) {
    const c = ins(view, { insPanel: 'findings' });
    const v = vals(c);
    v.insightRows.forEach((r, i) => {
      assert.ok(r.kindIcon, `${view} ${r.key}`);
      assert.ok(r.ownerTitle && r.ownerTitle.includes(r.owner), `${view} ${r.key}`);
      assert.ok(r.evTitle && r.evTitle.startsWith(r.evLine), `${view} ${r.key}`);
      assert.equal(!!r.primary, i === 0, `${view} ${r.key}`);
      if (!r.hasSave) assert.ok(r.impIcon, `${view} ${r.key}: an unpriced finding draws its impact as a glyph`);
    });
    vals(c).findPager.next();
    assert.ok(vals(c).insightRows.every(r => !r.primary), `${view}: page two fills a button`);
  }
});

test('Findings markup: the pictures as cards with doors and verbs, the lines under one set of station words', () => {
  const a = HTML.indexOf('<div id="sec-insights"'), p = HTML.slice(a, HTML.indexOf('<!-- Observe · Logs', a));
  assert.match(p, /<button[^>]*onClick="\{\{ bd\.go \}\}"/);
  assert.match(p, /<button[^>]*onClick="\{\{ bd\.cta\.go \}\}"/);
  assert.match(p, /<button[^>]*onClick="\{\{ ac\.go \}\}"/);
  assert.match(p, /class="ps-heads/);
  assert.match(p, /<sc-for list="\{\{ ins\.strip \}\}" as="fs"/);
  assert.match(p, /data-primary="\{\{ ins\.primary \}\}"/);
});

test('Monthly briefing: the month as tiles, each a figure the briefing says and a door to where it is counted', () => {
  for (const view of VIEWS) for (const p of PERSONAS) {
    const v = vals(ins(view, { persona: p, insPanel: 'brief' }));
    assert.deepEqual(v.briefTiles.map(t => t.key), ['open', 'table', 'banked', 'sev1', 'tickets', 'fix', 'avail', 'maint'], `${view} ${p}`);
    const say = (k) => v.briefTiles.find(t => t.key === k);
    assert.ok(v.briefText.includes(`${say('open').v} finding`), `${view} ${p}: open ${say('open').v}`);
    if (say('table').on) assert.ok(v.briefText.includes(say('table').v), `${view} ${p}: ${say('table').v}`);
    if (say('banked').on) assert.ok(v.briefText.includes(`banked ${say('banked').v}`), `${view} ${p}: banked ${say('banked').v}`);
    if (+say('sev1').v) assert.ok(v.briefText.includes(`${say('sev1').v} Sev 1`), `${view} ${p}: sev1`);
    assert.ok(new RegExp(`\\b${say('tickets').v} tickets? open`).test(v.briefText), `${view} ${p}: tickets ${say('tickets').v}`);
    if (say('fix').on) assert.ok(v.briefText.includes(say('fix').v), `${view} ${p}: fix ${say('fix').v}`);
    if (say('avail').on) assert.ok(v.briefText.includes(`${say('avail').v} connections`), `${view} ${p}: avail ${say('avail').v}`);
    if (say('maint').on) assert.ok(v.briefText.includes(say('maint').v), `${view} ${p}: maint ${say('maint').v}`);
    for (const t of v.briefTiles) {
      assert.ok(t.icon && t.title, `${view} ${p} ${t.key}`);
      const c = ins(view, { persona: p, insPanel: 'brief' });
      const before = snap(c.state);
      vals(c).briefTiles.find(x => x.key === t.key).go();
      assert.notEqual(snap(c.state), before, `${view} ${p} ${t.key}: the tile went nowhere`);
    }
    assert.ok(v.briefWaits.length <= 3 && v.briefWaits.length === Math.min(3, v.roleActAll.filter(a => a.waiting).length), `${view} ${p}`);
    for (const w of v.briefWaits) assert.ok(w.icon && w.head && w.title, `${view} ${p} ${w.key}`);
    for (const w of v.briefWho) assert.ok(w.icon, `${view} ${p} ${w.key}`);
  }
  const c = ins('partial', { insPanel: 'brief' });
  vals(c).briefCta.go();
  assert.equal(c.state.andiOpen, true, 'Read with Andi opens Andi, who carries the briefing');
  const w = ins('partial', { persona: 'neteng', insPanel: 'brief' });
  const first = vals(w).briefWaits[0];
  if (first) { first.go(); assert.equal(w.state.insPanel, 'role'); }
});

test('Monthly briefing markup: the tiles as doors, the waits, the recipients with their glyphs, the verb', () => {
  const a = HTML.indexOf('aria-label="Monthly briefing"'), p = HTML.slice(a, HTML.indexOf('<!-- Signals', a));
  assert.match(p, /<sc-for list="\{\{ briefTiles \}\}" as="bt"/);
  assert.match(p, /<button[^>]*onClick="\{\{ bt\.go \}\}"/);
  assert.match(p, /<button[^>]*onClick="\{\{ bw2\.go \}\}"|<button[^>]*onClick="\{\{ wt\.go \}\}"/);
  assert.match(p, /<button[^>]*onClick="\{\{ briefCta\.go \}\}"/);
  assert.match(p, /title="\{\{ briefText \}\}"/);
});

test('Your actions: a page with room left ends in one card for everything else open, a door to Findings', () => {
  for (const view of VIEWS) for (const p of PERSONAS) {
    const c = ins(view, { persona: p, insPanel: 'role' });
    const v = vals(c);
    assert.equal(v.roleMore.show, v.roleActRows.length < 3, `${view} ${p}`);
    assert.equal(v.roleMore.n, v.openFindingsN, `${view} ${p}: ${v.roleMore.n} against ${v.openFindingsN}`);
    v.roleMore.go();
    assert.equal(c.state.insPanel, 'findings');
    assert.equal(c.state.findFilter, 'open');
  }
});
