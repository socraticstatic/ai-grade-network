import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { ROUTE_RULES } from '../naas-policy-layers.js';
import { mkC } from './harness.mjs';

// An order reads the policy engine (2026-10-16). NetBond Advanced's Connection > Policies: the global route policies that
// apply to a connection, inherited, plus the connection's own. The storefront's engine (Govern) is that structure; an
// order's Advanced Settings shows what the engine decides for this connection's flow, and the full route sheet on
// request, the same rows the engine draws. No second model, no separate area (Micah: "RMTK is a policy engine").

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
if (typeof globalThis.requestAnimationFrame === 'undefined') globalThis.requestAnimationFrame = () => 0;
const store = {};
globalThis.localStorage = globalThis.localStorage || { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const S4 = HTML.slice(HTML.indexOf('<sc-if value="{{ sS4 }}"'), HTML.indexOf('</section>\n</sc-if>', HTML.indexOf('<sc-if value="{{ sS4 }}"')));
const ways = (view = 'partial') => mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'connect', cnPage: 'ways' });
const toAdvanced = (type, region = 'AWS us-east-1', metro = null) => {
  const c = ways();
  vals(c).wayTypes.find(t => t.label === type).start();
  vals(c).cfCloudTiles.find(t => t.cloud === region.split(' ')[0]).pick(); vals(c).cfNext();
  vals(c).cfRegionGroups.flatMap(g => g.regions).find(r => r.name === region).pick();
  vals(c).cfBandwidths.find(b => b.label === '1 Gbps').pick();
  const ms = vals(c).cfMetros; (metro ? ms.find(m => m.metro === metro) : ms.find(m => m.pickable)).pick();
  vals(c).cfNext();
  assert.equal(vals(c).cfKey, 'advanced');
  return c;
};

test('an AVPN order\'s Advanced Settings reads the engine for its flow: the policies that apply, in precedence, and what NetBond pushes', () => {
  const c = toAdvanced('DataCenter / CoLocation to Cloud');
  let v = vals(c);
  assert.equal(v.cfEng.has, true);
  assert.match(v.cfEng.flow, /^.+ → AWS us-east-1$/, 'the order\'s site to its region');
  assert.ok(v.cfEng.policyN > 0, 'the estate\'s policies, read for this flow');
  assert.equal(v.cfEng.ladder.length + v.cfEng.skipN, v.cfEng.policyN, 'every policy is a rung or a counted skip');
  assert.ok(v.cfEng.ladder.every(l => ['decides', 'adds', 'agrees', 'staged'].includes(l.state)), 'the ladder here is the policies that apply; the skips are a count');
  assert.match(v.cfEng.skipLine, /^\d+ (other )?polic(y|ies) do(es)? not match this flow$|^$/);
  assert.equal(typeof v.cfEng.pushedN, 'number');
  assert.equal(v.cfEng.all, false);
  assert.equal(v.cfAdvShowReqs, true);
  // The requirement picked joins the ladder as this order's own policy, staged until the order lands.
  v.cfPolicyRouting.find(p => p.key === 'Private path required').pick(); v = vals(c);
  const mine = v.cfEng.ladder.find(l => /^This order/.test(l.name));
  assert.ok(mine, JSON.stringify(v.cfEng.ladder.map(l => [l.name, l.state])));
  assert.ok(['decides', 'adds', 'staged'].includes(mine.state), 'this order\'s policy counts as it will on delivery');
  assert.ok(v.cfEng.pushedN > 0, 'Private path required pushes route rules');
  assert.ok(v.cfEng.pushed.every(p => p.by), 'each pushed rule names the policy that pushes it');
});

test('All N opens the full route sheet, the engine\'s own rows, and the requirements step aside while it is open', () => {
  const c = toAdvanced('DataCenter / CoLocation to Cloud');
  let v = vals(c);
  assert.equal(v.cfEng.allLabel, `All ${ROUTE_RULES.length}`);
  v.cfEng.toggleAll(); v = vals(c);
  assert.equal(v.cfEng.all, true);
  assert.equal(v.cfAdvShowReqs, false);
  assert.deepEqual(v.cfEng.sheet.map(s => [s.key, s.rules.length]), [['deny', 4], ['manip', 4], ['allow', 3], ['advanced', 1]]);
  const att = v.cfEng.sheet[0].rules.find(r => r.key === 'deny:community-value-filter-att');
  assert.equal(att.o2pOff, true, 'a direction the rule does not take is off, as on the engine');
  assert.equal(v.cfEng.allLabel, 'Pushed only');
  v.cfEng.toggleAll(); v = vals(c);
  assert.equal(v.cfAdvShowReqs, true);
});

test('an order with no site of yours, or a hosted way, keeps the plain pushed list: the engine reads flows from your sites', () => {
  const i2c = toAdvanced('Internet to Cloud');
  assert.equal(vals(i2c).cfEng.has, false);
  assert.equal(vals(i2c).cfAdvShowReqs, true);
  const c = ways(); vals(c).wayCards.find(w => w.key === 'peer').start();
  assert.equal(vals(c).cfEng.has, false, 'a hosted order is AT&T\'s to route');
});

test('the markup draws the engine\'s block from the engine\'s rows, and keeps the pushed list for orders the engine cannot read', () => {
  const adv = S4.slice(S4.indexOf('<sc-if value="{{ cfIsAdvanced }}"'), S4.indexOf('<sc-if value="{{ cfIsTerms }}"'));
  for (const b of ['{{ cfEng.has }}', 'list="{{ cfEng.ladder }}"', 'list="{{ cfEng.sheet }}"', 'list="{{ cfEng.chips }}"', '{{ cfEng.toggleAll }}', '{{ cfAdvShowReqs }}', '{{ cfEng.line }}', 'class="eng-ladder"', 'class="eng-sheet']) assert.ok(adv.includes(b), b);
  assert.ok(adv.includes('{{ hasCfRouteRules }}'), 'the plain pushed list stays for orders without a site flow');
  assert.doesNotMatch(adv, /<table\b/);
});
