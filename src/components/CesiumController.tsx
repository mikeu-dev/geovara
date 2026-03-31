'use client';

import { useEffect, useRef } from 'react';
import type { Map } from 'ol';

interface CesiumControllerProps {
  map: Map | null;
  enabled: boolean;
}

interface WindowWithCesium extends Window {
  Cesium?: {
    createWorldTerrainAsync: () => Promise<unknown>;
    Cesium3DTileset: {
      fromUrl: (url: string, options: unknown) => Promise<unknown>;
    };
  };
  olcs?: {
    OLCesium: new (options: { map: Map | null }) => {
      getCesiumScene: () => {
        terrainProvider: unknown;
        primitives: { add: (tileset: unknown) => void };
      };
      setEnabled: (enabled: boolean) => void;
    };
  };
}

export default function CesiumController({ map, enabled }: CesiumControllerProps) {
  const ol3d = useRef<{ setEnabled: (enabled: boolean) => void } | null>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!map || typeof window === 'undefined') return;

    const initCesium = async () => {
      const win = window as unknown as WindowWithCesium;
      const Cesium = win.Cesium;
      const OLCesium = win.olcs?.OLCesium;

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
        const win = window as unknown as WindowWithCesium;
        if (win.Cesium && win.olcs?.OLCesium) {
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
