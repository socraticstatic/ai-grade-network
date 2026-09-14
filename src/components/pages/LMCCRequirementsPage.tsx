/**
 * LMCCRequirementsPage — LMCC Interactive Requirements & Demo
 *
 * URL: /aws-workflow  (orphan /demo route, no auth required)
 * Strict Flywheel 3: fw-* tokens only, figma-* type scale, no hardcoded colors.
 *
 * LMCC Architecture (source: lmcc-product-brief.md + Connection Coordinator API):
 *   4 Hosted Connections · 4 IPEs (Juniper MX-304) · 2 diverse DC sites per metro
 *   100G physical pipes · 802.1Q VLAN tagging · BFD interval 300ms × multiplier 3 (900ms detection)
 *
 * Connection Coordinator API — 4 stages every LMCC activation goes through:
 *   1. Intent     — one provider creates a connection request + activation key
 *   2. Negotiate  — L3 params (VLAN, IP, MTU) auto-negotiated between AT&T and AWS
 *   3. Provision  — each provider provisions internal resources (requires ≥3/4 features OK)
 *   4. Activate   — BGP/BFD enable route exchange; billing trigger
 *
 * Flow A — AWS Initiates (Deferring Provider pattern):
 *   Customer creates request in AWS Console with deferConnectionProvisioning=true.
 *   Brings ActivationKey to NetBond → AT&T validates → inline provisioning timeline → live.
 *   Deferred state: deferralTimeoutHours drives key validity window (7 days / 168 hrs).
 *
 * Flow B — AT&T Initiates:
 *   Customer creates in NetBond → wizard → AT&T creates pending record + generates ActivationKey →
 *   customer carries key to AWS Console → AWS validates + drives negotiation as Active Provider.
 *   Preview wizard step 1: read-only (1 input). GA wizard step 1: interactive (3 inputs).
 *
 * Unhappy paths:
 *   Flow A: 'deferred' — user dismissed without starting setup
 *   Flow B: 'expired' — activation key not accepted within deferralTimeoutHours (7 days)
 *
 * Preview Phase: June 30, 2026 — San Jose only (LA infra pending)
 * GA Phase:      November 16, 2026 — San Jose & Ashburn
 */

import { useState } from 'react';
import {
  ArrowRight,
  Copy,
  CheckCircle2,
  ExternalLink,
  Zap,
  Network,
  ClipboardList,
  RefreshCw,
  AlertCircle,
  Clock,
  RotateCcw,
  XCircle,
  Info,
  MapPin,
  Hash,
  ShieldCheck,
} from 'lucide-react';
import { SecondaryAssets, RequirementsValidation, ProductDesignStrategy } from './LMCCRequirementsAssets';
import { LmccJourneyMap } from './LmccJourneyMap';

// ─── Demo data ────────────────────────────────────────────────────────────────

// Realistic base64 ActivationKey (starts with 'ey', matches Connection Coordinator API format)
const DEMO_KEY = 'eyJzaGFyZWRDb25uZWN0aW9uVXVpZCI6ImxtY2MtZGVtbzAxIiwiY29ubmVjdGlvblNpemVNYnBzIjoxMDAwLCJkZXN0aW5hdGlvbkFjY291bnRJZCI6IjEyMzQ1Njc4OTAxMiIsImRlc3RpbmF0aW9uRW52aXJvbm1lbnRVcmkiOiJhdHQ6Ly9lbnZpcm9ubWVudHMvbWV0cm8tc2oiLCJ2ZXJzaW9uIjoxfQ==';

// Preview: San Jose only. LA infra pending — do not show in Preview.
const PREVIEW_METROS = [
  { id: 'sj', name: 'San Jose, CA', region: 'us-west-1', sites: 2 },
];

// GA: San Jose + Ashburn. LA drops — migrates to SJ CoreSite at GA.
const GA_METROS = [
  { id: 'sj',  name: 'San Jose, CA', region: 'us-west-1', sites: 2 },
  { id: 'ash', name: 'Ashburn, VA',  region: 'us-east-1', sites: 2 },
];

// GA bandwidth tiers (Preview is fixed 1 Gbps, read from API)
const GA_BANDWIDTHS = [
  { mbps: 1000,   label: '1 Gbps' },
  { mbps: 2000,   label: '2 Gbps' },
  { mbps: 5000,   label: '5 Gbps' },
  { mbps: 10000,  label: '10 Gbps' },
  { mbps: 25000,  label: '25 Gbps' },
  { mbps: 50000,  label: '50 Gbps' },
  { mbps: 100000, label: '100 Gbps' },
];

// Inline provisioning timeline — replaces the LMCCOnboardingDrawer
// PROVISION_STEPS — copy verbatim from Bible Section 6 ("What the customer sees")
const PROVISION_STEPS = [
  {
    label: 'Key Accepted',
    desc: 'AWS has received and validated the key. Negotiation is starting.',
  },
  {
    label: 'Negotiating Parameters',
    desc: 'AT&T and AWS are automatically agreeing the L3 configuration for all 4 channels. No action needed.',
  },
  {
    label: 'BGP Forming',
    desc: 'Technical parameters agreed. BGP sessions coming up on AT&T hardware.',
  },
  {
    label: 'Live',
    desc: 'Both AT&T and AWS have confirmed. Traffic can flow.',
  },
];

// ─── Types ────────────────────────────────────────────────────────────────────

// 'provisioning' = inline timeline after key validation (replaces LMCCOnboardingDrawer)
type FlowAState = 'idle' | 'validated' | 'provisioning' | 'done' | 'deferred';
// 'complete' = wizard dismissed but key still visible in card
// 'expired' = key not accepted in AWS within 7 days
type FlowBState = 'idle' | 'step1' | 'step2' | 'key' | 'complete' | 'expired';
type FlowPhase = 'preview' | 'ga';

// ─── Unhappy paths reference data ─────────────────────────────────────────────

