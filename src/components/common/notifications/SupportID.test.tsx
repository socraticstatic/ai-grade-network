import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SupportID } from './SupportID';

const wrap = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('SupportID', () => {
  it('renders the support ID text', () => {
    wrap(<SupportID id="1430987843e" />);
    expect(screen.getByText(/1430987843e/)).toBeInTheDocument();
  });

  it('renders a link to the correct ticket URL', () => {
    wrap(<SupportID id="abc123" />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/support/tickets/abc123');
  });

  it('displays "Support ID:" label', () => {
    wrap(<SupportID id="xyz" />);
    expect(screen.getByText(/Support ID:/)).toBeInTheDocument();
  });
});
