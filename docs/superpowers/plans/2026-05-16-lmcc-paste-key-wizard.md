# LMCC Paste Key Wizard Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the "Paste key" flow from the demo modal into a full wizard funnel so the Marketplace "I already have a key" card drives users through the same `ConnectionWizard` container (header, PhaseIndicator, layout) as "Get Started."

**Architecture:** Create `LmccPasteKeyFlow.tsx` as a self-contained component containing all paste/confirm/activating/success UI and state. Wire it into `ConnectionWizard` behind a new `isPasteKey` flag (detected from `location.state.mode === 'paste-key'`). Update the Marketplace card CTA to navigate instead of dispatching a window event.

**Tech Stack:** React 19, TypeScript strict, React Router v6 (`useNavigate`, `useLocation`), Zustand (`useStore`), Tailwind + AT&T design tokens, Lucide icons.

---

## File Map

| Action | Path | What changes |
|---|---|---|
| **Create** | `src/components/wizard/screens/LmccPasteKeyFlow.tsx` | All paste-key state + 3 panels + success state |
| **Modify** | `src/components/wizard/ConnectionWizard.tsx` | Detect `mode: 'paste-key'`, show paste PhaseIndicator, render LmccPasteKeyFlow |
| **Modify** | `src/components/Marketplace.tsx` | CTA navigates instead of dispatching event |

---

## Task 1: Create `LmccPasteKeyFlow.tsx`

**Files:**
- Create: `src/components/wizard/screens/LmccPasteKeyFlow.tsx`

- [ ] **Step 1: Create the file with all types, helpers, and state**

```tsx
// src/components/wizard/screens/LmccPasteKeyFlow.tsx
import { useState, useEffect } from 'react';
import {
  ArrowRight, ChevronLeft, CheckCircle2, AlertCircle, Clipboard
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../../store/useStore';
import { getMetroById } from '../../../data/lmccService';

// ── Types ──────────────────────────────────────────────────────────────────────

export type PasteStage = 'paste' | 'confirm' | 'activating';
type ProvisionStatus = 'key-accepted' | 'negotiating' | 'bgp' | 'live';
type StageItemStatus = 'pending' | 'active' | 'done';

interface DecodedKey {
  sharedConnectionUuid?: string;
  connectionSizeMbps?: number;
  destinationAccountId?: string;
  destinationEnvironmentUri?: string;
}

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

const DEMO_KEY =
  'eyJzaGFyZWRDb25uZWN0aW9uVXVpZCI6ImxlZ2FjeS1sb2NhbC10ZXN0LTAwMSIsImNvbm5lY3Rpb25TaXplTWJwcyI6MTAwMCwiZGVzdGluYXRpb25BY2NvdW50SWQiOiI5NDM3NjI4ODAzMTUiLCJkZXN0aW5hdGlvbkVudmlyb25tZW50VXJpIjoiYXR0L2Vudmlyb25tZW50cy9tZXRyby1zaiIsInZlcnNpb24iOjF9';

const DEMO_EMAIL = 'emilio.estevez@att.com';
const maskedEmail = (() => {
  const [local, domain] = DEMO_EMAIL.split('@');
  return `${local[0]}${'•'.repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
})();

// ── StageItem ─────────────────────────────────────────────────────────────────

