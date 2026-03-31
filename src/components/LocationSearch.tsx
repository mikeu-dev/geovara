'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Map } from 'ol';
import { fromLonLat } from 'ol/proj';
import { Search, MapPin, Loader2, X } from 'lucide-react';
import { nominatimSearchUrl, nominatimSearchResults } from '@/lib/nominatim';

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
}

export default function LocationSearch({ map }: LocationSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const handleChange = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchLocation(value), 400);
  }, [searchLocation]);

  const handleSelect = useCallback((result: SearchResult) => {
    if (!map) return;
    
    const lon = parseFloat(result.lon);
    const lat = parseFloat(result.lat);
    const center = fromLonLat([lon, lat]);
    
    // If bounding box available, use fit; otherwise fly to point
    if (result.boundingbox) {
      const [south, north, west, east] = result.boundingbox.map(Number);
      const extent = [
        ...fromLonLat([west, south]),
        ...fromLonLat([east, north]),
      ];
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
  }, [map]);

  const handleClear = useCallback(() => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
  }, []);

  return (
    <div ref={containerRef} className="absolute top-3 left-[3.5rem] z-40 w-72">
      <div className={`
        flex items-center gap-2 px-3 py-2 rounded-lg
        status-bar transition-all duration-200
        ${isFocused ? 'ring-2 ring-accent/40 shadow-lg' : 'shadow-sm'}
      `}>
        <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <input
          type="text"
          placeholder="Search location..."
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { handleClear(); (e.target as HTMLInputElement).blur(); }
          }}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
        />
        {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        {query && !isLoading && (
          <button onClick={handleClear} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="mt-1.5 rounded-lg overflow-hidden status-bar shadow-xl animate-fade-in-up">
          {results.map((result) => (
            <button
              key={result.place_id}
              onClick={() => handleSelect(result)}
              className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-accent/10 transition-colors border-b border-border/30 last:border-0"
            >
              <MapPin className="h-3.5 w-3.5 text-accent mt-0.5 flex-shrink-0" />
              <span className="text-xs text-foreground leading-tight line-clamp-2">
                {result.display_name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
