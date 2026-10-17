import { createMDX as createFumadocsMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: [
      "@tabler/icons-react",
      "@bondery/mantine-next",
      "@mantine/core",
      "@mantine/hooks",
      "@mantine/notifications",
    ],
    turbopackRustReactCompiler: true,
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
  images: {
    remotePatterns: [
      {
        hostname: "icons.duckduckgo.com",
        pathname: "/ip3/**",
        protocol: "https",
      },
    ],
  },
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  reactCompiler: true,
  // Outbound redirects (status, help, docs, login, auth/callback, oauth/consent, app)
  // live in src/app/**/route.ts so they can import @bondery/helpers.
  // Public URLs: server reads BONDERY_PUBLIC_*; client leaves get them as RSC props.
  async redirects() {
    return [
      {
        destination: "/blog/updates",
        permanent: true,
        source: "/blog/product",
      },
      {
        destination: "/blog/updates/:slug",
        permanent: true,
        source: "/blog/product/:slug",
      },
      {
        destination: "/docs/deploy/installation",
        permanent: true,
        source: "/docs/deploy/get-started",
      },
    ];
  },
  serverExternalPackages: ["@takumi-rs/core"],
};

const withFumadocsMDX = createFumadocsMDX();

// Fumadocs MDX compiles all `.mdx` (docs + blog). Do not wrap with `@next/mdx` — it breaks frontmatter.
export default withFumadocsMDX(nextConfig);