const UNHAPPY_PATHS: {
  id: string;
  title: string;
  severity: string;
  severityClass: string;
  description: string;
  resolution: string;
}[] = [
  {
    id: 'auto-delete',
    title: '90-Day Auto-Deletion',
    severity: 'High',
    severityClass: 'bg-fw-errorLight text-fw-error',
    description:
      "AWS auto-deletes hosted connections that are not accepted within 90 days (10-day advance notice sent at day 80). AT\u0026T's 7-day activation key window exists to allow re-provisioning if the initial key expires.",
    resolution:
      "Watch for AT\u0026T 30/60/90-day expiry notifications. If deleted, full re-provisioning is required: new LOA-CFA issuance, new hosted connection IDs, new VIF creation.",
  },
  {
    id: 'key-expiry',
    title: 'Activation Key Expiry (7 days)',
    severity: 'Medium',
    severityClass: 'bg-fw-accent text-fw-link',
    description:
      'AT&T activation keys are valid for 7 days. If the AWS acceptance deadline is missed, the key is invalidated and AT&T must regenerate it against the still-pending hosted connections.',
    resolution:
      'Monitor the key expiry timestamp in the NetBond® portal. Request regeneration before expiry if AWS acceptance is delayed — the hosted connections themselves remain in AWS until the 90-day limit.',
  },
  {
    id: 'partial-acceptance',
    title: 'Partial Feature Acceptance',
    severity: 'High',
    severityClass: 'bg-fw-errorLight text-fw-error',
    description:
      'The Connection Coordinator API starts BGP provisioning once ≥3 of 4 CreateFeature calls are accepted. If fewer than 3 are ever confirmed, provisioning never begins. If exactly 3 succeed and the 4th is permanently rejected, the connection is live but in a degraded 3-path state — Maximum Resiliency SLA cannot be claimed.',
    resolution:
      'In AWS Interconnect – last mile â Connections, filter by "ordering" status. Each hosted connection must be individually accepted. Monitor CreateFeature call status for each channel; a 409 Conflict on any channel requires AWS to restart GenerateFeatureGuidance for that channel.',
  },
  {
    id: 'key-no-reservation',
    title: 'No Capacity Reservation on Activation Key',
    severity: 'Medium',
    severityClass: 'bg-fw-accent text-fw-link',
    description:
      'Activation keys do not reserve interconnect capacity. A key generated Monday may fail at Friday provisioning if another customer has consumed the available bandwidth on all Interconnects in the metro — AT&T cannot provision if no Interconnect has room.',
    resolution:
      'RSVP capability is planned for GA. In Preview, AT&T manages capacity manually. Customers should complete setup promptly after key generation. If a 409 Conflict (no capacity) is returned, AT&T must provision a new Interconnect before the connection can proceed.',
  },
  {
    id: 'data-divergence',
    title: 'Dual Source-of-Truth Divergence',
    severity: 'Medium',
    severityClass: 'bg-fw-accent text-fw-link',
    description:
      'The Connection Coordinator API design allows AT&T and AWS to each maintain their own copy of connection state. When the two records drift out of sync — as seen in NetBond® Standard deployments — support teams face conflicting data during incidents and mismatched billing records.',
    resolution:
      'AT&T is proposing a single authoritative source for infrastructure and connection state with the AWS team. Until agreed, reconciliation must be manual. A documented provider-to-provider support interface (Issues API, P0–P4 priorities) is required before GA.',
  },
];

