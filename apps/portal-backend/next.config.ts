import type { NextConfig } from "next";
import path from "path";

const releaseSha =
  process.env.NEXT_PUBLIC_PORTAL_RELEASE_LABEL ||
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ||
  process.env.GIT_COMMIT_SHA?.slice(0, 7) ||
  "local";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true
  },
  env: {
    NEXT_PUBLIC_PORTAL_RELEASE_LABEL: releaseSha
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
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin"
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff"
          },
          {
            key: "X-Frame-Options",
            value: "DENY"
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), interest-cohort=(), browsing-topics=()"
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin"
          }
        ]
      }
    ];
  }
};

export default nextConfig;
