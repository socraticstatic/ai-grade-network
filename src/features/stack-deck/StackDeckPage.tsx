import { useState } from 'react';
import { Printer, ChevronDown } from 'lucide-react';
import { AttIcon } from '../../components/icons/AttIcon';
import { PersonasView } from './PersonasView';

/**
 * /stack — the layer-first IA concept deck.
 *
 * A standalone, print-ready explainer in the Intent-deck language (navy cover,
 * white sections, quiet #f8fafb cards, SectionLabel kickers, BigStats,
 * when/then rule cards). It presents the model behind the nav: lifecycle
 * columns × network-layer rows. Enter through the layer, act through the
 * lifecycle.
 *
 * Routed outside DashboardLayout, like /onboarding. It is a document, not app
 * chrome, so it uses the deck's literal palette (#001a3d, #f8fafb, #dcdfe3,
 * #0057b8, #009fdb) rather than fw-* tokens — sanctioned by the plan's global
 * constraints.
 */

// ── Shared bits (mirrors the Intent deck's system) ──────────────────────────

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

function BigStat({ stat, label, description }: { stat: string; label: string; description?: string }) {
  return (
    <div className="rounded-2xl p-8 flex flex-col gap-2" style={{ background: '#f8fafb', border: '1px solid #dcdfe3' }}>
      <div className="text-[56px] font-bold leading-none tracking-[-0.03em]" style={{ color: '#0057b8' }}>{stat}</div>
      <div className="text-[14px] font-bold tracking-[-0.02em] mt-1" style={{ color: '#1d2329' }}>{label}</div>
      {description && <div className="text-[13px] font-medium leading-relaxed" style={{ color: '#686e74' }}>{description}</div>}
    </div>
  );
}

/** Small uppercase tag marking a stratum that exists in the concept, not the nav. */
function VisionTag() {
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-[0.08em]"
      style={{ border: '1px dashed #bdc1c8', color: '#9aa0a6' }}
    >
      Vision
    </span>
  );
}

function LiveTag() {
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-[0.08em]"
      style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534' }}
    >
      Live
    </span>
  );
}

// ── The table: lifecycle columns × layer rows ────────────────────────────────

const VERBS = [
  { label: 'Connect', gloss: 'attach it' },
  { label: 'Govern', gloss: 'put rules on it' },
  { label: 'Observe', gloss: 'watch it' },
  { label: 'Cost', gloss: 'meter it' },
] as const;

interface MatrixRow {
  key: string;
  layer: string;
  scope: string;
  live: boolean;
  /** Hash-route hrefs when live, aligned to VERBS. */
  hrefs?: string[];
  cells: [string, string, string, string];
}

const MATRIX_ROWS: MatrixRow[] = [
  {
    key: 'ai',
    layer: 'AI Fabric',
    scope: 'The token layer · models, agents, budgets',
    live: true,
    hrefs: ['#/ai/connect', '#/ai/govern', '#/ai/observe', '#/ai/cost'],
    cells: [
      'Attach model endpoints & neoclouds',
      'Token policy & guardrails',
      'Prompt traces & agent decisions',
      'Token budgets & spend',
    ],
  },
  {
    key: 'cloud',
    layer: 'Cloud',
    scope: 'On-ramps, managed VPC, neocloud attach',
    live: false,
    cells: [
      'On-ramps, managed VPC, Equinix attach',
      'Segmentation & route policy',
      'VPC & path health',
      'Egress & arbitrage',
    ],
  },
  {
    key: 'naas',
    layer: 'Network services (NaaS)',
    scope: 'The mid-mile fabric · paths and the policy on them',
    live: true,
    hrefs: ['#/naas/connect', '#/naas/govern', '#/naas/observe', '#/naas/cost'],
    cells: [
      'Direct cloud-connect, NetBond tenanted',
      'Policy on paths',
      'Path health & SLAs',
      'Transport cost',
    ],
  },
  {
    key: 'transport',
    layer: 'Transport & Access',
    scope: 'The physical media beneath everything',
    live: false,
    cells: [
      'Lit fiber, dark fiber, PON, 5G & private cellular, FirstNet, satellite',
      'QoS & CoS',
      'Circuit & RF health',
      'Circuit cost',
    ],
  },
];

