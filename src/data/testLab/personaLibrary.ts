// Standing persona library for the Study Builder.
// Each entry maps to an existing RBAC role so impersonation works without wiring,
// and carries suggested task templates so studies don't start from scratch.
import type { RoleName } from '../../types/rbac';

export interface LibraryPersona {
  id: string;
  title: string;
  characterName: string;
  bio: string;
  goal: string;
  rbacRole: RoleName;
  suggestedTemplateIds: string[];
}

export const PERSONA_LIBRARY: LibraryPersona[] = [
  {
    id: 'feature-owner',
    title: 'Feature Owner',
    characterName: 'Jordan Ellery',
    rbacRole: 'TenantAdmin',
    bio: 'You own this feature. You wrote the requirements, you argued for the status model, and on Monday you answer for every screen. You are not here to complete tasks — you are here to catch what everyone else missed.',
    goal: 'Walk the entire lifecycle end to end — order, wait, live, change, delete — and leave with a list of what ships and what gets fixed first.',
    suggestedTemplateIds: ['exec-health-read', 'billing-start-trigger', 'audit-recent-changes', 'monthly-spend-by-provider'],
  },
  {
    id: 'cto',
    title: 'CTO',
    characterName: 'Elena Vasquez',
    rbacRole: 'Viewer',
    bio: 'You are the CTO of Halcyon Logistics, a national freight company mid-way through a cloud migration. You do not touch configuration — you need the network story fast, in numbers the board will trust.',
    goal: 'Walk into Thursday’s board meeting able to state the health, spend trend, and risk of the cloud network in one slide.',
    suggestedTemplateIds: ['exec-health-read', 'exec-brief-takeaway', 'monthly-spend-by-provider', 'locate-glossary'],
  },
  {
    id: 'cio',
    title: 'CIO',
    characterName: 'Marcus Chen',
    rbacRole: 'ClientAdmin',
    bio: 'You are the CIO of Beacon Health Systems, accountable for uptime, spend, and audit posture across four hospital campuses. Your teams do the work; you verify it is governed.',
    goal: 'Confirm the cloud connectivity program is healthy, on budget, and auditable before your quarterly governance review.',
    suggestedTemplateIds: ['exec-health-read', 'monthly-spend-by-provider', 'audit-recent-changes', 'billing-start-trigger'],
  },
  {
    id: 'technical-seller',
    title: 'Technical Seller',
    characterName: 'Dre Whitfield',
    rbacRole: 'ClientAdmin',
    bio: 'You are an AT&T technical seller demoing the AI-grade network to a skeptical enterprise prospect this afternoon. Everything must look effortless — you need to know every click before they see it.',
    goal: 'Rehearse a flawless end-to-end demo: from empty state to a live connection with monitoring you can show off.',
    suggestedTemplateIds: ['demo-end-to-end', 'find-connection-entry', 'interpret-order-status', 'exec-health-read', 'locate-glossary'],
  },
  {
    id: 'network-planner',
    title: 'Network Planner',
    characterName: 'Priya Raman',
    rbacRole: 'ProvisioningManager',
    bio: 'You plan capacity for Northstar Retail’s 600-store network. A new distribution hub comes online next quarter and its analytics workloads land in the cloud — you size and order the circuits.',
    goal: 'Get the right connection, at the right bandwidth, ordered for the new distribution hub before the build window closes.',
    suggestedTemplateIds: ['find-connection-entry', 'provision-aws-connection', 'bandwidth-limit-recovery', 'compare-resiliency', 'interpret-order-status'],
  },
  {
    id: 'network-operator',
    title: 'Network Operator',
    characterName: 'Sam Okafor',
    rbacRole: 'OperationsManager',
    bio: 'You run day-two operations for Vantage Financial’s hybrid network. Your morning starts with alerts, your day is utilization and degraded circuits, and nothing ships without your eyes on it.',
    goal: 'Triage this morning’s alerts, find what is actually degraded, and know which circuit needs capacity attention first.',
    suggestedTemplateIds: ['find-busiest-circuit', 'triage-degraded', 'alert-severity', 'group-connections', 'interpret-order-status'],
  },
  {
    id: 'network-architect',
    title: 'Network Architect',
    characterName: 'Ingrid Sørensen',
    rbacRole: 'NetworkEngineer',
    bio: 'You own the reference architecture at Cobalt Manufacturing. Hubs, resiliency levels, and where the VNFs sit are your decisions — and you defend them in design reviews.',
    goal: 'Stand up the hub-and-spoke design for the new plant: hub, connection, and a firewall VNF placed where it protects the traffic.',
    suggestedTemplateIds: ['create-hub', 'provision-aws-connection', 'attach-vnf', 'compare-resiliency', 'group-connections'],
  },
  {
    id: 'billing-admin',
    title: 'Billing Admin',
    characterName: 'Rosa Delgado',
    rbacRole: 'BillingAdmin',
    bio: 'You own cloud connectivity spend at Meridian Retail Group. Finance asks you hard questions about when charges start and which provider costs what — and you answer from the portal, not from memory.',
    goal: 'Answer finance’s two standing questions: when does the new circuit start billing, and where is this month’s money going.',
    suggestedTemplateIds: ['billing-start-trigger', 'monthly-spend-by-provider', 'find-connection-details'],
  },
  {
    id: 'support-representative',
    title: 'Support Representative',
    characterName: 'Jordan Blake',
    rbacRole: 'SupportSpecialist',
    bio: 'You take first-line calls for Meridian Retail Group’s network team. Customers describe symptoms; you turn them into tickets with the right facts attached, and you know what you can and cannot change.',
    goal: 'Handle a store manager’s "the network feels slow" call: find the facts, open a well-formed ticket, and report status back.',
    suggestedTemplateIds: ['ticket-raise', 'ticket-status', 'triage-degraded', 'wall-order-attempt'],
  },
  {
    id: 'security-compliance-admin',
    title: 'Security & Compliance Admin',
    characterName: 'Aisha Mbeki',
    rbacRole: 'SecurityAdmin',
    bio: 'You run access governance for Beacon Health Systems. Every quarter you prove that only the right people can change the network and that every change is traceable to a person and a time.',
    goal: 'Complete the quarterly access review: who can provision, and who made the most recent configuration change.',
    suggestedTemplateIds: ['audit-recent-changes', 'review-access-roles', 'wall-user-admin'],
  },
  {
    id: 'reseller-partner-manager',
    title: 'Reseller Partner Manager',
    characterName: 'Tomás Rivera',
    rbacRole: 'ResellerAdmin',
    bio: 'You manage the NetBond reseller practice at Skyline Communications. Your revenue is a portfolio of tenants, and your job is knowing which are active, growing, or about to churn.',
    goal: 'Assess the tenant portfolio: how many are active, and which one deserves your attention this week.',
    suggestedTemplateIds: ['tenant-overview', 'exec-health-read', 'find-connection-details'],
  },
  {
    id: 'api-developer',
    title: 'API Developer',
    characterName: 'Kenji Watanabe',
    rbacRole: 'ApiManager',
    bio: 'You automate infrastructure at Vantage Financial. Anything the portal can do, your pipelines must do programmatically — you evaluate the API surface before you write a line of integration code.',
    goal: 'Determine whether provisioning can be fully automated: find the authentication model and the endpoint that creates a connection.',
    suggestedTemplateIds: ['api-key-flow', 'api-provision-reference', 'find-connection-details'],
  },
  {
    id: 'noc-analyst',
    title: 'NOC Analyst',
    characterName: 'Lena Kowalski',
    rbacRole: 'Viewer',
    bio: 'You watch Halcyon Logistics’ network from the NOC on the overnight shift. Read-only by policy — you observe, escalate, and document, but you never change anything yourself.',
    goal: 'Work the overnight checklist: know the busiest circuit, rank the alerts, and understand exactly where your access ends.',
    suggestedTemplateIds: ['find-busiest-circuit', 'alert-severity', 'wall-order-attempt', 'wall-user-admin'],
  },
];
