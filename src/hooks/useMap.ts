import { useEffect, useRef, useCallback } from 'react';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';
import VectorImageLayer from 'ol/layer/VectorImage';
import { Draw, Modify, Select, DragAndDrop } from 'ol/interaction';
import { createBox } from 'ol/interaction/Draw';
import GeoJSON from 'ol/format/GeoJSON';
import { fromLonLat, toLonLat } from 'ol/proj';
import { Feature } from 'ol';
import type { Geometry } from 'ol/geom';
import { DrawEvent } from 'ol/interaction/Draw';
import { SelectEvent } from 'ol/interaction/Select';
import { ModifyEvent } from 'ol/interaction/Modify';
import { DragAndDropEvent } from 'ol/interaction/DragAndDrop';

export type DrawType = 'Point' | 'LineString' | 'Polygon' | 'Rectangle' | 'Circle' | 'Edit' | 'Delete';

interface UseMapOptions {
  target: React.RefObject<HTMLDivElement | null>;
  features: Feature<Geometry>[];
  setFeatures: (features: React.SetStateAction<Feature<Geometry>[]>) => void;
  drawType: DrawType | null;
  setDrawType: (type: DrawType | null) => void;
  onFeatureSelect: (feature: Feature<Geometry> | null) => void;
  onDeleteFeature: (id: string | number | undefined) => void;
  styleFunction: (feature: Feature<Geometry>) => any;
  projection: 'EPSG:4326' | 'EPSG:3857';
}

export function useMap({
  target,
  features,
  setFeatures,
  drawType,
  setDrawType,
  onFeatureSelect,
  onDeleteFeature,
  styleFunction,
  projection,
}: UseMapOptions) {
  const mapInstance = useRef<Map | null>(null);
  const vectorSource = useRef(new VectorSource());
  const tileLayer = useRef(new TileLayer({ source: new OSM() }));
  const drawInteraction = useRef<Draw | null>(null);
  const selectInteraction = useRef<Select | null>(null);
  const modifyInteraction = useRef<Modify | null>(null);
  const isUpdatingFromHash = useRef(false);

  // View Sync Logic
  const updateViewFromHash = useCallback(() => {
    if (!mapInstance.current) return;
    const hash = window.location.hash.substring(1).split('&').find(p => p.startsWith('map='));
    if (!hash) return;

    const parts = hash.substring(4).split('/');
    if (parts.length === 3) {
      const zoom = parseFloat(parts[0]);
      const lat = parseFloat(parts[1]);
      const lon = parseFloat(parts[2]);
      if (!isNaN(zoom) && !isNaN(lat) && !isNaN(lon)) {
        const view = mapInstance.current.getView();
        isUpdatingFromHash.current = true;
        view.setCenter(fromLonLat([lon, lat]));
        view.setZoom(zoom);
      }
    }
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!target.current || mapInstance.current) return;

    const vectorLayer = new VectorImageLayer({
      source: vectorSource.current,
      style: styleFunction as any,
      imageRatio: 2,
    });

    // Initial view from hash
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

    const map = new Map({
      target: target.current,
      layers: [
        tileLayer.current,
        vectorLayer,
      ],
      view: new View({ center, zoom }),
    });

    mapInstance.current = map;

    // View Hash Sync
    const updateHash = () => {
      if (isUpdatingFromHash.current) {
        isUpdatingFromHash.current = false;
        return;
      }
      const view = map.getView();
      const c = toLonLat(view.getCenter()!);
      const z = view.getZoom();
      const mapHash = `map=${z?.toFixed(2)}/${c[1].toFixed(4)}/${c[0].toFixed(4)}`;
      
      const currentHash = window.location.hash.substring(1);
      const otherParts = currentHash.split('&').filter(p => !p.startsWith('map='));
      const newHash = [...otherParts, mapHash].join('&');
      window.history.replaceState(null, '', `#${newHash}`);
    };

    map.on('moveend', updateHash);
    window.addEventListener('hashchange', updateViewFromHash);

    // Drag and Drop
    const dragAndDrop = new DragAndDrop({
      formatConstructors: [new GeoJSON({ featureProjection: 'EPSG:3857' })],
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
    map.addInteraction(dragAndDrop);

    // Select
    selectInteraction.current = new Select({ 
        style: styleFunction as any,
        hitTolerance: 5 
    });
    map.addInteraction(selectInteraction.current);
    selectInteraction.current.on('select', (e: SelectEvent) => {
      onFeatureSelect(e.selected[0] || null);
    });

    // Modify
    modifyInteraction.current = new Modify({ source: vectorSource.current });
    map.addInteraction(modifyInteraction.current);
    modifyInteraction.current.on('modifyend', () => setFeatures(prev => [...prev]));

    return () => {
      window.removeEventListener('hashchange', updateViewFromHash);
      if (mapInstance.current) {
        mapInstance.current.dispose();
        mapInstance.current = null;
      }
    };
  }, []);

  // Sync Interactions with DrawType
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    if (drawInteraction.current) {
      map.removeInteraction(drawInteraction.current);
      drawInteraction.current = null;
    }

    const isDrawing = drawType && ['Point', 'LineString', 'Polygon', 'Rectangle', 'Circle'].includes(drawType);
    selectInteraction.current?.setActive(!isDrawing);
    modifyInteraction.current?.setActive(drawType === 'Edit');

    if (isDrawing) {
      const type = drawType === 'Rectangle' ? 'Circle' : (drawType as any);
      const geometryFunction = drawType === 'Rectangle' ? createBox() : undefined;

      drawInteraction.current = new Draw({
        source: vectorSource.current,
        type,
        geometryFunction,
      });

      drawInteraction.current.on('drawend', (e: DrawEvent) => {
        const feature = e.feature;
        feature.setId(`${drawType}_${Date.now()}`);
        setFeatures(prev => [...prev, feature]);
        setTimeout(() => setDrawType(null), 0); // Async to avoid loop
        onFeatureSelect(feature);
      });

      map.addInteraction(drawInteraction.current);
    }
  }, [drawType]);

  // Sync Features
  useEffect(() => {
    const source = vectorSource.current;
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
  }, [features]);

  // Sync View Projection
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    
    const currentProj = map.getView().getProjection().getCode();
    if (currentProj !== projection) {
       const center = map.getView().getCenter();
       const zoom = map.getView().getZoom();
       
       map.setView(new View({
         projection,
         center: center ? center : [0, 0], // OL handles reprojection of center if possible, but simpler to just reset
         zoom: zoom || 2,
       }));
    }
  }, [projection]);

  return {
    map: mapInstance.current,
    vectorSource: vectorSource.current,
    tileLayer: tileLayer.current,
    selectInteraction: selectInteraction.current,
  };
}
