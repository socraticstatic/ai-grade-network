/**
 * /stack · Personas — who uses the table, and where they live in it.
 *
 * The signature visual is the footprint matrix: the deck's own 4×4
 * (layers × lifecycle), shaded per persona — and, at the close, all nine
 * footprints tiled onto one table. One visual system carries the whole
 * argument: the IA is a table, and every role is a shape on it.
 *
 * The set is discovered, not assumed. Role-blueprint research grounds the
 * architect (review boards, blast radius), the planner (forecast before the
 * constraint), and the NOC (baseline, triage, change window). The 2026
 * hiring split names the cloud network engineer as its own archetype.
 * TM Forum's NaaS work and GSMA CAMARA put the developer consuming the
 * network as an API inside the buyer ecosystem. GRC three-lines research
 * names the security & compliance lead as the approval gate on high-risk
 * change, and the executive sponsor as the role every program answers to.
 * The AI platform and FinOps analysts arrived with the token layer and the
 * egress bill.
 */

interface Persona {
  key: string;
  name: string;
  oneLiner: string;
  question: string;
  source: string;
  monogram: string;
  accent: string;
  /** rows: AI Fabric, Cloud, NaaS, Transport · cols: Connect Govern Observe Cost · 0 none, 1 visits, 2 lives */
  footprint: [number, number, number, number][];
  day: string[];
  builtForThem: string[];
  /** The standing intents this role declares · labels from the shipped six-entry catalog only. */
  intents: string[];
  tension: string;
}

