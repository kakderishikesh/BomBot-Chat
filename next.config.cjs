/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static file serving from the dist directory
  async rewrites() {
    return [
      // Serve UI static files
      {
        source: '/assets/:path*',
        destination: '/dist/assets/:path*',
      },
      // Serve the main UI app for all non-API routes
      {
        source: '/((?!api).*)',
        destination: '/dist/index.html',
      },
    ];
  },
  // Copy dist folder to public during build
  async headers() {
    return [
      {
        source: '/dist/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  // Ensure proper static file handling
  trailingSlash: false,
  // Configure static file serving
  async redirects() {
    return [
      // Redirect root to the UI app
      {
        source: '/',
        destination: '/dist/index.html',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig; 