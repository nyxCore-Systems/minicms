import type { NextConfig } from 'next'
import path from 'node:path'

const nextConfig: NextConfig = {
  output: 'standalone',
  // Pin the file-tracing root to this project so `.next/standalone/server.js`
  // lands at the package root (a stray parent lockfile would otherwise nest the
  // output under standalone/<path>/, breaking the Dockerfile COPY).
  outputFileTracingRoot: path.join(__dirname),
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'plus.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'e-ventschau.de',
      },
    ],
  },
  async redirects() {
    return []
  },
  async headers() {
    const common = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    ]
    return [
      {
        // Everything except the PayPal button frame keeps X-Frame-Options: DENY.
        source: '/((?!paypal-hosted-button\\.html).*)',
        headers: [{ key: 'X-Frame-Options', value: 'DENY' }, ...common],
      },
      {
        // The isolated PayPal hosted-button host is embedded same-origin in an
        // iframe on the donate section, so it must allow same-origin framing.
        source: '/paypal-hosted-button.html',
        headers: [{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }, ...common],
      },
    ]
  },
}

export default nextConfig
