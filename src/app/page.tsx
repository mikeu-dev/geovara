'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Feature } from 'ol';
import type { Geometry } from 'ol/geom';
import GeoJSON from 'ol/format/GeoJSON';
import dynamic from 'next/dynamic';
import Sidebar from '@/components/Sidebar';
import MapSkeleton from '@/components/MapSkeleton';
import FeaturePropertiesDialog from '@/components/FeaturePropertiesDialog';


export type DrawType = 'Point' | 'LineString' | 'Polygon' | 'Circle' | 'Edit' | 'Delete';

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
  const [isFeatureDialogOpen, setIsFeatureDialogOpen] = useState(false);

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
  
  useEffect(() => {
    if (drawType === 'Delete' && selectedFeature) {
      handleDeleteSelected();
      setDrawType(null);
    }
  }, [drawType, selectedFeature]);


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
      setIsFeatureDialogOpen(false);
    }
  }, [selectedFeature]);
  
  const handleFeaturePropertyChange = useCallback((key: string, value: any) => {
    if (selectedFeature) {
      selectedFeature.set(key, value);
      setFeatures(prev => [...prev]);
    }
  }, [selectedFeature]);

  const handleFeatureSelect = useCallback((feature: Feature<Geometry> | null) => {
    setSelectedFeature(feature);
    if(drawType !== 'Edit') {
      setIsFeatureDialogOpen(!!feature);
    }
  }, [drawType]);

  const handleDialogClose = () => {
    setIsFeatureDialogOpen(false);
    setSelectedFeature(null);
  }

  return (
    <main className="flex h-full flex-col md:flex-row bg-background text-foreground">
      <Sidebar 
        geojsonString={geojsonString}
        onGeojsonChange={handleGeojsonChange}
        featuresCount={features.length}
        onClear={handleClear}
      />
      <div className="flex-grow h-full w-full relative">
        {isClient ? (
          <MapComponent 
            features={features} 
            setFeatures={setFeatures} 
            drawType={drawType}
            setDrawType={setDrawType}
            selectedFeature={selectedFeature}
            onFeatureSelect={handleFeatureSelect}
          />
        ) : <MapSkeleton />}
      </div>
      {selectedFeature && (
        <FeaturePropertiesDialog
          isOpen={isFeatureDialogOpen}
          onOpenChange={handleDialogClose}
          feature={selectedFeature}
          onDelete={handleDeleteSelected}
          onPropertyChange={handleFeaturePropertyChange}
        />
      )}
    </main>
  );
}
