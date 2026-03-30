'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Feature } from 'ol';
import type { Geometry } from 'ol/geom';
import GeoJSON from 'ol/format/GeoJSON';
import dynamic from 'next/dynamic';
import Sidebar from '@/components/Sidebar';
import MapSkeleton from '@/components/MapSkeleton';
import { Loader2 } from 'lucide-react';
import { encodeGeoJSON, decodeGeoJSON, updateUrlHash, getEncodedFromHash } from '@/lib/url-state';
import { fetchNominatim, nominatimSearchUrl } from '@/lib/nominatim';
import { useUndoHistory } from '@/hooks/useUndoHistory';
import { GisService } from '@/lib/spatial';
import AIAssistant from '@/components/AIAssistant';
import { SpatialIntentOutput } from '@/ai/flows/spatial-intent';


export type DrawType = 'Point' | 'LineString' | 'Polygon' | 'Rectangle' | 'Circle' | 'Edit' | 'Delete' | 'MeasureDistance' | 'MeasureArea';

const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

const format = new GeoJSON({
  featureProjection: 'EPSG:3857',
  dataProjection: 'EPSG:4326',
});

const defaultGeoJsonString = JSON.stringify(
  {
    type: 'FeatureCollection',
    features: [],
  },
  null,
  2
);

export default function Home() {
  const [features, setFeatures] = useState<Feature<Geometry>[]>([]);
  const [selectedFeature, setSelectedFeature] = useState<Feature<Geometry> | null>(null);
  const [drawType, setDrawType] = useState<DrawType | null>(null);
  const [projection, setProjection] = useState<'EPSG:4326' | 'EPSG:3857'>('EPSG:3857');
  const [isClient, setIsClient] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [zoomToId, setZoomToId] = useState<string | number | null>(null);

  // Undo/Redo History for the GeoJSON string
  const { 
    state: geojsonString, 
    set: setGeojsonString, 
    undo, 
    redo, 
    canUndo, 
    canRedo,
    reset: resetHistory
  } = useUndoHistory(defaultGeoJsonString);

  // Ref to skip features→geojson sync when change came from editor/undo
  const skipFeaturesSync = useRef(false);

  // Wrap undo/redo to also update features from the restored geojsonString
  const syncFeaturesFromString = useCallback((str: string) => {
    try {
      if (!str || str === defaultGeoJsonString) {
        setFeatures([]);
        return;
      }
      const obj = JSON.parse(str);
      const parsed = format.readFeatures(obj) as Feature<Geometry>[];
      parsed.forEach((f, i) => { if (!f.getId()) f.setId(`f_sync_${Date.now()}_${i}`); });
      skipFeaturesSync.current = true;
      setFeatures(parsed);
    } catch { /* ignore */ }
  }, [format]);

  const handleUndo = useCallback(() => {
    const prev = undo();
    if (prev !== undefined) syncFeaturesFromString(prev as string);
  }, [undo, syncFeaturesFromString]);

  const handleRedo = useCallback(() => {
    const next = redo();
    if (next !== undefined) syncFeaturesFromString(next as string);
  }, [redo, syncFeaturesFromString]);

  // --- Handlers ---

  const handleZoomTo = useCallback((id: string | number) => {
    setZoomToId(id);
    setTimeout(() => setZoomToId(null), 100);
  }, []);

  const handleClear = useCallback(() => {
    setFeatures([]);
    setSelectedFeature(null);
  }, []);

  const handleDeleteFeature = useCallback((featureId: string | number | undefined) => {
    if (featureId) {
      setFeatures(prev => prev.filter(f => f.getId() !== featureId));
      if (selectedFeature && selectedFeature.getId() === featureId) {
        setSelectedFeature(null);
      }
    }
  }, [selectedFeature]);
  
  const handleFeaturePropertyChange = useCallback((featureId: string | number, key: string, value: any) => {
    setFeatures(prev => {
        const newFeatures = [...prev];
        const feature = newFeatures.find(f => f.getId() === featureId);
        if (feature) {
            if (value === null || value === undefined) {
              feature.unset(key);
            } else {
              feature.set(key, value);
            }
        }
        return newFeatures;
    });
  }, []);

  const handleFeatureSelect = useCallback((feature: Feature<Geometry> | null) => {
    setSelectedFeature(feature);
  }, []);

  const handleGeojsonChange = useCallback((value: string | undefined) => {
    const newGeojsonString = value || '';
    setGeojsonString(newGeojsonString);
    
    if (!newGeojsonString.trim() || newGeojsonString.trim() === defaultGeoJsonString) {
      skipFeaturesSync.current = true;
      setFeatures([]);
      return;
    }

    try {
      const geojson_obj = JSON.parse(newGeojsonString);
      const featuresFromGeojson = format.readFeatures(geojson_obj) as Feature<Geometry>[];
      featuresFromGeojson.forEach((f, i) => {
        if (!f.getId()) f.setId(`feature_editor_${Date.now()}_${i}`);
      });
      skipFeaturesSync.current = true;
      setFeatures(featuresFromGeojson);
    } catch (e) {
      // Invalid GeoJSON, do nothing
    }
  }, [setGeojsonString, format]);

  // --- Effects ---

  useEffect(() => {
    setIsClient(true);
    const encoded = getEncodedFromHash();
    if (encoded) {
      const decoded = decodeGeoJSON(encoded);
      if (decoded && decoded !== defaultGeoJsonString) {
        setGeojsonString(decoded);
        resetHistory(decoded);
        try {
          const geojson_obj = JSON.parse(decoded);
          const featuresFromGeojson = format.readFeatures(geojson_obj) as Feature<Geometry>[];
          featuresFromGeojson.forEach((f, i) => {
            if (!f.getId()) f.setId(`feature_url_${Date.now()}_${i}`);
          });
          setFeatures(featuresFromGeojson);
        } catch (e) {
          console.error('Invalid GeoJSON in URL hash');
        }
      }
    }
  }, [resetHistory, setGeojsonString]);

  // One-way sync: features → geojsonString (when map draws/edits features)
  const lastSyncedGeojson = useRef(defaultGeoJsonString);
  
  useEffect(() => {
    if (skipFeaturesSync.current) {
      skipFeaturesSync.current = false;
      return;
    }

    if (!features.length) {
      if (lastSyncedGeojson.current !== defaultGeoJsonString) {
        lastSyncedGeojson.current = defaultGeoJsonString;
        setGeojsonString(defaultGeoJsonString);
        updateUrlHash('');
      }
      return;
    }
    try {
      const featuresToWrite = features.map(feature => {
        const newFeature = feature.clone();
        const properties = feature.getProperties();
        delete properties.geometry; 
        newFeature.setProperties(properties);
        return newFeature;
      });

      const geojson = format.writeFeaturesObject(featuresToWrite);
      const newGeojsonString = JSON.stringify(geojson, null, 2);
      
      if (newGeojsonString !== lastSyncedGeojson.current) {
        lastSyncedGeojson.current = newGeojsonString;
        setGeojsonString(newGeojsonString);
      }
      
      if (newGeojsonString !== defaultGeoJsonString) {
        const encoded = encodeGeoJSON(newGeojsonString);
        updateUrlHash(encoded);
      } else {
        updateUrlHash('');
      }
    } catch (error) {
      console.error('Error converting features to GeoJSON:', error);
    }
  }, [features]);

  
  const handleAIAction = useCallback(async (result: SpatialIntentOutput) => {
    switch (result.action) {
      case 'flyTo':
        if (result.params?.query) {
          try {
            const res = await fetchNominatim(
              nominatimSearchUrl({
                format: 'json',
                q: result.params.query,
                limit: 1,
              })
            );
            const data = await res.json();
            if (data && data.length > 0) {
              // Custom event for MapComponent to pick up and fly to
              window.dispatchEvent(new CustomEvent('map:flyto', { 
                detail: { lon: parseFloat(data[0].lon), lat: parseFloat(data[0].lat), boundingbox: data[0].boundingbox } 
              }));
            }
          } catch (err) {
            console.error('AI FlyTo error:', err);
          }
        }
        break;
      case 'buffer':
        if (features.length > 0) {
          const radius = result.params?.radius || 1;
          const units = result.params?.units || 'kilometers';
          const newBufferedFeatures: Feature<Geometry>[] = [];
          
          features.forEach(f => {
            try {
              const geojsonFeature = format.writeFeatureObject(f) as any;
              const buffered = GisService.createBuffer(geojsonFeature, radius, units);
              const olFeature = format.readFeature(buffered) as Feature<Geometry>;
              olFeature.setId(`buffer_${Date.now()}_${Math.random()}`);
              newBufferedFeatures.push(olFeature);
            } catch (e) {
              console.warn('Skipping buffer for feature', f.getId());
            }
          });
          
          if (newBufferedFeatures.length > 0) {
            setFeatures(prev => [...prev, ...newBufferedFeatures]);
          }
        }
        break;
      case 'centroid':
        if (features.length > 0) {
          try {
            const collection = format.writeFeaturesObject(features) as any;
            const centroid = GisService.calculateCentroid(collection);
            const olFeature = format.readFeature(centroid) as Feature<Geometry>;
            olFeature.setId(`centroid_${Date.now()}`);
            setFeatures(prev => [...prev, olFeature]);
          } catch (e) {
            console.error('Centroid calculation failed');
          }
        }
        break;
      case 'simplify':
        if (features.length > 0) {
          const simplifiedFeatures = features.map(f => {
            try {
              const geojsonFeature = format.writeFeatureObject(f) as any;
              const simplified = GisService.simplifyGeometry(geojsonFeature, 0.01);
              const olFeature = format.readFeature(simplified) as Feature<Geometry>;
              olFeature.setId(f.getId()); // Keep ID to update in place or could create new
              return olFeature;
            } catch (e) {
              return f;
            }
          });
          setFeatures(simplifiedFeatures);
        }
        break;
      case 'setBasemap':
        if (result.params?.basemap) {
          window.dispatchEvent(new CustomEvent('map:setbasemap', { 
            detail: { basemap: result.params.basemap } 
          }));
        }
        break;
      case 'setProjection':
        if (result.params?.projection) {
          const proj = result.params.projection.includes('4326') ? 'EPSG:4326' : 'EPSG:3857';
          setProjection(proj as any);
        }
        break;
      case 'clear':
        handleClear();
        break;
      case 'delete':
        if (selectedFeature) {
          handleDeleteFeature(selectedFeature.getId());
        }
        break;
    }
  }, [features, selectedFeature, handleClear, handleDeleteFeature, format]);

  useEffect(() => {
    if (drawType === 'Delete' && selectedFeature) {
      handleDeleteFeature(selectedFeature.getId());
      setDrawType(null);
    }
  }, [drawType, selectedFeature, handleDeleteFeature]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input/textarea/editor
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).closest('.monaco-editor')) return;

      // Ctrl/Cmd shortcuts
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey && canUndo) { e.preventDefault(); handleUndo(); }
        if ((e.key === 'y' || (e.key === 'z' && e.shiftKey)) && canRedo) { e.preventDefault(); handleRedo(); }
        return;
      }

      // Tool shortcuts (single key, no modifier)
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case 'escape': setDrawType(null); setSelectedFeature(null); break;
          case 'v': setDrawType(null); break;          // Select
          case 'p': setDrawType('Point'); break;
          case 'l': setDrawType('LineString'); break;
          case 'g': setDrawType('Polygon'); break;
          case 'r': setDrawType('Rectangle'); break;
          case 'c': setDrawType('Circle'); break;
          case 'm': setDrawType('MeasureDistance'); break;
          case 'a': setDrawType('MeasureArea'); break;
          case 'e': setDrawType('Edit'); break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, handleUndo, handleRedo]);

  return (
    <main className="flex h-full flex-col md:flex-row bg-background text-foreground">
      <Sidebar 
        geojsonString={geojsonString}
        onGeojsonChange={handleGeojsonChange}
        featuresCount={features.length}
        features={features}
        onClear={handleClear}
        undo={handleUndo}
        redo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        onDeleteFeature={handleDeleteFeature}
        onZoomToFeature={handleZoomTo}
        onFeatureSelect={handleFeatureSelect}
        onHeavyParseChange={setIsParsing}
      />
      <div className="flex-grow h-full w-full relative">
        {isClient ? (
          <>
            {isParsing && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center pointer-events-none">
                <div className="flex flex-col items-center gap-2 bg-card p-4 rounded-lg shadow-lg border">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm font-medium">Processing Large Dataset...</p>
                </div>
              </div>
            )}
            <MapComponent 
              features={features} 
              setFeatures={setFeatures} 
              drawType={drawType}
              setDrawType={setDrawType}
              selectedFeature={selectedFeature}
              onFeatureSelect={handleFeatureSelect}
              onDeleteFeature={handleDeleteFeature}
              onFeaturePropertyChange={handleFeaturePropertyChange}
              projection={projection}
              onProjectionChange={setProjection}
              zoomToId={zoomToId}
            />
          </>
        ) : <MapSkeleton />}
      </div>
      <AIAssistant 
        onAction={handleAIAction} 
        featureContext={`${features.length} features on map (${features.map(f => f.getGeometry()?.getType()).join(', ')})`} 
      />
    </main>
  );
}
