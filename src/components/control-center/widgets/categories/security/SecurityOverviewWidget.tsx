import { Connection } from '../../../../../types';

interface SecurityOverviewWidgetProps {
  connections: Connection[];
}

export function SecurityOverviewWidget({ connections }: SecurityOverviewWidgetProps) {
  const secureConnections = connections.filter(c =>
    c.security?.encryption &&
    c.security?.firewall &&
    c.security?.ddosProtection
  ).length;

  const total = connections.length || 1;
  const securityScore = connections.length > 0
    ? Math.round((secureConnections / total) * 100)
    : 100;

  const activeThreats = 2;
  const vulnerabilities = 5;
  const complianceScore = 98;

  // SVG ring — circumference ≈ 100 for r=15.9
  const scoreOffset = 100 - securityScore;

  return (
    <div className="space-y-4">
      {/* Score row — ring + inline stats, no duplicate big number */}
      <div className="flex items-center gap-4">
        <div className="relative h-14 w-14 flex-shrink-0">
          <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
            <circle
              cx="18" cy="18" r="15.9"
              fill="none"
              stroke="var(--color-secondary, #dcdfe3)"
              strokeWidth="2.5"
            />
            <circle
              cx="18" cy="18" r="15.9"
              fill="none"
              stroke="var(--color-success, #2d7e24)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={`${securityScore} ${scoreOffset}`}
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-figma-sm font-bold text-fw-heading leading-none">
              {securityScore}
            </span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-figma-sm font-semibold text-fw-heading">Security Score</div>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <div className="flex items-center gap-1">
              <span className="text-figma-xs font-bold text-fw-error">{activeThreats}</span>
              <span className="text-figma-xs text-fw-bodyLight">threats</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-figma-xs font-bold text-fw-body">{vulnerabilities}</span>
              <span className="text-figma-xs text-fw-bodyLight">vulnerabilities</span>
            </div>
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <div className="text-figma-base font-bold text-fw-success">{complianceScore}%</div>
          <div className="text-figma-xs text-fw-bodyLight">compliance</div>
        </div>
      </div>

      {/* Per-connection security status — real data */}
      <div>
        {connections.length === 0 ? (
          <p className="text-figma-sm text-fw-bodyLight">No connections to display</p>
        ) : (
          <div className="divide-y divide-fw-secondary">
            {connections.slice(0, 4).map(connection => {
              const flags = [
                connection.security?.encryption && 'ENC',
                connection.security?.firewall && 'FW',
                connection.security?.ddosProtection && 'DDOS',
                connection.security?.ipsec && 'IPSec',
              ].filter(Boolean);

              const isSecure = flags.length >= 3;

              return (
                <div key={connection.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                      isSecure ? 'bg-fw-success' : 'bg-fw-error'
                    }`} />
                    <span className="text-figma-sm text-fw-body truncate">{connection.name}</span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    {flags.slice(0, 3).map(flag => (
                      <span key={flag} className="text-figma-xs text-fw-bodyLight font-mono">{flag}</span>
                    ))}
                    {flags.length === 0 && (
                      <span className="text-figma-xs text-fw-error">Unsecured</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
