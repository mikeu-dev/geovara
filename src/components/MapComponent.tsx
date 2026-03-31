'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Overlay, Feature } from 'ol';
import type { Geometry } from 'ol/geom';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';
import { Tile as TileLayer } from 'ol/layer';
import VectorImageLayer from 'ol/layer/VectorImage';
import BaseLayer from 'ol/layer/Base';
import DrawingTools from './DrawingTools';
import FeaturePropertiesPopup from './FeaturePropertiesPopup';
import { useToast } from '@/hooks/use-toast';
import Compass from './Compass';
import { useMap, DrawType } from '@/hooks/useMap';
import CesiumController from './CesiumController';
import MeasurementController from './MeasurementController';
import StatusBar from './StatusBar';
import LocationSearch from './LocationSearch';
import { OSM, XYZ } from 'ol/source';

interface MapProps {
  features: Feature<Geometry>[];
  setFeatures: (features: React.SetStateAction<Feature<Geometry>[]>) => void;
  drawType: DrawType | null;
  setDrawType: (type: DrawType | null) => void;
  selectedFeature: Feature<Geometry> | null;
  onFeatureSelect: (feature: Feature<Geometry> | null) => void;
  onDeleteFeature: (id: string | number | undefined) => void;
  onFeaturePropertyChange: (id: string | number, key: string, value: unknown) => void;
  projection: 'EPSG:4326' | 'EPSG:3857';
  onProjectionChange: (proj: 'EPSG:4326' | 'EPSG:3857') => void;
  zoomToId: string | number | null;
  vectorOpacity: number;
  vectorVisible: boolean;
  basemapOpacity: number;
  is3d: boolean;
  onToggle3d: () => void;
}

