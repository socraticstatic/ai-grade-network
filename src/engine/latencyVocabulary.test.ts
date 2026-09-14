import { describe, it, expect } from 'vitest';
import { CC } from './index';

/* ONE latency vocabulary.
 *
 * The AI-grade network used to state three different latencies for the same estate:
 *   - `fabricModel().latencyMs` on /discover, Connect's Performance tile and
 *     both PathChoice cards (geometry: on-ramp site -> region geo),
 *   - the raw seed `r.lat` (and `r.lat * 1.7`) on every /naas/observe flow row,
 *   - a bare `~12ms` literal in the network briefing.
 * us-east-1 read 3ms on Connect and 12ms on the AT&T-controlled flow row one
 * click away — the same private path into the same region, two figures.
 *
 * These tests pin the derivation, not the numbers. Every latency the product
 * displays is `CC.regionLatency(regionId)` or a stated multiple of it, so a
 * seed change moves every surface together and none of them can drift apart.
 */

interface Path {
  id: string;
  attControlled: boolean;
  latencyMs: number;
  via?: string | null;
}
interface Row {
  id: string;
  kind?: string;
  label: string;
  srcRid?: string;
  paths: Path[];
  current: Path;
}

const rows = () => CC.routeFlows() as unknown as Row[];
const appRows = () => rows().filter(r => r.kind !== 'c2c');
const c2cRows = () => rows().filter(r => r.kind === 'c2c');
/** The region's FABRIC figure — what an AT&T path into it costs. */
const fabricLat = () =>
  Object.fromEntries(CC.fabricModel().regions.map(r => [r.regionId, r.privateMs])) as Record<string, number>;
/** The figure Connect's node and Discover's tile actually render for a region:
 *  the one for the path it is on today. */
const shownLat = () =>
  Object.fromEntries(CC.fabricModel().regions.map(r => [r.regionId, r.latencyMs])) as Record<string, number>;

/** Great-circle miles between two seeded regions, from their own `geo`. */
function airMiles(a: [number, number], b: [number, number]): number {
  const R = 3958.8;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b[0] - a[0]);
  const dLon = rad(b[1] - a[1]);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
function geoOf(rid: string): [number, number] {
  const all = Object.values(
    (CC as unknown as { regions: Record<string, { id: string; geo: [number, number] }[]> }).regions,
  ).flat();
  return all.find(r => r.id === rid)!.geo;
}
/** A c2c row's two endpoint region ids, read off the label the engine builds
 *  from those endpoints (`"<cloud> <region> ↔ <cloud> <region>"`). */
function endpointsOf(row: Row): [string, string] {
  const regions = CC.fabricModel().regions;
  const [a, b] = row.label.split('↔');
  const pick = (side: string) => {
    const hit = regions
      .filter(r => side.includes(r.name))
      .sort((x, y) => y.name.length - x.name.length)[0];
    expect(hit, `no region named in "${side}"`).toBeTruthy();
    return hit.regionId;
  };
  return [pick(a), pick(b)];
}

/** Every latency figure the engine can legitimately derive for a region. */
function derivedFigures(): Set<number> {
  const out = new Set<number>();
  for (const r of CC.fabricModel().regions) {
    const l = CC.regionLatency(r.regionId)!;
    out.add(l.privateMs);
    out.add(l.publicMs);
  }
  return out;
}

