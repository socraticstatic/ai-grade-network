// src/components/connection/MiniTopology.tsx
import { Fragment, useMemo } from 'react';
import { Cloud } from 'lucide-react';
import { AttIcon } from '../icons/AttIcon';
import type { Connection } from '../../types';
import type { Hub } from '../../types/hub';
import {
  buildConnectionTopology,
  buildHubTopology,
  type MiniNode,
} from './miniTopologyBuilder';
import { ProviderLogo } from './ProviderLogo';

// Single-connection mode (used by connection cards and ConnectionOverview)
interface LegacyMiniTopologyProps {
  connection: Connection;
  hubs?: Hub[];
  linksCount?: number;
  vnfsCount?: number;
  onNodeClick?: (node: MiniNode) => void;
}

// Hub-centric mode (used by TopologyView and hub detail)
interface RouterMiniTopologyProps {
  router: Hub;
  connections: Connection[];
  connection?: never;
  hubs?: never;
  linksCount?: never;
  vnfsCount?: never;
  onNodeClick?: (node: MiniNode) => void;
}

type MiniTopologyProps = LegacyMiniTopologyProps | RouterMiniTopologyProps;


export function MiniTopology(props: MiniTopologyProps) {
  const isRouterMode = 'router' in props && props.router !== undefined;
  const onNodeClick = props.onNodeClick;

  const { nodes, edges, extraCount } = useMemo(() => {
    if (isRouterMode) {
      const routerProps = props as RouterMiniTopologyProps;
      return buildHubTopology(routerProps.router, routerProps.connections);
    }
    const legacyProps = props as LegacyMiniTopologyProps;
    const hubsCount = (legacyProps.hubs ?? []).length;
    return { ...buildConnectionTopology(legacyProps.connection, { hubsCount }), extraCount: 0 };
  }, [
    isRouterMode,
    (props as any).router,
    (props as any).connections,
    (props as any).connection,
    (props as any).hubs,
  ]);

  // Group nodes into columns by x so the Hub hub can fan out to every cloud leg.
  const columns = useMemo(() => {
    const byX = new Map<number, MiniNode[]>();
    for (const n of nodes) {
      const col = byX.get(n.x) ?? [];
      col.push(n);
      byX.set(n.x, col);
    }
    return [...byX.entries()].sort((a, b) => a[0] - b[0]).map(([, col]) => col);
  }, [nodes]);

  const columnActive = (col: MiniNode[]) => col.some((n) => n.isActive);
  const edgeBetweenColumnsActive = (left: MiniNode[], right: MiniNode[]) =>
    edges.some(
      (e) =>
        e.isActive &&
        ((left.some((n) => n.id === e.from) && right.some((n) => n.id === e.to)) ||
          (right.some((n) => n.id === e.from) && left.some((n) => n.id === e.to))),
    );

  const renderNode = (node: MiniNode) => {
    const clickable = !!onNodeClick && (node.icon === 'cloud' || node.icon === 'hub');
    const NodeBox = (
    <div key={node.id} className="flex flex-col items-center text-center shrink-0 min-w-0">
      <div
        className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center border-2 transition-all ${
          node.isActive ? 'bg-fw-wash border-fw-link/40' : 'bg-fw-wash border-fw-secondary border-dashed'
        } ${clickable ? 'group-hover:border-fw-link group-hover:shadow-md' : ''}`}
      >
        {node.icon === 'hub' ? (
          <AttIcon name="hub" className="w-6 h-6 sm:w-7 sm:h-7 text-fw-bodyLight" />
        ) : (
          <Cloud className="w-5 h-5 sm:w-6 sm:h-6 text-fw-bodyLight" />
        )}
        {node.icon === 'cloud' && node.cloudProvider ? (
          <span className="absolute -bottom-1.5 -right-1.5 rounded-[4px] ring-2 ring-white shadow-sm">
            <ProviderLogo provider={node.cloudProvider} size={18} />
          </span>
        ) : null}
        <span
          className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
            node.isActive ? 'bg-fw-success' : 'bg-fw-neutral'
          }`}
        />
      </div>
      <span className="text-figma-xs font-medium text-fw-heading mt-1.5 max-w-[120px] leading-snug">
        {node.label}
      </span>
      {node.sublabel && (
        <span className="text-[11px] text-fw-bodyLight leading-snug mt-0.5 max-w-[120px]">
          {node.sublabel}
        </span>
      )}
    </div>
    );

    if (!clickable) return NodeBox;
    return (
      <button
        key={node.id}
        type="button"
        onClick={() => onNodeClick?.(node)}
        aria-label={node.icon === 'hub' ? 'Open Hub' : `Open ${node.label}`}
        className="group flex flex-col items-center shrink-0 min-w-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-fw-link"
        title={node.icon === 'hub' ? 'Open Hub' : `Open ${node.label}`}
      >
        {NodeBox}
      </button>
    );
  };

  return (
    <div className="bg-fw-base rounded-xl overflow-hidden py-6 px-4 sm:px-6">
      <div className="flex items-start justify-between gap-2 sm:gap-4 w-full">
        {columns.map((col, idx) => {
          const isLast = idx === columns.length - 1;
          const nextCol = columns[idx + 1];
          const connectorActive = nextCol ? edgeBetweenColumnsActive(col, nextCol) : false;
          const hasConnector = !!nextCol && edges.some(
            (e) =>
              (col.some((n) => n.id === e.from) && nextCol.some((n) => n.id === e.to)) ||
              (nextCol.some((n) => n.id === e.from) && col.some((n) => n.id === e.to)),
          );
          return (
            <Fragment key={idx}>
              {col.length > 1 ? (
                <div className="flex flex-col items-center gap-3 shrink-0">{col.map(renderNode)}</div>
              ) : (
                renderNode(col[0])
              )}
              {!isLast && hasConnector && (
                <div
                  className="flex-1 min-w-[24px] border-t-2 self-start mt-[28px] sm:mt-[32px]"
                  style={{
                    borderColor: connectorActive ? '#0057b8' : '#9ca3af',
                    borderStyle: connectorActive ? 'solid' : 'dashed',
                  }}
                  aria-hidden
                />
              )}
            </Fragment>
          );
        })}
        {extraCount > 0 && (
          <div className="flex flex-col items-center text-center shrink-0">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-fw-wash border-2 border-dashed border-fw-secondary">
              <span className="text-figma-xs font-medium text-fw-bodyLight">+{extraCount}</span>
            </div>
            <span className="text-[11px] text-fw-bodyLight mt-1.5">more</span>
          </div>
        )}
      </div>
    </div>
  );
}
