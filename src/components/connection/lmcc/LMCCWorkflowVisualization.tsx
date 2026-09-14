import { useState } from 'react';
import { Key, ArrowRight, CheckCircle, Clock, Cloud, Building2, Zap, ArrowDown } from 'lucide-react';

type Flow = '03' | '04';

interface FlowStep {
  id: string;
  actor: 'customer' | 'att' | 'aws' | 'both';
  location: 'att-portal' | 'aws-portal' | 'backend';
  title: string;
  description: string;
  isConvergence?: boolean;
}

const FLOW_03_STEPS: FlowStep[] = [
  {
    id: 'f03-1',
    actor: 'customer',
    location: 'att-portal',
    title: 'Select location, bandwidth, AWS account ID',
    description: 'Three choices. Everything else is automated.',
  },
  {
    id: 'f03-2',
    actor: 'att',
    location: 'backend',
    title: 'AT&T creates pending connection record',
    description: 'Generates ActivationKey (base64, valid 7 days). No provisioning starts yet.',
  },
  {
    id: 'f03-3',
    actor: 'customer',
    location: 'att-portal',
    title: 'Customer receives ActivationKey',
    description: 'Copy-to-clipboard. Instruction: take this key to AWS portal.',
  },
  {
    id: 'f03-4',
    actor: 'customer',
    location: 'aws-portal',
    title: 'Customer pastes key at AWS portal',
    description: 'Portal swivel — manual step. Automated in Post-GA (Epic 8).',
  },
  {
    id: 'f03-5',
    actor: 'aws',
    location: 'backend',
    title: 'AWS calls ConfirmActivationKey on AT&T',
    description: 'AT&T confirms key valid. Validity check only — not a provisioning trigger.',
  },
  {
    id: 'f03-6',
    actor: 'aws',
    location: 'backend',
    title: 'AWS drives negotiation (Active Provider)',
    description: 'AWS calls CreateConnection → GenerateFeatureGuidance → CreateFeature x4. AT&T responds automatically.',
    isConvergence: true,
  },
];

const FLOW_04_STEPS: FlowStep[] = [
  {
    id: 'f04-1',
    actor: 'customer',
    location: 'aws-portal',
    title: 'Customer creates connection at AWS portal',
    description: 'Receives ActivationKey from AWS.',
  },
  {
    id: 'f04-2',
    actor: 'customer',
    location: 'att-portal',
    title: 'Customer pastes key at AT&T NetBond portal',
    description: 'Portal swivel — manual step. Automated in Post-GA (Epic 8).',
  },
  {
    id: 'f04-3',
    actor: 'att',
    location: 'backend',
    title: 'AT&T calls ConfirmActivationKey on AWS',
    description: 'AT&T verifies key is real and unused. A keyValid: false result is a security event.',
  },
  {
    id: 'f04-4',
    actor: 'att',
    location: 'backend',
    title: 'AT&T drives negotiation (Active Provider)',
    description: 'AT&T calls CreateConnection → GenerateFeatureGuidance → CreateFeature x4 on AWS. Or defers to AWS via deferProvisioning.',
    isConvergence: true,
  },
];

const SHARED_STEPS: FlowStep[] = [
  {
    id: 'shared-1',
    actor: 'both',
    location: 'backend',
    title: 'Feature negotiation: L3 auto-configured',
    description: 'BGP ASN, VLAN IDs, IP subnets, MTU agreed automatically across all 4 channels. Customer does nothing.',
  },
  {
    id: 'shared-2',
    actor: 'both',
    location: 'backend',
    title: 'BGP sessions form on all 4 paths',
    description: 'Both providers provision hardware independently. NotifyConnectionStatus sent and received.',
  },
  {
    id: 'shared-3',
    actor: 'customer',
    location: 'att-portal',
    title: 'Connection Live — billing starts',
    description: 'Email + portal notification sent. Billing trigger: BGP Established. Connection visible in portal.',
  },
];

const ACTOR_COLORS: Record<FlowStep['actor'], string> = {
  customer: 'bg-fw-accent border-fw-active/40 text-fw-link',
  att:      'bg-fw-wash border-fw-secondary text-fw-body',
  aws:      'bg-orange-50 border-orange-200 text-orange-700',
  both:     'bg-fw-cobalt-100 border-fw-active/30 text-fw-link',
};

const ACTOR_LABELS: Record<FlowStep['actor'], string> = {
  customer: 'Customer action',
  att:      'AT&T (automated)',
  aws:      'AWS (automated)',
  both:     'Both providers',
};

const LOCATION_ICONS: Record<FlowStep['location'], React.ComponentType<{ className?: string }>> = {
  'att-portal': Building2,
  'aws-portal': Cloud,
  'backend':    Zap,
};

function StepCard({ step }: { step: FlowStep }) {
  const Icon = LOCATION_ICONS[step.location];
  return (
    <div className={`p-3 rounded-xl border ${ACTOR_COLORS[step.actor]} ${step.isConvergence ? 'ring-2 ring-fw-active/40' : ''}`}>
      <div className="flex items-start gap-2">
        <Icon className="h-3.5 w-3.5 shrink-0 mt-0.5 opacity-60" />
        <div>
          <p className="text-figma-xs font-semibold leading-tight">{step.title}</p>
          <p className="text-[10px] opacity-70 mt-0.5 leading-tight">{step.description}</p>
        </div>
      </div>
      <p className="text-[9px] mt-1.5 opacity-50 font-medium uppercase tracking-wide">{ACTOR_LABELS[step.actor]}</p>
    </div>
  );
}

