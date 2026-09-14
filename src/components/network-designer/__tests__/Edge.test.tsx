import { describe, it, expect, vi } from 'vitest';
import { render } from '../../../test/utils';
import { Edge } from '../Edge';
import type { NetworkNode, NetworkEdge } from '../types/designer';

const nodes: NetworkNode[] = [
  { id: 'n1', type: 'function', functionType: 'router', x: 0, y: 0, name: 'Router', icon: 'hub', status: 'active', config: {} },
  { id: 'n2', type: 'destination', functionType: 'aws', x: 200, y: 200, name: 'AWS', icon: 'Cloud', status: 'active', config: {} },
];

function makeEdge(overrides: Partial<NetworkEdge> = {}): NetworkEdge {
  return {
    id: 'e1',
    source: 'n1',
    target: 'n2',
    type: 'Ethernet',
    bandwidth: '10 Gbps',
    status: 'active',
    ...overrides,
  };
}

function renderEdge(edge: NetworkEdge, isSelected = false) {
  return render(
    <svg>
      <Edge edge={edge} nodes={nodes} isSelected={isSelected} onClick={vi.fn()} />
    </svg>
  );
}

describe('Edge', () => {
  it('renders an SVG path between two nodes', () => {
    const { container: hub } = renderEdge(makeEdge());
    const paths = hub.querySelectorAll('path');
    expect(paths.length).toBeGreaterThanOrEqual(2); // hit area + visible line
  });

  it('uses service color for active edges', () => {
    const { container: hub } = renderEdge(makeEdge({ status: 'active', type: 'Ethernet' }));
    const visiblePath = hub.querySelectorAll('path')[1];
    expect(visiblePath.getAttribute('stroke')).toBe('#06b6d4'); // Ethernet color
  });

  it('uses gray for inactive edges', () => {
    const { container: hub } = renderEdge(makeEdge({ status: 'inactive' }));
    const visiblePath = hub.querySelectorAll('path')[1];
    expect(visiblePath.getAttribute('stroke')).toBe('#d1d5db');
  });

  it('uses red for down edges', () => {
    const { container: hub } = renderEdge(makeEdge({ status: 'down' }));
    const visiblePath = hub.querySelectorAll('path')[1];
    expect(visiblePath.getAttribute('stroke')).toBe('#ef4444');
  });

  it('uses dashed stroke for inactive edges', () => {
    const { container: hub } = renderEdge(makeEdge({ status: 'inactive' }));
    const visiblePath = hub.querySelectorAll('path')[1];
    expect(visiblePath.getAttribute('stroke-dasharray')).toBe('6,4');
  });

  it('uses dashed stroke for down edges', () => {
    const { container: hub } = renderEdge(makeEdge({ status: 'down' }));
    const visiblePath = hub.querySelectorAll('path')[1];
    expect(visiblePath.getAttribute('stroke-dasharray')).toBe('6,4');
  });

  it('uses solid stroke for active edges (non-VPN)', () => {
    const { container: hub } = renderEdge(makeEdge({ status: 'active', type: 'Ethernet' }));
    const visiblePath = hub.querySelectorAll('path')[1];
    expect(visiblePath.getAttribute('stroke-dasharray')).toBeNull();
  });

  it('uses blue highlight when selected', () => {
    const { container: hub } = renderEdge(makeEdge({ status: 'active' }), true);
    const visiblePath = hub.querySelectorAll('path')[1];
    expect(visiblePath.getAttribute('stroke')).toBe('#3b82f6');
  });

  it('uses thicker stroke when selected', () => {
    const { container: hub } = renderEdge(makeEdge(), true);
    const visiblePath = hub.querySelectorAll('path')[1];
    expect(visiblePath.getAttribute('stroke-width')).toBe('3');
  });
});
