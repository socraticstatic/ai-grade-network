import { NetworkNode, NetworkEdge } from '../../../types';

export interface Location {
  id: string;
  name: string;
  location: string;
  coordinates: { x: number; y: number };
  connections: string[];
  type: 'primary' | 'secondary' | 'cloud' | 'network';
  nodeType: string;
  provider?: string;
}

function convertGeoToMapCoordinates(
  latitude: number,
  longitude: number,
  mapWidth: number = 800,
  mapHeight: number = 600
): { x: number; y: number } {
  const x = ((longitude + 180) / 360) * mapWidth;
  const y = ((90 - latitude) / 180) * mapHeight;
  return { x, y };
}

export function extractLocations(nodes: NetworkNode[], edges: NetworkEdge[]): Location[] {
  return nodes
    .filter(node =>
      node.type === 'datacenter' ||
      node.type === 'destination' ||
      node.type === 'function' ||
      node.type === 'network'
    )
    .map(node => {
      const connections = edges
        .filter(edge => edge.source === node.id || edge.target === node.id)
        .map(edge => edge.source === node.id ? edge.target : edge.source);

      let x, y;

      if (node.config?.latitude && node.config?.longitude) {
        const coords = convertGeoToMapCoordinates(
          node.config.latitude,
          node.config.longitude
        );
        x = coords.x;
        y = coords.y;
      } else if (node.config?.globalX && node.config?.globalY) {
        x = node.config.globalX;
        y = node.config.globalY;
      } else {
        const centerX = 400;
        const centerY = 300;
        const radius = 250;

        if (node.type === 'destination') {
          const angle = (nodes.indexOf(node) * 30) * (Math.PI / 180);
          x = centerX + Math.cos(angle) * (radius * 0.8);
          y = centerY - 100 + Math.sin(angle) * (radius * 0.5);
        } else if (node.type === 'datacenter') {
          const angle = (180 + nodes.indexOf(node) * 40) * (Math.PI / 180);
          x = centerX + Math.cos(angle) * (radius * 0.7);
          y = centerY + 100 + Math.sin(angle) * (radius * 0.5);
        } else if (node.type === 'network') {
          const angle = (270 + nodes.indexOf(node) * 45) * (Math.PI / 180);
          x = centerX - 150 + Math.cos(angle) * (radius * 0.6);
          y = centerY + Math.sin(angle) * (radius * 0.6);
        } else {
          const angle = (90 + nodes.indexOf(node) * 45) * (Math.PI / 180);
          x = centerX + 150 + Math.cos(angle) * (radius * 0.6);
          y = centerY + Math.sin(angle) * (radius * 0.6);
        }
      }
      
      // Determine type for visual styling
      let locationType: Location['type'] = 'secondary';
      if (node.type === 'destination') {
        locationType = 'cloud';
      } else if (node.type === 'network') {
        locationType = 'network';
      } else if (node.status === 'active') {
        locationType = 'primary';
      }
      
      const locationDisplay = node.config?.city
        ? `${node.config.city}${node.config.state ? `, ${node.config.state}` : ''}`
        : node.config?.location || node.config?.region ||
          (node.type === 'function' && node.functionType) ||
          node.type;

      return {
        id: node.id,
        name: node.name,
        location: locationDisplay,
        coordinates: { x, y },
        connections,
        type: locationType,
        nodeType: node.type,
        provider: node.config?.provider
      };
    });
}