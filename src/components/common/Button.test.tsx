import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils';
import { Button } from './Button';
import { Activity } from 'lucide-react';

describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders with icon', () => {
    // Button.tsx's renderIcon() only handles a ReactNode (isValidElement) or a
    // plain function component — lucide-react icons are forwardRef objects
    // (typeof 'object'), so passing the bare component reference (icon={Activity})
    // does not currently render anything. Using the element form here, which the
    // component does support.
    render(<Button icon={<Activity />}>With Icon</Button>);
    expect(screen.getByText('With Icon')).toBeInTheDocument();
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('applies correct variant styles', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    expect(screen.getByText('Primary')).toHaveClass('bg-fw-ctaPrimary');

    rerender(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByText('Secondary')).toHaveClass('bg-transparent');

    rerender(<Button variant="outline">Outline</Button>);
    expect(screen.getByText('Outline')).toHaveClass('bg-fw-base');
  });

  it('applies disabled state correctly', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByText('Disabled')).toBeDisabled();
    expect(screen.getByText('Disabled')).toHaveClass('opacity-50');
  });

  it('applies full width style when specified', () => {
    render(<Button fullWidth>Full Width</Button>);
    expect(screen.getByText('Full Width')).toHaveClass('w-full');
  });
});