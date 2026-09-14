import { useState } from 'react';
import { Hash, AlertCircle, CheckCircle2, Pencil } from 'lucide-react';
import { isValidAwsAccountId, formatBandwidth, LMCC_METROS_GA } from '../../../data/lmccService';
import { AttIcon } from '../../icons/AttIcon';

interface AwsAccountIdStepProps {
  value: string;
  onChange: (v: string) => void;
  connectionName: string;
  onNameChange: (name: string) => void;
  metroName?: string;
  awsRegionLabel?: string;
  bandwidth?: number;
  // GA props
  isGa?: boolean;
  selectedMetroId?: string;
  onMetroChange?: (id: string) => void;
  onBandwidthChange?: (mbps: number) => void;
}

const AUTO_CHIPS = ['BGP ASN', 'VLAN IDs', '/30 Subnets', 'MTU', 'MACsec (GA)'];

// GA bandwidth tiers come from the service layer — never hardcoded (Design Brief rule).
import { getBandwidthOptions } from '../../../data/lmccService';
const GA_BANDWIDTH_MBPS = getBandwidthOptions('ga');

export function AwsAccountIdStep({
  value,
  onChange,
  connectionName,
  onNameChange,
  metroName = 'San Jose, CA',
  awsRegionLabel = 'US West (N. California)',
  bandwidth = 1000,
  isGa = false,
  selectedMetroId = 'metro-sj',
  onMetroChange,
  onBandwidthChange,
}: AwsAccountIdStepProps) {
  const isValid = isValidAwsAccountId(value);
  const hasInput = value.length > 0;
  const [editingName, setEditingName] = useState(false);

  // GA: resolve current metro from LMCC_METROS_GA
  const currentMetro = isGa
    ? (LMCC_METROS_GA.find(m => m.id === selectedMetroId) ?? LMCC_METROS_GA[0])
    : null;

  return (
    <div className="w-full space-y-7">

      {/* ── Editable connection name ── */}
      <div>
        <p className="text-figma-xs font-semibold text-fw-bodyLight uppercase tracking-[0.08em] mb-2">
          Connection name
        </p>
        {editingName ? (
          <input
            autoFocus
            value={connectionName}
            onChange={e => onNameChange(e.target.value)}
            onBlur={() => setEditingName(false)}
            onKeyDown={e => e.key === 'Enter' && setEditingName(false)}
            className="text-figma-2xl font-bold text-fw-heading tracking-[-0.04em] bg-transparent border-b-2 border-fw-active focus:outline-none pb-0.5 leading-tight w-full max-w-lg"
          />
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className="group/name flex items-center gap-3 text-left"
          >
            <h2 className="text-figma-2xl font-bold text-fw-heading tracking-[-0.04em] leading-tight">
              {connectionName || 'NetBond Max - San Jose'}
            </h2>
            <Pencil className="w-4 h-4 text-fw-bodyLight opacity-0 group-hover/name:opacity-100 transition-opacity shrink-0" />
          </button>
        )}
        <p className="text-figma-xs text-fw-bodyLight mt-1">Click the name to edit it</p>
      </div>

      {/* ── Equal two-column bento ── */}
      <div key={isGa ? 'ga' : 'preview'} className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">

        {/* Left bento: Preview = locked / GA = interactive */}
        <div className="animate-card-in rounded-2xl border border-fw-secondary bg-fw-wash overflow-hidden flex flex-col" style={{ animationDelay: '0ms' }}>
          <div className="px-5 py-3.5 border-b border-fw-secondary">
            <p className="text-figma-xs font-semibold text-fw-bodyLight uppercase tracking-[0.08em]">
              {isGa ? 'Finish your order' : 'Included in your order'}
            </p>
          </div>
          <div className="flex-1 divide-y divide-fw-secondary">
            {isGa ? (
              <>
                {/* Metro selector */}
                <div className="flex items-start gap-3 px-5 py-4">
                  <AttIcon name="cable" className="w-7 h-7 text-fw-link shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-figma-xs text-fw-bodyLight mb-1.5">Metro</p>
                    <div className="flex flex-wrap gap-1.5">
                      {LMCC_METROS_GA.map(metro => (
                        <button
                          key={metro.id}
                          onClick={() => onMetroChange?.(metro.id)}
                          className={`px-3 py-1.5 rounded-full text-figma-xs font-semibold transition-all ${
                            selectedMetroId === metro.id
                              ? 'bg-fw-active text-white'
                              : 'bg-fw-base border border-fw-secondary text-fw-body hover:border-fw-active/50'
                          }`}
                        >
                          {metro.name}
                        </button>
                      ))}
                    </div>
                    <p className="text-figma-xs text-fw-bodyLight mt-1.5">
                      {currentMetro?.awsRegionLabel}
                    </p>
                  </div>
                </div>

                {/* Bandwidth selector */}
                <div className="flex items-start gap-3 px-5 py-4">
                  <AttIcon name="high-meter" className="w-7 h-7 text-fw-link shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-figma-xs text-fw-bodyLight mb-1.5">Bandwidth</p>
                    <div className="flex flex-wrap gap-1.5">
                      {GA_BANDWIDTH_MBPS.map(mbps => (
                        <button
                          key={mbps}
                          onClick={() => onBandwidthChange?.(mbps)}
                          className={`px-3 py-1.5 rounded-full text-figma-xs font-semibold transition-all ${
                            bandwidth === mbps
                              ? 'bg-fw-active text-white'
                              : 'bg-fw-base border border-fw-secondary text-fw-body hover:border-fw-active/50'
                          }`}
                        >
                          {formatBandwidth(mbps)}
                        </button>
                      ))}
                    </div>
                    <p className="text-figma-xs text-fw-bodyLight mt-1.5">
                      {formatBandwidth(bandwidth)} × 4 paths · {formatBandwidth(bandwidth * 4)} aggregate
                    </p>
                  </div>
                </div>

                {/* Resiliency - locked */}
                <div className="flex items-start gap-3 px-5 py-4">
                  <AttIcon name="check-shield" className="w-7 h-7 text-fw-link shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-figma-xs text-fw-bodyLight">Resiliency</p>
                    <p className="text-figma-sm font-semibold text-fw-heading leading-snug">Maximum</p>
                    <p className="text-figma-xs text-fw-bodyLight">2 AT&T sites · 4 channels</p>
                  </div>
                  <CheckCircle2 className="shrink-0 w-4 h-4 text-fw-link ml-auto mt-0.5" />
                </div>

                {/* Connection - locked */}
                <div className="flex items-start gap-3 px-5 py-4">
                  <AttIcon name="cloud" className="w-7 h-7 text-fw-link shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-figma-xs text-fw-bodyLight">Connection</p>
                    <p className="text-figma-sm font-semibold text-fw-heading leading-snug">Internet to Cloud</p>
                    <p className="text-figma-xs text-fw-bodyLight">No VPN · No VIF config</p>
                  </div>
                  <CheckCircle2 className="shrink-0 w-4 h-4 text-fw-link ml-auto mt-0.5" />
                </div>
              </>
            ) : (
              // Preview: Metro + Bandwidth as disabled pill previews; Resiliency + Connection locked
              <>
                {/* Metro - disabled pills teasing GA */}
                <div className="flex items-start gap-3 px-5 py-4">
                  <AttIcon name="cable" className="w-7 h-7 text-fw-link shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-figma-xs text-fw-bodyLight mb-1.5">Metro</p>
                    <div className="flex flex-wrap gap-1.5">
                      {LMCC_METROS_GA.map(metro => (
                        <span
                          key={metro.id}
                          className={`px-3 py-1.5 rounded-full text-figma-xs font-semibold select-none cursor-not-allowed ${
                            metro.id === 'metro-sj'
                              ? 'bg-fw-cobalt-100 border border-fw-active/30 text-fw-link'
                              : 'bg-fw-wash border border-fw-secondary text-fw-bodyLight opacity-40'
                          }`}
                        >
                          {metro.name}
                        </span>
                      ))}
                    </div>
                    <p className="text-figma-xs text-fw-bodyLight mt-1.5">
                      US West (N. California) · <span className="text-fw-link font-medium">More metros unlock at GA · Nov 2026</span>
                    </p>
                  </div>
                </div>

                {/* Bandwidth - disabled pills teasing GA */}
                <div className="flex items-start gap-3 px-5 py-4">
                  <AttIcon name="high-meter" className="w-7 h-7 text-fw-link shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-figma-xs text-fw-bodyLight mb-1.5">Bandwidth</p>
                    <div className="flex flex-wrap gap-1.5">
                      {GA_BANDWIDTH_MBPS.map(mbps => (
                        <span
                          key={mbps}
                          className={`px-3 py-1.5 rounded-full text-figma-xs font-semibold select-none cursor-not-allowed ${
                            mbps === 1000
                              ? 'bg-fw-cobalt-100 border border-fw-active/30 text-fw-link'
                              : 'bg-fw-wash border border-fw-secondary text-fw-bodyLight opacity-40'
                          }`}
                        >
                          {formatBandwidth(mbps)}
                        </span>
                      ))}
                    </div>
                    <p className="text-figma-xs text-fw-bodyLight mt-1.5">
                      1 Gbps × 4 paths · 4 Gbps aggregate · <span className="text-fw-link font-medium">More speeds at GA · Nov 2026</span>
                    </p>
                  </div>
                </div>

                {/* Resiliency - locked */}
                <div className="flex items-start gap-3 px-5 py-4">
                  <AttIcon name="check-shield" className="w-7 h-7 text-fw-link shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-figma-xs text-fw-bodyLight">Resiliency</p>
                    <p className="text-figma-sm font-semibold text-fw-heading leading-snug">Maximum</p>
                    <p className="text-figma-xs text-fw-bodyLight">2 AT&T sites · 4 channels</p>
                  </div>
                  <CheckCircle2 className="shrink-0 w-4 h-4 text-fw-link ml-auto mt-0.5" />
                </div>

                {/* Connection - locked */}
                <div className="flex items-start gap-3 px-5 py-4">
                  <AttIcon name="cloud" className="w-7 h-7 text-fw-link shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-figma-xs text-fw-bodyLight">Connection</p>
                    <p className="text-figma-sm font-semibold text-fw-heading leading-snug">Internet to Cloud</p>
                    <p className="text-figma-xs text-fw-bodyLight">No VPN · No VIF config</p>
                  </div>
                  <CheckCircle2 className="shrink-0 w-4 h-4 text-fw-link ml-auto mt-0.5" />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right bento: AWS Account ID */}
        <div className="animate-card-in rounded-2xl border border-fw-secondary bg-fw-base overflow-hidden flex flex-col" style={{ animationDelay: '80ms' }}>
          <div className="px-5 py-3.5 border-b border-fw-secondary">
            <p className="text-figma-xs font-semibold text-fw-bodyLight uppercase tracking-[0.08em]">
              {isGa ? 'Your AWS account' : 'Your one input'}
            </p>
          </div>
          <div className="flex-1 p-5 flex flex-col gap-5 justify-between">

            {/* Input */}
            <div>
              <label className="block text-figma-lg font-bold text-fw-heading mb-1 tracking-[-0.02em]">
                AWS Account ID
              </label>
              <p className="text-figma-sm text-fw-bodyLight mb-3">
                AWS Console → account name (top-right) → Account settings
              </p>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Hash className="w-4 h-4 text-fw-bodyLight" />
                </div>
                <input
                  type="text"
                  value={value}
                  onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 12))}
                  placeholder="123456789012"
                  maxLength={12}
                  className={`w-full h-14 pl-10 pr-4 rounded-2xl border-2 text-figma-lg font-mono tracking-wider focus:outline-none transition-all ${
                    hasInput && !isValid
                      ? 'border-fw-error bg-red-50 focus:border-fw-error'
                      : hasInput && isValid
                        ? 'border-fw-active bg-fw-cobalt-100/40'
                        : 'border-fw-secondary bg-fw-base focus:border-fw-active focus:bg-fw-cobalt-100/20'
                  }`}
                />
                {hasInput && isValid && (
                  <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-fw-link" />
                )}
                {hasInput && !isValid && (
                  <AlertCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-fw-error" />
                )}
              </div>
              <div className="h-5 mt-1.5">
                {hasInput && !isValid && (
                  <p className="text-figma-xs text-fw-error flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Must be exactly 12 digits
                  </p>
                )}
                {hasInput && isValid && (
                  <p className="text-figma-xs text-fw-link font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Valid. Ready to activate.
                  </p>
                )}
              </div>
            </div>

            {/* Auto-config chips */}
            <div className="p-4 rounded-xl bg-fw-wash border border-fw-secondary">
              <p className="text-figma-xs font-semibold text-fw-heading mb-2">
                AT&T configures everything else automatically
              </p>
              <div className="flex flex-wrap gap-1.5">
                {AUTO_CHIPS.map(chip => (
                  <span
                    key={chip}
                    className="px-2.5 py-1 rounded-full bg-fw-cobalt-100 border border-fw-active/20 text-figma-xs font-medium text-fw-link"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>

            {/* Note */}
            <p className="text-figma-xs text-fw-bodyLight leading-relaxed">
              AT&T generates an Activation Key tied to this account. Valid for <strong className="text-fw-body font-semibold">7 days</strong>. Take it to AWS Interconnect Console to link your order. BGP, VLANs, IPs, and MTU are negotiated automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
