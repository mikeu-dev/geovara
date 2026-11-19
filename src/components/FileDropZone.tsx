'use client';

import { useState, useCallback, DragEvent } from 'react';
import { FileUp } from 'lucide-react';
import { csvToGeoJson } from '@/lib/csv-geojson';
import { wktToGeoJson } from '@/lib/wkt-geojson';
import { parseZippedShapefile, parseShpBuffer } from '@/lib/shapefile-parser';

interface FileDropZoneProps {
  onFileLoad: (content: string, filename: string) => void | Promise<void>;
}

export default function FileDropZone({ onFileLoad }: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const processFile = useCallback(
    async (file: File) => {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();

      try {
        if (ext === '.zip') {
          const buffer = await file.arrayBuffer();
          const parsed = await parseZippedShapefile(buffer);
          void Promise.resolve(onFileLoad(JSON.stringify(parsed.geojson, null, 2), file.name));
          return;
        }

        if (ext === '.shp') {
          const buffer = await file.arrayBuffer();
          const parsed = parseShpBuffer(buffer);
          const fc = {
            type: 'FeatureCollection',
            features: parsed.geometries.map((g, idx) => ({
              type: 'Feature',
              id: `shp_${idx + 1}`,
              geometry: g,
              properties: {},
            })),
          };
          void Promise.resolve(onFileLoad(JSON.stringify(fc, null, 2), file.name));
          return;
        }

        const content = await file.text();

        if (ext === '.csv') {
          const geojson = csvToGeoJson(content);
          void Promise.resolve(onFileLoad(JSON.stringify(geojson, null, 2), file.name));
          return;
        }

        if (ext === '.wkt') {
          const geojson = wktToGeoJson(content);
          void Promise.resolve(onFileLoad(JSON.stringify(geojson, null, 2), file.name));
          return;
        }

        if (ext === '.json' || ext === '.geojson') {
          try {
            const parsed = JSON.parse(content);
            void Promise.resolve(onFileLoad(JSON.stringify(parsed, null, 2), file.name));
            return;
          } catch {
            // fallback to raw content if JSON parse fails
          }
        }

        // Standard GeoJSON, KML, TopoJSON
        void Promise.resolve(onFileLoad(content, file.name));
      } catch (err) {
        console.error('File parsing error in FileDropZone:', err);
        const fallbackText = await file.text().catch(() => '');
        void Promise.resolve(onFileLoad(fallbackText, file.name));
      }
    },
    [onFileLoad]
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;

      const file = files[0];
      const validExtensions = ['.geojson', '.json', '.kml', '.topojson', '.csv', '.wkt', '.zip', '.shp'];
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();

      if (!validExtensions.includes(ext)) {
        return;
      }

      void processFile(file);
    },
    [processFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      void processFile(file);
      e.target.value = ''; // reset so same file can be re-imported
    },
    [processFile]
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative flex items-center gap-3 p-3.5 text-left cursor-pointer rounded-cloud-b
        border-[1.5px] border-dashed transition-all duration-200 ease-out
        ${
          isDragging
            ? 'border-primary bg-primary/10 scale-[1.02]'
            : 'border-foreground/20 bg-smoke-well/50 hover:bg-smoke-well/80 hover:border-foreground/35'
        }
      `}
    >
      <input
        type="file"
        accept=".geojson,.json,.kml,.topojson,.csv,.wkt,.zip,.shp"
        onChange={handleFileInput}
        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        aria-label="Impor data geografis"
      />
      <FileUp className="w-[22px] h-[22px] flex-shrink-0 text-muted-foreground pointer-events-none" strokeWidth={1.8} />
      <div className="flex flex-col gap-0.5 pointer-events-none min-w-0">
        <div className="text-sm font-extrabold text-foreground">Impor data</div>
        <div className="font-mono text-[11px] font-medium text-muted-foreground truncate">
          GeoJSON · SHP · KML · CSV · WKT · TopoJSON
        </div>
      </div>
    </div>
  );
}