describe('regionLatency() is the one region-latency derivation', () => {
  it('agrees with fabricModel() for every region', () => {
    const fab = fabricLat();
    expect(Object.keys(fab).length).toBeGreaterThan(0);
    for (const [rid, ms] of Object.entries(fab)) {
      expect(CC.regionLatency(rid), `no regionLatency for ${rid}`).toBeTruthy();
      expect(CC.regionLatency(rid)!.privateMs, `${rid} private figure`).toBe(ms);
    }
  });

  /* The figure Connect's region node and Discover's tile RENDER is the one for
     the path the region is on, so the word beside it ("Private" / "Public",
     "LATENCY · FABRIC" / "LATENCY · PUBLIC") and the number describe the same
     path — and so /naas/observe, which states the current-path figure for the
     same region, agrees with both. `latencyMs` used to be `privateMs`
     unconditionally: eight of nine regions showed "Public · 54ms" here and
     "92ms · Public internet" one click away. */
  it('the figure a region DISPLAYS is the one for the path it is on', () => {
    const regions = CC.fabricModel().regions;
    expect(regions.length).toBeGreaterThan(0);
    for (const r of regions) {
      const l = CC.regionLatency(r.regionId)!;
      expect(r.privateMs, `${r.regionId} privateMs`).toBe(l.privateMs);
      expect(r.publicMs, `${r.regionId} publicMs`).toBe(l.publicMs);
      expect(r.latencyMs, `${r.regionId} states the wrong path's figure`).toBe(
        r.path === 'private' ? l.privateMs : l.publicMs,
      );
    }
    // The estate must contain both states, or the assertion above is vacuous.
    expect(regions.some(r => r.path === 'private'), 'no private region seeded').toBe(true);
    expect(regions.some(r => r.path === 'public'), 'no public region seeded').toBe(true);
  });

  it('prices the public path off the same figure, and never below it', () => {
    for (const r of CC.fabricModel().regions) {
      const l = CC.regionLatency(r.regionId)!;
      expect(l.publicMs).toBe(Math.round(l.privateMs * CC.PUBLIC_TRANSIT_FACTOR));
      expect(l.publicMs, `${r.regionId}: public path must not beat the fabric`).toBeGreaterThan(l.privateMs);
    }
  });

  it('returns null for a region the engine does not carry', () => {
    expect(CC.regionLatency('no-such-region')).toBeNull();
  });
});

describe('flow rows on /naas/observe speak the same vocabulary', () => {
  it('every AT&T path states the region figure Connect and Discover render', () => {
    const fab = fabricLat();
    const checked: string[] = [];
    for (const row of appRows()) {
      const rid = row.srcRid!;
      for (const p of row.paths.filter(x => x.attControlled)) {
        expect(p.latencyMs, `${row.id} · ${p.id} disagrees with fabricModel(${rid})`).toBe(fab[rid]);
        checked.push(row.id);
      }
    }
    expect(checked.length, 'the seed must carry AT&T paths to check').toBeGreaterThan(0);
  });

  it('every public path is the same figure times the stated transit factor', () => {
    const fab = fabricLat();
    for (const row of appRows()) {
      const pub = row.paths.find(p => p.id === 'public')!;
      expect(pub.latencyMs, `${row.id} public path`).toBe(Math.round(fab[row.srcRid!] * CC.PUBLIC_TRANSIT_FACTOR));
    }
  });

  /* The cross-screen walk, as an invariant rather than a walk: whatever a flow
     row shows for a region must be the figure Connect's node and Discover's
     tile show for that region — because both are "the figure for the path this
     thing is on", and an app flow's default path follows its region's
     attachment. This is the one that bites the original finding from the other
     side: it fails the moment `latencyMs` goes back to being `privateMs`. */
  it('a flow row on its default path shows exactly what Connect and Discover show', () => {
    const shown = shownLat();
    let checked = 0;
    for (const row of appRows().filter(r => !(r as unknown as { steered?: boolean }).steered)) {
      expect(row.current.latencyMs, `${row.id} disagrees with the region tile it came from`).toBe(
        shown[row.srcRid!],
      );
      checked++;
    }
    expect(checked, 'the seed must carry app flow rows to check').toBeGreaterThan(0);
  });

  it('no row displays a latency the engine cannot derive', () => {
    const ok = derivedFigures();
    for (const row of appRows()) {
      expect(ok.has(row.current.latencyMs), `${row.id} shows ${row.current.latencyMs}ms, which no region carries`).toBe(true);
    }
  });

  it('steering a flow onto the AT&T path always lowers the number it shows', () => {
    for (const row of appRows()) {
      const att = row.paths.find(p => p.attControlled)!;
      const pub = row.paths.find(p => p.id === 'public')!;
      expect(att.latencyMs, `${row.id}: the advisor recommends a slower path`).toBeLessThan(pub.latencyMs);
    }
  });
});

