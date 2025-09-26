import type {NextConfig} from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Resolve Cesium module
      config.resolve.alias['cesium'] = path.resolve(__dirname, 'node_modules/cesium/Source');

      // Tell Cesium to use the correct asset path
      config.plugins.push(
        new (require('webpack').DefinePlugin)({
          CESIUM_BASE_URL: JSON.stringify('/cesium'),
        })
      );
    }

    // Fix for "Attempted import error: 'scrypt' is not exported from 'crypto'"
    config.resolve.fallback = {
      ...config.resolve.fallback,
      crypto: false,
    };

    return config;
  }
};

export default nextConfig;
