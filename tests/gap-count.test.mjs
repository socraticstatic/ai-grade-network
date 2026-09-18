import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import * as S from '../naas-sites.js';
import { vals, defaults } from '../naas-app.js';

const est = D.ESTATES.trust;

test('the gap is 2,898 sites, not 3 rows', () => {
  assert.equal(S.gapSiteCount(est), 2898);
  const rows = (est.sites || []).filter(x => !x.priv);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map(x => S.countOf(x.name)), [1640, 1210, 48]);
});

test('every estate reports a gap it can defend', () => {
  for (const id of ['empty', 'partial', 'mature', 'trust']) {
    const e = D.ESTATES[id];
    const n = S.gapSiteCount(e);
    const rows = (e.sites || []).filter(x => !x.priv);
    assert.ok(n >= rows.length, `${id}: ${n} sites across ${rows.length} rows`);
  }
});

// vals()-level: the summary counts sites (not rows), each row leads with its
// own count, and the row's `go` carries the quantity all the way into the
// compose order and the alert that announces where it came from.
function mkC(extra = {}) {
  const state = { ...defaults(), view: 'trust', screen: 's3', layer: 'cloud', tab: 'connect', ...extra };
  return { state, setState: (p) => Object.assign(state, p) };
}

test('the gap summary counts sites, not rows', () => {
  const c = mkC();
  const v = vals(c);
  assert.equal(
    v.gapSummary,
    '2 cloud regions and 2,898 sites are still on the public internet, in 5 groups.'
  );
});

test('the East site row leads with its own count and its go carries the quantity into Compose', () => {
  const c = mkC();
  const v = vals(c);
  const eastName = (est.sites || []).find(x => !x.priv && /East/.test(x.name)).name;
  assert.equal(eastName, 'Remote sites, East (1,640)');
  const row = v.gapRows.find(r => r.name === eastName);
  assert.ok(row, 'the East gap row is missing from gapRows');
  assert.equal(row.qty, 1640);
  assert.match(row.sub, /^1,640 sites · /);

  row.go();
  assert.equal(c.state.parsedNoteTitle, 'Not connected yet');
  assert.equal(
    c.state.parsedNote,
    'Attach 1,640 sites · Remote sites, East. One order, one policy, 1,640 circuits.'
  );
  assert.equal(c.state.compose.qty, 1640);
  assert.equal(c.state.screen, 's4');
});

test('every other route into Compose keeps the default alert title', () => {
  const c = mkC();
  const v = vals(c);
  assert.equal(v.parsedNoteTitle, 'From the drawer');
});
