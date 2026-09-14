import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { ResiliencyMap } from './ResiliencyMap';
import type { Connection } from '../../../types/connection';

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
    { provider: 'Google', location: 'Council Bluffs, IA', bandwidth: '10 Gbps', status: 'Active' },
  ],
};

describe('ResiliencyMap — C2C', () => {
  it('shows both cloud legs and the Hub hub between them', () => {
    render(<ResiliencyMap connection={c2c} />);
    expect(screen.getAllByText('AWS').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Google').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Hub/i).length).toBeGreaterThan(0);
  });

  it('describes inter-cloud transit through the hub (not single-cloud path diversity)', () => {
    render(<ResiliencyMap connection={c2c} />);
    expect(screen.getByText(/transits the Hub|through (the |one )Hub/i)).toBeTruthy();
  });
});
