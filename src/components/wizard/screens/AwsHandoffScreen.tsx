import { useNavigate, useLocation } from 'react-router-dom';
import { ExternalLink, ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import attGlobe from '../../../assets/att-globe-transparent.svg';

interface HandoffState {
  connectionName?: string;
  metroName?: string;
  awsAccountId?: string;
  bandwidth?: string;
}

const AWS_CONSOLE_URL = 'https://console.aws.amazon.com/directconnect/v2/home#/connections';
const AWS_LOGO = 'https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg';

export function AwsHandoffScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as HandoffState) ?? {};
  const { connectionName, metroName, awsAccountId, bandwidth } = state;
  const maskedAccount = awsAccountId ? `••••${awsAccountId.slice(-4)}` : null;

  const steps = [
    {
      num: 1,
      label: 'Open AWS Interconnect – last mile',
      detail: 'Sign into the AWS Console and navigate to Interconnect – last mile > Connections.',
    },
    {
      num: 2,
      label: connectionName ? `Find "${connectionName}"` : 'Find your pending connection',
      detail: 'It will appear with status Available. Select it.',
    },
    {
      num: 3,
      label: 'Click Accept',
      detail: 'AT&T detects the acceptance and starts BGP negotiation automatically - no further action needed.',
    },
  ];

  const hasDetails = connectionName || metroName || awsAccountId || bandwidth;

  return (
    <div className="min-h-screen bg-fw-wash flex items-center justify-center px-4 py-12">
      <style>{`
        @keyframes dotTravel {
          0%   { transform: translateX(-8px); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateX(360px); opacity: 0; }
        }
        @keyframes arrowNudge {
          0%, 100% { transform: translateX(0); }
          50%       { transform: translateX(2px); }
        }
      `}</style>

      <div className="w-full max-w-[560px]">

        {/*
          Bridge visual.
          items-start so all three children align at their tops.
          The line hub uses h-14 to match the logo height — this centers
          the line exactly on the vertical midpoint of both logo images.
        */}
        <div className="flex items-start mb-10">

          {/* AT&T logo — no box, just the globe */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <img src={attGlobe} alt="AT&T" className="w-14 h-14 object-contain" />
            <div className="flex items-center gap-1 text-figma-xs font-semibold text-fw-link">
              <CheckCircle2 className="w-3.5 h-3.5" />
              AT&T done
            </div>
          </div>

          {/* Connecting line — h-14 matches logo height, centers on logo midpoints */}
          <div className="flex-1 flex items-center mx-5 h-14">

            {/* Left: AT&T side — completed, solid */}
            <div className="flex-1 h-0.5 bg-fw-active/60" />

            {/* Arrow hub — solid blue, nudges right */}
            <div
              className="mx-2 w-7 h-7 rounded-full bg-fw-active flex items-center justify-center shrink-0"
              style={{ animation: 'arrowNudge 1.8s ease-in-out infinite' }}
            >
              <ArrowRight className="w-3.5 h-3.5 text-white" />
            </div>

            {/* Right: AWS side — dashed + traveling pulse dot */}
            <div className="flex-1 relative h-5 overflow-hidden flex items-center">
              <div className="w-full h-px border-t border-dashed border-fw-active/40" />
              <div
                className="absolute w-2 h-2 rounded-full bg-fw-active"
                style={{
                  top: 'calc(50% - 4px)',
                  left: 0,
                  animation: 'dotTravel 2s ease-in-out infinite',
                  boxShadow: '0 0 8px 3px rgba(0, 159, 219, 0.45)',
                }}
              />
            </div>
          </div>

          {/* AWS logo — no box, just the mark */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <div className="h-14 flex items-center">
              <img src={AWS_LOGO} alt="AWS" className="h-8 w-auto object-contain" />
            </div>
            <div className="flex items-center gap-1 text-figma-xs font-semibold text-fw-body">
              <Clock className="w-3.5 h-3.5 text-fw-bodyLight" />
              Your turn
            </div>
          </div>
        </div>

        {/* Heading */}
        <div className="mb-8">
          <h1 className="text-figma-2xl font-bold text-fw-heading tracking-[-0.04em] leading-tight mb-2">
            Complete the link in AWS
          </h1>
          <p className="text-figma-base text-fw-body leading-relaxed">
            AT&T has provisioned your connection. One step in AWS Interconnect – last mile and you're live - takes about 2 minutes.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-4 mb-8">
          {steps.map((step) => (
            <div key={step.num} className="flex gap-4">
              <div className="w-7 h-7 rounded-full bg-fw-active flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-figma-xs font-bold text-white">{step.num}</span>
              </div>
              <div className="min-w-0 pt-0.5">
                <p className="text-figma-sm font-semibold text-fw-heading leading-snug">{step.label}</p>
                <p className="text-figma-xs text-fw-body mt-0.5 leading-relaxed">{step.detail}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Connection details — only if data was passed */}
        {hasDetails && (
          <div className="rounded-xl border border-fw-secondary bg-fw-base px-5 py-4 mb-6">
            <p className="text-figma-xs font-semibold text-fw-body uppercase tracking-[0.08em] mb-3">
              What to look for in AWS
            </p>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-2.5">
              {connectionName && (
                <div>
                  <dt className="text-figma-xs text-fw-body">Connection</dt>
                  <dd className="text-figma-sm font-semibold text-fw-heading font-mono truncate">{connectionName}</dd>
                </div>
              )}
              {metroName && (
                <div>
                  <dt className="text-figma-xs text-fw-body">Location</dt>
                  <dd className="text-figma-sm font-semibold text-fw-heading">{metroName}</dd>
                </div>
              )}
              {maskedAccount && (
                <div>
                  <dt className="text-figma-xs text-fw-body">AWS Account</dt>
                  <dd className="text-figma-sm font-semibold text-fw-heading font-mono">{maskedAccount}</dd>
                </div>
              )}
              {bandwidth && (
                <div>
                  <dt className="text-figma-xs text-fw-body">Bandwidth</dt>
                  <dd className="text-figma-sm font-semibold text-fw-heading">{bandwidth} x 4 paths</dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {/* CTAs */}
        <div className="space-y-3">
          <a
            href={AWS_CONSOLE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2.5 h-12 w-full rounded-full bg-fw-active text-white font-semibold text-figma-base hover:bg-fw-linkHover transition-colors"
          >
            Open AWS Interconnect Console
            <ExternalLink className="w-4 h-4" />
          </a>
          <button
            onClick={() => navigate('/manage')}
            className="h-12 w-full rounded-2xl text-fw-body font-medium text-figma-sm hover:text-fw-heading transition-colors"
          >
            I'll do this later - go to my connections
          </button>
        </div>

      </div>
    </div>
  );
}
