'use client';

import { useState } from 'react';
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
  tileLayer: TileLayer<OSM | XYZ> | null;
}

export default function BasemapSwitcher({ map, tileLayer }: BasemapSwitcherProps) {
  const [activeBasemap, setActiveBasemap] = useState('osm');

  const handleBasemapChange = (basemapId: string) => {
    const selectedBasemap = basemaps.find(b => b.id === basemapId);
    if (selectedBasemap && tileLayer) {
      tileLayer.setSource(selectedBasemap.source as any);
      setActiveBasemap(basemapId);
    }
  };
  
  if (!tileLayer) return null;

  return (
    <div className="basemap-switcher ol-control ol-unselectable">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className='bg-card/80 w-[2.25rem] h-[2.25rem]'>
            <Layers className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side='top' align='end'>
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
