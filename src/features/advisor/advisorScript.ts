import type { CloudControl } from '../../engine/types';
import { advisorFindings, advisorHeadline, headStart, type Finding } from './advisorModel';
import { siteClassNoun } from '../discover/discoveryModel';

/* The advisor's conversation script. Beats are authored; every number in
 * them is read from the engine when the script is built. The conversation
 * is the spine of the page: each beat says something, optionally puts an
 * artifact on the canvas, and offers one-tap replies that name the next
 * beat. A demo never types - the chips carry the whole flow - but free
 * text still routes to Andi underneath. */

const nf = new Intl.NumberFormat('en-US');
const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

export type CanvasItem =
  | { kind: 'headstart' }
  | { kind: 'scan' }
  | { kind: 'finding'; finding: Finding }
  | { kind: 'hero' };

export interface Reply {
  label: string;
  /** Next beat id, or an app route when the reply leaves the conversation. */
  next?: string;
  route?: string;
}

export interface Beat {
  id: string;
  /** Messages the advisor sends, in order, typing-paced. */
  say: string[];
  canvas?: CanvasItem;
  replies: Reply[];
  /** Beat that auto-advances (scan theater) after its messages finish. */
  auto?: string;
}

export function buildScript(cc: CloudControl): Beat[] {
  const hs = headStart(cc);
  const findings = advisorFindings(cc);
  const head = advisorHeadline(cc);
  const classes = hs.byClass
    .map(r => `${nf.format(r.count)} ${siteClassNoun(r.siteClass, r.count)}`)
    .join(', ');

  const beats: Beat[] = [
    {
      id: 'greet',
      say: [
        `Good morning. Before you tell me anything, here's what AT&T can already see of your estate.`,
        `${nf.format(hs.total)} of your sites ride our network today — ${classes}. ${nf.format(hs.onNet)} are reachable over an AT&T circuit right now.`,
      ],
      canvas: { kind: 'headstart' },
      replies: [
        { label: "What can't you see?", next: 'gap' },
        { label: 'Show me the estate instead', route: '/discover' },
      ],
    },
    {
      id: 'gap',
      say: [
        `Your cloud side. I know which regions touch our fabric, but not what lives inside them.`,
        `Give me read-only credentials and I'll look. They're checked in your browser and never stored or sent anywhere.`,
      ],
      replies: [
        { label: 'Connect with demo credentials', next: 'scan' },
        { label: 'Not yet — show the estate', route: '/discover' },
      ],
    },
    {
      id: 'scan',
      say: [
        `Connecting… crawling your accounts now.`,
        `Mapping regions, VPCs and subnets against the circuits I already know.`,
        `Joining the two estates — pricing every path both ways.`,
      ],
      canvas: { kind: 'scan' },
      replies: [],
      auto: findings.length ? `finding-0` : 'wrap',
    },
    ...findings.map((f, i): Beat => ({
      id: `finding-${i}`,
      say: [f.evidence, f.why],
      canvas: { kind: 'finding', finding: f },
      replies: [
        i + 1 < findings.length
          ? { label: 'What else did you notice?', next: `finding-${i + 1}` }
          : { label: 'So what does it add up to?', next: 'wrap' },
      ],
    })),
    {
      id: 'wrap',
      say: [
        head.savingsMo > 0
          ? `All told: ${money(head.savingsMo)}/mo sitting on the table across ${head.findings} findings — priced from your own traffic, not a benchmark.`
          : `That's the estate as I see it today.`,
        `The fastest way to make these numbers precise: let me watch the estate for 14 days. Nothing gets blocked or routed while I measure.`,
      ],
      canvas: { kind: 'hero' },
      replies: [
        { label: 'Start the 14-day assessment', route: '/assessment' },
        { label: 'Open the estate', route: '/discover' },
      ],
    },
  ];
  return beats;
}
