import { useState, useMemo } from 'react';
import { Plus, Download, Edit, Trash2, Play, Eye, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Button } from '../../common/Button';
import { DataTable } from '../../common/DataTable';
import { SearchFilterBar } from '../../common/SearchFilterBar';
import { TableFilterPanel, useTableFilters, FilterGroup } from '../../common/TableFilterPanel';
import { Badge, StatusBadge } from '../../common/Badge';
import { Modal } from '../../common/Modal';

const REPORT_FILTER_GROUPS: FilterGroup[] = [
  {
    id: 'status',
    label: 'Status',
    type: 'toggle',
    options: [
      { value: 'generated', label: 'Generated', color: 'success' },
      { value: 'scheduled', label: 'Scheduled', color: 'info' },
      { value: 'draft', label: 'Draft', color: 'warning' },
    ],
  },
];

type ReportStatus = 'generated' | 'scheduled' | 'draft';
type OutputFormat = 'PDF' | 'CSV' | 'Excel' | 'JSON';
type FrequencyType = 'none' | 'daily' | 'weekly' | 'monthly' | 'quarterly';

interface CustomReport {
  id: string;
  name: string;
  description: string;
  metrics: string[];
  dateRange: string;
  format: OutputFormat;
  schedule: FrequencyType;
  status: ReportStatus;
  createdDate: string;
  lastRun: string | null;
  createdBy: string;
}

const reportStatusColors: Record<ReportStatus, { text: string; bg: string }> = {
  generated: { text: '#2d7e24', bg: 'rgba(45,126,36,0.16)' },
  scheduled: { text: '#0057b8', bg: 'rgba(0,87,184,0.16)' },
  draft:     { text: '#686e74', bg: 'rgba(104,110,116,0.16)' },
};

const availableMetrics = [
  'Connection Utilization',
  'IPE Capacity',
  'Bandwidth Consumption',
  'Latency',
  'Packet Loss',
  'Uptime / SLA',
  'Revenue per Connection',
  'MBC Trends',
  'Security Events',
  'Compliance Score',
  'Cloud Provider Distribution',
  'Data Center Coverage',
];

