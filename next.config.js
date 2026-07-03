/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@libsql/client', 'libsql'],
  },
};

module.exports = nextConfig;
