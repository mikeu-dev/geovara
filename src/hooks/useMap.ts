import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import VectorSource from 'ol/source/Vector';
import VectorImageLayer from 'ol/layer/VectorImage';
import { Draw, Modify, Select, DragAndDrop } from 'ol/interaction';
import { createBox } from 'ol/interaction/Draw';
import GeoJSON from 'ol/format/GeoJSON';
import KML from 'ol/format/KML';
import { topoJsonDragFormat } from '@/lib/ol-topojson-drag-format';
import { fromLonLat, toLonLat, transform, transformExtent } from 'ol/proj';
import { Feature } from 'ol';
import type { Geometry } from 'ol/geom';
import { DrawEvent } from 'ol/interaction/Draw';
import { SelectEvent } from 'ol/interaction/Select';
import { DragAndDropEvent } from 'ol/interaction/DragAndDrop';
import { Zoom, Attribution, ScaleLine, defaults as defaultControls } from 'ol/control';
import { Style } from 'ol/style';
import type { StyleLike } from 'ol/style/Style';
import type { Type } from 'ol/geom/Geometry';

export type DrawType = 'Point' | 'LineString' | 'Polygon' | 'Rectangle' | 'Circle' | 'Edit' | 'Delete' | 'MeasureDistance' | 'MeasureArea';

interface UseMapOptions {
  target: React.RefObject<HTMLDivElement | null>;
  features: Feature<Geometry>[];
  setFeatures: (features: React.SetStateAction<Feature<Geometry>[]>) => void;
  drawType: DrawType | null;
  setDrawType: (type: DrawType | null) => void;
  onFeatureSelect: (feature: Feature<Geometry> | null) => void;
  styleFunction: (feature: Feature<Geometry>) => Style | Style[] | undefined;
  projection: 'EPSG:4326' | 'EPSG:3857';
  vectorOpacity: number;
  vectorVisible: boolean;
  basemapOpacity: number;
}

