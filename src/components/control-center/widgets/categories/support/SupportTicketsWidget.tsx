import { useNavigate } from 'react-router-dom';
import { Clock, Plus } from 'lucide-react';

export function SupportTicketsWidget() {
  const navigate = useNavigate();
  const tickets = [
    {
      id: '1',
      title: 'Connection Latency Issue',
      status: 'open' as const,
      priority: 'high' as const,
      created: '2024-03-10T15:30:00Z'
    },
    {
      id: '2',
      title: 'Bandwidth Upgrade Request',
      status: 'in-progress' as const,
      priority: 'medium' as const,
      created: '2024-03-09T10:15:00Z'
    },
    {
      id: '3',
      title: 'Security Configuration',
      status: 'resolved' as const,
      priority: 'low' as const,
      created: '2024-03-08T14:20:00Z'
    }
  ];

  const statusLabel: Record<string, string> = {
    'open': 'Open',
    'in-progress': 'In Progress',
    'resolved': 'Resolved',
  };

  const statusColor: Record<string, string> = {
    'open': 'text-fw-error',
    'in-progress': 'text-fw-bodyLight',
    'resolved': 'text-fw-success',
  };

  return (
    <div className="space-y-3">
      {/* Action in header */}
      <div className="flex items-center justify-between">
        <span className="text-figma-xs text-fw-bodyLight uppercase tracking-wider">
          {tickets.filter(t => t.status !== 'resolved').length} open
        </span>
        <button
          onClick={() => navigate('/tickets/create')}
          className="flex items-center gap-1 text-figma-sm text-fw-link hover:text-fw-linkHover transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          New ticket
        </button>
      </div>

      {/* Ticket list */}
      <div className="divide-y divide-fw-secondary">
        {tickets.map((ticket) => (
          <div
            key={ticket.id}
            className="py-2.5 first:pt-0 last:pb-0 cursor-pointer group"
            onClick={() => navigate(`/tickets/${ticket.id}`)}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-figma-sm text-fw-body group-hover:text-fw-heading transition-colors leading-snug">
                {ticket.title}
              </span>
              <span className={`text-figma-xs font-medium flex-shrink-0 ${statusColor[ticket.status]}`}>
                {statusLabel[ticket.status]}
              </span>
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <Clock className="h-3 w-3 text-fw-bodyLight" />
              <span className="text-figma-xs text-fw-bodyLight">
                {new Date(ticket.created).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
