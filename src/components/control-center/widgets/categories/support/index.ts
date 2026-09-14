import { Ticket, Book } from 'lucide-react';
import { SupportTicketsWidget } from './SupportTicketsWidget';
import { KnowledgeBaseWidget } from './KnowledgeBaseWidget';
import { WidgetDefinition } from '../../../types';

export const supportWidgets: WidgetDefinition[] = [
  {
    id: 'support-tickets',
    title: 'Support Tickets',
    description: 'View and manage support tickets',
    icon: Ticket,
    color: 'gray',
    defaultW: 1,
    defaultH: 1,
    component: SupportTicketsWidget
  },
  {
    id: 'knowledge-base',
    title: 'Knowledge Base',
    description: 'Access documentation and guides',
    icon: Book,
    color: 'blue',
    defaultW: 1,
    defaultH: 1,
    component: KnowledgeBaseWidget
  }
];

export * from './SupportTicketsWidget';
export * from './KnowledgeBaseWidget';