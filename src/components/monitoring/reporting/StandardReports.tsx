import { useState, useMemo } from 'react';
import { FileText, Download, Calendar, TrendingUp, Activity, DollarSign, Shield, Eye, ChevronDown, LayoutGrid, List, X } from 'lucide-react';
import attGlobe from '../../../assets/att-globe-transparent.svg';
import { Button } from '../../common/Button';
import { SearchFilterBar } from '../../common/SearchFilterBar';
import { TableFilterPanel, useTableFilters, FilterGroup } from '../../common/TableFilterPanel';
import { DataTable } from '../../common/DataTable';
import { Modal } from '../../common/Modal';
import { useMonitoring } from '../context/MonitoringContext';

interface Report {
  id: string;
  name: string;
  description: string;
  category: 'performance' | 'security' | 'billing' | 'operations';
  lastGenerated: string | null;
  frequency: 'on-demand' | 'daily' | 'weekly' | 'monthly';
  format: 'PDF' | 'CSV' | 'Excel' | 'JSON';
  size?: string;
  status: 'ready' | 'generating' | 'stale';
}

const availableReports: Report[] = [
  {
    id: 'report-1-connection-inventory',
    name: 'Connection Inventory & Segmentation',
    description: 'Total NetBond connections with breakdown by type (Cloud to Cloud, Internet to Cloud, Site to Cloud, VPN to Cloud, Datacenter to Cloud), bandwidth tiers, data center regions, cloud providers (AWS, Azure, Google, Oracle), Infrastructure Provider Edge Router (IPE), and average connections per customer',
    category: 'operations',
    lastGenerated: '2024-03-10T15:30:00Z',
    frequency: 'weekly',
    format: 'Excel',
    size: '2.1 MB',
    status: 'ready'
  },
  {
    id: 'report-2-ipe-capacity',
    name: 'IPE Capacity & Data Center Analysis',
    description: 'Total Infrastructure Provider Edge Router (IPE) by data center provider (Cisco Jasper, Equinix, Databank, CoreWeave) and region with cloud provider on-ramp counts, total installed capacity per IPE, Links per IPE, VNFs per IPE, and utilization for capacity planning',
    category: 'operations',
    lastGenerated: '2024-03-10T14:00:00Z',
    frequency: 'weekly',
    format: 'Excel',
    size: '1.9 MB',
    status: 'ready'
  },
  {
    id: 'report-3-utilization-analysis',
    name: 'Connection & Hub Utilization Analysis',
    description: 'Connection utilization per IPE with Hub aggregation showing total Links per Hub, VNFs per Link, installed capacity, average and max utilization at busiest hour, aggregated per site, data center provider, and portal level',
    category: 'performance',
    lastGenerated: '2024-03-10T12:00:00Z',
    frequency: 'daily',
    format: 'Excel',
    size: '3.4 MB',
    status: 'ready'
  },
  {
    id: 'report-4-weekly-trends',
    name: 'Weekly Connection Trends',
    description: 'Weekly trends showing new connections added per week/site/provider, newly added customers per IPE and provider, upgraded/downgraded connections by MBC, deactivated connections, with trend visualization',
    category: 'operations',
    lastGenerated: '2024-03-10T08:00:00Z',
    frequency: 'weekly',
    format: 'PDF',
    size: '2.8 MB',
    status: 'ready'
  },
  {
    id: 'report-5-revenue-metrics',
    name: 'Revenue & Financial Metrics',
    description: 'Total revenue per month for NetBond with last 12 months trend, total billed connections per month, average revenue per connection trends, average MBC trends, and average utilization of all aggregated connections',
    category: 'billing',
    lastGenerated: '2024-03-01T00:00:00Z',
    frequency: 'monthly',
    format: 'Excel',
    size: '2.5 MB',
    status: 'ready'
  },
  {
    id: 'report-6-service-reliability',
    name: 'Service Reliability & Link Status',
    description: 'Total aggregated Links for NetBond, active/inactive/deactivated connections, active/inactive Links, connections impacted per site/region due to service disruption, and average minutes of service disruption',
    category: 'operations',
    lastGenerated: '2024-03-10T10:00:00Z',
    frequency: 'weekly',
    format: 'PDF',
    size: '1.7 MB',
    status: 'ready'
  },
  {
    id: 'report-7-customer-detail',
    name: 'Per Customer Connection Report',
    description: 'Individual customer report showing my connections (active/inactive/deactivated), connection size and number of Links per connection, breakdown by provider and cloud region location, geographic regions, and utilization (average and max)',
    category: 'operations',
    lastGenerated: '2024-03-10T09:00:00Z',
    frequency: 'on-demand',
    format: 'PDF',
    size: '1.2 MB',
    status: 'ready'
  },
  {
    id: 'report-8-customer-analytics',
    name: 'Customer Count & Analytics (PM Report)',
    description: 'Total number of customers by geographic region, net adds per month, average connections per customer per region, average spend per month per customer, and average spend per connection overall (ARPU)',
    category: 'billing',
    lastGenerated: '2024-03-08T16:30:00Z',
    frequency: 'monthly',
    format: 'Excel',
    size: '1.8 MB',
    status: 'ready'
  },
  {
    id: 'report-9-arpc-analysis',
    name: 'ARPC & Revenue Per Connection Analysis',
    description: 'Average Revenue Per Connection (ARPC) breakdown by connection type, provider, region, and bandwidth tier with month-over-month trends and revenue optimization opportunities',
    category: 'billing',
    lastGenerated: '2024-03-10T14:30:00Z',
    frequency: 'monthly',
    format: 'Excel',
    size: '2.3 MB',
    status: 'ready'
  },
  {
    id: 'report-10-mbc-cost',
    name: 'MBC Cost Analysis & Optimization',
    description: 'Maximum Billable Capacity (MBC) analysis showing current MBC per connection, actual utilization vs MBC, cost per Gbps, upgrade/downgrade recommendations, and potential cost savings',
    category: 'billing',
    lastGenerated: '2024-03-10T12:15:00Z',
    frequency: 'weekly',
    format: 'Excel',
    size: '2.7 MB',
    status: 'ready'
  },
  {
    id: 'report-11-provider-cost',
    name: 'Provider Cost Comparison & Analysis',
    description: 'Cost comparison across providers (AWS, Azure, Google, Oracle) by region, connection type, bandwidth tier, total spend per provider, ARPC by provider, and cost efficiency metrics',
    category: 'billing',
    lastGenerated: '2024-03-09T10:00:00Z',
    frequency: 'monthly',
    format: 'PDF',
    size: '1.9 MB',
    status: 'ready'
  },
  {
    id: 'report-12-ipe-revenue',
    name: 'IPE Revenue & Profitability Analysis',
    description: 'Total revenue per IPE, revenue per region, capacity utilization impact on revenue, installed capacity ROI, and IPE profitability rankings',
    category: 'billing',
    lastGenerated: '2024-03-08T08:30:00Z',
    frequency: 'monthly',
    format: 'Excel',
    size: '2.4 MB',
    status: 'ready'
  },
  {
    id: 'report-13-cost-forecast',
    name: 'Revenue Forecast & Growth Projections',
    description: 'Revenue forecasting based on historical trends, new connection pipeline, MBC upgrade trends, customer growth projections, and 12-month revenue outlook by provider and region',
    category: 'billing',
    lastGenerated: '2024-03-07T15:45:00Z',
    frequency: 'monthly',
    format: 'PDF',
    size: '2.1 MB',
    status: 'ready'
  },
  {
    id: 'report-14-link-cost',
    name: 'Link Cost & Economics Analysis',
    description: 'Cost per Link analysis, average Links per connection, revenue per Link, Link utilization economics, and cost efficiency by connection type and provider',
    category: 'billing',
    lastGenerated: '2024-03-10T11:00:00Z',
    frequency: 'weekly',
    format: 'Excel',
    size: '2.0 MB',
    status: 'ready'
  },
  {
    id: 'report-15-datacenter-provider',
    name: 'Data Center Provider Analysis',
    description: 'Comprehensive breakdown by data center provider (Cisco Jasper, Equinix, Databank, CoreWeave) showing IPE count, total connections, Links, VNFs, capacity, utilization, revenue, and cost efficiency per provider',
    category: 'operations',
    lastGenerated: '2024-03-10T13:45:00Z',
    frequency: 'monthly',
    format: 'Excel',
    size: '2.6 MB',
    status: 'ready'
  },
  {
    id: 'report-16-hub-aggregation',
    name: 'Hub Aggregation & Link Analysis',
    description: 'Hub level aggregation showing connections per Hub, total Links within each Hub, VNFs per Link, Link utilization, Hub capacity, and optimization opportunities',
    category: 'operations',
    lastGenerated: '2024-03-10T10:30:00Z',
    frequency: 'weekly',
    format: 'Excel',
    size: '3.1 MB',
    status: 'ready'
  },
  {
    id: 'report-17-hierarchy-analysis',
    name: 'Connection Hierarchy & Resource Analysis',
    description: 'Full hierarchy analysis: Connections > Hubs > Links > VNFs/IPEs showing resource distribution, average Links per Connection, average VNFs per Link, IPE associations, and capacity at each level',
    category: 'operations',
    lastGenerated: '2024-03-09T16:00:00Z',
    frequency: 'weekly',
    format: 'PDF',
    size: '2.9 MB',
    status: 'ready'
  }
];

const REPORT_FILTER_GROUPS: FilterGroup[] = [
  {
    id: 'category',
    label: 'Category',
    type: 'toggle',
    options: [
      { value: 'performance', label: 'Performance', color: 'info' },
      { value: 'security', label: 'Security', color: 'error' },
      { value: 'billing', label: 'Billing', color: 'warning' },
      { value: 'operations', label: 'Operations', color: 'success' },
    ],
  },
  {
    id: 'status',
    label: 'Status',
    type: 'toggle',
    options: [
      { value: 'ready', label: 'Ready', color: 'success' },
      { value: 'generating', label: 'Generating', color: 'info' },
      { value: 'stale', label: 'Stale', color: 'warning' },
    ],
  },
  {
    id: 'frequency',
    label: 'Frequency',
    type: 'select',
    placeholder: 'All',
    options: [
      { value: 'on-demand', label: 'On-demand' },
      { value: 'daily', label: 'Daily' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'monthly', label: 'Monthly' },
    ],
  },
];

interface ReportStory {
  headline: string;
  insights: string[];
}

