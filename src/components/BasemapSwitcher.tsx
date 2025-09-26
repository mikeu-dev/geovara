'use client';

import { useEffect, useRef, useState } from 'react';
import { Control } from 'ol/control';
import type { Map } from 'ol';
import type TileLayer from 'ol/layer/Tile';
import type { OSM, XYZ } from 'ol/source';
import { Layers, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import OSM_Source from 'ol/source/OSM';
import XYZ_Source from 'ol/source/XYZ';


const basemaps = [
    { id: 'osm', name: 'OpenStreetMap', source: new OSM_Source() },
    { id: 'satellite', name: 'Satellite', source: new XYZ_Source({ url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', maxZoom: 19, attribution: 'Tiles © Esri' })},
];


interface BasemapSwitcherProps {
  map: Map | null;
  tileLayer: TileLayer<OSM | XYZ>;
}

export default function BasemapSwitcher({ map, tileLayer }: BasemapSwitcherProps) {
  const controlRef = useRef<HTMLDivElement>(null);
  const [activeBasemap, setActiveBasemap] = useState('osm');

  useEffect(() => {
    if (map && controlRef.current) {
      const customControl = new Control({
        element: controlRef.current,
      });
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

  const handleBasemapChange = (basemapId: string) => {
    const selectedBasemap = basemaps.find(b => b.id === basemapId);
    if (selectedBasemap) {
      tileLayer.setSource(selectedBasemap.source as any);
      setActiveBasemap(basemapId);
    }
  };

  return (
    <div ref={controlRef} className="basemap-switcher ol-control ol-unselectable">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className='w-10 h-10 bg-card/80'>
            <Layers className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side='top' align='start'>
          {basemaps.map(basemap => (
            <DropdownMenuItem key={basemap.id} onSelect={() => handleBasemapChange(basemap.id)}>
              <div className="w-4 mr-2">
                {activeBasemap === basemap.id && <Check className="h-4 w-4" />}
              </div>
              {basemap.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
