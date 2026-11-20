'use client';

import { MOTION } from '@/lib/cloud-shape';
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
      duration: MOTION.camera,
    });
  };

  if (!map) {
    return <div className="z-10 h-10 w-10" aria-hidden="true" />;
  }

  return (
    <div className="z-10 flex flex-col gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="geovara-compass h-10 w-10 rounded-cloud-sa glass-smoke float-shadow border-0 hover:bg-smoke-mid hover:text-foreground text-foreground transition-colors duration-micro group"
              onClick={handleResetRotation}
              aria-label="Arahkan peta ke utara"
              style={{ transform: `rotate(${rotation}rad)` }}
            >
              <CompassIcon className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-2 bg-destructive rounded-[1px]" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p className="text-xs">Arahkan ke utara (putar dengan Alt+Shift+seret)</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
