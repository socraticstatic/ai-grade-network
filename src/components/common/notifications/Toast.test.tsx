// src/components/common/notifications/Toast.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Toast } from './Toast';

const defaultProps = {
  id: 'toast-1',
  type: 'info' as const,
  title: 'Bandwidth updated',
  message: 'Connection speed set to 500 Mbps.',
  duration: 5000,
  onRemove: vi.fn(),
};

describe('Toast', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('renders title and message', () => {
    render(<Toast {...defaultProps} />);
    expect(screen.getByText('Bandwidth updated')).toBeInTheDocument();
    expect(screen.getByText(/500 Mbps/)).toBeInTheDocument();
  });

  it('calls onRemove after duration', async () => {
    const onRemove = vi.fn();
    render(<Toast {...defaultProps} duration={3000} onRemove={onRemove} />);
    act(() => vi.advanceTimersByTime(3500));
    expect(onRemove).toHaveBeenCalledWith('toast-1');
  });

  it('does not auto-dismiss when duration is null', () => {
    const onRemove = vi.fn();
    render(<Toast {...defaultProps} duration={null} onRemove={onRemove} />);
    act(() => vi.advanceTimersByTime(30000));
    expect(onRemove).not.toHaveBeenCalled();
  });

  it('calls onRemove when X button clicked', () => {
    const onRemove = vi.fn();
    render(<Toast {...defaultProps} onRemove={onRemove} />);
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(onRemove).toHaveBeenCalledWith('toast-1');
  });

  it('renders with success type', () => {
    render(<Toast {...defaultProps} type="success" title="Policy applied" message="4 connections updated." />);
    expect(screen.getByText('Policy applied')).toBeInTheDocument();
  });

  it('renders with error type and no auto-dismiss', () => {
    const onRemove = vi.fn();
    render(<Toast {...defaultProps} type="error" duration={null} onRemove={onRemove} />);
    act(() => vi.advanceTimersByTime(60000));
    expect(onRemove).not.toHaveBeenCalled();
  });
});
