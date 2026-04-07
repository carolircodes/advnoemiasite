import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
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
