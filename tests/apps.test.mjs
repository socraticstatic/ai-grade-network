import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import * as A from '../naas-addendum.js';
import * as F from '../naas-flowmap.js';
import { appsOf } from '../naas-apps.js';

// "go down to the app level" (Micah, 2026-09-29). An app is the workloads
// that carry its tag. Its traffic is its workloads' share of their regions'
// traffic on the map, so the apps add up to the map.

const ctx = (id) => { const est = D.ESTATES[id]; const inv = A.inventory(est); return { est, inv, flows: A.observe(est, [], inv).flows }; };

for (const id of ['partial', 'mature', 'trust']) {
  test(`${id}: the apps hold every workload and every Gbps the map sends to the clouds`, () => {
    const { est, inv, flows } = ctx(id);
    const apps = appsOf(est, inv, flows);
    assert.ok(apps.length >= 3);
    assert.equal(apps.reduce((a, x) => a + x.wl, 0), est.regionsList.reduce((a, r) => a + (r.wl || 0), 0));
    const clouds = F.rightRoots(est, flows).filter(x => x.kind === 'cloud').reduce((a, x) => a + x.v, 0);
    const gb = apps.reduce((a, x) => a + x.gbps, 0);
    assert.ok(Math.abs(gb - clouds) < 0.01 * clouds, `${gb} vs ${clouds}`);
    for (const x of apps) {
      assert.ok(x.onAtt >= 0 && x.onAtt <= 1 && x.exposed <= x.wl, x.tag);
      assert.ok(x.regions.length >= 1 && x.clouds.length >= 1, x.tag);
      // Its parts are its regions' shares, and add up to the whole app (no delay figure since 2026-10-15).
      assert.ok(Math.abs(x.parts.reduce((a, p) => a + p.share, 0) - 1) < 1e-6, x.tag);
      for (const k of ['p95', 'slo', 'health', 'p95Regions']) assert.ok(!(k in x), `${x.tag} still carries ${k}`);
      assert.ok(Array.isArray(x.topApps) && x.topApps.length <= 3, x.tag);
    }
    assert.deepEqual(apps.map(x => x.wl), apps.map(x => x.wl).slice().sort((a, b) => b - a), 'largest first');
  });
}

// The Estate's Apps table reads the link an app rides at its peak, in place of a delay (2026-10-15).
test('an app\'s Peak is the link that matters most (down, else near full, else busiest) at its peak, in its own state; an app on the internet reads Public', async () => {
  globalThis.window = globalThis.window || { scrollTo: () => {}, scrollY: 0 };
  const { vals } = await import('../naas-app.js');
  const { mkC } = await import('./harness.mjs');
  const X = await import('../naas-connections.js');
  let seen = 0;
  for (const view of ['partial', 'mature', 'trust', 'small']) {
    const { est, inv, flows } = ctx(view);
    const conns = X.connections(est, A.observe(est, [], inv)).rows;
    const rows = vals(mkC({ view, estateParam: null, screen: 's1', estPanel: 'glance' })).appAll;
    for (const x of appsOf(est, inv, flows)) {
      const row = rows.find(r => r.key === x.tag); if (!row) continue; seen++;
      const cs = conns.filter(c => x.parts.some(p => p.share >= 0.05 && p.region === c.region));
      if (!cs.length) { assert.equal(row.linkF, 'Public', `${view} ${x.tag}`); continue; }
      const stOf = (c) => (c.degraded ? 'down' : c.hot ? 'risk' : 'ok'), R = { ok: 0, risk: 1, down: 2 };
      const worst = Math.max(...cs.map(c => R[stOf(c)])), top = cs.filter(c => R[stOf(c)] === worst).sort((a, b) => b.pct - a.pct)[0], st = stOf(top);
      assert.equal(row.linkF, `${top.pct}%`, `${view} ${x.tag}`);
      assert.equal(row.linkFill, st === 'ok' ? 'transparent' : F.HEALTH_INK[st], `${view} ${x.tag}`);
      // The figure, the ink and the title read one link.
      assert.ok(row.linkTitle.startsWith(`${top.cloud} ${top.region} `) && row.linkTitle.endsWith(F.HEALTH_WORD[st]), row.linkTitle);
      assert.doesNotMatch(row.linkTitle, /\bms\b|p95|SLO/, row.linkTitle);
    }
  }
  assert.ok(seen > 10, `only ${seen} apps checked`);
});
