import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { DiscoverPage } from './DiscoverPage';
import { advisorDone, markAdvisorDone } from '../advisor/advisorPhase';
import { CC } from '../../engine';

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

  /* The flow bar lives here, page level and full width - moved out of
     UnifiedDiscovery's column, where the 320px rail squeezed the five
     stage labels until "Discover" overlapped "Connect" at ~1100px. */
  it('renders the flow bar once, with the public-workloads CTA', () => {
    render(
      <MemoryRouter initialEntries={['/discover']}>
        <DiscoverPage />
      </MemoryRouter>
    );
    const clouds = CC.clouds as { attached: boolean; workloads: number }[];
    const publicWorkloads = clouds.filter(c => !c.attached).reduce((s, c) => s + c.workloads, 0);
    expect(publicWorkloads, 'fixture must have an unattached cloud for this CTA to render').toBeGreaterThan(0);
    expect(
      screen.getByRole('link', { name: `Attach the ${publicWorkloads} workloads still on the public internet` }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('navigation', { name: 'Flow progress' })).toHaveLength(1);
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
