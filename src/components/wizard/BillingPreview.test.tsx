import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BillingPreview } from './BillingPreview';

const renderLmcc = (planId = '12-months') =>
  render(
    <BillingPreview
      provider={'AWS' as any}
      type={'AWS Last Mile' as any}
      bandwidth={'1 Gbps' as any}
      location="metro-sj"
      configuration={{ isLmcc: true } as any}
      selectedPlanId={planId}
      onPlanChange={() => {}}
    />,
  );

describe('wizard Cost Summary (Apple pattern)', () => {
  it('the estimated monthly total leads, details collapsed by default', () => {
    renderLmcc();
    expect(screen.getByText(/estimated monthly/i)).toBeTruthy();
    expect(screen.getByText('See all details')).toBeTruthy();
    expect(screen.queryByText('Subtotal')).toBeNull();
  });

  it('billing-starts-at-Live is stated on the bar for LMCC', () => {
    renderLmcc();
    expect(screen.getByText(/Billing starts when the connection goes Live/i)).toBeTruthy();
  });

  it('See all details opens the ledger; Hide details closes it', () => {
    renderLmcc();
    fireEvent.click(screen.getByText('See all details'));
    expect(screen.getByText('Subtotal')).toBeTruthy();
    expect(screen.getByText('Total')).toBeTruthy();
    fireEvent.click(screen.getByText('Hide details'));
    expect(screen.queryByText('Subtotal')).toBeNull();
  });

  it('a committed term shows its saving on the bar', () => {
    renderLmcc('36-months');
    expect(screen.getByText(/Saving \$[\d,]+\/mo/i)).toBeTruthy();
  });

  it('no stale Preview or BGP-trigger copy anywhere', () => {
    const { container } = renderLmcc();
    expect(container.textContent).not.toMatch(/BGP Established|Preview: billing|Nov 2026/);
  });
});
