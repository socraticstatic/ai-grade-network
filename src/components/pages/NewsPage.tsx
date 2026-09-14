import { Megaphone, ChevronRight, Calendar, Newspaper } from 'lucide-react';
import { Badge } from '../common/Badge';

type NewsCategory = 'maintenance' | 'feature' | 'upgrade' | 'security' | 'announcement';

interface NewsItem {
  id: string;
  date: string;
  title: string;
  category: NewsCategory;
  description: string;
}

const categoryConfig: Record<NewsCategory, { label: string; color: string; bg: string }> = {
  maintenance: { label: 'Maintenance',   color: '#ea712f', bg: 'rgba(234,113,47,0.16)' },
  feature:     { label: 'New Feature',   color: '#0057b8', bg: 'rgba(0,87,184,0.16)'  },
  upgrade:     { label: 'Upgrade',       color: '#2d7e24', bg: 'rgba(45,126,36,0.16)' },
  security:    { label: 'Security',      color: '#c70032', bg: 'rgba(199,0,50,0.16)'  },
  announcement:{ label: 'Announcement',  color: '#af29bb', bg: 'rgba(175,41,187,0.16)'},
};

const newsItems: NewsItem[] = [
  {
    id: '1',
    date: 'March 25, 2026',
    title: 'Scheduled Infrastructure Maintenance — Central Region',
    category: 'maintenance',
    description:
      'Planned maintenance on core routing infrastructure in the Central US region from 02:00–06:00 CT. Management portal and API hub will be temporarily unavailable. All active connections remain unaffected during the window.',
  },
  {
    id: '2',
    title: 'Network Designer Now Generally Available',
    date: 'March 18, 2026',
    category: 'feature',
    description:
      'The Network Designer tool has graduated from beta and is now available to all accounts. Design, validate, and provision multi-cloud topologies with drag-and-drop templates, a live validation engine, and PDF export.',
  },
  {
    id: '3',
    title: 'BGP Route Table Capacity Increased to 1M Prefixes',
    date: 'March 10, 2026',
    category: 'upgrade',
    description:
      'All NetBond hub instances have been upgraded to support up to 1 million BGP prefixes per VRF. No configuration changes are required. Updated capacity limits are reflected in the Hub detail pages.',
  },
  {
    id: '4',
    title: 'TLS 1.0 and 1.1 End-of-Support Notice',
    date: 'February 28, 2026',
    category: 'security',
    description:
      'Support for TLS 1.0 and TLS 1.1 on the NetBond management API and portal will end on April 30, 2026. All API integrations must migrate to TLS 1.2 or higher. Contact support if you need assistance auditing your integration stack.',
  },
  {
    id: '5',
    title: 'Azure ExpressRoute Locations Expanded — 8 New metros',
    date: 'February 14, 2026',
    category: 'announcement',
    description:
      'AT&T NetBond now supports direct connectivity to eight additional Azure ExpressRoute peering locations, including Seattle, Toronto, Amsterdam, and Singapore. New location options are immediately available in the connection wizard.',
  },
];

export function NewsPage() {
  return (
    <div className="max-w-4xl mx-auto py-4">
      {/* News content - header provided by SubNav wrapper */}
      <div>
      </div>

      {/* News List */}
      <div className="flex flex-col gap-4">
        {newsItems.length === 0 ? (
          <div className="text-center py-16">
            <Newspaper className="h-12 w-12 text-fw-bodyLight mx-auto mb-4" />
            <h3 className="text-figma-lg font-bold text-fw-heading mb-2">No announcements yet</h3>
            <p className="text-figma-base text-fw-bodyLight max-w-md mx-auto tracking-[-0.03em]">
              Check back later for platform updates, maintenance windows, and service announcements.
            </p>
          </div>
        ) : newsItems.map((item) => {
          const cat = categoryConfig[item.category];
          return (
            <article
              key={item.id}
              className="bg-fw-base rounded-2xl border border-fw-secondary p-6 flex flex-col sm:flex-row sm:items-start gap-4"
            >
              {/* Date column */}
              <div className="flex items-center gap-1.5 text-[12px] font-medium text-fw-bodyLight whitespace-nowrap sm:min-w-[140px] shrink-0">
                <Calendar className="h-3.5 w-3.5" />
                {item.date}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge color={cat.color} bg={cat.bg} size="md">
                    {cat.label}
                  </Badge>
                  <h2 className="text-[14px] font-semibold text-fw-heading tracking-[-0.03em]">
                    {item.title}
                  </h2>
                </div>
                <p className="text-[14px] font-medium text-fw-body tracking-[-0.03em] leading-relaxed">
                  {item.description}
                </p>
              </div>

              {/* Read More */}
              <div className="shrink-0 sm:self-center">
                <button
                  className="inline-flex items-center text-[13px] font-medium text-fw-link hover:text-fw-linkHover transition-colors whitespace-nowrap"
                  onClick={() => {
                    window.addToast?.({
                      type: 'info',
                      title: 'Full article coming soon',
                      message: item.title,
                      duration: 3000,
                    });
                  }}
                >
                  Read More
                  <ChevronRight className="h-4 w-4 ml-0.5" />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
