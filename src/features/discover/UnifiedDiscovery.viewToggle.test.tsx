import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UnifiedDiscovery } from './UnifiedDiscovery';
import { CC } from '../../engine';

afterEach(cleanup);

const renderUD = () =>
  render(<MemoryRouter initialEntries={['/discover']}><UnifiedDiscovery /></MemoryRouter>);

describe('UnifiedDiscovery view toggle', () => {
  it('defaults to the tree, with the toggle stating both views', () => {
    renderUD();
    expect(screen.getByRole('button', { name: 'Tree view', pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Map view', pressed: false })).toBeInTheDocument();
    expect(screen.queryByTestId('attachment-map')).not.toBeInTheDocument();
  });

  it('Map swaps the tree for the attachment map, and back', () => {
    renderUD();
    fireEvent.click(screen.getByRole('button', { name: 'Map view' }));
    expect(screen.getByTestId('attachment-map')).toBeInTheDocument();
    // the tree's cloud rows are gone while the map is up
    expect(screen.queryByRole('button', { name: 'CoreWeave' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tree view' }));
    expect(screen.queryByTestId('attachment-map')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'CoreWeave' })).toBeInTheDocument();
  });

  it('the tree/map view leads the page - toggle renders before the Network section', () => {
    renderUD();
    const toggle = screen.getByRole('button', { name: 'Tree view' });
    // Scoped to the heading role: the estate filter chips now render a
    // "Network" domain chip too, and an unscoped text query would find both.
    const network = screen.getByRole('heading', { name: 'Network' });
    expect(toggle.compareDocumentPosition(network) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe('UnifiedDiscovery estate filter chips', () => {
  it('the tree starts with every cloud rolled up — collapsed rollups, not AWS pre-opened', () => {
    renderUD();
    for (const c of CC.clouds as { id: string; name: string }[]) {
      expect(screen.getByRole('button', { name: c.name })).toHaveAttribute('aria-expanded', 'false');
    }
  });

  it('Public internet narrows the tree to groups holding a public region, and marks the chip pressed', () => {
    renderUD();
    const chips = screen.getByTestId('estate-filter-chips');
    const publicChip = within(chips).getByRole('button', { name: 'Public internet' });
    fireEvent.click(publicChip);
    expect(publicChip).toHaveAttribute('aria-pressed', 'true');

    const fabricModel = CC.fabricModel();
    for (const c of CC.clouds as { id: string; name: string }[]) {
      const cloudRegions = fabricModel.regions.filter(r => r.cloudId === c.id);
      // A cloud with no fabric-shaped regions has nothing to filter against
      // and stays visible; otherwise it needs at least one public region.
      const expectVisible = cloudRegions.length === 0 || cloudRegions.some(r => r.path === 'public');
      const row = screen.queryByRole('button', { name: c.name });
      if (expectVisible) {
        expect(row, `${c.name} should stay visible under Public internet`).toBeInTheDocument();
      } else {
        expect(row, `${c.name} should be filtered out under Public internet`).not.toBeInTheDocument();
      }
    }
  });

  it('Clear filters restores every group after Public internet narrowed the tree', () => {
    renderUD();
    const chips = screen.getByTestId('estate-filter-chips');
    fireEvent.click(within(chips).getByRole('button', { name: 'Public internet' }));
    fireEvent.click(within(chips).getByRole('button', { name: /clear filters/i }));

    expect(within(chips).getByRole('button', { name: 'Public internet' })).toHaveAttribute('aria-pressed', 'false');
    expect(within(chips).queryByRole('button', { name: /clear filters/i })).not.toBeInTheDocument();
    for (const c of CC.clouds as { id: string; name: string }[]) {
      expect(screen.getByRole('button', { name: c.name })).toBeInTheDocument();
    }
  });
});

/* Task 4 — the three stat sections (Network / Cloud / AI workflows) compress
   into one at-a-glance summary band; the full sections fold behind a
   disclosure. The band re-uses the same domain derivations the sections
   already compute — no new data paths. */
describe('UnifiedDiscovery estate summary band', () => {
  it('estate-summary-band renders one row with the six headline figures', () => {
    renderUD();
    const band = screen.getByTestId('estate-summary-band');
    for (const label of ['Sites', 'Active on-ramps', 'Clouds · Regions', 'Workloads', 'Attached VPCs', 'Exposed endpoints']) {
      expect(within(band).getByText(label), `${label} missing from the summary band`).toBeInTheDocument();
    }
    // one row — not the three per-domain sections it replaces
    expect(within(band).queryByRole('heading', { level: 2 })).not.toBeInTheDocument();
    expect(within(band).queryByTestId('estate-network')).not.toBeInTheDocument();
    expect(within(band).queryByTestId('estate-cloud')).not.toBeInTheDocument();
    expect(within(band).queryByTestId('estate-ai')).not.toBeInTheDocument();
  });

  it('estate-breakdown holds the full sections behind a disclosure, closed by default', () => {
    renderUD();
    const breakdown = screen.getByTestId('estate-breakdown');
    expect(breakdown.tagName).toBe('DETAILS');
    expect(breakdown).not.toHaveAttribute('open');
    expect(within(breakdown).getByText('Show the breakdown')).toBeInTheDocument();

    // A per-section-only label — never one of the band's six headline
    // figures — lives inside the breakdown and nowhere else.
    expect(within(breakdown).getByText('Routes')).toBeInTheDocument();
    const band = screen.getByTestId('estate-summary-band');
    expect(within(band).queryByText('Routes')).not.toBeInTheDocument();

    // the previous three sections are all still there, inside the fold
    expect(within(breakdown).getByTestId('estate-network')).toBeInTheDocument();
    expect(within(breakdown).getByTestId('estate-cloud')).toBeInTheDocument();
    expect(within(breakdown).getByTestId('estate-ai')).toBeInTheDocument();
  });

  it('the guided-tour anchor sits on the visible summary band, not inside the fold', () => {
    const { container } = renderUD();
    const anchor = container.querySelector('[data-tour="discover-estate"]');
    expect(anchor).not.toBeNull();
    expect(anchor).toHaveAttribute('data-testid', 'estate-summary-band');
    // the anchor must not be nested inside the closed <details> — a tour
    // spotlight on hidden content highlights nothing.
    expect(anchor!.closest('details')).toBeNull();
  });
});
