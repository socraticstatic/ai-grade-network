import { Briefcase, Users, ShoppingCart, MessageSquare, Database, TrendingUp } from 'lucide-react';

export interface ApplicationSolution {
  id: string;
  name: string;
  category: 'ERP' | 'HCM' | 'CRM' | 'Collaboration' | 'Analytics' | 'Industry';
  description: string;
  useCases: string[];
  logo?: string;
  color: string;
  providers: string[];
  recommendedSetup: {
    connectionType: string;
    bandwidth: string;
    redundancy: boolean;
    qos: boolean;
    security: string[];
  };
  benefits: string[];
  estimatedSetupTime: string;
  monthlyStartingPrice: number;
  popular: boolean;
}

export const applicationSolutions: ApplicationSolution[] = [
  {
    id: 'workday',
    name: 'Workday',
    category: 'HCM',
    description: 'Enterprise cloud platform for HR, payroll, and financial management',
    useCases: [
      'Human Capital Management',
      'Payroll Processing',
      'Benefits Administration',
      'Time & Attendance Tracking',
      'Financial Planning & Analysis'
    ],
    logo: 'https://logo.clearbit.com/workday.com',
    color: 'blue',
    providers: ['AWS', 'Google Cloud'],
    recommendedSetup: {
      connectionType: 'Cloud to Cloud',
      bandwidth: '1 Gbps',
      redundancy: true,
      qos: true,
      security: ['End-to-end encryption', 'Private connectivity', 'DDoS protection']
    },
    benefits: [
      'Low latency for real-time HR operations',
      'Secure payroll data transmission',
      'High availability for global workforce',
      'Predictable performance during peak periods'
    ],
    estimatedSetupTime: '2-3 business days',
    monthlyStartingPrice: 850,
    popular: true
  },
  {
    id: 'sap',
    name: 'SAP',
    category: 'ERP',
    description: 'Comprehensive enterprise resource planning and business management software',
    useCases: [
      'Financial Management',
      'Supply Chain Operations',
      'Manufacturing Execution',
      'Asset Management',
      'Procurement & Sourcing'
    ],
    logo: 'https://logo.clearbit.com/sap.com',
    color: 'indigo',
    providers: ['AWS', 'Azure', 'Google Cloud'],
    recommendedSetup: {
      connectionType: 'CoLocation to Cloud',
      bandwidth: '10 Gbps',
      redundancy: true,
      qos: true,
      security: ['Private VLAN', 'IPsec VPN', 'Next-gen firewall', 'Compliance monitoring']
    },
    benefits: [
      'Ultra-low latency for ERP transactions',
      'Guaranteed bandwidth for batch jobs',
      'Secure connection for sensitive financial data',
      'Seamless integration with on-premise systems'
    ],
    estimatedSetupTime: '3-5 business days',
    monthlyStartingPrice: 1500,
    popular: true
  },
  {
    id: 'servicenow',
    name: 'ServiceNow',
    category: 'Collaboration',
    description: 'Cloud-based platform for IT service management and business workflow automation',
    useCases: [
      'IT Service Management',
      'Incident & Problem Management',
      'Change Management',
      'Asset Management',
      'Employee Service Portal'
    ],
    logo: 'https://logo.clearbit.com/servicenow.com',
    color: 'green',
    providers: ['AWS', 'Azure'],
    recommendedSetup: {
      connectionType: 'Internet to Cloud',
      bandwidth: '500 Mbps',
      redundancy: true,
      qos: false,
      security: ['DDoS protection', 'Web application firewall', 'SSL inspection']
    },
    benefits: [
      'Fast ticket resolution with low latency',
      'Reliable access for distributed teams',
      'Secure portal access',
      'High availability for 24/7 operations'
    ],
    estimatedSetupTime: '1-2 business days',
    monthlyStartingPrice: 650,
    popular: true
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    category: 'CRM',
    description: 'Leading customer relationship management platform',
    useCases: [
      'Sales Cloud Operations',
      'Customer Service Management',
      'Marketing Automation',
      'Commerce Cloud',
      'Analytics & Reporting'
    ],
    logo: 'https://logo.clearbit.com/salesforce.com',
    color: 'cyan',
    providers: ['AWS'],
    recommendedSetup: {
      connectionType: 'Cloud to Cloud',
      bandwidth: '1 Gbps',
      redundancy: true,
      qos: true,
      security: ['Private connectivity', 'End-to-end encryption', 'Access controls']
    },
    benefits: [
      'Fast CRM response times',
      'Secure customer data transmission',
      'Reliable access for sales teams',
      'Seamless integration with marketing tools'
    ],
    estimatedSetupTime: '2-3 business days',
    monthlyStartingPrice: 750,
    popular: true
  },
  {
    id: 'oracle-erp',
    name: 'Oracle ERP Cloud',
    category: 'ERP',
    description: 'Complete cloud ERP solution for finance, procurement, and project management',
    useCases: [
      'Financial Consolidation',
      'Procurement Automation',
      'Project Portfolio Management',
      'Risk Management',
      'Revenue Management'
    ],
    logo: 'https://logo.clearbit.com/oracle.com',
    color: 'red',
    providers: ['Oracle Cloud'],
    recommendedSetup: {
      connectionType: 'Cloud to Cloud',
      bandwidth: '10 Gbps',
      redundancy: true,
      qos: true,
      security: ['Oracle FastConnect', 'Private peering', 'Advanced encryption']
    },
    benefits: [
      'Optimized for Oracle Cloud Infrastructure',
      'High-speed data synchronization',
      'Secure financial data handling',
      'Reduced latency for global operations'
    ],
    estimatedSetupTime: '3-4 business days',
    monthlyStartingPrice: 1400,
    popular: false
  },
  {
    id: 'microsoft-dynamics',
    name: 'Microsoft Dynamics 365',
    category: 'ERP',
    description: 'Cloud-based ERP and CRM applications suite',
    useCases: [
      'Business Central Operations',
      'Finance & Operations',
      'Customer Engagement',
      'Field Service Management',
      'Supply Chain Visibility'
    ],
    logo: 'https://logo.clearbit.com/microsoft.com',
    color: 'blue',
    providers: ['Azure'],
    recommendedSetup: {
      connectionType: 'Cloud to Cloud',
      bandwidth: '5 Gbps',
      redundancy: true,
      qos: true,
      security: ['Azure ExpressRoute', 'Microsoft peering', 'Advanced threat protection']
    },
    benefits: [
      'Native Azure integration',
      'Low latency for Office 365 users',
      'Seamless Power BI connectivity',
      'Optimized for Microsoft ecosystem'
    ],
    estimatedSetupTime: '2-4 business days',
    monthlyStartingPrice: 1100,
    popular: false
  },
  {
    id: 'slack',
    name: 'Teams Enterprise',
    category: 'Collaboration',
    description: 'Enterprise collaboration and communication platform',
    useCases: [
      'Team Communication',
      'Project Collaboration',
      'File Sharing',
      'Video Conferencing',
      'Workflow Automation'
    ],
    logo: 'https://logo.clearbit.com/slack.com',
    color: 'purple',
    providers: ['AWS'],
    recommendedSetup: {
      connectionType: 'Internet to Cloud',
      bandwidth: '200 Mbps',
      redundancy: false,
      qos: true,
      security: ['DDoS protection', 'Content filtering']
    },
    benefits: [
      'Fast message delivery',
      'Smooth video conferencing',
      'Quick file uploads',
      'Reliable for distributed teams'
    ],
    estimatedSetupTime: '1 business day',
    monthlyStartingPrice: 450,
    popular: false
  },
  {
    id: 'tableau',
    name: 'Tableau Cloud',
    category: 'Analytics',
    description: 'Visual analytics and business intelligence platform',
    useCases: [
      'Business Intelligence',
      'Data Visualization',
      'Self-Service Analytics',
      'Dashboard Creation',
      'Embedded Analytics'
    ],
    logo: 'https://logo.clearbit.com/tableau.com',
    color: 'orange',
    providers: ['AWS'],
    recommendedSetup: {
      connectionType: 'Cloud to Cloud',
      bandwidth: '1 Gbps',
      redundancy: false,
      qos: false,
      security: ['Private connectivity', 'Data encryption']
    },
    benefits: [
      'Fast data refresh rates',
      'Quick dashboard loading',
      'Efficient large dataset handling',
      'Secure data connections'
    ],
    estimatedSetupTime: '1-2 business days',
    monthlyStartingPrice: 600,
    popular: false
  },
  {
    id: 'epic',
    name: 'Epic EHR',
    category: 'Industry',
    description: 'Electronic health records system for healthcare organizations',
    useCases: [
      'Patient Records Management',
      'Clinical Documentation',
      'Revenue Cycle Management',
      'Care Coordination',
      'Population Health Analytics'
    ],
    logo: 'https://logo.clearbit.com/epic.com',
    color: 'pink',
    providers: ['AWS', 'Azure', 'Google Cloud'],
    recommendedSetup: {
      connectionType: 'CoLocation to Cloud',
      bandwidth: '10 Gbps',
      redundancy: true,
      qos: true,
      security: ['HIPAA compliance', 'End-to-end encryption', 'Access controls', 'Audit logging']
    },
    benefits: [
      'HIPAA-compliant connectivity',
      'Ultra-low latency for patient care',
      'High availability for emergency access',
      'Secure PHI transmission'
    ],
    estimatedSetupTime: '5-7 business days',
    monthlyStartingPrice: 2000,
    popular: false
  },
  {
    id: 'canvas-lms',
    name: 'Canvas LMS',
    category: 'Industry',
    description: 'Learning management system for educational institutions',
    useCases: [
      'Online Course Delivery',
      'Student Assessment',
      'Gradebook Management',
      'Content Distribution',
      'Video Streaming'
    ],
    logo: 'https://logo.clearbit.com/instructure.com',
    color: 'green',
    providers: ['AWS'],
    recommendedSetup: {
      connectionType: 'Internet to Cloud',
      bandwidth: '1 Gbps',
      redundancy: true,
      qos: true,
      security: ['DDoS protection', 'Content delivery', 'Student data protection']
    },
    benefits: [
      'Fast content delivery',
      'Smooth video streaming',
      'Reliable access during peak enrollment',
      'Secure student data'
    ],
    estimatedSetupTime: '2-3 business days',
    monthlyStartingPrice: 700,
    popular: false
  },
  {
    id: 'netsuite',
    name: 'Oracle NetSuite',
    category: 'ERP',
    description: 'Cloud ERP system for small to mid-sized businesses',
    useCases: [
      'Financial Management',
      'Order Management',
      'Inventory Control',
      'E-commerce Integration',
      'Business Intelligence'
    ],
    logo: 'https://logo.clearbit.com/netsuite.com',
    color: 'red',
    providers: ['Oracle Cloud'],
    recommendedSetup: {
      connectionType: 'Cloud to Cloud',
      bandwidth: '1 Gbps',
      redundancy: false,
      qos: false,
      security: ['Private connectivity', 'Secure API access']
    },
    benefits: [
      'Fast transaction processing',
      'Real-time inventory updates',
      'Quick report generation',
      'Reliable e-commerce operations'
    ],
    estimatedSetupTime: '2-3 business days',
    monthlyStartingPrice: 800,
    popular: false
  },
  {
    id: 'zendesk',
    name: 'Zendesk',
    category: 'CRM',
    description: 'Customer service and engagement platform',
    useCases: [
      'Customer Support Tickets',
      'Live Chat Support',
      'Knowledge Base',
      'Customer Analytics',
      'Multi-channel Support'
    ],
    logo: 'https://logo.clearbit.com/zendesk.com',
    color: 'green',
    providers: ['AWS'],
    recommendedSetup: {
      connectionType: 'Internet to Cloud',
      bandwidth: '500 Mbps',
      redundancy: false,
      qos: true,
      security: ['DDoS protection', 'API security']
    },
    benefits: [
      'Fast ticket response times',
      'Smooth live chat experience',
      'Quick knowledge base access',
      'Reliable for customer support teams'
    ],
    estimatedSetupTime: '1-2 business days',
    monthlyStartingPrice: 500,
    popular: false
  },
  {
    id: 'cisco-webex',
    name: 'Cisco Webex',
    category: 'Collaboration',
    description: 'Enterprise video conferencing and collaboration platform',
    useCases: [
      'Video Conferencing',
      'Team Messaging',
      'Screen Sharing',
      'Meeting Recording',
      'Webinar Hosting'
    ],
    logo: 'https://logo.clearbit.com/webex.com',
    color: 'blue',
    providers: ['AWS', 'Azure', 'Google Cloud'],
    recommendedSetup: {
      connectionType: 'Internet to Cloud',
      bandwidth: '500 Mbps',
      redundancy: true,
      qos: true,
      security: ['End-to-end encryption', 'DDoS protection', 'Zero-trust security']
    },
    benefits: [
      'Crystal-clear video quality',
      'Low latency for real-time collaboration',
      'Secure enterprise communications',
      'Reliable for global teams'
    ],
    estimatedSetupTime: '1-2 business days',
    monthlyStartingPrice: 550,
    popular: true
  },
  {
    id: 'akamai-cdn',
    name: 'Akamai CDN',
    category: 'Industry',
    description: 'Global content delivery network for high-performance web experiences',
    useCases: [
      'Content Delivery',
      'Web Application Acceleration',
      'Media Streaming',
      'API Acceleration',
      'Security & DDoS Protection'
    ],
    logo: 'https://logo.clearbit.com/akamai.com',
    color: 'cyan',
    providers: ['Multi-Cloud'],
    recommendedSetup: {
      connectionType: 'Internet to Cloud',
      bandwidth: '10 Gbps',
      redundancy: true,
      qos: true,
      security: ['DDoS mitigation', 'Web application firewall', 'Bot management']
    },
    benefits: [
      'Ultra-fast content delivery worldwide',
      'Reduced latency for end users',
      'Enhanced security and reliability',
      'Optimized for high-traffic applications'
    ],
    estimatedSetupTime: '2-3 business days',
    monthlyStartingPrice: 1200,
    popular: true
  },
  {
    id: 'zoom',
    name: 'Zoom',
    category: 'Collaboration',
    description: 'Video conferencing and virtual meeting platform',
    useCases: [
      'Video Meetings',
      'Webinars',
      'Team Chat',
      'Phone System',
      'Conference Rooms'
    ],
    logo: 'https://logo.clearbit.com/zoom.us',
    color: 'blue',
    providers: ['AWS', 'Oracle Cloud'],
    recommendedSetup: {
      connectionType: 'Internet to Cloud',
      bandwidth: '300 Mbps',
      redundancy: true,
      qos: true,
      security: ['End-to-end encryption', 'Waiting rooms', 'Meeting passwords']
    },
    benefits: [
      'High-quality video and audio',
      'Low latency for smooth meetings',
      'Reliable for large-scale webinars',
      'Secure virtual communications'
    ],
    estimatedSetupTime: '1 business day',
    monthlyStartingPrice: 400,
    popular: true
  },
  {
    id: 'twilio',
    name: 'Twilio',
    category: 'Collaboration',
    description: 'Cloud communications platform for messaging, voice, and video',
    useCases: [
      'SMS & MMS Messaging',
      'Voice & Video APIs',
      'WhatsApp Business',
      'Programmable Chat',
      'Customer Engagement'
    ],
    logo: 'https://logo.clearbit.com/twilio.com',
    color: 'red',
    providers: ['AWS'],
    recommendedSetup: {
      connectionType: 'Cloud to Cloud',
      bandwidth: '1 Gbps',
      redundancy: true,
      qos: true,
      security: ['API authentication', 'TLS encryption', 'Rate limiting']
    },
    benefits: [
      'Low latency for real-time communications',
      'Reliable message delivery',
      'Scalable for high-volume applications',
      'Secure API connectivity'
    ],
    estimatedSetupTime: '1-2 business days',
    monthlyStartingPrice: 600,
    popular: true
  },
  {
    id: 'coreweave',
    name: 'CoreWeave',
    category: 'Industry',
    description: 'Specialized cloud infrastructure for GPU-accelerated computing and AI',
    useCases: [
      'AI Model Training',
      'Machine Learning Inference',
      'Visual Effects Rendering',
      'Scientific Computing',
      'Crypto Mining'
    ],
    logo: 'https://logo.clearbit.com/coreweave.com',
    color: 'purple',
    providers: ['CoreWeave Cloud'],
    recommendedSetup: {
      connectionType: 'Cloud to Cloud',
      bandwidth: '10 Gbps',
      redundancy: true,
      qos: true,
      security: ['Private connectivity', 'Network isolation', 'DDoS protection']
    },
    benefits: [
      'Ultra-low latency for GPU workloads',
      'High-bandwidth data transfer',
      'Optimized for AI/ML pipelines',
      'Dedicated GPU resources'
    ],
    estimatedSetupTime: '2-4 business days',
    monthlyStartingPrice: 1800,
    popular: false
  },
  {
    id: 'ibm-cloud',
    name: 'IBM Cloud',
    category: 'Industry',
    description: 'Enterprise cloud platform with AI, security, and hybrid cloud capabilities',
    useCases: [
      'Watson AI Services',
      'Hybrid Cloud Integration',
      'Blockchain Solutions',
      'Quantum Computing',
      'Enterprise Applications'
    ],
    logo: 'https://logo.clearbit.com/cloud.ibm.com',
    color: 'blue',
    providers: ['IBM Cloud'],
    recommendedSetup: {
      connectionType: 'Internet to Cloud',
      bandwidth: '10 Gbps',
      redundancy: true,
      qos: true,
      security: ['IBM Cloud Direct Link', 'Private networking', 'Encryption at rest/transit']
    },
    benefits: [
      'Optimized for enterprise workloads',
      'Low latency for Watson AI',
      'Secure hybrid cloud connectivity',
      'Compliance-ready infrastructure'
    ],
    estimatedSetupTime: '3-5 business days',
    monthlyStartingPrice: 1500,
    popular: false
  }
];

export const solutionCategories = [
  { id: 'ERP', name: 'Enterprise Resource Planning', icon: Database, color: 'indigo' },
  { id: 'HCM', name: 'Human Capital Management', icon: Users, color: 'blue' },
  { id: 'CRM', name: 'Customer Relationship Management', icon: ShoppingCart, color: 'cyan' },
  { id: 'Collaboration', name: 'Collaboration & Communication', icon: MessageSquare, color: 'purple' },
  { id: 'Analytics', name: 'Analytics & Business Intelligence', icon: TrendingUp, color: 'orange' },
  { id: 'Industry', name: 'Industry-Specific Solutions', icon: Briefcase, color: 'pink' }
];

export function getSolutionsByCategory(category: string) {
  return applicationSolutions.filter(sol => sol.category === category);
}

export function getPopularSolutions() {
  return applicationSolutions.filter(sol => sol.popular);
}
