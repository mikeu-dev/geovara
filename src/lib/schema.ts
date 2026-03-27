import { z } from 'zod';

/**
 * Zod Schemas for GeoJSON validation.
 * This ensures runtime data integrity which is a senior engineering requirement.
 */

export const PositionSchema = z.tuple([z.number(), z.number()]).rest(z.number());

export const PointSchema = z.object({
  type: z.literal('Point'),
  coordinates: PositionSchema,
});

export const LineStringSchema = z.object({
  type: z.literal('LineString'),
  coordinates: z.array(PositionSchema),
});

export const PolygonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(z.array(PositionSchema)),
});

export const MultiPointSchema = z.object({
  type: z.literal('MultiPoint'),
  coordinates: z.array(PositionSchema),
});

export const MultiLineStringSchema = z.object({
  type: z.literal('MultiLineString'),
  coordinates: z.array(z.array(PositionSchema)),
});

export const MultiPolygonSchema = z.object({
  type: z.literal('MultiPolygon'),
  coordinates: z.array(z.array(z.array(PositionSchema))),
});

// Explicit type for recursive geometry
export type Geometry = 
  | z.infer<typeof PointSchema>
  | z.infer<typeof LineStringSchema>
  | z.infer<typeof PolygonSchema>
  | z.infer<typeof MultiPointSchema>
  | z.infer<typeof MultiLineStringSchema>
  | z.infer<typeof MultiPolygonSchema>
  | { type: 'GeometryCollection'; geometries: Geometry[] };

export const GeometrySchema: z.ZodType<Geometry> = z.lazy(() => 
  z.union([
    PointSchema,
    LineStringSchema,
    PolygonSchema,
    MultiPointSchema,
    MultiLineStringSchema,
    MultiPolygonSchema,
    z.object({ 
      type: z.literal('GeometryCollection'), 
      geometries: z.array(GeometrySchema) 
    }),
  ])
);

export const FeatureSchema = z.object({
  type: z.literal('Feature'),
  geometry: GeometrySchema.nullable(),
  properties: z.record(z.any()).nullable().default({}),
  id: z.union([z.string(), z.number()]).optional(),
});

export const FeatureCollectionSchema = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(FeatureSchema),
});

/**
 * Root GeoJSON Schema
 */
export const GeoJSONSchema = z.union([
  FeatureSchema,
  FeatureCollectionSchema,
]);

/**
 * Helper to validate and parse GeoJSON
 */
export function validateGeoJSON(data: unknown) {
  return GeoJSONSchema.safeParse(data);
}
