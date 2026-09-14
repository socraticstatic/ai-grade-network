import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect } from 'vitest';
import { LayerDashboard } from './LayerDashboard';
import { DEFAULT_LAYOUT, WIDGET_REGISTRY } from './registry';

// Several widgets stage moves by navigating to /discover?draft=... (the
// review tray), so rendering the dashboard needs a Router in scope.
const renderDashboard = (surface: 'naas' | 'ai') =>
  render(<MemoryRouter><LayerDashboard surface={surface} /></MemoryRouter>);

describe('LayerDashboard', () => {
  test('renders exactly the NaaS default widgets, by title', () => {
    renderDashboard('naas');
    const frames = screen.getAllByTestId('widget-frame');
    expect(frames.map(f => f.getAttribute('data-widget-title'))).toEqual(
      DEFAULT_LAYOUT.naas.map(id => WIDGET_REGISTRY[id].title),
    );
  });

  test('renders an AI-only widget on the AI board and not on NaaS', () => {
    const ai = renderDashboard('ai');
    expect(screen.getByText('Token budgets')).toBeInTheDocument();
    ai.unmount();

    renderDashboard('naas');
    expect(screen.queryByText('Token budgets')).not.toBeInTheDocument();
  });

  test('skips a layout id that is not in the registry, without crashing', () => {
    // Temporarily append an unknown id to the real DEFAULT_LAYOUT.naas array
    // (there is no per-render injection point for the layout) and restore it
    // afterward so the mutation never leaks into other test files.
    const original = [...DEFAULT_LAYOUT.naas];
    DEFAULT_LAYOUT.naas.push('does-not-exist-in-registry');
    try {
      expect(() => renderDashboard('naas')).not.toThrow();
      const frames = screen.getAllByTestId('widget-frame');
      expect(frames.map(f => f.getAttribute('data-widget-title'))).toEqual(
        original.map(id => WIDGET_REGISTRY[id].title),
      );
    } finally {
      DEFAULT_LAYOUT.naas.length = 0;
      DEFAULT_LAYOUT.naas.push(...original);
    }
  });
});
