import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import attGlobe from '../assets/att-globe-transparent.svg';
import {
  Search, ArrowRight, Globe, Network, Shield, Code, Layers,
  Wrench, Bell, CheckCircle2, Activity, ChevronRight, ExternalLink
} from 'lucide-react';
import { MarketplaceItem } from '../types/connection';
import { AttIcon } from './icons/AttIcon';

interface MarketplaceProps {
  onSelectItem: (item: MarketplaceItem) => void;
}

// ─── Category Nav ──────────────────────────────────────────────────────────────

type CategoryId =
  | 'max-resiliency'
  | 'private-connect'
  | 'internet'
  | 'security'
  | 'vnf'
  | 'apis'
  | 'managed';

interface NavCategory {
  id: CategoryId;
  label: string;
  count: number;
  isNew?: boolean;
  icon: React.ReactNode;
}

const NAV_CATEGORIES: NavCategory[] = [
  { id: 'max-resiliency', label: 'Max Resiliency', count: 4, isNew: true,
    icon: <AttIcon name="high-meter" className="h-4 w-4" /> },
  { id: 'private-connect', label: 'Private Connect', count: 4,
    icon: <AttIcon name="cable" className="h-4 w-4" /> },
  { id: 'internet', label: 'Internet Services', count: 3,
    icon: <Globe className="h-4 w-4" /> },
  { id: 'security', label: 'Security', count: 5,
    icon: <AttIcon name="check-shield" className="h-4 w-4" /> },
  { id: 'vnf', label: 'Virtual Network Functions', count: 4,
    icon: <Layers className="h-4 w-4" /> },
  { id: 'apis', label: 'APIs & Automation', count: 3,
    icon: <AttIcon name="apis" className="h-4 w-4" /> },
  { id: 'managed', label: 'Managed Services', count: 4,
    icon: <Wrench className="h-4 w-4" /> },
];

const CATEGORY_META: Record<CategoryId, { title: string; description: string }> = {
  'max-resiliency': {
    title: 'Max Resiliency',
    description: 'Four independent paths across two diverse datacenter sites. 99.99%+ uptime through path-level failover — not connection-level redundancy.',
  },
  'private-connect': {
    title: 'Private Connect',
    description: 'Dedicated private network connections to major cloud providers over the AT&T MPLS backbone.',
  },
  'internet': {
    title: 'Internet Services',
    description: 'High-performance public internet access with built-in DDoS protection and burstable bandwidth options.',
  },
  'security': {
    title: 'Security',
    description: 'Add-on security services: DDoS mitigation, managed firewall, SIEM, and cloud-based threat protection.',
  },
  'vnf': {
    title: 'Virtual Network Functions',
    description: 'Partner-certified virtual appliances deployed on AT&T infrastructure — Palo Alto, Cisco, Fortinet, and F5.',
  },
  'apis': {
    title: 'APIs & Automation',
    description: 'Programmatic access to network telemetry, provisioning automation, and billing data via REST API.',
  },
  'managed': {
    title: 'Managed Services',
    description: 'Fully managed network and security services with 24/7 NOC monitoring and SLA-backed performance.',
  },
};

// ─── LMCC Products ─────────────────────────────────────────────────────────────

type LmccStatus = 'live' | 'coming' | 'roadmap';

interface LmccProduct {
  id: string;
  provider: string;
  name: string;
  status: LmccStatus;
  statusLabel: string;
  hook: string;
  speeds: string;
  ctaLabel: string;
  logo: string;
  logoHeight?: string;
  variant?: 'build' | 'paste' | 'aws-handoff';
}

