import { useEffect } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MobileMenu } from './MobileMenu';
import { NAV_LAYERS, layerDestinations } from './navItems';

// Mock framer-motion. The nav item list only renders once the panel's
// onAnimationComplete callback fires, so the mocked motion.div calls it on
// mount (via useEffect) to keep tests deterministic without real animation.
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

// Mock navigate function
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual as any,
    useNavigate: () => mockNavigate
  };
});

function renderMobileMenu(props: Partial<React.ComponentProps<typeof MobileMenu>> = {}) {
  const defaultProps = {
    isOpen: true,
    onClose: () => {},
    userInfo: {
      name: 'Test User',
      role: 'Admin',
      account: 'Test Account',
      email: 'test@example.com'
    },
    notifications: 3
  };

  return render(
    <BrowserRouter>
              <MobileMenu {...defaultProps} {...props} />    </BrowserRouter>
  );
}

describe('MobileMenu', () => {
  it('renders when isOpen is true', () => {
    renderMobileMenu();

    expect(screen.getByText('Menu')).toBeInTheDocument();
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    renderMobileMenu({ isOpen: false });

    expect(screen.queryByText('Menu')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onCloseMock = vi.fn();
    renderMobileMenu({ onClose: onCloseMock });

    const closeButton = screen.getByLabelText('Close menu');
    fireEvent.click(closeButton);

    expect(onCloseMock).toHaveBeenCalled();
  });

  it('navigates when a navigation item is clicked', () => {
    vi.useFakeTimers();
    try {
      renderMobileMenu();

      // Curated AI-grade network nav (NAV_ITEMS) — 'Discover' replaces the old 'Create'.
      const discoverButton = screen.getByText('Discover');
      fireEvent.click(discoverButton);

      // handleNavigation defers navigation by 100ms after onClose.
      vi.advanceTimersByTime(150);

      expect(mockNavigate).toHaveBeenCalledWith('/discover');
    } finally {
      vi.useRealTimers();
    }
  });

  it('displays notification count', () => {
    renderMobileMenu({ notifications: 5 });

    expect(screen.getByText('5')).toBeInTheDocument();
  });

  /* The drawer's "Search..." input was removed: it wrote to local state that
     nothing ever read, so typing in it did nothing. Asserting it renders was
     asserting that a dead control is present. What the drawer owes the user
     at these widths is reachable navigation — covered above and in
     MainNav.test.tsx — and the working search lives in the top bar. */
  it('does not render a search box that searches nothing', () => {
    renderMobileMenu();

    expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument();
  });

  /* The drawer's verbs were packed two-up to get both domains above the fold
     (e2e/mobile-nav.spec.ts measures that part — jsdom has no layout). What
     jsdom CAN see is the thing the density pass must not have cost: both
     domains carry the identical four labels, so every verb still has to say
     where it goes, and no two same-named verbs may say the same thing.
     Deleting the descriptions is the cheap way to fit the fold and it is the
     one fix that breaks the drawer, so it is asserted here as well as in the
     browser. */
  it('each drawer group carries every rail destination, each with its own copy', () => {
    renderMobileMenu();

    const seen = new Map<string, string[]>();

    for (const domain of NAV_LAYERS) {
      const group = screen.getByRole('group', { name: domain.label });
      const raw = layerDestinations(domain).filter(i => i.to !== domain.home.to);
      // The drawer packs two-line (cross-group duplicate) labels ahead of the
      // compact ones so no grid row mixes heights — same partition the
      // component applies (see packForFold in MobileMenu.tsx).
      const dupes = new Set(
        raw.map(i => i.label).filter(label =>
          NAV_LAYERS.filter(l =>
            layerDestinations(l).some(i => i.to !== l.home.to && i.label === label),
          ).length > 1,
        ),
      );
      const expected = [...raw.filter(i => dupes.has(i.label)), ...raw.filter(i => !dupes.has(i.label))];
      const buttons = within(group).getAllByRole('button')
        .filter(b => b.hasAttribute('data-nav-to'));
      expect(buttons.map(b => b.getAttribute('data-nav-label'))).toEqual(
        expected.map(i => i.label)
      );

      for (const item of expected) {
        const button = within(group).getByRole('button', {
          name: new RegExp(`^${item.label}`),
        });
        expect(button).toHaveAttribute('data-nav-to', item.to);

        // A label that repeats across groups MUST carry its description —
        // that copy is the only thing telling the twins apart. A unique
        // label renders compact (no description), which is what keeps a
        // five-item group above the drawer fold.
        const isDuplicate = NAV_LAYERS.filter(l =>
          layerDestinations(l).some(i => i.to !== l.home.to && i.label === item.label),
        ).length > 1;
        if (isDuplicate) {
          expect(button).toHaveTextContent(item.description);
          const copy = (button.textContent ?? '').replace(item.label, '').trim();
          const prior = seen.get(item.label) ?? [];
          expect(prior, `${item.label} reads identically in two groups`).not.toContain(copy);
          seen.set(item.label, [...prior, copy]);
        }
      }
    }
  });

  it('each layer header is a Home link to that layer overview', () => {
    renderMobileMenu();
    for (const domain of NAV_LAYERS) {
      const home = screen.getByRole('button', { name: new RegExp(`${domain.label}\\s*Home`) });
      expect(home).toHaveAttribute('data-nav-home', domain.key);
    }
  });
});
