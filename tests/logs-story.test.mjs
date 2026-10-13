import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// Observe > Logs as a story (2026-10-13, Micah: "Each page should be its own gorgeous, extremely beautiful story, with
// calls to action on each"; "tell the story with less words, and more visualizations, animations and icons"). The verdict
// first, what the traffic did: records, denied, outside AT&T, public destinations, each a glyph and a number that filters
// the table through the one filter grammar (the chips and the Find box, never a new one) and carries its move. Beside it the
// record stream: every record a dot on its pattern's lane in time. Then the evidence, rows that lead with their path as a
// glyph and their action as a verb badge, each opening its path on the map. User activity tells the same story of who
// changed the network.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const logs = (view, patch = {}) => mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'logs', ...patch });
const band = (v, k) => v.logBand.find(x => x.key === k);
const every = (c) => { const out = []; let v = vals(c), g = 0; for (;;) { out.push(...v.flowRecords); if (!v.logPager.many || v.logPager.nextOp < 1 || g++ > 20) break; v.logPager.next(); v = vals(c); } return out; };

test('the verdict counts what the traffic did, over every record, whatever the filters', () => {
  const v = vals(logs('partial'));
  assert.deepEqual(v.logBand.map(x => x.key), ['all', 'deny', 'public', 'internet']);
  assert.deepEqual(v.logBand.map(x => x.n), ['24', '1', '14', '7']);
  for (const x of v.logBand) {
    assert.ok(x.icon && x.label && x.title, `${x.key}: no glyph, label or title`);
    assert.match(x.gb, /^[\d.,]+ GB$/, `${x.key}: bytes read "${x.gb}"`);
    assert.match(x.w, /^\d+(\.\d+)?%$/);
    assert.ok(x.act && x.act.label && typeof x.act.go === 'function', `${x.key}: no move`);
  }
  // A filter on does not move the verdict: it says what the window holds; the table shows the cut.
  const f = vals(logs('partial', { logAct: 'deny' }));
  assert.deepEqual(f.logBand.map(x => x.n), ['24', '1', '14', '7']);
});

test('each verdict is a door: it sets the chip it names, and a second press lets it go', () => {
  const c = logs('partial');
  band(vals(c), 'deny').go();
  assert.equal(c.state.logAct, 'deny');
  assert.equal(band(vals(c), 'deny').on, true);
  assert.equal(vals(c).logActChips.find(x => x.on).key, 'deny', 'the chip does not light with its door');
  assert.ok(every(c).every(r => r.deny));
  band(vals(c), 'deny').go();
  assert.equal(c.state.logAct, 'all');
  band(vals(c), 'public').go();
  assert.equal(c.state.logPath, 'public');
  assert.ok(every(c).every(r => r.path === 'public'));
  band(vals(c), 'internet').go();
  assert.equal(c.state.logPattern, 'internet');
  // Records clears every filter, the Find box too.
  c.setState({ logQ: 'prod' });
  band(vals(c), 'all').go();
  assert.deepEqual([c.state.logQ, c.state.logPath, c.state.logAct, c.state.logPattern], ['', 'all', 'all', 'all']);
  assert.equal(band(vals(c), 'all').on, true);
  // A zero is no door (Trinity denies nothing).
  assert.equal(band(vals(logs('small')), 'deny').cant, true);
});

test('each verdict carries its move, and it lands where its label says', () => {
  let c = logs('partial');
  band(vals(c), 'all').act.go();
  assert.deepEqual([c.state.obPage, c.state.obPanel], ['perf', 'map']);
  c = logs('partial');
  band(vals(c), 'deny').act.go();
  assert.deepEqual([c.state.tab, c.state.govPanel], ['govern', 'policies']);
  c = logs('partial');
  const pub = band(vals(c), 'public').act;
  assert.match(pub.label, /^Attach /);
  pub.go();
  assert.equal(c.state.screen, 's4');
  c = logs('partial');
  band(vals(c), 'internet').act.go();
  assert.equal(c.state.tab, 'govern');
  assert.deepEqual(c.state.authoring.req, ['Inline security inspection']);
});

