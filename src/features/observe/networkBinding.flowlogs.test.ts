import { describe, it, expect } from 'vitest';
import { CC } from '../../engine';
import { networkBinding } from './networkBinding';
import { flowLogs } from './flowLogs';

describe('networkBinding flow-log records', () => {
  it('ungrouped records mirror flowLogs with the seven columns', () => {
    const b = networkBinding(CC);
    expect(b.columns).toEqual(['Time', 'Source', 'Destination', 'Proto/Port', 'Bytes', 'Path', 'Action']);
    const rows = b.records('none');
    expect(rows.length).toBe(flowLogs(CC).length);
    // The shell renders `cells` directly as <td>s (no separate `label` column —
    // see ObservabilityShell.tsx's table body), so cells must carry all seven
    // columns, not six.
    expect(rows[0].cells.length).toBe(7);
  });

  it('group-by path yields exactly the private/public buckets present', () => {
    const b = networkBinding(CC);
    const rows = b.records('path');
    const labels = rows.map(r => r.label).sort();
    const paths = [...new Set(flowLogs(CC).map(r => r.path))].sort();
    expect(labels).toEqual(paths);
  });

  it('pre-deploy: no deny rows and no deny briefing sentence', () => {
    const b = networkBinding(CC);
    expect(b.records('none').every(r => r.tone !== 'bad')).toBe(true);
    expect(b.briefing().narrative.some(n => /blocked/.test(n.text))).toBe(false);
  });

  it('after a live managed VPC: deny rows are bad-toned and the briefing states the block', () => {
    const target = flowLogs(CC).find(r => r.src.tag === 'finance-invoices' && /internet/i.test(r.dst))!;
    const m = CC.deployManagedVpc({ cloudId: target.src.cloudId, regionId: target.src.regionId })!;
    CC.advanceManagedVpc(m.id); CC.advanceManagedVpc(m.id); CC.advanceManagedVpc(m.id); CC.advanceManagedVpc(m.id);
    const b = networkBinding(CC);
    const denies = b.records('none').filter(r => r.tone === 'bad');
    expect(denies.length).toBeGreaterThan(0);
    expect(b.briefing().narrative.some(n => /blocked \d+ flows/.test(n.text))).toBe(true);
    if (CC.canUndo()) CC.undo();
  });
});
