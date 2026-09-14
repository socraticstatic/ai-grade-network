import { describe, it, expect } from 'vitest';
import { buildLegMetricRows } from './legMetricRows';
import type { Connection } from '../../../types/connection';

const c2c: Connection = {
  id: 'conn-2',
  name: 'Multi-Cloud Production',
  type: 'Cloud to Cloud',
  status: 'Active',
  bandwidth: '10 Gbps',
  location: 'Dallas, TX',
  providers: ['Azure', 'AWS'],
  legs: [
    { provider: 'Azure', location: 'Dallas, TX', bandwidth: '10 Gbps', status: 'Active' },
    { provider: 'AWS', location: 'San Jose, CA', bandwidth: '5 Gbps', status: 'Provisioning' },
  ],
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

describe('buildLegMetricRows', () => {
  it('emits one row per leg for a C2C connection, each labelled with its cloud', () => {
    const rows = buildLegMetricRows([c2c]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ connectionId: 'conn-2', provider: 'Azure' });
    expect(rows[1]).toMatchObject({ connectionId: 'conn-2', provider: 'AWS' });
    expect(rows[0].label).toContain('Azure');
    expect(rows[1].label).toContain('AWS');
  });

  it('gives each leg row a stable, unique id', () => {
    const rows = buildLegMetricRows([c2c]);
    expect(rows[0].id).not.toBe(rows[1].id);
    expect(rows[0].id).toBe('conn-2:Azure');
  });

  it('carries per-leg status so a degraded leg is distinguishable', () => {
    const rows = buildLegMetricRows([c2c]);
    expect(rows.find((r) => r.provider === 'AWS')?.status).toBe('Provisioning');
    expect(rows.find((r) => r.provider === 'Azure')?.status).toBe('Active');
  });

  it('emits a single row for a non-C2C connection', () => {
    const rows = buildLegMetricRows([single]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 'conn-1', connectionId: 'conn-1', label: 'AWS Prod' });
    expect(rows[0].provider).toBeUndefined();
  });

  it('handles a mix of C2C and single connections', () => {
    const rows = buildLegMetricRows([single, c2c]);
    expect(rows.map((r) => r.id)).toEqual(['conn-1', 'conn-2:Azure', 'conn-2:AWS']);
  });
});
