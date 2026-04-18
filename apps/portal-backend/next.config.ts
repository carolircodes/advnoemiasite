import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true
  },
  outputFileTracingRoot: path.join(__dirname, "../.."),
  async redirects() {
    return [
      {
        source: "/auth/login",
        destination: "/portal/login",
        permanent: true
      },
      {
        source: "/portal/login.html",
        destination: "/portal/login",
        permanent: true
      }
    ];
  }
};

export default nextConfig;