export default function MapComponent({
  features,
  setFeatures,
  drawType,
  setDrawType,
  selectedFeature,
  onFeatureSelect,
  onDeleteFeature,
  onFeaturePropertyChange,
  projection,
  onProjectionChange,
  zoomToId,
  vectorOpacity,
  vectorVisible,
  basemapOpacity,
  is3d,
  onToggle3d,
}: MapProps) {
  const mapElement = useRef<HTMLDivElement>(null);
  const popupElement = useRef<HTMLDivElement>(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const { toast } = useToast();

  const styleFunction = useCallback((feature: Feature<Geometry>) => {
    const fill = feature.get('fill') || 'rgba(147, 51, 234, 0.2)';
    const stroke = feature.get('stroke') || '#9333ea';
    const strokeWidth = feature.get('strokeWidth') || 3;
    
    return new Style({
      fill: new Fill({ color: fill }),
      stroke: new Stroke({ color: stroke, width: strokeWidth }),
      image: new CircleStyle({
        radius: 7,
        fill: new Fill({ color: fill }),
        stroke: new Stroke({ color: stroke, width: 2 }),
      }),
    });
  }, []);

  const { map, vectorSource, tileLayer } = useMap({
    target: mapElement,
    features,
    setFeatures,
    drawType,
    setDrawType,
    onFeatureSelect,
    styleFunction,
    projection,
    vectorOpacity,
    vectorVisible,
    basemapOpacity,
  });

  useEffect(() => {
    if (!map || !popupElement.current) return;
    const popupOverlay = new Overlay({
      element: popupElement.current,
      autoPan: { animation: { duration: 250 } },
    });
    map.addOverlay(popupOverlay);

    const handleKeydown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.closest('.monaco-editor')
      ) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedFeature) {
          onDeleteFeature(selectedFeature.getId());
          toast({ title: "Feature deleted", description: `ID: ${selectedFeature.getId()}` });
        }
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => {
      window.removeEventListener('keydown', handleKeydown);
      map.removeOverlay(popupOverlay);
    };
  }, [map, selectedFeature, onDeleteFeature, toast]);

  useEffect(() => {
    if (!map || !selectedFeature || !isPopupOpen) return;
    const overlay = map.getOverlays().getArray().find(o => o.getElement() === popupElement.current);
    if (overlay) {
      const geometry = selectedFeature.getGeometry();
      if (geometry) {
        let coordinate: number[] | undefined;
        
        // Use a more specific interface for cross-geometry coordinate extraction
        interface GeometryWithCenter {
          getInteriorPoint?: () => { getCoordinates: () => number[] };
          getCenter?: () => number[];
          getCoordinates?: () => number[] | number[][] | number[][][];
        }
        
        const geom = geometry as unknown as GeometryWithCenter;
        
        if (typeof geom.getInteriorPoint === 'function') {
          const interiorPoint = geom.getInteriorPoint();
          if (interiorPoint) coordinate = interiorPoint.getCoordinates();
        } else if (typeof geom.getCenter === 'function') {
           coordinate = geom.getCenter();
        } else if (typeof geom.getCoordinates === 'function') {
           const coords = geom.getCoordinates();
           if (coords) {
             coordinate = Array.isArray(coords[0]) ? (coords[0] as number[]) : (coords as number[]);
           }
        }
        if (coordinate) overlay.setPosition(coordinate);
      }
    }
  }, [selectedFeature, isPopupOpen, map]);

  useEffect(() => {
    if (selectedFeature) {
       setTimeout(() => setIsPopupOpen(true), 0);
    } else {
       setTimeout(() => setIsPopupOpen(false), 0);
    }
  }, [selectedFeature]);

  useEffect(() => {
    if (!map) return;
    map.getLayers().forEach((layer: BaseLayer) => {
      if (layer instanceof TileLayer) layer.setOpacity(basemapOpacity);
      if (layer instanceof VectorImageLayer) {
        layer.setOpacity(vectorOpacity);
        layer.setVisible(vectorVisible);
      }
    });

    if (vectorSource) {
      vectorSource.getFeatures().forEach((f: Feature<Geometry>) => {
        const style = f.getStyle();
        if (style && !Array.isArray(style) && typeof (style as unknown as { getStroke: () => unknown }).getStroke === 'function') {
          const styleObj = style as Style;
          const stroke = styleObj.getStroke();
          if (stroke) {
            const color = stroke.getColor();
            if (Array.isArray(color)) {
              const newColor = [...color];
              newColor[3] = vectorOpacity;
              stroke.setColor(newColor);
            }
          }
          const fill = styleObj.getFill();
          if (fill) {
            const color = fill.getColor();
            if (Array.isArray(color)) {
              const newColor = [...color];
              newColor[3] = vectorOpacity * 0.5;
              fill.setColor(newColor);
            }
          }
        }
      });
    }
  }, [vectorOpacity, vectorVisible, basemapOpacity, map, vectorSource]);

  useEffect(() => {
    if (!map || !zoomToId) return;
    const feature = vectorSource?.getFeatureById(zoomToId);
    if (feature) {
      const geometry = feature.getGeometry();
      if (geometry) {
        map.getView().fit(geometry.getExtent(), {
          duration: 1000,
          padding: [50, 50, 50, 50],
          maxZoom: 18,
        });
        onFeatureSelect(feature as Feature<Geometry>);
      }
    }
  }, [zoomToId, map, vectorSource, onFeatureSelect]);

  return (
    <div className="w-full h-full relative group">
      <div ref={mapElement} className="w-full h-full outline-none" />
      
      <LocationSearch map={map} />
      <div className="absolute top-[0.75rem] right-[0.75rem] flex flex-col gap-3 z-30 items-end">
        <Compass map={map} />
        <DrawingTools 
          map={map}
          drawType={drawType}
          setDrawType={setDrawType}
          featuresCount={features.length}
          tileLayer={tileLayer as TileLayer<OSM | XYZ>}
          is3d={is3d}
          onToggle3d={onToggle3d}
          projection={projection}
          onProjectionChange={onProjectionChange}
        />
      </div>

      <div className="absolute bottom-12 right-[0.75rem] flex flex-col gap-2 items-end z-30">
        <MeasurementController map={map} activeType={drawType as 'MeasureArea' | 'MeasureDistance' | null} />
        <CesiumController map={map} enabled={is3d} />
      </div>

      <StatusBar map={map} projection={projection} />

      <div ref={popupElement} className="min-w-[300px] z-50">
        {isPopupOpen && selectedFeature && (
          <FeaturePropertiesPopup
            feature={selectedFeature}
            onOpenChange={(open: boolean) => { if(!open) setTimeout(() => setIsPopupOpen(false), 0); }}
            onPropertyChange={onFeaturePropertyChange}
            onDelete={onDeleteFeature}
          >
            <div />
          </FeaturePropertiesPopup>
        )}
      </div>
    </div>
  );
}
