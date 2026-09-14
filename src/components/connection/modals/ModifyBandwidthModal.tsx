import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, Zap, Check, Loader2 } from 'lucide-react';
import { Connection } from '../../../types';
import { getProviderBandwidth, getProviderBandwidthConfig } from '../../../data/providerBandwidth';
import { useStore } from '../../../store/useStore';

interface ModifyBandwidthModalProps {
  connection: Connection;
  isOpen: boolean;
  onClose: () => void;
}

// Mock cost per Mbps/month
const COST_PER_MBPS = 0.08;

function estimateCost(mbps: number): number {
  return Math.round(mbps * COST_PER_MBPS * 100) / 100;
}

export function ModifyBandwidthModal({ connection, isOpen, onClose }: ModifyBandwidthModalProps) {
  const updateConnection = useStore(state => state.updateConnection);
  const provider = connection.provider || 'AWS';
  const bandwidthOptions = getProviderBandwidth(provider);
  const config = getProviderBandwidthConfig(provider);

  const [selectedBandwidth, setSelectedBandwidth] = useState(connection.bandwidth);
  const [isApplying, setIsApplying] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const isAWS = provider === 'AWS';
  const currentCost = estimateCost(bandwidthOptions.find(o => o.label === connection.bandwidth)?.value || 1000);
  const newCost = estimateCost(bandwidthOptions.find(o => o.label === selectedBandwidth)?.value || 1000);
  const costDiff = newCost - currentCost;
  const hasChanged = selectedBandwidth !== connection.bandwidth;

  const handleApply = async () => {
    setIsApplying(true);
    await new Promise(r => setTimeout(r, 1500));
    updateConnection(connection.id, { bandwidth: selectedBandwidth });
    setIsApplying(false);
    setIsDone(true);
    window.addToast?.({
      type: 'success',
      title: 'Bandwidth Updated',
      message: `Bandwidth changed to ${selectedBandwidth}.`,
      duration: 3000,
    });
    setTimeout(onClose, 800);
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-fw-base rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-fw-secondary">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-fw-link" />
            <h3 className="text-figma-lg font-bold text-fw-heading">Modify Bandwidth</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-fw-wash text-fw-bodyLight">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Current */}
          <div>
            <label className="text-figma-sm font-medium text-fw-bodyLight">Current Bandwidth</label>
            <p className="text-figma-xl font-bold text-fw-heading mt-1">{connection.bandwidth}</p>
            <p className="text-figma-sm text-fw-bodyLight">{config.burstNote}</p>
          </div>

          {/* AWS warning */}
          {isAWS && (
            <div className="flex items-start gap-2 p-3 bg-fw-warn/5 border border-fw-warn/20 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-fw-warn mt-0.5 shrink-0" />
              <p className="text-figma-sm text-fw-warn">
                AWS hosted connections require provisioning new connections at the new speed. Existing connections will be replaced.
              </p>
            </div>
          )}

          {/* New bandwidth */}
          <div>
            <label className="text-figma-sm font-medium text-fw-bodyLight mb-2 block">New Bandwidth</label>
            <select
              value={selectedBandwidth}
              onChange={e => setSelectedBandwidth(e.target.value)}
              disabled={isApplying || isDone}
              className="w-full h-10 px-3 border border-fw-secondary rounded-lg text-figma-base text-fw-heading focus:ring-2 focus:ring-fw-active focus:border-fw-active"
            >
              {bandwidthOptions.map(opt => (
                <option key={opt.value} value={opt.label}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Cost impact */}
          {hasChanged && (
            <div className="p-4 bg-fw-wash rounded-lg border border-fw-secondary">
              <div className="flex items-center justify-between text-figma-sm">
                <span className="text-fw-bodyLight">Current monthly</span>
                <span className="font-medium text-fw-heading">${currentCost.toLocaleString()}/mo</span>
              </div>
              <div className="flex items-center justify-between text-figma-sm mt-1">
                <span className="text-fw-bodyLight">New monthly</span>
                <span className="font-bold text-fw-heading">${newCost.toLocaleString()}/mo</span>
              </div>
              <div className="border-t border-fw-secondary mt-2 pt-2 flex items-center justify-between text-figma-sm">
                <span className="text-fw-bodyLight">Difference</span>
                <span className={`font-bold ${costDiff > 0 ? 'text-fw-error' : 'text-fw-success'}`}>
                  {costDiff > 0 ? '+' : ''}{costDiff.toLocaleString()}/mo
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-fw-secondary">
          <button
            onClick={onClose}
            disabled={isApplying}
            className="px-4 h-9 rounded-full text-figma-base font-medium text-fw-body hover:bg-fw-wash transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={!hasChanged || isApplying || isDone}
            className={`flex items-center gap-2 px-5 h-9 rounded-full text-figma-base font-medium transition-colors ${
              hasChanged && !isApplying && !isDone
                ? 'bg-fw-primary text-white hover:bg-fw-primaryHover'
                : 'bg-fw-neutral text-fw-disabled cursor-not-allowed'
            }`}
          >
            {isDone ? (
              <><Check className="h-4 w-4" /> Done</>
            ) : isApplying ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Applying...</>
            ) : (
              'Apply Change'
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
