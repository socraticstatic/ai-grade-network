import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import * as J from '../naas-journey.js';
import { mkC } from './harness.mjs';

// The journey lives in the rail (Micah, 2026-10-12: "The drop down on the top is a temporary solution. I need it fully
// integrated and obvious in the site" ... "move it into the rail", "also 2" = a door in the home hero). The header's
// Customer select goes; in the journey the header keeps one exit, Dashboard.
if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const home = (view, extra = {}) => mkC({ view, estateParam: null, screen: 's0', layer: 'cloud', tab: 'connect', ...extra });
const railItem = (v, label) => v.railGroups.flatMap(g => g.items).find(i => i.label === label);
const T = 'Connect a cloud';

test('Connect a cloud sits under NaaS at the top of the rail, on every estate', () => {
  for (const view of ['empty', 'lastmile', 'small', 'partial', 'mature', 'trust']) {
    const v = vals(home(view));
    assert.deepEqual(v.railGroups[0].items.map(i => i.label), ['NaaS', T], view);
    assert.equal(railItem(v, T).sub, '', `${view}: no progress before it starts`);
  }
});

test('from any estate it starts the journey clean, on its first beat', () => {
  const c = home('partial', { addedSources: [{ provider: 'Azure', estId: 'lastmile', name: 'x', cadence: 'daily', at: 1 }], orders: [{ id: 'o1', journey: true }] });
  railItem(vals(c), T).go();
  assert.equal(c.state.journey, 'existing'); assert.equal(c.state.view, J.JOURNEY_ESTATE); assert.equal(c.state.screen, 'sj'); assert.equal(c.state.jStep, 0);
  assert.equal(c.state.addedSources.length, 0, 'a rehearsal\'s source is gone'); assert.equal(c.state.orders.length, 0, 'and its order');
});

test('left mid-way, the rail item carries the step and resumes there', () => {
  const c = home('lastmile', { jStep: 3 });
  const it = railItem(vals(c), T);
  assert.equal(it.sub, 'Step 4 of 10 · Tag');
  it.go();
  assert.equal(c.state.journey, 'existing'); assert.equal(c.state.screen, 'sj'); assert.equal(c.state.jStep, 3, 'resumes, never resets');
});

test('the home hero offers the journey as a second button where the hero is not the journey already', () => {
  const v = vals(home('partial'));
  assert.equal(v.homeTake.hasAlt, true); assert.equal(v.homeTake.alt.label, T);
  const c = home('partial'); vals(c).homeTake.alt.go();
  assert.equal(c.state.journey, 'existing'); assert.equal(c.state.screen, 'sj');
  const lm = vals(home('lastmile')).homeTake;
  assert.equal(lm.cta, 'Find your clouds'); assert.equal(lm.hasAlt, false, 'the lastmile hero is the journey');
});

test('in the journey the header has one exit, Dashboard, and the NaaS pill leaves too', () => {
  const c = home('lastmile', { journey: 'existing', screen: 'sj', jStep: 2 });
  const v = vals(c);
  assert.equal(v.journeyOn, true);
  v.jExit();
  assert.equal(c.state.journey, null); assert.equal(c.state.screen, 's0'); assert.equal(c.state.jStep, 2, 'the step survives the exit');
  const p = home('lastmile', { journey: 'existing', screen: 'sj', jStep: 2 });
  vals(p).pills.find(x => x.label === 'NaaS').go();
  assert.equal(p.state.journey, null, 'the NaaS pill is a dashboard door'); assert.equal(p.state.screen, 's0');
});

test('the markup: no Customer select; a Dashboard exit under journeyOn; the hero alt under hasAlt', () => {
  assert.equal(HTML.includes('aria-label="Customer"'), false, 'the header dropdown is gone');
  assert.equal(HTML.includes('{{ setJourney }}'), false);
  const hdr = HTML.slice(HTML.indexOf('<header'), HTML.indexOf('</header>'));
  assert.match(hdr, /<sc-if value="\{\{ journeyOn \}\}"[^>]*><button class="hdr-cust" onClick="\{\{ jExit \}\}"/);
  assert.match(HTML, /<sc-if value="\{\{ homeTake\.hasAlt \}\}"[^>]*><button onClick="\{\{ homeTake\.alt\.go \}\}" class="hm-cta alt">\{\{ homeTake\.alt\.label \}\}/);
});
