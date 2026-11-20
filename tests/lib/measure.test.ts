import { describe, it, expect } from 'vitest';
import { Feature } from 'ol';
import { Polygon, LineString, Point, Circle } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import * as turf from '@turf/turf';
import { formatArea, formatLength, measureFeature } from '@/lib/measure';

const ring = [
  [106.8, -6.2],
  [106.9, -6.2],
  [106.9, -6.1],
  [106.8, -6.1],
  [106.8, -6.2],
];

describe('measure', () => {
  it('measures a 3857 polygon geodesically, matching turf on the same WGS84 ring', () => {
    const f = new Feature(new Polygon([ring.map((c) => fromLonLat(c))]));
    const m = measureFeature(f)!;
    expect(m.kind).toBe('area');
    const expected = turf.area(turf.polygon([ring]));
    // ~123 km²; both methods agree within 0.5%
    expect(Math.abs(m.value - expected) / expected).toBeLessThan(0.005);
    expect(m.label).toMatch(/km²$/);
  });

  it('measures lines in metres and labels points', () => {
    const line = new Feature(new LineString([fromLonLat([106.8, -6.2]), fromLonLat([106.81, -6.2])]));
    const lm = measureFeature(line)!;
    expect(lm.kind).toBe('length');
    expect(lm.value).toBeGreaterThan(1000);
    expect(lm.value).toBeLessThan(1200);
    expect(measureFeature(new Feature(new Point(fromLonLat([106.8, -6.2]))))!.label).toBe('titik');
  });

  it('handles OpenLayers circles', () => {
    const c = new Feature(new Circle(fromLonLat([106.8, -6.2]), 1000));
    expect(measureFeature(c)!.kind).toBe('area');
  });

  it('formats with Indonesian separators and sensible units', () => {
    expect(formatArea(500)).toBe('500 m²');
    expect(formatArea(32_000)).toBe('3,2 ha');
    expect(formatArea(420_323_000_000)).toBe('420.323 km²');
    expect(formatLength(812)).toBe('812 m');
    expect(formatLength(1400)).toBe('1,4 km');
  });
});