interface FlowBConfig {
  metro: string;
  bandwidth: number;
  awsAccountId: string;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepBadge({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  return (
    <div
      className={`w-6 h-6 rounded-full flex items-center justify-center text-figma-xs font-bold shrink-0 transition-colors ${
        done
          ? 'bg-fw-success text-white'
          : active
          ? 'bg-fw-primary text-white'
          : 'bg-fw-secondary text-fw-disabled'
      }`}
    >
      {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : n}
    </div>
  );
}

function JourneyArrow({ from, to }: { from: string; to: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-fw-wash rounded-lg border border-fw-secondary text-figma-xs font-medium w-fit">
      <span className="text-fw-heading">{from}</span>
      <ArrowRight className="h-3 w-3 text-fw-bodyLight" />
      <span className="text-fw-heading">{to}</span>
    </div>
  );
}

function PhaseToggle({ phase, onChange }: { phase: FlowPhase; onChange: (p: FlowPhase) => void }) {
  return (
    <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-fw-wash border border-fw-secondary">
      <button
        onClick={() => onChange('preview')}
        className={`px-2.5 py-1 rounded-md text-tag-xs font-semibold uppercase tracking-wider transition-all ${
          phase === 'preview' ? 'bg-fw-accent text-fw-link shadow-sm' : 'text-fw-bodyLight hover:text-fw-body'
        }`}
      >
        Preview
      </button>
      <button
        onClick={() => onChange('ga')}
        className={`px-2.5 py-1 rounded-md text-tag-xs font-semibold uppercase tracking-wider transition-all ${
          phase === 'ga' ? 'bg-fw-successLight text-fw-success shadow-sm' : 'text-fw-bodyLight hover:text-fw-body'
        }`}
      >
        GA
      </button>
    </div>
  );
}

// ─── Flow B Wizard Modal ──────────────────────────────────────────────────────

function FlowBWizard({
  state,
  phase,
  config,
  onConfig,
  onNext,
  onClose,
  onProvision,
  copied,
  onCopy,
}: {
  state: FlowBState;
  phase: FlowPhase;
  config: FlowBConfig;
  onConfig: (patch: Partial<FlowBConfig>) => void;
  onNext: () => void;
  onClose: () => void;
  onProvision: () => void;
  copied: boolean;
  onCopy: () => void;
}) {
  // Modal only renders for active wizard steps
  if (state === 'idle' || state === 'complete' || state === 'expired') return null;

  const STEP_LABELS = ['Connection Setup', 'AWS Account ID', 'Key Generated'];
  const stepIndex = state === 'step1' ? 0 : state === 'step2' ? 1 : 2;
  const metro = GA_METROS.find(m => m.id === config.metro) ?? GA_METROS[0];

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
      onClick={onClose}
    >
      <div
        className="bg-fw-base rounded-2xl max-w-md w-full shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-fw-wash border-b border-fw-secondary">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-fw-primary flex items-center justify-center shrink-0">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-figma-base font-bold text-fw-heading">Create AWS Max Connection</h3>
                <span className="relative group inline-flex items-center cursor-help">
                  <Info className="h-3.5 w-3.5 text-fw-bodyLight" />
                  <span className="absolute left-0 bottom-full mb-1.5 whitespace-nowrap px-2 py-1 rounded-md bg-fw-heading text-fw-base text-figma-xs font-semibold hidden group-hover:block z-50 shadow-lg">
                    Feature Name Pending!
                    <span className="absolute left-2 -bottom-1 w-2 h-2 rotate-45 bg-fw-heading" />
                  </span>
                </span>
              </div>
              <p className="text-figma-xs text-fw-bodyLight">AT&T AI-grade network · 4-path resiliency</p>
            </div>
          </div>
          <div className="flex gap-1">
            {STEP_LABELS.map((label, i) => (
              <div key={i} className="flex-1">
                <div className={`h-1 rounded-full transition-colors ${i <= stepIndex ? 'bg-fw-primary' : 'bg-fw-secondary'}`} />
                <p className={`text-[10px] mt-1 truncate ${i === stepIndex ? 'text-fw-link font-medium' : 'text-fw-bodyLight'}`}>
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Confirm Setup — Preview read-only, GA interactive */}
        {state === 'step1' && phase === 'preview' && (
          <div className="px-6 py-5 space-y-4">
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-fw-accent border border-fw-active/20">
              <span className="mt-0.5 px-1.5 py-0.5 rounded bg-fw-active/10 border border-fw-active/30 text-fw-link text-tag-xs font-semibold uppercase tracking-wider shrink-0">Preview</span>
              <p className="text-figma-xs text-fw-body">Location and bandwidth are pre-configured — read from the API. One input required: AWS account number.</p>
            </div>
            <div className="space-y-2">
              <div className="p-3 rounded-xl border border-fw-secondary bg-fw-wash flex items-center justify-between">
                <div>
                  <p className="text-figma-xs text-fw-bodyLight mb-0.5">Metro</p>
                  <p className="text-figma-sm font-semibold text-fw-heading">San Jose, CA</p>
                  <p className="text-figma-xs text-fw-bodyLight">us-west-1 · 2 diverse datacenter sites</p>
                </div>
                <span className="text-tag-xs text-fw-bodyLight px-1.5 py-0.5 rounded bg-fw-base border border-fw-secondary uppercase tracking-wider font-medium">API</span>
              </div>
              <div className="p-3 rounded-xl border border-fw-secondary bg-fw-wash flex items-center justify-between">
                <div>
                  <p className="text-figma-xs text-fw-bodyLight mb-0.5">Bandwidth</p>
                  <p className="text-figma-sm font-semibold text-fw-heading">1 Gbps × 4 paths</p>
                  <p className="text-figma-xs text-fw-bodyLight">4 Gbps aggregate · fixed during Preview</p>
                </div>
                <span className="text-tag-xs text-fw-bodyLight px-1.5 py-0.5 rounded bg-fw-base border border-fw-secondary uppercase tracking-wider font-medium">API</span>
              </div>
            </div>
          </div>
        )}

        {state === 'step1' && phase === 'ga' && (
          <div className="px-6 py-5 space-y-4">
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-fw-successLight border border-fw-success/20">
              <span className="mt-0.5 px-1.5 py-0.5 rounded bg-fw-successLight border border-fw-success/30 text-fw-success text-tag-xs font-semibold uppercase tracking-wider shrink-0">GA</span>
              <p className="text-figma-xs text-fw-body">Customer chooses location, bandwidth, and AWS account number — 3 inputs. Everything else automated.</p>
            </div>
            <div>
              <p className="text-figma-xs font-medium text-fw-body mb-2">Metro</p>
              <div className="space-y-2">
                {GA_METROS.map(m => (
                  <label
                    key={m.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      config.metro === m.id
                        ? 'border-fw-active bg-fw-accent'
                        : 'border-fw-secondary bg-fw-base hover:border-fw-active/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="metro-ga"
                      value={m.id}
                      checked={config.metro === m.id}
                      onChange={() => onConfig({ metro: m.id })}
                      className="h-4 w-4 text-fw-link border-fw-secondary focus:ring-fw-active"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-figma-base font-medium text-fw-heading">{m.name}</p>
                        <span className="text-tag-xs text-fw-bodyLight font-medium">{m.region}</span>
                      </div>
                      <p className="text-figma-xs text-fw-bodyLight">{m.sites} diverse datacenter sites</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className="text-figma-xs font-medium text-fw-body mb-2">Bandwidth (per path × 4)</p>
              <div className="grid grid-cols-4 gap-1.5">
                {GA_BANDWIDTHS.map(bw => (
                  <button
                    key={bw.mbps}
                    onClick={() => onConfig({ bandwidth: bw.mbps })}
                    className={`p-2 rounded-lg border-2 text-figma-xs font-semibold transition-all ${
                      config.bandwidth === bw.mbps
                        ? 'border-fw-active bg-fw-accent text-fw-link'
                        : 'border-fw-secondary text-fw-body hover:border-fw-active/50'
                    }`}
                  >
                    {bw.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: AWS Account ID */}
        {state === 'step2' && (
          <div className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-figma-xs font-medium text-fw-body mb-1">AWS Account Number</label>
              <input
                type="text"
                value={config.awsAccountId}
                onChange={e => onConfig({ awsAccountId: e.target.value.replace(/\D/g, '').slice(0, 12) })}
                placeholder="123456789012"
                maxLength={12}
                className="w-full h-9 px-3 rounded-lg border border-fw-secondary text-figma-base font-mono text-fw-heading focus:border-fw-active focus:outline-none tracking-wider"
                autoFocus
              />
              <p className="text-figma-xs text-fw-bodyLight mt-1">
                Enter the 12-digit AWS account number for the account this connection will serve. Find it in AWS Console → Account settings.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-fw-wash border border-fw-secondary text-figma-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-fw-bodyLight">Metro</span>
                <span className="font-medium text-fw-heading">{metro.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-fw-bodyLight">Bandwidth</span>
                <span className="font-medium text-fw-heading">{GA_BANDWIDTHS.find(b => b.mbps === config.bandwidth)?.label ?? `${config.bandwidth / 1000} Gbps`} × 4 paths</span>
              </div>
              <div className="flex justify-between">
                <span className="text-fw-bodyLight">Resiliency</span>
                <span className="font-medium text-fw-heading">2 diverse sites</span>
              </div>
              <div className="flex justify-between">
                <span className="text-fw-bodyLight">Est. monthly</span>
                <span className="font-medium text-fw-link">$X,XXX/mo</span>
              </div>
            </div>
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-fw-accent border border-fw-active/20">
              <AlertCircle className="h-3.5 w-3.5 text-fw-link shrink-0 mt-0.5" />
              <p className="text-figma-xs text-fw-body">
                <strong className="text-fw-heading font-semibold">This is a non-reversible action.</strong> AT&T will create a pending connection record and generate your ActivationKey. The connection record exists from this point. Nothing will be provisioned until AWS validates the key.
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Activation Key */}
        {state === 'key' && (
          <div className="px-6 py-5 space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-fw-success" />
              <p className="text-figma-base font-semibold text-fw-heading">ActivationKey Ready</p>
            </div>
            <p className="text-figma-sm text-fw-body">
              AT&T has created a pending connection record in <strong>{metro.name}</strong>.
              Nothing is provisioned yet â paste this key in AWS Interconnect – last mile and AWS will drive automatic feature negotiation across all 4 paths.
            </p>
            <div>
              <p className="text-figma-xs font-medium text-fw-body mb-1.5">Your Activation Key</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0 px-3 py-2 rounded-lg border-2 border-fw-active bg-fw-accent font-mono text-figma-xs text-fw-heading break-all leading-relaxed select-all">
                  {DEMO_KEY}
                </div>
                <button
                  onClick={onCopy}
                  className={`h-10 px-3 rounded-lg border-2 flex items-center gap-1.5 transition-all text-figma-base font-medium whitespace-nowrap ${
                    copied
                      ? 'border-fw-success bg-fw-successLight text-fw-success'
                      : 'border-fw-secondary bg-fw-base text-fw-body hover:border-fw-active hover:text-fw-link'
                  }`}
                >
                  {copied ? <><CheckCircle2 className="h-4 w-4" />Copied</> : <><Copy className="h-4 w-4" />Copy</>}
                </button>
              </div>
              <p className="text-figma-xs text-fw-bodyLight mt-1">Valid 7 days · One-time use</p>
            </div>
            <div className="p-3 rounded-xl bg-fw-wash border border-fw-secondary">
              <p className="text-figma-xs font-semibold text-fw-heading mb-2">Next: take this key to AWS</p>
              <ol className="space-y-1 text-figma-xs text-fw-body">
                <li>1. Open AWS Interconnect Console</li>
                <li>2. Navigate to Create Connection → select AT&T NetBond</li>
                <li>3. Paste the ActivationKey when prompted</li>
                <li>4. AWS validates the key and drives automatic feature negotiation</li>
              </ol>
            </div>
            <a
              href="https://console.aws.amazon.com/directconnect/v2/home#/connections"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full h-10 bg-fw-active text-white rounded-lg hover:bg-fw-ctaPrimaryHover transition-colors font-medium text-figma-sm"
            >
              Open AWS Console
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-fw-secondary bg-fw-wash flex items-center justify-between">
          <button onClick={onClose} className="text-figma-sm text-fw-bodyLight hover:text-fw-body font-medium">
            {state === 'key' ? 'Done' : 'Cancel'}
          </button>
          {state !== 'key' && (
            <button
              onClick={state === 'step2' ? onProvision : onNext}
              disabled={state === 'step2' && config.awsAccountId.length !== 12}
              className="flex items-center gap-1.5 px-4 h-9 bg-fw-primary text-white rounded-full text-figma-base font-medium hover:bg-fw-ctaPrimaryHover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {state === 'step2' ? 'Generate Key' : 'Next'}
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LMCCRequirementsPage() {
  const [activeTab, setActiveTab] = useState<'flows' | 'secondary-assets' | 'validation' | 'strategy' | 'journey'>('flows');
  const [flowAPhase, setFlowAPhase] = useState<FlowPhase>('preview');
  const [flowBPhase, setFlowBPhase] = useState<FlowPhase>('preview');
  const [flowA, setFlowA] = useState<FlowAState>('idle');
  const [flowAKey, setFlowAKey] = useState('');
  const [provisionStep, setProvisionStep] = useState(0);
  const [flowB, setFlowB] = useState<FlowBState>('idle');
  const [flowBConfig, setFlowBConfig] = useState<FlowBConfig>({ metro: 'sj', bandwidth: 1000, awsAccountId: '123456789012' });
  const [keyCopied, setKeyCopied] = useState(false);

  const resetFlowA = () => {
    setFlowA('idle');
    setFlowAKey('');
    setProvisionStep(0);
  };
  const resetFlowB = () => {
    setFlowB('idle');
    setFlowBConfig({ metro: 'sj', bandwidth: 1000, awsAccountId: '123456789012' });
    setKeyCopied(false);
  };

  const handleFlowBCopy = () => {
    const fallback = () => {
      // execCommand fallback for non-HTTPS / denied clipboard permission
      const el = document.createElement('textarea');
      el.value = DEMO_KEY;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      try { document.execCommand('copy'); } catch { /* silent */ }
      document.body.removeChild(el);
    };
    if (navigator.clipboard) {
      navigator.clipboard.writeText(DEMO_KEY).catch(fallback);
    } else {
      fallback();
    }
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 2500);
  };

  const handleFlowAActivate = () => {
    setFlowA('done');
    setProvisionStep(0);
    window.addToast?.({
      type: 'success',
      title: 'Connection Live',
      message: 'AWS Max — San Jose, CA is now live. BGP sessions established across all 4 paths.',
      duration: 4000,
    });
  };

  // Flow A = Flow 04 (AWS-first): customer starts at AWS, gets key, uploads it here
  const flowASteps = [
    'Create connection in AWS Console — receive ActivationKey',
    'Paste key in NetBond® — AT&T validates and confirms with AWS',
    'AT&T drives feature negotiation as Active Provider — all L3 auto-configured',
    'Connection live',
  ];

  // Flow B = Flow 03 (AT&T-first): customer starts here, takes key to AWS
  // Preview: 1 customer input (AWS account number). Location + bandwidth pre-configured via API.
  // GA: 3 customer inputs (location, bandwidth, AWS account number).
  const flowBSteps = [
    'Preview: enter AWS account number — location (San Jose) and bandwidth (1 Gbps) pre-configured. GA adds location + bandwidth selection.',
    'AT&T generates ActivationKey — connection record created',
    'Carry key to AWS Interconnect Console — AWS is Active Provider',
    'BGP sessions form across all 4 paths automatically',
  ];

  // Derive step progress for each flow
  const flowADone = (i: number) =>
    flowA === 'done' ? true
    : flowA === 'provisioning' ? i < 1 + Math.min(provisionStep, 2)
    : flowA === 'validated' ? i < 1
    : false;
  const flowAActive = (i: number) =>
    flowA === 'done' ? false
    : flowA === 'provisioning' ? i === 1 + Math.min(provisionStep, 2)
    : flowA === 'validated' ? i === 1
    : i === 0;

  const flowBDone = (i: number) =>
    (flowB === 'key' || flowB === 'complete' || flowB === 'expired') ? i <= 1
    : flowB === 'step2' ? i < 1
    : false;
  const flowBActive = (i: number) =>
    flowB === 'idle' ? i === 0
    : flowB === 'step1' ? i === 0
    : flowB === 'step2' ? i === 1
    : (flowB === 'key' || flowB === 'complete' || flowB === 'expired') ? i === 2
    : false;

  return (
    <div className="space-y-8">

      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-figma-2xl font-bold text-fw-heading tracking-[-0.04em]">
            LMCC Product Design Assets
          </h1>
          <p className="text-figma-base text-fw-bodyLight mt-1 max-w-xl">
            Preview: one customer input — <strong className="text-fw-body">AWS account number</strong>. Location (San Jose, CA) and bandwidth (1 Gbps) are fixed; both read from the API. AWS Interconnect – last mile solution — 4 independent connection paths using 4 separate edge equipment across 2 data centers. If one path fails, others maintain traffic.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="flex items-center gap-2 text-figma-xs text-fw-bodyLight">
            <div className="w-2 h-2 rounded-full bg-fw-link" />
            Preview Phase · San Jose, CA
          </div>
          <p className="text-figma-xs text-fw-bodyLight">Requires connection provisioning role · checked on every portal entry</p>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex items-center gap-1 border-b border-fw-secondary -mb-2">
        {([
          { id: 'flows', label: 'Interactive Demo' },
          { id: 'secondary-assets', label: 'Secondary Assets' },
          { id: 'validation', label: 'Requirements Validation' },
          { id: 'strategy', label: 'Product Design Strategy' },
          { id: 'journey', label: 'Customer Journey' },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`no-rounded px-4 py-2.5 text-figma-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.id
                ? 'border-fw-primary text-fw-link'
                : 'border-transparent text-fw-bodyLight hover:text-fw-body'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Secondary Assets tab ── */}
      {activeTab === 'secondary-assets' && <SecondaryAssets />}

      {/* ── Requirements Validation tab ── */}
      {activeTab === 'validation' && <RequirementsValidation />}

      {/* ── Product Design Strategy tab ── */}
      {activeTab === 'strategy' && <ProductDesignStrategy />}

      {/* ── Customer Journey tab ── */}
      {activeTab === 'journey' && (
        <div className="mt-4">
          <LmccJourneyMap />
        </div>
      )}

      {/* ── Architecture context (Connection Coordinator API) — flows tab only ── */}
      {activeTab === 'flows' && <>

      <div className="rounded-2xl border border-fw-secondary bg-fw-wash overflow-hidden print-card">
        <div className="px-5 py-3 border-b border-fw-secondary flex items-center gap-2">
          <Network className="h-4 w-4 text-fw-bodyLight" />
          <p className="text-figma-xs font-semibold text-fw-heading uppercase tracking-wider">
            Connection Coordinator API — 4-Stage Activation
          </p>
        </div>
        <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              n: '1',
              label: 'Intent',
              desc: 'One provider creates a connection request and issues an activation key. The other confirms it.',
            },
            {
              n: '2',
              label: 'Negotiate',
              desc: 'L3 parameters — VLAN IDs, IP subnets, MTU — auto-negotiated between AT&T and AWS. No manual BGP config.',
            },
            {
              n: '3',
              label: 'Provision',
              desc: 'Each provider provisions internal resources. Requires ≥3 of 4 features accepted before activation begins.',
            },
            {
              n: '4',
              label: 'Activate',
              desc: 'BGP/BFD sessions enable route exchange. Billing begins when BGP reaches Established (GA — Preview uses manual billing).',
            },
          ].map((stage, i, arr) => (
            <div key={stage.n} className="flex flex-col gap-1.5 relative">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-fw-primary text-white text-tag-xs font-bold flex items-center justify-center shrink-0">
                  {stage.n}
                </div>
                <p className="text-figma-sm font-semibold text-fw-heading">{stage.label}</p>
                {i < arr.length - 1 && (
                  <ArrowRight className="h-3 w-3 text-fw-secondary hidden md:block absolute right-0 top-1.5" />
                )}
              </div>
              <p className="text-figma-xs text-fw-bodyLight leading-relaxed">{stage.desc}</p>
            </div>
          ))}
        </div>
        {/* Status progression — both flows share this from key exchange onward */}
        <div className="px-5 py-3 border-t border-fw-secondary">
          <p className="text-tag-xs text-fw-bodyLight uppercase tracking-wider mb-2">Status progression — both flows share Negotiating Parameters → Live</p>
          <div className="flex items-center gap-1 flex-wrap">
            {['Key Generated', 'Key Accepted', 'Negotiating Parameters', 'BGP Forming', 'Live'].map((s, i, arr) => (
              <div key={s} className="flex items-center gap-1">
                <span className="px-2 py-0.5 rounded-full bg-fw-wash border border-fw-secondary text-figma-xs text-fw-body font-medium whitespace-nowrap">{s}</span>
                {i < arr.length - 1 && <ArrowRight className="h-3 w-3 text-fw-secondary shrink-0" />}
              </div>
            ))}
          </div>
        </div>
        <div className="px-5 py-3 border-t border-fw-secondary grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2">
          {[
            { label: 'Physical connections', value: '4 Hosted (per metro)' },
            { label: 'Failover detection', value: 'BFD 300ms × 3' },
            { label: 'TTP target', value: '<5 min end-to-end' },
          ].map(stat => (
            <div key={stat.label}>
              <p className="text-tag-xs text-fw-bodyLight uppercase tracking-wider">{stat.label}</p>
              <p className="text-figma-xs font-semibold text-fw-heading mt-0.5">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Preview vs GA Deliverables ── */}
      <div className="rounded-2xl border border-fw-secondary bg-fw-base overflow-hidden print-card">
        <div className="px-5 py-3 border-b border-fw-secondary flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-fw-bodyLight" />
          <p className="text-figma-xs font-semibold text-fw-heading uppercase tracking-wider">
            Preview vs GA Deliverables
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-figma-xs">
            <thead>
              <tr className="border-b border-fw-secondary">
                <th className="px-5 py-2.5 text-left font-semibold text-fw-bodyLight uppercase tracking-wider w-1/3">Feature</th>
                <th className="px-5 py-2.5 text-left font-semibold uppercase tracking-wider w-1/3">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-fw-accent text-fw-link text-tag-xs font-medium uppercase tracking-wider">Preview</span>
                    <span className="text-fw-bodyLight font-normal normal-case tracking-normal">June 30, 2026</span>
                  </span>
                </th>
                <th className="px-5 py-2.5 text-left font-semibold uppercase tracking-wider w-1/3">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-fw-successLight text-fw-success text-tag-xs font-medium uppercase tracking-wider">GA</span>
                    <span className="text-fw-bodyLight font-normal normal-case tracking-normal">Nov 16, 2026</span>
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-fw-secondary">
              {[
                {
                  feature: 'Customer inputs',
                  preview: '1 — AWS account number only',
                  ga: '3 — location, bandwidth, AWS account number',
                  previewHighlight: true,
                },
                {
                  feature: 'Operations',
                  preview: 'Create & Delete only',
                  ga: 'Full CRUD (Create, Read, Update, Delete)',
                },
                {
                  feature: 'Bandwidth',
                  preview: 'Fixed 1 Gbps (read from API)',
                  ga: '1, 2, 5, 10, 25, 50, 100 Gbps — API-driven',
                },
                {
                  feature: 'Metros',
                  preview: 'San Jose, CA only',
                  ga: 'San Jose, CA + Ashburn, VA',
                },
                {
                  feature: 'Billing',
                  preview: 'Manual (no automated trigger)',
                  ga: 'Automated — triggers on BGP Established',
                },
                {
                  feature: 'Contracting',
                  preview: 'Trial — NBA flow. No self-service UI.',
                  ga: 'Digital self-service in Business Center',
                },
                {
                  feature: 'Key transfer',
                  preview: 'Manual portal-to-portal copy',
                  ga: 'Manual (automated key handoff is Post-GA)',
                },
              ].map(row => (
                <tr key={row.feature} className="hover:bg-fw-wash/50 transition-colors">
                  <td className="px-5 py-3 font-medium text-fw-heading">{row.feature}</td>
                  <td className="px-5 py-3 text-fw-body">{row.preview}</td>
                  <td className="px-5 py-3 text-fw-body">{row.ga}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-fw-secondary flex items-start gap-2">
          <Info className="h-3.5 w-3.5 text-fw-bodyLight shrink-0 mt-0.5" />
          <p className="text-figma-xs text-fw-bodyLight">
            <strong className="text-fw-body">Design rule (04/21 Design Brief):</strong> Preview design must not require rework at GA. Location and bandwidth are read from the API at all times — only the API responses change when GA infrastructure comes live. No code release required.
          </p>
        </div>
      </div>

      {/* ── Two flow cards ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ══ Flow A: AWS Initiates ══ */}
        <div className="bg-fw-base rounded-2xl border border-fw-secondary overflow-hidden flex flex-col print-card">
          <div className="px-5 py-4 bg-fw-wash border-b border-fw-secondary">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-tag-xs font-medium text-fw-bodyLight uppercase tracking-wider">Flow A</span>
                <PhaseToggle phase={flowAPhase} onChange={p => { setFlowAPhase(p); resetFlowA(); }} />
              </div>
              {flowA !== 'idle' && (
                <button onClick={resetFlowA} className="flex items-center gap-1 text-figma-xs text-fw-bodyLight hover:text-fw-body">
                  <RefreshCw className="h-3 w-3" /> Reset
                </button>
              )}
            </div>
            <h2 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em]">AWS Initiates</h2>
            <p className="text-figma-base text-fw-bodyLight mt-0.5">
              Customer creates connection in AWS Console and receives an ActivationKey. They bring that key to NetBond® — AT&amp;T validates it and drives feature negotiation as the Active Provider.
            </p>
            <div className="mt-3"><JourneyArrow from="AWS Console" to="AT&T NetBond®" /></div>
          </div>

          <div className="px-5 py-4 flex-1 space-y-4">
            <div className="space-y-2.5">
              {flowASteps.map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <StepBadge n={i + 1} active={flowAActive(i)} done={flowADone(i)} />
                  <p className={`text-figma-sm pt-0.5 ${
                    flowADone(i) ? 'text-fw-success line-through decoration-fw-success/40' :
                    flowAActive(i) ? 'text-fw-heading font-medium' : 'text-fw-bodyLight'
                  }`}>{step}</p>
                </div>
              ))}
            </div>

            {/* Key upload UI (idle) */}
            {flowA === 'idle' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-figma-xs font-semibold text-fw-heading uppercase tracking-[0.07em]">
                    ActivationKey from AWS
                  </p>
                  <button
                    onClick={() => setFlowAKey(DEMO_KEY)}
                    className="text-figma-xs text-fw-link hover:underline font-medium"
                  >
                    Use demo key →
                  </button>
                </div>
                {/* Terminal-style paste zone */}
                <div className={`relative rounded-2xl border-2 transition-all duration-200 ${
                  flowAKey.length > 10 && flowAKey.startsWith('ey')
                    ? 'border-fw-active bg-fw-cobalt-100/25'
                    : flowAKey.length > 5 && !flowAKey.startsWith('ey')
                      ? 'border-fw-error bg-red-50/60'
                      : 'border-fw-secondary bg-fw-wash focus-within:border-fw-active/50 focus-within:bg-fw-cobalt-100/10'
                }`}>
                  <textarea
                    rows={3}
                    value={flowAKey}
                    onChange={e => setFlowAKey(e.target.value.trim())}
                    placeholder="eyJzaGFyZWRDb25uZWN0aW9uVXVpZCI6ImxtY2MtZGVtbzAxIiwi…"
                    className="w-full px-4 py-3.5 bg-transparent text-figma-xs font-mono text-fw-heading resize-none focus:outline-none leading-relaxed placeholder-fw-secondary"
                  />
                  {flowAKey.length > 10 && flowAKey.startsWith('ey') && (
                    <div className="absolute right-3 top-3 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-fw-cobalt-100 border border-fw-active/30">
                      <CheckCircle2 className="w-3 h-3 text-fw-link" />
                      <span className="text-figma-xs font-medium text-fw-link">Valid format</span>
                    </div>
                  )}
                  {flowAKey.length > 5 && !flowAKey.startsWith('ey') && (
                    <div className="absolute right-3 top-3 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-100 border border-fw-error/30">
                      <AlertCircle className="w-3 h-3 text-fw-error" />
                      <span className="text-figma-xs font-medium text-fw-error">Unrecognized format</span>
                    </div>
                  )}
                </div>
                <p className="text-figma-xs text-fw-bodyLight">
                  AWS Console → Interconnect – last mile → Connections → select your connection → copy ActivationKey
                </p>
              </div>
            )}

            {/* Decoded key summary */}
            {flowA === 'validated' && (
              <div className="rounded-2xl border border-fw-active/30 bg-fw-cobalt-100/15 overflow-hidden">
                <div className="px-4 py-3 border-b border-fw-active/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-fw-link" />
                    <p className="text-figma-sm font-semibold text-fw-heading">Key decoded</p>
                  </div>
                  <span className="text-figma-xs text-fw-bodyLight font-mono truncate max-w-[140px] opacity-60">
                    {DEMO_KEY.slice(0, 12)}…
                  </span>
                </div>
                <div className="grid grid-cols-2 divide-x divide-y divide-fw-active/10">
                  {([
                    { icon: MapPin, label: 'Location',    value: 'San Jose, CA', sub: 'us-west-1',        mono: false },
                    { icon: Zap,    label: 'Bandwidth',   value: '1 Gbps × 4',  sub: '4 Gbps aggregate', mono: false },
                    { icon: Hash,   label: 'AWS Account', value: '••••••789012', sub: null,               mono: true  },
                    { icon: Clock,  label: 'Key valid',   value: '7 days',       sub: 'from generation',  mono: false },
                  ] as const).map(({ icon: Icon, label, value, sub, mono }) => (
                    <div key={label} className="px-4 py-3.5 flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-md bg-fw-cobalt-100 border border-fw-active/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="w-3 h-3 text-fw-link" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-figma-xs text-fw-bodyLight">{label}</p>
                        <p className={`text-figma-sm font-semibold text-fw-heading leading-snug ${mono ? 'font-mono tracking-wider text-figma-xs' : ''}`}>{value}</p>
                        {sub && <p className="text-figma-xs text-fw-bodyLight">{sub}</p>}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2.5 border-t border-fw-active/20">
                  <p className="text-figma-xs text-fw-bodyLight leading-relaxed">
                    Confirming makes AT&T the Active Provider — BGP, VLANs, and IPs auto-negotiated across all 4 paths. No manual config.
                  </p>
                </div>
              </div>
            )}

            {/* Inline provisioning timeline — replaces LMCCOnboardingDrawer */}
            {flowA === 'provisioning' && (
              <div className="space-y-2">
                {PROVISION_STEPS.map((s, i) => {
                  const done = i < provisionStep;
                  const active = i === provisionStep;
                  const future = i > provisionStep;
                  return (
                    <div
                      key={i}
                      className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                        done   ? 'border-fw-success/40 bg-fw-successLight'
                        : active ? 'border-fw-active bg-fw-accent'
                        : 'border-fw-secondary bg-fw-wash opacity-40'
                      }`}
                    >
                      <StepBadge n={i + 1} active={active} done={done} />
                      <div className="min-w-0">
                        <p className={`text-figma-sm font-semibold ${done ? 'text-fw-success' : active ? 'text-fw-heading' : 'text-fw-bodyLight'}`}>
                          {s.label}
                          {i === 3 && active && (
                            <span className="ml-2 text-tag-xs font-normal text-fw-bodyLight">
                              {flowAPhase === 'preview' ? '· Billing applied manually' : '· Billing started automatically'}
                            </span>
                          )}
                        </p>
                        {!future && <p className="text-figma-xs text-fw-bodyLight mt-0.5 leading-relaxed">{s.desc}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {flowA === 'done' && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-fw-successLight border border-fw-successLight">
                <CheckCircle2 className="h-4 w-4 text-fw-success shrink-0" />
                <p className="text-figma-sm text-fw-success font-medium">
                  Connection active · BGP establishing across 4 paths
                </p>
              </div>
            )}

            {flowA === 'deferred' && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-fw-accent border border-fw-active/20">
                <Clock className="h-4 w-4 text-fw-link shrink-0 mt-0.5" />
                <div>
                  <p className="text-figma-sm font-semibold text-fw-heading">Setup paused</p>
                  <p className="text-figma-xs text-fw-body mt-0.5">
                    Your 4 hosted connections are still pending acceptance in AWS.
                    AWS will auto-delete them after <strong>90 days</strong> of inactivity.
                  </p>
                  <p className="text-figma-xs text-fw-bodyLight mt-1">
                    Resume within 7 days — activation key validity is governed by <code className="text-figma-xs bg-fw-wash px-1 rounded">deferralTimeoutHours</code> (168 hrs).
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="px-5 py-4 border-t border-fw-secondary print:hidden">
            {flowA === 'idle' && (
              <button
                onClick={() => setFlowA('validated')}
                disabled={flowAKey.length < 10}
                className="w-full flex items-center justify-center gap-2 h-10 bg-fw-primary text-white rounded-full text-figma-base font-medium hover:bg-fw-ctaPrimaryHover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            )}
            {flowA === 'validated' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={resetFlowA}
                    className="h-10 px-4 rounded-full border border-fw-secondary text-fw-bodyLight hover:text-fw-body text-figma-base font-medium transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => { setFlowA('provisioning'); setProvisionStep(0); }}
                    className="flex-1 flex items-center justify-center gap-2 h-10 bg-fw-heading text-white rounded-full text-figma-base font-semibold hover:opacity-90 transition-opacity"
                  >
                    <ShieldCheck className="h-4 w-4 opacity-80" />
                    Confirm
                  </button>
                </div>
                <p className="text-center">
                  <button
                    onClick={() => setFlowA('deferred')}
                    className="text-figma-xs text-fw-bodyLight hover:text-fw-body"
                  >
                    Defer — set up later
                  </button>
                </p>
              </div>
            )}
            {flowA === 'provisioning' && provisionStep < 3 && (
              <button
                onClick={() => setProvisionStep(s => s + 1)}
                className="w-full flex items-center justify-center gap-2 h-10 bg-fw-primary text-white rounded-full text-figma-base font-medium hover:bg-fw-ctaPrimaryHover transition-colors"
              >
                Advance → Step {provisionStep + 2}
              </button>
            )}
            {flowA === 'provisioning' && provisionStep === 3 && (
              <button
                onClick={handleFlowAActivate}
                className="w-full flex items-center justify-center gap-2 h-10 bg-fw-success text-white rounded-full text-figma-base font-semibold hover:opacity-90 transition-opacity"
              >
                <CheckCircle2 className="h-4 w-4" />
                Connection Live ✓
              </button>
            )}
            {flowA === 'done' && (
              <p className="text-figma-xs text-fw-bodyLight text-center">
                Flow A complete ·{' '}
                <button onClick={resetFlowA} className="text-fw-link hover:underline">
                  Reset
                </button>
              </p>
            )}
            {flowA === 'deferred' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFlowA('validated')}
                  className="flex-1 flex items-center justify-center gap-2 h-10 bg-fw-primary text-white rounded-full text-figma-base font-medium hover:bg-fw-ctaPrimaryHover transition-colors"
                >
                  Resume Setup <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={resetFlowA}
                  className="h-10 px-4 rounded-full border border-fw-secondary text-fw-bodyLight hover:text-fw-body text-figma-base font-medium transition-colors"
                >
                  Reset
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ══ Flow B: AT&T Initiates ══ */}
        <div className="bg-fw-base rounded-2xl border border-fw-secondary overflow-hidden flex flex-col print-card">
          <div className="px-5 py-4 bg-fw-wash border-b border-fw-secondary">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-tag-xs font-medium text-fw-bodyLight uppercase tracking-wider">Flow B</span>
                <PhaseToggle phase={flowBPhase} onChange={p => { setFlowBPhase(p); resetFlowB(); }} />
              </div>
              {flowB !== 'idle' && (
                <button onClick={resetFlowB} className="flex items-center gap-1 text-figma-xs text-fw-bodyLight hover:text-fw-body">
                  <RefreshCw className="h-3 w-3" /> Reset
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <h2 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em]">AT&T Initiates</h2>
              <span className="relative group inline-flex items-center cursor-help">
                <Info className="h-3.5 w-3.5 text-fw-bodyLight" />
                <span className="absolute left-0 bottom-full mb-1.5 whitespace-nowrap px-2 py-1 rounded-md bg-fw-heading text-fw-base text-figma-xs font-semibold hidden group-hover:block z-50 shadow-lg">
                  Feature Name Pending!
                  <span className="absolute left-2 -bottom-1 w-2 h-2 rotate-45 bg-fw-heading" />
                </span>
              </span>
            </div>
            <p className="text-figma-base text-fw-bodyLight mt-0.5">
              Customer creates the connection in NetBond® and receives an ActivationKey. They take that key to AWS Console — AWS validates it and drives feature negotiation as the Active Provider.
            </p>
            <div className="mt-3"><JourneyArrow from="AT&T NetBond®" to="AWS Console" /></div>
          </div>

          <div className="px-5 py-4 flex-1 space-y-4">
            <div className="space-y-2.5">
              {flowBSteps.map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <StepBadge n={i + 1} active={flowBActive(i)} done={flowBDone(i)} />
                  <p className={`text-figma-sm pt-0.5 ${
                    flowBDone(i) ? 'text-fw-success line-through decoration-fw-success/40' :
                    flowBActive(i) ? 'text-fw-heading font-medium' : 'text-fw-bodyLight'
                  }`}>{step}</p>
                </div>
              ))}
            </div>

            {flowB === 'idle' && (
              <div className="p-4 rounded-xl bg-fw-wash border border-fw-secondary flex items-start gap-3">
                <ClipboardList className="h-4 w-4 text-fw-bodyLight mt-0.5 shrink-0" />
                <p className="text-figma-xs text-fw-bodyLight">
                  Click <strong className="text-fw-body">Create Connection</strong> to walk through the wizard.
                  AT&T will create a pending connection record and generate an ActivationKey. Nothing will be provisioned until AWS validates the key.
                </p>
              </div>
            )}

            {/* Key display (after wizard reaches key step, persists after modal closes) */}
            {(flowB === 'key' || flowB === 'complete') && (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-fw-accent border border-fw-active/30">
                  <p className="text-figma-xs font-medium text-fw-body mb-2">Generated Activation Key</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-fw-active bg-fw-base font-mono text-figma-xs text-fw-heading break-all leading-relaxed select-all">
                      {DEMO_KEY}
                    </div>
                    <button
                      onClick={handleFlowBCopy}
                      className={`h-9 px-3 rounded-lg border flex items-center gap-1 text-figma-xs font-medium whitespace-nowrap transition-all ${
                        keyCopied
                          ? 'border-fw-success bg-fw-successLight text-fw-success'
                          : 'border-fw-secondary text-fw-body hover:border-fw-active hover:text-fw-link'
                      }`}
                    >
                      {keyCopied ? <><CheckCircle2 className="h-3.5 w-3.5" />Copied</> : <><Copy className="h-3.5 w-3.5" />Copy</>}
                    </button>
                  </div>
                  <p className="text-figma-xs text-fw-bodyLight mt-1.5">Valid 7 days · Paste in AWS Interconnect Console</p>
                </div>
                <a
                  href="https://console.aws.amazon.com/directconnect/v2/home#/connections"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full h-9 border border-fw-active text-fw-link rounded-lg hover:bg-fw-accent transition-colors font-medium text-figma-sm"
                >
                  Open AWS Interconnect Console <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            )}

            {/* Expired key display */}
            {flowB === 'expired' && (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-fw-errorLight border border-fw-error/30">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-figma-xs font-medium text-fw-body">Activation Key</p>
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-fw-error text-white text-tag-xs font-medium uppercase tracking-wider">
                      <XCircle className="h-3 w-3" /> Expired
                    </span>
                  </div>
                  <div className="h-9 px-3 flex items-center rounded-lg border border-fw-error/20 bg-fw-base font-mono text-figma-xs text-fw-bodyLight line-through opacity-60 select-none overflow-hidden truncate">
                    {DEMO_KEY}
                  </div>
                  <p className="text-figma-xs text-fw-error mt-1.5">
                    Key expired after 7 days. The 4 hosted connections remain in AWS pending state until accepted or auto-deleted at 90 days.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-fw-wash border border-fw-secondary">
                  <p className="text-figma-xs font-semibold text-fw-heading mb-1">What happens next?</p>
                  <p className="text-figma-xs text-fw-bodyLight">
                    AT&T regenerates a new activation key. The same hosted connection IDs are reused — no new provisioning needed unless the 90-day AWS deadline passes first.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="px-5 py-4 border-t border-fw-secondary print:hidden">
            {flowB === 'idle' && (
              <button
                onClick={() => setFlowB('step1')}
                className="w-full flex items-center justify-center gap-2 h-10 bg-fw-primary text-white rounded-full text-figma-base font-medium hover:bg-fw-ctaPrimaryHover transition-colors"
              >
                Create Connection <ArrowRight className="h-4 w-4" />
              </button>
            )}
            {(flowB === 'step1' || flowB === 'step2') && (
              <div className="flex items-center justify-between text-figma-xs">
                <span className="text-fw-bodyLight">Wizard open…</span>
                <button onClick={resetFlowB} className="text-fw-error hover:underline">Cancel</button>
              </div>
            )}
            {(flowB === 'key' || flowB === 'complete') && (
              <div className="flex items-center justify-between">
                <p className="text-figma-xs text-fw-bodyLight">Awaiting AWS acceptance</p>
                <button
                  onClick={() => setFlowB('expired')}
                  className="text-figma-xs text-fw-error hover:underline font-medium"
                >
                  Simulate Key Expiry →
                </button>
              </div>
            )}
            {flowB === 'expired' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFlowB('key')}
                  className="flex-1 flex items-center justify-center gap-2 h-10 bg-fw-primary text-white rounded-full text-figma-base font-medium hover:bg-fw-ctaPrimaryHover transition-colors"
                >
                  <RotateCcw className="h-4 w-4" /> Regenerate Key
                </button>
                <button
                  onClick={resetFlowB}
                  className="h-10 px-4 rounded-full border border-fw-secondary text-fw-bodyLight hover:text-fw-body text-figma-base font-medium transition-colors"
                >
                  Reset
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Deployment roadmap ── */}
      <div className="rounded-2xl border border-fw-secondary bg-fw-base overflow-hidden print-card">
        <div className="px-5 py-3 border-b border-fw-secondary">
          <p className="text-figma-xs font-semibold text-fw-heading uppercase tracking-wider">Deployment Roadmap</p>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-fw-secondary bg-fw-wash space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-fw-accent text-fw-link text-tag-xs font-medium uppercase tracking-wider">Preview</span>
              <span className="text-figma-xs text-fw-bodyLight font-medium">June 30, 2026</span>
            </div>
            <ul className="space-y-1 text-figma-xs text-fw-body">
              <li>Create &amp; Delete only · Fixed 1 Gbps bandwidth</li>
              <li><strong>San Jose, CA</strong> — 2 diverse datacenter sites</li>
              <li className="text-fw-bodyLight">Los Angeles, CA — infrastructure pending (fiber installation in progress)</li>
              <li>Internet + MPLS transport · Trial contracts · Manual billing</li>
              <li>TTP target: &lt;5 min end-to-end</li>
            </ul>
          </div>
          <div className="p-4 rounded-xl border border-fw-secondary bg-fw-wash space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-fw-successLight text-fw-success text-tag-xs font-medium uppercase tracking-wider">GA</span>
              <span className="text-figma-xs text-fw-bodyLight font-medium">November 16, 2026</span>
            </div>
            <ul className="space-y-1 text-figma-xs text-fw-body">
              <li>Full CRUD · 1 Gbps – 100 Gbps per path (1 / 2 / 5 / 10 / 25 / 50 / 100 Gbps)</li>
              <li><strong>San Jose, CA</strong> + <strong>Ashburn, VA</strong> — expanded metro coverage</li>
              <li>Internet + MPLS + Ethernet transport · Digital self-service contracts (Business Center)</li>
              <li>Automated billing — trigger: BGP Established · RSVP capacity reservation on activation keys</li>
              <li className="text-fw-bodyLight">LA connections migrate seamlessly — make-before-break, zero downtime</li>
            </ul>
          </div>
          <div className="md:col-span-2 p-3 rounded-xl border border-fw-secondary bg-fw-wash flex items-start gap-2">
            <Zap className="h-3.5 w-3.5 text-fw-bodyLight shrink-0 mt-0.5" />
            <p className="text-figma-xs text-fw-bodyLight">
              <strong className="text-fw-body">Post-GA (EPIC 08):</strong> Automated ActivationKey handoff eliminates the manual portal-to-portal key transfer entirely. Customers will no longer copy-paste keys between AWS Console and the AI-grade network.
            </p>
          </div>
        </div>
        <div className="px-5 py-3 border-t border-fw-secondary flex items-center gap-4 text-figma-xs text-fw-bodyLight">
          <span>Sources:</span>
          <a href="https://github.com/aws/Interconnect/tree/main/connection-coordinator/docs" target="_blank" rel="noopener noreferrer" className="text-fw-link hover:underline flex items-center gap-1">
            AWS Connection Coordinator API <ExternalLink className="h-3 w-3" />
          </a>
          <span>·</span>
          <span>AT&amp;T LMCC Product Brief (lmcc-product-brief.md)</span>
        </div>
      </div>

      </>}

      {/* ── Flow B wizard ── */}
      <FlowBWizard
        state={flowB}
        phase={flowBPhase}
        config={flowBConfig}
        onConfig={patch => setFlowBConfig(prev => ({ ...prev, ...patch }))}
        onNext={() => setFlowB(flowB === 'step1' ? 'step2' : 'key')}
        onClose={flowB === 'key' ? () => setFlowB('complete') : resetFlowB}
        onProvision={() => setFlowB('key')}
        copied={keyCopied}
        onCopy={handleFlowBCopy}
      />
    </div>
  );
}
