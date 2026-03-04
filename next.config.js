/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://fm2l2133of.execute-api.us-east-1.amazonaws.com/prod',
  },
}

module.exports = nextConfig
