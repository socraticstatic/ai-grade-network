import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

// All colors use Flywheel fw-* tokens via Tailwind classes or their resolved values.
// Inline styles reference the token values directly where Tailwind classes can't reach.
const FW = {
  base:       '#ffffff',
  wash:       '#f8fafb',
  neutral:    '#f3f4f6',
  secondary:  '#dcdfe3',
  heading:    '#1d2329',
  body:       '#454b52',
  bodyLight:  '#686e74',
  disabled:   '#878c94',
  link:       '#0057b8',
  linkHover:  '#00388f',
  accent:     '#e6f6fd',
  active:     '#0057b8',
  success:    '#2d7e24',
  successLight: 'rgb(98 208 45 / 0.12)',
  warn:       '#686e74',
  warnLight:  '#f3f4f6',
  aws:        '#1d2329',
  awsLight:   '#f3f4f6',
  awsBorder:  '#dcdfe3',
};

// ── Portal-chrome frame ────────────────────────────────────────────────────────
function PortalFrame({
  children,
  url,
  isAws = false,
}: {
  children: React.ReactNode;
  url: string;
  isAws?: boolean;
}) {
  return (
    <div
      className="rounded-xl overflow-hidden w-full"
      style={{
        background: FW.base,
        border: `1px solid ${isAws ? FW.awsBorder : FW.secondary}`,
        boxShadow: '0 1px 4px rgba(29,35,41,0.06)',
      }}
    >
      {/* Chrome bar */}
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{
          background: isAws ? FW.awsLight : FW.accent,
          borderBottom: `1px solid ${isAws ? FW.awsBorder : FW.secondary}`,
        }}
      >
        <div className="flex gap-1 shrink-0">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full" style={{ background: FW.secondary }} />
          ))}
        </div>
        <div
          className="flex-1 px-2 py-0.5 rounded text-[8px] leading-none bg-white"
          style={{ color: FW.bodyLight, fontFamily: 'monospace', border: `1px solid ${FW.secondary}` }}
        >
          {url}
        </div>
        {isAws && (
          <div className="text-[7px] font-bold shrink-0" style={{ color: FW.aws }}>
            AWS
          </div>
        )}
        {!isAws && (
          <div className="text-[6px] font-bold shrink-0" style={{ color: FW.link }}>
            AT&T
          </div>
        )}
      </div>
      <div className="p-3 bg-white">{children}</div>
    </div>
  );
}

