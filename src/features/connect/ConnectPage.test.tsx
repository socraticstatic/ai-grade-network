import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { CC } from '../../engine';
import { ConnectPage } from './ConnectPage';

describe('ConnectPage (Cloud Fabric)', () => {
  it('renders the fabric hero with a node per region', () => {
    render(
      <MemoryRouter>
        <ConnectPage />
      </MemoryRouter>
    );
    const model = CC.fabricModel();
    model.regions.forEach(r => {
      expect(screen.getByTestId(`fabric-node-region-${r.regionId}`)).toBeInTheDocument();
    });
    // the unified fabric is itself a node
    expect(screen.getByTestId('fabric-node-fabric')).toBeInTheDocument();
  });

  it('selecting a region opens its panel', () => {
    render(
      <MemoryRouter>
        <ConnectPage />
      </MemoryRouter>
    );
    // pick an unattached region (us-west-2)
    fireEvent.click(screen.getByTestId('fabric-node-region-usw2'));
    // the region panel shows a Provision action for it
    expect(screen.getByTestId('open-provision-wizard')).toBeInTheDocument();
  });

  it('walking the wizard provisions the region onto the fabric', () => {
    render(
      <MemoryRouter>
        <ConnectPage />
      </MemoryRouter>
    );
    expect(CC.fabricModel().regions.find(r => r.regionId === 'usw2')!.path).toBe('public');

    fireEvent.click(screen.getByTestId('fabric-node-region-usw2'));
    fireEvent.click(screen.getByTestId('open-provision-wizard'));

    const dialog = screen.getByRole('dialog');
    // Next x3 → Confirm
    for (let i = 0; i < 3; i++) {
      fireEvent.click(within(dialog).getByRole('button', { name: /^Next$/i }));
    }
    fireEvent.click(within(dialog).getByTestId('provision-confirm'));

    expect(CC.fabricModel().regions.find(r => r.regionId === 'usw2')!.path).toBe('private');
    expect(CC.fabricModel().regions.find(r => r.regionId === 'usw2')!.attached).toBe(true);
  });

  it('shows the "from Discover" intent banner only when arriving via ?from=discover', () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/connect?from=discover']}>
        <ConnectPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/attaching the workloads flagged on discover/i)).toBeInTheDocument();
    unmount();

    render(
      <MemoryRouter initialEntries={['/naas/connect']}>
        <ConnectPage />
      </MemoryRouter>
    );
    expect(screen.queryByText(/attaching the workloads flagged on discover/i)).toBeNull();
  });

  it('renders a forward CTA to Govern', () => {
    render(
      <MemoryRouter initialEntries={['/naas/connect']}>
        <ConnectPage />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: /govern these paths/i })).toHaveAttribute('href', '/naas/govern');
  });

  /* Rows 38 and 40 of the phase-0 metric audit: "On the fabric" and "Still
     public" cut from the Fabric posture panel — both restate the verdict
     line above it. Row 39/41 ("Dual / resilient", "Cloud-to-cloud") stay. */
  it('drops the On-the-fabric and Still-public tiles the verdict line already states', () => {
    render(
      <MemoryRouter initialEntries={['/naas/connect']}>
        <ConnectPage />
      </MemoryRouter>
    );
    expect(screen.queryByText('On the fabric')).not.toBeInTheDocument();
    expect(screen.queryByText('Still public')).not.toBeInTheDocument();
    expect(screen.getByText('Dual / resilient')).toBeInTheDocument();
    expect(screen.getByText('Cloud-to-cloud')).toBeInTheDocument();
  });

  /* Row 45: the Connections list's leading "{n} on the fabric" count cut —
     a fourth rendering of the same 1-vs-8 split on this screen. The
     descriptive tail stays. */
  it('the Connections list states what it lists, not a count restated elsewhere', () => {
    render(
      <MemoryRouter initialEntries={['/naas/connect']}>
        <ConnectPage />
      </MemoryRouter>
    );
    const list = screen.getByTestId('connections-list');
    expect(within(list).getByText('reliability · performance · private/public')).toBeInTheDocument();
    expect(within(list).queryByText(/on the fabric ·/)).not.toBeInTheDocument();
  });

  it('?provision opens the wizard for that region with Dual preselected', () => {
    // West US 2 (wus2) - its on-ramp (er1) is disjoint from usw2's (dx1),
    // which the earlier provisioning test in this file activates; dx1 also
    // targets euw1 and usc1, so any region on that on-ramp would already
    // read 'private' by the time this test runs. wus2 stays 'public'.
    render(
      <MemoryRouter initialEntries={['/naas/connect?provision=wus2&dual=1']}>
        <ConnectPage />
      </MemoryRouter>
    );
    expect(screen.getByRole('dialog', { name: /Provision .* West US 2/i })).toBeInTheDocument();
    // walk to the resiliency step and confirm Dual is the pressed option
    fireEvent.click(screen.getByRole('button', { name: /^Next$/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Next$/ }));
    expect(screen.getByRole('button', { name: /Dual · resilient/ })).toHaveAttribute('aria-pressed', 'true');
  });
});
