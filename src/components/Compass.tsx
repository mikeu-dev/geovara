'use client';

import React, { useEffect, useState } from 'react';
import { Compass as CompassIcon } from 'lucide-react';
import { Map } from 'ol';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface CompassProps {
  map: Map | null;
}

export default function Compass({ map }: CompassProps) {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (!map) return;

    const updateRotation = () => {
      setRotation(map.getView().getRotation());
    };

    map.on('postrender', updateRotation);
    return () => map.un('postrender', updateRotation);
  }, [map]);

  const handleResetRotation = () => {
    if (!map) return;
    map.getView().animate({
      rotation: 0,
      duration: 250,
    });
  };

  if (!map) return null;

  return (
    <div className="absolute top-20 right-4 z-10 flex flex-col gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="h-10 w-10 rounded-full shadow-lg border border-border/50 bg-background/80 backdrop-blur-md hover:bg-background transition-all duration-300 group"
              onClick={handleResetRotation}
              style={{ transform: `rotate(${rotation}rad)` }}
            >
              <CompassIcon className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-2 bg-destructive rounded-full" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p className="text-xs">Reset North (Rotate with Alt+Shift+Drag)</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
