import { useState, useEffect } from 'react';
import type { NetworkNode, NetworkEdge } from '../../types';
import { ZoomControls } from '../ZoomControls';

// Import components
import { ActionButtons } from './components/ActionButtons';
import { MapBackground } from './components/MapBackground';
import { ConnectionLines } from './components/ConnectionLines';
import { EmptyState } from './components/EmptyState';
import { InstructionsOverlay } from './components/InstructionsOverlay';
import { ZoomIndicator } from './components/ZoomIndicator';
import { PanInstructions } from './components/PanInstructions';
import { SelectedLocationDetails } from './components/SelectedLocationDetails';
import { PanelOverlay } from './components/PanelOverlay';

// Import hooks
import { useGlobalViewState } from './hooks/useGlobalViewState';
import { useZoomControls } from './hooks/useZoomControls';
import { usePanControls } from './hooks/usePanControls';

// Import utilities
import { extractLocations } from './utils/locationUtils';

import { LocationMarkers } from './LocationMarkers';

interface GlobalViewProps {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  onNodeSelect: (nodeId: string) => void;
  onZoomIn: (datacenterId: string) => void;
}

export function GlobalView({ nodes, edges, onNodeSelect, onZoomIn }: GlobalViewProps) {
  // Get state from hooks
  const {
    selectedLocation,
    setSelectedLocation,
    activePanel,
    setActivePanel,
    hubRef,
    zoomLevel,
    setZoomLevel,
    panOffset,
    setPanOffset,
    isPanning,
    setIsPanning,
    startPanPosition,
    setStartPanPosition,
    contentBounds,
    setContentBounds
  } = useGlobalViewState();

  // Extract locations from nodes
  const locations = extractLocations(nodes, edges);

  // Set up zoom controls
  const {
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
    handleFitToScreen
  } = useZoomControls({
    zoomLevel,
    setZoomLevel,
    setPanOffset,
    locations,
    hubRef
  });

  // Set up pan controls
  usePanControls({
    hubRef,
    isPanning,
    setIsPanning,
    startPanPosition,
    setStartPanPosition,
    panOffset,
    setPanOffset,
    zoomLevel
  });

  // Calculate content bounds when locations change
  useEffect(() => {
    if (locations.length === 0) {
      setContentBounds({ minX: 0, minY: 0, maxX: 800, maxY: 600 });
      return;
    }

    const xs = locations.map(loc => loc.coordinates.x);
    const ys = locations.map(loc => loc.coordinates.y);
    
    setContentBounds({
      minX: Math.min(...xs) - 50,
      minY: Math.min(...ys) - 50,
      maxX: Math.max(...xs) + 50,
      maxY: Math.max(...ys) + 50
    });
  }, [locations, setContentBounds]);

  const handleLocationClick = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedLocation(id);
    onNodeSelect(id);
  };
  
  // Handler for geographical location clicks
  const handleGeoLocationClick = (regionId: string, regionName: string) => {
    // Find if there are any nodes in this region
    const nodesInRegion = nodes.filter(node => 
      node.config?.region === regionId || 
      (node.config?.location && node.config.location.toLowerCase().includes(regionName.toLowerCase()))
    );
    
    // If there's a node in this region, select the first one
    if (nodesInRegion.length > 0) {
      setSelectedLocation(nodesInRegion[0].id);
      onNodeSelect(nodesInRegion[0].id);
    } else {
      window.addToast({
        type: 'info',
        title: 'No Resources Here',
        message: `No network resources found in ${regionName}`,
        duration: 3000
      });
    }
  };

  // Handler for the background click
  const handleBackgroundClick = () => {
    if (activePanel === 'none') {
      setSelectedLocation(null);
    }
  };
  
  // Toggle panel function - ensures only one panel is open at a time
  const togglePanel = (panelType: 'metrics' | 'performance') => {
    // If the clicked panel is already active, close it
    if ((panelType === 'metrics' && activePanel === 'metrics') || 
        (panelType === 'performance' && activePanel === 'performance')) {
      setActivePanel('none');
    } 
    // Otherwise, activate the clicked panel and close the other one
    else {
      setActivePanel(panelType);
    }
  };
  
  // Get active regions from our nodes
  const activeRegions = nodes
    .map(node => node.config?.region)
    .filter((region): region is string => region !== undefined);

  return (
    <div 
      ref={hubRef}
      className="relative h-[800px] overflow-hidden rounded-lg"
      style={{
        backgroundColor: '#f8fafc',  // Very light blue background
        zIndex: 1,
        cursor: isPanning ? 'grabbing' : 'default'
      }}
      onClick={handleBackgroundClick}
    >
      {/* Zoom Controls */}
      <ZoomControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onReset={handleZoomReset}
        onFitToScreen={handleFitToScreen}
      />

      {/* Action Buttons */}
      <ActionButtons 
        activePanel={activePanel}
        togglePanel={togglePanel}
        nodesLength={nodes.length}
      />

      {/* Zoom level indicator */}
      <ZoomIndicator zoomLevel={zoomLevel} />

      {/* Pan instructions */}
      <PanInstructions />

      {/* Zoomable and Pannable Content Hub */}
      <div 
        className="absolute inset-0"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
          transformOrigin: '0 0',
          transition: isPanning ? 'none' : 'transform 0.1s ease-out',
          zIndex: 5
        }}
      >
        {/* Map Background */}
        <MapBackground zoomLevel={zoomLevel} panOffset={panOffset} />

        {/* Connection lines between locations */}
        <ConnectionLines 
          locations={locations} 
          edges={edges} 
          selectedLocation={selectedLocation} 
        />
      </div>
      
      {/* Location Markers - Added on top of the map but below network nodes */}
      <LocationMarkers 
        zoomLevel={zoomLevel}
        panOffset={panOffset}
        onLocationClick={handleGeoLocationClick}
        activeRegions={activeRegions}
      />

      {/* Selected Location Details */}
      <SelectedLocationDetails 
        selectedLocation={selectedLocation}
        nodes={nodes}
        onZoomIn={onZoomIn}
      />

      {/* Empty State */}
      {locations.length === 0 && (
        <EmptyState onZoomOut={onZoomIn} />
      )}
      
      {/* Instructions Overlay */}
      <InstructionsOverlay 
        selectedLocation={selectedLocation}
        locationsLength={locations.length}
        activePanel={activePanel}
      />
      
      {/* Panel Overlay */}
      <PanelOverlay 
        activePanel={activePanel}
        nodes={nodes}
        edges={edges}
        onClose={() => setActivePanel('none')}
      />
    </div>
  );
}