import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CloudLegs } from './CloudLegs';
import type { Connection } from '../../types/connection';

const c2c: Connection = {
  id: 'conn-2',
  name: 'Multi-Cloud Production',
  type: 'Cloud to Cloud',
  status: 'Active',
  bandwidth: '10 Gbps',
  location: 'Dallas, TX',
  provider: 'Azure',
  providers: ['Azure', 'AWS'],
  locations: ['Dallas, TX', 'San Jose, CA'],
  hubIds: ['router-hub'],
};

const single: Connection = {
  id: 'conn-1',
  name: 'AWS Prod',
  type: 'Internet to Cloud',
  status: 'Active',
  bandwidth: '1 Gbps',
  location: 'Ashburn, VA',
  provider: 'AWS',
};

describe('CloudLegs', () => {
  it('renders every cloud leg for a C2C connection', () => {
    render(<CloudLegs connection={c2c} />);
    expect(screen.getByText('Azure')).toBeTruthy();
    expect(screen.getByText('AWS')).toBeTruthy();
  });

  it('renders a single provider for a single-cloud connection', () => {
    render(<CloudLegs connection={single} />);
    expect(screen.getByText('AWS')).toBeTruthy();
    expect(screen.queryByText('Azure')).toBeNull();
  });

  it('falls back to an em dash when no provider is known', () => {
    render(<CloudLegs connection={{ ...single, provider: undefined, providers: undefined }} />);
    expect(screen.getByText('—')).toBeTruthy();
  });

  it('calls onLegClick with the leg index when a C2C chip is clicked', () => {
    const onLegClick = vi.fn();
    render(<CloudLegs connection={c2c} onLegClick={onLegClick} />);
    fireEvent.click(screen.getByText('AWS'));
    expect(onLegClick).toHaveBeenCalledWith(1);
  });
});
