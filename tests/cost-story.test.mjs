import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as D from '../naas-data.js';
import * as A from '../naas-addendum.js';
import * as R from '../naas-round2.js';
import * as CV from '../naas-cost-view.js';
import { regionOf } from '../naas-logic.js';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// Cost tells its story in pictures (Micah, 2026-09-30): "on cost spend, what does
// the 51k even mean - make the forecast make sense"; "cost by leg is good - numbers
// just are confusing"; "by region, by csp"; "filters"; "color scheme is really
// weird - cost by region bar chart is wrong and colors don't make sense"; "cost by
// region needs love"; "it needs to tell a story without words - visuals".

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const VIEWS = ['partial', 'mature', 'trust', 'small', 'empty'];
const cost = (view, patch = {}) => mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'cost', ...patch });
const money = (s) => +String(s).replace(/[^0-9.]/g, '');
const r100 = (v) => Math.round(v / 100) * 100;
const near = (a, b, eps = 0.01) => Math.abs(a - b) < eps;
const legsOf = (view) => { const e = D.ESTATES[view], inv = A.inventory(e), ob = A.observe(e, [], inv); return R.costLegs(e, inv, ob.utilRows); };
const panelOf = (gate) => { const a = HTML.indexOf(`<sc-if value="{{ ${gate} }}"`); assert.ok(a > 0, gate); let depth = 0, i = a; const re = /<(\/?)sc-if\b/g; re.lastIndex = a; for (let m; (m = re.exec(HTML));) { depth += m[1] ? -1 : 1; if (!depth) { i = m.index; break; } } return HTML.slice(a, i); };

// ---------- (1) Spend: the forecast as two numbers that make sense together ----------

test('the 90-day tile carries two numbers, as is and if you act, and they are the model', () => {
  for (const view of VIEWS) {
    const v = vals(cost(view, { costPanel: 'spend' }));
    const e = D.ESTATES[view], base = (e.buckets || []).reduce((a, b) => a + b.today, 0);
    const open = money(v.bankTiles.find(t => t.l === 'Still open').v);
    const t = v.spendTiles.find(x => x.l === 'In 90 days');
    // As is: this month's egress, grown at the trend. If you act: the open moves off, then the same growth.
    const g3 = Math.pow(1 + R.SPEND_GROWTH, 3);
    assert.equal(money(t.asIsV), r100(base * g3), `${view} as is ${t.asIsV}`);
    assert.equal(money(t.v), r100(Math.max(0, base - open) * g3), `${view} if you act ${t.v}`);
    assert.match(t.asIsWord, /as is/i); assert.match(t.actWord, /if you act/i);
    // The chart's last month says the same two numbers.
    const n3 = v.spendCols.filter(c => c.kind === 'next').at(-1);
    assert.equal(r100(n3.asIsN), money(t.asIsV), view); assert.equal(r100(n3.movedN), money(t.v), view);
  }
});

test('the gap in 90 days is Could save, grown with the bytes: the two numbers explain each other', () => {
  const v = vals(cost('partial', { costPanel: 'spend' }));
  const n3 = v.spendCols.filter(c => c.kind === 'next').at(-1);
  const could = money(v.spendTiles.find(t => t.l === 'Could save').v);
  assert.equal(could, 41500);
  assert.ok(Math.abs((n3.asIsN - n3.movedN) - could * Math.pow(1 + R.SPEND_GROWTH, 3)) < 2, `${n3.asIsN - n3.movedN}`);
});

test('every Spend tile says what it is in a buyer\'s words, and none is a lone figure', () => {
  const v = vals(cost('partial', { costPanel: 'spend' }));
  const t = Object.fromEntries(v.spendTiles.map(x => [x.l, x]));
  assert.equal(t['Spend this month'].v, '$89,600');
  assert.match(t['Spend this month'].sub, /egress/);
  // Re-pinned (2026-09-30, the skeptic): Could save names Optimize's priced moves, not a count Optimize does not show.
  assert.match(t['Could save'].sub, /^if you act on Spend and Routing$/);
  assert.match(t['Banked to date'].sub, /this month/);
  for (const x of v.spendTiles) assert.ok(x.sub || x.asIsWord, x.l);
});

