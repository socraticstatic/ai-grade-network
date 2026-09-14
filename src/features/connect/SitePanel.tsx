import { Router, Radio, Cable } from 'lucide-react';
import type { FabricModel } from './FabricHero';

/* ------------------------------------------------------------------ *
 * Site panel — the selected on-prem site: its first-mile transport onto the
 * fabric and its dual-homing status. Sites are the ingress side of the fabric;
 * everything they carry rides the private AT&T mid-mile.
 * ------------------------------------------------------------------ */

interface SitePanelProps {
  siteId: string;
  model: FabricModel;
}

export function SitePanel({ siteId, model }: SitePanelProps) {
  const site = model.sites.find(s => s.id === siteId);
  if (!site) return null;
  const [name, place] = site.label.split(' · ');
  const isInternet = !site.firstMile;
  // Dual-homing: a site is dual-homed when more than one on-ramp/PoP can carry
  // it onto the fabric. In the seed each first-mile lands one PoP; the DC (ADI)
  // and HQ (AVPN) sites reach the Ashburn PoP pair, so they read dual-homed.
  const dualHomed = /ADI|AVPN/.test(site.firstMile ?? '');

  return (
    <section aria-label={site.label} className="rounded-2xl border border-fw-secondary bg-fw-base p-5 space-y-4">
      <header className="flex items-center gap-3">
        <span className="flex items-center justify-center h-10 w-10 rounded-full bg-fw-ctaPrimary/[0.08] text-fw-link shrink-0">
          {isInternet ? <Radio size={18} /> : <Router size={18} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-fw-heading leading-tight">{name}</div>
          <div className="text-figma-xs text-fw-bodyLight leading-tight">{place ?? 'Ingress site'}</div>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-fw-secondary bg-fw-wash p-3">
          <div className="flex items-center gap-1.5 text-figma-xs text-fw-bodyLight"><Cable size={13} /> First-mile</div>
          <div className="mt-1.5 text-figma-base font-semibold text-fw-heading">
            {site.firstMile ?? 'Public internet'}
          </div>
          <div className="mt-0.5 text-[11px] text-fw-bodyLight">
            {isInternet ? 'Breakout to the public internet' : 'Transport onto the AT&T fabric'}
          </div>
        </div>
        <div className="rounded-xl border border-fw-secondary bg-fw-wash p-3">
          <div className="text-figma-xs text-fw-bodyLight">Dual-homing</div>
          <div className="mt-1.5">
            <span className={`inline-flex items-center h-6 px-2.5 rounded-full text-figma-xs font-medium ${
              dualHomed ? 'bg-fw-successLight text-fw-success' : 'bg-fw-neutral text-fw-bodyLight'
            }`}>{dualHomed ? 'Dual-homed' : 'Single-homed'}</span>
          </div>
          <div className="mt-1 text-[11px] text-fw-bodyLight">
            {dualHomed ? 'Two diverse PoPs onto the fabric' : 'One PoP — single ingress path'}
          </div>
        </div>
      </div>
    </section>
  );
}
