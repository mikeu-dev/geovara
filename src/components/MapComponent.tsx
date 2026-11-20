'use client';

import { MOTION } from '@/lib/cloud-shape';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Overlay, Feature } from 'ol';
import { getCenter } from 'ol/extent';
import type { Geometry } from 'ol/geom';
import { Stroke, Style } from 'ol/style';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import BaseLayer from 'ol/layer/Base';
import Graticule from 'ol/layer/Graticule';
import DrawingTools from './DrawingTools';
import FeaturePropertiesPopup from './FeaturePropertiesPopup';
import { useToast } from '@/hooks/use-toast';
import Compass from './Compass';
import { useMap, DrawType } from '@/hooks/useMap';
import CesiumController from './CesiumController';
import MeasurementController from './MeasurementController';
import StatusBar from './StatusBar';
import LocationSearch from './LocationSearch';
import CursorGuide from './CursorGuide';
import SpatialToolsDialog from './SpatialToolsDialog';
import UsabilityLabDialog from './UsabilityLabDialog';
import GeoJSONFormat from 'ol/format/GeoJSON';
import { createSimplestyleForFeature } from '@/lib/simplestyle';
import { OSM, XYZ } from 'ol/source';
import type { FeatureCollection } from 'geojson';

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
  showGraticule?: boolean;
  cesiumBackgroundColor?: string;
  cesiumEnableAtmosphere?: boolean;
  cesiumAtmosphereSaturationShift?: number;
  cesiumAtmosphereBrightnessShift?: number;
  /** Where map chrome sits between the cloud pieces (from the page's cloud layout). */
  chrome: MapChrome;
}

