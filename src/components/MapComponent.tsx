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
import type { SelectEvent } from 'ol/interaction/Select';
import DrawingTools from './DrawingTools';
import {
  defaults as defaultControls,
  Attribution,
  ScaleLine,
  Zoom,
} from 'ol/control';

type DrawType = 'Point' | 'LineString' | 'Polygon' | 'Circle';

interface MapProps {
  features: Feature<Geometry>[];
  setFeatures: React.Dispatch<React.SetStateAction<Feature<Geometry>[]>>;
  drawType: DrawType | null;
  setDrawType: React.Dispatch<React.SetStateAction<DrawType | null>>;
  selectedFeature: Feature<Geometry> | null;
  onFeatureSelect: (feature: Feature<Geometry> | null) => void;
}

export default function MapComponent({ features, setFeatures, drawType, setDrawType, selectedFeature, onFeatureSelect }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<Map | null>(null);
  const vectorSource = useRef(new VectorSource());
  const drawInteraction = useRef<Draw | null>(null);
  const selectInteraction = useRef<Select | null>(null);
  const modifyInteraction = useRef<Modify | null>(null);

  const selectedStyle = new Style({
    fill: new Fill({
      color: 'hsla(0, 100%, 50%, 0.3)',
    }),
    stroke: new Stroke({
      color: 'hsl(0, 100%, 50%)',
      width: 3,
    }),
    image: new CircleStyle({
      radius: 7,
      fill: new Fill({ color: 'hsla(0, 100%, 50%, 0.7)' }),
      stroke: new Stroke({ color: 'hsl(0, 100%, 50%)', width: 2 }),
    }),
  });

  const defaultStyles = {
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
    'Circle': new Style({
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
    const isSelected = selectedFeature && feature.getId() === selectedFeature.getId();
    if (isSelected) {
      return selectedStyle;
    }
    const geomType = feature.getGeometry()?.getType();
    return defaultStyles[geomType as keyof typeof defaultStyles] || defaultStyles['Point'];
  };

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const vectorLayer = new VectorLayer({
      source: vectorSource.current,
      style: styleFunction
    });
    
    const attribution = new Attribution({
      collapsible: false,
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
      controls: defaultControls({ attribution: false }).extend([
        new Zoom(),
        attribution,
      ]),
    });

    modifyInteraction.current = new Modify({ source: vectorSource.current });
    mapInstance.current.addInteraction(modifyInteraction.current);
    modifyInteraction.current.on('modifyend', (e: ModifyEvent) => {
        setFeatures(prev => [...prev]);
    });

    selectInteraction.current = new Select({ 
      style: styleFunction,
      hitTolerance: 5,
    });
    mapInstance.current.addInteraction(selectInteraction.current);

    selectInteraction.current.on('select', (e: SelectEvent) => {
      if (e.selected.length > 0) {
        onFeatureSelect(e.selected[0]);
      } else {
        onFeatureSelect(null);
      }
    });

    const handleDelete = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedFeature) {
        const selectedFeatures = selectInteraction.current?.getFeatures();
        if (selectedFeatures && selectedFeatures.getLength() > 0) {
          const idsToRemove = selectedFeatures.getArray().map(f => f.getId());
          setFeatures(prev => prev.filter(f => !idsToRemove.includes(f.getId())));
          selectedFeatures.clear();
          onFeatureSelect(null);
        }
      }
    };
    document.addEventListener('keydown', handleDelete);

    return () => {
      document.removeEventListener('keydown', handleDelete);
      mapInstance.current?.dispose();
      mapInstance.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  useEffect(() => {
    if (!mapInstance.current) return;
  
    if (drawInteraction.current) {
      mapInstance.current.removeInteraction(drawInteraction.current);
      drawInteraction.current = null;
    }
  
    if (selectInteraction.current) {
      selectInteraction.current.setActive(!drawType);
    }
  
    if (drawType) {
      selectInteraction.current?.getFeatures().clear();
      onFeatureSelect(null);
      
      drawInteraction.current = new Draw({
        source: vectorSource.current,
        type: drawType,
      });
  
      drawInteraction.current.on('drawend', (e: DrawEvent) => {
        const newFeature = e.feature;
        const id = `${drawType}_${Date.now()}`;
        newFeature.setId(id);
        
        newFeature.set('name', `New ${drawType}`);
        newFeature.set('description', '');
  
        setFeatures((prev) => [...prev, newFeature]);
        setDrawType(null); // This will trigger the useEffect again, re-enabling select
        onFeatureSelect(newFeature); // Select the feature to show the dialog
      });
      
      mapInstance.current.addInteraction(drawInteraction.current);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawType, setFeatures, onFeatureSelect, setDrawType]);

  useEffect(() => {
    const source = vectorSource.current;
    if (!source) return;

    const featuresInStateIds = features.map(f => f.getId());
    const featuresInSource = source.getFeatures();
    
    const featuresToRemoveFromSource = featuresInSource.filter(f => {
        const id = f.getId();
        return id !== undefined && !featuresInStateIds.includes(id);
    });
    featuresToRemoveFromSource.forEach(f => {
        if (f.getId() && source.getFeatureById(f.getId()!)) {
            source.removeFeature(f)
        }
    });

    features.forEach(feature => {
      if (feature.getId() && !source.getFeatureById(feature.getId()!)) {
        source.addFeature(feature);
      }
    });
    
    source.changed();

  }, [features]);
  
  useEffect(() => {
      if (selectInteraction.current) {
        const selectedFeaturesCollection = selectInteraction.current.getFeatures();
        selectedFeaturesCollection.clear();
        if (selectedFeature && selectedFeature.getId()) {
            const featureInSource = vectorSource.current.getFeatureById(selectedFeature.getId()!);
            if (featureInSource) {
                selectedFeaturesCollection.push(featureInSource);
            }
        }
      }
  }, [selectedFeature]);


  return (
    <div ref={mapRef} className="w-full h-full">
      <DrawingTools map={mapInstance.current} drawType={drawType} setDrawType={setDrawType} />
    </div>
  );
}
