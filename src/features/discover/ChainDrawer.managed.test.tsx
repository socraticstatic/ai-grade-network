import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { CC } from '../../engine';
import { ChainDrawer } from './ChainDrawer';

afterEach(cleanup);

describe('ChainDrawer × managed VPC', () => {
  it('offers the deploy door only when a callback is given and no record exists', () => {
    const calls: string[] = [];
    render(<ChainDrawer selection={{ kind: 'workload', cloudId: 'aws', regionId: 'usw2', vpcId: 'vpcwest' }}
      onClose={() => {}} onDeployManagedVpc={(c, r) => calls.push(`${c}/${r}`)} />);
    fireEvent.click(screen.getByRole('button', { name: /deploy managed vpc/i }));
    expect(calls).toEqual(['aws/usw2']);
  });

  it('renders vSRX detail once live, and hides the door', () => {
    const m = CC.deployManagedVpc({ cloudId: 'aws', regionId: 'usw2' })!;
    CC.advanceManagedVpc(m.id); CC.advanceManagedVpc(m.id); CC.advanceManagedVpc(m.id); CC.advanceManagedVpc(m.id);
    render(<ChainDrawer selection={{ kind: 'workload', cloudId: 'aws', regionId: 'usw2', vpcId: 'vpcwest' }}
      onClose={() => {}} onDeployManagedVpc={() => {}} />);
    expect(screen.getByText('att-managed-usw2')).toBeInTheDocument();
    expect(screen.getByText(/vsrx-0/)).toBeInTheDocument();
    expect(screen.getAllByText(/established/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByRole('button', { name: /deploy managed vpc/i })).toBeNull();
    CC.undo();                                        // usw2 live activated dx1 — restore
  });
});