export interface MapChrome {
  layout: 'desktop' | 'mobile';
  rail: { top: number; right: number; maxHeight: number; hidden: boolean };
  /** Scale / coordinate slot in the left piece's notch (desktop only). */
  slot: { left: number; width: number; height: number } | null;
  /** Mobile search starts as an icon in the header and expands on demand. */
  searchOpen: boolean;
  onSearchOpenChange: (open: boolean) => void;
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
  showGraticule = false,
  cesiumBackgroundColor,
  cesiumEnableAtmosphere,
  cesiumAtmosphereSaturationShift,
  cesiumAtmosphereBrightnessShift,
  chrome,
}: MapProps) {
  const mapElement = useRef<HTMLDivElement>(null);
  const popupElement = useRef<HTMLDivElement>(null);
  const graticuleRef = useRef<Graticule | null>(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [snappingEnabled, setSnappingEnabled] = useState(true);
  const [activeBasemap, setActiveBasemap] = useState<string>('osm');
  const [isSpatialToolsOpen, setIsSpatialToolsOpen] = useState(false);

  // Quick-operation buttons in the spatial manager open the toolkit
  useEffect(() => {
    const open = () => setIsSpatialToolsOpen(true);
    window.addEventListener('geovara:spatial-tools', open);
    return () => window.removeEventListener('geovara:spatial-tools', open);
  }, []);
  const [isUsabilityLabOpen, setIsUsabilityLabOpen] = useState(false);
  const [experimentCondition, setExperimentCondition] = useState<{
    backgroundColor?: string;
    enableAtmosphere?: boolean;
    atmosphereSaturationShift?: number;
    atmosphereBrightnessShift?: number;
  }>({});
  const { toast } = useToast();

  // Evidence-based Visual Hierarchy & Simplestyle support
  const styleFunction = useCallback(
    (feature: Feature<Geometry>) => {
      const isSelected = selectedFeature !== null && selectedFeature.getId() === feature.getId();
      return createSimplestyleForFeature(feature, isSelected);
    },
    [selectedFeature]
  );

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
    enableSnapping: snappingEnabled,
  });

  useEffect(() => {
    if (!map || !popupElement.current) return;
    const popupOverlay = new Overlay({
      element: popupElement.current,
      autoPan: { animation: { duration: MOTION.morph } },
    });
    map.addOverlay(popupOverlay);

    const handleKeydown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.closest('.monaco-editor')
      )
        return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedFeature) {
          onDeleteFeature(selectedFeature.getId());
          toast({ title: 'Fitur dihapus', description: `ID: ${selectedFeature.getId()}` });
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
    const overlay = map
      .getOverlays()
      .getArray()
      .find((o) => o.getElement() === popupElement.current);
    if (overlay) {
      const geometry = selectedFeature.getGeometry();
      if (geometry) {
        // Anchor the popup ABOVE the feature so it never covers it: just over the
        // top of its extent, or 120px above its centre for large features.
        const extent = geometry.getExtent();
        const centre = getCenter(extent);
        const centrePx = map.getPixelFromCoordinate(centre);
        const topPx = map.getPixelFromCoordinate([centre[0], extent[3]]);
        if (centrePx && topPx) {
          const anchorY = Math.max(topPx[1] - 16, centrePx[1] - 120);
          const anchor = map.getCoordinateFromPixel([centrePx[0], anchorY]);
          if (anchor) overlay.setPosition(anchor);
        } else {
          overlay.setPosition(centre);
        }
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
      if (layer instanceof VectorLayer) {
        layer.setOpacity(vectorOpacity);
        layer.setVisible(vectorVisible);
      }
    });

    if (vectorSource) {
      vectorSource.getFeatures().forEach((f: Feature<Geometry>) => {
        const style = f.getStyle();
        if (
          style &&
          !Array.isArray(style) &&
          typeof (style as unknown as { getStroke: () => unknown }).getStroke === 'function'
        ) {
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
          duration: MOTION.camera,
          padding: [50, 50, 50, 50],
          maxZoom: 18,
        });
        onFeatureSelect(feature as Feature<Geometry>);
      }
    }
  }, [zoomToId, map, vectorSource, onFeatureSelect]);

  const handleAddFeature = useCallback(
    (feature: Feature<Geometry>) => {
      setFeatures((prev) => [...prev, feature]);
    },
    [setFeatures]
  );

  const currentGeoJSON = useMemo<FeatureCollection>(() => {
    try {
      const writer = new GeoJSONFormat();
      return writer.writeFeaturesObject(features, {
        featureProjection: projection,
        dataProjection: 'EPSG:4326',
      }) as FeatureCollection;
    } catch {
      return { type: 'FeatureCollection', features: [] };
    }
  }, [features, projection]);

  const handleApplySpatialGeoJSON = useCallback(
    (newGeoJSON: FeatureCollection, replace: boolean) => {
      try {
        const reader = new GeoJSONFormat();
        const olFeatures = reader.readFeatures(newGeoJSON, {
          dataProjection: 'EPSG:4326',
          featureProjection: projection,
        }) as Feature<Geometry>[];

        olFeatures.forEach((f, idx) => {
          if (!f.getId()) {
            f.setId(`spatial_${Date.now()}_${idx}`);
          }
        });

        if (replace) {
          setFeatures(olFeatures);
        } else {
          setFeatures((prev) => [...prev, ...olFeatures]);
        }

        if (olFeatures.length > 0) {
          window.dispatchEvent(new CustomEvent('map:fitbounds', { detail: { features: olFeatures } }));
        }
      } catch (err) {
        toast({
          title: 'Gagal memuat hasil kalkulasi ke peta',
          description: err instanceof Error ? err.message : String(err),
          variant: 'destructive',
        });
      }
    },
    [projection, setFeatures, toast]
  );

  // Toggleable Graticule / Lat-Lon Grid Layer
  useEffect(() => {
    if (!map) return;

    if (showGraticule) {
      if (!graticuleRef.current) {
        graticuleRef.current = new Graticule({
          strokeStyle: new Stroke({
            color: 'rgba(255, 255, 255, 0.2)',
            width: 1,
            lineDash: [1, 4],
          }),
          showLabels: true,
          wrapX: true,
        });
        map.addLayer(graticuleRef.current);
      }
      graticuleRef.current.setVisible(true);
    } else if (graticuleRef.current) {
      graticuleRef.current.setVisible(false);
    }
  }, [map, showGraticule]);

  return (
    <div className="w-full h-full relative group">
      <div ref={mapElement} className="w-full h-full outline-none" />

      {/* Floating Contextual Cursor Guide */}
      <CursorGuide drawType={drawType} snappingEnabled={snappingEnabled} />

      <LocationSearch
        map={map}
        onAddFeature={handleAddFeature}
        compact={chrome.layout === 'mobile'}
        open={chrome.searchOpen}
        onOpenChange={chrome.onSearchOpenChange}
      />
      {/* Draw rail floats inside the map window, beside the spatial manager */}
      <div
        className="cloud-move cloud-fade absolute flex flex-col gap-3 z-30 items-end overflow-y-auto overflow-x-hidden overscroll-contain p-1 -m-1"
        style={{
          top: chrome.rail.top,
          right: chrome.rail.right,
          maxHeight: chrome.rail.maxHeight,
          opacity: chrome.rail.hidden ? 0 : 1,
          transform: `translateX(${chrome.rail.hidden ? 30 : 0}px)`,
          pointerEvents: chrome.rail.hidden ? 'none' : 'auto',
        }}
        aria-hidden={chrome.rail.hidden}
      >
        <Compass map={map} />
        <DrawingTools
          map={map}
          drawType={drawType}
          setDrawType={setDrawType}
          featuresCount={features.length}
          tileLayer={tileLayer as TileLayer<OSM | XYZ>}
          activeBasemap={activeBasemap}
          onBasemapChange={setActiveBasemap}
          is3d={is3d}
          onToggle3d={onToggle3d}
          projection={projection}
          onProjectionChange={onProjectionChange}
          snappingEnabled={snappingEnabled}
          onToggleSnapping={() => {
            setSnappingEnabled((prev) => {
              const next = !prev;
              toast({
                title: next ? 'Magnetic Snapping Aktif' : 'Magnetic Snapping Nonaktif',
                description: next ? 'Pointer akan otomatis menempel pada simpul terdekat.' : undefined,
              });
              return next;
            });
          }}
          onOpenSpatialTools={() => setIsSpatialToolsOpen(true)}
          onOpenUsabilityLab={() => setIsUsabilityLabOpen(true)}
        />
      </div>

      <div
        className="cloud-move absolute flex flex-col gap-2 items-end z-30"
        style={{ bottom: chrome.layout === 'mobile' ? 'calc(var(--cloud-bottom) + 12px)' : 92, right: chrome.rail.right }}
      >
        <MeasurementController
          map={map}
          activeType={drawType as 'MeasureArea' | 'MeasureDistance' | null}
        />
        <CesiumController
          map={map}
          enabled={is3d}
          geojson={currentGeoJSON}
          activeBasemap={activeBasemap}
          backgroundColor={experimentCondition.backgroundColor || cesiumBackgroundColor}
          enableAtmosphere={
            experimentCondition.enableAtmosphere !== undefined
              ? experimentCondition.enableAtmosphere
              : cesiumEnableAtmosphere
          }
          atmosphereSaturationShift={
            experimentCondition.atmosphereSaturationShift !== undefined
              ? experimentCondition.atmosphereSaturationShift
              : cesiumAtmosphereSaturationShift
          }
          atmosphereBrightnessShift={
            experimentCondition.atmosphereBrightnessShift !== undefined
              ? experimentCondition.atmosphereBrightnessShift
              : cesiumAtmosphereBrightnessShift
          }
        />
      </div>

      <StatusBar map={map} projection={projection} is3d={is3d} layout={chrome.layout} slot={chrome.slot} />

      {/* Spatial Tools Dialog */}
      <SpatialToolsDialog
        open={isSpatialToolsOpen}
        onOpenChange={setIsSpatialToolsOpen}
        geojson={currentGeoJSON}
        onApplyGeoJSON={handleApplySpatialGeoJSON}
        selectedFeatureId={selectedFeature ? selectedFeature.getId() : null}
      />

      {/* Usability & Evaluation Lab Dialog */}
      <UsabilityLabDialog
        open={isUsabilityLabOpen}
        onOpenChange={setIsUsabilityLabOpen}
        is3d={is3d}
        onToggle3d={onToggle3d}
        onSetExperimentCondition={setExperimentCondition}
        onLoadTestFeatures={(fc) => handleApplySpatialGeoJSON(fc, false)}
      />

      <div ref={popupElement} className="min-w-[300px] z-50">
        {isPopupOpen && selectedFeature && (
          <FeaturePropertiesPopup
            feature={selectedFeature}
            onOpenChange={(open: boolean) => {
              if (!open) setTimeout(() => setIsPopupOpen(false), 0);
            }}
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
