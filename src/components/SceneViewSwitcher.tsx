'use client';

import { Check, Globe, Map as MapIcon, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SceneViewSwitcherProps {
  is3d: boolean;
  onToggle3d: () => void;
  projection: 'EPSG:4326' | 'EPSG:3857';
  onProjectionChange: (proj: 'EPSG:4326' | 'EPSG:3857') => void;
}

export default function SceneViewSwitcher({ is3d, onToggle3d, projection, onProjectionChange }: SceneViewSwitcherProps) {
  
  const handleSelectMode = (mode: '3d' | '3857' | '4326') => {
    if (mode === '3d') {
      if (!is3d) onToggle3d();
    } else {
      if (is3d) onToggle3d(); // Turn off 3D
      const fullProj = mode === '3857' ? 'EPSG:3857' : 'EPSG:4326';
      onProjectionChange(fullProj as any);
    }
  };

  const getActiveLabel = () => {
    if (is3d) return '3D';
    return projection.split(':')[1];
  };

  return (
    <div className="bg-card/80 backdrop-filter-[4px] rounded-md p-0.5">
      <TooltipProvider>
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className='w-[2.25rem] h-[2.25rem] flex flex-col items-center justify-center gap-0.5'>
                  {is3d ? <Globe className="h-4 w-4" /> : <MapIcon className="h-4 w-4" />}
                  <span className="text-[8px] font-bold opacity-70 leading-none">{getActiveLabel()}</span>
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side='right'>
              <p>Map View & Projection</p>
            </TooltipContent>
          </Tooltip>
          
          <DropdownMenuContent side='right' align='start' className="w-48">
            <DropdownMenuLabel className="text-xs">2D Flat Mode</DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => handleSelectMode('3857')} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapIcon className="w-3 h-3" />
                <span>Web Mercator (3857)</span>
              </div>
              {!is3d && projection === 'EPSG:3857' && <Check className="w-3 h-3 ml-2" />}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleSelectMode('4326')} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapIcon className="w-3 h-3" />
                <span>WGS 84 (4326)</span>
              </div>
              {!is3d && projection === 'EPSG:4326' && <Check className="w-3 h-3 ml-2" />}
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs">3D Globe Mode</DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => handleSelectMode('3d')} className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-cyan-600 font-medium">
                <Globe className="w-3 h-3" />
                <span>Cesium 3D Globe</span>
              </div>
              {is3d && <Check className="w-3 h-3 ml-2" />}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TooltipProvider>
    </div>
  );
}
