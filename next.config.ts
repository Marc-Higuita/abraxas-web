import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  async redirects() {
    return [{ source: "/salas", destination: "/", permanent: false }];
  },
};

export default nextConfig;
