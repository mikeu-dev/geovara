import * as turf from '@turf/turf';
import { Feature, FeatureCollection, Geometry, Polygon, MultiPolygon, Point } from 'geojson';
import * as topojson from 'topojson-server';

/**
 * GisService: A centralized service for geometric computations.
 * Encapsulating third-party library (Turf.js) logic is a senior architecture pattern.
 */
export const GisService = {
  /**
   * Creates a buffer polygon around a GeoJSON feature.
   */
  createBuffer(
    feature: Feature<Geometry>,
    radius: number,
    units: 'meters' | 'kilometers' | 'miles' | 'degrees' = 'kilometers'
  ): Feature<Polygon | MultiPolygon> {
    // @ts-ignore
    return turf.buffer(feature, radius, { units });
  },

  /**
   * Calculates the centroid of a feature or feature collection.
   */
  calculateCentroid(
    data: Feature<Geometry> | FeatureCollection<Geometry>
  ): Feature<Point> {
    // @ts-ignore
    return turf.centroid(data);
  },

  /**
   * Calculates the area of a GeoJSON feature in square meters.
   */
  calculateArea(feature: Feature<Geometry>): number {
    return turf.area(feature);
  },

  /**
   * Calculates the length of a GeoJSON feature (LineString) in meters.
   */
  calculateLength(feature: Feature<Geometry>): number {
    // @ts-ignore
    return turf.length(feature, { units: 'meters' });
  },

  /**
   * Checks if two features intersect.
   */
  checkIntersection(
    feat1: Feature<Geometry>,
    feat2: Feature<Geometry>
  ): boolean {
    // @ts-ignore
    const intersect = turf.intersect(turf.featureCollection([feat1 as any, feat2 as any]));
    return !!intersect;
  },

  /**
   * Converts GeoJSON FeatureCollection to TopoJSON.
   */
  toTopoJSON(geojson: FeatureCollection): any {
    return topojson.topology({ data: geojson });
  }
};
