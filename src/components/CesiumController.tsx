'use client';

import { useEffect, useRef } from 'react';
import type { Map } from 'ol';
// @ts-ignore - cesium types might not be available
import { createWorldTerrainAsync, Cesium3DTileset } from 'cesium';

// ol-cesium is imported inside useEffect to prevent SSR issues and conflicts with Next.js module loading.

interface CesiumControllerProps {
  map: Map | null;
  enabled: boolean;
}

export default function CesiumController({ map, enabled }: CesiumControllerProps) {
  const ol3d = useRef<any | null>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!map || typeof window === 'undefined') return;

    // Dynamically require ol-cesium only on the client side, inside useEffect
    const OLCesium = require('ol-cesium');

    if (!isInitialized.current) {
      try {
        const ol3dInstance = new OLCesium({ map: map });
        ol3d.current = ol3dInstance;

        const scene = ol3dInstance.getCesiumScene();

        createWorldTerrainAsync().then((terrainProvider: any) => {
          scene.terrainProvider = terrainProvider;
        }).catch((error: any) => {
          console.error("Error setting terrain provider:", error);
        });

        Cesium3DTileset.fromUrl('https://assets.cesium.com/1/ion/default/v1/354307/tileset.json?assetId=354307', {
          skipLevelOfDetail: true,
          cullWithChildrenBounds: false,
        }).then((tileset: any) => {
          scene.primitives.add(tileset);
        }).catch((error: any) => {
          console.error("Error loading 3D tileset:", error);
        });

        isInitialized.current = true;
      } catch (error) {
        console.error("Error initializing OLCesium:", error);
        return;
      }
    }

    if (ol3d.current) {
      try {
        ol3d.current.setEnabled(enabled);
      } catch (error) {
        console.error("Error controlling Cesium enabled state:", error);
      }
    }

  }, [map, enabled]);

  return null;
}
