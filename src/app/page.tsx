'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { Feature } from 'ol';
import type { Geometry } from 'ol/geom';
import GeoJSON from 'ol/format/GeoJSON';
import dynamic from 'next/dynamic';
import Sidebar from '@/components/Sidebar';
import MapSkeleton from '@/components/MapSkeleton';
import type { FeatureCollection } from 'geojson';


export type DrawType = 'Point' | 'LineString' | 'Polygon' | 'Circle';

const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

const format = new GeoJSON({
  featureProjection: 'EPSG:3857',
  dataProjection: 'EPSG:4326',
});

export default function Home() {
  const [features, setFeatures] = useState<Feature<Geometry>[]>([]);
  const [selectedFeature, setSelectedFeature] = useState<Feature<Geometry> | null>(null);
  const [drawType, setDrawType] = useState<DrawType | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [geojsonString, setGeojsonString] = useState('');

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!features.length) {
      setGeojsonString('');
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
      setGeojsonString(JSON.stringify(geojson, null, 2));
    } catch (error) {
      console.error('Error converting features to GeoJSON:', error);
      setGeojsonString('Error generating GeoJSON');
    }
  }, [features]);

  const handleGeojsonChange = (value: string | undefined) => {
    const newGeojsonString = value || '';
    setGeojsonString(newGeojsonString);
    if (!newGeojsonString.trim()) {
      setFeatures([]);
      return;
    }
    try {
      const geojson_obj = JSON.parse(newGeojsonString);
      const featuresFromGeojson = format.readFeatures(geojson_obj) as Feature<Geometry>[];

      // Assign unique IDs if they don't have one
      featuresFromGeojson.forEach((f, i) => {
        if (!f.getId()) {
          f.setId(`feature_${Date.now()}_${i}`);
        }
      });
      
      setFeatures(featuresFromGeojson);
    } catch (e) {
      // Invalid GeoJSON, do nothing
    }
  }

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
        onGeojsonChange={handleGeojsonChange}
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