test('this month splits into On AT&T and Outside AT&T by the buckets, and every past month adds up', () => {
  for (const view of ['partial', 'mature', 'trust', 'small']) {
    const e = D.ESTATES[view];
    // Re-pinned (2026-09-30, the skeptic): a bucket is at AT&T's price only where its cloud is attached (CV.bucketInk).
    const att = e.buckets.filter(b => CV.bucketInk(e, b) === 'att').reduce((a, b) => a + b.today, 0), out = e.buckets.filter(b => CV.bucketInk(e, b) === 'public').reduce((a, b) => a + b.today, 0);
    const past = vals(cost(view, { costPanel: 'spend' })).spendCols.filter(c => c.kind === 'past');
    assert.equal(past.length, 12);
    assert.deepEqual([past.at(-1).attN, past.at(-1).outN], [att, out], view);
    for (const c of past) assert.equal(c.attN + c.outN, c.spendN, `${view} ${c.key}`);
  }
});

test('the forecast lines leave from this month and land on the tile values', () => {
  const v = vals(cost('partial', { costPanel: 'spend' }));
  const start = (d) => d.match(/^M\s*([\d.]+)[ ,]([\d.]+)/).slice(1).map(Number);
  const end = (d) => { const p = d.trim().split(/[ML]\s*/).filter(Boolean).at(-1).split(/[ ,]/).map(Number); return p; };
  assert.deepEqual(start(v.fcAsIsD), start(v.fcActD), 'both forecasts start at the same point');
  assert.ok(near(start(v.fcAsIsD)[1], v.spendNowY, 0.05), 'and that point is this month\'s spend');
  assert.ok(end(v.fcActD)[1] > end(v.fcAsIsD)[1], 'if you act ends lower on the chart (a larger y is lower)');
  assert.equal(v.spendCols.filter(c => c.kind === 'next').length, 3);
});

// ---------- (2) By leg: clear numbers, and one filter bar ----------

test('each leg says per month and what it covers; each row reads count × unit', () => {
  const v = vals(cost('partial', { costPanel: 'legs' }));
  for (const t of v.legTiles) { assert.equal(t.u, '/mo', t.key); assert.ok(t.covers && !/^\s*$/.test(t.covers), t.key); }
  assert.match(v.legTiles.find(t => t.key === 'access').covers, /circuits at \d+ sites/);
  const avpn = v.legAccessRows.find(r => r.key === 'avpn');
  assert.match(avpn.sub, /^9 circuits × \$1,600 each/);
  assert.equal(avpn.vF, '$14,400');
  // Modelled is explained once, in the legend, not on every row.
  assert.equal(v.costLegend.filter(l => l.meaning === 'modelled').length, 1);
  assert.match(v.costLegend.find(l => l.meaning === 'modelled').label, /not a bill/);
});

test('the filter bar is the house By chips: Whole estate, By region, By cloud', () => {
  const c = cost('partial', { costPanel: 'legs' });
  assert.deepEqual(vals(c).costByChips.map(x => x.label), ['Whole estate', 'By region', 'By cloud']);
  vals(c).costByChips.find(x => x.key === 'region').go();
  assert.equal(c.state.costBy, 'region');
  const members = vals(c).costMembers;
  assert.ok(members.length >= 4 && members.some(m => m.label === 'US East'), members.map(m => m.label).join(', '));
  members.find(m => m.label === 'Europe').go();
  assert.equal(c.state.costPick, 'Europe');
  vals(c).costByChips.find(x => x.key === 'all').go();
  assert.deepEqual([c.state.costBy, c.state.costPick], ['all', null]);
});

