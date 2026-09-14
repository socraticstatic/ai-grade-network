import { describe, it, expect } from 'vitest';
import { CC } from './index';

/**
 * The first-mile ingress nodes must be labeled with the AT&T transport
 * products that carry them (ADI / ABF / AVPN) plus Mobility/Wireless and
 * Internet — not the old generic HQ/DC/Branch/Mobility names.
 */
describe('first-mile transport labels', () => {
  it('labels the edge nodes with AT&T transport products', () => {
    const { nodes } = CC.sceneGraph() as { nodes: { kind?: string; label?: string }[] };
    const edgeLabels = nodes
      .filter(n => n.kind === 'edge')
      .map(n => n.label ?? '')
      .join(' | ');

    expect(edgeLabels).toMatch(/AVPN/);
    expect(edgeLabels).toMatch(/ADI/);
    expect(edgeLabels).toMatch(/ABF/);
    expect(edgeLabels).toMatch(/Wireless/);
    expect(edgeLabels).toMatch(/Internet/);
  });
});
