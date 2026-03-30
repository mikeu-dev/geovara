import LZString from 'lz-string';

/**
 * Compresses a GeoJSON string into a URL-safe encoded string.
 */
export function encodeGeoJSON(geojson: string): string {
  try {
    return LZString.compressToEncodedURIComponent(geojson);
  } catch (error) {
    console.error('Failed to encode GeoJSON:', error);
    return '';
  }
}

/**
 * Decompresses an encoded string back into a GeoJSON string.
 */
export function decodeGeoJSON(encoded: string): string {
  try {
    const decompressed = LZString.decompressFromEncodedURIComponent(encoded);
    return decompressed || '';
  } catch (error) {
    console.error('Failed to decode GeoJSON from URL:', error);
    return '';
  }
}

function hashQuerySegments(): string[] {
  const raw = window.location.hash.replace(/^#/, '');
  return raw ? raw.split('&').filter(Boolean) : [];
}

/**
 * Merges `data=` into the URL hash without dropping other segments (e.g. `map=` from OpenLayers).
 */
export function updateUrlHash(encoded: string) {
  if (typeof window === 'undefined') return;

  const kept = hashQuerySegments().filter((p) => !p.startsWith('data='));
  if (encoded) {
    kept.push(`data=${encoded}`);
  }

  const url = new URL(window.location.href);
  url.hash = kept.length > 0 ? kept.join('&') : '';
  window.history.replaceState(null, '', url.toString());
}

/**
 * Reads compressed GeoJSON from `data=` when the hash is combined (e.g. `data=…&map=…`).
 */
export function getEncodedFromHash(): string | null {
  if (typeof window === 'undefined') return null;

  const dataPart = hashQuerySegments().find((p) => p.startsWith('data='));
  if (!dataPart) return null;
  return dataPart.slice(5);
}