describe('cloud-to-cloud rows derive from their endpoints, not from a literal', () => {
  it('two different region pairs do not share one latency', () => {
    const byId = Object.fromEntries(c2cRows().map(r => [r.id, r]));
    const azure = byId['c2c-aws-azure'];
    const gcp = byId['c2c-aws-gcp'];
    expect(azure && gcp, 'both backbone pairs must exist').toBeTruthy();
    // us-east-1 <-> West US 2 and us-east-1 <-> us-central1 are different
    // distances. Identical figures mean the number was typed, not derived.
    expect(azure.paths.find(p => p.id === 'public')!.latencyMs).not.toBe(
      gcp.paths.find(p => p.id === 'public')!.latencyMs,
    );
    const azureAtt = azure.paths.filter(p => p.attControlled).map(p => p.latencyMs);
    const gcpAtt = gcp.paths.filter(p => p.attControlled).map(p => p.latencyMs);
    expect(azureAtt).not.toEqual(gcpAtt);
  });

  it('the two GPU DCI pairs do not share one latency', () => {
    const byId = Object.fromEntries(c2cRows().map(r => [r.id, r]));
    expect(byId['c2c-aws-cw'].paths.find(p => p.id === 'public')!.latencyMs).not.toBe(
      byId['c2c-azure-neb'].paths.find(p => p.id === 'public')!.latencyMs,
    );
  });

  /* Both `currentPath` (reroute on failure) and `routeAdvisor` ("steer here")
     take the FIRST available AT&T path, so the list must be ordered best-first
     for either promise to hold. */
  it('backbone paths sort best-first', () => {
    for (const row of c2cRows()) {
      const att = row.paths.filter(p => p.attControlled);
      expect(att.length, `${row.id} has no backbone path`).toBeGreaterThan(0);
      expect(att.map(p => p.latencyMs)).toEqual(att.map(p => p.latencyMs).slice().sort((a, b) => a - b));
    }
  });

  /* THE east-west derivation, stated as the property that distinguishes it.
   *
   * A public path between two endpoints is a function of THOSE TWO ENDPOINTS —
   * the public internet does not ride AT&T's PoPs — so ordering the pairs by
   * their endpoints' great-circle distance must order their public latencies
   * the same way. Pricing the public figure as `best AT&T route × factor`
   * broke exactly this: `AWS us-east-1 ↔ CoreWeave US-EAST-04A` is the
   * SHORTEST pair in the estate (Virginia to New Jersey) and carried the
   * second-largest public figure, 100ms, because the only PoP reaching
   * CoreWeave is in Dallas. It drove /naas/observe's P95 KPI to 265ms beside a
   * briefing naming 204ms as the estate's public outlier.
   *
   * Distance comes from the seeded `geo` this test reads itself; the latencies
   * come from the engine. Nothing here is a pinned millisecond. */
  it('public east-west latency is ordered by the endpoints’ own distance, not by the AT&T route', () => {
    const pairs = c2cRows().map(row => {
      const [a, b] = endpointsOf(row);
      return {
        id: row.id,
        miles: airMiles(geoOf(a), geoOf(b)),
        publicMs: row.paths.find(p => p.id === 'public')!.latencyMs,
      };
    });
    expect(pairs.length, 'the seed must carry cloud-to-cloud pairs').toBeGreaterThan(1);
    const byDistance = pairs.slice().sort((x, y) => x.miles - y.miles);
    const byLatency = pairs.slice().sort((x, y) => x.publicMs - y.publicMs);
    expect(
      byLatency.map(p => p.id),
      `public east-west figures are not ordered by endpoint distance: ${JSON.stringify(pairs)}`,
    ).toEqual(byDistance.map(p => p.id));
  });

  /* Stated the other way round: the public figure is NOT the AT&T route times
     the transit factor. North-south is (the two share one endpoint pair and
     one on-ramp), but east-west cannot be, because the AT&T route for a pair
     hairpins through a PoP that the public path never touches. At least one
     pair must break that identity, or the old derivation is still in place. */
  it('east-west public figures are not all the AT&T route times the transit factor', () => {
    const pairs = c2cRows();
    // A pair whose serving PoP sits next to one endpoint (us-east-1 / Ashburn)
    // lands on that identity by coincidence — the two routes really are the
    // same length there. What cannot happen is EVERY pair matching, which is
    // what `public = best AT&T × factor` made true by construction.
    const matching = pairs.filter(row => {
      const pub = row.paths.find(p => p.id === 'public')!;
      const att = row.paths.filter(p => p.attControlled);
      return att.length > 0 && pub.latencyMs === Math.round(att[0].latencyMs * CC.PUBLIC_TRANSIT_FACTOR);
    });
    expect(pairs.length).toBeGreaterThan(1);
    expect(
      matching.length,
      'every pair prices its public path off the AT&T route that serves it',
    ).toBeLessThan(pairs.length);
  });

  it('the advisor never claims a latency saving the paths do not support', () => {
    const advice = () =>
      (CC.routeAdvisor() as unknown as {
        recommendations: { flowId: string; detail: string }[];
      }).recommendations;
    let checked = 0;
    for (const row of rows()) {
      const att = row.paths.find(p => p.attControlled && (p as unknown as { available: boolean }).available);
      const pub = row.paths.find(p => p.id === 'public');
      if (!att || !pub || row.current.attControlled) continue;
      const rec = advice().find(r => r.flowId === row.id);
      expect(rec, `${row.id} is steerable but the advisor does not offer it`).toBeTruthy();
      const delta = pub.latencyMs - att.latencyMs;
      if (delta > 0) expect(rec!.detail, `${row.id}`).toContain(`−${delta}ms`);
      else if (delta < 0) expect(rec!.detail, `${row.id}`).toContain(`+${-delta}ms`);
      else expect(rec!.detail, `${row.id}`).toContain('no latency change');
      checked++;
    }
    expect(checked, 'the seed must carry a steerable flow').toBeGreaterThan(0);
  });

  /* A truncated list must not drop the whole class of recommendation another
     screen states is empty. After the tour's Connect beat, five
     controlled-but-single-homed flows filled `recs.slice(0,5)` and /naas/cost's
     "Steer to save" panel — which reads only `action === 'steer'` out of that
     slice — printed "Every flow is already on its optimal path — there is
     nothing left to steer" while two flow rows on /naas/observe read
     "Public internet · Uncontrolled" with a live Steer button. */
  it('every steerable flow is offered, whatever else is competing for the list', () => {
    const steerable = rows().filter(
      r =>
        !r.current.attControlled &&
        r.paths.some(p => p.attControlled && (p as unknown as { available: boolean }).available),
    );
    const offered = (CC.routeAdvisor() as unknown as {
      recommendations: { flowId: string; action: string }[];
    }).recommendations.filter(r => r.action === 'steer');
    expect(steerable.length, 'the seed must carry a steerable flow').toBeGreaterThan(0);
    expect(
      steerable.map(r => r.id).filter(id => !offered.some(o => o.flowId === id)),
      'a flow the table offers a Steer button for is missing from the advisor',
    ).toEqual([]);
  });

  it('names both endpoints, and the scene graph draws to the endpoint it names', () => {
    const scene = CC.sceneGraph() as { edges: { flowId: string; to: string; kindC2C?: boolean }[] };
    for (const row of c2cRows() as unknown as { id: string; label: string; dstCloud: string }[]) {
      const edge = scene.edges.find(e => e.flowId === row.id)!;
      expect(edge, `${row.id} has no scene edge`).toBeTruthy();
      expect(edge.to, `${row.id} (“${row.label}”) draws into ${edge.to}`).toBe('c-' + row.dstCloud);
    }
  });
});

