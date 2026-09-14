import { Activity, Users } from 'lucide-react';

interface SummaryPanelProps {
  connections: Array<any>;
}

export function SummaryPanel({ connections }: SummaryPanelProps) {
  const topUsers = [
    { name: 'Sarah Patel', usage: '2.3 TB' },
    { name: 'John Smith', usage: '1.8 TB' },
    { name: 'Maria Garcia', usage: '1.5 TB' }
  ];

  return (
    <div className="bg-fw-base rounded-2xl border border-fw-secondary p-6">
      {/* Figma: icon 24x24 + "Usage Analysis" 16px w700, then "Top Users by Bandwidth" 16px w700 */}
      <div className="flex items-center gap-2 mb-6">
        <Activity className="h-6 w-6 text-fw-link" />
        <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em]">Usage Analysis</h3>
      </div>
      <p className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em] mb-4">Top Users by Bandwidth</p>
      {/* Figma: 3 user cells, 352x172, fill=#f8fafb, r=8 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {topUsers.map((user, index) => (
          <div key={index} className="bg-fw-wash rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              {/* Figma: user icon 24x24 fill=#0057b8 */}
              <Users className="h-6 w-6 text-fw-link" />
              {/* Figma: name 16px w500 #1d2329 */}
              <span className="text-figma-lg font-medium text-fw-heading">{user.name}</span>
            </div>
            {/* Figma: "Total usage" 14px w500 #454b52 */}
            <div className="text-figma-base font-medium text-fw-body tracking-[-0.03em] mb-1">Total usage</div>
            {/* Figma: value 24px w700 #1d2329 */}
            <div className="text-figma-xl font-bold text-fw-heading tracking-[-0.04em]">{user.usage}</div>
          </div>
        ))}
      </div>
    </div>
  );
}