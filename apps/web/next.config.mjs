/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@careerforge/types'],
  experimental: {
    serverComponentsExternalPackages: []
  }
};

export default nextConfig;
