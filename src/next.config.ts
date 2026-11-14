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
  // Long-form legal slugs used in older links/emails resolve to the canonical pages (QA BUG-003/032).
  async redirects() {
    return [
      { source: "/privacy-policy", destination: "/privacy", permanent: true },
      { source: "/terms-of-service", destination: "/terms", permanent: true },
      { source: "/terms-and-conditions", destination: "/terms", permanent: true },
      { source: "/cancellation-policy", destination: "/cancellation", permanent: true },
      { source: "/cookie-policy", destination: "/cookies", permanent: true },
      { source: "/accessibility-statement", destination: "/accessibility", permanent: true },
    ];
  },
};

export default nextConfig;
