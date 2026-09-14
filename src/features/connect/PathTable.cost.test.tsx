import { render, screen, fireEvent, within } from '@testing-library/react';
import { CC } from '../../engine';
import { PathTable } from './PathTable';

// CostChip tone classes (see src/components/viz/CostChip.tsx)
const CONTROLLED_CLASS = 'text-fw-link';
// De-amber: public egress now renders the neutral slate treatment, not amber.
const PUBLIC_CLASS = 'text-fw-bodyLight';

afterEach(() => {
  // Undo any steers so tests stay order-independent.
  CC.routeFlows().forEach(f => CC.clearSteer(f.id));
});

it('chip rates correspond exactly per tone to engine control state', () => {
  render(<PathTable />);
  const flows = CC.routeFlows();
  const controlledCount = flows.filter(f => f.current.attControlled).length;
  const publicCount = flows.length - controlledCount;
  // Engine only produces two egress rates: 0.02 (AT&T-controlled) and 0.09 (public).
  expect(screen.queryAllByText('$0.02/GB')).toHaveLength(controlledCount);
  expect(screen.queryAllByText('$0.09/GB')).toHaveLength(publicCount);
});

it('steering a public flow flips its chip from public neutral to controlled cobalt in place', () => {
  render(<PathTable />);
  const publicFlow = CC.routeFlows().find(
    f => !f.current.attControlled && f.paths.some(p => p.attControlled && p.available)
  );
  expect(publicFlow).toBeTruthy();

  const rowBefore = screen.getByText(publicFlow!.label).closest('tr')!;
  const chipBefore = within(rowBefore as HTMLElement).getByText(/\$\d+\.\d{2}\/GB/);
  expect(chipBefore.className).toContain(PUBLIC_CLASS);
  expect(chipBefore.className).not.toContain(CONTROLLED_CLASS);

  fireEvent.click(within(rowBefore as HTMLElement).getByRole('button', { name: /^steer$/i }));

  const rowAfter = screen.getByText(publicFlow!.label).closest('tr')!;
  const chipAfter = within(rowAfter as HTMLElement).getByText(/\$\d+\.\d{2}\/GB/);
  expect(chipAfter.className).toContain(CONTROLLED_CLASS);
  expect(chipAfter.className).not.toContain(PUBLIC_CLASS);
});
