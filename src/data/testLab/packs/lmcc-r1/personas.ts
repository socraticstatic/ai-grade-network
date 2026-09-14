import type { TestPersona } from '../../../../types/testLab';

export const personas: TestPersona[] = [
  {
    id: 'lmcc-netops',
    name: 'Dana Reyes — Senior Cloud Network Engineer, Meridian Retail Group',
    bio: 'You run cloud connectivity for a 400-store retailer. Your team is migrating point-of-sale analytics to AWS US West, and the VPN you have been limping along on cannot hold the bandwidth.',
    goal: 'Get a dedicated last-mile circuit to AWS ordered before your Friday migration review.',
    rbacRole: 'NetworkEngineer',
    seedId: 'lmcc-baseline',
  },
  {
    id: 'lmcc-viewer',
    name: 'Sam Okafor — NOC Analyst (read-only), Meridian Retail Group',
    bio: 'You watch the network. You do not change it — that is policy. But your lead asked you to check on the new AWS circuit order.',
    goal: 'Find out what the LMCC circuit order would involve, and understand what you can and cannot do about it.',
    rbacRole: 'Viewer',
    seedId: 'lmcc-baseline',
  },
];
