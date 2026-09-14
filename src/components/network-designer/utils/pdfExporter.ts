import { NetworkNode, NetworkEdge } from '../../types';
import {
  calculateTotalBandwidth,
  getUniqueNetworkTypes,
  getCloudProviders
} from '../../../utils/calculations';
import { formatTimestamp } from '../../../utils/formatters';

interface ExportOptions {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  canvasElement: HTMLElement;
  fileName?: string;
  includeMetadata?: boolean;
}

interface NetworkMetadata {
  exportDate: string;
  exportTime: string;
  networkSummary: {
    totalNodes: number;
    totalEdges: number;
    activeNodes: number;
    activeEdges: number;
    totalBandwidth: string;
  };
  nodeBreakdown: {
    functions: number;
    destinations: number;
    networks: number;
    datacenters: number;
  };
  connectionTypes: { [key: string]: number };
  securityFeatures: string[];
  resiliencyFeatures: string[];
  regions: string[];
  providers: string[];
}

export async function exportNetworkToPDF(options: ExportOptions): Promise<void> {
  const {
    nodes,
    edges,
    canvasElement,
    fileName = 'network-design.pdf',
    includeMetadata = true
  } = options;

  try {
    // Show loading toast
    window.addToast({
      type: 'info',
      title: 'Generating PDF',
      message: 'Loading PDF libraries and capturing network design...',
      duration: 10000
    });

    // Dynamically import PDF libraries only when needed
    const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
      import('jspdf'),
      import('html2canvas')
    ]);

    // Create PDF document
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Capture the canvas as image
    const canvas = await html2canvas(canvasElement, {
      backgroundColor: '#f8fafc',
      scale: 2, // Higher quality
      useCORS: true,
      allowTaint: true,
      width: canvasElement.scrollWidth,
      height: canvasElement.scrollHeight,
      scrollX: 0,
      scrollY: 0
    });

    // Convert canvas to image data
    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 280; // A4 landscape width minus margins
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Add title page
    addTitlePage(pdf, nodes, edges);
    
    // Add network diagram
    pdf.addPage();
    addNetworkDiagram(pdf, imgData, imgWidth, imgHeight);
    
    // Add metadata if requested
    if (includeMetadata) {
      const metadata = generateNetworkMetadata(nodes, edges);
      addMetadataPages(pdf, metadata);
      addConfigurationPage(pdf, nodes, edges);
    }

    // Save the PDF
    pdf.save(fileName);

    // Show success toast
    window.addToast({
      type: 'success',
      title: 'PDF Exported',
      message: 'Network design has been successfully exported to PDF',
      duration: 5000
    });

  } catch (error) {
    console.error('Error exporting PDF:', error);
    window.addToast({
      type: 'error',
      title: 'Export Failed',
      message: 'There was an error exporting your network design. Please try again.',
      duration: 5000
    });
  }
}

function addTitlePage(pdf: any, nodes: NetworkNode[], edges: NetworkEdge[]) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  // Add header
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Network Architecture Design', pageWidth / 2, 30, { align: 'center' });
  
  // Add subtitle
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Enterprise Network Topology Documentation', pageWidth / 2, 40, { align: 'center' });
  
  // Add generation info
  const now = new Date();
  pdf.setFontSize(10);
  pdf.text(`Generated on: ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`, pageWidth / 2, 50, { align: 'center' });
  
  // Add summary box
  const boxY = 70;
  const boxHeight = 80;
  
  pdf.setDrawColor(59, 130, 246); // Blue border
  pdf.setFillColor(239, 246, 255); // Light blue background
  pdf.roundedRect(20, boxY, pageWidth - 40, boxHeight, 3, 3, 'FD');
  
  // Summary content
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(31, 41, 55); // Gray-800
  pdf.text('Network Summary', 30, boxY + 15);
  
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(75, 85, 99); // Gray-600
  
  const summaryLines = [
    `Total Network Elements: ${nodes.length} nodes, ${edges.length} connections`,
    `Active Elements: ${nodes.filter(n => n.status === 'active').length} active nodes, ${edges.filter(e => e.status === 'active').length} active connections`,
    `Total Bandwidth: ${calculateTotalBandwidth(edges)}`,
    `Network Types: ${getUniqueNetworkTypes(nodes).join(', ')}`,
    `Cloud Providers: ${getCloudProviders(nodes).join(', ') || 'None'}`
  ];
  
  summaryLines.forEach((line, index) => {
    pdf.text(line, 30, boxY + 30 + (index * 8));
  });
  
  // Add footer
  pdf.setFontSize(8);
  pdf.setTextColor(156, 163, 175); // Gray-400
  pdf.text('Generated by Network Designer - Enterprise Network Architecture Tool', pageWidth / 2, pageHeight - 10, { align: 'center' });
}

