import { Printer } from 'lucide-react';
import { AttIcon } from '../icons/AttIcon';
import { useStore } from '../../store/useStore';

// ─────────────────────────────────────────────────────────────────────────────
// MONTHLY BRIEF — one-page KPI / OKR / deliverables scorecard.
//
// Edit BRIEF_DATA below each month. Everything on the page renders from it,
// except the two "live" product counts (active hubs / connections), which read
// straight from the store so they always match the app.
//
// Product KPIs are DESIGN TARGETS, not live telemetry — the AI-grade network is a
// stakeholder mock. They are labeled as such on the page. Do not present them
// as measured numbers.
// ─────────────────────────────────────────────────────────────────────────────

type Status = 'Shipped' | 'On track' | 'At risk';

interface Objective {
  objective: string;
  status: Status;
  keyResults: string[];
  deliverables: string[];
}

interface Kpi {
  stat: string;
  label: string;
  note: string;
  live?: 'hubs' | 'connections';
}

interface Headline {
  stat: string;
  label: string;
  description?: string;
}

const BRIEF_DATA: {
  month: string;
  author: string;
  role: string;
  summary: string;
  headline: Headline[];
  objectives: Objective[];
  kpis: Kpi[];
} = {
  month: 'July 2026',
  author: 'Micah Boswell',
  role: 'Experience Lead · DNI · AT&T',
  summary:
    'Turned first-connection setup into a guided, hub-first flow and unified the platform’s information architecture end to end.',

  // At-a-glance row — the numbers a stakeholder reads in three seconds.
  headline: [
    { stat: '5', label: 'Deliverables shipped', description: 'Wizard, tables, cards, topology' },
    { stat: '3', label: 'Objectives on track', description: 'All key results advancing' },
    { stat: 'E2E', label: 'Guided setup', description: 'Hub → Connection → last-mile → VNF' },
    { stat: '100%', label: 'View-mode parity', description: 'Cards · list · topology · detail' },
  ],

  // The spine: objectives (O) with key results (KR) and the real work under each.
  objectives: [
    {
      objective: 'Make cloud-connection setup self-serve and error-proof',
      status: 'On track',
      keyResults: [
        'Collapse first-connection setup into one guided, hub-first flow',
        'Show the topology building live so users see what they commit to',
      ],
      deliverables: [
        'Hub-first guided setup — Hub → Connection → AWS Max last-mile → VNF, end to end',
        '“You’re building” step topology preview — ghost-to-solid as each step completes',
        'Opt-in, compact VNF placement step — choose where it sits, reflected in the topology',
      ],
    },
    {
      objective: 'One coherent information architecture across the platform',
      status: 'Shipped',
      keyResults: [
        'Complete the Gateway → Hub rename with no legacy terms surfaced',
        'Full tab parity across Connection and Hub detail pages',
      ],
      deliverables: [
        'Connection Hub IA — per-type grouped tables site-wide, with insight drawers',
        'Detail-page parity — Policies, Links, VNFs, Billing match across Connection & Hub',
        'Gateway → Hub rename complete across cards, tables, detail and topology',
      ],
    },
    {
      objective: 'Make the data legible — tables and cards that fit and read',
      status: 'On track',
      keyResults: [
        'Tables fit with no horizontal scroll; status ≠ pill-for-everything',
        'Consistent view-mode symmetry across cards, list and topology',
      ],
      deliverables: [
        'De-containerized tables — fit, no scroll, de-pilled, clickable stepper',
        'Framed bordered connection cards on list view — approved hubs-list style',
        'Branded AT&T connection-type glyphs and flat-line overflow tabs',
      ],
    },
  ],

  // Product KPIs — DESIGN TARGETS the work is built to move (illustrative),
  // plus two live counts pulled from the store.
  kpis: [
    { stat: '−40%', label: 'Time to first connection', note: 'Design target' },
    { stat: '−55%', label: 'Clicks to provision', note: 'Design target' },
    { stat: '85%', label: 'Self-serve rate', note: 'Design target' },
    { stat: '0', label: 'Active hubs', note: 'Live from store', live: 'hubs' },
    { stat: '0', label: 'Active connections', note: 'Live from store', live: 'connections' },
  ],
};

