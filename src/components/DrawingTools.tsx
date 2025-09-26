'use client';

import { Control } from 'ol/control';
import { useEffect, useRef } from 'react';
import type { Map } from 'ol';
import type { DrawType } from '@/app/page';
import { Toggle } from '@/components/ui/toggle';
import { Separator } from '@/components/ui/separator';
import { MapPin, Spline, Square, Circle, Pointer, Pencil, Trash2, Globe, Map as MapIcon } from 'lucide-react';
import BasemapSwitcher from './BasemapSwitcher';
import TileLayer from 'ol/layer/Tile';
import { OSM, XYZ } from 'ol/source';
import MapModeToggle from './MapModeToggle';

interface DrawingToolsProps {
  map: Map | null;
  drawType: DrawType | null;
  setDrawType: (type: DrawType | null) => void;
  featuresCount: number;
  tileLayer: TileLayer<OSM | XYZ> | null;
  is3d: boolean;
  onToggle3d: () => void;
}

export default function DrawingTools({ map, drawType, setDrawType, featuresCount, tileLayer, is3d, onToggle3d }: DrawingToolsProps) {
  const controlRef = useRef<HTMLDivElement>(null);
  const customControlRef = useRef<Control | null>(null);
  
  useEffect(() => {
    if (!map || !controlRef.current) return;

    // Create the control only once and store it in a ref
    if (!customControlRef.current) {
        customControlRef.current = new Control({
            element: controlRef.current,
        });
    }
    
    const customControl = customControlRef.current;

    // Add control if it's not already on the map
    const isControlAdded = map.getControls().getArray().includes(customControl);
    if (!isControlAdded) {
        map.addControl(customControl);
    }

    return () => {
        // On cleanup, remove the control if it exists on the map and if map exists
        if (map && map.getControls().getArray().includes(customControl)) {
            map.removeControl(customControl);
        }
    };
  }, [map]);
  
  const handleDrawTypeChange = (type: DrawType) => {
    setDrawType(drawType === type ? null : type);
  };

  return (
    <div ref={controlRef} className="drawing-tools ol-control ol-unselectable">
       <div className='flex flex-col gap-2'>
        <MapModeToggle is3d={is3d} onToggle3d={onToggle3d} />
        <BasemapSwitcher tileLayer={tileLayer} map={map} />
      </div>
      <div className='drawing-controls'>
          <Toggle
              aria-label="Select feature"
              pressed={drawType === null}
              onPressedChange={() => setDrawType(null)}
          >
              <Pointer className="h-4 w-4" />
          </Toggle>
          <Toggle
              aria-label="Draw a point"
              pressed={drawType === 'Point'}
              onPressedChange={() => handleDrawTypeChange('Point')}
          >
              <MapPin className="h-4 w-4" />
          </Toggle>
          <Toggle
              aria-label="Draw a line"
              pressed={drawType === 'LineString'}
              onPressedChange={() => handleDrawTypeChange('LineString')}
          >
              <Spline className="h-4 w-4" />
          </Toggle>
          <Toggle
              aria-label="Draw a polygon"
              pressed={drawType === 'Polygon'}
              onPressedChange={() => handleDrawTypeChange('Polygon')}
          >
              <Square className="h-4 w-4" />
          </Toggle>
          <Toggle
              aria-label="Draw a circle"
              pressed={drawType === 'Circle'}
              onPressedChange={() => handleDrawTypeChange('Circle')}
          >
              <Circle className="h-4 w-4" />
          </Toggle>

          {featuresCount > 0 && (
              <>
              <Separator orientation="horizontal" className="my-1 bg-border" />
              <Toggle
                  aria-label="Edit feature"
                  pressed={drawType === 'Edit'}
                  onPressedChange={() => handleDrawTypeChange('Edit')}
              >
                  <Pencil className="h-4 w-4" />
              </Toggle>
              <Toggle
                  aria-label="Delete feature"
                  pressed={drawType === 'Delete'}
                  onPressedChange={() => handleDrawTypeChange('Delete')}
              >
                  <Trash2 className="h-4 w-4" />
              </Toggle>
              </>
          )}
      </div>
    </div>
  );
}
