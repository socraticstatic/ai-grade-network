import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import AlertCards from '../AlertCards';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }: any) => <>{children}</>
}));

describe('AlertCards', () => {
  const mockConnections = [
    { id: '1', name: 'AWS Connection' },
    { id: '2', name: 'Azure Connection' }
  ];

  it('renders all alerts when no connection is selected', () => {
    render(<AlertCards selectedConnection="all" connections={mockConnections} />);
    
    expect(screen.getByText('High Latency Detected')).toBeInTheDocument();
    expect(screen.getByText('Bandwidth Usage')).toBeInTheDocument();
    expect(screen.getByText('Maintenance Scheduled')).toBeInTheDocument();
  });

  it('filters alerts by selected connection', () => {
    render(<AlertCards selectedConnection="1" connections={mockConnections} />);
    
    expect(screen.getByText('High Latency Detected')).toBeInTheDocument();
    expect(screen.getByText('Maintenance Scheduled')).toBeInTheDocument();
    expect(screen.queryByText('Bandwidth Usage')).not.toBeInTheDocument();
  });

  it('shows empty state when no alerts match filter', () => {
    render(<AlertCards selectedConnection="3" connections={mockConnections} />);
    
    expect(screen.getByText('No active alerts for the selected connection')).toBeInTheDocument();
  });

  it('displays correct number of alert cards', () => {
    const { container: hub } = render(<AlertCards selectedConnection="all" connections={mockConnections} />);

    // '.rounded-lg' alone also matches BaseAlertsView's filter/search container,
    // so scope to the AlertCard root's distinguishing hover class too.
    const alertCards = hub.querySelectorAll('.rounded-lg.group');
    expect(alertCards.length).toBe(3);
  });

  it('removes an alert when dismissed', async () => {
    // AlertCard.handleDismiss delays the actual removal by 300ms for its
    // exit animation, so we need fake timers to observe the post-dismiss state.
    vi.useFakeTimers();
    try {
      render(<AlertCards selectedConnection="all" connections={mockConnections} />);

      // Find all dismiss buttons (they're hidden by default)
      const dismissButtons = screen.getAllByLabelText('Dismiss alert');
      expect(dismissButtons.length).toBe(3);

      // Click the first dismiss button
      fireEvent.click(dismissButtons[0]);
      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      // Check that the alert is removed
      expect(screen.queryByText('High Latency Detected')).not.toBeInTheDocument();
      expect(screen.getByText('Bandwidth Usage')).toBeInTheDocument();
      expect(screen.getByText('Maintenance Scheduled')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});