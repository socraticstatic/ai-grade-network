import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UnifiedDiscovery } from './UnifiedDiscovery';
import { CC } from '../../engine';
import { estateDomains, cloudRegionCount, cloudVpcCount, type Cloud } from './discoveryModel';
import { ID_RENAME_WARNING } from '../govern/groupLanguage';
// No engine provider wrapper — the engine is a singleton read via useCloudControl.
// A MemoryRouter is required because the embedded FlowBar reads the active route.
const renderUD = () => render(<MemoryRouter initialEntries={['/discover']}><UnifiedDiscovery /></MemoryRouter>);

describe('UnifiedDiscovery drill-down tree', () => {
  it('renders the estate header and a top-level row per cloud', () => {
    renderUD();
    // estate tiles
    expect(screen.getByText('VPC · VNet')).toBeInTheDocument();
    // cloud rows (buttons carry aria-label = cloud name)
    expect(screen.getByRole('button', { name: 'AWS' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'CoreWeave' })).toBeInTheDocument();
  });

  /* The three section headings and blurbs ARE the deliverable — "a viewer can
     say what each section is for". Deleting the `<div><h2>{d.label}</h2>
     <p>{d.blurb}</p></div>` block left every discover and tour test green,
     because the `estate-*` testids are satisfied by empty sections. */
  /* Row 19 of the phase-0 metric audit: the flow-bar CTA used to read
     "Attach {n} public workloads", which collides with AWS's own workload
     count rendered one row below it. Naming what "public" means (still on
     the public internet) removes the ambiguity — copy only, same count. */
  it('the flow-bar CTA names the workloads as still on the public internet', () => {
    renderUD();
    const clouds = CC.clouds as Cloud[];
    const publicWorkloads = clouds.filter(c => !c.attached).reduce((s, c) => s + c.workloads, 0);
    expect(publicWorkloads, 'fixture must have an unattached cloud for this CTA to render').toBeGreaterThan(0);
    expect(
      screen.getByRole('link', { name: `Attach the ${publicWorkloads} workloads still on the public internet` }),
    ).toBeInTheDocument();
  });

  it('renders a heading and a blurb for each of the three domains', () => {
    renderUD();
    const domains = estateDomains(CC);
    expect(domains.length).toBe(3);
    for (const d of domains) {
      const section = screen.getByTestId(`estate-${d.key}`);
      expect(
        within(section).getByRole('heading', { level: 2, name: d.label }),
      ).toBeInTheDocument();
      expect(within(section).getByText(d.blurb)).toBeInTheDocument();
    }
  });

  it('renders on-ramps as active over total circuit inventory, not equal counts', () => {
    renderUD();
    const network = screen.getByTestId('estate-network');
    // `getByText` already returns the label div itself, so `.parentElement`
    // alone reaches the tile wrapper — a `.closest('div')` first is a no-op.
    const tile = within(network).getByText('Active on-ramps').parentElement!;
    expect(tile).toHaveTextContent(`${CC.activeOnramps()} / ${CC.onramps.length}`);
    // The figure is the ACTIVE count, not the circuit inventory — the review's
    // complaint was a tile that read 4 while only 1 carried traffic.
    expect(CC.activeOnramps()).toBeLessThan(CC.onramps.length);
  });

  /* Row 21 of the phase-0 metric audit: "Active on-ramps" demoted off the
     always-visible summary band — the fraction is true, but the band has
     no room for the denominator's blurb ("active over every circuit on
     order"), which the estate-breakdown disclosure's Network domain
     already carries beside the same stat (asserted above). */
  it('drops the on-ramps tile from the summary band', () => {
    renderUD();
    const band = screen.getByTestId('estate-summary-band');
    expect(within(band).queryByText('Active on-ramps')).not.toBeInTheDocument();
  });

  /* Row 31: the cloud row's per-cloud stat tiles cut — the same three
     numbers already render as the row's prose subtitle, one row up. */
  it('states each cloud\'s regions/VPC/workload counts once, not as tiles too', () => {
    renderUD();
    const clouds = CC.clouds as Cloud[];
    const c = clouds[0];
    const row = screen.getByRole('button', { name: c.name });
    expect(
      within(row).getByText(`${cloudRegionCount(CC, c.id)} regions · ${cloudVpcCount(CC, c.id)} VPC/VNet · ${c.workloads} workloads`),
    ).toBeInTheDocument();
    // The tile rendering of the same figures — a bare "Regions" caption —
    // is gone; only the domain-level "Regions" stat inside the (separate)
    // estate-breakdown disclosure remains.
    expect(within(row).queryByText('Regions')).not.toBeInTheDocument();
    expect(within(row).queryByText('Workloads')).not.toBeInTheDocument();
  });

  /* Row 33: the "N workloads reachable over the public internet" alert cut
     — a third rendering of the FlowBar CTA's own count, with no action
     attached. */
  it('does not render the public-workloads alert the FlowBar CTA already states', () => {
    renderUD();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText(/reachable over the public internet/)).not.toBeInTheDocument();
  });

  /* The tour's Discover beat speaks about clouds, regions and VPCs. Anchoring
     it to the wrapper around all three sections made the spotlight 87% of a
     mobile viewport; anchoring it to the Cloud section worked until Task 4
     folded that section behind `estate-breakdown`'s closed <details> — a
     spotlight on hidden content highlights nothing, so the anchor now lives
     on the always-visible summary band above the fold. */
  it('the guided-tour estate anchor is the summary band, not any section behind the fold', () => {
    const { container } = renderUD();
    const anchor = container.querySelector('[data-tour="discover-estate"]');
    expect(anchor).not.toBeNull();
    expect(anchor).toHaveAttribute('data-testid', 'estate-summary-band');
    expect(anchor!.querySelector('[data-testid="estate-network"]')).toBeNull();
    expect(anchor!.querySelector('[data-testid="estate-cloud"]')).toBeNull();
    expect(anchor!.querySelector('[data-testid="estate-ai"]')).toBeNull();
    // the anchor itself must not be inside the closed <details>
    expect(anchor!.closest('details')).toBeNull();
  });

  it('rollups start collapsed — clouds close by default, opened on click', () => {
    renderUD();
    expect(screen.queryByRole('button', { name: 'us-east-1' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'AWS' }));
    expect(screen.getByRole('button', { name: 'us-east-1' })).toBeInTheDocument();
  });

  it('drills cloud → region → VPC → resource map', () => {
    renderUD();
    fireEvent.click(screen.getByRole('button', { name: 'AWS' }));
    fireEvent.click(screen.getByRole('button', { name: 'us-east-1' }));
    const vpcBtn = screen.getByRole('button', { name: 'vpc-prod-01' });
    expect(vpcBtn).toBeInTheDocument();
    fireEvent.click(vpcBtn);
    // level-4 map columns appear
    expect(screen.getByText('Subnets · by availability zone')).toBeInTheDocument();
    expect(screen.getByText(/Gateways & connections/)).toBeInTheDocument();
  });

  it('Expand all opens every region; Collapse all closes the tree', () => {
    renderUD();
    fireEvent.click(screen.getByRole('button', { name: /expand all/i }));
    expect(screen.getByRole('button', { name: 'us-west-2' })).toBeInTheDocument(); // a non-default region
    fireEvent.click(screen.getByRole('button', { name: /collapse all/i }));
    expect(screen.queryByRole('button', { name: 'us-east-1' })).not.toBeInTheDocument();
  });

  it('has no AT&T fabric on-ramp rail (Pure Discovery — rail relocated to Connect)', () => {
    renderUD();
    expect(screen.queryByRole('complementary', { name: /at&t fabric on-ramps/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/NetBond · PE-IAD-02/)).not.toBeInTheDocument();
  });

  it('shows a connection-state indicator on cloud rows (fabric vs public)', () => {
    renderUD();
    // AWS is reached over the fabric in the seed; the label abstracts the product.
    expect(screen.getAllByText('via the AT&T fabric').length).toBeGreaterThan(0);
    // Unattached clouds read as public internet.
    expect(screen.getAllByText('public internet').length).toBeGreaterThan(0);
  });

  /* IMPORTANT: the Latency tile rendered the raw seed `r.lat` while Connect's
     Performance tile and the PathChoice cards render `fabricModel().latencyMs`
     for the same region. Every one of the nine regions disagreed across one
     click — Nebius read 44ms here and 120ms there. Asserted against the shaped
     model directly, per region, and against every region at once so a single
     coincidental match cannot carry the test. */
  it('states every region latency as the same figure Connect renders', () => {
    renderUD();
    fireEvent.click(screen.getByRole('button', { name: /expand all/i }));

    const shaped = CC.fabricModel().regions;
    expect(shaped.length).toBeGreaterThan(1);
    // Not all one number, or "they agree" would be trivially satisfiable.
    expect(new Set(shaped.map(r => r.latencyMs)).size).toBeGreaterThan(1);

    for (const region of shaped) {
      const row = screen.getByRole('button', { name: region.name });
      expect(row, `${region.regionId} latency`).toHaveTextContent(`${region.latencyMs}ms`);
    }
  });

  it('does not render the seeded region latency where the fabric shapes a different one', () => {
    renderUD();
    fireEvent.click(screen.getByRole('button', { name: /expand all/i }));

    const shaped = CC.fabricModel().regions;
    const seedById = new Map<string, number>(
      Object.values(CC.regions as Record<string, { id: string; lat: number }[]>)
        .flat()
        .map(r => [r.id, r.lat]),
    );
    // At least one region where the two genuinely differ, or reverting the
    // component to `r.lat` would still pass the assertion above.
    const diverging = shaped.filter(r => seedById.get(r.regionId) !== r.latencyMs);
    expect(diverging.length, 'no region distinguishes the two sources').toBeGreaterThan(0);

    for (const region of diverging) {
      const row = screen.getByRole('button', { name: region.name });
      expect(row).not.toHaveTextContent(`${seedById.get(region.regionId)}ms`);
    }
  });

  /* Minor: Discover's AI section named a security gap and every link in the
     page body went to /naas/*, so the screens that close it had no route in. */
  it('routes each domain to the console that owns it, AI included', () => {
    renderUD();
    for (const d of estateDomains(CC)) {
      const link = within(screen.getByTestId(`estate-${d.key}`)).getByTestId(`estate-cta-${d.key}`);
      expect(link).toHaveAttribute('href', d.cta.to);
    }
    expect(screen.getByTestId('estate-cta-ai')).toHaveAttribute('href', '/ai/providers');
    expect(screen.getByTestId('estate-cta-network')).toHaveAttribute('href', '/naas/connect');
  });

  it('"+ Connect a cloud" opens the discovery wizard', () => {
    renderUD();
    fireEvent.click(screen.getByRole('button', { name: /connect a cloud/i }));
    const dialog = screen.getByRole('dialog', { name: /connect a cloud/i });
    expect(dialog).toBeInTheDocument();
    // provider picker is present (visible option label, scoped to the wizard)
    expect(within(dialog).getByText('Oracle Cloud')).toBeInTheDocument();
  });
});

