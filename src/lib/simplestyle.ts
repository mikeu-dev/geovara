import type { Feature } from 'ol';
import type { Geometry } from 'ol/geom';
import { Style, Fill, Stroke, Circle as CircleStyle } from 'ol/style';

/**
 * Parses and combines color with an optional opacity (0 to 1).
 * Supports hex (#rgb, #rrggbb), rgb, rgba, and named colors.
 */
export function parseColorWithOpacity(
  color: string | undefined,
  defaultColor: string,
  opacity?: number
): string {
  if (!color) return defaultColor;
  if (opacity === undefined || opacity === null || isNaN(opacity)) return color;

  const clampedOpacity = Math.max(0, Math.min(1, opacity));

  // If already rgba or hsla
  if (color.startsWith('rgba') || color.startsWith('hsla')) {
    return color;
  }

  // If hex code (#rgb, #rrggbb)
  if (color.startsWith('#')) {
    let hex = color.slice(1);
    if (hex.length === 3) {
      hex = hex.split('').map((c) => c + c).join('');
    }
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${clampedOpacity})`;
    }
  }

  // If rgb(r, g, b)
  const rgbMatch = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/i);
  if (rgbMatch) {
    return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${clampedOpacity})`;
  }

  return color;
}

/**
 * Normalizes any color representation into a valid 7-character hexadecimal (#RRGGBB) string
 * for HTML5 <input type="color"> elements.
 */
export function normalizeToHexColor(val: unknown, fallback = '#3b82f6'): string {
  if (typeof val !== 'string') return fallback;
  const s = val.trim();
  if (/^#[0-9a-f]{6}$/i.test(s)) return s;
  if (/^#[0-9a-f]{3}$/i.test(s)) {
    return '#' + s[1] + s[1] + s[2] + s[2] + s[3] + s[3];
  }

  // If rgb/rgba
  const rgbMatch = s.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10).toString(16).padStart(2, '0');
    const g = parseInt(rgbMatch[2], 10).toString(16).padStart(2, '0');
    const b = parseInt(rgbMatch[3], 10).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }

  return fallback;
}

/**
 * Checks if a property key/value represents a color property.
 */
export function isColorProperty(key: string, val?: unknown): boolean {
  const k = key.toLowerCase();
  if (
    [
      'fill',
      'stroke',
      'marker-color',
      'markercolor',
      'color',
      'fill-color',
      'stroke-color',
      'fillcolor',
      'strokecolor',
    ].includes(k)
  ) {
    return true;
  }
  if (typeof val === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(val.trim())) {
    return true;
  }
  return false;
}

/**
 * Returns standardized Mapbox Simplestyle Spec v1.1 properties based on geometry type.
 */
export function getDefaultSimpleStyle(
  geometryType: string | undefined
): Record<string, string | number> {
  switch (geometryType) {
    case 'Point':
    case 'MultiPoint':
      return {
        'marker-color': '#3E5C8A',
        'marker-size': 'medium',
        'fill': '#3E5C8A',
        'stroke': '#ffffff',
        'stroke-width': 2,
      };

    case 'LineString':
    case 'MultiLineString':
      return {
        'stroke': '#3E5C8A',
        'stroke-width': 3,
        'stroke-opacity': 1,
      };

    case 'Polygon':
    case 'MultiPolygon':
    case 'Circle':
      return {
        'fill': '#3E5C8A',
        'fill-opacity': 0.2,
        'stroke': '#3E5C8A',
        'stroke-width': 2,
        'stroke-opacity': 1,
      };

    default:
      return {
        'stroke': '#3E5C8A',
        'stroke-width': 2,
        'fill': '#3E5C8A',
        'fill-opacity': 0.2,
      };
  }
}

/**
 * Creates OpenLayers Style(s) for a feature supporting Mapbox Simplestyle specification
 * and distinct selection halo highlight.
 */
export function createSimplestyleForFeature(
  feature: Feature<Geometry>,
  isSelected: boolean
): Style | Style[] {
  const geomType = feature.getGeometry()?.getType();

  // 1. Stroke resolution
  const rawStroke =
    (feature.get('stroke') as string) ||
    (feature.get('stroke-color') as string) ||
    (feature.get('strokeColor') as string) ||
    '#3E5C8A';
  const strokeWidth =
    Number(
      feature.get('stroke-width') ??
      feature.get('strokeWidth') ??
      feature.get('stroke_width') ??
      2.5
    ) || 2.5;
  const strokeOpacity = feature.get('stroke-opacity') ?? feature.get('strokeOpacity');
  const stroke = parseColorWithOpacity(
    rawStroke,
    '#3E5C8A',
    strokeOpacity !== undefined ? Number(strokeOpacity) : undefined
  );

  // 2. Fill resolution
  const rawFill =
    (feature.get('fill') as string) ||
    (feature.get('fill-color') as string) ||
    (feature.get('fillColor') as string) ||
    '#3E5C8A';
  const rawFillOpacity =
    feature.get('fill-opacity') ??
    feature.get('fillOpacity') ??
    (typeof rawFill === 'string' && (rawFill.startsWith('rgba') || rawFill.startsWith('hsla'))
      ? undefined
      : 0.2);
  const fill = parseColorWithOpacity(
    rawFill,
    'rgba(62, 92, 138, 0.2)',
    rawFillOpacity !== undefined ? Number(rawFillOpacity) : 0.2
  );

  // 3. Point / Marker resolution
  const markerColor =
    (feature.get('marker-color') as string) ||
    (feature.get('markerColor') as string) ||
    (feature.get('fill') as string) ||
    rawStroke;
  const rawMarkerSize =
    feature.get('marker-size') ??
    feature.get('markerSize') ??
    feature.get('radius') ??
    6;
  let radius = 6;
  if (rawMarkerSize === 'small') radius = 4;
  else if (rawMarkerSize === 'medium') radius = 7;
  else if (rawMarkerSize === 'large') radius = 10;
  else if (!isNaN(Number(rawMarkerSize))) radius = Number(rawMarkerSize);

  const pointStroke = (feature.get('stroke') as string) || '#ffffff';
  const pointStrokeWidth =
    Number(feature.get('stroke-width') ?? feature.get('strokeWidth') ?? 2) || 2;

  // Main feature style
  const mainStyle = new Style({
    fill: new Fill({ color: fill }),
    stroke: new Stroke({ color: stroke, width: strokeWidth }),
    image: new CircleStyle({
      radius,
      fill: new Fill({ color: markerColor }),
      stroke: new Stroke({ color: pointStroke, width: pointStrokeWidth }),
    }),
  });

  if (!isSelected) {
    return mainStyle;
  }

  // Selection halo/glow (does NOT overwrite the user's custom style)
  if (geomType === 'Point' || geomType === 'MultiPoint') {
    const selectionHalo = new Style({
      image: new CircleStyle({
        radius: radius + 4,
        fill: new Fill({ color: 'rgba(217, 115, 58, 0.35)' }),
        stroke: new Stroke({ color: '#D9733A', width: 2.5 }),
      }),
    });
    return [selectionHalo, mainStyle];
  }

  const selectionHalo = new Style({
    fill: new Fill({ color: 'rgba(217, 115, 58, 0.15)' }),
    stroke: new Stroke({
      color: '#D9733A',
      width: strokeWidth + 3.5,
      lineDash: [6, 4],
    }),
  });

  return [selectionHalo, mainStyle];
}
