import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as D from '../naas-data.js';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// The skeptic's third read (2026-09-30), the smaller ones: the empty estate said
// No egress seen yet two and three times; the leg tiles rounded each on its own and
// summed to 99% or 101%; Optimize's line named Routing where Routing prices nothing;
// By region's bars summed $2 over the head; Recommended said the IPsec sites reach
// Azure over IPsec while By cloud bills every tunnel in AWS.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const cost = (view, patch = {}) => mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'cost', ...patch });
const money = (s) => +String(s).replace(/[^0-9.]/g, '');
const PANELS = ['optimize', 'spend', 'legs', 'money', 'dest', 'mile', 'bucket', 'charges'];

test('the empty estate says No egress seen yet once, in the page head, on every Cost panel', () => {
  for (const panel of PANELS) {
    const v = vals(cost('empty', { costPanel: panel }));
    assert.equal(v.pageVerdict, 'No egress seen yet.', panel);
    assert.equal(v.optIsEmpty, false, `${panel}: Optimize does not say it again`);
    assert.equal(v.noLegs, false); assert.equal(v.noRegionBars, false); assert.equal(v.noSpendChart, false);
  }
  const a = HTML.indexOf('<!-- Cost -->'), b = HTML.indexOf('</section>', a);
  const card = HTML.slice(HTML.indexOf('<sc-if value="{{ isEmpty }}"', a), b);
  assert.ok(card.length > 0 && card.length < 600, 'the card is there');
  assert.doesNotMatch(card, /No egress seen yet/, 'the card below the tabs says what comes next, not the head again');
});

test('the leg tiles add to exactly 100%, on the whole estate and on every member', () => {
  for (const view of ['partial', 'mature', 'trust', 'small']) {
    const whole = vals(cost(view, { costPanel: 'legs' })).legTiles.reduce((a, t) => a + +/^(\d+)%/.exec(t.sub)[1], 0);
    assert.equal(whole, 100, `${view} whole estate`);
    for (const by of ['region', 'cloud']) for (const m of vals(cost(view, { costPanel: 'legs', costBy: by })).costMembers) {
      const v = vals(cost(view, { costPanel: 'legs', costBy: by, costPick: m.key }));
      if (!(money(v.legTotalF) > 0)) continue;
      assert.equal(v.legTiles.reduce((a, t) => a + +/^(\d+)%/.exec(t.sub)[1], 0), 100, `${view} ${by} ${m.key}: ${v.legTiles.map(t => t.sub).join(' + ')}`);
    }
  }
});

test('Optimize\'s line names only the moves it prices, as the Could save tile does', () => {
  for (const view of ['partial', 'mature', 'trust', 'small']) {
    const o = vals(cost(view, { costPanel: 'optimize' }));
    const priced = o.optRows.filter(r => (r.key === 'spend' || r.key === 'routing') && r.figure > 0).map(r => r.label);
    for (const r of o.optRows.filter(x => x.key === 'spend' || x.key === 'routing')) {
      if (priced.includes(r.label)) assert.match(o.optLine, new RegExp(r.label), `${view}: ${o.optLine}`);
      else assert.doesNotMatch(o.optLine, new RegExp(r.label), `${view}: ${o.optLine} names ${r.label}, which prices nothing`);
    }
  }
  assert.equal(vals(cost('small', { costPanel: 'optimize' })).optLine, 'Save $1,500/mo in Spend');
});

test('By region and By cloud: the bars, the member chips and a picked member\'s total and tiles add to the head, to the dollar', () => {
  for (const view of ['partial', 'mature', 'trust', 'small']) for (const by of ['region', 'cloud']) {
    const v = vals(cost(view, { costPanel: 'money', costBy: by }));
    assert.equal(v.regionBars.reduce((a, b) => a + money(b.vF), 0), money(v.regionTotalF), `${view} ${by}: ${v.regionBars.map(b => b.vF).join(' + ')} vs ${v.regionTotalF}`);
    const chips = Object.fromEntries(vals(cost(view, { costPanel: 'legs', costBy: by })).costMembers.map(m => [m.key, m.vF]));
    for (const b of v.regionBars) {
      assert.equal(chips[b.key], b.vF, `${view} ${by} ${b.key}: chip ${chips[b.key]} vs bar ${b.vF}`);
      const p = vals(cost(view, { costPanel: 'legs', costBy: by, costPick: b.key }));
      assert.equal(p.legTotalF, b.vF, `${view} ${by} ${b.key}: picked total`);
      assert.equal(p.legTiles.reduce((a, t) => a + money(t.v), 0), money(b.vF), `${view} ${by} ${b.key}: tiles ${p.legTiles.map(t => t.v).join(' + ')}`);
    }
    const w = vals(cost(view, { costPanel: 'legs' }));
    assert.equal(w.legTiles.reduce((a, t) => a + money(t.v), 0), money(w.legTotalF), `${view}: whole-estate tiles`);
    assert.equal(w.legTotalF, v.regionTotalF);
  }
  // The skeptic's case: Growing's five regions each hold one $36.50 tunnel, and the bars still read $132,250.
  const p = vals(cost('partial', { costPanel: 'money' }));
  assert.equal(p.regionTotalF, '$132,250');
});

test('Insights\' new destinations wear no money or health colour: one ink, the class in words', () => {
  for (const view of ['partial', 'mature', 'trust']) {
    const v = vals(mkC({ view, screen: 's3', tab: 'observe', estateParam: null, obPage: 'insights' }));
    const fills = [...new Set(v.iw.newDest.map(d => d.fill))];
    assert.equal(fills.length, 1, `${view}: ${fills.join(', ')}`);
    for (const t of ['--viz-1', '--viz-2', '--viz-3', '--viz-4', '--viz-5', '--success', '--warning', '--error']) assert.ok(!fills[0].includes(t), `${view}: ${fills[0]} is ${t}`);
    assert.ok(v.iw.newDest.every(d => /^(AI endpoint|SaaS|Object storage) · /.test(d.sub)), 'each row names its class');
  }
  const a = HTML.indexOf('aria-label="New destinations"'), card = HTML.slice(a, HTML.indexOf('aria-label="Shadow SaaS"', a));
  assert.doesNotMatch(card, /var\(--viz-[1-5]\)|var\(--warning\)|var\(--success\)/, 'no swatch paints a class in a money or health colour');
});

test('Recommended names the cloud that bills the IPsec tunnels, the one By cloud puts them in', () => {
  const c = mkC({ view: 'partial', estateParam: null, screen: 's3', layer: 'cloud', tab: 'connect', cnPage: 'options' });
  const m = vals(c).moveList.find(x => x.kind === 'sites' && x.mode === 'ipsec');
  const by = vals(cost('partial', { costPanel: 'legs', costBy: 'cloud' }));
  const billed = by.costMembers.filter(x => vals(cost('partial', { costPanel: 'legs', costBy: 'cloud', costPick: x.key })).legConnectRows.some(r => r.key === 'ipsec')).map(x => x.key);
  assert.deepEqual(billed, ['AWS']);
  assert.match(m.reason, /AWS bills their 5 tunnels/, m.reason);
  void D;
});
