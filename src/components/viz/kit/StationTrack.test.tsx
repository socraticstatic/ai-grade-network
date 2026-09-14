import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StationTrack, type Station } from './StationTrack';

const stations: Station[] = [
  { key: 'create', label: 'Create VPC', detail: 'CIDR carved', state: 'done' },
  { key: 'vsrx', label: 'vSRX pair', detail: 'HA booting', state: 'current' },
  { key: 'live', label: 'Live', state: 'upcoming' },
];

describe('StationTrack', () => {
  it('renders one station per stage on a single wire, left to right, with the wizard test contract', () => {
    render(<StationTrack stations={stations} ariaLabel="Bring-up" />);
    const track = screen.getByTestId('station-track');
    expect(track.tagName).toBe('OL');
    expect(track).toHaveAttribute('aria-label', 'Bring-up');
    const items = ['create', 'vsrx', 'live'].map(k => screen.getByTestId(`stage-${k}`));
    expect(items.map(i => i.getAttribute('data-done'))).toEqual(['true', 'false', 'false']);
    expect(items[1]).toHaveAttribute('aria-current', 'step');
    expect(items[0]).not.toHaveAttribute('aria-current');
  });
  it('shows the label of every station and the detail of the current one', () => {
    render(<StationTrack stations={stations} ariaLabel="Bring-up" />);
    expect(screen.getByText('Create VPC')).toBeInTheDocument();
    expect(screen.getByText('HA booting')).toBeInTheDocument();
    expect(screen.queryByText('CIDR carved')).not.toBeInTheDocument();
  });
});