function addNetworkDiagram(pdf: any, imgData: string, imgWidth: number, imgHeight: number) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  // Add page title
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(31, 41, 55);
  pdf.text('Network Topology Diagram', 20, 20);
  
  // Calculate image positioning (centered)
  const startX = (pageWidth - imgWidth) / 2;
  const startY = 35;
  
  // Check if image fits on page, if not scale it down
  const maxHeight = pageHeight - 60; // Leave space for header and footer
  let finalWidth = imgWidth;
  let finalHeight = imgHeight;
  
  if (imgHeight > maxHeight) {
    const scale = maxHeight / imgHeight;
    finalWidth = imgWidth * scale;
    finalHeight = maxHeight;
  }
  
  // Add the network diagram
  pdf.addImage(imgData, 'PNG', startX, startY, finalWidth, finalHeight);
  
  // Add diagram footer
  pdf.setFontSize(9);
  pdf.setTextColor(107, 114, 128); // Gray-500
  pdf.text('Network topology showing all nodes, connections, and their current status', pageWidth / 2, pageHeight - 10, { align: 'center' });
}

function addMetadataPages(pdf: any, metadata: NetworkMetadata) {
  pdf.addPage();
  const pageWidth = pdf.internal.pageSize.getWidth();
  let currentY = 20;
  
  // Page title
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(31, 41, 55);
  pdf.text('Network Design Metadata', 20, currentY);
  currentY += 15;
  
  // Export Information
  addSection(pdf, 'Export Information', [
    `Export Date: ${metadata.exportDate}`,
    `Export Time: ${metadata.exportTime}`,
    `Document Format: PDF (Portable Document Format)`,
    `Generated By: Network Designer v1.0`
  ], currentY);
  currentY += 40;
  
  // Network Summary
  addSection(pdf, 'Network Summary', [
    `Total Nodes: ${metadata.networkSummary.totalNodes}`,
    `Total Connections: ${metadata.networkSummary.totalEdges}`,
    `Active Nodes: ${metadata.networkSummary.activeNodes}`,
    `Active Connections: ${metadata.networkSummary.activeEdges}`,
    `Total Bandwidth Capacity: ${metadata.networkSummary.totalBandwidth}`
  ], currentY);
  currentY += 50;
  
  // Node Breakdown
  const nodeBreakdownText = [
    `Network Functions: ${metadata.nodeBreakdown.functions}`,
    `Cloud Destinations: ${metadata.nodeBreakdown.destinations}`,
    `Network Devices: ${metadata.nodeBreakdown.networks}`,
    `Data Centers: ${metadata.nodeBreakdown.datacenters}`
  ];
  addSection(pdf, 'Network Components', nodeBreakdownText, currentY);
  currentY += 50;
  
  // Check if we need a new page
  if (currentY > 150) {
    pdf.addPage();
    currentY = 20;
  }
  
  // Connection Types
  const connectionText = Object.entries(metadata.connectionTypes)
    .map(([type, count]) => `${type}: ${count} connection${count !== 1 ? 's' : ''}`)
    .slice(0, 8); // Limit to prevent overflow
  addSection(pdf, 'Connection Types', connectionText, currentY);
  currentY += Math.max(40, connectionText.length * 6 + 20);
  
  // Features and Capabilities
  if (metadata.securityFeatures.length > 0) {
    addSection(pdf, 'Security Features', metadata.securityFeatures, currentY);
    currentY += Math.max(35, metadata.securityFeatures.length * 6 + 15);
  }
  
  if (metadata.resiliencyFeatures.length > 0) {
    addSection(pdf, 'Resiliency Features', metadata.resiliencyFeatures, currentY);
    currentY += Math.max(35, metadata.resiliencyFeatures.length * 6 + 15);
  }
  
  // Geographic and Provider Information
  if (metadata.regions.length > 0) {
    addSection(pdf, 'Geographic Regions', metadata.regions, currentY);
    currentY += Math.max(35, metadata.regions.length * 6 + 15);
  }
  
  if (metadata.providers.length > 0) {
    addSection(pdf, 'Service Providers', metadata.providers, currentY);
  }
}

