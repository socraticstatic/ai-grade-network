import { useState } from 'react';
import { Shield, AlertTriangle, ChevronDown } from 'lucide-react';
import { AttIcon } from '../../icons/AttIcon';
import { Connection } from '../../../types';
import { isC2C, getConnectionLegs } from '../../../utils/connectionLegs';
import { providerColor } from '../../../utils/providerColors';

interface ResiliencyMapProps {
  connection: Connection;
}

type Scenario = 'normal' | 'site1-failure' | 'site2-failure' | 'single-path';

interface PathNode {
  id: string;
  label: string;
  site: string;
  status: 'active' | 'standby' | 'down';
}

function getTier(connection: Connection): 'standard' | 'maximum' | 'geodiversity' {
  const cfg = connection.configuration as any;
  if (cfg?.resiliencyLevel === 'geodiversity') return 'geodiversity';
  if (cfg?.resiliencyLevel === 'maximum' || cfg?.isLmcc) return 'maximum';
  return 'standard';
}

function getPaths(connection: Connection, scenario: Scenario): PathNode[] {
  const tier = getTier(connection);
  const provider = connection.provider || 'AWS';
  const loc = connection.location || 'US East';

  if (tier === 'standard') {
    return [{ id: 'p1', label: `${provider} Path 1`, site: loc, status: scenario === 'single-path' ? 'down' : 'active' }];
  }

  if (tier === 'maximum') {
    const isLmcc = (connection.configuration as any)?.isLmcc;
    if (isLmcc) {
      // LMCC 4-path architecture
      const metro = (connection.configuration as any)?.lmccMetro || 'San Jose';
      return [
        { id: 'path-1a', label: 'Path A', site: `Site 1`, status: scenario === 'site1-failure' ? 'down' : 'active' },
        { id: 'path-1b', label: 'Path B', site: `Site 1`, status: scenario === 'site1-failure' ? 'down' : scenario === 'single-path' ? 'down' : 'active' },
        { id: 'path-2a', label: 'Path C', site: `Site 2`, status: scenario === 'site2-failure' ? 'down' : 'active' },
        { id: 'path-2b', label: 'Path D', site: `Site 2`, status: scenario === 'site2-failure' ? 'down' : 'active' },
      ];
    }
    // Generic maximum: 2 paths, 2 sites
    return [
      { id: 'p1', label: `${provider} Path 1`, site: 'Site 1', status: scenario === 'site1-failure' ? 'down' : 'active' },
      { id: 'p2', label: `${provider} Path 2`, site: 'Site 2', status: scenario === 'site2-failure' ? 'down' : 'active' },
    ];
  }

  // Geodiversity: 4 paths, 2 metros
  return [
    { id: 'p1', label: `${provider} Metro 1 - Path A`, site: 'Metro 1', status: scenario === 'site1-failure' ? 'down' : 'active' },
    { id: 'p2', label: `${provider} Metro 1 - Path B`, site: 'Metro 1', status: scenario === 'site1-failure' ? 'down' : scenario === 'single-path' ? 'down' : 'active' },
    { id: 'p3', label: `${provider} Metro 2 - Path A`, site: 'Metro 2', status: scenario === 'site2-failure' ? 'down' : 'active' },
    { id: 'p4', label: `${provider} Metro 2 - Path B`, site: 'Metro 2', status: scenario === 'site2-failure' ? 'down' : 'active' },
  ];
}

const STATUS_COLORS = {
  active: { dot: 'bg-fw-link', line: 'stroke-blue-500', text: 'text-fw-link', bg: 'bg-fw-cobalt-100' },
  standby: { dot: 'bg-complementary-amber', line: 'stroke-amber-400', text: 'text-fw-warn', bg: 'bg-fw-warn/10' },
  down: { dot: 'bg-fw-error', line: 'stroke-red-400', text: 'text-fw-error', bg: 'bg-fw-errorLight' },
};

const SCENARIOS: { id: Scenario; label: string }[] = [
  { id: 'normal', label: 'Normal Operation' },
  { id: 'site1-failure', label: 'Site 1 Failure' },
  { id: 'site2-failure', label: 'Site 2 Failure' },
  { id: 'single-path', label: 'Single Path Failure' },
];

