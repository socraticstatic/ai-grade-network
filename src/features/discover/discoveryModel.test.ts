import { describe, it, expect } from 'vitest';
import {
  siteBreakdown,
  branchesOf,
  type Branch,
  allKeys,
  cloudVpcCount,
  cloudRegionCount,
  aiPublicFlowGbps,
  estateDomains,
  openSummary,
  regionLatencyMap,
  tagHex,
  toggleKey,
  regionKey,
  vpcKey,
  branchesOf,
  branchKey,
  isBranchKey,
  selectionMemberIds,
  selectionKind,
  siteRollup,
  cloudRollup,
  needsRollup,
  ROLLUP_THRESHOLD,
  type Branch,
  type SiteClass,
} from './discoveryModel';
import { CC } from '../../engine';

/* `estateStats` used to live in discoveryModel as a production export nothing
   in the app called; its own doc claimed "e.g. the tour" used it and the tour
   does not. The flattening is a test convenience, so it lives here. */
const estateStats = (cc: unknown) =>
  estateDomains(cc as never).flatMap(d => d.stats);

describe('discoveryModel', () => {
  it('derives per-cloud region and VPC counts from the engine', () => {
    expect(cloudRegionCount(CC, 'aws')).toBe(3); // use1 / usw2 / euw1
    expect(cloudVpcCount(CC, 'aws')).toBe(6); // 3 + 2 + 1 across the three regions
    expect(cloudRegionCount(CC, 'oci')).toBe(1);
  });

  it('estate tiles cover all three domains, flattened, in order', () => {
    const stats = estateStats(CC);
    expect(stats.map(s => s.key)).toEqual([
      'sites',
      'onramps',
      'clouds',
      'regions',
      'vpcs',
      'subnets',
      'workloads',
      'attached',
      'aiRegions',
      'models',
      'agents',
      'aiExposed',
    ]);
  });

  it('allKeys enumerates every cloud, region and VPC node once', () => {
    const keys = allKeys(CC);
    expect(new Set(keys).size).toBe(keys.length); // unique
    expect(keys).toContain('aws');
    expect(keys).toContain(regionKey('aws', 'use1'));
    expect(keys).toContain(vpcKey('aws', 'use1', 'vpcprod'));
    // one key per cloud + region + vpc
    const expected = CC.counts().clouds + CC.counts().regions + CC.counts().vpcs;
    expect(keys.length).toBe(expected);
  });

  it('toggleKey is immutable and flips membership', () => {
    const a = new Set<string>(['aws']);
    const b = toggleKey(a, 'aws/use1');
    expect(a.has('aws/use1')).toBe(false); // original untouched
    expect(b.has('aws/use1')).toBe(true);
    const c = toggleKey(b, 'aws/use1');
    expect(c.has('aws/use1')).toBe(false);
  });

  it('openSummary prefers resource maps over regions', () => {
    expect(openSummary(new Set())).toBe('collapsed view');
    expect(openSummary(new Set(['aws', 'aws/use1']))).toBe('1 region expanded');
    expect(openSummary(new Set(['aws', 'aws/use1', 'aws/use1/vpcprod']))).toBe('1 resource map expanded');
    expect(openSummary(new Set(['aws/use1/vpcprod', 'aws/use1/vpcdata']))).toBe('2 resource maps expanded');
  });

  /* Task 6, review finding C1: `site-class/${cls}` (SitesPanel's rollup
     drill-in key) splits into two `/`-segments — the same depth a real
     region path like `aws/use1` has — so it must be excluded from the
     depth-2 count, not miscounted as "1 region expanded" when only a site
     rollup, not any part of the cloud tree, is open. */
  it('openSummary ignores site-class rollup keys — they are not cloud-tree regions', () => {
    expect(openSummary(new Set(['site-class/branch']))).toBe('collapsed view');
    expect(openSummary(new Set(['site-class/branch', 'site-class/atm']))).toBe('collapsed view');
    // a real region open alongside an open rollup still counts correctly
    expect(openSummary(new Set(['aws', 'aws/use1', 'site-class/branch']))).toBe('1 region expanded');
  });

  it('tagHex neutralizes the amber finance tag but keeps other hues', () => {
    const tags = CC.TAGS as Record<string, { label: string; hex: string }>;
    expect(tagHex('finance-invoices', tags)).toBe('#64748b'); // de-ambered slate
    expect(tagHex('rd-helion', tags).toLowerCase()).not.toBe('#f2a23c');
    expect(tagHex('classified-helion', tags)).toBe(tags['classified-helion'].hex); // red kept
  });
});

