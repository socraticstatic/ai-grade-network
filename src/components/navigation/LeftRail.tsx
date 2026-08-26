import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Check, ChevronDown, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { AttIcon } from '../icons/AttIcon';
import { NAV_LAYERS, isNavRouteActive, layerForPath, railSectionsFor, type NavLayer } from './navItems';
import { GatewaySelector } from './GatewaySelector';

/**
 * The rail header's layer switcher: pick the layer from the left nav itself,
 * mirroring the top tabs (same destinations — each layer's Home). The AI
 * Gateway design reserves this header slot for a selector; in a multi-layer
 * portal the layer is the thing worth switching here.
 */
function LayerSwitcher({ layer }: { layer: NavLayer }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        type="button"
        data-testid="rail-layer-switcher"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 pl-3 pr-1 h-7 rounded-lg text-figma-sm font-semibold uppercase tracking-[0.1em] text-fw-bodyLight hover:bg-fw-wash hover:text-fw-body transition-colors max-w-full"
      >
        <span className="truncate">{layer.label}</span>
        <ChevronDown className={`h-3 w-3 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Switch layer"
          className="absolute left-0 top-full mt-1 w-52 rounded-lg border border-fw-secondary bg-fw-base shadow-lg p-1.5"
          style={{ zIndex: 60 }}
        >
          {NAV_LAYERS.map(l => (
            <Link
              key={l.key}
              to={l.home.to}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={`flex items-start justify-between gap-2 rounded-md px-2.5 py-2 ${l.key === layer.key ? 'bg-fw-accent' : 'hover:bg-fw-wash'}`}
            >
              <span className="min-w-0">
                <span className={`block text-figma-sm font-medium tracking-[-0.02em] ${l.key === layer.key ? 'text-fw-link' : 'text-fw-heading'}`}>
                  {l.label}
                </span>
                <span className="block text-figma-sm text-fw-bodyLight">{l.tagline}</span>
              </span>
              {l.key === layer.key && <Check className="h-4 w-4 flex-shrink-0 mt-0.5 text-fw-link" aria-hidden="true" />}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * The lifecycle rail: the verbs of the layer you are in, down the left edge,
 * Home first. It is the busy axis — a session crosses Home → Connect → Govern
 * → Observe → Cost far more than it crosses layers — so it gets the cheap
 * control: persistent, one click, no menu.
 *
 * Collapsible to icons only (persisted): the rail shrinks to a 56px strip of
 * glyphs with tooltips, handing its width back to the content. Renders only on
 * a layer route (/naas/*, /ai/*); the global estate view (/discover) carries
 * no rail. Desktop only — the mobile drawer carries the same items.
 */

const COLLAPSE_KEY = 'cc-rail-collapsed';

export function LeftRail() {
  const { pathname } = useLocation();
  const layer = layerForPath(pathname);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0'); } catch { /* private mode */ }
  }, [collapsed]);

  if (!layer) return null;

  return (
    <nav
      aria-label={`${layer.label} sections`}
      data-testid="left-rail"
      data-collapsed={collapsed ? 'true' : 'false'}
      className={`hidden min-[1024px]:flex flex-col flex-shrink-0 border-r border-fw-secondary bg-fw-base min-h-full py-4 px-3 transition-[width] duration-200 ${collapsed ? 'w-14 items-center' : 'w-56'}`}
    >
      {/* Rail header: the layer switcher (hidden when collapsed) and the
          collapse toggle. The layer is selectable from the rail itself,
          mirroring the top tabs. */}
      <div className={`flex items-center h-7 mb-2 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && <LayerSwitcher layer={layer} />}
        <button
          type="button"
          data-testid="rail-collapse-toggle"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed(c => !c)}
          className="flex items-center justify-center h-7 w-7 rounded-lg text-fw-bodyLight hover:bg-fw-wash hover:text-fw-body transition-colors"
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* The AI layer is scoped to a gateway location (Figma: NYC-DC-01). */}
      {layer.key === 'ai' && !collapsed && <GatewaySelector />}

      {railSectionsFor(layer).map((section, si) => (
        <div key={section.title ?? si} className="w-full">
          {section.title && !collapsed && (
            <p className="px-3 pt-4 pb-1 text-figma-sm font-semibold uppercase tracking-[0.1em] text-fw-bodyLight">
              {section.title}
            </p>
          )}
          {section.title && collapsed && (
            <div className="mx-2 my-2 border-t border-fw-secondary" aria-hidden="true" />
          )}
          <ul className="w-full space-y-0.5">
            {section.items.map(item => {
              const active = isNavRouteActive(pathname, item.to);
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    data-testid={`rail-${item.to.split('/').pop()}`}
                    aria-current={active ? 'page' : undefined}
                    title={collapsed ? item.label : undefined}
                    className={`
                      flex items-center rounded-lg text-figma-sm font-medium transition-colors
                      ${collapsed ? 'justify-center h-10 w-10 mx-auto' : 'gap-3 px-3 py-2.5'}
                      ${active
                        ? 'bg-fw-accent text-fw-link'
                        : 'text-fw-body hover:bg-fw-wash hover:text-fw-heading'}
                    `}
                  >
                    <AttIcon
                      name={item.icon}
                      className={`h-[18px] w-[18px] flex-shrink-0 ${active ? 'text-fw-link' : 'text-fw-bodyLight'}`}
                    />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