function C2CResiliencyMap({ connection }: ResiliencyMapProps) {
  const legs = getConnectionLegs(connection);
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-figma-lg font-bold text-fw-heading">Inter-Cloud Resiliency</h3>
        <p className="text-figma-sm text-fw-bodyLight mt-1">
          Two cloud legs bridged by one Hub. Traffic between clouds transits the Hub,
          which terminates BGP for each leg.
        </p>
      </div>

      {/* Hub diagram: Leg A  <->  Hub  <->  Leg B */}
      <div className="bg-fw-base border border-fw-secondary rounded-2xl p-6">
        <div className="flex items-center justify-between gap-4">
          {legs[0] && <LegBox leg={legs[0]} />}

          <div className="flex-1 flex items-center min-w-[40px]">
            <div className="flex-1 h-0.5 bg-fw-link/30" />
          </div>

          <div className="flex flex-col items-center gap-1 shrink-0">
            <div className="w-16 h-16 rounded-xl bg-fw-heading flex items-center justify-center border-2 border-fw-link/40">
              <AttIcon name="hub" className="h-7 w-7 text-white" />
            </div>
            <span className="text-figma-xs font-medium text-fw-heading">Hub</span>
            <span className="text-[10px] text-fw-bodyLight">Hub</span>
          </div>

          <div className="flex-1 flex items-center min-w-[40px]">
            <div className="flex-1 h-0.5 bg-fw-link/30" />
          </div>

          {legs[1] && <LegBox leg={legs[1]} />}
        </div>
      </div>

      {legs.length > 2 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {legs.slice(2).map((leg, i) => <LegBox key={i} leg={leg} compact />)}
        </div>
      )}

      <p className="text-figma-sm text-fw-bodyLight">
        Make each leg resilient independently: add a redundant link per cloud and enable BFD on the
        Hub for sub-second failover. The clouds never peer directly — they meet at the Hub.
      </p>
    </div>
  );
}

function LegBox({ leg, compact }: { leg: ReturnType<typeof getConnectionLegs>[number]; compact?: boolean }) {
  const active = leg.status === 'Active';
  return (
    <div className={`flex flex-col items-center gap-1 shrink-0 ${compact ? '' : 'min-w-[96px]'}`}>
      <div className="w-16 h-16 rounded-xl bg-fw-wash border border-fw-secondary flex items-center justify-center relative">
        <span className="text-figma-xs font-bold text-fw-heading">{leg.provider}</span>
        <span
          className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white"
          style={{ backgroundColor: providerColor(leg.provider) }}
          aria-hidden
        />
      </div>
      <span className="text-figma-xs font-medium text-fw-heading">{leg.provider}</span>
      <span className="text-[10px] text-fw-bodyLight text-center max-w-[110px]">{leg.location}</span>
      <span className={`text-[10px] font-bold uppercase ${active ? 'text-fw-success' : 'text-fw-disabled'}`}>
        {active ? 'Active' : leg.status}
      </span>
    </div>
  );
}

export function ResiliencyMap({ connection }: ResiliencyMapProps) {
  if (isC2C(connection)) return <C2CResiliencyMap connection={connection} />;
  return <StandardResiliencyMap connection={connection} />;
}

