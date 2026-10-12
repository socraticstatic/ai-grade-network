import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { vals, defaults } from '../naas-portal-app.js';
import * as W from '../naas-ways.js';

// Recommended (spec section 4): for a region, the option list (ours as a labeled placeholder until the team's arrives),
// the four intent questions, the compare table, the ranking as a visible rule table, and Request this.
if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0, location: { search: '' } };
const HTML = readFileSync(new URL('../portal.dc.html', import.meta.url), 'utf8');
const mkC = (extra = {}) => { const state = { ...defaults(), ...extra }; return { state, setState: (p) => Object.assign(state, typeof p === 'function' ? p(state) : p) }; };
const at = (extra = {}) => mkC({ fixture: 'calloway', page: 'recommended', ...extra });
const EAST = { csp: 'Azure', region: 'eastus' };

test('with no region picked, the page lists the discovered regions to pick from, those off AT&T first', () => {
  const c = at(); const v = vals(c);
  assert.equal(v.rc.hasRegion, false); assert.equal(v.rc.pick.rows.length, 2);
  v.rc.pick.rows[0].go(); assert.deepEqual(c.state.region, EAST); assert.equal(vals(c).rc.hasRegion, true);
  const s = mkC({ fixture: 'scale', page: 'recommended' }); const w = vals(s);
  assert.equal(w.rc.pick.rows[0].on, false, 'the one region not tied to a link leads'); assert.equal(w.rc.pick.rows.length, 8);
});

test('the four intent questions render as glyph answers; an answer re-ranks the options', () => {
  const c = at({ region: EAST }); let v = vals(c);
  assert.deepEqual(v.rc.intent.map(q => q.label), ['Purpose', 'Traffic', 'Security', 'Routing · L3']);
  assert.ok(v.rc.intent.every(q => existsSync(new URL(`../brand/icons/${q.icon}.svg`, import.meta.url)) && q.opts.every(o => existsSync(new URL(`../brand/icons/${o.icon}.svg`, import.meta.url)) && typeof o.on === 'boolean')), 'every glyph is a mask in brand/icons');
  assert.ok(v.rc.weights.every(w => existsSync(new URL(`../brand/icons/${w.icon}.svg`, import.meta.url))));
  const before = v.rc.options.map(o => o.key);
  v.rc.intent.find(q => q.key === 'routing').opts.find(o => o.key === 'hub').go(); v = vals(c);
  assert.equal(c.state.answers.routing, 'hub');
  assert.notDeepEqual(v.rc.options.map(o => o.key), before, 'the hub answer moves hosted ways up');
  assert.ok(v.rc.options.every(o => o.key !== 'byo' || o.misses > 0), 'your own port misses the hub rule');
  assert.deepEqual(v.rc.options.map(o => o.key), W.rankWays('Azure', { routing: 'hub' }, 99).map(r => r.key), 'the same ranking the storefront uses');
});

test('the options table: every way the cloud offers, ranked, with price, setup, who, fit and score; the placeholder is labeled', () => {
  const v = vals(at({ region: EAST }));
  assert.equal(v.rc.placeholder, true); assert.match(v.rc.placeholderLine, /stand in until/);
  assert.equal(v.rc.options.length, W.WAYS.filter(w => W.wayAvailable(w.key, 'Azure')).length);
  assert.deepEqual(v.rc.cols.filter(c => c.present).map(c => c.label), ['Option', 'Monthly', 'Setup', 'Who', 'Fit', 'Score', '']);
  const top = v.rc.options[0]; assert.equal(top.rank, '1'); assert.equal(top.recommended, true); assert.match(top.monthly, /^\$[\d,]+\/mo$|^At review$/);
  assert.ok(top.setup && top.who && top.fit && /^\d+$/.test(top.score), JSON.stringify(top));
  const removed = vals(at({ region: EAST, answers: { security: 'inspected' } })).rc.options.find(o => o.misses > 0);
  assert.equal(removed.cells.find(x => x.key === 'score').text, '–', 'a removed way shows no score beside its miss');
  assert.deepEqual(v.rc.weights.map(w => w.label), ['Cost', 'Performance', 'Security', 'Effort and time', 'Scale']);
  assert.equal(v.rc.weights.reduce((a, w) => a + w.w, 0), 100);
});

test('Request this writes a request record with the region, option and answers; unanswered means defaulted', () => {
  const c = at({ region: EAST }); vals(c).rc.options[0].request();
  assert.equal(c.state.requests.length, 1);
  const r = c.state.requests[0]; assert.deepEqual([r.csp, r.region, r.option], ['Azure', 'eastus', vals(c).rc.options[0].key]);
  assert.equal(r.defaulted, true); assert.deepEqual(r.answers, W.INTENT_DEFAULT);
  const v = vals(c); assert.equal(v.rc.requested, true); assert.match(v.rc.requestedLine, /^Requested .+ for Azure · East US/);
  const d = at({ region: EAST, answers: { purpose: 'critical' } }); vals(d).rc.options[1].request();
  assert.equal(d.state.requests[0].defaulted, false); assert.equal(d.state.requests[0].answers.purpose, 'critical');
});

test('the rules read in words: the weights the answers set and the hard rules that remove a way', () => {
  const v = vals(at({ region: EAST, answers: { security: 'inspected' } }));
  assert.ok(v.rc.rules.some(r => /Inspected/.test(r.text) && /No inspection in path/.test(r.text)), JSON.stringify(v.rc.rules));
  assert.equal(vals(at({ region: EAST })).rc.rules.length, 0, 'the defaults remove nothing');
});

test('the markup binds the picker, the intent chips, the options table and the request line', () => {
  const a = HTML.indexOf('aria-label="Recommended"'), blk = HTML.slice(a, HTML.indexOf('</section>', a));
  assert.match(blk, /<sc-for list="\{\{ rc\.intent \}\}" as="q"/); assert.match(blk, /<sc-for list="\{\{ q\.opts \}\}" as="o"/);
  assert.match(blk, /<sc-for list="\{\{ rc\.options \}\}" as="row"/); assert.match(blk, /<sc-for list="\{\{ rc\.pick\.rows \}\}" as="row"/);
  for (const k of ['{{ rc.placeholderLine }}', '{{ rc.requestedLine }}', '{{ row.request }}', '{{ rc.weights }}', '{{ rc.rules }}']) assert.ok(blk.includes(k), k);
  assert.equal(blk.includes('<table'), false);
});
