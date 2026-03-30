/**
 * Nominatim (OpenStreetMap) usage policy expects a valid User-Agent identifying the app.
 * @see https://operations.osmfoundation.org/policies/nominatim/
 */

const APP_ID = 'Geovara/0.1.0';

export function getNominatimFetchInit(extra?: HeadersInit): RequestInit {
  const headers = new Headers(extra);
  if (!headers.has('Accept-Language')) {
    headers.set('Accept-Language', 'en');
  }
  headers.set('User-Agent', `${APP_ID} (geospatial map editor)`);
  return { headers };
}

export function nominatimSearchUrl(
  params: Record<string, string | number | undefined>
): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) q.set(k, String(v));
  }
  return `https://nominatim.openstreetmap.org/search?${q.toString()}`;
}
