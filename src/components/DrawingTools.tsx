'use client';

import { Control } from 'ol/control';
import { useEffect, useRef } from 'react';
import type { Map } from 'ol';
import type { DrawType } from '@/app/page';
import { Toggle } from '@/components/ui/toggle';
import { Separator } from '@/components/ui/separator';
import { MapPin, Spline, Square, Circle, Pointer, Pencil, Trash2, Pentagon } from 'lucide-react';
import BasemapSwitcher from './BasemapSwitcher';
import TileLayer from 'ol/layer/Tile';
import { OSM, XYZ } from 'ol/source';
import SceneViewSwitcher from './SceneViewSwitcher';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
  } from "@/components/ui/tooltip"

interface DrawingToolsProps {
  map: Map | null;
  drawType: DrawType | null;
  setDrawType: (type: DrawType | null) => void;
  featuresCount: number;
  tileLayer: TileLayer<OSM | XYZ> | null;
  is3d: boolean;
  onToggle3d: () => void;
  projection: 'EPSG:4326' | 'EPSG:3857';
  onProjectionChange: (proj: 'EPSG:4326' | 'EPSG:3857') => void;
}

export default function DrawingTools({ map, drawType, setDrawType, featuresCount, tileLayer, is3d, onToggle3d, projection, onProjectionChange }: DrawingToolsProps) {
  const controlRef = useRef<HTMLDivElement>(null);
  const customControlRef = useRef<Control | null>(null);
  
  useEffect(() => {
    if (!map || !controlRef.current) return;

    if (!customControlRef.current) {
        customControlRef.current = new Control({
            element: controlRef.current,
        });
    }
    
    const customControl = customControlRef.current;

    // Check if control is already added to avoid duplicates
    const isControlAdded = map.getControls().getArray().includes(customControl);
    if (!isControlAdded) {
        map.addControl(customControl);
    }

    return () => {
      // On cleanup, remove the control only if the map instance still exists
      // and the control is part of the map's controls.
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
       <div className='flex flex-col items-center gap-2'>
        <SceneViewSwitcher 
          is3d={is3d} 
          onToggle3d={onToggle3d} 
          projection={projection} 
          onProjectionChange={onProjectionChange} 
        />
        <BasemapSwitcher tileLayer={tileLayer} map={map} />
      </div>
      <div className='drawing-controls'>
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Toggle
                        aria-label="Select feature"
                        pressed={drawType === null}
                        onPressedChange={() => setDrawType(null)}
                    >
                        <Pointer className="h-4 w-4" />
                    </Toggle>
                </TooltipTrigger>
                <TooltipContent side="left"><p>Select</p></TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Toggle
                        aria-label="Draw a point"
                        pressed={drawType === 'Point'}
                        onPressedChange={() => handleDrawTypeChange('Point')}
                    >
                        <MapPin className="h-4 w-4" />
                    </Toggle>
                </TooltipTrigger>
                <TooltipContent side="left"><p>Draw Point</p></TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Toggle
                        aria-label="Draw a line"
                        pressed={drawType === 'LineString'}
                        onPressedChange={() => handleDrawTypeChange('LineString')}
                    >
                        <Spline className="h-4 w-4" />
                    </Toggle>
                </TooltipTrigger>
                <TooltipContent side="left"><p>Draw Line</p></TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Toggle
                        aria-label="Draw a polygon"
                        pressed={drawType === 'Polygon'}
                        onPressedChange={() => handleDrawTypeChange('Polygon')}
                    >
                        <Pentagon className="h-4 w-4" />
                    </Toggle>
                </TooltipTrigger>
                <TooltipContent side="left"><p>Draw Polygon</p></TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Toggle
                        aria-label="Draw a rectangle"
                        pressed={drawType === 'Rectangle'}
                        onPressedChange={() => handleDrawTypeChange('Rectangle')}
                    >
                        <Square className="h-4 w-4" />
                    </Toggle>
                </TooltipTrigger>
                <TooltipContent side="left"><p>Draw Rectangle</p></TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Toggle
                        aria-label="Draw a circle"
                        pressed={drawType === 'Circle'}
                        onPressedChange={() => handleDrawTypeChange('Circle')}
                    >
                        <Circle className="h-4 w-4" />
                    </Toggle>
                </TooltipTrigger>
                <TooltipContent side="left"><p>Draw Circle</p></TooltipContent>
            </Tooltip>

            {featuresCount > 0 && (
                <>
                <Separator orientation="horizontal" className="my-1 bg-border" />
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Toggle
                            aria-label="Edit feature"
                            pressed={drawType === 'Edit'}
                            onPressedChange={() => handleDrawTypeChange('Edit')}
                        >
                            <Pencil className="h-4 w-4" />
                        </Toggle>
                    </TooltipTrigger>
                    <TooltipContent side="left"><p>Edit Feature</p></TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Toggle
                            aria-label="Delete feature"
                            pressed={drawType === 'Delete'}
                            onPressedChange={() => handleDrawTypeChange('Delete')}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Toggle>
                    </TooltipTrigger>
                    <TooltipContent side="left"><p>Delete Feature</p></TooltipContent>
                </Tooltip>
                </>
            )}
        </TooltipProvider>
      </div>
    </div>
  );
}
