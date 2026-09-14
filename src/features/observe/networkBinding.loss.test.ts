import { describe, it, expect } from 'vitest';
import { CC } from '../../engine';
import { networkBinding } from './networkBinding';

describe('Observe loss metric', () => {
  it('telemetry carries a deterministic per-region loss series', () => {
    const a = CC.telemetry(24) as { regions: { loss: number[] }[] };
    const b = CC.telemetry(24) as { regions: { loss: number[] }[] };
    expect(a.regions.length).toBeGreaterThan(0);
    a.regions.forEach((r, i) => {
      expect(Array.isArray(r.loss)).toBe(true);
      expect(r.loss).toHaveLength(24);
      // deterministic: identical across calls, no Math.random/Date.now
      expect(r.loss).toEqual(b.regions[i].loss);
      r.loss.forEach(v => {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(2);
      });
    });
  });

  it('exposes a Packet Loss KPI as a sub-1% percentage', () => {
    const binding = networkBinding(CC);
    const kpis = binding.kpis();
    const loss = kpis.find(k => k.key === 'loss');
    expect(loss).toBeDefined();
    expect(loss!.label).toMatch(/loss/i);
    expect(loss!.unit).toBe('%');
    expect(Number(loss!.value)).toBeGreaterThanOrEqual(0);
    expect(Number(loss!.value)).toBeLessThan(1);
  });

  it('offers a Loss flow tab with a non-zero series', () => {
    const binding = networkBinding(CC);
    expect(binding.flowTabs().some(t => t.id === 'loss')).toBe(true);
    const series = binding.flowSeries('loss');
    expect(series.length).toBeGreaterThan(0);
    expect(series.some(p => p.v > 0)).toBe(true);
  });
});
