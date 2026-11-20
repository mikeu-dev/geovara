'use client';

import { useEffect, useState, useRef } from 'react';
import { Map, MapBrowserEvent } from 'ol';
import { toLonLat } from 'ol/proj';
import { ScaleLine } from 'ol/control';
import { CLOUD, CLOUD_MOBILE } from '@/lib/cloud-shape';

interface StatusBarProps {
  map: Map | null;
  projection: string;
  is3d?: boolean;
  layout?: 'desktop' | 'mobile';
  /** Scale / coordinate slot box from the cloud layout (desktop). */
  slot?: { left: number; width: number; height: number } | null;
}

export default function StatusBar({
  map,
  projection,
  is3d = false,
  layout = 'desktop',
  slot = null,
}: StatusBarProps) {
  const [zoom, setZoom] = useState<number>(2);
  const [coords, setCoords] = useState<string>('0.0000, 0.0000');
  const [altitude, setAltitude] = useState<string>('12,000 km');
  const scaleTargetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!map) return;

    // Update zoom and estimated camera altitude on view change
    const view = map.getView();
    const updateZoomAndAlt = () => {
      const z = view.getZoom();
      if (z !== undefined) {
        setZoom(Math.round(z * 100) / 100);
        // Estimate camera altitude from zoom level
        const res = view.getResolution();
        if (res !== undefined) {
          const altMeters = res * 1000;
          if (altMeters >= 1000000) {
            setAltitude(`${(altMeters / 1000000).toFixed(1)}k km`);
          } else if (altMeters >= 1000) {
            setAltitude(`${Math.round(altMeters / 1000).toLocaleString()} km`);
          } else {
            setAltitude(`${Math.round(altMeters)} m`);
          }
        }
      }
    };
    view.on('change:resolution', updateZoomAndAlt);
    updateZoomAndAlt();

    // Track mouse coordinates
    const handlePointerMove = (evt: MapBrowserEvent<PointerEvent>) => {
      if (evt.dragging) return;
      const lonLat = toLonLat(evt.coordinate);
      setCoords(`${lonLat[1].toFixed(4)}, ${lonLat[0].toFixed(4)}`);
    };
    map.on('pointermove', handlePointerMove);


    return () => {
      view.un('change:resolution', updateZoomAndAlt);
      map.un('pointermove', handlePointerMove);
    };
  }, [map]);

  // The scale bar renders into whichever slot element is mounted; re-attach it
  // when that element changes (desktop ↔ mobile) so it never goes missing.
  useEffect(() => {
    if (!map || !scaleTargetRef.current) return;
    const control = new ScaleLine({
      units: 'metric',
      bar: false,
      // Keep the bar inside the 100px collapsed slot at every zoom: an uncapped
      // bar grows past the slot after a zoom-to-feature and gets clipped away.
      minWidth: 48,
      maxWidth: 68,
      target: scaleTargetRef.current,
    });
    map.addControl(control);
    return () => {
      map.removeControl(control);
    };
  }, [map, layout]);

  const modeLabel = is3d ? '3D · globe' : '2D · presisi';

  if (layout === 'mobile') {
    return (
      <>
        <div ref={scaleTargetRef} className="hidden" />
        <div
          className="absolute z-30 font-mono text-xs font-medium text-muted-foreground whitespace-nowrap"
          style={{ left: CLOUD_MOBILE.margin + 16, bottom: CLOUD_MOBILE.margin + 15, height: 16 }}
        >
          {modeLabel} · Z {Math.round(zoom)}
        </div>
      </>
    );
  }

  const wide = (slot?.width ?? 0) > CLOUD.tabW;

  return (
    <>
      {/* Scale & coordinates: the separate glass piece in the left sidebar's notch */}
      <div
        className="glass-smoke float-shadow cloud-move absolute z-30 flex flex-col justify-center gap-1.5 px-4 overflow-hidden whitespace-nowrap font-mono text-[11px] font-medium text-muted-foreground"
        style={{
          left: slot?.left ?? CLOUD.margin,
          bottom: CLOUD.margin,
          height: slot?.height ?? 0,
          width: slot?.width ?? 0,
          borderRadius: '22px 22px 22px 30px',
        }}
      >
        <div ref={scaleTargetRef} className="geovara-scale" />
        <span>
          Z {Math.round(zoom)}
          {is3d && wide ? ` · alt ${altitude}` : ''}
        </span>
        {wide && <span>{coords}</span>}
      </div>

      {/* Mode pill centred in the map window */}
      <div
        className="status-bar cloud-move absolute z-30 h-11 w-[250px] -translate-x-1/2 flex items-center justify-center gap-3 text-muted-foreground"
        style={{ bottom: 30, left: 'calc((var(--map-l, 0px) + 100vw - var(--map-r, 0px)) / 2)' }}
      >
        <span className="px-2.5 py-0.5 rounded-cloud-sb bg-primary/10 text-primary font-semibold">
          {modeLabel}
        </span>
        <span>{is3d ? 'WGS84' : projection}</span>
      </div>
    </>
  );
}
