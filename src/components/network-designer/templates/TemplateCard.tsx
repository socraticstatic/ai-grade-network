import { Shield, ShieldCheck, Globe } from 'lucide-react';
import type { DesignerTemplate } from '../types/designer';

interface TemplateCardProps {
  template: DesignerTemplate;
  onLoad: (template: DesignerTemplate) => void;
}

const TIER_BADGE: Record<string, { label: string; icon: typeof Shield; color: string; bg: string }> = {
  standard: { label: 'Standard', icon: Shield, color: '#454b52', bg: 'rgba(69,75,82,0.12)' },
  maximum: { label: 'Maximum', icon: ShieldCheck, color: '#0057b8', bg: 'rgba(0,87,184,0.12)' },
  geodiversity: { label: 'Geodiversity', icon: Globe, color: '#2d7e24', bg: 'rgba(45,126,36,0.12)' },
};

export function TemplateCard({ template, onLoad }: TemplateCardProps) {
  const badge = template.tier ? TIER_BADGE[template.tier] : null;

  return (
    <button
      onClick={() => onLoad(template)}
      className="group p-4 cursor-pointer text-left w-full transition-colors duration-150"
    >
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-figma-base font-semibold text-fw-heading group-hover:text-fw-cobalt-600 transition-colors duration-150">{template.name}</h3>
        {badge && (
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium"
            style={{ color: badge.color, backgroundColor: badge.bg }}
          >
            <badge.icon className="h-2.5 w-2.5" />
            {badge.label}
          </span>
        )}
        {template.providerOnly && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-fw-wash text-fw-bodyLight border border-fw-secondary">
            {template.providerOnly}
          </span>
        )}
      </div>
      <p className="text-figma-sm text-fw-bodyLight mb-3 line-clamp-2">{template.description}</p>
      <div className="flex items-center gap-3">
        <span className="text-figma-xs text-fw-bodyLight">{template.nodeCount} nodes</span>
        <span className="text-figma-xs text-fw-bodyLight">{template.edgeCount} edges</span>
      </div>
    </button>
  );
}
