import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Outbound redirects (status, help, docs, login, auth/callback, oauth/consent, app)
  // live in src/app/**/route.ts so they can import @bondery/helpers.
  experimental: {
    optimizePackageImports: [
      "@tabler/icons-react",
      "@bondery/mantine-next",
      "@mantine/core",
      "@mantine/hooks",
      "@mantine/notifications",
    ],
    useTypeScriptCli: true,
  },
  async headers() {
    return [
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
  pageExtensions: ["ts", "tsx", "md", "mdx"],
};

const withMDX = createMDX();
type WithMDXConfig = Parameters<typeof withMDX>[0];

// withMDX resolves NextConfig from root node_modules; cast avoids monorepo type mismatch
export default withMDX(nextConfig as WithMDXConfig);
