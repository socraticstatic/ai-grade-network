import { useState } from 'react';
import { X, ArrowUp, ArrowDown, AlertTriangle } from 'lucide-react';
import { getBandwidthOptions, formatBandwidth } from '../../../data/lmccService';
import { changeDirection, downgradeChangeFee, estimateMonthlyRate, formatUsd } from '../../../utils/lmccBilling';
import { useStore } from '../../../store/useStore';

/**
 * Direction-aware bandwidth change (GA notes): upgrade and downgrade are NOT one
 * neutral control. Upgrade is penalty-free with no outage; downgrade surfaces the
 * change fee and requires explicit acknowledgment BEFORE confirm. Some changes
 * require an interconnect migration behind the scenes — "could not complete
 * provisioning seamlessly" is a real state, not an exception.
 */

export function BandwidthChangeModal({
  connectionId, currentMbps: currentMbpsProp, onClose,
}: {
  connectionId: string;
  currentMbps: number;
  onClose: () => void;
}) {
  const updateConnection = useStore(s => s.updateConnection);
  const logActivity = useStore(s => s.logActivity);
  // Live source of truth: the store connection's bandwidth (the mock panel data is static).
  const storeBandwidth = useStore(s => s.connections.find(c => c.id === connectionId)?.bandwidth);
  const parsed = String(storeBandwidth ?? '').match(/([\d.]+)\s*(G|M)bps/i);
  const currentMbps = parsed ? (parsed[2].toUpperCase() === 'G' ? parseFloat(parsed[1]) * 1000 : parseFloat(parsed[1])) : currentMbpsProp;
  const [newMbps, setNewMbps] = useState<number>(currentMbps);
  const [acknowledged, setAcknowledged] = useState(false);
  const [working, setWorking] = useState(false);

  const direction = changeDirection(currentMbps, newMbps);
  const fee = direction === 'downgrade' ? downgradeChangeFee(currentMbps, newMbps) : 0;
  const newRate = estimateMonthlyRate(newMbps);
  const requiresMigration = newMbps >= 100000 && direction === 'upgrade';
  const canSubmit = direction !== 'none' && (direction === 'upgrade' || acknowledged) && !working;

  const finish = (ok: boolean) => {
    if (ok) {
      updateConnection(connectionId, { bandwidth: `${formatBandwidth(newMbps)} × 4 paths` } as any);
      logActivity({
        type: 'bandwidth-changed',
        connectionId,
        message: `Bandwidth ${direction}d to ${formatBandwidth(newMbps)}${fee ? ` — change fee ${formatUsd(fee)} applies (from the billing system of record)` : ' — no penalty'}. New rate ${formatUsd(newRate)}/mo.`,
      });
      window.addToast?.({ type: 'success', title: 'Bandwidth changed', message: `Now ${formatBandwidth(newMbps)} on all 4 paths. No outage occurred.`, duration: 4000 });
    } else {
      updateConnection(connectionId, { status: 'Inactive' } as any); // displays as Needs attention for LMCC
      logActivity({
        type: 'security',
        connectionId,
        message: 'Bandwidth change could not complete provisioning seamlessly (interconnect migration). Connection needs attention — AT&T and AWS are coordinating; no action required on your side yet.',
      });
      window.addToast?.({ type: 'error', title: 'Change did not complete', message: 'The connection needs attention. Details on the connection page.', duration: 5000 });
    }
    setWorking(false);
    onClose();
  };

  const submit = (simulateFailure = false) => {
    setWorking(true);
    setTimeout(() => finish(!simulateFailure), 1500);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-fw-heading/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-fw-base border border-fw-secondary shadow-2xl p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em]">Change bandwidth</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-fw-wash text-fw-bodyLight"><X className="h-4 w-4" /></button>
        </div>
        <p className="text-figma-xs text-fw-bodyLight mb-5">
          Bandwidth is the only technical attribute you can change on a live connection. The same rate applies to all 4 paths.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-fw-wash border border-fw-secondary">
            <p className="text-figma-xs text-fw-bodyLight mb-1">Current</p>
            <p className="text-figma-base font-semibold text-fw-heading">{formatBandwidth(currentMbps)}</p>
            <p className="text-figma-xs text-fw-bodyLight">{formatUsd(estimateMonthlyRate(currentMbps))}/mo</p>
          </div>
          <div className="p-3 rounded-lg bg-fw-wash border border-fw-secondary">
            <p className="text-figma-xs text-fw-bodyLight mb-1">New</p>
            <select
              value={newMbps}
              onChange={e => { setNewMbps(Number(e.target.value)); setAcknowledged(false); }}
              className="w-full text-figma-base font-semibold rounded-lg border border-fw-secondary bg-fw-base px-2 py-1 text-fw-heading hover:border-fw-active"
            >
              {getBandwidthOptions().map(mbps => (
                <option key={mbps} value={mbps}>{formatBandwidth(mbps)}</option>
              ))}
            </select>
            <p className="text-figma-xs text-fw-bodyLight mt-1">{formatUsd(newRate)}/mo</p>
          </div>
        </div>

        {direction === 'upgrade' && (
          <p className="flex items-center gap-1.5 text-figma-sm text-fw-success mb-4">
            <ArrowUp className="h-4 w-4" /> Upgrade — no penalty, no outage. Availability confirmed for this metro.
          </p>
        )}

        {direction === 'downgrade' && (
          <div className="mb-4 p-3 rounded-lg bg-fw-warnLight border border-fw-warn/50">
            <p className="flex items-center gap-1.5 text-figma-sm font-medium text-fw-heading mb-1">
              <ArrowDown className="h-4 w-4 text-fw-warn" /> Downgrade — a change fee applies under your contract
            </p>
            <p className="text-figma-sm text-fw-body mb-2">
              Change fee: <span className="font-semibold">{formatUsd(fee)}</span> (from the billing system of record) ·
              new rate {formatUsd(newRate)}/mo.
            </p>
            <label className="flex items-start gap-2 text-figma-xs text-fw-body cursor-pointer">
              <input type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} className="mt-0.5" />
              I understand the {formatUsd(fee)} change fee will be billed with this downgrade.
            </label>
          </div>
        )}

        {requiresMigration && (
          <div className="mb-4 p-3 rounded-lg bg-fw-accent border border-fw-active/30">
            <p className="flex items-start gap-1.5 text-figma-xs text-fw-body">
              <AlertTriangle className="h-3.5 w-3.5 text-fw-link shrink-0 mt-0.5" />
              This change may require moving your connection to a different interconnect behind the
              scenes. Most complete seamlessly; if one cannot, the connection will read
              Needs attention and AT&T coordinates the repair.
              <button onClick={() => submit(true)} className="text-fw-link underline shrink-0">demo: failure</button>
            </p>
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <button onClick={onClose} className="h-9 px-4 rounded-full border border-fw-secondary text-figma-sm text-fw-body hover:border-fw-bodyLight">Cancel</button>
          <button
            disabled={!canSubmit}
            onClick={() => submit(false)}
            className="h-9 px-5 rounded-full bg-fw-primary text-white text-figma-sm font-semibold hover:bg-fw-ctaPrimaryHover disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {working ? 'Applying…' : direction === 'downgrade' ? 'Confirm downgrade' : 'Confirm change'}
          </button>
        </div>
      </div>
    </div>
  );
}
