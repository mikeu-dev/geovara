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
import { useUndoHistory } from '@/hooks/useUndoHistory';
import { GisService } from '@/lib/spatial';
import { Feature as GeoJSONFeature } from 'geojson';
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
  const [vectorOpacity, setVectorOpacity] = useState(1);
  const [vectorVisible, setVectorVisible] = useState(true);
  const [basemapOpacity, setBasemapOpacity] = useState(1);
  const [isClient, setIsClient] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [zoomToId, setZoomToId] = useState<string | number | null>(null);
  const [is3d, setIs3d] = useState(false);

  const { 
    state: geojsonString, 
    set: setGeojsonString, 
    undo, 
    redo, 
    canUndo, 
    canRedo,
    reset: resetHistory
  } = useUndoHistory(defaultGeoJsonString);

  const skipFeaturesSync = useRef(false);

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
  }, []);

  const handleUndo = useCallback(() => {
    const prev = undo();
    if (prev !== undefined) syncFeaturesFromString(prev as string);
  }, [undo, syncFeaturesFromString]);

  const handleRedo = useCallback(() => {
    const next = redo();
    if (next !== undefined) syncFeaturesFromString(next as string);
  }, [redo, syncFeaturesFromString]);

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
  
  const handleFeaturePropertyChange = useCallback((featureId: string | number, key: string, value: unknown) => {
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
    } catch { /* ignore */ }
  }, [setGeojsonString]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsClient(true);
      const hash = getEncodedFromHash();
      if (hash) {
        setIsParsing(true);
        const decoded = decodeGeoJSON(hash);
        if (decoded) {
          setGeojsonString(decoded);
          syncFeaturesFromString(decoded);
          resetHistory(decoded);
        }
        setIsParsing(false);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [setGeojsonString, syncFeaturesFromString, resetHistory]);

  useEffect(() => {
    if (skipFeaturesSync.current) {
      skipFeaturesSync.current = false;
      return;
    }

    try {
      const fc = format.writeFeaturesObject(features);
      const str = JSON.stringify(fc, null, 2);
      if (str !== geojsonString) {
        setGeojsonString(str);
        if (isClient) {
          const encoded = encodeGeoJSON(str);
          updateUrlHash(encoded);
        }
      }
    } catch { /* ignore */ }
  }, [features, geojsonString, setGeojsonString, isClient]);

  const handleAIAction = useCallback((action: SpatialIntentOutput) => {
    if (action.action === 'flyTo') {
      window.dispatchEvent(new CustomEvent('map:flyto', { detail: action.params }));
    } else if (action.action === 'setBasemap') {
      window.dispatchEvent(new CustomEvent('map:setbasemap', { detail: { basemap: action.params?.basemap } }));
    } else if (action.action === 'buffer') {
       if (selectedFeature) {
         const radius = (action.params as { radius?: number })?.radius || 1;
         const gj = format.writeFeatureObject(selectedFeature);
         const buffered = GisService.createBuffer(gj as GeoJSONFeature, radius);
         const bufferedFeature = format.readFeature(buffered);
         bufferedFeature.setId(`buffer_${Date.now()}`);
         setFeatures(prev => [...prev, bufferedFeature as Feature<Geometry>]);
       }
    }
  }, [selectedFeature]);

  const handleToggle3d = useCallback(() => {
    setIs3d(prev => !prev);
  }, []);

  if (!isClient) return null;

  return (
    <main className="flex h-screen w-screen overflow-hidden bg-background text-foreground selection:bg-accent/20">
      <Sidebar 
        geojsonString={geojsonString}
        onGeojsonChange={handleGeojsonChange}
        featuresCount={features.length}
        onClear={handleClear}
        undo={handleUndo}
        redo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        features={features}
        onDeleteFeature={handleDeleteFeature}
        onZoomToFeature={handleZoomTo}
        onFeatureSelect={handleFeatureSelect}
        onHeavyParseChange={setIsParsing}
        vectorOpacity={vectorOpacity}
        onVectorOpacityChange={setVectorOpacity}
        vectorVisible={vectorVisible}
        onVectorVisibleChange={setVectorVisible}
        basemapOpacity={basemapOpacity}
        onBasemapOpacityChange={setBasemapOpacity}
      />
      
      <div className="flex-grow relative h-full">
        {isParsing && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm animate-in fade-in duration-500">
            <div className="relative">
              <div className="absolute inset-0 bg-accent/20 blur-3xl animate-pulse rounded-full" />
              <Loader2 className="h-12 w-12 animate-spin text-accent relative z-10" />
            </div>
            <p className="mt-4 text-sm font-semibold tracking-widest uppercase text-muted-foreground animate-pulse">Processing Geospatial Data</p>
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
          vectorOpacity={vectorOpacity}
          vectorVisible={vectorVisible}
          basemapOpacity={basemapOpacity}
          is3d={is3d}
          onToggle3d={handleToggle3d}
        />
      </div>

      <AIAssistant 
        onAction={handleAIAction} 
        featureContext={selectedFeature ? JSON.stringify(format.writeFeatureObject(selectedFeature)) : undefined}
      />
    </main>
  );
}
