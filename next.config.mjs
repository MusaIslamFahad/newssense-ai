/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
  env: {
    HF_TOKEN: process.env.HF_TOKEN,
  },
};

export default nextConfig;