/* Task E — branches are visible and selectable in Discover, and a selection
   turns into a group. The selection ids are tree paths; the engine's group
   members are estate ids, and the two are not the same string. */
describe('discovery selection', () => {
  it('branchesOf reads the six seeded customer sites off the engine', () => {
    const b = branchesOf(CC);
    expect(b.map(x => x.name)).toContain('San Jose campus');
    expect(b.length).toBe(CC.branches.length);
  });

  it('branchKey namespaces a site so it can never collide with a cloud id', () => {
    expect(branchKey('br-sjc')).toBe('site/br-sjc');
    expect(isBranchKey(branchKey('br-sjc'))).toBe(true);
    expect(isBranchKey(vpcKey('aws', 'usw2', 'vpcwest'))).toBe(false);
  });

  it('selectionMemberIds turns tree paths back into the estate ids addGroup stores', () => {
    const sel = new Set([branchKey('br-sjc'), vpcKey('aws', 'usw2', 'vpcwest')]);
    expect(selectionMemberIds(sel).sort()).toEqual(['br-sjc', 'vpcwest']);
  });

  it('selectionKind is site for branches only, workload for VPCs only, mixed for both', () => {
    expect(selectionKind(new Set([branchKey('br-sjc'), branchKey('br-sfo')]))).toBe('site');
    expect(selectionKind(new Set([vpcKey('aws', 'usw2', 'vpcwest')]))).toBe('workload');
    expect(selectionKind(new Set([branchKey('br-sjc'), vpcKey('aws', 'usw2', 'vpcwest')]))).toBe('mixed');
    expect(selectionKind(new Set())).toBe('mixed');
  });

  it('a selection resolves through the engine to exactly what was picked', () => {
    const sel = new Set([branchKey('br-sjc'), branchKey('br-sfo'), branchKey('br-bkl')]);
    const r = CC.resolveGroupSpec({
      kind: selectionKind(sel),
      members: selectionMemberIds(sel),
      predicates: [],
    });
    expect(r.branchIds.slice().sort()).toEqual(['br-bkl', 'br-sfo', 'br-sjc']);
    expect(r.vpcIds).toEqual([]);
  });

  it('a mixed selection keeps BOTH estates — neither half is silently dropped', () => {
    const sel = new Set([branchKey('br-sjc'), vpcKey('aws', 'usw2', 'vpcwest')]);
    const r = CC.resolveGroupSpec({
      kind: selectionKind(sel),
      members: selectionMemberIds(sel),
      predicates: [],
    });
    expect(r.branchIds).toEqual(['br-sjc']);
    expect(r.vpcIds).toEqual(['vpcwest']);
    expect(r.count).toBe(2);
  });

  it('every seeded branch carries a site class', () => {
    const classes: SiteClass[] = ['dc', 'office', 'branch', 'atm'];
    const branches = branchesOf(CC as never);
    expect(branches.length).toBeGreaterThan(0);
    branches.forEach(b => expect(classes).toContain(b.siteClass));
  });

  it('ACME: Ashburn DC is a dc, the rest are offices', () => {
    const byId = Object.fromEntries(branchesOf(CC as never).map(b => [b.id, b.siteClass]));
    expect(byId['br-ash']).toBe('dc');
    expect(byId['br-sjc']).toBe('office');
  });
});

