// src/components/common/notifications/AnnouncementBanner.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnnouncementBanner } from './AnnouncementBanner';

const defaultProps = {
  title: 'Scheduled Maintenance',
  message: 'June 5, 02:00–06:00 AM EST. Portal is read-only.',
  onDismiss: vi.fn(),
};

describe('AnnouncementBanner', () => {
  it('renders title and message', () => {
    render(<AnnouncementBanner {...defaultProps} />);
    expect(screen.getByText('Scheduled Maintenance')).toBeInTheDocument();
    expect(screen.getByText(/Portal is read-only/)).toBeInTheDocument();
  });

  it('calls onDismiss when X clicked', () => {
    const onDismiss = vi.fn();
    render(<AnnouncementBanner {...defaultProps} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('renders optional CTA link', () => {
    render(
      <AnnouncementBanner {...defaultProps} ctaLabel="Learn more" ctaHref="/docs/maintenance" />
    );
    const link = screen.getByRole('link', { name: 'Learn more' });
    expect(link).toHaveAttribute('href', '/docs/maintenance');
  });

  it('does not render CTA when not provided', () => {
    render(<AnnouncementBanner {...defaultProps} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('has banner role', () => {
    render(<AnnouncementBanner {...defaultProps} />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });
});