test('the record stream draws every record on its pattern lane, in time, and each dot finds its row', () => {
  const c = logs('partial');
  const v = vals(c);
  const st = v.logStream;
  assert.deepEqual(st.lanes.map(l => l.label), v.logChips.slice(1).map(x => x.label), 'a lane is a pattern, named as its chip');
  assert.equal(st.lanes.reduce((a, l) => a + l.dots.length, 0), 24);
  for (const l of st.lanes) {
    assert.ok(l.icon && typeof l.go === 'function', l.label);
    for (const d of l.dots) assert.ok(parseFloat(d.x) >= 0 && parseFloat(d.x) <= 100 && d.title, d.key);
  }
  assert.ok(st.axis.length >= 3);
  // A lane is a door: it sets the pattern chip.
  st.lanes.find(l => l.key === 'clouds').go();
  assert.equal(c.state.logPattern, 'clouds');
  // Under a filter the dots it leaves out dim; a dot's press selects its record on the page that holds it.
  const v2 = vals(c);
  const dim = v2.logStream.lanes.flatMap(l => l.dots).filter(d => !d.on);
  assert.equal(dim.length, 24 - v2.logStream.lanes.find(l => l.key === 'clouds').dots.length);
  c.setState({ logPattern: 'all' });
  const last = vals(c).logStream.lanes.flatMap(l => l.dots).sort((a, b) => parseFloat(b.x) - parseFloat(a.x))[0];
  last.go();
  const v3 = vals(c);
  assert.ok(v3.flowRecords.some(r => r.sel), 'the page holding the record is not the one shown');
  assert.equal(v3.flowRecords.find(r => r.sel).key, last.key);
});

test('a record row leads with its path as a glyph and its action as a verb badge, and opens its path on the map', () => {
  const c = logs('partial');
  const v = vals(c);
  for (const r of v.flowRecords) {
    assert.ok(['hub', 'internet'].includes(r.pathIcon) && r.pathTitle, r.key);
    assert.ok(['allow', 'deny'].includes(r.badgeCls), r.key);
    assert.ok(r.patIcon && r.patTitle, `${r.key}: no pattern glyph`);
  }
  const r = v.flowRecords[0];
  r.go();
  assert.deepEqual([c.state.obPage, c.state.obPanel], ['perf', 'map']);
  assert.ok(c.state.mapRegion, 'the map opened on no region');
});

test('User activity tells who changed the network: its verdict writes the Find box, its lanes are the people', () => {
  const c = logs('partial', { logTab: 'user' });
  const v = vals(c);
  assert.deepEqual(v.actBand.map(x => x.key), ['all', 'policy', 'scan', 'denied']);
  for (const x of v.actBand) assert.ok(x.icon && x.n && x.act && x.act.label && typeof x.act.go === 'function', x.key);
  v.actBand.find(x => x.key === 'denied').go();
  assert.equal(c.state.actQ, 'denied');
  assert.ok(vals(c).actRows.length >= 1 && vals(c).actRows.every(r => /denied/i.test(`${r.verb} ${r.result}`)));
  v.actBand.find(x => x.key === 'all').go();
  assert.equal(c.state.actQ, '');
  const st = vals(c).actStream;
  assert.ok(st.lanes.length >= 3, 'a lane a person');
  st.lanes[0].go();
  assert.equal(c.state.actQ, st.lanes[0].label);
  // Every row leads with its change's glyph and opens where you act on it.
  const rows = vals(logs('partial', { logTab: 'user' })).actRows;
  for (const r of rows) assert.ok(r.icon && r.fromIcon && r.fromTitle && r.badgeCls, r.key);
  const scan = rows.find(r => r.verb === 'Ran re-discovery');
  const c2 = logs('partial', { logTab: 'user' });
  vals(c2).actRows.find(r => r.key === scan.key).go();
  assert.deepEqual([c2.state.screen, c2.state.discoverView], ['s1', 'sources']);
});

test('with no record yet, Logs says so with its one move, and draws no empty verdict', () => {
  const v = vals(logs('empty'));
  assert.equal(v.logCalm, true);
  assert.equal(typeof v.logCalmGo, 'function');
  assert.equal(v.logHero, false);
});

test('the markup draws the story on the page, the filters as the one grammar', () => {
  const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
  const i = HTML.indexOf('<div id="sec-logs"'), j = HTML.indexOf('<sc-if value="{{ obIsPerf }}"', i);
  const page = HTML.slice(i, j);
  assert.match(page, /<sc-for list="\{\{ logBand \}\}" as="lb"/);
  assert.match(page, /<sc-for list="\{\{ logStream\.lanes \}\}" as="ln"/);
  assert.match(page, /<sc-for list="\{\{ flowRecords \}\}" as="lr"/);
  assert.match(page, /<sc-for list="\{\{ actBand \}\}" as="ab"/);
  // The one filter grammar: the Find boxes and the chip rows are still there, and nothing else filters.
  assert.match(page, /onChange="\{\{ setLogQ \}\}"/);
  assert.match(page, /onChange="\{\{ setActQ \}\}"/);
  for (const k of ['logChips', 'logPathChips', 'logActChips']) assert.match(page, new RegExp(`list="\\{\\{ ${k} \\}\\}"`), k);
  assert.ok(!/<table|class="dt/.test(page), 'Logs is still a table');
  assert.equal((page.match(/<input\b/g) || []).length, 2, 'a new search box');
});
