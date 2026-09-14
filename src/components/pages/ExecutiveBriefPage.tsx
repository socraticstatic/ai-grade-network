import { useState } from 'react';
import { Printer } from 'lucide-react';
import { AttIcon } from '../icons/AttIcon';

type Tab = 'presentation' | 'notes';

// ── Sub-components ─────────────────────────────────────────────────────────

function SectionLabel({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <p
      className="text-[11px] font-medium tracking-[0.12em] uppercase mb-4"
      style={{ color: light ? 'rgba(255,255,255,0.6)' : '#0057b8' }}
    >
      {children}
    </p>
  );
}

function StatCard({
  stat,
  label,
  description,
  dark = false,
  accent = false,
}: {
  stat: string;
  label: string;
  description?: string;
  dark?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className="rounded-2xl p-8 flex flex-col gap-2"
      style={{
        background: dark ? 'rgba(255,255,255,0.06)' : '#f8fafb',
        border: dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #dcdfe3',
      }}
    >
      <div
        className="text-[56px] font-bold leading-none tracking-[-0.03em]"
        style={{ color: accent ? '#009fdb' : dark ? '#ffffff' : '#0057b8' }}
      >
        {stat}
      </div>
      <div
        className="text-[14px] font-bold tracking-[-0.02em] mt-1"
        style={{ color: dark ? 'rgba(255,255,255,0.9)' : '#1d2329' }}
      >
        {label}
      </div>
      {description && (
        <div
          className="text-[13px] font-medium leading-relaxed"
          style={{ color: dark ? 'rgba(255,255,255,0.5)' : '#686e74' }}
        >
          {description}
        </div>
      )}
    </div>
  );
}

