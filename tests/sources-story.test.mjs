import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { freshness, heartbeat } from '../naas-schedule.js';
import { mkC } from './harness.mjs';

// Sources as a story (2026-10-13, Micah: "Do this for more pages! Great space, great layout, calls to action on all
// widgets"; "Each page should be its own gorgeous, extremely beautiful story"). The verdict first: are we seeing
// everything? Four cards of one grammar (Sources, Coverage, Scan health, Next scan), each a door and a move. Then the
// evidence: every source a row that leads with its mark and its state, its scans on one shared time axis. The moves sit
// on the cards and the rows: Add a source, Attach what is unseen, Re-scan what is stale, the cadence for every account.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const T = (iso) => Date.parse(iso);
const NOW = T('2026-09-29T12:00:00Z'); // the harness's pinned day, a Tuesday
const H = 3600000;
const at = (view, patch = {}) => mkC({ view, estateParam: null, screen: 's1', discoverView: 'sources', scanStep: 4, ...patch });
const card = (v, k) => v.srcCards.find(x => x.key === k);

test('a source is fresh until it misses a scan its cadence owes; a manual one for a day', () => {
  const nightly = { kind: 'nightly', at: '02:00' }, manual = { kind: 'manual' }, weekly = { kind: 'weekly', day: 0, at: '03:00' };
  assert.equal(freshness(NOW - 10 * H, NOW, nightly), 'fresh');
  assert.equal(freshness(NOW - 26 * H, NOW, nightly), 'stale', 'a nightly source that missed last night is stale');
  assert.equal(freshness(NOW - 46 * H, NOW, manual), 'stale', 'a manual source two days old is stale');
  assert.equal(freshness(NOW - 3 * H, NOW, manual), 'fresh');
  assert.equal(freshness(NOW - 57 * H, NOW, weekly), 'fresh', 'a weekly source scanned on Sunday is fresh on Tuesday');
  assert.equal(freshness(null, NOW, nightly), 'stale', 'never scanned is stale');
  // A cadence changed today does not make yesterday's scan stale by itself: the seeded cadence that ran it still counts.
  assert.equal(freshness(NOW - 10 * H, NOW, { kind: 'hours', n: 6 }, nightly), 'fresh');
});

test('a heartbeat puts each scan on one axis: two days back, now, a day ahead', () => {
  const nightly = { kind: 'nightly', at: '02:00' };
  const hb = heartbeat({ id: 'a', seeded: nightly, schedule: nightly, lastRun: T('2026-09-29T02:00:00Z') }, [], NOW);
  assert.deepEqual(hb.past.map(p => p.at), [T('2026-09-28T02:00:00Z'), T('2026-09-29T02:00:00Z')]);
  assert.deepEqual(hb.next.map(p => p.at), [T('2026-09-30T02:00:00Z')]);
  assert.ok(Math.abs(hb.nowX - 2 / 3) < 1e-9);
  for (const p of [...hb.past, ...hb.next]) assert.ok(p.x >= 0 && p.x <= 1, `x ${p.x}`);
  assert.equal(hb.before, null);
  // A run on demand covers the account; one that covered another account does not.
  const runs = [{ at: NOW - 3 * H, trigger: 'manual', accountIds: ['a'] }, { at: NOW - 2 * H, trigger: 'manual', accountIds: ['b'] }];
  const hb2 = heartbeat({ id: 'a', seeded: nightly, schedule: nightly, lastRun: NOW - 3 * H }, runs, NOW);
  assert.deepEqual(hb2.past.map(p => p.trigger), ['schedule', 'schedule', 'manual']);
  // Manual, last scanned before the axis starts: nothing on it, the scan named off its left end, nothing ahead.
  const hb3 = heartbeat({ id: 'g', seeded: { kind: 'manual' }, schedule: { kind: 'manual' }, lastRun: NOW - 50 * H }, [], NOW);
  assert.deepEqual(hb3.past, []);
  assert.equal(hb3.before, NOW - 50 * H);
  assert.deepEqual(hb3.next, []);
  // Weekly, next fire past the axis: named off its right end.
  const wk = heartbeat({ id: 'w', seeded: { kind: 'weekly', day: 0, at: '03:00' }, schedule: { kind: 'weekly', day: 0, at: '03:00' }, lastRun: T('2026-09-27T03:00:00Z') }, [], NOW);
  assert.equal(wk.after, T('2026-10-04T03:00:00Z'));
  // An account added an hour ago has no scans before it was added.
  const add = heartbeat({ id: 'n', seeded: nightly, schedule: nightly, added: NOW - H, lastRun: NOW - H }, [], NOW);
  assert.deepEqual(add.past.map(p => p.at), [NOW - H]);
});

