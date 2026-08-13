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
    // Path is a facet menu now; the narrowing behaviour it drives is the
    // same one this test has always asserted.
    fireEvent.click(within(chips).getByTestId('facet-path'));
    fireEvent.click(within(chips).getByRole('option', { name: 'Public internet' }));
    expect(within(chips).getByTestId('facet-path')).toHaveTextContent('Path: Public internet');

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
    fireEvent.click(within(chips).getByTestId('facet-path'));
    fireEvent.click(within(chips).getByRole('option', { name: 'Public internet' }));
    fireEvent.click(within(chips).getByRole('button', { name: /clear filters/i }));

    expect(within(chips).getByTestId('facet-path')).toHaveTextContent('Path');
    expect(within(chips).queryByRole('button', { name: /clear filters/i })).not.toBeInTheDocument();
    for (const c of CC.clouds as { id: string; name: string }[]) {
      expect(screen.getByRole('button', { name: c.name })).toBeInTheDocument();
    }
  });
});

/* The estate facets. ACME's default seed carries dc + office branches, two
   distinct values, which is what makes the Site type facet render at all -
   a facet with one value cannot narrow anything and is not shown. */
describe('UnifiedDiscovery estate filters — facet menus', () => {
  /* Seven facets (cloud, path, domain, site type, region, business unit,
     connection) would be twenty-plus chips as a flat row - the "too busy"
     failure this program keeps being told about. Each facet is one menu
     that states its own choice when set. The BEHAVIOUR under test is
     unchanged: pick a value, it narrows; clear it, it stops. */
  it('offers a Site type facet whose options are the classes this estate holds', () => {
    renderUD();
    const chips = screen.getByTestId('estate-filter-chips');
    fireEvent.click(within(chips).getByTestId('facet-site-type'));
    // ACME seeds one dc + five offices; a facet never offers an empty choice.
    expect(within(chips).getByRole('option', { name: 'Data centers' })).toBeInTheDocument();
    expect(within(chips).getByRole('option', { name: 'Offices' })).toBeInTheDocument();
    expect(within(chips).queryByRole('option', { name: 'ATMs' })).not.toBeInTheDocument();
  });

  it('picking a value narrows and names it; All returns to unfiltered', () => {
    renderUD();
    const chips = screen.getByTestId('estate-filter-chips');
    const facet = within(chips).getByTestId('facet-site-type');
    expect(facet).toHaveTextContent('Site type');

    fireEvent.click(facet);
    fireEvent.click(within(chips).getByRole('option', { name: 'Data centers' }));
    expect(within(chips).getByTestId('facet-site-type')).toHaveTextContent('Site type: Data centers');

    fireEvent.click(within(chips).getByTestId('facet-site-type'));
    fireEvent.click(within(chips).getByRole('option', { name: 'All' }));
    expect(within(chips).getByTestId('facet-site-type')).toHaveTextContent('Site type');
  });

  it('the brainstorm\'s four mental models are all offered: site type, region, connection, business unit', () => {
    renderUD();
    const chips = screen.getByTestId('estate-filter-chips');
    expect(within(chips).getByTestId('facet-site-type')).toBeInTheDocument();
    expect(within(chips).getByTestId('facet-region')).toBeInTheDocument();
    expect(within(chips).getByTestId('facet-connection')).toBeInTheDocument();
    expect(within(chips).getByTestId('facet-business-unit')).toBeInTheDocument();
  });

  it('an active facet surfaces Clear filters, which resets every facet', () => {
    renderUD();
    const chips = screen.getByTestId('estate-filter-chips');
    expect(within(chips).queryByRole('button', { name: /clear filters/i })).not.toBeInTheDocument();

    fireEvent.click(within(chips).getByTestId('facet-site-type'));
    fireEvent.click(within(chips).getByRole('option', { name: 'Offices' }));
    fireEvent.click(within(chips).getByRole('button', { name: /clear filters/i }));

    expect(within(chips).getByTestId('facet-site-type')).toHaveTextContent('Site type');
    expect(within(chips).queryByRole('button', { name: /clear filters/i })).not.toBeInTheDocument();
  });
});

/* Task 4 — the three stat sections (Network / Cloud / AI workflows) compress
   into one at-a-glance summary band; the full sections fold behind a
   disclosure. The band re-uses the same domain derivations the sections
   already compute — no new data paths. */
describe('UnifiedDiscovery estate summary band', () => {
  /* Row 21 of the phase-0 metric audit: "Active on-ramps" demoted off this
     band — five headline figures remain, not six. */
  it('estate-summary-band renders one row with the five headline figures', () => {
    renderUD();
    const band = screen.getByTestId('estate-summary-band');
    for (const label of ['Sites', 'Clouds · Regions', 'Workloads', 'Attached VPCs', 'Exposed endpoints']) {
      expect(within(band).getByText(label), `${label} missing from the summary band`).toBeInTheDocument();
    }
    expect(within(band).queryByText('Active on-ramps')).not.toBeInTheDocument();
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

    // A per-section-only label — never one of the band's five headline
    // figures — lives inside the breakdown and nowhere else. ("Routes" and
    // "Gateways", the Network domain's other two per-section-only stats,
    // were cut by rows 35-36 of the phase-0 metric audit; "Subnets" is the
    // Cloud domain's own still-standing example of the same shape.)
    expect(within(breakdown).getByText('Subnets')).toBeInTheDocument();
    const band = screen.getByTestId('estate-summary-band');
    expect(within(band).queryByText('Subnets')).not.toBeInTheDocument();

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
