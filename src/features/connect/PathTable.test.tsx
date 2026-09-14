import { render, screen, fireEvent, within } from '@testing-library/react';
import { CC } from '../../engine';
import { PathTable } from './PathTable';
test('renders a row per flow and steering flips a flow to AT&T-controlled', () => {
  const rows = CC.routeFlows();
  render(<PathTable />);
  expect(screen.getAllByRole('row').length).toBeGreaterThanOrEqual(rows.length); // + header row
  const uncontrolled = rows.find(r => !r.current.attControlled);
  if (uncontrolled) {
    const before = CC.routeFlows().filter(r => r.current.attControlled).length;
    fireEvent.click(screen.getAllByRole('button', { name: /steer/i })[0]);
    expect(CC.routeFlows().filter(r => r.current.attControlled).length).toBeGreaterThan(before);
  }
});
