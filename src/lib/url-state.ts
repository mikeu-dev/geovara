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

/**
 * Updates the URL hash with the encoded GeoJSON.
 */
export function updateUrlHash(encoded: string) {
  if (typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    url.hash = encoded ? `data=${encoded}` : '';
    window.history.replaceState(null, '', url.toString());
  }
}

/**
 * Gets the encoded GeoJSON from the URL hash.
 */
export function getEncodedFromHash(): string | null {
  if (typeof window !== 'undefined') {
    const hash = window.location.hash;
    if (hash.startsWith('#data=')) {
      return hash.substring(6);
    }
  }
  return null;
}
