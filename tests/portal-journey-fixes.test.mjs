import test from 'node:test';
import assert from 'node:assert/strict';
import { vals, defaults, useData } from '../naas-portal-app.js';
import * as PJ from '../naas-portal-journey.js';

// The drop 2 review's fix pass: a scan tick never moves a user who left Source; one request a region, named right,
// and Discovery carries it; an empty cloud is reachable by a click; unknown service codes group as Other; jFrom and
// the Recommended region survive the journey.
if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0, location: { search: '' } };
const mkC = (extra = {}) => { const state = { ...defaults(), ...extra }; return { state, setState: (p) => Object.assign(state, typeof p === 'function' ? p(state) : p) }; };
const at = (extra = {}) => mkC({ fixture: 'calloway', ...extra });
const B = Object.fromEntries(PJ.BEATS.map((b, i) => [b.key, i]));
const wait = (ms) => new Promise(r => setTimeout(r, ms));

test('Back during a scan stops it: no tick lands later, and Read it is off while busy', async () => {
  const c = at({ journey: true, jStep: B.source });
  vals(c).jr.act.go(); assert.equal(c.state.jScan, 0); assert.equal(vals(c).jr.act.off, true, 'busy means off');
  vals(c).jr.back(); assert.equal(c.state.jStep, B.today);
  await wait(3000);
  assert.equal(c.state.jStep, B.today, 'the stray tick never moved the beat'); assert.equal(c.state.jScan, null);
});

test('one request a region: a second click writes nothing, the Recommend act turns into See the request, and Discovery carries it', () => {
  const c = at({ journey: true, jStep: B.recommend, jProv: 'Azure', jScan: 4, jRegion: 'Azure/eastus' });
  vals(c).jr.act.go(); assert.equal(c.state.requests.length, 1); const first = c.state.requests[0].option;
  assert.ok(!('journey' in c.state.requests[0]), 'the same record Recommended writes');
  vals(c).jr.back(); assert.equal(c.state.jStep, B.recommend);
  const v = vals(c); assert.equal(v.jr.act.label, 'See the request'); v.jr.options[1].go(); vals(c).jr.act.go();
  assert.equal(c.state.requests.length, 1, 'no second record'); assert.equal(c.state.jStep, B.request);
  assert.match(vals(c).jr.line, new RegExp(`^Requested .+ for East US\\.$`));
  const d = mkC({ fixture: 'calloway', page: 'discovery', requests: c.state.requests }); const row = vals(d).dv.rows.find(r => r.regionKey === 'eastus');
  assert.match(row.cells.find(x => x.key === 'att').text, /^Requested · /); assert.equal(row.canConnect, false);
  const rc = vals(mkC({ fixture: 'calloway', page: 'recommended', requests: c.state.requests })).rc;
  assert.match(rc.pick.rows.find(r => r.key === 'Azure/eastus').cells.find(x => x.key === 'att').text, /^Requested/);
  assert.equal(first, c.state.requests[0].option);
});

test('every cloud can be read; one with nothing discovered ends on Nothing found and offers another', () => {
  const c = at({ journey: true, jStep: B.source }); const v = vals(c);
  assert.deepEqual(v.jr.providers.map(p => p.off), [false, false, false, false]);
  v.jr.providers.find(p => p.key === 'AWS').go(); assert.equal(c.state.jProv, 'AWS'); assert.equal(vals(c).jr.act.off, false);
  for (let i = 0; i < 5; i++) c.setState(vals(c).jr.scanTick());
  assert.equal(c.state.jStep, B.found); const w = vals(c);
  assert.equal(w.jr.cloud.empty, true); assert.equal(w.jr.line, 'Nothing found on AWS yet.'); assert.equal(w.jr.act.label, 'Read another cloud');
});

test('an unknown service code groups as Other, so the stage never shows a count over an empty grid', () => {
  const t = PJ.todayOf([{ siteId: 'a', service: 'ASE', address: { state: 'TX' }, bandwidthMbps: 1 }, { siteId: 'b', service: 'ADI', address: { state: 'TX' }, bandwidthMbps: 1 }]);
  assert.deepEqual(t.groups.map(g => [g.key, g.n]), [['ADI', 1], ['Other', 1]]); assert.equal(t.cells.length, 2);
});

test('jFrom clears on a fresh read, and Connect a cloud keeps the Recommended region', () => {
  const c = at({ page: 'discovery' }); vals(c).dv.rows[0].connect(); assert.equal(c.state.jFrom, 'discovery');
  vals(c).jr.steps[B.source].go(); assert.equal(c.state.jStep, B.source); assert.equal(c.state.jFrom, null);
  const d = at({ page: 'recommended', region: { csp: 'Azure', region: 'westeurope' } }); vals(d).rail[0].go();
  assert.deepEqual(d.state.region, { csp: 'Azure', region: 'westeurope' });
});
