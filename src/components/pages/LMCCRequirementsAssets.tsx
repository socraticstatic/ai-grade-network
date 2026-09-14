import { useState } from 'react';
import { AlertCircle, Clock, XCircle, CheckCircle2, Mail, ArrowRight, Copy, ExternalLink, MapPin, Gauge, Network, Phone, Square, ClipboardCheck, UserX, ServerOff, RefreshCw, Target, Layers, Globe, GitBranch, Milestone, Lightbulb, ShieldCheck, Key, Zap, BarChart3, Store, Users, FlaskConical } from 'lucide-react';

// ─── Error Banners ────────────────────────────────────────────────────────────

interface ErrorBannerProps {
  type: 'no-capacity' | 'negotiation-failed' | 'timeout';
  connectionName?: string;
  caseRef?: string;
}

function ErrorBanner({
  type,
  connectionName = 'AI-grade network — San Jose, CA',
  caseRef = 'ATT-20260506-84291',
}: ErrorBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return (
      <div className="flex items-center justify-center h-12 rounded-xl border border-fw-secondary bg-fw-wash">
        <span className="text-figma-xs text-fw-body">Dismissed</span>
        <button onClick={() => setDismissed(false)} className="ml-3 text-figma-xs text-fw-link hover:underline">Show again</button>
      </div>
    );
  }

  if (type === 'no-capacity') {
    return (
      <div className="rounded-xl border border-fw-error/40 bg-fw-errorLight/10 overflow-hidden">
        <div className="px-5 py-4 flex items-start gap-4">
          <div className="shrink-0 mt-0.5 w-9 h-9 rounded-xl bg-fw-errorLight border border-fw-error/20 flex items-center justify-center">
            <XCircle className="h-5 w-5 text-fw-error" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-figma-sm font-semibold text-fw-heading leading-snug">Connection cannot be completed at this location</p>
            <p className="text-figma-sm text-fw-body mt-1 leading-relaxed">
              No capacity is available at this location. At GA (San Jose, CA or Ashburn, VA), try a different location. Contact AT&T for assistance.
            </p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-fw-wash border border-fw-secondary text-figma-xs font-mono text-fw-bodyLight">{connectionName}</span>
              <span className="text-figma-xs text-fw-body">⚠ Exact copy TBD with AT&T product team. Preview has San Jose only — no alternate location.</span>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2 mt-0.5">
            <button className="px-3 py-1.5 rounded-lg bg-fw-wash border border-fw-secondary text-figma-xs font-semibold text-fw-body hover:bg-fw-secondary transition-colors whitespace-nowrap">
              Contact AT&T
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="p-1.5 rounded-lg text-fw-disabled hover:text-fw-bodyLight hover:bg-fw-wash transition-colors"
              aria-label="Dismiss"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'negotiation-failed') {
    return (
      <div className="rounded-xl border border-fw-error/40 bg-fw-errorLight/10 overflow-hidden">
        <div className="px-5 py-4 flex items-start gap-4">
          <div className="shrink-0 mt-0.5 w-9 h-9 rounded-xl bg-fw-errorLight border border-fw-error/20 flex items-center justify-center">
            <AlertCircle className="h-5 w-5 text-fw-error" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-figma-sm font-semibold text-fw-heading leading-snug">Technical setup failed. AT&T will investigate.</p>
            <p className="text-figma-sm text-fw-body mt-1 leading-relaxed">
              The connection could not be completed due to a technical error. AT&T has been notified and will investigate. Your connection record has been cleaned up automatically.
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-fw-wash border border-fw-secondary text-figma-xs font-mono text-fw-bodyLight">{connectionName}</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-fw-wash border border-fw-secondary text-figma-xs font-mono text-fw-bodyLight">Case {caseRef}</span>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2 mt-0.5">
            <button className="px-3 py-1.5 rounded-lg bg-fw-wash border border-fw-secondary text-figma-xs font-semibold text-fw-body hover:bg-fw-secondary transition-colors whitespace-nowrap">
              View case
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="p-1.5 rounded-lg text-fw-disabled hover:text-fw-bodyLight hover:bg-fw-wash transition-colors"
              aria-label="Dismiss"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // timeout
  return (
    <div className="rounded-xl border border-fw-secondary bg-fw-wash/40 overflow-hidden">
      <div className="px-5 py-4 flex items-start gap-4">
        <div className="shrink-0 mt-0.5 w-9 h-9 rounded-xl bg-fw-wash border border-fw-secondary flex items-center justify-center">
          <Clock className="h-5 w-5 text-fw-bodyLight" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-figma-sm font-semibold text-fw-heading leading-snug">Connection is taking longer than expected. AT&T is investigating.</p>
          <p className="text-figma-sm text-fw-body mt-1 leading-relaxed">
            Connection is taking longer than expected. AT&T is investigating. You will receive a notification when the status changes.
          </p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-fw-wash border border-fw-secondary text-figma-xs font-mono text-fw-bodyLight">{connectionName}</span>
            <span className="text-figma-xs text-fw-body">⚠ Timeout window TBD with AT&T engineering.</span>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2 mt-0.5">
          <button className="px-3 py-1.5 rounded-lg bg-fw-wash border border-fw-secondary text-figma-xs font-semibold text-fw-body hover:bg-fw-secondary transition-colors whitespace-nowrap">
            Contact AT&T
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 rounded-lg text-fw-disabled hover:text-fw-bodyLight hover:bg-fw-wash transition-colors"
            aria-label="Dismiss"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Email Preview ────────────────────────────────────────────────────────────

interface EmailPreviewProps {
  metro?: string;
  bandwidth?: string;
  attEmail?: string;
  activatedAt?: string;
}

function EmailPreview({
  metro = 'San Jose, CA',
  bandwidth = '1 Gbps',
  attEmail = 'network.ops@company.com',
  activatedAt = 'May 6, 2026 at 9:42 AM CDT',
}: EmailPreviewProps) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="rounded-xl border border-fw-secondary overflow-hidden bg-fw-wash">
      {/* Email client chrome */}
      <div className="px-4 py-3 bg-fw-base border-b border-fw-secondary flex items-center gap-3">
        <Mail className="h-4 w-4 text-fw-bodyLight shrink-0" />
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-center gap-2 text-figma-xs text-fw-bodyLight">
            <span className="font-medium text-fw-body">From:</span>
            <span>AT&T AI-grade network &lt;noreply@netbond.att.com&gt;</span>
          </div>
          <div className="flex items-center gap-2 text-figma-xs text-fw-bodyLight">
            <span className="font-medium text-fw-body">Subject:</span>
            <span className="font-medium text-fw-heading">Your AT&T AI-grade network connection is live — {metro}</span>
          </div>
        </div>
        <button
          onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-fw-secondary text-figma-xs text-fw-bodyLight hover:text-fw-body hover:border-fw-active/40 transition-colors shrink-0"
        >
          <Copy className="h-3 w-3" />
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      {/* Email body */}
      <div style={{ backgroundColor: '#eef0f3' }}>
        <div className="max-w-xl mx-auto py-6 px-4">
          <div className="rounded-2xl overflow-hidden shadow-sm border border-black/5 bg-white">

            {/* Header */}
            <div className="bg-white px-8 pt-7 pb-0 border-b border-gray-100">
              {/* Logo row */}
              <div className="flex items-center gap-3 mb-6">
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/0/05/AT%26T_Globe_2016.svg"
                  alt="AT&T"
                  className="h-8 w-8 object-contain shrink-0"
                />
                <div className="flex items-baseline gap-2 min-w-0">
                  <span className="text-[22px] font-bold tracking-[-0.03em] leading-none shrink-0" style={{ color: '#009fdb' }}>AT&T</span>
                  <span className="text-[22px] font-semibold text-gray-800 tracking-[-0.02em] leading-none whitespace-nowrap">
                    AI-grade network
                  </span>
                </div>
              </div>

              {/* Status band */}
              <div className="flex items-center gap-4 py-5 border-t border-gray-100">
                <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(0,159,219,0.1)' }}>
                  <CheckCircle2 className="h-6 w-6" style={{ color: '#009fdb' }} />
                </div>
                <div className="min-w-0">
                  <p className="text-gray-900 text-figma-lg font-bold leading-tight tracking-[-0.02em] whitespace-nowrap">Your connection is live.</p>
                  <p className="mt-0.5 text-figma-sm text-gray-500 font-medium">{activatedAt}</p>
                </div>
                <div className="ml-auto shrink-0">
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-figma-sm font-semibold text-white whitespace-nowrap" style={{ backgroundColor: '#009fdb' }}>
                    <span className="w-2 h-2 rounded-full bg-white/80 shrink-0" />
                    All 4 paths active
                  </span>
                </div>
              </div>
            </div>

            {/* Cobalt accent strip */}
            <div className="h-[3px]" style={{ backgroundColor: '#009fdb' }} />

            {/* Body */}
            <div className="px-8 py-7 space-y-6">
              <p className="text-figma-base text-gray-700 leading-relaxed">
                All 4 paths across <strong className="text-gray-900 font-bold">{metro}</strong> are confirmed by AT&T and AWS. Your connection is carrying traffic.
              </p>

              {/* Connection summary */}
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-200" style={{ backgroundColor: '#f8f9fb' }}>
                  <p className="text-figma-xs font-bold text-gray-600 uppercase tracking-widest">Connection Summary</p>
                </div>
                <div className="divide-y divide-gray-100">
                  {[
                    { icon: MapPin, label: 'Metro', value: metro },
                    { icon: Gauge, label: 'Bandwidth', value: `${bandwidth} × 4 paths` },
                    { icon: Network, label: 'AT&T Account Email', value: attEmail, mono: false },
                    { icon: Network, label: 'Transport', value: 'MPLS' },
                  ].map(({ icon: Icon, label, value, mono }) => (
                    <div key={label} className="px-5 py-3.5 flex items-center gap-3">
                      <Icon className="h-4 w-4 text-gray-400 shrink-0" />
                      <span className="text-figma-sm text-gray-500 w-32 shrink-0 font-semibold">{label}</span>
                      <span className={`text-figma-sm font-bold text-gray-900 ${mono ? 'font-mono tracking-wide' : ''}`}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div className="flex justify-center pt-1">
                <a
                  href="/manage"
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-white text-figma-base font-bold"
                  style={{ backgroundColor: '#009fdb' }}
                >
                  View connection in the AI-grade network
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>

              {/* What happens next */}
              <div className="rounded-xl px-6 py-5" style={{ backgroundColor: '#f0f6ff', border: '1px solid #c5deff' }}>
                <p className="text-figma-xs font-bold text-gray-700 uppercase tracking-widest mb-3">What happens next</p>
                <ul className="text-figma-sm text-gray-700 space-y-2 list-disc list-inside leading-relaxed font-medium">
                  <li>Traffic is routing across all 4 paths now</li>
                  <li>Billing begins from {activatedAt}</li>
                  <li>Preview: fixed-rate billing — AT&T will contact you with invoice details</li>
                  <li>GA (November 16, 2026): billing triggers automatically at BGP Established</li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-5 border-t border-gray-200 space-y-2.5" style={{ backgroundColor: '#f8f9fb' }}>
              <div className="flex items-center gap-4 text-figma-sm text-gray-500 font-medium">
                <a href="/manage" className="hover:text-gray-800 hover:underline flex items-center gap-1.5 transition-colors">
                  <ExternalLink className="h-3.5 w-3.5" />
                  AI-grade network
                </a>
                <a href="tel:18002220300" className="hover:text-gray-800 hover:underline flex items-center gap-1.5 transition-colors">
                  <Phone className="h-3.5 w-3.5" />
                  1-800-222-0300
                </a>
              </div>
              <p className="text-figma-xs text-gray-500 leading-relaxed">
                This message was sent because you hold a connection provisioning role on AT&T Business Center. AT&T Inc. · One AT&T Plaza · Dallas, TX 75202.
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Key Upload Error Designs (Flow 04 only) ─────────────────────────────────

type KeyUploadErrorType = 'invalid-format' | 'not-recognised' | 'already-used' | 'expired' | 'wrong-account';

const KEY_ERROR_SPECS: Record<KeyUploadErrorType, {
  title: string;
  body: string;
  displayType: 'Inline field error' | 'Full-screen error';
  securityNote?: string;
  showExpiry?: boolean;
  action?: { label: string; external?: boolean };
}> = {
  'invalid-format': {
    title: 'Invalid key format',
    body: "Check that you copied the complete key from AWS. Try again.",
    displayType: 'Inline field error',
  },
  'not-recognised': {
    title: 'Key not recognised',
    body: 'AWS could not validate this key. It may have been cancelled or generated for a different provider. Return to the AWS portal and generate a new key.',
    displayType: 'Full-screen error',
    securityNote: 'Security event — logged by the system and triggers a SIEM alert.',
    action: { label: 'Open AWS Interconnect – last mile', external: true },
  },
  'already-used': {
    title: 'Key already used',
    body: 'This key has already been used to activate a connection. If the connection was already created, find it in your connections list. Otherwise raise a support request.',
    displayType: 'Full-screen error',
    action: { label: 'View your connections', external: false },
  },
  'expired': {
    title: 'Key expired',
    body: 'ActivationKeys are valid for 7 days. This key has expired. Return to the AWS portal or AT&T portal and generate a new key.',
    displayType: 'Full-screen error',
    showExpiry: true,
    action: { label: 'Open AWS Interconnect – last mile', external: true },
  },
  'wrong-account': {
    title: 'Wrong account',
    body: 'This key was generated for a different AWS account. Confirm you are signed in to the correct account, or return to AWS and generate a new key.',
    displayType: 'Full-screen error',
    securityNote: 'Do NOT show the account ID from the key — security risk.',
  },
};

const DEMO_EXPIRY_DATE = 'May 1, 2026'; // 6 days before current demo date

function KeyUploadErrorCard({ type }: { type: KeyUploadErrorType }) {
  const spec = KEY_ERROR_SPECS[type];

  return (
    <div className="rounded-xl border border-fw-secondary overflow-hidden bg-fw-base">
      {/* Spec badge row */}
      <div className="px-4 py-2.5 bg-fw-wash border-b border-fw-secondary flex items-center gap-2 flex-wrap">
        <span className="px-2 py-0.5 rounded bg-fw-wash border border-fw-secondary text-figma-xs font-mono text-fw-bodyLight">Flow 04 only</span>
        <span className={`px-2 py-0.5 rounded text-tag-xs font-semibold uppercase tracking-wider ${
          spec.displayType === 'Inline field error'
            ? 'bg-fw-accent text-fw-link border border-fw-active/20'
            : 'bg-fw-errorLight text-fw-error border border-fw-error/20'
        }`}>
          {spec.displayType}
        </span>
        {spec.securityNote && (
          <span className="px-2 py-0.5 rounded bg-fw-errorLight text-fw-error border border-fw-error/20 text-tag-xs font-semibold uppercase tracking-wider">
            Security event
          </span>
        )}
      </div>

      {/* Inline field error design */}
      {type === 'invalid-format' && (
        <div className="px-5 py-5 space-y-3">
          <div>
            <label className="text-figma-xs font-medium text-fw-body block mb-1.5">ActivationKey from AWS</label>
            <div className="px-3 py-2.5 rounded-lg border-2 border-fw-error bg-fw-errorLight font-mono text-figma-xs text-fw-body leading-relaxed overflow-hidden text-ellipsis whitespace-nowrap">
              eyJpbnZhbGlkIjoiZm9ybWF0IiwibWlzc2luZyI6InJlcXVpcmVkRmllbGRzIn0K…
            </div>
            <div className="flex items-start gap-2 mt-2">
              <AlertCircle className="h-3.5 w-3.5 text-fw-error shrink-0 mt-0.5" />
              <p className="text-figma-xs text-fw-error">{spec.body}</p>
            </div>
          </div>
        </div>
      )}

      {/* Full-screen error design */}
      {type !== 'invalid-format' && (
        <div className="px-5 py-8 flex flex-col items-center text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-fw-errorLight flex items-center justify-center">
            <AlertCircle className="h-7 w-7 text-fw-error" />
          </div>
          <div className="max-w-sm space-y-2">
            <h3 className="text-figma-base font-bold text-fw-heading">{spec.title}</h3>
            <p className="text-figma-sm text-fw-body leading-relaxed">{spec.body}</p>
            {spec.showExpiry && (
              <p className="text-figma-xs text-fw-body">
                Key expired: <span className="font-mono font-semibold text-fw-heading">{DEMO_EXPIRY_DATE}</span>
              </p>
            )}
            {spec.securityNote && (
              <p className="text-figma-xs text-fw-error font-medium mt-1">{spec.securityNote}</p>
            )}
          </div>
          {spec.action && (
            <button className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-fw-primary text-white text-figma-sm font-semibold hover:bg-fw-ctaPrimaryHover transition-colors">
              {spec.action.label}
              {spec.action.external && <ExternalLink className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Access & Privilege Gate Designs ──────────────────────────────────────────

function NoRoleCard() {
  return (
    <div className="rounded-xl border border-fw-secondary overflow-hidden bg-fw-base">
      <div className="px-4 py-2.5 bg-fw-wash border-b border-fw-secondary flex items-center gap-2 flex-wrap">
        <span className="px-2 py-0.5 rounded bg-fw-wash border border-fw-secondary text-figma-xs font-mono text-fw-bodyLight">Both flows</span>
        <span className="px-2 py-0.5 rounded bg-fw-errorLight text-fw-error border border-fw-error/20 text-tag-xs font-semibold uppercase tracking-wider">Portal entry blocker</span>
        <span className="px-2 py-0.5 rounded bg-fw-wash border border-fw-secondary text-figma-xs text-fw-bodyLight">Runs on every entry — not a one-time check</span>
      </div>
      <div className="px-5 py-8 flex flex-col items-center text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-fw-errorLight flex items-center justify-center">
          <UserX className="h-7 w-7 text-fw-error" />
        </div>
        <div className="max-w-sm space-y-2">
          <h3 className="text-figma-base font-bold text-fw-heading">Connection provisioning role required</h3>
          <p className="text-figma-sm text-fw-body leading-relaxed">
            Your account doesn't have the <strong className="text-fw-heading font-semibold">connection provisioning role</strong> needed to create or manage connections.
            Contact your AT&T account administrator to request access.
          </p>
          <p className="text-figma-xs text-fw-body">Access is completely blocked until the role is assigned. There is no workaround.</p>
        </div>
        <button className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-fw-primary text-white text-figma-sm font-semibold hover:bg-fw-ctaPrimaryHover transition-colors">
          Go to account management
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function BCUnavailableCard() {
  return (
    <div className="rounded-xl border border-fw-secondary overflow-hidden bg-fw-base">
      <div className="px-4 py-2.5 bg-fw-wash border-b border-fw-secondary flex items-center gap-2 flex-wrap">
        <span className="px-2 py-0.5 rounded bg-fw-wash border border-fw-secondary text-figma-xs font-mono text-fw-bodyLight">Both flows</span>
        <span className="px-2 py-0.5 rounded bg-fw-accent text-fw-link border border-fw-active/20 text-tag-xs font-semibold uppercase tracking-wider">Graceful degradation</span>
        <span className="px-2 py-0.5 rounded bg-fw-errorLight text-fw-error border border-fw-error/20 text-tag-xs font-semibold uppercase tracking-wider">TBD — AT&T engineering</span>
      </div>
      <div className="px-5 py-8 flex flex-col items-center text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-fw-accent flex items-center justify-center">
          <ServerOff className="h-7 w-7 text-fw-link" />
        </div>
        <div className="max-w-sm space-y-2">
          <h3 className="text-figma-base font-bold text-fw-heading">AT&T Business Center is temporarily unavailable</h3>
          <p className="text-figma-sm text-fw-body leading-relaxed">
            We're unable to verify your account status right now. Please try again in a few minutes.
            If the issue continues, contact AT&T support.
          </p>
          <p className="text-figma-xs text-fw-body">Exact fallback behavior TBD with AT&T engineering. Must not show a blank screen or generic error.</p>
        </div>
        <button className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-fw-wash border border-fw-secondary text-fw-body text-figma-sm font-semibold hover:bg-fw-secondary transition-colors">
          <RefreshCw className="h-3.5 w-3.5" />
          Try again
        </button>
      </div>
    </div>
  );
}

// ─── Error State Gaps Callout ─────────────────────────────────────────────────

const ERROR_GAPS = [
  {
    id: 'gap-01',
    flow: 'Flow 03 (AT&T-first)',
    title: 'Key expired — customer generated key but never went to AWS within 7 days',
    note: 'Portal status screen still shows "Key Generated." What does the customer see? No state defined in either source document.',
  },
  {
    id: 'gap-02',
    flow: 'Flow 03 (AT&T-first)',
    title: 'keyValid: false at AT&T portal',
    note: 'AWS calls ConfirmActivationKey on AT&T. If AT&T returns keyValid: false, AWS provisioning fails. What does the AT&T portal show the waiting customer? Undefined.',
  },
  {
    id: 'gap-03',
    flow: 'Flow 03 (AT&T-first)',
    title: 'ActivationKey generation failure at Confirm step',
    note: "AT&T's system fails to generate the key after the customer clicks Confirm. Only the success path is described in both documents.",
  },
  {
    id: 'gap-04',
    flow: 'Both flows · GA only',
    title: 'Bandwidth update failure during UpdateConnection',
    note: 'Feature re-negotiation fails during a bandwidth change. What does the customer see? Not defined for GA.',
  },
  {
    id: 'gap-05',
    flow: 'Both flows',
    title: 'Delete failure — connection stuck during 60-second teardown',
    note: 'AWS teardown fails or VLANs cannot be removed. Connection enters a stuck state. No customer-facing design defined.',
  },
];

function ErrorGapsCallout() {
  return (
    <div className="rounded-xl border border-fw-secondary overflow-hidden bg-fw-base">
      <div className="px-5 py-3.5 bg-fw-wash border-b border-fw-secondary flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-fw-bodyLight" />
        <p className="text-figma-sm font-bold text-fw-heading">5 error states not yet defined in either source document</p>
      </div>
      <div className="divide-y divide-fw-secondary">
        {ERROR_GAPS.map(gap => (
          <div key={gap.id} className="px-5 py-3.5 flex items-start gap-3">
            <div className="shrink-0 mt-0.5 w-5 h-5 rounded flex items-center justify-center bg-fw-accent border border-fw-active/40">
              <Clock className="h-3.5 w-3.5 text-fw-link" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <p className="text-figma-sm font-semibold text-fw-heading">{gap.title}</p>
                <span className="px-1.5 py-0.5 rounded bg-fw-wash border border-fw-secondary text-tag-xs font-mono text-fw-bodyLight whitespace-nowrap">{gap.flow}</span>
              </div>
              <p className="text-figma-xs text-fw-body leading-relaxed">{gap.note}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="px-5 py-3 border-t border-fw-secondary bg-fw-accent/30">
        <p className="text-figma-xs text-fw-body">Design decisions required before these states can be built. Owner: AT&T Product. These are tracked as <strong className="text-fw-heading">pending</strong> in the Requirements Validation tab.</p>
      </div>
    </div>
  );
}

// ─── Requirements Validation Checklist ───────────────────────────────────────

interface RequirementItem {
  id: string;
  label: string;
  detail?: string;
  where?: string;
  /** 'validated' = implemented + verified · 'pending' = required but not yet designed · 'blocked' = cannot design until upstream decision */
  status?: 'validated' | 'pending' | 'blocked';
  addedDate?: string; // 'YYYY-MM-DD' — omit for original items
}

interface RequirementSection {
  title: string;
  items: RequirementItem[];
}

const REQUIREMENT_SECTIONS: RequirementSection[] = [
  {
    title: 'Product Architecture',
    items: [
      { id: 'r01', label: '4-path architecture', detail: '4 Hosted Connections per metro · 4 IPEs (Juniper MX-304)', where: 'Architecture card, status panels' },
      { id: 'r02', label: '2 diverse DC sites per metro', detail: 'Intra-metro geographic diversity (e.g. Equinix SJ + Equinix SJ SV5)', where: 'Connection details, path list' },
      { id: 'r03', label: 'Internet + MPLS transport at Preview', detail: 'Internet and MPLS available at Preview — Ethernet added at GA', where: 'OnboardingDrawer → Transport field' },
      { id: 'r04', label: 'BFD: interval 300ms, multiplier 3', detail: 'Sub-second failover via BFD', where: 'Architecture card → Failover: 300ms via BFD' },
      { id: 'r05', label: 'Billing trigger: BGP Established', detail: 'Billing starts when BGP reaches Established across all 4 paths', where: 'OnboardingDrawer → Billing section, Email preview' },
      { id: 'r-a01', label: 'Product goal: position AT&T as seamless, high-resiliency extension of AWS ecosystem', detail: 'Source: LMCC Design Brief 04212026. Goal must inform onboarding copy, portal header, and disclaimer language.', where: 'Portal header, DesignDisclaimer copy', addedDate: '2026-05-07' },
    ],
  },
  {
    title: 'Preview Phase',
    items: [
      { id: 'r06', label: 'Preview: San Jose, CA only', detail: 'Single metro at Preview', where: 'Flow B wizard → Metro selector' },
      { id: 'r07', label: 'LA shown as unavailable', detail: '"Infrastructure pending — fiber installation in progress"', where: 'Flow B wizard → Metro selector (LA grayed out)' },
      { id: 'r08', label: 'Bandwidth: 1 Gbps fixed at Preview', detail: 'No bandwidth selection — 1 Gbps is the only option', where: 'Flow B wizard → fixed at 1 Gbps' },
      { id: 'r09', label: 'Contract: Trial only at Preview', detail: 'Manual NBA trial flow — zero-penalty disconnect; not UI-visible at Preview', where: 'Manual process via AT&T Business Center' },
    ],
  },
  {
    title: 'GA Phase',
    items: [
      { id: 'r10', label: 'GA date: November 16, 2026', detail: 'Targeted GA launch date per PRD', where: 'OnboardingDrawer → Billing copy; Architecture card note' },
      { id: 'r11', label: 'GA metros: San Jose, CA + Ashburn, VA', detail: 'LA drops at GA; Ashburn added', where: 'Data layer (lmccService.ts LMCC_METROS_GA)' },
      { id: 'r12', label: 'GA bandwidth: 1 / 2 / 5 / 10 / 25 / 50 / 100 Gbps', detail: 'Source: LMCC Design Brief 04212026. Resolves EPIC 3 open item "Need to confirm different tiers." Minimum is 1 Gbps.', where: 'Data layer (LMCC_PHASES.ga.bandwidthOptions)' },
      { id: 'r13', label: 'GA billing: automatic at BGP Established', detail: 'No manual AT&T billing step at GA', where: 'OnboardingDrawer → Billing acknowledgment copy' },
      { id: 'r-g01', label: 'Post-GA: operations expand to Create + Delete + Update (all resource types)', detail: 'Source: LMCC Design Brief 04212026. "Update" scope at Post-GA is not limited to bandwidth — broader than GA.', where: 'Deployment roadmap card', addedDate: '2026-05-07' },
    ],
  },
  {
    title: 'Connection Coordinator API',
    items: [
      { id: 'r14', label: 'Customer makes only 3 choices (GA) / 1 choice (Preview)', detail: 'GA: Location · Bandwidth · AWS Account Number. Preview: AWS Account Number only — location (San Jose) and bandwidth (1 Gbps) are fixed, read from API', where: 'Demo page header, Flow B wizard' },
      { id: 'r15', label: 'All L3 automated', detail: 'BGP ASN, VLAN IDs, IP subnets, MTU — no customer BGP config', where: 'OnboardingDrawer removes all BGP/VIF inputs; Negotiating status stage' },
      { id: 'r16', label: 'Flow 03 (AT&T-first) represented', detail: 'Customer starts at NetBond, generates key, takes to AWS', where: 'Flow B card + wizard (AT&T Initiates)' },
      { id: 'r17', label: 'Flow 04 (AWS-first) represented', detail: 'Customer starts at AWS, receives key, uploads at NetBond', where: 'Flow A card + NetBondMaxBanner (AWS Initiates)' },
      { id: 'r18', label: 'ActivationKey valid 7 days', detail: 'Key expires after 168 hours (deferralTimeoutHours)', where: 'Flow A deferred state, error: expired, key expiry copy' },
      { id: 'r19', label: 'Portal swivel acknowledged as manual', detail: 'Automated Post-GA (Epic 8) — Preview and GA require manual key transfer', where: 'NetBondMaxBanner context copy; WorkflowVisualization notes' },
      { id: 'r-cc01', label: 'Location is NOT updatable — customer must delete and recreate to change metro', detail: 'Source: LMCC Design Brief 04212026. No UpdateLocation operation exists in the Connection Coordinator API. Detail view must not show location as editable.', where: 'Connection detail view (not yet designed — location must render as read-only)', status: 'pending', addedDate: '2026-05-07' },
      { id: 'r-cc02', label: 'Context passing from AWS portal is a stated requirement', detail: 'AT&T must receive and preserve session context from the AWS portal handoff. Flow 04 cannot re-ask for information already embedded in the ActivationKey.', where: 'NetBondMaxBanner → key decode + confirm flow', addedDate: '2026-05-07' },
    ],
  },
  {
    title: '5-Stage Status Progression',
    items: [
      { id: 'r20', label: 'key-generated: AT&T issued ActivationKey', detail: 'Flow 03 only — pending connection record created, waiting for AWS', where: 'OnboardingDrawer status stages' },
      { id: 'r21', label: 'key-accepted: AWS received and validated key', detail: '"Negotiation starting" — correct description per PRD', where: 'OnboardingDrawer → key-accepted stage description' },
      { id: 'r22', label: 'negotiating: All 4 channels auto-configured', detail: '"AT&T and AWS are automatically configuring all 4 channels. No action needed."', where: 'OnboardingDrawer → negotiating stage description' },
      { id: 'r23', label: 'bgp-forming: Technical parameters agreed', detail: '"BGP sessions coming up on AT&T hardware"', where: 'OnboardingDrawer → bgp-forming stage description' },
      { id: 'r24', label: 'live: Both providers confirmed, traffic flows', detail: '"Both AT&T and AWS confirmed. Traffic can flow."', where: 'OnboardingDrawer → live stage description' },
      { id: 'r-sp01', label: 'Email + in-portal notification on Live: Should Have | GA', detail: 'Source: LMCC Design Brief 04212026 requirements table. Not "nice to have" — Should Have, targeting GA. AT&T and AWS must not send duplicate or conflicting messages. Design spec required before GA. Owner: AT&T Product + Comms.', where: 'Secondary Assets → Email preview (partial) · in-portal notification not yet designed', status: 'pending', addedDate: '2026-05-07' },
    ],
  },
  {
    title: 'Error States — Implemented',
    items: [
      { id: 'r25', label: 'no-capacity banner', detail: 'Location at capacity — retry or contact AT&T', where: 'Secondary Assets → Provisioning Error Banners' },
      { id: 'r26', label: 'negotiation-failed banner', detail: 'AT&T notified, auto cleanup, case reference issued', where: 'Secondary Assets → Provisioning Error Banners' },
      { id: 'r27', label: 'timeout banner', detail: 'AT&T investigating, customer notified', where: 'Secondary Assets → Provisioning Error Banners' },
      { id: 'r28', label: 'Key error: invalid-format', detail: 'Key not valid base64 / missing required fields — inline field error, do not submit to AWS', where: 'NetBondMaxBanner → inline error on submit' },
      { id: 'r29', label: 'Key error: not-recognised (keyValid: false)', detail: 'AWS said key is not valid — full-screen error, security event logged, SIEM alert triggered', where: 'NetBondMaxBanner → full-screen error (demo: "error:unrecognised")' },
      { id: 'r30', label: 'Key error: already-used', detail: 'Key has already activated a connection — full-screen error with link to connection list', where: 'NetBondMaxBanner → full-screen error (demo: "error:used")' },
      { id: 'r31', label: 'Key error: expired (Flow 04)', detail: 'More than 7 days since generation — full-screen error with expiry date if available', where: 'NetBondMaxBanner → full-screen error with expiry date (demo: "error:expired")' },
      { id: 'r32', label: 'Key error: wrong-account', detail: 'AWS account in key ≠ authenticated user account — full-screen error, do NOT show account ID from key (security risk)', where: 'NetBondMaxBanner → full-screen error (demo: "error:wrong-account")' },
    ],
  },
  {
    title: 'Error States — Pending Design',
    items: [
      { id: 'r-es01', label: 'Flow 03: key expired — key generated in AT&T portal, not taken to AWS within 7 days', detail: 'Undefined in both source documents. Portal status screen still shows "Key Generated" state but the key has expired. What does the customer see? Design decision required.', where: 'Not yet designed — requires product decision', status: 'pending', addedDate: '2026-05-07' },
      { id: 'r-es02', label: 'Flow 03: keyValid: false at AT&T portal', detail: 'In Flow 03, AWS calls ConfirmActivationKey on AT&T. If AT&T returns keyValid: false, AWS provisioning fails. What does the AT&T portal show to the customer still waiting on the status screen? Undefined in both documents.', where: 'Not yet designed — requires product decision', status: 'pending', addedDate: '2026-05-07' },
      { id: 'r-es03', label: 'Flow 03: ActivationKey generation failure at Confirm step', detail: 'If AT&T fails to generate the key after the customer clicks Confirm, what does the customer see? Only the success path is described in both source documents.', where: 'Not yet designed — requires product decision', status: 'pending', addedDate: '2026-05-07' },
      { id: 'r-es04', label: 'GA: bandwidth update failure during UpdateConnection', detail: 'If feature re-negotiation fails during a bandwidth change, what does the customer see? Connection Coordinator API allows retries but a permanent failure path is not defined.', where: 'Not yet designed — GA only, requires product decision', status: 'pending', addedDate: '2026-05-07' },
      { id: 'r-es05', label: 'Delete failure: connection stuck during 60-second teardown', detail: 'All 5 teardown steps must complete within 60 seconds. If AWS teardown call fails or VLANs cannot be removed, connection enters a stuck state. No customer-facing design defined.', where: 'Not yet designed — requires product decision', status: 'pending', addedDate: '2026-05-07' },
    ],
  },
  {
    title: 'Access & Roles',
    items: [
      { id: 'r-ar01', label: 'Privilege gate runs on every portal entry (not a one-time check)', detail: 'User without connection provisioning role must see: exact role name missing, instruction to contact admin, way to reach admin or account management. Generic errors are not acceptable.', where: 'Not yet implemented as a standalone screen — pending', status: 'pending', addedDate: '2026-05-07' },
      { id: 'r-ar02', label: 'Admin self-service: assign/revoke provisioning role without AT&T support ticket', detail: 'Source: LMCC Design Brief 04212026. Account administrators must be able to manage the provisioning role independently. This is a requirement, not a "nice to have."', where: 'AT&T Business Center (out of scope for this demo) — must be called out in privilege gate error message', status: 'pending', addedDate: '2026-05-07' },
      { id: 'r-ar03', label: 'Business Center unavailable: graceful degradation, no blank screen', detail: 'When Business Center is unavailable during authentication, portal shows a clear fallback state acknowledging the outage with a retry time. Exact behavior TBD with AT&T engineering.', where: 'Not yet designed — TBD with AT&T engineering', status: 'pending', addedDate: '2026-05-07' },
    ],
  },
  {
    title: 'Email Notification',
    items: [
      { id: 'r33', label: 'Sent when all 4 paths reach Live status', detail: 'Coordination with AT&T comms — no duplicate with AWS notification. Should Have | GA.', where: 'Secondary Assets → Live Connection Email Notification' },
      { id: 'r34', label: 'AT&T AI-grade network branding', detail: 'AT&T globe logo + product wordmark', where: 'Email preview header' },
      { id: 'r35', label: 'Connection details in email', detail: 'Metro, Bandwidth × 4 paths, AT&T Account Email, Transport', where: 'Email preview → Connection Summary table' },
      { id: 'r36', label: 'Billing start notice', detail: 'Billing timing + Preview/GA distinction', where: 'Email preview → What happens next' },
    ],
  },
  {
    title: 'Billing & Acknowledgment',
    items: [
      { id: 'r37', label: 'Preview: fixed-rate billing', detail: 'Preview phase uses fixed-rate billing. GA transitions to 95th percentile burstable billing.', where: 'OnboardingDrawer → Billing acknowledgment copy' },
      { id: 'r38', label: 'GA: billing triggers automatically at BGP Established', detail: 'Automatic trigger — no manual AT&T step', where: 'OnboardingDrawer → Billing acknowledgment copy' },
      { id: 'r39', label: 'Billing acknowledgment required before activation', detail: 'Checkbox must be checked to enable Acknowledge & Track button', where: 'OnboardingDrawer → billing acknowledgment checkbox' },
    ],
  },
  {
    title: 'Pending Architecture Decisions',
    items: [
      { id: 'r-bl01', label: 'Internet access type selection step', detail: 'LMCC Design Brief 04212026 requirements table classifies Internet access as Must Have | Preview. However EPIC 05 has no defined architecture and the brief itself says "I do not understand it." Must Have with no architecture is a scope blocker. Do NOT design this step until AT&T Network Engineering confirms the approach.', where: 'BLOCKED — escalation required with AT&T Network Engineering before Preview', status: 'blocked', addedDate: '2026-05-07' },
      { id: 'r-bl02', label: 'deferProvisioning pattern for Flow 04 (Active vs. Deferring Provider)', detail: 'Open decision from 04092026 PRD: AT&T is the Active Provider by default in Flow 04, but may use deferProvisioning=true to hand the role to AWS. The team must decide which pattern to implement before EPIC 4 is built.', where: 'Engineering decision required before EPIC 4', status: 'blocked', addedDate: '2026-05-07' },
      { id: 'r-bl03', label: 'MACsec key management ownership split (GA)', detail: 'macsecManagerProvider is readOnly per channel. AT&T and AWS must agree on key management ownership (AT&T all, AWS all, or 50/50 split) before GA. 50/50 is the recommended default. Hard gate: all 4 channels must have MACsec active before GA connections are made available.', where: 'Engineering decision required before GA — not visible in demo', status: 'blocked', addedDate: '2026-05-07' },
      { id: 'r-bl04', label: 'Key reminder timing before expiry — Flow 03', detail: 'If the customer generates a key but has not taken it to AWS after several days, does the portal show a reminder warning? Is there a warning threshold before the 7-day deadline? No timing or trigger defined in either source document. Reminder copy and threshold require product decision.', where: 'Not yet designed — requires product decision on timing threshold', status: 'blocked', addedDate: '2026-05-11' },
      { id: 'r-bl05', label: 'AWS-portal-created connections visible in AT&T portal?', detail: 'If a customer creates a connection via the AWS portal (Flow 04), does it appear in the AT&T AI-grade network connection list? Connection list design depends on this. If yes, the list must show connections originating from either portal.', where: 'Engineering decision required — impacts connection list design', status: 'blocked', addedDate: '2026-05-11' },
      { id: 'r-bl06', label: 'Business Center contracting step at GA — portal handoff design', detail: 'At GA, customers sign contracts via digital self-service in Business Center. If contracting is embedded in the onboarding journey, what does the handoff from the NetBond portal to Business Center look and feel like? No design spec defined.', where: 'Requires AT&T Product + Business Center team decision before GA', status: 'blocked', addedDate: '2026-05-11' },
    ],
  },
  {
    title: 'Screens Requiring Design (Bible Section 9)',
    items: [
      { id: 'r-sd01', label: 'Connection list / dashboard', detail: 'What does the customer see when they already have connections? Statuses, actions available (Delete at Preview; Delete + Update at GA), search/filter. Must handle connections originating from either AT&T or AWS portal.', where: 'Not yet designed — requires product decision on list spec', status: 'pending', addedDate: '2026-05-11' },
      { id: 'r-sd02', label: 'Connection detail view', detail: 'What does a live connection look like? Which parameters are visible? What actions are available? Location must render as read-only — no UpdateLocation operation exists. Delete available at Preview; Delete + bandwidth update at GA.', where: 'Not yet designed — location must be explicitly non-editable per Bible Section 13', status: 'pending', addedDate: '2026-05-11' },
      { id: 'r-sd03', label: 'Update bandwidth flow (GA only)', detail: 'How does the customer change bandwidth on a live connection without deleting it? UpdateConnection (PATCH) triggers feature re-negotiation. What does "in progress" look like? Billing adjusts prorated from date new bandwidth becomes active.', where: 'Not yet designed — GA only', status: 'pending', addedDate: '2026-05-11' },
      { id: 'r-sd04', label: 'Delete confirmation', detail: 'What does the customer confirm before deleting? 5 teardown steps must complete within 60 seconds. What does the status show while deletion is in progress? Billing halts from deletion timestamp.', where: 'Not yet designed', status: 'pending', addedDate: '2026-05-11' },
      { id: 'r-sd05', label: 'Empty state', detail: 'First-time authenticated user with no connections yet. What do they see? Should teach the interface — not just "nothing here." Two entry paths (AT&T-first, AWS-first) both need to be surfaced.', where: 'Not yet designed', status: 'pending', addedDate: '2026-05-11' },
      { id: 'r-sd06', label: 'Loading / skeleton states', detail: 'Dynamic API calls mean initial loads will have latency. Design loading states for: location selector (ListEnvironments), bandwidth selector (supportedConnectionSizeMbps), and connection list. Must not show hardcoded values while API is loading.', where: 'Not yet designed — required to satisfy "no hardcoded values" rule', status: 'pending', addedDate: '2026-05-11' },
    ],
  },
  {
    title: 'Performance Targets (Bible Section 14)',
    items: [
      { id: 'r-kpi01', label: 'Time-to-provision (TTP) < 5 minutes end-to-end', detail: 'From customer confirmation to BGP Active state — less than 5 minutes. Architecture card shows this as a design constraint.', where: 'Architecture card → TTP target stat' },
      { id: 'r-kpi02', label: '98% provisioning success rate', detail: '98% of automated workflows completed without generating a system error. Source: 04092026 PRD KPIs.', where: 'Not surfaced in demo — engineering SLA target, not customer-facing', status: 'pending', addedDate: '2026-05-11' },
      { id: 'r-kpi03', label: '10% maximum resiliency attach rate target (12 months post-GA)', detail: '10% of new AI-grade network Standard and Advanced VNCs utilizing maximum resiliency within 12 months after GA. Source: 04092026 PRD KPIs.', where: 'Not surfaced in demo — business KPI tracked by AT&T product', status: 'pending', addedDate: '2026-05-11' },
    ],
  },
  {
    title: 'Maintenance Coordination (Bible Section 18)',
    items: [
      { id: 'r-mc01', label: 'Single-channel maintenance shown as "Planned maintenance" — not an error', detail: 'When one channel is under planned maintenance, its status shows "Planned maintenance." Connection status badge must remain unchanged — a single-channel event does not degrade the connection from the customer perspective.', where: 'Connection detail view (not yet designed)', status: 'pending', addedDate: '2026-05-11' },
      { id: 'r-mc02', label: 'Notification must state "No service impact expected" for single-channel events', detail: 'Explicit copy requirement from Bible Section 18. Must not leave customers uncertain about whether traffic is affected.', where: 'Notification design (not yet designed)', status: 'pending', addedDate: '2026-05-11' },
      { id: 'r-mc03', label: '72-hour advance notice for planned maintenance', detail: 'AT&T must give customers 72 hours minimum notice for all planned maintenance. Emergency maintenance: notify AWS immediately, notify customer within 30 minutes. P2 issue raised for every emergency event.', where: 'Notification / maintenance announcement design (not yet designed)', status: 'pending', addedDate: '2026-05-11' },
    ],
  },
];

export function RequirementsValidation() {
  const allItems = REQUIREMENT_SECTIONS.flatMap(s => s.items);
  const validated = allItems.filter(i => (i.status ?? 'validated') === 'validated').length;
  const pending   = allItems.filter(i => i.status === 'pending').length;
  const blocked   = allItems.filter(i => i.status === 'blocked').length;

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <ClipboardCheck className="h-6 w-6 text-fw-link" />
            <h2 className="text-figma-xl font-bold text-fw-heading tracking-[-0.03em]">Requirements Validation Checklist</h2>
          </div>
          <p className="text-figma-sm text-fw-body max-w-2xl">
            Line-by-line validation against both source documents: <strong className="text-fw-body">LMCC Product Notes 04092026</strong> (engineering authority) and <strong className="text-fw-body">LMCC Design Brief 04212026</strong> (design authority). Items marked <span className="text-fw-link font-medium">pending</span> are required but not yet designed. Items marked <span className="text-fw-error font-medium">blocked</span> require an upstream architecture or product decision before design can begin.
          </p>
        </div>
        <div className="flex flex-col gap-1.5 shrink-0">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-fw-successLight border border-fw-success/30">
            <CheckCircle2 className="h-4 w-4 text-fw-success" />
            <span className="text-figma-sm font-bold text-fw-success">{validated} validated</span>
          </div>
          {pending > 0 && (
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-fw-accent border border-fw-active/30">
              <Clock className="h-4 w-4 text-fw-link" />
              <span className="text-figma-sm font-bold text-fw-link">{pending} pending design</span>
            </div>
          )}
          {blocked > 0 && (
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-fw-errorLight border border-fw-error/30">
              <AlertCircle className="h-4 w-4 text-fw-error" />
              <span className="text-figma-sm font-bold text-fw-error">{blocked} blocked</span>
            </div>
          )}
        </div>
      </div>

      {/* Sections */}
      {REQUIREMENT_SECTIONS.map(section => (
        <div key={section.title} className="rounded-2xl border border-fw-secondary overflow-hidden">
          {/* Section header */}
          <div className="px-5 py-3.5 bg-fw-wash border-b border-fw-secondary flex items-center justify-between">
            <h3 className="text-figma-sm font-bold text-fw-heading">{section.title}</h3>
            <span className="text-figma-xs text-fw-bodyLight font-medium">{section.items.length} requirement{section.items.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Items */}
          <div className="divide-y divide-fw-secondary">
            {section.items.map(item => {
              const status = item.status ?? 'validated';
              return (
                <div key={item.id} className={`px-5 py-3.5 flex items-start gap-4 hover:bg-fw-wash/50 transition-colors ${status === 'blocked' ? 'bg-fw-errorLight/20' : status === 'pending' ? 'bg-fw-accent/30' : ''}`}>
                  {/* Status indicator */}
                  {status === 'validated' && (
                    <div className="shrink-0 mt-0.5 w-5 h-5 rounded flex items-center justify-center bg-fw-successLight border border-fw-success/40">
                      <CheckCircle2 className="h-3.5 w-3.5 text-fw-success" />
                    </div>
                  )}
                  {status === 'pending' && (
                    <div className="shrink-0 mt-0.5 w-5 h-5 rounded flex items-center justify-center bg-fw-accent border border-fw-active/40">
                      <Clock className="h-3.5 w-3.5 text-fw-link" />
                    </div>
                  )}
                  {status === 'blocked' && (
                    <div className="shrink-0 mt-0.5 w-5 h-5 rounded flex items-center justify-center bg-fw-errorLight border border-fw-error/40">
                      <AlertCircle className="h-3.5 w-3.5 text-fw-error" />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-figma-sm font-semibold text-fw-heading leading-snug">{item.label}</p>
                          {item.addedDate && (
                            <span className="px-1.5 py-0.5 rounded bg-fw-wash border border-fw-secondary text-tag-xs font-mono text-fw-bodyLight whitespace-nowrap">added {item.addedDate}</span>
                          )}
                        </div>
                        {item.detail && (
                          <p className="text-figma-xs text-fw-body mt-0.5 leading-relaxed">{item.detail}</p>
                        )}
                      </div>
                      <span className="text-figma-xs font-mono text-fw-bodyLight bg-fw-wash border border-fw-secondary px-2 py-0.5 rounded shrink-0 whitespace-nowrap hidden sm:block">{item.id}</span>
                    </div>
                    {item.where && (
                      <p className={`text-figma-xs mt-1.5 flex items-center gap-1.5 ${status === 'blocked' ? 'text-fw-error' : status === 'pending' ? 'text-fw-link' : 'text-fw-link'}`}>
                        <ArrowRight className="h-3 w-3 shrink-0" />
                        {item.where}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Sign-off block */}
      <div className="rounded-2xl border-2 border-fw-secondary overflow-hidden">
        <div className="px-5 py-3.5 bg-fw-wash border-b border-fw-secondary">
          <h3 className="text-figma-sm font-bold text-fw-heading">Release Sign-Off</h3>
          <p className="text-figma-xs text-fw-body mt-0.5">Required before stakeholder presentation. Both items must be checked.</p>
        </div>
        <div className="divide-y divide-fw-secondary">
          {[
            { label: 'Feature Tested', detail: 'All flows verified in browser. Error states exercised via demo triggers. Email preview reviewed.' },
            { label: 'Stakeholder Sign-Off', detail: 'AT&T product team has reviewed and approved the demo for presentation.' },
          ].map(item => (
            <div key={item.label} className="px-5 py-4 flex items-start gap-4">
              {/* Empty checkbox */}
              <div className="shrink-0 mt-0.5 w-5 h-5 rounded border-2 border-fw-secondary bg-fw-base flex items-center justify-center">
                <Square className="h-3 w-3 text-fw-disabled opacity-0" />
              </div>
              <div>
                <p className="text-figma-sm font-semibold text-fw-heading">{item.label}</p>
                <p className="text-figma-xs text-fw-body mt-0.5 leading-relaxed">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

// ─── Secondary Assets Page ────────────────────────────────────────────────────

export function SecondaryAssets() {
  return (
    <div className="space-y-10">

      {/* Key Upload Errors */}
      <section>
        <div className="mb-4">
          <h2 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em]">Key Upload Errors — Flow 04 (AWS-first)</h2>
          <p className="text-figma-sm text-fw-body mt-1 max-w-2xl">
            Five defined error states for Flow 04 key validation. Each requires a distinct, actionable design — not a generic error message. Copy is verbatim from the LMCC Design Brief 04212026.
          </p>
        </div>

        <div className="space-y-4">
          {([
            { type: 'invalid-format' as const, desc: 'Key not valid base64 or missing required fields — inline only, do not call AWS' },
            { type: 'not-recognised' as const, desc: 'AWS returned keyValid: false — security event, SIEM alert triggered' },
            { type: 'already-used' as const, desc: 'Key has already activated a connection — link to connection list' },
            { type: 'expired' as const, desc: 'More than 7 days since generation — show expiry date if available' },
            { type: 'wrong-account' as const, desc: 'Account ID in key does not match authenticated user — do NOT show account ID (security risk)' },
          ]).map(({ type, desc }) => (
            <div key={type} className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded bg-fw-wash border border-fw-secondary text-figma-xs font-mono text-fw-bodyLight">{type}</span>
                <span className="text-figma-xs text-fw-body">{desc}</span>
              </div>
              <KeyUploadErrorCard type={type} />
            </div>
          ))}
        </div>
      </section>

      <div className="border-t border-fw-secondary" />

      {/* Provisioning Error Banners */}
      <section>
        <div className="mb-4">
          <h2 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em]">Provisioning Errors — Both Flows</h2>
          <p className="text-figma-sm text-fw-body mt-1">
            In-portal banners shown when provisioning fails after key exchange. Copy is verbatim from the LMCC Design Brief 04212026.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-fw-wash border border-fw-secondary text-figma-xs font-mono text-fw-bodyLight">no-capacity</span>
              <span className="text-figma-xs text-fw-body">AT&T cannot place connection at chosen metro — no bandwidth available on any Interconnect</span>
            </div>
            <ErrorBanner type="no-capacity" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-fw-wash border border-fw-secondary text-figma-xs font-mono text-fw-bodyLight">negotiation-failed</span>
              <span className="text-figma-xs text-fw-body">AT&T and AWS could not agree L3 parameters after retry — AT&T notified, auto cleanup, case reference issued</span>
            </div>
            <ErrorBanner type="negotiation-failed" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-fw-wash border border-fw-secondary text-figma-xs font-mono text-fw-bodyLight">timeout</span>
              <span className="text-figma-xs text-fw-body">BGP did not form within expected window — AT&T investigating, customer notified</span>
            </div>
            <ErrorBanner type="timeout" />
          </div>
        </div>
      </section>

      <div className="border-t border-fw-secondary" />

      {/* Access & Privilege Gate */}
      <section>
        <div className="mb-4">
          <h2 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em]">Access & Privilege Gate</h2>
          <p className="text-figma-sm text-fw-body mt-1 max-w-2xl">
            Gate runs on every portal entry — not a one-time check. Two blocked states defined in the Bible. Neither is yet implemented in the portal.
          </p>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-fw-wash border border-fw-secondary text-figma-xs font-mono text-fw-bodyLight">no-role</span>
              <span className="text-figma-xs text-fw-body">User lacks connection provisioning role — completely blocked, must contact account administrator</span>
            </div>
            <NoRoleCard />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-fw-wash border border-fw-secondary text-figma-xs font-mono text-fw-bodyLight">bc-unavailable</span>
              <span className="text-figma-xs text-fw-body">AT&T Business Center unavailable during authentication — graceful degradation required</span>
            </div>
            <BCUnavailableCard />
          </div>
        </div>
      </section>

      <div className="border-t border-fw-secondary" />

      {/* Error State Gaps */}
      <section>
        <div className="mb-4">
          <h2 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em]">Error States — Pending Design Decisions</h2>
          <p className="text-figma-sm text-fw-body mt-1 max-w-2xl">
            Real error conditions that occur in both flows but have no customer-facing design in either source document. Product decisions required before these can be designed.
          </p>
        </div>
        <ErrorGapsCallout />
      </section>

      <div className="border-t border-fw-secondary" />

      {/* Email */}
      <section>
        <div className="mb-4">
          <h2 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em]">Live Connection Email Notification</h2>
          <p className="text-figma-sm text-fw-body mt-1 max-w-2xl">
            Sent when all 4 paths reach Live status. Priority: <strong className="text-fw-body">Should Have | GA</strong> per LMCC Design Brief 04212026 requirements table. AT&T and AWS coordinate — no duplicate or conflicting messages. Design spec required before GA. Owner: AT&T Product + Comms.
          </p>
        </div>
        <EmailPreview />
      </section>

    </div>
  );
}

// ─── Product Design Strategy ──────────────────────────────────────────────────

const DESIGN_PRINCIPLES = [
  {
    icon: Zap,
    title: 'API-driven from day one',
    body: 'Every dynamic value — locations, bandwidth tiers, status — comes from the API. Hardcoding anything is a product rule violation. Preview must not require a UI code release when GA infrastructure comes live. Only the API responses change.',
    source: 'LMCC Design Brief 04212026, Section 3',
  },
  {
    icon: Target,
    title: 'Customer makes exactly 3 choices',
    body: 'Location, bandwidth, and AWS account ID. Everything else is automated. The portal must never force a fourth decision on the customer. If a step requires a customer choice that is not one of these three, it needs product justification.',
    source: 'LMCC Product Notes 04092026, Section 1',
  },
  {
    icon: Network,
    title: 'One portal, two entry paths',
    body: 'AT&T AI-grade network is a single application. Flow 03 (AT&T-first) and Flow 04 (AWS-first) are entry paths — not separate products, not separate portals. Design must not distinguish between the two personas once inside.',
    source: 'LMCC Design Brief 04212026, Section 2',
  },
  {
    icon: Layers,
    title: 'Build the pattern, not just the product',
    body: 'This LMCC (AWS) establishes the template. The Connection Coordinator API is an open standard that any cloud provider can adopt. Flows, status taxonomy, and error patterns should be provider-agnostic so they transfer directly to Azure, GCP, and future cloud partners.',
    source: 'Architecture inference from Connection Coordinator API spec',
  },
];

const ROADMAP_PHASES = [
  {
    phase: 'Gated Preview',
    date: 'June 30, 2026',
    color: 'text-fw-bodyLight',
    bgColor: 'bg-fw-wash/40',
    borderColor: 'border-fw-secondary',
    rows: [
      { label: 'Operations', value: 'Create + Delete only' },
      { label: 'Bandwidth', value: '1 Gbps only (from API — do not hardcode)' },
      { label: 'Metros', value: 'San Jose, CA only. LA infra not installed — do not show.' },
      { label: 'Last mile', value: 'Internet, MPLS' },
      { label: 'Billing', value: 'Manual — AT&T invoices outside the portal' },
      { label: 'Contracting', value: 'No self-service. Use NBA trial flow.' },
      { label: 'Key transfer', value: 'Manual portal swivel — customer copies key between portals' },
      { label: 'MACsec', value: 'Not required' },
      { label: 'Portal entry', value: 'AT&T portal only + AWS portal for key upload' },
    ],
  },
  {
    phase: 'General Availability',
    date: 'November 16, 2026',
    color: 'text-fw-link',
    bgColor: 'bg-fw-accent',
    borderColor: 'border-fw-active/30',
    rows: [
      { label: 'Operations', value: 'Full CRUD — Create, Read, Update (bandwidth), Delete' },
      { label: 'Bandwidth', value: '1, 2, 5, 10, 25, 50, 100 Gbps (API-driven, discrete tiers)' },
      { label: 'Metros', value: 'San Jose, CA + Ashburn, VA. LA drops — migrates to SJ CoreSite (make-before-break).' },
      { label: 'Last mile', value: 'Internet, MPLS, Ethernet' },
      { label: 'Billing', value: 'Automated — triggers when BGP session is formed (all 4 features FINALIZED)' },
      { label: 'Contracting', value: 'Digital self-service — customer signs in AT&T Business Center' },
      { label: 'Key transfer', value: 'Manual portal swivel (same as Preview)' },
      { label: 'MACsec', value: 'Required on all 4 channels before connections made available. Hard gate.' },
      { label: 'Portal entry', value: 'Both AT&T and AWS portals — full parity' },
    ],
  },
  {
    phase: 'Post-GA',
    date: 'TBD',
    color: 'text-fw-success',
    bgColor: 'bg-fw-successLight/30',
    borderColor: 'border-fw-success/30',
    rows: [
      { label: 'Operations', value: 'Create + Delete + Update bandwidth (same as GA)' },
      { label: 'Bandwidth', value: 'Same as GA' },
      { label: 'Metros', value: 'Same as GA' },
      { label: 'Last mile', value: 'Same as GA' },
      { label: 'Billing', value: 'Same as GA' },
      { label: 'Contracting', value: 'Same as GA' },
      { label: 'Key transfer', value: 'Automated — portal swivel eliminated entirely. Customer never copies a key.' },
      { label: 'MACsec', value: 'Same as GA' },
      { label: 'Portal entry', value: 'Both portals, full parity + automated handoff' },
    ],
  },
];

const STRATEGIC_DECISIONS = [
  {
    id: 'sd-01',
    title: 'Internet access architecture — EPIC 05',
    urgency: 'blocked',
    description: 'The LMCC Design Brief 04212026 classifies Internet access as Must Have | Preview, but EPIC 05 in the 04092026 PRD has no architecture defined. The brief itself states "I do not understand it." A Must Have requirement with no defined architecture is a Preview scope blocker.',
    designImpact: 'If Internet access is in scope, the creation flow needs an access type selection step — a fourth customer decision, which violates the 3-choice principle. Do NOT design this step until AT&T Network Engineering confirms the architecture.',
    owner: 'AT&T Network Engineering',
  },
  {
    id: 'sd-02',
    title: 'deferProvisioning pattern — Flow 04 (AWS-first)',
    urgency: 'blocked',
    description: 'In Flow 04, AT&T receives the key and is Active Provider by default. The team must decide: does AT&T drive feature negotiation (Active Provider pattern), or does AT&T set deferProvisioning=true to hand the role back to AWS (Deferring Provider pattern)?',
    designImpact: 'This is an engineering decision that determines which system calls CreateConnection on the other. The customer-facing flow is identical either way — but the API sequence changes entirely. Must be resolved before EPIC 04 is built.',
    owner: 'AT&T Engineering',
  },
  {
    id: 'sd-03',
    title: 'MACsec key management ownership split — GA',
    urgency: 'blocked',
    description: 'macsecManagerProvider is a readOnly field set per channel during infrastructure bring-up. AT&T and AWS must agree: AT&T manages all 4 channels, AWS manages all 4, or a 50/50 split (recommended). Cannot be changed via API after channels are live.',
    designImpact: 'Invisible to customers — no portal display. But it is a hard gate before GA connections are made available. Failure to agree blocks GA launch.',
    owner: 'AT&T + AWS Infrastructure',
  },
  {
    id: 'sd-04',
    title: 'Sub-1Gbps bandwidth tiers — GA scope question',
    urgency: 'pending',
    description: 'The 04092026 PRD scope table says "50 Mbps to 100 Gbps" (a range). The 04212026 Design Brief (design authority) explicitly lists discrete tiers starting at 1 Gbps — eliminating sub-1Gbps. The discrepancy is unresolved.',
    designImpact: 'If sub-1Gbps tiers (50 Mbps, 100 Mbps, 500 Mbps) are added at GA, the bandwidth selector needs to accommodate them. The Design Brief says minimum is 1 Gbps. Follow the Design Brief until product confirms otherwise.',
    owner: 'AT&T Product',
  },
  {
    id: 'sd-05',
    title: 'LA metro commercial decision',
    urgency: 'pending',
    description: 'Equinix LA requires ~500 miles of new fiber that has not been installed. Before commissioning, AT&T must decide: contract type (IRU, dark fiber lease, or lit service), whether the terms can minimize stranded cost when LA decommissions at GA, and whether the fiber path can serve another purpose after GA.',
    designImpact: 'LA must not appear in Preview. At GA, LA drops — the Equinix LA datacenter migrates to CoreSite San Jose. Design must never show LA as a metro option in any phase.',
    owner: 'AT&T Real Estate / Network Engineering',
  },
  {
    id: 'sd-06',
    title: 'GA billing model — rate structure undefined',
    urgency: 'blocked',
    description: 'The source documents define the billing trigger (BGP session formed, all 4 features FINALIZED) and lifecycle (billing halts at deletion timestamp, proration on bandwidth changes) but say nothing about the rate structure, invoice location, or billing UX ownership. "Digital invoice created each cycle" is the entire billing model spec.',
    designImpact: 'Cannot design: (1) pricing shown on provisioning summary, (2) billing section in connection detail, (3) proration display in bandwidth change flow, (4) invoice access. Until resolved, billing UI is limited to surfacing the billing start/stop timestamps only. All other billing CTAs link to "Business Center" as a placeholder. Do not build a billing UI against an undefined model.',
    owner: 'AT&T Product / Finance',
  },
];

const MARKET_STATS = [
  { value: '92%', label: 'of large enterprises operate multi-cloud environments', source: 'Gartner, 2024' },
  { value: '2.4', label: 'public cloud providers per organization on average', source: 'Flexera State of the Cloud, 2025' },
  { value: '90%', label: 'of large enterprises already multi-cloud vs. 60% of SMBs', source: 'HashiCorp State of Cloud Strategy, 2024' },
  { value: '53%', label: 'of enterprises increased dedicated connectivity spend in 2024', source: 'IDC FutureScape, 2025' },
];

const BUYER_PROFILES = [
  {
    role: 'Cloud Architect',
    context: 'Designs the overall cloud networking topology. Evaluates dedicated interconnect vs. public internet paths. Owns the resiliency and latency architecture decision.',
    cares: [
      '4-path independent resiliency — single circuit failures are unacceptable',
      'Sub-5ms latency SLA for production workloads',
      'Make-before-break behavior during infrastructure changes',
      'BGP session visibility and path health observability',
    ],
    authority: 'Recommends solution',
    authorityColor: 'text-fw-link bg-fw-accent border-fw-active/30',
  },
  {
    role: 'Cloud Network Engineer',
    context: 'Implements and operates the connection day-to-day. Runs BGP configuration, monitors path health, and handles provisioning. Owns the operational burden — time-to-provision matters.',
    cares: [
      'Automated provisioning — no manual BGP or VLAN configuration',
      'Connection status progression is legible without AT&T support',
      'Key transfer workflow is clear and error-recoverable',
      'Operational monitoring: 4-channel health, uptime, throughput',
    ],
    authority: 'Technical evaluator',
    authorityColor: 'text-fw-success bg-fw-successLight border-fw-success/30',
  },
  {
    role: 'IT Infrastructure Lead',
    context: 'Owns the vendor relationship, budget approval, and compliance posture. Focused on contract terms, total cost of ownership, and support SLA. Final approval authority on enterprise contracts.',
    cares: [
      'Billing model transparency — when does billing start and stop',
      'Self-service provisioning with no AT&T support ticket dependency',
      'Contract terms via Business Center — digital self-service at GA',
      'Compliance posture: MACsec encryption on all 4 channels at GA',
    ],
    authority: 'Final approver',
    authorityColor: 'text-fw-bodyLight bg-fw-wash border-fw-secondary',
  },
];

const PERSONAS = [
  {
    id: 'A',
    label: 'Persona A',
    heading: 'Existing AT&T Customer',
    subhead: 'Has AT&T Business ID',
    journey: [
      'Sign in to AT&T Business Center',
      'Sign LMCC contract in Business Center',
      'Provisioning role assigned by account admin',
      'Access granted to the AI-grade network',
    ],
    dependency: 'Must hold the connection provisioning role. Users without it are completely blocked and directed to their account admin. No workaround.',
    source: 'LMCC Product Notes 04092026, Section 4',
  },
  {
    id: 'B',
    label: 'Persona B',
    heading: 'New AT&T Customer',
    subhead: 'No AT&T Business ID',
    journey: [
      'Create AT&T Business account',
      'Sign LMCC contract in Business Center',
      'Provisioning role assigned during account setup',
      'Access granted to the AI-grade network',
    ],
    dependency: 'Account creation and contracting must complete quickly — onboarding momentum is a requirement. A slow handoff between account creation and portal access is a design risk.',
    source: 'LMCC Product Notes 04092026, Section 4',
  },
];

const WHERE_METROS = [
  {
    metro: 'San Jose, CA',
    phases: ['Preview', 'GA', 'Post-GA'],
    phaseColors: ['text-fw-link', 'text-fw-link', 'text-fw-success'],
    notes: 'Preview: Equinix San Jose (intra-DC cross-connect, AT&T and AWS in same building). GA: second datacenter at CoreSite San Jose added via make-before-break — customer-invisible migration.',
    status: 'active',
  },
  {
    metro: 'Ashburn, VA',
    phases: ['GA', 'Post-GA'],
    phaseColors: ['text-fw-link', 'text-fw-success'],
    notes: 'Added at GA. Second metro enables geographic redundancy for east coast enterprises.',
    status: 'ga',
  },
  {
    metro: 'Los Angeles, CA',
    phases: ['Never'],
    phaseColors: ['text-fw-error'],
    notes: '~500-mile fiber run from Grass Valley to El Segundo has not been installed. LA is infrastructure-pending and is not available in any phase. Do not show LA in the portal.',
    status: 'blocked',
  },
];

const FUTURE_LMCCS = [
  {
    provider: 'AWS Interconnect – last mile',
    status: 'In development',
    statusColor: 'text-fw-link',
    statusBg: 'bg-fw-accent border-fw-active/30',
    product: 'AT&T AI-grade network',
    api: 'Connection Coordinator API (AWS)',
    preview: 'June 30, 2026',
    ga: 'November 16, 2026',
  },
  {
    provider: 'Azure ExpressRoute',
    status: 'Future candidate',
    statusColor: 'text-fw-bodyLight',
    statusBg: 'bg-fw-wash border-fw-secondary',
    product: 'TBD',
    api: 'Azure partner API (no public standard yet)',
    preview: 'TBD',
    ga: 'TBD',
  },
  {
    provider: 'Google Cloud Interconnect',
    status: 'Future candidate',
    statusColor: 'text-fw-bodyLight',
    statusBg: 'bg-fw-wash border-fw-secondary',
    product: 'TBD',
    api: 'GCP partner API (no public standard yet)',
    preview: 'TBD',
    ga: 'TBD',
  },
];

export function ProductDesignStrategy() {
  const [expandedPhase, setExpandedPhase] = useState<string | null>('Gated Preview');
  const [expandedDecision, setExpandedDecision] = useState<string | null>('sd-01');

  return (
    <div className="space-y-8">

      {/* ── Header ── */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Target className="h-6 w-6 text-fw-link" />
          <h2 className="text-figma-xl font-bold text-fw-heading tracking-[-0.03em]">Product Design Strategy</h2>
        </div>
        <p className="text-figma-sm text-fw-body max-w-3xl">
          The long-horizon decisions that shape every screen in this product — and every LMCC that follows it.
          Sources: <strong className="text-fw-body">LMCC Product Notes 04092026</strong> (engineering authority) · <strong className="text-fw-body">LMCC Design Brief 04212026</strong> (design authority) · session design decisions.
        </p>
      </div>

      {/* ── Strategy Flags ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Naming placeholder */}
        <div className="rounded-xl border border-fw-error/30 bg-fw-errorLight/10 p-4">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-7 h-7 rounded-lg bg-fw-errorLight flex items-center justify-center mt-0.5">
              <AlertCircle className="h-3.5 w-3.5 text-fw-error" />
            </div>
            <div>
              <p className="text-figma-xs font-bold text-fw-heading mb-1 flex items-center gap-2">
                Product name is a placeholder
                <span className="text-tag-xs font-semibold uppercase tracking-wide text-fw-error bg-fw-errorLight px-1.5 py-0.5 rounded">Unconfirmed</span>
              </p>
              <p className="text-figma-xs text-fw-body leading-relaxed">
                <strong className="text-fw-heading">"AT&T AI-grade network"</strong> has not been confirmed by AT&T Brand or Product. Do not use this name in customer-facing copy, marketing, or external materials. Treat all references as a working title until the final name is locked.
              </p>
              <p className="text-tag-xs text-fw-bodyLight mt-2 font-medium">Owner: AT&T Brand / Product Marketing</p>
            </div>
          </div>
        </div>

        {/* Billing model undefined */}
        <div className="rounded-xl border border-fw-error/30 bg-fw-errorLight/10 p-4">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-7 h-7 rounded-lg bg-fw-errorLight flex items-center justify-center mt-0.5">
              <AlertCircle className="h-3.5 w-3.5 text-fw-error" />
            </div>
            <div>
              <p className="text-figma-xs font-bold text-fw-heading mb-1 flex items-center gap-2">
                GA billing model undefined — design blocker
                <span className="text-tag-xs font-semibold uppercase tracking-wide text-fw-error bg-fw-errorLight px-1.5 py-0.5 rounded">Blocked</span>
              </p>
              <p className="text-figma-xs text-fw-body leading-relaxed">
                The source documents define the billing <em>trigger</em> (BGP session formed) and <em>lifecycle</em> (halts at deletion, prorated on bandwidth change) but not the <strong className="text-fw-heading">rate structure, invoice location, or billing UX ownership</strong>. No billing UI can be finalized until AT&T Product and Finance define the model. See Strategic Open Decisions — sd-06 for full impact.
              </p>
              <p className="text-tag-xs text-fw-bodyLight mt-2 font-medium">Owner: AT&T Product / Finance</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 5 W's nav bar ── */}
      <div className="grid grid-cols-5 gap-px rounded-xl border border-fw-secondary overflow-hidden bg-fw-secondary">
        {[
          { w: 'Who', desc: 'Personas & access' },
          { w: 'What', desc: 'Product & architecture' },
          { w: 'When', desc: 'Roadmap & phases' },
          { w: 'Where', desc: 'Metros & locations' },
          { w: 'Why', desc: 'Principles & rationale' },
        ].map(item => (
          <div key={item.w} className="bg-fw-base px-4 py-3 text-center">
            <p className="text-base font-bold text-fw-link tracking-tight leading-none mb-0.5">{item.w}</p>
            <p className="text-[10px] text-fw-body">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* ── WHO ── */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <div className="shrink-0 w-9 h-9 rounded-xl bg-fw-accent border border-fw-active/20 flex items-center justify-center">
            <span className="text-base font-bold text-fw-link">W</span>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-fw-link uppercase tracking-widest leading-none mb-0.5">Who</p>
            <h3 className="text-figma-sm font-bold text-fw-heading tracking-[-0.02em]">Personas, Buyers & Market Context</h3>
          </div>
        </div>

        {/* Market Context — editorial stat strip */}
        <div className="rounded-xl overflow-hidden border border-fw-secondary mb-6">
          <div className="px-5 py-2.5 bg-fw-wash border-b border-fw-secondary flex items-center justify-between">
            <p className="text-[10px] font-semibold text-fw-bodyLight uppercase tracking-widest">Market Context — Multi-Cloud Enterprise, 2024–2025</p>
            <p className="text-[10px] text-fw-bodyLight font-mono">Gartner · Flexera · HashiCorp · IDC</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-fw-secondary bg-fw-base">
            {MARKET_STATS.map((stat, i) => (
              <div key={i} className="px-5 py-5">
                <p className="text-[2rem] font-bold text-fw-link leading-none tracking-tight mb-2">{stat.value}</p>
                <p className="text-[11px] text-fw-body leading-snug mb-3">{stat.label}</p>
                <p className="text-[9px] text-fw-bodyLight font-mono">{stat.source}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Buyer profiles */}
        <div className="mb-6">
          <p className="text-[10px] font-semibold text-fw-bodyLight uppercase tracking-wider mb-3">Who evaluates and approves this purchase</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {BUYER_PROFILES.map((b, i) => (
              <div key={i} className="rounded-xl border border-fw-secondary bg-fw-base overflow-hidden">
                <div className="px-4 py-3.5 border-b border-fw-secondary bg-fw-wash flex items-start justify-between gap-2">
                  <p className="text-figma-xs font-bold text-fw-heading leading-tight">{b.role}</p>
                  <span className={`shrink-0 text-[9px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded border ${b.authorityColor}`}>{b.authority}</span>
                </div>
                <div className="px-4 py-4 space-y-3">
                  <p className="text-figma-xs text-fw-body leading-relaxed">{b.context}</p>
                  <div>
                    <p className="text-[9px] font-semibold text-fw-bodyLight uppercase tracking-wider mb-2">Cares about</p>
                    <ul className="space-y-1.5">
                      {b.cares.map((c, j) => (
                        <li key={j} className="flex items-start gap-2">
                          <span className="shrink-0 mt-1.5 w-1 h-1 rounded-full bg-fw-bodyLight/50" />
                          <span className="text-[11px] text-fw-body leading-snug">{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Personas A & B — horizontal journey flow */}
        <div className="mb-5">
          <p className="text-[10px] font-semibold text-fw-bodyLight uppercase tracking-wider mb-3">Portal access paths — two entry types, identical experience inside</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {PERSONAS.map(p => (
              <div key={p.id} className="rounded-xl border border-fw-secondary bg-fw-base overflow-hidden">
                <div className="px-4 py-3 border-b border-fw-secondary bg-fw-wash flex items-center gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-fw-link flex items-center justify-center text-white text-[10px] font-bold">{p.id}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-figma-xs font-bold text-fw-heading">{p.heading}</p>
                    <p className="text-[10px] text-fw-body">{p.subhead}</p>
                  </div>
                </div>
                <div className="px-4 py-4">
                  {/* Journey as connected horizontal strip */}
                  <div className="flex items-start gap-0 mb-4 overflow-x-auto">
                    {p.journey.map((step, i) => (
                      <div key={i} className="flex items-start shrink-0">
                        <div className="flex flex-col items-center gap-1 max-w-[88px]">
                          <div className="w-6 h-6 rounded-full bg-fw-accent border border-fw-active/30 flex items-center justify-center shrink-0">
                            <span className="text-[9px] font-bold text-fw-link">{i + 1}</span>
                          </div>
                          <p className="text-[10px] text-fw-body text-center leading-tight">{step}</p>
                        </div>
                        {i < p.journey.length - 1 && (
                          <ArrowRight className="h-3 w-3 text-fw-secondary shrink-0 mt-1.5 mx-1" />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="rounded-lg bg-fw-wash border border-fw-secondary px-3 py-2.5">
                    <p className="text-[11px] text-fw-body leading-relaxed">{p.dependency}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Shared access rules */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl border border-fw-secondary bg-fw-base px-4 py-4 flex items-start gap-3">
            <CheckCircle2 className="h-4 w-4 text-fw-success shrink-0 mt-0.5" />
            <div>
              <p className="text-figma-xs font-semibold text-fw-heading mb-1">Identical experience</p>
              <p className="text-[11px] text-fw-body leading-snug">Persona A and B are indistinguishable inside the portal. All design decisions apply to both.</p>
            </div>
          </div>
          <div className="rounded-xl border border-fw-secondary bg-fw-base px-4 py-4 flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-fw-error shrink-0 mt-0.5" />
            <div>
              <p className="text-figma-xs font-semibold text-fw-heading mb-1">Privilege gate — every entry</p>
              <p className="text-[11px] text-fw-body leading-snug">Runs on every portal visit. No role = completely blocked. Show exact role name, direct to admin, no workaround.</p>
            </div>
          </div>
          <div className="rounded-xl border border-fw-secondary bg-fw-base px-4 py-4 flex items-start gap-3">
            <ShieldCheck className="h-4 w-4 text-fw-bodyLight shrink-0 mt-0.5" />
            <div>
              <p className="text-figma-xs font-semibold text-fw-heading mb-1">Self-service role management</p>
              <p className="text-[11px] text-fw-body leading-snug">Account admins assign or revoke provisioning role without raising an AT&T support ticket.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHAT ── */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="shrink-0 w-9 h-9 rounded-xl bg-fw-accent border border-fw-active/20 flex items-center justify-center">
            <span className="text-base font-bold text-fw-link">W</span>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-fw-link uppercase tracking-widest leading-none mb-0.5">What</p>
            <h3 className="text-figma-sm font-bold text-fw-heading tracking-[-0.02em]">Product & Architecture</h3>
          </div>
        </div>

        {/* Marketplace */}
        <div className="rounded-xl border border-fw-secondary bg-fw-base overflow-hidden mb-4">
          <div className="px-5 py-3 border-b border-fw-secondary bg-fw-wash flex items-center gap-2">
            <Store className="h-3.5 w-3.5 text-fw-bodyLight" />
            <p className="text-[10px] font-semibold text-fw-bodyLight uppercase tracking-wider">The Marketplace as Discovery Layer</p>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-figma-sm text-fw-body leading-relaxed">
              AT&T AI-grade network uses a <strong className="text-fw-heading">Marketplace</strong> as the product discovery and entry point. Customers browse available cloud connectivity products, select the LMCC product, and click "Get Started" — which enters the connection creation flow.
            </p>
            <div className="rounded-lg bg-fw-wash border border-fw-secondary p-4">
              <p className="text-[10px] font-semibold text-fw-bodyLight uppercase tracking-wider mb-3">Portal Entry Architecture</p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-figma-xs text-fw-body flex-wrap">
                  <span className="px-2 py-1 rounded-md bg-fw-accent border border-fw-active/20 text-fw-link font-medium whitespace-nowrap">AT&T Business Center</span>
                  <ArrowRight className="h-3.5 w-3.5 text-fw-bodyLight shrink-0" />
                  <span className="px-2 py-1 rounded-md bg-fw-accent border border-fw-active/20 text-fw-link font-medium whitespace-nowrap">AI-grade network</span>
                  <ArrowRight className="h-3.5 w-3.5 text-fw-bodyLight shrink-0" />
                  <span className="px-2 py-1 rounded-md bg-fw-wash border border-fw-secondary text-fw-body font-medium whitespace-nowrap">Marketplace → LMCC card</span>
                  <ArrowRight className="h-3.5 w-3.5 text-fw-bodyLight shrink-0" />
                  <span className="px-2 py-1 rounded-md bg-fw-primary text-white font-medium whitespace-nowrap">Flow 03 — AT&T-first</span>
                </div>
                <div className="flex items-center gap-2 text-figma-xs text-fw-body flex-wrap">
                  <span className="px-2 py-1 rounded-md bg-fw-wash border border-fw-secondary text-fw-body font-medium whitespace-nowrap">AWS Interconnect Console</span>
                  <ArrowRight className="h-3.5 w-3.5 text-fw-bodyLight shrink-0" />
                  <span className="px-2 py-1 rounded-md bg-fw-wash border border-fw-secondary text-fw-body font-medium whitespace-nowrap">Generate ActivationKey</span>
                  <ArrowRight className="h-3.5 w-3.5 text-fw-bodyLight shrink-0" />
                  <span className="px-2 py-1 rounded-md bg-fw-accent border border-fw-active/20 text-fw-link font-medium whitespace-nowrap">AI-grade network</span>
                  <ArrowRight className="h-3.5 w-3.5 text-fw-bodyLight shrink-0" />
                  <span className="px-2 py-1 rounded-md bg-fw-primary text-white font-medium whitespace-nowrap">Flow 04 — AWS-first</span>
                </div>
                <div className="flex items-center gap-2 text-figma-xs text-fw-body mt-1 pt-2 border-t border-fw-secondary flex-wrap">
                  <span className="text-fw-bodyLight font-medium">Both flows converge →</span>
                  <span className="px-2 py-1 rounded-md bg-fw-wash border border-fw-secondary text-fw-body font-medium whitespace-nowrap">Key Accepted → Negotiating → BGP Forming</span>
                  <ArrowRight className="h-3.5 w-3.5 text-fw-bodyLight shrink-0" />
                  <span className="px-2 py-1 rounded-md bg-fw-successLight border border-fw-success/30 text-fw-success font-medium whitespace-nowrap">Live</span>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-fw-accent border border-fw-active/20">
              <AlertCircle className="h-3.5 w-3.5 text-fw-link shrink-0 mt-0.5" />
              <p className="text-figma-xs text-fw-body"><strong className="text-fw-heading">Extensibility:</strong> Each future LMCC (Azure, GCP) gets its own Marketplace card. Add a provider by adding a card — not by rebuilding the portal. Flows, status taxonomy, and error patterns are provider-agnostic.</p>
            </div>
          </div>
        </div>

        {/* Portal Swivel */}
        <div className="rounded-xl border border-fw-secondary bg-fw-base overflow-hidden">
          <div className="px-5 py-3 border-b border-fw-secondary bg-fw-wash flex items-center gap-2">
            <Key className="h-3.5 w-3.5 text-fw-bodyLight" />
            <p className="text-[10px] font-semibold text-fw-bodyLight uppercase tracking-wider">The Portal Swivel — Known UX Friction</p>
          </div>
          <div className="divide-y divide-fw-secondary">
            <div className="px-5 py-3.5 flex items-start gap-4">
              <span className="shrink-0 px-2 py-0.5 rounded-md bg-fw-wash border border-fw-secondary text-[10px] font-semibold text-fw-bodyLight uppercase">Preview + GA</span>
              <p className="text-figma-xs text-fw-body leading-relaxed flex-1">Customer manually copies the ActivationKey from one portal and pastes it into the other. AWS integration limitation — not an AT&T design choice. AT&T's job: make this step <strong className="text-fw-heading">as clear and foolproof as possible</strong> with prominent copy-to-clipboard and explicit instruction text.</p>
            </div>
            <div className="px-5 py-3.5 flex items-start gap-4">
              <span className="shrink-0 px-2 py-0.5 rounded-md bg-fw-successLight border border-fw-success/30 text-[10px] font-semibold text-fw-success uppercase">Post-GA</span>
              <p className="text-figma-xs text-fw-body leading-relaxed flex-1">Portal swivel <strong className="text-fw-heading">eliminated entirely</strong>. Automated key transfer — customer never copies a key. Single uninterrupted flow within one portal.</p>
            </div>
            <div className="px-5 py-3.5 flex items-start gap-4 bg-fw-accent/40">
              <span className="shrink-0 px-2 py-0.5 rounded-md bg-fw-accent border border-fw-active/30 text-[10px] font-semibold text-fw-link uppercase">Design note</span>
              <p className="text-figma-xs text-fw-body leading-relaxed flex-1">The 7-day key validity window must be surfaced clearly. What the portal shows when the key expires before the customer acts is currently an <strong className="text-fw-heading">undefined error state</strong> in both source documents.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHEN ── */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="shrink-0 w-9 h-9 rounded-xl bg-fw-accent border border-fw-active/20 flex items-center justify-center">
            <span className="text-base font-bold text-fw-link">W</span>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-fw-link uppercase tracking-widest leading-none mb-0.5">When</p>
            <h3 className="text-figma-sm font-bold text-fw-heading tracking-[-0.02em]">Roadmap & Phases</h3>
          </div>
        </div>
        <p className="text-figma-xs text-fw-body mb-3">What opens up at each phase. Click to expand. Source: LMCC Product Notes 04092026 Section 2 + Design Brief 04212026.</p>
        <div className="space-y-2">
          {ROADMAP_PHASES.map(phase => (
            <div key={phase.phase} className={`rounded-xl border overflow-hidden ${phase.borderColor} ${expandedPhase === phase.phase ? phase.bgColor : 'bg-fw-base border-fw-secondary'}`}>
              <button
                onClick={() => setExpandedPhase(expandedPhase === phase.phase ? null : phase.phase)}
                className="w-full px-5 py-3.5 flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-3">
                  <span className={`text-figma-sm font-bold ${expandedPhase === phase.phase ? phase.color : 'text-fw-heading'}`}>{phase.phase}</span>
                  <span className="text-figma-xs text-fw-body">{phase.date}</span>
                </div>
                <ArrowRight className={`h-4 w-4 text-fw-bodyLight transition-transform ${expandedPhase === phase.phase ? 'rotate-90' : ''}`} />
              </button>
              {expandedPhase === phase.phase && (
                <div className="border-t border-fw-secondary/60">
                  <table className="w-full text-figma-xs">
                    <tbody className="divide-y divide-fw-secondary/40">
                      {phase.rows.map(row => (
                        <tr key={row.label}>
                          <td className="px-5 py-2.5 font-semibold text-fw-bodyLight w-32 shrink-0">{row.label}</td>
                          <td className="px-5 py-2.5 text-fw-body">{row.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── WHERE ── */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="shrink-0 w-9 h-9 rounded-xl bg-fw-accent border border-fw-active/20 flex items-center justify-center">
            <span className="text-base font-bold text-fw-link">W</span>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-fw-link uppercase tracking-widest leading-none mb-0.5">Where</p>
            <h3 className="text-figma-sm font-bold text-fw-heading tracking-[-0.02em]">Metros & Locations</h3>
          </div>
        </div>
        <div className="rounded-xl border border-fw-secondary bg-fw-base overflow-hidden mb-4">
          <div className="divide-y divide-fw-secondary">
            {WHERE_METROS.map(m => (
              <div key={m.metro} className="px-5 py-4 flex items-start gap-4">
                <MapPin className={`h-4 w-4 shrink-0 mt-0.5 ${m.status === 'blocked' ? 'text-fw-error' : 'text-fw-link'}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <p className={`text-figma-sm font-semibold ${m.status === 'blocked' ? 'text-fw-bodyLight line-through' : 'text-fw-heading'}`}>{m.metro}</p>
                    <div className="flex gap-1.5">
                      {m.phases.map((phase, i) => (
                        <span key={phase} className={`text-[10px] font-semibold ${m.phaseColors[i]}`}>{phase}</span>
                      ))}
                    </div>
                    {m.status === 'blocked' && (
                      <span className="px-2 py-0.5 rounded bg-fw-errorLight text-fw-error text-[10px] font-semibold">Never available</span>
                    )}
                  </div>
                  <p className="text-figma-xs text-fw-body leading-relaxed">{m.notes}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg bg-fw-accent border border-fw-active/20 px-4 py-3 flex items-start gap-2">
          <AlertCircle className="h-3.5 w-3.5 text-fw-link shrink-0 mt-0.5" />
          <p className="text-figma-xs text-fw-body"><strong className="text-fw-heading">Metro display rule:</strong> Customers see metro names only ("San Jose, CA", "Ashburn, VA"). Never show datacenter names (Equinix, CoreSite) or colocation providers. New metros appear automatically via ListEnvironments API when infrastructure is live — no code release required.</p>
        </div>
      </section>

      {/* ── WHY ── */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="shrink-0 w-9 h-9 rounded-xl bg-fw-accent border border-fw-active/20 flex items-center justify-center">
            <span className="text-base font-bold text-fw-link">W</span>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-fw-link uppercase tracking-widest leading-none mb-0.5">Why</p>
            <h3 className="text-figma-sm font-bold text-fw-heading tracking-[-0.02em]">Design Principles & Strategic Rationale</h3>
          </div>
        </div>

        {/* Design Principles */}
        <div className="mb-4">
          <p className="text-figma-xs text-fw-body mb-3">Four rules that govern every screen. Violating one requires explicit product approval.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DESIGN_PRINCIPLES.map((p, i) => {
              const Icon = p.icon;
              return (
                <div key={i} className="rounded-xl border border-fw-secondary bg-fw-base p-5">
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 w-8 h-8 rounded-lg bg-fw-accent border border-fw-active/20 flex items-center justify-center">
                      <Icon className="h-4 w-4 text-fw-link" />
                    </div>
                    <div>
                      <p className="text-figma-sm font-semibold text-fw-heading mb-1">{p.title}</p>
                      <p className="text-figma-xs text-fw-body leading-relaxed">{p.body}</p>
                      <p className="text-[10px] text-fw-bodyLight mt-2 font-mono">Source: {p.source}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Future LMCCs */}
        <div>
          <p className="text-figma-xs text-fw-body mb-3">AWS Interconnect – last mile is the only cloud provider with a formalized partner delivery API standard today. This LMCC establishes the pattern for when Azure and GCP standards emerge.</p>
          <div className="rounded-xl border border-fw-secondary overflow-hidden">
            <table className="w-full text-figma-xs">
              <thead>
                <tr className="bg-fw-wash border-b border-fw-secondary">
                  <th className="px-5 py-3 text-left font-semibold text-fw-bodyLight">Cloud Provider</th>
                  <th className="px-5 py-3 text-left font-semibold text-fw-bodyLight">Status</th>
                  <th className="px-5 py-3 text-left font-semibold text-fw-bodyLight">AT&T Product</th>
                  <th className="px-5 py-3 text-left font-semibold text-fw-bodyLight">Partner API</th>
                  <th className="px-5 py-3 text-left font-semibold text-fw-bodyLight">Preview</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-fw-secondary">
                {FUTURE_LMCCS.map(row => (
                  <tr key={row.provider} className="hover:bg-fw-wash/50">
                    <td className="px-5 py-3 font-semibold text-fw-heading">{row.provider}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold ${row.statusBg} ${row.statusColor}`}>{row.status}</span>
                    </td>
                    <td className="px-5 py-3 text-fw-body">{row.product}</td>
                    <td className="px-5 py-3 text-fw-body">{row.api}</td>
                    <td className="px-5 py-3 text-fw-body font-mono">{row.preview}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-fw-wash border border-fw-secondary">
            <GitBranch className="h-3.5 w-3.5 text-fw-bodyLight shrink-0 mt-0.5" />
            <p className="text-figma-xs text-fw-body"><strong className="text-fw-body">Design contract for future LMCCs:</strong> The status taxonomy, 3-choice creation pattern, error state categories, and marketplace entry point are all provider-agnostic. New cloud providers inherit the pattern — only provider-specific terminology and API bindings change.</p>
          </div>
        </div>
      </section>

      {/* ── Strategic Open Decisions ── */}
      <section>
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="h-4 w-4 text-fw-bodyLight" />
            <h3 className="text-figma-sm font-bold text-fw-heading uppercase tracking-wider">Strategic Open Decisions</h3>
          </div>
          <p className="text-figma-xs text-fw-body">Product or engineering decisions that block or constrain design. Each one has an owner. None of these can be resolved by design alone.</p>
        </div>
        <div className="divide-y divide-fw-secondary border border-fw-secondary rounded-xl overflow-hidden">
          {STRATEGIC_DECISIONS.map(d => (
            <div key={d.id}>
              <button
                onClick={() => setExpandedDecision(expandedDecision === d.id ? null : d.id)}
                className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-fw-wash transition-colors"
              >
                <div className="flex items-center gap-3">
                  {d.urgency === 'blocked'
                    ? <AlertCircle className="h-4 w-4 text-fw-error shrink-0" />
                    : <Clock className="h-4 w-4 text-fw-bodyLight shrink-0" />
                  }
                  <span className="text-figma-sm font-semibold text-fw-heading">{d.title}</span>
                  <span className={`text-tag-xs font-semibold uppercase tracking-wide ${d.urgency === 'blocked' ? 'text-fw-error' : 'text-fw-bodyLight'}`}>{d.urgency}</span>
                </div>
                <ArrowRight className={`h-4 w-4 text-fw-bodyLight shrink-0 transition-transform ${expandedDecision === d.id ? 'rotate-90' : ''}`} />
              </button>
              {expandedDecision === d.id && (
                <div className="border-t border-fw-secondary/60 px-5 py-4 space-y-3 bg-fw-wash/40">
                  <div>
                    <p className="text-tag-xs font-semibold text-fw-bodyLight uppercase tracking-wider mb-1">Decision</p>
                    <p className="text-figma-xs text-fw-body leading-relaxed">{d.description}</p>
                  </div>
                  <div>
                    <p className="text-tag-xs font-semibold text-fw-bodyLight uppercase tracking-wider mb-1">Design impact</p>
                    <p className="text-figma-xs text-fw-body leading-relaxed">{d.designImpact}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-tag-xs font-semibold text-fw-bodyLight uppercase tracking-wider">Owner:</p>
                    <span className="text-figma-xs text-fw-body">{d.owner}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── 7. Usability Testing Plan ── */}
      <section>
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-1">
            <FlaskConical className="h-4 w-4 text-fw-bodyLight" />
            <h3 className="text-figma-sm font-bold text-fw-heading uppercase tracking-wider">Usability Testing Plan</h3>
          </div>
          <p className="text-figma-xs text-fw-body max-w-2xl">Moderated task-based testing across both flows, two cohort stages, and a set of instrumented KPIs. The portal swivel — manual ActivationKey transfer between two portals — is the highest-risk interaction and must be isolated as a primary test task.</p>
        </div>

        {/* Methodology + Participants */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          <div className="border border-fw-secondary rounded-xl p-5">
            <p className="text-tag-xs font-semibold text-fw-bodyLight uppercase tracking-wider mb-3">Methodology</p>
            <div className="space-y-2.5">
              {[
                { label: 'Method', value: 'Moderated remote task-based sessions (think-aloud protocol)' },
                { label: 'Session length', value: '60 min — 10 min intro, 40 min tasks, 10 min debrief' },
                { label: 'Flows covered', value: 'Flow 03 (AT&T-first) and Flow 04 (AWS-first) tested in separate cohorts' },
                { label: 'Environment', value: 'Staging portal + sandboxed AWS Interconnect Console' },
                { label: 'Owner', value: 'AT&T UX Research, facilitated by Design Lead' },
              ].map(row => (
                <div key={row.label} className="flex gap-3">
                  <span className="text-figma-xs text-fw-bodyLight shrink-0 w-28">{row.label}</span>
                  <span className="text-figma-xs text-fw-body">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="border border-fw-secondary rounded-xl p-5">
            <p className="text-tag-xs font-semibold text-fw-bodyLight uppercase tracking-wider mb-3">Participant Criteria</p>
            <div className="space-y-2.5">
              {[
                { label: 'Role', value: 'Enterprise network engineers or cloud infrastructure owners' },
                { label: 'Account type', value: 'Existing AI-grade network customers or named Preview accounts' },
                { label: 'AWS experience', value: 'Familiarity with AWS Interconnect – last mile or VPC networking (screener required)' },
                { label: 'Sample size', value: '5 participants per flow per round (10 total per cohort stage)' },
                { label: 'Recruitment', value: 'AT&T Customer Success team — Preview cohort first' },
              ].map(row => (
                <div key={row.label} className="flex gap-3">
                  <span className="text-figma-xs text-fw-bodyLight shrink-0 w-28">{row.label}</span>
                  <span className="text-figma-xs text-fw-body">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cadence */}
        <div className="border border-fw-secondary rounded-xl overflow-hidden mb-5">
          <div className="px-5 py-3 border-b border-fw-secondary bg-fw-wash">
            <p className="text-tag-xs font-semibold text-fw-bodyLight uppercase tracking-wider">Test Cadence</p>
          </div>
          <div className="divide-y divide-fw-secondary">
            {[
              { phase: 'Round 1 — Pre-Preview', timing: 'June 2026', focus: 'Both flows end-to-end. Primary focus: portal swivel comprehension and ActivationKey upload error recovery. Pass/fail gates Preview launch.' },
              { phase: 'Round 2 — Post-Preview (4 weeks in)', timing: 'July 2026', focus: 'Repeat with Preview cohort users who have attempted the real flow. Focus: friction on the provisioning status sequence, BGP state comprehension, and Path Health display.' },
              { phase: 'Round 3 — Pre-GA', timing: 'October 2026', focus: 'GA bandwidth tiers, contract selection, and upgrade path from trial. Validate all error states introduced by GA scope.' },
            ].map(row => (
              <div key={row.phase} className="px-5 py-3.5 grid grid-cols-5 gap-4 items-start">
                <div className="col-span-2">
                  <p className="text-figma-xs font-semibold text-fw-heading">{row.phase}</p>
                  <p className="text-figma-xs text-fw-body mt-0.5">{row.timing}</p>
                </div>
                <p className="text-figma-xs text-fw-body leading-relaxed col-span-3">{row.focus}</p>
              </div>
            ))}
          </div>
        </div>

        {/* KPIs */}
        <div className="border border-fw-secondary rounded-xl overflow-hidden mb-5">
          <div className="px-5 py-3 border-b border-fw-secondary bg-fw-wash">
            <p className="text-tag-xs font-semibold text-fw-bodyLight uppercase tracking-wider">KPIs &amp; Targets</p>
          </div>
          <div className="divide-y divide-fw-secondary">
            {[
              { metric: 'Flow completion rate', target: '≥ 85%', method: 'Task observed by facilitator — both flows', notes: 'Failure = participant cannot complete without intervention' },
              { metric: 'Portal swivel time', target: '< 3 min', method: 'Facilitator-timed from portal exit to key upload', notes: 'Exceeding 5 min triggers UX escalation flag' },
              { metric: 'Key upload error rate', target: '< 10%', method: 'Mixpanel: lmcc_key_upload_error events per session', notes: 'Counts format errors, expiry errors, wrong-account errors' },
              { metric: 'Provisioning status comprehension', target: '≥ 90%', method: 'Post-task question: "What does this screen tell you?"', notes: 'Pass = participant correctly identifies current state' },
              { metric: 'BGP path health comprehension', target: '≥ 80%', method: 'Post-task question on Path Health diagram', notes: 'Validates 4-path display is legible without explanation' },
              { metric: 'Time-to-first-success (new user)', target: '< 15 min', method: 'Full session timing from sign-in to Live status screen', notes: 'Baseline for onboarding optimization' },
              { metric: 'Error recovery success rate', target: '≥ 75%', method: 'Observed: participant self-recovers from seeded errors', notes: 'Seeded errors: expired key, wrong account, invalid format' },
              { metric: 'System Usability Scale (SUS)', target: '≥ 75', method: 'SUS questionnaire post-session (10-item standardized)', notes: 'Industry benchmark for "acceptable" enterprise tooling' },
            ].map(row => (
              <div key={row.metric} className="px-5 py-3 grid grid-cols-12 gap-3 items-start">
                <p className="text-figma-xs font-semibold text-fw-heading col-span-3">{row.metric}</p>
                <p className="text-figma-xs font-semibold text-fw-link col-span-1">{row.target}</p>
                <p className="text-figma-xs text-fw-body col-span-4">{row.method}</p>
                <p className="text-figma-xs text-fw-body col-span-4">{row.notes}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Analytics instrumentation for usability */}
        <div className="border border-fw-secondary rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-fw-secondary bg-fw-wash">
            <p className="text-tag-xs font-semibold text-fw-bodyLight uppercase tracking-wider">Analytics Instrumentation — Usability-Linked Events</p>
          </div>
          <div className="divide-y divide-fw-secondary">
            {[
              { event: 'lmcc_flow_started', trigger: 'User lands on Create Connection with isLmcc intent', kpi: 'Flow completion rate denominator' },
              { event: 'lmcc_portal_swivel_exit', trigger: 'User clicks "Go to AWS Console" or equivalent CTA', kpi: 'Portal swivel time start' },
              { event: 'lmcc_key_upload_attempted', trigger: 'User submits ActivationKey paste field', kpi: 'Key upload error rate denominator' },
              { event: 'lmcc_key_upload_error', trigger: 'Key validation fails (format / expired / wrong account)', kpi: 'Key upload error rate numerator; error type captured as property' },
              { event: 'lmcc_provisioning_status_viewed', trigger: 'User views status screen at each of 4 stages', kpi: 'Provisioning comprehension proxy; stage captured as property' },
              { event: 'lmcc_path_health_expanded', trigger: 'User clicks into a path detail in the 4-path diagram', kpi: 'BGP comprehension proxy — engagement signals understanding' },
              { event: 'lmcc_flow_completed', trigger: 'Connection reaches Live status and user views confirmation', kpi: 'Flow completion rate numerator; elapsed_ms property for time-to-success' },
              { event: 'lmcc_error_recovery_success', trigger: 'User successfully re-submits after an error state', kpi: 'Error recovery rate numerator' },
            ].map(row => (
              <div key={row.event} className="px-5 py-3 grid grid-cols-12 gap-3 items-start">
                <p className="text-figma-xs font-mono text-fw-link col-span-4">{row.event}</p>
                <p className="text-figma-xs text-fw-body col-span-5">{row.trigger}</p>
                <p className="text-figma-xs text-fw-body col-span-3">{row.kpi}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 8. Mixpanel Instrumentation ── */}
      <section>
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="h-4 w-4 text-fw-bodyLight" />
            <h3 className="text-figma-sm font-bold text-fw-heading uppercase tracking-wider">Instrumentation — Mixpanel Event Tracking</h3>
          </div>
          <p className="text-figma-xs text-fw-body">
            Mixpanel provides the event-level funnel data that neither AT&T's internal dashboards nor AWS reports will surface — specifically, where customers drop off between portals, which error states are actually occurring, and whether the 4-stage provisioning sequence feels fast or broken. Plans differ between Preview and GA because Preview is a controlled cohort; GA requires broader instrumentation to support product decisions at scale.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          {/* Preview */}
          <div className="rounded-xl border border-fw-secondary bg-fw-base p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2 py-0.5 rounded bg-fw-accent text-fw-link border border-fw-active/20 text-tag-xs font-semibold uppercase tracking-wider">Preview</span>
              <span className="text-figma-xs text-fw-body">Controlled cohort · instrumentation focused on funnel and error surface</span>
            </div>
            <ul className="space-y-2 text-figma-xs text-fw-body leading-relaxed">
              {[
                { event: 'lmcc_onboarding_started', note: 'Entry point — marketplace tile vs direct link' },
                { event: 'lmcc_flow_selected', note: 'AWS-first or AT&T-first (Build it for me)' },
                { event: 'lmcc_aws_account_entered', note: 'Validates customers have their account number ready' },
                { event: 'lmcc_key_copy_clicked', note: 'Customer copied key in AWS console (deep-link handoff)' },
                { event: 'lmcc_key_paste_submitted', note: 'Key submitted in AT&T portal — critical portal-swivel completion point' },
                { event: 'lmcc_provisioning_stage', note: 'Stage name + timestamp (key-accepted → negotiating → bgp → live)' },
                { event: 'lmcc_provisioning_completed', note: 'Time-to-live delta from key paste — validates < 5 min KPI' },
                { event: 'lmcc_error_encountered', note: 'Error code + step + flow — maps to design error coverage' },
              ].map(({ event, note }) => (
                <li key={event} className="flex gap-2">
                  <span className="shrink-0 font-mono text-fw-link text-[10px] bg-fw-accent px-1.5 py-0.5 rounded mt-0.5 leading-tight">{event}</span>
                  <span className="text-fw-body">{note}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* GA */}
          <div className="rounded-xl border border-fw-secondary bg-fw-base p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2 py-0.5 rounded bg-fw-successLight text-fw-success border border-fw-success/20 text-tag-xs font-semibold uppercase tracking-wider">GA — Nov 16 2026</span>
              <span className="text-figma-xs text-fw-body">Full release · expanded to cover billing, bandwidth, and resiliency decisions</span>
            </div>
            <ul className="space-y-2 text-figma-xs text-fw-body leading-relaxed">
              {[
                { event: 'All Preview events', note: 'Carry forward — enables cohort comparison Preview vs GA behavior' },
                { event: 'lmcc_metro_selected', note: 'San Jose or Ashburn — signals geographic demand split' },
                { event: 'lmcc_bandwidth_selected', note: 'Tier chosen (1/2/5/10/25/50/100 Gbps) — informs tier distribution' },
                { event: 'lmcc_resiliency_opted_in', note: 'Max resiliency attach rate — direct instrument of the 10% KPI' },
                { event: 'lmcc_billing_acknowledged', note: 'Billing acknowledgment confirmed — required before provisioning' },
                { event: 'lmcc_connection_deleted', note: 'Churn signal — time-to-delete from live tells early adoption story' },
                { event: 'lmcc_dashboard_viewed', note: 'Post-live engagement — is the connection being monitored?' },
                { event: 'lmcc_bandwidth_update_attempted', note: 'GA-only: tracks change requests and failure rate' },
              ].map(({ event, note }) => (
                <li key={event} className="flex gap-2">
                  <span className="shrink-0 font-mono text-fw-link text-[10px] bg-fw-accent px-1.5 py-0.5 rounded mt-0.5 leading-tight">{event}</span>
                  <span className="text-fw-body">{note}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="rounded-xl border border-fw-secondary bg-fw-base p-5">
          <p className="text-figma-xs font-semibold text-fw-heading mb-2">What this data answers</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-figma-xs text-fw-body">
            <div>
              <p className="font-semibold text-fw-heading mb-1">Portal swivel drop-off</p>
              <p className="text-fw-body leading-relaxed">Funnel from <span className="font-mono text-fw-link">lmcc_key_copy_clicked</span> → <span className="font-mono text-fw-link">lmcc_key_paste_submitted</span>. If &gt; 20% abandon between those two events, the manual transfer step needs a redesign before GA.</p>
            </div>
            <div>
              <p className="font-semibold text-fw-heading mb-1">Real error distribution</p>
              <p className="text-fw-body leading-relaxed">The 14 defined error states in the design spec may not reflect what customers actually hit. <span className="font-mono text-fw-link">lmcc_error_encountered</span> + error code reveals which ones to invest in vs. which are theoretical.</p>
            </div>
            <div>
              <p className="font-semibold text-fw-heading mb-1">KPI validation in production</p>
              <p className="text-fw-body leading-relaxed">Time-to-live delta from <span className="font-mono text-fw-link">lmcc_key_paste_submitted</span> → final provisioning stage. The only reliable way to confirm the &lt; 5 min SLA is actually being met from the customer's perspective, not the infrastructure's.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 9. Design for Speed ── */}
      <section>
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="h-4 w-4 text-fw-bodyLight" />
            <h3 className="text-figma-sm font-bold text-fw-heading uppercase tracking-wider">KPIs as Design Constraints</h3>
          </div>
          <p className="text-figma-xs text-fw-body">These are not just engineering metrics. They constrain what the UI is allowed to show and how long any state can reasonably display.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              metric: '< 5 minutes',
              label: 'Time-to-provision',
              detail: 'Customer confirmation → BGP Active. The provisioning timeline UI must feel fast — not an open-ended wait. If status is taking longer than 5 minutes, that is an error state, not normal behavior.',
              source: 'PRD Section 14',
            },
            {
              metric: '98%',
              label: 'Provisioning success rate',
              detail: 'Automated workflows completed without a system error. The 2% failure budget is the error state design budget — each failure type needs a distinct, actionable screen. Not a generic error page.',
              source: 'PRD Section 14',
            },
            {
              metric: '10%',
              label: 'Maximum resiliency attach rate',
              detail: '10% of new AI-grade network Standard and Advanced VNCs using maximum resiliency within 12 months of GA. A business KPI — not customer-facing, but it shapes what AT&T needs to make prominent vs. easy to discover.',
              source: 'PRD Section 14',
            },
          ].map((kpi, i) => (
            <div key={i} className="rounded-xl border border-fw-secondary bg-fw-base p-5">
              <p className="text-figma-2xl font-bold text-fw-heading tracking-[-0.04em] leading-none mb-1">{kpi.metric}</p>
              <p className="text-figma-sm font-semibold text-fw-link mb-2">{kpi.label}</p>
              <p className="text-figma-xs text-fw-body leading-relaxed">{kpi.detail}</p>
              <p className="text-tag-xs text-fw-bodyLight mt-2 font-mono">Source: {kpi.source}</p>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
