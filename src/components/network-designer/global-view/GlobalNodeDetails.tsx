import { useState } from 'react';
import { Globe, Router, Database, Network, ZoomIn, Map, Maximize, ArrowRight, Building } from 'lucide-react';
import type { NetworkNode, NetworkEdge } from '../../types';

interface GlobalNodeDetailsProps {
  node: NetworkNode;
  onZoomIn: () => void;
}

export function GlobalNodeDetails({ node, onZoomIn }: GlobalNodeDetailsProps) {
  const isCloud = node.type === 'destination';
  const isDatacenter = node.type === 'datacenter';
  const isNetwork = node.type === 'network';
  const isFunction = node.type === 'function';
  
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          {isCloud ? (
            <Globe className="h-5 w-5 mr-2 text-blue-600" />
          ) : isDatacenter ? (
            <Database className="h-5 w-5 mr-2 text-indigo-600" />
          ) : isNetwork ? (
            <Network className="h-5 w-5 mr-2 text-green-600" />
          ) : isFunction ? (
            <Router className="h-5 w-5 mr-2 text-purple-600" />
          ) : (
            <Building className="h-5 w-5 mr-2 text-gray-600" />
          )}
          <h3 className="text-lg font-semibold text-gray-900">{node.name}</h3>
        </div>
        <button
          onClick={onZoomIn}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors"
        >
          <ZoomIn className="h-4 w-4" />
          <span className="text-sm">View Details</span>
        </button>
      </div>
      
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Location</p>
          <p className="text-sm font-medium text-gray-900">
            {node.config?.location || node.config?.region || 
             (isFunction ? (node.functionType || 'Router') : 'Unknown location')}
          </p>
        </div>
        
        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Type</p>
          <p className="text-sm font-medium text-gray-900 flex items-center">
            {isCloud ? (
              <>
                <Globe className="h-4 w-4 mr-1 text-blue-500" />
                {node.config?.provider || 'Cloud Provider'}
              </>
            ) : isDatacenter ? (
              <>
                <Database className="h-4 w-4 mr-1 text-indigo-500" />
                {node.config?.provider || 'Data Center'}
              </>
            ) : isNetwork ? (
              <>
                <Network className="h-4 w-4 mr-1 text-green-500" />
                {node.config?.networkType || 'Network'}
              </>
            ) : isFunction ? (
              <>
                <Router className="h-4 w-4 mr-1 text-purple-500" />
                {node.functionType || 'Function'}
              </>
            ) : (
              'Unknown'
            )}
          </p>
        </div>
        
        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Status</p>
          <p className={`text-sm font-medium flex items-center ${
            node.status === 'active' ? 'text-green-600' : 'text-gray-500'
          }`}>
            <span className={`w-2 h-2 rounded-full mr-1.5 ${
              node.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
            }`}></span>
            {node.status === 'active' ? 'Active' : 'Inactive'}
          </p>
        </div>
      </div>
      
      {node.config && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Additional Information</h4>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(node.config)
                .filter(([key]) => !['location', 'provider', 'region', 'globalX', 'globalY', 'networkType'].includes(key))
                .slice(0, 6)
                .map(([key, value]) => (
                  <div key={key} className="text-sm">
                    <span className="text-xs text-gray-500 capitalize">{key}: </span>
                    <span className="font-medium text-gray-900">
                      {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value?.toString() || 'N/A'}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
      
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <button
            className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors flex items-center gap-1"
            onClick={onZoomIn}
          >
            <Map className="h-4 w-4" />
            <span className="text-sm">Network Topology</span>
          </button>
          
          <button
            className="px-3 py-1.5 bg-purple-50 text-purple-600 rounded-md hover:bg-purple-100 transition-colors flex items-center gap-1"
            onClick={onZoomIn}
          >
            <ArrowRight className="h-4 w-4" />
            <span className="text-sm">View Connections</span>
          </button>
        </div>
        
        <span className="text-xs text-gray-500 italic">
          Click any location on the map to select it
        </span>
      </div>
    </div>
  );
}