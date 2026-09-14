import { useState } from 'react';
import { CheckCircle2, Clock, Activity, DollarSign, Shield } from 'lucide-react';
import { SideDrawer } from '../../common/SideDrawer';
import { Button } from '../../common/Button';
import { LMCCConnection, ConnectionProvisioningStatus } from '../../../types/lmcc';
import { formatBandwidth } from '../../../data/lmccService';

interface LMCCOnboardingDrawerProps {
  connection: LMCCConnection;
  isOpen: boolean;
  onClose: () => void;
  onActivate: () => void;
}

const PROVISIONING_STAGES: {
  status: ConnectionProvisioningStatus;
  label: string;
  description: string;
}[] = [
  {
    status: 'key-generated',
    label: 'Key Generated',
    description: 'AT&T has issued your ActivationKey. Copy it and take it to AWS Interconnect Console.',
  },
  {
    status: 'key-accepted',
    label: 'Key Accepted',
    description: 'Setting up your connection… AWS received your key. AT&T and AWS are preparing all 4 channels.',
  },
  {
    status: 'negotiating',
    label: 'Negotiating Parameters',
    description: 'AT&T and AWS are automatically configuring all 4 channels. No action needed.',
  },
  {
    status: 'bgp-forming',
    label: 'BGP Forming',
    description: 'Bringing your connection live… Technical parameters agreed. BGP sessions establishing on AT&T hardware.',
  },
  {
    status: 'live',
    label: 'Live',
    description: 'Both AT&T and AWS confirmed. Traffic can flow.',
  },
];

const STATUS_ORDER: ConnectionProvisioningStatus[] = [
  'key-generated', 'key-accepted', 'negotiating', 'bgp-forming', 'live',
];

function getStageIndex(status: ConnectionProvisioningStatus): number {
  return STATUS_ORDER.indexOf(status);
}

export function LMCCOnboardingDrawer({
  connection,
  isOpen,
  onClose,
  onActivate,
}: LMCCOnboardingDrawerProps) {
  const [billingAcknowledged, setBillingAcknowledged] = useState(false);

  const currentStatus = connection.provisioningStatus ?? 'key-generated';
  const currentIndex = getStageIndex(currentStatus);
  const isLive = currentStatus === 'live';

  return (
    <SideDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Connection Setup"
      size="lg"
      footer={
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onActivate}
            disabled={!billingAcknowledged}
          >
            <Activity className="w-4 h-4 mr-1" />
            {isLive ? 'View Live Connection' : 'Acknowledge & Track'}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">

        {/* AWS branding */}
        <div className="flex items-center gap-3 pb-3 border-b border-fw-secondary">
          <div className="w-10 h-7 rounded-lg bg-fw-base border border-fw-secondary flex items-center justify-center p-1">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg"
              alt="AWS"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <p className="text-figma-base font-semibold text-fw-heading">AWS Interconnect – last mile â Maximum Resiliency</p>
            <p className="text-figma-xs text-fw-bodyLight">AT&T AI-grade network · {connection.metro.name}</p>
          </div>
        </div>

        {/* Connection summary */}
        <div className="p-4 rounded-xl bg-fw-wash border border-fw-secondary">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-fw-link" />
            <span className="text-figma-sm font-semibold text-fw-heading">Connection Details</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-figma-sm">
            <div>
              <span className="text-fw-bodyLight">AWS Account</span>
              <p className="font-semibold text-fw-heading font-mono mt-0.5">{connection.awsAccountId}</p>
            </div>
            <div>
              <span className="text-fw-bodyLight">Metro</span>
              <p className="font-semibold text-fw-heading mt-0.5">{connection.metro.name}</p>
            </div>
            <div>
              <span className="text-fw-bodyLight">Bandwidth</span>
              <p className="font-semibold text-fw-heading mt-0.5">{formatBandwidth(connection.bandwidth)} × 4 paths</p>
            </div>
            <div>
              <span className="text-fw-bodyLight">Transport</span>
              <p className="font-semibold text-fw-heading mt-0.5">{connection.transport === 'mpls' ? 'MPLS' : 'MPLS + Internet'}</p>
            </div>
          </div>
        </div>

        {/* 5-stage status progression */}
        <div>
          <p className="text-figma-xs font-semibold text-fw-heading mb-3">Provisioning Status</p>
          <div className="space-y-2">
            {PROVISIONING_STAGES.map(stage => {
              const stageIndex = getStageIndex(stage.status);
              const isDone = stageIndex < currentIndex || isLive;
              const isActive = stage.status === currentStatus && !isLive;

              return (
                <div
                  key={stage.status}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                    isDone
                      ? 'border-fw-secondary bg-fw-wash'
                      : isActive
                      ? 'border-fw-active/30 bg-fw-accent'
                      : 'border-fw-secondary'
                  }`}
                >
                  <div className="shrink-0 mt-0.5">
                    {isDone ? (
                      <CheckCircle2 className="h-4 w-4 text-fw-bodyLight" />
                    ) : isActive ? (
                      <Clock className="h-4 w-4 text-fw-link animate-pulse" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-fw-secondary" />
                    )}
                  </div>
                  <div>
                    <p className={`text-figma-sm font-semibold ${
                      isDone ? 'text-fw-bodyLight' : isActive ? 'text-fw-link' : 'text-fw-bodyLight'
                    }`}>
                      {stage.label}
                    </p>
                    <p className="text-figma-sm text-fw-bodyLight mt-0.5">{stage.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Billing */}
        <div className="p-4 rounded-xl border-2 border-fw-active/30 bg-fw-accent">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="h-4 w-4 text-fw-link" />
            <span className="text-figma-base font-semibold text-fw-heading">Billing</span>
          </div>
          <div className="space-y-1.5 text-figma-sm">
            <div className="flex justify-between">
              <span className="text-fw-bodyLight">{formatBandwidth(connection.bandwidth)} × 4 paths</span>
              <span className="font-medium text-fw-heading">$X,XXX/mo</span>
            </div>
            <div className="flex justify-between">
              <span className="text-fw-bodyLight">{connection.transport === 'mpls' ? 'MPLS Transport' : 'MPLS + Internet'}</span>
              <span className="font-medium text-fw-heading">Included</span>
            </div>
            <div className="pt-2 border-t border-fw-active/20 flex justify-between">
              <span className="font-semibold text-fw-heading">Estimated Monthly</span>
              <span className="font-bold text-fw-link">$X,XXX</span>
            </div>
          </div>
          <p className="text-figma-sm text-fw-bodyLight mt-2">
            Billing starts when BGP reaches Established across all 4 paths. Estimated pricing — contact AT&T sales for final rates.
          </p>
        </div>

        {/* Billing acknowledgment */}
        <label className="flex items-start gap-3 p-3 rounded-lg border-2 border-fw-secondary hover:border-fw-active/50 cursor-pointer">
          <input
            type="checkbox"
            checked={billingAcknowledged}
            onChange={e => setBillingAcknowledged(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-fw-secondary text-fw-link focus:ring-fw-active"
          />
          <p className="text-figma-sm text-fw-body">
            I understand that billing begins when BGP sessions establish across all 4 paths, billed at 95th percentile burstable.
          </p>
        </label>

      </div>
    </SideDrawer>
  );
}
