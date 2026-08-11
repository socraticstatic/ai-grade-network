import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { DiscoverPage } from './DiscoverPage';
import { advisorDone, markAdvisorDone } from '../advisor/advisorPhase';

describe('DiscoverPage', () => {
  it('mounts the drill-down estate view with the cloud tree and connect action', () => {
    render(
      <MemoryRouter initialEntries={['/discover']}>
        <DiscoverPage />
      </MemoryRouter>
    );
    // estate header + top-level cloud rows both label a 'Workloads' tile now
    expect(screen.getAllByText('Workloads').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'AWS' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'CoreWeave' })).toBeInTheDocument();
    // Pure Discovery: a "+ Connect a cloud" action, no fabric on-ramp rail
    expect(screen.getByRole('button', { name: /connect a cloud/i })).toBeInTheDocument();
    expect(screen.queryByRole('complementary', { name: /at&t fabric on-ramps/i })).not.toBeInTheDocument();
  });

  describe('"Run the advisor" rail affordance', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('links to /discover/advisor', () => {
      render(
        <MemoryRouter initialEntries={['/discover']}>
          <DiscoverPage />
        </MemoryRouter>
      );
      expect(screen.getByTestId('discover-run-advisor')).toHaveAttribute('href', '/discover/advisor');
    });

    it('clears the active profile\'s done flag on click, so the advisor re-enters', () => {
      markAdvisorDone('acme'); // simulates the boot seed / a completed first run
      expect(advisorDone('acme')).toBe(true);

      render(
        <MemoryRouter initialEntries={['/discover']}>
          <DiscoverPage />
        </MemoryRouter>
      );
      fireEvent.click(screen.getByTestId('discover-run-advisor'));
      expect(advisorDone('acme')).toBe(false);
    });
  });
});
