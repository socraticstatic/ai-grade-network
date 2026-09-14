import { useState } from 'react';
import { Check, Copy, Network } from 'lucide-react';
import { LMCCConnection } from '../../../types/lmcc';

/**
 * The four read-only peering sets — the ONE deliberate place the four-path structure
 * is exposed (GA notes): your router cannot stand up four BGP sessions without four
 * sets of peering detail. Neutral labels only; no MD5, no device or channel identity.
 *
 * Read-only ≠ locked away: every value is selectable, hover-copyable per field, and
 * each set copies whole as router-ready lines — the engineer's actual job here is to
 * carry these values into their own equipment.
 */

const MTU = 9001;

function CopyValue({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className="group/val inline-flex items-center gap-1">
      <dd className="font-mono font-medium text-fw-heading select-all">{value}</dd>
      {value !== '—' && (
        <button
          onClick={() => {
            navigator.clipboard?.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className={`p-0.5 rounded transition-opacity ${copied ? 'opacity-100 text-fw-success' : 'opacity-0 group-hover/val:opacity-100 text-fw-bodyLight hover:text-fw-heading'}`}
          title="Copy value"
          aria-label="Copy value"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </button>
      )}
    </span>
  );
}

export function PeeringSets({ connection }: { connection: LMCCConnection }) {
  const [copiedSet, setCopiedSet] = useState<number | null>(null);

  const setRows = (path: LMCCConnection['paths'][number]): [string, string][] => [
    ['VLAN ID', String(path.vlanId)],
    ['IPv4 subnet', path.subnet?.network ?? '—'],
    ['Your peer IP', path.subnet?.attPeerIp ?? '—'],
    ['AWS peer IP', path.subnet?.awsPeerIp ?? '—'],
    ['MTU', String(MTU)],
    ['AT&T ASN', String(connection.bgp.partnerASN)],
    ['Your ASN', String(connection.bgp.customerASN)],
  ];

  const copySet = (i: number) => {
    const lines = setRows(connection.paths[i]).map(([label, value]) => `${label}: ${value}`);
    navigator.clipboard?.writeText(`Peering ${i + 1}\n${lines.join('\n')}`);
    setCopiedSet(i);
    setTimeout(() => setCopiedSet(null), 1500);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Network className="h-4 w-4 text-fw-link" />
        <h3 className="text-figma-base font-bold text-fw-heading">Peering configuration — your side</h3>
      </div>
      <p className="text-figma-xs text-fw-bodyLight mb-4">
        Negotiated automatically between AT&T and AWS; shown read-only so you can configure
        your own equipment. Each of the four paths carries its own independent Layer 3 session.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {connection.paths.map((path, i) => (
          <div key={path.id} className="group/set w-full h-full rounded-xl border border-fw-secondary bg-fw-wash p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-figma-sm font-semibold text-fw-heading">Peering {i + 1}</p>
              <button
                onClick={() => copySet(i)}
                className={`inline-flex items-center gap-1 text-figma-xs font-medium transition-opacity ${
                  copiedSet === i ? 'opacity-100 text-fw-success' : 'opacity-0 group-hover/set:opacity-100 text-fw-link hover:underline'
                }`}
                title="Copy this peering set"
              >
                {copiedSet === i ? (<><Check className="h-3 w-3" /> Copied</>) : (<><Copy className="h-3 w-3" /> Copy set</>)}
              </button>
            </div>
            <dl className="space-y-1.5 text-figma-xs">
              {setRows(path).map(([label, value]) => (
                <div key={label} className="flex items-center justify-between">
                  <dt className="text-fw-bodyLight">{label}</dt>
                  <CopyValue value={value} />
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}
