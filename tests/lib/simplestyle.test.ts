import { describe, it, expect } from 'vitest';
import {
  parseColorWithOpacity,
  normalizeToHexColor,
  isColorProperty,
  getDefaultSimpleStyle,
  createSimplestyleForFeature,
} from '@/lib/simplestyle';
import { Feature } from 'ol';
import { Polygon, Point, LineString } from 'ol/geom';

describe('simplestyle utilities', () => {
  it('should parse hex color with opacity into rgba string', () => {
    expect(parseColorWithOpacity('#ff0000', '#000000', 0.5)).toBe('rgba(255, 0, 0, 0.5)');
    expect(parseColorWithOpacity('#00f', '#000000', 0.3)).toBe('rgba(0, 0, 255, 0.3)');
    expect(parseColorWithOpacity('rgba(10, 20, 30, 0.4)', '#000000', 0.8)).toBe('rgba(10, 20, 30, 0.4)');
    expect(parseColorWithOpacity(undefined, '#123456')).toBe('#123456');
  });

  it('should normalize various color representations to 7-character hex', () => {
    expect(normalizeToHexColor('#ff0000')).toBe('#ff0000');
    expect(normalizeToHexColor('#f00')).toBe('#ff0000');
    expect(normalizeToHexColor('rgba(255, 255, 255, 0.5)')).toBe('#ffffff');
    expect(normalizeToHexColor('rgb(0, 128, 255)')).toBe('#0080ff');
    expect(normalizeToHexColor('invalid', '#112233')).toBe('#112233');
  });

  it('should identify color property keys and hex strings', () => {
    expect(isColorProperty('fill')).toBe(true);
    expect(isColorProperty('stroke')).toBe(true);
    expect(isColorProperty('marker-color')).toBe(true);
    expect(isColorProperty('STROKE-COLOR')).toBe(true);
    expect(isColorProperty('custom_prop', '#ff00aa')).toBe(true);
    expect(isColorProperty('name', 'Central Park')).toBe(false);
  });

  it('should provide default Mapbox simplestyle props for each geometry type', () => {
    const pointStyle = getDefaultSimpleStyle('Point');
    expect(pointStyle['marker-color']).toBe('#3E5C8A');
    expect(pointStyle['stroke']).toBe('#ffffff');

    const lineStyle = getDefaultSimpleStyle('LineString');
    expect(lineStyle['stroke']).toBe('#3E5C8A');
    expect(lineStyle['stroke-width']).toBe(3);

    const polyStyle = getDefaultSimpleStyle('Polygon');
    expect(polyStyle['fill']).toBe('#3E5C8A');
    expect(polyStyle['fill-opacity']).toBe(0.2);
    expect(polyStyle['stroke']).toBe('#3E5C8A');
  });

  it('should create OpenLayers style correctly from simplestyle properties', () => {
    const feature = new Feature({
      geometry: new Polygon([
        [
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 10],
          [0, 0],
        ],
      ]),
      fill: '#10b981',
      'fill-opacity': 0.4,
      stroke: '#047857',
      'stroke-width': 4,
    });

    const unselectedStyle = createSimplestyleForFeature(feature, false);
    expect(Array.isArray(unselectedStyle)).toBe(false);

    const selectedStyle = createSimplestyleForFeature(feature, true);
    expect(Array.isArray(selectedStyle)).toBe(true);
    expect((selectedStyle as unknown[]).length).toBe(2);
  });

  it('should create Point style with marker-color and marker-size', () => {
    const feature = new Feature({
      geometry: new Point([100, 20]),
      'marker-color': '#f59e0b',
      'marker-size': 'large',
      stroke: '#000000',
      'stroke-width': 2,
    });

    const style = createSimplestyleForFeature(feature, false);
    expect(style).toBeDefined();
  });

  it('should create LineString style with stroke and stroke-width', () => {
    const feature = new Feature({
      geometry: new LineString([
        [0, 0],
        [10, 10],
      ]),
      stroke: '#3b82f6',
      'stroke-width': 5,
    });

    const style = createSimplestyleForFeature(feature, false);
    expect(style).toBeDefined();
  });
});
