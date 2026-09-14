import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ObservePage } from './ObservePage';

test('renders the network observability shell', () => {
  render(<MemoryRouter><ObservePage /></MemoryRouter>);
  // Six KPI tiles: Throughput, P95 Latency, Packet Loss, Egress, Under Control, Savings.
  expect(screen.getAllByTestId('kpi-tile')).toHaveLength(6);
  expect(screen.getByText(/Packet Loss/i)).toBeInTheDocument();
  expect(screen.getAllByTestId('record-row').length).toBeGreaterThan(0);
  expect(screen.getByText(/Network briefing/i)).toBeInTheDocument();
});

test('opens with the verdict line', () => {
  render(<MemoryRouter><ObservePage /></MemoryRouter>);
  expect(screen.getByTestId('verdict-line').textContent).toMatch(/AT&T-controlled path/);
});
