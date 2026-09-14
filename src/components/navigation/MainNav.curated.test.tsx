import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect } from 'vitest';
import { MainNav } from './MainNav';
import { NAV_LAYERS, NAV_ITEMS } from './navItems';
import { attIcons } from '../icons/att-icons';

const renderNav = (path = '/discover') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <MainNav />    </MemoryRouter>,
  );

describe('MainNav curated AI-grade network nav — layers on top', () => {
  test('the top bar carries Discover plus one tab per layer; Tasks is utility state, not a place', () => {
    renderNav();
    const tabs = screen.getAllByRole('tab').map(t => t.textContent?.trim());
    expect(tabs).toEqual(['Discover', 'NaaS', 'AI Fabric']);
    // Tasks lives beside the bell with the queue's live count - state that
    // follows you, never a tab.
    expect(screen.getByTestId('tasks-badge')).toBeInTheDocument();
    /* The badge is a DOT now, not a numeral: "10" crammed into a 16px
       circle beside a second badged circle was clutter, and at that size
       whether the estate wants attention is the signal, not how many. The
       count rides data-count and the accessible name. */
    expect(Number(screen.getByTestId('tasks-badge-count').dataset.count)).toBeGreaterThan(0);
    // Verbs never appear in the top bar — they live in the left rail.
    for (const verb of ['Connect', 'Govern', 'Observe', 'Cost']) {
      expect(screen.queryByRole('tab', { name: verb })).toBeNull();
    }
  });

  test('each layer tab links to its Home, never a verb', () => {
    renderNav();
    expect(screen.getByRole('tab', { name: 'NaaS' })).toHaveAttribute('href', '/naas/home');
    expect(screen.getByRole('tab', { name: 'AI Fabric' })).toHaveAttribute('href', '/ai/home');
    expect(screen.getByRole('tab', { name: 'Discover' })).toHaveAttribute('href', '/discover');
  });

  test('the active tab tracks the layer you are in, from any of its routes', () => {
    renderNav('/ai/cost');
    expect(screen.getByRole('tab', { name: 'AI Fabric' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'NaaS' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: 'Discover' })).toHaveAttribute('aria-selected', 'false');
  });

  test('Discover is the active tab on the global estate view', () => {
    renderNav('/discover');
    expect(screen.getByRole('tab', { name: 'Discover' })).toHaveAttribute('aria-selected', 'true');
  });

  test('Create is a global action listing each creatable with its layer', () => {
    renderNav();
    fireEvent.click(screen.getByRole('button', { name: /create/i }));
    const menu = screen.getByRole('menu', { name: 'Create' });
    const hrefs = within(menu).getAllByRole('menuitem').map(a => a.getAttribute('href'));
    expect(hrefs).toContain('/naas/connect');
    expect(hrefs).toContain('/ai/providers');
  });

  test('every curated nav icon name is a valid key in the attIcons registry', () => {
    for (const item of [...NAV_ITEMS, ...NAV_LAYERS.map(l => l.home)]) {
      expect(attIcons).toHaveProperty(item.icon);
    }
  });
});