const PERSONAS: Persona[] = [
  {
    key: 'architect',
    name: 'Network Architect',
    oneLiner: 'Owns the shape of the estate.',
    question: '“Can I defend this path in front of the review board?”',
    source: 'Role blueprint research · architecture review boards',
    monogram: 'NA',
    accent: '#0057b8',
    footprint: [
      [1, 1, 0, 0],
      [2, 1, 0, 1],
      [2, 2, 1, 1],
      [1, 1, 0, 0],
    ],
    day: [
      'Reviews high-risk changes for blast radius and rollback before a review board sees them.',
      'Designs new connectivity on the twin instead of a diagram that drifts.',
      'Walks cost trade-offs with finance in figures both sides can check.',
    ],
    builtForThem: ['Design mode', 'Proposal links', 'Undo as rollback'],
    intents: ['Minimize latency', 'Keep this flow diverse'],
    tension: 'Their diagrams used to age out the day they shipped. The twin is the diagram, live.',
  },
  {
    key: 'planner',
    name: 'Network Planner',
    oneLiner: 'Moves before the constraint does.',
    question: '“What breaks next quarter, and what does the fix cost today?”',
    source: 'Role blueprint research · capacity before incident',
    monogram: 'NP',
    accent: '#009fdb',
    footprint: [
      [0, 0, 0, 1],
      [1, 0, 0, 1],
      [2, 0, 1, 2],
      [1, 0, 0, 1],
    ],
    day: [
      'Forecasts bandwidth and attach needs a quarter out.',
      'Reads what is still on the table and sequences the attaches that close it.',
      'Turns the advisor’s draft into next quarter’s plan, move by priced move.',
    ],
    builtForThem: ['The advisor draft', 'Arbitrage · still on the table', 'Staged deltas'],
    intents: ['Route by cost'],
    tension: 'Planning used to mean a spreadsheet nobody else could audit. Now the plan is a link.',
  },
  {
    key: 'netops',
    name: 'NetOps Engineer',
    oneLiner: 'Keeps it standing.',
    question: '“What did it look like right before it went wrong?”',
    source: 'NOC function research · baseline, triage, change window',
    monogram: 'NO',
    accent: '#1d2329',
    footprint: [
      [0, 0, 1, 0],
      [0, 0, 1, 0],
      [1, 2, 2, 0],
      [0, 0, 1, 0],
    ],
    day: [
      'Watches path health against the baseline, not against a feeling.',
      'Scrubs the window back to the moment a spike began, and reads it by name.',
      'Runs failure sims before the failure runs them.',
    ],
    builtForThem: ['The time machine', 'Failure simulation', 'One latency vocabulary'],
    intents: ['Keep this flow diverse', 'Minimize latency'],
    tension: 'The postmortem question was always "what did it look like right before." Now they scrub to it.',
  },
  {
    key: 'cloudeng',
    name: 'Cloud Network Engineer',
    oneLiner: 'Owns the on-ramps and every VPC that touches the fabric.',
    question: '“Which account, which region, which path, and what does attaching cost?”',
    source: '2026 hiring research · its own archetype',
    monogram: 'CN',
    accent: '#0057b8',
    footprint: [
      [1, 0, 0, 0],
      [2, 1, 1, 1],
      [2, 1, 1, 0],
      [0, 0, 0, 0],
    ],
    day: [
      'Attaches regions and VPCs, and checks the latency arrow before committing.',
      'Hops the rail between a workload’s cloud view and its network path.',
      'Types the attach into ⌘K when they already know what they want.',
    ],
    builtForThem: ['Attach flows', 'The stack rail', '⌘K attach intents'],
    intents: ['Minimize latency'],
    tension: 'Their world is the seam between clouds and the network. The stack finally draws the seam.',
  },
  {
    key: 'platformeng',
    name: 'Platform Engineer',
    oneLiner: 'Consumes the network as an API, from the pipeline.',
    question: '“Can my pipeline ask for the path my service needs, without a ticket?”',
    source: 'TM Forum NaaS · GSMA CAMARA network-as-API',
    monogram: 'PE',
    accent: '#009fdb',
    footprint: [
      [1, 1, 0, 0],
      [1, 0, 1, 0],
      [1, 0, 1, 0],
      [0, 0, 0, 0],
    ],
    day: [
      'Wires connectivity into deploys the way storage and compute already are.',
      'States the intent in one line and lets the engine price it.',
      'Reads the same figures in the portal their pipeline saw in the response.',
    ],
    builtForThem: ['⌘K intents as the grammar', 'One engine behind portal and API', 'Share links as fixtures'],
    intents: ['Minimize latency', 'Keep this flow diverse'],
    tension: 'Every other layer of their stack became an API years ago. The network was the holdout.',
  },
  {
    key: 'aianalyst',
    name: 'AI Platform Analyst',
    oneLiner: 'Governs the token layer.',
    question: '“Whose tokens rode the public internet today, and what did they cost?”',
    source: 'The token layer’s own arrival · AI platform practice',
    monogram: 'AI',
    accent: '#009fdb',
    footprint: [
      [2, 2, 2, 2],
      [1, 0, 0, 0],
      [0, 0, 1, 1],
      [0, 0, 0, 0],
    ],
    day: [
      'Reads which tokens rode the public internet, and closes that gap.',
      'Caps a budget in one typed sentence when a team runs hot.',
      'Traces an agent’s decisions when spend moves without a deploy.',
    ],
    builtForThem: ['Token budgets & guardrails', '⌘K cap intents', 'Prompt traces'],
    intents: ['Cap token spend', 'Keep AI inference off the public internet'],
    tension: 'AI spend was a bill that arrived. Now it is a meter they steer.',
  },
  {
    key: 'finops',
    name: 'FinOps Analyst',
    oneLiner: 'Accountable for spend across every layer.',
    question: '“Which flow is burning money, and who signs off on moving it?”',
    source: 'FinOps discipline · egress accountability',
    monogram: 'FO',
    accent: '#1d2329',
    footprint: [
      [0, 0, 0, 2],
      [0, 0, 0, 2],
      [0, 1, 1, 2],
      [0, 0, 0, 1],
    ],
    day: [
      'Splits egress into on-fabric and public, and watches the split move.',
      'Prices every steer before championing it.',
      'Sends the quarter’s savings case as a proposal link finance can open.',
    ],
    builtForThem: ['Egress split', 'Steer to save', 'Proposals as the business case'],
    intents: ['Route by cost', 'Cap token spend'],
    tension: 'The savings deck used to be screenshots. Now the numbers reprice themselves on open.',
  },
  {
    key: 'seclead',
    name: 'Security & Compliance Lead',
    oneLiner: 'The approval gate on high-risk change.',
    question: '“Show me every path, every policy, and who changed what, when.”',
    source: 'GRC three-lines research · high-risk change approval',
    monogram: 'SC',
    accent: '#1d2329',
    footprint: [
      [0, 2, 1, 0],
      [0, 2, 0, 0],
      [0, 2, 1, 0],
      [0, 1, 0, 0],
    ],
    day: [
      'Reads the Govern column top to bottom: segmentation, guardrails, token policy.',
      'Approves proposals with the deltas stated, instead of change tickets with prose.',
      'Pulls the decision log when audit asks who changed what.',
    ],
    builtForThem: ['The Govern column, whole', 'Proposal review', 'Decision & activity logs'],
    intents: ['Route by data sensitivity', 'Keep AI inference off the public internet'],
    tension: 'Approval used to mean trusting the requester’s summary. Now the change prices itself.',
  },
  {
    key: 'sponsor',
    name: 'Executive Sponsor',
    oneLiner: 'Answers for the program, in business language.',
    question: '“Are we safer, faster, and cheaper than last quarter? Provably?”',
    source: 'GRC & NaaS transformation research · visible sponsorship',
    monogram: 'ES',
    accent: '#0057b8',
    footprint: [
      [0, 0, 1, 1],
      [0, 0, 1, 1],
      [0, 0, 1, 1],
      [0, 0, 0, 0],
    ],
    day: [
      'Opens Discover for the one-look answer: what is on the fabric, what it saves.',
      'Reads this deck, both tabs, before the budget meeting.',
      'Forwards a proposal link instead of scheduling a meeting about it.',
    ],
    builtForThem: ['Discover as the single pane', 'The /stack deck', 'Posture & savings figures'],
    intents: ['Route by cost'],
    tension: 'They used to buy the network on trust. The table lets them read it.',
  },
];

