import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import * as CV from '../naas-cost-view.js';
import * as CF from '../naas-connect-flow.js';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// The skeptic's third read (2026-09-30): a part row still read "Frankfurt DC |
// International" under Europe (partWords used regionOf, not CV.placeOfSite); the
// region egress parts still read "On AT&T" beside the legend's "AT&T price"; and the
// restored Attach door sent GCP europe-west1 to US East, "Location not chosen",
// because europe-west1 was in neither CF.REGION_GEO nor CV.REGION_METRO.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const cost = (view, patch = {}) => mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'cost', ...patch });
const legRows = (c, key, pageKey) => { let rows = [], guard = 0; c.state[pageKey] = 0; for (;;) { const w = vals(c); rows = rows.concat(w[key]); const pg = w[key.replace('Rows', 'Pager').replace('legAccess', 'legA').replace('legConnect', 'legC').replace('legCloud', 'legP')]; if (!pg || pg.nextOp < 1 || ++guard > 30) break; pg.next(); } c.state[pageKey] = 0; return rows; };

test('a site part reads the place it sits under, the member it is listed in', () => {
  for (const view of ['partial', 'mature', 'trust']) {
    const members = vals(cost(view, { costPanel: 'legs', costBy: 'region' })).costMembers.map(m => m.key);
    for (const key of members) {
      const c = cost(view, { costPanel: 'legs', costBy: 'region', costPick: key });
      for (const row of vals(c).legAccessRows) {
        const d = cost(view, { costPanel: 'legs', costBy: 'region', costPick: key, legDrill: { leg: 'access', row: row.key } });
        for (const p of legRows(d, 'legAccessRows', 'legAPage')) assert.ok(p.sub.startsWith(`${key} · `), `${view} ${key} ${row.label}: ${p.label} reads "${p.sub}"`);
      }
    }
  }
  const eu = cost('mature', { costPanel: 'legs', costBy: 'region', costPick: 'Europe' });
  const ase = vals(eu).legAccessRows.find(r => /ASE on Demand/.test(r.label));
  const d = cost('mature', { costPanel: 'legs', costBy: 'region', costPick: 'Europe', legDrill: { leg: 'access', row: ase.key } });
  assert.ok(vals(d).legAccessRows.some(p => p.label === 'Frankfurt DC' && /^Europe · /.test(p.sub)));
});

test('a region\'s egress share reads AT&T price or Outside AT&T, never On AT&T', () => {
  for (const view of ['partial', 'mature', 'trust', 'small']) {
    for (const key of vals(cost(view, { costPanel: 'legs', costBy: 'region' })).costMembers.map(m => m.key)) {
      const d = cost(view, { costPanel: 'legs', costBy: 'region', costPick: key, legDrill: { leg: 'cloud', row: 'egress' } });
      if (!vals(d).legPHead.on) continue;
      for (const p of legRows(d, 'legCloudRows', 'legPPage')) {
        assert.doesNotMatch(p.sub, /On AT&T/, `${view} ${key} ${p.label}: ${p.sub}`);
        assert.match(p.sub, /^(Outside AT&T|AT&T price) · /, `${view} ${key} ${p.label}: ${p.sub}`);
      }
    }
  }
});

test('every cloud region has a metro, so Attach opens its own area on its own metro', () => {
  const regions = new Set();
  for (const e of Object.values(D.ESTATES)) for (const r of e.regionsList || []) regions.add(r.region);
  for (const src of Object.values(D.FOUND_SOURCES)) for (const r of src.regions) regions.add(r.region);
  for (const r of regions) {
    assert.ok(CF.REGION_GEO[r], `${r} has no metro for Compose`);
    assert.equal(CV.REGION_METRO[r], CF.REGION_GEO[r], `${r}: the twins disagree`);
  }
  // Growing, By region > GCP europe-west1 > Attach: the Europe tab, on its metro, never US East.
  const c = cost('partial', { costPanel: 'money' });
  const row = vals(c).regionSaveRows.find(r => r.regionId === 'europe-west1');
  row.attach();
  const f = CF.flowOf(c.state.compose, D.ESTATES.partial);
  assert.deepEqual(f.loc, [CF.REGION_GEO['europe-west1']]);
  assert.equal(D.COMPOSE_CHIPS.regions.Europe.includes(f.loc[0]), true, `${f.loc[0]} is not a European metro`);
});
