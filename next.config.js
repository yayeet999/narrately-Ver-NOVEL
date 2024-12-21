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
  },
  serverRuntimeConfig: {
    // Will only be available on the server side
    timeoutSeconds: 300,
  },
  publicRuntimeConfig: {
    // Will be available on both server and client
    apiTimeout: 300000, // 300 seconds in milliseconds
  },
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
    responseLimit: '10mb',
  },
  experimental: {
    serverTimeout: 300,
  },
}

module.exports = nextConfig 