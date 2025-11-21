/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Externalize Supabase packages to prevent Edge Runtime issues
  serverExternalPackages: ['@supabase/supabase-js'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Client-side: resolve fallbacks for Node.js modules
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;

