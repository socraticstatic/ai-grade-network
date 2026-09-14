import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, MapPin } from 'lucide-react';
import { useCloudControl } from '../../engine/react/useCloudControl';

/**
 * The AI Gateway's location, at the top of the AI rail (Figma: "NYC-DC-01").
 *
 * Honest scoping: the demo estate runs ONE gateway — the first fabric site —
 * and every AI figure in the app is that gateway's view. The other sites are
 * listed as what they are: places a gateway could terminate once provisioned,
 * linking into NaaS · Connect. Nothing here pretends to filter figures.
 */
export function GatewaySelector() {
  const sites = useCloudControl(cc => cc.fabricModel().sites);
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

  const gateway = sites[0];
  if (!gateway) return null;

  return (
    <div ref={rootRef} className="relative w-full mb-2">
      <button
        type="button"
        data-testid="gateway-selector"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 rounded-lg border border-fw-secondary bg-fw-wash px-3 py-2 text-figma-sm font-medium text-fw-heading hover:border-fw-active transition-colors"
      >
        <MapPin className="h-4 w-4 text-fw-bodyLight flex-shrink-0" aria-hidden="true" />
        <span className="truncate flex-1 text-left">{gateway.label}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-fw-bodyLight transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div
          role="listbox"
          aria-label="Gateway location"
          className="absolute left-0 right-0 top-full mt-1 rounded-lg border border-fw-secondary bg-fw-base shadow-lg p-1.5"
          style={{ zIndex: 60 }}
        >
          <div
            role="option"
            aria-selected="true"
            className="rounded-md px-2.5 py-2 bg-fw-accent"
          >
            <span className="block text-figma-sm font-medium text-fw-link">{gateway.label}</span>
            <span className="block text-[11px] text-fw-bodyLight">The gateway — every figure on this layer is its view</span>
          </div>
          {sites.slice(1).map(site => (
            <Link
              key={site.id}
              to="/naas/connect"
              role="option"
              aria-selected="false"
              onClick={() => setOpen(false)}
              className="block rounded-md px-2.5 py-2 hover:bg-fw-wash"
            >
              <span className="block text-figma-sm font-medium text-fw-heading">{site.label}</span>
              <span className="block text-[11px] text-fw-bodyLight">No gateway yet · provision in NaaS · Connect</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
