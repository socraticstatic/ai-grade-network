import { describe, it, expect } from 'vitest';
import { CC } from '../../engine';
import { buildSankey, PATH_NODES } from './sankeyModel';

describe('buildSankey', () => {
  it('has exactly two path nodes and no orphans', () => {
    const s = buildSankey(CC);
    const pathNodes = s.nodes.filter(n => n.band === 'path');
    expect(pathNodes.map(n => n.name).sort()).toEqual([PATH_NODES.private, PATH_NODES.public].sort());
    const linked = new Set(s.links.flatMap(l => [l.source, l.target]));
    s.nodes.forEach((_, i) => expect(linked.has(i)).toBe(true));
  });

  it('balances per path node: inflow equals outflow', () => {
    const s = buildSankey(CC);
    for (const [i, n] of s.nodes.entries()) {
      if (n.band !== 'path') continue;
      const inflow = s.links.filter(l => l.target === i).reduce((x, l) => x + l.value, 0);
      const outflow = s.links.filter(l => l.source === i).reduce((x, l) => x + l.value, 0);
      expect(Math.abs(inflow - outflow)).toBeLessThan(0.01);
    }
  });

  it('totals match routeFlows gbps plus the site band', () => {
    const s = buildSankey(CC);
    const total = (CC.routeFlows() as { gbps: number }[]).reduce((x, r) => x + r.gbps, 0);
    // Site-origin rollup links add the branch flows the sankey used to
    // ignore; the route-flow half of the source band still reconciles.
    const routeOut = s.links
      .filter(l => s.nodes[l.source].band === 'source' && !s.nodes[l.source].rollup)
      .reduce((x, l) => x + l.value, 0);
    expect(Math.abs(routeOut - total)).toBeLessThan(0.5);
  });

  it('rolls the site estate into class nodes - never one node per site', () => {
    const s = buildSankey(CC);
    const rollups = s.nodes.filter(n => n.rollup);
    expect(rollups.length).toBeGreaterThan(0);
    expect(rollups.length).toBeLessThanOrEqual(4); // dc/office/branch/atm at most
    // ACME: 1 dc + 5 offices, every site rolled up, none rendered singly
    const office = rollups.find(n => n.rollup?.siteClass === 'office');
    expect(office?.name).toBe('5 offices');
    expect(office?.rollup?.count).toBe(5);
  });

  it('every link is directional: source→path or path→dest only', () => {
    const s = buildSankey(CC);
    for (const l of s.links) {
      const a = s.nodes[l.source].band, b = s.nodes[l.target].band;
      expect((a === 'source' && b === 'path') || (a === 'path' && b === 'dest')).toBe(true);
    }
  });

  it('no node name contains the bidirectional arrow (↔ indicates c2c source misparsing)', () => {
    const s = buildSankey(CC);
    for (const node of s.nodes) {
      expect(node.name.includes('↔')).toBe(false);
    }
  });

  it('dest band contains "SaaS / internet egress" and does NOT contain "public internet"', () => {
    const s = buildSankey(CC);
    const destNodes = s.nodes.filter(n => n.band === 'dest');
    const destNames = destNodes.map(n => n.name);
    expect(destNames).toContain('SaaS / internet egress');
    expect(destNames).not.toContain('public internet');
    // Confirm "Public internet" exists only in path band
    const pathNodes = s.nodes.filter(n => n.band === 'path');
    const pathNames = pathNodes.map(n => n.name);
    expect(pathNames).toContain('Public internet');
  });

  it('dest band names "Object storage" the same way Flow Logs does — not state-routing\'s lowercase "object storage"', () => {
    const s = buildSankey(CC);
    const destNames = s.nodes.filter(n => n.band === 'dest').map(n => n.name);
    expect(destNames).toContain('Object storage');
    expect(destNames).not.toContain('object storage');
  });

  it('c2c flows land on the "Inter-cloud" dest node with value > 0', () => {
    const s = buildSankey(CC);
    const intercloudDest = s.nodes.find(n => n.band === 'dest' && n.name === 'Inter-cloud');
    expect(intercloudDest).toBeTruthy();
    const intercloudIdx = s.nodes.indexOf(intercloudDest!);
    const linksToIntercloud = s.links.filter(l => l.target === intercloudIdx);
    expect(linksToIntercloud.length).toBeGreaterThan(0);
    for (const link of linksToIntercloud) {
      expect(link.value).toBeGreaterThan(0);
    }
  });
});
