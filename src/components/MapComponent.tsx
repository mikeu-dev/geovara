'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Overlay } from 'ol';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';
import { Feature } from 'ol';
import type { Geometry } from 'ol/geom';
import DrawingTools from './DrawingTools';
import FeaturePropertiesPopup from './FeaturePropertiesPopup';
import { useToast } from '@/hooks/use-toast';
import { useMap, DrawType } from '@/hooks/useMap';
import CesiumController from './CesiumController';
import MeasurementController from './MeasurementController';
import StatusBar from './StatusBar';

interface MapProps {
  features: Feature<Geometry>[];
  setFeatures: React.Dispatch<React.SetStateAction<Feature<Geometry>[]>>;
  drawType: DrawType | null;
  setDrawType: React.Dispatch<React.SetStateAction<DrawType | null>>;
  selectedFeature: Feature<Geometry> | null;
  onFeatureSelect: (feature: Feature<Geometry> | null) => void;
  onDeleteFeature: (featureId: string | number | undefined) => void;
  onFeaturePropertyChange: (featureId: string | number, key: string, value: any) => void;
  projection: 'EPSG:4326' | 'EPSG:3857';
  onProjectionChange: (proj: 'EPSG:4326' | 'EPSG:3857') => void;
  zoomToId: string | number | null;
}

const selectedStyle = new Style({
  fill: new Fill({ color: 'hsla(0, 100%, 50%, 0.3)' }),
  stroke: new Stroke({ color: 'hsl(0, 100%, 50%)', width: 3 }),
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
    stroke: new Stroke({ color: 'hsl(180, 100%, 25%)', width: 3 }),
  }),
  'Polygon': new Style({
    stroke: new Stroke({ color: 'hsl(180, 100%, 25%)', width: 3 }),
    fill: new Fill({ color: 'hsla(180, 100%, 25%, 0.3)' }),
  }),
};

const styleFromProperties = (feature: Feature<Geometry>): Style | undefined => {
  const props = feature.getProperties();
  const geomType = feature.getGeometry()?.getType();

  if (props['fill'] || props['stroke'] || props['radius']) {
    const fill = props['fill'] ? new Fill({ color: props['fill'] }) : undefined;
    const stroke = (props['stroke'] || props['stroke-width']) ? new Stroke({
      color: props['stroke'] || '#3399CC',
      width: props['stroke-width'] || 2,
    }) : undefined;

    if (geomType === 'Point' || geomType === 'MultiPoint') {
      return new Style({
        image: new CircleStyle({
          fill: fill || new Fill({ color: 'hsla(180, 100%, 25%, 0.7)' }),
          stroke: stroke || new Stroke({ color: 'hsl(180, 100%, 25%)', width: 2 }),
          radius: props['radius'] || 7,
        }),
      });
    }
    return new Style({ fill, stroke });
  }
  return undefined;
};

export default function MapComponent(props: MapProps) {
  const { features, selectedFeature, onFeatureSelect, onDeleteFeature, drawType, setDrawType, zoomToId } = props;
  const mapRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [is3d, setIs3d] = useState(false);
  const { toast } = useToast();

  const styleFunction = useCallback((feature: Feature<Geometry>) => {
    const isSelected = selectedFeature && feature.getId() === selectedFeature.getId();
    if (isSelected) return selectedStyle;

    const customStyle = styleFromProperties(feature);
    if (customStyle) return customStyle;

    const geomType = feature.getGeometry()?.getType();
    const baseType = geomType?.includes('Polygon') ? 'Polygon' : geomType?.includes('Line') ? 'LineString' : 'Point';
    return defaultStyles[baseType as keyof typeof defaultStyles] || defaultStyles['Point'];
  }, [selectedFeature]);

  const { map, selectInteraction, tileLayer } = useMap({
    target: mapRef,
    styleFunction,
    ...props
  });

  // Handle Popup & Selection Overlay
  useEffect(() => {
    if (!map) return;

    const popupOverlay = new Overlay({
      element: popupRef.current!,
      autoPan: false,
      positioning: 'center-center',
    });
    map.addOverlay(popupOverlay);

    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedFeature) {
        onDeleteFeature(selectedFeature.getId());
        setIsPopupOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeydown);

    return () => {
      map.removeOverlay(popupOverlay);
      document.removeEventListener('keydown', handleKeydown);
    };
  }, [map, selectedFeature, onDeleteFeature]);

  // Sync Popup Position
  useEffect(() => {
    const overlay = map?.getOverlays().getArray()[0];
    if (isPopupOpen && selectedFeature && overlay) {
      const geometry = selectedFeature.getGeometry() as any;
      if (geometry) {
        const type = geometry.getType();
        if (type.includes('Polygon')) overlay.setPosition(geometry.getInteriorPoint().getCoordinates());
        else if (type.includes('Line')) overlay.setPosition(geometry.getCoordinateAt(0.5));
        else overlay.setPosition(geometry.getCoordinates());
      }
    } else {
      overlay?.setPosition(undefined);
    }
  }, [selectedFeature, isPopupOpen, map]);

  useEffect(() => {
    if (selectedFeature) setIsPopupOpen(true);
  }, [selectedFeature]);

  // Handle ZoomTo request
  useEffect(() => {
    if (zoomToId && map) {
      const feature = map.getLayers().getArray()
        .filter(l => (l as any).getSource()?.getFeatureById)
        .map(l => (l as any).getSource().getFeatureById(zoomToId))
        .find(f => f);

      if (feature) {
        const geometry = feature.getGeometry();
        if (geometry) {
          map.getView().fit(geometry.getExtent(), {
            padding: [50, 50, 50, 50],
            duration: 1000,
            maxZoom: 18
          });
          onFeatureSelect(feature);
        }
      }
    }
  }, [zoomToId, map, onFeatureSelect]);

  const handleToggle3d = () => {
    setIs3d(!is3d);
    if (!is3d) toast({ title: "3D mode is under development.", duration: 3000 });
  }

  return (
    <div ref={mapRef} className="w-full h-full relative">
      <CesiumController map={map} enabled={is3d} />
      <MeasurementController 
        map={map} 
        activeType={drawType === 'MeasureDistance' || drawType === 'MeasureArea' ? drawType : null} 
      />
      <DrawingTools 
        map={map} 
        drawType={drawType} 
        setDrawType={setDrawType} 
        featuresCount={features.length} 
        tileLayer={tileLayer}
        is3d={is3d} 
        onToggle3d={handleToggle3d} 
        projection={props.projection}
        onProjectionChange={props.onProjectionChange}
      />
      <StatusBar map={map} projection={props.projection} />
      <div ref={popupRef} className="ol-popup">
        {isPopupOpen && selectedFeature && (
          <FeaturePropertiesPopup
            feature={selectedFeature}
            onDelete={(id) => { setIsPopupOpen(false); onDeleteFeature(id); }}
            onPropertyChange={props.onFeaturePropertyChange}
            onOpenChange={(open) => { setIsPopupOpen(open); if (!open) onFeatureSelect(null); }}
          >
            <div />
          </FeaturePropertiesPopup>
        )}
      </div>
    </div>
  );
}
