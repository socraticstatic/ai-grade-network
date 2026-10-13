import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals, defaults, useData } from '../naas-portal-app.js';
import * as PJ from '../naas-portal-journey.js';
import * as W from '../naas-ways.js';

// One kind of choice, made where it applies (Micah, 2026-10-12 18:23): intent is asked per region inside the cloud
// node, in sentences; the other region gets the same answers through one explicit toggle; Request loops regions.
if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0, location: { search: '' } };
const HTML = readFileSync(new URL('../portal.dc.html', import.meta.url), 'utf8');
const mkC = (extra = {}) => { const state = { ...defaults(), ...extra }; return { state, setState: (p) => Object.assign(state, typeof p === 'function' ? p(state) : p) }; };
const B = Object.fromEntries(PJ.BEATS.map((b, i) => [b.key, i]));
const at = (extra = {}) => mkC({ fixture: 'calloway', journey: true, jStep: B.intent, jProv: 'Azure', jScan: 4, jRegion: 'Azure/eastus', ...extra });
const EAST = 'Azure/eastus', WEST = 'Azure/westeurope';

test('the beat is Needs and its sentence names the region; the questions speak in sentences', () => {
  assert.equal(PJ.BEATS[B.intent].short, 'Needs');
  assert.equal(PJ.lineOf('intent', { region: { label: 'East US' } }), 'What does East US need?');
  assert.deepEqual(W.INTENT.map(q => W.INTENT_SENTENCE[q.key].stem), ['This region is', 'Its traffic', 'Its path', 'Routing']);
  for (const q of W.INTENT) for (const o of q.opts) assert.ok(W.INTENT_SENTENCE[q.key].verbs[o.key], `${q.key}.${o.key}`);
  assert.deepEqual(W.INTENT[0].opts.map(o => W.INTENT_SENTENCE.purpose.verbs[o.key]), ['critical', 'production', 'a lab']);
});

test('the questions sit under the picked region; defaults show as chosen until changed; an answer is stored for that region only', () => {
  const c = at(); const v = vals(c);
  assert.equal(v.jr.needs.region, 'East US'); assert.deepEqual(v.jr.needs.questions.map(q => q.stem), ['This region is', 'Its traffic', 'Its path', 'Routing']);
  const purpose = v.jr.needs.questions[0]; assert.deepEqual(purpose.opts.map(o => [o.verb, o.on]), [['critical', false], ['production', true], ['a lab', false]], 'the deck default reads as chosen');
  assert.equal(v.jr.needs.defaulted, true);
  purpose.opts[0].go(); assert.deepEqual(c.state.intents, { [EAST]: { purpose: 'critical' } });
  const w = vals(c); assert.equal(w.jr.needs.defaulted, false); assert.equal(w.jr.needs.questions[0].opts[0].on, true);
  assert.equal(w.jr.regions.find(r => r.key === EAST).needs, true); assert.equal(w.jr.regions.find(r => r.key === WEST).needs, false, 'only the picked region carries the questions');
});

test('the copy toggle: on by default, names the other region, copies only into regions without answers; absent with one region', () => {
  const c = at({ intents: { [EAST]: { purpose: 'critical' } } }); let v = vals(c);
  assert.deepEqual([v.jr.needs.copy.has, v.jr.needs.copy.on, v.jr.needs.copy.other], [true, true, 'West Europe']);
  v.jr.act.go(); assert.equal(c.state.jStep, B.recommend); assert.deepEqual(c.state.intents[WEST], { purpose: 'critical' }, 'copied');
  const d = at({ intents: { [EAST]: { purpose: 'critical' }, [WEST]: { purpose: 'lab' } } }); v = vals(d); v.jr.act.go();
  assert.deepEqual(d.state.intents[WEST], { purpose: 'lab' }, 'never overwrites an answered region');
  const e = at({ intents: { [EAST]: { purpose: 'critical' } } }); vals(e).jr.needs.copy.toggle(); assert.equal(e.state.jCopy, false); vals(e).jr.act.go(); assert.equal(e.state.intents[WEST], undefined);
  const one = mkC({ journey: true, jStep: B.intent, jProv: 'Azure', jScan: 4, jRegion: 'Azure/eastus' });
  useData(one, { circuits: [], cloudLinks: [], discovery: [{ csp: 'Azure', region: 'eastus', vpcs: [] }] }); Object.assign(one.state, { journey: true, jStep: B.intent, jProv: 'Azure', jScan: 4, jRegion: 'Azure/eastus' });
  const o = vals(one); assert.equal(o.jr.needs.copy.has, false, 'one region, no toggle');
  one.setState({ jStep: B.request, requests: [{ csp: 'Azure', region: 'eastus', option: 'byo', answers: {}, defaulted: true }] }); assert.equal(vals(one).jr.act.label, 'Open Cloud discovery', 'one region, no loop');
});

