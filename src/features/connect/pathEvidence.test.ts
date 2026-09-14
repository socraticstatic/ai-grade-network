import { describe, it, expect } from 'vitest';
import { CC } from '../../engine';
import { CONNECTIVITY_PATHS, isTenanted, pathEvidence } from './pathEvidence';

const ev = (cloudId: string, regionId: string) => {
  const rows = pathEvidence(CC as never, cloudId, regionId);
  return {
    direct: rows.find(r => r.pathId === 'managed-direct')!,
    tenanted: rows.find(r => r.pathId === 'tenanted')!,
  };
};

/** The shaped region the rest of Connect renders from. */
const shaped = (cloudId: string, regionId: string) =>
  (CC as never as { fabricModel(): { regions: { cloudId: string; regionId: string; latencyMs: number; privateMs: number; publicMs: number; path: string; reliability: string }[] } })
    .fabricModel().regions.find(r => r.cloudId === cloudId && r.regionId === regionId)!;

/** Every shaped region in the model, so assertions can walk the whole estate. */
const allRegions = () =>
  (CC as never as { fabricModel(): { regions: { cloudId: string; regionId: string }[] } }).fabricModel().regions;

/** The raw on-ramp seed, for asserting evidence is carried through verbatim. */
const seedOnramp = (id: string) =>
  (CC as never as { onramps: { id: string; sub: string; site: { name: string } }[] }).onramps.find(o => o.id === id)!;

describe('CONNECTIVITY_PATHS', () => {
  it('names exactly the two options the portal offers', () => {
    expect(CONNECTIVITY_PATHS.map(p => p.id)).toEqual(['managed-direct', 'tenanted']);
  });

  it('claims nothing about partner fabric or L3 — the engine carries neither', () => {
    const copy = CONNECTIVITY_PATHS.map(p => `${p.promise} ${p.isolation}`).join(' ');
    expect(copy).not.toMatch(/Equinix Fabric/i);
    expect(copy).not.toMatch(/\bL3\b/);
  });

  it('carries the isolation posture, so it is not evidence on the derived row', () => {
    // Isolation is constant per path — it belongs to the catalog entry, beside
    // the promise, not in the <dl> of figures the engine derives per region.
    expect(CONNECTIVITY_PATHS.find(p => p.id === 'managed-direct')!.isolation).toMatch(/shared/i);
    expect(CONNECTIVITY_PATHS.find(p => p.id === 'tenanted')!.isolation).toMatch(/per tenant/i);
    for (const row of pathEvidence(CC as never, 'aws', 'use1')) {
      expect(row).not.toHaveProperty('isolation');
    }
  });

  it('asserts no underlay the hand-off evidence could contradict', () => {
    // us-east-1's direct-path hand-off is a colo cage ("Equinix DC2 · Ashburn"
    // on other regions); copy promising a "shared mid-mile into an AT&T-managed
    // VPC" rendered 40px above that. The catalog must not name a carrier
    // technology or a facility kind at all.
    const copy = CONNECTIVITY_PATHS.map(p => `${p.promise} ${p.isolation}`).join(' ');
    expect(copy).not.toMatch(/mid-mile/i);
    expect(copy).not.toMatch(/MPLS/i);
    expect(copy).not.toMatch(/managed VPC/i);
  });
});

