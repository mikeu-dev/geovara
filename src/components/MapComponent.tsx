'use client';

import { useEffect, useRef } from 'react';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { fromLonLat, get as getProjection } from 'ol/proj';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Draw, Modify, Select } from 'ol/interaction';
import { Feature } from 'ol';
import type { Geometry } from 'ol/geom';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';
import type { DrawEvent } from 'ol/interaction/Draw';
import type { ModifyEvent } from 'ol/interaction/Modify';

type DrawType = 'Point' | 'LineString' | 'Polygon';

interface MapProps {
  features: Feature<Geometry>[];
  setFeatures: React.Dispatch<React.SetStateAction<Feature<Geometry>[]>>;
  drawType: DrawType | null;
}

export default function MapComponent({ features, setFeatures, drawType }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<Map | null>(null);
  const vectorSource = useRef(new VectorSource());
  const drawInteraction = useRef<Draw | null>(null);
  const selectInteraction = useRef<Select | null>(null);
  const modifyInteraction = useRef<Modify | null>(null);

  // Styles for features, making them visually appealing
  const styles = {
    'Point': new Style({
      image: new CircleStyle({
        radius: 7,
        fill: new Fill({ color: 'hsla(180, 100%, 25%, 0.7)' }),
        stroke: new Stroke({ color: 'hsl(180, 100%, 25%)', width: 2 }),
      }),
    }),
    'LineString': new Style({
      stroke: new Stroke({
        color: 'hsl(180, 100%, 25%)',
        width: 3,
      }),
    }),
    'Polygon': new Style({
      stroke: new Stroke({
        color: 'hsl(180, 100%, 25%)',
        width: 3,
      }),
      fill: new Fill({
        color: 'hsla(180, 100%, 25%, 0.3)',
      }),
    }),
  };

  const styleFunction = (feature: Feature<Geometry>) => {
    return styles[feature.getGeometry()?.getType() as keyof typeof styles] || styles['Point'];
  };

  // Initialize map on component mount
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const vectorLayer = new VectorLayer({
      source: vectorSource.current,
      style: styleFunction
    });

    mapInstance.current = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        vectorLayer,
      ],
      view: new View({
        center: fromLonLat([10, 20]),
        zoom: 3,
        projection: getProjection('EPSG:3857')!,
      }),
      controls: [], // Use custom controls if needed later
    });

    // Interaction for modifying features
    modifyInteraction.current = new Modify({ source: vectorSource.current });
    mapInstance.current.addInteraction(modifyInteraction.current);
    modifyInteraction.current.on('modifyend', (e: ModifyEvent) => {
        // Feature object is mutated, so we create a new array to trigger React's state update
        setFeatures(prev => [...prev]);
    });

    // Interaction for selecting features (for deletion)
    selectInteraction.current = new Select({ style: styleFunction });
    mapInstance.current.addInteraction(selectInteraction.current);

    // Keyboard event listener for deleting selected features
    const handleDelete = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const selectedFeatures = selectInteraction.current?.getFeatures();
        if (selectedFeatures && selectedFeatures.getLength() > 0) {
          const idsToRemove = selectedFeatures.getArray().map(f => f.getId());
          setFeatures(prev => prev.filter(f => !idsToRemove.includes(f.getId())));
          selectedFeatures.clear();
        }
      }
    };
    document.addEventListener('keydown', handleDelete);

    return () => {
      // Cleanup on component unmount
      document.removeEventListener('keydown', handleDelete);
      mapInstance.current?.dispose();
      mapInstance.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Handle changes in drawing mode
  useEffect(() => {
    if (!mapInstance.current) return;

    // Remove previous draw interaction
    if (drawInteraction.current) {
      mapInstance.current.removeInteraction(drawInteraction.current);
    }

    if (drawType) {
      // Create and add new draw interaction
      drawInteraction.current = new Draw({
        source: vectorSource.current,
        type: drawType,
      });

      drawInteraction.current.on('drawend', (e: DrawEvent) => {
        const newFeature = e.feature;
        newFeature.setId(`${drawType}_${Date.now()}`); // Assign a unique ID for state management
        setFeatures((prev) => [...prev, newFeature]);
      });
      
      mapInstance.current.addInteraction(drawInteraction.current);
    }
  }, [drawType, setFeatures]);

  // Synchronize features from React state to the OpenLayers map source
  useEffect(() => {
    const source = vectorSource.current;
    if (!source) return;

    const featuresInStateIds = features.map(f => f.getId());
    const featuresInSource = source.getFeatures();
    
    // Remove features from source that are no longer in state
    const featuresToRemoveFromSource = featuresInSource.filter(f => !featuresInStateIds.includes(f.getId()));
    featuresToRemoveFromSource.forEach(f => source.removeFeature(f));

    // Add new features from state to the source
    features.forEach(feature => {
      if (!source.getFeatureById(feature.getId()!)) {
        source.addFeature(feature);
      }
    });

  }, [features]);

  return <div ref={mapRef} className="w-full h-full" />;
}
