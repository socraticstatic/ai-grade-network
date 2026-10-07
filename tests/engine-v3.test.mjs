import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';
import * as D from '../naas-data.js';
import { effectivePolicy, flowSheet, evalPolicies, ROUTE_RULES, forbidsInternet } from '../naas-policy-layers.js';

// The policy engine as an engine (Micah, 2026-10-07: "The policy engine needs a deep UI and UX pass"). Left to right:
// a flow goes in (three pickers in place of a wall of 22 chips), every live policy is read in precedence order (the
// one that decides is lit, the rest say Overridden or Skips), the result comes out (the verdict, what each station
// enforces, and only the route rules NetBond pushes; the whole sheet one click away). It can say Denied now: a
// private-path or no-internet intent forbids the public internet outright.
if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const onDisk = (n) => existsSync(new URL(`../brand/icons/${n}.svg`, import.meta.url));
const eng = (view = 'partial', extra = {}) => mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'govern', govPanel: 'engine', ...extra });

test('the flow is three pickers, each a glyph and its value, with the options behind it', () => {
  const c = eng();
  let v = vals(c);
  assert.deepEqual(v.engPickers.map(p => p.word), ['From', 'To', 'Carrying']);
  for (const p of v.engPickers) {
    assert.ok(p.value && onDisk(p.icon), p.word);
    assert.equal(p.open, false);
    assert.equal(p.options.filter(o => o.on).length, 1, `${p.word}: one option is the current one`);
    for (const o of p.options) assert.ok(onDisk(o.icon), o.label);
  }
  assert.equal(v.engPickers[1].options.find(o => o.label === 'the Internet').icon, 'globe');
  v.engPickers[1].toggle();
  v = vals(c);
  assert.equal(v.engPickers[1].open, true);
  assert.equal(v.engPickOpen, true);
  const to = v.engPickers[1].options.find(o => !o.on && o.label !== 'the Internet');
  to.go();
  v = vals(c);
  assert.equal(v.engPickOpen, false, 'a pick closes the list');
  assert.equal(v.engPickers[1].value, to.short);
  v.engPickers[0].toggle(); vals(c).closePick();
  assert.equal(vals(c).engPickOpen, false, 'the scrim closes it too');
});

test('the engine opens on a contest: two policies meet, the first in precedence decides, the other is overridden', () => {
  for (const view of ['partial', 'mature']) {
    const v = vals(eng(view));
    assert.ok(v.engMatchN >= 2, `${view}: ${v.engMatchN} policies meet`);
    const lit = v.engLadder.filter(x => x.lit);
    assert.equal(lit.length, 1);
    assert.equal(lit[0].name, v.engDecided);
    assert.equal(lit[0].state, 'won');
    assert.ok(v.engLadder.some(x => x.state === 'over'), `${view}: something is overridden`);
    assert.equal(v.engExamples[0].word, 'Contested');
    assert.equal(v.engExamples[0].on, true);
  }
  // Bank scale has no flow two policies meet; its first example says Decided, not Contested.
  assert.equal(vals(eng('trust')).engExamples[0].word, 'Decided');
});

test('the ladder lists every live policy in the order the engine reads them, numbered as Violations & policies numbers them', () => {
  for (const view of ['partial', 'mature', 'trust']) {
    const est = D.ESTATES[view], v = vals(eng(view));
    const order = evalPolicies(est, est.policies).ordered.map(p => p.name);
    assert.deepEqual(v.engLadder.map(x => x.name), order, view);
    assert.deepEqual(v.engLadder.map(x => x.prio), order.map((_, i) => String(i + 1)));
    for (const r of v.engLadder) { assert.ok(['won', 'over', 'skip'].includes(r.state)); assert.ok(onDisk(r.glyph) && onDisk(r.icon), r.name); assert.ok(r.title); }
    assert.equal(v.engMatchN, v.engLadder.filter(x => x.state !== 'skip').length);
  }
});

