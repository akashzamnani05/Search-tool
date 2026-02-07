/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Environment variables available to the browser
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api',
  },
  
  // Image optimization
  images: {
    domains: ['drive.google.com'],
  },
  
  // Disable x-powered-by header
  poweredByHeader: false,
}

module.exports = nextConfig