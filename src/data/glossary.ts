import { createElement } from 'react';
import { Network, Shield, Server, Layers, Cable, Cpu, Cloud } from 'lucide-react';
import { AttIcon } from '../components/icons/AttIcon';

function HubIcon({ className }: { className?: string }) {
  return createElement(AttIcon, { name: 'hub', className });
}

export interface GlossaryTerm {
  id: string;
  term: string;
  category: 'core' | 'networking' | 'infrastructure' | 'security';
  shortDefinition: string;
  detailedDefinition: string;
  example?: string;
  relatedTerms?: string[];
  icon?: any;
  visualAid?: string;
}

export const glossaryTerms: GlossaryTerm[] = [
  {
    id: 'connection',
    term: 'Connection',
    category: 'core',
    shortDefinition: 'A network connection between your infrastructure and cloud providers',
    detailedDefinition: 'A Connection is the top-level entity that represents your dedicated network path to one or more cloud providers. Each Connection has a specific type (Internet to Cloud, Cloud to Cloud, etc.) and contains one or more Hubs that handle the actual routing and traffic management.',
    example: 'Think of a Connection like a highway system - it\'s the overall infrastructure that connects different locations, with Hubs acting as the interchanges.',
    relatedTerms: ['hub', 'connection-type', 'bandwidth'],
    icon: Network,
    visualAid: 'hierarchy'
  },
  {
    id: 'connection-type',
    term: 'Connection Type',
    category: 'core',
    shortDefinition: 'The specific method used to establish connectivity between endpoints',
    detailedDefinition: 'Connection Types define how your network connects to cloud services. Options include: Internet to Cloud (public internet), Cloud to Cloud (private connectivity that links two or more clouds through a shared Hub), CoLocation to Cloud (from data center), VPN to Cloud (encrypted tunnel), and Site to Cloud (from office location). Each type has different performance, security, and cost characteristics.',
    example: 'An "Internet to Cloud" connection is like taking public roads to reach your destination, while a "CoLocation to Cloud" connection is like having a private dedicated lane.',
    relatedTerms: ['connection', 'bandwidth', 'security'],
    icon: HubIcon
  },
  {
    id: 'hub',
    term: 'Connection Hub',
    category: 'core',
    shortDefinition: 'A virtual router node that manages traffic within your connection',
    detailedDefinition: 'A Hub is AT&T\'s Cloud Node: a virtual routing instance that serves as the hub within your Connection. It handles BGP routing, traffic management, and can have multiple Links (VLANs) attached to it. In a Cloud to Cloud connection, a single Hub is the hub that links two or more cloud destinations (legs), so traffic between clouds transits the Hub rather than meeting directly. Hubs provide the logical separation and routing intelligence needed to manage complex network topologies.',
    example: 'If a Connection is a highway system, a Hub is like a smart interchange hub that decides which exit (Link/VLAN) your traffic should take based on destination and routing rules. For a Cloud to Cloud connection, a single Hub acts as the hub that links each cloud leg, for example AWS and Azure.',
    relatedTerms: ['connection', 'link', 'vlan', 'routing', 'connection-type'],
    icon: HubIcon,
    visualAid: 'hierarchy'
  },
  {
    id: 'link',
    term: 'Link',
    category: 'core',
    shortDefinition: 'A virtual network segment (VLAN) within a Hub',
    detailedDefinition: 'A Link is a virtual network segment (VLAN) associated with a Hub. Each Link represents an isolated Layer 2 network path that can have its own routing settings, IP subnet, QoS priority, and attached VNFs. Multiple Links allow you to segment traffic for different purposes (data, voice, management, etc.).',
    example: 'Links are like dedicated lanes on a highway - each lane (Link) carries specific types of traffic and has its own rules and characteristics.',
    relatedTerms: ['vlan', 'hub', 'vnf', 'routing'],
    icon: Cable,
    visualAid: 'hierarchy'
  },
  {
    id: 'vlan',
    term: 'VLAN',
    category: 'networking',
    shortDefinition: 'Virtual Local Area Network - a logical network segment',
    detailedDefinition: 'VLAN (Virtual Local Area Network) is a technology that creates logically separated networks on the same physical infrastructure. In this platform, VLANs are implemented as Links, each with a unique VLAN ID. VLANs enable traffic isolation, improved security, and better network organization.',
    example: 'A VLAN ID of 100 might be used for production traffic, while VLAN 200 handles backup operations - both use the same physical network but remain logically separate.',
    relatedTerms: ['link', 'network-segmentation', 'routing'],
    icon: Layers
  },
  {
    id: 'vnf',
    term: 'VNF (Virtual Network Function)',
    category: 'core',
    shortDefinition: 'Software-based network services like firewalls or SD-WAN appliances',
    detailedDefinition: 'VNF (Virtual Network Function) represents network services deployed as software rather than hardware. VNFs can include firewalls, SD-WAN appliances, routers, NAT services, and more. In this platform, VNFs are associated with specific Links to provide security, routing, or other network functions for traffic passing through those Links.',
    example: 'Adding a firewall VNF to a Link is like installing a security checkpoint on a specific lane of the highway - all traffic through that lane gets inspected.',
    relatedTerms: ['link', 'firewall', 'sdwan', 'security'],
    icon: Shield,
    visualAid: 'hierarchy'
  },
  {
    id: 'ipe',
    term: 'IPE (Infrastructure Provider Edge)',
    category: 'infrastructure',
    shortDefinition: 'Physical router hardware at data center facilities',
    detailedDefinition: 'IPE (Infrastructure Provider Edge) Router is the physical network hardware located at data center facilities. IPEs provide the actual bandwidth capacity and physical connectivity to cloud provider networks. Your virtual Connections and Links run on these physical devices. Each IPE has specific cloud provider on-ramps (AWS, Azure, Google, etc.).',
    example: 'The IPE is like the physical ground beneath the virtual highway system - it provides the actual infrastructure that makes everything else possible. Connections and Links are virtual concepts running on this physical hardware.',
    relatedTerms: ['connection', 'link', 'data-center', 'bandwidth'],
    icon: Server
  },
  {
    id: 'routing',
    term: 'Routing Settings',
    category: 'networking',
    shortDefinition: 'Configuration that determines how network traffic is directed',
    detailedDefinition: 'Routing Settings control how network traffic flows through your infrastructure. This includes BGP configuration, route filters, AS numbers, MTU settings, and Quality of Service (QoS) parameters. Each Link (VLAN) can have its own routing configuration, allowing fine-grained control over traffic behavior.',
    example: 'Routing settings are like traffic rules and signs - they tell data packets which path to take, how fast they can go, and which destinations they can reach.',
    relatedTerms: ['link', 'hub', 'bgp', 'qos'],
    icon: HubIcon
  },
  {
    id: 'bandwidth',
    term: 'Bandwidth',
    category: 'networking',
    shortDefinition: 'The data transfer capacity of a network connection',
    detailedDefinition: 'Bandwidth represents the maximum data transfer rate of your network connection, typically measured in Mbps (megabits per second) or Gbps (gigabits per second). Available options range from 100 Mbps for basic connections to 100 Gbps for high-performance needs. Bandwidth determines how much data can flow through your connection simultaneously.',
    example: 'Bandwidth is like the width of a highway - a 1 Gbps connection is a wider road than 100 Mbps, allowing more data traffic to flow at once.',
    relatedTerms: ['connection', 'throughput', 'performance'],
    icon: Network
  },
  {
    id: 'bgp',
    term: 'BGP (Border Hub Protocol)',
    category: 'networking',
    shortDefinition: 'The routing protocol used to exchange routes between networks',
    detailedDefinition: 'BGP (Border Hub Protocol) is the standard protocol for routing traffic between different networks (autonomous systems). It\'s used to dynamically exchange routing information between your network and cloud providers. BGP enables automatic failover, load balancing, and optimal path selection.',
    example: 'BGP is like a GPS navigation system that constantly updates to find the best route, automatically rerouting around traffic jams (network issues).',
    relatedTerms: ['routing', 'hub', 'asn'],
    icon: HubIcon
  },
  {
    id: 'redundancy',
    term: 'Redundancy',
    category: 'infrastructure',
    shortDefinition: 'Backup systems that ensure continuous operation during failures',
    detailedDefinition: 'Redundancy provides backup resources that automatically take over if primary systems fail. This includes redundant IPE routers, multiple Links, diverse network paths, and failover configurations. Redundancy is critical for high-availability applications that can\'t tolerate downtime.',
    example: 'Redundancy is like having a spare tire in your car - if one fails, the backup immediately takes over to keep you moving.',
    relatedTerms: ['ipe', 'high-availability', 'failover'],
    icon: Layers
  },
  {
    id: 'qos',
    term: 'QoS (Quality of Service)',
    category: 'networking',
    shortDefinition: 'Traffic prioritization to ensure critical applications perform well',
    detailedDefinition: 'QoS (Quality of Service) is a set of technologies that prioritize network traffic to ensure critical applications get the bandwidth and low latency they need. QoS can prioritize voice/video traffic over file downloads, or prioritize business-critical applications over general web browsing.',
    example: 'QoS is like having express lanes on a highway for emergency vehicles - critical traffic gets priority to ensure it arrives quickly.',
    relatedTerms: ['routing', 'link', 'performance'],
    icon: Cpu
  },
  {
    id: 'mtu',
    term: 'MTU (Maximum Transmission Unit)',
    category: 'networking',
    shortDefinition: 'The largest packet size that can be transmitted without fragmentation',
    detailedDefinition: 'MTU (Maximum Transmission Unit) defines the largest packet size (in bytes) that can be sent over a network link without fragmentation. Standard ethernet MTU is 1500 bytes, but some configurations support jumbo frames (up to 9000 bytes) for better performance with large data transfers.',
    example: 'MTU is like the size limit for packages on a conveyor belt - larger packages may need to be broken into smaller pieces to fit.',
    relatedTerms: ['link', 'performance', 'routing'],
    icon: Layers
  },
  {
    id: 'cloud-provider',
    term: 'Cloud Provider',
    category: 'infrastructure',
    shortDefinition: 'The cloud service platform you\'re connecting to',
    detailedDefinition: 'Cloud Providers are the companies offering cloud computing services (AWS, Azure, Google Cloud, Oracle, IBM, etc.). Each provider has their own network on-ramps, connection requirements, and pricing models. This platform enables you to establish direct, high-performance connections to major cloud providers.',
    example: 'Cloud Providers are like different destinations you might drive to - each has its own address, entrance requirements, and facilities.',
    relatedTerms: ['connection', 'ipe', 'on-ramp'],
    icon: Cloud
  }
];

export const glossaryCategories = {
  core: {
    name: 'Core Concepts',
    description: 'Fundamental building blocks of the platform',
    color: 'blue',
    icon: Network
  },
  networking: {
    name: 'Networking',
    description: 'Network protocols and configurations',
    color: 'green',
    icon: HubIcon
  },
  infrastructure: {
    name: 'Infrastructure',
    description: 'Physical and virtual infrastructure components',
    color: 'purple',
    icon: Server
  },
  security: {
    name: 'Security',
    description: 'Security features and protections',
    color: 'red',
    icon: Shield
  }
};

export function getTermById(id: string): GlossaryTerm | undefined {
  return glossaryTerms.find(term => term.id === id);
}

export function getTermsByCategory(category: string): GlossaryTerm[] {
  return glossaryTerms.filter(term => term.category === category);
}

export function searchTerms(query: string): GlossaryTerm[] {
  const lowerQuery = query.toLowerCase();
  return glossaryTerms.filter(term =>
    term.term.toLowerCase().includes(lowerQuery) ||
    term.shortDefinition.toLowerCase().includes(lowerQuery) ||
    term.detailedDefinition.toLowerCase().includes(lowerQuery)
  );
}
