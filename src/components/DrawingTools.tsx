'use client';

import { Control } from 'ol/control';
import { useEffect, useRef } from 'react';
import type { Map } from 'ol';
import type { DrawType } from '@/app/page';
import { Toggle } from '@/components/ui/toggle';
import { Separator } from '@/components/ui/separator';
import { MapPin, Spline, Square, Circle, Pointer, Pencil, Trash2 } from 'lucide-react';
import BasemapSwitcher from './BasemapSwitcher';
import TileLayer from 'ol/layer/Tile';
import { OSM, XYZ } from 'ol/source';

interface DrawingToolsProps {
  map: Map | null;
  drawType: DrawType | null;
  setDrawType: (type: DrawType | null) => void;
  featuresCount: number;
  tileLayer: TileLayer<OSM | XYZ> | null;
}

export default function DrawingTools({ map, drawType, setDrawType, featuresCount, tileLayer }: DrawingToolsProps) {
  const controlRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (map && controlRef.current) {
      const customControl = new Control({
        element: controlRef.current,
      });
      // Check if control is already on the map
      const isControlAdded = map.getControls().getArray().some(control => control === customControl);
      if (!isControlAdded) {
        map.addControl(customControl);
      }

      return () => {
        if (map.getControls().getArray().some(control => control === customControl)) {
          map.removeControl(customControl);
        }
      };
    }
  }, [map]);
  
  const handleDrawTypeChange = (type: DrawType) => {
    setDrawType(drawType === type ? null : type);
  };

  return (
    <div ref={controlRef} className="drawing-tools ol-control ol-unselectable">
        <BasemapSwitcher tileLayer={tileLayer} map={map} />
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