export default function LMCCWorkflowVisualization() {
  const [activeFlow, setActiveFlow] = useState<Flow>('03');

  const flowSteps = activeFlow === '03' ? FLOW_03_STEPS : FLOW_04_STEPS;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="border-b border-fw-secondary pb-4">
        <h2 className="text-figma-lg font-bold text-fw-heading tracking-[-0.02em]">Connection Coordinator API — Two Entry Flows</h2>
        <p className="text-figma-sm text-fw-bodyLight mt-1">
          Both flows use the same portal. They differ in who generates the ActivationKey. Both converge at the same automated provisioning engine.
        </p>
      </div>

      {/* Flow selector */}
      <div className="flex gap-2">
        {(['03', '04'] as Flow[]).map(flow => (
          <button
            key={flow}
            onClick={() => setActiveFlow(flow)}
            className={`flex-1 py-3 px-4 rounded-xl border-2 text-left transition-all ${
              activeFlow === flow
                ? 'border-fw-active bg-fw-accent'
                : 'border-fw-secondary hover:border-fw-active/40'
            }`}
          >
            <p className="text-figma-xs font-bold text-fw-heading">
              {flow === '03' ? 'Flow 03 — AT&T First' : 'Flow 04 — AWS First'}
            </p>
            <p className="text-[10px] text-fw-bodyLight mt-0.5">
              {flow === '03'
                ? 'Start at NetBond → generate key → take to AWS'
                : 'Start at AWS → receive key → upload at NetBond'}
            </p>
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {(Object.entries(ACTOR_LABELS) as [FlowStep['actor'], string][]).map(([actor, label]) => (
          <span key={actor} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[9px] font-medium ${ACTOR_COLORS[actor]}`}>
            {label}
          </span>
        ))}
      </div>

      {/* Flow-specific steps */}
      <div className="space-y-2">
        <p className="text-[10px] font-semibold text-fw-bodyLight uppercase tracking-wide">
          {activeFlow === '03' ? 'AT&T-First Entry Path' : 'AWS-First Entry Path'}
        </p>
        {flowSteps.map((step, i) => (
          <div key={step.id}>
            <StepCard step={step} />
            {i < flowSteps.length - 1 && (
              <div className="flex justify-center py-0.5">
                <ArrowDown className="h-3.5 w-3.5 text-fw-bodyLight opacity-40" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Convergence divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-fw-active/30" />
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-fw-cobalt-100 border border-fw-active/30 rounded-full">
          <CheckCircle className="h-3.5 w-3.5 text-fw-link" />
          <span className="text-[10px] font-semibold text-fw-link">Flows converge — same engine from here</span>
        </div>
        <div className="flex-1 h-px bg-fw-active/30" />
      </div>

      {/* Shared steps */}
      <div className="space-y-2">
        <p className="text-[10px] font-semibold text-fw-bodyLight uppercase tracking-wide">Both Flows — Automated from this point</p>
        {SHARED_STEPS.map((step, i) => (
          <div key={step.id}>
            <StepCard step={step} />
            {i < SHARED_STEPS.length - 1 && (
              <div className="flex justify-center py-0.5">
                <ArrowDown className="h-3.5 w-3.5 text-fw-bodyLight opacity-40" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Key notes */}
      <div className="p-4 rounded-xl bg-fw-wash border border-fw-secondary space-y-2">
        <p className="text-figma-xs font-semibold text-fw-heading">Key architectural notes</p>
        <ul className="space-y-1.5 text-figma-xs text-fw-body">
          <li className="flex items-start gap-2">
            <ArrowRight className="h-3.5 w-3.5 text-fw-link shrink-0 mt-0.5" />
            <span><strong>Customer configures nothing beyond 3 choices.</strong> BGP ASN, VLAN IDs, IP subnets, and MTU are negotiated automatically by AT&T and AWS.</span>
          </li>
          <li className="flex items-start gap-2">
            <ArrowRight className="h-3.5 w-3.5 text-fw-link shrink-0 mt-0.5" />
            <span><strong>Active Provider</strong> = the provider that receives the key and drives negotiation. In Flow 03, AWS is Active. In Flow 04, AT&T is Active (or defers via deferProvisioning).</span>
          </li>
          <li className="flex items-start gap-2">
            <Clock className="h-3.5 w-3.5 text-fw-link shrink-0 mt-0.5" />
            <span><strong>Portal swivel eliminated at Post-GA</strong> (Epic 8). Preview and GA require manual key transfer between portals.</span>
          </li>
          <li className="flex items-start gap-2">
            <Key className="h-3.5 w-3.5 text-fw-link shrink-0 mt-0.5" />
            <span><strong>Locations and bandwidth come from live API.</strong> No hardcoded values. When GA infrastructure goes live, new options appear automatically.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