export function useMap({
  target,
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
}: UseMapOptions) {
  const [map, setMap] = useState<Map | null>(null);
  const mapInstance = useRef<Map | null>(null);
  
  // Use state for stable OL objects to avoid Ref-access-during-render errors
  const [vectorSource] = useState(() => new VectorSource<Feature<Geometry>>());
  const [tileLayer] = useState(() => new TileLayer({ source: new OSM() }));
  const [selectInteraction] = useState(() => new Select({ hitTolerance: 5 }));
  const [modifyInteraction] = useState(() => new Modify({ source: vectorSource }));
  
  const vectorLayerRef = useRef<VectorImageLayer<Feature<Geometry>> | null>(null);
  const drawInteraction = useRef<Draw | null>(null);
  const isUpdatingFromHash = useRef(false);

  const updateViewFromHash = useCallback(() => {
    const activeMap = mapInstance.current;
    if (!activeMap) return;
    const hash = window.location.hash.substring(1).split('&').find(p => p.startsWith('map='));
    if (!hash) return;

    const parts = hash.substring(4).split('/');
    if (parts.length === 3) {
      const zoom = parseFloat(parts[0]);
      const lat = parseFloat(parts[1]);
      const lon = parseFloat(parts[2]);
      if (!isNaN(zoom) && !isNaN(lat) && !isNaN(lon)) {
        const view = activeMap.getView();
        isUpdatingFromHash.current = true;
        view.setCenter(fromLonLat([lon, lat]));
        view.setZoom(zoom);
      }
    }
  }, []);

  useEffect(() => {
    if (!target.current || mapInstance.current) return;

    const vectorLayer = new VectorImageLayer({
      source: vectorSource,
      style: styleFunction as StyleLike,
      imageRatio: 2,
      opacity: vectorOpacity,
      visible: vectorVisible,
    });
    vectorLayerRef.current = vectorLayer;

    let center = fromLonLat([0, 0]);
    let zoom = 2;
    const initialHash = window.location.hash.substring(1).split('&').find(p => p.startsWith('map='));
    if (initialHash) {
        const parts = initialHash.substring(4).split('/');
        if (parts.length === 3) {
            zoom = parseFloat(parts[0]) || 2;
            center = fromLonLat([parseFloat(parts[2]), parseFloat(parts[1])]) || center;
        }
    }

    const newMap = new Map({
      target: target.current,
      layers: [
        tileLayer,
        vectorLayer,
      ],
      view: new View({ center, zoom }),
      controls: defaultControls({ zoom: false, rotate: false, attribution: false }).extend([
        new Zoom(),
        new Attribution({ collapsible: true }),
        new ScaleLine({ units: 'metric' })
      ])
    });

    mapInstance.current = newMap;
    // Non-blocking state update to satisfy React 18 / Hydration rules
    setTimeout(() => {
      setMap(newMap);
    }, 0);

    const updateHash = () => {
      if (isUpdatingFromHash.current) {
        isUpdatingFromHash.current = false;
        return;
      }
      const view = newMap.getView();
      const centerCoord = view.getCenter();
      if (!centerCoord) return;
      
      const c = toLonLat(centerCoord);
      const z = view.getZoom();
      const mapHash = `map=${z?.toFixed(2)}/${c[1].toFixed(4)}/${c[0].toFixed(4)}`;
      
      const currentHashValue = window.location.hash.substring(1);
      const otherParts = currentHashValue.split('&').filter(p => !p.startsWith('map='));
      const newHashValue = [...otherParts, mapHash].join('&');
      window.history.replaceState(null, '', `#${newHashValue}`);
    };

    newMap.on('moveend', updateHash);
    window.addEventListener('hashchange', updateViewFromHash);

    const dragAndDrop = new DragAndDrop({
      formatConstructors: [
        topoJsonDragFormat,
        new GeoJSON({ featureProjection: 'EPSG:3857' }),
        new KML({ extractStyles: true, showPointNames: true }),
      ],
    });
    dragAndDrop.on('addfeatures', (event: DragAndDropEvent) => {
      const dropped = event.features as Feature<Geometry>[];
      if (dropped) {
        dropped.forEach((f, i) => {
          if (!f.getId()) f.setId(`dropped_${Date.now()}_${i}`);
        });
        setFeatures(prev => [...prev, ...dropped]);
      }
    });
    newMap.addInteraction(dragAndDrop);

    newMap.addInteraction(selectInteraction);
    selectInteraction.on('select', (event: SelectEvent) => {
      onFeatureSelect(event.selected[0] || null);
    });

    newMap.addInteraction(modifyInteraction);
    modifyInteraction.on('modifyend', () => setFeatures(prev => [...prev]));
    
    const handleFlyTo = (event: Event) => {
      const customEvent = event as CustomEvent<{ 
        lon?: number; 
        lat?: number; 
        boundingbox?: string[];
      }>;
      const { lon, lat, boundingbox } = customEvent.detail;
      const view = newMap.getView();
      if (boundingbox) {
        const [minLat, maxLat, minLon, maxLon] = boundingbox.map(parseFloat);
        const extent = transformExtent([minLon, minLat, maxLon, maxLat], 'EPSG:4326', 'EPSG:3857');
        view.fit(extent, { duration: 1000, padding: [50, 50, 50, 50] });
      } else if (lon !== undefined && lat !== undefined) {
        view.animate({ center: fromLonLat([lon, lat]), zoom: 16, duration: 1000 });
      }
    };

    const handleBasemap = (event: Event) => {
      const customEvent = event as CustomEvent<{ basemap: string }>;
      const { basemap: basemapType } = customEvent.detail;
      let source;
      switch (basemapType.toLowerCase()) {
        case 'satellite':
        case 'imagery':
          source = new XYZ({
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            maxZoom: 19
          });
          break;
        case 'topo':
        case 'topographic':
          source = new XYZ({
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
            maxZoom: 19
          });
          break;
        case 'dark':
        case 'night':
          source = new XYZ({
            url: 'https://{a-c}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
            attributions: '© <a href="https:// carto.com/attributions">CARTO</a>'
          });
          break;
        case 'osm':
        default:
          source = new OSM();
          break;
      }
      tileLayer.setSource(source);
    };

    window.addEventListener('map:flyto', handleFlyTo);
    window.addEventListener('map:setbasemap', handleBasemap);

    return () => {
      window.removeEventListener('map:flyto', handleFlyTo);
      window.removeEventListener('map:setbasemap', handleBasemap);
      window.removeEventListener('hashchange', updateViewFromHash);
      if (mapInstance.current) {
        mapInstance.current.dispose();
        mapInstance.current = null;
        setMap(null);
      }
    };
  }, [target, styleFunction, vectorOpacity, vectorVisible, updateViewFromHash, onFeatureSelect, setFeatures, vectorSource, tileLayer, selectInteraction, modifyInteraction]);

  useEffect(() => {
    const activeMap = map;
    if (!activeMap) return;
    activeMap.getLayers().forEach((layer) => {
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
    const activeMap = mapInstance.current;
    if (!activeMap) return;

    if (drawInteraction.current) {
      activeMap.removeInteraction(drawInteraction.current);
      drawInteraction.current = null;
    }

    const isDrawing = drawType && ['Point', 'LineString', 'Polygon', 'Rectangle', 'Circle'].includes(drawType);
    selectInteraction.setActive(!isDrawing);
    modifyInteraction.setActive(drawType === 'Edit');

    if (isDrawing) {
      const type = (drawType === 'Rectangle' ? 'Circle' : drawType) as Type;
      const geometryFunction = drawType === 'Rectangle' ? createBox() : undefined;

      drawInteraction.current = new Draw({
        source: vectorSource,
        type,
        geometryFunction,
      });

      drawInteraction.current.on('drawend', (event: DrawEvent) => {
        const feature = event.feature;
        feature.setId(`${drawType}_${Date.now()}`);
        setFeatures(prev => [...prev, feature]);
        setTimeout(() => setDrawType(null), 0);
        onFeatureSelect(feature);
      });

      activeMap.addInteraction(drawInteraction.current);
    }
  }, [drawType, setFeatures, setDrawType, onFeatureSelect, vectorSource, selectInteraction, modifyInteraction]);

  useEffect(() => {
    const source = vectorSource;
    if (!source) return;

    const featuresInStateIds = features.map(f => f.getId());
    
    source.getFeatures().forEach(f => {
      const id = f.getId();
      if (id !== undefined && !featuresInStateIds.includes(id)) {
        source.removeFeature(f);
      }
    });

    features.forEach(f => {
      if (f.getId() && !source.getFeatureById(f.getId()!)) {
        source.addFeature(f);
      }
    });

    source.changed();
  }, [features, vectorSource]);

  useEffect(() => {
    const activeMap = mapInstance.current;
    if (!activeMap) return;
    
    const view = activeMap.getView();
    if (!view) return;
    
    const projectionObj = view.getProjection();
    const currentProj = projectionObj ? projectionObj.getCode() : 'EPSG:3857';
    
    if (currentProj !== projection) {
       const center = view.getCenter();
       const zoom = view.getZoom();
       
       const newCenter = center ? transform(center, currentProj, projection) : [0, 0];
       
       activeMap.setView(new View({
         projection,
         center: newCenter,
         zoom: zoom || 2,
       }));
    }
  }, [projection]);

  const result = useMemo(() => ({
    map,
    vectorSource,
    tileLayer,
    selectInteraction,
  }), [map, vectorSource, tileLayer, selectInteraction]);

  return result;
}