// ── Screen 1: Marketplace ──────────────────────────────────────────────────────
function ScreenMarketplace() {
  return (
    <PortalFrame url="netbond.att.com/marketplace">
      <div className="space-y-1.5">
        <p className="text-[7px] font-semibold uppercase tracking-[0.1em]" style={{ color: FW.disabled }}>
          NetBond Marketplace
        </p>
        <div
          className="rounded-lg p-2.5 space-y-2"
          style={{ background: FW.accent, border: `1px solid ${FW.link}33` }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-md shrink-0 flex items-center justify-center"
              style={{ background: FW.link }}
            >
              <span className="text-[6px] font-black text-white tracking-tight">AWS</span>
            </div>
            <div>
              <p className="text-[8px] font-bold leading-tight" style={{ color: FW.heading }}>
                LMCC Max Resiliency
              </p>
              <p className="text-[6px] leading-tight" style={{ color: FW.bodyLight }}>
                Dedicated AWS connectivity · 4 diverse paths
              </p>
            </div>
            <div
              className="ml-auto text-[6px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ background: FW.successLight, color: FW.success }}
            >
              Available
            </div>
          </div>
          <div
            className="w-full text-center text-[7px] font-bold py-1.5 rounded-md"
            style={{ background: FW.link, color: '#fff' }}
          >
            Get Started
          </div>
        </div>
        {['Azure ExpressRoute', 'Google Cloud Interconnect'].map(name => (
          <div
            key={name}
            className="rounded-lg p-2 flex items-center justify-between"
            style={{ background: FW.wash, border: `1px solid ${FW.secondary}` }}
          >
            <p className="text-[7px]" style={{ color: FW.disabled }}>{name}</p>
            <span
              className="text-[6px] px-1.5 py-0.5 rounded-full"
              style={{ background: FW.neutral, color: FW.disabled }}
            >
              Coming soon
            </span>
          </div>
        ))}
      </div>
    </PortalFrame>
  );
}

// ── Screen 2: Create connection wizard ────────────────────────────────────────
function ScreenWizardCreate() {
  return (
    <PortalFrame url="netbond.att.com/create">
      <div className="space-y-2">
        <p className="text-[6px] font-bold uppercase tracking-[0.1em]" style={{ color: FW.link }}>
          Create Connection
        </p>
        {/* Connection type row */}
        <div className="space-y-1">
          <p className="text-[6px]" style={{ color: FW.disabled }}>Connection type</p>
          <div className="rounded-md px-2 py-1.5" style={{ background: FW.accent, border: `1px solid ${FW.link}44` }}>
            <p className="text-[7px] font-bold" style={{ color: FW.heading }}>Internet to Cloud</p>
          </div>
        </div>
        {/* Resiliency row */}
        <div className="space-y-1">
          <p className="text-[6px]" style={{ color: FW.disabled }}>Resiliency</p>
          <div className="rounded-md px-2 py-1.5 flex items-center justify-between" style={{ background: FW.accent, border: `1px solid ${FW.link}44` }}>
            <p className="text-[7px] font-bold" style={{ color: FW.heading }}>Maximum Resiliency</p>
            <span className="text-[5px] font-bold uppercase" style={{ color: FW.link }}>AWS Max</span>
          </div>
        </div>
        {/* Provider */}
        <div className="space-y-1">
          <p className="text-[6px]" style={{ color: FW.disabled }}>Provider</p>
          <div className="rounded-md px-2 py-1.5" style={{ background: FW.accent, border: `1px solid ${FW.link}44` }}>
            <p className="text-[7px] font-bold" style={{ color: FW.heading }}>Amazon Web Services</p>
          </div>
        </div>
        <div className="w-full text-center text-[7px] font-bold py-1.5 rounded-md" style={{ background: FW.link, color: '#fff' }}>
          Continue →
        </div>
      </div>
    </PortalFrame>
  );
}

// ── Screen 3: AWS account entry ────────────────────────────────────────────────
function ScreenAccount() {
  return (
    <PortalFrame url="netbond.att.com/create/aws">
      <div className="space-y-2.5">
        <p className="text-[6px] font-bold uppercase tracking-[0.1em]" style={{ color: FW.link }}>
          Step 1 of 1
        </p>
        <p className="text-[9px] font-black leading-tight" style={{ color: FW.heading }}>
          Your AWS account number
        </p>
        <div className="space-y-1">
          <p className="text-[6px]" style={{ color: FW.bodyLight }}>AWS Account Number</p>
          <div
            className="rounded-lg px-2.5 py-2 flex items-center gap-1"
            style={{ background: FW.base, border: `1.5px solid ${FW.link}` }}
          >
            <p className="text-[8px] font-mono" style={{ color: FW.heading, letterSpacing: '0.06em' }}>
              1234 5678 9012
            </p>
            <div className="ml-auto w-0.5 h-3 rounded-full animate-pulse" style={{ background: FW.link }} />
          </div>
          <p className="text-[6px]" style={{ color: FW.disabled }}>
            12 digits · Account Settings → Account ID in AWS Console
          </p>
        </div>
        <div
          className="w-full text-center text-[7px] font-bold py-1.5 rounded-md"
          style={{ background: FW.link, color: '#fff' }}
        >
          Send Connection Request →
        </div>
      </div>
    </PortalFrame>
  );
}

// ── Screen 4: Handoff screen (/aws-handoff) ────────────────────────────────────
function ScreenHandoff() {
  return (
    <PortalFrame url="netbond.att.com/aws-handoff">
      <div className="space-y-2.5">
        {/* Bridge visual — simplified */}
        <div className="flex items-center justify-between gap-2">
          <div className="text-[7px] font-bold" style={{ color: FW.link }}>AT&T ✓</div>
          <div className="flex-1 flex items-center gap-1">
            <div className="flex-1 h-px" style={{ background: FW.active }} />
            <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: FW.active }}>
              <ArrowRight style={{ width: 8, height: 8, color: '#fff' }} />
            </div>
            <div className="flex-1 h-px border-t border-dashed" style={{ borderColor: `${FW.secondary}` }} />
          </div>
          <div className="text-[7px] font-bold" style={{ color: FW.bodyLight }}>AWS →</div>
        </div>
        <p className="text-[9px] font-black leading-tight" style={{ color: FW.heading }}>
          Complete the link in AWS
        </p>
        <p className="text-[6px]" style={{ color: FW.body }}>AT&amp;T has provisioned your connection. One step in AWS Interconnect – last mile and you're live.</p>
        <div className="space-y-1.5">
          {[
            'Open AWS Interconnect Console',
            'Find your pending AT&T connection',
            'Click Accept',
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-2">
              <div
                className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[6px] font-bold shrink-0 mt-0.5"
                style={{ background: FW.active, color: '#fff' }}
              >
                {i + 1}
              </div>
              <p className="text-[7px] leading-relaxed" style={{ color: FW.body }}>{step}</p>
            </div>
          ))}
        </div>
        <div
          className="w-full text-center text-[7px] font-bold py-1.5 rounded-md"
          style={{ background: FW.active, color: '#fff' }}
        >
          Open AWS Interconnect Console ↗
        </div>
        <div className="text-center">
          <p className="text-[6px]" style={{ color: FW.disabled }}>I'll do this later — go to my connections</p>
        </div>
      </div>
    </PortalFrame>
  );
}