const LMCC_PRODUCTS: LmccProduct[] = [
  {
    id: 'lmcc-aws-build',
    provider: 'Amazon Web Services',
    name: 'Start setup',
    status: 'live',
    statusLabel: 'Live · GA',
    hook: 'Start here, then finish setup in the AWS Direct Connect console.',
    speeds: '1 – 100 Gbps',
    ctaLabel: 'Get a key',
    logo: attGlobe,
    logoHeight: 'h-10',
    variant: 'build',
  },
  {
    id: 'lmcc-aws-handoff',
    provider: 'Amazon Web Services',
    name: 'I need to get a key',
    status: 'live',
    statusLabel: 'Live · GA',
    hook: "Don't have an Activation Key yet? Open the AWS Direct Connect console to create your connection. We'll be here with the paste field when you're back.",
    speeds: '1 – 100 Gbps',
    ctaLabel: 'Walk me through it',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg',
    logoHeight: 'h-8',
    variant: 'aws-handoff',
  },
  {
    id: 'lmcc-aws-paste',
    provider: 'Amazon Web Services',
    name: 'Finish setup',
    status: 'live',
    statusLabel: 'Live · GA',
    hook: 'Complete a connection you started in the AWS Direct Connect console.',
    speeds: '1 – 100 Gbps',
    ctaLabel: 'Paste a key',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg',
    logoHeight: 'h-8',
    variant: 'paste',
  },
];

const LMCC_ARCH_STATS = [
  { label: '4 paths', sub: 'per connection' },
  { label: '2 data centers', sub: 'diverse sites' },
  { label: '900ms', sub: 'failover detection' },
  { label: '99.99%+', sub: 'uptime SLA' },
];

// ─── Standard Products ─────────────────────────────────────────────────────────

interface StandardItem {
  id: string;
  name: string;
  provider: string;
  categoryId: CategoryId;
  description: string;
  uptime: string;
  latency: string;
  support: string;
  basePrice: number;
  priceUnit: string;
  tags: string[];
  ctaLabel: string;
  icon: React.ReactNode;
}

