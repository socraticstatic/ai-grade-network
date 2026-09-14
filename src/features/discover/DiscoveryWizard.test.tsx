import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { DiscoveryWizard } from './DiscoveryWizard';

/**
 * The wizard walks provider → credentials → simulated scan → done. The scan is
 * paced by a timer, so we drive it with fake timers; the DATA shown is from the
 * engine (deterministic), the timer only advances the animation.
 */
describe('DiscoveryWizard flow', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const setup = () => {
    const onClose = vi.fn();
    const onDiscovered = vi.fn();
    render(<DiscoveryWizard onClose={onClose} onDiscovered={onDiscovered} />);
    return { onClose, onDiscovered };
  };

  it('gates Discover until the credential is shape-valid, then scans to done and reveals', () => {
    const { onClose, onDiscovered } = setup();

    // Step 1 — pick AWS.
    fireEvent.click(screen.getByText('AWS'));
    fireEvent.click(screen.getByRole('button', { name: /^next$/i }));

    // Step 2 — Discover is disabled until a well-shaped ARN is entered.
    const runBtn = screen.getByTestId('discover-run');
    expect(runBtn).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/IAM role ARN/i), {
      target: { value: 'arn:aws:iam::123456789012:role/CloudConnectDiscovery' },
    });
    expect(runBtn).not.toBeDisabled();

    // credentials note reassures nothing leaves the browser
    expect(screen.getByText(/Credentials stay in your browser/i)).toBeInTheDocument();

    // Step 3 — run the scan; the log shows a deterministic engine-derived step.
    fireEvent.click(runBtn);
    expect(screen.getByText(/Scanning us-east-1… found 3 VPCs, 14 subnets/)).toBeInTheDocument();

    // Advance the animation through all three AWS regions.
    act(() => { vi.advanceTimersByTime(620 * 4); });

    // Step 4 — done: finish reveals the discovered cloud and closes.
    const finish = screen.getByTestId('discover-finish');
    expect(finish).toBeInTheDocument();
    fireEvent.click(finish);
    expect(onDiscovered).toHaveBeenCalledWith('aws');
    expect(onClose).toHaveBeenCalled();
  });

  it('non-AWS providers ask for an API key / service principal, not an ARN', () => {
    setup();
    fireEvent.click(screen.getByText('Google Cloud'));
    fireEvent.click(screen.getByRole('button', { name: /^next$/i }));
    expect(screen.getByLabelText(/service account key/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/IAM role ARN/i)).not.toBeInTheDocument();
  });
});
