import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { WarningDialog } from './WarningDialog';

const defaultProps = {
  title: 'Active traffic will be interrupted',
  reassurance: 'Your connection settings are intact,',
  reason: 'but editing bandwidth will interrupt active traffic on 3 links.',
  fix: 'Schedule this change during a maintenance window to avoid disruption.',
  escalation: 'contact your support team',
  actionLabel: 'I Understand',
  onAction: vi.fn(),
  onClose: vi.fn(),
};

const wrap = (props = defaultProps) =>
  render(<MemoryRouter><WarningDialog {...props} /></MemoryRouter>);

describe('WarningDialog', () => {
  it('renders the title', () => {
    wrap();
    expect(screen.getByRole('heading', { name: /Active traffic/i })).toBeInTheDocument();
  });

  it('renders body content', () => {
    wrap();
    expect(screen.getByText(/editing bandwidth will interrupt/)).toBeInTheDocument();
    expect(screen.getByText(/Schedule this change/)).toBeInTheDocument();
  });

  it('calls onAction when primary button clicked', () => {
    const onAction = vi.fn();
    wrap({ ...defaultProps, onAction });
    fireEvent.click(screen.getByRole('button', { name: 'I Understand' }));
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

  it('renders optional SupportID when provided', () => {
    wrap({ ...defaultProps, supportId: 'warn-001' });
    expect(screen.getByText(/warn-001/)).toBeInTheDocument();
  });

  it('does not render SupportID when supportId is not provided', () => {
    wrap(defaultProps);
    expect(screen.queryByText(/Support ID:/)).not.toBeInTheDocument();
  });
});
