'use client';
import { Toggle } from '@/components/ui/toggle';
import { Globe, Map as MapIcon } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface MapModeToggleProps {
  is3d: boolean;
  onToggle3d: () => void;
}

export default function MapModeToggle({ is3d, onToggle3d }: MapModeToggleProps) {
  return (
    <div className='bg-card/80 backdrop-filter-[4px] rounded-md p-0.5 flex flex-col gap-0.5'>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              size="sm"
              className='w-[2.25rem] h-[2.25rem]'
              aria-label="Toggle 2D Mode"
              pressed={!is3d}
              onPressedChange={is3d ? onToggle3d : undefined}
            >
              <MapIcon className="h-4 w-4" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent side='right'>
            <p>2D Mode</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              size="sm"
              className='w-[2.25rem] h-[2.25rem]'
              aria-label="Toggle 3D Mode"
              pressed={is3d}
              onPressedChange={!is3d ? onToggle3d : undefined}
            >
              <Globe className="h-4 w-4" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent side='right'>
            <p>3D Mode</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
