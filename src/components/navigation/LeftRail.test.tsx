import { render, screen, within, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect, beforeEach } from 'vitest';
import { LeftRail } from './LeftRail';

const renderAt = (path: string) =>
  render(<MemoryRouter initialEntries={[path]}><LeftRail /></MemoryRouter>);

describe('LeftRail', () => {
  beforeEach(() => localStorage.clear());

  test('absent on the global estate view', () => {
    renderAt('/discover');
    expect(screen.queryByTestId('left-rail')).toBeNull();
  });

  test('on a NaaS page: Home first, then the four verbs, all scoped to NaaS', () => {
    renderAt('/naas/connect');
    const rail = screen.getByTestId('left-rail');
    const labels = within(rail).getAllByRole('link').map(a => a.textContent?.trim());
    expect(labels).toEqual(['Home', 'Connect', 'Govern', 'Observe', 'Cost']);
    const hrefs = within(rail).getAllByRole('link').map(a => a.getAttribute('href'));
    expect(hrefs).toEqual(['/naas/home', '/naas/connect', '/naas/govern', '/naas/observe', '/naas/cost']);
    expect(within(rail).getByText('NaaS')).toBeInTheDocument();
  });

  test('the current verb is the active item (generic rail)', () => {
    renderAt('/naas/cost');
    const rail = screen.getByTestId('left-rail');
    expect(within(rail).getByText('NaaS')).toBeInTheDocument();
    const active = rail.querySelector('[aria-current="page"]');
    expect(active?.getAttribute('href')).toBe('/naas/cost');
  });

  test('the AI layer speaks the same lifecycle: four verb groups, gateway nouns nested', () => {
    renderAt('/ai/teams');
    const rail = screen.getByTestId('left-rail');
    // Gateway selector pinned at the top.
    expect(within(rail).getByTestId('gateway-selector')).toBeInTheDocument();
    // The four verb group titles - one vocabulary across layers.
    for (const verb of ['Connect', 'Govern', 'Observe', 'Cost']) {
      expect(within(rail).getByText(verb)).toBeInTheDocument();
    }
    const hrefs = within(rail).getAllByRole('link').map(a => a.getAttribute('href'));
    expect(hrefs).toEqual([
      '/ai/home',
      '/ai/providers', '/ai/keys',
      '/ai/govern', '/ai/teams',
      '/ai/observe',
      '/ai/cost',
    ]);
    expect(within(rail).getByText('Insights')).toBeInTheDocument();
    // The current section is active.
    const active = rail.querySelector('[aria-current="page"]');
    expect(active?.getAttribute('href')).toBe('/ai/teams');
  });

  test('Home is active on the layer home route', () => {
    renderAt('/naas/home');
    const active = screen.getByTestId('left-rail').querySelector('[aria-current="page"]');
    expect(active?.getAttribute('href')).toBe('/naas/home');
  });

  test('expanded by default; the toggle collapses to icons only and persists', () => {
    renderAt('/naas/connect');
    const rail = screen.getByTestId('left-rail');
    expect(rail).toHaveAttribute('data-collapsed', 'false');
    // Expanded: verb labels are visible text, links still there.
    expect(within(rail).getByText('Connect')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('rail-collapse-toggle'));
    expect(screen.getByTestId('left-rail')).toHaveAttribute('data-collapsed', 'true');
    // Collapsed: no label text, but the links remain (icon only) with a tooltip.
    const collapsed = screen.getByTestId('left-rail');
    expect(within(collapsed).queryByText('Connect')).toBeNull();
    const connect = within(collapsed).getByTestId('rail-connect');
    expect(connect).toHaveAttribute('title', 'Connect');
    expect(connect.getAttribute('href')).toBe('/naas/connect');
    // The choice persisted.
    expect(localStorage.getItem('cc-rail-collapsed')).toBe('1');
  });

  test('the rail header switches layers, mirroring the top tabs', () => {
    renderAt('/naas/observe');
    const switcher = screen.getByTestId('rail-layer-switcher');
    expect(switcher).toHaveTextContent('NaaS');
    fireEvent.click(switcher);
    const menu = screen.getByRole('menu', { name: 'Switch layer' });
    const items = within(menu).getAllByRole('menuitem');
    expect(items.map(a => a.getAttribute('href'))).toEqual(['/naas/home', '/ai/home']);
    // The current layer is marked; the other is the jump.
    expect(items[0].textContent).toContain('NaaS');
    expect(items[1].textContent).toContain('AI Fabric');
  });

  test('restores the collapsed choice from storage', () => {
    localStorage.setItem('cc-rail-collapsed', '1');
    renderAt('/ai/govern');
    expect(screen.getByTestId('left-rail')).toHaveAttribute('data-collapsed', 'true');
    expect(screen.getByTestId('rail-collapse-toggle')).toHaveAttribute('aria-label', 'Expand sidebar');
  });
});