/* Task E — the stakeholder note: "show the list of discovered objects, and
   allow the user to GROUP these together." Branches were seeded, used by the
   policy engine, and rendered nowhere; the note's own example (group San
   Jose, San Francisco and Berkeley) was unreachable. */
describe('Discover selection → group', () => {
  const selectBranch = (name: string) =>
    fireEvent.click(screen.getByRole('checkbox', { name: `Select ${name}` }));

  it('lists the customer sites, outside the cloud tree', () => {
    renderUD();
    const sites = screen.getByTestId('discover-sites');
    expect(within(sites).getByText('San Jose campus')).toBeInTheDocument();
    expect(within(sites).getByText('Berkeley lab')).toBeInTheDocument();
    // every seeded site, counted off the engine — never a hardcoded 6
    expect(within(sites).getAllByRole('checkbox').length).toBe(CC.branches.length);
  });

  it('selecting is not expanding — picking a site does not open anything', () => {
    renderUD();
    selectBranch('San Jose campus');
    expect(screen.getByRole('checkbox', { name: 'Select San Jose campus' })).toBeChecked();
    expect(screen.getByText('collapsed view')).toBeInTheDocument();
  });

  it('the selection bar counts what is selected and clears it', () => {
    renderUD();
    expect(screen.queryByTestId('discover-selection')).not.toBeInTheDocument();
    selectBranch('San Jose campus');
    selectBranch('San Francisco office');
    const bar = screen.getByTestId('discover-selection');
    expect(within(bar).getByText(/2 selected/)).toBeInTheDocument();
    fireEvent.click(within(bar).getByRole('button', { name: /clear selection/i }));
    expect(screen.queryByTestId('discover-selection')).not.toBeInTheDocument();
  });

  it('a mixed selection of a site and a VPC says it will cover both estates', () => {
    renderUD();
    selectBranch('San Jose campus');
    fireEvent.click(screen.getByRole('button', { name: 'AWS' }));
    fireEvent.click(screen.getByRole('button', { name: 'us-east-1' })); // drill to a VPC
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select vpc-prod-01' }));
    const bar = screen.getByTestId('discover-selection');
    expect(within(bar).getByText(/2 selected/)).toBeInTheDocument();
    expect(within(bar).getByTestId('selection-kind')).toHaveTextContent('Both');
  });

  it('Group these shows the id a policy will store, and the rename warning', () => {
    renderUD();
    selectBranch('Dallas HQ');
    fireEvent.click(screen.getByRole('button', { name: /group these/i }));
    fireEvent.change(screen.getByLabelText('Group name'), { target: { value: 'Central sites E' } });
    expect(screen.getByTestId('discover-group-id')).toHaveTextContent('central-sites-e');
    expect(screen.getByTestId('discover-group-warning')).toHaveTextContent(ID_RENAME_WARNING);
  });

  it('does not offer to change the estate — Discover reads, it does not mutate', () => {
    renderUD();
    selectBranch('Dallas HQ');
    const bar = screen.getByTestId('discover-selection');
    expect(within(bar).queryByRole('button', { name: /attach|fix|provision|connect/i })).toBeNull();
  });
  it('wires aria-describedby on the name input, swapping to the taken-id warning on collision (GroupBuilder precedent, GroupBuilder.tsx:237)', () => {
    renderUD();
    selectBranch('Dallas HQ');
    fireEvent.click(screen.getByRole('button', { name: /group these/i }));
    const input = screen.getByLabelText('Group name');

    const noteId = input.getAttribute('aria-describedby');
    expect(noteId).toBeTruthy();
    expect(document.getElementById(noteId!)).toHaveTextContent('Policies will store this group as');

    // "West Branches" -> "west-branches", a seeded group id — a genuine
    // collision, not a contrived string.
    fireEvent.change(input, { target: { value: 'West Branches' } });
    const takenId = input.getAttribute('aria-describedby');
    expect(takenId).toBeTruthy();
    expect(takenId).not.toBe(noteId);
    expect(document.getElementById(takenId!)).toHaveTextContent('is already taken');
  });

  it('clears a failed-create banner when the name is edited, instead of naming something never attempted', () => {
    renderUD();
    selectBranch('Dallas HQ');
    fireEvent.click(screen.getByRole('button', { name: /group these/i }));
    fireEvent.change(screen.getByLabelText('Group name'), { target: { value: 'Race Group One' } });

    // Force the addGroup race addGroup's own null-return contract exists
    // for (state-groups.ts:149): an id claimed between the reactive `taken`
    // check and this click.
    const original = CC.addGroup;
    CC.addGroup = () => null;
    fireEvent.click(screen.getByRole('button', { name: /^Create group$/i }));
    CC.addGroup = original;

    expect(screen.getByText(/Could not create/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Group name'), { target: { value: 'Race Group Two' } });
    expect(screen.queryByText(/Could not create/)).not.toBeInTheDocument();
  });

  it('Cancel clears a failed-create banner, so reopening the form does not show a stale failure', () => {
    renderUD();
    selectBranch('Dallas HQ');
    fireEvent.click(screen.getByRole('button', { name: /group these/i }));
    fireEvent.change(screen.getByLabelText('Group name'), { target: { value: 'Race Group Three' } });

    const original = CC.addGroup;
    CC.addGroup = () => null;
    fireEvent.click(screen.getByRole('button', { name: /^Create group$/i }));
    CC.addGroup = original;
    expect(screen.getByText(/Could not create/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Cancel$/i }));
    fireEvent.click(screen.getByRole('button', { name: /group these/i }));
    expect(screen.queryByText(/Could not create/)).not.toBeInTheDocument();
  });

  it('after a failed create from a genuine id race, the taken-id state recomputes fresh — Create stays correctly disabled with no further fix', () => {
    renderUD();
    selectBranch('Dallas HQ');
    fireEvent.click(screen.getByRole('button', { name: /group these/i }));
    fireEvent.change(screen.getByLabelText('Group name'), { target: { value: 'Race Group Four' } });
    const id = 'race-group-four';

    const original = CC.addGroup;
    CC.addGroup = (spec: { id: string; kind: string }) => {
      // Simulate another actor claiming the id in the exact gap addGroup's
      // null-return contract exists for: something else wrote `groups[id]`
      // between the reactive `taken` check and this click.
      CC._.groups[spec.id] = {
        id: spec.id, label: 'Claimed elsewhere', kind: spec.kind,
        members: [], predicates: [], desc: '', custom: true,
      };
      return null;
    };
    fireEvent.click(screen.getByRole('button', { name: /^Create group$/i }));
    CC.addGroup = original;

    expect(screen.getByRole('button', { name: /^Create group$/i })).toBeDisabled();
    expect(screen.getByText(/is already taken/)).toBeInTheDocument();

    // cleanup — this engine singleton is shared across tests in this file.
    delete CC._.groups[id];
  });

  // --- MUTATING: creates a group in the shared engine. Ordered last. ---
  it('creates a group holding exactly the picked sites', () => {
    renderUD();
    selectBranch('San Jose campus');
    selectBranch('San Francisco office');
    selectBranch('Berkeley lab');
    fireEvent.click(screen.getByRole('button', { name: /group these/i }));
    fireEvent.change(screen.getByLabelText('Group name'), { target: { value: 'Bay sites' } });
    fireEvent.click(screen.getByRole('button', { name: /^Create group$/i }));

    const created = CC.groupList().find((g: { id: string }) => g.id === 'bay-sites');
    expect(created).toBeTruthy();
    expect(created.kind).toBe('site');
    // expectation stated from the seed, not read back off the UI
    const r = CC.resolveGroup('bay-sites');
    expect(r.branchIds.slice().sort()).toEqual(['br-bkl', 'br-sfo', 'br-sjc']);
    expect(r.vpcIds).toEqual([]);
    // the selection is spent
    expect(screen.queryByTestId('discover-selection')).not.toBeInTheDocument();
  });
});
