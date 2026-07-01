import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@bondery/schemas",
    "@bondery/helpers",
    "@bondery/branding",
    "@bondery/mantine-next",
    "@bondery/translations",
  ],
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  // Outbound redirects (status, help, docs, login, auth/callback, oauth/consent, app)
  // live in src/app/**/route.ts so they can import @bondery/helpers. Do not move them
  // into redirects() here — next.config.ts is evaluated by Node and cannot load JIT
  // workspace packages.
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
};

const withMDX = createMDX();
type WithMDXConfig = Parameters<typeof withMDX>[0];

// withMDX resolves NextConfig from root node_modules; cast avoids monorepo type mismatch
export default withMDX(nextConfig as WithMDXConfig);