function StandardResiliencyMap({ connection }: ResiliencyMapProps) {
  const [scenario, setScenario] = useState<Scenario>('normal');
  const tier = getTier(connection);
  const paths = getPaths(connection, scenario);
  const activePaths = paths.filter(p => p.status === 'active').length;
  const totalPaths = paths.length;
  const allUp = activePaths === totalPaths;
  const sites = [...new Set(paths.map(p => p.site))];

  const failoverTime = tier === 'standard' ? 'N/A' : '0.8s';
  const packetLoss = scenario === 'normal' ? '0' : tier === 'standard' ? 'Total loss' : '0 packets';
  const bgpReconvergence = tier === 'standard' ? 'N/A' : '1.2s';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-figma-lg font-bold text-fw-heading">Resiliency Architecture</h3>
          <p className="text-figma-sm text-fw-bodyLight mt-1">
            {tier === 'standard' && 'Single path, no site diversity. Device-level redundancy only.'}
            {tier === 'maximum' && 'Dual-site within metro. Protects against single-site failure.'}
            {tier === 'geodiversity' && 'Dual-metro diversity. Protects against metro-wide outage.'}
          </p>
        </div>
        {tier !== 'standard' && (
          <div className="relative">
            <select
              value={scenario}
              onChange={e => setScenario(e.target.value as Scenario)}
              className="appearance-none pl-4 pr-10 h-9 rounded-full border border-fw-secondary text-figma-sm font-medium text-fw-heading bg-fw-base hover:bg-fw-wash cursor-pointer focus:ring-2 focus:ring-fw-active"
            >
              {SCENARIOS.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fw-bodyLight pointer-events-none" />
          </div>
        )}
      </div>

      {/* Status line */}
      <div className="flex items-center gap-2 text-figma-sm">
        <div className={`w-2 h-2 rounded-full ${allUp ? 'bg-fw-link' : 'bg-fw-error'}`} />
        <span className="font-medium text-fw-heading">
          {activePaths}/{totalPaths} paths active
        </span>
        {!allUp && scenario !== 'normal' && (
          <span className="text-fw-bodyLight">
            Failover: {failoverTime} | Packet loss: {packetLoss}
          </span>
        )}
      </div>

      {/* Path diagram */}
      <div className="bg-fw-base border border-fw-secondary rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          {/* Customer side */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-16 h-16 rounded-xl bg-fw-heading flex items-center justify-center">
              <Shield className="h-7 w-7 text-white" />
            </div>
            <span className="text-figma-xs font-medium text-fw-heading">Your Network</span>
          </div>

          {/* Paths */}
          <div className="flex-1 mx-8">
            {sites.map(site => {
              const sitePaths = paths.filter(p => p.site === site);
              return (
                <div key={site} className="mb-4 last:mb-0">
                  <p className="text-[10px] font-bold text-fw-bodyLight uppercase tracking-wider mb-2">{site}</p>
                  <div className="space-y-2">
                    {sitePaths.map(path => {
                      const sc = STATUS_COLORS[path.status];
                      return (
                        <div key={path.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${sc.bg} border-${path.status === 'down' ? 'fw-error/20' : 'fw-secondary'}`}>
                          <div className={`w-2.5 h-2.5 rounded-full ${sc.dot} ${path.status === 'active' ? 'animate-pulse' : ''}`} />
                          <div className="flex-1 h-0.5 bg-current opacity-20" />
                          <span className={`text-figma-xs font-medium ${sc.text}`}>{path.label}</span>
                          <div className="flex-1 h-0.5 bg-current opacity-20" />
                          <span className={`text-[10px] font-bold uppercase ${sc.text}`}>{path.status}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cloud side */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-16 h-16 rounded-xl bg-fw-link flex items-center justify-center">
              <span className="text-white text-figma-xs font-bold">{connection.provider || 'Cloud'}</span>
            </div>
            <span className="text-figma-xs font-medium text-fw-heading">{connection.provider} Cloud</span>
          </div>
        </div>
      </div>

      {/* Failover metrics */}
      {tier !== 'standard' && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-fw-base border border-fw-secondary rounded-xl p-4 text-center">
            <p className="text-figma-2xl font-bold text-fw-heading">{failoverTime}</p>
            <p className="text-figma-xs text-fw-bodyLight mt-1">BFD Failover Time</p>
          </div>
          <div className="bg-fw-base border border-fw-secondary rounded-xl p-4 text-center">
            <p className="text-figma-2xl font-bold text-fw-heading">{packetLoss}</p>
            <p className="text-figma-xs text-fw-bodyLight mt-1">Packet Loss (failover)</p>
          </div>
          <div className="bg-fw-base border border-fw-secondary rounded-xl p-4 text-center">
            <p className="text-figma-2xl font-bold text-fw-heading">{bgpReconvergence}</p>
            <p className="text-figma-xs text-fw-bodyLight mt-1">BGP Reconvergence</p>
          </div>
        </div>
      )}

      {tier === 'standard' && (
        <p className="text-figma-sm text-fw-bodyLight">
          Single path, no site diversity. Upgrade to Maximum or Geodiversity for failover protection.
        </p>
      )}
    </div>
  );
}
