/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'crafatar.com' },
      { protocol: 'https', hostname: '**' },
    ],
  },
  transpilePackages: ['@gpt/shared'],
};

module.exports = nextConfig;