test('Sources opens on four cards of one grammar, each a door and a move', () => {
  for (const view of ['partial', 'mature', 'trust', 'small']) {
    const v = vals(at(view));
    assert.deepEqual(v.srcCards.map(x => x.key), ['sources', 'coverage', 'health', 'next'], view);
    for (const x of v.srcCards) {
      assert.ok(x.title && x.icon && typeof x.headGo === 'function', `${view} ${x.key}: no head door`);
      assert.ok(x.big !== '' && x.big != null, `${view} ${x.key}: no figure`);
      assert.match(x.ring, /^conic-gradient|^var\(/, `${view} ${x.key}: no ring`);
      assert.ok(x.legend.length >= 1 && x.legend.length <= 3, `${view} ${x.key}: ${x.legend.length} legend rows`);
      for (const l of x.legend) assert.ok(typeof l.go === 'function' && l.title, `${view} ${x.key} ${l.label}: a legend row with no door`);
      // A move on every card: a button, or (Next scan) the cadence for every account.
      assert.ok(x.hasAct !== x.isSelect, `${view} ${x.key}: a card with no move, or two`);
      if (x.hasAct) assert.ok(x.act.label && typeof x.act.go === 'function', `${view} ${x.key}: no move`);
    }
  }
});

test('the cards count what is real: sources, regions read and seen, fresh and stale, the next scan', () => {
  const v = vals(at('partial'));
  assert.equal(card(v, 'sources').big, '5');
  assert.deepEqual(card(v, 'sources').legend.map(l => [l.key, l.n]), [['cloud', '3'], ['att', '2']]);
  assert.equal(card(v, 'coverage').big, '7');
  assert.equal(card(v, 'coverage').unit, 'regions');
  // The next scan: the soonest account's, as a countdown; its legend the soonest few, each opening that account.
  const nx = card(v, 'next');
  assert.equal(nx.big, '14h');
  // Each a cloud's mark and its clock (the words are the row's title).
  assert.ok(nx.legend.every(l => /^(\d\d:\d\d|Sun \d\d:\d\d|Manual)$/.test(l.n) && l.hasMark), nx.legend.map(l => l.n).join(', '));
  // Seen is what sends flow logs (on AT&T), unseen the rest: the home's "5 regions unseen".
  assert.deepEqual(card(v, 'coverage').legend.map(l => [l.key, l.n]), [['seen', '2'], ['unseen', '5']]);
  assert.equal(card(v, 'health').big, '3');
  assert.equal(card(v, 'health').unit, 'of 3');
  assert.deepEqual(card(v, 'health').legend.map(l => [l.key, l.n]), [['fresh', '3'], ['live', '2']]);
  const t = vals(at('trust'));
  // Meridian's GCP account is manual and two days old: stale, and the move re-scans it alone.
  assert.equal(card(t, 'health').big, '2');
  assert.deepEqual(card(t, 'health').legend.map(l => [l.key, l.n]), [['fresh', '2'], ['stale', '1'], ['live', '2']]);
  assert.equal(card(t, 'health').act.label, 'Re-scan 1');
  assert.equal(t.sources.find(r => r.kind === 'GCP').scan, 'stale');
  assert.equal(t.sources.find(r => r.kind === 'AWS').scan, 'fresh');
  assert.equal(t.sources.find(r => r.kind === 'AT&T').scan, 'live');
});

test('every move lands where its label says', () => {
  // Add a source opens the drawer.
  let c = at('partial');
  card(vals(c), 'sources').act.go();
  assert.deepEqual(c.state.sub, { page: 'discover', panel: 'add' });
  // Attach what is unseen starts the order for those regions.
  c = at('partial');
  const cov = card(vals(c), 'coverage');
  assert.match(cov.act.label, /^Attach /);
  cov.act.go();
  assert.equal(c.state.screen, 's4');
  // Re-scan what is stale runs that account, and only it.
  c = at('trust');
  card(vals(c), 'health').act.go();
  assert.deepEqual(c.state.scanRuns.list[0].accountIds, ['acc-gcp']);
  // Nothing stale: the move re-scans every account.
  c = at('partial');
  const h = card(vals(c), 'health');
  assert.equal(h.act.label, 'Re-scan all');
  h.act.go();
  assert.equal(c.state.scanRuns.list[0].accountIds.length, 3);
  // Next scan's move is the cadence for every account.
  c = at('partial');
  const nx = card(vals(c), 'next');
  assert.equal(nx.isSelect, true);
  assert.equal(nx.cadValue, 'nightly');
  nx.setCad({ target: { value: 'h6' } });
  assert.ok(vals(c).sources.filter(r => r.canSchedule).every(r => r.cadenceValue === 'h6'), 'the cadence did not reach every account');
  // Every figure is a door: coverage's regions open Your clouds.
  c = at('partial');
  card(vals(c), 'coverage').headGo();
  assert.equal(c.state.estPanel, 'clouds');
});

test('each row leads with its mark and state, counts its scope as a glyph and a number, and draws its scans', () => {
  const v = vals(at('mature'));
  for (const r of v.sources) {
    assert.ok(['fresh', 'stale', 'live'].includes(r.scan), r.name);
    assert.ok(r.scanIcon && r.scanTitle, `${r.name}: no scan-state glyph`);
    assert.match(r.scopeN, /^[\d,]+$/, `${r.name}: scope "${r.scopeN}" is not a number`);
    assert.ok(r.scopeIcon && r.scopeTitle, `${r.name}: no scope glyph`);
    assert.ok(r.beat && Array.isArray(r.beat.past) && Array.isArray(r.beat.next), `${r.name}: no heartbeat`);
    assert.match(r.beat.nowX, /%$/);
    assert.equal(typeof r.rescan, 'function');
    assert.equal(typeof r.edit, 'function');
  }
  const gcp = v.sources.find(r => r.kind === 'GCP');
  assert.ok(gcp.beat.past.length >= 6, 'every 6 hours over two days is at least six scans');
  const att = v.sources.find(r => r.kind === 'AT&T');
  assert.equal(att.beat.live, true, 'AT&T inventory is live, a line, not dots');
  assert.deepEqual(v.srcAxis.map(a => a.label), ['-2d', '-1d', 'Now', '+1d']);
});

test('the clouds not yet connected sit beside Add a source as doors, each opening the drawer on its cloud', () => {
  const c = at('partial');
  const marks = vals(c).srcAddMarks;
  assert.deepEqual(marks.map(m => m.key), ['Oracle', 'CoreWeave']);
  marks[0].go();
  assert.deepEqual(c.state.sub, { page: 'discover', panel: 'add' });
  assert.equal(vals(c).sourceTiles.find(t => t.on).name, 'Oracle Cloud');
});

test('the markup draws the story: cards, then rows on a grid, no table and no words where a glyph will do', () => {
  const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
  const i = HTML.indexOf('<div id="sec-accounts"'), j = HTML.indexOf('<sc-if value="{{ showEstateBody }}"', i);
  const page = HTML.slice(i, j);
  assert.match(page, /<sc-for list="\{\{ srcCards \}\}" as="sc"/);
  assert.match(page, /<sc-for list="\{\{ sources \}\}" as="sr"/);
  assert.ok(!/<table|class="dt/.test(page), 'Sources is still a table');
  assert.match(page, /class="src-row"/);
  assert.match(page, /onClick="\{\{ sr\.remove \}\}"/, 'the added source lost its Remove');
  // The cadence select is written longhand: <option> under sc-for never renders.
  assert.equal((page.match(/<option value="nightly">/g) || []).length, 2, 'the row and the card each carry the cadence select');
});
