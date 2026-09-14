import React from 'react';

interface MapBackgroundProps {
  zoomLevel: number;
  panOffset: { x: number; y: number };
}

export function MapBackground({ zoomLevel, panOffset }: MapBackgroundProps) {
  return (
    <>
      {/* World Map SVG Background */}
      <div 
        className="absolute inset-0 bg-[#ebf5ff]"
        style={{
          backgroundImage: "url('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.svg')",
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          backgroundSize: 'cover',
          opacity: 0.3,
          zIndex: 5
        }}
      ></div>
      
      {/* World Map Image Fallback (in case SVG doesn't load) */}
      <img 
        src="https://upload.wikimedia.org/wikipedia/commons/8/80/World_map_-_low_resolution.svg"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          opacity: 0.2,
          zIndex: 6
        }}
      />
      
      {/* Subtle grid pattern */}
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: 'linear-gradient(rgba(219, 234, 254, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(219, 234, 254, 0.5) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
          opacity: 0.6,
          zIndex: 10,
          pointerEvents: 'none'
        }}
      ></div>
    </>
  );
}