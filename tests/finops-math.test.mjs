import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// The money adds up across surfaces (Micah, 2026-10-05: "make sure the math on finops and other places adds up").
// The home's Egress spend trio reads one clock: in 90 days as is, in 90 days if you act, and their difference.
// It used to subtract the 90-day forecast from today's run-rate and printed "You save $0" on Established.
if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const n = (s) => +String(s).replace(/[^0-9.]/g, '');
const money = (s) => { const m = String(s).match(/\$([\d,]+)/); return m ? +m[1].replace(/,/g, '') : null; };

test('the home trio: as is minus if you act equals You save, and both are the Spend page\'s 90-day figures', () => {
  for (const view of ['mature', 'partial', 'trust', 'small']) {
    const h = vals(mkC({ view, estateParam: null, screen: 's0' })).homeChart;
    const sp = vals(mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'cost', costPanel: 'spend' }));
    const ahead = sp.spendTiles.find(t => t.key === 'ahead');
    assert.ok(h, `${view}: no chart`);
    assert.equal(h.asIs, ahead.asIsV, `${view}: as is`);
    assert.equal(h.act, ahead.v, `${view}: if you act`);
    assert.equal(n(h.save), Math.max(0, n(ahead.asIsV) - n(ahead.v)), `${view}: save ${h.save} vs ${ahead.asIsV} - ${ahead.v}`);
    assert.ok(n(h.save) > 0, `${view}: the estate has moves, so acting saves something`);
  }
  // Pared (2026-10-07): the trio's labels drop "In 90 days," for a 90 days chip on the head; the clock is the title.
  assert.match(HTML, /<div class="hm-trio" title="In 90 days: as is, if you act, and what you save"><div><small>As is<\/small><b>\{\{ homeChart\.asIs \}\}\/mo<\/b>/);
  assert.match(HTML, /<small>You save<\/small><b[^>]*>\{\{ homeChart\.save \}\}\/mo<\/b>/);
});

test('Spend, Optimize and By bucket quote one saving; By bucket\'s rows add to its total', () => {
  for (const view of ['mature', 'partial', 'trust', 'small']) {
    const at = (costPanel) => vals(mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'cost', costPanel }));
    const sp = at('spend'), could = n((sp.spendTiles.find(t => /Could save/.test(t.l)) || {}).v), spend = n((sp.spendTiles.find(t => /Spend this month/.test(t.l)) || {}).v);
    const rows = at('bucket').buckets;
    assert.ok(rows.length > 0, `${view}: no buckets`);
    const today = rows.reduce((a, r) => a + r.today, 0), fabric = rows.reduce((a, r) => a + r.fabric, 0), saved = rows.reduce((a, r) => a + r.saved, 0);
    for (const r of rows) assert.equal(r.today - r.fabric, r.saved, `${view}: ${r.name} ${r.today} - ${r.fabric} vs ${r.saved}`);
    assert.equal(today, spend, `${view}: buckets today ${today} vs Spend tile ${spend}`);
    assert.equal(today - fabric, saved, `${view}: buckets`);
    assert.equal(saved, could, `${view}: buckets save ${saved} vs Could save tile ${could}`);
    const opt = at('optimize');
    const saves = opt.optRows.filter(r => /^Save \$/.test(r.figureF || '')).map(r => money(r.figureF));
    if (/^Save \$/.test(opt.optLine || '')) assert.equal(money(opt.optLine), saves.reduce((a, b) => a + b, 0), `${view}: Optimize ${opt.optLine} vs ${saves}`);
  }
});

test('the egress growth percent is the percent of the money the card prints', () => {
  for (const view of ['mature', 'partial', 'trust']) {
    const sig = vals(mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', obTab: 'flow' }));
    const g = (sig.sigAll || []).find(x => x.key === 'growth');
    if (!g || !/\$/.test(g.head)) continue;
    const m = g.head.match(/^Public egress ([+-])\$([\d,]+)\/mo in 11 weeks · ([+-]\d+)%$/);
    assert.ok(m, `${view}: ${g.head}`);
    const then = money(g.thenLabel), now = money(g.nowLabel);
    assert.equal((m[1] === '-' ? -1 : 1) * +m[2].replace(/,/g, ''), now - then, `${view}: the delta is the difference of the two figures`);
    assert.equal(+m[3], Math.round((now / then - 1) * 100), `${view}: ${g.head} reads ${then} to ${now}`);
  }
});
