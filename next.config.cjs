/** @type {import('next').NextConfig} */
const nextConfig = {
  // Handle routing for static assets and SPA
  async rewrites() {
    return [
      // Map /assets/* to /dist/assets/* where the actual files are
      {
        source: '/assets/:path*',
        destination: '/dist/assets/:path*',
      },
      // Serve the React app from root
      {
        source: '/',
        destination: '/dist/index.html',
      },
      // Handle SPA routing - fallback to React app
      {
        source: '/((?!api|_next|dist).*)',
        destination: '/dist/index.html',
      },
    ];
  },

  // Set headers for static assets
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
  
  // Ensure proper trailing slash handling
  trailingSlash: false,
  
  // Output configuration for static export compatibility
  output: 'standalone',
};

module.exports = nextConfig; 