import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricsOverview } from '../MetricsOverview';

describe('MetricsOverview', () => {
  // MetricsOverview was redesigned as a "Performance Summary" utilization
  // widget (Current/Average/Peak Utilization + Uptime) — it no longer takes
  // or displays latency/packetLoss/jitter/bandwidth/tunnelStatus.
  const mockMetrics = {
    bandwidth: '10 Gbps',
    uptime: '99.99%'
  };

  it('renders all metrics correctly', () => {
    render(<MetricsOverview metrics={mockMetrics} />);

    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('95%')).toBeInTheDocument();
    expect(screen.getByText('99.99%')).toBeInTheDocument();
  });

  it('displays correct metric labels', () => {
    render(<MetricsOverview metrics={mockMetrics} />);

    expect(screen.getByText('Current Utilization')).toBeInTheDocument();
    expect(screen.getByText('Average Utilization')).toBeInTheDocument();
    expect(screen.getByText('Peak Utilization')).toBeInTheDocument();
    expect(screen.getByText('Uptime')).toBeInTheDocument();
  });

  it('renders the performance summary title', () => {
    render(<MetricsOverview metrics={mockMetrics} />);
    expect(screen.getByText('Performance Summary')).toBeInTheDocument();
  });
});
