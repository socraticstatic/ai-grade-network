import type { TestPersona } from '../../../../types/testLab';

export const personas: TestPersona[] = [
  {
    id: 'ga-netops',
    name: 'Priya Raman — Network Operations Lead, Meridian Retail Group',
    bio: 'You own day-two operations for Meridian’s AWS interconnect. The migration your team fought for is live, finance is watching the spend, and every status question lands on your desk first.',
    goal: 'Keep the AWS interconnect healthy through the migration — and execute the cost changes finance keeps asking for without breaking anything.',
    rbacRole: 'NetworkEngineer',
    seedId: 'ga-baseline',
  },
  {
    id: 'ga-billing',
    name: 'Marcus Chen — Billing Administrator, Meridian Retail Group',
    bio: 'You close the books. Network is your biggest line item this quarter and the CFO wants numbers she can defend — what it costs, why, and when charges actually start.',
    goal: 'Report this account’s network spend accurately for quarter close, including what discounts apply and which circuits are actually billing.',
    rbacRole: 'BillingAdmin',
    seedId: 'ga-baseline',
  },
  {
    id: 'ga-feature-owner',
    name: 'Jordan Ellery — LMCC Feature Owner, AT&T Product',
    bio: 'You own this feature. You wrote the requirements, argued for the two-word status model, and on Monday you answer for every screen. You are not here to complete tasks — you are here to catch what everyone else missed.',
    goal: 'Walk the entire lifecycle end to end — order, wait, Live, change, delete — and leave with a list of what ships and what gets fixed first.',
    rbacRole: 'TenantAdmin',
    seedId: 'ga-baseline',
  },
];
