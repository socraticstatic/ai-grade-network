import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Compass, Book, PlayCircle, FileText, Mail, ChevronRight, Zap, Shield, MessageCircle, Clock, Sparkles, Ticket } from 'lucide-react';
import { useTour } from '../../hooks/useTour';

type HelpCard = {
  icon: typeof BookOpen;
  title: string;
  description: string;
  tags: string[];
  actionLabel: string;
  active: boolean;
  action?: () => void;
};

export function HelpResourcesPage() {
  const [showBanner] = useState(true);
  const navigate = useNavigate();
  const tour = useTour('main-app');

  const helpCards: HelpCard[] = [
    {
      icon: BookOpen,
      title: 'Network Glossary',
      description: 'Learn networking terms and concepts',
      tags: ['Connections', 'Hubs', 'VLANs', 'VNFs', 'IPE'],
      actionLabel: 'Open Glossary',
      active: true,
      action: () => navigate('/glossary'),
    },
    {
      icon: Ticket,
      title: 'Support Tickets',
      description: 'Create and track support tickets',
      tags: ['Open Tickets', 'Service Requests', 'Issue Tracking'],
      actionLabel: 'View Tickets',
      active: true,
      action: () => navigate('/tickets'),
    },
    {
      icon: Compass,
      title: 'Interactive Tour',
      description: 'Take a guided tour of the platform',
      tags: ['Platform Overview', 'Core Concepts', 'Navigation'],
      actionLabel: 'Start Tour',
      active: false,
      action: () => {
        tour.resetTour();
        tour.startTour();
      },
    },
    {
      icon: FileText,
      title: 'Knowledge Base',
      description: 'Browse articles and FAQs',
      tags: ['Common Issues', 'FAQ Library', 'Use Cases'],
      actionLabel: 'Browse Articles',
      active: false,
    },
    {
      icon: PlayCircle,
      title: 'Video Tutorials',
      description: 'Learn networking terms and concepts',
      tags: ['Quickstart', 'Advanced Config', 'Troubleshooting'],
      actionLabel: 'Watch Videos',
      active: false,
    },
    {
      icon: Book,
      title: 'Documentation',
      description: 'Read our comprehensive guides',
      tags: ['Getting Started', 'API Docs', 'Best Practices'],
      actionLabel: 'Read Docs',
      active: false,
    },
    {
      icon: Mail,
      title: 'Contact Support',
      description: 'Get help from our support team',
      tags: ['24/7 Support', 'Billing', 'Account Mgmt'],
      actionLabel: 'Contact Us',
      active: true,
      action: () => {
        window.location.href = 'mailto:support@example.com';
      },
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Banner - AT&T brand gradient, rounded-2xl */}
      {showBanner && (
        <div className="relative overflow-hidden bg-gradient-to-br from-[#0057b8] via-[#003d82] to-[#009fdb] rounded-2xl mb-8" style={{ minHeight: 304 }}>
          <div className="p-8 sm:p-10 flex flex-col justify-center h-full">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
              <div className="flex-1">
                {/* Badge tags with stroke on dark bg */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/15 text-[12px] font-medium text-white">
                    <Sparkles className="h-4 w-4" />
                    New Feature
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/15 text-[12px] font-medium text-white">
                    <Clock className="h-4 w-4" />
                    Limited Time Preview
                  </span>
                </div>

                <h2 className="text-[24px] font-bold text-white tracking-[-0.03em] mb-3">
                  Meet Niva, Your AI-grade network Assistant
                </h2>

                <p className="text-[14px] font-medium text-white/80 mb-6 max-w-2xl tracking-[-0.03em]">
                  Experience the future of network support with our AI-powered assistant. Get instant help with configuration, troubleshooting, and best practices.
                </p>

                {/* Feature tags on dark bg - semi-transparent white fill */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {['Natural language interactions', 'Real-time troubleshooting', 'Best practices guidance', 'Documentation search', 'Configuration assistance'].map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2 py-1 rounded-lg bg-white/15 text-[12px] font-medium text-white"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* CTA button - white pill with blue text */}
                <button
                  className="inline-flex items-center justify-center h-9 px-6 bg-white rounded-full text-figma-base font-medium text-fw-link hover:bg-white/90 transition-colors"
                  onClick={() => {
                    window.addToast({
                      type: 'info',
                      title: 'Coming Soon',
                      message: 'Niva will be available next month. Stay tuned!',
                      duration: 5000,
                    });
                  }}
                >
                  Start Conversation
                  <ChevronRight className="h-4 w-4 ml-1" />
                </button>
              </div>

              {/* Right side feature icons */}
              <div className="hidden lg:flex flex-col gap-3">
                {[
                  { icon: MessageCircle, label: 'Natural language interactions' },
                  { icon: Zap, label: 'Real-time troubleshooting' },
                  { icon: Shield, label: 'Configuration assistance' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/15">
                      <item.icon className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-[13px] font-medium text-white/80">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resource Cards Grid - 3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {helpCards.map((card) => {
          const Icon = card.icon;
          const isActive = card.active;

          return (
            <div
              key={card.title}
              className="flex flex-col bg-fw-base border border-fw-secondary rounded-2xl overflow-hidden"
              style={{ minHeight: 320 }}
            >
              <div className="flex-1 p-5">
                {/* Icon hub 40x40 with bg-fw-wash r=8 */}
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-fw-wash mb-4">
                  <Icon className={`h-5 w-5 ${isActive ? 'text-fw-link' : 'text-fw-disabled'}`} />
                </div>

                {/* Title + coming soon badge */}
                <div className="flex items-center gap-2 mb-2">
                  <h3 className={`text-figma-lg font-bold tracking-[-0.03em] ${isActive ? 'text-fw-heading' : 'text-fw-disabled'}`}>
                    {card.title}
                  </h3>
                  {!isActive && (
                    <span className="badge-coming-soon badge-coming-soon-purple">
                      Coming Soon
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className={`text-figma-base font-medium tracking-[-0.03em] mb-4 ${isActive ? 'text-fw-body' : 'text-fw-disabled'}`}>
                  {card.description}
                </p>

                {/* Tags row */}
                <div className="flex flex-wrap gap-2">
                  {card.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2 py-1 rounded-lg bg-fw-neutral text-figma-sm font-medium text-fw-body"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action button - full width pill at bottom */}
              <div className="px-5 pb-5">
                <button
                  className={`w-full flex items-center justify-center h-9 rounded-full text-[14px] font-medium transition-colors ${
                    isActive
                      ? 'text-fw-link hover:bg-fw-neutral border border-fw-secondary'
                      : 'text-fw-disabled border border-fw-secondary cursor-not-allowed'
                  }`}
                  onClick={() => {
                    if (isActive && card.action) {
                      card.action();
                    }
                  }}
                  disabled={!isActive}
                >
                  {card.actionLabel}
                  <ChevronRight className={`h-4 w-4 ml-1 ${isActive ? 'text-fw-link' : 'text-fw-disabled'}`} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