test('Request loops: after East US the act reads Next: West Europe and lands on its Needs with the copied answers; after the last, Open Cloud discovery', () => {
  const c = at({ jStep: B.recommend, intents: { [EAST]: { purpose: 'critical' }, [WEST]: { purpose: 'critical' } } });
  vals(c).jr.act.go(); assert.equal(c.state.jStep, B.request); assert.equal(c.state.requests.length, 1);
  let v = vals(c); assert.equal(v.jr.act.label, 'Next: West Europe'); v.jr.act.go();
  assert.equal(c.state.jRegion, WEST); assert.equal(c.state.jStep, B.intent); v = vals(c); assert.equal(v.jr.needs.region, 'West Europe'); assert.equal(v.jr.needs.questions[0].opts[0].on, true);
  v.jr.act.go(); vals(c).jr.act.go(); assert.equal(c.state.requests.length, 2); assert.equal(vals(c).jr.act.label, 'Open Cloud discovery');
  assert.deepEqual(c.state.requests.map(r => r.answers.purpose), ['critical', 'critical']);
});

test('Recommended reads the region\'s answers the journey wrote, and writes to the same store', () => {
  const c = mkC({ fixture: 'calloway', page: 'recommended', region: { csp: 'Azure', region: 'eastus' }, intents: { [EAST]: { routing: 'hub' } } });
  const v = vals(c);
  assert.deepEqual(v.rc.options.map(o => o.key), W.rankWays('Azure', { routing: 'hub' }, 99).map(r => r.key));
  v.rc.intent.find(q => q.key === 'security').opts.find(o => o.key === 'inspected').go();
  assert.deepEqual(c.state.intents[EAST], { routing: 'hub', security: 'inspected' });
  assert.deepEqual(vals(mkC({ fixture: 'calloway', page: 'recommended', region: { csp: 'Azure', region: 'westeurope' }, intents: { [EAST]: { routing: 'hub' } } })).rc.options.map(o => o.key), W.rankWays('Azure', {}, 99).map(r => r.key), 'another region is untouched');
});

test('the markup: the questions live in the cloud node under the picked region, the toggle beside them, no question block under the stage', () => {
  const a = HTML.indexOf('<section class="js"'), blk = HTML.slice(a, HTML.indexOf('</section>', a));
  const cloud = blk.slice(blk.indexOf('class="js-node js-cloud"'), blk.indexOf('class="js-net"'));
  assert.ok(cloud.includes('{{ jr.needs.questions }}') && cloud.includes('{{ q.stem }}') && cloud.includes('{{ o.verb }}') && cloud.includes('{{ jr.needs.copy.toggle }}'));
  assert.equal(blk.includes('{{ jr.intent }}'), false, 'the old block under the stage is gone');
});

test('a customer can add a tag to a region on Found; the tag pre-fills the answers; the path under the stage reads Outside the AT&T network', () => {
  const c = mkC({ fixture: 'calloway', journey: true, jStep: B.found, jProv: 'Azure', jScan: 4, jRegion: EAST });
  let v = vals(c); const east = v.jr.regions.find(r => r.key === EAST);
  assert.deepEqual(east.tags, []); assert.equal(east.canTag, true); east.pick(); assert.equal(c.state.jTagPick, EAST);
  v = vals(c); const pal = v.jr.regions.find(r => r.key === EAST).palette;
  assert.deepEqual(pal.map(t => t.t), ['PCI', 'Finance', 'Prod', 'Internet-facing', 'Dev/Lab', 'GPU/AI']);
  pal.find(t => t.t === 'Dev/Lab').go(); assert.deepEqual(c.state.rtags[EAST], ['Dev/Lab']); assert.equal(c.state.jTagPick, null);
  v = vals(c); assert.deepEqual(v.jr.regions.find(r => r.key === EAST).tags.map(t => t.t), ['Dev/Lab']); assert.deepEqual(v.jr.regions.find(r => r.key === WEST).tags, [], 'the other region is untouched');
  c.setState({ jStep: B.intent }); v = vals(c);
  assert.equal(v.jr.needs.questions[0].opts.find(o => o.key === 'lab').on, true, 'Dev/Lab reads as a lab'); assert.equal(v.jr.needs.defaulted, true); assert.match(v.jr.needs.hint, /from your tags/);
  v.jr.regions.find(r => r.key === EAST).tags[0].go(); assert.deepEqual(c.state.rtags[EAST], [], 'a tag chip removes itself');
  assert.ok(HTML.includes('<small>{{ jr.netWord }}</small>') && !HTML.includes('Public internet'), 'the path is named by what it is not');
  assert.equal(vals(c).jr.netWord, 'Not on AT&T network');
});

test('at Needs only the picked region shows, in a two-by-two of questions; tags show on Found and Needs or when set', () => {
  const c = at({ jStep: B.intent }); const v = vals(c);
  assert.deepEqual(v.jr.regions.map(r => [r.label, r.show]), [['East US', true], ['West Europe', false]]);
  assert.equal(v.jr.regions[0].showTags, true);
  c.setState({ jStep: B.recommend }); const w = vals(c); assert.deepEqual(w.jr.regions.map(r => r.show), [true, true]); assert.equal(w.jr.regions[0].showTags, false);
  c.setState({ rtags: { [EAST]: ['PCI'] } }); assert.equal(vals(c).jr.regions[0].showTags, true, 'a set tag always shows');
  assert.ok(HTML.includes('{{ rg.show }}') && HTML.includes('{{ rg.showTags }}'));
});

