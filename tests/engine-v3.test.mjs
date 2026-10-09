import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';
import * as D from '../naas-data.js';
import { evalPolicies, ROUTE_RULES, forbidsInternet } from '../naas-policy-layers.js';
import * as A from '../naas-addendum.js';
import { decide, flowSheet, STAMP } from '../naas-policy-model.js';

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

test('the engine opens on a real flow that breaks: the decider lit, three layers holding, the cloud violated with its code', () => {
  // Honest since 2026-10-09: no contest to stage (a later policy agrees or adds; nothing is overridden), so the engine
  // opens on the real flow that breaks with the most layers still holding.
  for (const view of ['partial', 'mature', 'trust']) {
    const v = vals(eng(view));
    assert.equal(v.engExamples[0].key, 'violated'); assert.equal(v.engExamples[0].on, true);
    const lit = v.engLadder.filter(x => x.lit);
    assert.equal(lit.length, 1);
    assert.equal(lit[0].name, v.engDecided); assert.equal(lit[0].state, 'decides'); assert.equal(lit[0].word, 'Decides');
    assert.equal(v.engCompWord, 'Violated'); assert.equal(v.engWhatIf, false, 'a real flow, workloads behind it');
    assert.deepEqual(v.engStations.map(x => x.state), ['set', 'set', 'set', 'broken'], view);
    const cloud = v.engStations[3];
    assert.equal(cloud.hasCode, false, 'EXPOSED only repeats "6 exposed": it stays in the tooltip'); assert.equal(cloud.stamp, 'close-circle');
    assert.match(cloud.title, /Cloud & workload: Violated \(CLOUD_EXPOSED\)\. 6 exposed, asked by PCI private path/);
  }
});

test('the ladder lists every live policy in the order the engine reads them, numbered as Violations & policies numbers them', () => {
  for (const view of ['partial', 'mature', 'trust']) {
    const est = D.ESTATES[view], v = vals(eng(view));
    const order = evalPolicies(est, est.policies).ordered.map(p => p.name);
    assert.deepEqual(v.engLadder.map(x => x.name), order, view);
    assert.deepEqual(v.engLadder.map(x => x.prio), order.map((_, i) => String(i + 1)));
    for (const r of v.engLadder) { assert.ok(['decides', 'adds', 'agrees', 'staged', 'skip'].includes(r.state)); assert.ok(onDisk(r.glyph) && onDisk(r.icon), r.name); assert.ok(r.title); }
    assert.equal(v.engMatchN, v.engLadder.filter(x => x.state !== 'skip').length);
  }
});