test('every slice adds up to the whole estate, leg by leg, on every estate', () => {
  for (const view of VIEWS) {
    const L = legsOf(view);
    for (const by of ['region', 'cloud']) {
      const ms = CV.costMembers(D.ESTATES[view], L, by);
      assert.ok(near(ms.reduce((a, m) => a + m.v, 0), L.total), `${view} ${by}`);
      for (const leg of ['access', 'connect', 'cloud']) {
        const sum = ms.reduce((a, m) => a + CV.sliceLegs(D.ESTATES[view], L, by, m.key)[leg].total, 0);
        assert.ok(near(sum, L[leg].total), `${view} ${by} ${leg}: ${sum} vs ${L[leg].total}`);
      }
      // Through the page: a picked member's tiles add to its chip.
      for (const m of ms.slice(0, 3)) {
        const v = vals(cost(view, { costPanel: 'legs', costBy: by, costPick: m.key }));
        assert.ok(Math.abs(v.legTiles.reduce((a, t) => a + money(t.v), 0) - m.v) <= 2, `${view} ${by} ${m.key}`);
      }
    }
  }
});

test('the whole-estate parts are the rows: every row is the sum of what it counts', () => {
  for (const view of VIEWS) {
    const L = legsOf(view);
    for (const leg of [L.access, L.connect, L.cloud]) for (const r of leg.rows) {
      assert.ok(Array.isArray(r.parts), `${view} ${r.key} has parts`);
      assert.ok(near(r.parts.reduce((a, p) => a + p.v, 0), r.v), `${view} ${r.key}`);
      assert.equal(r.parts.reduce((a, p) => a + p.n, 0), r.key === 'egress' ? r.parts.length : r.n, `${view} ${r.key} count`);
    }
  }
});

test('a By cloud pick keeps a cloud\'s egress to its own buckets; the sites are their own slice', () => {
  const e = D.ESTATES.partial, L = legsOf('partial');
  const aws = CV.sliceLegs(e, L, 'cloud', 'AWS');
  assert.equal(aws.cloud.rows.find(r => r.key === 'egress').v, e.buckets.filter(b => b.cloud === 'AWS').reduce((a, b) => a + b.today, 0));
  const sites = CV.sliceLegs(e, L, 'cloud', CV.SITES);
  assert.ok(near(sites.access.total, L.access.total), 'site access is not any one cloud\'s');
  assert.equal(sites.cloud.total, 0);
});

// ---------- (3) By region: right and readable ----------

test('By region: one bar per region, sorted by spend, each the region\'s sum in the one cost model', () => {
  for (const view of ['partial', 'mature', 'trust', 'small']) {
    const e = D.ESTATES[view], L = legsOf(view);
    const v = vals(cost(view, { costPanel: 'money' }));
    const bars = v.regionBars;
    assert.ok(bars.length > 0, view);
    for (let i = 1; i < bars.length; i++) assert.ok(bars[i - 1].v >= bars[i].v, `${view}: sorted`);
    assert.ok(near(bars.reduce((a, b) => a + b.v, 0), L.total, 1), `${view}: bars add to ${L.total}`);
    // Independently: every site part in its site's region, every region part in its cloud region's place.
    const want = {};
    for (const leg of [L.access, L.connect, L.cloud]) for (const r of leg.rows) for (const p of r.parts) {
      if (p.kind === 'bucket') continue;
      // Re-pinned (2026-09-30, "Europe groups every European region"): a site's place resolves International to its continent.
      const g = p.kind === 'site' ? CV.placeOfSite(e.sites.find(x => x.name === p.site)) : CV.geoOfRegion(p.region);
      want[g] = (want[g] || 0) + p.v;
    }
    const egress = (e.buckets || []).reduce((a, b) => a + b.today, 0);
    const nonEgress = bars.reduce((a, b) => a + b.v - b.egressV, 0);
    assert.ok(near(nonEgress, L.total - egress, 1), view);
    for (const b of bars) assert.ok(near(b.v - b.egressV, want[b.key] || 0, 0.5), `${view} ${b.key}: ${b.v - b.egressV} vs ${want[b.key]}`);
  }
});

