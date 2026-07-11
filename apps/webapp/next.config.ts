import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: [
      "@bondery/mantine-next",
      "@mantine/core",
      "@mantine/dates",
      "@mantine/dropzone",
      "@mantine/form",
      "@mantine/hooks",
      "@mantine/modals",
      "@mantine/notifications",
      "@mantine/nprogress",
      "@mantine/spotlight",
      "@mantine/tiptap",
    ],
    proxyClientMaxBodySize: "20mb",
  },
  async headers() {
    return [
      {
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
        // Prevent browsers from caching a stale service worker script
        source: "/sw.js",
      },
      {
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
        source: "/:path*",
      },
    ];
  },
};

export default nextConfig;
