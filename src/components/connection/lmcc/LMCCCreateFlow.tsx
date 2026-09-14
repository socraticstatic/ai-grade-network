import { useState, useEffect, useRef } from 'react';
import { Copy, Check, ArrowRight, MapPin, Zap, Hash, AlertCircle, ExternalLink, Key, Info } from 'lucide-react';
import { Button } from '../../common/Button';
import {
  LMCCFlow03Intent,
  LMCCActivationKey,
} from '../../../types/lmcc';
import {
  getAvailableMetros,
  getBandwidthOptions,
  formatBandwidth,
  isValidAwsAccountId,
  CURRENT_PHASE,
} from '../../../data/lmccService';

interface LMCCCreateFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onKeyGenerated?: (key: LMCCActivationKey) => void;
}

type Step = 'location' | 'bandwidth' | 'account' | 'confirm' | 'key-ready';

const STEPS: Step[] = ['location', 'bandwidth', 'account', 'confirm'];

function generateMockKey(intent: LMCCFlow03Intent): LMCCActivationKey {
  const uuid = `lmcc-${Math.random().toString(36).slice(2, 10)}`;
  const payload = {
    sharedConnectionUuid: uuid,
    connectionSizeMbps: intent.bandwidthMbps,
    destinationAccountId: intent.awsAccountId,
    destinationEnvironmentUri: `att://environments/${intent.metroId}`,
    version: 1,
  };
  const raw = btoa(JSON.stringify(payload));
  const now = new Date();
  const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return {
    raw,
    sharedConnectionUuid: uuid,
    connectionSizeMbps: intent.bandwidthMbps,
    destinationAccountId: intent.awsAccountId,
    destinationEnvironmentUri: `att://environments/${intent.metroId}`,
    expiresAt: expires.toISOString(),
    generatedAt: now.toISOString(),
  };
}

