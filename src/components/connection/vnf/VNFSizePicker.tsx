import { VNFSize, VNF_SIZE_TIERS } from '../../../types/vnf';

interface VNFSizePickerProps {
  value: VNFSize | null;
  onChange: (size: VNFSize) => void;
}

export function VNFSizePicker({ value, onChange }: VNFSizePickerProps) {
  const selected = value ? VNF_SIZE_TIERS.find(t => t.id === value) ?? null : null;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {VNF_SIZE_TIERS.map(tier => (
          <button
            key={tier.id}
            type="button"
            aria-pressed={value === tier.id}
            onClick={() => onChange(tier.id)}
            className={`
              flex-1 py-2 rounded-lg border text-figma-base font-medium transition-colors
              ${value === tier.id
                ? 'border-fw-active bg-fw-accent text-fw-linkHover ring-2 ring-fw-active/30'
                : 'border-fw-secondary text-fw-heading hover:border-fw-active hover:bg-fw-wash'
              }
            `}
          >
            {tier.label}
          </button>
        ))}
      </div>

      {selected && (
        <div className="flex items-center gap-3 px-4 py-3 bg-fw-wash border border-fw-secondary rounded-lg text-figma-sm text-fw-body">
          <span>{selected.vcpuRange} vCPU</span>
          <span className="text-fw-bodyLight">·</span>
          <span>{selected.ramRange} RAM</span>
          <span className="text-fw-bodyLight">·</span>
          <span>{selected.storageRange} storage</span>
          <span className="ml-auto font-semibold text-fw-heading">${selected.monthlyPrice}/mo</span>
        </div>
      )}
    </div>
  );
}
