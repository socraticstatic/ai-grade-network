import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals, defaults, useData } from '../naas-portal-app.js';
import * as PJ from '../naas-portal-journey.js';
import * as W from '../naas-ways.js';

// The journey as the portal page draws it (drop 2, task 2): the stepper replaces the rail, one stage of three nodes
// and two wires, one sentence and one action a beat; doors from the rail and from Connect with AT&T; the request is
// the same record Recommended writes.
if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0, location: { search: '' } };
const HTML = readFileSync(new URL('../portal.dc.html', import.meta.url), 'utf8');
const mkC = (extra = {}) => { const state = { ...defaults(), ...extra }; return { state, setState: (p) => Object.assign(state, typeof p === 'function' ? p(state) : p) }; };
const at = (extra = {}) => mkC({ fixture: 'calloway', ...extra });
const B = Object.fromEntries(PJ.BEATS.map((b, i) => [b.key, i]));

test('Connect a cloud sits at the top of the rail and opens the journey clean on Today; the stepper replaces the rail', () => {
  const c = at(); const v = vals(c);
  assert.equal(v.rail[0].label, 'Connect a cloud'); assert.deepEqual(v.rail.slice(1).map(r => r.label), ['Last mile', 'Cloud connections', 'Cloud discovery', 'Recommended']);
  v.rail[0].go(); assert.equal(c.state.journey, true); assert.equal(c.state.jStep, 0);
  const w = vals(c); assert.equal(w.journeyOn, true); assert.equal(w.showRail, false);
  assert.deepEqual(w.jr.steps.map(s => s.label), ['Today', 'Source', 'Found', 'Needs', 'Recommend', 'Request']);
  assert.deepEqual(w.jr.steps.map(s => s.state), ['cur', 'next', 'next', 'next', 'next', 'next']);
  assert.deepEqual(w.jr.steps.map(s => s.off), [false, false, true, true, true, true], 'Found and after open once a cloud is read');
  assert.equal(w.jr.line, 'AT&T already carries your 20 circuits.'); assert.equal(w.jr.sites.n, '20'); assert.equal(w.jr.sites.cells.length, 20);
  assert.equal(w.jr.cloud.unknown, true); assert.equal(w.jr.act.label, 'Find your clouds');
  w.jr.exit(); assert.equal(c.state.journey, false); assert.equal(vals(c).showRail, true);
});

test('Source: pick a live cloud, read it; the scan ticks four steps and lands on Found with the regions', () => {
  const c = at({ journey: true, jStep: B.source }); let v = vals(c);
  assert.equal(v.jr.cloud.picking, true); assert.deepEqual(v.jr.providers.map(p => [p.key, p.on, p.live]), [['Azure', true, true], ['AWS', false, false], ['GCP', false, false], ['Oracle', false, false]]); assert.ok(v.jr.providers.every(p => !p.off), 'every cloud can be read');
  assert.equal(v.jr.act.label, 'Read it'); assert.equal(v.jr.act.off, false);
  v.jr.act.go(); assert.equal(c.state.jScan, 0); v = vals(c); assert.equal(v.jr.cloud.scanning, true); assert.equal(v.jr.act.busy, true); assert.equal(v.jr.act.off, true);
  for (let i = 1; i <= 4; i++) c.setState(vals(c).jr.scanTick());
  assert.equal(c.state.jStep, B.found); assert.equal(c.state.jScan, 4);
  v = vals(c); assert.equal(v.jr.cloud.found, true); assert.equal(v.jr.line, 'Azure: 2 regions, 5 VNets, 12 subnets.');
  assert.deepEqual(v.jr.regions.map(r => [r.label, r.on, r.picked]), [['East US', false, true], ['West Europe', false, false]], 'the first region not on AT&T is picked');
  assert.equal(v.jr.net, 'public', 'regions off AT&T ride the public internet'); assert.equal(v.jr.act.label, 'Say what it needs');
});

test('a cloud with nothing discovered ends the scan on Nothing found and offers another cloud; never a blank node', () => {
  const c = at({ journey: true, jStep: B.found, jProv: 'AWS', jScan: 4 }); const v = vals(c);
  assert.equal(v.jr.cloud.found, false); assert.equal(v.jr.cloud.empty, true); assert.equal(v.jr.line, 'Nothing found on AWS yet.');
  assert.equal(v.jr.act.label, 'Read another cloud'); v.jr.act.go(); assert.equal(c.state.jStep, B.source);
});

