import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LegDetailDrawer } from './LegDetailDrawer';
import type { Connection } from '../../types/connection';

const c2c: Connection = {
  id: 'conn-2',
  name: 'Multi-Cloud Production',
  type: 'Cloud to Cloud',
  status: 'Active',
  bandwidth: '10 Gbps',
  location: 'Dallas, TX',
  provider: 'Azure',
  providers: ['Azure', 'AWS'],
  locations: ['Dallas, TX', 'San Jose, CA'],
  hubIds: ['router-hub'],
};

describe('LegDetailDrawer', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <LegDetailDrawer connection={c2c} legIndex={0} isOpen={false} onClose={() => {}} />,
    );
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('shows the selected leg provider, its native object and BGP ASN', () => {
    render(<LegDetailDrawer connection={c2c} legIndex={1} isOpen onClose={() => {}} />);
    // legIndex 1 = AWS
    expect(screen.getByText('AWS Direct Connect hosted connection')).toBeTruthy();
    expect(screen.getByText('7224')).toBeTruthy();
  });

  it('shows the leg location and bandwidth', () => {
    render(<LegDetailDrawer connection={c2c} legIndex={1} isOpen onClose={() => {}} />);
    expect(screen.getByText('San Jose, CA')).toBeTruthy();
    expect(screen.getByText('10 Gbps')).toBeTruthy();
  });

  it('renders nothing for an out-of-range leg index', () => {
    const { container } = render(
      <LegDetailDrawer connection={c2c} legIndex={9} isOpen onClose={() => {}} />,
    );
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('edits the leg bandwidth and calls onUpdateLeg with the patch (when not Active)', () => {
    const onUpdateLeg = vi.fn();
    const editable = { ...c2c, status: 'Inactive' as const };
    render(<LegDetailDrawer connection={editable} legIndex={1} isOpen onClose={() => {}} onUpdateLeg={onUpdateLeg} />);
    fireEvent.change(screen.getByLabelText('Leg bandwidth'), { target: { value: '2 Gbps' } });
    expect(onUpdateLeg).toHaveBeenCalledWith(1, { bandwidth: '2 Gbps' });
  });

  it('is read-only (no select) while the connection is Active', () => {
    const onUpdateLeg = vi.fn();
    render(<LegDetailDrawer connection={c2c} legIndex={1} isOpen onClose={() => {}} onUpdateLeg={onUpdateLeg} />);
    expect(screen.queryByLabelText('Leg bandwidth')).toBeNull();
    expect(screen.getByText(/Deactivate the connection to modify/i)).toBeTruthy();
  });

  it('shows bandwidth as static text when no edit handler is provided', () => {
    render(<LegDetailDrawer connection={c2c} legIndex={1} isOpen onClose={() => {}} />);
    expect(screen.queryByLabelText('Leg bandwidth')).toBeNull();
  });
});
