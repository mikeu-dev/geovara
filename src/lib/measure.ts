import type { Feature } from 'ol';
import type { Geometry } from 'ol/geom';
import { Circle } from 'ol/geom';
import { fromCircle } from 'ol/geom/Polygon';
import { getArea, getLength } from 'ol/sphere';

/**
 * One geodesic measurement for a map feature, shared by the feature list and the
 * properties popup so both always show the same number.
 *
 * Features on the map live in EPSG:3857; `ol/sphere` measures them on the sphere,
 * so the result is in real square metres / metres regardless of latitude.
 */
export type FeatureMeasure =
  | { kind: 'area'; value: number; label: string }
  | { kind: 'length'; value: number; label: string }
  | { kind: 'point'; value: 0; label: string };

const nf = (digits: number) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: digits, minimumFractionDigits: 0 });

export function formatArea(m2: number): string {
  if (m2 >= 1e6) return `${nf(m2 >= 1e8 ? 0 : 2).format(m2 / 1e6)} km²`;
  if (m2 >= 1e4) return `${nf(1).format(m2 / 1e4)} ha`;
  return `${nf(0).format(m2)} m²`;
}

export function formatLength(m: number): string {
  if (m >= 1000) return `${nf(m >= 1e5 ? 0 : 2).format(m / 1000)} km`;
  return `${nf(0).format(m)} m`;
}

export function measureGeometry(
  geometry: Geometry | undefined,
  projection = 'EPSG:3857'
): FeatureMeasure | null {
  if (!geometry) return null;
  const geom = geometry instanceof Circle ? fromCircle(geometry, 128) : geometry;
  const type = geom.getType();
  if (type === 'Polygon' || type === 'MultiPolygon') {
    const value = getArea(geom, { projection });
    return { kind: 'area', value, label: formatArea(value) };
  }
  if (type === 'LineString' || type === 'MultiLineString' || type === 'LinearRing') {
    const value = getLength(geom, { projection });
    return { kind: 'length', value, label: formatLength(value) };
  }
  if (type === 'Point' || type === 'MultiPoint') {
    return { kind: 'point', value: 0, label: 'titik' };
  }
  return null;
}

export function measureFeature(feature: Feature<Geometry>, projection?: string) {
  return measureGeometry(feature.getGeometry(), projection);
}
