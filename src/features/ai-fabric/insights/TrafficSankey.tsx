import { useMemo, useRef, useState } from 'react';
import { fmtTokens, fmtUsd, statesRealMoney } from '../aiSpend';
import type { SankeyGraph, SankeyPath } from './sankeyModel';

/**
 * The Traffic-flow Sankey, drawn from a `sankeyGraph()` snapshot.
 *
 * Pure: graph in, SVG out. No CC import — the parent derives the graph, so
 * this file cannot restate a figure the model already computed. Ribbons are
 * code-generated cubic-bezier bands, not assets: the Figma comp ships them as
 * flattened images, which cannot follow live values.
 */

const VIEW_W = 1417;
const VIEW_H = 400;
const BAR_W = 16;
const GAP = 16;
/** Column x offsets from the pixel spec: 0 / 467 / 934 / 1400. */
const COL_X = [0, 467, 934, 1400];

const SELECTED = '#00c9ff';
const RIBBON = '#0074b3';
/** No node shrinks below one legible label line. Proportional stacking alone
 *  crushes every low-spend node to a sliver the moment one identity carries
 *  the estate's spend - which is the seeded resting state, not an edge case. */
const MIN_H = 28;

interface Laid {
  x: number;
  y: number;
  h: number;
  col: number;
  label: string;
  value: number;
  color: string;
}
interface Slice {
  top: number;
  bottom: number;
}

/* Stacks each column proportionally to value with 16px gaps, then slices
   every node edge among the paths through it, in path order — offsets
   accumulate so bands never overlap at a node. A node's incoming and
   outgoing sets are identical (paths pass through), so one slice serves
   both edges. */