describe('the network briefing quotes the same figures', () => {
  it('states no latency the engine cannot derive', () => {
    const ok = derivedFigures();
    const text = String(CC.obsSummary());
    const quoted = [...text.matchAll(/(\d+)ms/g)].map(m => Number(m[1]));
    expect(quoted.length, 'the briefing must quote at least one latency').toBeGreaterThan(0);
    for (const ms of quoted) {
      expect(ok.has(ms), `briefing states ${ms}ms, which no region carries: "${text}"`).toBe(true);
    }
  });

  it('says what the private-envelope figure measures', () => {
    const text = String(CC.obsSummary());
    expect(text).toMatch(/on-ramp/i);
  });
});

describe('the per-region latency chart ends on the figure the tree shows', () => {
  it('attached regions land on their fabric figure, public ones on the public figure', () => {
    for (const r of CC.fabricModel().regions) {
      const key = r.cloudId + '/' + r.regionId;
      const series = CC.latencySeries!(key, 24) as number[];
      const l = CC.regionLatency(r.regionId)!;
      expect(series.length).toBe(24);
      expect(series[series.length - 1], `${key} chart tail`).toBe(r.attached ? l.privateMs : l.publicMs);
    }
  });
});

describe('the latency SLO rule measures with the same ruler', () => {
  it('quotes only figures the engine derives', () => {
    // `latency-slo` is reachable only through an authored policy, so author one.
    const pol = CC.addPolicy!({ tag: 'classified-helion', requirement: 'latency-slo', param: 10 });
    expect(pol, 'the latency-slo requirement must be authorable').toBeTruthy();
    const { matched, violations } = CC.evalPolicy!(pol) as {
      matched: unknown[];
      violations: { msg: string }[];
    };
    expect(matched.length, 'the seed must carry classified-helion workloads').toBeGreaterThan(0);
    expect(violations.length, 'a 10ms SLO must be violated somewhere in the seed').toBeGreaterThan(0);
    const ok = derivedFigures();
    for (const v of violations) {
      const ms = Number(/(\d+)ms exceeds/.exec(v.msg)?.[1]);
      expect(ok.has(ms), `SLO finding states ${ms}ms, which no region carries`).toBe(true);
    }
    CC.removePolicy!(pol.id);
  });
});