describe('pathEvidence', () => {
  it('returns one row per path, in catalog order', () => {
    const rows = pathEvidence(CC as never, 'aws', 'use1');
    expect(rows.map(r => r.pathId)).toEqual(['managed-direct', 'tenanted']);
  });

  /* `privateMs`, not `latencyMs`.
   *
   * Both cards describe an AT&T path. `latencyMs` is the figure for the path
   * the region is on TODAY, which for an unattached region is the public one —
   * stating it under a card headed "Managed direct" whose own promise is the
   * private path would relabel the public internet as managed connectivity.
   * The card's label says "Latency on this path" for the same reason. */
  it("an available path's latency is the region's FABRIC figure, not the path it rides today", () => {
    for (const [cloudId, regionId] of [['aws', 'use1'], ['aws', 'euw1'], ['azure', 'uks'], ['cw', 'cwe']] as const) {
      const region = shaped(cloudId, regionId);
      for (const row of pathEvidence(CC as never, cloudId, regionId)) {
        if (row.availability === 'none') continue;
        expect(row.latencyMs, `${regionId} card states the wrong path's figure`).toBe(region.privateMs);
      }
    }
  });

  /* The bite: on an unattached region the two figures differ, so a card reading
     the current-path figure would state the public number under a private-path
     promise. At least one of the regions walked above must be in that state, or
     the assertion above proves nothing. */
  it('walks at least one region where the two figures differ', () => {
    const differing = allRegions()
      .map(r => shaped(r.cloudId, r.regionId))
      .filter(r => r.privateMs !== r.latencyMs);
    expect(differing.length, 'no unattached region in the estate to distinguish the two figures').toBeGreaterThan(0);
    for (const r of differing) expect(r.path).toBe('public');
  });

  it('a path that does not reach the region reports NO latency, on every region in the estate', () => {
    // `_regionShape` derives latencyMs from the nearest CAPTURING on-ramp site,
    // which is region-level and blind to which path is being read. On a region
    // where only one path has an on-ramp, that figure is the OTHER card's — so
    // an unavailable row must carry null, not a number contradicting the
    // "None in this region" it states one line above.
    let checked = 0;
    for (const r of allRegions()) {
      for (const row of pathEvidence(CC as never, r.cloudId, r.regionId)) {
        if (row.availability !== 'none') continue;
        expect(row.latencyMs).toBeNull();
        checked++;
      }
    }
    // Guard the guard: if the seeds ever stop producing unavailable rows this
    // test would pass vacuously.
    expect(checked).toBeGreaterThan(0);
  });

  it('us-east-1: the tenanted path is live on an active on-ramp; the direct path has none', () => {
    const { direct, tenanted } = ev('aws', 'use1');
    expect(tenanted.availability).toBe('live');
    expect(tenanted.onrampName).toMatch(/NetBond/);
    expect(tenanted.latencyMs).toBe(shaped('aws', 'use1').latencyMs);
    // Nothing derives an available direct path here — no non-NetBond on-ramp
    // reaches use1 — so the card carries no on-ramp AND no latency. The 3ms the
    // region shape reports is the RTT from nb1's Equinix IAD site: the NetBond
    // on-ramp serving the card beside it.
    expect(direct.availability).toBe('none');
    expect(direct.onrampName).toBeNull();
    expect(direct.latencyMs).toBeNull();
    expect(direct.caveats.join(' ')).toMatch(/No direct on-ramp reaches this region/i);
  });

  it('the "no on-ramp" caveat does not enumerate the on-ramp products the seeds happen to hold', () => {
    // A third product (RegionPanel already matches /interconnect/) must not
    // turn this sentence into a lie. Only the tenanted path may name NetBond,
    // because `isTenanted` IS /netbond/i — that one is definitional.
    const direct = ev('aws', 'use1').direct.caveats.join(' ');
    expect(direct).not.toMatch(/Direct Connect/i);
    expect(direct).not.toMatch(/ExpressRoute/i);
    expect(direct).not.toMatch(/Interconnect/i);
  });

  it('availability never claims "live" for an on-ramp the engine has not activated', () => {
    const model = (CC as never as {
      fabricModel(): {
        regions: { cloudId: string; regionId: string; onrampIds: string[] }[];
        onramps: { id: string; active: boolean }[];
      };
    }).fabricModel();
    for (const r of model.regions) {
      const anyActive = r.onrampIds.some(id => model.onramps.find(o => o.id === id)?.active);
      const rows = pathEvidence(CC as never, r.cloudId, r.regionId);
      const live = rows.filter(row => row.availability === 'live');
      expect(live.length > 0).toBe(anyActive);
    }
  });

  it('a planned on-ramp reads provisionable and carries its own "not yet provisioned" text', () => {
    const { tenanted } = ev('cw', 'cwe');
    const nb2 = seedOnramp('nb2');
    expect(tenanted.availability).toBe('provisionable');
    // nb2's sub does not begin with its facility name, so it passes through whole.
    expect(tenanted.capacityNote).toBe(nb2.sub);
    expect(tenanted.handoffSite).toBe(nb2.site.name);
    expect(tenanted.caveats.join(' ')).toMatch(/planned for this region/i);
  });

  it('an existing facility with unused capacity reads provisionable, worded differently from planned', () => {
    const { direct } = ev('aws', 'usw2');
    const dx1 = seedOnramp('dx1');
    expect(direct.availability).toBe('provisionable');
    expect(direct.handoffSite).toBe(dx1.site.name);
    expect(direct.caveats.join(' ')).toMatch(/facility is in place/i);
    expect(direct.caveats.join(' ')).not.toMatch(/planned/i);
  });

  it('the capacity line does not repeat the facility the hand-off line above it already names', () => {
    // "Equinix DC2 · Ashburn" then "Equinix DC2 · 10Gbps · unused capacity"
    // stuttered on 8 of 9 regions. The duplicated segment is dropped; nothing
    // is parsed out of what remains and nothing is invented.
    let checked = 0;
    for (const r of allRegions()) {
      for (const row of pathEvidence(CC as never, r.cloudId, r.regionId)) {
        if (!row.capacityNote || !row.handoffSite) continue;
        const facility = row.handoffSite.split(' · ')[0];
        expect(row.capacityNote).not.toContain(facility);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('the capacity line is still the seed\'s own text — a suffix of it, never a rewrite', () => {
    const dx1 = seedOnramp('dx1');
    const { direct } = ev('aws', 'usw2');
    expect(dx1.sub.endsWith(direct.capacityNote!)).toBe(true);
    expect(direct.capacityNote!.length).toBeGreaterThan(0);
  });

  it('a path no on-ramp of its kind reaches reads "none", with nothing invented to fill it', () => {
    const { tenanted } = ev('azure', 'uks');
    expect(tenanted.availability).toBe('none');
    expect(tenanted.onrampName).toBeNull();
    expect(tenanted.handoffSite).toBeNull();
    expect(tenanted.capacityNote).toBeNull();
    // The 92ms the region shape reports is the Chicago→London RTT via er1, the
    // ExpressRoute on-ramp on the OTHER card. It is not this path's figure.
    expect(tenanted.latencyMs).toBeNull();
    expect(shaped('azure', 'uks').latencyMs).toBeGreaterThan(0);
    expect(tenanted.caveats.join(' ')).toMatch(/No NetBond on-ramp targets this region/i);
  });

  it('does not repeat the reliability pill the panel renders above these cards', () => {
    // The caveat this replaces was unconditional in practice: `reliability`
    // can only be 'dual' with two ACTIVE on-ramps capturing one region, and the
    // four seeded on-ramps have zero overlapping targets. It printed on 18 of
    // 18 cards, no action could clear it, and RegionPanel already shows the
    // same fact as a pill 40px above. Caveats are for what differentiates.
    for (const r of allRegions()) {
      const copy = pathEvidence(CC as never, r.cloudId, r.regionId).flatMap(row => row.caveats).join(' ');
      expect(copy).not.toMatch(/dual-path/i);
      expect(copy).not.toMatch(/path-diverse/i);
    }
  });

  it('every caveat is one a customer action can clear — none is permanent boilerplate', () => {
    // A caveat that appears on all 18 cards is not evidence, it is decoration.
    const perCard = allRegions().flatMap(r =>
      pathEvidence(CC as never, r.cloudId, r.regionId).map(row => row.caveats),
    );
    const counts = new Map<string, number>();
    for (const caveats of perCard) for (const c of caveats) counts.set(c, (counts.get(c) ?? 0) + 1);
    const onEveryCard = [...counts].filter(([, n]) => n === perCard.length).map(([text]) => text);
    expect(onEveryCard).toEqual([]);
  });

  it('never mentions Equinix Fabric or an L3 hand-off — the engine carries neither', () => {
    const model = (CC as never as { fabricModel(): { regions: { cloudId: string; regionId: string }[] } }).fabricModel();
    for (const r of model.regions) {
      const copy = pathEvidence(CC as never, r.cloudId, r.regionId).flatMap(row => row.caveats).join(' ');
      expect(copy).not.toMatch(/Equinix Fabric/i);
      expect(copy).not.toMatch(/\bL3\b/);
    }
  });

  it('invariant: a region is captured by at most one on-ramp, in either path family', () => {
    // `row()`'s `latencyMs` is `region.latencyMs` — the ONE region-level figure
    // `fabricModel()` derives (from whichever on-ramp(s) target the region),
    // blind to which of the two path cards is asking for it (see the
    // `latencyMs` doc comment above). That figure is only ever correct because
    // "the four on-ramps have zero target overlap": no region is targeted by
    // more than one on-ramp, tenanted or direct. If a SECOND on-ramp — of
    // either family — ever targeted a region that already has one, that
    // second path would go from "none" to live/provisionable and render
    // *its own* hand-off next to a latency figure that is still the FIRST
    // on-ramp's (whichever the region shape's active/nearest pick resolves
    // to), because `_regionShape` picks one figure per region with no
    // knowledge of path family at all. Checking each family's count stays
    // <=1 independently is not enough to catch this — a region can go from
    // (0 direct, 1 tenanted) to (1 direct, 1 tenanted) without either
    // per-family count ever exceeding 1. The premise is the TOTAL: at most
    // one on-ramp of any kind per region.
    const model = (CC as never as {
      fabricModel(): {
        regions: { cloudId: string; regionId: string; onrampIds: string[] }[];
        onramps: { id: string; type: string }[];
      };
    }).fabricModel();
    const typeById = new Map(model.onramps.map(o => [o.id, o.type]));

    let checked = 0;
    for (const r of model.regions) {
      const families = r.onrampIds.map(id => (isTenanted(typeById.get(id) ?? '') ? 'tenanted' : 'direct'));
      expect(
        r.onrampIds.length,
        `${r.cloudId}/${r.regionId} is targeted by ${r.onrampIds.length} on-ramps (${families.join(', ') || 'none'}) — expected at most 1`,
      ).toBeLessThanOrEqual(1);
      checked++;
    }
    // Guard the guard: if the seeds ever stop producing any regions this
    // test would pass vacuously.
    expect(checked).toBeGreaterThan(0);
  });

  it('an unknown region yields no rows rather than throwing', () => {
    expect(pathEvidence(CC as never, 'aws', 'nope')).toEqual([]);
  });

  it('an unknown cloud yields no rows, even with a real region id', () => {
    expect(pathEvidence(CC as never, 'nope', 'use1')).toEqual([]);
  });

  /* The engine is a shared singleton and mutations persist for the rest of
     this file — this one runs last on purpose. */
  it('re-derives when the estate moves: activating an on-ramp turns its path live', () => {
    expect(ev('aws', 'usw2').direct.availability).toBe('provisionable');

    const changed = (CC as never as { activateOnramp(id: string): boolean }).activateOnramp('dx1');
    expect(changed).toBe(true);

    const after = ev('aws', 'usw2').direct;
    expect(after.availability).toBe('live');
    expect(after.caveats.join(' ')).not.toMatch(/Not live here yet/i);
    // The path now exists here, so it now reports the region's latency.
    expect(after.latencyMs).toBe(shaped('aws', 'usw2').latencyMs);
    // …and the sibling region the same on-ramp reaches moves with it.
    expect(ev('aws', 'euw1').direct.availability).toBe('live');
    // The tenanted card in the same region still reaches nothing, so it still
    // reports no latency — activating dx1 does not lend it dx1's figure.
    expect(ev('aws', 'usw2').tenanted.availability).toBe('none');
    expect(ev('aws', 'usw2').tenanted.latencyMs).toBeNull();
  });
});
