import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, within, fireEvent } from '@testing-library/react';
import { CC } from '../../engine';
import { buildSankey } from './sankeyModel';
import { SankeyPanel } from './SankeyPanel';
import { ObservabilityShell } from './ObservabilityShell';
import { networkBinding } from './networkBinding';

afterEach(cleanup);

describe('SankeyPanel', () => {
  it('renders one accessible link row per model link, with values', () => {
    const model = buildSankey(CC);
    render(<SankeyPanel model={model} />);
    const list = screen.getByTestId('sankey-links');
    expect(within(list).getAllByRole('listitem').length).toBe(model.links.length);
    expect(list.textContent).toContain('AT&T fabric');
  });
});

describe('ObservabilityShell × sankey view', () => {
  it('the network Flow tab renders the sankey, and a trend tab still renders the series chart', () => {
    render(<ObservabilityShell binding={networkBinding(CC)} />);
    // Flow is the default tab → sankey visible
    expect(screen.getByTestId('sankey-links')).toBeInTheDocument();
    // switch to a series tab
    fireEvent.click(screen.getByRole('button', { name: 'Throughput' }));
    expect(screen.queryByTestId('sankey-links')).toBeNull();
    expect(screen.getByTestId('flow-panel').getAttribute('data-tab')).toBe('throughput');
  });
});
