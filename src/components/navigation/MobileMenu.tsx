import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, HelpCircle } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { AttIcon } from '../icons/AttIcon';
import { NAV_DISCOVER, NAV_TASKS, NAV_LAYERS, isNavRouteActive, layerDestinations, type CuratedNavItem } from './navItems';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  userInfo: {
    name: string;
    role: string;
    account: string;
    email: string;
    avatar?: string;
  };
  notifications: number;
}

export function MobileMenu({ isOpen, onClose, userInfo, notifications }: MobileMenuProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const menuRef = useFocusTrap(isOpen);
  const [animationComplete, setAnimationComplete] = useState(false);

  // Below 1280px this drawer is the ONLY way to reach any section, so it
  // carries the full curated nav: Discover, then NaaS and AI Fabric as two
  // labelled groups. Both groups hold the same four verb labels, so each is
  // a real `role="group"` with the domain as its accessible name — that
  // label is the only thing telling "Connect" from "Connect".
  // (A trailing "Utilities" item pointing at /profile used to live here —
  // removed because /profile is a Navigate to /discover, i.e. a no-op that
  // only closed the menu. See handleNavigation's /profile call below, which
  // was the same dead end from a second entry point.)

  // Prevent body scrolling when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleNavigation = (path: string, disabled: boolean = false) => {
    if (disabled) {
      return;
    }
    onClose();
    setTimeout(() => {
      navigate(path);
    }, 100);
  };

  // Same rule the desktop bar uses (navItems.ts) — exact or parent. This used
  // to be `location.pathname === item.to`, so a deep link under a section
  // highlighted nothing here while the bar highlighted its parent.
  const isActive = (item: CuratedNavItem) => isNavRouteActive(location.pathname, item.to);

  /** Discover: alone above both domains, so it keeps the icon and the full
   *  row. Nothing shares its label, and nothing sits beside it to pair with. */
  const renderDiscoverItem = (item: CuratedNavItem) => {
    const active = isActive(item);
    return (
      <button
        onClick={() => handleNavigation(item.to)}
        aria-current={active ? 'page' : undefined}
        data-nav-to={item.to}
        data-nav-label={item.label}
        className={`
          w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors
          ${active ? 'bg-fw-accent text-fw-link font-medium' : 'text-fw-body hover:bg-fw-neutral'}
        `}
      >
        <AttIcon
          name={item.icon}
          className={`h-5 w-5 shrink-0 ${active ? 'text-fw-link' : 'text-fw-bodyLight'}`}
        />
        <span className="min-w-0">
          <span className="block text-figma-base font-medium">{item.label}</span>
          <span className="block text-figma-xs leading-4 text-fw-bodyLight">{item.description}</span>
        </span>
      </button>
    );
  };

  /** A domain verb, in the two-up grid.
   *
   *  Two changes from the full-width row this used to be, both of them height:
   *
   *  1. No icon. The same icons repeat across both domains — `check-shield` is
   *     Govern in NaaS and Govern in the AI Fabric — so here they disambiguate
   *     nothing while claiming the horizontal room the description needs. The
   *     desktop bar already dropped them from its in-group links for exactly
   *     this reason (MainNav.tsx, `renderNavLink(item, compact)`).
   *
   *  2. Two per row instead of one. Four verbs become two rows, so the eight
   *     verbs cost four rows rather than eight.
   *
   *  What did NOT change is the description. Both domains carry the identical
   *  four labels, so "Connect" and "Connect" are two different screens with
   *  one name, and below 1280px this drawer is the only place either can be
   *  reached. The description is what tells them apart; deleting it would have
   *  fit the fold in one line of diff and made the drawer unreadable. */
  /* A label that appears in more than one group keeps its description — it
     is the only thing telling "Connect" from "Connect". A label unique across
     the drawer (the AI gateway sections) renders compact, one line, which is
     what keeps a five-item group above the fold. */
  const duplicateLabels = (() => {
    const counts = new Map<string, number>();
    for (const layer of NAV_LAYERS) {
      for (const item of layerDestinations(layer)) {
        if (item.to === layer.home.to) continue;
        counts.set(item.label, (counts.get(item.label) ?? 0) + 1);
      }
    }
    return new Set([...counts.entries()].filter(([, n]) => n > 1).map(([l]) => l));
  })();

  const renderVerbItem = (item: CuratedNavItem) => {
    const active = isActive(item);
    const ambiguous = duplicateLabels.has(item.label);
    return (
      <button
        key={item.to}
        onClick={() => handleNavigation(item.to)}
        aria-current={active ? 'page' : undefined}
        data-nav-to={item.to}
        data-nav-label={item.label}
        className={`
          h-full flex flex-col items-start px-2.5 rounded-lg text-left transition-colors
          ${ambiguous ? 'py-1.5' : 'py-1'}
          ${active ? 'bg-fw-accent text-fw-link font-medium' : 'text-fw-body hover:bg-fw-neutral'}
        `}
      >
        <span className="text-figma-sm font-semibold">{item.label}</span>
        {ambiguous && (
          <span className="text-figma-xs leading-4 text-fw-bodyLight">{item.description}</span>
        )}
      </button>
    );
  };

  /* Grid rows take the height of their tallest cell, so two-line (ambiguous)
     items are packed together ahead of the compact ones — one mixed row
     wastes a compact item's whole height. Stable within each class, so the
     rail's own order survives inside each. */
  const packForFold = (items: CuratedNavItem[]) => [
    ...items.filter(i => duplicateLabels.has(i.label)),
    ...items.filter(i => !duplicateLabels.has(i.label)),
  ];

  // Portalled straight to document.body (same pattern OverflowMenu uses).
  // `fixed` descendants resolve against the nearest ancestor that
  // establishes a containing block — transform, filter, backdrop-filter,
  // perspective, contain:paint, or will-change on that property all
  // qualify. <nav> already has backdrop-blur-md for the sticky header, and
  // rendering this drawer as a plain sibling in the React tree isn't
  // enough insurance: any future ancestor between here and <body> that
  // picks up one of those properties would silently clip the drawer to
  // its own box again, exactly like the header did. Portalling to
  // document.body sidesteps the whole ancestor chain — the panel and
  // backdrop always resolve against the real viewport, no matter where in
  // the React tree <MobileMenu /> gets mounted.
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />

          {/* Menu Panel */}
          <motion.div
            ref={menuRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{
              type: 'spring',
              damping: 30,
              stiffness: 300,
              duration: 0.3
            }}
            onAnimationComplete={() => setAnimationComplete(true)}
            className="fixed top-0 right-0 bottom-0 w-full max-w-[320px] bg-fw-base shadow-xl z-[101] flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-fw-secondary flex items-center justify-between">
              <div className="flex items-center">
                <button
                  onClick={onClose}
                  className="p-2 -ml-2 text-fw-bodyLight hover:text-fw-body rounded-full hover:bg-fw-neutral"
                  aria-label="Close menu"
                >
                  <X className="h-6 w-6" />
                </button>
                <h2 className="ml-2 text-figma-lg font-bold text-fw-heading tracking-[-0.03em]">Menu</h2>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  className="p-2 text-fw-bodyLight hover:text-fw-body rounded-full hover:bg-fw-neutral"
                  onClick={() => handleNavigation('/notifications')}
                >
                  <div className="relative">
                    <Bell className="h-6 w-6" />
                    {notifications > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 text-figma-sm flex items-center justify-center bg-fw-error text-white rounded-full">
                        {notifications}
                      </span>
                    )}
                  </div>
                </button>
                <button
                  className="p-2 text-fw-bodyLight hover:text-fw-body rounded-full hover:bg-fw-neutral"
                  onClick={() => handleNavigation('/support')}
                >
                  <HelpCircle className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Navigation comes first.

                Below 1280px this drawer is the only route to any section, and
                the domain split doubled the list: Discover plus two domains of
                four verbs each. With Search and the profile card above it (169
                px between them) the AI Fabric group started below the fold on
                an 800px-tall viewport — reachable by scrolling, invisible
                without it, on the surface that is the ONLY way there. Nothing
                was deleted; the navigation simply leads in a navigation
                drawer, and the two supporting blocks follow it. */}
            <div data-testid="drawer-nav-scroller" className="flex-1 overflow-y-auto py-2">
              <AnimatePresence>
                {animationComplete && (
                  <div className="space-y-2 px-2">
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05, duration: 0.2 }}
                    >
                      {renderDiscoverItem(NAV_DISCOVER)}
                      {renderDiscoverItem(NAV_TASKS)}
                    </motion.div>

                    {NAV_LAYERS.map((domain, domainIndex) => (
                      <motion.div
                        key={domain.key}
                        role="group"
                        aria-label={domain.label}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + domainIndex * 0.05, duration: 0.2 }}
                        className="pt-2"
                      >
                        {/* Label only. The domain blurbs used to sit here, two
                            lines each, and they were what the search box's
                            reclaimed 73px got spent on: the AI Fabric group's
                            four verbs still started below an 800px fold, under
                            a sentence clipped mid-word. Every verb already
                            carries its own description one line down, so the
                            blurb was the second-least load-bearing text in a
                            drawer that is the ONLY way to reach these screens
                            below 1280px. NAV_LAYERS still carries `blurb` —
                            nothing was deleted from the model. */}
                        {/* The layer header doubles as its Home link — tap the
                            layer name to reach its overview. Keeping Home here
                            rather than as a grid cell preserves the drawer's
                            everything-above-the-fold guarantee (the verbs stay
                            a 2-col grid, no extra rows). */}
                        <button
                          type="button"
                          data-nav-home={domain.key}
                          aria-current={isNavRouteActive(location.pathname, domain.home.to) ? 'page' : undefined}
                          onClick={() => handleNavigation(domain.home.to)}
                          className="group w-full flex items-center justify-between px-2.5 pb-1"
                        >
                          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-fw-bodyLight group-hover:text-fw-body">
                            {domain.label}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-fw-link">
                            <AttIcon name="home" className="h-3 w-3" /> Home
                          </span>
                        </button>
                        {/* Every rail destination, so a section that exists only
                            on a layer's bespoke rail (AI: Teams, Providers,
                            Keys) is still reachable below 1024px. Home stays
                            on the group header. */}
                        <div className="grid grid-cols-2 gap-1">
                          {packForFold(
                            layerDestinations(domain).filter(item => item.to !== domain.home.to),
                          ).map(renderVerbItem)}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* A "Search..." input used to sit here. It was wired to local
                state that nothing ever read — no submit, no filter, no
                results — so typing in it did nothing at all. With Discover
                plus two domains of four verbs, its 73px was the difference
                between the AI Fabric group being visible in an 800px drawer
                and being hidden below the fold on the one surface that can
                reach it. Removed as a dead affordance, the same call already
                made in this file for Sign Out and the profile chevron; the
                real search lives in the top bar (SearchBar). */}

            {/* User Profile.
                Chrome, not navigation. It and the footer below it took 202 of
                667px on an iPhone SE / 8 viewport — the scroller got 392px for
                409px of destinations, so `/ai/observe` and `/ai/cost` sat 17px
                below the fold on the ONE surface that can reach them under
                1280px. The recovery comes out of these two blocks rather than
                out of the verb rows: shrinking a touch target or deleting the
                descriptions that tell "Connect" from "Connect" would pay for
                the fold with the thing the fold exists to show.
                Nothing here was removed — the avatar, all three identity lines
                and the whole footer sentence still render. */}
            <div className="px-4 py-3 border-b border-fw-secondary bg-fw-wash">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  {userInfo.avatar ? (
                    <img
                      src={userInfo.avatar}
                      alt={userInfo.name}
                      className="h-10 w-10 rounded-full object-cover border-2 border-fw-base shadow-sm"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-fw-cobalt-600 flex items-center justify-center text-white text-figma-base font-semibold">
                      {userInfo.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="ml-3">
                  <p className="text-figma-sm font-medium text-fw-heading">{userInfo.name}</p>
                  <p className="text-figma-xs font-medium text-fw-bodyLight">{userInfo.role}</p>
                  <p className="text-figma-xs text-fw-bodyLight">{userInfo.account}</p>
                </div>
                {/* A chevron here used to navigate to /profile, which is a
                    Navigate to /discover — a no-op that only closed the
                    menu. Removed rather than pointing it somewhere real,
                    since there is no profile screen in this app. */}
              </div>
            </div>

            {/* Footer */}
            {/* Sign Out used to live here. Authentication was removed from
                this app — there is no login screen to return to, so
                signOut() just wiped a stray localStorage key before
                navigating to /login, which itself redirects to /discover.
                Removed as a dead affordance rather than left pointing at a
                feature that no longer exists. */}
            <div className="px-4 py-3 border-t border-fw-secondary">
              <div className="text-center text-figma-xs text-fw-bodyLight">
                <p className="font-semibold text-fw-heading">AT&T AI-grade network • v2.0.1</p>
                <p>© 2025 AT&T Intellectual Property. All rights reserved.</p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
