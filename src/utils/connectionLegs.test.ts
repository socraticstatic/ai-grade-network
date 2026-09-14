import { describe, it, expect } from 'vitest';
import { isC2C, getConnectionLegs, legSummary, applyLegPatch } from './connectionLegs';
import type { Connection } from '../types/connection';

const c2c: Connection = {
  id: 'conn-2',
  name: 'Multi-Cloud Production',
  type: 'Cloud to Cloud',
  status: 'Active',
  bandwidth: '10 Gbps',
  location: 'Dallas, TX',
  provider: 'Azure',
  providers: ['Azure', 'AWS'],
  locations: ['Dallas, TX', 'San Jose, CA'],
  hubIds: ['router-hub'],
};

const single: Connection = {
  id: 'conn-1',
  name: 'AWS Prod',
  type: 'Internet to Cloud',
  status: 'Active',
  bandwidth: '1 Gbps',
  location: 'Ashburn, VA',
  provider: 'AWS',
};

describe('isC2C', () => {
  it('is true for a Cloud to Cloud connection', () => {
    expect(isC2C(c2c)).toBe(true);
  });
  it('is false for a single-cloud connection', () => {
    expect(isC2C(single)).toBe(false);
  });
});

describe('getConnectionLegs', () => {
  it('returns one leg per provider for a C2C connection', () => {
    expect(getConnectionLegs(c2c).map((l) => l.provider)).toEqual(['Azure', 'AWS']);
  });

  it('pairs each leg with its location by index', () => {
    const legs = getConnectionLegs(c2c);
    expect(legs[0].location).toBe('Dallas, TX');
    expect(legs[1].location).toBe('San Jose, CA');
  });

  it('marks every leg active when the connection is active (no phantom-inactive second leg)', () => {
    expect(getConnectionLegs(c2c).every((l) => l.status === 'Active')).toBe(true);
  });

  it('carries the connection bandwidth onto each leg', () => {
    expect(getConnectionLegs(c2c).every((l) => l.bandwidth === '10 Gbps')).toBe(true);
  });

  it('returns exactly one leg for a single-cloud connection', () => {
    const legs = getConnectionLegs(single);
    expect(legs).toHaveLength(1);
    expect(legs[0].provider).toBe('AWS');
    expect(legs[0].location).toBe('Ashburn, VA');
  });

  it('falls back to the singular provider when providers[] is absent', () => {
    const legs = getConnectionLegs({ ...c2c, providers: undefined });
    expect(legs).toHaveLength(1);
    expect(legs[0].provider).toBe('Azure');
  });

  it('uses persisted per-leg bandwidth and status when connection.legs is present', () => {
    const withLegs: Connection = {
      ...c2c,
      legs: [
        { provider: 'Azure', location: 'Dallas, TX', bandwidth: '10 Gbps', status: 'Active' },
        { provider: 'AWS', location: 'San Jose, CA', bandwidth: '5 Gbps', status: 'Provisioning' },
      ],
    };
    const legs = getConnectionLegs(withLegs);
    expect(legs[1].bandwidth).toBe('5 Gbps');
    expect(legs[1].status).toBe('Provisioning');
    expect(legs[0].status).toBe('Active');
  });

  it('falls back to connection-level values for omitted per-leg fields', () => {
    const withLegs: Connection = {
      ...c2c,
      bandwidth: '10 Gbps',
      legs: [{ provider: 'Azure' }, { provider: 'AWS' }],
    };
    const legs = getConnectionLegs(withLegs);
    expect(legs.every((l) => l.bandwidth === '10 Gbps')).toBe(true);
    expect(legs.every((l) => l.status === 'Active')).toBe(true);
  });

  it('attributes links to legs when links carry a provider', () => {
    const legs = getConnectionLegs(c2c, [
      { id: 'l1', provider: 'AWS' },
      { id: 'l2', provider: 'Azure' },
      { id: 'l3', provider: 'AWS' },
    ]);
    const aws = legs.find((l) => l.provider === 'AWS')!;
    const azure = legs.find((l) => l.provider === 'Azure')!;
    expect(aws.linkIds).toEqual(['l1', 'l3']);
    expect(azure.linkIds).toEqual(['l2']);
  });
});

describe('legSummary', () => {
  it('joins providers with a hub-preserving separator for C2C', () => {
    expect(legSummary(c2c)).toBe('Azure · AWS');
  });
  it('returns the single provider for a single-cloud connection', () => {
    expect(legSummary(single)).toBe('AWS');
  });
});

describe('applyLegPatch', () => {
  it('patches one leg and preserves the others, returning persistable leg configs', () => {
    const legs = applyLegPatch(c2c, 1, { bandwidth: '2 Gbps' });
    expect(legs).toHaveLength(2);
    expect(legs[1]).toMatchObject({ provider: 'AWS', bandwidth: '2 Gbps' });
    expect(legs[0].provider).toBe('Azure');
    expect(legs[0].bandwidth).toBe('10 Gbps');
  });

  it('materializes legs from providers when none are persisted', () => {
    const noLegs: Connection = { ...c2c, legs: undefined };
    const legs = applyLegPatch(noLegs, 0, { status: 'Provisioning' });
    expect(legs).toHaveLength(2);
    expect(legs[0].status).toBe('Provisioning');
    expect(legs[1].provider).toBe('AWS');
  });
});