/* Mutating tests last: the engine is a shared singleton within a file. */

const MODEL_ENDPOINT: Record<string, string> = { 'helion-70b': 'cwe', 'helion-cls-13b': 'nbe' };
/** A self-hosted model's P50 minus the network its endpoint sits behind. */
function computeTerms(): Record<string, number> {
  const models = CC.modelCatalog!() as { id: string; p50: number }[];
  const out: Record<string, number> = {};
  for (const [id, rid] of Object.entries(MODEL_ENDPOINT)) {
    const attached = CC.fabricModel().regions.find(r => r.regionId === rid)!.attached;
    const l = CC.regionLatency(rid)!;
    out[id] = models.find(m => m.id === id)!.p50 - (attached ? l.privateMs : l.publicMs);
  }
  return out;
}

describe('the AI model catalog measures with the same ruler', () => {
  it("a self-hosted model's P50 moves by exactly its region's figure when that region attaches", () => {
    const before = computeTerms();
    // nb2 is the on-ramp that attaches both GPU regions.
    expect(CC.activateOnramp!('nb2')).toBeTruthy();
    const after = computeTerms();
    // Only the network term may move; the compute seed is what the GPU takes.
    expect(after).toEqual(before);
    for (const v of Object.values(after)) expect(v).toBeGreaterThan(0);
  });
});

describe('a fabric path that costs latency says so', () => {
  it('states +Nms when the AT&T route is the longer one', () => {
    /* nb2 is active by the test above. The GPU DCI reaches CoreWeave's New
       Jersey region only through the Dallas PoP, so `AWS us-east-1 ↔ CoreWeave`
       is genuinely longer on the fabric than on the public internet — Virginia
       to New Jersey the direct way. The steer is still worth making (egress
       rate, AT&T control), and the recommendation has to say what it costs
       rather than clamp the delta to "−0ms" beside a table showing both. */
    const cc = CC as unknown as { steerFlow(a: string, b: string): boolean; clearSteer(a: string): boolean };
    const id = 'c2c-aws-cw';
    const before = c2cRows().find(r => r.id === id)!;
    const att = before.paths.find(p => p.attControlled)!;
    const pub = before.paths.find(p => p.id === 'public')!;
    expect(att.latencyMs, 'this pair must be the longer one on the fabric').toBeGreaterThan(pub.latencyMs);

    expect(cc.steerFlow(id, 'public')).toBe(true);
    const rec = (CC.routeAdvisor() as unknown as {
      recommendations: { flowId: string; detail: string }[];
    }).recommendations.find(r => r.flowId === id);
    expect(rec, 'the advisor drops the one recommendation that costs latency').toBeTruthy();
    expect(rec!.detail).toContain(`+${att.latencyMs - pub.latencyMs}ms`);
    // …and it still leads with what the path buys.
    expect(rec!.detail).toMatch(/\/GB/);
    expect(rec!.detail).toMatch(/AT&T-controlled/);
    cc.clearSteer(id);
  });
});

describe('after activateOnramp("dx1") — a state the engine can reach', () => {
  it('holds every agreement above', () => {
    CC.activateOnramp('dx1');
    const fab = fabricLat();
    for (const row of appRows()) {
      const rid = row.srcRid!;
      for (const p of row.paths.filter(x => x.attControlled)) {
        expect(p.latencyMs, `${row.id} · ${p.id} after attach`).toBe(fab[rid]);
      }
      expect(row.paths.find(p => p.id === 'public')!.latencyMs).toBe(
        Math.round(fab[rid] * CC.PUBLIC_TRANSIT_FACTOR),
      );
    }
    const ok = derivedFigures();
    const text = String(CC.obsSummary());
    for (const m of text.matchAll(/(\d+)ms/g)) {
      expect(ok.has(Number(m[1])), `briefing states ${m[1]}ms after attach: "${text}"`).toBe(true);
    }
    for (const r of CC.fabricModel().regions) {
      const l = CC.regionLatency(r.regionId)!;
      const series = CC.latencySeries!(r.cloudId + '/' + r.regionId, 24) as number[];
      expect(series[series.length - 1], `${r.regionId} chart tail after attach`).toBe(
        r.attached ? l.privateMs : l.publicMs,
      );
    }
  });
});
