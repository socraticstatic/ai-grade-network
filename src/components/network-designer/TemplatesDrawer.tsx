import { X, Shield, Globe, ShieldCheck } from 'lucide-react';
import type { NetworkNode, NetworkEdge, DesignerTemplate } from './types/designer';
import { DESIGNER_TEMPLATES } from './templates/templateDefinitions';
import { TemplateCard } from './templates/TemplateCard';
import { useDesignerStore } from './store/useDesignerStore';

interface TemplatesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadTemplate: (nodes: NetworkNode[], edges: NetworkEdge[]) => void;
}

const TIER_LABELS: Record<string, { label: string; icon: typeof Shield }> = {
  standard: { label: 'Standard', icon: Shield },
  maximum: { label: 'Maximum', icon: ShieldCheck },
  geodiversity: { label: 'Geodiversity', icon: Globe },
};

export function TemplatesDrawer({ isOpen, onClose, onLoadTemplate }: TemplatesDrawerProps) {
  const resiliencyTier = useDesignerStore(s => s.resiliencyTier);
  const storeProviders = useDesignerStore(s => s.selectedProviders);

  if (!isOpen) return null;

  // Filter templates: show matching tier first, then others. Hide provider-locked templates for wrong provider.
  const filteredTemplates = DESIGNER_TEMPLATES.filter(t => {
    if (t.providerOnly && storeProviders.length > 0 && !storeProviders.includes(t.providerOnly)) return false;
    return true;
  }).sort((a, b) => {
    const aMatch = a.tier === resiliencyTier ? 0 : 1;
    const bMatch = b.tier === resiliencyTier ? 0 : 1;
    return aMatch - bMatch;
  });

  function handleLoad(template: DesignerTemplate) {
    onLoadTemplate(template.nodes, template.edges);
    onClose();
  }

  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 w-80 z-30 bg-fw-base rounded-2xl border border-fw-secondary shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-fw-secondary">
        <div>
          <h2 className="text-figma-base font-semibold text-fw-heading">Templates</h2>
          {resiliencyTier && (
            <p className="text-figma-xs text-fw-bodyLight">Sorted for {TIER_LABELS[resiliencyTier]?.label || resiliencyTier}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-full text-fw-bodyLight hover:bg-fw-wash transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Template grid */}
      <div className="max-h-[480px] overflow-y-auto divide-y divide-fw-secondary/50">
        {filteredTemplates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            onLoad={handleLoad}
          />
        ))}
      </div>
    </div>
  );
}
