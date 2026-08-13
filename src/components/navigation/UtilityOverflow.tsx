import { useEffect, useRef, useState, type ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';

/**
 * The utility bar's overflow.
 *
 * The bar had eight identical 36px circles in a row - Create, Andi, search,
 * undo, share, tour, tasks, notifications, tenant - separated by two
 * hairline rules, three of them carrying red badges. Everything looked
 * equally important, which means nothing did, and the cluster was also what
 * pushed the page into a horizontal scroll on a phone.
 *
 * Only controls a viewer reaches for constantly keep permanent space. The
 * occasional ones (undo an action, copy a replay link, start the tour) live
 * behind one button, where they are still one click away and no longer
 * compete with the primary action for attention.
 */
export function UtilityOverflow({ children, label = 'More actions' }: { children: ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        data-testid="utility-overflow"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="menu"
        title={label}
        onClick={() => setOpen(o => !o)}
        className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
          open ? 'bg-fw-neutral text-fw-heading' : 'text-fw-body hover:bg-fw-wash hover:text-fw-heading'
        }`}
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
      </button>
      {open && (
        <div
          aria-label={label}
          data-testid="utility-overflow-menu"
          onClick={() => setOpen(false)}
          className="absolute right-0 top-11 z-50 flex min-w-[13rem] flex-col gap-0.5 rounded-xl border border-fw-secondary bg-fw-base p-1.5 shadow-lg"
        >
          {children}
        </div>
      )}
    </div>
  );
}
