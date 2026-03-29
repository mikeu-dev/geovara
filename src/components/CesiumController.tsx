'use client';

import { useEffect, useRef } from 'react';
import type { Map } from 'ol';

interface CesiumControllerProps {
  map: Map | null;
  enabled: boolean;
}

export default function CesiumController({ map, enabled }: CesiumControllerProps) {
  const ol3d = useRef<any | null>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!map || typeof window === 'undefined') return;

    const initCesium = async () => {
      // @ts-ignore - Cesium and olcs are loaded via CDN
      const Cesium = (window as any).Cesium;
      // @ts-ignore
      const OLCesium = (window as any).olcs?.OLCesium;

      if (!Cesium || !OLCesium) {
        console.warn("Cesium or OLCesium not yet loaded from CDN");
        return;
      }

      if (isInitialized.current) return;

      try {
        const ol3dInstance = new OLCesium({ map: map });
        ol3d.current = ol3dInstance;

        const scene = ol3dInstance.getCesiumScene();

        const terrainProvider = await Cesium.createWorldTerrainAsync();
        scene.terrainProvider = terrainProvider;

        const tileset = await Cesium.Cesium3DTileset.fromUrl('https://assets.cesium.com/1/ion/default/v1/354307/tileset.json?assetId=354307', {
          skipLevelOfDetail: true,
          cullWithChildrenBounds: false,
        });
        scene.primitives.add(tileset);

        isInitialized.current = true;
        ol3d.current.setEnabled(enabled);
      } catch (error) {
        console.error("Error initializing OLCesium/Cesium:", error);
      }
    };

    const interval = setInterval(() => {
        if ((window as any).Cesium && (window as any).olcs?.OLCesium) {
            initCesium();
            clearInterval(interval);
        }
    }, 500);

    return () => clearInterval(interval);
  }, [map, enabled]);

  useEffect(() => {
    if (isInitialized.current && ol3d.current) {
        try {
          ol3d.current.setEnabled(enabled);
        } catch (error) {
          console.error("Error toggling Cesium:", error);
        }
    }
  }, [enabled]);

  return null;
}
