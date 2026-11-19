'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Feature } from 'ol';
import type { Geometry } from 'ol/geom';
import GeoJSON from 'ol/format/GeoJSON';
import dynamic from 'next/dynamic';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import RightSidebar from '@/components/RightSidebar';
import MapSkeleton from '@/components/MapSkeleton';
import { Loader2 } from 'lucide-react';
import {
  encodeGeoJSON,
  decodeGeoJSON,
  updateUrlHash,
  getEncodedFromHash,
  getRemoteUrlFromParams,
  fetchRemoteGeoJSON,
} from '@/lib/url-state';
import { registerGeovaraDevApi, unregisterGeovaraDevApi, defaultDevSpatial } from '@/lib/dev-api';
import { useToast } from '@/hooks/use-toast';
import { useUndoHistory } from '@/hooks/useUndoHistory';
import { GisService } from '@/lib/spatial';
import { Feature as GeoJSONFeature } from 'geojson';
import AIAssistant from '@/components/AIAssistant';
import CloudShell from '@/components/CloudShell';
import { CLOUD, footWidth } from '@/lib/cloud-shape';
import { SpatialIntentOutput } from '@/ai/flows/spatial-intent';

export type DrawType =
  | 'Point'
  | 'LineString'
  | 'Polygon'
  | 'Rectangle'
  | 'Circle'
  | 'Edit'
  | 'Delete'
  | 'MeasureDistance'
  | 'MeasureArea'
  | 'Slice';

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
  const [showGraticule, setShowGraticule] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  // Both cloud pieces start expanded on wide screens and as rails on narrow ones
  const [leftOpen, setLeftOpen] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 1100
  );
  const [rightOpen, setRightOpen] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 1100
  );
  const { toast } = useToast();

  useEffect(() => {
    const savedTheme = (localStorage.getItem('theme') as 'light' | 'dark' | null) || 'light';
    setTheme(savedTheme);
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const handleToggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', next);
      if (next === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  }, []);

  const {
    state: geojsonString,
    set: setGeojsonString,
    undo,
    redo,
    canUndo,
    canRedo,
    reset: resetHistory,
  } = useUndoHistory(defaultGeoJsonString);

  const skipFeaturesSync = useRef(false);
  const isEditingInMonaco = useRef(false);

  const syncFeaturesFromString = useCallback((str: string, shouldFitBounds = false) => {
    try {
      if (!str || str === defaultGeoJsonString) {
        setFeatures([]);
        return;
      }
      const obj = JSON.parse(str);
      const parsed = format.readFeatures(obj) as Feature<Geometry>[];
      parsed.forEach((f, i) => {
        if (!f.getId()) f.setId(`f_sync_${Date.now()}_${i}`);
      });
      skipFeaturesSync.current = true;
      setFeatures(parsed);
      if (shouldFitBounds && parsed.length > 0) {
        window.dispatchEvent(new CustomEvent('map:fitbounds', { detail: { features: parsed } }));
      }
    } catch {
      /* ignore */
    }
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
    skipFeaturesSync.current = false;
    isEditingInMonaco.current = false;
    setFeatures([]);
    const emptyFc = JSON.stringify({ type: 'FeatureCollection', features: [] }, null, 2);
    setGeojsonString(emptyFc);
    if (isClient) {
      updateUrlHash(encodeGeoJSON(emptyFc));
    }
    setSelectedFeature(null);
  }, [isClient, setGeojsonString]);

  const handleDeleteFeature = useCallback(
    (featureId: string | number | undefined) => {
      if (featureId !== undefined) {
        skipFeaturesSync.current = false;
        isEditingInMonaco.current = false;
        setFeatures((prev) => {
          const updated = prev.filter((f) => f.getId() !== featureId);
          try {
            const fc = format.writeFeaturesObject(updated);
            const str = JSON.stringify(fc, null, 2);
            setGeojsonString(str);
            if (isClient) {
              updateUrlHash(encodeGeoJSON(str));
            }
          } catch {
            /* ignore */
          }
          return updated;
        });
        if (selectedFeature && selectedFeature.getId() === featureId) {
          setSelectedFeature(null);
        }
      }
    },
    [selectedFeature, isClient, setGeojsonString]
  );

  const handleFeaturePropertyChange = useCallback(
    (featureId: string | number, key: string, value: unknown) => {
      setFeatures((prev) => {
        const newFeatures = [...prev];
        const feature = newFeatures.find((f) => f.getId() === featureId);
        if (feature) {
          if (value === null || value === undefined || value === '') {
            feature.unset(key);
          } else {
            feature.set(key, value);
          }
          feature.changed();
        }
        return newFeatures;
      });
      setSelectedFeature((prev) => {
        if (prev && prev.getId() === featureId) {
          if (value === null || value === undefined || value === '') {
            prev.unset(key);
          } else {
            prev.set(key, value);
          }
          prev.changed();
          return prev;
        }
        return prev;
      });
    },
    []
  );

  const handleFeatureSelect = useCallback((feature: Feature<Geometry> | null) => {
    setSelectedFeature(feature);
  }, []);

  const handleGeojsonChange = useCallback(
    (value: string | undefined) => {
      const newGeojsonString = value ?? '';
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
      } catch {
        // When user is typing manual GeoJSON (in-progress/invalid syntax), keep editor string as-is
      }
    },
    [setGeojsonString]
  );

  useEffect(() => {
    const timer = setTimeout(async () => {
      setIsClient(true);

      // 1. Check for Remote GeoJSON URL (?url=... or #data=data:text/x-url,...)
      const remoteUrl = getRemoteUrlFromParams();
      if (remoteUrl) {
        setIsParsing(true);
        try {
          toast({
            title: 'Memuat Dataset Eksternal',
            description: `Mengambil data dari URL...`,
          });
          const fetchedData = await fetchRemoteGeoJSON(remoteUrl);
          setGeojsonString(fetchedData);
          syncFeaturesFromString(fetchedData, true);
          resetHistory(fetchedData);
          toast({
            title: 'GeoJSON Eksternal Berhasil Dimuat',
            description: 'Dataset berhasil divisualisasikan pada peta.',
          });
        } catch (err) {
          console.error('Failed to load remote GeoJSON URL:', err);
          toast({
            title: 'Gagal Memuat URL Eksternal',
            description: 'Pastikan URL publik, valid, dan mendukung header CORS.',
            variant: 'destructive',
          });
        } finally {
          setIsParsing(false);
        }
        return;
      }

      // 2. Otherwise load compressed hash
      const hash = getEncodedFromHash();
      if (hash) {
        setIsParsing(true);
        const decoded = decodeGeoJSON(hash);
        if (decoded) {
          setGeojsonString(decoded);
          const hasExplicitMapHash = window.location.hash
            .substring(1)
            .split('&')
            .some((p) => p.startsWith('map='));
          syncFeaturesFromString(decoded, !hasExplicitMapHash);
          resetHistory(decoded);
        }
        setIsParsing(false);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [setGeojsonString, syncFeaturesFromString, resetHistory, toast]);

  // Register window.geovara developer console API
  useEffect(() => {
    registerGeovaraDevApi({
      version: '1.0.0',
      getGeoJSON: () => geojsonString,
      setGeoJSON: (data: string | object) => {
        const str = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
        setGeojsonString(str);
        syncFeaturesFromString(str, true);
      },
      getFeatures: () => features,
      getFeaturesCount: () => features.length,
      addFeature: (geomOrGeojson: object, props?: Record<string, unknown>) => {
        try {
          let feature: Feature<Geometry>;
          if ('type' in geomOrGeojson && (geomOrGeojson as { type: string }).type === 'Feature') {
            feature = format.readFeature(geomOrGeojson) as Feature<Geometry>;
          } else {
            feature = format.readFeature({
              type: 'Feature',
              properties: props || {},
              geometry: geomOrGeojson,
            }) as Feature<Geometry>;
          }
          if (!feature.getId()) feature.setId(`dev_f_${Date.now()}`);
          setFeatures((prev) => [...prev, feature]);
        } catch (err) {
          console.error('Geovara Dev API addFeature error:', err);
        }
      },
      clear: () => handleClear(),
      fitBounds: () => {
        window.dispatchEvent(new CustomEvent('map:fitbounds'));
      },
      zoomToExtent: () => {
        window.dispatchEvent(new CustomEvent('map:fitbounds'));
      },
      setBasemap: (basemapId: string) => {
        window.dispatchEvent(
          new CustomEvent('map:setbasemap', { detail: { basemap: basemapId } })
        );
      },
      setProjection: (proj: 'EPSG:4326' | 'EPSG:3857') => {
        setProjection(proj);
      },
      spatial: defaultDevSpatial,
    });

    return () => unregisterGeovaraDevApi();
  }, [geojsonString, features, setGeojsonString, syncFeaturesFromString, handleClear]);

  useEffect(() => {
    if (skipFeaturesSync.current) {
      skipFeaturesSync.current = false;
      return;
    }
    if (isEditingInMonaco.current) {
      isEditingInMonaco.current = false;
      return;
    }

    try {
      const fc = format.writeFeaturesObject(features);
      const str = JSON.stringify(fc, null, 2);
      setGeojsonString(str);
      if (isClient) {
        const encoded = encodeGeoJSON(str);
        updateUrlHash(encoded);
      }
    } catch {
      /* ignore */
    }
  }, [features, setGeojsonString, isClient]);

  const handleAIAction = useCallback(
    (action: SpatialIntentOutput) => {
      if (action.action === 'flyTo') {
        window.dispatchEvent(new CustomEvent('map:flyto', { detail: action.params }));
      } else if (action.action === 'fitBounds') {
        window.dispatchEvent(new CustomEvent('map:fitbounds'));
      } else if (action.action === 'setBasemap') {
        window.dispatchEvent(
          new CustomEvent('map:setbasemap', { detail: { basemap: action.params?.basemap } })
        );
      } else if (action.action === 'setProjection') {
        const proj = action.params?.projection;
        if (proj === 'EPSG:4326' || proj === 'EPSG:3857') {
          setProjection(proj);
        }
      } else if (action.action === 'clear') {
        handleClear();
      } else if (action.action === 'delete') {
        if (selectedFeature) {
          handleDeleteFeature(selectedFeature.getId());
        }
      } else if (action.action === 'buffer') {
        const targetFeat = selectedFeature || (features.length > 0 ? features[features.length - 1] : null);
        if (targetFeat) {
          const radius = (action.params as { radius?: number })?.radius || 1;
          const gj = format.writeFeatureObject(targetFeat);
          const buffered = GisService.createBuffer(gj as GeoJSONFeature, radius);
          const bufferedFeature = format.readFeature(buffered);
          bufferedFeature.setId(`buffer_${Date.now()}`);
          setFeatures((prev) => [...prev, bufferedFeature as Feature<Geometry>]);
          window.dispatchEvent(new CustomEvent('map:fitbounds'));
        }
      } else if (action.action === 'centroid') {
        if (selectedFeature) {
          const gj = format.writeFeatureObject(selectedFeature);
          const centroidGj = GisService.calculateCentroid(gj as GeoJSONFeature);
          const centroidFeature = format.readFeature(centroidGj);
          centroidFeature.setId(`centroid_${Date.now()}`);
          setFeatures((prev) => [...prev, centroidFeature as Feature<Geometry>]);
          window.dispatchEvent(new CustomEvent('map:fitbounds'));
        } else if (features.length > 0) {
          const fc = format.writeFeaturesObject(features);
          const centroidGj = GisService.calculateCentroid(fc);
          const centroidFeature = format.readFeature(centroidGj);
          centroidFeature.setId(`centroid_fc_${Date.now()}`);
          setFeatures((prev) => [...prev, centroidFeature as Feature<Geometry>]);
          window.dispatchEvent(new CustomEvent('map:fitbounds'));
        }
      } else if (action.action === 'convexHull') {
        if (features.length > 0) {
          const gjFeatures = features.map((f) => format.writeFeatureObject(f) as GeoJSONFeature);
          const hullGj = GisService.calculateConvexHull(gjFeatures);
          if (hullGj) {
            const hullFeature = format.readFeature(hullGj);
            hullFeature.setId(`convex_hull_${Date.now()}`);
            setFeatures((prev) => [...prev, hullFeature as Feature<Geometry>]);
            window.dispatchEvent(new CustomEvent('map:fitbounds'));
          }
        }
      } else if (action.action === 'bbox') {
        const targetFeat = selectedFeature || (features.length > 0 ? features[features.length - 1] : null);
        if (targetFeat) {
          const gj = format.writeFeatureObject(targetFeat);
          const bboxGj = GisService.calculateBBoxPolygon(gj as GeoJSONFeature);
          const bboxFeature = format.readFeature(bboxGj);
          bboxFeature.setId(`bbox_${Date.now()}`);
          setFeatures((prev) => [...prev, bboxFeature as Feature<Geometry>]);
          window.dispatchEvent(new CustomEvent('map:fitbounds'));
        } else if (features.length > 0) {
          const fc = format.writeFeaturesObject(features);
          const bboxGj = GisService.calculateBBoxPolygon(fc);
          const bboxFeature = format.readFeature(bboxGj);
          bboxFeature.setId(`bbox_fc_${Date.now()}`);
          setFeatures((prev) => [...prev, bboxFeature as Feature<Geometry>]);
          window.dispatchEvent(new CustomEvent('map:fitbounds'));
        }
      } else if (action.action === 'simplify') {
        if (selectedFeature) {
          const gj = format.writeFeatureObject(selectedFeature);
          const simplifiedGj = GisService.simplifyGeometry(gj as GeoJSONFeature);
          const simplifiedFeature = format.readFeature(simplifiedGj) as Feature<Geometry>;
          simplifiedFeature.setId(selectedFeature.getId());
          setFeatures((prev) =>
            prev.map((f) => (f.getId() === selectedFeature.getId() ? simplifiedFeature : f))
          );
          setSelectedFeature(simplifiedFeature);
          window.dispatchEvent(new CustomEvent('map:fitbounds'));
        }
      } else if (action.action === 'union') {
        if (features.length >= 2) {
          const gjFeatures = features.map((f) => format.writeFeatureObject(f) as GeoJSONFeature);
          const unionGj = GisService.unionFeatures(gjFeatures);
          if (unionGj) {
            const unionFeature = format.readFeature(unionGj);
            unionFeature.setId(`union_${Date.now()}`);
            setFeatures([unionFeature as Feature<Geometry>]);
            setSelectedFeature(unionFeature as Feature<Geometry>);
            window.dispatchEvent(new CustomEvent('map:fitbounds'));
          }
        }
      } else if (action.action === 'loadUrl') {
        const url = action.params?.url;
        if (url) {
          setIsParsing(true);
          fetchRemoteGeoJSON(url)
            .then((data) => {
              setGeojsonString(data);
              syncFeaturesFromString(data, true);
              resetHistory(data);
              toast({
                title: 'Data Eksternal Berhasil Dimuat',
                description: `Dimuat dari ${url}`,
              });
            })
            .catch((err) => {
              console.error('AI Load URL error:', err);
              toast({
                title: 'Gagal Memuat URL',
                description: 'Pastikan URL publik dan mengizinkan CORS.',
                variant: 'destructive',
              });
            })
            .finally(() => setIsParsing(false));
        }
      } else if (action.action === 'setProperty') {
        const key = action.params?.propKey;
        const value = action.params?.propValue;
        if (key) {
          const target = selectedFeature || (features.length > 0 ? features[features.length - 1] : null);
          if (target) {
            target.set(key, value);
            setFeatures([...features]);
            toast({
              title: 'Atribut Diperbarui',
              description: `Properti '${key}' diatur ke '${value ?? ''}'.`,
            });
          }
        }
      }
    },
    [
      selectedFeature,
      features,
      handleClear,
      handleDeleteFeature,
      setGeojsonString,
      syncFeaturesFromString,
      resetHistory,
      toast,
    ]
  );

  const handleToggle3d = useCallback(() => {
    setIs3d((prev) => !prev);
  }, []);

  const handleToggleGraticule = useCallback(() => {
    setShowGraticule((prev) => {
      const next = !prev;
      setTimeout(() => {
        toast({
          title: next ? 'Graticule (Grid Koordinat) Aktif' : 'Graticule Nonaktif',
          description: next ? 'Garis lintang dan bujur ditampilkan pada kanvas.' : undefined,
        });
      }, 0);
      return next;
    });
  }, [toast]);

  if (!isClient) return null;

  const lw = leftOpen ? CLOUD.leftW : CLOUD.tabW;
  const rw = rightOpen ? CLOUD.rightW : CLOUD.tabW;
  const cloudVars = {
    '--map-l': `${CLOUD.margin + lw + CLOUD.gap}px`,
    '--map-r': `${CLOUD.margin + rw + CLOUD.gap}px`,
    '--cloud-top': `${CLOUD.margin + CLOUD.headerH + CLOUD.gap}px`,
    '--cloud-bottom': `${CLOUD.margin}px`,
    // Scale/coordinate slot fills the notch left of the editor's foot
    '--slot-w': `${leftOpen ? lw - footWidth(lw) - CLOUD.gap : 0}px`,
    '--slot-o': leftOpen ? 1 : 0,
  } as React.CSSProperties;

  return (
    <div
      className="relative h-svh w-screen overflow-hidden bg-background text-foreground selection:bg-primary/20"
      style={cloudVars}
    >
      {/* Map fills the whole screen; the cloud pieces float over it */}
      <main className="absolute inset-0">
        {isParsing && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm animate-in fade-in duration-500">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 font-mono text-sm font-semibold text-muted-foreground animate-pulse">
              Memproses data geospasial…
            </p>
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
          showGraticule={showGraticule}
        />
      </main>

      <CloudShell leftWidth={lw} rightWidth={rw} />

      <Header theme={theme} onToggleTheme={handleToggleTheme} is3d={is3d} onToggle3d={handleToggle3d} />

      <Sidebar
        theme={theme}
        open={leftOpen}
        onOpenChange={setLeftOpen}
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
        onFeaturePropertyChange={handleFeaturePropertyChange}
      />

      <RightSidebar
        open={rightOpen}
        onOpenChange={setRightOpen}
        selectedFeature={selectedFeature}
        features={features}
        onGeojsonChange={handleGeojsonChange}
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
        showGraticule={showGraticule}
        onToggleGraticule={handleToggleGraticule}
      />

      <AIAssistant
        rightOpen={rightOpen}
        onAction={handleAIAction}
        featureContext={
          selectedFeature ? JSON.stringify(format.writeFeatureObject(selectedFeature)) : undefined
        }
      />
    </div>
  );
}
