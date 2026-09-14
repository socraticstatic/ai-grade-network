export interface HealthEntry {
  name: string;
  /** 60 buckets, index 0 = 120 min ago, index 59 = now. Values 0–100. */
  scores: number[];
  currentScore: number;
}

interface ConnectionHealthHeatmapProps {
  entries: HealthEntry[];
}

/**
 * Sequential palette: Okabe-Ito Bluish Green (#009E73) → Orange (#E69F00) → Deep Red.
 * Perceptually uniform across deuteranopia and protanopia.
 */
function scoreToColor(score: number): string {
  const s = Math.max(0, Math.min(100, score));

  if (s >= 50) {
    // Green → Amber  (score 100 → 50,  t 0 → 1)
    const t = (100 - s) / 50;
    const r = Math.round(t * 230);
    const g = Math.round(158 + t);          // 158 → 159
    const b = Math.round(115 * (1 - t));    // 115 → 0
    return `rgb(${r},${g},${b})`;
  }

  // Amber → Deep Red  (score 50 → 0,  t 0 → 1)
  const t = (50 - s) / 50;
  const r = Math.round(230 - t * 60);      // 230 → 170
  const g = Math.round(159 * (1 - t));     // 159 → 0
  return `rgb(${r},${g},0)`;
}

function scoreLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Degraded';
  if (score >= 25) return 'Poor';
  return 'Critical';
}

export function ConnectionHealthHeatmap({ entries }: ConnectionHealthHeatmapProps) {
  if (entries.length === 0) return null;

  const buckets = entries[0].scores.length;

  return (
    <div className="bg-fw-base rounded-xl border border-fw-secondary p-4">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-figma-sm font-semibold text-fw-heading">Connection Quality</span>
          <span className="text-[10px] text-fw-bodyLight">Network health score · 0–100</span>
        </div>
        <span className="text-[10px] text-fw-bodyLight">← 2 hrs ago · now →</span>
      </div>

      {/* Heatmap rows */}
      <div className="space-y-2.5">
        {entries.map(entry => (
          <div key={entry.name} className="flex items-center gap-3">

            {/* Connection name */}
            <span
              className="text-[11px] text-fw-bodyLight w-36 shrink-0 truncate"
              title={entry.name}
            >
              {entry.name}
            </span>

            {/* 60 cells — color encodes health score */}
            <div className="flex-1 flex gap-[2px] h-5">
              {entry.scores.map((score, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-[1.5px]"
                  style={{ backgroundColor: scoreToColor(score) }}
                  title={`${(buckets - 1 - i) * 2} min ago — ${Math.round(score)}/100 (${scoreLabel(score)})`}
                />
              ))}
            </div>

            {/* Current score */}
            <div className="w-14 text-right shrink-0">
              <span
                className="text-[11px] font-bold tabular-nums"
                style={{ color: scoreToColor(entry.currentScore) }}
              >
                {Math.round(entry.currentScore)}
              </span>
              <span className="text-[10px] text-fw-bodyLight">/100</span>
            </div>

          </div>
        ))}
      </div>

      {/* Gradient legend */}
      <div className="mt-4 pt-3 border-t border-fw-secondary">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-fw-bodyLight w-[52px]">Critical</span>
          <div
            className="flex-1 h-2 rounded-full"
            style={{
              background:
                'linear-gradient(to right, rgb(170,0,0), rgb(213,94,0), rgb(230,159,0), rgb(0,158,115))',
            }}
          />
          <span className="text-[10px] text-fw-bodyLight w-[52px] text-right">Excellent</span>
        </div>
        <div className="flex justify-between text-[9px] text-fw-bodyLight mt-1 px-[60px]">
          <span>0</span>
          <span>25</span>
          <span>50</span>
          <span>75</span>
          <span>100</span>
        </div>
      </div>

    </div>
  );
}

/**
 * Generate mock health entries. Mostly healthy with a brief degradation blip.
 * In production, replace with real composite quality scores.
 */
export function generateHealthEntries(connectionNames: string[]): HealthEntry[] {
  return connectionNames.map((name, idx) => {
    const scores = Array.from({ length: 60 }, (_, i): number => {
      const blipStart = 42 + idx * 4;
      const blipEnd   = blipStart + 5;
      if (i >= blipStart && i < blipEnd) {
        return 35 + Math.random() * 22; // Degraded: 35–57
      }
      return 87 + Math.random() * 12;   // Healthy: 87–99
    });
    return { name, scores, currentScore: scores[scores.length - 1] };
  });
}
