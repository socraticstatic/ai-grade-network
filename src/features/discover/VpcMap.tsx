import { Network, Lock, AlertTriangle, Globe } from 'lucide-react';
import { buildMap, type MapVpc, type MapCloud, type MapRegion } from './buildMap';
import { GW_COLOR, tagHex, tagLabel, type Tag } from './discoveryModel';

/**
 * Level 4 of the drill-down — the VPC/VNet resource map. Three calm columns
 * (subnets grouped by AZ, route tables with policy-violation surfaces,
 * gateways & connections) plus a legend, all rendered from the pure
 * `buildMap` model. No canvas / connection-line spaghetti — hierarchy comes
 * from grouping and spacing, and the fork reads cleaner than the original.
 */

function TagChip({ id, tags, size = 'sm' }: { id: string; tags: Record<string, Tag>; size?: 'sm' | 'xs' }) {
  const hex = tagHex(id, tags);
  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${
        size === 'xs' ? 'px-1.5 py-px text-[10px]' : 'px-2 py-0.5 text-[11px]'
      }`}
      style={{ color: hex, borderColor: `${hex}40`, background: `${hex}14` }}
    >
      {tagLabel(id, tags)}
    </span>
  );
}

const ColHead = ({ children }: { children: React.ReactNode }) => (
  <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-fw-bodyLight">{children}</div>
);

export function VpcMap({
  vpc,
  cloud,
  region,
  tags,
}: {
  vpc: MapVpc;
  cloud: MapCloud;
  region: MapRegion;
  tags: Record<string, Tag>;
}) {
  const m = buildMap(vpc, cloud, region);
  const azs = [...new Set(m.subnets.map(s => s.az))];
  const violByRt = new Map<string, typeof m.violations>();
  for (const v of m.violations) {
    const list = violByRt.get(v.rtId) ?? [];
    list.push(v);
    violByRt.set(v.rtId, list);
  }

  return (
    <div className="rounded-xl border border-fw-secondary bg-fw-wash/40 p-4">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Subnets by AZ */}
        <section>
          <ColHead>Subnets · by availability zone</ColHead>
          <div className="space-y-3">
            {azs.map(az => (
              <div key={az}>
                <div className="mb-1.5 text-[11px] font-medium text-fw-bodyLight">{az}</div>
                <div className="space-y-1.5">
                  {m.subnets
                    .filter(s => s.az === az)
                    .map(s => (
                      <div key={s.id} className="rounded-lg border border-fw-secondary bg-fw-base px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-figma-sm font-medium text-fw-heading">{s.name}</span>
                          {s.kind === 'public' ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-fw-secondary bg-fw-wash px-1.5 py-px text-[10px] font-medium text-fw-bodyLight">
                              <Globe size={10} aria-hidden="true" /> public
                            </span>
                          ) : (
                            <span className="rounded-full border border-fw-success bg-fw-successLight px-1.5 py-px text-[10px] font-medium text-fw-success">
                              private
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-fw-bodyLight">
                          <span className="font-mono tabular-nums">{s.cidr}</span>
                          <span aria-hidden="true">·</span>
                          <span>{s.eni} workloads</span>
                        </div>
                        {s.tag && (
                          <div className="mt-1.5">
                            <TagChip id={s.tag} tags={tags} size="xs" />
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Route tables */}
        <section>
          <ColHead>Route tables</ColHead>
          <div className="space-y-1.5">
            {m.rtables.map(rt => {
              const viol = violByRt.get(rt.id);
              return (
                <div
                  key={rt.id}
                  className={`rounded-lg border px-3 py-2 ${
                    viol ? 'border-fw-error/25 bg-fw-error/[0.04]' : 'border-fw-secondary bg-fw-base'
                  }`}
                >
                  <div className="text-figma-sm font-medium text-fw-heading">{rt.name}</div>
                  <div className="mt-0.5 text-[11px] text-fw-bodyLight">
                    {rt.type} · {rt.routes.length} route{rt.routes.length === 1 ? '' : 's'}
                  </div>
                  {viol && (
                    <div className="mt-2 space-y-1">
                      {viol.map((v, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-[11px] font-medium text-fw-error">
                          <AlertTriangle size={12} className="mt-px shrink-0" aria-hidden="true" />
                          <span>{v.msg}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Gateways & connections */}
        <section>
          <ColHead>Gateways &amp; connections</ColHead>
          <div className="space-y-1.5">
            {m.gateways.map(gw => {
              const col = GW_COLOR[gw.ic] ?? '#5c6167';
              return (
                <div
                  key={gw.id}
                  className="flex items-center gap-2.5 rounded-lg border border-fw-secondary bg-fw-base px-3 py-2"
                >
                  <span
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                    style={{ color: col, background: `${col}1a`, border: `1px solid ${col}44` }}
                  >
                    <Network size={14} aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1 text-figma-sm font-medium text-fw-heading">
                      <span className="truncate">{gw.name}</span>
                      {gw.att && <Lock size={12} className="shrink-0 text-fw-success" aria-hidden="true" />}
                    </div>
                    <div className="truncate text-[11px] text-fw-bodyLight">{gw.type}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-fw-secondary pt-3 text-[11px] text-fw-bodyLight">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full border border-fw-secondary bg-fw-wash" /> public subnet
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full border border-fw-success bg-fw-successLight" /> private subnet
        </span>
        {vpc.attached ? (
          <span className="inline-flex items-center gap-1 text-fw-success">
            <Lock size={12} aria-hidden="true" /> attached via the AI-grade network
          </span>
        ) : (
          <span className="inline-flex items-center gap-1">
            <Globe size={12} aria-hidden="true" /> discovered · not attached
          </span>
        )}
        {m.violations.length > 0 && (
          <span className="inline-flex items-center gap-1 font-medium text-fw-error">
            <AlertTriangle size={12} aria-hidden="true" /> {m.violations.length} policy violation
            {m.violations.length > 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
}
