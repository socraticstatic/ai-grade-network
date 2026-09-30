import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import * as A from '../naas-addendum.js';
import * as X from '../naas-connections.js';
import * as G from '../naas-segments.js';

// The segment contract (notes, 2026-09-30, Task 1.8): the stakeholder's nine
// rows (segment, owner, what to show, where the data comes from) and the
// seven grid columns (Site, Edge, Backbone, On-ramp, Cloud link, Hub, App).
// States come only from data the product already holds; the rest reads
// "Not yet measured", never an invented number.

const ctxOf = (view) => { const est = D.ESTATES[view], inv = A.inventory(est), ob = A.observe(est, [], inv); return G.segCtxOf(est, { inv, ob, conns: X.connections(est, ob) }); };
const cell = (row, key) => row[G.SEGMENTS.findIndex(s => s.key === key)];

test('the seven columns and the nine rows, in the stakeholder\'s order and words', () => {
  assert.deepEqual(G.SEGMENTS.map(s => s.label), ['Site', 'Edge', 'Backbone', 'On-ramp', 'Cloud link', 'Hub', 'App']);
  assert.deepEqual(G.TABLE.map(t => t.key), ['access', 'access3p', 'backbone', 'onramp', 'cloudlink', 'ipsec', 'hub', 'exit', 'app']);
  assert.deepEqual(G.TABLE.map(t => t.owner), ['att', 'third', 'att', 'att', 'cloud', 'customer', 'customer', 'customer', 'customer']);
  assert.equal(G.TABLE.find(t => t.key === 'access3p').limited, true);
  assert.deepEqual(G.OWNERS, { att: 'AT&T', third: 'Third party', cloud: 'Cloud provider', customer: 'You', public: 'Public internet' });
});

test('Growing finance: the ExpressRoute flap is down on the Cloud link, and the app is down with one path', () => {
  const ctx = ctxOf('partial');
  const fin = G.cellsFor('finance', ctx);
  assert.equal(fin.length, 7);
  assert.equal(cell(fin, 'cloudlink').state, 'down');
  assert.equal(cell(fin, 'cloudlink').thing, 'ExpressRoute');
  assert.equal(cell(fin, 'cloudlink').owner, 'cloud');
  assert.match(cell(fin, 'cloudlink').why, /BGP flapping/);
  assert.equal(cell(fin, 'app').state, 'down');
  assert.equal(cell(fin, 'hub').state, 'nodata');
  const pci = G.cellsFor('pci', ctx);
  assert.ok(pci.every(c => c.state !== 'down'), pci.map(c => c.state).join(','));
});

test('down cells are exactly the degraded connections, on every estate', () => {
  for (const view of ['partial', 'mature', 'trust', 'small']) {
    const ctx = ctxOf(view);
    const down = G.segmentTable(ctx.est, ctx).reduce((a, r) => a + r.counts.down, 0);
    assert.equal(down, ctx.conns.rows.filter(r => r.degraded).length, view);
  }
});

test('the app row has no data exactly where no flow logs arrive', () => {
  for (const view of ['partial', 'mature', 'trust']) {
    const ctx = ctxOf(view);
    const app = G.segmentTable(ctx.est, ctx).find(r => r.key === 'app');
    assert.equal(app.counts.nodata, (ctx.ob.blind || []).length, view);
  }
});

test('Growing\'s five IPsec branches are other-carrier access, a limited view', () => {
  const ctx = ctxOf('partial');
  const row = G.segmentTable(ctx.est, ctx).find(r => r.key === 'access3p');
  assert.equal(row.counts.n, 5);
  assert.equal(row.limited, true);
});

test('what we cannot see yet says so', () => {
  const ctx = ctxOf('partial');
  const t = G.segmentTable(ctx.est, ctx);
  for (const k of ['ipsec', 'hub', 'exit']) { const r = t.find(x => x.key === k); assert.equal(r.measured, false, k); assert.match(r.now.why, /Not yet measured/); }
});

test('deterministic, and an empty estate still shows the nine rows', () => {
  const ctx = ctxOf('mature');
  assert.deepEqual(G.segmentTable(ctx.est, ctx), G.segmentTable(ctx.est, ctx));
  const e = ctxOf('empty');
  const t = G.segmentTable(e.est, e);
  assert.equal(t.length, 9);
  assert.ok(t.every(r => r.counts.n === 0));
});

test('words, not codes', () => {
  for (const view of ['partial', 'mature', 'trust']) {
    const ctx = ctxOf(view);
    const text = [...G.TABLE.map(t => `${t.label} ${t.show} ${t.source}`), ...G.segmentTable(ctx.est, ctx).map(r => r.now ? `${r.now.where} ${r.now.why}` : ''), ...ctx.apps.flatMap(a => G.cellsFor(a.tag, ctx).map(c => `${c.thing} ${c.why}`))].join(' | ');
    assert.ok(!/\b(ER|DX|EQX)\b/.test(text), view);
    assert.ok(!/\bfabric\b/i.test(text.replace(/(AI|Equinix) Fabric/g, '')), view);
    assert.ok(!text.includes('—'), view);
  }
});
