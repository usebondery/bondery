import { WEBAPP_URL } from "@/lib/config";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; require-trusted-types-for 'script'",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/status",
        destination: "https://bondery.openstatus.dev/",
        permanent: false,
      },
      {
        source: "/login",
        destination: `${WEBAPP_URL}/login`,
        permanent: true,
      },
      {
        source: "/auth/callback/:path*",
        destination: `${WEBAPP_URL}/auth/callback/:path*`,
        permanent: false,
      },
      {
        source: "/app/:path*",
        destination: `${WEBAPP_URL}/app/:path*`,
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
