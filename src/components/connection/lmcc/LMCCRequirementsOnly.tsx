import { useState } from 'react';
import { ArrowRight, Key, AlertCircle, ExternalLink, ChevronLeft, CheckCircle2, Shield, Link as LinkIcon, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../common/Button';
import { LMCCKeyUploadError } from '../../../types/lmcc';

interface LMCCRequirementsOnlyProps {
  isOpen: boolean;
  onClose: () => void;
  onStartSetup: (activationKey: string) => void;
  onBuildForMe: () => void;
  demoKey?: string;
}

interface ErrorDef {
  title: string;
  body: string;
  action?: string;
  linkToConnections?: boolean;
}

const ERROR_MESSAGES: Record<LMCCKeyUploadError, ErrorDef> = {
  'invalid-format': {
    title: 'Invalid key format',
    body: "Check that you copied the complete key from AWS. Keys begin with 'ey' — they are base64-encoded.",
  },
  'not-recognised': {
    title: 'Key not recognised',
    body: 'AWS could not validate this key. It may have been cancelled or generated for a different provider. Return to the AWS Interconnect Console and generate a new key.',
    action: 'Open AWS Interconnect – last mile',
  },
  'already-used': {
    title: 'Key already used',
    body: 'This key has already activated a connection. If you expect it to be active, check your connections list. If you need a new connection, return to the AWS portal and generate a new key.',
    linkToConnections: true,
  },
  'expired': {
    title: 'Key expired',
    body: 'ActivationKeys are valid for 7 days. This key has expired. Return to the AWS Interconnect Console and generate a new key.',
    action: 'Open AWS Interconnect – last mile',
  },
  'wrong-account': {
    title: 'Account mismatch',
    body: 'This key was generated for a different AWS account. Confirm you are signed in to the correct account, or return to AWS and generate a new key.',
  },
};

const METRO_MAP: Record<string, string> = {
  'metro-sj': 'San Jose, CA',
  'metro-ashburn': 'Ashburn, VA',
  'metro-la': 'Los Angeles, CA',
};

interface DecodedKey {
  sharedConnectionUuid?: string;
  connectionSizeMbps?: number;
  destinationAccountId?: string;
  destinationEnvironmentUri?: string;
  version?: number;
}

function tryDecodeKey(key: string): DecodedKey | null {
  try {
    const parsed = JSON.parse(atob(key.trim()));
    if (typeof parsed === 'object' && parsed !== null) return parsed as DecodedKey;
    return null;
  } catch {
    return null;
  }
}

function metroFromUri(uri?: string): string {
  if (!uri) return 'Unknown';
  const match = uri.match(/environments\/([^/]+)$/);
  return match ? (METRO_MAP[match[1]] ?? match[1]) : uri;
}

function formatMbps(mbps?: number): string {
  if (!mbps) return 'Unknown';
  return mbps >= 1000 ? `${mbps / 1000} Gbps` : `${mbps} Mbps`;
}

type Stage = 'choice' | 'paste' | 'confirm' | 'error';

// Demo error triggers: paste these strings to test full-screen error states
const DEMO_ERRORS: Record<string, LMCCKeyUploadError> = {
  'error:unrecognised': 'not-recognised',
  'error:used': 'already-used',
  'error:expired': 'expired',
  'error:wrong-account': 'wrong-account',
};

export function LMCCRequirementsOnly({ isOpen, onClose, onStartSetup, onBuildForMe, demoKey }: LMCCRequirementsOnlyProps) {
  const [activationKey, setActivationKey] = useState(demoKey ?? '');
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [keyError, setKeyError] = useState<LMCCKeyUploadError | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>('choice');
  const [decodedKey, setDecodedKey] = useState<DecodedKey | null>(null);

  if (!isOpen) return null;

  function reset() {
    setActivationKey(demoKey ?? '');
    setInlineError(null);
    setKeyError(null);
    setExpiresAt(null);
    setStage('choice');
    setDecodedKey(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleBuildForMe() {
    reset();
    onBuildForMe();
  }

  function handleKeyChange(value: string) {
    setActivationKey(value);
    setInlineError(null);
  }

  function handlePasteSubmit() {
    const trimmed = activationKey.trim();

    // Demo error triggers
    const demoError = DEMO_ERRORS[trimmed.toLowerCase()];
    if (demoError) {
      setKeyError(demoError);
      if (demoError === 'expired') {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        setExpiresAt(d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }));
      }
      setStage('error');
      return;
    }

    const decoded = tryDecodeKey(trimmed);
    if (!decoded || !decoded.sharedConnectionUuid) {
      // Invalid format — inline error only
      setInlineError("Check that you copied the complete key from AWS. The key should start with 'ey'.");
      return;
    }

    setDecodedKey(decoded);
    setStage('confirm');
  }

  function handleConfirm() {
    onStartSetup(activationKey.trim());
  }

  function handleBack() {
    setStage('paste');
    setDecodedKey(null);
    setKeyError(null);
    setExpiresAt(null);
  }

  const errorDef = keyError ? ERROR_MESSAGES[keyError] : null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
      onClick={handleClose}
    >
      <div
        className="bg-fw-base rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header — hidden on choice screen, which has its own layout */}
        {stage !== 'choice' && (
          <div className="px-6 py-5 bg-fw-wash border-b border-fw-secondary">
            <div className="flex items-center gap-3">
              <div className="w-12 h-8 rounded-lg bg-fw-base border border-fw-secondary flex items-center justify-center p-1">
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg"
                  alt="AWS"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h2 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em]">
                  {stage === 'paste' && 'Upload Activation Key'}
                  {stage === 'confirm' && 'Confirm Connection Details'}
                  {stage === 'error' && 'Cannot Activate Connection'}
                </h2>
                <p className="text-figma-xs text-fw-bodyLight">AT&T AI-grade network — Maximum Resiliency</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Stage: Choice ── */}
        {stage === 'choice' && (
          <div className="px-8 pt-8 pb-7">

            {/* Brand header */}
            <div className="mb-7">
              <p className="text-figma-xs font-bold uppercase tracking-[0.1em] text-fw-link mb-2">
                Introducing
              </p>
              <h2 className="text-figma-2xl font-bold text-fw-heading tracking-[-0.04em] leading-tight">
                AT&T AI-grade network
              </h2>
              <p className="text-figma-sm text-fw-bodyLight mt-2 max-w-md leading-relaxed">
                A dedicated, private connection between your network and AWS — provisioned automatically across 4 independent paths. One input. No configuration required.
              </p>
            </div>

            {/* Two action cards */}
            <div className="grid grid-cols-2 gap-4 mb-6">

              {/* I Have a Max Key — primary: cobalt tint, active border */}
              <button
                onClick={() => setStage('paste')}
                className="group text-left p-5 rounded-2xl border-2 border-fw-active/30 bg-fw-cobalt-100/20 hover:border-fw-active hover:bg-fw-cobalt-100/40 transition-all duration-200"
              >
                <div className="w-9 h-9 rounded-xl bg-fw-cobalt-100 border border-fw-active/20 flex items-center justify-center mb-4">
                  <Key className="w-5 h-5 text-fw-link" />
                </div>
                <p className="text-figma-base font-bold text-fw-heading leading-snug mb-1.5">
                  I Have a Max Key
                </p>
                <p className="text-figma-xs text-fw-bodyLight leading-relaxed">
                  You set it up in AWS. Paste your ActivationKey here to finish.
                </p>
                <div className="flex items-center gap-1 mt-4 text-figma-xs font-semibold text-fw-link">
                  Paste key <ArrowRight className="w-3 h-3" />
                </div>
              </button>

              {/* Build it for me — secondary: wash, neutral border */}
              <button
                onClick={handleBuildForMe}
                className="group text-left p-5 rounded-2xl border-2 border-fw-secondary bg-fw-wash hover:border-fw-active/40 hover:bg-fw-base transition-all duration-200"
              >
                <div className="w-9 h-9 rounded-xl bg-fw-wash border border-fw-secondary flex items-center justify-center mb-4">
                  <Zap className="w-5 h-5 text-fw-bodyLight group-hover:text-fw-link transition-colors" />
                </div>
                <p className="text-figma-base font-bold text-fw-heading leading-snug mb-1.5">
                  Build it for me
                </p>
                <p className="text-figma-xs text-fw-bodyLight leading-relaxed">
                  Start from scratch. AT&T guides you through and generates the key.
                </p>
                <div className="flex items-center gap-1 mt-4 text-figma-xs font-semibold text-fw-bodyLight group-hover:text-fw-link transition-colors">
                  Start wizard <ArrowRight className="w-3 h-3" />
                </div>
              </button>
            </div>

            {/* Not Now — subordinate text link */}
            <div className="text-center">
              <button
                onClick={handleClose}
                className="text-figma-sm text-fw-bodyLight hover:text-fw-body font-medium transition-colors"
              >
                Not Now
              </button>
            </div>
          </div>
        )}

        {/* ── Stage: Paste key ── */}
        {stage === 'paste' && (
          <>
            <div className="px-6 py-4 border-b border-fw-secondary">
              <p className="text-figma-sm text-fw-body">
                You started from the AWS portal and received an ActivationKey. Paste it here — AT&T will validate it with AWS and begin provisioning automatically.
              </p>
              <a
                href="https://console.aws.amazon.com/directconnect/v2/home"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-2 text-figma-xs text-fw-link hover:text-fw-linkHover"
              >
                Don't have a key yet? Go to AWS Interconnect – last mile
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-figma-xs font-medium text-fw-body mb-1">
                  ActivationKey from AWS
                </label>
                <p className="text-figma-xs text-fw-bodyLight mb-1.5">Valid for 7 days from generation. If yours has expired, return to AWS Interconnect – last mile and generate a new one.</p>
                <textarea
                  value={activationKey}
                  onChange={e => handleKeyChange(e.target.value)}
                  placeholder="Paste your ActivationKey here — starts with 'ey'..."
                  rows={3}
                  className={`w-full px-3 py-2.5 rounded-lg border text-figma-xs font-mono focus:outline-none resize-none transition-colors ${
                    inlineError
                      ? 'border-fw-error bg-fw-errorLight focus:border-fw-error'
                      : 'border-fw-secondary focus:border-fw-active'
                  }`}
                />
                {inlineError && (
                  <div className="flex items-start gap-2 mt-2">
                    <AlertCircle className="h-3.5 w-3.5 text-fw-error shrink-0 mt-0.5" />
                    <p className="text-figma-xs text-fw-error">{inlineError}</p>
                  </div>
                )}
              </div>

              <div className="p-3 rounded-lg bg-fw-accent border border-fw-active/20">
                <p className="text-figma-sm font-semibold text-fw-heading mb-1.5">What happens after you submit</p>
                <ol className="text-figma-sm text-fw-body space-y-1 list-decimal list-inside">
                  <li>AT&T validates your key with AWS</li>
                  <li>AT&T and AWS automatically negotiate connection parameters</li>
                  <li>BGP sessions come up across all 4 paths</li>
                  <li>You receive an email + portal notification when live</li>
                </ol>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-fw-secondary bg-fw-wash flex items-center justify-between">
              <button
                onClick={() => setStage('choice')}
                className="flex items-center gap-1.5 text-figma-base font-medium text-fw-bodyLight hover:text-fw-body"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
              <Button
                variant="primary"
                size="sm"
                onClick={handlePasteSubmit}
                disabled={activationKey.trim().length <= 3}
              >
                <Key className="w-4 h-4 mr-1" />
                Next — Review Details
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </>
        )}

        {/* ── Stage: Confirm decoded connection details ── */}
        {stage === 'confirm' && decodedKey && (
          <>
            <div className="px-6 py-4 border-b border-fw-secondary">
              <p className="text-figma-sm text-fw-body">
                AT&T decoded your key. Confirm these are the connection details you intended before activating.
              </p>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="p-4 rounded-xl bg-fw-wash border border-fw-secondary">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="h-4 w-4 text-fw-link" />
                  <span className="text-figma-sm font-semibold text-fw-heading">Decoded Connection Details</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-figma-sm">
                  <div>
                    <span className="text-fw-bodyLight">Location</span>
                    <p className="font-semibold text-fw-heading mt-0.5">{metroFromUri(decodedKey.destinationEnvironmentUri)}</p>
                  </div>
                  <div>
                    <span className="text-fw-bodyLight">Bandwidth</span>
                    <p className="font-semibold text-fw-heading mt-0.5">{formatMbps(decodedKey.connectionSizeMbps)} × 4 paths</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-fw-bodyLight">Business Center Account ID</span>
                    <p className="font-semibold text-fw-heading mt-0.5">BC-200145782</p>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-fw-accent border border-fw-active/20">
                <p className="text-figma-xs text-fw-body">
                  If any of these details look wrong, go back and check the key you copied from AWS Interconnect – last mile.
                </p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-fw-secondary bg-fw-wash flex items-center justify-between">
              <button
                onClick={handleBack}
                className="flex items-center gap-1.5 text-figma-base font-medium text-fw-bodyLight hover:text-fw-body"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirm}
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Confirm & Activate
              </Button>
            </div>
          </>
        )}

        {/* ── Stage: Full-screen error ── */}
        {stage === 'error' && errorDef && keyError && (
          <>
            <div className="px-6 py-10 flex flex-col items-center text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-fw-errorLight flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-fw-error" />
              </div>
              <div className="max-w-sm">
                <h3 className="text-figma-lg font-bold text-fw-heading mb-2">{errorDef.title}</h3>
                <p className="text-figma-sm text-fw-body leading-relaxed">{errorDef.body}</p>
                {keyError === 'expired' && expiresAt && (
                  <p className="mt-3 text-figma-xs text-fw-bodyLight">
                    Key expiry: <span className="font-mono font-semibold text-fw-heading">{expiresAt}</span>
                  </p>
                )}
              </div>

              <div className="flex flex-col items-center gap-3 w-full max-w-xs">
                {errorDef.action && (
                  <a
                    href="https://console.aws.amazon.com/directconnect/v2/home"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-full bg-fw-primary text-white text-figma-sm font-semibold hover:bg-fw-linkHover transition-colors"
                  >
                    {errorDef.action}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                {errorDef.linkToConnections && (
                  <Link
                    to="/connections"
                    onClick={handleClose}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-full bg-fw-primary text-white text-figma-sm font-semibold hover:bg-fw-linkHover transition-colors"
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    View your connections
                  </Link>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-fw-secondary bg-fw-wash flex items-center justify-between">
              <button
                onClick={handleBack}
                className="flex items-center gap-1.5 text-figma-base font-medium text-fw-bodyLight hover:text-fw-body"
              >
                <ChevronLeft className="w-4 h-4" />
                Try a different key
              </button>
              <button
                onClick={handleClose}
                className="text-figma-base font-medium text-fw-bodyLight hover:text-fw-body"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
