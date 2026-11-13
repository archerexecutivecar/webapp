import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // sharp ships platform-specific binaries; the review build is made on Windows and run on Linux
  images: { unoptimized: true },
};

export default nextConfig;