const ROW_LABELS = ['AI', 'Cloud', 'NaaS', 'T&A'];
const COL_LABELS = ['C', 'G', 'O', '$'];
const COL_FULL = ['Connect', 'Govern', 'Observe', 'Cost'];
const ROW_FULL = ['AI Fabric', 'Cloud', 'NaaS', 'Transport & Access'];
const CELL_TONE = ['#eef0f2', '#b3d4f0', '#0057b8'];

/** The persona's shape on the deck's own table. */
function Footprint({ footprint, name }: { footprint: Persona['footprint']; name: string }) {
  return (
    <div data-testid="persona-footprint" role="img"
      aria-label={`Where the ${name} lives on the lifecycle and layer table`}>
      <div className="grid gap-1" style={{ gridTemplateColumns: 'auto repeat(4, 15px)' }}>
        <span />
        {COL_LABELS.map(c => (
          <span key={c} className="text-[8px] font-bold text-center" style={{ color: '#9aa0a6' }}>{c}</span>
        ))}
        {footprint.map((row, r) => (
          [
            <span key={`l${r}`} className="text-[8px] font-bold pr-1 text-right leading-[15px]" style={{ color: '#9aa0a6' }}>
              {ROW_LABELS[r]}
            </span>,
            ...row.map((v, c) => (
              <span key={`${r}${c}`} className="h-[15px] w-[15px] rounded-[3px]"
                style={{ background: CELL_TONE[v] }} />
            )),
          ]
        ))}
      </div>
    </div>
  );
}

