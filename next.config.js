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
  env: {
    VERCEL: process.env.VERCEL,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY
  }
}

module.exports = nextConfig 