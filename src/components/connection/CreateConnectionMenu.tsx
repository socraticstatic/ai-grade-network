import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { ConnectionTypeIcon } from './icons/ConnectionTypeIcon';

interface CreateOption {
  key: string;
  label: string;
  description: string;
  /** Connection type fed to ConnectionTypeIcon (branded glyph). */
  iconType?: string;
  /** Fallback lucide icon when a type has no branded glyph (e.g. VPN). */
  fallbackIcon?: React.ReactNode;
  accent: string; // tailwind bg for the icon tile
  /** Surface color behind the AWS twin-pin overlap, matched to the tile. */
  haloColor?: string;
  state: Record<string, unknown>;
  disabled?: boolean;
}

const TILE_ACCENT = '#e6f6fd'; // fw-accent — light AT&T blue tint

// Launching the guided wizard with a preset connection type (and, for AWS Max, the
// provider + resiliency that make it the Last Mile flow). mode 'step-by-step' skips
// the mode-selection screen and goes straight into the guided wizard.
const OPTIONS: CreateOption[] = [
  {
    key: 'internet',
    label: 'Internet to Cloud',
    description: 'Public internet on-ramp with DDoS protection',
    iconType: 'Internet to Cloud',
    accent: 'bg-fw-accent',
    state: { mode: 'step-by-step', selectedConnectionType: 'Internet to Cloud' },
  },
  {
    key: 'c2c',
    label: 'Cloud to Cloud',
    description: 'Private backbone linking two clouds through one Hub',
    iconType: 'Cloud to Cloud',
    accent: 'bg-fw-accent',
    state: { mode: 'step-by-step', selectedConnectionType: 'Cloud to Cloud' },
  },
  {
    key: 'aws-lastmile',
    label: 'AWS Interconnect – Last Mile',
    description: 'AT&T-managed maximum-resiliency AWS Direct Connect',
    iconType: 'AWS Last Mile',
    accent: 'bg-fw-accent',
    haloColor: TILE_ACCENT,
    state: {
      mode: 'step-by-step',
      selectedConnectionType: 'AWS Last Mile',
      selectedProviders: ['AWS'],
      resiliencyLevel: 'maximum',
    },
  },
  {
    key: 'dc',
    label: 'DataCenter / CoLocation to Cloud',
    description: 'Direct fiber cross-connect from your data center',
    iconType: 'DataCenter/CoLocation to Cloud',
    accent: 'bg-fw-accent',
    state: { mode: 'step-by-step', selectedConnectionType: 'DataCenter/CoLocation to Cloud' },
  },
  {
    key: 'vpn',
    label: 'VPN to Cloud',
    description: 'Encrypted IPSec / IKEv2 tunnel over the internet',
    iconType: 'VPN to Cloud',
    accent: 'bg-fw-accent',
    state: { mode: 'step-by-step', selectedConnectionType: 'VPN to Cloud' },
  },
  {
    key: 'site',
    label: 'Site to Cloud',
    description: 'Branch / SD-WAN connectivity — coming soon',
    iconType: 'Site to Cloud',
    accent: 'bg-fw-wash',
    state: {},
    disabled: true,
  },
];

export function CreateConnectionMenu() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const choose = (opt: CreateOption) => {
    if (opt.disabled) return;
    setOpen(false);
    navigate('/create', { state: opt.state });
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-2 h-10 px-6 rounded-full bg-fw-primary text-white text-figma-base font-medium shadow-sm hover:bg-fw-primaryHover transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-fw-active focus-visible:ring-offset-2"
      >
        <PlusCircle className="h-4 w-4" />
        Create Connection
        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-[400px] max-w-[calc(100vw-2rem)] origin-top-right rounded-2xl border border-fw-secondary bg-fw-base shadow-2xl ring-1 ring-black/5 p-2 animate-in fade-in zoom-in-95 duration-150"
        >
          <p className="px-3 pt-1.5 pb-2 mb-1 border-b border-fw-secondary/70 text-figma-xs font-semibold uppercase tracking-[0.08em] text-fw-bodyLight">
            Choose a connection type
          </p>
          {OPTIONS.map(opt => (
            <button
              key={opt.key}
              role="menuitem"
              type="button"
              disabled={opt.disabled}
              onClick={() => choose(opt)}
              className={`group w-full flex items-center gap-3.5 rounded-xl px-3 py-2.5 text-left transition-colors ${
                opt.disabled
                  ? 'opacity-55 cursor-not-allowed'
                  : 'hover:bg-fw-wash focus:bg-fw-wash focus:outline-none'
              }`}
            >
              <span
                className={`shrink-0 h-12 w-12 rounded-xl flex items-center justify-center transition-all duration-200 ${
                  opt.disabled
                    ? 'bg-fw-wash text-fw-bodyLight ring-1 ring-fw-secondary'
                    : 'bg-gradient-to-br from-brand-lightBlue to-fw-accent text-fw-link ring-1 ring-fw-active/15 group-hover:ring-fw-active/40 group-hover:shadow-sm group-hover:scale-[1.04]'
                }`}
              >
                {opt.iconType ? (
                  <ConnectionTypeIcon type={opt.iconType} size={30} haloColor={opt.haloColor} />
                ) : (
                  opt.fallbackIcon
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="text-figma-sm font-semibold text-fw-heading">{opt.label}</span>
                  {opt.disabled && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-fw-secondary text-fw-bodyLight">
                      Soon
                    </span>
                  )}
                </span>
                <span className="block text-figma-xs text-fw-bodyLight leading-snug mt-0.5">{opt.description}</span>
              </span>
              {!opt.disabled && (
                <ChevronRight className="shrink-0 h-4 w-4 text-fw-bodyLight opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-fw-link" />
              )}
            </button>
          ))}

          <div className="mt-1 border-t border-fw-secondary/70 px-3 pt-2.5 pb-1">
            <button
              type="button"
              onClick={() => { setOpen(false); navigate('/create'); }}
              className="inline-flex items-center gap-1 text-figma-xs font-medium text-fw-link hover:gap-1.5 transition-all focus:outline-none"
            >
              Not sure which to pick? Open the guided wizard
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
