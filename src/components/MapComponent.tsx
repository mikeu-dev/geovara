'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Map, View, Overlay } from 'ol';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { fromLonLat, toLonLat, get as getProjection } from 'ol/proj';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { DragAndDrop, Draw, Modify, Select } from 'ol/interaction';
import { createBox } from 'ol/interaction/Draw';
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
  Zoom,
} from 'ol/control';
import GeoJSON from 'ol/format/GeoJSON';
import type { DragAndDropEvent } from 'ol/interaction/DragAndDrop';
import FeaturePropertiesPopup from './FeaturePropertiesPopup';
import type { XYZ } from 'ol/source';
import { useToast } from '@/hooks/use-toast';
import { MapBrowserEvent } from 'ol';

type DrawType = 'Point' | 'LineString' | 'Polygon' | 'Rectangle' | 'Circle' | 'Edit' | 'Delete';

interface MapProps {
  features: Feature<Geometry>[];
  setFeatures: React.Dispatch<React.SetStateAction<Feature<Geometry>[]>>;
  drawType: DrawType | null;
  setDrawType: React.Dispatch<React.SetStateAction<DrawType | null>>;
  selectedFeature: Feature<Geometry> | null;
  onFeatureSelect: (feature: Feature<Geometry> | null) => void;
  onDeleteFeature: (featureId: string | number | undefined) => void;
  onFeaturePropertyChange: (featureId: string | number, key: string, value: any) => void;
}

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
  'Rectangle': new Style({
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

// This function creates a style from feature properties
const styleFromProperties = (feature: Feature<Geometry>): Style | undefined => {
  const props = feature.getProperties();
  const geomType = feature.getGeometry()?.getType();

  let fill: Fill | undefined;
  if (props['fill']) {
    fill = new Fill({ color: props['fill'] });
  }

  let stroke: Stroke | undefined;
  if (props['stroke'] || props['stroke-width']) {
    stroke = new Stroke({
      color: props['stroke'] || '#3399CC',
      width: props['stroke-width'] || 2,
    });
  }

  let image: CircleStyle | undefined;
  if (geomType === 'Point' || geomType === 'MultiPoint') {
    image = new CircleStyle({
      fill: fill || defaultStyles.Point.getImage().getFill(),
      stroke: stroke || defaultStyles.Point.getImage().getStroke(),
      radius: props['radius'] || 7,
    });
    return new Style({ image });
  }
  
  if (fill || stroke) {
    return new Style({ fill, stroke, image });
  }

  return undefined;
};

export default function MapComponent({ features, setFeatures, drawType, setDrawType, selectedFeature, onFeatureSelect, onDeleteFeature, onFeaturePropertyChange }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<Map | null>(null);
  const vectorSource = useRef(new VectorSource());
  const drawInteraction = useRef<Draw | null>(null);
  const selectInteraction = useRef<Select | null>(null);
  const modifyInteraction = useRef<Modify | null>(null);
  const [tileLayer, setTileLayer] = useState<TileLayer<OSM | XYZ> | null>(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [is3d, setIs3d] = useState(false);
  const { toast } = useToast();
  const isUpdatingFromHash = useRef(false);


  const styleFunction = (feature: Feature<Geometry>) => {
    const isSelected = selectedFeature && feature.getId() === selectedFeature.getId();
    if (isSelected) {
      return selectedStyle;
    }
    
    // Check for custom style properties on the feature
    const customStyle = styleFromProperties(feature);
    if (customStyle) {
      return customStyle;
    }

    const geomType = feature.getGeometry()?.getType();
    return defaultStyles[geomType as keyof typeof defaultStyles] || defaultStyles['Point'];
  };

  const updateViewFromHash = useCallback(() => {
    if (!mapInstance.current) return;
    const hash = window.location.hash.substring(1);
    if (!hash.startsWith('map=')) return;
  
    const parts = hash.substring(4).split('/');
    if (parts.length === 3) {
      const zoom = parseFloat(parts[0]);
      const lat = parseFloat(parts[1]);
      const lon = parseFloat(parts[2]);
      if (!isNaN(zoom) && !isNaN(lat) && !isNaN(lon)) {
        const view = mapInstance.current.getView();
        const currentCenter = toLonLat(view.getCenter()!);
        const currentZoom = view.getZoom();
        
        // Only update if the view is significantly different
        if (
          Math.abs(currentZoom! - zoom) > 0.01 ||
          Math.abs(currentCenter[0] - lon) > 0.0001 ||
          Math.abs(currentCenter[1] - lat) > 0.0001
        ) {
          isUpdatingFromHash.current = true;
          view.setCenter(fromLonLat([lon, lat]));
          view.setZoom(zoom);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const initialTileLayer = new TileLayer({
        source: new OSM(),
    });
    setTileLayer(initialTileLayer);
    
    const vectorLayer = new VectorLayer({
      source: vectorSource.current,
      style: styleFunction
    });
    
    const attribution = new Attribution({
      collapsible: false,
    });
    
    const popupOverlay = new Overlay({
      element: popupRef.current!,
      autoPan: false,
      positioning: 'center-center',
    });

    // Initialize view from hash or defaults
    const hash = window.location.hash.substring(1);
    let center = fromLonLat([10, 20]);
    let zoom = 3;
    if (hash.startsWith('map=')) {
        const parts = hash.substring(4).split('/');
        if (parts.length === 3) {
            const parsedZoom = parseFloat(parts[0]);
            const lat = parseFloat(parts[1]);
            const lon = parseFloat(parts[2]);
            if (!isNaN(parsedZoom) && !isNaN(lat) && !isNaN(lon)) {
                zoom = parsedZoom;
                center = fromLonLat([lon, lat]);
            }
        }
    }

    mapInstance.current = new Map({
      target: mapRef.current,
      layers: [
        initialTileLayer,
        vectorLayer,
      ],
      overlays: [popupOverlay],
      view: new View({
        center: center,
        zoom: zoom,
        projection: getProjection('EPSG:3857')!,
      }),
      controls: defaultControls({ attribution: false }).extend([
        new Zoom(),
        attribution,
      ]),
    });
    
    const updateHash = () => {
      if (isUpdatingFromHash.current) {
        isUpdatingFromHash.current = false;
        return;
      }
      if (!mapInstance.current) return;
      const view = mapInstance.current.getView();
      const center = toLonLat(view.getCenter()!);
      const zoom = view.getZoom();
      const newHash = `#map=${zoom?.toFixed(2)}/${center[1].toFixed(4)}/${center[0].toFixed(4)}`;
      // Use replaceState to avoid adding to browser history
      window.history.replaceState(null, '', newHash);
    };

    mapInstance.current.on('moveend', updateHash);
    window.addEventListener('hashchange', updateViewFromHash);

    const dragAndDropInteraction = new DragAndDrop({
      formatConstructors: [
        new GeoJSON({
          featureProjection: 'EPSG:3857',
          dataProjection: 'EPSG:4326',
        })
      ],
    });

    dragAndDropInteraction.on('addfeatures', (event: DragAndDropEvent) => {
      const droppedFeatures = event.features;
      if (!droppedFeatures) return;
      
      const newFeaturesWithId = droppedFeatures.map((f, i) => {
        if (!f.getId()) {
          f.setId(`dropped_feature_${Date.now()}_${i}`);
        }
        return f;
      })

      setFeatures(prev => [...prev, ...newFeaturesWithId]);
    });
    mapInstance.current.addInteraction(dragAndDropInteraction);

    modifyInteraction.current = new Modify({ 
      source: vectorSource.current ,
    });
    mapInstance.current.addInteraction(modifyInteraction.current);
    modifyInteraction.current.on('modifyend', (e: ModifyEvent) => {
        setFeatures(prev => [...prev]);
    });
    modifyInteraction.current.setActive(false);

    selectInteraction.current = new Select({ 
      style: styleFunction,
      hitTolerance: 5,
    });
    mapInstance.current.addInteraction(selectInteraction.current);

    selectInteraction.current.on('select', (e: SelectEvent) => {
      if (e.selected.length > 0) {
        onFeatureSelect(e.selected[0]);
        setIsPopupOpen(true);
      } else {
        onFeatureSelect(null);
        setIsPopupOpen(false);
      }
    });

    const handleDelete = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedFeature) {
        const selectedFeatures = selectInteraction.current?.getFeatures();
        if (selectedFeatures && selectedFeatures.getLength() > 0) {
          const idsToRemove = selectedFeatures.getArray().map(f => f.getId());
          idsToRemove.forEach(id => onDeleteFeature(id));
          selectedFeatures.clear();
          onFeatureSelect(null);
          setIsPopupOpen(false);
        }
      }
    };
    document.addEventListener('keydown', handleDelete);

    return () => {
      document.removeEventListener('keydown', handleDelete);
      window.removeEventListener('hashchange', updateViewFromHash);
      if (mapInstance.current) {
        mapInstance.current.dispose();
        mapInstance.current = null;
      }
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
      const isDrawing = drawType && ['Point', 'LineString', 'Polygon', 'Rectangle', 'Circle'].includes(drawType);
      selectInteraction.current.setActive(!isDrawing);
    }
  
    if (modifyInteraction.current) {
      modifyInteraction.current.setActive(drawType === 'Edit');
    }
  
    if (drawType && ['Point', 'LineString', 'Polygon', 'Rectangle', 'Circle'].includes(drawType)) {
      selectInteraction.current?.getFeatures().clear();
      onFeatureSelect(null);
      setIsPopupOpen(false);
      
      const drawOptions: any = {
        source: vectorSource.current,
      };

      if (drawType === 'Rectangle') {
        drawOptions.type = 'Circle';
        drawOptions.geometryFunction = createBox();
      } else {
        drawOptions.type = drawType as 'Point' | 'LineString' | 'Polygon' | 'Circle';
      }

      drawInteraction.current = new Draw(drawOptions);
  
      drawInteraction.current.on('drawend', (e: DrawEvent) => {
        const newFeature = e.feature;
        const id = `${drawType}_${Date.now()}`;
        newFeature.setId(id);
        
        const finalDrawType = drawType === 'Rectangle' ? 'Polygon' : drawType;
        newFeature.set('name', `New ${finalDrawType}`);
        newFeature.set('description', '');
  
        setFeatures((prev) => [...prev, newFeature]);
        setDrawType(null); // This will trigger the useEffect again, re-enabling select
        onFeatureSelect(newFeature); // Select the feature to show the dialog
        setIsPopupOpen(true);
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
    
    // Force a re-render of the vector layer to apply new styles
    source.changed();

  }, [features]);
  
  useEffect(() => {
      const overlay = mapInstance.current?.getOverlays().getArray()[0];
      if (isPopupOpen && selectedFeature && overlay) {
        const geometry = selectedFeature.getGeometry() as any; // Use any to access methods
        if(geometry) {
            const geometryType = geometry.getType();
            if (geometryType === 'Polygon' || geometryType === 'MultiPolygon') {
              overlay.setPosition(geometry.getInteriorPoint().getCoordinates());
            } else if (geometryType === 'LineString' || geometryType === 'MultiLineString') {
               overlay.setPosition(geometry.getCoordinateAt(0.5));
            } else if (geometryType === 'Circle') {
              overlay.setPosition(geometry.getCenter());
            } else { // Point or MultiPoint
              overlay.setPosition(geometry.getCoordinates());
            }
        }
      } else {
        overlay?.setPosition(undefined);
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFeature, isPopupOpen]);
  
  const handlePopupClose = () => {
    setIsPopupOpen(false);
    selectInteraction.current?.getFeatures().clear();
    onFeatureSelect(null);
  }

  const handleDeleteAndClose = (featureId: string | number | undefined) => {
    handlePopupClose();
    onDeleteFeature(featureId);
  }

  const handleToggle3d = () => {
    // For now, just a placeholder.
    const newIs3d = !is3d;
    setIs3d(newIs3d);
    if (newIs3d) {
        toast({
            title: "3D mode is under development.",
            duration: 3000,
        });
    }
  }

  return (
    <div ref={mapRef} className="w-full h-full relative">
      <DrawingTools map={mapInstance.current} drawType={drawType} setDrawType={setDrawType} featuresCount={features.length} tileLayer={tileLayer} is3d={is3d} onToggle3d={handleToggle3d} />
      <div ref={popupRef} className="ol-popup">
       {isPopupOpen && selectedFeature && (
         <FeaturePropertiesPopup
           feature={selectedFeature}
           onDelete={handleDeleteAndClose}
           onPropertyChange={onFeaturePropertyChange}
           onOpenChange={handlePopupClose}
         >
           {/* This is a dummy trigger, the popover is controlled programmatically */}
           <div></div>
         </FeaturePropertiesPopup>
       )}
      </div>
    </div>
  );
}