/* Task B — Discover reads in three parts: the network already in place, the
   cloud estate on the other side of it, and the AI workloads riding both. */

/* ---------------------------------------------------------------------------
   Engine sources for every displayed tile.

   One entry per tile, so the guard is table-driven rather than thirteen
   hand-written cases someone forgets to extend: the suite asserts the tile
   key set EQUALS this table's key set, so a tile added to `estateDomains`
   without a source mapped here fails immediately instead of shipping
   unguarded. The review found four tiles (onramps, subnets, attached,
   agents) could all be set to 999 at once with the whole gate still green.

   Each source is a THUNK, re-evaluated per assertion, so the same table
   also works after an engine mutation — which is what catches a literal
   that happens to equal the seed value.
   --------------------------------------------------------------------------- */
type Engine = typeof CC;
const TILE_SOURCE: Record<string, (cc: Engine) => number> = {
  sites: cc => cc.branches.length,
  onramps: cc => cc.activeOnramps(),
  clouds: cc => cc.counts().clouds,
  regions: cc => cc.counts().regions,
  vpcs: cc => cc.counts().vpcs,
  subnets: cc => cc.counts().subnets,
  workloads: cc => cc.counts().workloads,
  attached: cc => cc.counts().attached,
  aiRegions: cc =>
    Object.values(cc.regions as Record<string, { ai?: boolean }[]>)
      .flat()
      .filter(r => r.ai).length,
  models: cc => cc.modelCatalog().length,
  agents: cc => cc.agentList().length,
  aiExposed: cc => cc.aiExposed(),
};
/** Tiles rendered as the engine's `n / m` idiom; value maps above, denominator here. */
const TILE_DENOMINATOR: Record<string, (cc: Engine) => number> = {
  onramps: cc => cc.onramps.length,
};

function expectEveryTileAgreesWithEngine(cc: Engine, when: string) {
  const stats = estateStats(cc as never);
  expect(
    stats.map(s => s.key).slice().sort(),
    `${when}: tile keys and the engine-source table have diverged — every displayed figure needs a mapped source`,
  ).toEqual(Object.keys(TILE_SOURCE).slice().sort());

  // `expect.soft` so ONE run names EVERY disagreeing tile, not just the first
  // — the review broke four figures at once and deserves four names back.
  for (const s of stats) {
    // No `toBeTypeOf('function')` check here: the key-set equality assertion
    // above already guarantees every tile key has an entry in TILE_SOURCE.
    const source = TILE_SOURCE[s.key];
    expect.soft(s.value, `${when}: tile "${s.key}" disagrees with the engine`).toBe(source(cc));

    const denominator = TILE_DENOMINATOR[s.key];
    if (denominator) {
      expect.soft(s.of, `${when}: tile "${s.key}" denominator disagrees with the engine`).toBe(
        denominator(cc),
      );
    } else {
      expect.soft(s.of, `${when}: tile "${s.key}" carries an unexpected denominator`).toBeUndefined();
    }
  }
}

