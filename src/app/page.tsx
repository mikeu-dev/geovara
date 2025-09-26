'use client';

import { useState, useMemo, useEffect } from 'react';
import type { Feature } from 'ol';
import type { Geometry } from 'ol/geom';
import GeoJSON from 'ol/format/GeoJSON';
import dynamic from 'next/dynamic';
import Sidebar from '@/components/Sidebar';
import MapSkeleton from '@/components/MapSkeleton';

export type DrawType = 'Point' | 'LineString' | 'Polygon';

const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

export default function Home() {
  const [features, setFeatures] = useState<Feature<Geometry>[]>([]);
  const [drawType, setDrawType] = useState<DrawType | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const geojsonString = useMemo(() => {
    if (!features.length) return '';
    const format = new GeoJSON();
    try {
      const geojson = format.writeFeaturesObject(features, {
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
  };

  return (
    <main className="flex h-full flex-col md:flex-row bg-background text-foreground">
      <Sidebar 
        drawType={drawType}
        setDrawType={setDrawType}
        geojsonString={geojsonString}
        featuresCount={features.length}
        onClear={handleClear}
      />
      <div className="flex-grow h-full w-full">
        {isClient ? <MapComponent features={features} setFeatures={setFeatures} drawType={drawType} /> : <MapSkeleton />}
      </div>
    </main>
  );
}
