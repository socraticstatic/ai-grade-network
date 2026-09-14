import { useState } from 'react';
import { Copy, Key, ExternalLink, Check, Clock, Wifi, Activity } from 'lucide-react';
import { Connection } from '../../../types/connection';
import { Modal } from '../../common/Modal';
import { Button } from '../../common/Button';

interface AWSPendingConfigModalProps {
  connection: Connection;
  isOpen: boolean;
  onClose: () => void;
  onActivate: (config: any) => void;
}

const STATUS_STEPS = [
  { key: 'key-generated', label: 'Key Generated', description: 'AT&T has issued your ActivationKey' },
  { key: 'key-accepted', label: 'Key Accepted', description: 'AWS Interconnect – last mile confirmed the key' },
  { key: 'negotiating', label: 'Negotiating Parameters', description: 'AT&T and AWS are exchanging configuration' },
  { key: 'bgp-forming', label: 'BGP Forming', description: 'Border Hub Protocol session establishing' },
  { key: 'live', label: 'Live', description: 'Connection active and passing traffic' },
];

export function AWSPendingConfigModal({ connection, isOpen, onClose }: AWSPendingConfigModalProps) {
  const [copied, setCopied] = useState(false);

  const metro = connection.configuration?.lmccMetro || connection.location || 'Unknown';
  const bandwidth = connection.bandwidth || '1 Gbps';
  const awsAccountId = connection.origin?.externalAccountId || '—';
  const region = connection.origin?.metadata?.region || 'us-east-1';

  const activationKey = useState(() => {
    const keyData = {
      sharedConnectionUuid: `lmcc-${connection.id.replace('conn-', '')}`,
      connectionSizeMbps: bandwidth.includes('Gbps') ? parseInt(bandwidth) * 1000 : parseInt(bandwidth),
      destinationAccountId: awsAccountId,
      destinationEnvironmentUri: `att://environments/${metro.toLowerCase().replace(/[^a-z]/g, '-')}`,
      version: 1,
    };
    return btoa(JSON.stringify(keyData));
  })[0];

  const expiresAt = new Date(connection.createdAt || Date.now());
  expiresAt.setDate(expiresAt.getDate() + 7);
  const daysRemaining = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 86400000));

  const handleCopy = () => {
    navigator.clipboard.writeText(activationKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="AT&T AI-grade network — Pending Activation"
      size="xl"
    >
      <div className="space-y-6">
        {/* Connection info bar */}
        <div className="rounded-lg p-4 border border-fw-active/20 bg-fw-active/[0.04]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center bg-white border border-fw-secondary flex-shrink-0" style={{ width: 64, height: 48, borderRadius: 6 }}>
              <span className="text-[15px] font-black tracking-tight text-[#232f3e]">aws</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-figma-xs font-semibold text-fw-heading uppercase tracking-wider">AT&T AI-grade network</span>
                <span className="px-2 py-0.5 text-figma-xs font-medium text-fw-active rounded bg-fw-active/[0.16]">
                  Internet to Cloud
                </span>
                <span className="px-2 py-0.5 text-figma-xs font-medium text-fw-success rounded bg-fw-successLight">
                  Maximum Resiliency
                </span>
              </div>
              <div className="flex items-center gap-3 text-figma-sm">
                <span className="font-bold text-fw-body">{metro}</span>
                <span className="text-fw-bodyLight">|</span>
                <span className="font-bold text-fw-body">{bandwidth}</span>
                <span className="text-fw-bodyLight">|</span>
                <span className="text-fw-bodyLight font-mono text-figma-xs">{region}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ActivationKey - hero section */}
        <div className="rounded-xl bg-fw-primary p-6 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Key className="h-5 w-5" />
            <h3 className="text-figma-base font-bold">Your ActivationKey</h3>
            <div className="ml-auto flex items-center gap-1.5 text-figma-xs text-white/70">
              <Clock className="h-3.5 w-3.5" />
              {daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Expired — generate a new key in AWS'}
            </div>
          </div>
          <p className="text-figma-sm text-white/80 mb-4">
            Copy this key and paste it in your AWS Interconnect Console to accept the connection. AT&T handles everything else automatically.
          </p>
          <div className="flex items-center gap-3">
            <code className="flex-1 min-w-0 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-figma-sm font-mono break-all leading-relaxed">
              {activationKey}
            </code>
            <button
              onClick={handleCopy}
              className="flex-shrink-0 flex items-center gap-1.5 px-4 py-3 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-figma-sm font-medium"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Next step CTA */}
        <a
          href="https://console.aws.amazon.com/directconnect/v2/home#/connections"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between w-full px-5 py-4 rounded-xl border-2 border-fw-active/30 bg-fw-accent hover:border-fw-active hover:bg-fw-active/[0.06] transition-all group"
        >
          <div>
            <div className="text-figma-base font-semibold text-fw-heading mb-0.5">Open AWS Interconnect Console</div>
            <div className="text-figma-sm text-fw-bodyLight">Paste your ActivationKey to accept the connection</div>
          </div>
          <ExternalLink className="h-5 w-5 text-fw-active group-hover:text-fw-link transition-colors flex-shrink-0" />
        </a>

        {/* What AT&T does automatically */}
        <div className="rounded-xl bg-fw-wash border border-fw-secondary p-5">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-4 w-4 text-fw-bodyLight" />
            <h4 className="text-figma-sm font-semibold text-fw-heading">AT&T provisions the rest automatically</h4>
          </div>
          <p className="text-figma-sm text-fw-bodyLight mb-4">
            Once AWS accepts the key, AT&T configures all L3 parameters, BGP sessions, and redundant paths. No further input required.
          </p>

          {/* Status progression */}
          <div className="space-y-2">
            {STATUS_STEPS.map((step, i) => {
              const isActive = i === 0;
              const isDone = false;
              const isPending = i > 0;
              return (
                <div key={step.key} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-figma-xs font-bold ${
                    isDone
                      ? 'bg-fw-success text-white'
                      : isActive
                        ? 'bg-fw-active text-white'
                        : 'bg-fw-secondary text-fw-bodyLight'
                  }`}>
                    {isDone ? <Check className="h-3.5 w-3.5" /> : <span>{i + 1}</span>}
                  </div>
                  <div className="flex-1">
                    <span className={`text-figma-sm font-medium ${
                      isActive ? 'text-fw-active' : isPending ? 'text-fw-bodyLight' : 'text-fw-heading'
                    }`}>
                      {step.label}
                    </span>
                    {isActive && (
                      <span className="ml-2 text-figma-xs text-fw-active font-semibold animate-pulse">Current</span>
                    )}
                  </div>
                  {isActive && (
                    <Wifi className="h-4 w-4 text-fw-active flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* AWS Account ID confirmation */}
        <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-fw-wash border border-fw-secondary">
          <span className="text-figma-sm text-fw-bodyLight">AWS Account ID on record</span>
          <span className="text-figma-sm font-mono font-semibold text-fw-heading">{awsAccountId}</span>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-fw-secondary">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}
