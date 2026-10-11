/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  allowedDevOrigins: ['192.168.18.138'],
  async redirects() {
    return [
      { source: '/production-standards', destination: '/master/production-standards', permanent: false },
      { source: '/standar-produksi', destination: '/master/production-standards', permanent: false },
      { source: '/master/standar-produksi', destination: '/master/production-standards', permanent: false },
      { source: '/production/standards', destination: '/master/production-standards', permanent: false },
    ];
  },
};

export default nextConfig;
