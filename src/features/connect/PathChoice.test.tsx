import { describe, it, expect } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import { CC } from '../../engine';
import { pathEvidence } from './pathEvidence';
import { PathChoice } from './PathChoice';

describe('PathChoice', () => {
  it('renders both paths for a region that has both', () => {
    render(<PathChoice cloudId="aws" regionId="use1" />);
    expect(screen.getByText('Direct cloud connect')).toBeInTheDocument();
    expect(screen.getByText('Dedicated tenant')).toBeInTheDocument();
  });

  it('shows the engine latency on the card whose path exists, once', () => {
    render(<PathChoice cloudId="aws" regionId="euw1" />);
    const rows = pathEvidence(CC as never, 'aws', 'euw1');
    const available = rows.filter(r => r.availability !== 'none');
    expect(available.length).toBeGreaterThan(0);
    const card = screen.getByTestId(`path-${available[0].pathId}`);
    expect(within(card).getByText(`${available[0].latencyMs}ms`)).toBeInTheDocument();
    // Exactly as many figures on screen as there are paths that exist here —
    // a card that loses its figure, or one that grows a figure it should not
    // have, both fail.
    expect(screen.getAllByText(new RegExp(`^${available[0].latencyMs}ms$`))).toHaveLength(available.length);
  });

  it('shows NO latency on a card that says the path does not reach this region', () => {
    // us-east-1's region latency (3ms) is the RTT from nb1's Equinix IAD site —
    // the NetBond on-ramp serving the card beside it. Rendering it here would
    // put a figure under "Not available here" / "None in this region".
    render(<PathChoice cloudId="aws" regionId="use1" />);
    const shown = (CC as never as {
      fabricModel(): { regions: { cloudId: string; regionId: string; latencyMs: number }[] };
    }).fabricModel().regions.find(r => r.cloudId === 'aws' && r.regionId === 'use1')!.latencyMs;

    const direct = screen.getByTestId('path-managed-direct');
    expect(direct).toHaveAttribute('data-availability', 'none');
    expect(within(direct).queryByText('Latency')).toBeNull();
    expect(direct.textContent).not.toContain(`${shown}ms`);
    // …while the card that DOES carry the path still shows it.
    const tenanted = screen.getByTestId('path-tenanted');
    expect(within(tenanted).getByText(`${shown}ms`)).toBeInTheDocument();
  });

  it('states the FABRIC figure, labelled as this path\'s, in the panel\'s own format', () => {
    render(<PathChoice cloudId="azure" regionId="uks" />);
    const model = (CC as never as {
      fabricModel(): { regions: { cloudId: string; regionId: string; latencyMs: number; privateMs: number }[] };
    }).fabricModel();
    const region = model.regions.find(r => r.cloudId === 'azure' && r.regionId === 'uks')!;
    // UK South is unattached, so its two figures differ — the card must show
    // the on-ramp RTT, not the public figure the Performance tile above it
    // states for the path the region rides today.
    expect(region.privateMs).not.toBe(region.latencyMs);
    // `92ms`, not `92 ms` — RegionPanel's Performance tile renders it unspaced
    // 40px above, and the same figure must not be formatted two ways.
    const card = screen.getByTestId('path-managed-direct');
    expect(within(card).getByText(`${region.privateMs}ms`)).toBeInTheDocument();
    expect(card.textContent).not.toContain(`${region.privateMs} ms`);
    // …and the label names the path, so the two figures on this screen cannot
    // be read as one claim.
    expect(within(card).getByText(/Latency on this path/i)).toBeInTheDocument();
    expect(card.textContent).not.toContain(`${region.latencyMs}ms`);
  });

  it('keeps the isolation posture out of the derived-evidence list', () => {
    // Constant per path, not something the engine measures here — so it reads
    // as description beside the promise, not as a row in the <dl> of figures
    // that move with the estate.
    const { container } = render(<PathChoice cloudId="aws" regionId="use1" />);
    expect(container.textContent).toMatch(/Per tenant/i);
    expect(within(screen.getByTestId('path-tenanted')).queryByText('Isolation')).toBeNull();
    const terms = [...container.querySelectorAll('dt')].map(d => d.textContent);
    expect(terms).not.toContain('Isolation');
  });

  it('marks the unavailable path: the label says so and the card carries the unavailable treatment', () => {
    render(<PathChoice cloudId="azure" regionId="uks" />);
    const rows = pathEvidence(CC as never, 'azure', 'uks');
    const tenanted = rows.find(r => r.pathId === 'tenanted')!;
    expect(tenanted.availability).toBe('none');

    const card = screen.getByTestId('path-tenanted');
    expect(card).toHaveAttribute('data-availability', 'none');
    expect(within(card).getByText('Not available here')).toBeInTheDocument();
    expect(within(card).getByText('None in this region')).toBeInTheDocument();
    expect(within(card).getByText(/No NetBond on-ramp targets this region/i)).toBeInTheDocument();
    // Nothing is invented to fill the rows the engine cannot answer.
    expect(within(card).queryByText('Latency')).toBeNull();
    expect(within(card).queryByText('Hand-off')).toBeNull();
    expect(within(card).queryByText('Capacity / state')).toBeNull();
    // Neutral, not green — de-emphasis comes from the neutral fill and badge,
    // not from a card-level opacity that would also wash out its own text
    // (see pathEvidence's WCAG AA note: opacity-70 undoes the darkened
    // fw-bodyLight that keeps this text at 4.5:1 on bg-fw-neutral/40).
    expect(card.className).toContain('bg-fw-neutral');
    expect(card.className).not.toContain('opacity-70');
    expect(card.className).not.toContain('fw-successLight');
  });

  it('no card borrows the cobalt "selected" treatment — these are not selectable', () => {
    // `border-fw-active bg-fw-ctaPrimary/[0.04]` means SELECTED everywhere else in
    // this codebase (RegionPanel's attach cards, both wizards). A live card
    // wearing it also disagreed with its own green badge. The badge carries
    // availability; the card stays neutral.
    for (const [cloudId, regionId] of [['aws', 'use1'], ['azure', 'uks'], ['cw', 'cwe']] as const) {
      const { unmount } = render(<PathChoice cloudId={cloudId} regionId={regionId} />);
      for (const id of ['path-managed-direct', 'path-tenanted']) {
        expect(screen.getByTestId(id).className).not.toContain('bg-fw-ctaPrimary');
        expect(screen.getByTestId(id).className).not.toContain('border-fw-active');
      }
      unmount();
    }
  });

  it('does not badge an unprovisioned path green: it reads provisionable, in cobalt', () => {
    render(<PathChoice cloudId="azure" regionId="uks" />);
    const card = screen.getByTestId('path-managed-direct');
    expect(card).toHaveAttribute('data-availability', 'provisionable');
    const badge = within(card).getByText('Provisionable here');
    expect(badge.className).toContain('fw-link');
    expect(badge.className).not.toContain('fw-successLight');
  });

  it('badges "Live here" only where an active on-ramp carries the region', () => {
    render(<PathChoice cloudId="aws" regionId="use1" />);
    const tenanted = screen.getByTestId('path-tenanted');
    expect(tenanted).toHaveAttribute('data-availability', 'live');
    expect(within(tenanted).getByText('Live here')).toBeInTheDocument();
    // The direct path has no on-ramp here at all — it must say so, not "Available".
    const direct = screen.getByTestId('path-managed-direct');
    expect(direct).toHaveAttribute('data-availability', 'none');
    expect(within(direct).getByText('Not available here')).toBeInTheDocument();
  });

  it('shows the hand-off site and the on-ramp\'s own capacity/state text as evidence', () => {
    render(<PathChoice cloudId="cw" regionId="cwe" />);
    const rows = pathEvidence(CC as never, 'cw', 'cwe');
    const tenanted = rows.find(r => r.pathId === 'tenanted')!;
    const card = screen.getByTestId('path-tenanted');
    expect(within(card).getByText(tenanted.handoffSite!)).toBeInTheDocument();
    expect(within(card).getByText(tenanted.capacityNote!)).toBeInTheDocument();
  });

  it('does not say the facility name twice in the hand-off / capacity pair', () => {
    // "Equinix CH1 · Chicago" followed by "Equinix CH1 · 10Gbps · unused
    // capacity" stuttered on 8 of 9 regions.
    render(<PathChoice cloudId="azure" regionId="uks" />);
    const card = screen.getByTestId('path-managed-direct');
    const handoff = within(card).getByText('Hand-off').parentElement!.textContent!;
    const facility = handoff.replace('Hand-off', '').split(' · ')[0];
    expect(facility.length).toBeGreaterThan(0);
    const capacity = within(card).getByText('Capacity / state').parentElement!.textContent!;
    expect(capacity).not.toContain(facility);
  });

  it('makes no underlay claim the hand-off evidence beneath it can contradict', () => {
    // The old copy promised a "shared high-capacity mid-mile into an
    // AT&T-managed VPC" directly above "Hand-off: Equinix DC2 · Ashburn",
    // derived from an on-ramp named "Direct Connect · Equinix DC2".
    const { container } = render(<PathChoice cloudId="aws" regionId="usw2" />);
    expect(container.textContent).toMatch(/Hand-off/);
    expect(container.textContent).not.toMatch(/mid-mile/i);
    expect(container.textContent).not.toMatch(/MPLS/i);
    expect(container.textContent).not.toMatch(/managed VPC/i);
  });

  it('makes no partner-fabric or L3 claim on a neocloud region', () => {
    const { container } = render(<PathChoice cloudId="cw" regionId="cwe" />);
    expect(container.textContent).not.toMatch(/Equinix Fabric/i);
    expect(container.textContent).not.toMatch(/\bL3\b/);
  });

  it('renders nothing for an unknown region', () => {
    const { container } = render(<PathChoice cloudId="aws" regionId="nope" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for an unknown cloud', () => {
    const { container } = render(<PathChoice cloudId="nope" regionId="use1" />);
    expect(container).toBeEmptyDOMElement();
  });

  /* The engine is a shared singleton — this mutation persists for the rest of
     the file, so it runs last. */
  it('re-renders in place when the estate moves: the MOUNTED card flips to Live here', () => {
    // Deliberately does NOT unmount and re-render. Unmounting only proves the
    // derivation re-runs on a fresh mount, which it would even with no
    // subscription at all — delete `useCloudControl(() => 0)` from
    // PathChoice.tsx and this test must fail.
    render(<PathChoice cloudId="aws" regionId="usw2" />);
    const card = screen.getByTestId('path-managed-direct');
    expect(card).toHaveAttribute('data-availability', 'provisionable');
    expect(within(card).getByText('Provisionable here')).toBeInTheDocument();
    expect(within(card).getByText(/Not live here yet/i)).toBeInTheDocument();

    act(() => {
      (CC as never as { activateOnramp(id: string): boolean }).activateOnramp('dx1');
    });

    // Same DOM node, no re-render call, no remount — the subscription did it.
    expect(screen.getByTestId('path-managed-direct')).toBe(card);
    expect(card).toHaveAttribute('data-availability', 'live');
    expect(within(card).getByText('Live here')).toBeInTheDocument();
    expect(within(card).queryByText('Provisionable here')).toBeNull();
    expect(within(card).queryByText(/Not live here yet/i)).toBeNull();
  });
});