test('By region is spend, not the old savings strip: attached regions are on it, and the values sit on the bars', () => {
  const v = vals(cost('partial', { costPanel: 'money' }));
  const east = v.regionBars.find(b => b.key === 'US East');
  assert.ok(east && east.segs.some(s => s.ink === 'att' && s.v > 0), 'US East carries us-east-1 on AT&T');
  for (const b of v.regionBars) { assert.equal(b.vF, '$' + Math.round(b.v).toLocaleString('en-US')); assert.ok(b.segs.every(s => /%$/.test(s.w))); }
  assert.match(panelOf('costPanelMoney'), /\{\{ rb\.vF \}\}/);
});

test('a source added in Discover joins the slices, and they still add up', () => {
  const patch = { costPanel: 'money', addedSources: [{ provider: 'Oracle', name: 'Oracle account', cred: 'API key', at: '2026-09-29T11:00:00Z' }] };
  for (const costBy of ['region', 'cloud']) {
    const v = vals(cost('partial', { ...patch, costBy }));
    const total = vals(cost('partial', { ...patch, costPanel: 'legs' })).legTiles.reduce((a, t) => a + money(t.v), 0);
    assert.ok(Math.abs(v.regionBars.reduce((a, b) => a + b.v, 0) - total) <= 2, `${costBy}: ${v.regionBars.map(b => b.label).join(', ')}`);
    if (costBy === 'cloud') assert.ok(v.regionBars.some(b => b.key === 'Oracle'), 'Oracle is a bar');
  }
});

test('the By cloud version of the chart comes from the same filter', () => {
  const v = vals(cost('partial', { costPanel: 'money', costBy: 'cloud' }));
  assert.deepEqual(v.regionBars.map(b => b.key).sort(), ['AWS', 'Azure', 'GCP', CV.SITES].sort());
  assert.ok(near(v.regionBars.reduce((a, b) => a + b.v, 0), legsOf('partial').total, 1));
});

test('a bar opens exactly what it counts: By leg, sliced to that region', () => {
  const c = cost('partial', { costPanel: 'money' });
  vals(c).regionBars.find(b => b.key === 'Europe').go();
  assert.deepEqual([c.state.costPanel, c.state.costBy, c.state.costPick], ['legs', 'region', 'Europe']);
});

// ---------- (4) One colour vocabulary ----------

