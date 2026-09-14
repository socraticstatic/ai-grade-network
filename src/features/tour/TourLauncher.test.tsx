import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { TourLauncher } from './TourLauncher';
import { cloudConnectTour } from './cloudConnectTour';

describe('TourLauncher', () => {
  it('tour has steps and the launcher opens it', () => {
    expect(cloudConnectTour.length).toBeGreaterThanOrEqual(6);
    render(<MemoryRouter><TourLauncher /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /tour/i }));
    // ProductTour renders once open (first step content visible)
    expect(screen.getByText(new RegExp(cloudConnectTour[0].title, 'i'))).toBeInTheDocument();
  });
});
