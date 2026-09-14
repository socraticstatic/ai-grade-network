import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AlertDialog } from './AlertDialog';

const defaultProps = {
  title: 'Unable to connect to your account',
  reassurance: 'Your changes were saved,',
  reason: 'but we could not connect to your account due to a technical issue on our end.',
  fix: 'Please try connecting again.',
  escalation: 'contact your support team',
  supportId: '1430987843e',
  actionLabel: 'Try Again',
  onAction: vi.fn(),
  onClose: vi.fn(),
};

const wrap = (props = defaultProps) =>
  render(<MemoryRouter><AlertDialog {...props} /></MemoryRouter>);

describe('AlertDialog', () => {
  it('renders the title', () => {
    wrap();
    expect(screen.getByRole('heading', { name: /Unable to connect/i })).toBeInTheDocument();
  });

  it('renders all five content sections', () => {
    wrap();
    expect(screen.getByText(/Your changes were saved/)).toBeInTheDocument();
    expect(screen.getByText(/technical issue on our end/)).toBeInTheDocument();
    expect(screen.getByText(/Please try connecting again/)).toBeInTheDocument();
    expect(screen.getByText(/contact your support team/)).toBeInTheDocument();
    expect(screen.getByText(/1430987843e/)).toBeInTheDocument();
  });

  it('renders the action button with configurable label', () => {
    wrap();
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
  });

  it('renders the Cancel button', () => {
    wrap();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('calls onAction when primary button clicked', () => {
    const onAction = vi.fn();
    wrap({ ...defaultProps, onAction });
    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
    expect(onAction).toHaveBeenCalledOnce();
  });

  it('calls onClose when Cancel clicked', () => {
    const onClose = vi.fn();
    wrap({ ...defaultProps, onClose });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('has alertdialog role', () => {
    wrap();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });
});
