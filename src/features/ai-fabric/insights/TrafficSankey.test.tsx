import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrafficSankey } from './TrafficSankey';
import type { SankeyGraph } from './sankeyModel';

/* TrafficSankey is pure: graph in, SVG out, no CC. So the fixture is a small
   literal graph — two identities converging on one shared route node, which is
   exactly the topology that makes ribbon stacking observable. Engine honesty
   for the figures themselves is sankeyModel.test.ts's job. */

const graph: SankeyGraph = {
  basis: 'spend',
  totalValue: 0.05,
  columns: [
    { title: 'Identity', subtitle: 'User / Agent' },
    { title: 'Source', subtitle: 'Model endpoint' },
    { title: 'Fabric route', subtitle: 'Egress path' },
    { title: 'Provider / model', subtitle: 'Destination' },
  ],
  nodes: [
    { id: 'id-rd-helion', col: 0, label: 'rd-helion', value: 0.03, color: '#0074b3' },
    { id: 'id-shared-services', col: 0, label: 'shared-services', value: 0.02, color: '#0074b3' },
    { id: 'src-coreweave-h100', col: 1, label: 'CoreWeave H100', value: 0.03, color: '#0074b3' },
    { id: 'src-openai-api', col: 1, label: 'OpenAI API', value: 0.02, color: '#0074b3' },
    { id: 'route-governed-egress', col: 2, label: 'Governed egress', value: 0.05, color: '#0074b3' },
    { id: 'dst-helion-70b', col: 3, label: 'CoreWeave/helion-70b', value: 0.03, color: '#009fdb' },
    { id: 'dst-gpt-class', col: 3, label: 'OpenAI (external)/GPT-class (external)', value: 0.02, color: '#00c9ff' },
  ],
  paths: [
    {
      id: 'rd-helion',
      nodes: ['id-rd-helion', 'src-coreweave-h100', 'route-governed-egress', 'dst-helion-70b'],
      value: 0.03, cost: 0.03, saved: 0.12,
      hops: { identity: 'rd-helion', source: 'CoreWeave H100', route: 'Governed egress', provider: 'CoreWeave' },
    },
    {
      id: 'shared-services',
      nodes: ['id-shared-services', 'src-openai-api', 'route-governed-egress', 'dst-gpt-class'],
      value: 0.02, cost: 0.02, saved: 0,
      hops: { identity: 'shared-services', source: 'OpenAI API', route: 'Governed egress', provider: 'OpenAI (external)' },
    },
  ],
};

describe('TrafficSankey', () => {
  it('renders one node bar per graph node and one ribbon per path', () => {
    render(<TrafficSankey graph={graph} />);
    for (const n of graph.nodes) {
      expect(screen.getByTestId(`sankey-node-${n.id}`)).toBeInTheDocument();
    }
    for (const p of graph.paths) {
      expect(screen.getByTestId(`sankey-ribbon-${p.id}`)).toBeInTheDocument();
    }
    expect(screen.queryByTestId('sankey-tooltip')).toBeNull();
  });

  it('clicking a ribbon selects it: cyan fill, tooltip names the path', () => {
    render(<TrafficSankey graph={graph} />);
    const ribbon = screen.getByTestId('sankey-ribbon-rd-helion');
    fireEvent.click(ribbon);
    expect(ribbon).toHaveAttribute('fill', '#00c9ff');
    const tip = screen.getByTestId('sankey-tooltip');
    expect(tip).toHaveTextContent('Event path');
    expect(tip).toHaveTextContent('rd-helion');
    expect(tip).toHaveTextContent('CoreWeave/helion-70b');
    expect(tip).toHaveTextContent('Cost $0.03');
    expect(tip).toHaveTextContent('Saved $0.12');
    // the unselected ribbon keeps the default treatment
    expect(screen.getByTestId('sankey-ribbon-shared-services'))
      .toHaveAttribute('fill', '#0074b3');
  });

  it('clicking the selected ribbon again clears the selection', () => {
    render(<TrafficSankey graph={graph} />);
    const ribbon = screen.getByTestId('sankey-ribbon-rd-helion');
    fireEvent.click(ribbon);
    expect(screen.getByTestId('sankey-tooltip')).toBeInTheDocument();
    fireEvent.click(ribbon);
    expect(screen.queryByTestId('sankey-tooltip')).toBeNull();
    expect(ribbon).toHaveAttribute('fill', '#0074b3');
  });

  it('Enter selects too — ribbons are keyboard buttons naming their hops', () => {
    render(<TrafficSankey graph={graph} />);
    const ribbon = screen.getByTestId('sankey-ribbon-shared-services');
    expect(ribbon).toHaveAttribute('role', 'button');
    expect(ribbon).toHaveAttribute('tabindex', '0');
    const label = ribbon.getAttribute('aria-label') ?? '';
    expect(label).toContain('shared-services');
    expect(label).toContain('OpenAI API');
    expect(label).toContain('Governed egress');
    expect(label).toContain('OpenAI (external)');
    fireEvent.keyDown(ribbon, { key: 'Enter' });
    expect(ribbon).toHaveAttribute('fill', '#00c9ff');
    expect(screen.getByTestId('sankey-tooltip')).toBeInTheDocument();
  });

  it('omits the Saved line when the saved figure is not real money', () => {
    render(<TrafficSankey graph={graph} />);
    fireEvent.click(screen.getByTestId('sankey-ribbon-shared-services'));
    const tip = screen.getByTestId('sankey-tooltip');
    expect(tip).toHaveTextContent('Cost $0.02');
    expect(tip).not.toHaveTextContent('Saved');
  });

  it('shows a legend chip per provider present', () => {
    render(<TrafficSankey graph={graph} />);
    expect(screen.getByText('CoreWeave')).toBeInTheDocument();
    expect(screen.getByText('OpenAI (external)')).toBeInTheDocument();
  });

  it('states no dollars when the basis is not spend', () => {
    const tokenGraph: SankeyGraph = {
      ...graph,
      basis: 'tokens',
      totalValue: 5000,
      nodes: graph.nodes.map(n => ({ ...n, value: n.value * 100_000 })),
      paths: graph.paths.map(p => ({ ...p, value: p.value * 100_000, cost: 0, saved: 0 })),
    };
    const { container } = render(<TrafficSankey graph={tokenGraph} />);
    fireEvent.click(screen.getByTestId('sankey-ribbon-rd-helion'));
    const tip = screen.getByTestId('sankey-tooltip');
    expect(tip).not.toHaveTextContent('Cost');
    expect(container.textContent).not.toContain('$');
    // token volumes render through fmtTokens: 3000 -> 3.0k
    expect(container.textContent).toContain('3.0k');
  });
});
