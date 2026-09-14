import { Fragment } from 'react';
import { Cloud, Building2, Router, Shield } from 'lucide-react';
import { AttIcon } from '../icons/AttIcon';
import { ProviderLogo } from '../connection/ProviderLogo';
import { getVNFTypeIcon } from '../../utils/vnfTypes';
import { buildWizardTopology, type WizardTopoInput, type WizardTopoNode } from './wizardTopologyBuilder';

// Icon tile is 40px; its vertical center (20px, minus half the 2px line) is where the
// connector lines must sit so every line runs dead-through the node centers.
const TILE = 40;
const LINE_TOP = TILE / 2 - 1;

/**
 * Read-only "what you're building" strip for the connection wizard. Draws the full chain
 * (Your Network → AT&T Core → Connection Hub → Cloud) from step 1 in gray, and each element
 * solidifies as its choice is made. Compact by design so it never pushes the step's actual
 * choices below the fold. Reuses the app's MiniTopology visual language + real glyphs.
 */
export function WizardTopology(props: WizardTopoInput) {
  const { columns, connectors } = buildWizardTopology(props);

  const glyph = (node: WizardTopoNode, muted: boolean) => {
    const cls = `w-5 h-5 ${muted ? 'text-fw-disabled' : 'text-fw-link'}`;
    switch (node.icon) {
      case 'hub': return <AttIcon name="hub" className={cls} />;
      case 'cloud': return <Cloud className={cls} />;
      case 'customer': return <Building2 className={cls} />;
      case 'ipe': return <Router className={cls} />;
      case 'vnf': {
        const VIcon = node.vnfType ? getVNFTypeIcon(node.vnfType) : Shield;
        return <VIcon className={cls} />;
      }
    }
  };

  const renderNode = (node: WizardTopoNode) => {
    const ghost = node.state === 'ghost';
    const VnfIcon = node.attachedVnf?.vnfType ? getVNFTypeIcon(node.attachedVnf.vnfType) : null;
    return (
      <div key={node.id} className="flex flex-col items-center text-center shrink-0 w-[84px]">
        <div
          className={`relative rounded-lg flex items-center justify-center border-2 ${
            ghost ? 'bg-fw-wash border-fw-secondary border-dashed' : 'bg-fw-accent border-fw-link/40'
          }`}
          style={{ width: TILE, height: TILE }}
        >
          {glyph(node, ghost)}
          {node.icon === 'cloud' && node.cloudProvider && !ghost && (
            <span className="absolute -bottom-1 -right-1 rounded-[3px] ring-2 ring-white shadow-sm">
              <ProviderLogo provider={node.cloudProvider} size={14} />
            </span>
          )}
          <span
            className={`absolute -top-1 -right-1 w-2 h-2 rounded-full border border-white ${
              ghost ? 'bg-fw-neutral' : 'bg-fw-success'
            }`}
          />
        </div>
        <span className={`text-[11px] font-semibold mt-1 leading-tight truncate max-w-[84px] ${ghost ? 'text-fw-disabled' : 'text-fw-heading'}`}>
          {node.label}
        </span>
        {node.sublabel && (
          <span className="text-[10px] text-fw-bodyLight leading-tight truncate max-w-[84px]">{node.sublabel}</span>
        )}
        {node.badge && (
          <span className="mt-0.5 inline-flex items-center px-1.5 py-px rounded text-[9px] font-semibold bg-fw-accent text-fw-link whitespace-nowrap">
            {node.badge}
          </span>
        )}
        {/* VNF attached to the hub — a chip beneath it. */}
        {node.attachedVnf && (
          <span
            className={`mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[9px] font-medium max-w-[84px] ${
              node.attachedVnf.state === 'ghost'
                ? 'border-dashed border-fw-secondary text-fw-disabled'
                : 'border-fw-active/30 bg-fw-base text-fw-body'
            }`}
            title={node.attachedVnf.label}
          >
            {VnfIcon ? <VnfIcon className="w-2.5 h-2.5 shrink-0 text-fw-link" /> : null}
            <span className="truncate">{node.attachedVnf.label}</span>
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="bg-fw-base rounded-xl border border-fw-secondary px-4 py-2.5 mb-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fw-bodyLight mb-1.5">
        You're building <span className="font-normal normal-case tracking-normal text-fw-disabled">— fills in as you go</span>
      </p>
      <div className="flex items-start">
        {columns.map((col, idx) => {
          const isLast = idx === columns.length - 1;
          const connector = connectors.find(c => c.after === idx);
          return (
            <Fragment key={idx}>
              {col.length > 1 ? (
                <div className="flex flex-col items-center gap-2 shrink-0">{col.map(renderNode)}</div>
              ) : (
                renderNode(col[0])
              )}
              {!isLast && connector && (
                <div className="relative flex-1 min-w-[20px]" style={{ marginTop: LINE_TOP }}>
                  {connector.label && (
                    <span className="absolute left-1/2 -translate-x-1/2 -top-3.5 text-[9px] font-medium text-fw-bodyLight tabular-nums whitespace-nowrap">
                      {connector.label}
                    </span>
                  )}
                  <div
                    className="w-full border-t-2"
                    style={{
                      borderColor: connector.state === 'set' ? '#0057b8' : '#9ca3af',
                      borderStyle: connector.state === 'set' ? 'solid' : 'dashed',
                    }}
                    aria-hidden
                  />
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
