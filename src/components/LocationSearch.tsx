'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Map, Feature } from 'ol';
import { Point } from 'ol/geom';
import type { Geometry } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { Search, MapPin, Loader2, X, Plus } from 'lucide-react';
import { nominatimSearchUrl, nominatimSearchResults } from '@/lib/nominatim';
import { useToast } from '@/hooks/use-toast';
import { CLOUD_MOBILE, MOTION } from '@/lib/cloud-shape';

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  boundingbox: string[];
}

interface LocationSearchProps {
  map: Map | null;
  onAddFeature?: (feature: Feature<Geometry>) => void;
  /** Mobile: an icon in the header that expands into the field. */
  compact?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function LocationSearch({
  map,
  onAddFeature,
  compact = false,
  open: fieldOpen = true,
  onOpenChange,
}: LocationSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // "/" focuses the search box (unless the user is already typing somewhere)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))) return;
      if (t?.closest('.monaco-editor')) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const { toast } = useToast();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchLocation = useCallback(async (q: string) => {
    if (q.length < 3) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const url = nominatimSearchUrl({
        format: 'json',
        q,
        limit: 5,
        addressdetails: 0,
      });
      const data = (await nominatimSearchResults(url)) as SearchResult[];
      setResults(data);
      setIsOpen(data.length > 0);
    } catch (err) {
      console.error('Geocoding error:', err);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => searchLocation(value), 400);
    },
    [searchLocation]
  );

  const handleSelect = useCallback(
    (result: SearchResult) => {
      if (!map) return;

      const lon = parseFloat(result.lon);
      const lat = parseFloat(result.lat);
      const center = fromLonLat([lon, lat]);

      // If bounding box available, use fit; otherwise fly to point
      if (result.boundingbox) {
        const [south, north, west, east] = result.boundingbox.map(Number);
        const extent = [...fromLonLat([west, south]), ...fromLonLat([east, north])];
        map.getView().fit(extent as [number, number, number, number], {
          padding: [50, 50, 50, 50],
          duration: MOTION.camera,
          maxZoom: 18,
        });
      } else {
        map.getView().animate({
          center,
          zoom: 14,
          duration: MOTION.camera,
        });
      }

      setQuery(result.display_name.split(',')[0]);
      setIsOpen(false);
    },
    [map]
  );

  const handleAddAsPoint = useCallback(
    (e: React.MouseEvent, result: SearchResult) => {
      e.stopPropagation();
      handleSelect(result);

      if (onAddFeature) {
        const lon = parseFloat(result.lon);
        const lat = parseFloat(result.lat);
        const pointGeom = new Point(fromLonLat([lon, lat]));
        const shortName = result.display_name.split(',')[0];

        const feature = new Feature({
          geometry: pointGeom,
          name: shortName,
          display_name: result.display_name,
          place_id: result.place_id,
          osm_type: result.type || 'place',
          source: 'nominatim',
        });
        feature.setId(`point_search_${Date.now()}`);

        onAddFeature(feature);
        toast({
          title: 'Titik Lokasi Ditambahkan',
          description: `'${shortName}' disematkan sebagai Point feature baru di peta.`,
        });
      }
    },
    [handleSelect, onAddFeature, toast]
  );

  const handleClear = useCallback(() => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
  }, []);

  const expanded = !compact || fieldOpen;
  const M = CLOUD_MOBILE;
  const box: React.CSSProperties = compact
    ? {
        top: M.margin + 7,
        right: M.margin + M.tabW + M.gap + 8,
        width: fieldOpen ? 'calc(100vw - 144px)' : 44,
      }
    : {
        top: 26,
        left: 'calc((var(--map-l, 0px) + 100vw - var(--map-r, 0px)) / 2)',
        width: 'min(380px, calc(100vw - 268px))',
      };

  return (
    <div
      ref={containerRef}
      className={`cloud-move cloud-spring absolute z-40 ${compact ? '' : '-translate-x-1/2'}`}
      style={box}
    >
      <label
        className={`
        relative flex items-center gap-2.5 ${compact ? 'h-11 pl-3.5 pr-11' : 'h-12 pl-4 pr-2'} rounded-cloud-a text-muted-foreground
        transition-[background-color,box-shadow] duration-micro overflow-hidden
        ${expanded ? (compact ? 'bg-smoke-well/90' : 'bg-smoke-mid/55') : 'bg-transparent'}
        ${isFocused ? 'ring-2 ring-primary/50' : ''}
      `}
      >
        {!compact && <Search className="h-[18px] w-[18px] flex-shrink-0" strokeWidth={1.8} />}
        <span className="sr-only">Cari lokasi</span>
        <input
          ref={inputRef}
          type="search"
          placeholder={compact ? 'Cari lokasi…' : 'Cari lokasi atau fitur…'}
          value={query}
          tabIndex={expanded ? 0 : -1}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              handleClear();
              (e.target as HTMLInputElement).blur();
              if (compact) onOpenChange?.(false);
            }
          }}
          className={`cloud-fade flex-1 min-w-0 bg-transparent text-[15px] font-semibold text-foreground placeholder:text-muted-foreground outline-none [&::-webkit-search-cancel-button]:hidden ${
            expanded ? 'opacity-100' : 'opacity-0'
          }`}
        />
        {isLoading && <Loader2 className="h-3.5 w-3.5 flex-shrink-0 animate-spin text-muted-foreground" />}
        {query && !isLoading && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Hapus pencarian"
            className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-cloud-sb text-muted-foreground hover:text-foreground hover:bg-smoke-well/70 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {!compact && !query && !isLoading && (
          <kbd className="hidden sm:inline mr-1 font-mono text-[11px] font-semibold px-2 py-0.5 rounded-cloud-sb bg-smoke-well/70 text-foreground">
            /
          </kbd>
        )}
      </label>
      {compact && (
        <button
          type="button"
          onClick={() => {
            const next = !fieldOpen;
            onOpenChange?.(next);
            if (next) setTimeout(() => inputRef.current?.focus(), 50);
            else handleClear();
          }}
          aria-label={fieldOpen ? 'Tutup pencarian' : 'Cari lokasi'}
          aria-expanded={fieldOpen}
          className="absolute right-0 top-0 w-11 h-11 flex items-center justify-center text-foreground"
        >
          {fieldOpen ? <X className="h-[18px] w-[18px]" strokeWidth={1.8} /> : <Search className="h-[18px] w-[18px]" strokeWidth={1.8} />}
        </button>
      )}

      {isOpen && results.length > 0 && (
        <div className="mt-2 rounded-cloud-b overflow-hidden glass-smoke float-shadow animate-fade-in-up">
          {results.map((result) => (
            <div
              key={result.place_id}
              onClick={() => handleSelect(result)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-accent/10 transition-colors border-b border-border/30 last:border-0 cursor-pointer group"
            >
              <div className="flex items-start gap-2 min-w-0 flex-1">
                <MapPin className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-xs text-foreground leading-tight line-clamp-2">
                  {result.display_name}
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => handleAddAsPoint(e, result)}
                className="px-2 py-1 rounded-[var(--radius)] bg-primary/15 hover:bg-primary text-primary hover:text-primary-foreground text-[10px] font-semibold flex items-center gap-1 transition-colors flex-shrink-0"
                title="Sematkan sebagai Point Feature di peta"
              >
                <Plus className="h-3 w-3" />
                <span>Add</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
