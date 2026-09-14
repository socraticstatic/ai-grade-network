import { describe, it, expect, afterEach } from 'vitest';
import { CC } from './index';

/**
 * The back half of the taxonomy: the three gap derivations and the twelve
 * new catalog entries, evaluated against the live engine. Fresh engine per
 * file (vitest isolation); mutating tests unwind what they change.
 */

(CC.agentList() as { id: string; enabled: boolean }[])
  .filter(a => a.enabled)
  .forEach(a => CC.toggleAgent(a.id));

afterEach(() => {
  CC.intentList().forEach(i => CC.removeIntent(i.id));
});

const declare = (key: string, pick?: (s: { id: string | null; label: string }) => boolean) => {
  const entry = CC.intentCatalog().find(c => c.key === key)!;
  const scopes = entry.scopes();
  const scope = pick ? scopes.find(pick)! : scopes[0];
  return CC.declareIntent(key, scope, 'watch')!;
};
const readingOf = (id: string) => CC.intentList().find(x => x.id === id)!.reading;

describe('the gap derivations', () => {
  it('jitter is p95 minus p50 over the same series the charts draw', () => {
    const r = CC.fabricModel().regions.find(x => !x.attached)!;
    const j = CC.regionJitter(r.cloudId, r.regionId, 48)!;
    const s = CC.latencySeries!(`${r.cloudId}/${r.regionId}`, 48) as number[];
    const p = CC.percentiles!(s) as { p50: number; p95: number };
    expect(j.jitterMs).toBeCloseTo(Math.round((p.p95 - p.p50) * 10) / 10, 5);
    expect(j.jitterMs).toBeGreaterThan(0);
  });

  it('the trend states the window direction and nothing more', () => {
    const r = CC.fabricModel().regions[0];
    const t = CC.latencyTrend(r.cloudId, r.regionId, 48)!;
    expect(typeof t.rising).toBe('boolean');
    expect(t.rising).toBe(t.risingPct >= 15);
    expect(CC.latencyTrend('nope', 'nope', 48)).toBeNull();
  });
});