function layout(graph: SankeyGraph) {
  const laid = new Map<string, Laid>();
  for (let col = 0; col < 4; col++) {
    const colNodes = graph.nodes.filter(n => n.col === col);
    if (!colNodes.length) continue;
    const total = colNodes.reduce((s, n) => s + n.value, 0);
    const avail = VIEW_H - GAP * (colNodes.length - 1);
    // Every node gets its legibility floor first; only the remainder is
    // divided by value share, so proportion still reads without any node
    // vanishing under a dominant sibling.
    const floor = Math.min(MIN_H, avail / colNodes.length);
    const spread = avail - floor * colNodes.length;
    let y = 0;
    for (const n of colNodes) {
      const h = floor + (total > 0 ? (n.value / total) * spread : spread / colNodes.length);
      laid.set(n.id, { x: COL_X[col], y, h, col, label: n.label, value: n.value, color: n.color });
      y += h + GAP;
    }
  }

  const members = new Map<string, number>();
  for (const p of graph.paths)
    for (const id of p.nodes) members.set(id, (members.get(id) ?? 0) + 1);

  const slices = new Map<string, Slice>();
  const cursor = new Map<string, number>();
  for (const p of graph.paths) {
    for (const id of p.nodes) {
      const L = laid.get(id);
      if (!L) continue;
      const start = cursor.get(id) ?? 0;
      const share = L.value > 0 ? p.value / L.value : 1 / (members.get(id) ?? 1);
      const h = share * L.h;
      slices.set(`${p.id}|${id}`, { top: L.y + start, bottom: L.y + start + h });
      cursor.set(id, start + h);
    }
  }
  return { laid, slices };
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/* One <path> per graph path, three bezier bands as subpaths, node edge to
   node edge: M x0,y0t C xm,y0t xm,y1t x1,y1t L x1,y1b C xm,y1b xm,y0b x0,y0b Z */
function ribbonD(p: SankeyPath, laid: Map<string, Laid>, slices: Map<string, Slice>) {
  const parts: string[] = [];
  for (let i = 0; i < 3; i++) {
    const a = laid.get(p.nodes[i]);
    const b = laid.get(p.nodes[i + 1]);
    const sa = slices.get(`${p.id}|${p.nodes[i]}`);
    const sb = slices.get(`${p.id}|${p.nodes[i + 1]}`);
    if (!a || !b || !sa || !sb) continue;
    const x0 = a.x + BAR_W;
    const x1 = b.x;
    const xm = (x0 + x1) / 2;
    parts.push(
      `M ${x0},${r2(sa.top)} C ${xm},${r2(sa.top)} ${xm},${r2(sb.top)} ${x1},${r2(sb.top)} ` +
        `L ${x1},${r2(sb.bottom)} C ${xm},${r2(sb.bottom)} ${xm},${r2(sa.bottom)} ${x0},${r2(sa.bottom)} Z`,
    );
  }
  return parts.join(' ');
}

export function TrafficSankey({ graph }: { graph: SankeyGraph }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const cardRef = useRef<HTMLElement>(null);

  const { laid, slices } = useMemo(() => layout(graph), [graph]);

  // Dollars only when the graph metered money; tokens and budget bases
  // carry token counts, and a $ in front of those would be a lie.
  const fmtValue = graph.basis === 'spend' ? fmtUsd : fmtTokens;

  const activeId = hovered ?? selected;
  const active = graph.paths.find(p => p.id === activeId) ?? null;
  const activeDst = active ? graph.nodes.find(n => n.id === active.nodes[3]) : null;

  const legend = useMemo(() => {
    const seen = new Map<string, string>();
    for (const p of graph.paths) {
      const dst = graph.nodes.find(n => n.id === p.nodes[3]);
      if (dst && !seen.has(p.hops.provider)) seen.set(p.hops.provider, dst.color);
    }
    return [...seen.entries()];
  }, [graph]);

  const toggle = (id: string) => setSelected(s => (s === id ? null : id));

  /* Tooltip anchors to the last pointer position, clamped inside the card;
     a keyboard selection with no pointer lands it near the top left. */
  const tip = (() => {
    const el = cardRef.current;
    const w = el?.clientWidth ?? 0;
    const h = el?.clientHeight ?? 0;
    const x = pointer ? Math.min(Math.max(pointer.x + 16, 8), Math.max(w - 328, 8)) : 24;
    const y = pointer ? Math.min(Math.max(pointer.y + 16, 8), Math.max(h - 120, 8)) : 24;
    return { left: x, top: y };
  })();

  return (
    <section
      ref={cardRef}
      data-testid="sankey"
      className="relative overflow-hidden rounded-2xl border border-fw-secondary bg-fw-base p-6"
      onMouseMove={e => {
        const rect = cardRef.current?.getBoundingClientRect();
        if (rect) setPointer({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }}
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-figma-base font-bold text-fw-body">Traffic flow</h3>
        <div className="flex flex-wrap items-center gap-4">
          {legend.map(([provider, color]) => (
            <span key={provider} className="flex items-center gap-1.5 text-figma-sm text-fw-body">
              <span
                aria-hidden="true"
                className="inline-block h-2 w-2 rounded-[2px]"
                style={{ backgroundColor: color }}
              />
              {provider}
            </span>
          ))}
        </div>
      </div>

      <div className="relative mb-3 h-10">
        {graph.columns.map((c, i) => (
          <div
            key={c.title}
            className={`absolute top-0 ${i === 3 ? 'right-0 text-right' : ''}`}
            style={i === 3 ? undefined : { left: `${(COL_X[i] / VIEW_W) * 100}%` }}
          >
            <div className="text-figma-sm font-bold uppercase text-fw-heading">{c.title}</div>
            <div className="text-figma-xs font-medium text-fw-heading">{c.subtitle}</div>
          </div>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="block h-auto w-full"
        role="group"
        aria-label="Traffic flow from identity to provider"
      >
        {graph.paths.map(p => {
          const isSelected = selected === p.id;
          return (
            <path
              key={p.id}
              data-testid={`sankey-ribbon-${p.id}`}
              d={ribbonD(p, laid, slices)}
              fill={isSelected ? SELECTED : RIBBON}
              fillOpacity={isSelected ? 0.85 : hovered === p.id ? 0.25 : 0.1}
              className="cursor-pointer outline-none"
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              aria-label={`${p.hops.identity} via ${p.hops.source} over ${p.hops.route} to ${p.hops.provider}`}
              onClick={() => toggle(p.id)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  toggle(p.id);
                }
              }}
              onMouseEnter={() => setHovered(p.id)}
              onMouseLeave={() => setHovered(h => (h === p.id ? null : h))}
            />
          );
        })}

        {[...laid.entries()].map(([id, L]) => (
          <rect
            key={id}
            data-testid={`sankey-node-${id}`}
            x={L.x}
            y={r2(L.y)}
            width={BAR_W}
            /* A zero-value node under a mixed estate still draws a sliver, so
               the identity is visible even before it spends. */
            height={Math.max(r2(L.h), 1)}
            fill={L.color}
          />
        ))}

        {[...laid.entries()].map(([id, L]) => {
          const rightEdge = L.col === 3;
          return (
            <text
              key={`label-${id}`}
              x={rightEdge ? L.x - 8 : L.x + BAR_W + 8}
              y={r2(L.y + L.h / 2)}
              textAnchor={rightEdge ? 'end' : 'start'}
              dominantBaseline="middle"
              fontSize={12}
            >
              {/* textColor tokens have no fill-* twins; the gray-scale colors
                  do, at the same hex: fw-gray-700 is fw-body, 900 the value. */}
              <tspan className="fill-fw-gray-700">{L.label}</tspan>
              <tspan className="fill-fw-gray-900 font-medium" dx="6">
                {fmtValue(L.value)}
              </tspan>
            </text>
          );
        })}
      </svg>

      {active && (
        <div
          data-testid="sankey-tooltip"
          className="pointer-events-none absolute z-10 max-w-[360px] rounded-xl border border-fw-secondary bg-fw-base p-3 shadow-md"
          style={tip}
        >
          <div className="flex items-center justify-between gap-4 text-figma-sm font-bold">
            <span className="text-fw-heading">Event path</span>
            {graph.basis === 'spend' && (
              <span className="flex items-center gap-4">
                <span className="text-fw-heading">Cost {fmtUsd(active.cost)}</span>
                {statesRealMoney(active.saved) && (
                  <span className="text-fw-success">Saved {fmtUsd(active.saved)}</span>
                )}
              </span>
            )}
          </div>
          <div className="mt-3 flex gap-6 text-figma-xs">
            {[
              ['Identity', active.hops.identity],
              ['Source', active.hops.source],
              ['Fabric route', active.hops.route],
              ['Provider and model', activeDst?.label ?? active.hops.provider],
            ].map(([label, value]) => (
              <span key={label} className="flex flex-col gap-0.5">
                <span className="font-bold text-fw-heading">{label}</span>
                <span className="text-fw-body">{value}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