test('one colour per meaning across Spend, By leg, By region and the Traffic Cost view', () => {
  const inks = CV.COST_INK;
  for (const k of ['att', 'public', 'list', 'saved', 'other']) assert.match(inks[k].color, /^var\(--[\w-]+\)$/, k);
  const colours = Object.values(inks).map(i => i.color);
  assert.equal(new Set(colours).size, colours.length, 'no colour means two things');
  const legends = [];
  for (const view of ['partial', 'mature']) {
    const sp = vals(cost(view, { costPanel: 'spend' })), lg = vals(cost(view, { costPanel: 'legs' })), rg = vals(cost(view, { costPanel: 'money' }));
    const tr = vals(mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', mapMode: 'cost' }));
    legends.push(...sp.spendLegend, ...lg.costLegend, ...rg.costLegend, ...tr.mapLegend);
    for (const b of rg.regionBars) for (const s of b.segs) assert.equal(s.color, inks[s.ink].color, `${view} ${b.key} ${s.ink}`);
  }
  const byMeaning = {}, byColour = {};
  for (const l of legends) {
    assert.ok(l.meaning, `a legend item without a meaning: ${l.label}`);
    if (!inks[l.meaning]) continue;
    assert.equal(l.color, inks[l.meaning].color, `${l.label} wears ${l.color}, not ${inks[l.meaning].color}`);
    (byMeaning[l.meaning] = byMeaning[l.meaning] || new Set()).add(l.color);
    (byColour[l.color] = byColour[l.color] || new Set()).add(l.meaning);
  }
  for (const [m, cs] of Object.entries(byMeaning)) assert.equal(cs.size, 1, m);
  for (const [c, ms] of Object.entries(byColour)) assert.equal(ms.size, 1, `${c} means ${[...ms].join(' and ')}`);
});

test('the Traffic Cost view draws with the Cost inks, not its own hex', () => {
  const v = vals(mkC({ view: 'partial', estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', mapMode: 'cost' }));
  assert.deepEqual(v.mapLegend.map(l => l.meaning), ['att', 'public', 'list']);
  // Re-pinned (2026-09-30, Cost v2): a ribbon's ink is the Cost token; a list price fills with its hatch.
  const fills = new Set(v.mapRibbons.map(r => r.ink));
  for (const f of fills) assert.ok(Object.values(CV.COST_INK).some(i => i.color === f), `ribbon fill ${f}`);
});

test('the Cost panels name no hex colour; every fill is a token', () => {
  for (const gate of ['costPanelSpend', 'costPanelLegs', 'costPanelMoney']) assert.doesNotMatch(panelOf(gate), /#[0-9a-fA-F]{3,6}\b/, gate);
});

// ---------- The drill rule: every figure is a button that opens what it counts ----------

test('every figure in Spend, By leg and By region is inside a button', () => {
  const FIGURE = /\{\{\s*(st\.v|st\.asIsV|lt\.v|lr\.vF|rb\.vF|mm\.vF|sr\.bankedF|sr\.openF|fcAsIsF|fcActF|legTotalF|regionTotalF)\s*\}\}/g;
  const want = { costPanelSpend: ['st.v', 'st.asIsV', 'sr.bankedF', 'sr.openF', 'fcAsIsF', 'fcActF'], costPanelLegs: ['lt.v', 'lr.vF', 'mm.vF', 'legTotalF'], costPanelMoney: ['rb.vF', 'regionTotalF'] };
  for (const gate of Object.keys(want)) {
    const html = panelOf(gate);
    const seen = new Set();
    for (const m of html.matchAll(FIGURE)) {
      seen.add(m[1]);
      const before = html.slice(0, m.index);
      const opens = (before.match(/<button\b/g) || []).length, closes = (before.match(/<\/button>/g) || []).length;
      assert.ok(opens > closes, `${gate}: ${m[0]} is not inside a button`);
    }
    for (const f of want[gate]) assert.ok(seen.has(f), `${gate} binds ${f}`);
  }
  // The chart's columns and bars are buttons too, and every button has somewhere to go.
  assert.match(panelOf('costPanelSpend'), /<button class="cost-col" onClick="\{\{ sc\.go \}\}"/);
  assert.match(panelOf('costPanelMoney'), /<button class="cost-bar" onClick="\{\{ rb\.go \}\}"/);
  for (const view of ['partial', 'mature', 'trust']) {
    const sp = vals(cost(view, { costPanel: 'spend' })), rg = vals(cost(view, { costPanel: 'money' })), lg = vals(cost(view, { costPanel: 'legs' }));
    for (const x of [...sp.spendTiles, ...sp.spendCols, ...sp.saveRows, ...rg.regionBars, ...lg.legTiles, ...lg.legAccessRows, ...lg.legConnectRows, ...lg.legCloudRows, ...lg.costByChips]) assert.equal(typeof x.go, 'function', `${view} ${x.key}`);
    for (const k of ['fcAsIsGo', 'fcActGo', 'legTotalGo', 'regionTotalGo']) assert.equal(typeof (k === 'regionTotalGo' ? rg : k === 'legTotalGo' ? lg : sp)[k], 'function', k);
  }
});

test('the chart draws with positioned divs and one plain svg: no sc-for inside svg', () => {
  const html = panelOf('costPanelSpend');
  for (const m of html.matchAll(/<svg\b[\s\S]*?<\/svg>/g)) assert.doesNotMatch(m[0], /<sc-(for|if)\b/);
});

test('a place is one place on every surface: a cloud region sits where the site side puts its metro', () => {
  assert.equal(CV.geoOfRegion('us-east-1'), 'US East');
  assert.equal(CV.geoOfRegion('eu-west-1'), 'Europe');
  assert.equal(CV.geoOfRegion('us-central1'), 'US Central');
  // Frankfurt DC and eu-central-1 share a place. Re-pinned (2026-09-30, "Europe groups every European region"):
  // the site side's International resolves to its continent, so both are Europe.
  assert.equal(CV.geoOfRegion('eu-central-1'), CV.placeOfSite({ name: 'Frankfurt DC', metro: 'Frankfurt' }));
  assert.equal(CV.geoOfRegion('eu-central-1'), 'Europe');
  assert.equal(regionOf({ name: 'Frankfurt DC', metro: 'Frankfurt' }), 'International', 'the site side itself does not move');
  assert.equal(CV.geoOfRegion('eu-frankfurt-1'), CV.geoOfRegion('eu-central-1'));
  assert.equal(CV.geoOfRegion('us-ashburn-1'), 'US East');
  assert.equal(CV.geoOfRegion('europe-west1'), 'Europe');
});

test('Banked opens what it counts; a site opens its own services on Your sites', () => {
  const c = cost('partial', { costPanel: 'spend' });
  vals(c).spendTiles.find(t => t.l === 'Banked to date').go();
  // Re-pinned (2026-09-30, the skeptic: Findings > Closed held $6,000 of the $36,000): Banked opens its sources on Spend.
  assert.deepEqual([c.state.tab, c.state.costPanel, c.state.spendList], ['cost', 'spend', 'banked']);
  const d = cost('partial', { costPanel: 'legs', legDrill: { leg: 'access', row: 'avpn' } });
  const row = vals(d).legAccessRows.find(r => r.label === 'Ashburn DC');
  row.go();
  assert.deepEqual([d.state.screen, d.state.discoverView, d.state.estPanel], ['s1', 'estate', 'sites']);
  assert.equal(d.state.placeTrail.at(-1), 'site:Ashburn DC', d.state.placeTrail.join(' > '));
});

test('the figures open the sets they count', () => {
  const c = cost('partial', { costPanel: 'spend' });
  vals(c).spendTiles.find(t => t.l === 'Spend this month').go();
  assert.equal(c.state.costPanel, 'bucket', 'this month\'s spend is the buckets');
  const d = cost('partial', { costPanel: 'spend' });
  vals(d).spendTiles.find(t => t.l === 'Could save').go();
  assert.equal(d.state.costPanel, 'optimize', 'could save is the open moves');
  const f = cost('partial', { costPanel: 'legs' });
  vals(f).legAccessRows.find(r => r.key === 'avpn').go();
  assert.deepEqual(f.state.legDrill, { leg: 'access', row: 'avpn' });
  const drilled = vals(f).legAccessRows;
  assert.equal(drilled.length, Math.min(6, 9));
  assert.ok(drilled.every(r => r.isPart && r.vF === '$1,600'), drilled.map(r => r.vF).join(','));
  // An egress bucket is a traffic figure: it explains down to the records.
  const g = cost('partial', { costPanel: 'legs', legDrill: { leg: 'cloud', row: 'egress' } });
  const b = vals(g).legCloudRows[0];
  b.go();
  assert.equal(g.state.obPage, 'logs');
  // A port is not traffic: it opens the cloud region that holds it.
  const h = cost('partial', { costPanel: 'legs', legDrill: { leg: 'cloud', row: 'port:Azure' } });
  vals(h).legCloudRows[0].go();
  assert.deepEqual([h.state.tab, h.state.cloudPick, h.state.cloudDrill], ['connect', 'Azure', ['eastus']]);
});

test('empty says so and draws nothing', () => {
  const v = vals(cost('empty', { costPanel: 'money' }));
  assert.equal(v.regionBars.length, 0);
  assert.equal(v.costMembers.length, 0);
  assert.equal(vals(cost('empty', { costPanel: 'legs' })).legEmpty, 'No egress seen yet.');
});
