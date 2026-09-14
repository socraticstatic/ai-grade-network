import { describe, it, expect } from 'vitest';
import { CC } from '../../engine';
import { buildAttachmentMapModel } from './attachmentModel';
import { computeAttachmentLayout, VIEW_W } from './attachmentLayout';

describe('computeAttachmentLayout', () => {
  it('is pure: identical model in, identical geometry out', () => {
    const model = buildAttachmentMapModel(CC);
    expect(computeAttachmentLayout(model)).toEqual(computeAttachmentLayout(model));
  });

  it('lays out one row per workload, all inside the viewBox', () => {
    const model = buildAttachmentMapModel(CC);
    const l = computeAttachmentLayout(model);
    const count = model.groups.flatMap(g => g.regions).reduce((n, r) => n + r.workloads.length, 0);
    expect(l.workloads.length).toBe(count);
    for (const w of l.workloads) {
      expect(w.x).toBeGreaterThanOrEqual(0);
      expect(w.x).toBeLessThanOrEqual(VIEW_W);
      expect(w.y).toBeGreaterThan(0);
      expect(w.y).toBeLessThan(l.viewH);
    }
  });

  it('attached workloads route to the fabric; unattached to the internet node', () => {
    const model = buildAttachmentMapModel(CC);
    const l = computeAttachmentLayout(model);
    for (const w of l.workloads) {
      if (w.attached) expect(w.edge.to.x).toBeLessThanOrEqual(l.fabric.x + l.fabric.w + 1);
      else expect(w.edge.to).toEqual({ x: l.internet.x, y: l.internet.y });
    }
  });

  it('the first workload of each region carries the region label slot', () => {
    const model = buildAttachmentMapModel(CC);
    const l = computeAttachmentLayout(model);
    const labeled = l.workloads.filter(w => w.regionLabel);
    const regionCount = model.groups.flatMap(g => g.regions).filter(r => r.workloads.length > 0).length;
    expect(labeled.length).toBe(regionCount);
  });

  it('attached workloads have non-null viaShort matching the model\'s servingRamps choice', () => {
    const model = buildAttachmentMapModel(CC);
    const l = computeAttachmentLayout(model);
    for (const w of l.workloads) {
      if (w.attached) {
        expect(w.edge.viaShort).not.toBeNull();
        // For aws/use1 specifically, the active on-ramp is 'NetBond' (nb1)
        if (w.wl.cloudId === 'aws' && w.wl.regionId === 'use1') {
          expect(w.edge.viaShort).toBe('NetBond');
        }
      }
    }
  });
});
