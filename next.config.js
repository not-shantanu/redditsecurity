/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude Puppeteer and browser-related modules from server-side bundling
      config.externals = config.externals || [];
      config.externals.push({
        'puppeteer': 'commonjs puppeteer',
        'puppeteer-core': 'commonjs puppeteer-core',
        'playwright': 'commonjs playwright',
        '@playwright/test': 'commonjs @playwright/test',
      });
    }
    return config;
  },
};

module.exports = nextConfig;

