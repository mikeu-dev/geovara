/**
 * Offloads JSON.parse for large GeoJSON strings to a Web Worker so the UI can stay responsive.
 */

const PARSE_WORKER_THRESHOLD = 256 * 1024;

export function shouldParseGeoJsonInWorker(sourceLength: number): boolean {
  return typeof Worker !== 'undefined' && sourceLength >= PARSE_WORKER_THRESHOLD;
}

type WorkerResult =
  | { success: true; data: unknown }
  | { success: false; error: string };

export function parseGeoJsonStringInWorker(geojsonString: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../workers/geojson.worker.ts', import.meta.url));
    const done = (fn: () => void) => {
      worker.terminate();
      fn();
    };

    worker.onmessage = (e: MessageEvent<WorkerResult>) => {
      const msg = e.data;
      if (msg && 'success' in msg && msg.success && 'data' in msg) {
        done(() => resolve(msg.data));
      } else if (msg && 'success' in msg && !msg.success && 'error' in msg) {
        done(() => reject(new Error(msg.error)));
      } else {
        done(() => reject(new Error('Worker parse failed')));
      }
    };

    worker.onerror = (err) => {
      done(() => reject(err));
    };

    worker.postMessage(geojsonString);
  });
}
