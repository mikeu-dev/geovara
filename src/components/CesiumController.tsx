'use client';

import { useEffect, useRef } from 'react';
import type { Map } from 'ol';
import { createWorldTerrainAsync, Cesium3DTileset } from 'cesium';

// Use require for CommonJS modules like ol-cesium
const OLCesium = require('ol-cesium');

interface CesiumControllerProps {
  map: Map | null;
  enabled: boolean;
}

export default function CesiumController({ map, enabled }: CesiumControllerProps) {
  const ol3d = useRef<any | null>(null);

  useEffect(() => {
    if (!map) return;
    
    let isInitialized = !!ol3d.current;

    if (!isInitialized) {
      try {
        ol3d.current = new OLCesium({ map: map });
      } catch (error) {
        console.error("Error initializing OLCesium:", error);
        return;
      }
    }
    
    const scene = ol3d.current.getCesiumScene();
    
    try {
        if (enabled && !isInitialized) {
            createWorldTerrainAsync().then(terrainProvider => {
                scene.terrainProvider = terrainProvider;
            }).catch(error => {
                console.error("Error setting terrain provider:", error);
            });

            Cesium3DTileset.fromUrl('https://assets.cesium.com/1/ion/default/v1/354307/tileset.json?assetId=354307', {
              skipLevelOfDetail: true,
              cullWithChildrenBounds: false,
            }).then(tileset => {
                scene.primitives.add(tileset);
            }).catch(error => {
                console.error("Error loading 3D tileset:", error);
            });
        }

        ol3d.current.setEnabled(enabled);
    } catch (error) {
        console.error("Error controlling Cesium:", error);
    }

  }, [map, enabled]);

  return null;
}
