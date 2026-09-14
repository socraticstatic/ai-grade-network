import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { CC } from '../../engine';
import { ProvisionWizard } from './ProvisionWizard';

function usw2() {
  return CC.fabricModel().regions.find(r => r.regionId === 'usw2')!;
}

describe('ProvisionWizard', () => {
  it('steps attach → on-ramp → resiliency → confirm and provisions the region', () => {
    const onClose = vi.fn();
    const onProvisioned = vi.fn();
    expect(usw2().path).toBe('public');

    render(
      <MemoryRouter>
        <ProvisionWizard region={usw2()} model={CC.fabricModel()} onClose={onClose} onProvisioned={onProvisioned} />
      </MemoryRouter>
    );

    const dialog = screen.getByRole('dialog');
    for (let i = 0; i < 3; i++) {
      fireEvent.click(within(dialog).getByRole('button', { name: /^Next$/i }));
    }
    fireEvent.click(within(dialog).getByTestId('provision-confirm'));

    expect(onProvisioned).toHaveBeenCalledWith('usw2');
    expect(onClose).toHaveBeenCalled();
    // engine actually flipped the region onto the fabric
    expect(usw2().attached).toBe(true);
    expect(usw2().path).toBe('private');
  });

  it('closes without provisioning when cancelled', () => {
    const onClose = vi.fn();
    const onProvisioned = vi.fn();
    render(
      <MemoryRouter>
        <ProvisionWizard region={usw2()} model={CC.fabricModel()} onClose={onClose} onProvisioned={onProvisioned} />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: /^Cancel$/i }));
    expect(onClose).toHaveBeenCalled();
    expect(onProvisioned).not.toHaveBeenCalled();
  });

  it('draws the picture as answers land: ghosts first, then solid, dual doubles the line', async () => {
    const onClose = vi.fn();
    const onProvisioned = vi.fn();
    render(
      <MemoryRouter>
        <ProvisionWizard region={usw2()} model={CC.fabricModel()} onClose={onClose} onProvisioned={onProvisioned} />
      </MemoryRouter>
    );
    expect(screen.getByTestId('wizard-canvas')).toBeInTheDocument();
    // the region is known from mount - right station is drawn and answered
    expect(screen.getByTestId('wc-right')).toHaveAttribute('data-answered', 'true');
    // attach type question not yet passed - left edge pending
    expect(screen.getByTestId('wc-edge-left')).toHaveAttribute('data-answered', 'false');
    // pass attach type, then on-ramp
    fireEvent.click(screen.getByRole('button', { name: /^Next$/ }));
    expect(screen.getByTestId('wc-edge-left')).toHaveAttribute('data-answered', 'true');
    fireEvent.click(screen.getByRole('button', { name: /^Next$/ }));
    expect(screen.getByTestId('wc-left')).toHaveAttribute('data-answered', 'true');
    // choose Dual on the resiliency step, advance - edge doubles
    fireEvent.click(screen.getByRole('button', { name: /Dual · resilient/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Next$/ }));
    expect(screen.getByTestId('wc-edge-right')).toHaveAttribute('data-dual', 'true');
  });
});
