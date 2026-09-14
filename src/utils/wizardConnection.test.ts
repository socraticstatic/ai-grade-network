import { describe, it, expect } from 'vitest';
import { deriveC2CFields, buildHubForNewConnection } from './wizardConnection';

describe('deriveC2CFields', () => {
  it('builds a Cloud to Cloud record with one leg per selected cloud', () => {
    const out = deriveC2CFields({
      selectedType: 'Cloud to Cloud',
      selectedProviders: ['Azure', 'AWS'],
      selectedLocations: { Azure: ['Dallas, TX'], AWS: ['San Jose, CA'] },
      bandwidth: '10 Gbps',
      status: 'Inactive',
    });
    expect(out.type).toBe('Cloud to Cloud');
    expect(out.providers).toEqual(['Azure', 'AWS']);
    expect(out.legs).toHaveLength(2);
    expect(out.legs?.[0]).toMatchObject({ provider: 'Azure', location: 'Dallas, TX', bandwidth: '10 Gbps', status: 'Inactive' });
    expect(out.legs?.[1]).toMatchObject({ provider: 'AWS', location: 'San Jose, CA' });
    expect(out.locations).toEqual(['Dallas, TX', 'San Jose, CA']);
  });

  it('does not treat a single-provider connection as C2C', () => {
    const out = deriveC2CFields({
      selectedType: 'Internet to Cloud',
      selectedProviders: ['AWS'],
      selectedLocations: { AWS: ['Ashburn, VA'] },
      bandwidth: '1 Gbps',
      status: 'Inactive',
    });
    expect(out.type).toBe('Internet to AWS Cloud');
    expect(out.providers).toBeUndefined();
    expect(out.legs).toBeUndefined();
  });

  it('falls back to single-connection shape if C2C is selected with only one provider', () => {
    const out = deriveC2CFields({
      selectedType: 'Cloud to Cloud',
      selectedProviders: ['AWS'],
      selectedLocations: { AWS: ['Ashburn, VA'] },
      bandwidth: '1 Gbps',
      status: 'Inactive',
    });
    expect(out.legs).toBeUndefined();
  });

  it('uses the fallback location when a provider has none selected', () => {
    const out = deriveC2CFields({
      selectedType: 'Cloud to Cloud',
      selectedProviders: ['Azure', 'AWS'],
      selectedLocations: { Azure: ['Dallas, TX'] },
      fallbackLocation: 'US East',
      bandwidth: '10 Gbps',
      status: 'Provisioning',
    });
    expect(out.legs?.[1].location).toBe('US East');
    expect(out.legs?.[1].status).toBe('Provisioning');
  });
});

describe('buildHubForNewConnection', () => {
  it('creates a hub linked to the connection and named after it', () => {
    const gw = buildHubForNewConnection({
      connectionId: 'conn-x',
      name: 'My C2C',
      location: 'Dallas, TX',
      status: 'Inactive',
      createdAt: '2026-01-01T00:00:00Z',
    });
    expect(gw.id).toBe('gw-conn-x');
    expect(gw.name).toBe('My C2C');
    expect(gw.connectionIds).toEqual(['conn-x']);
    expect(gw.location).toBe('Dallas, TX');
    expect(gw.links).toEqual([]);
  });

  it('maps connection status to hub status', () => {
    const base = { connectionId: 'c', name: 'n', location: 'l', createdAt: 't' };
    expect(buildHubForNewConnection({ ...base, status: 'Active' }).status).toBe('active');
    expect(buildHubForNewConnection({ ...base, status: 'Inactive' }).status).toBe('inactive');
    expect(buildHubForNewConnection({ ...base, status: 'Provisioning' }).status).toBe('provisioning');
  });
});