// ── Brand palette ────────────────────────────────────────────────────────────
const NAVY = '#001a3d';
const BLUE = '#0057b8';
const CYAN = '#009fdb';
const INK = '#1d2329';
const MUTE = '#686e74';
const LINE = '#dcdfe3';
const WASH = '#f8fafb';

const STATUS_STYLE: Record<Status, { bg: string; fg: string }> = {
  Shipped: { bg: '#dcfce7', fg: '#166534' },
  'On track': { bg: '#e8f0fb', fg: '#0057b8' },
  'At risk': { bg: '#fff3cd', fg: '#92400e' },
};

// ── Small primitives ─────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-medium tracking-[0.12em] uppercase mb-3" style={{ color: BLUE }}>
      {children}
    </p>
  );
}

function HeadlineCard({ h, dark }: { h: Headline; dark?: boolean }) {
  return (
    <div
      className="rounded-xl px-4 py-3 flex flex-col gap-0.5"
      style={{
        background: dark ? 'rgba(255,255,255,0.06)' : WASH,
        border: dark ? '1px solid rgba(255,255,255,0.12)' : `1px solid ${LINE}`,
      }}
    >
      <div
        className="text-[24px] font-bold leading-none tracking-[-0.03em]"
        style={{ color: dark ? '#ffffff' : BLUE }}
      >
        {h.stat}
      </div>
      <div
        className="text-[12px] font-bold tracking-[-0.02em] mt-0.5"
        style={{ color: dark ? 'rgba(255,255,255,0.92)' : INK }}
      >
        {h.label}
      </div>
      {h.description && (
        <div className="text-[11px] font-medium leading-snug" style={{ color: dark ? 'rgba(255,255,255,0.5)' : MUTE }}>
          {h.description}
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: Status }) {
  const s = STATUS_STYLE[status];
  return (
    <span
      className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap"
      style={{ background: s.bg, color: s.fg }}
    >
      {status}
    </span>
  );
}

function ObjectiveCard({ obj, index }: { obj: Objective; index: number }) {
  const num = String(index + 1).padStart(2, '0');
  return (
    <div className="rounded-xl p-4 flex flex-col h-full" style={{ background: '#ffffff', border: `1px solid ${LINE}` }}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-[10px] font-medium tracking-[0.1em] uppercase mb-1" style={{ color: BLUE }}>
            Objective {num}
          </p>
          <h3 className="text-[14px] font-bold leading-snug tracking-[-0.01em]" style={{ color: INK }}>
            {obj.objective}
          </h3>
        </div>
        <StatusPill status={obj.status} />
      </div>

      <p className="text-[9px] font-bold tracking-[0.1em] uppercase mb-1.5" style={{ color: MUTE }}>
        Key Results
      </p>
      <ul className="flex flex-col gap-1">
        {obj.keyResults.map((kr) => (
          <li key={kr} className="flex gap-1.5 text-[11.5px] font-medium leading-snug" style={{ color: '#454b52' }}>
            <span style={{ color: CYAN }}>▸</span>
            <span>{kr}</span>
          </li>
        ))}
      </ul>

      {/* Deliverables pinned to the card bottom so the section aligns across columns */}
      <div className="mt-auto pt-4">
        <p className="text-[9px] font-bold tracking-[0.1em] uppercase mb-1.5" style={{ color: MUTE }}>
          Deliverables
        </p>
        <ul className="flex flex-col gap-1.5">
          {obj.deliverables.map((d) => (
            <li
              key={d}
              className="rounded-md px-2.5 py-1.5 text-[11px] font-medium leading-snug"
              style={{ background: WASH, border: `1px solid ${LINE}`, color: INK }}
            >
              {d}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function MonthlyBriefPage() {
  const connections = useStore((s) => s.connections);
  const hubs = useStore((s) => s.hubs);

  const liveValue = (key?: 'hubs' | 'connections') => {
    if (key === 'hubs') return String(hubs.length);
    if (key === 'connections') return String(connections.length);
    return null;
  };

  const handlePrint = () => window.print();

  return (
    <div style={{ fontFamily: "'ATT Aleck Sans', system-ui, sans-serif", background: WASH, minHeight: '100vh' }}>
      <style>{`
        @media print {
          .mb-no-print { display: none !important; }
          @page { size: A4 landscape; margin: 12mm; }
          .mb-sheet { box-shadow: none !important; margin: 0 !important; max-width: none !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      {/* ── Toolbar (screen only) ─────────────────────────────────────────── */}
      <header
        className="mb-no-print sticky top-0 z-50 flex items-center justify-between px-8 h-14"
        style={{ background: '#ffffff', borderBottom: `1px solid ${LINE}` }}
      >
        <div className="flex items-center gap-3">
          <AttIcon name="hub" className="w-5 h-5" style={{ color: CYAN }} />
          <span className="text-[13px] font-bold" style={{ color: INK }}>
            AT&amp;T AI-grade network
          </span>
          <span className="text-[12px] font-medium px-2 py-0.5 rounded" style={{ background: '#f0f4ff', color: BLUE }}>
            Monthly Brief
          </span>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors"
          style={{ background: WASH, color: '#454b52', border: `1px solid ${LINE}` }}
        >
          <Printer size={14} />
          Export PDF
        </button>
      </header>

      {/* ── The one-page sheet ────────────────────────────────────────────── */}
      <div
        className="mb-sheet mx-auto my-8 rounded-3xl overflow-hidden"
        style={{ maxWidth: '1120px', background: '#ffffff', boxShadow: '0 20px 60px rgba(0,0,0,0.08)' }}
      >
        {/* Header band */}
        <div style={{ background: NAVY }} className="px-8 pt-7 pb-6">
          <div className="flex items-center gap-2 mb-5">
            <AttIcon name="hub" className="w-4 h-4" style={{ color: CYAN }} />
            <span className="text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>
              AT&amp;T AI-grade network · Experience Team
            </span>
          </div>

          <div className="flex items-end justify-between gap-6 mb-6">
            <div>
              <p className="text-[11px] font-medium tracking-[0.14em] uppercase mb-1.5" style={{ color: CYAN }}>
                Monthly Brief
              </p>
              <h1 className="text-[30px] font-bold leading-[1.0] tracking-[-0.03em]" style={{ color: '#ffffff' }}>
                {BRIEF_DATA.month}
              </h1>
              <p className="text-[13px] font-medium leading-snug max-w-xl mt-2.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                {BRIEF_DATA.summary}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[13px] font-bold" style={{ color: 'rgba(255,255,255,0.92)' }}>
                {BRIEF_DATA.author}
              </p>
              <p className="text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>
                {BRIEF_DATA.role}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {BRIEF_DATA.headline.map((h) => (
              <HeadlineCard key={h.label} h={h} dark />
            ))}
          </div>
        </div>

        {/* OKRs + deliverables */}
        <div className="px-8 pt-6 pb-5">
          <div className="flex items-baseline justify-between gap-4 mb-4">
            <div>
              <SectionLabel>Objectives &amp; Key Results</SectionLabel>
              <h2 className="text-[17px] font-bold tracking-[-0.02em]" style={{ color: INK }}>
                What we set out to do — and what shipped
              </h2>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 items-stretch">
            {BRIEF_DATA.objectives.map((obj, i) => (
              <ObjectiveCard key={obj.objective} obj={obj} index={i} />
            ))}
          </div>
        </div>

        {/* Product KPI strip */}
        <div className="px-8 pt-5 pb-7" style={{ background: WASH, borderTop: `1px solid ${LINE}` }}>
          <div className="flex items-baseline justify-between gap-4 mb-3.5 flex-wrap">
            <SectionLabel>Product KPIs</SectionLabel>
            <span className="text-[10.5px] font-medium" style={{ color: MUTE }}>
              Design targets the work is built to move · live counts read from the platform
            </span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {BRIEF_DATA.kpis.map((k) => {
              const live = liveValue(k.live);
              const isLive = live !== null;
              return (
                <div
                  key={k.label}
                  className="rounded-xl px-4 py-3.5 flex flex-col gap-0.5"
                  style={{ background: '#ffffff', border: `1px solid ${LINE}` }}
                >
                  <div
                    className="text-[24px] font-bold leading-none tracking-[-0.03em]"
                    style={{ color: isLive ? INK : BLUE }}
                  >
                    {isLive ? live : k.stat}
                  </div>
                  <div className="text-[11.5px] font-bold tracking-[-0.02em] mt-1" style={{ color: INK }}>
                    {k.label}
                  </div>
                  <div
                    className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.08em] mt-0.5"
                    style={{ color: isLive ? '#166534' : MUTE }}
                  >
                    {isLive && (
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#22c55e' }} />
                    )}
                    {k.note}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