describe('estateDomains', () => {
  it('returns the three discovery domains in order', () => {
    expect(estateDomains(CC as never).map(d => d.key)).toEqual(['network', 'cloud', 'ai']);
  });

  it('every domain carries the tiles the brief assigned it', () => {
    const [net, cloud, ai] = estateDomains(CC as never);
    expect(net.stats.map(s => s.key)).toEqual(['sites', 'onramps']);
    expect(cloud.stats.map(s => s.key)).toEqual([
      'clouds', 'regions', 'vpcs', 'subnets', 'workloads', 'attached',
    ]);
    expect(ai.stats.map(s => s.key)).toEqual(['aiRegions', 'models', 'agents', 'aiExposed']);
  });

  it('EVERY displayed figure agrees with its engine source', () => {
    expectEveryTileAgreesWithEngine(CC, 'at seed');
  });

  /* Agreement AT SEED is not agreement: `value: 124` in place of `c.routes`
     passes every assertion above, because the seed happens to be 124 — and
     no on-ramp activation moves routes. So each tile's own engine source is
     perturbed and the whole table re-checked against an estate no seed
     literal could match. The engine is a shared singleton, so every change
     is undone in `finally`.

     Deltas are DISTINCT per source, not a uniform +1: `branches` and `clouds`
     both seed at 6, and `modelCatalog()` and `agentList()` both seed at 3 — a
     tile wired to the wrong source of the same size (Sites → counts().clouds,
     Models → agentList().length) is invisible to a perturbation that moves
     every same-sized pair by the same amount. Sites gets +2 while Clouds
     gets +1; Models gets +2 while Agents gets +1 — a swap now lands on a
     different post-perturbation number and the table catches it. */
  it('every figure follows a perturbation of its own engine source — no seed-valued literals', () => {
    const region = CC.regions.aws[0];
    const cloud = CC.clouds[0];
    const seedRegionAi = region.ai;
    const realModelCatalog = CC.modelCatalog;
    const realAgentList = CC.agentList;

    // Snapshot the whole tile set before mutating, so the restore below is
    // verified as an absolute match rather than only a same-source compare —
    // a leaked probe that moves tile and engine together would otherwise
    // pass `expectEveryTileAgreesWithEngine` even after a broken restore.
    const snapshotBefore = estateStats(CC as never);

    try {
      region.subnets += 5;                // subnets
      region.ai = !seedRegionAi;          // aiRegions
      cloud.workloads += 11;              // workloads
      CC.branches.push(                   // sites: +2, distinct from clouds' +1 below
        { id: 'zz-site-1', name: 'Probe site 1', city: 'Probe', cidrs: ['10.98.0.0/20'] },
        { id: 'zz-site-2', name: 'Probe site 2', city: 'Probe', cidrs: ['10.98.16.0/20'] },
      );
      CC.onramps.push({                   // the on-ramps denominator, not its value
        id: 'zz-ramp', name: 'Probe ramp', type: 'probe', sub: '', ic: 'nb',
        active: false, site: { name: 'probe', lat: 0, lon: 0 }, targets: [],
      });
      CC.regions.aws.push({               // regions (and more routes/gateways/subnets)
        id: 'zz-region', name: 'probe', sub: '', subnets: 4, routes: 9, gateways: 2,
        lat: 10, attached: false,
      });
      CC.vpcs.use1.push({                 // vpcs
        id: 'zz-vpc', name: 'zz', cidr: '10.99.0.0/16', azs: 1, subnets: 1,
        attached: false, role: 'probe',
      });
      CC.clouds.push({                    // clouds: +1, distinct from sites' +2 above
        id: 'zz-cloud', name: 'Probe Cloud', color: '#475569', mk: 'zz',
        workloads: 3, attached: false,
      });
      // models: +2, distinct from agents' +1 below
      CC.modelCatalog = () => [...realModelCatalog(), { id: 'zz-model-1' }, { id: 'zz-model-2' }];
      // agents: +1, distinct from models' +2 above
      CC.agentList = () => [...realAgentList(), { id: 'zz-agent' }];

      expectEveryTileAgreesWithEngine(CC, 'with every engine source perturbed');
    } finally {
      CC.agentList = realAgentList;
      CC.modelCatalog = realModelCatalog;
      CC.clouds.pop();
      CC.vpcs.use1.pop();
      CC.regions.aws.pop();
      CC.onramps.pop();
      CC.branches.pop();
      CC.branches.pop();
      cloud.workloads -= 11;
      region.ai = seedRegionAi;
      region.subnets -= 5;
    }

    // the restore actually restored — later tests read a clean seed.
    // `expectEveryTileAgreesWithEngine` compares tile to engine, and a leak
    // moves both together, so it alone cannot see a leak; the snapshot
    // `toEqual` below is the absolute check.
    expectEveryTileAgreesWithEngine(CC, 'after restore');
    expect(estateStats(CC as never)).toEqual(snapshotBefore);
  });

  /* The section labels and blurbs ARE the deliverable — the brief's success
     criterion is that a viewer can say what each section is for. Without
     this, `label:'Network'` could be renamed to 'Cloud' and every blurb
     emptied with the whole suite still green. */
  /* 'cost control' is dropped: under substring matching it was wholly
     subsumed by 'control' (any blurb naming 'cost control' also contains
     'control'), and that same substring match let 'uncontrolled' — a
     negation — count as naming the thesis word. Matching is now
     word-boundary, so 'control' matches only the standalone word and no
     longer fires inside 'uncontrolled'. */
  const THESIS_WORDS = ['control', 'security', 'observability'];
  const namesThesisWord = (blurb: string) =>
    THESIS_WORDS.some(w => new RegExp(`\\b${w}\\b`, 'i').test(blurb));
  it('each domain is distinctly labelled and blurbed, and each blurb names a thesis word', () => {
    const domains = estateDomains(CC as never);
    expect(domains.map(d => d.label)).toEqual(['Network', 'Cloud', 'AI workflows']);
    expect(new Set(domains.map(d => d.label)).size).toBe(3);
    expect(new Set(domains.map(d => d.blurb)).size).toBe(3);
    for (const d of domains) {
      expect(d.blurb.trim().length, `"${d.key}" blurb is empty`).toBeGreaterThan(30);
      expect(
        namesThesisWord(d.blurb),
        `"${d.key}" blurb names none of ${THESIS_WORDS.join(' / ')}: ${d.blurb}`,
      ).toBe(true);
    }
  });

  /* The AI blurb claims security; the AI tiles have to be able to back it.
     Before this pass the section was three inventory counts under a
     cost-control promise no figure beside it measured. */
  it('the AI domain carries the engine posture figure its blurb names', () => {
    const ai = estateDomains(CC as never)[2];
    const exposed = ai.stats.find(s => s.key === 'aiExposed')!;
    expect(exposed.value).toBe(CC.aiExposed());
    expect(ai.blurb.toLowerCase()).toContain('security');
  });

  /* --- MUTATING: activates on-ramps in the shared engine singleton.
         Ordered last in the file, because these mutations persist. --- */
  it('the on-ramps tile moves when the page\'s own CTA activates a circuit', () => {
    const before = estateDomains(CC as never)[0].stats.find(s => s.key === 'onramps')!;
    expect(before.value).toBe(CC.activeOnramps());
    expect(before.of).toBe(CC.onramps.length);

    expect(CC.activateOnramp('dx1')).toBe(true);

    const after = estateDomains(CC as never)[0].stats.find(s => s.key === 'onramps')!;
    expect(after.value, 'activating an on-ramp must move the on-ramps tile').toBe(before.value + 1);
    expect(after.value).toBe(CC.activeOnramps());
    expect(after.of, 'the denominator is the circuit inventory and does not move').toBe(before.of);
  });

  /* Agreement at the SEED value is not agreement: `value: 124` passes while
     the seed happens to be 124. Re-running the whole table after two engine
     mutations that move attached / on-ramps / exposed endpoints is what
     catches a seed-valued literal. */
  it('every figure still agrees after the engine mutates — no seed-valued literals', () => {
    const seed = Object.fromEntries(
      estateStats(CC as never).map(s => [s.key, s.value]),
    ) as Record<string, number>;
    // A static blurb states the endpoints are on the public internet
    // regardless of what `aiExposed` says beside it — captured before the
    // mutation so the assertion after it is a real before/after diff, not a
    // read of whatever the string happens to be at the time.
    const blurbBefore = estateDomains(CC as never)[2].blurb;
    expect(CC.aiExposed()).toBeGreaterThan(0); // precondition: the exposed-state sentence applies
    expect(blurbBefore.toLowerCase()).toContain('public internet');

    expect(CC.activateOnramp('nb2')).toBe(true);
    expectEveryTileAgreesWithEngine(CC, 'after activateOnramp(nb2)');

    const now = Object.fromEntries(
      estateStats(CC as never).map(s => [s.key, s.value]),
    ) as Record<string, number>;
    // Prove the mutation actually moved figures, so the re-check is not vacuous.
    expect(now.attached, 'attached should have grown').toBeGreaterThan(seed.attached);
    expect(now.onramps, 'active on-ramps should have grown').toBeGreaterThan(seed.onramps);
    expect(now.aiExposed, 'exposed AI endpoints should have fallen').toBeLessThan(seed.aiExposed);

    // The blurb is a `CC` derivation like every figure beside it: once
    // `aiExposed()` reaches 0, the sentence must stop asserting exposure.
    expect(now.aiExposed).toBe(0);
    const blurbAfter = estateDomains(CC as never)[2].blurb;
    expect(
      blurbAfter,
      'the AI blurb must change once aiExposed() reaches 0 — a static string would still assert the endpoints are exposed',
    ).not.toBe(blurbBefore);
    expect(blurbAfter.toLowerCase()).not.toContain('public internet');
    expect(blurbAfter.toLowerCase()).toContain('security');
  });

  /* ---------------------------------------------------------------- *
   * CRITICAL: `aiExposed()` counts VPCs, and the single
   * `activateOnramp('nb2')` above zeroes it. The flows TO those endpoints
   * are rooted in their source regions, which nb2 does not attach, so
   * /naas/observe still lists `rd-helion -> AI endpoints` and
   * `shared-services -> AI endpoints` on Public internet / Uncontrolled.
   *
   * This pins the CLAIM against that flow table rather than against
   * `aiExposed()`. Reverting the blurb to the two-branch version — or
   * keying the zero-branch on `aiExposed()` alone — fails here.
   * ---------------------------------------------------------------- */
  it('does not claim the AI gap closed while the flow table still shows public AI traffic', () => {
    expect(CC.aiExposed(), 'nb2 is active from the test above').toBe(0);

    const publicAi = CC.routeFlows().filter(
      r => r.dst === 'ai-endpoints' && !r.current.attControlled,
    );
    expect(
      publicAi.length,
      'the flow table must still carry public AI traffic here, or this test proves nothing',
    ).toBeGreaterThan(0);

    const gbps = aiPublicFlowGbps(CC as never);
    expect(gbps).toBeCloseTo(publicAi.reduce((s, r) => s + r.gbps, 0), 5);
    expect(gbps).toBeGreaterThan(0);

    const blurb = estateDomains(CC as never)[2].blurb;
    expect(
      blurb.toLowerCase(),
      'a "gap closed" claim here is denied by /naas/observe one click away',
    ).not.toContain('closed');
    // The sentence carries the figure that table sums to, not a vaguer word.
    expect(blurb).toContain(`${gbps} Gbps`);
    expect(blurb.toLowerCase()).toContain('security');
  });

  it('closes the claim only once no AI flow is left on a public path', () => {
    // Attaching every remaining on-ramp puts each flow's source region on the
    // fabric, which is the only thing that clears these rows.
    (CC.onramps as { id: string; active: boolean }[])
      .filter(o => !o.active)
      .forEach(o => CC.activateOnramp(o.id));

    expect(aiPublicFlowGbps(CC as never), 'the estate is fully attached now').toBe(0);
    expect(CC.aiExposed()).toBe(0);

    const blurb = estateDomains(CC as never)[2].blurb;
    expect(blurb.toLowerCase()).toContain('closed');
    expect(blurb.toLowerCase()).toContain('security');
  });
});

