/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  trailingSlash: true,
  output: 'standalone',
  distDir: '.next',
  images: {
    unoptimized: true
  },
  swcMinify: true,
  // Indicate that we're running on Vercel
  env: {
    VERCEL: process.env.VERCEL
  }
}

module.exports = nextConfig 