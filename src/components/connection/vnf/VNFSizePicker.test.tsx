import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../../test/utils';
import { VNFSizePicker } from './VNFSizePicker';

describe('VNFSizePicker', () => {
  it('renders all five size labels', () => {
    render(<VNFSizePicker value={null} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'XS' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'S' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'M' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'L' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'XL' })).toBeInTheDocument();
  });

  it('calls onChange with the correct size id when a tier is clicked', () => {
    const onChange = vi.fn();
    render(<VNFSizePicker value={null} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'M' }));
    expect(onChange).toHaveBeenCalledWith('m');
  });

  it('shows spec strip with vCPU, RAM, storage, and price for selected tier', () => {
    render(<VNFSizePicker value="m" onChange={vi.fn()} />);
    expect(screen.getByText(/4–8 vCPU/)).toBeInTheDocument();
    expect(screen.getByText(/8–16 GB RAM/)).toBeInTheDocument();
    expect(screen.getByText(/100–200 GB/)).toBeInTheDocument();
    expect(screen.getByText(/\$560\/mo/)).toBeInTheDocument();
  });

  it('does not show spec strip when no size is selected', () => {
    render(<VNFSizePicker value={null} onChange={vi.fn()} />);
    expect(screen.queryByText(/vCPU/)).not.toBeInTheDocument();
  });

  it('marks the selected tier button with aria-pressed true', () => {
    render(<VNFSizePicker value="l" onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'L' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'M' })).toHaveAttribute('aria-pressed', 'false');
  });
});