function getReportStory(reportId: string): ReportStory | null {
  const stories: Record<string, ReportStory> = {
    'report-1-connection-inventory': {
      headline: '1,247 active NetBond connections span five types across four cloud providers — Site to Cloud leads at 27.4% of total volume, driven by 1 Gbps tier demand at the largest enterprise cohort.',
      insights: [
        'U.S. East (31.0%) and U.S. West (27.4%) together account for 58.4% of all connections, concentrating the majority of infrastructure exposure in two domestic regions.',
        'AWS leads provider adoption with 456 connections averaging 3.2 per customer; Oracle trails at 1.9 average — the widest customer-adoption gap in the portfolio.',
        '100 Gbps connections are only 12% of total count but represent the fastest-growing enterprise segment, with 10x the revenue impact of 500 Mbps connections.',
      ],
    },
    'report-2-ipe-capacity': {
      headline: '42 IPEs deliver 5.9 Tbps of installed capacity across Equinix (18 sites), Cisco Jasper (12), Databank (8), and CoreWeave (4) — with Equinix averaging the highest utilization at 78%.',
      insights: [
        'Chicago-1 is flagged for capacity planning at 76% average / 92% peak — already in critical territory and the highest-loaded IPE in the platform.',
        'Cloud provider coverage is asymmetric: Equinix supports all four cloud on-ramps at 18 sites vs. CoreWeave\'s limited 3–4 on-ramp footprint at 4 sites.',
        'Average Links per IPE is 91.6 across the platform; high-utilization sites like NYC-2 carry proportionally more Links per installed Gbps than any other location.',
      ],
    },
    'report-3-utilization-analysis': {
      headline: 'Platform-wide average utilization is 64%, up 3 points month-over-month. 8 of 42 IPEs are operating above 80% capacity — a 2-site increase that signals demand outpacing current infrastructure.',
      insights: [
        'Chicago-1 leads all sites at 92% peak utilization, qualifying it for immediate capacity planning action before it becomes a service availability risk.',
        'SMB Portal runs the leanest at 54% average vs. 71% for Enterprise Portal — a 17-point gap that may warrant differential routing or pricing strategy.',
        'If utilization trends continue at +3%/month, 6 more sites will breach the 80% threshold in Q3, requiring an accelerated expansion cycle.',
      ],
    },
    'report-4-weekly-trends': {
      headline: '47 new connections added this week — the strongest week of the trailing month and a 12-connection acceleration over last week. Deactivations fell to 12, producing the widest positive net spread of the period.',
      insights: [
        'NYC-2 led all sites with 15 new connections; Oracle saw the weakest uptake at 1–2 new connections per site, consistent with the prior three-week pattern.',
        'Upgraded connections outpaced downgrades 23:8 this week; the net MBC increase represents an estimated $24K+ in new monthly recurring revenue.',
        'Deactivation rate is declining — from 15 in Week 1 to 12 in Week 4. Migration continues to be the primary driver, not churn.',
      ],
    },
    'report-5-revenue-metrics': {
      headline: '$2.80M in monthly revenue with ARPC growing $124 to $2,267 — a consecutive fourth month of growth. The 8.2% month-over-month increase is the strongest in the trailing four-month window.',
      insights: [
        'AVPN connections generate the highest ARPC at $2,702 — nearly $1,000 above Internet connections, a premium that should anchor the enterprise upsell strategy.',
        'Billed connection growth (+47 net) is outpacing the prior monthly average of +15, driven by Site to Cloud and Cloud to Cloud demand accelerating together.',
        'If the current $124/month ARPC growth rate holds, ARPC will cross $2,500 within six months, adding approximately $287K in annual recurring revenue.',
      ],
    },
    'report-6-service-reliability': {
      headline: '99.4% link availability across 3,847 active links. Connections impacted by disruption fell 24% month-over-month, but Europe logged the most incidents (3) with the highest average downtime per connection (15 min).',
      insights: [
        'Only 23 inactive links remain across the platform — a 0.6% inactive rate that indicates strong provisioning hygiene and lifecycle management discipline.',
        'Europe\'s 3 disruption incidents affected 68 connections with 15-minute average downtime — significantly above the 8.4-minute platform average.',
        'Average downtime per connection improved from 10.5 to 8.4 minutes week-over-week (-20%), suggesting recent reliability improvements are taking measurable effect.',
      ],
    },
    'report-7-customer-detail': {
      headline: '8 active connections across AWS, Azure, Google, and Oracle with 24 total links and 58% average utilization. NB-47289 is operating at 89% peak — the only connection in the active portfolio at elevated risk.',
      insights: [
        'AWS holds the largest footprint with 4 connections (11 links); Google Cloud Interconnect carries the most links per connection (5 on NB-47305).',
        'U.S. East hosts 4 connections representing 23 Gbps of capacity — 53% of total provisioned bandwidth across three cloud providers.',
        'NB-47289 (10 Gbps AWS, 62% avg / 89% peak) should be reviewed for MBC upgrade before peak utilization triggers a service degradation event.',
      ],
    },
    'report-8-customer-analytics': {
      headline: '427 customers with 18 net adds this month — the second-highest net growth in the trailing four-month window. U.S. East leads all regions in count (147), net adds (+8), and growth rate (+5.8%).',
      insights: [
        'Asia Pacific is the smallest region (60 customers) but demonstrates consistent growth (+3.4%) with strong average spend ($5,432/month) relative to its scale.',
        'ARPU grew $39 month-over-month to $2,267 — compounding growth that, if sustained, exceeds the $2,500 threshold before year-end.',
        'U.S. East customers average 3.2 connections vs. 2.4 in Asia Pacific — signaling a more sophisticated enterprise buyer profile in the leading region.',
      ],
    },
    'report-9-arpc-analysis': {
      headline: 'Cloud to Cloud connections command $3,120 ARPC — 38% above the $2,267 platform average. AWS leads all providers at $2,845 ARPC with 14.2% year-over-year growth, the strongest of the four cloud providers.',
      insights: [
        '100 Gbps connections yield $8,450 ARPC vs. $1,245 for 500 Mbps — a 6.8x premium that underscores the strategic value of enterprise-tier upsell motions.',
        'Datacenter to Cloud carries the lowest ARPC ($1,996) and the smallest month-over-month improvement (+$45), suggesting limited pricing power in that segment.',
        'Optimization potential is estimated at $142K/month — up $28K from last month — driven by right-sizing opportunities across underutilized high-tier connections.',
      ],
    },
    'report-10-mbc-cost': {
      headline: '18.9% of connections (234) are underutilized below 60% MBC, representing $89K/month in savings potential. 43 connections are at critical capacity (>95%) and require upgrade review to avoid service risk.',
      insights: [
        '87 connections at under 40% utilization average 5.2 Gbps MBC — downgrade candidates that could collectively save $42,300/month in billed capacity costs.',
        'AWS shows the highest upgrade rate (18 this month), suggesting enterprise workload growth is outpacing provisioned bandwidth most rapidly on that provider.',
        'The 68.5% of connections in the optimal 60–85% utilization band is the platform\'s key health indicator; maintaining this above 65% should be a formal KPI target.',
      ],
    },
    'report-11-provider-cost': {
      headline: 'AWS generates $1.30M/month (46.3% of total revenue) with the highest ARPC ($2,845) and strongest growth (9.2% MoM). Oracle is the smallest contributor at $285K but growing consistently at 5.1%.',
      insights: [
        'Azure accounts for 34.1% of revenue at $954K/month — a meaningful second pillar that diversifies platform revenue risk away from AWS concentration.',
        'Cost efficiency rankings are tightly grouped: AWS ($547/Gbps) trails Oracle ($501/Gbps) on unit economics, but AWS\'s higher MBC compensates in absolute revenue.',
        'U.S. East is the largest revenue region for all four providers; Europe represents the highest growth opportunity given its relatively underpenetrated provider mix.',
      ],
    },
    'report-12-ipe-revenue': {
      headline: 'Total IPE revenue is $2.80M/month with NYC-2 leading at $442,530 and a 98/100 efficiency score. U.S. East sites account for 34% of platform revenue from 31% of connections — a premium geographic multiplier.',
      insights: [
        'SFO-1 is the most underperforming top-5 IPE: $342,580 revenue at only 58% utilization vs. Chicago-1\'s $378K at 76% — 18 points of capacity gap for lower revenue.',
        'Revenue per Gbps at top sites averages $4,100–$4,200; CoreWeave and Databank sites trail at $1,500–$1,600/Gbps, revealing a co-location yield gap.',
        'NYC-2 and Dallas-1 are the platform anchors — both carry customer satisfaction scores above 4.7/5 that correlate directly with their revenue efficiency rankings.',
      ],
    },
    'report-13-cost-forecast': {
      headline: '$37.2M in revenue projected over the next 12 months — an 18.5% year-over-year increase. The current pipeline of 127 connections represents $342K in additional monthly recurring revenue potential.',
      insights: [
        '23 connections with signed contracts represent $78,200/month at 95% close probability — near-certain Q2 revenue that should be reflected in updated board forecasts.',
        'MBC upgrade cycles are projected to contribute $163K–$194K in additional quarterly revenue through Q4, with Q4 upgrades (72 expected) the largest single-quarter lift.',
        'AWS is projected to reach $1.73M/month by Q4 2024 (+33% vs. current) while Oracle at $379K represents the steepest growth percentage from a smaller base.',
      ],
    },
    'report-14-link-cost': {
      headline: 'Revenue per link stands at $728 platform-wide. 123 very-low-utilization links (<40%) generate $62,976/month in billed costs that should be reviewed for consolidation or deactivation.',
      insights: [
        'Cloud to Cloud leads link efficiency at 3.8 average links per connection vs. 2.9 for VPN to Cloud — combining the highest ARPC with the densest link architecture.',
        'High-utilization links (>80%) are only 32% of total links but generate $1.04M/month — 37% of total link revenue from a third of the asset base.',
        'The top optimization priority is consolidating 123 very-low links ($62,976/mo cost), followed by upgrading 87 high-utilization links (+$21,246/mo revenue opportunity).',
      ],
    },
    'report-15-datacenter-provider': {
      headline: 'Equinix leads all data center providers with 18 IPEs, 78% average utilization, and $1.24M/month in revenue. CoreWeave is the smallest (4 IPEs) but shows 15.6% monthly growth — fastest in the portfolio.',
      insights: [
        'Cisco Jasper generates the highest revenue per IPE ($77,045) and highest ARPC ($2,389) of the four providers, making it the most capital-efficient co-location partner.',
        'CoreWeave\'s growth trajectory (+15.6%/month) vs. Databank\'s (+8.2%) may signal a market shift toward GPU-optimized co-location demand for AI workloads.',
        'Total on-ramp coverage varies 5x: Equinix hosts 64 cloud on-ramps vs. CoreWeave\'s 13 — a gap that limits CoreWeave\'s enterprise connectivity addressable market.',
      ],
    },
    'report-16-hub-aggregation': {
      headline: '487 Hubs aggregate 3,847 links at 7.9 links per router on average. 24 single-link Hubs represent the largest near-term consolidation opportunity at an estimated $18,400/month in savings.',
      insights: [
        'Large Hubs (>10 links, 87 units) operate at 82% average utilization — the highest utilization band — indicating demand for further link capacity at those aggregation points.',
        'Internet to Cloud connections have the highest link density per Hub (10.1 avg) vs. Site to Cloud\'s 6.2 — reflecting very different traffic aggregation patterns by type.',
        '5.5% of links carry 3+ VNFs generating $956–$1,124 per link — a 31–61% premium over single-VNF links that signals a high-value service tier worth expanding.',
      ],
    },
    'report-17-hierarchy-analysis': {
      headline: 'The full NetBond hierarchy spans 1,247 connections → 487 Hubs → 3,847 links → 4,999 VNFs across 42 IPE sites, all running at 72% capacity with 28% headroom for continued growth.',
      insights: [
        'Cloud to Cloud connections are the most resource-intensive at 5.3 VNFs per connection average — nearly 40% more VNFs than any other connection type in the platform.',
        'The 43.9% of connections with 3–4 links (547 connections) represents the platform\'s standard tier — the key cohort for right-sizing and pricing optimization initiatives.',
        '89.9% of links associate with a single IPE; the 10.1% of multi-homed links (2+ IPEs) represent the platform\'s redundancy-premium customers — likely the highest-value accounts.',
      ],
    },
  };
  return stories[reportId] ?? null;
}

