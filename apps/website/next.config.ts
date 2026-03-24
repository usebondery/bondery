import createMDX from "@next/mdx";
import { WEBAPP_URL } from "@/lib/config";
import { HELP_DOCS_URL, STATUS_PAGE_URL } from "@bondery/helpers";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  pageExtensions: ["ts", "tsx", "md", "mdx"],
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
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/status",
        destination: STATUS_PAGE_URL,
        permanent: false,
      },
      {
        source: "/help",
        destination: HELP_DOCS_URL,
        permanent: true,
      },
      {
        source: "/docs",
        destination: HELP_DOCS_URL,
        permanent: true,
      },
      {
        source: "/docs/:path*",
        destination: `${HELP_DOCS_URL}/:path*`,
        permanent: true,
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
        source: "/oauth/consent/:path*",
        destination: `${WEBAPP_URL}/oauth/consent/:path*`,
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

const withMDX = createMDX();

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- withMDX resolves NextConfig from root node_modules; cast avoids monorepo type mismatch
export default withMDX(nextConfig as any);