test('Needs writes the region\'s answers; Recommend shows the top three with rings and a pick; Request writes one record', () => {
  const c = at({ journey: true, jStep: B.intent, jProv: 'Azure', jScan: 4, jRegion: 'Azure/eastus' }); let v = vals(c);
  assert.equal(v.jr.line, 'What does East US need?'); assert.equal(v.jr.needs.questions.length, 4);
  v.jr.needs.questions[2].opts.find(o => o.key === 'inspected').go(); assert.equal(c.state.intents['Azure/eastus'].security, 'inspected');
  v = vals(c); v.jr.act.go(); assert.equal(c.state.jStep, B.recommend); v = vals(c);
  assert.equal(v.jr.options.length, 3); assert.deepEqual(v.jr.options.map(o => o.key), W.rankWays('Azure', { security: 'inspected' }, 3).map(r => r.key));
  assert.equal(v.jr.options[0].on, true, 'the top pick is picked'); assert.ok(v.jr.options.every(o => /%$/.test(o.ptsPct) && o.label && o.price));
  assert.equal(v.jr.link, 'proposed'); assert.equal(v.jr.linkWord, v.jr.options[0].label);
  v.jr.options[1].go(); assert.equal(c.state.jPick, v.jr.options[1].key);
  v = vals(c); assert.equal(v.jr.act.label, 'Request this'); v.jr.act.go();
  assert.equal(c.state.requests.length, 1); assert.deepEqual([c.state.requests[0].csp, c.state.requests[0].region, c.state.requests[0].option], ['Azure', 'eastus', v.jr.options[1].key]);
  assert.equal(c.state.jStep, B.request); v = vals(c);
  assert.match(v.jr.line, /^Requested .+ for East US\.$/); assert.equal(v.jr.link, 'proposed'); assert.equal(v.jr.act.label, 'Next: West Europe', 'the loop offers the other region');
  v.jr.exit(); assert.equal(c.state.journey, false);
  const rc = vals(mkC({ fixture: 'calloway', page: 'recommended', region: { csp: 'Azure', region: 'eastus' }, requests: c.state.requests })).rc;
  assert.equal(rc.requested, true, 'Recommended reads the same record');
});

test('Connect with AT&T from Discovery lands in the journey at Found with that region; Back from there returns to Discovery', () => {
  const c = at({ page: 'discovery' }); const v = vals(c);
  v.dv.rows.find(r => r.regionKey === 'westeurope').connect();
  assert.equal(c.state.journey, true); assert.equal(c.state.jStep, B.found); assert.equal(c.state.jProv, 'Azure'); assert.equal(c.state.jRegion, 'Azure/westeurope'); assert.equal(c.state.jFrom, 'discovery');
  const w = vals(c); assert.equal(w.jr.regions.find(r => r.region === 'westeurope').picked, true);
  w.jr.back(); assert.equal(c.state.journey, false); assert.equal(c.state.page, 'discovery');
});

test('the markup: the stepper, the stage of three nodes and two wires, the internet path, the intent, the options, one action', () => {
  const a = HTML.indexOf('<section class="js"'), blk = HTML.slice(a, HTML.indexOf('</section>', a));
  assert.match(blk, /<ol class="js-steps"[^>]*><sc-for list="\{\{ jr\.steps \}\}"/);
  assert.equal((blk.match(/class="js-node /g) || []).length, 3); assert.equal((blk.match(/class="js-wire"/g) || []).length, 2);
  for (const k of ['{{ jr.line }}', '{{ jr.net }}', '{{ jr.sites.cells }}', '{{ jr.providers }}', '{{ jr.regions }}', '{{ jr.needs.questions }}', '{{ jr.options }}', '{{ jr.act.go }}', '{{ jr.back }}']) assert.ok(blk.includes(k), k);
  assert.ok(!/workload/i.test(blk));
  const hdr = HTML.slice(HTML.indexOf('<header'), HTML.indexOf('</header>'));
  assert.match(hdr, /<sc-if value="\{\{ journeyOn \}\}"[^>]*><button class="hdr-cust" onClick="\{\{ jr\.exit \}\}"/);
});
