'use client';

import { useCallback } from 'react';
import { Map } from 'ol';
import { Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';

interface MapScreenshotProps {
  map: Map | null;
}

export default function MapScreenshot({ map }: MapScreenshotProps) {
  const { toast } = useToast();

  const handleScreenshot = useCallback(() => {
    if (!map) return;

    map.once('rendercomplete', () => {
      try {
        const mapCanvas = document.createElement('canvas');
        const size = map.getSize();
        if (!size) return;

        mapCanvas.width = size[0];
        mapCanvas.height = size[1];
        const mapContext = mapCanvas.getContext('2d');
        if (!mapContext) return;

        // Composite all canvas layers
        const canvases = map
          .getViewport()
          .querySelectorAll('.ol-layer canvas, canvas.ol-unselectable');
        canvases.forEach((canvas) => {
          const htmlCanvas = canvas as HTMLCanvasElement;
          if (htmlCanvas.width > 0) {
            const opacity = (htmlCanvas.parentNode as HTMLElement)?.style?.opacity || '1';
            mapContext.globalAlpha = parseFloat(opacity);

            const transform = htmlCanvas.style.transform;
            const matrix = transform
              .match(/^matrix\(([^(]*)\)$/)?.[1]
              ?.split(',')
              .map(Number);

            if (matrix) {
              mapContext.setTransform(
                matrix[0],
                matrix[1],
                matrix[2],
                matrix[3],
                matrix[4],
                matrix[5]
              );
            } else {
              mapContext.setTransform(1, 0, 0, 1, 0, 0);
            }

            mapContext.drawImage(htmlCanvas, 0, 0);
          }
        });

        mapContext.globalAlpha = 1;
        mapContext.setTransform(1, 0, 0, 1, 0, 0);

        // Add watermark
        mapContext.fillStyle = 'rgba(255, 255, 255, 0.7)';
        mapContext.fillRect(size[0] - 140, size[1] - 28, 140, 28);
        mapContext.font = '11px Inter, sans-serif';
        mapContext.fillStyle = '#333';
        mapContext.textAlign = 'right';
        mapContext.fillText('Made with Geovara', size[0] - 8, size[1] - 10);

        // Download
        const link = document.createElement('a');
        link.download = `geovara-map-${new Date().toISOString().slice(0, 10)}.png`;
        link.href = mapCanvas.toDataURL('image/png');
        link.click();
        toast({ title: 'Tangkapan layar peta berhasil disimpan!' });
      } catch (err) {
        console.error('Map screenshot error:', err);
        toast({
          title: 'Gagal mengekspor gambar peta',
          description: 'Basemap saat ini tidak mengizinkan ekspor gambar karena batasan CORS server penyedia.',
          variant: 'destructive',
        });
      }
    });

    map.renderSync();
  }, [map, toast]);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="w-8 h-8 rounded-[var(--radius)] p-0 flex items-center justify-center hover:bg-secondary"
            onClick={handleScreenshot}
            aria-label="Ambil tangkapan layar peta"
          >
            <Camera className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>Export as image</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
