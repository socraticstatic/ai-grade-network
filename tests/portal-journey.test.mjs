import test from 'node:test';
import assert from 'node:assert/strict';
import * as PJ from '../naas-portal-journey.js';
import * as P from '../naas-portal.js';

// The journey on the portal's data (drop 2): six beats, the sites as circuits by service, a cloud read read-only,
// what it found as regions with the AT&T join, intent, the ranked ways, a request. Never a workload.

test('six beats, named, each with a short word and a glyph', () => {
  assert.deepEqual(PJ.BEATS.map(b => b.key), ['today', 'source', 'found', 'intent', 'recommend', 'request']);
  assert.ok(PJ.BEATS.every(b => b.label && b.short && b.icon && b.title));
});

test('today counts the circuits by service and draws a sample of glyphs, the count exact', () => {
  const t = PJ.todayOf(P.FIXTURES.calloway.circuits);
  assert.equal(t.circuits, 20); assert.equal(t.sites, 20); assert.equal(t.networks, 2);
  assert.deepEqual(t.groups.map(g => g.key), ['AVPN', 'ASEoD', 'ADI', 'ABF']);
  assert.equal(t.groups.reduce((a, g) => a + g.n, 0), 20); assert.equal(t.cells.length, 20);
  assert.ok(t.groups.every(g => g.icon && g.ink && g.label && g.nF));
  const s = PJ.todayOf(P.FIXTURES.scale.circuits);
  assert.equal(s.circuits, 3000); assert.equal(s.cells.length, 20, 'a sample, never 3,000 glyphs');
  for (const g of s.groups) assert.ok(Math.abs(s.cells.filter(c => c.group === g.key).length - 20 * g.n / 3000) <= 1, `${g.key} glyphs follow its share`);
});

test('the providers: four clouds with marks; live when the discovery carries that cloud', () => {
  const ps = PJ.providersOf(P.FIXTURES.calloway.discovery);
  assert.deepEqual(ps.map(p => p.key), ['Azure', 'AWS', 'GCP', 'Oracle']);
  assert.deepEqual(ps.map(p => p.live), [true, false, false, false]);
  assert.ok(ps.every(p => p.mark.endsWith('.svg') && p.cred && p.name));
  assert.deepEqual(PJ.providersOf(P.FIXTURES.scale.discovery).map(p => p.live), [true, true, true, false]);
});

test('what it found: the cloud\'s regions with the AT&T join, VPCs and subnets, bytes when sent; nothing when the cloud is absent', () => {
  const f = PJ.foundOf(P.FIXTURES.calloway, 'Azure');
  assert.equal(f.has, true); assert.equal(f.name, 'Microsoft Azure'); assert.equal(f.regions.length, 2);
  assert.deepEqual(f.regions.map(r => r.label), ['East US', 'West Europe']); assert.deepEqual(f.regions.map(r => r.on), [false, false]);
  assert.equal(f.regions[0].att, 'Not on AT&T'); assert.equal(f.vpcs, 5); assert.equal(f.subnets, 12); assert.equal(f.bytesOut, undefined);
  const s = PJ.foundOf(P.FIXTURES.scale, 'Azure');
  assert.equal(s.regions.find(r => r.region === 'eastus').on, true); assert.ok(typeof s.bytesOut === 'number');
  const none = PJ.foundOf(P.FIXTURES.calloway, 'AWS'); assert.equal(none.has, false); assert.equal(none.regions.length, 0);
});

test('one sentence a beat, nine words or fewer, in the portal\'s words', () => {
  const t = PJ.todayOf(P.FIXTURES.calloway.circuits), f = PJ.foundOf(P.FIXTURES.calloway, 'Azure');
  const lines = {
    today: PJ.lineOf('today', { today: t }), source: PJ.lineOf('source', {}), found: PJ.lineOf('found', { found: f }), intent: PJ.lineOf('intent', { found: f, region: f.regions[0] }),
    recommend: PJ.lineOf('recommend', { region: f.regions[0] }), request: PJ.lineOf('request', { region: f.regions[0], way: 'Your ExpressRoute' }),
  };
  assert.equal(lines.today, 'AT&T already carries your 20 circuits.');
  assert.equal(lines.found, 'Azure: 2 regions, 5 VNets, 12 subnets.');
  for (const [k, l] of Object.entries(lines)) { assert.ok(l.split(' ').length <= 9, `${k}: ${l}`); assert.ok(!/workload|app\b/i.test(l), k); }
  assert.equal(PJ.lineOf('found', { found: PJ.foundOf(P.FIXTURES.calloway, 'AWS'), cloud: 'AWS' }), 'Nothing found on AWS yet.');
});
