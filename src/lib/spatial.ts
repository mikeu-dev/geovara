import * as turf from '@turf/turf';
import { Feature, FeatureCollection, Geometry, Polygon, MultiPolygon, Point } from 'geojson';

/**
 * Creates a buffer polygon around a GeoJSON feature.
 */
export function createBuffer(
  feature: Feature<Geometry>,
  radius: number,
  units: 'meters' | 'kilometers' | 'miles' | 'degrees' = 'kilometers'
): Feature<Polygon | MultiPolygon> {
  // @ts-ignore
  return turf.buffer(feature, radius, { units });
}

/**
 * Calculates the centroid of a feature or feature collection.
 */
export function calculateCentroid(
  data: Feature<Geometry> | FeatureCollection<Geometry>
): Feature<Point> {
  // @ts-ignore
  return turf.centroid(data);
}

/**
 * Calculates the area of a GeoJSON feature in square meters.
 */
export function calculateArea(feature: Feature<Geometry>): number {
  return turf.area(feature);
}

/**
 * Calculates the length of a GeoJSON feature (LineString) in meters.
 */
export function calculateLength(feature: Feature<Geometry>): number {
  // @ts-ignore
  return turf.length(feature, { units: 'meters' });
}

/**
 * Checks if two features intersect.
 */
export function checkIntersection(
  feat1: Feature<Geometry>,
  feat2: Feature<Geometry>
): boolean {
  // @ts-ignore
  const intersect = turf.intersect(turf.featureCollection([feat1 as any, feat2 as any]));
  return !!intersect;
}
