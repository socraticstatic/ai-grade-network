import { useState } from 'react';
import { FileText, Edit, Trash2, Copy, Download, Plus } from 'lucide-react';
import { Button } from '../../common/Button';

interface Template {
  id: string;
  name: string;
  description: string;
  type: 'Performance' | 'Security' | 'Usage' | 'Custom';
  lastModified: string;
  format: 'PDF' | 'CSV' | 'Excel';
  status: 'active' | 'inactive' | 'draft';
}

export function ReportTemplates() {
  const [templates] = useState<Template[]>([
    {
      id: '1',
      name: 'Monthly Performance Report',
      description: 'Comprehensive performance metrics for all connections',
      type: 'Performance',
      lastModified: '2024-03-10T15:30:00Z',
      format: 'PDF',
      status: 'active'
    },
    {
      id: '2',
      name: 'Security Audit Log',
      description: 'Detailed security events and compliance status',
      type: 'Security',
      lastModified: '2024-03-09T12:45:00Z',
      format: 'CSV',
      status: 'inactive'
    },
    {
      id: '3',
      name: 'Bandwidth Usage Analysis',
      description: 'Bandwidth consumption patterns and trends',
      type: 'Usage',
      lastModified: '2024-03-08T09:15:00Z',
      format: 'Excel',
      status: 'active'
    }
  ]);

  const getTypeColor = (type: Template['type']) => {
    switch (type) {
      case 'Performance':
        return 'bg-fw-accent text-fw-link';
      case 'Security':
        return 'bg-fw-errorLight text-fw-error';
      case 'Usage':
        return 'bg-fw-successLight text-fw-success';
      default:
        return 'bg-fw-neutral text-fw-body';
    }
  };

  const getStatusBadge = (status: Template['status']) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-0.5 rounded-lg text-[10px] font-medium uppercase tracking-wide bg-fw-successLight text-fw-success">Active</span>;
      case 'inactive':
        return <span className="px-2 py-0.5 rounded-lg text-[10px] font-medium uppercase tracking-wide bg-fw-errorLight text-fw-error">Inactive</span>;
      default:
        return <span className="px-2 py-0.5 rounded-lg text-[10px] font-medium uppercase tracking-wide bg-fw-neutral text-fw-bodyLight">Draft</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div />
        <Button
          variant="primary"
          icon={Plus}
          onClick={() => window.addToast?.({ type: 'info', title: 'Create Template', message: 'Report template creation is available in the full product.', duration: 3000 })}
        >
          Create Templates
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {templates.map((template) => (
          <div
            key={template.id}
            className="bg-fw-base rounded-2xl border border-fw-secondary p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5">
                  <FileText className="h-6 w-6 text-fw-bodyLight" />
                </div>
                <div>
                  <h4 className="text-figma-lg font-medium text-fw-heading tracking-[-0.03em]">{template.name}</h4>
                  <p className="text-figma-base font-medium text-fw-body tracking-[-0.03em] mt-1">{template.description}</p>
                  <div className="flex items-center space-x-3 mt-3">
                    <span className={`px-2 py-0.5 rounded-lg text-figma-sm font-medium ${getTypeColor(template.type)}`}>
                      {template.type}
                    </span>
                    {getStatusBadge(template.status)}
                    <span className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em]">
                      Last modified: {new Date(template.lastModified).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <button className="p-2 text-fw-bodyLight hover:text-fw-body rounded-lg hover:bg-fw-neutral transition-colors">
                  <Edit className="h-5 w-5" />
                </button>
                <button className="p-2 text-fw-bodyLight hover:text-fw-body rounded-lg hover:bg-fw-neutral transition-colors">
                  <Copy className="h-5 w-5" />
                </button>
                <button className="p-2 text-fw-bodyLight hover:text-fw-body rounded-lg hover:bg-fw-neutral transition-colors">
                  <Download className="h-5 w-5" />
                </button>
                <button className="p-2 text-fw-bodyLight hover:text-fw-error rounded-lg hover:bg-fw-errorLight transition-colors">
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
