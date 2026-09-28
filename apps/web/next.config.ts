import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable strict mode for React (catches hydration issues early)
  reactStrictMode: true,

  // Turbopack for faster local dev
  experimental: {
    // Enable CSS in layouts for design token import
  },

  // PWA headers — service worker + manifest
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