// ââ Screen 5: AWS Interconnect – last mile â accept only ââââââââââââââââââââââââââââââââ
function ScreenAwsConsole() {
  return (
    <PortalFrame url="console.aws.amazon.com/directconnect" isAws>
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <p className="text-[8px] font-black" style={{ color: FW.aws }}>Interconnect – last mile</p>
          <p className="text-[6px]" style={{ color: FW.disabled }}>Connections</p>
        </div>
        <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${FW.secondary}` }}>
          <div className="px-2 py-1" style={{ background: FW.wash }}>
            <p className="text-[6px] font-semibold uppercase tracking-widest" style={{ color: FW.disabled }}>
              Pending acceptance
            </p>
          </div>
          <div
            className="px-2.5 py-2"
            style={{ borderTop: `1px solid ${FW.awsBorder}` }}
          >
            <p className="text-[8px] font-bold" style={{ color: FW.heading }}>NETBOND-ATT-LMCC</p>
            <p className="text-[6px]" style={{ color: FW.bodyLight }}>Requested · AT&amp;T LLC · San Jose, CA</p>
          </div>
        </div>
        <div className="rounded-lg p-2" style={{ background: FW.wash, border: `1px solid ${FW.secondary}` }}>
          <p className="text-[6px]" style={{ color: FW.disabled }}>
            Accepting authorizes AT&T to complete the cross-connect. BGP negotiation starts automatically — no further action required.
          </p>
        </div>
        <div className="flex gap-1.5">
          <div
            className="flex-1 text-center text-[7px] font-bold py-1.5 rounded-md"
            style={{ background: FW.heading, color: '#fff' }}
          >
            Accept
          </div>
          <div
            className="flex-1 text-center text-[7px] py-1.5 rounded-md"
            style={{ background: FW.wash, color: FW.bodyLight, border: `1px solid ${FW.secondary}` }}
          >
            Decline
          </div>
        </div>
      </div>
    </PortalFrame>
  );
}

// ── Screen 6: Return to AT&T — connection card now provisioning ───────────────
function ScreenReturn() {
  const stages = [
    { label: 'Key Accepted', state: 'done' },
    { label: 'Negotiating Parameters', state: 'active' },
    { label: 'BGP Forming', state: 'pending' },
    { label: 'Live', state: 'pending' },
  ] as const;

  return (
    <PortalFrame url="netbond.att.com/manage">
      <div className="space-y-1.5">
        <p className="text-[6px] font-bold uppercase tracking-[0.1em]" style={{ color: FW.disabled }}>
          My Connections
        </p>
        {/* Connection card */}
        <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${FW.secondary}` }}>
          <div className="px-2.5 py-2 flex items-center justify-between" style={{ background: FW.wash, borderBottom: `1px solid ${FW.secondary}` }}>
            <p className="text-[7px] font-bold" style={{ color: FW.heading }}>NetBond Max — San Jose</p>
            <span className="text-[5px] font-bold uppercase px-1 py-0.5 rounded" style={{ background: FW.accent, color: FW.link }}>Provisioning</span>
          </div>
          <div className="px-2.5 py-2">
            {stages.map((s, i) => (
              <div key={s.label} className="flex items-center gap-1.5 mb-1 last:mb-0">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0 flex items-center justify-center"
                  style={{
                    background: s.state === 'done' ? FW.success : s.state === 'active' ? FW.link : FW.neutral,
                  }}
                >
                  {s.state === 'done' && (
                    <svg width="5" height="5" viewBox="0 0 7 7" fill="none">
                      <path d="M1 3.5L3 5.5L6 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  {s.state === 'active' && <div className="w-1 h-1 rounded-full bg-white" />}
                </div>
                <p className="text-[6px]" style={{ color: s.state === 'done' ? FW.success : s.state === 'active' ? FW.heading : FW.disabled }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PortalFrame>
  );
}

// ── Screen 7: Provisioning ────────────────────────────────────────────────────
function ScreenProvisioning() {
  const stages = [
    { label: 'Key Accepted', state: 'done' },
    { label: 'Negotiating Parameters', state: 'done' },
    { label: 'BGP Forming', state: 'active' },
    { label: 'Live', state: 'pending' },
  ] as const;

  return (
    <PortalFrame url="netbond.att.com/connections">
      <div className="space-y-1.5">
        <p className="text-[6px] font-bold uppercase tracking-[0.1em]" style={{ color: FW.link }}>
          Provisioning
        </p>
        <p className="text-[8px] font-black" style={{ color: FW.heading }}>Activating your connection</p>
        <p className="text-[6px]" style={{ color: FW.disabled }}>Four diverse paths auto-configured</p>
        <div style={{ borderTop: `1px solid ${FW.secondary}`, paddingTop: 8 }}>
          {stages.map((s, i) => (
            <div key={s.label} className="flex items-start gap-2 mb-2 last:mb-0">
              <div className="flex flex-col items-center shrink-0">
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center"
                  style={{
                    background:
                      s.state === 'done' ? FW.success :
                      s.state === 'active' ? FW.link :
                      FW.neutral,
                  }}
                >
                  {s.state === 'done' && (
                    <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
                      <path d="M1 3.5L3 5.5L6 2" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  {s.state === 'active' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                {i < stages.length - 1 && (
                  <div
                    className="w-px mt-0.5"
                    style={{ height: 12, background: s.state === 'done' ? `${FW.success}55` : FW.secondary }}
                  />
                )}
              </div>
              <p
                className="text-[7px] leading-[16px] font-medium"
                style={{
                  color: s.state === 'done' ? FW.success : s.state === 'active' ? FW.heading : FW.disabled,
                }}
              >
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </PortalFrame>
  );
}

// ── Screen 8: Live ────────────────────────────────────────────────────────────
function ScreenLive() {
  return (
    <PortalFrame url="netbond.att.com/connections">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[8px] font-black" style={{ color: FW.heading }}>LMCC-AWS-PRIMARY</p>
          <div
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[6px] font-bold"
            style={{ background: FW.successLight, color: FW.success }}
          >
            <div className="w-1 h-1 rounded-full" style={{ background: FW.success }} />
            Active
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1">
          {[
            { label: 'BGP Sessions', value: '4 / 4', hi: true },
            { label: 'Throughput', value: '1 Gbps', hi: false },
            { label: 'Latency', value: '< 10ms', hi: false },
            { label: 'Uptime', value: '100%', hi: true },
          ].map(({ label, value, hi }) => (
            <div key={label} className="rounded-lg p-1.5" style={{ background: FW.wash, border: `1px solid ${FW.secondary}` }}>
              <p className="text-[6px]" style={{ color: FW.disabled }}>{label}</p>
              <p className="text-[8px] font-black" style={{ color: hi ? FW.link : FW.heading }}>{value}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1.5 pt-1" style={{ borderTop: `1px solid ${FW.secondary}` }}>
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: FW.success }} />
          <p className="text-[6px]" style={{ color: FW.disabled }}>All 4 paths live · billing triggered</p>
        </div>
      </div>
    </PortalFrame>
  );
}

// ── Journey data ───────────────────────────────────────────────────────────────

type System = 'att' | 'aws';
type LoadLevel = 'low' | 'medium' | 'high';

interface JourneyStep {
  num: number;
  system: System;
  phase: string;
  intent: string;
  activity: string;
  systemNote: string;
  load: LoadLevel;
  timeHint: string;
  screen: React.ReactNode;
}

const JOURNEY: JourneyStep[] = [
  {
    num: 1, system: 'att', phase: 'Discover',
    intent: 'I need a dedicated, private path to AWS — not the shared internet, not a VPN. Something my security team will accept.',
    activity: 'Browses the AT&T NetBond Marketplace. Finds the LMCC Max Resiliency tile. Reads the product summary.',
    systemNote: 'No account action yet. Read-only evaluation. The customer is comparing options and building confidence before committing.',
    load: 'low', timeHint: '~2 min', screen: <ScreenMarketplace />,
  },
  {
    num: 2, system: 'att', phase: 'Evaluate',
    intent: 'I want to understand what I\'m committing to: the resiliency model, the specs, and whether this is the right option for my use case.',
    activity: 'Opens Create Connection wizard. Selects "Internet to Cloud," then "Maximum Resiliency." AT&T identifies the LMCC path and configures the flow accordingly.',
    systemNote: 'No account action yet. The wizard captures connection type, resiliency level, and provider. The AWS Max path activates a dedicated creation flow.',
    load: 'medium', timeHint: '~3 min', screen: <ScreenWizardCreate />,
  },
  {
    num: 3, system: 'att', phase: 'Set up',
    intent: 'This is the only credential I need to provide. One number. I can do that right now.',
    activity: 'Enters their 12-digit AWS Account Number. Names the connection. Submits. AT&T provisions the physical cross-connect and sends the request to AWS.',
    systemNote: 'AT&T provisions the physical underlay and registers the connection in AWS Interconnect – last mile on behalf of the customer. The connection appears as "Pending acceptance" in AWS.',
    load: 'low', timeHint: '~1 min', screen: <ScreenAccount />,
  },
  {
    num: 4, system: 'att', phase: 'Hand off',
    intent: 'I need to go do something in AWS. The instructions are clear — I know exactly what to click and what to look for.',
    activity: 'Lands on the /aws-handoff screen. Reads 3 steps: open AWS Interconnect Console, find the pending AT&T connection, click Accept. Opens AWS Console.',
    systemNote: 'AT&T portal displays the AwsHandoffScreen. No key copy required — just acceptance. This is the highest drop-off risk in the journey. Tracked via Mixpanel.',
    load: 'high', timeHint: '~1 min', screen: <ScreenHandoff />,
  },
  {
    num: 5, system: 'aws', phase: 'Accept',
    intent: 'I can see the pending AT&T connection. It looks legitimate. I\'ll accept it — the instructions said that\'s all I need to do.',
    activity: 'Logs into AWS Console. Navigates to Interconnect – last mile → Connections. Finds the pending AT&T request. Clicks Accept. Returns to AT&T portal.',
    systemNote: 'AWS marks the connection as accepted. AT&T automatically detects the acceptance via AWS API polling. No key copy or return handoff required by the customer.',
    load: 'high', timeHint: '~5 min', screen: <ScreenAwsConsole />,
  },
  {
    num: 6, system: 'att', phase: 'Complete',
    intent: 'I clicked Accept in AWS. Now I\'m back. I can see the connection card has moved — something is happening.',
    activity: 'Returns to AT&T NetBond portal. Finds the connection card on the Manage page. Sees it has transitioned to "Provisioning" with the 4-stage tracker visible.',
    systemNote: 'AT&T detected the AWS acceptance automatically. The 4-channel provisioning sequence started without customer input. Key Accepted → Negotiating is underway.',
    load: 'low', timeHint: '~1 min', screen: <ScreenReturn />,
  },
  {
    num: 7, system: 'att', phase: 'Provision',
    intent: 'I want to see it progressing. I need reassurance that something real is happening — that I did it correctly.',
    activity: 'Watches the 4-stage provisioning timeline. Observes each stage complete. No action required.',
    systemNote: 'Automated: Key Accepted → Negotiating Parameters → BGP Forming → Live. AT&T and AWS agree L3 config for all 4 channels. Target: < 3 min.',
    load: 'low', timeHint: '~3 min', screen: <ScreenProvisioning />,
  },
  {
    num: 8, system: 'att', phase: 'Go live',
    intent: 'I can see it\'s working. BGP is established. All four paths are up. I\'m done — and I understand exactly what I have.',
    activity: 'Views the active connection dashboard. Confirms 4/4 BGP sessions. Notes throughput and latency metrics.',
    systemNote: 'All 4 diverse paths are live. Billing is triggered. AT&T sends an email notification. Traffic can now flow over a private, dedicated AWS connection.',
    load: 'low', timeHint: 'Done', screen: <ScreenLive />,
  },
];

const PHASES = [
  { label: 'Prepare', steps: [1, 2, 3] },
  { label: 'Handoff', steps: [4, 5, 6] },
  { label: 'Activate', steps: [7, 8] },
];

function phaseForStep(num: number) {
  return PHASES.find(p => p.steps.includes(num))?.label ?? '';
}

// ── Cognitive load badge ───────────────────────────────────────────────────────
function LoadBadge({ load }: { load: LoadLevel }) {
  const cfg = {
    low:    { label: 'Low effort',  bg: FW.successLight, col: FW.success },
    medium: { label: 'Some effort', bg: FW.accent,       col: FW.link },
    high:   { label: 'High effort', bg: FW.warnLight,    col: FW.warn },
  }[load];
  return (
    <span className="text-[6px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: cfg.bg, color: cfg.col }}>
      {cfg.label}
    </span>
  );
}

// ── Portal Swivel callout ──────────────────────────────────────────────────────
function PortalSwivelBreak() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="my-2"
    >
      <div
        className="rounded-2xl p-5 text-center"
        style={{ background: FW.wash, border: `1px solid ${FW.secondary}` }}
      >
        <p className="text-[8px] font-black uppercase tracking-[0.18em] mb-2" style={{ color: FW.bodyLight }}>
          ⇄ &nbsp; The Portal Swivel
        </p>
        <div className="flex items-center justify-center gap-3 mb-2 flex-wrap">
          <span className="text-[10px] font-bold" style={{ color: FW.link }}>AT&amp;T NetBond</span>
          <ArrowRight className="w-3 h-3 shrink-0" style={{ color: FW.secondary }} />
          <span className="text-[10px] font-bold" style={{ color: FW.heading }}>AWS Console</span>
          <ArrowRight className="w-3 h-3 shrink-0" style={{ color: FW.link }} />
          <span className="text-[10px] font-bold" style={{ color: FW.link }}>AT&amp;T NetBond</span>
        </div>
        <p className="text-[9px] leading-relaxed max-w-sm mx-auto" style={{ color: FW.body }}>
          The only manual step in this flow. The customer leaves AT&amp;T portal,
          navigates to AWS Interconnect – last mile, and clicks Accept. AT&amp;T auto-detects the acceptance â
          no key copy or return handoff required.
        </p>
        <div
          className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full text-[8px] font-semibold"
          style={{ background: FW.neutral, color: FW.bodyLight }}
        >
          Primary drop-off risk · tracked via Mixpanel
        </div>
      </div>
    </motion.div>
  );
}

// ── Step card ──────────────────────────────────────────────────────────────────
function StepCard({ step, prevPhase }: { step: JourneyStep; prevPhase: string }) {
  const phase = phaseForStep(step.num);
  const isAws = step.system === 'aws';
  const accentColor = isAws ? FW.aws : FW.link;
  const accentBg = isAws ? FW.awsLight : FW.accent;

  return (
    <div>
      {/* Phase header when phase changes */}
      {phase !== prevPhase && (
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-3 mb-4 mt-2"
        >
          <div className="w-5 h-px" style={{ background: accentColor }} />
          <span className="text-[8px] font-black uppercase tracking-[0.18em]" style={{ color: accentColor }}>
            {phase}
          </span>
          <div className="flex-1 h-px" style={{ background: FW.secondary }} />
        </motion.div>
      )}

      {/* Portal swivel break between steps 4 and 5 */}
      {step.num === 5 && <PortalSwivelBreak />}

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative"
      >
        {/* Step number — large typographic texture behind card */}
        <div
          className="absolute select-none pointer-events-none font-black leading-none"
          style={{
            fontSize: 100,
            color: `${accentColor}09`,
            top: -16,
            left: -8,
            fontFamily: "'ATT Aleck Sans', sans-serif",
            letterSpacing: '-0.05em',
            zIndex: 0,
          }}
        >
          {String(step.num).padStart(2, '0')}
        </div>

        {/* Card */}
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{
            background: FW.base,
            border: `1px solid ${FW.secondary}`,
            zIndex: 1,
          }}
        >
          {/* System + metadata bar */}
          <div
            className="flex items-center justify-between px-5 py-2.5"
            style={{ background: accentBg, borderBottom: `1px solid ${isAws ? FW.awsBorder : FW.secondary}` }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: accentColor }}
              />
              <span className="text-[8px] font-black uppercase tracking-[0.12em]" style={{ color: accentColor }}>
                {isAws ? 'AWS Console' : 'AT&T NetBond Portal'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <LoadBadge load={step.load} />
              <span className="text-[7px] font-mono font-semibold" style={{ color: FW.disabled }}>
                {step.timeHint}
              </span>
            </div>
          </div>

          {/* Content grid */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_256px] gap-0">
            {/* Left: text */}
            <div className="p-5 space-y-4">
              {/* Intent */}
              <div>
                <p className="text-[7px] font-bold uppercase tracking-[0.12em] mb-1.5" style={{ color: FW.disabled }}>
                  Customer intent
                </p>
                <p
                  className="text-[13px] leading-snug font-light"
                  style={{ color: FW.heading, fontStyle: 'italic', maxWidth: '52ch' }}
                >
                  "{step.intent}"
                </p>
              </div>

              {/* Activity */}
              <div>
                <p className="text-[7px] font-bold uppercase tracking-[0.12em] mb-1" style={{ color: FW.disabled }}>
                  What they do
                </p>
                <p className="text-[11px] font-semibold leading-relaxed" style={{ color: accentColor, maxWidth: '52ch' }}>
                  {step.activity}
                </p>
              </div>

              {/* System note */}
              <div className="rounded-xl px-4 py-3" style={{ background: FW.wash, border: `1px solid ${FW.secondary}` }}>
                <p className="text-[7px] font-bold uppercase tracking-[0.12em] mb-1" style={{ color: FW.disabled }}>
                  Behind the scenes
                </p>
                <p className="text-[10px] leading-relaxed" style={{ color: FW.body }}>
                  {step.systemNote}
                </p>
              </div>
            </div>

            {/* Right: screen mockup */}
            <div
              className="p-4 flex items-start justify-center"
              style={{ borderTop: `1px solid ${FW.secondary}`, background: FW.wash }}
            >
              <div className="w-full max-w-[232px]">
                {step.screen}
              </div>
            </div>
          </div>
        </div>

        {/* Connector to next step */}
        {step.num < 8 && (
          <div className="flex justify-center py-1">
            <div
              className="w-px"
              style={{ height: 20, background: `linear-gradient(180deg, ${accentColor}44 0%, ${FW.secondary} 100%)` }}
            />
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────
export function LmccJourneyMap() {
  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-4 h-px" style={{ background: FW.link }} />
          <span className="text-[8px] font-black uppercase tracking-[0.18em]" style={{ color: FW.link }}>
            Flow 03 · AT&T Initiates
          </span>
        </div>
        <h2 className="text-figma-xl font-bold text-fw-heading tracking-[-0.03em] mb-1">
          Customer Journey Map
        </h2>
        <p className="text-figma-sm text-fw-body max-w-2xl">
          AT&T-first path (Flow 03). Customer provides their AWS Account ID; AT&T registers the connection in AWS Interconnect – last mile. Customer accepts in AWS â one click, no key copy. AT&T auto-detects acceptance and starts the 4-stage provisioning sequence.
        </p>

        {/* Summary strip */}
        <div
          className="inline-flex items-center gap-5 mt-4 px-5 py-3 rounded-xl"
          style={{ background: FW.accent, border: `1px solid ${FW.secondary}` }}
        >
          {[
            { val: '8', label: 'Steps' },
            { val: '2', label: 'Portals' },
            { val: '1', label: 'Click in AWS' },
            { val: '~15 min', label: 'End-to-end' },
          ].map(({ val, label }) => (
            <div key={label} className="flex items-baseline gap-1.5">
              <span className="text-[14px] font-black" style={{ color: FW.link }}>{val}</span>
              <span className="text-[9px]" style={{ color: FW.bodyLight }}>{label}</span>
            </div>
          ))}
          <div className="h-4" style={{ borderLeft: `1px solid ${FW.secondary}` }} />
          {[
            { col: FW.link, label: 'AT&T NetBond' },
            { col: FW.heading, label: 'AWS Console' },
          ].map(({ col, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: col }} />
              <span className="text-[9px] font-medium" style={{ color: FW.bodyLight }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Steps */}
      <div>
        {JOURNEY.map((step, i) => (
          <StepCard
            key={step.num}
            step={step}
            prevPhase={i > 0 ? phaseForStep(JOURNEY[i - 1].num) : ''}
          />
        ))}
      </div>

      {/* Footer */}
      <p className="text-figma-xs text-fw-bodyLight mt-6">
        Source: LMCC Product Notes 04092026 · LMCC Design Brief 04212026 · Preview phase · AT&T-first path
      </p>
    </div>
  );
}
