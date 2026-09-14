import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NetOpsPage } from './NetOpsPage';

test('renders the four capability panels and the loop stages', () => {
  render(<MemoryRouter><NetOpsPage /></MemoryRouter>);
  ['Network Topology', 'Anomaly Detection', 'Drift Detection', 'AI-Assisted Troubleshooting']
    .forEach(t => expect(screen.getByText(t)).toBeInTheDocument());
  ['Observe', 'Diagnose', 'Recommend', 'Act'].forEach(s => expect(screen.getByText(s)).toBeInTheDocument());
});