function addConfigurationPage(pdf: any, nodes: NetworkNode[], edges: NetworkEdge[]) {
  pdf.addPage();
  const pageWidth = pdf.internal.pageSize.getWidth();
  let currentY = 20;
  
  // Page title
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(31, 41, 55);
  pdf.text('Network Configuration Details', 20, currentY);
  currentY += 15;
  
  // Node Configurations
  if (nodes.length > 0) {
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(55, 65, 81);
    pdf.text('Node Configurations', 20, currentY);
    currentY += 10;
    
    nodes.forEach((node, index) => {
      // Check if we need a new page
      if (currentY > 200) {
        pdf.addPage();
        currentY = 20;
      }
      
      // Node header
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(75, 85, 99);
      pdf.text(`${index + 1}. ${node.name}`, 25, currentY);
      currentY += 8;
      
      // Basic node info
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      
      const basicInfo = [
        `Type: ${node.type}`,
        `Function Type: ${node.functionType || 'N/A'}`,
        `Status: ${node.status}`,
        `Position: x=${node.x}, y=${node.y}`
      ];
      
      basicInfo.forEach(info => {
        pdf.text(`  • ${info}`, 30, currentY);
        currentY += 5;
      });
      
      // Configuration details
      if (node.config && Object.keys(node.config).length > 0) {
        pdf.setFont('helvetica', 'bold');
        pdf.text('  Configuration:', 30, currentY);
        currentY += 5;
        
        pdf.setFont('helvetica', 'normal');
        Object.entries(node.config).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            const configText = `    ${key}: ${typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}`;
            pdf.text(configText, 30, currentY);
            currentY += 4;
          }
        });
      }
      
      currentY += 8; // Space between nodes
    });
  }
  
  // Check if we need a new page for edges
  if (currentY > 150 && edges.length > 0) {
    pdf.addPage();
    currentY = 20;
  }
  
  // Edge Configurations
  if (edges.length > 0) {
    currentY += 10;
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(55, 65, 81);
    pdf.text('Connection Configurations', 20, currentY);
    currentY += 10;
    
    edges.forEach((edge, index) => {
      // Check if we need a new page
      if (currentY > 220) {
        pdf.addPage();
        currentY = 20;
      }
      
      // Find source and target node names
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      const connectionName = `${sourceNode?.name || 'Unknown'} → ${targetNode?.name || 'Unknown'}`;
      
      // Edge header
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(75, 85, 99);
      pdf.text(`${index + 1}. ${connectionName}`, 25, currentY);
      currentY += 8;
      
      // Basic edge info
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      
      const basicEdgeInfo = [
        `Type: ${edge.type}`,
        `Bandwidth: ${edge.bandwidth}`,
        `Status: ${edge.status}`,
        `VLAN: ${edge.vlan || 'None'}`
      ];
      
      basicEdgeInfo.forEach(info => {
        pdf.text(`  • ${info}`, 30, currentY);
        currentY += 5;
      });
      
      // Metrics
      if (edge.metrics && Object.keys(edge.metrics).length > 0) {
        pdf.setFont('helvetica', 'bold');
        pdf.text('  Metrics:', 30, currentY);
        currentY += 5;
        
        pdf.setFont('helvetica', 'normal');
        Object.entries(edge.metrics).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            pdf.text(`    ${key}: ${value}`, 30, currentY);
            currentY += 4;
          }
        });
      }
      
      // Configuration details
      if (edge.config && Object.keys(edge.config).length > 0) {
        pdf.setFont('helvetica', 'bold');
        pdf.text('  Configuration:', 30, currentY);
        currentY += 5;
        
        pdf.setFont('helvetica', 'normal');
        Object.entries(edge.config).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            const configText = `    ${key}: ${typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}`;
            pdf.text(configText, 30, currentY);
            currentY += 4;
          }
        });
      }
      
      currentY += 8; // Space between edges
    });
  }
  
  // Add footer
  pdf.setFontSize(8);
  pdf.setTextColor(156, 163, 175);
  pdf.text('Network Configuration Details - Complete technical specifications for all network elements', pageWidth / 2, pdf.internal.pageSize.getHeight() - 10, { align: 'center' });
}

