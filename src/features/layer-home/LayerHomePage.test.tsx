import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect } from 'vitest';
import { LayerHomePage } from './LayerHomePage';

const renderHome = (key: 'naas' | 'ai') =>
  render(<MemoryRouter><LayerHomePage layerKey={key} /></MemoryRouter>);

describe('LayerHomePage', () => {
  test('NaaS Home shows the widget board and still opens onto its four verbs', () => {
    renderHome('naas');
    expect(screen.getByRole('heading', { name: 'NaaS', level: 1 })).toBeInTheDocument();
    expect(screen.getByTestId('layer-dashboard')).toBeInTheDocument();
    const verbLinks = ['connect', 'govern', 'observe', 'cost'].map(
      v => screen.getByTestId(`home-verb-${v}`).getAttribute('href'),
    );
    expect(verbLinks).toEqual(['/naas/connect', '/naas/govern', '/naas/observe', '/naas/cost']);
  });

  test('AI Home shows the board and opens onto /ai verbs', () => {
    renderHome('ai');
    expect(screen.getByRole('heading', { name: 'AI Fabric', level: 1 })).toBeInTheDocument();
    expect(screen.getByTestId('layer-dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('home-verb-connect').getAttribute('href')).toBe('/ai/connect');
  });
});
