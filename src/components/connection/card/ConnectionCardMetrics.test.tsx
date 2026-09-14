import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConnectionCardMetrics } from './ConnectionCardMetrics';
import type { Connection } from '../../../types/connection';

const billingInfo = { type: 'monthly', cost: 0, label: '', color: '', bgColor: '', textColor: '' };

const c2c: Connection = {
  id: 'conn-c2c-demo',
  name: 'Cloud-to-Cloud Demo',
  type: 'Cloud to Cloud',
  status: 'Active',
  bandwidth: '10 Gbps',
  location: 'Ashburn, VA',
  provider: 'AWS',
  providers: ['AWS', 'Google'],
  locations: ['Ashburn, VA', 'Council Bluffs, IA'],
  legs: [
    { provider: 'AWS', location: 'Ashburn, VA', bandwidth: '10 Gbps', status: 'Active' },
    { provider: 'Google', location: 'Council Bluffs, IA', bandwidth: '5 Gbps', status: 'Active' },
  ],
};

describe('ConnectionCardMetrics — C2C', () => {
  it('shows each cloud leg with its provider, location and bandwidth', () => {
    render(<ConnectionCardMetrics connection={c2c} billingInfo={billingInfo} />);
    expect(screen.getByText('AWS')).toBeTruthy();
    expect(screen.getByText('Google')).toBeTruthy();
    expect(screen.getByText('Ashburn, VA')).toBeTruthy();
    expect(screen.getByText('Council Bluffs, IA')).toBeTruthy();
    // per-leg bandwidth (divergent) both present
    expect(screen.getByText('10 Gbps')).toBeTruthy();
    expect(screen.getByText('5 Gbps')).toBeTruthy();
  });

  it('does not hardcode the AWS San Jose location for a C2C connection', () => {
    render(<ConnectionCardMetrics connection={c2c} billingInfo={billingInfo} />);
    expect(screen.queryByText(/San Jose/)).toBeNull();
  });
});
