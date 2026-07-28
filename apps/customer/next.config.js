/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  transpilePackages: ['@kismayo/shared'],
};

module.exports = nextConfig;
