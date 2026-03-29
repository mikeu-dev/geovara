'use client';

import { Check, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ProjectionSwitcherProps {
  projection: 'EPSG:4326' | 'EPSG:3857';
  onProjectionChange: (proj: 'EPSG:4326' | 'EPSG:3857') => void;
}

export default function ProjectionSwitcher({ projection, onProjectionChange }: ProjectionSwitcherProps) {
  return (
    <div className="bg-card/80 backdrop-filter-[4px] rounded-md p-0.5">
      <TooltipProvider>
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className='w-[2.25rem] h-[2.25rem] font-mono text-[10px] flex flex-col items-center justify-center leading-none'>
                  <span className="mb-0.5">CRS</span>
                  <span className="text-[9px] opacity-70">{projection.split(':')[1]}</span>
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side='right'>
              <p>Change Projection (CRS)</p>
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent side='right' align='start'>
            <DropdownMenuItem onSelect={() => onProjectionChange('EPSG:3857')} className="flex items-center justify-between">
              Web Mercator (3857)
              {projection === 'EPSG:3857' && <Check className="w-3 h-3 ml-2" />}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onProjectionChange('EPSG:4326')} className="flex items-center justify-between">
              WGS 84 (4326)
              {projection === 'EPSG:4326' && <Check className="w-3 h-3 ml-2" />}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TooltipProvider>
    </div>
  );
}
