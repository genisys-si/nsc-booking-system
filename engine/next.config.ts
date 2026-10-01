import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pin the project root so Turbopack doesn't pick up stray package.json files in parent folders
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'localhost',
        port: '3000',
        pathname: '/uploads/**',
      },
      {
        hostname: 'nsc.gov.sb',
      },
      {
        hostname: '*public.blob.vercel-storage.com',
      },
      // Add production domains later, e.g.:
      // {
      //   protocol: 'https',
      //   hostname: 'yourdomain.com',
      //   pathname: '/uploads/**',
      // },
    ],
  },
};

export default nextConfig;