test('a private-path or no-internet intent denies a flow to the Internet; inspection applies to it; a flow to a cloud is allowed', () => {
  const est = D.ESTATES.partial, all = est.policies, from = 'Private cloud · Equinix DC2, Ashburn';
  const pci = effectivePolicy(est, all, { from, to: 'the Internet', tag: 'PCI' });
  assert.equal(pci.verdict, 'Denied'); assert.equal(pci.decidedBy, 'PCI private path');
  const prod = effectivePolicy(est, all, { from, to: 'the Internet', tag: 'Prod' });
  assert.equal(prod.verdict, 'Denied'); assert.equal(prod.decidedBy, 'Prod no direct internet');
  const web = effectivePolicy(est, all, { from, to: 'the Internet', tag: 'Internet-facing' });
  assert.equal(web.verdict, 'Allowed'); assert.equal(web.decidedBy, 'Internet-facing inspection');
  assert.equal(effectivePolicy(est, all, { from, to: 'AWS eu-west-1', tag: 'PCI' }).verdict, 'Allowed');
  assert.equal(effectivePolicy(est, all, { from, to: 'the Internet', tag: '' }).decidedBy, 'No policy: the default path');
  assert.ok(forbidsInternet({ req: 'No direct internet path' }) && forbidsInternet({ req: 'Private path required' }) && !forbidsInternet({ req: 'Inline security inspection' }));
  // A denied flow to the Internet pushes its deny alone; the private path's allow is not for it.
  const sheet = flowSheet(est, all, { from, to: 'the Internet', tag: 'PCI' });
  const on = sheet.flatMap(s => s.rules.filter(r => r.o2p.on || r.p2o.on).map(r => `${s.key}:${r.id}`));
  assert.deepEqual(on, ['deny:block-default-routes']);
});

test('the result: the verdict, the decider as a door, four stations, and only the pushed rules until you ask for all', () => {
  const c = eng();
  let v = vals(c);
  assert.equal(v.engVerdict, 'Allowed'); assert.equal(v.engVerdictCls, 'allow');
  assert.equal(v.engDecidedIsPolicy, true);
  assert.deepEqual(v.engStations.map(x => x.station), ['Sites', 'Edge', 'Core', 'Cloud']);
  for (const x of v.engStations) { assert.ok(onDisk(x.icon)); assert.equal(x.state, x.text === 'Any' ? 'any' : 'set'); }
  assert.deepEqual(v.engPushed.map(r => `${r.cls}:${r.label}`), ['deny:Block default routes', 'allow:Matching routes']);
  for (const r of v.engPushed) { assert.ok(r.by && onDisk(r.icon)); assert.ok(r.dirs.length >= 1 && r.dirs.some(d => d.on)); for (const d of r.dirs) assert.match(d.word, /^(On prem → Partner|Partner → On prem)$/); }
  assert.equal(v.engSheetN, 2);
  assert.equal(v.engAll, false); assert.equal(v.engShowStrip, true);
  v.toggleEngAll();
  v = vals(c);
  assert.equal(v.engAll, true); assert.equal(v.engShowStrip, false, 'the whole sheet takes the strip\'s room');
  assert.equal(v.hasEngPushed, false);
  assert.equal(v.engSheet.flatMap(s => s.rules).length, ROUTE_RULES.length);
  assert.deepEqual(v.engSheet.map(s => s.cls), ['deny', 'manip', 'allow', 'adv']);
  // Denied: the badge, the core station broken, and the decider still a door.
  vals(c).engExamples.find(x => x.key === 'denied').go();
  v = vals(c);
  assert.equal(v.engVerdict, 'Denied'); assert.equal(v.engVerdictCls, 'deny'); assert.equal(v.engVerdictIcon, 'close-circle');
  assert.equal(v.engStations.find(x => x.key === 'core').state, 'broken');
  assert.equal(v.engAll, false, 'an example starts on the pushed rules');
  // No policy: the default path, nothing pushed.
  vals(c).engExamples.find(x => x.key === 'free').go();
  v = vals(c);
  assert.equal(v.engDecidedIsDefault, true); assert.equal(v.engDecided, 'Default path');
  assert.equal(v.engSheetN, 0); assert.equal(v.noEngPushed, true);
  assert.ok(v.engLadder.every(x => x.state === 'skip'));
});