/** All nine shapes tiled onto one table: who lives in every cell. */
function CoverageTable() {
  return (
    <div data-testid="persona-coverage" className="mt-10 rounded-2xl overflow-hidden"
      style={{ border: '1px solid #dcdfe3' }}>
      <div className="grid" style={{ gridTemplateColumns: '150px repeat(4, 1fr)' }}>
        <div className="px-4 py-3" style={{ background: '#f8fafb', borderBottom: '1px solid #dcdfe3' }} />
        {COL_FULL.map(c => (
          <div key={c} className="px-4 py-3 text-[12px] font-bold text-center"
            style={{ background: '#f8fafb', borderBottom: '1px solid #dcdfe3', color: '#1d2329' }}>
            {c}
          </div>
        ))}
        {ROW_FULL.map((rowLabel, r) => (
          [
            <div key={`r${r}`} className="px-4 py-4 text-[12px] font-bold flex items-center"
              style={{ color: '#1d2329', borderBottom: r < 3 ? '1px solid #f0f1f2' : undefined }}>
              {rowLabel}
            </div>,
            ...COL_FULL.map((_, c) => {
              const lives = PERSONAS.filter(p => p.footprint[r][c] === 2);
              const visits = PERSONAS.filter(p => p.footprint[r][c] === 1);
              return (
                <div key={`${r}${c}`} className="px-3 py-4 flex flex-wrap items-center justify-center content-center gap-1"
                  style={{ borderBottom: r < 3 ? '1px solid #f0f1f2' : undefined, borderLeft: '1px solid #f0f1f2' }}>
                  {lives.map(p => (
                    <span key={p.key} title={`${p.name} lives here`}
                      className="flex items-center justify-center h-6 w-6 rounded-md text-[9px] font-bold"
                      style={{ background: p.accent, color: '#ffffff' }}>
                      {p.monogram}
                    </span>
                  ))}
                  {visits.map(p => (
                    <span key={p.key} title={`${p.name} visits`}
                      className="flex items-center justify-center h-6 w-6 rounded-md text-[9px] font-bold"
                      style={{ background: '#eef2f6', color: '#5c6167', border: '1px solid #dcdfe3' }}>
                      {p.monogram}
                    </span>
                  ))}
                  {lives.length === 0 && visits.length === 0 && (
                    <span className="text-[10px] font-medium" style={{ color: '#bdc1c8' }}>—</span>
                  )}
                </div>
              );
            }),
          ]
        ))}
      </div>
      <p className="px-5 py-3 text-[12px] font-medium leading-relaxed"
        style={{ background: '#f8fafb', borderTop: '1px solid #dcdfe3', color: '#686e74' }}>
        Solid monograms live in a cell; outlined ones visit. The thin Transport &amp; Access row is
        the point, not a gap: its personas arrive with the fiber, wireless and satellite strata, and
        their columns are already waiting.
      </p>
    </div>
  );
}

