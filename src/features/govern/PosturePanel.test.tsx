import { render, screen } from '@testing-library/react';
import { CC } from '../../engine';
import { PosturePanel } from './PosturePanel';
test('renders a scorecard per posture dimension from the engine', () => {
  render(<PosturePanel />);
  const cats = CC.postureCatalog;
  expect(cats.length).toBeGreaterThan(0);
  // each category name appears
  expect(screen.getByText(new RegExp(cats[0].name, 'i'))).toBeInTheDocument();
});
