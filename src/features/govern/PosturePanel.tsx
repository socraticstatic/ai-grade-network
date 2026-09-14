import { AttIcon } from '../../components/icons/AttIcon';
import { useCloudControl } from '../../engine/react/useCloudControl';
import { postureIcon } from './postureIcon';

interface PostureFinding {
  level: 'crit' | 'warn' | 'ok';
  title: string;
  desc?: string;
  tags?: string[];
}

interface PostureCategory {
  id: string;
  name: string;
  iconKey: string;
  color: string;
  score(): number;
  summary(): string;
  metrics(): [string, string | number, string][];
  findings: PostureFinding[];
  actions: { label: string; sub?: string }[];
}

// Literal Flywheel hex values — SVG attributes don't resolve `fill-fw-*`
// Tailwind classes, so the score ring is colored directly.
const SCORE_COLOR = {
  good: '#2d7e24', // fw-success
  fair: '#64748b', // slate-500 — neutral "needs attention", no warm tone
  poor: '#c70032', // fw-error
};

function scoreColor(score: number): string {
  if (score >= 80) return SCORE_COLOR.good;
  if (score >= 60) return SCORE_COLOR.fair;
  return SCORE_COLOR.poor;
}

const FINDING_BADGE: Record<PostureFinding['level'], string> = {
  crit: 'bg-fw-errorLight text-fw-error',
  warn: 'bg-fw-wash text-fw-bodyLight border border-fw-secondary',
  ok: 'bg-fw-successLight text-fw-success',
};

const FINDING_LABEL: Record<PostureFinding['level'], string> = {
  crit: 'Critical',
  warn: 'Warning',
  ok: 'OK',
};

function ScoreRing({ score }: { score: number }) {
  const size = 56;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const filled = Math.max(0, Math.min(100, score)) / 100;
  const color = scoreColor(score);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#dcdfe3"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - filled)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="15"
        fontWeight="600"
        fill={color}
      >
        {Math.round(score)}
      </text>
    </svg>
  );
}

export function PosturePanel() {
  const cats = useCloudControl(cc => cc.postureCatalog) as PostureCategory[];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {cats.map(cat => {
        const score = cat.score();
        const topFindings = cat.findings.slice(0, 3);
        return (
          <div
            key={cat.id}
            className="rounded-2xl border border-fw-secondary bg-fw-base overflow-hidden"
          >
            <div className="flex items-center gap-3 px-5 py-3 border-b border-fw-secondary bg-fw-wash">
              <AttIcon name={postureIcon(cat.iconKey)} className="h-5 w-5 text-fw-body" />
              <span className="font-medium text-fw-heading">{cat.name}</span>
              <span className="ml-auto text-figma-xs text-fw-bodyLight">/ 100</span>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-start gap-4">
                <ScoreRing score={score} />
                <p className="text-figma-sm text-fw-body">{cat.summary()}</p>
              </div>

              {topFindings.length > 0 && (
                <ul className="space-y-2">
                  {topFindings.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span
                        className={`shrink-0 inline-flex items-center h-5 px-2 rounded-full text-figma-xs font-medium ${FINDING_BADGE[f.level]}`}
                      >
                        {FINDING_LABEL[f.level]}
                      </span>
                      <span className="text-figma-xs text-fw-body">{f.title}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
