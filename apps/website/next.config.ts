import { WEBAPP_URL } from "@/lib/config";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
        permanent: false,
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
