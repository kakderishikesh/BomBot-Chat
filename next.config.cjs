/** @type {import('next').NextConfig} */
const nextConfig = {
  // Handle routing for static assets
  async rewrites() {
    return [
      // Map /assets/* to /dist/assets/* where the actual files are
      {
        source: '/assets/:path*',
        destination: '/dist/assets/:path*',
      },
    ];
  },
  
  // Ensure proper trailing slash handling
  trailingSlash: false,
  
  // Output configuration
  output: 'standalone',
};

module.exports = nextConfig; 