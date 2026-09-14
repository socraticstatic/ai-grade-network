import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ConnectionSummaryRow } from '../ConnectionSummaryRow';
import type { Connection } from '../../../../types';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const activeConnection: Connection = {
  id: 'conn-1',
  name: 'Corporate Cloud Hub',
  type: 'Internet to Cloud',
  status: 'Active',
  bandwidth: '10 Gbps',
  location: 'Ashburn, VA',
  provider: 'AWS',
  performance: {
    latency: '3.8ms',
    packetLoss: '0.01%',
    uptime: '99.9%',
    throughput: '8.5 Gbps',
    tunnels: 'Active',
    bandwidthUtilization: 72,
    currentUsage: '7.2 Gbps',
    utilizationTrend: [70, 72, 73, 72, 74, 72, 72]
  }
};

describe('ConnectionSummaryRow', () => {
  it('renders connection name and bandwidth', () => {
    render(
      <MemoryRouter>
        <ConnectionSummaryRow connection={activeConnection} />
      </MemoryRouter>
    );
    expect(screen.getByText('Corporate Cloud Hub')).toBeDefined();
    expect(screen.getByText('10 Gbps')).toBeDefined();
  });

  it('renders Active status badge', () => {
    render(
      <MemoryRouter>
        <ConnectionSummaryRow connection={activeConnection} />
      </MemoryRouter>
    );
    expect(screen.getByText('Active')).toBeDefined();
  });

  it('renders Pending status badge for pending connection', () => {
    render(
      <MemoryRouter>
        <ConnectionSummaryRow connection={{ ...activeConnection, status: 'Pending' }} />
      </MemoryRouter>
    );
    expect(screen.getByText('Pending')).toBeDefined();
  });

  it('renders AWS Max badge for LMCC connections', () => {
    render(
      <MemoryRouter>
        <ConnectionSummaryRow connection={{ ...activeConnection, configuration: { isLmcc: true } }} />
      </MemoryRouter>
    );
    expect(screen.getByText('AWS Max')).toBeDefined();
  });

  it('navigates to connection detail on click', () => {
    render(
      <MemoryRouter>
        <ConnectionSummaryRow connection={activeConnection} />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByText('Corporate Cloud Hub'));
    expect(mockNavigate).toHaveBeenCalledWith('/connections/conn-1');
  });
});
