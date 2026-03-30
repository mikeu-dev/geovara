'use client';

import { useEffect, useState, useRef } from 'react';
import { Map } from 'ol';
import { toLonLat } from 'ol/proj';
import { MousePosition, ScaleLine } from 'ol/control';
import { createStringXY } from 'ol/coordinate';

interface StatusBarProps {
  map: Map | null;
  projection: string;
}

export default function StatusBar({ map, projection }: StatusBarProps) {
  const [zoom, setZoom] = useState<number>(2);
  const [coords, setCoords] = useState<string>('0.0000, 0.0000');
  const scaleLineRef = useRef<ScaleLine | null>(null);

  useEffect(() => {
    if (!map) return;

    // Update zoom on view change
    const view = map.getView();
    const updateZoom = () => {
      const z = view.getZoom();
      if (z !== undefined) setZoom(Math.round(z * 100) / 100);
    };
    view.on('change:resolution', updateZoom);
    updateZoom();

    // Track mouse coordinates
    const handlePointerMove = (evt: any) => {
      if (evt.dragging) return;
      const lonLat = toLonLat(evt.coordinate);
      setCoords(`${lonLat[1].toFixed(4)}, ${lonLat[0].toFixed(4)}`);
    };
    map.on('pointermove', handlePointerMove);

    // Add scale line
    if (!scaleLineRef.current) {
      scaleLineRef.current = new ScaleLine({
        units: 'metric',
        bar: false,
        minWidth: 100,
      });
      map.addControl(scaleLineRef.current);
    }

    return () => {
      view.un('change:resolution', updateZoom);
      map.un('pointermove', handlePointerMove);
    };
  }, [map]);

  return (
    <div className="status-bar absolute bottom-0 left-0 right-0 z-30 flex items-center justify-between px-3 py-1.5 text-muted-foreground gap-4">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-60">
            <circle cx="12" cy="12" r="10"/>
            <line x1="2" y1="12" x2="22" y2="12"/>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
          {coords}
        </span>
        <span className="opacity-30">│</span>
        <span className="flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-60">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            <line x1="11" y1="8" x2="11" y2="14"/>
            <line x1="8" y1="11" x2="14" y2="11"/>
          </svg>
          z{zoom}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[10px] uppercase tracking-wider opacity-50">{projection}</span>
      </div>
    </div>
  );
}
