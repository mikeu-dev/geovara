/**
 * Web Worker for parsing GeoJSON strings.
 * This keeps the main thread responsive during heavy parsing operations.
 */
self.onmessage = (event: MessageEvent<string>) => {
  const geojsonString = event.data;
  
  if (!geojsonString) {
    self.postMessage({ error: 'Empty GeoJSON string' });
    return;
  }

  try {
    // 1. Heavy JSON Parsing
    const parsed = JSON.parse(geojsonString);
    
    // 2. Validate basic structure
    if (!parsed || (parsed.type !== 'FeatureCollection' && parsed.type !== 'Feature')) {
       throw new Error('Invalid GeoJSON structure');
    }

    // 3. Return serialized object back to main thread
    self.postMessage({ success: true, data: parsed });
  } catch (error: any) {
    self.postMessage({ success: false, error: error.message || 'Unknown parsing error' });
  }
};