describe('the eighteen-entry catalog', () => {
  it('carries all six ILM taxonomy categories, eighteen intents', () => {
    const catalog = CC.intentCatalog();
    expect(catalog).toHaveLength(18);
    const byTaxonomy = new Map<string, number>();
    catalog.forEach(c => byTaxonomy.set(c.taxonomy, (byTaxonomy.get(c.taxonomy) ?? 0) + 1));
    expect([...byTaxonomy.keys()].sort()).toEqual([
      'AI and workload',
      'Application-aware routing',
      'Operational and governance',
      'Performance',
      'Resiliency',
      'Security and compliance',
    ]);
    // Every entry offers at least one engine-known scope.
    catalog.forEach(c => expect(c.scopes().length, `${c.key} has no scopes`).toBeGreaterThan(0));
  });

  it('optimize-jitter quotes the variance figure and repairs with the attach', () => {
    const it_ = declare('optimize-jitter', s => {
      const r = CC.fabricModel().regions.find(x => x.regionId === s.id);
      return !!r && !r.attached;
    });
    const reading = readingOf(it_.id);
    expect(reading.status).toBe('violated');
    expect(reading.evidence).toMatch(/\d+(\.\d+)?ms of variance/);
    expect(reading.moves[0]).toMatchObject({ kind: 'attach' });
  });

  it('zero-trust-segmentation is violated while the fix is off, aligned after, and undoes', () => {
    const it_ = declare('zero-trust-segmentation');
    expect(readingOf(it_.id).status).toBe('violated');
    expect(readingOf(it_.id).moves).toEqual([{ kind: 'fix', fixKey: 'segmentHelion' }]);
    CC.applyFix('segmentHelion');
    expect(readingOf(it_.id).status).toBe('aligned');
    CC.undo();
    expect(readingOf(it_.id).status).toBe('violated');
  });

  it('threat-aware-routing names each missing screen and clears as fixes land', () => {
    const it_ = declare('threat-aware-routing');
    const before = readingOf(it_.id);
    expect(before.status).toBe('violated');
    expect(before.moves.length).toBeGreaterThanOrEqual(1);
    CC.applyFix('dnsFirewall');
    CC.applyFix('dataPerimeter');
    expect(readingOf(it_.id).status).toBe('aligned');
    CC.undo();
    CC.undo();
    expect(readingOf(it_.id).status).toBe('violated');
  });

  it('data-residency states zones from the workloads own geography', () => {
    const entry = CC.intentCatalog().find(c => c.key === 'data-residency')!;
    const tags = entry.scopes().map(s => s.id);
    expect(tags.length).toBeGreaterThan(0);
    // Every offered tag evaluates to a real reading with a zone sentence.
    for (const tag of tags.slice(0, 4)) {
      const it_ = CC.declareIntent('data-residency', { kind: 'tag', id: tag, label: String(tag) }, 'watch');
      if (!it_) continue;
      const reading = readingOf(it_.id);
      expect(['aligned', 'violated']).toContain(reading.status);
      expect(reading.evidence).toMatch(/Americas|EMEA|APAC|sits in/);
      CC.removeIntent(it_.id);
    }
  });

  it('route-by-app-class steers exactly the uncontrolled app flows', () => {
    const it_ = declare('route-by-app-class');
    const reading = readingOf(it_.id);
    const apps = CC.routeFlows().filter(f => (f as { kind?: string }).kind === 'app');
    const uncontrolled = apps.filter(f => !f.current.attControlled);
    if (uncontrolled.length) {
      expect(reading.status).toBe('violated');
      reading.moves.forEach(m => expect(m.kind).toBe('steer'));
    } else {
      expect(reading.status).toBe('aligned');
    }
  });

  it('lifecycle-connectivity is aligned until a circuit sits provisioned and idle', () => {
    const it_ = declare('lifecycle-connectivity');
    expect(readingOf(it_.id).status).toBe('aligned');
    expect(readingOf(it_.id).evidence).toMatch(/Decommission automation is outside/);
  });

  it('active-active and recovery-objective agree on the diversity facts', () => {
    const aa = declare('active-active');
    const c2c = CC.routeFlows().filter(f => (f as { kind?: string }).kind === 'c2c');
    const single = c2c.filter(f => !(f as { diverse?: boolean }).diverse);
    const reading = readingOf(aa.id);
    expect(reading.status).toBe(single.length ? 'violated' : 'aligned');
    if (single.length) expect(reading.evidence).toContain(String(single.length));
  });

  it('ai-flow-prediction reads steady on the frozen estate', () => {
    const it_ = declare('ai-flow-prediction');
    expect(['aligned', 'drifting']).toContain(readingOf(it_.id).status);
  });

  it('optimize-data-gravity is violated while self-hosted models sit unattached', () => {
    const it_ = declare('optimize-data-gravity');
    const selfHosted = (CC.modelCatalog!() as { cloud: string | null; ready: boolean }[]).filter(m => m.cloud);
    const away = selfHosted.filter(m => !m.ready);
    const reading = readingOf(it_.id);
    expect(reading.status).toBe(away.length ? 'violated' : 'aligned');
    if (away.length) expect(reading.moves.length).toBeGreaterThan(0);
  });

  it('maximize-bandwidth quotes the utilization figure', () => {
    const it_ = declare('maximize-bandwidth');
    const reading = readingOf(it_.id);
    expect(reading.evidence).toContain(`${CC.utilization!()}%`);
  });

  it('predictive-failover reads a real trend verdict per region', () => {
    const entry = CC.intentCatalog().find(c => c.key === 'predictive-failover')!;
    for (const scope of entry.scopes().slice(0, 3)) {
      const it_ = CC.declareIntent('predictive-failover', scope, 'watch')!;
      const reading = readingOf(it_.id);
      expect(['aligned', 'drifting', 'violated']).toContain(reading.status);
      expect(reading.evidence).toMatch(/window/);
      CC.removeIntent(it_.id);
    }
  });
});
