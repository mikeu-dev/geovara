'use client';

import { useEffect, useRef } from 'react';
import { Map, MapBrowserEvent, Overlay } from 'ol';
import { Draw } from 'ol/interaction';
import { DrawEvent } from 'ol/interaction/Draw';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import { LineString, Polygon } from 'ol/geom';
import { getArea, getLength } from 'ol/sphere';
import { unByKey } from 'ol/Observable';
import { EventsKey } from 'ol/events';
import { Style, Fill, Stroke, Circle as CircleStyle } from 'ol/style';

interface MeasurementControllerProps {
  map: Map | null;
  activeType: 'MeasureDistance' | 'MeasureArea' | null;
}

export default function MeasurementController({ map, activeType }: MeasurementControllerProps) {
  const drawRef = useRef<Draw | null>(null);
  const helpTooltipElement = useRef<HTMLDivElement | null>(null);
  const helpTooltip = useRef<Overlay | null>(null);
  const measureTooltipElement = useRef<HTMLDivElement | null>(null);
  const measureTooltip = useRef<Overlay | null>(null);
  const vectorSource = useRef(new VectorSource());

  useEffect(() => {
    if (!map) return;

    const vectorLayer = new VectorLayer({
      source: vectorSource.current,
      style: new Style({
        fill: new Fill({ color: 'rgba(255, 255, 255, 0.2)' }),
        stroke: new Stroke({ color: '#ffcc33', width: 2 }),
        image: new CircleStyle({ radius: 7, fill: new Fill({ color: '#ffcc33' }) }),
      }),
    });
    map.addLayer(vectorLayer);

    return () => {
      if (map) {
        map.removeLayer(vectorLayer);
        if (drawRef.current) map.removeInteraction(drawRef.current);
      }
    };
  }, [map]);

  useEffect(() => {
    if (!map || !activeType) {
      if (map && drawRef.current) map.removeInteraction(drawRef.current);
      if (map && helpTooltip.current) map.removeOverlay(helpTooltip.current);
      return;
    }

    const type = activeType === 'MeasureArea' ? 'Polygon' : 'LineString';
    const draw = new Draw({
      source: vectorSource.current,
      type: type,
      style: new Style({
        fill: new Fill({ color: 'rgba(255, 255, 255, 0.2)' }),
        stroke: new Stroke({ color: 'rgba(0, 0, 0, 0.5)', lineDash: [10, 10], width: 2 }),
        image: new CircleStyle({
          radius: 5,
          stroke: new Stroke({ color: 'rgba(0, 0, 0, 0.7)' }),
          fill: new Fill({ color: 'rgba(255, 255, 255, 0.2)' }),
        }),
      }),
    });
    map.addInteraction(draw);
    drawRef.current = draw;

    createMeasureTooltip();
    createHelpTooltip();

    let listener: EventsKey;
    draw.on('drawstart', (evt: DrawEvent) => {
      const sketch = evt.feature;
      const geometry = sketch.getGeometry();
      // @ts-expect-error: DrawEvent from ol may not expose coordinate in TS types
      let tooltipCoord = evt.coordinate;

      if (geometry) {
        listener = geometry.on('change', (e) => {
          const geom = e.target;
          let output;
          if (geom instanceof Polygon) {
            output = formatArea(geom);
            tooltipCoord = geom.getInteriorPoint().getCoordinates();
          } else if (geom instanceof LineString) {
            output = formatLength(geom);
            tooltipCoord = geom.getLastCoordinate();
          }
          if (measureTooltipElement.current) {
            measureTooltipElement.current.innerHTML = output || '';
          }
          measureTooltip.current?.setPosition(tooltipCoord);
        });
      }
    });

    draw.on('drawend', () => {
      if (measureTooltipElement.current) {
        measureTooltipElement.current.className = 'ol-tooltip ol-tooltip-static';
      }
      measureTooltip.current?.setOffset([0, -7]);
      // reset for next
      measureTooltipElement.current = null;
      createMeasureTooltip();
      unByKey(listener);
    });

    const pointerMoveHandler = (evt: MapBrowserEvent<PointerEvent>) => {
      if (evt.dragging) return;
      let helpMsg = 'Click to start measuring';
      if (drawRef.current) {
          helpMsg = 'Click to continue drawing';
      }
      if (helpTooltipElement.current) {
        helpTooltipElement.current.innerHTML = helpMsg;
      }
      helpTooltip.current?.setPosition(evt.coordinate);
      helpTooltipElement.current?.classList.remove('hidden');
    };

    map.on('pointermove', pointerMoveHandler);
    map.getViewport().addEventListener('mouseout', () => {
       helpTooltipElement.current?.classList.add('hidden');
    });

    return () => {
      map.removeInteraction(draw);
      map.removeOverlay(helpTooltip.current!);
      map.un('pointermove', pointerMoveHandler);
    };

    // Helper functions inside useEffect to avoid complexity
    function createHelpTooltip() {
      if (!map) return;
      if (helpTooltipElement.current) {
        helpTooltipElement.current.parentNode?.removeChild(helpTooltipElement.current);
      }
      helpTooltipElement.current = document.createElement('div');
      helpTooltipElement.current.className = 'ol-tooltip hidden';
      helpTooltip.current = new Overlay({
        element: helpTooltipElement.current,
        offset: [15, 0],
        positioning: 'center-left',
      });
      map.addOverlay(helpTooltip.current);
    }

    function createMeasureTooltip() {
      if (!map) return;
      if (measureTooltipElement.current) {
        measureTooltipElement.current.parentNode?.removeChild(measureTooltipElement.current);
      }
      measureTooltipElement.current = document.createElement('div');
      measureTooltipElement.current.className = 'ol-tooltip ol-tooltip-measure';
      measureTooltip.current = new Overlay({
        element: measureTooltipElement.current,
        offset: [0, -15],
        positioning: 'bottom-center',
        stopEvent: false,
        insertFirst: false,
      });
      map.addOverlay(measureTooltip.current);
    }

    function formatLength(line: LineString) {
      const length = getLength(line);
      let output;
      if (length > 100) {
        output = Math.round((length / 1000) * 100) / 100 + ' ' + 'km';
      } else {
        output = Math.round(length * 100) / 100 + ' ' + 'm';
      }
      return output;
    }

    function formatArea(polygon: Polygon) {
      const area = getArea(polygon);
      let output;
      if (area > 10000) {
        output = Math.round((area / 1000000) * 100) / 100 + ' ' + 'km²';
      } else {
        output = Math.round(area * 100) / 100 + ' ' + 'm²';
      }
      return output;
    }
  }, [map, activeType]);

  return null;
}
