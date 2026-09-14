import { describe, it, expect } from 'vitest';
import { CC } from './index';

/**
 * Standing intents against the live engine singleton. Order matters: the
 * seeded-estate readings run first, mutations last, and every mutating test
 * restores through the same Undo it asserts.
 *
 * Nothing pins a number: every expectation is read out of the engine at
 * assertion time, so a reseeded estate moves the assertions with it.
 */

/* Freeze the agents - the 7s tick meters and would move budget percents
   mid-file. The engine's own supported stop. */
(CC.agentList() as { id: string; enabled: boolean }[])
  .filter(a => a.enabled)
  .forEach(a => CC.toggleAgent(a.id));

const catalogKeys = () => CC.intentCatalog().map(c => c.key);
const scopeFor = (key: string, pick?: (s: { kind: string; id: string | null; label: string }) => boolean) => {
  const entry = CC.intentCatalog().find(c => c.key === key)!;
  const scopes = entry.scopes();
  return pick ? scopes.find(pick)! : scopes[0];
};

describe('the catalog', () => {
  it('carries the founding six among the full eighteen, each with engine-known scopes', () => {
    // The full-taxonomy count and category coverage are pinned in
    // state-intents.catalog.test.ts; this file guards the founding six.
    expect(catalogKeys()).toHaveLength(18);
    for (const key of [
      'cap-token-spend',
      'data-sensitivity',
      'minimize-latency',
      'path-diversity',
      'private-inference',
      'route-by-cost',
    ]) {
      expect(catalogKeys()).toContain(key);
    }
    for (const entry of CC.intentCatalog()) {
      const scopes = entry.scopes();
      expect(scopes.length, `${entry.key} offers no scopes`).toBeGreaterThan(0);
      scopes.forEach(s => expect(s.label.length).toBeGreaterThan(0));
    }
  });

  it('declares nothing for an unknown key or a scope the engine does not carry', () => {
    expect(CC.declareIntent('optimize-jitter', { kind: 'estate', id: null, label: 'x' }, 'watch')).toBeNull();
    expect(
      CC.declareIntent('minimize-latency', { kind: 'region', id: 'no-such-region', label: 'x' }, 'watch'),
    ).toBeNull();
    expect(CC.intentList()).toHaveLength(0);
  });
});

describe('seeded readings (nothing declared, nothing mutated)', () => {
  it('private-inference reads violated on the cold estate, with repair moves', () => {
    const scope = scopeFor('private-inference');
    const it_ = CC.declareIntent('private-inference', scope, 'watch')!;
    const reading = CC.intentList().find(x => x.id === it_.id)!.reading;
    // The seeded estate routes identities over the public internet.
    const publicCount = (CC.modelRoutes!() as { path: string }[]).filter(r => r.path === 'public').length;
    expect(publicCount).toBeGreaterThan(0);
    expect(reading.status).toBe('violated');
    expect(reading.moves.length).toBeGreaterThan(0);
    expect(reading.evidence).toContain(String(publicCount));
    CC.removeIntent(it_.id);
  });

  it('data-sensitivity on classified-helion reads violated with the inspection fix', () => {
    const scope = scopeFor('data-sensitivity', s => s.id === 'classified-helion');
    const it_ = CC.declareIntent('data-sensitivity', scope, 'watch')!;
    const reading = CC.intentList().find(x => x.id === it_.id)!.reading;
    expect(CC.fixes.fwInspection).toBe(false);
    expect(reading.status).toBe('violated');
    expect(reading.moves).toEqual([{ kind: 'fix', fixKey: 'fwInspection' }]);
    CC.removeIntent(it_.id);
  });

  it('route-by-cost reads violated while public flows have AT&T paths available', () => {
    const scope = scopeFor('route-by-cost', s => s.kind === 'estate');
    const it_ = CC.declareIntent('route-by-cost', scope, 'watch')!;
    const reading = CC.intentList().find(x => x.id === it_.id)!.reading;
    const steerable = (CC.routeFlows() as { current: { attControlled: boolean }; paths: { attControlled: boolean; available: boolean }[] }[])
      .filter(f => !f.current.attControlled && f.paths.some(p => p.attControlled && p.available));
    expect(steerable.length).toBeGreaterThan(0);
    expect(reading.status).toBe('violated');
    expect(reading.moves).toHaveLength(steerable.length);
    reading.moves.forEach(m => expect(m.kind).toBe('steer'));
    CC.removeIntent(it_.id);
  });

  it('cap-token-spend reads aligned under 80 percent of budget', () => {
    const meter = (CC.tokenMeterList() as { tag: string; pct: number }[]).find(m => m.pct < 80)!;
    const scope = scopeFor('cap-token-spend', s => s.id === meter.tag);
    const it_ = CC.declareIntent('cap-token-spend', scope, 'watch')!;
    expect(CC.intentList().find(x => x.id === it_.id)!.reading.status).toBe('aligned');
    CC.removeIntent(it_.id);
  });

  it('a duplicate declaration (same key and scope) is refused', () => {
    const scope = scopeFor('private-inference');
    const a = CC.declareIntent('private-inference', scope, 'watch')!;
    expect(CC.declareIntent('private-inference', scope, 'watch')).toBeNull();
    CC.removeIntent(a.id);
  });
});

describe('mutations move the reading; Undo restores everything', () => {
  it('applying the repair flips data-sensitivity to aligned, and undo flips it back', () => {
    const scope = scopeFor('data-sensitivity', s => s.id === 'finance-invoices');
    const it_ = CC.declareIntent('data-sensitivity', scope, 'watch')!;
    expect(CC.intentList().find(x => x.id === it_.id)!.reading.status).toBe('violated');

    CC.applyFix('isolateFinance');
    expect(CC.intentList().find(x => x.id === it_.id)!.reading.status).toBe('aligned');

    CC.undo(); // the fix
    expect(CC.intentList().find(x => x.id === it_.id)!.reading.status).toBe('violated');
    CC.removeIntent(it_.id);
    CC.undo(); // the removal restores the declaration
    expect(CC.intentList().some(x => x.key === 'data-sensitivity')).toBe(true);
    CC.undo(); // the declaration itself
    expect(CC.intentList().some(x => x.key === 'data-sensitivity')).toBe(false);
  });

  it('enforce-mode cap applies the standing control, and undo restores it', () => {
    const meter = (CC.tokenMeterList() as { tag: string }[])[0];
    const before = (CC.tokenPolicy!(meter.tag) as { enforced: boolean }).enforced;
    expect(before).toBe(false);

    const scope = scopeFor('cap-token-spend', s => s.id === meter.tag);
    const it_ = CC.declareIntent('cap-token-spend', scope, 'enforce')!;
    expect((CC.tokenPolicy!(meter.tag) as { enforced: boolean }).enforced).toBe(true);
    expect(CC.intentCapEnforced(meter.tag)).toBe(true);

    CC.setIntentMode(it_.id, 'watch');
    expect((CC.tokenPolicy!(meter.tag) as { enforced: boolean }).enforced).toBe(false);
    expect(CC.intentCapEnforced(meter.tag)).toBe(false);

    CC.undo(); // mode change back to enforce
    expect(CC.intentCapEnforced(meter.tag)).toBe(true);
    CC.undo(); // the declaration (and its control)
    expect(CC.intentList()).toHaveLength(0);
    expect(CC.intentCapEnforced(meter.tag)).toBe(false);
  });
});
