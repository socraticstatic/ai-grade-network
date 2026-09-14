import { useState, useEffect, MutableRefObject } from 'react';
import {
  CheckCircle2, AlertCircle, Clipboard, ExternalLink, XCircle, Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../../store/useStore';
import { getMetroById } from '../../../data/lmccService';
import { estimateMonthlyRate, formatUsd } from '../../../utils/lmccBilling';

// ── Types ──────────────────────────────────────────────────────────────────────

export type PasteStage = 'paste' | 'confirm';

interface DecodedKey {
  sharedConnectionUuid?: string;
  connectionSizeMbps?: number;
  destinationAccountId?: string;
  destinationEnvironmentUri?: string;
  peerSubnet?: string;
  expiredAt?: string;
  version?: number;
  /** Mock-only: routes the confirm step into a specific PRD error state. */
  demoError?: 'not-recognized' | 'already-used' | 'wrong-account';
}

type KeyErrorState = null | 'invalid' | 'expired' | 'not-recognized' | 'already-used' | 'wrong-account';
/** PRD treatment: invalid is inline on the field; everything else is full-screen. */
const FULL_SCREEN_ERRORS: KeyErrorState[] = ['expired', 'not-recognized', 'already-used', 'wrong-account'];

// ── Helpers ────────────────────────────────────────────────────────────────────

function tryDecodeKey(key: string): DecodedKey | null {
  try {
    const parsed = JSON.parse(atob(key.trim()));
    if (typeof parsed === 'object' && parsed !== null) return parsed as DecodedKey;
    return null;
  } catch {
    return null;
  }
}

function isExpiredKey(decoded: DecodedKey): boolean {
  if (!decoded.expiredAt) return false;
  return new Date(decoded.expiredAt) < new Date();
}

// Valid key with subnet
const DEMO_KEY =
  'eyJzaGFyZWRDb25uZWN0aW9uVXVpZCI6ImxlZ2FjeS1sb2NhbC10ZXN0LTAwMSIsImNvbm5lY3Rpb25TaXplTWJwcyI6MTAwMCwiZGVzdGluYXRpb25BY2NvdW50SWQiOiI5NDM3NjI4ODAzMTUiLCJkZXN0aW5hdGlvbkVudmlyb25tZW50VXJpIjoiYXR0L2Vudmlyb25tZW50cy9tZXRyby1zaiIsInBlZXJTdWJuZXQiOiIxNjkuMjU0LjEwMC4wLzMwIiwidmVyc2lvbiI6MX0=';

// Expired key for demo error state
const DEMO_EXPIRED_KEY =
  'eyJzaGFyZWRDb25uZWN0aW9uVXVpZCI6ImxlZ2FjeS1sb2NhbC10ZXN0LTAwMSIsImNvbm5lY3Rpb25TaXplTWJwcyI6MTAwMCwiZGVzdGluYXRpb25BY2NvdW50SWQiOiI5NDM3NjI4ODAzMTUiLCJkZXN0aW5hdGlvbkVudmlyb25tZW50VXJpIjoiYXR0L2Vudmlyb25tZW50cy9tZXRyby1zaiIsInBlZXJTdWJuZXQiOiIxNjkuMjU0LjEwMC4wLzMwIiwidmVyc2lvbiI6MSwiZXhwaXJlZEF0IjoiMjAyNi0wNS0xNVQwMDowMDowMFoifQ==';

const DEMO_BC_ACCOUNT_ID = 'BC-200145782';

const demoErrorKey = (demoError: string) => btoa(JSON.stringify({
  sharedConnectionUuid: `demo-${demoError}`,
  connectionSizeMbps: 1000,
  destinationAccountId: '943762880315',
  destinationEnvironmentUri: 'att/environments/metro-sj',
  peerSubnet: '169.254.100.0/30',
  version: 1,
  demoError,
}));
const DEMO_NOT_RECOGNIZED_KEY = demoErrorKey('not-recognized');
const DEMO_ALREADY_USED_KEY = demoErrorKey('already-used');
const DEMO_WRONG_ACCOUNT_KEY = demoErrorKey('wrong-account');

// ── Error Panel — shown inline when key is invalid or expired ──────────────────

function KeyErrorPanel({
  errorState,
  onDismiss,
}: {
  errorState: Exclude<KeyErrorState, null>;
  onDismiss: () => void;
}) {
  const isExpired = errorState === 'expired';
  return (
    <div className={`rounded-2xl border-2 p-5 mb-5 ${
      isExpired ? 'border-amber-300 bg-amber-50' : 'border-fw-error/40 bg-fw-errorLight/30'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
          isExpired ? 'bg-amber-100' : 'bg-fw-errorLight'
        }`}>
          {isExpired
            ? <Clock className="h-5 w-5 text-amber-600" />
            : <XCircle className="h-5 w-5 text-fw-error" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`text-figma-base font-bold mb-1 ${
            isExpired ? 'text-amber-800' : 'text-fw-error'
          }`}>
            {isExpired ? 'Activation Key Expired' : 'Invalid Activation Key'}
          </h3>
          <p className="text-figma-sm text-fw-body leading-relaxed">
            {isExpired
              ? 'This key expired on May 15, 2026. Activation keys are valid for 7 days from the time they are generated in AWS.'
              : 'This key could not be decoded. Make sure you copied the complete key from the AWS Direct Connect console — it begins with "ey" and is several hundred characters long.'
            }
          </p>
          {isExpired && (
            <p className="text-figma-sm text-fw-body mt-2 leading-relaxed">
              To reconnect, generate a new connection in the AWS Management Console and paste the new Activation Key.
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center justify-end gap-3 mt-4">
        <button
          onClick={onDismiss}
          className="h-9 px-5 rounded-full border border-fw-secondary bg-fw-base text-figma-sm font-semibold text-fw-body hover:border-fw-bodyLight hover:text-fw-heading transition-colors"
        >
          Try again
        </button>
        {isExpired && (
          <a
            href="https://console.aws.amazon.com/directconnect"
            target="_blank"
            rel="noopener noreferrer"
            className="h-9 px-5 rounded-full bg-fw-primary text-white text-figma-sm font-semibold hover:bg-fw-ctaPrimaryHover transition-colors inline-flex items-center gap-1.5"
          >
            Open AWS Console
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}

// ── Full-screen errors (PRD: everything except invalid-key gets the full treatment) ──

const FULL_SCREEN_COPY: Record<string, { title: string; body: string; action: string }> = {
  'expired': {
    title: 'This activation key has expired',
    body: 'Activation keys are valid for 7 days from creation. Nothing was set up and nothing is billed — return to the AWS console (or this portal) and generate a new key.',
    action: 'The old key cannot be reused.',
  },
  'not-recognized': {
    title: 'AWS did not recognize this key',
    body: 'AT&T asked AWS to confirm the key and AWS reported it is not valid. The key may have been cancelled. Return to the AWS portal and generate a new key.',
    action: 'This event has been recorded in your activity history.',
  },
  'already-used': {
    title: 'This key was already used',
    body: 'Each activation key works exactly once. If the connection was already created, you will find it in your connections list. If not, raise a support request.',
    action: 'Nothing new was created.',
  },
  'wrong-account': {
    title: 'This key belongs to a different account',
    body: 'The AWS account named in the key does not match the account you are signed in with. Confirm you are using the correct AWS account, or regenerate the key for the right one.',
    action: 'For security, the account in the key is not displayed.',
  },
};

function FullScreenKeyError({
  errorState, expiredAt, onStartOver, onGoToConnections,
}: {
  errorState: Exclude<KeyErrorState, null | 'invalid'>;
  expiredAt?: string;
  onStartOver: () => void;
  onGoToConnections: () => void;
}) {
  const copy = FULL_SCREEN_COPY[errorState];
  const isExpired = errorState === 'expired';
  return (
    <div className="max-w-4xl mx-auto w-full py-10 text-center">
      <div className={`mx-auto mb-5 h-14 w-14 rounded-full flex items-center justify-center ${
        isExpired ? 'bg-amber-100' : 'bg-fw-errorLight'
      }`}>
        {isExpired ? <Clock className="h-7 w-7 text-amber-600" /> : <XCircle className="h-7 w-7 text-fw-error" />}
      </div>
      <h2 className="text-figma-2xl font-bold text-fw-heading tracking-[-0.03em] mb-3">{copy.title}</h2>
      <p className="text-figma-base text-fw-body leading-relaxed max-w-xl mx-auto mb-2">{copy.body}</p>
      {isExpired && expiredAt && (
        <p className="text-figma-sm text-fw-bodyLight mb-2">
          Expired {new Date(expiredAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
        </p>
      )}
      <p className="text-figma-sm text-fw-bodyLight mb-8">{copy.action}</p>
      <div className="flex items-center justify-center gap-3">
        {errorState === 'already-used' ? (
          <>
            <button onClick={onGoToConnections}
              className="h-10 px-6 rounded-full bg-fw-primary text-white text-figma-sm font-semibold hover:bg-fw-ctaPrimaryHover transition-colors">
              Find it in Connections
            </button>
            <button onClick={onStartOver}
              className="h-10 px-6 rounded-full border border-fw-secondary text-figma-sm font-semibold text-fw-body hover:border-fw-bodyLight transition-colors">
              Create a new connection
            </button>
          </>
        ) : (
          <>
            <a href="https://console.aws.amazon.com/directconnect" target="_blank" rel="noopener noreferrer"
              className="h-10 px-6 rounded-full bg-fw-primary text-white text-figma-sm font-semibold hover:bg-fw-ctaPrimaryHover transition-colors inline-flex items-center gap-1.5">
              Open AWS Console <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <button onClick={onStartOver}
              className="h-10 px-6 rounded-full border border-fw-secondary text-figma-sm font-semibold text-fw-body hover:border-fw-bodyLight transition-colors">
              Start over
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Panel: Paste ───────────────────────────────────────────────────────────────

function PastePanel({
  activationKey, hasInput, isFullyValid, hasDecodeError,
  inlineError, justValidated, keyErrorState,
  onKeyChange, onPasteFromClipboard, onUseDemoKey, onUseDemoExpiredKey, onUseDemoErrorKey, onDismissError,
}: {
  activationKey: string;
  hasInput: boolean;
  isFullyValid: boolean;
  hasDecodeError: boolean;
  inlineError: string | null;
  justValidated: boolean;
  keyErrorState: KeyErrorState;
  onKeyChange: (v: string) => void;
  onPasteFromClipboard: () => void;
  onUseDemoKey: () => void;
  onUseDemoExpiredKey: () => void;
  onUseDemoErrorKey: (kind: 'not-recognized' | 'already-used' | 'wrong-account') => void;
  onDismissError: () => void;
}) {
  return (
    <div>
      {/* Header */}
      <div className="pb-6">
        <div className="flex items-center gap-3 mb-3">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg"
            alt="AWS"
            className="h-8 w-auto"
          />
          <h2 className="text-figma-2xl font-bold text-fw-heading tracking-[-0.04em] leading-tight">
            Paste your Activation Key
          </h2>
        </div>
        <p className="text-figma-sm text-fw-body leading-relaxed max-w-lg">
          Paste the Activation Key from the AWS Direct Connect console. Keys expire after 7 days.
        </p>
      </div>

      {/* Error panel — shown when key is invalid or expired */}
      {keyErrorState && (
        <KeyErrorPanel errorState={keyErrorState} onDismiss={onDismissError} />
      )}

      {/* Input area */}
      {!keyErrorState && (
        <div className="flex flex-col gap-4">
          <div className="relative">
            <textarea
              value={activationKey}
              onChange={e => onKeyChange(e.target.value)}
              placeholder="eyJzaGFyZWRDb25uZWN0aW9u..."
              rows={4}
              spellCheck={false}
              className={`w-full rounded-2xl border-2 font-mono text-figma-xs px-5 py-4 resize-none focus:outline-none transition-all duration-300 leading-relaxed ${
                isFullyValid
                  ? 'border-fw-active bg-fw-cobalt-100/20 text-fw-heading'
                  : hasInput
                  ? 'border-fw-error bg-red-50 text-fw-heading'
                  : 'border-fw-secondary bg-fw-wash text-fw-heading focus:border-fw-active'
              } ${justValidated ? 'valid-glow' : ''}`}
            />
            {!hasInput && (
              <button
                onClick={onPasteFromClipboard}
                className="absolute top-3 right-4 flex items-center gap-1.5 text-[11px] font-semibold text-fw-body hover:text-fw-link transition-colors"
              >
                <Clipboard className="w-3.5 h-3.5" /> Paste
              </button>
            )}
            {isFullyValid && (
              <div className="absolute bottom-3 right-4 flex items-center gap-1.5 text-[11px] font-semibold text-fw-link">
                <CheckCircle2 className="w-3.5 h-3.5" /> Valid
              </div>
            )}
          </div>

          <div className="min-h-[16px]">
            {inlineError || hasDecodeError ? (
              <p className="flex items-center gap-1.5 text-figma-xs text-fw-error">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {inlineError || 'Key decoded but looks incomplete — try copying again.'}
              </p>
            ) : (
              <p className="text-figma-xs text-fw-body">
                AWS Console → Interconnect - last mile → Connections → select → copy key{'  '}
                <button
                  onClick={onUseDemoKey}
                  className="text-fw-link hover:text-fw-linkHover font-semibold transition-colors"
                >
                  Use demo key →
                </button>
                {'  '}
                <button
                  onClick={onUseDemoExpiredKey}
                  className="text-fw-bodyLight hover:text-fw-body transition-colors"
                >
                  Demo: expired
                </button>
                {'  '}
                <button onClick={() => onUseDemoErrorKey('not-recognized')} className="text-fw-bodyLight hover:text-fw-body transition-colors">· not recognized</button>
                {'  '}
                <button onClick={() => onUseDemoErrorKey('already-used')} className="text-fw-bodyLight hover:text-fw-body transition-colors">· already used</button>
                {'  '}
                <button onClick={() => onUseDemoErrorKey('wrong-account')} className="text-fw-bodyLight hover:text-fw-body transition-colors">· wrong account</button>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Panel: Confirm ─────────────────────────────────────────────────────────────

function ConfirmPanel({
  metroName, bwLabel, bwMbps, bcAccountId, peerSubnet, connectionName, onNameChange,
}: {
  metroName: string;
  bwLabel: string;
  bwMbps: number;
  bcAccountId: string;
  peerSubnet: string;
  connectionName: string;
  onNameChange: (name: string) => void;
}) {
  return (
    <div>
      {/* Header */}
      <div className="pb-6">
        <div className="flex items-center gap-3 mb-4">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/3/31/AT%26T_logo_2016.svg"
            alt="AT&T"
            className="h-10 w-auto"
          />
          <div className="w-px h-6 bg-fw-secondary" />
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg"
            alt="AWS"
            className="h-7 w-auto"
          />
        </div>
        <h2 className="text-figma-2xl font-bold text-fw-heading tracking-[-0.04em] leading-tight">
          Confirm your connection
        </h2>
        <p className="text-figma-sm text-fw-body mt-1.5 leading-relaxed">
          Name your connection and review the details. We'll start setup as soon as you confirm.
        </p>
      </div>

      {/* Connection name */}
      <div className="mb-4">
        <label className="block text-figma-xs font-semibold text-fw-bodyLight uppercase tracking-[0.08em] mb-1.5">
          Connection name
        </label>
        <input
          type="text"
          value={connectionName}
          onChange={e => onNameChange(e.target.value)}
          placeholder="Production AWS – San Jose"
          className="w-full h-10 px-4 rounded-xl border border-fw-secondary bg-fw-base text-figma-sm font-medium text-fw-heading placeholder:text-fw-disabled focus:border-fw-active focus:ring-2 focus:ring-fw-active focus:outline-none transition-all"
        />
      </div>

      {/* The total leads — Apple-receipt style; the key's contents explain it below */}
      <div className="rounded-2xl border border-fw-secondary bg-fw-base px-5 py-4 mb-3">
        <p className="text-figma-xs font-semibold text-fw-bodyLight uppercase tracking-widest mb-1">Estimated monthly</p>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <p className="text-[28px] leading-none font-bold text-fw-heading tracking-[-0.03em] tabular-nums">
            {formatUsd(estimateMonthlyRate(bwMbps))}
            <span className="text-figma-sm font-medium text-fw-bodyLight tracking-normal ml-1">/mo</span>
          </p>
          <div className="flex items-stretch divide-x divide-fw-secondary/70 text-right">
            <div className="px-4 first:pl-0">
              <p className="text-figma-sm font-bold text-fw-heading">{bwLabel} × 4</p>
              <p className="text-[10px] text-fw-bodyLight">Bandwidth · paths</p>
            </div>
            <div className="px-4 last:pr-0">
              <p className="text-figma-sm font-bold text-fw-heading">{metroName.split(',')[0]}</p>
              <p className="text-[10px] text-fw-bodyLight">Metro</p>
            </div>
          </div>
        </div>
        <p className="text-figma-xs text-fw-bodyLight mt-2">
          Billing starts when the connection goes Live — never at confirmation.
        </p>
      </div>

      {/* Summary card */}
      <div>
        <div className="rounded-2xl border border-fw-secondary bg-fw-wash overflow-hidden">
          {[
            { label: 'Location',                  value: metroName },
            { label: 'Bandwidth',                 value: `${bwLabel} × 4 paths` },
            { label: 'Subnet',                    value: peerSubnet },
            { label: 'Business Center Account ID', value: bcAccountId },
          ].map(({ label, value }, i) => (
            <div
              key={i}
              className={`flex items-center justify-between px-5 py-4 ${i > 0 ? 'border-t border-fw-secondary' : ''}`}
            >
              <span className="text-figma-xs font-medium text-fw-body">{label}</span>
              <span className="text-figma-sm font-semibold text-fw-heading">{value}</span>
            </div>
          ))}
        </div>
        <p className="text-figma-xs text-fw-bodyLight mt-3">
          Submitting this form is the request to provision; it is never a charge.
        </p>
      </div>
    </div>
  );
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface LmccPasteKeyFlowProps {
  onStageChange: (stage: PasteStage) => void;
  onValidityChange?: (valid: boolean) => void;
  onInputChange?: (hasInput: boolean) => void;
  actionRef?: MutableRefObject<{ advance: () => void; back: () => void } | null>;
  onCancel: () => void;
  awsHandoff?: boolean;
}

// ── Main component ─────────────────────────────────────────────────────────────

export function LmccPasteKeyFlow({ onStageChange, onValidityChange, onInputChange, actionRef, onCancel, awsHandoff }: LmccPasteKeyFlowProps) {
  const navigate = useNavigate();
  const addConnection = useStore(state => state.addConnection);
  const logActivity = useStore(state => state.logActivity);

  const [stage, setStage] = useState<PasteStage>('paste');
  const [activationKey, setActivationKey] = useState('');
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [justValidated, setJustValidated] = useState(false);
  const [connectionName, setConnectionName] = useState('Production AWS – San Jose');
  const [keyErrorState, setKeyErrorState] = useState<KeyErrorState>(null);

  // ── Key derivations ───────────────────────────────────────────────────────
  const trimmed = activationKey.trim();
  const hasInput = trimmed.length > 0;
  const looksLikeKey = trimmed.startsWith('ey') && trimmed.length > 20;
  const decoded = looksLikeKey ? tryDecodeKey(trimmed) : null;
  const isFullyValid = looksLikeKey && !!decoded?.sharedConnectionUuid && !isExpiredKey(decoded ?? {});
  const hasDecodeError = looksLikeKey && !decoded?.sharedConnectionUuid;

  const metroId = decoded?.destinationEnvironmentUri?.split('/').pop() || '';
  const metro = metroId ? getMetroById(metroId) : null;
  const metroName = metro?.name || 'San Jose, CA';
  const bwMbps = decoded?.connectionSizeMbps || 1000;
  const bwLabel = bwMbps >= 1000 ? `${bwMbps / 1000} Gbps` : `${bwMbps} Mbps`;
  const peerSubnet = decoded?.peerSubnet || '169.254.100.0/30';

  useEffect(() => { onStageChange(stage); }, [stage, onStageChange]);
  useEffect(() => { onValidityChange?.(isFullyValid); }, [isFullyValid, onValidityChange]);
  useEffect(() => { onInputChange?.(hasInput); }, [hasInput, onInputChange]);

  useEffect(() => {
    if (!actionRef) return;
    actionRef.current = {
      advance: stage === 'paste' ? () => handleActivate() : () => handleConfirmActivate(),
      back: () => setStage('paste'),
    };
  });

  const handleKeyChange = (val: string) => {
    setActivationKey(val.replace(/\s+/g, ''));
    setInlineError(null);
    setKeyErrorState(null);
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      handleKeyChange(text);
    } catch { /* clipboard access denied */ }
  };

  useEffect(() => {
    if (isFullyValid) {
      setJustValidated(true);
      const t = setTimeout(() => setJustValidated(false), 650);
      return () => clearTimeout(t);
    }
  }, [isFullyValid]);

  const handleActivate = () => {
    // Check for expired key first
    if (looksLikeKey && decoded && isExpiredKey(decoded)) {
      setKeyErrorState('expired');
      return;
    }
    // Check for invalid key
    if (!isFullyValid) {
      if (hasInput) {
        setKeyErrorState('invalid');
      } else {
        setInlineError("Check that you copied the complete key. Keys begin with 'ey'.");
      }
      return;
    }
    setStage('confirm');
  };

  const handleConfirmActivate = async () => {
    // Confirm-time verification (PRD): authorization + key confirmation with AWS.
    if (decoded?.demoError) {
      setKeyErrorState(decoded.demoError);
      if (decoded.demoError === 'not-recognized') {
        logActivity({
          type: 'security',
          message: 'Activation key rejected by AWS (keyValid: false) — possible cancellation or tampering.',
        });
      }
      return;
    }
    const newId = `conn-${Date.now()}`;
    const finalName =
      connectionName.trim().length > 0
        ? connectionName.trim()
        : `NetBond Max - ${metroName.split(',')[0]} · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    try {
      await addConnection({
        id: newId,
        name: finalName,
        type: 'AWS Last Mile',
        status: 'Provisioning',
        bandwidth: `${bwLabel} × 4 paths`,
        location: metroName,
        provider: 'AWS',
        configuration: {
          awsAccountId: decoded?.destinationAccountId,
          lmccMetro: metroId,
          isLmcc: true,
          awsFirst: true,
          peerSubnet,
        },
        billing: { baseFee: 999.99, usage: 0, total: 999.99, currency: 'USD' },
      } as any);
      logActivity({
        type: 'key-accepted',
        connectionId: newId,
        message: `Activation key accepted for ${metroName} — provisioning requested. Billing starts at Live.`,
      });
    } catch { /* store error — still navigate */ }

    navigate('/manage', { state: { highlightedConnectionId: newId, activeTab: 'connections', viewMode: 'list' } });
  };

  if (keyErrorState && FULL_SCREEN_ERRORS.includes(keyErrorState)) {
    return (
      <FullScreenKeyError
        errorState={keyErrorState as Exclude<KeyErrorState, null | 'invalid'>}
        expiredAt={decoded?.expiredAt}
        onStartOver={() => { setKeyErrorState(null); setActivationKey(''); setStage('paste'); }}
        onGoToConnections={() => navigate('/manage', { state: { activeTab: 'connections' } })}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full">
      {stage === 'paste' && awsHandoff && (
        <div className="mb-5 rounded-2xl border border-fw-active/30 bg-fw-cobalt-100/40 p-4 flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5 h-8 w-8 rounded-full bg-fw-base border border-fw-active/30 flex items-center justify-center">
            <ExternalLink className="h-4 w-4 text-fw-link" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-figma-sm font-semibold text-fw-heading">
              Need a key? Get one from the AWS Management Console.
            </div>
            <p className="text-figma-sm text-fw-bodyLight mt-0.5 leading-relaxed">
              Create your connection in the AWS Management Console. AWS will generate the Activation Key — bring it back here to paste.
            </p>
            <a
              href="https://console.aws.amazon.com/directconnect"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-figma-sm font-semibold text-fw-link hover:underline"
            >
              Open AWS Management Console
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      )}

      {stage === 'paste' && (
        <PastePanel
          activationKey={activationKey}
          hasInput={hasInput}
          isFullyValid={isFullyValid}
          hasDecodeError={hasDecodeError}
          inlineError={inlineError}
          justValidated={justValidated}
          keyErrorState={keyErrorState}
          onKeyChange={handleKeyChange}
          onPasteFromClipboard={handlePasteFromClipboard}
          onUseDemoKey={() => handleKeyChange(DEMO_KEY)}
          onUseDemoExpiredKey={() => handleKeyChange(DEMO_EXPIRED_KEY)}
          onUseDemoErrorKey={(kind) => handleKeyChange(
            kind === 'not-recognized' ? DEMO_NOT_RECOGNIZED_KEY : kind === 'already-used' ? DEMO_ALREADY_USED_KEY : DEMO_WRONG_ACCOUNT_KEY
          )}
          onDismissError={() => { setKeyErrorState(null); setActivationKey(''); }}
        />
      )}

      {stage === 'confirm' && (
        <ConfirmPanel
          metroName={metroName}
          bwLabel={bwLabel}
          bwMbps={bwMbps}
          bcAccountId={DEMO_BC_ACCOUNT_ID}
          peerSubnet={peerSubnet}
          connectionName={connectionName}
          onNameChange={setConnectionName}
        />
      )}
    </div>
  );
}
