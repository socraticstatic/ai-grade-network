// src/features/connect/DeployManagedVpcWizard.test.tsx
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { CC } from '../../engine';
import { DeployManagedVpcWizard } from './DeployManagedVpcWizard';

afterEach(cleanup);

describe('DeployManagedVpcWizard', () => {
  it('locked region: walks tier -> cidr -> confirm and creates the engine record', () => {
    render(<DeployManagedVpcWizard lockedRegion={{ cloudId: 'aws', regionId: 'usw2' }} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /1 Gbps/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    const cidr = screen.getByLabelText(/CIDR/i) as HTMLInputElement;
    expect(cidr.value).toBe(CC.suggestManagedCidr());
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: /Deploy/ }));
    const m = CC.managedVpcFor('aws', 'usw2');
    expect(m).not.toBeNull();
    // tracker replaces the steps — the first stage is listed
    expect(screen.getByText(m!.stages[0].label)).toBeInTheDocument();
  });

  it('tracker reflects engine advances live', () => {
    // record exists from the previous test
    const m = CC.managedVpcFor('aws', 'usw2')!;
    render(<DeployManagedVpcWizard lockedRegion={{ cloudId: 'aws', regionId: 'usw2' }} onClose={() => {}} />);
    act(() => { CC.advanceManagedVpc(m.id); });
    expect(screen.getByTestId(`stage-${m.stages[0].key}`)).toHaveAttribute('data-done', 'true');
  });

  it('an invalid CIDR blocks Next', () => {
    render(<DeployManagedVpcWizard lockedRegion={{ cloudId: 'azure', regionId: 'uks' }} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /500 Mbps/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.change(screen.getByLabelText(/CIDR/i), { target: { value: '10.0.0.0/8' } });
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('Azure surfaces say Managed VNET, not Managed VPC', () => {
    // uks is still un-deployed in this file — the previous test never got
    // past the invalid-CIDR step, so no engine record exists for it yet.
    render(<DeployManagedVpcWizard lockedRegion={{ cloudId: 'azure', regionId: 'uks' }} onClose={() => {}} />);
    expect(screen.getByRole('dialog', { name: 'Deploy Managed VNET' })).toBeInTheDocument();
    expect(screen.getByText('Deploy Managed VNET')).toBeInTheDocument();
  });

  it('draws the managed VPC as answers land: tier thickens the ribbon, CIDR labels the region', () => {
    render(<DeployManagedVpcWizard lockedRegion={{ cloudId: 'aws', regionId: 'use1' }} onClose={() => {}} />);
    expect(screen.getByTestId('wizard-canvas')).toBeInTheDocument();
    // pick the 5 Gbps tier, advance - the edge thickens to the thick stroke
    fireEvent.click(screen.getByRole('button', { name: /5 Gbps/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(Number(screen.getByTestId('wc-edge-right').getAttribute('stroke-width'))).toBe(4);
    // the CIDR step previews the workload block on the region station
    expect(screen.getByTestId('wc-right').textContent).toMatch(/10\./);
  });
});
