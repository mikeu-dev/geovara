'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { Feature } from 'ol';
import type { Geometry } from 'ol/geom';
import GeoJSON from 'ol/format/GeoJSON';
import dynamic from 'next/dynamic';
import Sidebar from '@/components/Sidebar';
import MapSkeleton from '@/components/MapSkeleton';

export type DrawType = 'Point' | 'LineString' | 'Polygon' | 'Circle';

const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

export default function Home() {
  const [features, setFeatures] = useState<Feature<Geometry>[]>([]);
  const [selectedFeature, setSelectedFeature] = useState<Feature<Geometry> | null>(null);
  const [drawType, setDrawType] = useState<DrawType | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const geojsonString = useMemo(() => {
    if (!features.length) return '';
    const format = new GeoJSON();
    try {
      // When writing features, we need to clone them to avoid modifying the original features
      const featuresToWrite = features.map(feature => {
        const newFeature = feature.clone();
        // The feature from OpenLayers has a geometry property which is an object.
        // The GeoJSON standard expects a geometry property as well, but it also has other properties.
        // We get the properties from the feature and set them on the new feature.
        // We also want to make sure we're not including the original geometry object from OL in the properties.
        const properties = feature.getProperties();
        delete properties.geometry;
        newFeature.setProperties(properties);
        return newFeature;
      });

      const geojson = format.writeFeaturesObject(featuresToWrite, {
        featureProjection: 'EPSG:3857',
        dataProjection: 'EPSG:4326',
      });
      return JSON.stringify(geojson, null, 2);
    } catch (error) {
      console.error('Error converting features to GeoJSON:', error);
      return 'Error generating GeoJSON';
    }
  }, [features]);

  const handleClear = () => {
    setFeatures([]);
    setSelectedFeature(null);
  };

  const handleDeleteSelected = useCallback(() => {
    if (selectedFeature) {
      setFeatures(prev => prev.filter(f => f.getId() !== selectedFeature.getId()));
      setSelectedFeature(null);
    }
  }, [selectedFeature]);
  
  const handleFeaturePropertyChange = useCallback((key: string, value: any) => {
    if (selectedFeature) {
      selectedFeature.set(key, value);
      // Trigger a re-render by creating a new array
      setFeatures(prev => [...prev]);
    }
  }, [selectedFeature]);

  return (
    <main className="flex h-full flex-col md:flex-row bg-background text-foreground">
      <Sidebar 
        drawType={drawType}
        setDrawType={setDrawType}
        geojsonString={geojsonString}
        featuresCount={features.length}
        onClear={handleClear}
        selectedFeature={selectedFeature}
        onDeleteSelected={handleDeleteSelected}
        onFeaturePropertyChange={handleFeaturePropertyChange}
      />
      <div className="flex-grow h-full w-full">
        {isClient ? (
          <MapComponent 
            features={features} 
            setFeatures={setFeatures} 
            drawType={drawType} 
            selectedFeature={selectedFeature}
            setSelectedFeature={setSelectedFeature}
          />
        ) : <MapSkeleton />}
      </div>
    </main>
  );
}