export function StandardReports() {
  const { selectedConnection, timeRange } = useMonitoring();
  const [searchQuery, setSearchQuery] = useState('');
  const [generatingReports, setGeneratingReports] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [previewReport, setPreviewReport] = useState<Report | null>(null);

  const { filters, setFilters, isOpen, toggle, activeCount } = useTableFilters({
    groups: REPORT_FILTER_GROUPS,
  });

  const getCategoryIcon = (category: Report['category']) => {
    switch (category) {
      case 'performance': return TrendingUp;
      case 'security': return Shield;
      case 'billing': return DollarSign;
      case 'operations': return Activity;
    }
  };

  const getCategoryColor = (category: Report['category']) => {
    switch (category) {
      case 'performance': return 'bg-brand-lightBlue text-brand-blue';
      case 'security': return 'bg-fw-wash text-fw-bodyLight';
      case 'billing': return 'bg-fw-successLight text-fw-success';
      case 'operations': return 'bg-fw-neutral text-fw-body';
    }
  };

  const getStatusBadge = (status: Report['status']) => {
    switch (status) {
      case 'ready':
        return <span className="px-2 py-1 text-figma-sm font-medium bg-fw-successLight text-fw-success rounded-lg">Ready</span>;
      case 'generating':
        return <span className="px-2 py-1 text-figma-sm font-medium bg-fw-infoLight text-fw-info rounded-lg">Generating</span>;
      case 'stale':
        return <span className="px-2 py-1 text-figma-sm font-medium bg-fw-wash text-fw-bodyLight rounded-lg">Needs Update</span>;
    }
  };

  const handleGenerateReport = (reportId: string) => {
    setGeneratingReports(prev => new Set(prev).add(reportId));

    setTimeout(() => {
      setGeneratingReports(prev => {
        const next = new Set(prev);
        next.delete(reportId);
        return next;
      });

      window.addToast?.({
        type: 'success',
        title: 'Report Generated',
        message: 'Your report has been generated and is ready to download',
        duration: 4000
      });
    }, 2000);
  };

  const handleDownloadReport = (report: Report) => {
    window.addToast?.({
      type: 'success',
      title: 'Download Started',
      message: `Downloading ${report.name}`,
      duration: 3000
    });
  };

  const getReportPreviewData = (reportId: string) => {
    switch (reportId) {
      case 'report-1-connection-inventory':
        return {
          summary: [
            { label: 'Total NetBond Connections', value: '1,247', trend: '+12%' },
            { label: 'Cloud to Cloud', value: '316', trend: '+18%' },
            { label: 'Internet to Cloud', value: '289', trend: '+15%' },
            { label: 'Site to Cloud', value: '342', trend: '+10%' }
          ],
          tables: [
            {
              title: 'Total Number of Connection Types and Breakdown',
              headers: ['Connection Type', 'Count', 'Percentage'],
              rows: [
                ['Cloud to Cloud', '316', '25.3%'],
                ['Internet to Cloud', '289', '23.2%'],
                ['Site to Cloud', '342', '27.4%'],
                ['VPN to Cloud', '187', '15.0%'],
                ['Datacenter to Cloud', '113', '9.1%']
              ]
            },
            {
              title: 'Connection Segmentation by Bandwidth Tier',
              headers: ['Bandwidth', 'Count', 'Percentage'],
              rows: [
                ['500 Mbps', '287', '23.0%'],
                ['1 Gbps', '421', '33.8%'],
                ['10 Gbps', '389', '31.2%'],
                ['100 Gbps', '150', '12.0%']
              ]
            },
            {
              title: 'Connections by Data Center Region',
              headers: ['Region', 'Connections', 'Percentage'],
              rows: [
                ['US East', '387', '31.0%'],
                ['US West', '342', '27.4%'],
                ['Europe', '298', '23.9%'],
                ['Asia Pacific', '220', '17.7%']
              ]
            },
            {
              title: 'Connections by Provider',
              headers: ['Provider', 'Connections', 'Avg per Customer'],
              rows: [
                ['AWS', '456', '3.2'],
                ['Azure', '398', '2.8'],
                ['Google', '247', '2.1'],
                ['Oracle', '146', '1.9']
              ]
            },
            {
              title: 'Connections per Infrastructure Provider Edge Router (IPE)',
              headers: ['IPE', 'Connections', 'Utilization'],
              rows: [
                ['Dallas-1', '142', '68%'],
                ['NYC-2', '158', '72%'],
                ['SFO-1', '127', '58%'],
                ['Chicago-1', '134', '76%']
              ]
            }
          ]
        };

      case 'report-2-ipe-capacity':
        return {
          summary: [
            { label: 'Total IPE', value: '42', trend: '+2' },
            { label: 'Data Center Providers', value: '4', trend: 'Cisco Jasper, Equinix, Databank, CoreWeave' },
            { label: 'Total Installed Capacity', value: '5.9 Tbps', trend: '+240 Gbps' },
            { label: 'Total Links', value: '3,847', trend: 'Avg 91.6 per IPE' }
          ],
          tables: [
            {
              title: 'IPE by Data Center Provider',
              headers: ['Data Center Provider', 'IPEs', 'Total Links', 'Total VNFs', 'Installed Capacity', 'Avg Utilization'],
              rows: [
                ['Equinix', '18', '1,742', '894', '687 Gbps', '78%'],
                ['Cisco Jasper', '12', '1,198', '612', '458 Gbps', '72%'],
                ['Databank', '8', '676', '345', '312 Gbps', '68%'],
                ['CoreWeave', '4', '231', '118', '95 Gbps', '65%']
              ]
            },
            {
              title: 'NetBond-Enabled IPE by Region & Data Center',
              headers: ['Region', 'Equinix', 'Cisco Jasper', 'Databank', 'CoreWeave', 'Total IPE'],
              rows: [
                ['US East', '5', '4', '2', '0', '11'],
                ['US West', '4', '3', '2', '0', '9'],
                ['Europe', '5', '3', '2', '2', '12'],
                ['Asia Pacific', '4', '2', '2', '2', '10']
              ]
            },
            {
              title: 'Cloud Provider On-Ramps per IPE Location',
              headers: ['IPE Location', 'Data Center', 'AWS', 'Azure', 'Google', 'Oracle', 'Total'],
              rows: [
                ['Dallas-1', 'Cisco Jasper', '✓', '✓', '✓', '✓', '4'],
                ['NYC-2', 'Equinix', '✓', '✓', '✓', '—', '3'],
                ['SFO-1', 'Databank', '✓', '✓', '✓', '✓', '4'],
                ['London-1', 'Equinix', '✓', '✓', '—', '—', '2'],
                ['Chicago-1', 'Equinix', '✓', '✓', '✓', '✓', '4']
              ]
            },
            {
              title: 'Total Installed Capacity per IPE',
              headers: ['IPE', 'AWS', 'Azure', 'Google', 'Oracle', 'Total Capacity', 'Utilization'],
              rows: [
                ['Dallas-1', '30 Gbps', '25 Gbps', '25 Gbps', '20 Gbps', '100 Gbps', '68%'],
                ['NYC-2', '40 Gbps', '35 Gbps', '30 Gbps', '—', '105 Gbps', '72%'],
                ['SFO-1', '25 Gbps', '20 Gbps', '20 Gbps', '15 Gbps', '80 Gbps', '58%'],
                ['Chicago-1', '30 Gbps', '25 Gbps', '20 Gbps', '15 Gbps', '90 Gbps', '76%']
              ]
            }
          ]
        };

      case 'report-3-utilization-analysis':
        return {
          summary: [
            { label: 'Peak Hour Utilization (Max)', value: '82%', trend: '+7%' },
            { label: 'Average Utilization', value: '64%', trend: '+3%' },
            { label: 'IPEs Over 80%', value: '8', trend: '+2' },
            { label: 'Total Installed Capacity', value: '2.4 Tbps', trend: '+240 Gbps' }
          ],
          tables: [
            {
              title: 'Total Connection Utilization per IPE',
              headers: ['IPE', 'Installed Capacity', 'Avg Utilization', 'Max Utilization (Busiest Hour)', 'Status'],
              rows: [
                ['Dallas-1', '100 Gbps', '68%', '85%', 'Healthy'],
                ['NYC-2', '105 Gbps', '72%', '89%', 'Monitor'],
                ['SFO-1', '80 Gbps', '58%', '72%', 'Healthy'],
                ['Chicago-1', '90 Gbps', '76%', '92%', 'Plan Upgrade'],
                ['Atlanta-1', '95 Gbps', '65%', '81%', 'Healthy'],
                ['Seattle-1', '75 Gbps', '62%', '78%', 'Healthy']
              ]
            },
            {
              title: 'Average and Max Utilization of All Aggregated Connections per Site',
              headers: ['Site', 'Total Connections', 'Avg Utilization', 'Max Utilization'],
              rows: [
                ['Dallas-1', '142', '68%', '85%'],
                ['NYC-2', '158', '72%', '89%'],
                ['SFO-1', '127', '58%', '72%'],
                ['Chicago-1', '134', '76%', '92%']
              ]
            },
            {
              title: 'Portal Level Average and Max Utilization',
              headers: ['Portal', 'Connections', 'Avg Utilization', 'Max Utilization'],
              rows: [
                ['Enterprise Portal', '847', '71%', '94%'],
                ['SMB Portal', '289', '54%', '78%'],
                ['Partner Portal', '111', '62%', '83%']
              ]
            }
          ]
        };

      case 'report-4-weekly-trends':
        return {
          summary: [
            { label: 'New Connections (This Week)', value: '47', trend: '+12 vs last week' },
            { label: 'New Customers', value: '14', trend: '+3' },
            { label: 'Upgraded Connections', value: '23', trend: '+5' },
            { label: 'Deactivated Connections', value: '12', trend: '-3' }
          ],
          tables: [
            {
              title: 'Total New Connections Added per Week',
              headers: ['Week Ending', 'New Connections', 'New per Site', 'New per Provider', 'Total Active'],
              rows: [
                ['Mar 3', '35', '8.8 avg', '8.8 avg', '1,188'],
                ['Mar 10', '42', '10.5 avg', '10.5 avg', '1,217'],
                ['Mar 17', '38', '9.5 avg', '9.5 avg', '1,243'],
                ['Mar 24', '47', '11.8 avg', '11.8 avg', '1,278']
              ]
            },
            {
              title: 'New Connections per Week by IPE and Provider',
              headers: ['Site', 'AWS', 'Azure', 'Google', 'Oracle', 'Total'],
              rows: [
                ['Dallas-1', '5', '4', '3', '2', '14'],
                ['NYC-2', '6', '5', '3', '1', '15'],
                ['SFO-1', '4', '4', '2', '1', '11'],
                ['Chicago-1', '3', '3', '1', '—', '7']
              ]
            },
            {
              title: 'Newly Added Customers per IPE and Provider',
              headers: ['IPE', 'New Customers', 'Primary Provider', 'Avg Connections'],
              rows: [
                ['Dallas-1', '4', 'AWS', '2.5'],
                ['NYC-2', '5', 'Azure', '3.0'],
                ['SFO-1', '3', 'AWS', '2.3'],
                ['Chicago-1', '2', 'Google', '2.0']
              ]
            },
            {
              title: 'Upgraded and Downgraded Connections by MBC',
              headers: ['Week', 'Upgraded MBC', 'Downgraded MBC', 'Net Change', 'Avg MBC'],
              rows: [
                ['Week 1', '18', '10', '+8', '4.1 Gbps'],
                ['Week 2', '21', '8', '+13', '4.2 Gbps'],
                ['Week 3', '19', '12', '+7', '4.3 Gbps'],
                ['Week 4', '23', '8', '+15', '4.5 Gbps']
              ]
            },
            {
              title: 'Deactivated Connections per Week Trend',
              headers: ['Week', 'Deactivated', 'Reason', 'Provider Impact'],
              rows: [
                ['Week 1', '15', 'Migration', 'AWS: 6, Azure: 5, Google: 3, Oracle: 1'],
                ['Week 2', '13', 'Cost Reduction', 'AWS: 5, Azure: 4, Google: 3, Oracle: 1'],
                ['Week 3', '14', 'Service End', 'AWS: 6, Azure: 4, Google: 3, Oracle: 1'],
                ['Week 4', '12', 'Migration', 'AWS: 5, Azure: 4, Google: 2, Oracle: 1']
              ]
            }
          ]
        };

      case 'report-5-revenue-metrics':
        return {
          summary: [
            { label: 'Monthly Revenue', value: '$2.8M', trend: '+8.2%' },
            { label: 'Billed Connections', value: '1,235', trend: '+47' },
            { label: 'ARPC', value: '$2,267', trend: '+$124' },
            { label: 'Average MBC', value: '4.2 Gbps', trend: '+0.3 Gbps' }
          ],
          tables: [
            {
              title: '12-Month Revenue Trend',
              headers: ['Month', 'Revenue', 'Connections', 'ARPC', 'Growth'],
              rows: [
                ['Jan 2024', '$2.58M', '1,188', '$2,172', '+6.2%'],
                ['Feb 2024', '$2.64M', '1,205', '$2,190', '+2.3%'],
                ['Mar 2024', '$2.72M', '1,221', '$2,228', '+3.0%'],
                ['Apr 2024', '$2.80M', '1,235', '$2,267', '+2.9%']
              ]
            },
            {
              title: 'Revenue by Connection Type',
              headers: ['Type', 'Connections', 'Revenue', 'ARPC'],
              rows: [
                ['AVPN', '542', '$1,465K', '$2,702'],
                ['Internet', '389', '$687K', '$1,766'],
                ['Cloud to Cloud', '316', '$648K', '$2,051']
              ]
            }
          ]
        };

      case 'report-6-service-reliability':
        return {
          summary: [
            { label: 'Total Aggregated Links', value: '3,847', trend: '+142' },
            { label: 'Active Connections', value: '1,235', trend: '+47' },
            { label: 'Active Links', value: '3,847', trend: '+142' },
            { label: 'Avg Downtime per Connection', value: '8.4 min', trend: '-2.1 min' }
          ],
          tables: [
            {
              title: 'Total Aggregated Links for NetBond',
              headers: ['Metric', 'Count', 'Percentage of Total'],
              rows: [
                ['Total Links', '3,870', '100%'],
                ['Active Links', '3,847', '99.4%'],
                ['Inactive Links', '23', '0.6%']
              ]
            },
            {
              title: 'Connection Status',
              headers: ['Status', 'Connections', 'Links', 'Percentage'],
              rows: [
                ['Active Connections', '1,235', '3,847', '99.0%'],
                ['Inactive Connections', '8', '14', '0.6%'],
                ['Deactivated/Deleted Connections', '4', '9', '0.3%']
              ]
            },
            {
              title: 'Links Status',
              headers: ['Status', 'Links', 'Avg per Connection', 'Percentage'],
              rows: [
                ['Active Links', '3,847', '3.1', '99.4%'],
                ['Inactive Links', '23', '2.9', '0.6%']
              ]
            },
            {
              title: 'Service Disruption Impact per Site/Region',
              headers: ['Region', 'IPEs', 'Connections Impacted', 'Incidents', 'Avg Downtime per Connection'],
              rows: [
                ['US East', '3', '47', '2', '12 min'],
                ['US West', '2', '23', '1', '6 min'],
                ['Europe', '4', '68', '3', '15 min'],
                ['Asia Pacific', '2', '19', '1', '8 min']
              ]
            },
            {
              title: 'Average Minutes of Service Disruption',
              headers: ['Period', 'Per Connection', 'Per Site', 'Per Region'],
              rows: [
                ['This Week', '8.4 min', '45 min', '127 min'],
                ['Last Week', '10.5 min', '52 min', '148 min'],
                ['This Month', '9.2 min', '48 min', '135 min']
              ]
            }
          ]
        };

      case 'report-7-customer-detail':
        return {
          summary: [
            { label: 'My Connections', value: '8', trend: '+2' },
            { label: 'Total Links', value: '24', trend: '+6' },
            { label: 'Average Utilization', value: '58%', trend: '+4%' },
            { label: 'Max Utilization', value: '89%', trend: '+8%' }
          ],
          tables: [
            {
              title: 'My Connections (Active/Inactive/Deactivated)',
              headers: ['Connection ID', 'Type', 'Connection Size', 'Number of Links', 'Status'],
              rows: [
                ['NB-47289', 'AWS Interconnect – last mile', '10 Gbps', '4', 'Active'],
                ['NB-47291', 'Azure ExpressRoute', '5 Gbps', '3', 'Active'],
                ['NB-47305', 'Google Cloud Interconnect', '10 Gbps', '5', 'Active'],
                ['NB-47312', 'AWS Interconnect – last mile', '1 Gbps', '2', 'Active'],
                ['NB-47156', 'Oracle FastConnect', '5 Gbps', '3', 'Active'],
                ['NB-46891', 'Azure ExpressRoute', '2 Gbps', '2', 'Inactive'],
                ['NB-45672', 'AWS Interconnect – last mile', '1 Gbps', '1', 'Deactivated']
              ]
            },
            {
              title: 'My Connections per Provider',
              headers: ['Provider', 'Active', 'Inactive', 'Deactivated', 'Total', 'Total Links'],
              rows: [
                ['AWS', '3', '—', '1', '4', '11'],
                ['Azure', '2', '1', '—', '3', '8'],
                ['Google', '2', '—', '—', '2', '10'],
                ['Oracle', '1', '—', '—', '1', '3']
              ]
            },
            {
              title: 'My Connections per Cloud Region Location',
              headers: ['Provider', 'Cloud Region', 'Connections', 'Total Capacity'],
              rows: [
                ['AWS', 'us-east-1', '2', '11 Gbps'],
                ['AWS', 'us-west-2', '1', '10 Gbps'],
                ['Azure', 'East US', '2', '7 Gbps'],
                ['Google', 'us-central1', '1', '10 Gbps'],
                ['Google', 'us-west1', '1', '5 Gbps'],
                ['Oracle', 'us-ashburn-1', '1', '5 Gbps']
              ]
            },
            {
              title: 'My Connections per Geographic Region',
              headers: ['Geographic Region', 'Connections', 'Total Capacity', 'Providers'],
              rows: [
                ['US East', '4', '23 Gbps', 'AWS, Azure, Oracle'],
                ['US West', '3', '20 Gbps', 'AWS, Google'],
                ['US Central', '1', '10 Gbps', 'Google']
              ]
            },
            {
              title: 'Average and Max Utilization of My Connections',
              headers: ['Connection ID', 'Capacity', 'Avg Utilization', 'Max Utilization'],
              rows: [
                ['NB-47289', '10 Gbps', '62%', '89%'],
                ['NB-47291', '5 Gbps', '54%', '78%'],
                ['NB-47305', '10 Gbps', '58%', '82%'],
                ['NB-47312', '1 Gbps', '45%', '67%'],
                ['NB-47156', '5 Gbps', '61%', '85%']
              ]
            }
          ]
        };

      case 'report-8-customer-analytics':
        return {
          summary: [
            { label: 'Total Number of Customers', value: '427', trend: '+18 this month' },
            { label: 'Net Adds per Month', value: '+18', trend: '+6 vs last month' },
            { label: 'Avg Connections per Customer', value: '2.9', trend: '+0.2' },
            { label: 'ARPU (Avg Spend per Connection)', value: '$2,267', trend: '+$124' }
          ],
          tables: [
            {
              title: 'Total Number of Customers',
              headers: ['Period', 'Total Customers', 'Net Adds', 'Growth Rate'],
              rows: [
                ['Current Month', '427', '+18', '+4.4%'],
                ['Last Month', '409', '+12', '+3.0%'],
                ['2 Months Ago', '397', '+15', '+3.9%'],
                ['3 Months Ago', '382', '+19', '+5.2%']
              ]
            },
            {
              title: 'Customers per Geographic Region',
              headers: ['Geographic Region', 'Customers', 'Percentage', 'Net Adds', 'Growth'],
              rows: [
                ['US East', '147', '34.4%', '+8', '+5.8%'],
                ['US West', '122', '28.6%', '+5', '+4.3%'],
                ['Europe', '98', '23.0%', '+3', '+3.2%'],
                ['Asia Pacific', '60', '14.0%', '+2', '+3.4%']
              ]
            },
            {
              title: 'Net Adds per Month',
              headers: ['Month', 'New Customers', 'Churned', 'Net Adds', 'Total Customers'],
              rows: [
                ['January', '22', '4', '+18', '409'],
                ['February', '19', '6', '+13', '422'],
                ['March', '24', '5', '+19', '441'],
                ['April (Current)', '21', '3', '+18', '459']
              ]
            },
            {
              title: 'Average Connections per Customer, per Region',
              headers: ['Region', 'Total Customers', 'Total Connections', 'Avg Connections per Customer'],
              rows: [
                ['US East', '147', '471', '3.2'],
                ['US West', '122', '354', '2.9'],
                ['Europe', '98', '265', '2.7'],
                ['Asia Pacific', '60', '144', '2.4']
              ]
            },
            {
              title: 'Average Spend per Month per Customer',
              headers: ['Region', 'Avg Monthly Spend', 'Highest Spend', 'Lowest Spend'],
              rows: [
                ['US East', '$7,234', '$42,500', '$850'],
                ['US West', '$6,521', '$38,200', '$720'],
                ['Europe', '$6,189', '$35,800', '$690'],
                ['Asia Pacific', '$5,432', '$28,900', '$610']
              ]
            },
            {
              title: 'Average Spend per Connection Overall (ARPU)',
              headers: ['Month', 'Total Revenue', 'Total Connections', 'ARPU', 'Change'],
              rows: [
                ['January', '$2.58M', '1,188', '$2,172', '+$87'],
                ['February', '$2.64M', '1,205', '$2,190', '+$18'],
                ['March', '$2.72M', '1,221', '$2,228', '+$38'],
                ['April (Current)', '$2.80M', '1,235', '$2,267', '+$39']
              ]
            }
          ]
        };

      case 'report-9-arpc-analysis':
        return {
          summary: [
            { label: 'Overall ARPC', value: '$2,267', trend: '+$124 MoM' },
            { label: 'Highest ARPC (Provider)', value: '$2,845', trend: 'AWS' },
            { label: 'Highest ARPC (Type)', value: '$3,120', trend: 'Cloud to Cloud' },
            { label: 'Optimization Potential', value: '$142K/mo', trend: '+$28K vs last month' }
          ],
          tables: [
            {
              title: 'ARPC Breakdown by Connection Type',
              headers: ['Connection Type', 'Total Connections', 'Total Revenue', 'ARPC', 'MoM Change'],
              rows: [
                ['Cloud to Cloud', '316', '$986,320', '$3,120', '+$156'],
                ['Site to Cloud', '342', '$889,530', '$2,601', '+$98'],
                ['Internet to Cloud', '289', '$635,830', '$2,200', '+$112'],
                ['VPN to Cloud', '187', '$392,720', '$2,100', '+$87'],
                ['Datacenter to Cloud', '113', '$225,600', '$1,996', '+$45']
              ]
            },
            {
              title: 'ARPC by Provider',
              headers: ['Provider', 'Connections', 'Total Revenue', 'ARPC', 'YoY Change'],
              rows: [
                ['AWS', '456', '$1,297,320', '$2,845', '+14.2%'],
                ['Azure', '398', '$954,620', '$2,398', '+11.8%'],
                ['Google', '247', '$542,940', '$2,198', '+8.5%'],
                ['Oracle', '146', '$285,120', '$1,953', '+6.2%']
              ]
            },
            {
              title: 'ARPC by Region',
              headers: ['Region', 'Connections', 'Avg ARPC', 'Revenue Contribution', '%'],
              rows: [
                ['US East', '387', '$2,456', '$950,472', '33.9%'],
                ['US West', '342', '$2,312', '$790,704', '28.2%'],
                ['Europe', '298', '$2,187', '$651,726', '23.3%'],
                ['Asia Pacific', '220', '$2,045', '$449,900', '16.0%']
              ]
            },
            {
              title: 'ARPC by Bandwidth Tier',
              headers: ['Bandwidth', 'Connections', 'ARPC', 'Revenue', 'Cost per Gbps'],
              rows: [
                ['100 Gbps', '150', '$8,450', '$1,267,500', '$84.50'],
                ['10 Gbps', '389', '$3,280', '$1,275,920', '$328.00'],
                ['1 Gbps', '421', '$1,890', '$795,690', '$1,890.00'],
                ['500 Mbps', '287', '$1,245', '$357,315', '$2,490.00']
              ]
            }
          ]
        };

      case 'report-10-mbc-cost':
        return {
          summary: [
            { label: 'Avg MBC per Connection', value: '4.8 Gbps', trend: '+0.3 Gbps MoM' },
            { label: 'Underutilized (<60%)', value: '234 connections', trend: '18.9%' },
            { label: 'Right-sized (60-85%)', value: '847 connections', trend: '68.5%' },
            { label: 'Potential Savings', value: '$89K/mo', trend: 'Downgrade opportunities' }
          ],
          tables: [
            {
              title: 'MBC vs Actual Utilization Analysis',
              headers: ['Utilization Band', 'Connections', 'Avg MBC', 'Avg Utilization', 'Action', 'Est. Savings'],
              rows: [
                ['<40% (Under)', '87', '5.2 Gbps', '32%', 'Consider Downgrade', '$42,300/mo'],
                ['40-60% (Low)', '147', '4.8 Gbps', '52%', 'Monitor', '$28,400/mo'],
                ['60-85% (Optimal)', '847', '4.7 Gbps', '74%', 'No Action', '$0'],
                ['85-95% (High)', '123', '6.1 Gbps', '89%', 'Monitor', '$0'],
                ['>95% (Critical)', '43', '7.8 Gbps', '97%', 'Consider Upgrade', 'Revenue Opportunity']
              ]
            },
            {
              title: 'MBC Cost per Connection Type',
              headers: ['Connection Type', 'Avg MBC', 'Avg Cost per Gbps', 'Monthly Cost', 'Avg Utilization'],
              rows: [
                ['Cloud to Cloud', '6.2 Gbps', '$503', '$3,119', '78%'],
                ['Site to Cloud', '5.1 Gbps', '$510', '$2,601', '76%'],
                ['Internet to Cloud', '4.2 Gbps', '$524', '$2,201', '71%'],
                ['VPN to Cloud', '3.8 Gbps', '$553', '$2,101', '68%'],
                ['Datacenter to Cloud', '3.2 Gbps', '$624', '$1,997', '64%']
              ]
            },
            {
              title: 'Upgrade/Downgrade Recommendations',
              headers: ['Connection ID', 'Current MBC', 'Utilization', 'Recommendation', 'Monthly Impact'],
              rows: [
                ['NB-47289', '10 Gbps', '32%', 'Downgrade to 5 Gbps', '-$1,640 savings'],
                ['NB-47291', '5 Gbps', '96%', 'Upgrade to 10 Gbps', '+$1,300 revenue'],
                ['NB-47305', '10 Gbps', '28%', 'Downgrade to 5 Gbps', '-$1,640 savings'],
                ['NB-47312', '1 Gbps', '94%', 'Upgrade to 5 Gbps', '+$1,050 revenue'],
                ['NB-47156', '5 Gbps', '38%', 'Downgrade to 1 Gbps', '-$710 savings']
              ]
            },
            {
              title: 'MBC Trends by Provider',
              headers: ['Provider', 'Avg MBC', 'Change MoM', 'Upgraded This Month', 'Downgraded This Month'],
              rows: [
                ['AWS', '5.2 Gbps', '+0.4 Gbps', '18', '8'],
                ['Azure', '4.7 Gbps', '+0.3 Gbps', '16', '5'],
                ['Google', '4.3 Gbps', '+0.2 Gbps', '9', '4'],
                ['Oracle', '3.9 Gbps', '+0.1 Gbps', '4', '2']
              ]
            }
          ]
        };

      case 'report-11-provider-cost':
        return {
          summary: [
            { label: 'Total Monthly Revenue', value: '$2.80M', trend: '+8.2% MoM' },
            { label: 'Most Revenue (Provider)', value: '$1.30M', trend: 'AWS (46.3%)' },
            { label: 'Highest ARPC', value: '$2,845', trend: 'AWS' },
            { label: 'Most Efficient', value: '$84.50/Gbps', trend: '100 Gbps connections' }
          ],
          tables: [
            {
              title: 'Provider Revenue & Cost Comparison',
              headers: ['Provider', 'Connections', 'Total Revenue', 'ARPC', 'Market Share', 'MoM Growth'],
              rows: [
                ['AWS', '456', '$1,297,320', '$2,845', '46.3%', '+9.2%'],
                ['Azure', '398', '$954,620', '$2,398', '34.1%', '+8.4%'],
                ['Google', '247', '$542,940', '$2,198', '19.4%', '+6.8%'],
                ['Oracle', '146', '$285,120', '$1,953', '10.2%', '+5.1%']
              ]
            },
            {
              title: 'Provider Cost by Region',
              headers: ['Provider', 'US East', 'US West', 'Europe', 'Asia Pacific', 'Total'],
              rows: [
                ['AWS', '$442,320', '$398,200', '$287,900', '$168,900', '$1,297,320'],
                ['Azure', '$324,560', '$289,840', '$221,350', '$118,870', '$954,620'],
                ['Google', '$183,192', '$164,232', '$122,058', '$73,458', '$542,940'],
                ['Oracle', '$96,738', '$86,832', '$51,282', '$50,268', '$285,120']
              ]
            },
            {
              title: 'Provider Cost by Connection Type',
              headers: ['Connection Type', 'AWS', 'Azure', 'Google', 'Oracle', 'Total'],
              rows: [
                ['Cloud to Cloud', '$389,460', '$312,980', '$189,540', '$94,340', '$986,320'],
                ['Site to Cloud', '$356,040', '$267,030', '$162,780', '$103,680', '$889,530'],
                ['Internet to Cloud', '$254,330', '$190,990', '$114,600', '$75,910', '$635,830'],
                ['VPN to Cloud', '$157,090', '$117,810', '$70,720', '$47,100', '$392,720'],
                ['Datacenter to Cloud', '$90,240', '$67,680', '$45,120', '$22,560', '$225,600']
              ]
            },
            {
              title: 'Cost Efficiency Metrics by Provider',
              headers: ['Provider', 'Avg Cost per Gbps', 'Avg MBC', 'Utilization', 'Efficiency Score'],
              rows: [
                ['AWS', '$547', '5.2 Gbps', '76%', '94/100'],
                ['Azure', '$510', '4.7 Gbps', '73%', '91/100'],
                ['Google', '$511', '4.3 Gbps', '71%', '88/100'],
                ['Oracle', '$501', '3.9 Gbps', '68%', '85/100']
              ]
            }
          ]
        };

      case 'report-12-ipe-revenue':
        return {
          summary: [
            { label: 'Total IPEs', value: '42', trend: '+2 new sites' },
            { label: 'Total IPE Revenue', value: '$2.80M/mo', trend: '+$215K MoM' },
            { label: 'Avg Revenue per IPE', value: '$66,667', trend: '+$5,119' },
            { label: 'Most Profitable IPE', value: '$142,800', trend: 'NYC-2' }
          ],
          tables: [
            {
              title: 'Revenue per IPE',
              headers: ['IPE', 'Connections', 'Total Revenue', 'Avg per Connection', 'Capacity Util', 'ROI Score'],
              rows: [
                ['NYC-2', '158', '$442,530', '$2,801', '72%', '98/100'],
                ['Dallas-1', '142', '$398,420', '$2,806', '68%', '96/100'],
                ['Chicago-1', '134', '$378,240', '$2,823', '76%', '94/100'],
                ['SFO-1', '127', '$342,580', '$2,697', '58%', '89/100'],
                ['Atlanta-1', '118', '$312,890', '$2,652', '65%', '91/100'],
                ['Seattle-1', '104', '$268,340', '$2,580', '62%', '87/100']
              ]
            },
            {
              title: 'IPE Revenue by Region',
              headers: ['Region', 'IPEs', 'Total Connections', 'Total Revenue', 'Avg per Site', 'Growth'],
              rows: [
                ['US East', '11', '387', '$950,472', '$86,407', '+12.4%'],
                ['US West', '9', '342', '$790,704', '$87,856', '+10.8%'],
                ['Europe', '8', '298', '$651,726', '$81,466', '+8.9%'],
                ['Asia Pacific', '7', '220', '$449,900', '$64,271', '+7.2%']
              ]
            },
            {
              title: 'IPE Capacity ROI Analysis',
              headers: ['IPE', 'Installed Capacity', 'Utilization', 'Monthly Revenue', 'Revenue per Gbps', 'Status'],
              rows: [
                ['NYC-2', '105 Gbps', '72%', '$442,530', '$4,215', 'Optimal'],
                ['Dallas-1', '100 Gbps', '68%', '$398,420', '$3,984', 'Optimal'],
                ['Chicago-1', '90 Gbps', '76%', '$378,240', '$4,203', 'Consider Expansion'],
                ['SFO-1', '80 Gbps', '58%', '$342,580', '$4,282', 'Underutilized'],
                ['Atlanta-1', '95 Gbps', '65%', '$312,890', '$3,294', 'Optimal']
              ]
            },
            {
              title: 'IPE Profitability Rankings',
              headers: ['Rank', 'IPE', 'Revenue', 'Efficiency', 'Growth Rate', 'Customer Satisfaction'],
              rows: [
                ['1', 'NYC-2', '$442,530', '98%', '+14.2%', '4.8/5'],
                ['2', 'Dallas-1', '$398,420', '96%', '+12.8%', '4.7/5'],
                ['3', 'Chicago-1', '$378,240', '94%', '+11.5%', '4.6/5'],
                ['4', 'SFO-1', '$342,580', '89%', '+9.2%', '4.5/5'],
                ['5', 'Atlanta-1', '$312,890', '91%', '+10.1%', '4.6/5']
              ]
            }
          ]
        };

      case 'report-13-cost-forecast':
        return {
          summary: [
            { label: '12-Month Forecast', value: '$37.2M', trend: '+18.5% YoY' },
            { label: 'Next Quarter Projection', value: '$8.9M', trend: '+$1.2M vs Q1' },
            { label: 'New Connection Pipeline', value: '127 connections', trend: '$342K/mo potential' },
            { label: 'Confidence Level', value: '94%', trend: 'High confidence' }
          ],
          tables: [
            {
              title: '12-Month Revenue Forecast',
              headers: ['Month', 'Projected Revenue', 'New Connections', 'Upgrades', 'Total Connections', 'Growth Rate'],
              rows: [
                ['Apr 2024', '$2.89M', '52', '21', '1,289', '+3.2%'],
                ['May 2024', '$2.98M', '48', '19', '1,337', '+3.1%'],
                ['Jun 2024', '$3.08M', '54', '23', '1,391', '+3.4%'],
                ['Jul 2024', '$3.18M', '51', '20', '1,442', '+3.2%'],
                ['Aug 2024', '$3.26M', '47', '18', '1,489', '+2.5%'],
                ['Sep 2024', '$3.35M', '49', '22', '1,538', '+2.8%'],
                ['Oct 2024', '$3.44M', '53', '24', '1,591', '+2.7%'],
                ['Nov 2024', '$3.52M', '46', '19', '1,637', '+2.3%'],
                ['Dec 2024', '$3.61M', '50', '21', '1,687', '+2.6%']
              ]
            },
            {
              title: 'Revenue Forecast by Provider',
              headers: ['Provider', 'Current Revenue', 'Q2 Projection', 'Q3 Projection', 'Q4 Projection', 'YoY Growth'],
              rows: [
                ['AWS', '$1,297,320', '$1,426,052', '$1,568,457', '$1,725,303', '+19.2%'],
                ['Azure', '$954,620', '$1,050,082', '$1,155,090', '$1,270,599', '+18.4%'],
                ['Google', '$542,940', '$597,234', '$656,957', '$722,653', '+16.8%'],
                ['Oracle', '$285,120', '$313,632', '$344,995', '$379,495', '+15.2%']
              ]
            },
            {
              title: 'New Connection Pipeline Impact',
              headers: ['Status', 'Connections', 'Estimated MBC', 'Monthly Revenue', 'Expected Close', 'Probability'],
              rows: [
                ['Contract Signed', '23', '115 Gbps', '$78,200', 'Apr 2024', '95%'],
                ['Final Review', '34', '178 Gbps', '$112,400', 'May 2024', '85%'],
                ['Proposal Stage', '41', '198 Gbps', '$98,600', 'Jun 2024', '65%'],
                ['Discovery', '29', '142 Gbps', '$52,800', 'Jul 2024', '45%']
              ]
            },
            {
              title: 'MBC Upgrade Trend Forecast',
              headers: ['Quarter', 'Expected Upgrades', 'Avg MBC Increase', 'Revenue Impact', 'Expected Downgrades', 'Net Impact'],
              rows: [
                ['Q2 2024', '63', '+2.8 Gbps', '+$189,000', '16', '+$163,800'],
                ['Q3 2024', '68', '+3.1 Gbps', '+$204,000', '14', '+$181,600'],
                ['Q4 2024', '72', '+3.2 Gbps', '+$218,400', '15', '+$194,400']
              ]
            },
            {
              title: 'Revenue Growth by Region Forecast',
              headers: ['Region', 'Current', 'Q2 2024', 'Q3 2024', 'Q4 2024', 'Growth Rate'],
              rows: [
                ['US East', '$950,472', '$1,045,519', '$1,150,071', '$1,265,078', '+18.5%'],
                ['US West', '$790,704', '$869,774', '$956,752', '$1,052,427', '+18.9%'],
                ['Europe', '$651,726', '$716,899', '$788,589', '$867,448', '+17.2%'],
                ['Asia Pacific', '$449,900', '$494,890', '$544,379', '$598,817', '+16.8%']
              ]
            }
          ]
        };

      case 'report-14-link-cost':
        return {
          summary: [
            { label: 'Total Active Links', value: '3,847', trend: '+142 links' },
            { label: 'Avg Links per Connection', value: '3.1', trend: '+0.2' },
            { label: 'Revenue per Link', value: '$728', trend: '+$42' },
            { label: 'Most Efficient', value: '3.8 Links', trend: 'Cloud to Cloud' }
          ],
          tables: [
            {
              title: 'Cost per Link Analysis',
              headers: ['Connection Type', 'Total Links', 'Total Connections', 'Avg Links/Conn', 'Revenue/Link', 'Cost Efficiency'],
              rows: [
                ['Cloud to Cloud', '1,201', '316', '3.8', '$821', 'Excellent'],
                ['Site to Cloud', '1,061', '342', '3.1', '$838', 'Excellent'],
                ['Internet to Cloud', '896', '289', '3.1', '$710', 'Good'],
                ['VPN to Cloud', '542', '187', '2.9', '$725', 'Good'],
                ['Datacenter to Cloud', '338', '113', '3.0', '$667', 'Fair']
              ]
            },
            {
              title: 'Link Utilization Economics',
              headers: ['Link Utilization', 'Links', 'Avg Revenue/Link', 'Total Revenue', 'Optimization Status'],
              rows: [
                ['High (>80%)', '1,234', '$842', '$1,039,428', 'Optimal - Monitor for upgrades'],
                ['Medium (60-80%)', '2,089', '$728', '$1,520,792', 'Optimal - No action needed'],
                ['Low (40-60%)', '401', '$645', '$258,645', 'Review - Possible consolidation'],
                ['Very Low (<40%)', '123', '$512', '$62,976', 'Action - Consider deactivation']
              ]
            },
            {
              title: 'Average Links per Connection by Provider',
              headers: ['Provider', 'Total Links', 'Total Connections', 'Avg Links/Connection', 'Link Cost', 'Change MoM'],
              rows: [
                ['AWS', '1,459', '456', '3.2', '$889', '+4.2%'],
                ['Azure', '1,234', '398', '3.1', '$774', '+3.8%'],
                ['Google', '765', '247', '3.1', '$710', '+2.9%'],
                ['Oracle', '453', '146', '3.1', '$629', '+2.1%']
              ]
            },
            {
              title: 'Link Cost Efficiency by Connection Type and Provider',
              headers: ['Connection Type', 'AWS', 'Azure', 'Google', 'Oracle', 'Avg'],
              rows: [
                ['Cloud to Cloud', '$878', '$812', '$798', '$745', '$821'],
                ['Site to Cloud', '$892', '$842', '$821', '$798', '$838'],
                ['Internet to Cloud', '$745', '$712', '$689', '$672', '$710'],
                ['VPN to Cloud', '$768', '$732', '$701', '$689', '$725'],
                ['Datacenter to Cloud', '$712', '$672', '$645', '$621', '$667']
              ]
            },
            {
              title: 'Link Economics Optimization Opportunities',
              headers: ['Opportunity', 'Links Affected', 'Current Revenue', 'Potential Revenue', 'Monthly Impact', 'Priority'],
              rows: [
                ['Consolidate underutilized links', '123', '$62,976', '$0', '-$62,976 cost', 'High'],
                ['Upgrade high-utilization links', '87', '$73,254', '$94,500', '+$21,246 revenue', 'High'],
                ['Right-size medium links', '234', '$151,020', '$168,900', '+$17,880 revenue', 'Medium'],
                ['Optimize provider mix', '456', '$331,968', '$362,880', '+$30,912 revenue', 'Medium'],
                ['Deactivate inactive links', '23', '$11,776', '$0', '-$11,776 cost', 'Low']
              ]
            }
          ]
        };

      case 'report-15-datacenter-provider':
        return {
          summary: [
            { label: 'Total Data Center Providers', value: '4', trend: 'Cisco Jasper, Equinix, Databank, CoreWeave' },
            { label: 'Total IPEs', value: '42', trend: '+2 new sites' },
            { label: 'Most Utilized Provider', value: 'Equinix', trend: '18 sites, 78% avg util' },
            { label: 'Highest Revenue', value: '$1.24M/mo', trend: 'Equinix' }
          ],
          tables: [
            {
              title: 'Data Center Provider Overview',
              headers: ['Provider', 'IPEs', 'Total Connections', 'Total Links', 'Total VNFs', 'Installed Capacity', 'Avg Utilization'],
              rows: [
                ['Equinix', '18', '562', '1,742', '894', '687 Gbps', '78%'],
                ['Cisco Jasper', '12', '387', '1,198', '612', '458 Gbps', '72%'],
                ['Databank', '8', '218', '676', '345', '312 Gbps', '68%'],
                ['CoreWeave', '4', '80', '231', '118', '95 Gbps', '65%']
              ]
            },
            {
              title: 'Revenue per Data Center Provider',
              headers: ['Provider', 'Monthly Revenue', 'ARPC', 'Revenue per IPE', 'Revenue per Gbps', 'Growth Rate'],
              rows: [
                ['Equinix', '$1,244,320', '$2,214', '$69,129', '$1,812', '+12.4%'],
                ['Cisco Jasper', '$924,540', '$2,389', '$77,045', '$2,019', '+10.8%'],
                ['Databank', '$478,960', '$2,197', '$59,870', '$1,535', '+8.2%'],
                ['CoreWeave', '$152,180', '$1,902', '$38,045', '$1,603', '+15.6%']
              ]
            },
            {
              title: 'Cloud Provider On-Ramps per Data Center',
              headers: ['Data Center Provider', 'AWS On-Ramps', 'Azure On-Ramps', 'Google On-Ramps', 'Oracle On-Ramps', 'Total'],
              rows: [
                ['Equinix', '18', '18', '16', '12', '64'],
                ['Cisco Jasper', '12', '12', '10', '8', '42'],
                ['Databank', '8', '7', '6', '4', '25'],
                ['CoreWeave', '4', '4', '3', '2', '13']
              ]
            },
            {
              title: 'Data Center Provider Efficiency Metrics',
              headers: ['Provider', 'Connections per IPE', 'Links per IPE', 'VNFs per IPE', 'Capacity per IPE', 'Efficiency Score'],
              rows: [
                ['Equinix', '31.2', '96.8', '49.7', '38.2 Gbps', '96/100'],
                ['Cisco Jasper', '32.3', '99.8', '51.0', '38.2 Gbps', '94/100'],
                ['Databank', '27.3', '84.5', '43.1', '39.0 Gbps', '89/100'],
                ['CoreWeave', '20.0', '57.8', '29.5', '23.8 Gbps', '87/100']
              ]
            },
            {
              title: 'Top IPEs by Data Center Provider',
              headers: ['IPE', 'Provider', 'Connections', 'Links', 'Revenue', 'Utilization'],
              rows: [
                ['NYC-2 (Equinix)', 'Equinix', '158', '489', '$442,530', '72%'],
                ['Dallas-1 (Cisco Jasper)', 'Cisco Jasper', '142', '440', '$398,420', '68%'],
                ['Chicago-1 (Equinix)', 'Equinix', '134', '415', '$378,240', '76%'],
                ['SFO-1 (Databank)', 'Databank', '127', '394', '$342,580', '58%'],
                ['Atlanta-1 (Cisco Jasper)', 'Cisco Jasper', '118', '366', '$312,890', '65%']
              ]
            }
          ]
        };

      case 'report-16-hub-aggregation':
        return {
          summary: [
            { label: 'Total Hubs', value: '487', trend: '+23 this month' },
            { label: 'Avg Links per Hub', value: '7.9', trend: '+0.4' },
            { label: 'Total Aggregated Links', value: '3,847', trend: '+142 links' },
            { label: 'Avg VNFs per Link', value: '1.3', trend: '4,999 total VNFs' }
          ],
          tables: [
            {
              title: 'Hub Distribution by Connection Type',
              headers: ['Connection Type', 'Connections', 'Hubs', 'Avg CR per Conn', 'Total Links', 'Avg Links per CR'],
              rows: [
                ['Cloud to Cloud', '316', '158', '0.5', '1,201', '7.6'],
                ['Site to Cloud', '342', '171', '0.5', '1,061', '6.2'],
                ['Internet to Cloud', '289', '89', '0.3', '896', '10.1'],
                ['VPN to Cloud', '187', '56', '0.3', '542', '9.7'],
                ['Datacenter to Cloud', '113', '45', '0.4', '338', '7.5']
              ]
            },
            {
              title: 'Hub Capacity & Utilization',
              headers: ['Hub Tier', 'Count', 'Avg Capacity', 'Avg Links', 'Avg Utilization', 'Status'],
              rows: [
                ['Large (>10 Links)', '87', '52 Gbps', '14.2', '82%', 'High utilization'],
                ['Medium (5-10 Links)', '234', '28 Gbps', '7.4', '74%', 'Optimal'],
                ['Small (2-4 Links)', '142', '12 Gbps', '3.1', '68%', 'Optimal'],
                ['Minimal (1 Link)', '24', '5 Gbps', '1.0', '54%', 'Consider consolidation']
              ]
            },
            {
              title: 'Links within Hubs by Provider',
              headers: ['Provider', 'Hubs', 'Total Links', 'Avg Links per CR', 'Avg VNFs per Link', 'Total VNFs'],
              rows: [
                ['AWS', '183', '1,459', '8.0', '1.4', '2,043'],
                ['Azure', '162', '1,234', '7.6', '1.3', '1,604'],
                ['Google', '98', '765', '7.8', '1.2', '918'],
                ['Oracle', '58', '453', '7.8', '1.1', '498']
              ]
            },
            {
              title: 'VNF Distribution per Link',
              headers: ['VNFs per Link', 'Link Count', 'Percentage', 'Total VNFs', 'Avg Revenue per Link'],
              rows: [
                ['1 VNF', '2,847', '74.0%', '2,847', '$698'],
                ['2 VNFs', '789', '20.5%', '1,578', '$842'],
                ['3 VNFs', '178', '4.6%', '534', '$956'],
                ['4+ VNFs', '33', '0.9%', '156', '$1,124']
              ]
            },
            {
              title: 'Hub Optimization Opportunities',
              headers: ['Opportunity', 'Hubs', 'Current Links', 'Potential Impact', 'Priority', 'Est. Savings'],
              rows: [
                ['Consolidate single-link CRs', '24', '24', 'Reduce CR count', 'High', '$18,400/mo'],
                ['Expand high-utilization CRs', '87', '1,235', 'Add capacity', 'High', 'Revenue opportunity'],
                ['Optimize Link distribution', '45', '287', 'Balance load', 'Medium', '$12,300/mo'],
                ['Right-size CR capacity', '78', '542', 'Adjust bandwidth', 'Medium', '$24,600/mo']
              ]
            }
          ]
        };

      case 'report-17-hierarchy-analysis':
        return {
          summary: [
            { label: 'Total Connections', value: '1,247', trend: '+12%' },
            { label: 'Total Hubs', value: '487', trend: '0.4 CR per Connection' },
            { label: 'Total Links', value: '3,847', trend: '3.1 Links per Connection' },
            { label: 'Total VNFs', value: '4,999', trend: '1.3 VNFs per Link' }
          ],
          tables: [
            {
              title: 'Connection Hierarchy Overview',
              headers: ['Level', 'Total Count', 'Avg per Parent', 'Capacity', 'Utilization', 'Revenue Contribution'],
              rows: [
                ['Connections', '1,247', 'N/A', '5,986 Gbps', '72%', '$2,800,000'],
                ['Hubs', '487', '0.39 per Connection', '5,986 Gbps', '72%', '$2,800,000'],
                ['Links', '3,847', '7.9 per Hub', '5,986 Gbps', '72%', '$2,800,000'],
                ['VNFs', '4,999', '1.3 per Link', 'N/A', 'N/A', 'Processing capacity'],
                ['IPE Associations', '42 sites', 'Multiple per Link', '5,986 Gbps', '73%', 'Infrastructure']
              ]
            },
            {
              title: 'Resource Distribution by Connection Type',
              headers: ['Connection Type', 'Connections', 'Hubs', 'Links', 'VNFs', 'Avg VNFs per Conn'],
              rows: [
                ['Cloud to Cloud', '316', '158', '1,201', '1,681', '5.3'],
                ['Site to Cloud', '342', '171', '1,061', '1,380', '4.0'],
                ['Internet to Cloud', '289', '89', '896', '1,165', '4.0'],
                ['VPN to Cloud', '187', '56', '542', '704', '3.8'],
                ['Datacenter to Cloud', '113', '45', '338', '439', '3.9']
              ]
            },
            {
              title: 'Links per Connection Distribution',
              headers: ['Links per Connection', 'Connection Count', 'Percentage', 'Total Links', 'Total Hubs', 'Avg CR per Conn'],
              rows: [
                ['1-2 Links', '234', '18.8%', '398', '234', '1.0'],
                ['3-4 Links', '547', '43.9%', '1,826', '274', '0.5'],
                ['5-8 Links', '389', '31.2%', '2,334', '195', '0.5'],
                ['9+ Links', '77', '6.2%', '693', '39', '0.5']
              ]
            },
            {
              title: 'VNF per Link Distribution by Provider',
              headers: ['Provider', 'Total Links', '1 VNF', '2 VNFs', '3 VNFs', '4+ VNFs', 'Avg VNFs per Link'],
              rows: [
                ['AWS', '1,459', '1,051', '321', '70', '17', '1.4'],
                ['Azure', '1,234', '914', '251', '56', '13', '1.3'],
                ['Google', '765', '573', '153', '33', '6', '1.2'],
                ['Oracle', '453', '339', '89', '21', '4', '1.1']
              ]
            },
            {
              title: 'IPE Association per Link',
              headers: ['IPE per Link', 'Link Count', 'Percentage', 'Total IPE Associations', 'Avg Links per IPE'],
              rows: [
                ['1 IPE', '3,458', '89.9%', '3,458', '82.3'],
                ['2 IPEs (Redundant)', '356', '9.3%', '712', '17.0'],
                ['3+ IPEs (Multi-site)', '33', '0.9%', '112', '2.7']
              ]
            },
            {
              title: 'Capacity Distribution Across Hierarchy',
              headers: ['Level', 'Total Capacity', 'Utilized Capacity', 'Available Capacity', 'Utilization %', 'Growth Potential'],
              rows: [
                ['Connection Level', '5,986 Gbps', '4,310 Gbps', '1,676 Gbps', '72%', '+1,676 Gbps'],
                ['Hub Level', '5,986 Gbps', '4,310 Gbps', '1,676 Gbps', '72%', 'Matches connection'],
                ['Link Level (Aggregated)', '5,986 Gbps', '4,310 Gbps', '1,676 Gbps', '72%', 'Matches connection'],
                ['IPE Level', '5,986 Gbps', '4,369 Gbps', '1,617 Gbps', '73%', 'Physical infrastructure']
              ]
            }
          ]
        };

      default:
        return null;
    }
  };

  const filteredReports = useMemo(() => {
    const categoryFilters = filters.category || [];
    const statusFilters = filters.status || [];
    const frequencyFilters = filters.frequency || [];

    return availableReports.filter(report => {
      const matchesSearch = !searchQuery ||
        report.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.description.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (categoryFilters.length > 0 && !categoryFilters.includes(report.category)) return false;
      if (statusFilters.length > 0 && !statusFilters.includes(report.status)) return false;
      if (frequencyFilters.length > 0 && !frequencyFilters.includes(report.frequency)) return false;
      return true;
    });
  }, [searchQuery, filters]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-figma-lg font-medium text-fw-heading">Standard Reports</h3>
          <p className="text-figma-base font-medium text-fw-body mt-1">
            NetBond service reports for inventory, capacity, utilization, trends, and customer analytics
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            window.addToast?.({
              type: 'info',
              title: 'Generating Reports',
              message: 'Generating all standard reports. This may take a few minutes.',
              duration: 5000
            });
          }}
        >
          <Download className="h-4 w-4 mr-2" />
          Generate All Reports
        </Button>
      </div>

      {/* Filters & View Toggle */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <SearchFilterBar
            searchPlaceholder="Search reports..."
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            onFilter={toggle}
            activeFilterCount={activeCount}
            isFilterOpen={isOpen}
            filterPanel={
              <TableFilterPanel
                groups={REPORT_FILTER_GROUPS}
                activeFilters={filters}
                onFiltersChange={setFilters}
                isOpen={isOpen}
                onToggle={toggle}
                searchQuery={searchQuery}
                onClearSearch={() => setSearchQuery('')}
              />
            }
            showExport={false}
          />
        </div>
        <div className="flex items-center bg-fw-base rounded-lg border border-fw-secondary p-1">
          <button
            onClick={() => setViewMode('card')}
            className={`p-2 rounded-md transition-colors ${
              viewMode === 'card'
                ? 'text-fw-link bg-fw-accent'
                : 'text-fw-bodyLight hover:text-fw-body'
            }`}
            title="Card View"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-2 rounded-md transition-colors ${
              viewMode === 'table'
                ? 'text-fw-link bg-fw-accent'
                : 'text-fw-bodyLight hover:text-fw-body'
            }`}
            title="Table View"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Reports View */}
      {viewMode === 'card' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredReports.map((report) => {
            const Icon = getCategoryIcon(report.category);
            const isGenerating = generatingReports.has(report.id);

            return (
              <div
                key={report.id}
                className="bg-fw-base border border-fw-secondary rounded-3xl p-6 hover:shadow-lg transition-shadow flex flex-col"
              >
                {/* Header: Icon 24x24 fill=#0057b8 + Title 16px w500 + Desc 14px w500 */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex-shrink-0">
                    <Icon className="h-6 w-6 text-fw-link" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-figma-lg font-medium text-fw-heading mb-1">
                      {report.name}
                    </h4>
                    <p className="text-figma-base font-medium text-fw-body leading-relaxed">
                      {report.description}
                    </p>
                  </div>
                </div>

                {/* Spacer to push content to bottom */}
                <div className="flex-1"></div>

                {/* Tags: fill=#f3f4f6 r=8 pad=4/8, text 12px w500 #454b52 */}
                <div className="flex items-center flex-wrap gap-2 mb-3">
                  <span className={`px-2 py-1 text-figma-sm font-medium rounded-lg ${getCategoryColor(report.category)}`}>
                    {report.category.charAt(0).toUpperCase() + report.category.slice(1)}
                  </span>
                  {getStatusBadge(isGenerating ? 'generating' : report.status)}
                  <span className="px-2 py-1 text-figma-sm font-medium bg-fw-neutral text-fw-body rounded-lg">
                    {report.format}
                  </span>
                  <span className="px-2 py-1 text-figma-sm font-medium text-fw-body">
                    {report.frequency}
                  </span>
                </div>

                {/* Last Generated: 12px w500 #454b52 with clock icon 16x16 */}
                {report.lastGenerated && (
                  <div className="flex items-center text-figma-sm font-medium text-fw-body mb-4">
                    <Calendar className="h-4 w-4 mr-1.5" />
                    <span>
                      Last generated: {new Date(report.lastGenerated).toLocaleDateString()} at{' '}
                      {new Date(report.lastGenerated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {report.size && (
                      <span className="ml-2 text-fw-body">- {report.size}</span>
                    )}
                  </div>
                )}

                {/* Divider between content and buttons */}
                <div className="border-t border-fw-secondary mb-4"></div>

                {/* Action Buttons: pill (r=800), h=36, 14px w500 */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleGenerateReport(report.id)}
                    disabled={isGenerating}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-full bg-fw-primary text-white text-figma-base font-medium hover:bg-fw-primaryHover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <FileText className="h-4 w-4" />
                    {isGenerating ? 'Generating...' : 'Generate'}
                  </button>
                  {report.lastGenerated && (
                    <button
                      onClick={() => setPreviewReport(report)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-full border border-fw-link text-fw-link text-figma-base font-medium hover:bg-fw-accent transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                      Preview
                    </button>
                  )}
                </div>
              </div>
          );
        })}
      </div>
      ) : (
        <DataTable
          tableId="standard-reports"
          columns={[
            {
              id: 'name',
              label: 'Report Name',
              sortable: true,
              render: (report: typeof filteredReports[0]) => {
                const Icon = getCategoryIcon(report.category);
                return (
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center bg-fw-neutral rounded-lg">
                      <Icon className="h-4 w-4 text-fw-body" />
                    </div>
                    <div className="ml-3">
                      <div className="text-[14px] font-medium text-fw-heading">{report.name}</div>
                      <div className="text-[12px] text-fw-bodyLight">
                        {report.format} - {report.frequency}
                        {report.size && ` - ${report.size}`}
                      </div>
                    </div>
                  </div>
                );
              }
            },
            {
              id: 'category',
              label: 'Category',
              sortable: true,
              render: (report: typeof filteredReports[0]) => (
                <span className={`px-2 py-1 text-[12px] font-medium rounded-full ${getCategoryColor(report.category)}`}>
                  {report.category.charAt(0).toUpperCase() + report.category.slice(1)}
                </span>
              )
            },
            {
              id: 'lastGenerated',
              label: 'Last Generated',
              sortable: true,
              render: (report: typeof filteredReports[0]) => report.lastGenerated ? (
                <div className="flex items-center">
                  <Calendar className="h-3.5 w-3.5 mr-1.5 text-fw-bodyLight" />
                  <span>{new Date(report.lastGenerated).toLocaleDateString()}</span>
                </div>
              ) : (
                <span className="text-fw-bodyLight">Never</span>
              )
            },
            {
              id: 'status',
              label: 'Status',
              render: (report: typeof filteredReports[0]) => getStatusBadge(generatingReports.has(report.id) ? 'generating' : report.status)
            },
          ]}
          data={filteredReports}
          keyField="id"
          onRowClick={(report) => setPreviewReport(report)}
          actions={(report) => {
            const items = [];
            if (report.lastGenerated) {
              items.push({ id: 'preview', label: 'Preview', icon: <Eye className="h-4 w-4" />, onClick: () => setPreviewReport(report) });
              items.push({ id: 'download', label: 'Download', icon: <Download className="h-4 w-4" />, onClick: () => handleDownloadReport(report) });
            }
            items.push({ id: 'generate', label: 'Generate', icon: <FileText className="h-4 w-4" />, onClick: () => handleGenerateReport(report.id) });
            return items;
          }}
          emptyState={
            <div className="py-8">
              <FileText className="h-8 w-8 mx-auto text-fw-bodyLight mb-2" />
              <p className="text-fw-bodyLight">No reports match filters</p>
            </div>
          }
        />
      )}

      {filteredReports.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto text-fw-bodyLight mb-4" />
          <h3 className="text-figma-lg font-medium text-fw-heading mb-2">No reports found</h3>
          <p className="text-figma-base font-medium text-fw-body">
            Try adjusting your search or filter criteria
          </p>
        </div>
      )}

      {/* Report Preview Modal */}
      {previewReport && (
        <Modal
          isOpen={true}
          onClose={() => setPreviewReport(null)}
          size="report"
        >
          {(() => {
            const previewData = getReportPreviewData(previewReport.id);
            const story = getReportStory(previewReport.id);
            if (!previewData) return null;

            const SectionLabel = ({ children }: { children: string }) => (
              <div className="flex items-center gap-3 mb-6">
                <div className="h-[2px] w-6 bg-[#009fdb] flex-shrink-0 rounded-full" />
                <span className="text-[11px] font-semibold text-fw-bodyLight tracking-[0.14em] uppercase">
                  {children}
                </span>
              </div>
            );

            return (
              <div>

                {/* AT&T Branded Header */}
                <div className="rounded-2xl px-7 py-7 mb-0 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1769d0 0%, #1060bc 100%)' }}>
                  <div className="absolute -right-10 -top-10 pointer-events-none select-none" aria-hidden="true">
                    <img src={attGlobe} alt="" className="h-72 w-72 object-contain opacity-20" />
                  </div>

                  <div className="relative z-10">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center mb-5">
                          <span className="text-base font-bold text-white tracking-[-0.03em]">AT&amp;T</span>
                          <span className="ml-2 text-base font-bold text-white tracking-[-0.03em]">AI-grade network</span>
                        </div>
                        <h2 className="text-white text-[22px] font-bold leading-snug tracking-[-0.02em] mb-4 max-w-[540px]">
                          {previewReport.name}
                        </h2>
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-white/55 text-[12px] font-medium">
                          <span className="uppercase tracking-wide">{previewReport.format}</span>
                          <span className="text-white/25">·</span>
                          <span className="capitalize">{previewReport.frequency}</span>
                          {previewReport.lastGenerated && (
                            <>
                              <span className="text-white/25">·</span>
                              <span>Generated {new Date(previewReport.lastGenerated).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                            </>
                          )}
                          {previewReport.size && (
                            <>
                              <span className="text-white/25">·</span>
                              <span>{previewReport.size}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0 mt-1">
                        <span className="px-3 py-1.5 border border-white/30 text-white/75 text-[11px] font-semibold uppercase tracking-[0.1em] rounded-md">
                          {previewReport.category}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Key Findings */}
                {story && (
                  <div className="pt-8 pb-8 border-b border-fw-secondary">
                    <SectionLabel>Key Findings</SectionLabel>
                    <p className="text-[17px] font-bold text-fw-heading leading-snug mb-5 max-w-[680px]">
                      {story.headline}
                    </p>
                    <div className="space-y-3">
                      {story.insights.map((insight, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className="mt-[8px] h-[6px] w-[6px] rounded-full bg-[#009fdb] flex-shrink-0" />
                          <p className="text-[13px] text-fw-body leading-relaxed">{insight}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* At a Glance — dominant KPI strip */}
                <div className="pt-8 pb-8 border-b border-fw-secondary">
                  <SectionLabel>At a Glance</SectionLabel>
                  <div className="grid grid-cols-4 divide-x divide-fw-secondary">
                    {previewData.summary.map((item, idx) => (
                      <div key={idx} className={idx === 0 ? 'pr-8' : idx === previewData.summary.length - 1 ? 'pl-8' : 'px-8'}>
                        <div className="text-[11px] font-medium text-fw-bodyLight uppercase tracking-wider mb-3 leading-tight">
                          {item.label}
                        </div>
                        <div className={`font-bold tracking-tight leading-none mb-2 ${
                          idx === 0 ? 'text-[42px] text-[#009fdb]' : 'text-[28px] text-fw-heading'
                        }`}>
                          {item.value}
                        </div>
                        <div className={`text-[12px] font-medium ${
                          idx === 0 ? 'text-[#009fdb]/80' : 'text-fw-success'
                        }`}>
                          {item.trend}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Report Details */}
                <div className="pt-8 space-y-4">
                  <SectionLabel>Report Details</SectionLabel>
                  {previewData.tables.map((table, tableIdx) => (
                    <div key={tableIdx} className="rounded-xl overflow-hidden border border-fw-secondary">
                      <div className="bg-fw-wash px-5 py-3 border-b border-fw-secondary">
                        <h4 className="text-[13px] font-semibold text-fw-heading">{table.title}</h4>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full">
                          <thead>
                            <tr className="border-b border-fw-secondary">
                              {table.headers.map((header, headerIdx) => (
                                <th
                                  key={headerIdx}
                                  className="px-5 py-3 text-left text-[11px] font-semibold text-fw-bodyLight uppercase tracking-[0.07em] whitespace-nowrap"
                                >
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {table.rows.map((row, rowIdx) => (
                              <tr
                                key={rowIdx}
                                className={`border-b border-fw-secondary last:border-0 hover:bg-[#e6f0fa]/40 transition-colors ${
                                  rowIdx % 2 === 1 ? 'bg-fw-wash/60' : 'bg-white'
                                }`}
                              >
                                {row.map((cell, cellIdx) => (
                                  <td
                                    key={cellIdx}
                                    className={`px-5 py-3 text-[13px] whitespace-nowrap ${
                                      cellIdx === 0 ? 'font-semibold text-fw-heading' : 'text-fw-body'
                                    }`}
                                  >
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer actions */}
                <div className="flex items-center justify-end gap-3 pt-6 mt-6 border-t border-fw-secondary">
                  <Button variant="secondary" onClick={() => setPreviewReport(null)}>
                    Close
                  </Button>
                  <Button variant="secondary" icon={Download} onClick={() => { handleDownloadReport(previewReport); setPreviewReport(null); }}>
                    Download
                  </Button>
                  <Button variant="primary" icon={FileText} onClick={() => { handleGenerateReport(previewReport.id); setPreviewReport(null); }}>
                    Generate New
                  </Button>
                </div>

              </div>
            );
          })()}
        </Modal>
      )}
    </div>
  );
}