/* IMPORTANT: Discover rendered the raw seed `r.lat` while Connect's panel and
   the new PathChoice cards render `fabricModel().latencyMs`, so every one of
   the nine regions read two different latencies on two screens one click
   apart (Nebius: 44ms vs 120ms). Discover now reads the same surface. */
describe('region latency — one derivation for Discover and Connect', () => {
  it('maps every region the estate carries, with no seed fallback left in play', () => {
    const map = regionLatencyMap(CC as never);
    const shaped = CC.fabricModel().regions;
    expect(shaped.length).toBeGreaterThan(0);
    expect(Object.keys(map).length).toBe(shaped.length);
    for (const r of shaped) {
      expect(map[r.regionId], `no latency mapped for ${r.regionId}`).toBe(r.latencyMs);
    }
  });

  it('never falls back to the seeded region latency for a region the fabric shapes', () => {
    const map = regionLatencyMap(CC as never);
    for (const rs of Object.values(CC.regions as Record<string, { id: string }[]>)) {
      for (const r of rs) {
        expect(map[r.id], `${r.id} is not covered by fabricModel()`).toBeTypeOf('number');
      }
    }
  });
});

/* Task 2 — rollup derivations and the 50-row threshold contract. */
describe('rollups', () => {
  it('siteRollup counts by class with onNet from onrampId presence', () => {
    const rows = siteRollup(CC as never);
    const office = rows.find(r => r.siteClass === 'office');
    expect(office?.count).toBe(5);
    expect(office?.onNet).toBe(5);           // all five ACME offices carry onrampId
    expect(rows.map(r => r.siteClass)).toEqual(['dc', 'office']); // fixed order, absent omitted
  });

  it('cloudRollup gives one row per cloud with region and workload counts', () => {
    const aws = cloudRollup(CC as never).find(r => r.cloudId === 'aws');
    expect(aws?.regions).toBe(3);
    expect(aws?.workloads).toBe(142);
  });

  it('needsRollup trips strictly above the threshold', () => {
    expect(needsRollup(ROLLUP_THRESHOLD)).toBe(false);
    expect(needsRollup(ROLLUP_THRESHOLD + 1)).toBe(true);
  });
});