export function LMCCCreateFlow({ isOpen, onClose, onKeyGenerated }: LMCCCreateFlowProps) {
  const [step, setStep] = useState<Step>('location');
  const [intent, setIntent] = useState<Partial<LMCCFlow03Intent>>({});
  const [generatedKey, setGeneratedKey] = useState<LMCCActivationKey | null>(null);
  const [copied, setCopied] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Scroll content to top on every step change
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [step]);

  const availableMetros = getAvailableMetros(CURRENT_PHASE);
  const bandwidthOptions = getBandwidthOptions(CURRENT_PHASE);
  const selectedMetro = availableMetros.find(m => m.id === intent.metroId);
  const stepIndex = STEPS.indexOf(step);

  if (!isOpen) return null;

  function handleConfirm() {
    if (!intent.metroId || !intent.bandwidthMbps || !intent.awsAccountId) return;
    const key = generateMockKey(intent as LMCCFlow03Intent);
    setGeneratedKey(key);
    setStep('key-ready');
    onKeyGenerated?.(key);
  }

  function handleCopy() {
    if (!generatedKey) return;
    navigator.clipboard.writeText(generatedKey.raw);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleClose() {
    setStep('location');
    setIntent({});
    setGeneratedKey(null);
    onClose();
  }

  const canAdvance =
    (step === 'location' && !!intent.metroId) ||
    (step === 'bandwidth' && !!intent.bandwidthMbps) ||
    (step === 'account' && isValidAwsAccountId(intent.awsAccountId ?? '')) ||
    (step === 'confirm');

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
      onClick={handleClose}
    >
      <div
        className="bg-fw-base rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 bg-fw-wash border-b border-fw-secondary">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-fw-primary/10 border border-fw-primary/20 flex items-center justify-center">
              <Key className="w-5 h-5 text-fw-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em]">New AWS Connection</h2>
                <span className="relative group inline-flex items-center cursor-help">
                  <Info className="h-3.5 w-3.5 text-fw-bodyLight" />
                  <span className="absolute left-0 top-full mt-1.5 whitespace-nowrap px-2 py-1 rounded-md bg-fw-heading text-fw-base text-figma-xs font-semibold hidden group-hover:block z-50 shadow-lg">
                    <span className="absolute left-2 -top-1 w-2 h-2 rotate-45 bg-fw-heading" />
                    Feature Name Pending!
                  </span>
                </span>
              </div>
              <p className="text-figma-xs text-fw-bodyLight">AT&T AI-grade network — generate key to take to AWS</p>
            </div>
          </div>

          {step !== 'key-ready' && (
            <div className="flex items-center gap-1 mt-4">
              {STEPS.map((s, i) => (
                <div key={s} className="flex-1">
                  <div className={`h-1 rounded-full transition-colors ${i <= stepIndex ? 'bg-fw-primary' : 'bg-fw-secondary'}`} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Scrollable body — resets to top on every step change */}
        <div ref={bodyRef} className="overflow-y-auto max-h-[70vh]">

        {/* Step: Location */}
        {step === 'location' && (
          <div className="px-6 py-5 space-y-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-fw-link" />
              <h3 className="text-figma-base font-semibold text-fw-heading">Select Location</h3>
              <span className="text-figma-xs text-fw-bodyLight">(from live API)</span>
            </div>
            <p className="text-figma-xs text-fw-body">
              Choose the metro where your connection will be established. AT&T infrastructure connects directly to AWS at this location.
            </p>
            <div className="space-y-2">
              {availableMetros.map(metro => (
                <button
                  key={metro.id}
                  onClick={() => setIntent(prev => ({ ...prev, metroId: metro.id }))}
                  className={`w-full p-4 border-2 rounded-xl text-left transition-all ${
                    intent.metroId === metro.id
                      ? 'border-fw-active bg-fw-accent'
                      : 'border-fw-secondary hover:border-fw-active/50 bg-fw-base'
                  }`}
                >
                  <p className="text-figma-sm font-semibold text-fw-heading">{metro.name}</p>
                  <p className="text-figma-xs text-fw-bodyLight mt-0.5">{metro.awsRegionLabel}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Bandwidth */}
        {step === 'bandwidth' && (
          <div className="px-6 py-5 space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-fw-link" />
              <h3 className="text-figma-base font-semibold text-fw-heading">Select Bandwidth</h3>
              <span className="text-figma-xs text-fw-bodyLight">(from live API)</span>
            </div>
            <p className="text-figma-xs text-fw-body">
              Bandwidth applies to all 4 connection paths equally. AT&T provisions 4 independent paths at this speed for maximum resiliency.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {bandwidthOptions.map(mbps => (
                <button
                  key={mbps}
                  onClick={() => setIntent(prev => ({ ...prev, bandwidthMbps: mbps }))}
                  className={`p-4 border-2 rounded-xl text-left transition-all ${
                    intent.bandwidthMbps === mbps
                      ? 'border-fw-active bg-fw-accent'
                      : 'border-fw-secondary hover:border-fw-active/50 bg-fw-base'
                  }`}
                >
                  <p className="text-figma-lg font-bold text-fw-heading">{formatBandwidth(mbps)}</p>
                  <p className="text-figma-xs text-fw-bodyLight">per path × 4</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: AWS Account ID */}
        {step === 'account' && (
          <div className="px-6 py-5 space-y-4">
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-fw-link" />
              <h3 className="text-figma-base font-semibold text-fw-heading">AWS Account ID</h3>
            </div>
            <p className="text-figma-xs text-fw-body">
              Enter the 12-digit AWS account ID this connection will serve. Find it in AWS Console under Account settings.
            </p>
            <div>
              <label className="block text-figma-xs font-medium text-fw-body mb-1.5">AWS Account ID</label>
              <input
                type="text"
                value={intent.awsAccountId ?? ''}
                onChange={e => setIntent(prev => ({ ...prev, awsAccountId: e.target.value.replace(/\D/g, '').slice(0, 12) }))}
                placeholder="123456789012"
                maxLength={12}
                className={`w-full h-10 px-3 rounded-lg border text-figma-base font-mono focus:outline-none ${
                  intent.awsAccountId && !isValidAwsAccountId(intent.awsAccountId)
                    ? 'border-fw-error bg-fw-errorLight focus:border-fw-error'
                    : 'border-fw-secondary focus:border-fw-active'
                }`}
              />
              {intent.awsAccountId && !isValidAwsAccountId(intent.awsAccountId) && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-fw-error" />
                  <p className="text-figma-xs text-fw-error">Must be exactly 12 digits</p>
                </div>
              )}
              {intent.awsAccountId && isValidAwsAccountId(intent.awsAccountId) && (
                <p className="text-figma-xs text-fw-link mt-1.5">Valid AWS account ID</p>
              )}
            </div>
          </div>
        )}

        {/* Step: Confirm */}
        {step === 'confirm' && (
          <div className="px-6 py-5 space-y-4">
            <h3 className="text-figma-base font-semibold text-fw-heading">Confirm & Generate Key</h3>
            <p className="text-figma-xs text-fw-body">
              Review your selections. On confirm, AT&T creates a pending connection record and generates your ActivationKey. Billing does not start until the connection is Live; an unused key simply expires after 7 days.
            </p>
            <div className="p-4 rounded-xl bg-fw-wash border border-fw-secondary space-y-2.5 text-figma-xs">
              <div className="flex justify-between">
                <span className="text-fw-bodyLight">Location</span>
                <span className="font-semibold text-fw-heading">{selectedMetro?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-fw-bodyLight">Bandwidth (per path × 4)</span>
                <span className="font-semibold text-fw-heading">{formatBandwidth(intent.bandwidthMbps ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-fw-bodyLight">AWS Account ID</span>
                <span className="font-semibold text-fw-heading font-mono">{intent.awsAccountId}</span>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-fw-accent border border-fw-active/20">
              <AlertCircle className="h-4 w-4 text-fw-link shrink-0 mt-0.5" />
              <p className="text-figma-xs text-fw-body">
                After generating your key, carry it to the AWS portal and submit it there. The key is valid for 7 days. AT&T waits — nothing else happens until AWS picks up the key.
              </p>
            </div>
          </div>
        )}

        {/* Step: Key Ready */}
        {step === 'key-ready' && generatedKey && (
          <div className="px-6 py-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-fw-cobalt-100 flex items-center justify-center">
                <Check className="w-4 h-4 text-fw-link" />
              </div>
              <h3 className="text-figma-base font-semibold text-fw-heading">Key Generated — Take to AWS</h3>
            </div>

            <div className="p-4 rounded-xl bg-fw-wash border border-fw-secondary space-y-3">
              <div>
                <p className="text-figma-xs font-medium text-fw-body mb-1.5">Your ActivationKey</p>
                <div className="flex items-start gap-2">
                  <code className="flex-1 min-w-0 text-figma-xs font-mono text-fw-heading bg-fw-base border border-fw-secondary rounded-lg p-2 break-all leading-relaxed">
                    {generatedKey.raw}
                  </code>
                  <button
                    onClick={handleCopy}
                    className={`shrink-0 p-2 rounded-lg border transition-all ${
                      copied
                        ? 'border-fw-active bg-fw-cobalt-100 text-fw-link'
                        : 'border-fw-secondary hover:border-fw-active text-fw-bodyLight hover:text-fw-heading'
                    }`}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-figma-xs">
                <div>
                  <span className="text-fw-bodyLight">Expires</span>
                  <p className="font-medium text-fw-heading">
                    {new Date(generatedKey.expiresAt).toLocaleDateString()} (7 days)
                  </p>
                </div>
                <div>
                  <span className="text-fw-bodyLight">Connection ID</span>
                  <p className="font-medium text-fw-heading font-mono">{generatedKey.sharedConnectionUuid}</p>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-fw-accent border border-fw-active/20 space-y-1.5">
              <p className="text-figma-xs font-semibold text-fw-heading">Next: take this key to AWS Interconnect Console</p>
              <ol className="text-figma-xs text-fw-body space-y-1 list-decimal list-inside">
                <li>Copy the key above</li>
                <li>Open AWS Interconnect Console → Connections</li>
                <li>You'll see 4 pending AT&T hosted connections — accept each one individually</li>
                <li>Paste the key when prompted for each connection</li>
                <li>Once 3 or more of 4 are accepted, AT&T begins BGP provisioning automatically</li>
              </ol>
            </div>

            <a
              href="https://console.aws.amazon.com/directconnect/v2/home"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-fw-active text-white rounded-xl hover:bg-fw-linkHover transition-colors font-medium text-figma-xs"
            >
              Open AWS Interconnect Console
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        </div>{/* end scrollable body */}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-fw-secondary bg-fw-wash flex items-center justify-between">
          {step === 'key-ready' ? (
            <div className="w-full flex justify-end">
              <Button variant="outline" size="sm" onClick={handleClose}>Done — Track Status</Button>
            </div>
          ) : (
            <>
              <button
                onClick={stepIndex > 0 ? () => setStep(STEPS[stepIndex - 1]) : handleClose}
                className="text-figma-base font-medium text-fw-bodyLight hover:text-fw-body"
              >
                {stepIndex === 0 ? 'Cancel' : 'Back'}
              </button>
              {step === 'confirm' ? (
                <Button variant="primary" size="sm" onClick={handleConfirm}>
                  <Key className="w-4 h-4 mr-1" />
                  Generate Key
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setStep(STEPS[stepIndex + 1])}
                  disabled={!canAdvance}
                >
                  Next <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
