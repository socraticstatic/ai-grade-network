import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

export interface TabItem {
  id: string;
  label: string;
  icon?: ReactNode;
  active?: boolean;
  disabled?: boolean;
}

interface OverflowTabsProps {
  items: TabItem[];
  onSelect: (id: string) => void;
}

// `no-rounded` is required: a global rule pill-rounds every <button> except those in a
// <nav> or carrying this class. These tabs aren't in a <nav>, so without it the selected
// tab renders as a rounded pillbox instead of a flat underline.
const tabClass = (active?: boolean, disabled?: boolean) =>
  `no-rounded flex items-center gap-2 whitespace-nowrap py-3 px-4 border-b-2 text-figma-base font-medium tracking-[-0.03em] transition-colors ${
    disabled
      ? 'border-transparent text-fw-disabled cursor-not-allowed opacity-40'
      : active
        ? 'border-fw-active text-fw-link'
        : 'border-transparent text-fw-heading hover:text-fw-body'
  }`;

/**
 * Horizontal tab bar that NEVER wraps and NEVER shows a scrollbar. Tabs that fit render
 * inline; any that don't collapse into a "More ▾" dropdown. The count is measured from a
 * hidden full-width ghost row and recomputed on resize.
 */
export function OverflowTabs({ items, onSelect }: OverflowTabsProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(items.length);
  const [menuOpen, setMenuOpen] = useState(false);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const ghost = ghostRef.current;
    if (!wrap || !ghost) return;
    const compute = () => {
      const avail = wrap.clientWidth;
      const tabEls = Array.from(ghost.querySelectorAll<HTMLElement>('[data-ghost-tab]'));
      const moreW = (ghost.querySelector<HTMLElement>('[data-ghost-more]')?.offsetWidth ?? 96) + 4;
      const total = tabEls.reduce((s, e) => s + e.offsetWidth, 0);
      if (total <= avail) {
        setVisibleCount(items.length);
        return;
      }
      let used = 0;
      let count = 0;
      for (const e of tabEls) {
        if (used + e.offsetWidth + moreW > avail) break;
        used += e.offsetWidth;
        count++;
      }
      setVisibleCount(Math.max(1, count));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [items]);

  // Close the menu on outside click / Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onEsc);
    };
  }, [menuOpen]);

  const visible = items.slice(0, visibleCount);
  const overflow = items.slice(visibleCount);
  const activeInOverflow = overflow.find((t) => t.active);

  return (
    <div ref={wrapRef} className="relative -mb-px flex items-center w-full overflow-hidden">
      {/* Hidden ghost row at full width — used only to measure each tab's natural width. */}
      <div ref={ghostRef} aria-hidden className="absolute -top-[9999px] left-0 flex items-center pointer-events-none">
        {items.map((t) => (
          <span key={t.id} data-ghost-tab className={tabClass(t.active, t.disabled)}>
            {t.icon && <span>{t.icon}</span>}
            {t.label}
          </span>
        ))}
        <span data-ghost-more className="flex items-center gap-1 whitespace-nowrap py-3 px-3 text-figma-base font-medium">
          More <ChevronDown className="h-4 w-4" />
        </span>
      </div>

      {/* Visible tabs */}
      {visible.map((t) => (
        <button
          key={t.id}
          onClick={() => !t.disabled && onSelect(t.id)}
          disabled={t.disabled}
          className={tabClass(t.active, t.disabled)}
        >
          {t.icon && <span className={t.disabled ? 'text-fw-disabled' : t.active ? 'text-fw-link' : 'text-fw-heading'}>{t.icon}</span>}
          {t.label}
        </button>
      ))}

      {/* Overflow menu */}
      {overflow.length > 0 && (
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className={`no-rounded flex items-center gap-1 whitespace-nowrap py-3 px-3 border-b-2 text-figma-base font-medium tracking-[-0.03em] transition-colors ${
              activeInOverflow ? 'border-fw-active text-fw-link' : 'border-transparent text-fw-heading hover:text-fw-body'
            }`}
          >
            {activeInOverflow ? activeInOverflow.label : 'More'}
            <ChevronDown className={`h-4 w-4 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full z-50 mt-1 min-w-[180px] rounded-xl border border-fw-secondary bg-fw-base shadow-2xl ring-1 ring-black/5 p-1.5 animate-in fade-in zoom-in-95 duration-150"
            >
              {overflow.map((t) => (
                <button
                  key={t.id}
                  role="menuitem"
                  disabled={t.disabled}
                  onClick={() => {
                    if (t.disabled) return;
                    onSelect(t.id);
                    setMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-figma-sm font-medium transition-colors ${
                    t.disabled
                      ? 'text-fw-disabled cursor-not-allowed opacity-50'
                      : t.active
                        ? 'bg-fw-wash text-fw-link'
                        : 'text-fw-heading hover:bg-fw-wash'
                  }`}
                >
                  {t.icon && <span className={t.active ? 'text-fw-link' : 'text-fw-bodyLight'}>{t.icon}</span>}
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
