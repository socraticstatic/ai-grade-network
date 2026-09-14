import { useEffect } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MainNav } from './MainNav';
import { NAV_DISCOVER, NAV_LAYERS, layerDestinations } from './navItems';

// Mock framer-motion. MobileMenu's nav item list only renders once its
// panel's onAnimationComplete callback fires (see MobileMenu.test.tsx for
// the same pattern), so fire it on mount here too.
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, onAnimationComplete, ...props }: any) => {
      useEffect(() => {
        onAnimationComplete?.();
      }, []);
      return <div {...props}>{children}</div>;
    }
  },
  AnimatePresence: ({ children }: any) => <>{children}</>
}));

describe('MainNav', () => {
  it('renders the logo', () => {
    render(
      <BrowserRouter>
        <MainNav />
      </BrowserRouter>
    );

    // Rebrand: default tenant branding is "AI-grade network" (previously the old portal brand, and "NetBond" before that).
    expect(screen.getByText('AT&T')).toBeInTheDocument();
    expect(screen.getByText('AI-grade network')).toBeInTheDocument();
  });

  // "renders navigation items" (old Create/Manage/Monitor/Configure nav) was
  // removed: the curated six-item nav is already covered by
  // MainNav.curated.test.tsx. The hamburger now toggles MobileMenu (see
  // "hamburger opens the mobile drawer" below); MobileMenu's own render/close
  // behavior is covered directly in MobileMenu.test.tsx.

  it('hamburger opens the mobile drawer, and it contains every curated nav destination', () => {
    render(
      <BrowserRouter>
        <MainNav />
      </BrowserRouter>
    );

    // The drawer is mounted but closed until the hamburger is clicked.
    expect(screen.queryByLabelText('Close menu')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Open navigation menu'));

    expect(screen.getByLabelText('Close menu')).toBeInTheDocument();
    // Every curated nav item must be reachable from the drawer — below
    // 1280px it is the ONLY way to reach any of them. Matched by
    // role="button" specifically: the desktop bar renders the same labels as
    // <Link> (role="link"), so this proves the drawer itself has the item,
    // not just the always-mounted top bar.
    //
    // The two domains repeat the same four verb labels, so a flat
    // getByRole('button', {name: /^Connect/}) would now match twice. Scope
    // each lookup to its domain group — which is also the assertion that the
    // drawer keeps the domains apart at all.
    expect(
      screen.getByRole('button', { name: new RegExp(`^${NAV_DISCOVER.label}`) }),
    ).toBeInTheDocument();

    // Scope to the drawer panel itself: the desktop bar renders the same two
    // named groups, and this test is about the drawer.
    const drawer = screen.getByLabelText('Close menu').closest('.fixed') as HTMLElement;
    expect(drawer).toBeTruthy();

    for (const domain of NAV_LAYERS) {
      const group = within(drawer).getByRole('group', { name: domain.label });
      for (const item of layerDestinations(domain).filter(i => i.to !== domain.home.to)) {
        expect(
          within(group).getByRole('button', { name: new RegExp(`^${item.label}`) }),
        ).toBeInTheDocument();
      }
    }
  });

  it('renders custom navigation items when provided', () => {
    const customItems = [
      {
        label: 'Custom',
        icon: vi.fn() as any,
        href: '/custom',
        description: 'Custom Item'
      }
    ];

    render(
      <BrowserRouter>
        <MainNav items={customItems} />
      </BrowserRouter>
    );

    expect(screen.getByText('Custom')).toBeInTheDocument();
  });
});
