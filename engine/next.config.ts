import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
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
