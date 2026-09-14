import { TourStep } from '../components/tour/ProductTour';

export const mainAppTour: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to the AI-grade network',
    description: 'This quick tour will help you understand the core concepts and navigation. You can skip this anytime or restart it later from the Help menu.',
    placement: 'center',
    scrollIntoView: false
  },
  {
    id: 'navigation',
    title: 'Main Navigation',
    description: 'The navigation follows your workflow lifecycle: Create new connections, Manage individual connections, Monitor performance and health, and Configure global settings. Each simple verb represents a core job you need to do. This task-centric approach matches how you naturally think about your work, not technical concepts.',
    targetSelector: 'nav[aria-label="Main navigation"]',
    placement: 'bottom',
    highlightPadding: 12,
    scrollIntoView: false
  },
  {
    id: 'create-nav',
    title: '1. Create',
    description: 'Start your journey here. Create establishes new network connections to cloud providers. This is where new infrastructure begins - whether you need a connection to AWS, Azure, Google Cloud, or others.',
    targetSelector: 'nav[aria-label="Main navigation"] a[href="/create"]',
    placement: 'bottom',
    highlightPadding: 10,
    scrollIntoView: false
  },
  {
    id: 'manage-nav',
    title: '2. Manage',
    description: 'Manage is your daily workspace for individual connections. Here you view connection details, add hubs, configure links (VLANs), attach network functions (VNFs), and modify existing infrastructure. This is where connections live and evolve.',
    targetSelector: 'nav[aria-label="Main navigation"] a[href="/manage"]',
    placement: 'bottom',
    highlightPadding: 10,
    scrollIntoView: false
  },
  {
    id: 'monitor-nav',
    title: '3. Monitor',
    description: 'Monitor provides real-time visibility into network health and performance. Track metrics like latency, bandwidth usage, packet loss, and errors. Set up alerts, view logs, and generate reports. This is your operational command center.',
    targetSelector: 'nav[aria-label="Main navigation"] a[href="/monitor"]',
    placement: 'bottom',
    highlightPadding: 10,
    scrollIntoView: false
  },
  {
    id: 'configure-nav',
    title: '4. Configure',
    description: 'Configure handles organization-wide settings that apply across all connections. Manage users and permissions, set billing preferences, establish policies, integrate with partners, and define system defaults. These are your global controls.',
    targetSelector: 'nav[aria-label="Main navigation"] a[href="/configure"]',
    placement: 'bottom',
    highlightPadding: 10,
    scrollIntoView: false
  },
  {
    id: 'connections',
    title: 'Your Connections',
    description: 'A Connection is your dedicated network path to cloud providers. Each Connection contains Hubs that handle routing and traffic management. Think of it as the highway system connecting different locations.',
    targetSelector: '[data-tour-target="connection-card"]',
    placement: 'right',
    highlightPadding: 12
  },
  {
    id: 'connection-types',
    title: 'Connection Types Explained',
    description: 'Connections have different types: Internet to Cloud (public internet), Cloud to Cloud (direct cloud-to-cloud), CoLocation to Cloud (from data center), VPN to Cloud (encrypted tunnel), and Site to Cloud (from office). Each has different performance and security characteristics.',
    placement: 'center',
    scrollIntoView: false
  },
  {
    id: 'hubs',
    title: 'Hubs',
    description: 'Inside each Connection, you\'ll find Hubs (virtual routing nodes). These handle BGP routing, traffic management, and can have multiple Links attached. Think of them as smart interchanges on your network highway.',
    placement: 'center',
    scrollIntoView: false
  },
  {
    id: 'links-vlans',
    title: 'Links (VLANs)',
    description: 'Links are virtual network segments (VLANs) within a Hub. Each Link has its own routing settings, IP subnet, and QoS priority. You can attach VNFs (network services) to Links for security and routing. Links are like dedicated lanes on the highway.',
    placement: 'center',
    scrollIntoView: false
  },
  {
    id: 'vnfs',
    title: 'VNFs (Virtual Network Functions)',
    description: 'VNFs are software-based network services like firewalls, SD-WAN appliances, or routers. They attach to Links to provide security, routing, or other network functions. Adding a firewall VNF is like installing a security checkpoint on a specific lane.',
    placement: 'center',
    scrollIntoView: false
  },
  {
    id: 'ipe',
    title: 'IPE (Infrastructure Provider Edge)',
    description: 'IPE Routers are the physical network hardware at data center facilities. Your virtual Connections and Links run on these physical devices. The IPE provides actual bandwidth capacity and connectivity to cloud providers. It\'s the ground beneath your virtual highway.',
    placement: 'center',
    scrollIntoView: false
  },
  {
    id: 'help',
    title: 'Help & Glossary',
    description: 'Access the complete glossary anytime from the Help menu. You\'ll find detailed explanations, examples, and visual aids for all networking terms. Hover over any term with a help icon to see quick tooltips.',
    targetSelector: 'header button[aria-label="Help"]',
    placement: 'left',
    highlightPadding: 10,
    scrollIntoView: false
  },
  {
    id: 'complete',
    title: 'You\'re All Set!',
    description: 'You now understand the core concepts: Connections contain Hubs, which have Links (VLANs), which can have VNFs attached. All running on physical IPE hardware. Start exploring and remember - help is always available! For a deeper dive, listen to our AI-generated podcast explaining the AI-grade network platform.',
    placement: 'center',
    scrollIntoView: false,
    action: {
      label: 'Listen to the AI-grade network Podcast',
      onClick: () => window.open('https://notebooklm.google.com/notebook/cce60bb8-f532-4daf-a2d8-1fc2e4b3cf42?artifactId=65664b81-a3e4-491d-8a01-1e1f41dbff16', '_blank')
    }
  }
];

