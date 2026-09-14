import { describe, it, expect } from 'vitest';
import { CC } from '../../engine';
import { networkBinding } from './networkBinding';
import { insightKpis } from '../ai-fabric/insights/insightsFigures';

/**
 * A KPI tile is one number standing beside a table and a briefing rail that
 * describe the same estate. When the tile's population is not the table's, and
 * neither says so, the strip contradicts the page it heads.
 *
 * Both cases here were exactly that:
 *
 *  - `/naas/observe` read **P95 LATENCY 265ms** while the briefing rail on the
 *    same screen said "eu-north1 is the outlier at 204ms on the public path".
 *    The 265 came from a cloud-to-cloud row whose PUBLIC latency was priced off
 *    an AT&T backbone detour (`state-routing.ts`), so it was a figure no
 *    endpoint pair in the estate could produce.
 *  - `/ai/observe` read **TTFT 47ms** one click from `/ai/connect`'s catalog
 *    listing helion-cls-13b at **133ms P50** under a badge reading "3 / 3
 *    governed & ready", because TTFT counted only the models whose IDENTITY
 *    meter was ready (`tokenMeterList().ready` — attach AND the identity's
 *    governance fix) while the badge counts attach alone.
 *
 * Nothing below pins a millisecond: every expectation is read out of the engine
 * at assertion time.
 */

interface Kpi {
  key: string;
  label: string;
  value: string;
  unit?: string;
  sub?: string;
}
interface Row {
  current: { latencyMs: number };
}
interface Model {
  id: string;
  p50: number;
  ready: boolean;
}

const kpi = (list: Kpi[], key: string) => list.find(k => k.key === key)!;

describe('/naas/observe · the P95 tile and the briefing beside it', () => {
  it('takes P95 over the flow rows in the table below it, and says so', () => {
    const k = kpi(networkBinding(CC).kpis() as Kpi[], 'p95-latency');
    const rows = CC.routeFlows() as unknown as Row[];
    expect(rows.length).toBeGreaterThan(0);

    // The value is a percentile PICK, so it must be one of the row figures —
    // not an average, and not a figure no row carries.
    const shown = Number(k.value);
    expect(
      rows.map(r => Math.round(r.current.latencyMs)),
      `P95 ${shown}ms is not any flow row's latency`,
    ).toContain(shown);

    // …and the tile names its own population, because the rail beside it
    // measures a different one (regions, not flows).
    expect(k.sub, 'the P95 tile does not name its population').toMatch(
      new RegExp(`${rows.length}\\s+flows`),
    );
  });

  it('never states a latency above the estate’s worst public region', () => {
    /* The contradiction, as an invariant. The briefing names the slowest
       public-path REGION as the estate's outlier; a P95 over flows that
       exceeds it means some flow is being priced by something no region's
       geography supports — which is what the AT&T-derived east-west public
       figure was doing. */
    const shown = Number(kpi(networkBinding(CC).kpis() as Kpi[], 'p95-latency').value);
    const worstPublic = Math.max(
      ...CC.fabricModel().regions.map(r => CC.regionLatency(r.regionId)!.publicMs),
    );
    expect(shown, `P95 ${shown}ms exceeds the worst public region (${worstPublic}ms)`)
      .toBeLessThanOrEqual(worstPublic);
  });
});

describe('/ai/observe · the TTFT tile and /ai/connect’s catalog', () => {
  const models = () => CC.modelCatalog!() as Model[];

  it('counts the same models /ai/connect renders, and says how many', () => {
    const k = kpi(insightKpis(CC) as unknown as Kpi[], 'ttft');
    expect(k.sub, 'the TTFT tile does not name its population').toMatch(
      new RegExp(`${models().length}\\s+models`),
    );
  });

  it('is never below a P50 the catalog one click away displays', () => {
    /* P95 across the catalog's own series cannot sit under the slowest model's
       median. `TTFT 47ms` did, beside `helion-cls-13b … 133ms … Governed ·
       ready`, because it was measuring one model of three. */
    const shown = Number(kpi(insightKpis(CC) as unknown as Kpi[], 'ttft').value);
    const slowest = Math.max(...models().map(m => m.p50));
    expect(shown, `TTFT ${shown}ms is below the slowest catalog P50 (${slowest}ms)`)
      .toBeGreaterThanOrEqual(slowest);
  });

  it('does not read the meter-readiness gate, which counts a different set', () => {
    /* The two predicates must be allowed to disagree — that is the state the
       tour reaches — and TTFT must follow the catalog one, not the meter one. */
    const meterReady = (CC.tokenMeterList!() as { ready: boolean }[]).filter(m => m.ready).length;
    const catalogReady = models().filter(m => m.ready).length;
    const before = Number(kpi(insightKpis(CC) as unknown as Kpi[], 'ttft').value);

    // The tour's own Connect beat. It attaches every AI endpoint (so the
    // catalog goes n/n) while leaving both governance fixes unapplied (so the
    // meter gate does not).
    expect(CC.activateOnramp!('nb2')).toBeTruthy();

    const meterReadyAfter = (CC.tokenMeterList!() as { ready: boolean }[]).filter(m => m.ready).length;
    const catalogReadyAfter = models().filter(m => m.ready).length;
    expect(catalogReadyAfter, 'nb2 must make every catalogued model ready').toBe(models().length);
    expect(
      meterReadyAfter,
      'the two readiness predicates must disagree here, or this test proves nothing',
    ).toBeLessThan(catalogReadyAfter);

    const after = Number(kpi(insightKpis(CC) as unknown as Kpi[], 'ttft').value);
    const slowest = Math.max(...models().map(m => m.p50));
    expect(after, `TTFT ${after}ms is below the slowest catalog P50 (${slowest}ms) after attach`)
      .toBeGreaterThanOrEqual(slowest);
    // Attaching moves the network, so the figure moves — downward, and by less
    // than the population switch used to fake.
    expect(after).toBeLessThan(before);
    expect(meterReady).toBeLessThanOrEqual(catalogReady);
  });
});
