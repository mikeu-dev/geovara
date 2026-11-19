'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Map, Feature } from 'ol';
import { Point } from 'ol/geom';
import type { Geometry } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { Search, MapPin, Loader2, X, Plus } from 'lucide-react';
import { nominatimSearchUrl, nominatimSearchResults } from '@/lib/nominatim';
import { useToast } from '@/hooks/use-toast';

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
}

export default function LocationSearch({ map, onAddFeature }: LocationSearchProps) {
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
          duration: 1200,
          maxZoom: 18,
        });
      } else {
        map.getView().animate({
          center,
          zoom: 14,
          duration: 1200,
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

  return (
    <div
      ref={containerRef}
      className="cloud-move cloud-spring absolute top-[26px] z-40 -translate-x-1/2"
      style={{
        left: 'calc((var(--map-l, 0px) + 100vw - var(--map-r, 0px)) / 2)',
        width: 'min(380px, calc(100vw - 268px))',
      }}
    >
      <label
        className={`
        flex items-center gap-2.5 h-12 pl-4 pr-3 rounded-cloud-a bg-smoke-mid/55 text-muted-foreground
        transition-shadow duration-200
        ${isFocused ? 'ring-2 ring-primary/50' : ''}
      `}
      >
        <Search className="h-[18px] w-[18px] flex-shrink-0" strokeWidth={1.8} />
        <span className="sr-only">Cari lokasi</span>
        <input
          ref={inputRef}
          type="search"
          placeholder="Cari lokasi atau fitur…"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              handleClear();
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="flex-1 min-w-0 bg-transparent text-[15px] font-semibold text-foreground placeholder:text-muted-foreground outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        {query && !isLoading && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Hapus pencarian"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        {!query && !isLoading && (
          <kbd className="hidden sm:inline font-mono text-[11px] font-semibold px-2 py-0.5 rounded-cloud-sb bg-smoke-well/70 text-foreground">
            /
          </kbd>
        )}
      </label>

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
