'use client';

import { useState, useCallback, DragEvent } from 'react';
import { Upload, FileUp, X } from 'lucide-react';

interface FileDropZoneProps {
  onFileLoad: (content: string, filename: string) => void | Promise<void>;
}

export default function FileDropZone({ onFileLoad }: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

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

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const validExtensions = ['.geojson', '.json', '.kml', '.topojson'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!validExtensions.includes(ext)) {
      return; // silently ignore invalid files
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        void Promise.resolve(onFileLoad(content, file.name));
      }
    };
    reader.readAsText(file);
  }, [onFileLoad]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        void Promise.resolve(onFileLoad(content, file.name));
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // reset so same file can be re-imported
  }, [onFileLoad]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer
        transition-all duration-200 ease-out
        ${isDragging 
          ? 'border-accent bg-accent/10 scale-[1.02]' 
          : 'border-border hover:border-muted-foreground/40 hover:bg-muted/50'
        }
      `}
    >
      <input
        type="file"
        accept=".geojson,.json,.kml,.topojson"
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        aria-label="Import file"
      />
      <div className="flex flex-col items-center gap-1.5 pointer-events-none">
        <FileUp className={`h-5 w-5 transition-colors ${isDragging ? 'text-accent' : 'text-muted-foreground'}`} />
        <p className="text-xs text-muted-foreground">
          {isDragging ? 'Drop file here' : 'Drop or click to import'}
        </p>
        <p className="text-[10px] text-muted-foreground/60">
          GeoJSON, KML, TopoJSON
        </p>
      </div>
    </div>
  );
}
