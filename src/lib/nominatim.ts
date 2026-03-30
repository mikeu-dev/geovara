/**
 * Nominatim (OpenStreetMap) usage policy expects a valid User-Agent identifying the app,
 * and asks clients to stay at most ~1 request per second.
 * @see https://operations.osmfoundation.org/policies/nominatim/
 */

const APP_ID = 'Geovara/0.1.0';
const MIN_INTERVAL_MS = 1100;

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

let lastNominatimRequestAt = 0;
let nominatimQueue: Promise<unknown> = Promise.resolve();

/**
 * Serialized fetch with minimum spacing between requests (fair use).
 */
export function fetchNominatim(url: string): Promise<Response> {
  const run = nominatimQueue.then(async () => {
    const gap = Date.now() - lastNominatimRequestAt;
    if (gap < MIN_INTERVAL_MS) {
      await new Promise((r) => setTimeout(r, MIN_INTERVAL_MS - gap));
    }
    lastNominatimRequestAt = Date.now();
    return fetch(url, getNominatimFetchInit());
  });
  nominatimQueue = run.then(() => undefined, () => undefined);
  return run;
}
