import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';
import { NAV_LAYERS } from './navItems';
import { usePermissions } from '../../hooks/usePermission';

/**
 * The one place a verb outranks the layers: Create as a global ACTION.
 * Verbs work as commands, not as addresses — so this menu lists every
 * creatable thing across the stack, each entry naming its layer, and lands
 * on that layer's Connect page, where creation actually starts.
 */
const CREATABLES = [
  { label: 'Connection', detail: 'Attach a cloud or site to the fabric', layerKey: 'naas' as const, to: '/naas/connect' },
  { label: 'Model endpoint', detail: 'Attach a model endpoint or neocloud', layerKey: 'ai' as const, to: '/ai/providers' },
];

export function CreateMenu() {
  const location = useLocation();
  const { canCreate } = usePermissions();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setOpen(false); }, [location.pathname]);

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

  if (!canCreate) return null;

  const layerLabel = (key: 'naas' | 'ai') => NAV_LAYERS.find(l => l.key === key)?.label ?? key;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-figma-sm font-medium bg-fw-ctaPrimary text-white hover:bg-fw-ctaPrimaryHover transition-colors whitespace-nowrap"
      >
        <PlusCircle className="h-4 w-4" aria-hidden="true" />
        Create
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Create"
          className="absolute right-0 top-full mt-2 w-72 rounded-lg border border-fw-secondary bg-fw-base shadow-lg p-1.5"
          style={{ zIndex: 60 }}
        >
          {CREATABLES.map(c => (
            <Link
              key={c.to}
              to={c.to}
              role="menuitem"
              className="flex items-baseline justify-between gap-3 rounded-md px-3 py-2.5 hover:bg-fw-wash focus-visible:bg-fw-wash"
            >
              <span className="min-w-0">
                <span className="block text-figma-base font-medium text-fw-heading tracking-[-0.02em]">{c.label}</span>
                <span className="block text-figma-sm text-fw-bodyLight">{c.detail}</span>
              </span>
              <span className="flex-shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-fw-bodyLight">
                {layerLabel(c.layerKey)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
