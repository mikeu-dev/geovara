import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: 'Geovara',
  description: 'Draw geometries on a map and get GeoJSON.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        
        {/* Cesium & OLCesium CDN */}
        <link rel="stylesheet" href="https://cesium.com/downloads/cesiumjs/releases/1.113/Build/Cesium/Widgets/widgets.css" />
        <script src="https://cesium.com/downloads/cesiumjs/releases/1.113/Build/Cesium/Cesium.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/ol-cesium@2.17.0/dist/olcesium.js"></script>
        <script dangerouslySetInnerHTML={{ __html: `window.CESIUM_BASE_URL = 'https://cesium.com/downloads/cesiumjs/releases/1.113/Build/Cesium/';` }} />
      </head>
      <body className="font-body antialiased h-full">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
