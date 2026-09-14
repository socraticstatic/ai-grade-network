import { useState, useEffect, useRef, ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { PlusCircle, Menu } from 'lucide-react';
import { AttIcon } from '../icons/AttIcon';
import { SearchBar } from './SearchBar';
import { NotificationsButton } from './NotificationsButton';
import { TasksButton } from './TasksButton';
import { UserMenu } from './UserMenu';
import { MobileMenu } from './MobileMenu';
import { TenantSelector } from './TenantSelector';
import { UtilityOverflow } from './UtilityOverflow';
import { ThemeToggle } from './ThemeToggle';
import { TourLauncher, START_TOUR_EVENT } from '../../features/tour/TourLauncher';
import { CommandPalette } from '../../features/command/CommandPalette';
import { UndoControl } from '../../features/undo/UndoControl';
import { NAV_DISCOVER, NAV_LAYERS, NAV_ITEMS, isNavRouteActive, layerForPath } from './navItems';
import { CreateMenu } from './CreateMenu';
import { toggleAndi } from '../../features/andi/AndiPanel';
import { Play, Sparkles } from 'lucide-react';
import { Button } from '../common/Button';
import { useStore } from '../../store/useStore';
import { usePermissions } from '../../hooks/usePermission';
import { useCloudControl } from '../../engine/react/useCloudControl';
import { ruleProposals } from '../../features/govern/ruleProposals';

interface NavItem {
  label: string;
  icon: typeof PlusCircle | ((props: { className?: string }) => ReactNode);
  href: string;
  description: string;
  active?: boolean;
}

interface MainNavProps {
  items?: NavItem[];
  onSearch?: (query: string) => void;
}

export function MainNav({ items = [], onSearch }: MainNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const tenantBranding = useStore(state => state.tenantBranding);
  const activeTenantId = useStore(state => state.activeTenantId);
  const isATT = activeTenantId === 'TNT-001';
  const { canCreate, canEdit } = usePermissions();
  const [notifications] = useState(3);
  const proposalCount = useCloudControl(c => ruleProposals(c).length);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setIsMenuOpen(false);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [userInfo] = useState({
    name: 'Emilio',
    role: 'Admin',
    account: 'AT&T',
    email: 'emilio.estevez@att.com',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
  });

  const toNavItem = (navItem: (typeof NAV_ITEMS)[number]): NavItem => ({
    label: navItem.label,
    icon: ({ className }: { className?: string }) => <AttIcon name={navItem.icon} className={className} />,
    href: navItem.to,
    description: navItem.description
  });

  // A caller-supplied `items` list is still rendered as one flat row — it has
  // no domains to group by. The curated nav renders NAV_LAYERS instead.
  const usingCuratedNav = items.length === 0;
  const navItems = usingCuratedNav ? NAV_ITEMS.map(toNavItem) : items;

  // Check if a nav item is disabled by role
  // User role: can only View. No Create, no Configure.
  // Admin: full access except Platform admin.
  // Super-admin: everything.
  const isNavDisabled = (href: string) => {
    if (href === '/create' && !canCreate) return true;
    if (href === '/configure' && !canEdit) return true;
    return false;
  };

  /* Active-route matching lives in navItems.ts so this bar and the mobile
     drawer cannot drift apart — they are the same navigation at two widths. */
  const isRouteActive = (href: string) => isNavRouteActive(location.pathname, href);

  /* Which layer's world we are in, if any — lights its top tab. */
  const activeLayerKey = layerForPath(location.pathname)?.key ?? null;

  /** One top tab: a layer, or Discover (the global estate view). The tab is
   *  the layer switch; the lifecycle switch is the left rail. */
  const renderTab = (label: string, to: string, active: boolean) => (
    <Link
      key={to}
      to={to}
      role="tab"
      aria-selected={active}
      aria-current={active ? 'page' : undefined}
      className={`
        inline-flex items-center h-full px-3 border-b-2 font-medium text-figma-base
        tracking-[-0.03em] whitespace-nowrap transition-colors
        ${active
          ? 'border-fw-active text-fw-link'
          : 'border-transparent text-fw-heading hover:border-fw-secondary hover:text-fw-body'}
      `}
    >
      {label}
    </Link>
  );

  /** One nav link. `compact` is the in-group form: no icon (the same three
   *  icons repeat across both domains, so they disambiguate nothing there)
   *  and the active underline sits under the label rather than the bar. */
  const renderNavLink = (item: NavItem, compact = false) => {
    const Icon = item.icon;
    const disabled = isNavDisabled(item.href);
    const isActive = !disabled && isRouteActive(item.href);

    return (
      <Link
        key={item.href}
        to={disabled ? '#' : item.href}
        onClick={disabled ? (e: React.MouseEvent) => e.preventDefault() : undefined}
        onMouseEnter={() => !disabled && setHoveredItem(item.href)}
        onMouseLeave={() => setHoveredItem(null)}
        aria-current={isActive ? 'page' : undefined}
        className={`
          group relative inline-flex items-center border-b-2 font-medium no-rounded
          transition-all duration-200 tracking-[-0.03em] whitespace-nowrap
          ${compact ? 'px-0.5 pb-1 text-figma-sm' : 'px-1 py-4 h-full text-figma-base'}
          ${disabled
            ? 'border-transparent text-fw-disabled cursor-not-allowed opacity-50'
            : isActive
              ? 'border-fw-active text-fw-link'
              : 'border-transparent text-fw-heading hover:border-fw-secondary hover:text-fw-body'
          }
        `}
      >
        {!compact && (
          <Icon className={`
            h-5 w-5 mr-1.5 transition-transform duration-200 flex-shrink-0
            ${!disabled && hoveredItem === item.href ? 'scale-110' : ''}
            ${disabled ? 'text-fw-disabled' : isActive ? 'text-fw-link' : 'text-fw-heading'}
          `}
          />
        )}
        <span className={`
          transition-all duration-200 tracking-[-0.03em]
          ${!disabled && hoveredItem === item.href ? 'transform translate-y-[-1px]' : ''}
        `}>
          {item.label}
        </span>

        {/* Enhanced Tooltip — for the in-group verbs this is where the
            difference between the two domains' identically-labelled links
            is spelled out. */}
        {hoveredItem === item.href && (
          <div
            className="absolute top-full mt-4 p-4 bg-fw-base rounded-lg shadow-lg border border-fw-secondary w-64" style={{ zIndex: 50 }}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-figma-base font-medium text-fw-heading">{item.label}</span>
                <Icon className="h-4 w-4 text-fw-bodyLight" />
              </div>
              <p className="whitespace-normal text-figma-sm text-fw-bodyLight">{item.description}</p>
            </div>
            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2">
              <div className="border-x-4 border-x-transparent border-b-4 border-b-fw-base"></div>
            </div>
          </div>
        )}
      </Link>
    );
  };

  const handleLogoClick = () => {
    // Home = the first stage of the flow. (Previously routed to the NetBond
    // legacy /manage portal — a fork remnant.)
    navigate('/discover');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <>
    <nav
      className="sticky top-0 z-50 bg-fw-wash/80 backdrop-blur-md border-b border-fw-secondary"
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Full-bleed: the header shares the body's left edge (the rail and
          content are full-bleed too), so the logo lines up over the rail
          instead of floating inside a centered container. */}
      <div className="w-full pl-6 pr-3">
        <div className="flex justify-between h-16">
          {/* Left Side: Logo and Navigation */}
          <div className="flex items-center min-w-0">
            {/* Hamburger Menu Button - Now next to the logo */}
            <button
              onClick={toggleMobileMenu}
              className="min-[1024px]:hidden flex items-center justify-center h-9 w-9 rounded-full text-fw-bodyLight hover:text-fw-body hover:bg-fw-wash"
              data-nav-toggle="true"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            
            <div 
              className="flex-shrink-0 flex items-center cursor-pointer ml-2 lg:ml-0"
              onClick={handleLogoClick}
              role="button"
              tabIndex={0}
            >
              <div className="flex items-center">
                {tenantBranding.productName === 'AI-grade network' ? (
                  <>
                    <span className="text-base font-bold text-brand-accent tracking-[-0.03em]">AT&T</span>
                    <span className="ml-2 text-base font-bold text-black tracking-[-0.03em]">AI-grade network</span>
                  </>
                ) : (
                  <span
                    className="text-base font-bold tracking-[-0.03em]"
                    style={{ color: tenantBranding.primaryColor }}
                  >
                    {tenantBranding.productName}
                  </span>
                )}
              </div>
            </div>

            {/* Desktop Navigation — layers across the top.

                Layers are the top tabs (the "which world am I in" switch);
                the lifecycle verbs live in the left rail (LeftRail.tsx), with
                Home first. Discover leads as the global estate view — it
                belongs to no single layer. Picking a layer lands on its Home,
                never on a verb. */}
            <div className="hidden min-[1024px]:flex min-[1024px]:items-center min-[1024px]:h-full ml-6">
              {usingCuratedNav ? (
                <div className="flex items-stretch h-full gap-1" role="tablist" aria-label="Layers">
                  {renderTab(NAV_DISCOVER.label, NAV_DISCOVER.to, isNavRouteActive(location.pathname, '/discover'))}
                  <span className="w-px self-center h-6 bg-fw-secondary mx-2" aria-hidden="true" />
                  {NAV_LAYERS.map(layer =>
                    renderTab(layer.label, layer.home.to, activeLayerKey === layer.key),
                  )}
                </div>
              ) : (
                <div className="flex items-center h-full gap-3 min-[1440px]:gap-5 min-[1680px]:gap-7">
                  {navItems.map(item => renderNavLink(item))}
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Actions.

              TourLauncher sits OUTSIDE the width gate on purpose, and its
              slot in this child list is fixed so React reconciles it to the
              same element instance whichever way `isMobile` flips.

              It used to live inside the `!isMobile` branch, which cost two
              separate things. The launcher button was simply absent below
              1024px — the guided tour, the one artifact built to demo this
              product, could not be started at any width where the drawer is
              the only navigation. And because `isMobile` is state driven by a
              resize listener, narrowing the window MID-TOUR unmounted
              <ProductTour /> with it: `currentStep` lives in ProductTour's own
              useState, so the tour did not pause, it stopped existing —
              spotlight, progress bar and place in the sequence all gone, and
              the next launch began again at step 1.

              Keeping it mounted at every width fixes both. The button is 36px
              and it is the only thing in this cluster below 1024px, so it
              costs nothing the narrow header was using. */}
          {/* The utility cluster.

              This was eight identical 36px circles in a row - Create, Andi,
              search, undo, share, tour, tasks, notifications, tenant - split
              by two hairline rules, three of them badged red. Everything
              looked equally urgent, which means nothing did, and the row was
              also what pushed a phone into a horizontal scroll.

              Now: the primary action, the assistant, and search hold their
              own space; the two controls that carry LIVE STATE (tasks,
              notifications) sit together as a quiet pair; everything reached
              occasionally (undo, replay link, guided tour) is one click away
              behind the overflow, where each gets a label instead of a
              tooltip. `min-w-0` lets the cluster shrink rather than force
              the page wider than the viewport. */}
          <div className="flex min-w-0 flex-shrink items-center gap-1 pr-1 sm:gap-1.5 sm:pr-2">
            {!isMenuOpen && !isMobile && (
              <>
                {/* Create is the one verb that outranks the layers - as a
                    global action, never an address. */}
                <CreateMenu />
                {/* Andi - the assistant. The badge is what makes
                    proposal-card advice findable from any page. */}
                <button
                  type="button"
                  data-testid="andi-toggle"
                  aria-label={
                    proposalCount > 0
                      ? `Ask Andi: ${proposalCount} proposal${proposalCount === 1 ? '' : 's'} waiting`
                      : 'Ask Andi'
                  }
                  title="Ask Andi"
                  onClick={toggleAndi}
                  className="relative flex h-9 w-9 items-center justify-center rounded-full bg-fw-ctaPrimary text-white transition-colors hover:bg-fw-ctaPrimaryHover"
                >
                  <Sparkles className="h-4 w-4" />
                  {proposalCount > 0 && (
                    <span
                      data-testid="andi-proposal-badge"
                      className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-fw-error px-0.5 text-figma-sm text-white"
                    >
                      {proposalCount > 99 ? '99+' : proposalCount}
                    </span>
                  )}
                </button>
                <SearchBar onSearch={onSearch} />

                {/* State that follows you, as one pair rather than two
                    unrelated circles with a rule between them. */}
                <span className="ml-1 flex items-center gap-0.5">
                  <TasksButton />
                  <NotificationsButton count={notifications} />
                </span>
              </>
            )}

            {/* Outside the width gate: the guided tour is the one artifact
                built to demo this product and must be startable at every
                width, and keeping this mounted across the isMobile flip is
                what stops a mid-tour resize from unmounting ProductTour and
                losing its place. */}
            <UtilityOverflow>
              {!isMobile && <UndoControl />}
              {/* Fires START_TOUR_EVENT; the launcher itself stays mounted
                  below so closing this menu cannot unmount a running tour. */}
              <button
                type="button"
                aria-label="Start guided tour"
                onClick={() => window.dispatchEvent(new Event(START_TOUR_EVENT))}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-figma-sm text-fw-body transition-colors hover:bg-fw-wash"
              >
                <Play className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Start guided tour</span>
              </button>
              <ThemeToggle />
            </UtilityOverflow>

            {/* Mounted at bar level at EVERY width: it owns the running
                tour's state, and the tour is the one artifact built to demo
                this product. */}
            <TourLauncher trigger="none" />

            {!isMenuOpen && !isMobile && <TenantSelector />}
          </div>
        </div>
      </div>

      {/* ⌘K / Ctrl+K command palette — engine-derived, works from anywhere */}
      <CommandPalette />
    </nav>

    {/* Mobile Menu — kept as a sibling of <nav> here for readability, but
        MobileMenu itself portals to document.body (see MobileMenu.tsx), so
        its actual DOM position doesn't depend on where it's mounted in this
        tree. <nav> has backdrop-blur-md, and CSS backdrop-filter establishes
        a containing block for position:fixed descendants, which would clip
        any fixed-position child to the nav's own 64px-tall box instead of
        the viewport — that's what made the old vertical-nav overlay render
        as an empty sliver pinned to the header. The portal is what actually
        prevents that; staying out of <nav> here is just belt-and-suspenders. */}
    <MobileMenu
      isOpen={isMobileMenuOpen}
      onClose={() => setIsMobileMenuOpen(false)}
      userInfo={userInfo}
      notifications={notifications}
    />
    </>
  );
}