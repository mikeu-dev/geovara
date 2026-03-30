import type FeatureFormat from 'ol/format/Feature';
import type { ReadOptions } from 'ol/format/Feature';
import GeoJSON from 'ol/format/GeoJSON';
import type { Feature } from 'ol';
import type { Geometry } from 'ol/geom';
import { GisService } from '@/lib/spatial';

function isTopoTopology(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  return o.objects != null && Array.isArray(o.arcs);
}

function toText(source: Document | Element | ArrayBuffer | object | string): string | null {
  if (typeof source === 'string') return source;
  if (source instanceof ArrayBuffer) return new TextDecoder().decode(source);
  return null;
}

/**
 * Minimal OpenLayers-style format for DragAndDrop: TopoJSON text → features in map projection.
 */
export const topoJsonDragFormat = {
  getType(): 'json' {
    return 'json';
  },

  readFeatures(
    source: Document | Element | ArrayBuffer | object | string,
    options?: ReadOptions
  ): Feature<Geometry>[] {
    const text = toText(source);
    let parsed: unknown;
    if (text != null) {
      try {
        parsed = JSON.parse(text);
      } catch {
        return [];
      }
    } else if (source && typeof source === 'object' && !('nodeType' in source) && isTopoTopology(source)) {
      parsed = source;
    } else {
      return [];
    }

    if (!isTopoTopology(parsed)) return [];

    try {
      const fc = GisService.fromTopoJSON(parsed);
      const geoJson = new GeoJSON({
        dataProjection: 'EPSG:4326',
        featureProjection: options?.featureProjection ?? 'EPSG:3857',
      });
      return geoJson.readFeatures(fc, options) as Feature<Geometry>[];
    } catch {
      return [];
    }
  },
} as unknown as FeatureFormat;