test('a private-path or no-internet intent denies a flow to the Internet; inspection applies to it; a flow to a cloud is allowed', () => {
  const est = D.ESTATES.partial, all = est.policies, from = 'Private cloud · Equinix DC2, Ashburn', inv = A.inventory(est);
  const pci = decide(est, all, { from, to: 'the Internet', tag: 'PCI' }, { inv });
  assert.equal(pci.verdict, 'Denied'); assert.equal(pci.decidedBy, 'PCI private path');
  const prod = decide(est, all, { from, to: 'the Internet', tag: 'Prod' }, { inv });
  assert.equal(prod.verdict, 'Denied'); assert.equal(prod.decidedBy, 'Prod no direct internet');
  const web = decide(est, all, { from, to: 'the Internet', tag: 'Internet-facing' }, { inv });
  assert.equal(web.verdict, 'Allowed'); assert.equal(web.decidedBy, 'Internet-facing inspection');
  assert.equal(decide(est, all, { from, to: 'AWS eu-west-1', tag: 'PCI' }, { inv }).verdict, 'Allowed');
  assert.equal(decide(est, all, { from, to: 'the Internet', tag: '' }, { inv }).decidedBy, '', 'no policy: the default path');
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
  for (const x of v.engStations) { assert.ok(onDisk(x.icon)); assert.ok(Object.values(STAMP).some(S => S.ps === x.state), x.state); if (x.hasStamp) assert.ok(onDisk(x.stamp), x.stamp); }
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
  // Denied: the badge, the site blocks where it would break out, the rest off the path, and the decider still a door.
  vals(c).engExamples.find(x => x.key === 'denied').go();
  v = vals(c);
  assert.equal(v.engVerdict, 'Denied'); assert.equal(v.engVerdictCls, 'deny'); assert.equal(v.engVerdictIcon, 'close-circle');
  assert.deepEqual(v.engStations.map(x => x.state), ['down', 'none', 'none', 'none']);
  assert.equal(v.engStations[0].code.replace(/\u200b/g, ''), 'BREAKOUT_BLOCKED'); assert.equal(v.engStations[1].text, 'Not on path');
  assert.equal(v.engCompWord, 'Holds');
  assert.equal(v.engAll, false, 'an example starts on the pushed rules');
  // No policy: the default path, nothing pushed.
  vals(c).engExamples.find(x => x.key === 'free').go();
  v = vals(c);
  assert.equal(v.engDecidedIsDefault, true); assert.equal(v.engDecided, 'Default path');
  assert.equal(v.engSheetN, 0); assert.equal(v.noEngPushed, true);
  assert.ok(v.engLadder.every(x => x.state === 'skip'));
  assert.ok(v.engLadder.every(x => /^(Not this tag|Not from here|Not to here|No match)$/.test(x.word)), 'a miss names the side that missed');
  assert.equal(v.engCompWord, 'Nothing asked');
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

test('the head counts what decides, what is violated on real flows and what matches nothing; Clean only when none', () => {
  const c = eng();
  let v = vals(c);
  assert.deepEqual(v.engHeadChips.map(x => `${x.key}:${x.t}`), ['pol:4', 'viol:3', 'dead:2'], 'four enforced decide; three staged wait');
  assert.ok(v.engHeadChips.every(x => onDisk(x.icon) && x.title));
  assert.match(v.engHeadChips[1].title, /PCI private path \(CLOUD_EXPOSED\)/);
  assert.match(v.engHeadChips[2].title, /Finance segmentation, no site is in Finance; GPU latency SLO, no workload is tagged GPU/);
  assert.ok(!v.engHeadChips.some(x => x.key === 'clean'), 'never Clean while Govern counts PCI exposed');
  assert.ok(vals(mkC({ view: 'partial', estateParam: null, screen: 's3', layer: 'cloud', tab: 'govern', govPanel: 'policies' })).verdictChips.some(x => /exposed/.test(x.label)));
  // Staged: three wait; the toggle reads them as if enforced, and EU residency now decides westeurope.
  assert.equal(v.hasEngStaged, true); assert.equal(v.engStagedN, '3'); assert.equal(v.engStaged, false);
  v.toggleEngStaged(); v = vals(c);
  assert.equal(v.engStaged, true); assert.equal(v.engHeadChips[0].t, '7');
  vals(c).engPickers[1].options.find(o => o.label === 'Azure westeurope').go(); vals(c).engPickers[2].options.find(o => o.label === 'Nothing tagged').go();
  v = vals(c);
  assert.equal(v.engDecided, 'EU residency');
  v.toggleEngStaged(); v = vals(c);
  assert.equal(v.engDecidedIsDefault, true, 'enforced only: no policy decides westeurope');
  assert.equal(v.engLadder.find(x => x.name === 'EU residency').word, 'Staged');
  // A what-if: a flow no workload makes says so.
  vals(c).engPickers[1].options.find(o => o.label === 'AWS eu-west-1').go(); vals(c).engPickers[2].options.find(o => o.label === 'tag PCI').go();
  v = vals(c);
  assert.equal(v.engWhatIf, true); assert.match(v.engWhatIfTitle, /No workload carries PCI in AWS eu-west-1 today/);
  const sm = vals(eng('small'));
  assert.equal(sm.engHas, false); assert.equal(sm.engEmpty, true);
  assert.match(sm.engEmptyText, /No data center or private cloud/);
  assert.equal(sm.hasEngExamples, false); assert.equal(sm.hasEngStaged, false);
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
  assert.match(blk, /<em class="ps-stamp" role="img" aria-label="\{\{ st\.stampWord \}\}">/);
  assert.match(blk, /<sc-if value="\{\{ st\.hasCode \}\}"[^>]*><code class="eng-code">\{\{ st\.code \}\}<\/code>/);
  assert.match(blk, /<span class="eng-comp" title="\{\{ engCompTitle \}\}"/);
  assert.match(blk, /<button class="eng-stg" aria-pressed="\{\{ engStaged \}\}" onClick="\{\{ toggleEngStaged \}\}"/);
  assert.match(blk, /<div role="listitem" class="fw-row eng-rule">/);
  assert.match(blk, /<span class="fw-toggle sm inert" aria-pressed="\{\{ dr\.on \}\}"/);
  assert.match(blk, /<sc-if value="\{\{ engAll \}\}"[^>]*><div class="eng-sheet"/);
  assert.doesNotMatch(blk, /<(svg|table|select)\b/);
  assert.doesNotMatch(blk, /engFrom|engTo\b|engTag\b|engSheetCols|engTrace/, 'the chip wall and the old trace left');
});