export function PersonasView() {
  return (
    <>
      {/* ── PERSONAS COVER ── */}
      <section className="sd-section" style={{ background: '#001a3d', minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        <div className="flex-1 flex flex-col justify-center max-w-5xl mx-auto w-full px-16 py-20">
          <p className="text-[13px] font-medium tracking-[0.12em] uppercase mb-6" style={{ color: '#009fdb' }}>
            Who uses it · AI-grade network
          </p>
          <h1 className="text-[56px] font-bold leading-[1.05] tracking-[-0.04em] mb-8" style={{ color: '#ffffff' }}>
            Nine roles.<br />One table, nine shapes.
          </h1>
          <div className="w-16 h-1 mb-8 rounded-full" style={{ background: '#009fdb' }} />
          <p className="text-[20px] font-medium leading-relaxed max-w-2xl" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Every role that touches the network lives somewhere on the lifecycle and layer
            table. The footprint beside each persona is that somewhere. Layers are personas;
            that is why layers lead the nav.
          </p>
        </div>
      </section>

      {/* ── THE NINE ── */}
      <section className="sd-section" style={{ background: '#ffffff' }}>
        <div className="max-w-7xl mx-auto px-16 py-20">
          <p className="text-[11px] font-medium tracking-[0.12em] uppercase mb-4" style={{ color: '#0057b8' }}>
            The personas
          </p>
          <h2 className="text-[40px] font-bold tracking-[-0.03em] leading-tight mb-4" style={{ color: '#1d2329' }}>
            Where each one lives, and what was built for them.
          </h2>
          <p className="text-[16px] font-medium leading-relaxed max-w-3xl mb-4" style={{ color: '#454b52' }}>
            A discovered set, each cited to its research. Six roles run the network today.
            Two arrived with the token layer and the egress bill. The ninth, the platform
            engineer consuming the network as an API, comes straight from where TM Forum
            and GSMA CAMARA say NaaS is going: into the deploy pipeline.
          </p>
          <div className="flex items-center gap-4 text-[11px] font-medium mb-10" style={{ color: '#686e74' }}>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-[3px]" style={{ background: CELL_TONE[2] }} /> lives here
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-[3px]" style={{ background: CELL_TONE[1] }} /> visits
            </span>
            <span>Columns: Connect · Govern · Observe · Cost. Rows: the stack, top down.</span>
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {PERSONAS.map(p => (
              <article key={p.key} data-testid={`persona-${p.key}`}
                className="rounded-2xl overflow-hidden flex flex-col"
                style={{ border: '1px solid #dcdfe3' }}>
                <div className="px-5 pt-5 pb-4" style={{ background: '#f8fafb', borderBottom: '1px solid #dcdfe3' }}>
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex items-center justify-center h-11 w-11 rounded-xl text-[15px] font-bold flex-shrink-0"
                      style={{ background: p.accent, color: '#ffffff', letterSpacing: '-0.02em' }}>
                      {p.monogram}
                    </span>
                    <Footprint footprint={p.footprint} name={p.name} />
                  </div>
                  <h3 className="text-[17px] font-bold tracking-[-0.02em] mt-3" style={{ color: '#1d2329' }}>{p.name}</h3>
                  <p className="text-[13px] font-medium leading-snug mt-0.5" style={{ color: '#686e74' }}>{p.oneLiner}</p>
                  <p className="text-[13px] font-semibold italic leading-snug mt-2.5" style={{ color: '#0057b8' }}>
                    {p.question}
                  </p>
                </div>
                <div className="px-5 py-4 flex-1">
                  <ul className="space-y-1.5">
                    {p.day.map((d, i) => (
                      <li key={i} className="text-[12.5px] font-medium leading-relaxed pl-3.5 relative" style={{ color: '#454b52' }}>
                        <span className="absolute left-0 top-[7px] h-1.5 w-1.5 rounded-full" style={{ background: p.accent }} />
                        {d}
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {p.builtForThem.map(f => (
                      <span key={f} className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                        style={{ background: '#f0f4ff', color: '#0057b8' }}>
                        {f}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4" data-testid="persona-intents">
                    <p className="text-[9.5px] font-bold tracking-[0.06em] uppercase" style={{ color: '#009fdb' }}>
                      Intents they declare
                    </p>
                    <p className="text-[12px] font-medium leading-relaxed mt-1" style={{ color: '#454b52' }}>
                      {p.intents.join(' · ')}
                    </p>
                  </div>
                </div>
                <div className="px-5 py-3" style={{ background: '#f8fafb', borderTop: '1px solid #f0f1f2' }}>
                  <p className="text-[12px] font-medium italic leading-relaxed" style={{ color: '#686e74' }}>
                    {p.tension}
                  </p>
                  <p className="text-[9.5px] font-bold tracking-[0.06em] uppercase mt-2" style={{ color: '#009fdb' }}>
                    {p.source}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── COVERAGE: nine shapes, one table ── */}
      <section className="sd-section" style={{ background: '#ffffff' }}>
        <div className="max-w-6xl mx-auto px-16 py-20">
          <p className="text-[11px] font-medium tracking-[0.12em] uppercase mb-4" style={{ color: '#0057b8' }}>
            The proof
          </p>
          <h2 className="text-[40px] font-bold tracking-[-0.03em] leading-tight mb-4" style={{ color: '#1d2329' }}>
            Tile the nine shapes, and the table fills.
          </h2>
          <p className="text-[16px] font-medium leading-relaxed max-w-3xl" style={{ color: '#454b52' }}>
            Every persona overlaid on the same table. No role needed a fifth verb. None fit
            inside a single one. And no cell that matters is unclaimed. That is the IA
            argument, drawn once with all nine at the same time.
          </p>
          <CoverageTable />
        </div>
      </section>

      {/* ── THE POINT ── */}
      <section className="sd-section" style={{ background: '#001435' }}>
        <div className="max-w-5xl mx-auto px-16 py-16">
          <p className="text-[26px] font-bold leading-snug tracking-[-0.02em] max-w-3xl" style={{ color: '#ffffff' }}>
            The org chart and the nav are the same drawing. Teams pick their layer, verbs
            carry their day, and the columns are where they meet.
          </p>
          <a href="#/discover" className="inline-block mt-6 text-[15px] font-semibold hover:underline" style={{ color: '#009fdb' }}>
            Open the portal →
          </a>
        </div>
      </section>
    </>
  );
}
