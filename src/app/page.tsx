'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Feature } from 'ol';
import type { Geometry } from 'ol/geom';
import GeoJSON from 'ol/format/GeoJSON';
import dynamic from 'next/dynamic';
import Sidebar from '@/components/Sidebar';
import MapSkeleton from '@/components/MapSkeleton';
import { Loader2 } from 'lucide-react';
import { encodeGeoJSON, decodeGeoJSON, updateUrlHash, getEncodedFromHash } from '@/lib/url-state';
import { validateGeoJSON } from '@/lib/schema';
import { useToast } from '@/hooks/use-toast';
import { useUndoHistory } from '@/hooks/useUndoHistory';


export type DrawType = 'Point' | 'LineString' | 'Polygon' | 'Rectangle' | 'Circle' | 'Edit' | 'Delete';

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
  const { toast } = useToast();
  
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

  // --- Handlers (Moved up to fix hoisting) ---

  const handleZoomTo = useCallback((id: string | number) => {
    setZoomToId(id);
    // Reset after a short delay so it can be triggered again for the same ID
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
      setFeatures([]);
      return;
    }

    // Use Web Worker for parsing large datasets
    if (newGeojsonString.length > 5000) {
      setIsParsing(true);
      const worker = new Worker(new URL('../workers/geojson.worker.ts', import.meta.url));
      worker.postMessage(newGeojsonString);
      worker.onmessage = (e) => {
        setIsParsing(false);
        if (e.data.success) {
          // Validate using Zod
          const validation = validateGeoJSON(e.data.data);
          if (!validation.success) {
            toast({
              variant: 'destructive',
              title: 'Invalid GeoJSON',
              description: 'The data structure does not match the GeoJSON specification.'
            });
            return;
          }

          try {
            const featuresFromGeojson = format.readFeatures(validation.data) as Feature<Geometry>[];
            featuresFromGeojson.forEach((f, i) => {
              if (!f.getId()) f.setId(`feature_worker_${Date.now()}_${i}`);
            });
            setFeatures(featuresFromGeojson);
          } catch (err) {
            console.error('Error reading features from worker data');
          }
        }
        worker.terminate();
      };
      worker.onerror = () => {
        setIsParsing(false);
        worker.terminate();
      };
    } else {
      // Small datasets, parse synchronously for speed
      try {
        const geojson_obj = JSON.parse(newGeojsonString);
        const featuresFromGeojson = format.readFeatures(geojson_obj) as Feature<Geometry>[];

        featuresFromGeojson.forEach((f, i) => {
          if (!f.getId()) f.setId(`feature_${Date.now()}_${i}`);
        });
        
        setFeatures(featuresFromGeojson);
      } catch (e) {
        // Invalid GeoJSON, do nothing
      }
    }
  }, [setGeojsonString, toast]);

  // --- Effects ---

  useEffect(() => {
    setIsClient(true);
    // Initial load from URL
    const encoded = getEncodedFromHash();
    if (encoded) {
      const decoded = decodeGeoJSON(encoded);
      if (decoded && decoded !== defaultGeoJsonString) {
        setGeojsonString(decoded);
        resetHistory(decoded); // Reset history with the decoded value
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

  useEffect(() => {
    if (!features.length) {
      if (geojsonString !== defaultGeoJsonString) {
        setGeojsonString(defaultGeoJsonString);
      }
      return;
    };
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
      
      if (newGeojsonString !== geojsonString) {
         setGeojsonString(newGeojsonString);
      }
      
      // Update URL hash
      if (newGeojsonString !== defaultGeoJsonString) {
        const encoded = encodeGeoJSON(newGeojsonString);
        updateUrlHash(encoded);
      } else {
        updateUrlHash('');
      }
    } catch (error) {
      console.error('Error converting features to GeoJSON:', error);
    }
  }, [features, geojsonString, setGeojsonString]);
  
  useEffect(() => {
    if (drawType === 'Delete' && selectedFeature) {
      handleDeleteFeature(selectedFeature.getId());
      setDrawType(null);
    }
  }, [drawType, selectedFeature, handleDeleteFeature]);

  return (
    <main className="flex h-full flex-col md:flex-row bg-background text-foreground">
      <Sidebar 
        geojsonString={geojsonString}
        onGeojsonChange={handleGeojsonChange}
        featuresCount={features.length}
        features={features}
        onClear={handleClear}
        undo={undo}
        redo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        projection={projection}
        onProjectionChange={setProjection}
        onDeleteFeature={handleDeleteFeature}
        onZoomToFeature={handleZoomTo}
        onFeatureSelect={handleFeatureSelect}
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
              zoomToId={zoomToId}
            />
          </>
        ) : <MapSkeleton />}
      </div>
    </main>
  );
}
