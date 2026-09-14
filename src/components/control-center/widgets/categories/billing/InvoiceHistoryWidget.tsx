import { Receipt, Download, ExternalLink, Clock } from 'lucide-react';
import { Connection } from '../../../../../types';
import { formatCurrency } from '../../../../../utils/connections';

interface InvoiceHistoryWidgetProps {
  connections: Connection[];
}

export function InvoiceHistoryWidget({ connections }: InvoiceHistoryWidgetProps) {
  const invoices = [
    {
      id: 'INV-2024-001',
      date: '2024-03-01',
      amount: 1299.99,
      status: 'paid',
      items: [
        { description: 'Enterprise Plan', amount: 999.99 },
        { description: 'Additional Bandwidth', amount: 300 }
      ]
    },
    {
      id: 'INV-2024-002',
      date: '2024-02-01',
      amount: 999.99,
      status: 'paid',
      items: [
        { description: 'Enterprise Plan', amount: 999.99 }
      ]
    },
    {
      id: 'INV-2024-003',
      date: '2024-01-01',
      amount: 1149.99,
      status: 'paid',
      items: [
        { description: 'Enterprise Plan', amount: 999.99 },
        { description: 'Additional Storage', amount: 150 }
      ]
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Receipt className="h-5 w-5 text-fw-link mr-2" />
          <span className="text-figma-base font-medium text-fw-heading">Recent Invoices</span>
        </div>
        <button className="text-figma-base text-fw-link hover:text-fw-linkHover">
          View All
        </button>
      </div>

      <div className="space-y-2">
        {invoices.map((invoice) => (
          <div key={invoice.id} className="p-3 bg-fw-wash rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-figma-base font-medium text-fw-heading">{invoice.id}</div>
                <div className="flex items-center text-figma-sm text-fw-bodyLight">
                  <Clock className="h-3 w-3 mr-1" />
                  {new Date(invoice.date).toLocaleDateString()}
                </div>
              </div>
              <span className="text-figma-base font-medium text-fw-heading">
                {formatCurrency(invoice.amount)}
              </span>
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-fw-secondary">
              <span className={`px-2 py-1 text-figma-sm font-medium rounded-full ${
                invoice.status === 'paid'
                  ? 'bg-fw-successLight text-fw-success'
                  : 'bg-fw-wash text-fw-bodyLight'
              }`}>
                {invoice.status.toUpperCase()}
              </span>
              <div className="flex space-x-2">
                <button className="p-1 text-fw-bodyLight hover:text-fw-body rounded-lg hover:bg-fw-neutral">
                  <Download className="h-4 w-4" />
                </button>
                <button className="p-1 text-fw-bodyLight hover:text-fw-body rounded-lg hover:bg-fw-neutral">
                  <ExternalLink className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between p-3 bg-fw-accent rounded-lg">
        <div className="text-figma-base text-fw-linkHover">Next invoice due</div>
        <div className="text-figma-base font-medium text-fw-linkHover">Apr 1, 2024</div>
      </div>
    </div>
  );
}
