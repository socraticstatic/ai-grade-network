export interface APIEndpointDoc {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  requestBody?: string;
  responseBody: string;
  curl: string;
}

export const API_ENDPOINTS: APIEndpointDoc[] = [
  {
    method: 'POST',
    path: '/v1/connections',
    description: 'Create a new cloud connection',
    requestBody: JSON.stringify({
      name: 'Production AWS East',
      provider: 'AWS',
      bandwidth: '1 Gbps',
      location: 'Ashburn, VA (Equinix)',
      type: 'Internet to Cloud',
    }, null, 2),
    responseBody: JSON.stringify({
      id: 'conn-1718234567890',
      name: 'Production AWS East',
      status: 'Provisioning',
      provider: 'AWS',
      bandwidth: '1 Gbps',
      location: 'Ashburn, VA (Equinix)',
      createdAt: '2026-04-05T12:00:00Z',
    }, null, 2),
    curl: `curl -X POST https://api.netbond.att.com/v1/connections \\
  -H "Authorization: Bearer NB-KEY-XXXX-XXXX" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Production AWS East","provider":"AWS","bandwidth":"1 Gbps"}'`,
  },
  {
    method: 'GET',
    path: '/v1/connections',
    description: 'List all connections for the current tenant',
    responseBody: JSON.stringify({
      data: [
        { id: 'conn-1', name: 'AWS Max - San Jose', status: 'Active', bandwidth: '1 Gbps' },
        { id: 'conn-2', name: 'Azure ExpressRoute', status: 'Active', bandwidth: '10 Gbps' },
      ],
      total: 2,
      page: 1,
    }, null, 2),
    curl: `curl https://api.netbond.att.com/v1/connections \\
  -H "Authorization: Bearer NB-KEY-XXXX-XXXX"`,
  },
  {
    method: 'GET',
    path: '/v1/connections/:id',
    description: 'Get details for a specific connection',
    responseBody: JSON.stringify({
      id: 'conn-1',
      name: 'AWS Max - San Jose',
      status: 'Active',
      provider: 'AWS',
      bandwidth: '1 Gbps',
      location: 'San Jose, CA',
      performance: { latency: '3.2ms', packetLoss: '0.01%', uptime: '99.99%' },
    }, null, 2),
    curl: `curl https://api.netbond.att.com/v1/connections/conn-1 \\
  -H "Authorization: Bearer NB-KEY-XXXX-XXXX"`,
  },
  {
    method: 'PATCH',
    path: '/v1/connections/:id',
    description: 'Update a connection (bandwidth, name, status)',
    requestBody: JSON.stringify({ bandwidth: '10 Gbps' }, null, 2),
    responseBody: JSON.stringify({
      id: 'conn-1',
      name: 'AWS Max - San Jose',
      bandwidth: '10 Gbps',
      status: 'Active',
      updatedAt: '2026-04-05T12:30:00Z',
    }, null, 2),
    curl: `curl -X PATCH https://api.netbond.att.com/v1/connections/conn-1 \\
  -H "Authorization: Bearer NB-KEY-XXXX-XXXX" \\
  -H "Content-Type: application/json" \\
  -d '{"bandwidth":"10 Gbps"}'`,
  },
  {
    method: 'DELETE',
    path: '/v1/connections/:id',
    description: 'Delete an inactive connection',
    responseBody: JSON.stringify({ deleted: true, id: 'conn-1' }, null, 2),
    curl: `curl -X DELETE https://api.netbond.att.com/v1/connections/conn-1 \\
  -H "Authorization: Bearer NB-KEY-XXXX-XXXX"`,
  },
  {
    method: 'GET',
    path: '/v1/locations',
    description: 'List available interconnect locations by provider',
    responseBody: JSON.stringify({
      data: [
        { label: 'Ashburn, VA (Equinix DC1-DC15)', metro: 'Ashburn', provider: 'AWS' },
        { label: 'Chicago, IL (CoreSite CH1)', metro: 'Chicago', provider: 'AWS' },
      ],
    }, null, 2),
    curl: `curl https://api.netbond.att.com/v1/locations?provider=AWS \\
  -H "Authorization: Bearer NB-KEY-XXXX-XXXX"`,
  },
  {
    method: 'GET',
    path: '/v1/pricing',
    description: 'Get pricing for a provider and bandwidth tier',
    responseBody: JSON.stringify({
      provider: 'AWS',
      bandwidth: '1 Gbps',
      monthlyCost: 999.00,
      currency: 'USD',
      burstModel: 'fixed',
    }, null, 2),
    curl: `curl "https://api.netbond.att.com/v1/pricing?provider=AWS&bandwidth=1000" \\
  -H "Authorization: Bearer NB-KEY-XXXX-XXXX"`,
  },
  {
    method: 'POST',
    path: '/v1/provisioning',
    description: 'Trigger provisioning for a pending connection',
    requestBody: JSON.stringify({ connectionId: 'conn-1' }, null, 2),
    responseBody: JSON.stringify({
      connectionId: 'conn-1',
      status: 'Provisioning',
      steps: ['submitted', 'validating', 'provisioning', 'bgp-establishing', 'active'],
      currentStep: 'submitted',
    }, null, 2),
    curl: `curl -X POST https://api.netbond.att.com/v1/provisioning \\
  -H "Authorization: Bearer NB-KEY-XXXX-XXXX" \\
  -H "Content-Type: application/json" \\
  -d '{"connectionId":"conn-1"}'`,
  },
];

export const METHOD_COLORS: Record<string, { bg: string; text: string }> = {
  GET: { bg: 'bg-fw-success/10', text: 'text-fw-success' },
  POST: { bg: 'bg-fw-link/10', text: 'text-fw-link' },
  PATCH: { bg: 'bg-fw-warn/10', text: 'text-fw-warn' },
  DELETE: { bg: 'bg-fw-error/10', text: 'text-fw-error' },
};