export const connectionDetailTour: TourStep[] = [
  {
    id: 'connection-overview',
    title: 'Connection Overview',
    description: 'This is the detailed view of your connection. Here you can see all Hubs, Links, and VNFs associated with this connection.',
    placement: 'center',
    scrollIntoView: false
  },
  {
    id: 'hubs-tab',
    title: 'Hubs',
    description: 'View and manage all Hubs (virtual routing nodes) within this connection. Each router can have multiple Links and its own routing configuration.',
    placement: 'center',
    scrollIntoView: false
  },
  {
    id: 'links-tab',
    title: 'Links (VLANs)',
    description: 'Manage your Links (VLANs) here. Each Link is a virtual network segment with its own routing settings, IP subnet, QoS priority, and attached VNFs.',
    placement: 'center',
    scrollIntoView: false
  },
  {
    id: 'routing-settings',
    title: 'Routing Settings',
    description: 'Configure how traffic flows through your network. Set up BGP, route filters, AS numbers, MTU settings, and Quality of Service parameters for each Link.',
    placement: 'center',
    scrollIntoView: false
  }
];

export const wizardTour: TourStep[] = [
  {
    id: 'wizard-intro',
    title: 'Connection Wizard',
    description: 'This wizard will guide you through creating a new connection step by step. We\'ll help you choose a provider, connection type, bandwidth, and configure all settings.',
    placement: 'center',
    scrollIntoView: false
  },
  {
    id: 'provider-selection',
    title: 'Choose Your Cloud Provider',
    description: 'Select which cloud provider you want to connect to: AWS, Azure, Google Cloud, Oracle, or others. Each provider has different capabilities and pricing.',
    placement: 'center',
    scrollIntoView: false
  },
  {
    id: 'connection-type',
    title: 'Select Connection Type',
    description: 'Choose how you want to connect: Internet to Cloud, Cloud to Cloud, CoLocation to Cloud, VPN to Cloud, or Site to Cloud. The type determines performance, security, and cost.',
    placement: 'center',
    scrollIntoView: false
  },
  {
    id: 'bandwidth',
    title: 'Choose Bandwidth',
    description: 'Select the data transfer capacity you need, from 100 Mbps to 100 Gbps. Bandwidth determines how much traffic can flow simultaneously.',
    placement: 'center',
    scrollIntoView: false
  }
];
