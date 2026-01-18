import { API_URL } from "@/lib/config";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // API calls go to the Fastify server
  async rewrites() {
    const apiUrl = API_URL;
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin("./src/lib/i18n/request.ts");
export default withNextIntl(nextConfig);
