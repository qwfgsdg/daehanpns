/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@daehanpns/shared'],
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
    return [
      {
        source: '/proxy-api/:path*',
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
}

module.exports = nextConfig
