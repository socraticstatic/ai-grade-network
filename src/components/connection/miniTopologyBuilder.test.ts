import { describe, it, expect } from 'vitest';
import { buildConnectionTopology, buildHubTopology } from './miniTopologyBuilder';
import type { Connection } from '../../types/connection';
import type { Hub } from '../../types/hub';

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

describe('buildConnectionTopology (connection-centric)', () => {
  it('always draws the hub hub between core and clouds', () => {
    const { nodes } = buildConnectionTopology(c2c);
    expect(nodes.find((n) => n.icon === 'hub')).toBeTruthy();
  });

  it('draws one cloud node per leg for a C2C connection', () => {
    const clouds = buildConnectionTopology(c2c).nodes.filter((n) => n.icon === 'cloud');
    expect(clouds.map((c) => c.cloudProvider)).toEqual(['azure', 'aws']);
  });

  it('marks BOTH legs active when the connection is active (the phantom-inactive bug)', () => {
    const { nodes, edges } = buildConnectionTopology(c2c);
    const clouds = nodes.filter((n) => n.icon === 'cloud');
    expect(clouds.every((c) => c.isActive)).toBe(true);
    const cloudEdges = edges.filter((e) => e.from === 'router');
    expect(cloudEdges.every((e) => e.isActive)).toBe(true);
  });

  it('draws a single cloud for a single-cloud connection', () => {
    const clouds = buildConnectionTopology(single).nodes.filter((n) => n.icon === 'cloud');
    expect(clouds).toHaveLength(1);
  });
});

describe('buildHubTopology (hub-centric)', () => {
  const gw: Hub = {
    id: 'router-hub',
    name: 'NetBond-DAL-01',
    description: '',
    status: 'active',
    location: 'Dallas, TX',
    vendor: 'Cisco',
    createdAt: '',
    connectionIds: ['conn-2'],
    links: [],
  };

  it('expands a C2C connection into one cloud node per leg (no collapse to providers[0])', () => {
    const clouds = buildHubTopology(gw, [c2c]).nodes.filter((n) => n.icon === 'cloud');
    expect(clouds.map((c) => c.cloudProvider).sort()).toEqual(['aws', 'azure']);
  });

  it('tags each cloud node with its originating connection id', () => {
    const clouds = buildHubTopology(gw, [c2c]).nodes.filter((n) => n.icon === 'cloud');
    expect(clouds.every((c) => c.connectionId === 'conn-2')).toBe(true);
  });

  it('caps the number of cloud nodes and reports the overflow', () => {
    const many: Connection[] = Array.from({ length: 6 }, (_, i) => ({
      ...single,
      id: `c${i}`,
      provider: 'AWS',
    }));
    const { nodes, extraCount } = buildHubTopology(gw, many, { maxClouds: 4 });
    expect(nodes.filter((n) => n.icon === 'cloud')).toHaveLength(4);
    expect(extraCount).toBe(2);
  });
});