const STANDARD_ITEMS: StandardItem[] = [
  // Private Connect
  { id: 'att-netbond', name: 'NetBond for Cloud', provider: 'AT&T', categoryId: 'private-connect',
    description: 'Private, secure MPLS backbone to AWS, Azure, GCP, and Oracle Cloud.',
    uptime: '99.99%', latency: '<5ms', support: '24/7', basePrice: 500, priceUnit: '/mo',
    tags: ['MPLS', 'Multi-Cloud'], ctaLabel: 'Get Started',
    icon: <AttIcon name="hub" className="h-5 w-5 text-fw-link" /> },
  { id: 'aws-direct', name: 'AT&T Interconnect – last mile', provider: 'AT&T', categoryId: 'private-connect',
    description: 'Dedicated network connection with low, consistent latency to AT&T cloud services.',
    uptime: '99.99%', latency: '<5ms', support: '24/7', basePrice: 100, priceUnit: '/mo',
    tags: ['AWS', 'Dedicated'], ctaLabel: 'Get Started',
    icon: <AttIcon name="cable" className="h-5 w-5 text-fw-link" /> },
  { id: 'azure-express', name: 'AT&T ExpressRoute', provider: 'AT&T', categoryId: 'private-connect',
    description: 'Private connection to Microsoft Azure with global reach and redundant paths.',
    uptime: '99.95%', latency: '<5ms', support: '24/7', basePrice: 100, priceUnit: '/mo',
    tags: ['Azure', 'Global'], ctaLabel: 'Get Started',
    icon: <AttIcon name="cable" className="h-5 w-5 text-fw-link" /> },
  { id: 'private-connect', name: 'Private Connect', provider: 'AT&T', categoryId: 'private-connect',
    description: 'Dedicated private network with end-to-end encryption and custom routing policy.',
    uptime: '99.999%', latency: '<2ms', support: '24/7', basePrice: 200, priceUnit: '/mo',
    tags: ['Dedicated', 'Encrypted'], ctaLabel: 'Get Started',
    icon: <Network className="h-5 w-5 text-fw-link" /> },

  // Internet
  { id: 'internet-to-cloud', name: 'Internet to Cloud', provider: 'Multi-Cloud', categoryId: 'internet',
    description: 'High-performance internet connectivity with DDoS protection and web application firewall.',
    uptime: '99.99%', latency: '<10ms', support: '24/7', basePrice: 40, priceUnit: '/mo',
    tags: ['DDoS', 'WAF'], ctaLabel: 'Get Started',
    icon: <Globe className="h-5 w-5 text-fw-link" /> },
  { id: 'enhanced-internet', name: 'Enhanced Internet', provider: 'AT&T', categoryId: 'internet',
    description: 'Burstable bandwidth up to 10 Gbps with built-in DDoS scrubbing and BGP routing support.',
    uptime: '99.95%', latency: '<15ms', support: '24/7', basePrice: 150, priceUnit: '/mo',
    tags: ['Burstable', 'BGP'], ctaLabel: 'Get Started',
    icon: <Globe className="h-5 w-5 text-fw-link" /> },
  { id: 'dedicated-internet', name: 'Dedicated Internet', provider: 'AT&T', categoryId: 'internet',
    description: 'Symmetrical guaranteed bandwidth with dual-stack IPv4/IPv6 and proactive monitoring.',
    uptime: '99.99%', latency: '<10ms', support: '24/7', basePrice: 300, priceUnit: '/mo',
    tags: ['Symmetrical', 'IPv6'], ctaLabel: 'Get Started',
    icon: <Globe className="h-5 w-5 text-fw-link" /> },

  // Security
  { id: 'att-ddos-defense', name: 'AT&T DDoS Defense', provider: 'AT&T', categoryId: 'security',
    description: 'Carrier-grade volumetric DDoS detection and mitigation at network edge. Always-on or on-demand.',
    uptime: '99.99%', latency: '<2ms', support: '24/7', basePrice: 400, priceUnit: '/mo',
    tags: ['Add-on', 'Carrier-grade'], ctaLabel: 'Add to Connection',
    icon: <AttIcon name="check-shield" className="h-5 w-5 text-fw-link" /> },
  { id: 'att-managed-firewall', name: 'AT&T Managed Firewall', provider: 'AT&T', categoryId: 'security',
    description: 'Fully managed next-gen firewall with intrusion prevention, URL filtering, and 24/7 SOC.',
    uptime: '99.99%', latency: '<3ms', support: '24/7', basePrice: 450, priceUnit: '/mo',
    tags: ['Add-on', 'SOC'], ctaLabel: 'Add to Connection',
    icon: <AttIcon name="check-shield" className="h-5 w-5 text-fw-link" /> },
  { id: 'att-threat-manager', name: 'Threat Manager', provider: 'AT&T', categoryId: 'security',
    description: 'Unified SIEM, vulnerability scanning, asset discovery, and compliance reporting for PCI and HIPAA.',
    uptime: '99.99%', latency: '<5ms', support: '24/7', basePrice: 550, priceUnit: '/mo',
    tags: ['Add-on', 'SIEM', 'Compliance'], ctaLabel: 'Add to Connection',
    icon: <Shield className="h-5 w-5 text-fw-link" /> },
  { id: 'att-internet-protect', name: 'Internet Protect', provider: 'AT&T', categoryId: 'security',
    description: 'Cloud-based secure web hub with DNS filtering and malware protection — no hardware required.',
    uptime: '99.9%', latency: '<10ms', support: '24/7', basePrice: 200, priceUnit: '/mo',
    tags: ['Add-on', 'DNS', 'Cloud'], ctaLabel: 'Add to Connection',
    icon: <Shield className="h-5 w-5 text-fw-link" /> },
  { id: 'dynamic-defense', name: 'Dynamic Defense', provider: 'AT&T', categoryId: 'security',
    description: 'Real-time DDoS mitigation with Layer 3–7 protection, threat intelligence, and automated response.',
    uptime: '99.99%', latency: '<2ms', support: '24/7', basePrice: 250, priceUnit: '/mo',
    tags: ['Add-on', 'L3–L7'], ctaLabel: 'Add to Connection',
    icon: <Shield className="h-5 w-5 text-fw-link" /> },

  // VNF
  { id: 'vnf-palo-alto', name: 'VM-Series Firewall', provider: 'Palo Alto Networks', categoryId: 'vnf',
    description: 'ML-powered next-generation firewall with WildFire malware analysis and SSL decryption.',
    uptime: '99.99%', latency: '<5ms', support: '24/7', basePrice: 1500, priceUnit: '/mo',
    tags: ['Partner Certified'], ctaLabel: 'Add to Connection',
    icon: <Layers className="h-5 w-5 text-fw-link" /> },
  { id: 'vnf-cisco-sdwan', name: 'Viptela SD-WAN', provider: 'Cisco', categoryId: 'vnf',
    description: 'Application-aware routing with zero-touch provisioning, multi-cloud, and integrated security.',
    uptime: '99.99%', latency: '<8ms', support: '24/7', basePrice: 2000, priceUnit: '/mo',
    tags: ['Partner Certified'], ctaLabel: 'Add to Connection',
    icon: <Layers className="h-5 w-5 text-fw-link" /> },
  { id: 'vnf-fortinet', name: 'FortiGate Virtual Firewall', provider: 'Fortinet', categoryId: 'vnf',
    description: 'High-performance virtual security appliance with IPS/IDS, web filtering, and VPN gateway.',
    uptime: '99.99%', latency: '<6ms', support: '24/7', basePrice: 1200, priceUnit: '/mo',
    tags: ['Partner Certified'], ctaLabel: 'Add to Connection',
    icon: <Layers className="h-5 w-5 text-fw-link" /> },
  { id: 'vnf-f5', name: 'BIG-IP Virtual Edition', provider: 'F5 Networks', categoryId: 'vnf',
    description: 'Advanced application delivery and load balancing with SSL offloading and health monitoring.',
    uptime: '99.99%', latency: '<4ms', support: '24/7', basePrice: 1800, priceUnit: '/mo',
    tags: ['Partner Certified'], ctaLabel: 'Add to Connection',
    icon: <Layers className="h-5 w-5 text-fw-link" /> },

  // APIs
  { id: 'api-network-insights', name: 'Network Insights API', provider: 'AT&T', categoryId: 'apis',
    description: 'Real-time network telemetry, historical data, and webhook notifications via REST API.',
    uptime: '99.9%', latency: '<50ms', support: 'Business Hrs', basePrice: 500, priceUnit: '/mo',
    tags: ['REST', 'Webhooks'], ctaLabel: 'Get Started',
    icon: <Code className="h-5 w-5 text-fw-link" /> },
  { id: 'api-provisioning', name: 'Network Provisioning API', provider: 'AT&T', categoryId: 'apis',
    description: 'Automate network configuration, track changes, rollback, and access full audit logs.',
    uptime: '99.9%', latency: '<100ms', support: 'Business Hrs', basePrice: 750, priceUnit: '/mo',
    tags: ['REST', 'DevOps'], ctaLabel: 'Get Started',
    icon: <Code className="h-5 w-5 text-fw-link" /> },
  { id: 'api-billing', name: 'Billing & Usage API', provider: 'AT&T', categoryId: 'apis',
    description: 'Programmatic access to usage reports, cost allocation, invoice details, and budget alerts.',
    uptime: '99.9%', latency: '<100ms', support: 'Business Hrs', basePrice: 300, priceUnit: '/mo',
    tags: ['REST', 'Finance'], ctaLabel: 'Get Started',
    icon: <Code className="h-5 w-5 text-fw-link" /> },

  // Managed
  { id: 'managed-sase', name: 'Managed SASE', provider: 'AT&T', categoryId: 'managed',
    description: 'Zero Trust Network Access with cloud-native security, SWG, and CASB — fully managed.',
    uptime: '99.99%', latency: '<10ms', support: '24/7', basePrice: 3500, priceUnit: '/mo',
    tags: ['Zero Trust', 'CASB'], ctaLabel: 'Get Started',
    icon: <Wrench className="h-5 w-5 text-fw-link" /> },
  { id: 'att-sd-wan', name: 'AT&T SD-WAN', provider: 'AT&T', categoryId: 'managed',
    description: 'Application-aware path selection over MPLS, broadband, and LTE with zero-touch provisioning.',
    uptime: '99.99%', latency: '<10ms', support: '24/7', basePrice: 800, priceUnit: '/mo',
    tags: ['Multi-transport', 'ZTP'], ctaLabel: 'Get Started',
    icon: <Network className="h-5 w-5 text-fw-link" /> },
  { id: 'att-flexware', name: 'AT&T FlexWare', provider: 'AT&T', categoryId: 'managed',
    description: 'Universal CPE platform running multiple VNFs on white-box hardware with remote lifecycle management.',
    uptime: '99.99%', latency: '<5ms', support: '24/7', basePrice: 600, priceUnit: '/mo',
    tags: ['uCPE', 'VNF'], ctaLabel: 'Get Started',
    icon: <Wrench className="h-5 w-5 text-fw-link" /> },
  { id: 'network-monitoring', name: 'Advanced Network Monitoring', provider: 'AT&T', categoryId: 'managed',
    description: 'Real-time monitoring, performance analytics, alerting, and custom reports with historical trends.',
    uptime: '99.9%', latency: '<10ms', support: '24/7', basePrice: 400, priceUnit: '/mo',
    tags: ['Add-on', 'Analytics'], ctaLabel: 'Add to Connection',
    icon: <Activity className="h-5 w-5 text-fw-link" /> },
];

