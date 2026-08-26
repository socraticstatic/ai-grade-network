/* Dev-only components gallery for the Figma handoff (spec:
 * docs/superpowers/specs/2026-08-26-naas-figma-mockups-design.md, artboard 13).
 *
 * Renders every shared chrome element and primitive in a labeled white
 * section so measure.mjs can freeze the page once and html.to.design can
 * import it as the Components board. Route: /naas/__gallery — a NaaS path on
 * purpose, LeftRail only renders under a layer route. Registered in App.tsx
 * behind import.meta.env.DEV; never ships in a production build.
 */
import { useState, type ReactNode } from 'react';
import { Network, Shield } from 'lucide-react';
import { MainNav } from '../../components/navigation/MainNav';
import { LeftRail } from '../../components/navigation/LeftRail';
import { SubNav } from '../../components/navigation/SubNav';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { MetricCard } from '../../components/common/MetricCard';
import { QuickStatCard } from '../../components/common/QuickStatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Badge, statusColors } from '../../components/common/Badge';
import { Toggle } from '../../components/common/Toggle';
import { SearchFilterBar } from '../../components/common/SearchFilterBar';
import { StandardTable, type StandardColumn } from '../../components/common/StandardTable';

function Section({ name, children }: { name: string; children: ReactNode }) {
  return (
    <section data-handoff={name} className="border-b border-fw-secondary py-6">
      <div className="text-figma-sm font-medium text-fw-bodyLight mb-3">{name}</div>
      {children}
    </section>
  );
}

/* Representative NaaS connection rows for the table section — static on
 * purpose, the gallery freezes to a static artboard anyway. */
interface GalleryRow {
  id: string;
  name: string;
  provider: string;
  bandwidth: string;
  status: 'active' | 'pending' | 'provisioning';
}
const TABLE_ROWS: GalleryRow[] = [
  { id: 'cn-101', name: 'dallas-az1 → aws-us-east-1', provider: 'AWS', bandwidth: '10 Gbps', status: 'active' },
  { id: 'cn-102', name: 'dallas-az1 → azure-southcentral', provider: 'Azure', bandwidth: '5 Gbps', status: 'pending' },
  { id: 'cn-103', name: 'plano-dc2 → gcp-us-central1', provider: 'GCP', bandwidth: '2 Gbps', status: 'provisioning' },
];
const TABLE_COLUMNS: StandardColumn<GalleryRow>[] = [
  { id: 'name', label: 'Connection', render: r => <span className="font-medium text-fw-heading">{r.name}</span> },
  { id: 'provider', label: 'Provider', render: r => r.provider },
  { id: 'bandwidth', label: 'Bandwidth', render: r => r.bandwidth },
  { id: 'status', label: 'Status', render: r => <StatusBadge status={r.status} /> },
];

export function HandoffGallery() {
  const [toggleOn, setToggleOn] = useState(true);
  const [search, setSearch] = useState('');

  return (
    <div className="bg-white min-h-screen px-8 pb-8">
      <Section name="MainNav">
        <MainNav />
      </Section>

      <Section name="LeftRail">
        {/* The rail is position-static inside this box; height clips nothing. */}
        <div className="relative w-[320px]">
          <LeftRail />
        </div>
      </Section>

      <Section name="SubNav">
        <SubNav
          title="Connect"
          description="Attach clouds and sites to the fabric"
          embedded
          action={{ label: 'New connection', to: '/naas/connect' }}
        />
      </Section>

      <Section name="Button">
        <div className="flex items-center gap-4">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="primary" disabled>Disabled</Button>
        </div>
      </Section>

      <Section name="Card">
        <div className="max-w-md">
          <Card header={<span className="font-bold text-fw-heading">Card header</span>}>
            <p className="text-figma-base text-fw-body">
              Body copy inside the standard card container.
            </p>
          </Card>
        </div>
      </Section>

      <Section name="MetricCard">
        <div className="grid grid-cols-3 gap-4 max-w-3xl">
          <MetricCard icon={Network} label="Cloud regions" value="1 of 8" subtitle="on the AT&T fabric" />
          <MetricCard icon={Shield} label="Open findings" value={8} variant="warning" subtitle="security" />
          <MetricCard icon={Network} label="Egress on-path" value="33%" variant="success" />
        </div>
      </Section>

      <Section name="QuickStatCard">
        <div className="grid grid-cols-3 gap-4 max-w-3xl">
          <QuickStatCard title="Sites across the estate" value="4,183" icon={Network} />
          <QuickStatCard title="Workloads" value="1,104" icon={Shield} variant="default" />
        </div>
      </Section>

      <Section name="StatusBadge">
        <div className="flex items-center gap-3">
          <StatusBadge status="active" />
          <StatusBadge status="pending" />
          <StatusBadge status="provisioning" />
          <StatusBadge status="inactive" />
          <StatusBadge status="suspended" />
        </div>
      </Section>

      <Section name="Badge">
        <div className="flex items-center gap-3">
          <Badge color={statusColors.active?.text ?? 'text-fw-success'} bg={statusColors.active?.bg ?? 'bg-green-50'}>
            Active
          </Badge>
          <Badge color="text-fw-link" bg="bg-fw-accent">Info</Badge>
        </div>
      </Section>

      <Section name="Toggle">
        <div className="flex items-center gap-6">
          <Toggle checked={toggleOn} onChange={setToggleOn} label="On" />
          <Toggle checked={false} onChange={() => {}} label="Off" />
          <Toggle checked disabled onChange={() => {}} label="Disabled" />
        </div>
      </Section>

      <Section name="SearchFilterBar">
        <SearchFilterBar
          searchPlaceholder="Search connections"
          searchValue={search}
          onSearchChange={setSearch}
          onFilter={() => {}}
          onRefresh={() => {}}
        />
      </Section>

      <Section name="StandardTable">
        <StandardTable
          tableId="handoff-gallery"
          columns={TABLE_COLUMNS}
          data={TABLE_ROWS}
          keyField="id"
        />
      </Section>
    </div>
  );
}
