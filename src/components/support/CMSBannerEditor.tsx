import { useState, useCallback } from 'react';
import { Plus, Megaphone, Eye, Pencil, Trash2 } from 'lucide-react';
import { BaseTable } from '../common/BaseTable';
import { Badge, StatusBadge } from '../common/Badge';
import { Button } from '../common/Button';
import { SearchFilterBar } from '../common/SearchFilterBar';
import { OverflowMenu } from '../common/OverflowMenu';
import { chartColors } from '../../utils/chartColors';

type BannerStatus = 'active' | 'scheduled' | 'inactive';
type BannerPosition = 'top' | 'hero' | 'inline';

interface Banner {
  id: string;
  title: string;
  status: BannerStatus;
  position: BannerPosition;
  startDate: string;
  endDate: string;
}

const positionColors: Record<BannerPosition, { text: string; bg: string }> = {
  top:    { text: chartColors.primary, bg: chartColors.primaryLight },
  hero:   { text: chartColors.purple, bg: chartColors.purpleLight },
  inline: { text: chartColors.warn, bg: chartColors.warnLight },
};

const SAMPLE_BANNERS: Banner[] = [
  {
    id: 'banner-001',
    title: 'Meet Niva, Your NetBond AI Assistant',
    status: 'active',
    position: 'hero',
    startDate: '2026-03-01',
    endDate: '2026-04-30',
  },
  {
    id: 'banner-002',
    title: 'Scheduled Maintenance - March 25, 2026',
    status: 'scheduled',
    position: 'top',
    startDate: '2026-03-24',
    endDate: '2026-03-25',
  },
  {
    id: 'banner-003',
    title: 'Q4 2025 Platform Release Notes',
    status: 'inactive',
    position: 'inline',
    startDate: '2025-10-01',
    endDate: '2025-12-31',
  },
];

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${m}/${d}/${y}`;
}

export function CMSBannerEditor() {
  const [banners, setBanners] = useState<Banner[]>(SAMPLE_BANNERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<keyof Banner>('title');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = useCallback((field: keyof Banner) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  const handleDelete = (id: string) => {
    setBanners(prev => prev.filter(b => b.id !== id));
    window.addToast?.({
      type: 'success',
      title: 'Banner Deleted',
      message: 'Banner has been removed.',
      duration: 3000,
    });
  };

  const handleEdit = (banner: Banner) => {
    window.addToast?.({
      type: 'info',
      title: 'Edit Banner',
      message: `Edit form for "${banner.title}" coming soon.`,
      duration: 3000,
    });
  };

  const handleCreate = () => {
    window.addToast?.({
      type: 'info',
      title: 'Create Banner',
      message: 'Banner creation form coming soon.',
      duration: 3000,
    });
  };

  const filteredBanners = banners
    .filter(b => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return b.title.toLowerCase().includes(q) ||
        b.status.toLowerCase().includes(q) ||
        b.position.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      const mod = sortDirection === 'asc' ? 1 : -1;
      return String(aVal).localeCompare(String(bVal)) * mod;
    });

  const columns = [
    {
      id: 'title',
      label: 'Title',
      sortable: true,
      sortKey: 'title' as keyof Banner,
      render: (b: Banner) => (
        <span className="text-fw-heading font-medium">{b.title}</span>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      sortable: true,
      sortKey: 'status' as keyof Banner,
      render: (b: Banner) => (
        <StatusBadge status={b.status} size="sm" />
      ),
    },
    {
      id: 'position',
      label: 'Position',
      sortable: true,
      sortKey: 'position' as keyof Banner,
      render: (b: Banner) => {
        const colors = positionColors[b.position];
        return (
          <Badge color={colors.text} bg={colors.bg} size="sm">
            {b.position}
          </Badge>
        );
      },
    },
    {
      id: 'startDate',
      label: 'Start Date',
      sortable: true,
      sortKey: 'startDate' as keyof Banner,
      render: (b: Banner) => (
        <span className="text-fw-body">{formatDate(b.startDate)}</span>
      ),
    },
    {
      id: 'endDate',
      label: 'End Date',
      sortable: true,
      sortKey: 'endDate' as keyof Banner,
      render: (b: Banner) => (
        <span className="text-fw-body">{formatDate(b.endDate)}</span>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-fw-wash">
            <Megaphone className="h-5 w-5 text-fw-link" />
          </div>
          <div>
            <h1 className="text-[22px] font-bold text-fw-heading tracking-[-0.03em]">
              Banner Management
            </h1>
            <p className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">
              Manage promotional and informational banners
            </p>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Active', value: banners.filter(b => b.status === 'active').length, color: chartColors.success },
          { label: 'Scheduled', value: banners.filter(b => b.status === 'scheduled').length, color: chartColors.warn },
          { label: 'Inactive', value: banners.filter(b => b.status === 'inactive').length, color: chartColors.bodyLight },
        ].map(stat => (
          <div
            key={stat.label}
            className="bg-fw-base rounded-2xl border border-fw-secondary p-6"
          >
            <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mb-1">
              {stat.label}
            </p>
            <p className="text-[28px] font-bold tracking-[-0.03em]" style={{ color: stat.color }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Table */}
      <BaseTable<Banner>
        tableId="cms-banners"
        columns={columns}
        data={filteredBanners}
        keyField="id"
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
        showColumnManager={true}
        toolbar={
          <SearchFilterBar
            searchPlaceholder="Search banners..."
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            onExport={() => window.addToast?.({ type: 'success', title: 'Exported', message: 'Banners exported', duration: 3000 })}
            actions={
              <Button variant="primary" icon={Plus} onClick={handleCreate}>
                Create Banner
              </Button>
            }
          />
        }
        actions={(banner: Banner) => (
          <OverflowMenu items={[
            { id: 'view', label: 'View Banner', icon: <Eye className="h-4 w-4" />, onClick: () => handleEdit(banner) },
            { id: 'edit', label: 'Edit Banner', icon: <Pencil className="h-4 w-4" />, onClick: () => handleEdit(banner) },
            { id: 'delete', label: 'Delete', icon: <Trash2 className="h-4 w-4" />, onClick: () => handleDelete(banner.id), variant: 'danger' as const },
          ]} />
        )}
        emptyState={
          <div className="flex flex-col items-center gap-2 py-8">
            <Megaphone className="h-8 w-8 text-fw-disabled" />
            <p className="text-[14px] text-fw-bodyLight">
              No banners yet. Create your first banner.
            </p>
          </div>
        }
      />
    </div>
  );
}