test('a policy on the ladder opens in Violations & policies, its row open on its page, and the page keeps the fold', () => {
  const c = eng();
  const lad = vals(c).engLadder;
  lad[lad.length - 1].go();
  assert.equal(c.state.govPanel, 'policies');
  assert.equal(c.state.polOpen, lad[lad.length - 1].name);
  const v = vals(c);
  assert.equal(v.polPageSize, 4, 'an open row takes a slot');
  assert.ok(v.polRows.some(r => r.name === lad[lad.length - 1].name && r.open), 'the policy is on the page it opened to, and open');
});

test('the head says what the engine holds in glyph chips, and an estate with no flow says so', () => {
  const v = vals(eng());
  assert.equal(v.engHeadChips[0].t, '7');
  assert.ok(v.engHeadChips.every(x => onDisk(x.icon) && x.title));
  const sm = vals(eng('small'));
  assert.equal(sm.engHas, false); assert.equal(sm.engEmpty, true);
  assert.match(sm.engEmptyText, /No data center or private cloud/);
  assert.equal(sm.hasEngExamples, false);
});

test('Govern\'s head is chips with their doors: enforced opens the filter, the finding its drill', () => {
  const c = mkC({ view: 'partial', estateParam: null, screen: 's3', layer: 'cloud', tab: 'govern', govPanel: 'policies' });
  const v = vals(c);
  assert.equal(v.hasVerdictChips, true);
  assert.deepEqual(v.verdictChips.map(x => [x.icon, x.n, x.label]), [['check-shield', '4', 'enforced'], ['globe', '6', 'PCI exposed']]);
  assert.equal(v.verdictChips[1].title, '6 PCI-tagged workloads reach the internet directly');
  v.verdictChips[0].go();
  assert.equal(c.state.polFilter, 'enforced');
});

test('the markup reads left to right: flow, policies in order, result; NetBond\'s rows; nothing loops in an svg, table or select', () => {
  const a = HTML.indexOf('<sc-if value="{{ govPanelEngine }}"'), b = HTML.indexOf('<sc-if value="{{ govPanelTemplates }}"', a);
  const blk = HTML.slice(a, b);
  const f = blk.indexOf('aria-label="The flow"'), p = blk.indexOf('aria-label="Policies, in precedence order"'), r = blk.indexOf('aria-label="The result"');
  assert.ok(f > 0 && p > f && r > p, 'flow, then policies, then result');
  assert.match(blk, /<sc-for list="\{\{ engPickers \}\}" as="pk"/);
  assert.match(blk, /<button class="eng-pk" onClick="\{\{ pk\.toggle \}\}" aria-expanded="\{\{ pk\.open \}\}"/);
  assert.match(blk, /<sc-if value="\{\{ pk\.open \}\}"[^>]*><div class="eng-menu" role="listbox"/);
  assert.match(blk, /<button class="eng-scrim" onClick="\{\{ closePick \}\}"/);
  assert.match(blk, /<button role="listitem" class="eng-rung" data-state="\{\{ ld\.state \}\}" data-lit="\{\{ ld\.lit \}\}" onClick="\{\{ ld\.go \}\}"/);
  assert.match(blk, /class="fw-prio sm">\{\{ ld\.prio \}\}/);
  assert.match(blk, /class="fw-badge big \{\{ engVerdictCls \}\}"/);
  assert.match(blk, /<div class="ps big eng-ps"[^>]*><sc-for list="\{\{ engStations \}\}"/);
  assert.match(blk, /<div role="listitem" class="fw-row eng-rule">/);
  assert.match(blk, /<span class="fw-toggle sm inert" aria-pressed="\{\{ dr\.on \}\}"/);
  assert.match(blk, /<sc-if value="\{\{ engAll \}\}"[^>]*><div class="eng-sheet"/);
  assert.doesNotMatch(blk, /<(svg|table|select)\b/);
  assert.doesNotMatch(blk, /engFrom|engTo\b|engTag\b|engSheetCols|engTrace/, 'the chip wall and the old trace left');
});
