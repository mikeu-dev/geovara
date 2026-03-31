'use client';

import { useState } from 'react';
import type TileLayer from 'ol/layer/Tile';
import type { OSM, XYZ } from 'ol/source';
import { Layers, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import OSM_Source from 'ol/source/OSM';
import XYZ_Source from 'ol/source/XYZ';

const basemaps = [
  { id: 'osm', name: 'OpenStreetMap', source: new OSM_Source() },
  { id: 'satellite', name: 'Satellite (Esri)', source: new XYZ_Source({ url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', maxZoom: 19, attributions: 'Tiles © Esri' }) },
  { id: 'topo', name: 'Topographic', source: new XYZ_Source({ url: 'https://{a-c}.tile.opentopomap.org/{z}/{x}/{y}.png', maxZoom: 17, attributions: '© OpenTopoMap' }) },
  { id: 'dark', name: 'Dark (CartoDB)', source: new XYZ_Source({ url: 'https://{a-d}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', maxZoom: 20, attributions: '© CARTO' }) },
];

interface BasemapSwitcherProps {
  tileLayer: TileLayer<OSM | XYZ> | null;
}

export default function BasemapSwitcher({ tileLayer }: BasemapSwitcherProps) {
  const [activeBasemap, setActiveBasemap] = useState('osm');
  const [opacity, setOpacity] = useState(1);

  const handleBasemapChange = (basemapId: string) => {
    const selectedBasemap = basemaps.find(b => b.id === basemapId);
    if (selectedBasemap && tileLayer) {
      tileLayer.setSource(selectedBasemap.source as (OSM_Source | XYZ_Source));
      setActiveBasemap(basemapId);
    }
  };

  const handleOpacityChange = (value: number) => {
    setOpacity(value);
    if (tileLayer) {
      tileLayer.setOpacity(value);
    }
  };

  if (!tileLayer) return null;

  return (
    <div className="bg-card/80 backdrop-filter-[4px] rounded-md p-0.5">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className='w-[2.25rem] h-[2.25rem]'>
            <Layers className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side='top' align='end' className="w-48">
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Basemap
          </DropdownMenuLabel>
          {basemaps.map(basemap => (
            <DropdownMenuItem key={basemap.id} onSelect={() => handleBasemapChange(basemap.id)}>
              <div className="w-4 mr-2 flex-shrink-0">
                {activeBasemap === basemap.id && <Check className="h-3.5 w-3.5 text-accent" />}
              </div>
              <span className="text-sm">{basemap.name}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <div className="px-2 py-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Opacity</span>
              <span className="text-[10px] text-muted-foreground font-mono">{Math.round(opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={opacity}
              onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer accent-accent"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            />
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