function TwoColContrast({
  leftLabel,
  rightLabel,
  leftItems,
  rightItems,
  dark = false,
}: {
  leftLabel: string;
  rightLabel: string;
  leftItems: string[];
  rightItems: string[];
  dark?: boolean;
}) {
  const cardBase = dark ? 'rgba(255,255,255,0.05)' : '#f8fafb';
  const border = dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #dcdfe3';
  const labelColor = dark ? 'rgba(255,255,255,0.45)' : '#686e74';
  const textColor = dark ? 'rgba(255,255,255,0.85)' : '#1d2329';

  return (
    <div className="grid grid-cols-2 gap-6 mt-8">
      {[
        { lbl: leftLabel, items: leftItems, dim: true },
        { lbl: rightLabel, items: rightItems, dim: false },
      ].map(({ lbl, items, dim }) => (
        <div key={lbl} className="rounded-2xl p-8" style={{ background: cardBase, border }}>
          <p className="text-[11px] font-medium tracking-[0.1em] uppercase mb-5" style={{ color: labelColor }}>
            {lbl}
          </p>
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item} className="flex items-start gap-3 text-[14px] font-medium leading-relaxed" style={{ color: textColor }}>
                <span
                  className="mt-[6px] w-[6px] h-[6px] rounded-full flex-shrink-0"
                  style={{ background: dim ? (dark ? 'rgba(255,255,255,0.3)' : '#bdc1c8') : '#0057b8' }}
                />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function ThreeColCards({
  cards,
  dark = false,
  accent = false,
}: {
  cards: { icon?: string; label?: string; title: string; body: string; tag?: string }[];
  dark?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-6 mt-8">
      {cards.map((card, i) => (
        <div
          key={i}
          className="rounded-2xl p-8 flex flex-col gap-4"
          style={{
            background: dark ? 'rgba(255,255,255,0.05)' : accent && i === 0 ? '#e8f0fb' : '#f8fafb',
            border: dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #dcdfe3',
          }}
        >
          {card.label && (
            <p className="text-[11px] font-medium tracking-[0.1em] uppercase" style={{ color: dark ? 'rgba(255,255,255,0.4)' : '#686e74' }}>
              {card.label}
            </p>
          )}
          {card.icon && (
            <AttIcon name={card.icon as any} className="w-6 h-6" style={{ color: dark ? '#009fdb' : '#0057b8' }} />
          )}
          <div>
            <h4
              className="text-[18px] font-bold tracking-[-0.03em] leading-snug mb-2"
              style={{ color: dark ? '#ffffff' : '#1d2329' }}
            >
              {card.title}
            </h4>
            <p className="text-[14px] font-medium leading-relaxed" style={{ color: dark ? 'rgba(255,255,255,0.6)' : '#686e74' }}>
              {card.body}
            </p>
          </div>
          {card.tag && (
            <span
              className="self-start text-[10px] font-bold tracking-[0.1em] uppercase px-3 py-1 rounded-full"
              style={{ background: '#009fdb22', color: '#009fdb' }}
            >
              {card.tag}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ── App mockup for the Live Product section ────────────────────────────────

function AppMockup() {
  return (
    <div
      className="rounded-2xl overflow-hidden mt-8"
      style={{ border: '1px solid #dcdfe3', boxShadow: '0 20px 60px rgba(0,0,0,0.08)' }}
    >
      {/* Nav bar */}
      <div className="flex items-center justify-between px-6 h-12" style={{ background: '#f8fafb', borderBottom: '1px solid #dcdfe3' }}>
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-bold" style={{ color: '#009fdb' }}>AT&amp;T</span>
          <span className="text-[12px] font-bold" style={{ color: '#1d2329' }}>AI-grade network</span>
        </div>
        <div className="flex items-center gap-6">
          {['Create', 'Manage', 'Monitor', 'Configure'].map((item) => (
            <span key={item} className="text-[11px] font-medium" style={{ color: item === 'Monitor' ? '#0057b8' : '#686e74' }}>
              {item}
            </span>
          ))}
        </div>
      </div>
      {/* Page content */}
      <div className="p-6" style={{ background: '#ffffff' }}>
        <div className="mb-4">
          <h3 className="text-[20px] font-bold tracking-[-0.03em]" style={{ color: '#1d2329' }}>Performance</h3>
          <p className="text-[12px] font-medium" style={{ color: '#686e74' }}>Near real-time monitoring and analytics for your network connections</p>
        </div>
        {/* Metric cards */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Current Utilization', val: '85%' },
            { label: 'Average Utilization', val: '75%' },
            { label: 'Peak Utilization', val: '95%' },
            { label: 'Uptime', val: '99.97%' },
          ].map((m) => (
            <div key={m.label} className="rounded-xl p-4" style={{ background: '#f8fafb', border: '1px solid #dcdfe3' }}>
              <p className="text-[10px] font-medium mb-1" style={{ color: '#686e74' }}>{m.label}</p>
              <p className="text-[22px] font-bold tracking-[-0.03em]" style={{ color: '#1d2329' }}>{m.val}</p>
            </div>
          ))}
        </div>
        {/* Connections table stub */}
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #dcdfe3' }}>
          <div className="grid grid-cols-5 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.06em]" style={{ background: '#f8fafb', color: '#686e74', borderBottom: '1px solid #dcdfe3' }}>
            {['Connection', 'Cloud', 'Status', 'Latency', 'Throughput'].map((h) => (
              <span key={h}>{h}</span>
            ))}
          </div>
          {[
            { name: 'PROD-AWS-US-East', cloud: 'AWS', status: 'Active', latency: '4.2ms', bw: '1.8 Gbps' },
            { name: 'PROD-Azure-Central', cloud: 'Azure', status: 'Active', latency: '6.1ms', bw: '2.4 Gbps' },
            { name: 'PROD-GCP-West', cloud: 'GCP', status: 'Degraded', latency: '12.8ms', bw: '0.9 Gbps' },
          ].map((row) => (
            <div key={row.name} className="grid grid-cols-5 px-4 py-3 text-[11px] font-medium" style={{ color: '#1d2329', borderBottom: '1px solid #f0f1f2' }}>
              <span className="font-bold" style={{ color: '#0057b8' }}>{row.name}</span>
              <span>{row.cloud}</span>
              <span>
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                  style={{
                    background: row.status === 'Active' ? '#dcfce7' : '#fff3cd',
                    color: row.status === 'Active' ? '#166534' : '#92400e',
                  }}
                >
                  {row.status}
                </span>
              </span>
              <span>{row.latency}</span>
              <span>{row.bw}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── LBGUPS table ───────────────────────────────────────────────────────────

function LBGUPSTable() {
  const rows = [
    { stage: 'Learn', role: 'Prospect / Marketing', mode: 'Lean-back', modeNote: 'Discover, explore, orient' },
    { stage: 'Buy', role: 'Procurement', mode: 'Lean-forward', modeNote: 'Evaluate, commit, provision' },
    { stage: 'Get', role: 'Provisioning', mode: 'Lean-forward', modeNote: 'Configure, connect, activate' },
    { stage: 'Use', role: 'Network DevOps / NOC', mode: 'Both', modeNote: 'Monitor (lean-back) · Operate (lean-forward)' },
    { stage: 'Pay', role: 'Billing & Finance', mode: 'Lean-forward', modeNote: 'Review, approve, reconcile' },
    { stage: 'Support', role: 'Support Engineering', mode: 'Both', modeNote: 'Triage (lean-back) · Resolve (lean-forward)' },
  ];

  return (
    <div className="mt-8 rounded-2xl overflow-hidden" style={{ border: '1px solid #dcdfe3' }}>
      <div className="grid grid-cols-4 px-6 py-3" style={{ background: '#f8fafb', borderBottom: '1px solid #dcdfe3' }}>
        {['Stage', 'RBAC Boundary', 'UI Mode', 'Behavior'].map((h) => (
          <span key={h} className="text-[11px] font-bold uppercase tracking-[0.06em]" style={{ color: '#686e74' }}>{h}</span>
        ))}
      </div>
      {rows.map((row, i) => (
        <div
          key={row.stage}
          className="grid grid-cols-4 px-6 py-4 items-center"
          style={{ borderBottom: i < rows.length - 1 ? '1px solid #f0f1f2' : undefined }}
        >
          <span className="text-[16px] font-bold tracking-[-0.02em]" style={{ color: '#0057b8' }}>{row.stage}</span>
          <span className="text-[13px] font-medium" style={{ color: '#454b52' }}>{row.role}</span>
          <span>
            <span
              className="inline-block px-3 py-1 rounded-full text-[11px] font-bold"
              style={{
                background: row.mode === 'Both' ? '#e8f0fb' : row.mode === 'Lean-back' ? '#f0fdf4' : '#fff7ed',
                color: row.mode === 'Both' ? '#0057b8' : row.mode === 'Lean-back' ? '#166534' : '#92400e',
              }}
            >
              {row.mode}
            </span>
          </span>
          <span className="text-[13px] font-medium" style={{ color: '#686e74' }}>{row.modeNote}</span>
        </div>
      ))}
    </div>
  );
}

// ── Presentation content ───────────────────────────────────────────────────

function PresentationContent() {
  const coverBg = '#001a3d';
  const actBg = '#001a3d';
  const closeBg = '#001435';

  return (
    <div className="eb-presentation">

      {/* ── COVER ────────────────────────────────────────────────────────── */}
      <section className="eb-section" style={{ background: coverBg, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <div className="flex-1 flex flex-col justify-between max-w-5xl mx-auto w-full px-16 py-20">
          <div className="flex items-center gap-2">
            <AttIcon name="hub" className="w-6 h-6" style={{ color: '#009fdb' }} />
            <span className="text-[13px] font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>AT&amp;T SDCI Portal</span>
          </div>
          <div>
            <p className="text-[13px] font-medium tracking-[0.12em] uppercase mb-6" style={{ color: '#009fdb' }}>
              Past · Present · Future
            </p>
            <h1 className="text-[76px] font-bold leading-[1.0] tracking-[-0.04em] mb-8" style={{ color: '#ffffff' }}>
              AT&amp;T NetBond<sup style={{ fontSize: '0.4em', verticalAlign: 'super' }}>®</sup>
              <br />
              Advanced
            </h1>
            <div className="w-16 h-1 mb-8 rounded-full" style={{ background: '#009fdb' }} />
            <p className="text-[22px] font-medium leading-relaxed max-w-2xl" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Measured by the wrong instrument for a decade. The market just arrived where the product always pointed.
            </p>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[15px] font-bold" style={{ color: 'rgba(255,255,255,0.9)' }}>Micah Boswell</p>
              <p className="text-[13px] font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>UX Strategy · AT&amp;T SDCI Portal</p>
            </div>
            <p className="text-[12px] font-medium" style={{ color: 'rgba(255,255,255,0.3)' }}>May 2026</p>
          </div>
        </div>
      </section>

      {/* ── THE LENS ─────────────────────────────────────────────────────── */}
      <section className="eb-section" style={{ background: '#ffffff' }}>
        <div className="max-w-5xl mx-auto px-16 py-20">
          <SectionLabel>The Lens</SectionLabel>
          <h2 className="text-[40px] font-bold tracking-[-0.03em] mb-4" style={{ color: '#1d2329' }}>
            Why I talk about how it works
          </h2>
          <p className="text-[18px] font-medium leading-relaxed mb-12 max-w-2xl" style={{ color: '#686e74' }}>
            Good commercial design is effective packaging — an interface optimized for what the thing is, how it works, and who uses it.
          </p>
          <div className="grid grid-cols-3 gap-6">
            {[
              { num: '01', key: 'What it is', body: 'The substance and purpose of the product.' },
              { num: '02', key: 'How it works', body: 'The system, lifecycle, and logic beneath it.' },
              { num: '03', key: 'Who uses it', body: 'The operators, and the tasks they must perform.' },
            ].map((item) => (
              <div key={item.num} className="rounded-2xl p-8" style={{ background: '#f8fafb', border: '1px solid #dcdfe3' }}>
                <p className="text-[11px] font-medium tracking-[0.1em] uppercase mb-4" style={{ color: '#0057b8' }}>{item.num}</p>
                <h4 className="text-[20px] font-bold tracking-[-0.02em] mb-3" style={{ color: '#1d2329' }}>{item.key}</h4>
                <p className="text-[14px] font-medium leading-relaxed" style={{ color: '#686e74' }}>{item.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 rounded-2xl px-10 py-8" style={{ background: '#e8f0fb', border: '1px solid #c5d8f5' }}>
            <p className="text-[18px] font-bold tracking-[-0.02em]" style={{ color: '#0057b8' }}>
              Design for its own sake is decoration. Fit the packaging to the substance, and the look takes care of itself.
            </p>
          </div>
        </div>
      </section>

      {/* ── OVERVIEW ─────────────────────────────────────────────────────── */}
      <section className="eb-section" style={{ background: '#f8fafb' }}>
        <div className="max-w-5xl mx-auto px-16 py-20">
          <SectionLabel>Overview</SectionLabel>
          <h2 className="text-[40px] font-bold tracking-[-0.03em] mb-12" style={{ color: '#1d2329' }}>
            Three acts, one through-line
          </h2>
          <div className="grid grid-cols-3 gap-6">
            {[
              {
                num: '01', act: 'Past', headline: 'Early, and right.',
                body: 'A 2014 bet on cloud-era networking, kept alive on scraps, anchored by real enterprise customers.',
              },
              {
                num: '02', act: 'Present', headline: 'The market arrived.',
                body: 'Network management shifted the way the product was built for, and the real users finally have proof.',
              },
              {
                num: '03', act: 'Future', headline: 'Product to platform.',
                body: 'A patent-pending visual designer and a multi-view multi-cloud experience leadership wants to reuse.',
              },
            ].map((act) => (
              <div key={act.num} className="rounded-2xl p-8" style={{ background: '#ffffff', border: '1px solid #dcdfe3' }}>
                <div className="flex items-center justify-between mb-6">
                  <span className="text-[11px] font-medium tracking-[0.1em] uppercase" style={{ color: '#0057b8' }}>{act.num}</span>
                  <span className="text-[11px] font-bold tracking-[0.1em] uppercase px-3 py-1 rounded-full" style={{ background: '#f0f4ff', color: '#0057b8' }}>{act.act}</span>
                </div>
                <h4 className="text-[22px] font-bold tracking-[-0.03em] mb-3" style={{ color: '#1d2329' }}>{act.headline}</h4>
                <p className="text-[14px] font-medium leading-relaxed" style={{ color: '#686e74' }}>{act.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ACT 01 BREAK ─────────────────────────────────────────────────── */}
      <section className="eb-section" style={{ background: actBg, minHeight: '60vh', display: 'flex', alignItems: 'center' }}>
        <div className="max-w-5xl mx-auto px-16 py-20 w-full">
          <div className="flex items-end gap-8">
            <span className="text-[160px] font-bold leading-none tracking-[-0.06em]" style={{ color: 'rgba(0, 159, 219, 0.15)' }}>01</span>
            <div className="mb-4">
              <p className="text-[11px] font-medium tracking-[0.12em] uppercase mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>Act One</p>
              <h2 className="text-[52px] font-bold tracking-[-0.04em]" style={{ color: '#ffffff' }}>Past</h2>
              <p className="text-[20px] font-medium mt-2" style={{ color: '#009fdb' }}>Early, and right.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── ORIGIN ───────────────────────────────────────────────────────── */}
      <section className="eb-section" style={{ background: '#ffffff' }}>
        <div className="max-w-5xl mx-auto px-16 py-20">
          <SectionLabel>Origin</SectionLabel>
          <h2 className="text-[40px] font-bold tracking-[-0.03em] mb-4" style={{ color: '#1d2329' }}>
            Built before the category had a name
          </h2>
          <p className="text-[16px] font-medium leading-relaxed mb-12 max-w-2xl" style={{ color: '#686e74' }}>
            In 2014, NetBond made connecting the enterprise to the cloud a first-class problem, years before the market agreed it mattered. Its core was patented SDN out of AT&amp;T Labs: secure, software-defined, multi-cloud connectivity.
          </p>
          <div className="grid grid-cols-3 gap-6">
            <StatCard stat="2014" label="First mover on cloud-era networking" description="Patented SDN out of AT&T Labs, before the market named the category." />
            <StatCard stat="~60%" label="Lower networking cost vs. legacy" description="Enterprise savings vs. traditional hardware-centric architectures." />
            <StatCard stat="~50%" label="Performance improvement" description="Latency and throughput gains over legacy MPLS-era connectivity." />
          </div>
        </div>
      </section>

      {/* ── SURVIVAL ─────────────────────────────────────────────────────── */}
      <section className="eb-section" style={{ background: '#f8fafb' }}>
        <div className="max-w-5xl mx-auto px-16 py-20">
          <SectionLabel>Survival</SectionLabel>
          <h2 className="text-[40px] font-bold tracking-[-0.03em] mb-4" style={{ color: '#1d2329' }}>
            Starved, and still standing
          </h2>
          <p className="text-[16px] font-medium leading-relaxed mb-12 max-w-2xl" style={{ color: '#686e74' }}>
            For a decade only the basics were funded. NetBond ran on a dev-cash model, scraping by year to year, and kept its customers anyway. A starved product that holds enterprise anchors is not surviving by luck. The need is real and unmet elsewhere.
          </p>
          <div className="grid grid-cols-3 gap-6">
            <StatCard stat="600+" label="Enterprise customers retained" description="Through a decade of minimal investment and no product evolution." />
            <StatCard stat="adidas" label="Global anchor customer" description="Among the enterprise names that stayed through the scarcity years." />
            <StatCard stat="10 yrs" label="On minimal funding" description="A dev-cash model that kept the lights on but starved the product." />
          </div>
        </div>
      </section>

      {/* ── THE TURN ─────────────────────────────────────────────────────── */}
      <section className="eb-section" style={{ background: '#ffffff' }}>
        <div className="max-w-5xl mx-auto px-16 py-20">
          <SectionLabel>The Turn</SectionLabel>
          <h2 className="text-[40px] font-bold tracking-[-0.03em] mb-4" style={{ color: '#1d2329' }}>
            Measured by the wrong instrument
          </h2>
          <p className="text-[16px] font-medium leading-relaxed mb-2 max-w-2xl" style={{ color: '#686e74' }}>
            SMB models pushed onto a mission-critical enterprise product. The org judged NetBond by the wrong model for a decade; reality finally forced the correction.
          </p>
          <TwoColContrast
            leftLabel="What the org kept doing"
            rightLabel="What finally changed"
            leftItems={[
              'SMB metrics applied to a mission-critical enterprise product.',
              'Only basics funded — the metrics judged the wrong things.',
              'Over time, the project lost its luster.',
            ]}
            rightItems={[
              'The ten-year-old structure could no longer be approved.',
              'Inaction was no longer an option at the CSO level.',
              'NetBond was finally funded early last year.',
            ]}
          />
        </div>
      </section>

      {/* ── ACT 02 BREAK ─────────────────────────────────────────────────── */}
      <section className="eb-section" style={{ background: actBg, minHeight: '60vh', display: 'flex', alignItems: 'center' }}>
        <div className="max-w-5xl mx-auto px-16 py-20 w-full">
          <div className="flex items-end gap-8">
            <span className="text-[160px] font-bold leading-none tracking-[-0.06em]" style={{ color: 'rgba(0, 159, 219, 0.15)' }}>02</span>
            <div className="mb-4">
              <p className="text-[11px] font-medium tracking-[0.12em] uppercase mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>Act Two</p>
              <h2 className="text-[52px] font-bold tracking-[-0.04em]" style={{ color: '#ffffff' }}>Present</h2>
              <p className="text-[20px] font-medium mt-2" style={{ color: '#009fdb' }}>The market arrived.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── MARKET ───────────────────────────────────────────────────────── */}
      <section className="eb-section" style={{ background: '#ffffff' }}>
        <div className="max-w-5xl mx-auto px-16 py-20">
          <SectionLabel>Market</SectionLabel>
          <h2 className="text-[40px] font-bold tracking-[-0.03em] mb-4" style={{ color: '#1d2329' }}>
            The market moved to where we already were
          </h2>
          <p className="text-[16px] font-medium leading-relaxed mb-12 max-w-2xl" style={{ color: '#686e74' }}>
            Enterprises are retiring MPLS, VPN appliances, and box-centric management for software-defined platforms. Digital-native and media firms now run enormous network demand with tiny teams.
          </p>
          <div className="grid grid-cols-3 gap-6 mb-8">
            <StatCard stat="~26%" label="CAGR through 2034" description="Network-as-a-Service compounding. WAN-as-a-Service leading the growth." accent />
            <StatCard stat="$41B" label="NaaS market size, 2026" description="Current baseline before the decade of compounded growth kicks in." />
            <StatCard stat="$256B" label="NaaS projected, 2034" description="Fortune Business Insights, Mordor Intelligence, MarketsandMarkets." />
          </div>
          <div className="grid grid-cols-2 gap-6">
            {[
              {
                title: 'Hardware retiring',
                body: 'Enterprises are dropping MPLS, VPN appliances, and box-centric management for software-defined platforms. The capex model is unwinding.',
              },
              {
                title: 'Lean teams, huge load',
                body: 'Digital-native and media firms run enormous network demand with tiny engineering teams. They need operator-grade tools, not enterprise bloat.',
              },
            ].map((card) => (
              <div key={card.title} className="rounded-2xl p-8" style={{ background: '#f8fafb', border: '1px solid #dcdfe3' }}>
                <h4 className="text-[18px] font-bold tracking-[-0.02em] mb-3" style={{ color: '#1d2329' }}>{card.title}</h4>
                <p className="text-[14px] font-medium leading-relaxed" style={{ color: '#686e74' }}>{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SEGMENTATION ─────────────────────────────────────────────────── */}
      <section className="eb-section" style={{ background: '#f8fafb' }}>
        <div className="max-w-5xl mx-auto px-16 py-20">
          <SectionLabel>Segmentation</SectionLabel>
          <h2 className="text-[40px] font-bold tracking-[-0.03em] mb-4" style={{ color: '#1d2329' }}>
            Segment by need, not size
          </h2>
          <p className="text-[16px] font-medium leading-relaxed mb-2 max-w-2xl" style={{ color: '#686e74' }}>
            Size tells you how big a customer is, not how critical their network is. NaaS growth is now fastest in SMB (~30% CAGR) and individual customers — the market is already buying by need.
          </p>
          <TwoColContrast
            leftLabel="Old axis · Company size"
            rightLabel="New axis · Network need"
            leftItems={[
              'SMB / mid-market / enterprise, by headcount and revenue.',
              'Tells you how big a customer is, not how critical their network is.',
              'No bucket for a mission-critical lean operator.',
            ]}
            rightItems={[
              'Bandwidth, latency, redundancy, uptime, revenue-at-risk.',
              'A two-person streamer and a Fortune 500 can share a need-tier.',
              'Serves a need-tier on the same lifecycle architecture.',
            ]}
          />
          <div className="mt-6 rounded-2xl px-10 py-6" style={{ background: '#fff3cd', border: '1px solid #fde68a' }}>
            <p className="text-[14px] font-bold" style={{ color: '#92400e' }}>
              Implication: There is no segment today for a mission-critical, lean, high-bandwidth operator — so they fall through to SMB tooling that can't carry the need.
            </p>
          </div>
        </div>
      </section>

      {/* ── NEW CUSTOMER ─────────────────────────────────────────────────── */}
      <section className="eb-section" style={{ background: '#ffffff' }}>
        <div className="max-w-5xl mx-auto px-16 py-20">
          <SectionLabel>The New Customer</SectionLabel>
          <h2 className="text-[40px] font-bold tracking-[-0.03em] mb-4" style={{ color: '#1d2329' }}>
            The customer doesn't fit the box
          </h2>
          <p className="text-[16px] font-medium leading-relaxed mb-12 max-w-2xl" style={{ color: '#686e74' }}>
            The clearest proof the market moved. A streamer needs what a Fortune 500 network needs but buys with SMB speed — and lands in an SMB bucket.
          </p>
          <div className="rounded-2xl p-10 mb-6" style={{ background: '#f8fafb', border: '1px solid #dcdfe3' }}>
            <div className="flex items-start gap-10">
              <div className="flex-1">
                <p className="text-[11px] font-bold tracking-[0.1em] uppercase mb-3" style={{ color: '#686e74' }}>The example: Asmongold</p>
                <h4 className="text-[22px] font-bold tracking-[-0.03em] mb-4" style={{ color: '#1d2329' }}>Enterprise of one</h4>
                <div className="space-y-3">
                  {[
                    ['By headcount', 'SMB — even "individual"'],
                    ['By network reality', 'Mission-critical: multi-CDN redundancy, multi-platform simulcast, latency-sensitive, 24/7'],
                    ['Revenue at risk', 'Seconds of lag are direct lost ad and sponsor revenue'],
                  ].map(([key, val]) => (
                    <div key={key} className="flex gap-3">
                      <span className="text-[13px] font-medium w-32 flex-shrink-0" style={{ color: '#686e74' }}>{key}</span>
                      <span className="text-[13px] font-bold" style={{ color: '#1d2329' }}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-3 pt-2">
                <div className="rounded-xl px-5 py-3 text-center" style={{ background: '#fee2e2', border: '1px solid #fca5a5' }}>
                  <p className="text-[11px] font-bold uppercase tracking-[0.06em]" style={{ color: '#991b1b' }}>How he's sorted</p>
                  <p className="text-[18px] font-bold mt-1" style={{ color: '#991b1b' }}>SMB tooling</p>
                </div>
                <div className="rounded-xl px-5 py-3 text-center" style={{ background: '#dcfce7', border: '1px solid #86efac' }}>
                  <p className="text-[11px] font-bold uppercase tracking-[0.06em]" style={{ color: '#166534' }}>What he needs</p>
                  <p className="text-[18px] font-bold mt-1" style={{ color: '#166534' }}>Enterprise-grade</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── REAL USERS ───────────────────────────────────────────────────── */}
      <section className="eb-section" style={{ background: '#f8fafb' }}>
        <div className="max-w-5xl mx-auto px-16 py-20">
          <SectionLabel>Real Users</SectionLabel>
          <h2 className="text-[40px] font-bold tracking-[-0.03em] mb-4" style={{ color: '#1d2329' }}>
            The real users live in the trenches
          </h2>
          <p className="text-[16px] font-medium leading-relaxed mb-12 max-w-3xl" style={{ color: '#686e74' }}>
            Decisions get measured against CTOs and CIOs. The people who run the product are mission-critical network DevOps operators — and they have never had a seat where the roadmap is set.
          </p>
          <div className="grid grid-cols-3 gap-6 mb-8">
            <StatCard stat="95%" label="of orgs report network visibility gaps" description="Itential, Cisco NetOps, Broadcom enterprise networking data." />
            <StatCard stat="↑↑" label="Devices up, headcount flat" description="More to manage each year, same or fewer engineers." />
            <StatCard stat="Org" label="The hard problems are organizational" description="What UX solves — not missing technology." />
          </div>
          <div className="grid grid-cols-2 gap-6">
            {[
              { name: 'Cindy Cortazzo', title: 'Network Operations Specialist', quote: 'Hand-holding customers through systems that should never have needed it.' },
              { name: 'Joe Novosel', title: 'Senior Network Engineer', quote: 'The heroes — and the evidence of where the product must go.' },
            ].map((person) => (
              <div key={person.name} className="rounded-2xl p-8 flex gap-5 items-start" style={{ background: '#ffffff', border: '1px solid #dcdfe3' }}>
                <div className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: '#e8f0fb' }}>
                  <AttIcon name="person" className="w-6 h-6" style={{ color: '#0057b8' }} />
                </div>
                <div>
                  <p className="text-[16px] font-bold tracking-[-0.02em]" style={{ color: '#1d2329' }}>{person.name}</p>
                  <p className="text-[12px] font-medium mb-3" style={{ color: '#686e74' }}>{person.title}</p>
                  <p className="text-[13px] font-medium leading-relaxed italic" style={{ color: '#454b52' }}>"{person.quote}"</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LIVE PRODUCT ─────────────────────────────────────────────────── */}
      <section className="eb-section" style={{ background: '#ffffff' }}>
        <div className="max-w-5xl mx-auto px-16 py-20">
          <SectionLabel>Live Product</SectionLabel>
          <h2 className="text-[40px] font-bold tracking-[-0.03em] mb-4" style={{ color: '#1d2329' }}>
            This is shipping today
          </h2>
          <p className="text-[16px] font-medium leading-relaxed mb-6 max-w-2xl" style={{ color: '#686e74' }}>
            The real, funded UX — live in the SDCI Portal.
          </p>
          <AppMockup />
          <div className="grid grid-cols-3 gap-6 mt-8">
            {[
              { icon: 'cloud', label: 'Multi-cloud in one place', body: 'AWS and Azure connections managed side by side.' },
              { icon: 'high-meter', label: 'Operator-first', body: 'Latency, loss, jitter, uptime, tunnel status in view.' },
              { icon: 'check-shield', label: 'Built to AT&T standards', body: 'The funded UX, live in the SDCI Portal.' },
            ].map((item) => (
              <div key={item.label} className="flex gap-4 items-start rounded-2xl p-6" style={{ background: '#f8fafb', border: '1px solid #dcdfe3' }}>
                <AttIcon name={item.icon as any} className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#0057b8' }} />
                <div>
                  <p className="text-[14px] font-bold tracking-[-0.01em] mb-1" style={{ color: '#1d2329' }}>{item.label}</p>
                  <p className="text-[13px] font-medium leading-relaxed" style={{ color: '#686e74' }}>{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── METHOD ───────────────────────────────────────────────────────── */}
      <section className="eb-section" style={{ background: '#f8fafb' }}>
        <div className="max-w-5xl mx-auto px-16 py-20">
          <SectionLabel>Method</SectionLabel>
          <h2 className="text-[40px] font-bold tracking-[-0.03em] mb-4" style={{ color: '#1d2329' }}>
            How we build now
          </h2>
          <p className="text-[16px] font-medium leading-relaxed mb-2 max-w-2xl" style={{ color: '#686e74' }}>
            Capital efficiency as advantage. Engineering sits inside every loop.
          </p>
          <ThreeColCards
            cards={[
              {
                icon: 'smart-meter',
                label: 'Truly agile, AI-first',
                title: 'First to use AI prototyping',
                body: 'Test features, concepts, and the full vision with live customers before engineering commits a sprint.',
              },
              {
                icon: 'gear',
                label: 'Engineering in every step',
                title: 'Devs assess before polish',
                body: 'Nothing unshippable is built, nothing gets gold-plated. Architecture stays stable; experience absorbs change.',
              },
              {
                icon: 'apps',
                label: 'UX as the volatility layer',
                title: 'The SaaS model',
                body: 'Architecture holds while the experience layer absorbs change. That\'s why engineering endorses the vision.',
              },
            ]}
          />
        </div>
      </section>

      {/* ── ARCHITECTURE ─────────────────────────────────────────────────── */}
      <section className="eb-section" style={{ background: '#ffffff' }}>
        <div className="max-w-5xl mx-auto px-16 py-20">
          <SectionLabel>Architecture</SectionLabel>
          <h2 className="text-[40px] font-bold tracking-[-0.03em] mb-4" style={{ color: '#1d2329' }}>
            Architecture, not screens
          </h2>
          <p className="text-[16px] font-medium leading-relaxed mb-4 max-w-3xl" style={{ color: '#686e74' }}>
            AT&amp;T's own lifecycle — LBGUPS — is the spine. Navigation, RBAC, UI mode, reporting, and alerts all derive from one decision.
          </p>
          <div className="rounded-2xl px-8 py-6 mb-8" style={{ background: '#e8f0fb', border: '1px solid #c5d8f5' }}>
            <p className="text-[14px] font-medium" style={{ color: '#0057b8' }}>
              <strong>One decision.</strong> AT&amp;T's own customer-journey model becomes the product's top-level navigation, RBAC boundaries, UI mode, and reporting structure — not four features, one spine.
            </p>
          </div>
          <LBGUPSTable />
        </div>
      </section>

      {/* ── THE DRAG ─────────────────────────────────────────────────────── */}
      <section className="eb-section" style={{ background: '#f8fafb' }}>
        <div className="max-w-5xl mx-auto px-16 py-20">
          <SectionLabel>The Drag</SectionLabel>
          <h2 className="text-[40px] font-bold tracking-[-0.03em] mb-4" style={{ color: '#1d2329' }}>
            Built for SMB
          </h2>
          <p className="text-[16px] font-medium leading-relaxed mb-2 max-w-2xl" style={{ color: '#686e74' }}>
            Right design, wrong platform. Routing through Business Center forces SMB-era machinery onto mission-critical enterprise.
          </p>
          <ThreeColCards
            cards={[
              {
                label: 'Problem 01',
                title: 'Flat role systems',
                body: 'Antiquated flat roles that can\'t honor a lifecycle-to-role mapping. Enterprise needs lifecycle-mapped RBAC.',
              },
              {
                label: 'Problem 02',
                title: 'SMB notifications',
                body: 'Tools like Notify Now, built for SMB, not enterprise-grade alerting. Enterprise needs customizable alert rule-building.',
              },
              {
                label: 'Problem 03',
                title: 'Resourcing dependency',
                body: 'Waiting on another group\'s queue to resource changes. Enterprise needs to move now, not run on flat roles.',
              },
            ]}
          />
        </div>
      </section>

      {/* ── THE GAPS ─────────────────────────────────────────────────────── */}
      <section className="eb-section" style={{ background: '#ffffff' }}>
        <div className="max-w-5xl mx-auto px-16 py-20">
          <SectionLabel>The Gaps</SectionLabel>
          <h2 className="text-[40px] font-bold tracking-[-0.03em] mb-4" style={{ color: '#1d2329' }}>
            The gaps we have to close
          </h2>
          <div className="rounded-2xl px-8 py-6 mb-8" style={{ background: '#e8f0fb', border: '1px solid #c5d8f5' }}>
            <p className="text-[16px] font-bold" style={{ color: '#0057b8' }}>
              The product and the market are validated. Each gap is the same pattern: the people closest to the truth have the least authority.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-6">
            {[
              {
                label: 'The real users',
                today: 'We hear CIOs and CTOs, not the operators who run it.',
                close: 'Operators, engineers, and planners driving design.',
              },
              {
                label: 'Research',
                today: 'Brought in tactically, to confirm decisions already made.',
                close: 'A real seat at the table, with authority to decide.',
              },
              {
                label: 'Engineering',
                today: '"Megaport does it, so go do it too."',
                close: 'Empowered to originate ideas, not match parity.',
              },
            ].map((gap) => (
              <div key={gap.label} className="rounded-2xl overflow-hidden" style={{ border: '1px solid #dcdfe3' }}>
                <div className="px-6 py-4" style={{ background: '#f8fafb', borderBottom: '1px solid #dcdfe3' }}>
                  <p className="text-[12px] font-bold uppercase tracking-[0.08em]" style={{ color: '#1d2329' }}>{gap.label}</p>
                </div>
                <div className="px-6 py-4" style={{ borderBottom: '1px solid #f0f1f2' }}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.06em] mb-2" style={{ color: '#c70032' }}>Today</p>
                  <p className="text-[13px] font-medium leading-relaxed" style={{ color: '#454b52' }}>{gap.today}</p>
                </div>
                <div className="px-6 py-4" style={{ background: '#f0fdf4' }}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.06em] mb-2" style={{ color: '#166534' }}>To close</p>
                  <p className="text-[13px] font-medium leading-relaxed" style={{ color: '#166534' }}>{gap.close}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MACRO ────────────────────────────────────────────────────────── */}
      <section className="eb-section" style={{ background: '#f8fafb' }}>
        <div className="max-w-5xl mx-auto px-16 py-20">
          <SectionLabel>The Macro</SectionLabel>
          <h2 className="text-[40px] font-bold tracking-[-0.03em] mb-4" style={{ color: '#1d2329' }}>
            A hardware company, learning software
          </h2>
          <p className="text-[16px] font-medium leading-relaxed mb-2 max-w-3xl" style={{ color: '#686e74' }}>
            AT&amp;T is a regulated carrier with a hardware culture — capex, long cycles, reliability, compliance. SaaS runs on a different model. The product group has no embedded PMs, developers, engineers, or QA.
          </p>
          <ThreeColCards
            cards={[
              {
                label: 'Solution 01',
                title: 'A pod, not a ticket queue',
                body: 'Commit a slice of PM, dev, eng, and QA into one team with one backlog and one owner. Accountability in one place beats handoffs across silos.',
              },
              {
                label: 'Solution 02',
                title: 'Authority + a protected budget',
                body: 'Give the group the mandate to prioritize and the budget to command resources, so it stops queuing behind other departments\' roadmaps.',
              },
              {
                label: 'Solution 03',
                title: 'Design-led, AI-first delivery',
                body: 'With scarce shared engineering, lead with design and AI-prototyped validation to de-risk before consuming the pipeline.',
              },
            ]}
          />
        </div>
      </section>

      {/* ── MEASUREMENT ──────────────────────────────────────────────────── */}
      <section className="eb-section" style={{ background: '#ffffff' }}>
        <div className="max-w-5xl mx-auto px-16 py-20">
          <SectionLabel>Measurement</SectionLabel>
          <h2 className="text-[40px] font-bold tracking-[-0.03em] mb-4" style={{ color: '#1d2329' }}>
            Measuring the right thing
          </h2>
          <p className="text-[16px] font-medium leading-relaxed mb-8 max-w-2xl" style={{ color: '#686e74' }}>
            Mission-critical networks aren't measured like SMB products. Success is durable trust through migrations — not signups or first-touch delight.
          </p>
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="rounded-2xl p-8" style={{ background: '#f8fafb', border: '1px solid #dcdfe3' }}>
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] mb-5" style={{ color: '#0057b8' }}>Business success</p>
              <ul className="space-y-3">
                {[
                  'Migration success — and retention after',
                  'Win-back of lost accounts (e.g., BMW)',
                  'Anchor retention + net revenue retention',
                  'Fewer escalations and hand-holds',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-[7px] w-[5px] h-[5px] rounded-full flex-shrink-0" style={{ background: '#0057b8' }} />
                    <span className="text-[14px] font-medium leading-relaxed" style={{ color: '#454b52' }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl p-8" style={{ background: '#f8fafb', border: '1px solid #dcdfe3' }}>
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] mb-5" style={{ color: '#2d7e24' }}>UX success — not first-touch delight</p>
              <ul className="space-y-3">
                {[
                  'Error mitigation — fewer failed actions',
                  'Speed on real tasks — lower time-on-task',
                  'Self-sufficiency — no hand-holding needed',
                  'Time-to-resolve when something breaks',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-[7px] w-[5px] h-[5px] rounded-full flex-shrink-0" style={{ background: '#2d7e24' }} />
                    <span className="text-[14px] font-medium leading-relaxed" style={{ color: '#454b52' }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="rounded-2xl px-8 py-5" style={{ background: '#fff3cd', border: '1px solid #fde68a' }}>
            <p className="text-[13px] font-medium" style={{ color: '#92400e' }}>
              <strong>Not these (SMB KPIs):</strong> signups, activation velocity, time-to-first-delight, smiley NPS. Right instrument, wrong network.
            </p>
          </div>
        </div>
      </section>

      {/* ── ACT 03 BREAK ─────────────────────────────────────────────────── */}
      <section className="eb-section" style={{ background: actBg, minHeight: '60vh', display: 'flex', alignItems: 'center' }}>
        <div className="max-w-5xl mx-auto px-16 py-20 w-full">
          <div className="flex items-end gap-8">
            <span className="text-[160px] font-bold leading-none tracking-[-0.06em]" style={{ color: 'rgba(0, 159, 219, 0.15)' }}>03</span>
            <div className="mb-4">
              <p className="text-[11px] font-medium tracking-[0.12em] uppercase mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>Act Three</p>
              <h2 className="text-[52px] font-bold tracking-[-0.04em]" style={{ color: '#ffffff' }}>Future</h2>
              <p className="text-[20px] font-medium mt-2" style={{ color: '#009fdb' }}>Product to platform.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── THREE CATEGORY BREAKS ────────────────────────────────────────── */}
      <section className="eb-section" style={{ background: '#ffffff' }}>
        <div className="max-w-5xl mx-auto px-16 py-20">
          <SectionLabel>Differentiation</SectionLabel>
          <h2 className="text-[40px] font-bold tracking-[-0.03em] mb-4" style={{ color: '#1d2329' }}>
            Three category breaks
          </h2>
          <p className="text-[16px] font-medium leading-relaxed mb-2 max-w-2xl" style={{ color: '#686e74' }}>
            Three things nobody else in the telco NMS space has built. Each takes an abstract enterprise construct and makes it spatial and addressable.
          </p>
          <div className="grid grid-cols-3 gap-6 mt-8">
            {[
              {
                num: '01',
                icon: 'network-designer',
                title: 'Visual Network Designer',
                sub: 'Topology, made spatial',
                body: 'A canvas wired to real provisioning. Click to connect cloud to cloud, instead of submitting a ticket and waiting 48 hours.',
                tag: 'Patent Pending',
              },
              {
                num: '02',
                icon: 'lock',
                title: 'Tier-Aware RBAC',
                sub: 'A permission with an address',
                body: 'Platform › Reseller › Tenant › Client, with cascade rules. Scope by which resources, when, and at what tier — past the dropdown role.',
                tag: '',
              },
              {
                num: '03',
                icon: 'person-group',
                title: 'Role-Adaptive Navigation',
                sub: 'Four personas, one app',
                body: 'The IA restructures by who you are; it doesn\'t just show/hide. A Reseller and a Platform Admin see different architectures — neither a compromise.',
                tag: '',
              },
            ].map((card) => (
              <div
                key={card.num}
                className="rounded-2xl p-8 flex flex-col gap-4"
                style={{ background: '#f8fafb', border: '1px solid #dcdfe3' }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium tracking-[0.1em] uppercase" style={{ color: '#686e74' }}>{card.num}</span>
                  {card.tag && (
                    <span className="text-[10px] font-bold tracking-[0.08em] uppercase px-2 py-1 rounded-full" style={{ background: '#e8f0fb', color: '#0057b8' }}>
                      {card.tag}
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="text-[20px] font-bold tracking-[-0.03em] mb-1" style={{ color: '#1d2329' }}>{card.title}</h4>
                  <p className="text-[12px] font-medium mb-4" style={{ color: '#0057b8' }}>{card.sub}</p>
                  <p className="text-[14px] font-medium leading-relaxed" style={{ color: '#686e74' }}>{card.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── THE TOOL ─────────────────────────────────────────────────────── */}
      <section className="eb-section" style={{ background: '#f8fafb' }}>
        <div className="max-w-5xl mx-auto px-16 py-20">
          <SectionLabel>The Tool</SectionLabel>
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-[40px] font-bold tracking-[-0.03em]" style={{ color: '#1d2329' }}>
              A visual designer that fills a real gap
            </h2>
            <span className="mt-2 ml-6 text-[11px] font-bold tracking-[0.1em] uppercase px-4 py-2 rounded-full flex-shrink-0" style={{ background: '#e8f0fb', color: '#0057b8' }}>
              Patent Pending
            </span>
          </div>
          <p className="text-[16px] font-medium leading-relaxed mb-12 max-w-2xl" style={{ color: '#686e74' }}>
            Network planners design their own topologies by drag and drop. Built with engineering. The gap between flat forms and generic diagramming was real and unowned.
          </p>
          <div className="grid grid-cols-3 gap-6">
            {[
              {
                label: 'NetBond Visual Designer',
                highlight: true,
                items: ['Network-aware, drag-and-drop topology design', 'Wired to real provisioning', 'The verified gap nobody owned'],
              },
              {
                label: 'Flat Forms (old way)',
                highlight: false,
                items: ['Rigid', 'No spatial model', 'You can\'t see the network you describe'],
              },
              {
                label: 'Lucidchart / Visio',
                highlight: false,
                items: ['Generic diagramming', 'No network intelligence', 'No link to provisioning'],
              },
            ].map((col) => (
              <div
                key={col.label}
                className="rounded-2xl p-8"
                style={{
                  background: col.highlight ? '#001a3d' : '#ffffff',
                  border: col.highlight ? 'none' : '1px solid #dcdfe3',
                }}
              >
                <p
                  className="text-[12px] font-bold uppercase tracking-[0.08em] mb-5"
                  style={{ color: col.highlight ? '#009fdb' : '#686e74' }}
                >
                  {col.label}
                </p>
                <ul className="space-y-3">
                  {col.items.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span
                        className="mt-[6px] w-[5px] h-[5px] rounded-full flex-shrink-0"
                        style={{ background: col.highlight ? '#009fdb' : '#bdc1c8' }}
                      />
                      <span
                        className="text-[14px] font-medium leading-relaxed"
                        style={{ color: col.highlight ? 'rgba(255,255,255,0.8)' : '#686e74' }}
                      >
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── THE BET ──────────────────────────────────────────────────────── */}
      <section className="eb-section" style={{ background: '#ffffff' }}>
        <div className="max-w-5xl mx-auto px-16 py-20">
          <SectionLabel>The Bet</SectionLabel>
          <h2 className="text-[40px] font-bold tracking-[-0.03em] mb-12" style={{ color: '#1d2329' }}>
            Already bigger than NetBond
          </h2>
          <div className="grid grid-cols-2 gap-8">
            <div className="rounded-2xl p-10" style={{ background: '#f8fafb', border: '1px solid #dcdfe3' }}>
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] mb-4" style={{ color: '#0057b8' }}>From feature to platform</p>
              <p className="text-[18px] font-medium leading-relaxed" style={{ color: '#1d2329' }}>
                Jeremy Legg and other tech leaders want to reuse the visual designer for other visual modeling, including API design — a horizontal capability born inside NetBond.
              </p>
            </div>
            <div className="rounded-2xl p-10" style={{ background: '#001a3d' }}>
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] mb-4" style={{ color: '#009fdb' }}>Multi-view, multi-cloud UX</p>
              <p className="text-[18px] font-medium leading-relaxed" style={{ color: 'rgba(255,255,255,0.8)' }}>
                One customizable view of the same data, shared across the people who own each phase of the lifecycle. Real-time multi-view monitoring across the SDCI Portal.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CLOSE ────────────────────────────────────────────────────────── */}
      <section className="eb-section" style={{ background: closeBg, minHeight: '80vh', display: 'flex', alignItems: 'center' }}>
        <div className="max-w-5xl mx-auto px-16 py-20 w-full">
          <div className="flex items-center gap-2 mb-16">
            <AttIcon name="hub" className="w-5 h-5" style={{ color: '#009fdb' }} />
            <span className="text-[12px] font-medium" style={{ color: 'rgba(255,255,255,0.3)' }}>AT&amp;T SDCI Portal</span>
          </div>
          <p className="text-[11px] font-medium tracking-[0.12em] uppercase mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>The vision is working</p>
          <h2 className="text-[52px] font-bold tracking-[-0.04em] leading-[1.1] mb-10 max-w-3xl" style={{ color: '#ffffff' }}>
            We were early.
            <br />
            <span style={{ color: '#009fdb' }}>The market is here.</span>
            <br />
            The people who kept it alive saw it first.
          </h2>
          <div className="w-16 h-1 mb-10 rounded-full" style={{ background: '#0057b8' }} />
          <p className="text-[18px] font-medium leading-relaxed max-w-2xl mb-16" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Ask the engineering team. A logical architecture, a patent-pending visual designer that fills a real gap, and a multi-view hybrid multi-cloud experience are already in motion.
          </p>
          <div className="rounded-2xl px-10 py-8" style={{ background: 'rgba(0, 159, 219, 0.1)', border: '1px solid rgba(0, 159, 219, 0.2)' }}>
            <p className="text-[16px] font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>
              <strong style={{ color: '#009fdb' }}>Unlocks the next decade:</strong> real authority for operators, research, and engineering.
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}

// ── Talk Notes content ─────────────────────────────────────────────────────

function TalkNotesContent() {
  const sections = [
    {
      time: '~1 min',
      num: '1',
      title: 'Title',
      onSlide: 'AT&T NetBond — Past · Present · Future. "Measured by the wrong instrument for a decade. The market just arrived where the product always pointed."',
      say: 'One idea to leave with: NetBond was an early, correct read on where enterprise networking went. Land the thesis, then move.',
    },
    {
      time: '~1 min',
      num: '1b',
      title: 'The Lens',
      onSlide: 'Good commercial design is effective packaging — an interface optimized for what the thing is, how it works, and who uses it. What / How / Who. Design for its own sake is decoration.',
      say: "This answers the question before it's asked — why is the UX person talking about how it works, not what it looks like. Because that is the design work. What/how/who is also the spine of this whole talk.",
    },
    {
      time: '~1 min',
      num: '2',
      title: 'The arc',
      onSlide: 'Past — early, and right. Present — the market arrived. Future — product to platform.',
      say: 'Three short acts, then discussion. Past is origin and survival, Present is the market catching up, Future is the platform bet.',
    },
    {
      time: '',
      num: '',
      title: 'PAST',
      onSlide: '',
      say: '',
      isActHeader: true,
    },
    {
      time: '~1.5 min',
      num: '3',
      title: 'Built before the category had a name',
      onSlide: '2014. Patented SDN out of AT&T Labs. ~60% lower networking cost. ~50% performance gain. Multi-cloud connectivity before the market named it.',
      say: 'Establish credibility and the "we were early" frame. Research-grade engineering aimed at a real enterprise need. This sets up why the starvation that follows is the surprising part.',
    },
    {
      time: '~1.5 min',
      num: '4',
      title: 'Starved, and still standing',
      onSlide: 'A decade on a dev-cash model. Only the basics funded. 600+ enterprise customers retained, adidas global among the anchors.',
      say: "Reframe scarcity as signal, not grievance. A starved product that holds enterprise anchors for ten years is telling you the need is real and unmet elsewhere. For a market audience, that's durable demand.",
    },
    {
      time: '~1.5 min',
      num: '5',
      title: 'Measured by the wrong instrument',
      onSlide: 'SMB models pushed onto a mission-critical enterprise product. Wrong metrics for ten years. Funded early last year only when the old structure could no longer be approved.',
      say: 'The hinge of the past, factual not bitter. The org judged NetBond by the wrong model for years; reality finally forced the correction. Do not litigate internal politics in the room.',
    },
    {
      time: '',
      num: '',
      title: 'PRESENT',
      onSlide: '',
      say: '',
      isActHeader: true,
    },
    {
      time: '~1.5 min',
      num: '6',
      title: 'The market moved to where we already were',
      onSlide: 'NaaS ~$41B (2026) → ~$256B (2034), ~26% CAGR, WAN-as-a-Service leading. Enterprises retiring MPLS, VPN appliances, box-centric management for software-defined platforms.',
      say: "Anchor the present in outside data so it isn't internal conviction. The radical market change you've described is now the documented mainstream direction.",
    },
    {
      time: '~1.5 min',
      num: '6a',
      title: 'Segment by need, not size',
      onSlide: 'Stop segmenting by company size. Segment by network need and criticality. Old axis: size. New axis: bandwidth, latency, redundancy, uptime, revenue-at-risk.',
      say: 'This is the reframe the whole talk turns on. Size tells you the wrong thing; need tells you the truth. Once you segment by criticality, the product, the RBAC, and the success metrics all line up.',
    },
    {
      time: '~1.5 min',
      num: '6b',
      title: 'The customer doesn\'t fit the box',
      onSlide: 'Asmongold: enterprise of one. SMB by headcount. Mission-critical by network reality. Multi-CDN, multi-platform simulcast, latency-sensitive, 24/7.',
      say: "This is the clearest single proof the market moved. A streamer needs what a Fortune 500 network needs, but buys with SMB speed and lands in an SMB bucket. Our segmentation has no home for him.",
    },
    {
      time: '~2 min',
      num: '7',
      title: 'The real users live in the trenches',
      onSlide: 'The buyers are CTOs and CIOs. The users are mission-critical network DevOps operators. Device counts climb while headcount stays flat. 95% visibility gaps.',
      say: 'Slow down here. Name Cindy and Joe out loud; make the operators visible to leadership. The hard problems are organizational, which is exactly what UX solves.',
    },
    {
      time: '~1.5 min',
      num: '8',
      title: 'This is shipping today',
      onSlide: 'SDCI Portal — multi-cloud connections (AWS, Azure) managed and monitored side by side. Operator-grade metrics: latency, loss, jitter, uptime, tunnel status.',
      say: "Show, don't tell. This is the real, funded UX, live. Let them look at it for a beat.",
    },
    {
      time: '~2 min',
      num: '9',
      title: 'How we build now',
      onSlide: 'True agile loop — AI-first prototyping → live customer validation → engineering review → flywheel UI polish. First to use AI prototyping with customers. Engineering in every step.',
      say: 'Capital efficiency turned into advantage. Engineering sits inside every loop, so the architecture stays stable while the experience absorbs change.',
    },
    {
      time: '~2 min',
      num: '10',
      title: 'Architecture, not screens',
      onSlide: 'One disciplined decision — AT&T\'s own customer lifecycle, LBGUPS, is the spine. LBGUPS = Learn · Buy · Get · Use · Pay · Support. RBAC falls out of the IA. UI mode matched to the stage.',
      say: "The systems-thinking credential. Not navigation plus RBAC plus reporting plus alerts as four features — one decision, AT&T's own lifecycle, that cascades into all of them.",
    },
    {
      time: '~1.5 min',
      num: '11',
      title: 'The drag: built for SMB',
      onSlide: 'Routing through Business Center forces SMB-era machinery onto mission-critical enterprise — flat roles, Notify Now, organizational resourcing dependency.',
      say: "Right design, wrong platform. The enterprise architecture exists; Business Center pulls it back to an SMB model it was never meant to carry.",
    },
    {
      time: '~2.5 min',
      num: '12',
      title: 'The gaps we have to close',
      onSlide: 'The product and the market are validated. Each gap is the same pattern: the people closest to the truth have the least authority.',
      say: "The honest pivot. The constraint isn't the product or the market; it's decision authority. The line to make her remember: the people closest to the truth have the least authority.",
    },
    {
      time: '~2 min',
      num: '12a',
      title: 'The macro: a hardware company learning software',
      onSlide: "AT&T is a regulated carrier with a hardware culture. The product group has no embedded PMs, developers, engineers, or QA. Three solutions: a pod, authority + budget, design-led AI-first delivery.",
      say: "You can't run SaaS through a hardware org chart. The product group is structured like a feature request, not a team.",
    },
    {
      time: '~2 min',
      num: '12b',
      title: 'Measuring the right thing',
      onSlide: "Mission-critical networks aren't measured like SMB products. Success is durable trust through migrations — not signups, MRR velocity, or first-touch delight.",
      say: "Closes the loop on 'the wrong instrument.' For a mission-critical network the scoreboard is durable trust — did the migration land, did the customer stay, did the operator move faster with fewer errors.",
    },
    {
      time: '',
      num: '',
      title: 'FUTURE',
      onSlide: '',
      say: '',
      isActHeader: true,
    },
    {
      time: '~2.5 min',
      num: '13a',
      title: 'Three category breaks',
      onSlide: "Three things nobody else in the telco NMS space has built. Visual Network Designer: topology made spatial. Tier-Aware RBAC: a permission with an address. Role-Adaptive Navigation: four personas, one app.",
      say: "This is the defensibility answer — category break, not generic. All three are the same move: take an abstract enterprise construct and make it spatial and addressable.",
    },
    {
      time: '~2 min',
      num: '13',
      title: 'A visual designer that fills a real gap',
      onSlide: 'Network planners design their own topologies by drag and drop. Network-aware, built with engineering, patent pending. Sits in the verified gap between flat forms and Lucidchart/Visio.',
      say: 'The strongest belief asset. The gap was real and unowned, and the patent protects it. Let it breathe.',
    },
    {
      time: '~2 min',
      num: '14',
      title: 'Already bigger than NetBond',
      onSlide: "Jeremy Legg and other tech leaders want to reuse the visual designer for other visual modeling, including API design. Multi-view, hybrid multi-cloud lifecycle UX.",
      say: 'Plant the platform belief. Frame the reuse as evidence of platform potential, not a turf claim.',
    },
    {
      time: '~1.5 min',
      num: '15',
      title: 'The vision is working',
      onSlide: '"We were early. The market is here. The people who kept it alive saw it first." Unlocks the next decade: real authority for operators, research, and engineering.',
      say: 'Close on belief plus one structural ask, not a budget ask. Deliver the three-part line slowly, then the unlock line, then stop and open the floor.',
    },
  ];

  return (
    <div className="max-w-3xl mx-auto px-8 py-16">
      <div className="mb-12">
        <p className="text-[11px] font-medium tracking-[0.12em] uppercase mb-3" style={{ color: '#0057b8' }}>AT&amp;T SDCI Portal</p>
        <h1 className="text-[40px] font-bold tracking-[-0.04em] mb-3" style={{ color: '#1d2329' }}>Talk Points</h1>
        <p className="text-[16px] font-medium" style={{ color: '#686e74' }}>
          25 minutes total · ~15 min talk · ~10 min discussion
        </p>
        <p className="text-[14px] font-medium mt-2" style={{ color: '#686e74' }}>
          Audience: customer/market lens, senior. Goal: build belief and visibility, not a budget ask.
        </p>
        <div className="mt-6 rounded-xl px-6 py-4" style={{ background: '#e8f0fb', border: '1px solid #c5d8f5' }}>
          <p className="text-[14px] font-bold" style={{ color: '#0057b8' }}>
            Core thesis — land it three times: NetBond spent a decade measured by the wrong instrument. The market arrived exactly where the product always pointed, and the people who kept it alive saw it first.
          </p>
        </div>
      </div>

      <div className="space-y-0">
        {sections.map((section, i) => {
          if ((section as any).isActHeader) {
            return (
              <div
                key={i}
                className="rounded-xl px-6 py-4 my-8"
                style={{ background: '#001a3d' }}
              >
                <p className="text-[13px] font-bold tracking-[0.12em] uppercase" style={{ color: '#009fdb' }}>
                  {section.title}
                </p>
              </div>
            );
          }

          return (
            <div
              key={i}
              className="py-8"
              style={{ borderBottom: '1px solid #f0f1f2' }}
            >
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 w-20 text-right pt-1">
                  {section.num && (
                    <span className="text-[13px] font-bold" style={{ color: '#0057b8' }}>{section.num}</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[18px] font-bold tracking-[-0.02em]" style={{ color: '#1d2329' }}>{section.title}</h3>
                    {section.time && (
                      <span className="text-[11px] font-medium px-3 py-1 rounded-full" style={{ background: '#f8fafb', color: '#686e74', border: '1px solid #dcdfe3' }}>
                        {section.time}
                      </span>
                    )}
                  </div>
                  {section.onSlide && (
                    <div className="mb-3 rounded-lg px-5 py-3" style={{ background: '#f8fafb', border: '1px solid #dcdfe3' }}>
                      <p className="text-[11px] font-bold uppercase tracking-[0.06em] mb-2" style={{ color: '#686e74' }}>On slide</p>
                      <p className="text-[14px] font-medium leading-relaxed" style={{ color: '#454b52' }}>{section.onSlide}</p>
                    </div>
                  )}
                  {section.say && (
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.06em] mb-2" style={{ color: '#0057b8' }}>Say</p>
                      <p className="text-[14px] font-medium leading-relaxed" style={{ color: '#686e74' }}>{section.say}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export function ExecutiveBriefPage() {
  const [activeTab, setActiveTab] = useState<Tab>('presentation');

  const handlePrint = () => window.print();

  return (
    <div style={{ fontFamily: "'ATT Aleck Sans', system-ui, sans-serif" }}>
      <style>{`
        @media print {
          .eb-no-print { display: none !important; }
          .eb-section { page-break-after: always; }
          .eb-section:last-child { page-break-after: avoid; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      {/* ── Minimal header ──────────────────────────────────────────────── */}
      <header
        className="eb-no-print sticky top-0 z-50 flex items-center justify-between px-8 h-14"
        style={{ background: '#ffffff', borderBottom: '1px solid #dcdfe3' }}
      >
        <div className="flex items-center gap-3">
          <AttIcon name="hub" className="w-5 h-5" style={{ color: '#009fdb' }} />
          <span className="text-[13px] font-bold" style={{ color: '#1d2329' }}>
            AT&amp;T AI-grade network
          </span>
          <span className="text-[12px] font-medium px-2 py-0.5 rounded" style={{ background: '#f0f4ff', color: '#0057b8' }}>
            Executive Brief
          </span>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-full" style={{ background: '#f8fafb', border: '1px solid #dcdfe3' }}>
          {(['presentation', 'notes'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-5 py-1.5 rounded-full text-[13px] font-medium transition-all"
              style={{
                background: activeTab === tab ? '#0057b8' : 'transparent',
                color: activeTab === tab ? '#ffffff' : '#686e74',
              }}
            >
              {tab === 'presentation' ? 'Presentation' : 'Talk Notes'}
            </button>
          ))}
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors"
          style={{ background: '#f8fafb', color: '#454b52', border: '1px solid #dcdfe3' }}
        >
          <Printer size={14} />
          Export PDF
        </button>
      </header>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      {activeTab === 'presentation' ? (
        <PresentationContent />
      ) : (
        <div style={{ background: '#ffffff', minHeight: '100vh' }}>
          <TalkNotesContent />
        </div>
      )}
    </div>
  );
}