function StageItem({
  status,
  title,
  desc,
  isLast,
  isGreen,
}: {
  status: StageItemStatus;
  title: string;
  desc: string;
  isLast: boolean;
  isGreen: boolean;
}) {
  return (
    <div className={`flex gap-4 ${!isLast ? 'mb-5' : ''}`}>
      <div className="flex flex-col items-center">
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors duration-500 ${
            status === 'done'
              ? isGreen ? 'bg-green-500' : 'bg-fw-primary'
              : status === 'active'
              ? 'bg-fw-primary ring-4 ring-fw-primary/20'
              : 'bg-fw-neutral'
          }`}
        >
          {status === 'done' ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
          ) : status === 'active' ? (
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-fw-disabled" />
          )}
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-fw-secondary mt-1" />}
      </div>
      <div className="pb-1 min-w-0">
        <p className={`text-figma-sm font-semibold leading-tight mb-0.5 ${
          status === 'pending' ? 'text-fw-disabled' : 'text-fw-heading'
        }`}>{title}</p>
        <p className={`text-figma-xs leading-relaxed ${
          status === 'pending' ? 'text-fw-disabled' : 'text-fw-body'
        }`}>{desc}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add the component props interface and main component shell**

Append to the same file:

```tsx
// ── Props ──────────────────────────────────────────────────────────────────────

interface LmccPasteKeyFlowProps {
  onStageChange: (stage: PasteStage) => void;
  onCancel: () => void;
}

// ── Main component ─────────────────────────────────────────────────────────────

export function LmccPasteKeyFlow({ onStageChange, onCancel }: LmccPasteKeyFlowProps) {
  const navigate = useNavigate();
  const addConnection = useStore(state => state.addConnection);

  const [stage, setStage] = useState<PasteStage>('paste');
  const [activationKey, setActivationKey] = useState('');
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [justValidated, setJustValidated] = useState(false);
  const [provisionStatus, setProvisionStatus] = useState<ProvisionStatus>('key-accepted');
  const [provisionComplete, setProvisionComplete] = useState(false);
  const [newConnectionId, setNewConnectionId] = useState<string | null>(null);

  // Notify parent when stage changes so PhaseIndicator can update
  useEffect(() => { onStageChange(stage); }, [stage, onStageChange]);

  // ── Key derivations ──────────────────────────────────────────────────────────
  const trimmed = activationKey.trim();
  const hasInput = trimmed.length > 0;
  const looksLikeKey = trimmed.startsWith('ey') && trimmed.length > 20;
  const decoded = looksLikeKey ? tryDecodeKey(trimmed) : null;
  const isFullyValid = looksLikeKey && !!decoded?.sharedConnectionUuid;
  const hasDecodeError = looksLikeKey && !isFullyValid;

  const metroId = decoded?.destinationEnvironmentUri?.split('/').pop() || '';
  const metro = metroId ? getMetroById(metroId) : null;
  const metroName = metro?.name || 'San Jose, CA';
  const bwMbps = decoded?.connectionSizeMbps || 1000;
  const bwLabel = bwMbps >= 1000 ? `${bwMbps / 1000} Gbps` : `${bwMbps} Mbps`;

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleKeyChange = (val: string) => {
    setActivationKey(val.replace(/\s+/g, ''));
    setInlineError(null);
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      handleKeyChange(text);
    } catch { /* clipboard access denied */ }
  };

  // Glow once on valid
  useEffect(() => {
    if (isFullyValid) {
      setJustValidated(true);
      const t = setTimeout(() => setJustValidated(false), 650);
      return () => clearTimeout(t);
    }
  }, [isFullyValid]);

  const handleActivate = () => {
    if (!isFullyValid) {
      setInlineError("Check that you copied the complete key. Keys begin with 'ey'.");
      return;
    }
    setStage('confirm');
  };

  const handleConfirmActivate = async () => {
    const newId = `conn-${Date.now()}`;
    const connectionName = `NetBond Max - ${metroName.split(',')[0]} · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    setStage('activating');

    try {
      await addConnection({
        id: newId,
        name: connectionName,
        type: 'Internet to Cloud',
        status: 'Provisioning',
        bandwidth: `${bwLabel} × 4 paths`,
        location: metroName,
        provider: 'AWS',
        configuration: {
          awsAccountId: decoded?.destinationAccountId,
          lmccMetro: metroId,
          isLmcc: true,
          awsFirst: true,
        },
        billing: { baseFee: 999.99, usage: 0, total: 999.99, currency: 'USD' },
      } as any);
      setNewConnectionId(newId);
    } catch { /* store error — still proceed */ }

    // Simulate provisioning stages
    const delays: [number, ProvisionStatus | 'complete'][] = [
      [2200, 'negotiating'],
      [4800, 'bgp'],
      [7600, 'live'],
      [9200, 'complete'],
    ];
    delays.forEach(([ms, s]) => {
      setTimeout(() => {
        if (s === 'complete') {
          setProvisionComplete(true);
        } else {
          setProvisionStatus(s as ProvisionStatus);
        }
      }, ms);
    });
  };

  // ── Provision status derivations ─────────────────────────────────────────────
  const keyAcceptedStatus: StageItemStatus =
    provisionStatus === 'key-accepted' ? 'active' : 'done';
  const negotiatingStatus: StageItemStatus =
    provisionStatus === 'key-accepted' ? 'pending'
    : provisionStatus === 'negotiating' ? 'active'
    : 'done';
  const bgpStatus: StageItemStatus =
    provisionStatus === 'bgp' ? 'active'
    : provisionStatus === 'live' ? 'done'
    : 'pending';
  const liveStatus: StageItemStatus =
    provisionComplete ? 'done'
    : provisionStatus === 'live' ? 'active'
    : 'pending';

  return (
    <div className="max-w-2xl mx-auto w-full">
      {/* PANEL: Paste */}
      {stage === 'paste' && <PastePanel
        activationKey={activationKey}
        hasInput={hasInput}
        isFullyValid={isFullyValid}
        hasDecodeError={hasDecodeError}
        inlineError={inlineError}
        justValidated={justValidated}
        onKeyChange={handleKeyChange}
        onPasteFromClipboard={handlePasteFromClipboard}
        onActivate={handleActivate}
        onUseDemoKey={() => handleKeyChange(DEMO_KEY)}
        onCancel={onCancel}
      />}

      {/* PANEL: Confirm */}
      {stage === 'confirm' && <ConfirmPanel
        metroName={metroName}
        bwLabel={bwLabel}
        maskedEmail={maskedEmail}
        onBack={() => setStage('paste')}
        onConfirm={handleConfirmActivate}
      />}

      {/* PANEL: Activating / Success */}
      {stage === 'activating' && <ActivatingPanel
        keyAcceptedStatus={keyAcceptedStatus}
        negotiatingStatus={negotiatingStatus}
        bgpStatus={bgpStatus}
        liveStatus={liveStatus}
        provisionComplete={provisionComplete}
        metroName={metroName}
        bwLabel={bwLabel}
        onViewConnection={() => navigate('/manage', { state: { highlightedConnectionId: newConnectionId } })}
      />}
    </div>
  );
}
```

- [ ] **Step 3: Add the three panel sub-components to the same file**

Append above the `LmccPasteKeyFlowProps` interface (before the main component):

```tsx
// ── Panel: Paste ───────────────────────────────────────────────────────────────

function PastePanel({
  activationKey, hasInput, isFullyValid, hasDecodeError,
  inlineError, justValidated,
  onKeyChange, onPasteFromClipboard, onActivate, onUseDemoKey, onCancel,
}: {
  activationKey: string;
  hasInput: boolean;
  isFullyValid: boolean;
  hasDecodeError: boolean;
  inlineError: string | null;
  justValidated: boolean;
  onKeyChange: (v: string) => void;
  onPasteFromClipboard: () => void;
  onActivate: () => void;
  onUseDemoKey: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="bg-fw-base rounded-2xl border border-fw-secondary overflow-hidden">
      {/* Header */}
      <div className="px-8 pt-8 pb-6 border-b border-fw-secondary">
        <div className="flex items-center gap-3 mb-3">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg"
            alt="AWS"
            className="h-8 w-auto"
          />
          <h2 className="text-figma-2xl font-bold text-fw-heading tracking-[-0.04em] leading-tight">
            Paste your key
          </h2>
        </div>
        <p className="text-figma-sm text-fw-body leading-relaxed max-w-lg">
          Copy your Activation Key from AWS Interconnect - last mile and paste it below.
          Keys are valid for 7 days from generation.
        </p>
      </div>

      {/* Input area */}
      <div className="px-8 py-6 flex flex-col gap-4">
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
              {inlineError || 'Key decoded but looks incomplete - try copying again.'}
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
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={onCancel}
            className="group flex items-center justify-center gap-1.5 py-2.5 rounded-full border-2 border-fw-secondary text-fw-body text-figma-sm font-semibold transition-all duration-300 hover:border-fw-active hover:text-fw-link hover:scale-[1.02] active:scale-[0.98]"
          >
            <ChevronLeft className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-0.5" /> Cancel
          </button>
          <button
            onClick={onActivate}
            disabled={!isFullyValid}
            className={`group flex items-center justify-center gap-2 py-2.5 rounded-full bg-fw-primary text-white text-figma-sm font-semibold transition-all duration-300 hover:shadow-[0_4px_20px_rgba(0,87,184,0.4)] hover:scale-[1.02] active:scale-[0.98] ${
              !isFullyValid ? 'opacity-40 cursor-not-allowed' : ''
            }`}
          >
            Activate connection
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Panel: Confirm ─────────────────────────────────────────────────────────────

function ConfirmPanel({
  metroName, bwLabel, maskedEmail, onBack, onConfirm,
}: {
  metroName: string;
  bwLabel: string;
  maskedEmail: string;
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="bg-fw-base rounded-2xl border border-fw-secondary overflow-hidden">
      {/* Header */}
      <div className="px-8 pt-8 pb-6 border-b border-fw-secondary">
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
          Review the details decoded from your Activation Key.
        </p>
      </div>

      {/* Summary card */}
      <div className="px-8 pt-6">
        <div className="rounded-2xl border border-fw-secondary bg-fw-wash overflow-hidden">
          {[
            { label: 'Location', value: metroName },
            { label: 'Bandwidth', value: `${bwLabel} × 4 paths` },
            { label: 'AT&T Email Address', value: maskedEmail },
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
      </div>

      <p className="px-8 pt-4 pb-1 text-figma-xs text-fw-body leading-relaxed">
        AT&T will begin provisioning automatically. This usually takes 2-5 minutes.
      </p>

      <div className="px-8 pt-4 pb-8 grid grid-cols-2 gap-3">
        <button
          onClick={onBack}
          className="group flex items-center justify-center gap-1.5 py-2.5 rounded-full border-2 border-fw-active text-fw-link text-figma-sm font-semibold transition-all duration-300 hover:bg-fw-cobalt-100/40 hover:scale-[1.02] active:scale-[0.98]"
        >
          <ChevronLeft className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-0.5" /> Back
        </button>
        <button
          onClick={onConfirm}
          className="group flex items-center justify-center gap-2 py-2.5 rounded-full bg-fw-primary text-white text-figma-sm font-semibold transition-all duration-300 hover:shadow-[0_4px_20px_rgba(0,87,184,0.4)] hover:scale-[1.02] active:scale-[0.98]"
        >
          Confirm &amp; Activate
          <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
}

// ── Panel: Activating / Success ────────────────────────────────────────────────

function ActivatingPanel({
  keyAcceptedStatus, negotiatingStatus, bgpStatus, liveStatus,
  provisionComplete, metroName, bwLabel, onViewConnection,
}: {
  keyAcceptedStatus: StageItemStatus;
  negotiatingStatus: StageItemStatus;
  bgpStatus: StageItemStatus;
  liveStatus: StageItemStatus;
  provisionComplete: boolean;
  metroName: string;
  bwLabel: string;
  onViewConnection: () => void;
}) {
  return (
    <div className="bg-fw-base rounded-2xl border border-fw-secondary overflow-hidden">
      {/* Provisioning view */}
      <div
        style={{
          overflow: 'hidden',
          opacity: provisionComplete ? 0 : 1,
          maxHeight: provisionComplete ? '0' : '600px',
          transition: 'opacity 0.3s ease, max-height 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          pointerEvents: provisionComplete ? 'none' : 'auto',
        }}
      >
        <div className="px-8 pt-8 pb-5 border-b border-fw-secondary">
          <div className="flex items-center gap-3 mb-4">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/3/31/AT%26T_logo_2016.svg"
              alt="AT&T" className="h-10 w-auto"
            />
            <div className="w-px h-6 bg-fw-secondary" />
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg"
              alt="AWS" className="h-7 w-auto"
            />
          </div>
          <h2 className="text-figma-2xl font-bold text-fw-heading tracking-[-0.04em] leading-tight">
            Activating your connection
          </h2>
          <p className="text-figma-sm text-fw-body mt-1.5 leading-relaxed">
            Four diverse paths are being configured automatically.
          </p>
        </div>
        <div className="px-8 py-8">
          <StageItem status={keyAcceptedStatus} title="Key Accepted"
            desc="AWS has received and validated the key. Negotiation is starting."
            isLast={false} isGreen={provisionComplete} />
          <StageItem status={negotiatingStatus} title="Negotiating Parameters"
            desc="AT&T and AWS are automatically agreeing the L3 configuration for all 4 channels. No action needed."
            isLast={false} isGreen={provisionComplete} />
          <StageItem status={bgpStatus} title="BGP Forming"
            desc="Technical parameters agreed. BGP sessions coming up on AT&T hardware."
            isLast={false} isGreen={provisionComplete} />
          <StageItem status={liveStatus} title="Live"
            desc="Both AT&T and AWS have confirmed. Traffic can flow."
            isLast={true} isGreen={provisionStatus === 'live' || provisionComplete} />
        </div>
      </div>

      {/* Success view */}
      <div
        style={{
          overflow: 'hidden',
          opacity: provisionComplete ? 1 : 0,
          maxHeight: provisionComplete ? '500px' : '0',
          transition: `opacity 0.4s ease ${provisionComplete ? '0.22s' : '0s'}, max-height 0.45s cubic-bezier(0.16, 1, 0.3, 1) ${provisionComplete ? '0.1s' : '0s'}`,
          pointerEvents: provisionComplete ? 'auto' : 'none',
        }}
      >
        <div className="flex flex-col items-center text-center px-10 py-12">
          <div className="flex items-center justify-center gap-7 mb-8">
            <div className="h-12 flex items-center">
              <img src="https://upload.wikimedia.org/wikipedia/commons/3/31/AT%26T_logo_2016.svg"
                alt="AT&T" className="h-full w-auto" />
            </div>
            <div className="w-px h-10 bg-fw-secondary" />
            <div className="h-12 flex items-center">
              <img src="https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg"
                alt="AWS" className="h-8 w-auto" />
            </div>
          </div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-green-50 border border-green-200 mb-6">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-green-700">Connection Live</span>
          </div>
          <h3 className="text-[1.85rem] font-bold text-fw-heading tracking-[-0.04em] leading-tight mb-4">
            Your connection is live
          </h3>
          <div className="flex items-center justify-center gap-2.5 mb-3">
            <span className="text-figma-sm text-fw-body">{metroName}</span>
            <span className="text-fw-disabled">·</span>
            <span className="text-figma-sm font-semibold text-fw-heading">{bwLabel} × 4 paths</span>
          </div>
          <p className="text-figma-sm text-fw-body mb-9 max-w-[300px] leading-relaxed">
            Traffic can now flow between your network and AWS. AT&T will send a confirmation email shortly.
          </p>
          <button
            onClick={onViewConnection}
            className="group flex items-center justify-center gap-2 px-10 py-3 rounded-full bg-fw-primary text-white text-figma-base font-semibold transition-all duration-300 hover:shadow-[0_4px_24px_rgba(0,87,184,0.45)] hover:scale-[1.02] active:scale-[0.98]"
          >
            View connection
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </div>
  );
}
```

> **NOTE:** The `ActivatingPanel` references `provisionStatus` which is local state in `LmccPasteKeyFlow` — it's used in the `isGreen` prop for the last `StageItem`. Add `provisionStatus` as a prop to `ActivatingPanel` or inline the condition. Simplest fix: add `provisionStatus: ProvisionStatus` to `ActivatingPanel`'s props and pass it from the parent.

- [ ] **Step 4: Fix the `provisionStatus` prop in `ActivatingPanel`**

In `ActivatingPanel`'s props interface, add:
```tsx
provisionStatus: ProvisionStatus;
```

In the `LmccPasteKeyFlow` JSX, add `provisionStatus={provisionStatus}` to `<ActivatingPanel>`.

In `ActivatingPanel`'s destructured props, add `provisionStatus`.

- [ ] **Step 5: Build to verify no TypeScript errors**

```bash
cd /Users/micahbos/Desktop/cloud-router-ui/att-netbond-sdci && npm run build 2>&1 | grep -E "error|✓ built"
```

Expected: `✓ built in Xs`

---

## Task 2: Wire `LmccPasteKeyFlow` into `ConnectionWizard`

**Files:**
- Modify: `src/components/wizard/ConnectionWizard.tsx`

- [ ] **Step 1: Add the import**

At the top of `ConnectionWizard.tsx`, add alongside the other screen imports:

```tsx
import { LmccPasteKeyFlow, PasteStage } from './screens/LmccPasteKeyFlow';
```

- [ ] **Step 2: Detect paste-key mode from location state**

`ConnectionWizard.tsx` already reads `location.state` into `locationState`. After the existing `isAwsMax` derivation (line ~154), add:

```tsx
const isPasteKey = locationState?.mode === 'paste-key';
const [pasteStage, setPasteStage] = useState<PasteStage>('paste');
```

- [ ] **Step 3: Add the 2-step PhaseIndicator for paste-key mode**

Find the existing `isAwsMax` PhaseIndicator block added in the previous session (lines ~581-596 of ConnectionWizard.tsx):

```tsx
{isAwsMax && (
  <div className="max-w-sm mx-auto mb-12">
    <PhaseIndicator
      phases={[
        { title: 'AWS Account', description: 'Enter your AWS account number' },
        { title: 'Review', description: 'Review and activate' },
      ]}
      currentPhase={step >= 7 ? 1 : 0}
      className="w-full"
    />
  </div>
)}
```

Add a sibling block immediately after it:

```tsx
{isPasteKey && (
  <div className="max-w-sm mx-auto mb-12">
    <PhaseIndicator
      phases={[
        { title: 'Activation Key', description: 'Paste your AWS key' },
        { title: 'Review', description: 'Confirm and activate' },
      ]}
      currentPhase={pasteStage === 'paste' ? 0 : 1}
      className="w-full"
    />
  </div>
)}
```

- [ ] **Step 4: Render `LmccPasteKeyFlow` in the wizard body**

In `ConnectionWizard.tsx`, find the `default:` case in the step render switch (the section that renders PhaseIndicator + step screens). After the `{isAwsMax && step === 4 && ...}` and `{isAwsMax && step === 5 && ...}` blocks, add:

```tsx
{/* Paste Key wizard mode */}
{isPasteKey && (
  <LmccPasteKeyFlow
    onStageChange={setPasteStage}
    onCancel={onCancel}
  />
)}
```

- [ ] **Step 5: Guard existing step content from rendering when `isPasteKey`**

The existing step content blocks (step 0–7 screens) should not render in paste-key mode. Wrap the main content gate:

Find `{step >= 1 && step <= 6 && !(isAwsMax && ...}` and `{step === 6 && isAwsMax && ...}` etc. — these are already guarded by step number and `isAwsMax`. Since `isPasteKey` starts at step 0 in the wizard (it never increments `step`), add a top-level guard:

Find `{step === 0 && (`:
```tsx
{step === 0 && !isPasteKey && (
```

Find `{step === 6 && isAwsMax && (() => {`:
```tsx
{step === 6 && isAwsMax && !isPasteKey && (() => {
```

Find `{step >= 1 && step <= 6 && !(isAwsMax && (step === 4 || step === 5 || step === 6)) && (`:
```tsx
{step >= 1 && step <= 6 && !isPasteKey && !(isAwsMax && (step === 4 || step === 5 || step === 6)) && (
```

- [ ] **Step 6: Build to verify**

```bash
cd /Users/micahbos/Desktop/cloud-router-ui/att-netbond-sdci && npm run build 2>&1 | grep -E "error|✓ built"
```

Expected: `✓ built in Xs`

---

## Task 3: Update Marketplace CTA + remove window event

**Files:**
- Modify: `src/components/Marketplace.tsx`
- Modify: `src/components/common/NetBondMax_Modal_CustomerDemo.tsx`

- [ ] **Step 1: Update the paste card CTA in Marketplace.tsx**

Find:
```tsx
onClick={() => window.dispatchEvent(new CustomEvent('lmcc-open-paste'))}
```

Replace with:
```tsx
onClick={() => navigate('/create', { state: { mode: 'paste-key' } })}
```

- [ ] **Step 2: Remove the window event listener from the modal**

In `NetBondMax_Modal_CustomerDemo.tsx`, find and remove the `lmcc-open-paste` event listener block added earlier:

```tsx
// Remove this block:
const handleOpenPaste = () => {
  setStage('paste');
  setMounted(true);
  setVisible(true);
};
window.addEventListener('lmcc-open-paste', handleOpenPaste);
// ...and its cleanup:
window.removeEventListener('lmcc-open-paste', handleOpenPaste);
```

The `useEffect` should return to its original shape:
```tsx
useEffect(() => {
  setMounted(true);
  const t1 = setTimeout(() => setVisible(true), 80);
  const t2 = setTimeout(() => setPillsVisible(true), 420);
  return () => { clearTimeout(t1); clearTimeout(t2); };
}, []);
```

- [ ] **Step 3: Final build + deploy**

```bash
cd /Users/micahbos/Desktop/cloud-router-ui/att-netbond-sdci && npm run build 2>&1 | grep -E "error|✓ built"
npm run deploy 2>&1 | tail -3
```

Expected: `✓ built` then `Published`

- [ ] **Step 4: Smoke test**

1. Navigate to Marketplace → Max Resiliency
2. Click "Paste key" on the "I already have a key" card
3. Verify: wizard opens with 2-step PhaseIndicator ("Activation Key" active, "Review" pending)
4. Click "Use demo key →" — key populates, "Valid" badge appears
5. Click "Activate connection" — PhaseIndicator advances to step 2
6. Click "Confirm & Activate" — activating panel shows, timeline animates
7. After ~10s: success state, "View connection" navigates to /manage
8. Verify: the modal still auto-appears on the connections page (separate behavior, unchanged)

---

## Self-Review

**Spec coverage:**
- [x] Paste flow in wizard with same container elements
- [x] 2-step PhaseIndicator (Activation Key → Review)
- [x] Paste panel with textarea, clipboard button, demo key, validation
- [x] Confirm panel with decoded key summary
- [x] Activating panel with 4-stage timeline
- [x] Success state with "View connection"
- [x] Marketplace CTA navigates to wizard
- [x] Modal event listener cleaned up

**Placeholder scan:** No TBDs. All code is complete.

**Type consistency:** `PasteStage` exported from `LmccPasteKeyFlow.tsx` and imported in `ConnectionWizard.tsx`. `ProvisionStatus` and `StageItemStatus` are local to the new file. `StageItem` sub-component defined before use.
