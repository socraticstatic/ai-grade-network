import { describe, it, expect } from 'vitest';
import { CC } from '../../engine';
import { flowLogs, BUCKETS } from './flowLogs';

describe('flowLogs', () => {
  it('is deterministic and yields records for every significant flow', () => {
    const a = flowLogs(CC);
    const b = flowLogs(CC);
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(0);
    // every record's bucket is from the fixed window
    expect(a.every(r => BUCKETS.includes(r.bucket))).toBe(true);
    // ids unique
    expect(new Set(a.map(r => r.id)).size).toBe(a.length);
  });

  it('path copies the engine attachment fact — the SAME verdict routeFlows() states', () => {
    // Mirror flowLogs.ts's own lookup: routeFlows() aggregates every flow
    // sharing a (tag, dst) key onto one row and states a single
    // attControlled verdict for it. A record's path must copy THAT verdict,
    // not re-derive one from its own flow's region — those can disagree
    // once a (tag, dst) pair spans regions with different attachment.
    const routeRows = CC.routeFlows() as { id: string; dst?: string; current: { attControlled: boolean } }[];
    const verdicts = new Map<string, boolean>();
    for (const row of routeRows) {
      if (!row.dst) continue; // c2c row — no (tag, dst) key
      const suffix = '-' + row.dst;
      if (!row.id.startsWith('r-') || !row.id.endsWith(suffix)) continue;
      const tag = row.id.slice(2, row.id.length - suffix.length);
      verdicts.set(`${tag}|${row.dst}`, row.current.attControlled);
    }
    const dstToRaw: Record<string, string> = {
      'AI endpoints': 'ai-endpoints',
      'Object storage': 'storage',
      'SaaS / internet egress': 'internet',
    };

    const records = flowLogs(CC);
    let fellBackToRegion = 0;
    for (const r of records) {
      const rawDst = dstToRaw[r.dst];
      const verdict = verdicts.get(`${r.src.tag}|${rawDst}`);
      if (verdict !== undefined) {
        expect(r.path).toBe(verdict ? 'private' : 'public');
      } else {
        // Fallback case: this (tag, dst) pair has no aggregate row in
        // routeFlows() (below its 1.5 Gbps significance filter) — the
        // record keeps the flow's own region.attached fact instead.
        fellBackToRegion++;
        const region = (CC.regions[r.src.cloudId] || []).find((x: { id: string }) => x.id === r.src.regionId) as {
          attached?: boolean;
        };
        expect(r.path).toBe(region?.attached ? 'private' : 'public');
      }
    }
    // The estate seeds at least one (tag, dst) pair below routeFlows()'s
    // significance filter (finance-invoices → storage) — assert the
    // fallback branch above is actually exercised, not vacuously true.
    expect(fellBackToRegion).toBeGreaterThan(0);
  });

  it('pre-deploy: no record is inspected and none is denied', () => {
    const recs = flowLogs(CC);
    expect(recs.every(r => !r.vsrx)).toBe(true);
    expect(recs.every(r => r.action === 'allow')).toBe(true);
  });

  it('a live managed VPC inspects its region and denies tagged internet-bound flows there', () => {
    // pick a region that actually sources a finance-invoices → internet flow
    const candidate = flowLogs(CC).find(r => r.src.tag === 'finance-invoices' && r.dst === 'SaaS / internet egress');
    expect(candidate).toBeTruthy();
    const { cloudId, regionId } = candidate!.src;
    const m = CC.deployManagedVpc({ cloudId, regionId })!;
    CC.advanceManagedVpc(m.id); CC.advanceManagedVpc(m.id); CC.advanceManagedVpc(m.id); CC.advanceManagedVpc(m.id);
    const recs = flowLogs(CC);
    const inRegion = recs.filter(r => r.src.regionId === regionId);
    expect(inRegion.length).toBeGreaterThan(0);
    expect(inRegion.every(r => r.vsrx?.zoneFrom === 'trust')).toBe(true);
    const denies = recs.filter(r => r.action === 'deny');
    expect(denies.length).toBeGreaterThan(0);
    expect(denies.every(r => r.src.tag === 'finance-invoices' && r.src.regionId === regionId)).toBe(true);
    // outside the inspected region nothing changed
    expect(recs.filter(r => r.src.regionId !== regionId).every(r => !r.vsrx && r.action === 'allow')).toBe(true);
    if (CC.canUndo()) CC.undo(); // restore any on-ramp activation
  });

  it('bytes scale with the flow gbps', () => {
    const recs = flowLogs(CC);
    const byFlow = new Map<string, number>();
    for (const r of recs) byFlow.set(r.src.label + '→' + r.dst, (byFlow.get(r.src.label + '→' + r.dst) ?? 0) + r.bytes);
    const sums = [...byFlow.values()];
    expect(Math.max(...sums)).toBeGreaterThan(Math.min(...sums)); // heavier flows carry more bytes
  });
});