/* The brainstorm asked for the customer's own mental models, not ours:
   "carve the estate down by region, site type, business unit, connection
   type". These pin the grouping half of that - filtering decides which
   sites are in scope, siteBreakdown decides how the survivors stack. */
describe('siteBreakdown', () => {
  const keyOf = {
    region: (b: Branch) => b.cloudTags?.Region ?? 'unknown',
    connection: (b: Branch) => (b.onrampId ? 'NetBond' : 'off-net'),
  };

  it('groups by site class in the fixed taxonomy order, not by size', () => {
    const rows = siteBreakdown(branchesOf(CC as never), 'class', keyOf);
    expect(rows.map(r => r.key)).toEqual(['dc', 'office']); // ACME: 1 dc, 5 offices
    expect(rows[0].count).toBe(1);
    expect(rows[1].count).toBe(5);
  });

  it('groups by region, largest group first, and counts AT&T reach per group', () => {
    const rows = siteBreakdown(branchesOf(CC as never), 'region', keyOf);
    expect(rows.length).toBeGreaterThan(1);
    for (let i = 1; i < rows.length; i++) expect(rows[i - 1].count).toBeGreaterThanOrEqual(rows[i].count);
    const total = rows.reduce((s, r) => s + r.count, 0);
    expect(total).toBe(branchesOf(CC as never).length); // every site lands in exactly one group
    for (const r of rows) expect(r.onNet).toBeLessThanOrEqual(r.count);
  });

  it('groups by metro and by connection without losing a site', () => {
    for (const dim of ['metro', 'connection'] as const) {
      const rows = siteBreakdown(branchesOf(CC as never), dim, keyOf);
      expect(rows.reduce((s, r) => s + r.count, 0)).toBe(branchesOf(CC as never).length);
      expect(rows.every(r => r.members.length === r.count)).toBe(true);
    }
  });

  it('names an untagged region and an off-net site in the customer\'s words', () => {
    const orphan = [{ id: 'x', name: 'x', city: 'Nowhere', cidrs: [], siteClass: 'branch' }] as Branch[];
    expect(siteBreakdown(orphan, 'region', keyOf)[0].label).toBe('Region not tagged');
    expect(siteBreakdown(orphan, 'connection', keyOf)[0].label).toBe('Not on AT&T yet');
  });
});
