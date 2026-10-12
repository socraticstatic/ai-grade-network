import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals, defaults, links } from '../naas-portal-app.js';
import * as P from '../naas-portal.js';

// Cloud connections (spec section 4): one row per AT&T cloud connection with its CSP mark, POP, region from the
// lookup or Unmapped, bandwidth; state B adds the service and the AVPN network an L3-VPN link belongs to.
if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0, location: { search: '' } };
const HTML = readFileSync(new URL('../portal.dc.html', import.meta.url), 'utf8');
const mkC = (extra = {}) => { const state = { ...defaults(), ...extra }; return { state, setState: (p) => Object.assign(state, typeof p === 'function' ? p(state) : p) }; };
const at = (fixture, stateB) => mkC({ fixture, stateB, page: 'links' });
const labels = (cols) => cols.filter(c => c.present).map(c => c.label);
const cell = (row, key) => row.cells.find(x => x.key === key).text;

test('the head counts connections, clouds and regions reached; a row per link, by cloud then POP', () => {
  const v = vals(at('scale', false));
  const reached = new Set(P.FIXTURES.scale.cloudLinks.flatMap(l => P.regionsOfPop(l.csp, l.pop)));
  assert.deepEqual([v.cl.counts.links, v.cl.counts.clouds, v.cl.counts.regions], ['12', '3', String(reached.size)]);
  assert.equal(reached.size, 10);
  assert.equal(v.cl.rows.length, 12);
  const order = v.cl.rows.map(r => r.csp + '/' + r.pop); assert.deepEqual(order, [...order].sort());
  assert.ok(v.cl.rows.every(r => r.mark.endsWith('.svg')), 'every row carries its provider mark');
});

test('state A columns; the unmapped POP reads Unmapped; state B adds Service and Network', () => {
  const a = vals(at('scale', false));
  assert.deepEqual(labels(a.cl.cols), ['Cloud', 'POP', 'Region', 'Bandwidth']);
  const xx = a.cl.rows.find(r => r.pop.includes('XX7')); assert.equal(cell(xx, 'region'), 'Unmapped');
  const dc2 = a.cl.rows.find(r => r.csp === 'Azure' && r.pop.includes('DC2')); assert.equal(cell(dc2, 'region'), 'East US, East US 2');
  const b = vals(at('scale', true));
  assert.deepEqual(labels(b.cl.cols), ['Cloud', 'POP', 'Region', 'Bandwidth', 'Service', 'Network']);
  const l3 = b.cl.rows.find(r => cell(r, 'service') === 'L3-VPN'); assert.ok(l3, 'an L3-VPN link');
  assert.match(cell(l3, 'network'), /^BK-/); assert.equal(cell(b.cl.rows.find(r => cell(r, 'service') === '–'), 'network'), '–');
});

test('Calloway has no AT&T cloud connection yet, and the page says so in one line', () => {
  const v = vals(at('calloway', false));
  assert.equal(v.cl.rows.length, 0); assert.equal(v.cl.empty, true); assert.equal(v.cl.emptyLine, 'No AT&T cloud connection yet.');
  assert.equal(vals(at('scale', false)).cl.empty, false);
});

test('the markup renders the table from cols and cells, a mark in the Cloud cell, and the empty line', () => {
  const a = HTML.indexOf('aria-label="Cloud connections"'), blk = HTML.slice(a, HTML.indexOf('</section>', a));
  assert.match(blk, /<sc-for list="\{\{ cl\.cols \}\}" as="col"/); assert.match(blk, /<sc-for list="\{\{ cl\.rows \}\}" as="row"/);
  assert.ok(blk.includes('{{ row.mark }}') && blk.includes('{{ cl.emptyLine }}') && blk.includes('{{ cl.empty }}'));
  assert.equal(blk.includes('<table'), false);
});
