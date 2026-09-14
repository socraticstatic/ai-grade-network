// GA-framed task template library for the Study Builder.
// Every template is a complete task: participant-facing scenario, hints, path,
// and a declarative verifier ref (or comprehension check) — edit, don't author.
import type { CustomTask } from '../../types/testLabBuilder';

export interface TaskTemplate {
  id: string;
  title: string;
  personaIds: string[];
  task: Omit<CustomTask, 'id' | 'version'>;
}

export function instantiateTemplate(tpl: TaskTemplate, seq: number): CustomTask {
  return { ...tpl.task, id: `${tpl.id}-${seq}`, version: 1 };
}

export const TASK_TEMPLATES: TaskTemplate[] = [
  // ── Provisioning / building ────────────────────────────────────────────────
  {
    id: 'find-connection-entry',
    title: 'Find where connections begin',
    personaIds: ['network-planner', 'network-architect', 'technical-seller'],
    task: {
      title: 'Find where connections begin',
      scenario: 'You need a new cloud connection soon. Before anything else, find where in the portal you would start creating one.',
      successCriteria: 'Participant reaches the Create wizard or Marketplace entry point.',
      path: 'happy',
      hints: ['Look at the main navigation.', 'Create and Marketplace are both valid doors.'],
      startRoute: '/manage',
      expectedRoutePrefixes: ['/manage', '/create'],
      comprehensionCheck: {
        question: 'Where can a new connection be started?',
        options: ['Only from the Monitor page', 'From Create or the Marketplace', 'Only by calling support', 'From the Glossary'],
        correctIndex: 1,
      },
    },
  },
  {
    id: 'provision-aws-connection',
    title: 'Provision an AWS connection',
    personaIds: ['network-planner', 'network-architect', 'technical-seller'],
    task: {
      title: 'Provision an AWS connection',
      scenario: 'Your workloads land in AWS next month. Create a new AWS connection and take it all the way to confirmation.',
      successCriteria: 'A new AWS connection exists beyond the session baseline.',
      path: 'happy',
      hints: ['Start from Create.', 'AWS is one of the provider choices in the first step.'],
      startRoute: '/create',
      expectedRoutePrefixes: ['/create', '/manage'],
      verifierRef: { catalogId: 'connection-created', params: { provider: 'AWS' } },
    },
  },
  {
    id: 'provision-azure-connection',
    title: 'Provision an Azure connection',
    personaIds: ['network-planner', 'network-architect'],
    task: {
      title: 'Provision an Azure connection',
      scenario: 'A second cloud is now in scope. Create a connection into Azure and take it through to confirmation.',
      successCriteria: 'A new Azure connection exists beyond the session baseline.',
      path: 'happy',
      hints: ['The wizard supports more providers than AWS.', 'Pick Azure in the provider step and continue as before.'],
      startRoute: '/create',
      expectedRoutePrefixes: ['/create', '/manage'],
      verifierRef: { catalogId: 'connection-created', params: { provider: 'Azure' } },
    },
  },
  {
    id: 'create-hub',
    title: 'Create a hub',
    personaIds: ['network-architect', 'network-planner'],
    task: {
      title: 'Create a hub',
      scenario: 'A new region comes online next quarter and needs an anchor point. Create a hub to serve as the container for its connections.',
      successCriteria: 'A new hub exists beyond the session baseline.',
      path: 'happy',
      hints: ['The guided setup is hub-first.', 'Create walks you through hub before connection.'],
      startRoute: '/create',
      verifierRef: { catalogId: 'hub-created' },
    },
  },
  {
    id: 'attach-vnf',
    title: 'Place a VNF',
    personaIds: ['network-architect'],
    task: {
      title: 'Place a VNF',
      scenario: 'Security wants a firewall in the path of the new circuit. Add a firewall VNF and place it where it actually protects that traffic.',
      successCriteria: 'A new VNF exists beyond the session baseline.',
      path: 'happy',
      hints: ['The guided setup offers a VNF step.', 'Placement matters — read the topology strip as you choose.'],
      startRoute: '/create',
      verifierRef: { catalogId: 'vnf-created' },
    },
  },
  {
    id: 'bandwidth-limit-recovery',
    title: 'Recover from a bandwidth limit',
    personaIds: ['network-planner'],
    task: {
      title: 'Recover from a bandwidth limit',
      scenario: 'Your architect asked for more bandwidth than you suspect the chosen location supports. Try to order it anyway — and end with a configuration the product accepts.',
      successCriteria: 'Participant encounters a validation limit and still lands a valid new connection.',
      path: 'bad-input',
      hints: ['Watch what the form tells you when you push bandwidth up.', 'Adjust to what the location supports and continue.'],
      startRoute: '/create',
      verifierRef: { catalogId: 'connection-created' },
    },
  },
  {
    id: 'compare-resiliency',
    title: 'Choose a resiliency level',
    personaIds: ['network-architect', 'network-planner'],
    task: {
      title: 'Choose a resiliency level',
      scenario: 'Compliance mandates that the new circuit survives a full site failure. Work out which resiliency option satisfies that and why.',
      successCriteria: 'Comprehension: geodiversity/maximum resiliency spans locations; standard does not.',
      path: 'happy',
      hints: ['The wizard explains each resiliency option where you select it.'],
      startRoute: '/create',
      comprehensionCheck: {
        question: 'Which resiliency choice protects against an entire site going down?',
        options: ['Standard — single path', 'Geodiversity — paths from different locations', 'Any option, they are equivalent', 'None; site failure always means an outage'],
        correctIndex: 1,
      },
    },
  },
  {
    id: 'demo-end-to-end',
    title: 'Run the full demo flow',
    personaIds: ['technical-seller'],
    task: {
      title: 'Run the full demo flow',
      scenario: 'Your prospect wants to see the whole thing: start from nothing and finish with a confirmed connection, narrating as if they were watching.',
      successCriteria: 'A new connection exists beyond the session baseline.',
      path: 'happy',
      hints: ['Create walks the full journey: hub, connection, and options.'],
      startRoute: '/manage',
      expectedRoutePrefixes: ['/manage', '/create'],
      verifierRef: { catalogId: 'connection-created' },
    },
  },
  {
    id: 'group-connections',
    title: 'Group related circuits',
    personaIds: ['network-operator', 'network-architect'],
    task: {
      title: 'Group related circuits',
      scenario: 'The east-region circuits belong together operationally. Organize related connections into a group so the team can watch them as one unit.',
      successCriteria: 'A new group exists beyond the session baseline.',
      path: 'happy',
      hints: ['Look for Groups in the manage area.'],
      startRoute: '/groups',
      verifierRef: { catalogId: 'group-created' },
    },
  },

  // ── Operating / monitoring ─────────────────────────────────────────────────
  {
    id: 'find-busiest-circuit',
    title: 'Find the busiest circuit',
    personaIds: ['network-operator', 'noc-analyst'],
    task: {
      title: 'Find the busiest circuit',
      scenario: 'Capacity planning wants to know which connection is running hottest right now. Find it and note its utilization.',
      successCriteria: 'Comprehension: identifies the highest-utilization connection from the list or monitoring views.',
      path: 'happy',
      hints: ['Utilization shows on the connection list.', 'Sorting or scanning the utilization column gets you there.'],
      startRoute: '/manage',
      comprehensionCheck: {
        question: 'Roughly how utilized is the busiest connection?',
        options: ['Under 20%', 'Around 50%', '80% or higher', 'Utilization isn’t shown anywhere'],
        correctIndex: 2,
      },
    },
  },
  {
    id: 'triage-degraded',
    title: 'Triage the degraded connection',
    personaIds: ['network-operator', 'support-representative'],
    task: {
      title: 'Triage the degraded connection',
      scenario: 'A user reports the network "feels slow". Find whether any connection is actually degraded or down, and identify which one.',
      successCriteria: 'Comprehension: locates a non-Active connection via status indicators.',
      path: 'happy',
      hints: ['Status shows as a colored dot with text on each connection.', 'Filters can narrow the list by status.'],
      startRoute: '/manage',
      comprehensionCheck: {
        question: 'What did you find?',
        options: ['Every connection is Active', 'At least one connection is not in an Active state', 'Status isn’t visible to me', 'The list is empty'],
        correctIndex: 1,
      },
    },
  },
  {
    id: 'alert-severity',
    title: 'Rank the active alerts',
    personaIds: ['network-operator', 'noc-analyst'],
    task: {
      title: 'Rank the active alerts',
      scenario: 'You have five minutes before standup. Check the current alerts and decide which one needs action first.',
      successCriteria: 'Comprehension: distinguishes severity levels in the monitoring/alerts view.',
      path: 'happy',
      hints: ['Monitor holds the alerts view.', 'Severity is part of each alert’s presentation.'],
      startRoute: '/monitor',
      comprehensionCheck: {
        question: 'How do you decide which alert to act on first?',
        options: ['Alphabetical order', 'By severity, highest first', 'Oldest first regardless of severity', 'Alerts have no ordering signal'],
        correctIndex: 1,
      },
    },
  },
  {
    id: 'interpret-order-status',
    title: 'Read a fresh order’s state',
    personaIds: ['network-planner', 'technical-seller', 'network-operator'],
    task: {
      title: 'Read a fresh order’s state',
      scenario: 'A circuit was ordered recently. Find it in the connections list and determine: is it carrying traffic yet, and if not, what is it doing?',
      successCriteria: 'Comprehension: reads Provisioning/Pending vs Active from the status presentation.',
      path: 'happy',
      hints: ['Newest connections sort near the top of their type group.', 'The status dot and text tell the story.'],
      startRoute: '/manage',
      comprehensionCheck: {
        question: 'A connection showing “Provisioning” means:',
        options: ['It is live and carrying traffic', 'It was ordered and is being set up', 'It failed and must be reordered', 'It is suspended for billing'],
        correctIndex: 1,
      },
    },
  },
  {
    id: 'find-connection-details',
    title: 'Pull a fact from a detail page',
    personaIds: ['billing-admin', 'reseller-partner-manager', 'api-developer', 'network-operator'],
    task: {
      title: 'Pull a fact from a detail page',
      scenario: 'Someone asks you for the bandwidth of a specific connection. Open any connection’s detail page and find its configured bandwidth.',
      successCriteria: 'Comprehension: navigates list → detail and reads a configuration fact.',
      path: 'happy',
      hints: ['Click a connection’s name in the list.', 'Configuration facts live in the detail tabs.'],
      startRoute: '/manage',
      comprehensionCheck: {
        question: 'Where did you find the bandwidth?',
        options: ['On the connection’s detail page', 'Only in the glossary', 'It is not recorded anywhere', 'In the ticket system'],
        correctIndex: 0,
      },
    },
  },

  // ── Money ─────────────────────────────────────────────────────────────────
  {
    id: 'billing-start-trigger',
    title: 'When does billing start?',
    personaIds: ['billing-admin', 'cio'],
    task: {
      title: 'When does billing start?',
      scenario: 'Finance needs one answer before signing off on the new circuit: at what moment does AT&T start charging for it?',
      successCriteria: 'Comprehension: billing starts at circuit activation (BGP established), not at order time.',
      path: 'happy',
      hints: ['Billing details live with the connection and in the product’s billing content.'],
      startRoute: '/manage',
      comprehensionCheck: {
        question: 'When does billing begin for a new circuit?',
        options: ['The moment the order is placed', 'When the circuit goes live', 'The first day of the next month', 'After a free 30-day period'],
        correctIndex: 1,
      },
    },
  },
  {
    id: 'monthly-spend-by-provider',
    title: 'Find the biggest spend',
    personaIds: ['billing-admin', 'cio', 'cto'],
    task: {
      title: 'Find the biggest spend',
      scenario: 'You are preparing the monthly cost review. Determine which cloud provider accounts for the largest share of connectivity spend.',
      successCriteria: 'Comprehension: reads spend/billing breakdown and names the top provider.',
      path: 'happy',
      hints: ['Billing views break spend down by provider.', 'Configure holds billing configuration and summaries.'],
      startRoute: '/manage',
      comprehensionCheck: {
        question: 'How is spend broken down in the portal?',
        options: ['A single total with no breakdown', 'By provider and connection', 'Only by calendar year', 'Spend isn’t visible in the portal'],
        correctIndex: 1,
      },
    },
  },

  // ── Walls ─────────────────────────────────────────────────────────────────
  {
    id: 'wall-order-attempt',
    title: 'Attempt an order without rights',
    personaIds: ['noc-analyst', 'support-representative'],
    task: {
      title: 'Attempt an order without rights',
      scenario: 'Your lead pings you: “just go ahead and order that circuit.” Try to do exactly that.',
      successCriteria: 'Nothing is created; participant can articulate the permission boundary.',
      path: 'permission-wall',
      hints: ['Notice what the interface offers you — and what it doesn’t.'],
      startRoute: '/manage',
      verifierRef: { catalogId: 'no-new-entities' },
      comprehensionCheck: {
        question: 'Why couldn’t you place the order?',
        options: ['The product is down', 'My role doesn’t include provisioning rights', 'Orders require a ticket first', 'The location is sold out'],
        correctIndex: 1,
      },
    },
  },
  {
    id: 'wall-user-admin',
    title: 'Attempt a role change without rights',
    personaIds: ['support-representative', 'noc-analyst', 'security-compliance-admin'],
    task: {
      title: 'Attempt a role change without rights',
      scenario: 'A colleague asks you to bump their access "real quick". Try to change their role in user management.',
      successCriteria: 'No change lands; participant understands who administers access.',
      path: 'permission-wall',
      hints: ['User management lives under Configure.', 'Watch which controls are available to you there.'],
      startRoute: '/configure',
      verifierRef: { catalogId: 'no-new-entities' },
      comprehensionCheck: {
        question: 'Who can change a user’s role?',
        options: ['Anyone who can log in', 'Only roles with user-administration rights', 'Only AT&T support', 'Roles can’t be changed at all'],
        correctIndex: 1,
      },
    },
  },

  // ── Governance ────────────────────────────────────────────────────────────
  {
    id: 'audit-recent-changes',
    title: 'Trace a recent change',
    personaIds: ['security-compliance-admin', 'cio'],
    task: {
      title: 'Trace a recent change',
      scenario: 'For the quarterly review you must show that changes are traceable. Find the most recent configuration change and who made it.',
      successCriteria: 'Comprehension: locates the audit log and reads actor + action.',
      path: 'happy',
      hints: ['Audit records live under Configure, with users and access.'],
      startRoute: '/configure',
      comprehensionCheck: {
        question: 'What does an audit entry record?',
        options: ['Only the date', 'Who did what, and when', 'Just a count of changes', 'Nothing is recorded'],
        correctIndex: 1,
      },
    },
  },
  {
    id: 'review-access-roles',
    title: 'Review who can provision',
    personaIds: ['security-compliance-admin'],
    task: {
      title: 'Review who can provision',
      scenario: 'The access review asks a single question: which roles in this platform are able to create connections? Find the answer.',
      successCriteria: 'Comprehension: reads role/permission structure under Configure.',
      path: 'happy',
      hints: ['Roles and their capabilities are laid out in user management.'],
      startRoute: '/configure',
      comprehensionCheck: {
        question: 'Which statement matches what you found?',
        options: ['Every role can provision', 'Provisioning is limited to specific roles', 'Only AT&T can provision', 'Roles aren’t defined in the platform'],
        correctIndex: 1,
      },
    },
  },

  // ── Reseller / API / Executive / Support / Reference ─────────────────────
  {
    id: 'tenant-overview',
    title: 'Assess the tenant portfolio',
    personaIds: ['reseller-partner-manager'],
    task: {
      title: 'Assess the tenant portfolio',
      scenario: 'Monday portfolio review: get to the reseller view and determine how many tenants you manage and which ones are active.',
      successCriteria: 'Comprehension: reads the reseller tenant list.',
      path: 'happy',
      hints: ['There is a dedicated Reseller area.'],
      startRoute: '/reseller',
      comprehensionCheck: {
        question: 'What does the reseller view show about each tenant?',
        options: ['Nothing beyond a name', 'Status and activity you can act on', 'Only billing totals', 'Tenants aren’t listed'],
        correctIndex: 1,
      },
    },
  },
  {
    id: 'api-key-flow',
    title: 'Find API authentication',
    personaIds: ['api-developer'],
    task: {
      title: 'Find API authentication',
      scenario: 'Before writing any integration code, establish how a client authenticates against the platform’s APIs.',
      successCriteria: 'Comprehension: locates auth/key material in the API toolbox.',
      path: 'happy',
      hints: ['The API Toolbox is its own area of the portal.'],
      startRoute: '/api-toolbox',
      comprehensionCheck: {
        question: 'How do API clients authenticate?',
        options: ['No authentication needed', 'With key/credential material from the API area', 'Fax a request form', 'Only via the mobile app'],
        correctIndex: 1,
      },
    },
  },
  {
    id: 'api-provision-reference',
    title: 'Find the provisioning endpoint',
    personaIds: ['api-developer'],
    task: {
      title: 'Find the provisioning endpoint',
      scenario: 'Your pipeline must create connections without the portal. Find the API surface that corresponds to creating a connection.',
      successCriteria: 'Comprehension: locates connection-creation in the API reference.',
      path: 'happy',
      hints: ['Endpoints are documented in the API Toolbox.'],
      startRoute: '/api-toolbox',
      comprehensionCheck: {
        question: 'Can connections be created programmatically?',
        options: ['No, portal only', 'Yes — there is an API for it', 'Only for AWS', 'Only by deleting one first'],
        correctIndex: 1,
      },
    },
  },
  {
    id: 'exec-health-read',
    title: 'Get the health story fast',
    personaIds: ['cto', 'cio', 'technical-seller', 'reseller-partner-manager'],
    task: {
      title: 'Get the health story fast',
      scenario: 'You have sixty seconds before a call. Get a read on overall network health — how many connections, and are any in trouble?',
      successCriteria: 'Comprehension: summarizes fleet status from list/monitoring surfaces.',
      path: 'happy',
      hints: ['The manage list gives counts and statuses at a glance.'],
      startRoute: '/manage',
      comprehensionCheck: {
        question: 'What best describes the current fleet?',
        options: ['Everything is down', 'Mostly healthy with identifiable exceptions', 'No status information exists', 'Exactly one connection exists'],
        correctIndex: 1,
      },
    },
  },
  {
    id: 'exec-brief-takeaway',
    title: 'Pull the board number',
    personaIds: ['cto'],
    task: {
      title: 'Pull the board number',
      scenario: 'The board wants one headline metric about the network program. Find the executive brief and pull its lead number.',
      successCriteria: 'Comprehension: locates the executive brief and reads its headline metric.',
      path: 'happy',
      hints: ['There is a standalone executive brief page.'],
      startRoute: '/brief',
      comprehensionCheck: {
        question: 'What kind of headline does the brief lead with?',
        options: ['A single program-level metric', 'Raw router logs', 'A photo gallery', 'Nothing — it is blank'],
        correctIndex: 0,
      },
    },
  },
  {
    id: 'ticket-raise',
    title: 'Open a well-formed ticket',
    personaIds: ['support-representative'],
    task: {
      title: 'Open a well-formed ticket',
      scenario: 'A store manager reports intermittent slowness at one site. Open a support ticket that gives the network team what they need to act.',
      successCriteria: 'Comprehension: completes the ticket creation flow with required fields.',
      path: 'happy',
      hints: ['Tickets have their own area.', 'Create asks for the facts the network team needs.'],
      startRoute: '/tickets',
      comprehensionCheck: {
        question: 'What makes a ticket actionable?',
        options: ['Just a subject line', 'Site, symptom, and severity captured in the form', 'A phone number only', 'Tickets can’t be created here'],
        correctIndex: 1,
      },
    },
  },
  {
    id: 'ticket-status',
    title: 'Report ticket status',
    personaIds: ['support-representative'],
    task: {
      title: 'Report ticket status',
      scenario: 'The store manager calls back asking for an update. Find the most recent ticket and report its current state.',
      successCriteria: 'Comprehension: reads ticket state from the list or detail view.',
      path: 'happy',
      hints: ['The ticket list shows state per ticket.'],
      startRoute: '/tickets',
      comprehensionCheck: {
        question: 'Where does a ticket’s current state appear?',
        options: ['Only in email', 'On the ticket list and its detail view', 'Nowhere', 'In the glossary'],
        correctIndex: 1,
      },
    },
  },
  {
    id: 'locate-glossary',
    title: 'Look up a product term',
    personaIds: ['technical-seller', 'cto'],
    task: {
      title: 'Look up a product term',
      scenario: 'Someone drops an unfamiliar product term in a meeting. Find where the portal defines its terminology and look one up.',
      successCriteria: 'Comprehension: locates the glossary and reads a definition.',
      path: 'happy',
      hints: ['There is a glossary in the portal.'],
      startRoute: '/glossary',
      comprehensionCheck: {
        question: 'Where do term definitions live?',
        options: ['In the Glossary', 'In the ticket system', 'They aren’t documented', 'Only in external PDFs'],
        correctIndex: 0,
      },
    },
  },
];
