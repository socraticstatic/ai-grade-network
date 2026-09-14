import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CC } from '../../engine';
import { RegionPanel } from './RegionPanel';

afterEach(cleanup);

const renderPanel = () => {
  const model = CC.fabricModel();
  const region = model.regions.find(r => r.regionId === 'use1')!;
  return render(
    <MemoryRouter>
      <RegionPanel region={region} model={model} onProvision={() => {}} onProvisioned={() => {}} />
    </MemoryRouter>,
  );
};

describe('RegionPanel managed-vpc block', () => {
  it('offers the deploy door when the region has no managed VPC', () => {
    renderPanel();
    expect(screen.getByRole('button', { name: /deploy managed vpc/i })).toBeInTheDocument();
  });

  it('shows the current stage while deploying', () => {
    const m = CC.deployManagedVpc({ cloudId: 'aws', regionId: 'use1' })!;
    renderPanel();
    expect(screen.queryByRole('button', { name: /deploy managed vpc/i })).toBeNull();
    expect(screen.getByText(m.stages[0].label)).toBeInTheDocument();
  });

  it('states the live summary once live', () => {
    const m = CC.managedVpcFor('aws', 'use1')!;
    CC.advanceManagedVpc(m.id); CC.advanceManagedVpc(m.id); CC.advanceManagedVpc(m.id); CC.advanceManagedVpc(m.id);
    renderPanel();
    expect(screen.getByText('att-managed-use1')).toBeInTheDocument();
    expect(screen.getByText(/routes exchanged both ways \(BGP\)/i)).toBeInTheDocument();
    // use1's ramp nb1 is already active — going live activated nothing, no undo needed
  });
});
