import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ['pg'],
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    BALLDONTLIE_API_KEY: process.env.BALLDONTLIE_API_KEY,
  },
  reactStrictMode: true,
  turbopack: {
    // Turbopack configuration (stable)
  }
};

export default withNextIntl(nextConfig);
