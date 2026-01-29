/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow serving GIF from public/media for X card unfurl
  images: { unoptimized: true },
};

module.exports = nextConfig;