function addSection(pdf: any, title: string, items: string[], startY: number) {
  // Section title
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(55, 65, 81); // Gray-700
  pdf.text(title, 20, startY);
  
  // Section content
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(75, 85, 99); // Gray-600
  
  items.forEach((item, index) => {
    pdf.text(`• ${item}`, 25, startY + 10 + (index * 6));
  });
}

function generateNetworkMetadata(nodes: NetworkNode[], edges: NetworkEdge[]): NetworkMetadata {
  const now = new Date();
  
  // Calculate node breakdown
  const nodeBreakdown = {
    functions: nodes.filter(n => n.type === 'function').length,
    destinations: nodes.filter(n => n.type === 'destination').length,
    networks: nodes.filter(n => n.type === 'network').length,
    datacenters: nodes.filter(n => n.type === 'datacenter').length
  };
  
  // Calculate connection types
  const connectionTypes: { [key: string]: number } = {};
  edges.forEach(edge => {
    connectionTypes[edge.type] = (connectionTypes[edge.type] || 0) + 1;
  });
  
  // Extract security features
  const securityFeatures: string[] = [];
  nodes.forEach(node => {
    if (node.type === 'function' && node.functionType === 'Firewall') {
      securityFeatures.push(`Firewall: ${node.name}`);
    }
    if (node.config?.dpi) {
      securityFeatures.push(`Deep Packet Inspection on ${node.name}`);
    }
    if (node.config?.networkSecurity === 'enhanced') {
      securityFeatures.push(`Enhanced Security on ${node.name}`);
    }
  });
  
  edges.forEach(edge => {
    if (edge.config?.encrypted) {
      securityFeatures.push(`Encrypted connection: ${edge.type}`);
    }
  });
  
  // Extract resiliency features
  const resiliencyFeatures: string[] = [];
  nodes.forEach(node => {
    if (node.config?.fastReroute) {
      resiliencyFeatures.push(`Fast Reroute enabled on ${node.name}`);
    }
    if (node.config?.bfd) {
      resiliencyFeatures.push(`BFD enabled on ${node.name}`);
    }
    if (node.config?.highAvailability) {
      resiliencyFeatures.push(`High Availability configuration on ${node.name}`);
    }
  });
  
  edges.forEach(edge => {
    if (edge.config?.resilience === 'ha' || edge.config?.resilience === 'redundant') {
      resiliencyFeatures.push(`${edge.config.resilience.toUpperCase()} resilience on ${edge.type} connection`);
    }
    if (edge.config?.bfd) {
      resiliencyFeatures.push(`BFD enabled on ${edge.type} connection`);
    }
  });
  
  // Extract regions
  const regions = Array.from(new Set(
    nodes
      .map(node => node.config?.region)
      .filter((region): region is string => region !== undefined)
  ));
  
  // Extract providers
  const providers = Array.from(new Set(
    nodes
      .map(node => node.config?.provider)
      .filter((provider): provider is string => provider !== undefined)
  ));
  
  return {
    exportDate: now.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }),
    exportTime: now.toLocaleTimeString('en-US', { 
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }),
    networkSummary: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      activeNodes: nodes.filter(n => n.status === 'active').length,
      activeEdges: edges.filter(e => e.status === 'active').length,
      totalBandwidth: calculateTotalBandwidth(edges)
    },
    nodeBreakdown,
    connectionTypes,
    securityFeatures,
    resiliencyFeatures,
    regions,
    providers
  };
}