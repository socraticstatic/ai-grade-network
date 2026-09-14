import { ReactNode } from 'react';

interface MetricCardProps {
  title: string;
  value: string;
  icon: ReactNode;
  status: 'success' | 'warning' | 'error';
  description: string;
  chart: ReactNode;
}

export function MetricCard({ title, value, icon, status, description, chart }: MetricCardProps) {
  const getStatusColor = (status: 'success' | 'warning' | 'error') => {
    switch (status) {
      case 'success': return 'bg-fw-successLight text-fw-success';
      case 'warning': return 'bg-fw-wash text-fw-bodyLight';
      case 'error': return 'bg-fw-errorLight text-fw-error';
    }
  };

  return (
    <div className="bg-fw-base rounded-lg border border-fw-secondary overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4 p-4">
        <div>
          <h3 className="text-figma-base font-medium text-fw-heading">{title}</h3>
          <p className="text-figma-sm text-fw-bodyLight mt-1">{description}</p>
        </div>
        <div className={`p-2 rounded-lg ${
          status === 'success' ? 'bg-fw-successLight' : 
          status === 'warning' ? 'bg-fw-wash' : 
          'bg-fw-errorLight'
        }`}>
          {icon}
        </div>
      </div>
      
      <div className="flex items-center space-x-3 mb-4 px-4">
        <div className="text-2xl font-bold text-fw-heading">{value}</div>
        <span className={`px-2 py-1 text-figma-sm font-medium rounded-full ${getStatusColor(status)}`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>

      <div className="h-24 w-full px-4 pb-4">
        {chart}
      </div>
    </div>
  );
}