/** @type {import('next').NextConfig} */
const nextConfig = {
  // Handle routing for the UI
  async rewrites() {
    return [
      // Serve UI static assets
      {
        source: '/assets/:path*',
        destination: '/dist/assets/:path*',
      },
    ];
  },
  
  // Handle routing for all non-API routes to serve the React app
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dist/index.html',
        permanent: false,
      },
    ];
  },

  // Set headers for static assets
  async headers() {
    return [
      {
        source: '/dist/assets/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  
  // Ensure proper trailing slash handling
  trailingSlash: false,
};

module.exports = nextConfig; 