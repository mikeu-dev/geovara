import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import { Draw, Modify, Select, DragAndDrop, Snap } from 'ol/interaction';
import { createBox } from 'ol/interaction/Draw';
import GeoJSON from 'ol/format/GeoJSON';
import KML from 'ol/format/KML';
import { topoJsonDragFormat } from '@/lib/ol-topojson-drag-format';
import { fromLonLat, toLonLat, transform, transformExtent } from 'ol/proj';
import { Feature } from 'ol';
import type { Geometry } from 'ol/geom';
import { createEmpty, extend, isEmpty } from 'ol/extent';
import { DrawEvent } from 'ol/interaction/Draw';
import { SelectEvent } from 'ol/interaction/Select';
import { DragAndDropEvent } from 'ol/interaction/DragAndDrop';
import { Zoom, Attribution, ScaleLine, defaults as defaultControls } from 'ol/control';
import { Style } from 'ol/style';
import type { StyleLike } from 'ol/style/Style';
import type { Type } from 'ol/geom/Geometry';
import { splitPolygonByLine } from '@/lib/spatial-operations';

export type DrawType =
  | 'Point'
  | 'LineString'
  | 'Polygon'
  | 'Rectangle'
  | 'Circle'
  | 'Edit'
  | 'Delete'
  | 'MeasureDistance'
  | 'MeasureArea'
  | 'Slice';

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
  enableSnapping?: boolean;
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
  enableSnapping = true,
}: UseMapOptions) {
  const [map, setMap] = useState<Map | null>(null);
  const mapInstance = useRef<Map | null>(null);

  // Use state for stable OL objects to avoid Ref-access-during-render errors
  const [vectorSource] = useState(() => new VectorSource<Feature<Geometry>>());
  const [tileLayer] = useState(
    () =>
      new TileLayer({
        className: 'ol-layer geovara-basemap',
        source: new OSM({ crossOrigin: 'anonymous' }),
      })
  );
  const [selectInteraction] = useState(() => new Select({ hitTolerance: 5 }));
  const [modifyInteraction] = useState(() => new Modify({ source: vectorSource }));

  const vectorLayerRef = useRef<VectorLayer<Feature<Geometry>> | null>(null);
  const drawInteraction = useRef<Draw | null>(null);
  const snapInteraction = useRef<Snap | null>(null);
  const isUpdatingFromHash = useRef(false);

  const updateViewFromHash = useCallback(() => {
    const activeMap = mapInstance.current;
    if (!activeMap) return;
    const hash = window.location.hash
      .substring(1)
      .split('&')
      .find((p) => p.startsWith('map='));
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

    const vectorLayer = new VectorLayer({
      source: vectorSource,
      style: styleFunction as StyleLike,
      opacity: vectorOpacity,
      visible: vectorVisible,
    });
    vectorLayerRef.current = vectorLayer;

    // Default initial center & zoom focused on Indonesia Archipelago
    const INDONESIA_CENTER_LONLAT: [number, number] = [118.0148634, -2.548926];
    const INDONESIA_DEFAULT_ZOOM = 5;

    let center = fromLonLat(INDONESIA_CENTER_LONLAT);
    let zoom = INDONESIA_DEFAULT_ZOOM;
    const initialHash = window.location.hash
      .substring(1)
      .split('&')
      .find((p) => p.startsWith('map='));
    if (initialHash) {
      const parts = initialHash.substring(4).split('/');
      if (parts.length === 3) {
        zoom = parseFloat(parts[0]) || INDONESIA_DEFAULT_ZOOM;
        center = fromLonLat([parseFloat(parts[2]), parseFloat(parts[1])]) || center;
      }
    }

    const newMap = new Map({
      target: target.current,
      layers: [tileLayer, vectorLayer],
      view: new View({ center, zoom }),
      controls: defaultControls({ zoom: false, rotate: false, attribution: false }).extend([
        new Zoom(),
        new Attribution({ collapsible: true }),
        new ScaleLine({ units: 'metric' }),
      ]),
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
      const otherParts = currentHashValue.split('&').filter((p) => !p.startsWith('map='));
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
      if (dropped && dropped.length > 0) {
        dropped.forEach((f, i) => {
          if (!f.getId()) f.setId(`dropped_${Date.now()}_${i}`);
        });
        setFeatures((prev) => [...prev, ...dropped]);

        const extent = createEmpty();
        dropped.forEach((f) => {
          const geom = f.getGeometry();
          if (geom) extend(extent, geom.getExtent());
        });
        if (!isEmpty(extent) && isFinite(extent[0])) {
          newMap.getView().fit(extent, {
            duration: 1000,
            padding: [60, 60, 60, 60],
            maxZoom: 18,
          });
        }
      }
    });
    newMap.addInteraction(dragAndDrop);

    newMap.addInteraction(selectInteraction);
    selectInteraction.on('select', (event: SelectEvent) => {
      onFeatureSelect(event.selected[0] || null);
    });

    newMap.addInteraction(modifyInteraction);
    modifyInteraction.on('modifyend', () => setFeatures((prev) => [...prev]));

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

    const handleFitBounds = (event?: Event) => {
      const customEvent = event as CustomEvent<{
        extent?: [number, number, number, number];
        features?: Feature<Geometry>[];
        padding?: [number, number, number, number];
        duration?: number;
        maxZoom?: number;
      }> | undefined;

      const activeMap = mapInstance.current;
      if (!activeMap) return;
      const view = activeMap.getView();
      if (!view) return;

      const padding = customEvent?.detail?.padding ?? [60, 60, 60, 60];
      const duration = customEvent?.detail?.duration ?? 1000;
      const maxZoom = customEvent?.detail?.maxZoom ?? 18;

      let targetExtent: [number, number, number, number] | null = null;

      if (customEvent?.detail?.extent) {
        targetExtent = customEvent.detail.extent;
      } else if (customEvent?.detail?.features && customEvent.detail.features.length > 0) {
        const extent = createEmpty();
        customEvent.detail.features.forEach((f) => {
          const geom = f.getGeometry();
          if (geom) extend(extent, geom.getExtent());
        });
        if (!isEmpty(extent) && isFinite(extent[0])) {
          targetExtent = extent as [number, number, number, number];
        }
      } else {
        const extent = vectorSource.getExtent();
        if (extent && !isEmpty(extent) && isFinite(extent[0])) {
          targetExtent = extent as [number, number, number, number];
        }
      }

      if (targetExtent) {
        view.fit(targetExtent, { duration, padding, maxZoom });
      } else {
        // Fallback in case features are still populating vectorSource in the next microtask
        setTimeout(() => {
          const fallbackExtent = vectorSource.getExtent();
          if (fallbackExtent && !isEmpty(fallbackExtent) && isFinite(fallbackExtent[0])) {
            view.fit(fallbackExtent, { duration, padding, maxZoom });
          }
        }, 120);
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
            maxZoom: 19,
          });
          break;
        case 'topo':
        case 'topographic':
          source = new XYZ({
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
            maxZoom: 19,
          });
          break;
        case 'dark':
        case 'night':
          source = new XYZ({
            url: 'https://{a-c}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
            attributions: '© <a href="https:// carto.com/attributions">CARTO</a>',
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
    window.addEventListener('map:fitbounds', handleFitBounds);
    window.addEventListener('map:setbasemap', handleBasemap);

    return () => {
      window.removeEventListener('map:flyto', handleFlyTo);
      window.removeEventListener('map:fitbounds', handleFitBounds);
      window.removeEventListener('map:setbasemap', handleBasemap);
      window.removeEventListener('hashchange', updateViewFromHash);
      if (mapInstance.current) {
        mapInstance.current.dispose();
        mapInstance.current = null;
        setMap(null);
      }
    };
  }, [
    target,
    styleFunction,
    vectorOpacity,
    vectorVisible,
    updateViewFromHash,
    onFeatureSelect,
    setFeatures,
    vectorSource,
    tileLayer,
    selectInteraction,
    modifyInteraction,
  ]);

  useEffect(() => {
    const activeMap = map;
    if (!activeMap) return;
    activeMap.getLayers().forEach((layer) => {
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
    const activeMap = mapInstance.current;
    if (!activeMap) return;

    if (drawInteraction.current) {
      activeMap.removeInteraction(drawInteraction.current);
      drawInteraction.current = null;
    }

    if (snapInteraction.current) {
      activeMap.removeInteraction(snapInteraction.current);
      snapInteraction.current = null;
    }

    const isDrawing =
      drawType && ['Point', 'LineString', 'Polygon', 'Rectangle', 'Circle', 'Slice'].includes(drawType);
    selectInteraction.setActive(!isDrawing);
    modifyInteraction.setActive(drawType === 'Edit');

    if (isDrawing) {
      const type = (drawType === 'Rectangle' ? 'Circle' : drawType === 'Slice' ? 'LineString' : drawType) as Type;
      const geometryFunction = drawType === 'Rectangle' ? createBox() : undefined;

      drawInteraction.current = new Draw({
        source: drawType === 'Slice' ? undefined : vectorSource,
        type,
        geometryFunction,
      });

      drawInteraction.current.on('drawend', (event: DrawEvent) => {
        const feature = event.feature;

        if (drawType === 'Slice') {
          try {
            const format = new GeoJSON({ featureProjection: 'EPSG:3857', dataProjection: 'EPSG:4326' });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const lineGeojson = format.writeFeatureObject(feature) as any;
            const allOlFeatures = vectorSource.getFeatures();
            let didSplit = false;

            allOlFeatures.forEach((olFeat) => {
              const geomType = olFeat.getGeometry()?.getType();
              if (geomType === 'Polygon' || geomType === 'MultiPolygon') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const polyGeojson = format.writeFeatureObject(olFeat) as any;
                const parts = splitPolygonByLine(polyGeojson, lineGeojson);
                if (parts.length > 1) {
                  didSplit = true;
                  vectorSource.removeFeature(olFeat);
                  parts.forEach((p, idx) => {
                    const newFeat = format.readFeature(p) as Feature<Geometry>;
                    newFeat.setId(`${olFeat.getId() || 'split'}_${idx + 1}`);
                    vectorSource.addFeature(newFeat);
                  });
                }
              }
            });

            if (didSplit) {
              setFeatures(vectorSource.getFeatures());
            }
          } catch (err) {
            console.error('Error slicing polygon:', err);
          }
          setTimeout(() => setDrawType(null), 0);
          return;
        }

        feature.setId(`${drawType}_${Date.now()}`);
        setFeatures((prev) => [...prev, feature]);
        setTimeout(() => setDrawType(null), 0);
        onFeatureSelect(feature);
      });

      activeMap.addInteraction(drawInteraction.current);
    }

    // Attach Snap interaction if snapping is enabled and user is drawing or editing
    if (enableSnapping && (isDrawing || drawType === 'Edit')) {
      snapInteraction.current = new Snap({
        source: vectorSource,
        pixelTolerance: 12,
      });
      activeMap.addInteraction(snapInteraction.current);
    }
  }, [
    drawType,
    enableSnapping,
    setFeatures,
    setDrawType,
    onFeatureSelect,
    vectorSource,
    selectInteraction,
    modifyInteraction,
  ]);

  useEffect(() => {
    const source = vectorSource;
    if (!source) return;

    const featuresInStateIds = features.map((f) => f.getId());

    source.getFeatures().forEach((f) => {
      const id = f.getId();
      if (id !== undefined && !featuresInStateIds.includes(id)) {
        source.removeFeature(f);
      }
    });

    features.forEach((f) => {
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

      activeMap.setView(
        new View({
          projection,
          center: newCenter,
          zoom: zoom || 2,
        })
      );
    }
  }, [projection]);

  const result = useMemo(
    () => ({
      map,
      vectorSource,
      tileLayer,
      selectInteraction,
    }),
    [map, vectorSource, tileLayer, selectInteraction]
  );

  return result;
}
