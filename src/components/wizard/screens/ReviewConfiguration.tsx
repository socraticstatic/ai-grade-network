import { useState } from 'react';
import { Edit2, CheckCircle2, MapPin, Gauge, Shield, Network, Settings, Server, Copy, ExternalLink, Key, Zap, Globe, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CloudProvider } from '../../../types/connection';
import { BillingPreview } from '../BillingPreview';
import { wizardToDesigner } from '../../../utils/wizardToDesigner';
import { getMetroById, formatBandwidth } from '../../../data/lmccService';
import { providerColor } from '../../../utils/providerColors';

interface ReviewConfigurationProps {
  connectionName?: string;
  awsAccountId?: string;
  config: {
    provider?: CloudProvider;
    providers?: CloudProvider[];
    type?: string;
    bandwidth?: string;
    location?: string;
    resiliencyLevel?: string;
    configuration?: {
      subnet?: string;
      internetSubnets?: string[];
      stackType?: 'ipv4' | 'ipv6' | 'dual';
      bfdEnabled?: boolean;
      qosClassifier?: 'best-effort' | 'out-of-contract';
      peerAsn?: 'public' | 'private' | 'global';
      l3mtu?: number;
      vifType?: string;
      serviceAccessType?: 'internet' | 'l3vmp' | 'restricted';
      ddosProtection?: boolean;
      advancedMonitoring?: boolean;
      azureSubscriptionId?: string;
      expressRouteCircuitKey?: string;
      gcpPairingKey?: string;
      gcpInterconnectType?: string;
      oracleOcid?: string;
      oracleCompartmentId?: string;
    };
  };
  selectedLocations?: Record<string, string[]>;
  bandwidthSettings?: Record<string, number>;
  billingChoice: {
    planId: string;
    term: string;
    addons: string[];
  };
  onBillingChange?: (updates: any) => void;
  onEditStep?: (step: number) => void;
  onSwitchToVisual?: (nodes: any[], edges: any[]) => void;
}

function SectionHeader({ icon: Icon, title, step, onEdit }: { icon: any; title: string; step?: number; onEdit?: (step: number) => void }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-fw-accent rounded-lg">
          <Icon className="h-5 w-5 text-brand-blue" />
        </div>
        <h4 className="text-figma-lg font-semibold text-fw-heading tracking-[-0.03em]">{title}</h4>
      </div>
      {onEdit && step !== undefined && (
        <button
          onClick={() => onEdit(step)}
          className="inline-flex items-center gap-1 text-figma-sm font-medium text-fw-link hover:text-fw-linkHover"
        >
          <Edit2 className="h-3.5 w-3.5" />
          Edit
        </button>
      )}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string | React.ReactNode }) {
  return (
    <div className="flex justify-between items-start py-2 border-b border-fw-secondary last:border-0">
      <span className="text-figma-sm text-fw-bodyLight">{label}</span>
      <span className="text-figma-sm font-medium text-fw-heading text-right max-w-[60%]">{value}</span>
    </div>
  );
}

