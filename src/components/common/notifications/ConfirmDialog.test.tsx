// src/components/common/notifications/ConfirmDialog.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmDialog } from './ConfirmDialog';

const defaultProps = {
  title: 'Apply policy to all connections?',
  message: 'This will update bandwidth limits on 12 active connections.',
  variant: 'standard' as const,
  confirmLabel: 'Apply',
  onConfirm: vi.fn(),
  onClose: vi.fn(),
};

describe('ConfirmDialog', () => {
  it('renders title and message', () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByRole('heading', { name: /Apply policy/i })).toBeInTheDocument();
    expect(screen.getByText(/12 active connections/)).toBeInTheDocument();
  });

  it('renders confirm and cancel buttons', () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('calls onConfirm when confirm clicked', () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('calls onClose when Cancel clicked', () => {
    const onClose = vi.fn();
    render(<ConfirmDialog {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when backdrop clicked', () => {
    const onClose = vi.fn();
    render(<ConfirmDialog {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('confirm-backdrop'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('renders destructive variant', () => {
    render(
      <ConfirmDialog
        {...defaultProps}
        variant="destructive"
        title="Delete this connection?"
        message="This cannot be undone."
        confirmLabel="Delete"
      />
    );
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('has dialog role', () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
