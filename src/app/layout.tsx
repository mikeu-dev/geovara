import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import JsonLd from '@/components/JsonLd';
import SeoContent from '@/components/SeoContent';

const CESIUM_VERSION = '1.113';
const CESIUM_BASE = `https://cesium.com/downloads/cesiumjs/releases/${CESIUM_VERSION}/Build/Cesium`;

const BASE_URL = 'https://geovara.vercel.app';

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#D9D7D2' },
    { media: '(prefers-color-scheme: dark)', color: '#1D1E21' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),

  title: {
    default: 'Geovara — Free Online GeoJSON Editor & Map Drawing Tool',
    template: '%s | Geovara',
  },

  description:
    'Free online GeoJSON editor and geospatial suite. Draw, edit, and export geometries with automatic Shapefile (SHP/ZIP) reprojection, CSV/WKT/KML/TopoJSON converter, polygon knife splitting, buffer analysis, photorealistic 3D globe, and AI spatial assistance — no signup required.',

  keywords: [
    'geojson editor',
    'geojson editor online',
    'online map editor',
    'draw on map',
    'shapefile to geojson online',
    'shapefile viewer free',
    'reproject shapefile to wgs84',
    'shp to geojson converter',
    'csv to geojson online',
    'wkt to geojson editor',
    'kml to geojson online',
    'gpx viewer online',
    'geojson to topojson',
    'topojson converter',
    'polygon knife tool online',
    'split polygon geojson',
    'buffer analysis tool',
    'convex hull generator',
    'dissolve polygon online',
    'geospatial data editor',
    'map drawing tool',
    'geojson validator',
    'spatial analysis tool',
    'web gis tool',
    'polygon drawing tool',
    'free gis software',
    'openlayers editor',
    'cesium 3d globe viewer',
    'geojson 3d globe',
    'geojson creator',
    'geojson viewer',
    'draw polygon on map online',
    'map editor free',
    'geofence drawing tool',
    'interactive map tool',
    'geojson.io alternative',
    'geojson map editor',
    'coordinate reference system',
    'EPSG 4326',
    'EPSG 3857',
    'web mercator',
    'UTM to WGS84 converter',
  ],

  authors: [{ name: 'Geovara Team', url: BASE_URL }],
  creator: 'Geovara',
  publisher: 'Geovara',

  applicationName: 'Geovara',
  category: 'Technology',
  classification: 'Geographic Information System',

  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: BASE_URL,
    siteName: 'Geovara',
    title: 'Geovara — Free Online GeoJSON Editor & Map Drawing Tool',
    description:
      'Professional GeoJSON editor with AI spatial analysis. Draw, edit, and export geometries on an interactive map — free, no signup.',
    images: [
      {
        url: '/og-image.png',
        width: 1024,
        height: 1024,
        alt: 'Geovara — Professional GeoJSON Editor & Map Drawing Tool',
        type: 'image/png',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: 'Geovara — Free Online GeoJSON Editor & Map Drawing Tool',
    description:
      'Professional GeoJSON editor with AI spatial analysis. Draw, edit, and export geometries on an interactive map — free, no signup.',
    images: ['/og-image.png'],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  alternates: {
    canonical: '/',
  },

  verification: {
    google: 'googleaa30292efcadb7ba',
  },

  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': 'Geovara',
  },

  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Red+Hat+Mono:wght@400;500;600&display=swap"
        />
        <link rel="stylesheet" href={`${CESIUM_BASE}/Widgets/widgets.css`} />
        <Script
          id="cesium-base-url"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `window.CESIUM_BASE_URL = '${CESIUM_BASE}/';`,
          }}
        />
        <Script src={`${CESIUM_BASE}/Cesium.js`} strategy="beforeInteractive" />
        <Script
          src="https://cdn.jsdelivr.net/npm/ol@9.2.4/dist/ol.js"
          strategy="beforeInteractive"
        />
        <Script
          src="https://cdn.jsdelivr.net/npm/ol-cesium@2.17.0/dist/olcesium.js"
          strategy="beforeInteractive"
        />
        <JsonLd />
      </head>
      <body className="font-body antialiased h-full">
        <SeoContent />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