function LifecycleMatrix() {
  const [hover, setHover] = useState<{ r: number; c: number } | null>(null);
  const inRow = (r: number) => hover?.r === r;
  const inCol = (c: number) => hover?.c === c;

  const cellStyle = (r: number, c: number, live: boolean): React.CSSProperties => {
    const hovered = inRow(r) && inCol(c);
    const lit = inRow(r) || inCol(c);
    return {
      background: hovered ? '#f0f4ff' : lit ? '#f8fafb' : '#ffffff',
      border: live ? `1px solid ${hovered ? '#0057b8' : '#dcdfe3'}` : '1px dashed #e3e6ea',
      color: live ? '#1d2329' : '#9aa0a6',
      transition: 'background 120ms ease, border-color 120ms ease',
    };
  };

  return (
    <div className="mt-10" onMouseLeave={() => setHover(null)}>
      <div
        data-testid="matrix"
        className="grid gap-2"
        style={{ gridTemplateColumns: '220px repeat(4, minmax(0, 1fr))' }}
      >
        {/* column headers */}
        <div />
        {VERBS.map((v, c) => (
          <div
            key={v.label}
            className="rounded-xl px-4 py-3"
            style={{
              background: inCol(c) ? '#001a3d' : '#f8fafb',
              border: '1px solid #dcdfe3',
              transition: 'background 120ms ease',
            }}
          >
            <p className="text-[14px] font-bold tracking-[-0.02em]" style={{ color: inCol(c) ? '#ffffff' : '#1d2329' }}>{v.label}</p>
            <p className="text-[11px] font-medium" style={{ color: inCol(c) ? '#009fdb' : '#686e74' }}>{v.gloss}</p>
          </div>
        ))}

        {/* rows */}
        {MATRIX_ROWS.map((row, r) => (
          <div key={row.key} data-testid={`matrix-row-${row.key}`} style={{ display: 'contents' }}>
            <div
              className="rounded-xl px-4 py-3 flex flex-col justify-center gap-1"
              style={{
                background: inRow(r) ? '#001a3d' : '#f8fafb',
                border: row.live ? '1px solid #dcdfe3' : '1px dashed #e3e6ea',
                transition: 'background 120ms ease',
              }}
            >
              <div className="flex items-center gap-2">
                <p className="text-[13px] font-bold tracking-[-0.02em] leading-snug" style={{ color: inRow(r) ? '#ffffff' : row.live ? '#1d2329' : '#686e74' }}>
                  {row.layer}
                </p>
                {!row.live && <VisionTag />}
              </div>
              <p className="text-[11px] font-medium leading-snug" style={{ color: inRow(r) ? 'rgba(255,255,255,0.6)' : '#9aa0a6' }}>{row.scope}</p>
            </div>
            {row.cells.map((cell, c) => {
              const common = {
                'data-testid': 'matrix-cell',
                onMouseEnter: () => setHover({ r, c }),
                className: 'rounded-xl px-4 py-3 flex items-center text-[12.5px] font-medium leading-snug',
                style: cellStyle(r, c, row.live),
              };
              return row.live && row.hrefs ? (
                <a key={c} href={row.hrefs[c]} {...common}>
                  {cell}
                </a>
              ) : (
                <div key={c} {...common}>
                  {cell}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* legend */}
      <div className="flex flex-wrap items-center gap-6 mt-6">
        <span className="inline-flex items-center gap-2 text-[12px] font-medium" style={{ color: '#454b52' }}>
          <span className="w-8 h-4 rounded" style={{ background: '#ffffff', border: '1px solid #dcdfe3' }} />
          Live · every cell is a screen in the running product
        </span>
        <span className="inline-flex items-center gap-2 text-[12px] font-medium" style={{ color: '#9aa0a6' }}>
          <span className="w-8 h-4 rounded" style={{ border: '1px dashed #bdc1c8' }} />
          Vision · in the concept, not yet in the nav
        </span>
        <span className="text-[12px] font-medium" style={{ color: '#686e74' }}>
          Hover any cell: the row is where you are, the column is what you are doing.
        </span>
      </div>

      {/* vocabulary equivalence */}
      <div className="rounded-2xl px-6 py-5 mt-6" style={{ background: '#f8fafb', border: '1px solid #dcdfe3' }}>
        <span className="text-[10px] font-bold tracking-[0.06em] uppercase" style={{ color: '#009fdb' }}>Same arc, older words</span>
        <p className="text-[14px] font-semibold tracking-[-0.01em] mt-1" style={{ color: '#1d2329' }}>
          Create ≈ Connect · Configure ≈ Govern · Monitor ≈ Observe · + Cost.
          {' '}
          <span className="font-medium" style={{ color: '#454b52' }}>NetBond's lifecycle and this one are the same arc.</span>
        </p>
      </div>
    </div>
  );
}

// ── The stack: elevation drawing with the two journeys ──────────────────────

function JourneyLine({ left, num }: { left: string; num: string }) {
  return (
    <div className="absolute top-0 bottom-0 flex flex-col items-center" style={{ left, width: 24, marginLeft: -12 }} aria-hidden="true">
      <span
        className="flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold z-10"
        style={{ background: '#0057b8', color: '#ffffff' }}
      >
        {num}
      </span>
      <span className="flex-1 w-px" style={{ background: '#0057b8', opacity: 0.45 }} />
      <span className="w-2 h-2 rounded-full mb-1" style={{ background: '#0057b8' }} />
    </div>
  );
}

function StackElevation() {
  const bandBase = 'rounded-xl px-5 flex items-center justify-between';
  return (
    <div className="grid grid-cols-12 gap-8 mt-10 items-start">
      {/* the strata */}
      <div className="col-span-12 lg:col-span-7 relative">
        <div className="flex flex-col gap-2 pt-3">
          <div className={`${bandBase} h-12`} style={{ background: '#f0f4ff', border: '1px solid #dcdfe3' }}>
            <div className="flex items-center gap-2.5">
              <span className="text-[13px] font-bold" style={{ color: '#1d2329' }}>AI Fabric</span>
              <LiveTag />
            </div>
            <span className="text-[11px] font-medium" style={{ color: '#686e74' }}>Model endpoints · agents · tokens · budgets</span>
          </div>
          <div className={`${bandBase} h-16`} style={{ background: '#ffffff', border: '1px dashed #bdc1c8' }}>
            <div className="flex items-center gap-2.5">
              <span className="text-[13px] font-bold" style={{ color: '#686e74' }}>Cloud</span>
              <VisionTag />
            </div>
            <span className="text-[11px] font-medium" style={{ color: '#9aa0a6' }}>On-ramps · managed VPC · Equinix attach · L3 to neoclouds</span>
          </div>
          <div className={`${bandBase} h-16`} style={{ background: '#f8fafb', border: '1px solid #dcdfe3' }}>
            <div className="flex items-center gap-2.5">
              <span className="text-[13px] font-bold" style={{ color: '#1d2329' }}>Network services (NaaS)</span>
              <LiveTag />
            </div>
            <span className="text-[11px] font-medium" style={{ color: '#686e74' }}>Mid-mile fabric · tenanted paths · SD-WAN · SASE</span>
          </div>
          <div className="rounded-xl px-5 pt-3 pb-4" style={{ background: '#ffffff', border: '1px dashed #bdc1c8' }}>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2.5">
                <span className="text-[13px] font-bold" style={{ color: '#686e74' }}>Transport & Access</span>
                <VisionTag />
              </div>
              <span className="text-[11px] font-medium" style={{ color: '#9aa0a6' }}>Access media are siblings, not layers</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { name: 'Fiber', sub: 'lit fiber · PON' },
                { name: 'Dark fiber', sub: 'your glass' },
                { name: 'Wireless', sub: '5G · private cellular · FirstNet' },
                { name: 'Satellite', sub: 'anywhere else' },
              ].map(m => (
                <div key={m.name} className="rounded-lg px-3 py-2.5" style={{ border: '1px dashed #dcdfe3', background: '#fbfcfd' }}>
                  <p className="text-[12px] font-bold" style={{ color: '#686e74' }}>{m.name}</p>
                  <p className="text-[10px] font-medium leading-snug" style={{ color: '#9aa0a6' }}>{m.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* the two journeys, drawn down the strata */}
        <JourneyLine left="34%" num="1" />
        <JourneyLine left="52%" num="2" />
      </div>

      {/* journey descriptions */}
      <div className="col-span-12 lg:col-span-5 flex flex-col gap-4">
        <div className="rounded-2xl px-6 py-5" style={{ background: '#f8fafb', border: '1px solid #dcdfe3' }}>
          <div className="flex items-center gap-2.5 mb-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold" style={{ background: '#0057b8', color: '#ffffff' }}>1</span>
            <span className="text-[10px] font-bold tracking-[0.06em] uppercase" style={{ color: '#009fdb' }}>Simple · direct cloud-connect</span>
          </div>
          <p className="text-[13px] font-medium leading-relaxed" style={{ color: '#454b52' }}>
            Attach your VPC in-region and AT&amp;T runs everything beneath: managed VPC,
            transparent Equinix attach where we lack presence, L3 drop to the neocloud.
          </p>
        </div>
        <div className="rounded-2xl px-6 py-5" style={{ background: '#f8fafb', border: '1px solid #dcdfe3' }}>
          <div className="flex items-center gap-2.5 mb-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold" style={{ background: '#0057b8', color: '#ffffff' }}>2</span>
            <span className="text-[10px] font-bold tracking-[0.06em] uppercase" style={{ color: '#009fdb' }}>Predictable · tenanted</span>
          </div>
          <p className="text-[13px] font-medium leading-relaxed" style={{ color: '#454b52' }}>
            A NetBond-style private path: reliability, performance, isolation, proven with data.
          </p>
        </div>
        <p className="text-[12px] font-medium leading-relaxed px-1" style={{ color: '#686e74' }}>
          Both journeys start at the top and end on glass, RF, or a satellite link.
          The customer picks how much of the stack to see. AT&amp;T runs all of it either way.
        </p>
      </div>
    </div>
  );
}

// ── The twin: the loop the layer-first IA unlocked ──────────────────────────

const LOOP_STEPS = [
  {
    n: 1,
    title: 'Design',
    body: 'Flip the stack on Discover into design mode. Every stageable move is priced by the engine before anything happens: attach a region and the chip states its latency arrow and its monthly saving.',
  },
  {
    n: 2,
    title: 'Simulate',
    body: 'The tray sums what the staged moves would do. The preview and the committed state read the same derivations, so the twin cannot promise a figure the estate would later deny.',
  },
  {
    n: 3,
    title: 'Share',
    body: 'The tray travels as a link. It carries intentions, never figures. The recipient’s engine reprices every move on arrival. A stale link cannot state a stale price.',
  },
  {
    n: 4,
    title: 'Approve',
    body: 'The recipient lands on the same tray, marked as a proposal. Commit runs the real mutations. Undo reverts them. Infrastructure gets the review loop code has had for a decade.',
  },
  {
    n: 5,
    title: 'The advisor drafts',
    body: 'Every move the engine prices, staged into a reviewable draft with one chip. It never commits anything. Its whole authority is a pre-filled tray.',
  },
];

function TwinLoop() {
  return (
    <div className="mt-10 space-y-3">
      {LOOP_STEPS.map(s => (
        <div key={s.n} className="grid grid-cols-12 gap-4 rounded-2xl px-6 py-5 items-start"
          style={{ background: '#f8fafb', border: '1px solid #dcdfe3' }}>
          <div className="col-span-1 flex items-center justify-center h-8 w-8 rounded-full text-[14px] font-bold"
            style={{ background: '#0057b8', color: '#ffffff' }}>{s.n}</div>
          <div className="col-span-3 text-[16px] font-bold tracking-[-0.02em] pt-1" style={{ color: '#1d2329' }}>
            {s.title}
          </div>
          <p className="col-span-8 text-[14px] font-medium leading-relaxed pt-1" style={{ color: '#454b52' }}>
            {s.body}
          </p>
        </div>
      ))}
      <div className="grid sm:grid-cols-2 gap-3 pt-3">
        <div className="rounded-2xl px-6 py-5" style={{ background: '#f8fafb', border: '1px solid #dcdfe3' }}>
          <p className="text-[11px] font-bold uppercase tracking-[0.06em] mb-2" style={{ color: '#009fdb' }}>
            And when something already happened
          </p>
          <p className="text-[14px] font-medium leading-relaxed" style={{ color: '#454b52' }}>
            <b style={{ color: '#1d2329' }}>The time machine.</b> Observe’s window is scrubbable. Markers sit
            only where the engine placed a moment: the seeded transit-congestion event, a this-session
            attach, an active failure sim. The readout restates the drawn value, never a re-derivation.
            “What did the stack look like when latency spiked” is answered by name.{' '}
            <a href="#/naas/observe" className="font-semibold hover:underline" style={{ color: '#0057b8' }}>
              Scrub the window →
            </a>
          </p>
        </div>
        <div className="rounded-2xl px-6 py-5" style={{ background: '#f8fafb', border: '1px solid #dcdfe3' }}>
          <p className="text-[11px] font-bold uppercase tracking-[0.06em] mb-2" style={{ color: '#009fdb' }}>
            And when you already know what you want
          </p>
          <p className="text-[14px] font-medium leading-relaxed" style={{ color: '#454b52' }}>
            <b style={{ color: '#1d2329' }}>⌘K intents.</b> Type “cap shared-services 2m” and the palette
            answers with one command, priced in policy vocabulary, that runs against the engine. A typed
            grammar over the engine’s own tags, so free text can never reach a mutation. The same grammar
            now declares standing intents: type “keep ai private” and the sentence becomes a promise the
            estate keeps checking. Attach and steer intents carry the same arrows and savings the twin
            states, because they are the same derivation.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Standing intents: the declared-outcome lifecycle ────────────────────────

const INTENT_STEPS = [
  {
    n: 1,
    title: 'Declare',
    body: 'One sentence to Andi, “keep ai private”, becomes a standing promise with a scope. Every new promise starts in watch mode. Consent comes before control.',
  },
  {
    n: 2,
    title: 'Watch',
    body: 'A watch intent evaluates and counts. It changes nothing. A cap in watch mode records the requests it would have denied, so the decision to enforce is made on evidence.',
  },
  {
    n: 3,
    title: 'Enforce',
    body: 'A separate toggle, visible on the row. In enforce mode the budget gate really denies: a capped tag at its limit gets a recorded denial with the reason stated.',
  },
  {
    n: 4,
    title: 'Drift',
    body: 'Status is re-derived on every read: aligned, drifting, or violated, each with one engine-grounded sentence of evidence. Nothing stores a stale verdict.',
  },
  {
    n: 5,
    title: 'Synchronize',
    body: 'A violated promise carries its compiled repair, priced in the twin’s own vocabulary. Synchronize stages it into the tray. The machine stages, never commits.',
  },
];

function IntentLifecycle() {
  return (
    <div className="mt-10 space-y-3">
      {INTENT_STEPS.map(s => (
        <div key={s.n} className="grid grid-cols-12 gap-4 rounded-2xl px-6 py-5 items-start"
          style={{ background: '#f8fafb', border: '1px solid #dcdfe3' }}>
          <div className="col-span-1 flex items-center justify-center h-8 w-8 rounded-full text-[14px] font-bold"
            style={{ background: '#0057b8', color: '#ffffff' }}>{s.n}</div>
          <div className="col-span-3 text-[16px] font-bold tracking-[-0.02em] pt-1" style={{ color: '#1d2329' }}>
            {s.title}
          </div>
          <p className="col-span-8 text-[14px] font-medium leading-relaxed pt-1" style={{ color: '#454b52' }}>
            {s.body}
          </p>
        </div>
      ))}
      <div className="rounded-2xl px-6 py-5 mt-3" style={{ background: '#f8fafb', border: '1px solid #dcdfe3' }}>
        <p className="text-[11px] font-bold uppercase tracking-[0.06em] mb-2" style={{ color: '#009fdb' }}>
          And before the first promise
        </p>
        <p className="text-[14px] font-medium leading-relaxed" style={{ color: '#454b52' }}>
          <b style={{ color: '#1d2329' }}>The 14-day assessment.</b> The gateway watches for 14 days
          and reports what AI traffic is costing and risking, before anyone commits to anything.
          Every counter is a live derivation. The report never states a number the portal’s own
          screens would deny. Measure first. Declare second.{' '}
          <a href="#/assessment" className="font-semibold hover:underline" style={{ color: '#0057b8' }}>
            Start the assessment →
          </a>
        </p>
      </div>
    </div>
  );
}

// ── The rules ────────────────────────────────────────────────────────────────

const RULES = [
  {
    when: 'A user needs a place to work',
    then: 'They pick a layer, never a verb.',
    example: 'The bar reads Discover · NaaS · AI Fabric',
  },
  {
    when: 'They are inside a layer',
    then: 'The four verbs are one click away, as tabs of that world.',
    example: 'Health → policy → cost without leaving NaaS',
  },
  {
    when: 'The same verb is needed one layer up or down',
    then: 'It is one hop, place kept.',
    example: '/ai/cost → /naas/cost via the stack rail',
  },
  {
    when: 'A verb works as a command',
    then: 'It is a global action, not an address.',
    example: '"+ Create" lists every creatable object, each naming its layer',
  },
  {
    when: 'A question spans every layer',
    then: 'Discover answers it.',
    example: 'The estate view is the single pane of glass',
  },
  {
    when: 'The machine has an opinion',
    then: 'It stages a draft. It never commits.',
    example: 'The advisor chip fills the tray; a human clicks Commit',
  },
  {
    when: 'A decision needs a second pair of eyes',
    then: 'The tray travels as a link, and the recipient’s engine reprices it.',
    example: 'Share proposal → Opened from a proposal link · Commit',
  },
  {
    when: 'A promise has a status',
    then: 'It is derived on every read, never stored.',
    example: 'aligned / drifting / violated, each with an evidence sentence',
  },
];

function IaRules() {
  return (
    <div className="mt-8 space-y-3">
      {RULES.map(r => (
        <div key={r.when} className="grid grid-cols-12 gap-4 rounded-2xl px-6 py-5 items-center"
          style={{ background: '#f8fafb', border: '1px solid #dcdfe3' }}>
          <div className="col-span-4">
            <span className="text-[10px] font-bold tracking-[0.1em] uppercase" style={{ color: '#009fdb' }}>When</span>
            <p className="text-[15px] font-bold tracking-[-0.02em] mt-1 leading-snug" style={{ color: '#1d2329' }}>{r.when}</p>
          </div>
          <div className="col-span-4">
            <span className="text-[10px] font-bold tracking-[0.1em] uppercase" style={{ color: '#009fdb' }}>Then</span>
            <p className="text-[13px] font-medium mt-1 leading-relaxed" style={{ color: '#454b52' }}>{r.then}</p>
          </div>
          <div className="col-span-4">
            <span className="text-[10px] font-bold tracking-[0.1em] uppercase" style={{ color: '#686e74' }}>Example</span>
            <p className="text-[12px] font-medium mt-1" style={{ color: '#686e74' }}>{r.example}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Before / after: the two bars, drawn in HTML ──────────────────────────────

function BeforeBar() {
  const verb = (label: string) => (
    <span key={label} className="text-[13px] font-medium" style={{ color: '#454b52' }}>{label}</span>
  );
  const verbs = ['Connect', 'Govern', 'Observe', 'Cost'];
  return (
    <div>
      <div className="rounded-xl px-6 py-3 flex items-end gap-5 overflow-x-auto" style={{ background: '#ffffff', border: '1px solid #dcdfe3' }}>
        <div className="flex flex-col">
          <span className="h-4" aria-hidden="true" />
          <span className="text-[13px] font-bold" style={{ color: '#0057b8' }}>Discover</span>
        </div>
        <span className="w-px h-8 self-center" style={{ background: '#e3e6ea' }} aria-hidden="true" />
        <div className="flex flex-col">
          <span className="h-4 text-[10px] leading-4 font-semibold uppercase tracking-[0.1em]" style={{ color: '#9aa0a6' }}>NaaS</span>
          <div className="flex items-end gap-4">{verbs.map(verb)}</div>
        </div>
        <span className="w-px h-8 self-center" style={{ background: '#e3e6ea' }} aria-hidden="true" />
        <div className="flex flex-col">
          <span className="h-4 text-[10px] leading-4 font-semibold uppercase tracking-[0.1em]" style={{ color: '#9aa0a6' }}>AI Fabric</span>
          <div className="flex items-end gap-4">{verbs.map(verb)}</div>
        </div>
      </div>
      <p className="text-[12px] font-medium mt-2.5" style={{ color: '#686e74' }}>
        8 links · 4 distinct words · the caption is load-bearing at 10px
      </p>
    </div>
  );
}

function AfterBar() {
  return (
    <div>
      <div className="rounded-xl px-6 py-3.5 flex items-center gap-6" style={{ background: '#ffffff', border: '1px solid #dcdfe3' }}>
        <span className="text-[13px] font-bold" style={{ color: '#454b52' }}>Discover</span>
        <span className="inline-flex items-center gap-1 text-[13px] font-bold" style={{ color: '#454b52' }}>
          NaaS <ChevronDown size={13} strokeWidth={2.5} />
        </span>
        <span className="inline-flex items-center gap-1 text-[13px] font-bold pb-0.5" style={{ color: '#0057b8', borderBottom: '2px solid #0057b8' }}>
          AI Fabric <ChevronDown size={13} strokeWidth={2.5} />
        </span>
      </div>
      {/* the AI Fabric dropdown, drawn open */}
      <div className="rounded-xl mt-1.5 px-5 py-4 max-w-sm ml-24" style={{ background: '#ffffff', border: '1px solid #dcdfe3', boxShadow: '0 8px 24px rgba(29,35,41,0.08)' }}>
        <p className="text-[11px] font-medium leading-relaxed mb-3" style={{ color: '#686e74' }}>
          The token layer · model endpoints, the agents calling them, and their budgets.
        </p>
        <div className="space-y-2.5">
          {[
            { label: 'Connect', desc: 'Attach model endpoints and neoclouds' },
            { label: 'Govern', desc: 'Token policy and guardrails' },
            { label: 'Observe', desc: 'Prompt traces and agent decisions' },
            { label: 'Cost', desc: 'Token budgets and spend' },
          ].map(v => (
            <div key={v.label} className="flex items-baseline gap-3">
              <span className="text-[13px] font-bold w-16" style={{ color: '#1d2329' }}>{v.label}</span>
              <span className="text-[11px] font-medium" style={{ color: '#686e74' }}>{v.desc}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-[12px] font-medium mt-2.5" style={{ color: '#686e74' }}>
        every label unique · verbs live inside their layer
      </p>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function StackDeckPage() {
  // Two audiences, one deck: the concept, and the people it was shaped for.
  const [view, setView] = useState<'concept' | 'personas'>('concept');
  return (
    <div style={{ fontFamily: "'ATT Aleck Sans', system-ui, sans-serif", paddingBottom: 48, background: '#ffffff' }}>
      <style>{`
        @media print {
          .sd-no-print { display: none !important; }
          .sd-section { page-break-after: always; }
          .sd-section:last-child { page-break-after: avoid; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      {/* header */}
      <header className="sd-no-print sticky top-0 z-50 flex items-center justify-between px-8 h-14"
        style={{ background: '#ffffff', borderBottom: '1px solid #dcdfe3' }}>
        <div className="flex items-center gap-3">
          <span style={{ color: '#009fdb' }}><AttIcon name="hub" className="w-5 h-5" /></span>
          <span className="text-[13px] font-bold" style={{ color: '#1d2329' }}>AT&amp;T AI-grade network</span>
          <span className="text-[12px] font-medium px-2 py-0.5 rounded" style={{ background: '#f0f4ff', color: '#0057b8' }}>
            The Stack · layer-first IA
          </span>
        </div>
        <nav aria-label="Deck views" className="flex items-center gap-1 rounded-full p-1"
          style={{ background: '#f8fafb', border: '1px solid #dcdfe3' }}>
          {([['concept', 'The concept'], ['personas', 'Personas']] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              data-testid={`deck-tab-${key}`}
              aria-pressed={view === key}
              onClick={() => { setView(key); window.scrollTo(0, 0); }}
              className="px-4 py-1 rounded-full text-[13px] font-semibold transition-colors"
              style={view === key
                ? { background: '#0057b8', color: '#ffffff' }
                : { background: 'transparent', color: '#454b52' }}
            >
              {label}
            </button>
          ))}
        </nav>
        <button onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-1.5 rounded-full text-[13px] font-medium"
          style={{ background: '#f8fafb', color: '#454b52', border: '1px solid #dcdfe3' }}>
          <Printer size={14} /> Export PDF
        </button>
      </header>

      {view === 'personas' ? <PersonasView /> : <>

      {/* ── COVER ── */}
      <section className="sd-section" style={{ background: '#001a3d', minHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
        <div className="flex-1 flex flex-col justify-between max-w-5xl mx-auto w-full px-16 py-20">
          <div className="flex items-center gap-2">
            <span style={{ color: '#009fdb' }}><AttIcon name="hub" className="w-6 h-6" /></span>
            <span className="text-[13px] font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>AT&amp;T AI-grade network</span>
          </div>
          <div>
            <p className="text-[13px] font-medium tracking-[0.12em] uppercase mb-6" style={{ color: '#009fdb' }}>
              Information architecture · AI-grade network
            </p>
            <h1 className="text-[68px] font-bold leading-[1.02] tracking-[-0.04em] mb-8" style={{ color: '#ffffff' }}>
              Enter through the layer.<br />Act through the lifecycle.
            </h1>
            <div className="w-16 h-1 mb-8 rounded-full" style={{ background: '#009fdb' }} />
            <p className="text-[22px] font-medium leading-relaxed max-w-2xl" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Every screen in the AI-grade network is one cell of a table: the thing you work on,
              crossed with what you do to it. The nav should read that table the way users do.
            </p>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[15px] font-bold" style={{ color: 'rgba(255,255,255,0.9)' }}>Micah Boswell</p>
              <p className="text-[13px] font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>UX Strategy · AT&amp;T AI-grade network</p>
            </div>
            <p className="text-[12px] font-medium" style={{ color: 'rgba(255,255,255,0.3)' }}>July 2026</p>
          </div>
        </div>
      </section>

      {/* ── 1 · THE PREMISE ── */}
      <section className="sd-section" style={{ background: '#ffffff' }}>
        <div className="max-w-5xl mx-auto px-16 py-20">
          <SectionLabel>The premise</SectionLabel>
          <h2 className="text-[40px] font-bold tracking-[-0.03em] leading-tight mb-6" style={{ color: '#1d2329' }}>
            A verb is not a destination.
          </h2>
          <p className="text-[17px] font-medium leading-relaxed max-w-3xl" style={{ color: '#454b52' }}>
            Users navigate to things, then act on them. The current nav promoted the verbs
            and buried the places: eight links, four distinct words, told apart by 10px
            captions. The fix is not new pages. It is the same table, read the right way.
            Pick the layer first. Run the lifecycle inside it.
          </p>
          <div className="grid grid-cols-3 gap-6 mt-12">
            <BigStat stat="4" label="Verbs, one lifecycle" description="Connect, Govern, Observe, Cost · the same on every layer." />
            <BigStat stat="4" label="Layers, everything AT&T runs" description="From satellite to token." />
            <BigStat stat="1" label="Label per destination" description="No word appears twice in the bar." />
          </div>
        </div>
      </section>

      {/* ── 2 · THE TABLE ── */}
      <section className="sd-section" style={{ background: '#ffffff' }}>
        <div className="max-w-6xl mx-auto px-16 py-20">
          <SectionLabel>The table</SectionLabel>
          <h2 className="text-[40px] font-bold tracking-[-0.03em] leading-tight mb-4" style={{ color: '#1d2329' }}>
            Four verbs across. Four layers down.
          </h2>
          <p className="text-[16px] font-medium leading-relaxed max-w-3xl" style={{ color: '#454b52' }}>
            The columns never change: they are the lifecycle of anything the customer owns.
            The rows are the layers of the network, top of the stack first. AI Fabric and
            NaaS are live · every cell links to the running product. Cloud and
            Transport &amp; Access are the same table, drawn ahead of their screens.
          </p>
          <LifecycleMatrix />
        </div>
      </section>

      {/* ── 3 · THE STACK ── */}
      <section className="sd-section" style={{ background: '#ffffff' }}>
        <div className="max-w-6xl mx-auto px-16 py-20">
          <SectionLabel>The stack</SectionLabel>
          <h2 className="text-[40px] font-bold tracking-[-0.03em] leading-tight mb-4" style={{ color: '#1d2329' }}>
            One experience over everything AT&amp;T runs.
          </h2>
          <p className="text-[16px] font-medium leading-relaxed max-w-3xl" style={{ color: '#454b52' }}>
            The rows in elevation. AI Fabric rides on cloud, cloud rides on network
            services, and all of it lands on physical media. Two guided journeys run
            down the strata: one hides the stack, one proves it.
          </p>
          <StackElevation />
        </div>
      </section>

      {/* ── 4 · THE TWIN ── */}
      <section className="sd-section" style={{ background: '#ffffff' }}>
        <div className="max-w-5xl mx-auto px-16 py-20">
          <SectionLabel>The twin</SectionLabel>
          <h2 className="text-[40px] font-bold tracking-[-0.03em] leading-tight mb-4" style={{ color: '#1d2329' }}>
            Design on it. Share it. A human commits.
          </h2>
          <p className="text-[16px] font-medium leading-relaxed max-w-3xl" style={{ color: '#454b52' }}>
            The stack on Discover is not a diagram. It is a digital twin of the estate,
            stating live engine figures per stratum. Terraform gave code review to
            infrastructure; nothing gave it to the network. This does. Five steps, one
            law: every figure, staged or committed, is one derivation stated twice.{' '}
            <a href="#/discover" className="font-semibold hover:underline" style={{ color: '#0057b8' }}>
              Open the twin →
            </a>
          </p>
          <TwinLoop />
        </div>
      </section>

      {/* ── 5 · STANDING INTENTS ── */}
      <section className="sd-section" style={{ background: '#ffffff' }}>
        <div className="max-w-5xl mx-auto px-16 py-20">
          <SectionLabel>Standing intents</SectionLabel>
          <h2 className="text-[40px] font-bold tracking-[-0.03em] leading-tight mb-4" style={{ color: '#1d2329' }}>
            Declare the outcome. Watch it hold.
          </h2>
          <p className="text-[16px] font-medium leading-relaxed max-w-3xl" style={{ color: '#454b52' }}>
            The twin reviews one change. A standing intent reviews the estate, on every read.
            The industry matured fulfillment: every vendor compiles a declared intent into
            configuration. The assurance loop never closed: nothing kept checking that the
            promise still held. This product closes it live, on the Discover cross-section.{' '}
            <a href="#/discover" className="font-semibold hover:underline" style={{ color: '#0057b8' }}>
              Watch the promises hold →
            </a>
          </p>
          <IntentLifecycle />
        </div>
      </section>

      {/* ── 6 · THE RULES ── */}
      <section className="sd-section" style={{ background: '#ffffff' }}>
        <div className="max-w-5xl mx-auto px-16 py-20">
          <SectionLabel>The rules</SectionLabel>
          <h2 className="text-[40px] font-bold tracking-[-0.03em] leading-tight mb-4" style={{ color: '#1d2329' }}>
            Eight rules route every label.
          </h2>
          <p className="text-[16px] font-medium leading-relaxed max-w-3xl" style={{ color: '#454b52' }}>
            The whole IA reduces to eight when/then pairs. Everything on the bar,
            in the rail, behind "+ Create", in the advisor's chip, on a
            proposal link and on an intent row follows from them.
          </p>
          <IaRules />
        </div>
      </section>

      {/* ── 7 · BEFORE / AFTER ── */}
      <section className="sd-section" style={{ background: '#ffffff' }}>
        <div className="max-w-5xl mx-auto px-16 py-20">
          <SectionLabel>Before · after</SectionLabel>
          <h2 className="text-[40px] font-bold tracking-[-0.03em] leading-tight mb-4" style={{ color: '#1d2329' }}>
            Eight links. Four words.
          </h2>
          <p className="text-[16px] font-medium leading-relaxed max-w-3xl mb-10" style={{ color: '#454b52' }}>
            The before bar is drawn accurately, not as a straw man. Discover, then two
            groups of the same four words. The only thing separating /naas/connect from
            /ai/connect is the caption above the link, set at 10px. Captions are decoration
            to a scanning eye. Labels are what people read. The after bar gives every
            destination its own word and moves the verbs inside their layer.
          </p>
          <div className="space-y-10">
            <div>
              <span className="text-[10px] font-bold tracking-[0.06em] uppercase" style={{ color: '#009fdb' }}>Before · the shipping bar</span>
              <div className="mt-2.5"><BeforeBar /></div>
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-[0.06em] uppercase" style={{ color: '#009fdb' }}>After · layers on the bar, verbs in the layer</span>
              <div className="mt-2.5"><AfterBar /></div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 8 · WHAT MAKES US STICKY ── */}
      <section className="sd-section" style={{ background: '#ffffff' }}>
        <div className="max-w-5xl mx-auto px-16 py-20">
          <SectionLabel>What makes us sticky</SectionLabel>
          <h2 className="text-[40px] font-bold tracking-[-0.03em] leading-tight mb-8" style={{ color: '#1d2329' }}>
            Sticky is three columns riding a fourth.
          </h2>
          <div className="rounded-2xl px-8 py-6 max-w-3xl" style={{ background: '#f8fafb', border: '1px solid #dcdfe3', borderLeft: '3px solid #009fdb' }}>
            <p className="text-[19px] font-semibold leading-relaxed tracking-[-0.01em]" style={{ color: '#1d2329' }}>
              "Focus has to be on providing customers the control, security, observability,
              cost-control etc. This is what will make us sticky."
            </p>
            <p className="text-[11px] font-bold tracking-[0.06em] uppercase mt-3" style={{ color: '#009fdb' }}>The direction email · closing line</p>
          </div>
          <div className="grid grid-cols-4 gap-4 mt-10">
            {[
              { word: 'Control', col: 'Govern', line: 'Policy the customer writes, on paths and on tokens.' },
              { word: 'Security', col: 'Govern', line: 'Isolation and guardrails live with policy, because they are policy.' },
              { word: 'Observability', col: 'Observe', line: 'Path health, VPC health, prompt traces. Proven with data.' },
              { word: 'Cost-control', col: 'Cost', line: 'Egress, transport, token spend. A budget on every layer.' },
            ].map(c => (
              <div key={c.word} className="rounded-2xl px-5 py-5" style={{ background: '#f8fafb', border: '1px solid #dcdfe3' }}>
                <p className="text-[10px] font-bold tracking-[0.06em] uppercase" style={{ color: '#009fdb' }}>{c.word}</p>
                <p className="text-[17px] font-bold tracking-[-0.02em] mt-1 mb-2" style={{ color: '#0057b8' }}>→ {c.col}</p>
                <p className="text-[12px] font-medium leading-relaxed" style={{ color: '#454b52' }}>{c.line}</p>
              </div>
            ))}
          </div>
          <p className="text-[16px] font-semibold leading-relaxed max-w-3xl mt-10" style={{ color: '#1d2329' }}>
            All four ride on Connect. Nothing is governed, observed, or metered until it is attached.
          </p>
        </div>
      </section>

      {/* ── 9 · CLOSE ── */}
      <section className="sd-section" style={{ background: '#001435' }}>
        <div className="max-w-5xl mx-auto px-16 py-24 text-center">
          <p className="text-[13px] font-medium tracking-[0.12em] uppercase mb-8" style={{ color: '#009fdb' }}>
            The one-line answer
          </p>
          <h2 className="text-[44px] font-bold tracking-[-0.03em] leading-tight mb-8" style={{ color: '#ffffff' }}>
            The table was always there.<br />The nav just read it sideways.
          </h2>
          <a href="#/discover" className="inline-flex items-center gap-2 text-[16px] font-bold" style={{ color: '#009fdb' }}>
            Open the portal →
          </a>
        </div>
      </section>

      </>}
    </div>
  );
}