// ─── Component ─────────────────────────────────────────────────────────────────

export function Marketplace({ onSelectItem }: MarketplaceProps) {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<CategoryId>('max-resiliency');
  const [searchQuery, setSearchQuery] = useState('');
  const [notifySubmitted, setNotifySubmitted] = useState<Record<string, boolean>>({});

  const meta = CATEGORY_META[activeCategory];
  const isSearching = searchQuery.trim().length > 0;
  const q = searchQuery.toLowerCase();

  // Cross-category search results
  const searchResults = isSearching
    ? STANDARD_ITEMS.filter(item =>
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.provider.toLowerCase().includes(q) ||
        item.tags.some(t => t.toLowerCase().includes(q))
      )
    : [];

  // Current category items (used when not searching)
  const categoryItems = STANDARD_ITEMS.filter(item => item.categoryId === activeCategory);

  const visibleItems = isSearching ? searchResults : categoryItems;
  const showLmcc = !isSearching && activeCategory === 'max-resiliency';

  const handleStandardCta = () => navigate('/create');
  const handleNotify = (id: string) => setNotifySubmitted(prev => ({ ...prev, [id]: true }));

  return (
    <div className="flex gap-0">

      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <aside className="w-[200px] shrink-0 border-r border-fw-secondary pr-4 flex flex-col gap-5 animate-in fade-in slide-in-from-left duration-300">

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-fw-disabled pointer-events-none" />
          <input
            type="text"
            placeholder="Search features..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 bg-fw-wash border border-fw-secondary rounded-lg text-figma-sm text-fw-body placeholder:text-fw-disabled focus:outline-none focus:ring-2 focus:ring-fw-active focus:border-transparent transition-all"
          />
        </div>

        {/* Nav */}
        <nav className="space-y-0.5">
          <p className="px-3 mb-2 text-tag-xs font-semibold text-fw-disabled uppercase tracking-wider">
            Features
          </p>
          {NAV_CATEGORIES.map(cat => {
            const isActive = !isSearching && activeCategory === cat.id;
            // Only Max Resiliency is built out in this mock; gray out everything else
            const isAvailable = cat.id === 'max-resiliency';
            return (
              <button
                key={cat.id}
                onClick={() => { if (!isAvailable) return; setActiveCategory(cat.id); setSearchQuery(''); }}
                disabled={!isAvailable}
                className={`
                  w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all duration-150
                  ${!isAvailable
                    ? 'text-fw-disabled cursor-not-allowed opacity-50'
                    : isActive
                      ? 'bg-fw-cobalt-100 text-fw-link'
                      : 'text-fw-body hover:bg-fw-wash hover:text-fw-heading'
                  }
                `}
              >
                <span className={`flex-shrink-0 ${!isAvailable ? 'text-fw-disabled' : isActive ? 'text-fw-link' : 'text-fw-disabled'}`}>
                  {cat.icon}
                </span>
                <span className={`flex-1 min-w-0 text-figma-sm font-medium leading-snug truncate ${!isAvailable ? 'text-fw-disabled' : isActive ? 'text-fw-link' : ''}`}>
                  {cat.label}
                </span>
                {cat.isNew && isAvailable && (
                  <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-tag-xs font-bold bg-fw-successLight text-fw-success uppercase tracking-wider">
                    New
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ── Main Content ───────────────────────────────────────────────────── */}
      <div className="flex-1 pl-8 min-w-0 space-y-7 animate-in fade-in duration-300">

        {/* Page header */}
        <div className="flex items-start justify-between gap-6">
          <div>
            {isSearching ? (
              <>
                <h1 className="text-figma-2xl font-bold text-fw-heading tracking-[-0.03em]">
                  Search results
                </h1>
                <p className="mt-1 text-figma-base text-fw-bodyLight">
                  {searchResults.length} product{searchResults.length !== 1 ? 's' : ''} matching
                  {' '}<span className="font-medium text-fw-body">"{searchQuery}"</span>
                </p>
              </>
            ) : (
              <>
                <h1 className="text-figma-2xl font-bold text-fw-heading tracking-[-0.03em]">
                  {meta.title}
                </h1>
                {activeCategory !== 'max-resiliency' && (
                  <p className="mt-1 text-figma-base text-fw-bodyLight max-w-2xl leading-relaxed">
                    {meta.description}
                  </p>
                )}
              </>
            )}
          </div>
          {isSearching && (
            <button
              onClick={() => setSearchQuery('')}
              className="flex-shrink-0 mt-1 text-figma-sm text-fw-link hover:underline"
            >
              Clear search
            </button>
          )}
        </div>

        {/* ── Max Resiliency: LMCC Premium Section ─────────────────────────── */}
        {showLmcc && (
          <div className="space-y-4">

            {/* LMCC product cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {LMCC_PRODUCTS.map(product => {
                const isLive = product.status === 'live';
                const isComing = product.status === 'coming';
                const isRoadmap = product.status === 'roadmap';
                const didNotify = notifySubmitted[product.id];

                return (
                  <div
                    key={product.id}
                    className={`
                      rounded-2xl border flex flex-col transition-all duration-200
                      ${isLive && product.variant === 'build'
                        ? 'bg-fw-cobalt-100/50 border-fw-active/30 hover:border-fw-active hover:shadow-sm'
                        : isLive
                        ? 'bg-fw-base border-fw-secondary hover:border-fw-active hover:shadow-sm'
                        : 'bg-fw-base border-fw-secondary opacity-70'
                      }
                    `}
                  >
                    {/* Logo zone */}
                    <div className={`flex items-center justify-between px-5 h-20 border-b ${isLive ? 'border-fw-active/20' : 'border-fw-secondary'}`}>
                      <img
                        src={product.logo}
                        alt={product.provider}
                        className={`${product.logoHeight || 'h-8'} w-auto object-contain ${isLive ? '' : 'grayscale'}`}
                      />
                      <div className={`
                        px-2.5 py-1 rounded-full text-tag-xs font-bold uppercase tracking-wider whitespace-nowrap
                        ${isLive ? 'bg-fw-successLight text-fw-success' : ''}
                        ${isComing ? 'bg-fw-infoLight text-fw-info' : ''}
                        ${isRoadmap ? 'bg-fw-neutral text-fw-disabled' : ''}
                      `}>
                        {product.statusLabel}
                      </div>
                    </div>

                    {/* Name + hook */}
                    <div className="px-5 pt-4 pb-3">
                      <div className="text-figma-lg font-bold text-fw-heading leading-tight">{product.name}</div>
                      <p className={`text-figma-sm mt-1.5 leading-relaxed ${isLive ? 'text-fw-body' : 'text-fw-bodyLight'}`}>
                        {product.hook}
                      </p>
                    </div>

                    {/* Metrics */}
                    <div className="px-5 py-4 flex-1">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                        {[
                          { label: 'Uptime SLA', value: '99.99%+', highlight: isLive },
                          { label: 'Failover', value: '900ms', highlight: false },
                          { label: 'Paths', value: '4 independent', highlight: false },
                          { label: 'Bandwidth', value: product.speeds, highlight: false, muted: isRoadmap },
                        ].map(m => (
                          <div key={m.label}>
                            <div className="text-tag-xs text-fw-disabled font-medium uppercase tracking-wider">{m.label}</div>
                            <div className={`text-figma-sm font-bold mt-0.5 ${
                              m.muted ? 'text-fw-disabled' :
                              m.highlight ? 'text-fw-success' :
                              'text-fw-heading'
                            }`}>{m.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* CTA */}
                    <div className="px-5 pb-5">
                      {isLive && product.variant === 'paste' && (
                        <button
                          onClick={() => navigate('/create', { state: { mode: 'paste-key' } })}
                          className="group w-full flex items-center justify-center gap-2.5 h-10 px-4 rounded-full text-white text-figma-sm font-semibold transition-all duration-300 hover:shadow-[0_4px_20px_rgba(35,47,62,0.45)] hover:scale-[1.02] active:scale-[0.98]"
                          style={{ background: '#232F3E' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#1a2433')}
                          onMouseLeave={e => (e.currentTarget.style.background = '#232F3E')}
                        >
                          Paste a key
                        </button>
                      )}
                      {isLive && product.variant === 'aws-handoff' && (
                        <button
                          onClick={() => navigate('/create', { state: { mode: 'paste-key', awsHandoff: true } })}
                          className="group w-full flex items-center justify-center gap-2.5 h-10 px-4 rounded-full text-white text-figma-sm font-semibold transition-all duration-300 hover:shadow-[0_4px_20px_rgba(35,47,62,0.45)] hover:scale-[1.02] active:scale-[0.98]"
                          style={{ background: '#232F3E' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#1a2433')}
                          onMouseLeave={e => (e.currentTarget.style.background = '#232F3E')}
                        >
                          {product.ctaLabel}
                          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                        </button>
                      )}
                      {isLive && product.variant === 'build' && (
                        <button
                          onClick={() => navigate('/create', {
                            state: {
                              initialStep: 6,
                              selectedProviders: ['AWS'],
                              resiliencyLevel: 'maximum',
                              selectedConnectionType: 'Internet to Cloud',
                              selectedLocations: { AWS: ['metro-sj'] },
                              bandwidthSettings: { 'AWS-lmcc': 1000 },
                              mode: 'step-by-step',
                            },
                          })}
                          className="w-full flex items-center justify-center gap-2 h-10 px-4 rounded-full bg-fw-primary text-white text-figma-sm font-semibold hover:bg-fw-ctaPrimaryHover active:scale-[0.98] transition-all duration-150"
                        >
                          {product.ctaLabel}
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      )}
                      {isComing && (
                        didNotify ? (
                          <div className="w-full flex items-center justify-center gap-2 h-10 px-4 rounded-full bg-fw-wash border border-fw-secondary text-figma-sm font-medium text-fw-success">
                            <CheckCircle2 className="h-4 w-4" />
                            You're on the list
                          </div>
                        ) : (
                          <button
                            onClick={() => handleNotify(product.id)}
                            className="w-full flex items-center justify-center gap-2 h-10 px-4 rounded-full border border-fw-secondary bg-fw-base text-fw-body text-figma-sm font-medium hover:bg-fw-wash hover:border-fw-link hover:text-fw-link transition-colors duration-150"
                          >
                            <Bell className="h-4 w-4" />
                            {product.ctaLabel}
                          </button>
                        )
                      )}
                      {isRoadmap && (
                        <button
                          disabled
                          className="w-full flex items-center justify-center h-10 px-4 rounded-full bg-fw-neutral border border-fw-secondary text-fw-disabled text-figma-sm font-medium cursor-not-allowed"
                        >
                          {product.ctaLabel}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Standard Product Grid ─────────────────────────────────────────── */}
        {visibleItems.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {visibleItems.map(item => (
              <div
                key={item.id}
                className="group bg-fw-base rounded-2xl border border-fw-secondary hover:shadow-sm hover:border-fw-link/30 transition-all duration-200 flex flex-col"
              >
                {/* Card body */}
                <div className="p-5 flex-1">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-fw-wash border border-fw-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="text-figma-base font-semibold text-fw-heading leading-tight group-hover:text-fw-link transition-colors duration-150">
                        {item.name}
                      </div>
                      <div className="text-figma-sm text-fw-disabled mt-0.5">{item.provider}</div>
                    </div>
                  </div>

                  <p className="text-figma-sm text-fw-body leading-relaxed">
                    {item.description}
                  </p>

                  {/* SLA strip */}
                  <div className="mt-4 grid grid-cols-3 rounded-lg bg-fw-wash border border-fw-secondary overflow-hidden">
                    {[
                      { label: 'Uptime', value: item.uptime },
                      { label: 'Latency', value: item.latency },
                      { label: 'Support', value: item.support },
                    ].map((s, i) => (
                      <div key={s.label} className={`px-3 py-2 text-center ${i < 2 ? 'border-r border-fw-secondary' : ''}`}>
                        <div className="text-figma-sm font-bold text-fw-heading">{s.value}</div>
                        <div className="text-tag-xs text-fw-disabled mt-0.5">{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Category breadcrumb when searching */}
                  {isSearching && (
                    <div className="mt-3 flex items-center gap-1 text-tag-xs text-fw-disabled">
                      <span>{CATEGORY_META[item.categoryId].title}</span>
                    </div>
                  )}

                  {/* Tags */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {item.tags.map(tag => (
                      <span key={tag} className="px-2 py-0.5 rounded-full bg-fw-neutral text-tag-xs font-medium text-fw-bodyLight">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Card footer */}
                <div className="px-5 pb-5 mt-auto border-t border-fw-secondary pt-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-tag-xs text-fw-disabled uppercase tracking-wider font-medium">Starting at</div>
                    <div className="text-figma-lg font-bold text-fw-heading mt-0.5">
                      ${item.basePrice.toLocaleString()}
                      <span className="text-figma-sm font-normal text-fw-disabled">{item.priceUnit}</span>
                    </div>
                  </div>
                  <button
                    onClick={handleStandardCta}
                    className="flex items-center gap-1.5 px-4 h-9 rounded-full bg-fw-cobalt-100 text-fw-link text-figma-sm font-semibold hover:bg-fw-primary hover:text-white active:scale-[0.97] transition-all duration-150 flex-shrink-0 whitespace-nowrap"
                  >
                    {item.ctaLabel}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty search state */}
        {isSearching && searchResults.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-figma-base font-medium text-fw-heading">
              No products match <span className="text-fw-bodyLight">"{searchQuery}"</span>
            </p>
            <button
              className="mt-2 text-figma-sm text-fw-link hover:underline"
              onClick={() => setSearchQuery('')}
            >
              Clear search
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