export function ReviewConfiguration({
  connectionName,
  awsAccountId,
  config,
  selectedLocations = {},
  bandwidthSettings = {},
  billingChoice,
  onBillingChange = () => {},
  onEditStep,
  onSwitchToVisual,
}: ReviewConfigurationProps) {
  const navigate = useNavigate();
  const [activationKey] = useState(() => {
    const keyData = {
      sharedConnectionUuid: `lmcc-${Math.random().toString(36).substring(2, 10)}`,
      connectionSizeMbps: bandwidthSettings?.['AWS-lmcc'] || 1000,
      destinationAccountId: awsAccountId || '000000000000',
      destinationEnvironmentUri: `att://environments/${(selectedLocations?.['AWS'] || [])[0] || 'metro-sj'}`,
      version: 1,
    };
    return btoa(JSON.stringify(keyData));
  });
  const providers = config.providers || (config.provider ? [config.provider] : []);
  const isAwsLmcc = providers.includes('AWS' as CloudProvider) && config.resiliencyLevel === 'maximum' && config.type === 'Internet to Cloud';
  const lmccMetroId = isAwsLmcc ? (selectedLocations['AWS'] || [])[0] : null;
  const lmccMetro = lmccMetroId ? getMetroById(lmccMetroId) : null;
  const resiliencyLabel = config.resiliencyLevel === 'geodiversity'
    ? 'Geodiversity'
    : config.resiliencyLevel === 'maximum'
      ? (isAwsLmcc ? 'Maximum Resiliency (AWS Max)' : 'Maximum Resiliency')
      : 'Standard Resiliency';

  const totalLocations = Object.values(selectedLocations).reduce((sum, locs) => sum + locs.length, 0);
  const bandwidthEntries = Object.entries(bandwidthSettings);
  const totalBandwidth = bandwidthEntries.reduce((sum, [, bw]) => sum + bw, 0);
  const bw = bandwidthSettings['AWS-lmcc'] || 1000;

  const [keyCopied, setKeyCopied] = useState(false);
  const [editingReviewName, setEditingReviewName] = useState(false);
  const [localName, setLocalName] = useState(connectionName || 'AI-grade network — San Jose');

  /* ─────────────────────────────────────────────────────────────────
     AWS MAX LMCC — completely separate review experience
  ───────────────────────────────────────────────────────────────── */
  if (isAwsLmcc) {
    const bgpAsn = `AS${awsAccountId ? ((parseInt(awsAccountId.slice(-6)) % 1000) + 64000) : 64512}`;
    const vlanBase = awsAccountId ? (parseInt(awsAccountId.slice(-3)) % 100 + 100) : 101;
    const vlanIds = `${vlanBase}–${vlanBase + 3}`;

    const copyKey = () => {
      navigator.clipboard.writeText(activationKey);
      setKeyCopied(true);
      window.addToast?.({ type: 'success', title: 'Copied', message: 'Activation key copied', duration: 2000 });
      setTimeout(() => setKeyCopied(false), 2000);
    };


    return (
      <div className="w-full space-y-7">

        {/* ── HEADER: pills row, then name full-width below ── */}
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Metro', value: lmccMetro?.name || 'San Jose, CA' },
              { label: 'Bandwidth', value: `${formatBandwidth(bw)} × 4` },
              { label: 'Resiliency', value: 'Maximum · 2 sites' },
              { label: 'AWS Account', value: awsAccountId || '—' },
            ].map(f => (
              <span key={f.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-fw-wash border border-fw-secondary text-figma-xs">
                <span className="text-fw-bodyLight">{f.label}</span>
                <span className="font-semibold text-fw-heading">{f.value}</span>
              </span>
            ))}
          </div>
          <div className="space-y-2">
            {editingReviewName ? (
              <input
                autoFocus
                value={localName}
                onChange={e => setLocalName(e.target.value)}
                onBlur={() => setEditingReviewName(false)}
                onKeyDown={e => e.key === 'Enter' && setEditingReviewName(false)}
                className="text-figma-2xl font-bold text-fw-heading tracking-[-0.04em] bg-transparent border-b-2 border-fw-active focus:outline-none pb-0.5 leading-tight w-full"
              />
            ) : (
              <button
                onClick={() => setEditingReviewName(true)}
                className="group/name flex items-center gap-2.5 text-left"
              >
                <h2 className="text-figma-2xl font-bold text-fw-heading tracking-[-0.04em] leading-tight">
                  {localName}
                </h2>
                <Pencil className="w-4 h-4 text-fw-bodyLight opacity-0 group-hover/name:opacity-100 transition-opacity shrink-0" />
              </button>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-fw-cobalt-100 border border-fw-active/20 text-[10px] font-bold uppercase tracking-[0.1em] text-fw-link">
                <ExternalLink className="w-3 h-3" />
                Next step: paste in AWS
              </span>
              <span className="text-figma-xs text-fw-body">AT&amp;T AI-grade network · Awaiting activation</span>
            </div>
          </div>
        </div>

        {/* ── TWO-COLUMN LAYOUT ── config(1) + key(2) ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          {/* Configuration — col 1 */}
          <div className="rounded-2xl border border-fw-active/25 bg-fw-base flex flex-col">
            <div className="px-5 py-4 border-b border-fw-secondary">
              <p className="text-figma-xs font-semibold text-fw-body uppercase tracking-[0.08em]">Configuration</p>
            </div>
            <div className="flex-1 flex flex-col divide-y divide-fw-secondary px-5">
              {[
                { label: 'Metro', value: lmccMetro?.name || 'San Jose, CA' },
                { label: 'Bandwidth', value: `${formatBandwidth(bw)} × 4 paths` },
                { label: 'Resiliency', value: 'Maximum · 2 sites' },
                { label: 'AWS Account', value: <span className="font-mono text-figma-xs">{'••••' + (awsAccountId || '————').slice(-4)}</span> },
              ].map(({ label, value }) => (
                <div key={label} className="flex-1 flex items-center justify-between gap-3">
                  <span className="text-figma-xs text-fw-bodyLight shrink-0">{label}</span>
                  <span className="text-figma-sm font-semibold text-fw-heading text-right leading-snug">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Activation Key — spans cols 2–3 */}
          <div className="md:col-span-2 rounded-2xl border border-fw-active/25 bg-fw-cobalt-100 overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-fw-active/15 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-fw-link" />
                <p className="text-figma-xs font-bold text-fw-heading uppercase tracking-[0.08em]">Activation Key</p>
                <span className="px-2 py-0.5 rounded-full bg-fw-active/10 border border-fw-active/20 text-[10px] font-semibold text-fw-link">Valid 7 days</span>
              </div>
              <p className="text-figma-xs text-fw-body">Copy below, then open the AWS console</p>
            </div>
            <div className="flex-1 p-6 flex flex-col gap-5">
              <code className="flex-1 block w-full px-5 py-6 rounded-xl text-[12px] font-mono break-all leading-loose select-all text-fw-heading bg-fw-base border border-fw-secondary tracking-wide">
                {activationKey}
              </code>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={copyKey}
                  className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-fw-primary text-white text-figma-sm font-semibold hover:bg-fw-linkHover transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  {keyCopied ? 'Copied!' : 'Copy Key'}
                </button>
                <a
                  href="https://console.aws.amazon.com/directconnect/v2/home#/connections"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-fw-base border border-fw-secondary text-figma-sm font-semibold text-fw-heading hover:bg-fw-wash transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open AWS Console
                </a>
              </div>
            </div>
          </div>

        </div>

      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <div className="bg-fw-base rounded-xl p-6 border border-fw-secondary text-center">
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-full bg-fw-link flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-white" />
          </div>
        </div>
        <h3 className="text-figma-xl font-bold text-fw-heading tracking-[-0.03em] mb-2">Network Configuration Complete</h3>
        <p className="text-figma-base text-fw-bodyLight">
          Your hub <span className="font-semibold text-fw-link">{connectionName || 'Unnamed'}</span> is configured and ready for deployment.
        </p>
        {isAwsLmcc && (
          <div className="mt-6 max-w-lg mx-auto">
            {/* Activation Key - prominent hero */}
            <div className="p-6 rounded-2xl text-white text-center" style={{ backgroundColor: '#00235a' }}>
              <div className="flex items-center justify-center gap-2 mb-2">
                <Key className="h-5 w-5" />
                <h4 className="text-figma-lg font-bold">Your Activation Key</h4>
              </div>
              <p className="text-figma-sm text-white/80 mb-4">
                Copy this key and take it to your AWS Interconnect Console to link your order.
              </p>

              {/* Key — full width, no sibling buttons */}
              <code className="block w-full px-4 py-3 mb-4 bg-white/10 border border-white/20 rounded-xl text-figma-xs font-mono break-all leading-relaxed select-all text-left">
                {activationKey}
              </code>

              {/* Action row — two equal-width buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(activationKey);
                    window.addToast?.({ type: 'success', title: 'Copied', message: 'Activation key copied to clipboard', duration: 2000 });
                  }}
                  className="flex items-center justify-center gap-2 py-2.5 bg-white/20 hover:bg-white/30 rounded-xl transition-colors text-figma-sm font-medium border border-white/20"
                >
                  <Copy className="h-4 w-4" />
                  Copy Key
                </button>
                <a
                  href="https://console.aws.amazon.com/directconnect/v2/home#/connections"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-2.5 bg-white/20 hover:bg-white/30 rounded-xl transition-colors text-figma-sm font-medium border border-white/20"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open AWS Console
                </a>
              </div>
            </div>

            {/* Next steps */}
            <div className="mt-4 p-4 rounded-xl bg-fw-wash border border-fw-secondary text-left">
              <p className="text-figma-xs font-semibold text-fw-heading mb-2">What to do in AWS Interconnect Console</p>
              <ol className="text-figma-xs text-fw-bodyLight space-y-1 list-decimal list-inside">
                <li>Go to AWS Interconnect Console &gt; Connections</li>
                <li>You'll see 4 pending AT&T hosted connections — accept each one individually using the key above</li>
                <li>AWS validates the key with AT&T. Once 3 or more of 4 features are negotiated, provisioning begins automatically</li>
                <li>BGP, VLANs, IPs, and MTU are negotiated automatically between AT&T and AWS — no further configuration needed</li>
                <li>You'll receive an email when all 4 paths are live</li>
              </ol>
            </div>
          </div>
        )}
        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-fw-link" />
            <span className="text-figma-sm text-fw-body">{providers.length} Provider{providers.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-fw-link" />
            <span className="text-figma-sm text-fw-body">{totalLocations} Connection{totalLocations !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-fw-link" />
            <span className="text-figma-sm text-fw-body">
              {totalBandwidth >= 1000 ? `${(totalBandwidth / 1000).toFixed(1)} Gbps` : `${totalBandwidth} Mbps`} Total
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Hub */}
          <div className="bg-fw-base rounded-xl p-6 border border-fw-secondary">
            <SectionHeader icon={Network} title="Hub" step={2} onEdit={onEditStep} />
            <ReviewRow label="Hub Name" value={connectionName || 'Not named'} />
            <ReviewRow label="Resiliency" value={resiliencyLabel} />
          </div>

          {/* Providers & Locations */}
          <div className="bg-fw-base rounded-xl p-6 border border-fw-secondary">
            <SectionHeader icon={MapPin} title="Providers & Locations" step={1} onEdit={onEditStep} />
            <ReviewRow label="Providers" value={providers.join(', ') || 'None selected'} />
            <ReviewRow label="Connection Type" value={config.type || 'Not selected'} />
            <ReviewRow label="Total Locations" value={`${totalLocations} across ${providers.length} provider${providers.length !== 1 ? 's' : ''}`} />
            {isAwsLmcc && awsAccountId && (
              <ReviewRow label="AWS Account ID" value={<span className="font-mono">{awsAccountId}</span>} />
            )}

            {providers.map(provider => {
              const locs = selectedLocations[provider] || [];
              if (locs.length === 0) return null;

              // LMCC metro display for AWS + Maximum
              if (provider === 'AWS' && isAwsLmcc && lmccMetro) {
                return (
                  <div key={provider} className="mt-3 p-4 bg-fw-accent rounded-lg border border-fw-active/20">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="h-4 w-4 text-fw-link" />
                      <p className="text-figma-sm font-semibold text-fw-heading">AWS Max Metro: {lmccMetro.name}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {['Site A', 'Site B'].map((site) => (
                        <div key={site} className="flex items-center gap-2 p-2 bg-fw-base rounded-lg border border-fw-secondary">
                          <Server className="h-3.5 w-3.5 text-fw-bodyLight" />
                          <div>
                            <p className="text-figma-xs font-medium text-fw-heading">{site}</p>
                            <p className="text-figma-xs text-fw-bodyLight">2 hosted connections</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="text-figma-xs text-fw-body space-y-1">
                      <p>4 hosted connections auto-provisioned by AT&T</p>
                      <p>Contract: {config.configuration?.lmccContractTerm === 'trial' ? 'Trial (Preview)' : config.configuration?.lmccContractTerm || 'Trial'}</p>
                      <p>Transport: MPLS + Internet</p>
                    </div>
                  </div>
                );
              }

              return (
                <div key={provider} className="mt-3 p-3 bg-fw-wash rounded-lg">
                  <p className="text-figma-xs font-semibold text-fw-heading mb-2">{provider}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {locs.map(loc => (
                      <span key={loc} className="inline-flex items-center gap-1 px-2 py-0.5 bg-fw-accent text-brand-blue rounded text-figma-xs font-medium">
                        <CheckCircle2 className="h-3 w-3" />
                        {loc}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bandwidth */}
          <div className="bg-fw-base rounded-xl p-6 border border-fw-secondary">
            <SectionHeader icon={Gauge} title="Bandwidth" step={4} onEdit={onEditStep} />
            {isAwsLmcc ? (
              <>
                {bandwidthSettings['AWS-lmcc'] && (
                  <>
                    <ReviewRow label="Per-Path Bandwidth" value={formatBandwidth(bandwidthSettings['AWS-lmcc'])} />
                    <ReviewRow label="Total Aggregate" value={formatBandwidth(bandwidthSettings['AWS-lmcc'] * 4)} />
                    <ReviewRow label="Paths" value="4 (auto-provisioned by AT&T)" />
                    <ReviewRow label="Bandwidth Mode" value="Fixed (AWS traffic policing enforced)" />
                  </>
                )}
              </>
            ) : (
              <>
                <ReviewRow
                  label="Total Bandwidth"
                  value={totalBandwidth >= 1000 ? `${(totalBandwidth / 1000).toFixed(1)} Gbps` : `${totalBandwidth} Mbps`}
                />
                <ReviewRow label="Connections" value={`${bandwidthEntries.length}`} />

                {bandwidthEntries.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {bandwidthEntries.map(([key, bw]) => {
                      const [provider, location] = key.split(':');
                      const bwLabel = bw >= 1000 ? `${(bw / 1000).toFixed(1)} Gbps` : `${bw} Mbps`;
                      return (
                        <div key={key} className="flex items-center justify-between p-2 bg-fw-wash rounded text-figma-xs">
                          <span className="text-fw-body">{provider} / {location}</span>
                          <span className="font-medium text-fw-heading">{bwLabel}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Auto-configured L3 — AWS Max only */}
          {isAwsLmcc && (
            <div className="bg-fw-base rounded-xl p-6 border border-fw-secondary">
              <SectionHeader icon={Settings} title="Auto-Configured by AT&T & AWS" />
              <p className="text-figma-xs text-fw-bodyLight mb-4">
                No configuration required. AT&T drives all L3 negotiation as the Active Provider.
              </p>
              <ReviewRow label="BGP ASN" value="Auto-assigned by AT&T" />
              <ReviewRow label="VLAN IDs" value="Auto-assigned · 4 paths" />
              <ReviewRow label="IP Subnets" value="Auto-assigned /30 per path" />
              <ReviewRow label="MTU" value="Auto-configured" />
              <ReviewRow label="Encryption" value="MACsec — available at GA" />
            </div>
          )}

          {/* Network Configuration — hidden for AWS Max (AT&T negotiates all L3 params automatically) */}
          {!isAwsLmcc && (
          <div className="bg-fw-base rounded-xl p-6 border border-fw-secondary">
            <SectionHeader icon={Network} title="Network Configuration" step={5} onEdit={onEditStep} />
            <ReviewRow label="IP Stack" value={(config.configuration?.stackType || 'ipv4').toUpperCase()} />
            <ReviewRow label="BFD" value={config.configuration?.bfdEnabled ? 'Enabled' : 'Disabled'} />
            <ReviewRow label="QoS Classifier" value={config.configuration?.qosClassifier || 'Best Effort'} />
            <ReviewRow label="Peer ASN" value={config.configuration?.peerAsn || 'Public'} />
            <ReviewRow label="Layer 3 MTU" value={`${config.configuration?.l3mtu || 1500}`} />

            {config.configuration?.internetSubnets && config.configuration.internetSubnets.length > 0 && (
              <ReviewRow
                label="Subnets"
                value={
                  <div className="space-y-0.5">
                    {config.configuration.internetSubnets.filter(Boolean).map((s, i) => (
                      <span key={i} className="block font-mono text-figma-xs">{s}</span>
                    ))}
                  </div>
                }
              />
            )}
          </div>
          )}

          {/* Security — hidden for AWS Max (MACsec encryption is automatic) */}
          {!isAwsLmcc && (
          <div className="bg-fw-base rounded-xl p-6 border border-fw-secondary">
            <SectionHeader icon={Shield} title="Security & Monitoring" step={5} onEdit={onEditStep} />
            <ReviewRow label="DDoS Protection" value={config.configuration?.ddosProtection ? 'Enabled' : 'Disabled'} />
            <ReviewRow label="Advanced Monitoring" value={config.configuration?.advancedMonitoring ? 'Enabled' : 'Disabled'} />
          </div>
          )}

          {/* Provider-specific */}
          {!isAwsLmcc && config.configuration?.vifType && (
            <div className="bg-fw-base rounded-xl p-6 border border-fw-secondary">
              <SectionHeader icon={Network} title="AWS Configuration" step={5} onEdit={onEditStep} />
              <ReviewRow label="VIF Type" value={config.configuration.vifType} />
              <ReviewRow label="Service Access" value={config.configuration.serviceAccessType || 'Internet'} />
            </div>
          )}
          {config.configuration?.azureSubscriptionId && (
            <div className="bg-fw-base rounded-xl p-6 border border-fw-secondary">
              <SectionHeader icon={Network} title="Azure Configuration" step={5} onEdit={onEditStep} />
              <ReviewRow label="Subscription ID" value={config.configuration.azureSubscriptionId} />
              {config.configuration.expressRouteCircuitKey && (
                <ReviewRow label="ExpressRoute Key" value={config.configuration.expressRouteCircuitKey} />
              )}
            </div>
          )}
          {config.configuration?.gcpPairingKey && (
            <div className="bg-fw-base rounded-xl p-6 border border-fw-secondary">
              <SectionHeader icon={Network} title="Google Cloud Configuration" step={5} onEdit={onEditStep} />
              <ReviewRow label="Interconnect Type" value={config.configuration.gcpInterconnectType || 'Partner'} />
              <ReviewRow label="Pairing Key" value={config.configuration.gcpPairingKey} />
            </div>
          )}
          {config.configuration?.oracleOcid && (
            <div className="bg-fw-base rounded-xl p-6 border border-fw-secondary">
              <SectionHeader icon={Network} title="Oracle Configuration" step={5} onEdit={onEditStep} />
              <ReviewRow label="OCID" value={config.configuration.oracleOcid} />
              {config.configuration.oracleCompartmentId && (
                <ReviewRow label="Compartment" value={config.configuration.oracleCompartmentId} />
              )}
            </div>
          )}
        </div>

        {/* Right Column: Topology + Billing */}
        <div className="lg:col-span-1">
          <div className="sticky top-4 space-y-6">
            {/* Mini Topology Preview */}
            {/* Topology diagram */}
            <div className="bg-fw-base rounded-xl p-5 border border-fw-secondary">
              <h4 className="text-figma-sm font-semibold text-fw-heading mb-1">Network Topology</h4>
              {config.type === 'Cloud to Cloud' && (
                <p className="text-[11px] text-fw-bodyLight mb-3">
                  Cloud to Cloud — {providers.join(' · ')} linked through one Hub
                </p>
              )}
              <div className="flex items-start justify-center gap-2">
                {/* AT&T Core */}
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-xl bg-fw-cobalt-100 border-2 border-fw-cobalt-400 flex items-center justify-center">
                    <Network className="h-5 w-5 text-fw-link" />
                  </div>
                  <span className="text-[10px] text-fw-bodyLight mt-1.5 text-center leading-tight">AT&T Core</span>
                </div>

                {/* Dashed line: AT&T Core → Hub */}
                <div className="mt-6 flex-none w-6 border-t-2 border-dashed border-fw-secondary" />

                {/* Hub */}
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-xl bg-fw-wash border-2 border-fw-secondary flex items-center justify-center">
                    <Settings className="h-5 w-5 text-fw-bodyLight" />
                  </div>
                  <span className="text-[10px] text-fw-bodyLight mt-1.5 text-center leading-tight max-w-[56px] truncate">
                    {(connectionName || 'Router').substring(0, 10)}
                  </span>
                </div>

                {/* Solid line: Hub → Provider(s) */}
                <div className="mt-6 flex-none w-6 border-t-2 border-fw-active" />

                {/* Provider(s) */}
                <div className="flex flex-col gap-3">
                  {providers.map(provider => {
                    const loc = (selectedLocations[provider] || [])[0];
                    return (
                      <div key={provider} className="flex flex-col items-center">
                        <div className="w-12 h-12 rounded-xl bg-fw-cobalt-100 border-2 border-fw-active flex items-center justify-center relative">
                          <MapPin className="h-5 w-5 text-fw-link" />
                          <span
                            className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white"
                            style={{ backgroundColor: providerColor(provider) }}
                            aria-hidden
                          />
                        </div>
                        <span className="text-[10px] font-medium text-fw-heading mt-1.5 text-center leading-tight">{provider}</span>
                        {loc && (
                          <span className="text-[9px] text-fw-bodyLight text-center leading-tight max-w-[64px] truncate">{loc}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <BillingPreview
              provider={config.provider}
              type={config.type as any}
              bandwidth={config.bandwidth as any}
              location={config.location}
              configuration={config.configuration}
              selectedPlanId={billingChoice.planId}
              onPlanChange={(planId) => onBillingChange({ ...billingChoice, planId })}
            />
          </div>
        </div>
      </div>

      {/* Action Buttons — only for non-AWS Max flows */}
      {!isAwsLmcc && (
      <div className="flex items-center justify-center gap-4 pt-2">
        <button
          onClick={() => {
            const { nodes, edges } = wizardToDesigner({
              cloudRouterName: connectionName,
              providers,
              selectedLocations,
              bandwidthSettings,
              connectionType: config.type,
              resiliencyLevel: config.resiliencyLevel,
            });
            if (onSwitchToVisual) {
              onSwitchToVisual(nodes, edges);
            } else {
              navigate('/create', {
                state: {
                  mode: 'visual',
                  initialNodes: nodes,
                  initialEdges: edges,
                  resiliencyLevel: config.resiliencyLevel,
                  selectedProviders: providers,
                  selectedConnectionType: config.type,
                },
              });
            }
          }}
          className="inline-flex items-center gap-2 px-6 h-10 bg-fw-wash border border-fw-secondary rounded-full text-figma-base font-medium text-fw-link hover:bg-fw-accent hover:border-fw-active/30 transition-colors"
        >
          <Settings className="h-4 w-4" />
          Open in Network Designer
        </button>
      </div>
      )}

      {isAwsLmcc ? (
        <div className="bg-fw-accent border border-fw-active rounded-xl p-4">
          <p className="text-figma-base text-fw-linkHover">
            <strong>Next step:</strong> Copy your ActivationKey above and paste it in the AWS Interconnect Console. AT&T waits — nothing else happens until AWS picks up the key.
          </p>
        </div>
      ) : (
      <div className="bg-fw-accent border border-fw-active rounded-xl p-4">
        <p className="text-figma-base text-fw-linkHover">
          <strong>Note:</strong> The connection will be created in an inactive state.
          You can activate it from the management dashboard when ready.
        </p>
      </div>
      )}
    </div>
  );
}