const initialReports: CustomReport[] = [
  {
    id: 'cr-1',
    name: 'Monthly Performance Summary',
    description: 'Aggregated monthly performance metrics across all NetBond connections, including utilization, SLA compliance, and top-performing IPEs.',
    metrics: ['Connection Utilization', 'Uptime / SLA', 'Latency', 'IPE Capacity'],
    dateRange: 'Last 30 days',
    format: 'PDF',
    schedule: 'monthly',
    status: 'generated',
    createdDate: '2024-02-01T09:00:00Z',
    lastRun: '2024-03-01T00:00:00Z',
    createdBy: 'ops@company.com',
  },
  {
    id: 'cr-2',
    name: 'Weekly Bandwidth Analysis',
    description: 'Week-over-week bandwidth consumption analysis segmented by cloud provider and data center region with capacity forecasting.',
    metrics: ['Bandwidth Consumption', 'IPE Capacity', 'Cloud Provider Distribution'],
    dateRange: 'Last 7 days',
    format: 'Excel',
    schedule: 'weekly',
    status: 'scheduled',
    createdDate: '2024-01-15T14:30:00Z',
    lastRun: '2024-03-04T06:00:00Z',
    createdBy: 'capacity@company.com',
  },
  {
    id: 'cr-3',
    name: 'Quarterly Compliance Audit',
    description: 'Quarterly security and compliance report covering access logs, threat analysis, and regulatory posture for all active connections.',
    metrics: ['Security Events', 'Compliance Score', 'Uptime / SLA'],
    dateRange: 'Last 90 days',
    format: 'PDF',
    schedule: 'none',
    status: 'draft',
    createdDate: '2024-03-10T11:00:00Z',
    lastRun: null,
    createdBy: 'compliance@company.com',
  },
];

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatSchedule(s: FrequencyType): string {
  if (s === 'none') return 'On demand';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Expandable detail row
function ReportDetail({ report, onClose }: { report: CustomReport; onClose: () => void }) {
  return (
    <tr className="bg-fw-neutral">
      <td colSpan={7} className="px-4 py-4">
        <div className="flex gap-8">
          <div className="flex-1 min-w-0">
            <p className="text-figma-sm text-fw-secondary mb-2">{report.description}</p>
            <div className="flex flex-wrap gap-1 mt-2">
              {report.metrics.map((m) => (
                <span key={m} className="inline-flex items-center px-2 py-0.5 rounded-[8px] text-[10px] font-medium bg-fw-secondary text-fw-heading">
                  {m}
                </span>
              ))}
            </div>
          </div>
          <div className="shrink-0 grid grid-cols-2 gap-x-8 gap-y-1 text-figma-sm">
            <span className="text-fw-secondary">Date Range</span>
            <span className="text-fw-heading">{report.dateRange}</span>
            <span className="text-fw-secondary">Output Format</span>
            <span className="text-fw-heading">{report.format}</span>
            <span className="text-fw-secondary">Created By</span>
            <span className="text-fw-heading">{report.createdBy}</span>
            <span className="text-fw-secondary">Created</span>
            <span className="text-fw-heading">{formatDate(report.createdDate)}</span>
          </div>
          <button onClick={onClose} className="shrink-0 self-start text-fw-secondary hover:text-fw-heading">
            <X className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// Create Report modal form
interface CreateReportFormData {
  name: string;
  description: string;
  metrics: string[];
  dateRange: string;
  format: OutputFormat;
  schedule: FrequencyType;
}

const defaultForm: CreateReportFormData = {
  name: '',
  description: '',
  metrics: [],
  dateRange: 'Last 30 days',
  format: 'PDF',
  schedule: 'none',
};

function CreateReportModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (data: CreateReportFormData) => void;
}) {
  const [form, setForm] = useState<CreateReportFormData>(defaultForm);

  const toggleMetric = (m: string) => {
    setForm(prev => ({
      ...prev,
      metrics: prev.metrics.includes(m)
        ? prev.metrics.filter(x => x !== m)
        : [...prev.metrics, m],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onCreate(form);
  };

  return (
    <Modal isOpen onClose={onClose} title="Create Custom Report" size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name */}
        <div>
          <label className="fw-label block mb-1">Report Name <span className="text-fw-error">*</span></label>
          <input
            className="fw-input w-full"
            placeholder="e.g. Q2 Bandwidth Analysis"
            value={form.name}
            onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="fw-label block mb-1">Description</label>
          <textarea
            className="fw-textarea w-full"
            rows={2}
            placeholder="Describe the purpose of this report"
            value={form.description}
            onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
          />
        </div>

        {/* Metrics */}
        <div>
          <label className="fw-label block mb-2">Metrics</label>
          <div className="flex flex-wrap gap-2">
            {availableMetrics.map((m) => {
              const selected = form.metrics.includes(m);
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleMetric(m)}
                  className={`px-2.5 py-1 rounded-full text-[12px] font-medium transition-colors border ${
                    selected
                      ? 'bg-fw-active border-fw-active text-white'
                      : 'bg-transparent border-fw-secondary text-fw-heading hover:border-fw-active hover:text-fw-link'
                  }`}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>

        {/* Date Range + Format row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="fw-label block mb-1">Date Range</label>
            <select
              className="fw-select w-full"
              value={form.dateRange}
              onChange={e => setForm(prev => ({ ...prev, dateRange: e.target.value }))}
            >
              <option>Last 7 days</option>
              <option>Last 30 days</option>
              <option>Last 90 days</option>
              <option>Last 6 months</option>
              <option>Last 12 months</option>
              <option>Custom range</option>
            </select>
          </div>
          <div>
            <label className="fw-label block mb-1">Output Format</label>
            <select
              className="fw-select w-full"
              value={form.format}
              onChange={e => setForm(prev => ({ ...prev, format: e.target.value as OutputFormat }))}
            >
              <option>PDF</option>
              <option>CSV</option>
              <option>Excel</option>
              <option>JSON</option>
            </select>
          </div>
        </div>

        {/* Schedule */}
        <div>
          <label className="fw-label block mb-1">Schedule</label>
          <select
            className="fw-select w-full"
            value={form.schedule}
            onChange={e => setForm(prev => ({ ...prev, schedule: e.target.value as FrequencyType }))}
          >
            <option value="none">On demand</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
          </select>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
          <Button variant="primary" type="submit">Create Report</Button>
        </div>
      </form>
    </Modal>
  );
}

export function CustomReports() {
  const [reports, setReports] = useState<CustomReport[]>(initialReports);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [sortField, setSortField] = useState<keyof CustomReport>('createdDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');

  const { filters: reportFilters, setFilters: setReportFilters, isOpen: reportFilterOpen, toggle: toggleReportFilter, activeCount: reportFilterCount } = useTableFilters({
    groups: REPORT_FILTER_GROUPS,
  });

  const handleSort = (field: keyof CustomReport) => {
    if (field === sortField) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedReports = useMemo(() => {
    const statusFilters = reportFilters.status || [];
    return [...reports]
      .filter(r => {
        if (statusFilters.length > 0 && !statusFilters.includes(r.status)) return false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          return r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a, b) => {
        const av = a[sortField] ?? '';
        const bv = b[sortField] ?? '';
        const cmp = String(av).localeCompare(String(bv));
        return sortDirection === 'asc' ? cmp : -cmp;
      });
  }, [reports, reportFilters, searchQuery, sortField, sortDirection]);

  const handleCreate = (data: CreateReportFormData) => {
    const newReport: CustomReport = {
      id: `cr-${Date.now()}`,
      name: data.name,
      description: data.description,
      metrics: data.metrics,
      dateRange: data.dateRange,
      format: data.format,
      schedule: data.schedule,
      status: 'draft',
      createdDate: new Date().toISOString(),
      lastRun: null,
      createdBy: 'current.user@company.com',
    };
    setReports(prev => [newReport, ...prev]);
    setShowCreate(false);
  };

  const handleDelete = (id: string) => {
    setReports(prev => prev.filter(r => r.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const handleRun = (id: string) => {
    setReports(prev => prev.map(r =>
      r.id === id
        ? { ...r, status: 'generated', lastRun: new Date().toISOString() }
        : r
    ));
  };

  const columns = [
    {
      id: 'expand',
      label: '',
      sortable: false,
      render: (r: CustomReport) => (
        <button
          onClick={(e) => { e.stopPropagation(); setExpandedId(expandedId === r.id ? null : r.id); }}
          className="text-fw-secondary hover:text-fw-heading"
          aria-label={expandedId === r.id ? 'Collapse' : 'Expand'}
        >
          {expandedId === r.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      ),
      width: 'w-8',
    },
    {
      id: 'name',
      label: 'Report Name',
      sortable: true,
      sortKey: 'name' as keyof CustomReport,
      render: (r: CustomReport) => (
        <div>
          <p className="text-figma-base font-medium text-fw-heading">{r.name}</p>
          <p className="text-[11px] text-fw-secondary mt-0.5">{r.metrics.slice(0, 2).join(', ')}{r.metrics.length > 2 ? ` +${r.metrics.length - 2} more` : ''}</p>
        </div>
      ),
    },
    {
      id: 'createdDate',
      label: 'Created',
      sortable: true,
      sortKey: 'createdDate' as keyof CustomReport,
      render: (r: CustomReport) => (
        <span className="text-figma-sm text-fw-heading">{formatDate(r.createdDate)}</span>
      ),
      width: 'w-32',
    },
    {
      id: 'lastRun',
      label: 'Last Run',
      sortable: true,
      sortKey: 'lastRun' as keyof CustomReport,
      render: (r: CustomReport) => (
        <span className="text-figma-sm text-fw-heading">{formatDate(r.lastRun)}</span>
      ),
      width: 'w-32',
    },
    {
      id: 'schedule',
      label: 'Schedule',
      sortable: false,
      render: (r: CustomReport) => (
        <span className="text-figma-sm text-fw-heading">{formatSchedule(r.schedule)}</span>
      ),
      width: 'w-28',
    },
    {
      id: 'format',
      label: 'Format',
      sortable: false,
      render: (r: CustomReport) => (
        <Badge
          color="#0057b8"
          bg="rgba(0,87,184,0.12)"
          size="sm"
        >
          {r.format}
        </Badge>
      ),
      width: 'w-20',
    },
    {
      id: 'status',
      label: 'Status',
      sortable: true,
      sortKey: 'status' as keyof CustomReport,
      render: (r: CustomReport) => {
        const colors = reportStatusColors[r.status];
        return (
          <Badge color={colors.text} bg={colors.bg} size="sm" className="capitalize">
            {r.status}
          </Badge>
        );
      },
      width: 'w-28',
    },
    {
      id: 'actions',
      label: '',
      sortable: false,
      render: (r: CustomReport) => (
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <button
            className="p-1.5 rounded text-fw-secondary hover:text-fw-link hover:bg-fw-neutral transition-colors"
            title="Run report"
            onClick={() => handleRun(r.id)}
          >
            <Play className="h-3.5 w-3.5" />
          </button>
          <button
            className="p-1.5 rounded text-fw-secondary hover:text-fw-link hover:bg-fw-neutral transition-colors"
            title="Download"
            disabled={r.status === 'draft'}
          >
            <Download className="h-3.5 w-3.5" />
          </button>
          <button
            className="p-1.5 rounded text-fw-secondary hover:text-fw-link hover:bg-fw-neutral transition-colors"
            title="Edit"
          >
            <Edit className="h-3.5 w-3.5" />
          </button>
          <button
            className="p-1.5 rounded text-fw-secondary hover:text-fw-error hover:bg-fw-neutral transition-colors"
            title="Delete"
            onClick={() => handleDelete(r.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
      width: 'w-28',
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-figma-lg font-semibold text-fw-heading">Custom Reports</h2>
          <p className="text-figma-sm text-fw-secondary mt-0.5">
            Build and manage tailored reports for your NetBond environment.
          </p>
        </div>
        <Button
          variant="primary"
          icon={<Plus className="h-4 w-4" />}
          onClick={() => setShowCreate(true)}
        >
          Create Report
        </Button>
      </div>

      {/* Summary counts */}
      <div className="flex gap-4 mb-6">
        {(['generated', 'scheduled', 'draft'] as ReportStatus[]).map((s) => {
          const count = reports.filter(r => r.status === s).length;
          const colors = reportStatusColors[s];
          return (
            <div key={s} className="bg-fw-base rounded-2xl border border-fw-secondary px-4 py-3 flex items-center gap-3">
              <Badge color={colors.text} bg={colors.bg} size="md" className="capitalize">{s}</Badge>
              <span className="text-figma-base font-semibold text-fw-heading">{count}</span>
            </div>
          );
        })}
      </div>

      {/* Reports Table */}
      <DataTable
        tableId="custom-reports"
        toolbar={
          <SearchFilterBar
            searchPlaceholder="Search reports ..."
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            onFilter={toggleReportFilter}
            activeFilterCount={reportFilterCount}
            isFilterOpen={reportFilterOpen}
            filterPanel={
              <TableFilterPanel
                groups={REPORT_FILTER_GROUPS}
                activeFilters={reportFilters}
                onFiltersChange={setReportFilters}
                isOpen={reportFilterOpen}
                onToggle={toggleReportFilter}
                searchQuery={searchQuery}
                onClearSearch={() => setSearchQuery('')}
              />
            }
            onExport={() => {
              window.addToast?.({ type: 'success', title: 'Exported', message: 'Custom reports exported', duration: 3000 });
            }}
          />
        }
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={(field) => handleSort(field as keyof CustomReport)}
        columns={[
          {
            id: 'name',
            label: 'Report Name',
            sortable: true,
            render: (r: CustomReport) => (
              <div>
                <div className="text-[14px] font-medium text-fw-heading">{r.name}</div>
                <div className="text-[12px] text-fw-bodyLight">{r.description.substring(0, 40)}...</div>
              </div>
            ),
          },
          {
            id: 'created',
            label: 'Created',
            sortable: true,
            render: (r: CustomReport) => <span>{formatDate(r.created)}</span>,
          },
          {
            id: 'lastRun',
            label: 'Last Run',
            sortable: true,
            render: (r: CustomReport) => <span>{formatDate(r.lastRun)}</span>,
          },
          {
            id: 'schedule',
            label: 'Schedule',
            render: (r: CustomReport) => <span>{formatSchedule(r.schedule)}</span>,
          },
          {
            id: 'format',
            label: 'Format',
            render: (r: CustomReport) => (
              <Badge color="#0057b8" bg="rgba(0,87,184,0.12)" size="sm">{r.format}</Badge>
            ),
          },
          {
            id: 'status',
            label: 'Status',
            sortable: true,
            render: (r: CustomReport) => {
              const colors = reportStatusColors[r.status];
              return <Badge color={colors.text} bg={colors.bg} size="sm" className="capitalize">{r.status}</Badge>;
            },
          },
        ]}
        data={sortedReports}
        keyField="id"
        actions={(report) => [
          { id: 'run', label: 'Run Report', icon: <Play className="h-4 w-4" />, onClick: () => handleRun(report.id) },
          { id: 'download', label: 'Download', icon: <Download className="h-4 w-4" />, onClick: () => window.addToast?.({ type: 'success', title: 'Downloaded', message: `${report.name} downloaded`, duration: 3000 }) },
          { id: 'edit', label: 'Edit', icon: <Edit className="h-4 w-4" />, onClick: () => {} },
          { id: 'delete', label: 'Delete', icon: <Trash2 className="h-4 w-4" />, onClick: () => handleDelete(report.id), variant: 'danger' as const },
        ]}
        emptyState={
          <div className="py-8 text-center">
            <p className="text-[14px] text-fw-bodyLight mb-4">No custom reports yet.</p>
            <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>
              Create your first report
            </Button>
          </div>
        }
      />

      {/* Create modal */}
      {showCreate && (
        <CreateReportModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}
