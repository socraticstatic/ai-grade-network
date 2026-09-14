import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cloud, Server, Network, Activity, Shield, Globe, Clock, Edit2 } from 'lucide-react';
import { Connection, NetworkNode, NetworkEdge } from '../../types';
import { Canvas } from '../network-designer/Canvas';
import { Button } from '../common/Button';

interface ConnectionVisualizationProps {
  connection: Connection;
  standalone?: boolean;
}

export function ConnectionVisualization({ connection, standalone = false }: ConnectionVisualizationProps) {
  const navigate = useNavigate();
  const hubRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<NetworkNode[]>([]);
  const [edges, setEdges] = useState<NetworkEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [hoveredElement, setHoveredElement] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Create nodes and edges based on the connection
  useEffect(() => {
    if (!hubRef.current) return;
    
    const rect = hubRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    // Source node (customer side)
    const sourceNode: NetworkNode = {
      id: 'source-1',
      type: 'source',
      x: width * 0.15,
      y: height * 0.5 - 32,
      name: 'Your Network',
      status: connection.status === 'Active' ? 'active' : 'inactive',
      config: {
        location: connection.location,
        connectionType: connection.type
      }
    };

    const newNodes: NetworkNode[] = [sourceNode];
    const newEdges: NetworkEdge[] = [];

    // IPE node (physical infrastructure layer)
    if (connection.primaryIPE) {
      const ipeNode: NetworkNode = {
        id: 'ipe-1',
        type: 'router',
        x: width * 0.5,
        y: height * 0.5 - 32,
        name: connection.primaryIPE,
        status: connection.status === 'Active' ? 'active' : 'inactive',
        config: {
          label: 'Physical IPE',
          description: 'Infrastructure Provider Edge Router',
          type: 'IPE'
        }
      };
      newNodes.push(ipeNode);

      // Edge from source to IPE
      newEdges.push({
        id: 'edge-source-ipe',
        source: 'source-1',
        target: 'ipe-1',
        type: 'Virtual Connection',
        bandwidth: connection.bandwidth,
        status: connection.status === 'Active' ? 'active' : 'inactive'
      });
    }

    // Target node (cloud provider)
    const targetNode: NetworkNode = {
      id: 'destination-1',
      type: 'destination',
      x: width * 0.85,
      y: height * 0.5 - 32,
      name: connection.provider || 'Cloud Provider',
      status: connection.status === 'Active' ? 'active' : 'inactive',
      config: {
        provider: connection.provider,
        region: connection.location
      }
    };
    newNodes.push(targetNode);

    // Edge from IPE to destination (or source to destination if no IPE)
    if (connection.primaryIPE) {
      newEdges.push({
        id: 'edge-ipe-dest',
        source: 'ipe-1',
        target: 'destination-1',
        type: 'Cloud On-Ramp',
        bandwidth: connection.bandwidth,
        status: connection.status === 'Active' ? 'active' : 'inactive',
        metrics: {
          latency: connection.performance?.latency,
          packetLoss: connection.performance?.packetLoss
        }
      });
    } else {
      newEdges.push({
        id: 'edge-1',
        source: 'source-1',
        target: 'destination-1',
        type: connection.type,
        bandwidth: connection.bandwidth,
        status: connection.status === 'Active' ? 'active' : 'inactive',
        metrics: {
          latency: connection.performance?.latency,
          packetLoss: connection.performance?.packetLoss
        }
      });
    }

    setNodes(newNodes);
    setEdges(newEdges);
    
    // Update on resize
    const handleResize = () => {
      if (!hubRef.current) return;
      
      const newRect = hubRef.current.getBoundingClientRect();
      const newWidth = newRect.width;
      const newHeight = newRect.height;
      
      setNodes(prevNodes => prevNodes.map(node => {
        if (node.id === 'source-1') {
          return { ...node, x: newWidth * 0.15, y: newHeight * 0.5 - 32 };
        } else if (node.id === 'ipe-1') {
          return { ...node, x: newWidth * 0.5, y: newHeight * 0.5 - 32 };
        } else if (node.id === 'destination-1') {
          return { ...node, x: newWidth * 0.85, y: newHeight * 0.5 - 32 };
        }
        return node;
      }));
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [connection, hubRef]);

  // Handle node click - read only
  const handleNodeClick = (node: NetworkNode) => {
    setSelectedNode(node.id);
    setSelectedEdge(null);
    if (standalone) {
      navigate(`/connections/${connection.id}`);
    }
  };

  // Handle edge click - read only
  const handleEdgeClick = (edge: NetworkEdge) => {
    setSelectedEdge(edge.id);
    setSelectedNode(null);
    if (standalone) {
      navigate(`/connections/${connection.id}`);
    }
  };

  // Handle click on standalone mode to navigate to connection details
  const handleCanvasClick = () => {
    if (standalone) {
      navigate(`/connections/${connection.id}`);
    }
  };

  // Navigate to visual designer to edit topology
  const handleEditTopology = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Create the network data structure for the visual designer (without React components)
    const initialNodes = [
      {
        id: 'source-1',
        type: 'source',
        x: 100,
        y: 200,
        name: 'Your Network',
        status: connection.status === 'Active' ? 'active' : 'inactive',
        config: {
          location: connection.location,
          connectionType: connection.type // Add this to help determine icon
        }
      },
      {
        id: 'destination-1',
        type: 'destination',
        x: 500,
        y: 200,
        name: connection.provider || 'Cloud Provider',
        status: connection.status === 'Active' ? 'active' : 'inactive',
        config: {
          provider: connection.provider,
          region: connection.location
        }
      }
    ];
    
    const initialEdges = [
      {
        id: 'edge-1',
        source: 'source-1',
        target: 'destination-1',
        type: connection.type,
        bandwidth: connection.bandwidth,
        status: connection.status === 'Active' ? 'active' : 'inactive',
        metrics: {
          latency: connection.performance?.latency,
          packetLoss: connection.performance?.packetLoss
        }
      }
    ];
    
    // Log what we're sending to the router
    console.log("Navigating to visual editor with:", {
      initialNodes,
      initialEdges,
      connection
    });
    
    // Navigate to the wizard with the initial state (only serializable data)
    navigate('/create', { 
      state: { 
        mode: 'visual',
        initialConnection: connection,
        editMode: true,
        initialNodes,
        initialEdges
      } 
    });
    
    // Show toast notification
    window.addToast({
      type: 'info',
      title: 'Edit Network Topology',
      message: 'Opening Network Designer to edit your network configuration',
      duration: 3000
    });
  };

  return (
    <div
      className="relative w-full h-full flex flex-col"
      ref={hubRef}
    >
      {/* Edit button */}
      <div className="absolute top-4 right-4 z-10">
        <Button
          variant="primary"
          size="sm"
          icon={Edit2}
          onClick={handleEditTopology}
          className="shadow-md"
        >
          Edit Topology
        </Button>
      </div>

      {/* Canvas hub with centering */}
      <div
        className="flex-1 flex items-center justify-center relative"
        onClick={handleCanvasClick}
      >
        <Canvas
          nodes={nodes}
          edges={edges}
          selectedNode={selectedNode}
          selectedEdge={selectedEdge}
          isCreatingEdge={false}
          edgeStart={null}
          onNodeClick={handleNodeClick}
          onNodeDrag={() => {}} // Read-only
          onNodeDragEnd={() => {}} // Read-only
          onEdgeClick={handleEdgeClick}
          maxY={hubRef.current?.clientHeight || 400}
          showEffects={false} // Disable animations but still show connection lines
        />
      </div>

      {/* Connection details overlay at the bottom - Elegant version */}
      <div className="absolute bottom-0 left-0 right-0 bg-fw-base/90 backdrop-blur-md border-t border-fw-secondary px-4 py-3">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${connection.status === 'Active' ? 'bg-fw-success animate-pulse' : 'bg-fw-neutral'}`} />
            <span className="text-figma-sm font-semibold text-fw-heading">{connection.status}</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-blue/10 rounded-full">
            <Network className="h-3.5 w-3.5 text-fw-link" />
            <span className="text-figma-sm font-semibold text-fw-link">{connection.bandwidth}</span>
          </div>

          {connection.performance?.latency && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-fw-successLight rounded-full">
              <Clock className="h-3.5 w-3.5 text-fw-success" />
              <span className="text-figma-sm font-semibold text-fw-success">{connection.performance.latency}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}